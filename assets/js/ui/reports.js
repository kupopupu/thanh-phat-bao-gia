/**
 * assets/js/ui/reports.js
 * --------------------------------------------------------------------------
 * Trung Tâm Quản Trị & Báo Cáo Chiến Lược Kinh Doanh (Executive Strategic Dashboard)
 * --------------------------------------------------------------------------
 * Phiên bản: 2.0 – Thiết kế chuẩn hóa cho Quản lý & Ra quyết định chiến lược:
 *   - Tab 1: Tổng quan & Sức khỏe Kinh doanh (Key Vital KPIs & AI Insights)
 *   - Tab 2: Chiến lược Sản phẩm (Top Best-Sellers & Sản lượng mũi nhọn)
 *   - Tab 3: Khách hàng & Công nợ (Quy luật Pareto 80/20 & Đôn đốc thu hồi vốn)
 *   - Tab 4: Xu hướng & Chu kỳ 12 Tháng (Seasonality Trends & Xuất báo cáo)
 * --------------------------------------------------------------------------
 */

(function () {
    'use strict';

    // ── Trạng thái nội bộ của Dashboard ──
    let _activeTab = 'overview'; // 'overview' | 'products' | 'customers' | 'trends'
    let _activeFilter = 'this_month'; // 'all' | 'today' | 'last_7d' | 'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'custom'
    let _customFrom = '';
    let _customTo = '';
    let _trendsYear = (new Date()).getFullYear();

    const fmt = v => new Intl.NumberFormat('vi-VN').format(Math.round(Number(v) || 0));
    const escapeHtml = typeof window.escapeHtml === 'function' ? window.escapeHtml : (s => String(s || '').replace(/[&<>"']/g, ''));

    // ── Engine lọc ngày tháng ──
    function getFilterDateRange() {
        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth(); // 0-11
        const d = now.getDate();

        const formatDate = dt => {
            const yyyy = dt.getFullYear();
            const mm = String(dt.getMonth() + 1).padStart(2, '0');
            const dd = String(dt.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
        };

        if (_activeFilter === 'today') {
            const todayStr = formatDate(now);
            return { from: todayStr, to: todayStr, label: 'Hôm nay' };
        }
        if (_activeFilter === 'last_7d') {
            const from = new Date(y, m, d - 6);
            return { from: formatDate(from), to: formatDate(now), label: '7 ngày qua' };
        }
        if (_activeFilter === 'this_month') {
            const from = new Date(y, m, 1);
            const to = new Date(y, m + 1, 0);
            return { from: formatDate(from), to: formatDate(to), label: `Tháng ${m + 1}/${y}` };
        }
        if (_activeFilter === 'last_month') {
            const from = new Date(y, m - 1, 1);
            const to = new Date(y, m, 0);
            return { from: formatDate(from), to: formatDate(to), label: `Tháng ${m === 0 ? 12 : m}/${m === 0 ? y - 1 : y}` };
        }
        if (_activeFilter === 'this_quarter') {
            const q = Math.floor(m / 3);
            const from = new Date(y, q * 3, 1);
            const to = new Date(y, (q + 1) * 3, 0);
            return { from: formatDate(from), to: formatDate(to), label: `Quý ${q + 1}/${y}` };
        }
        if (_activeFilter === 'this_year') {
            const from = new Date(y, 0, 1);
            const to = new Date(y, 11, 31);
            return { from: formatDate(from), to: formatDate(to), label: `Năm ${y}` };
        }
        if (_activeFilter === 'custom' && _customFrom && _customTo) {
            return { from: _customFrom, to: _customTo, label: `${_customFrom} đến ${_customTo}` };
        }
        return { from: '', to: '', label: 'Toàn bộ thời gian' };
    }

    function getFilteredQuotes() {
        if (typeof loadSavedQuotes === 'function') loadSavedQuotes();
        const quotes = Array.isArray(window.savedQuotes) ? window.savedQuotes : [];
        const range = getFilterDateRange();
        if (!range.from || !range.to) return quotes;

        return quotes.filter(q => {
            const dateStr = (q.savedAt || q.createdAt || '').slice(0, 10);
            if (!dateStr) return false;
            return dateStr >= range.from && dateStr <= range.to;
        });
    }

    // ── Engine tính toán chỉ số Sức khỏe (KPIs) ──
    function computeKpis(quotes) {
        const totalCount = quotes.length;
        const totalPipeline = quotes.reduce((s, q) => s + (Number(q.total) || 0), 0);

        // Đơn chốt thực tế (đã cọc, hoàn thành, không cọc)
        const confirmedQuotes = quotes.filter(q => (q.orderStatus || 'pending') !== 'pending');
        const confirmedCount = confirmedQuotes.length;
        const totalConfirmed = confirmedQuotes.reduce((s, q) => s + (Number(q.total) || 0), 0);

        // Tiền thực tế đã thu
        const received = quotes.reduce((s, q) => {
            const st = q.orderStatus || 'pending';
            const tot = Number(q.total) || 0;
            if (st === 'completed') return s + tot;
            if (st === 'deposited') return s + (Number(q.depositAmount) || Math.round(tot * 0.4));
            return s + (Number(q.receivedAmount) || 0);
        }, 0);

        // Công nợ cần thu
        const totalDebt = quotes.reduce((s, q) => {
            const st = q.orderStatus || 'pending';
            const tot = Number(q.total) || 0;
            if (st === 'deposited') return s + Math.max(0, tot - (Number(q.depositAmount) || Math.round(tot * 0.4)));
            if (st === 'no_deposit') return s + tot;
            return s;
        }, 0);

        // Tỷ lệ chuyển đổi chốt đơn (Win Rate)
        const winRate = totalCount > 0 ? Math.round((confirmedCount / totalCount) * 100) : 0;

        // Giá trị trung bình một đơn (AOV)
        const aov = confirmedCount > 0 ? Math.round(totalConfirmed / confirmedCount) : 0;

        // Tỷ lệ công nợ trên doanh thu
        const debtRatio = totalConfirmed > 0 ? Math.round((totalDebt / totalConfirmed) * 100) : 0;

        return {
            totalCount,
            totalPipeline,
            confirmedCount,
            totalConfirmed,
            received,
            totalDebt,
            winRate,
            aov,
            debtRatio
        };
    }

    // ── Engine tính toán Sản phẩm (Product Analytics) ──
    function computeProductAnalytics(quotes) {
        const map = {};
        let totalItemsSold = 0;
        let totalItemsRevenue = 0;

        quotes.forEach(q => {
            const isConfirmed = (q.orderStatus || 'pending') !== 'pending';
            if (!Array.isArray(q.items)) return;

            q.items.forEach(it => {
                const name = (it.name || '').trim();
                if (!name) return;
                const qty = Number(it.qty || it.quantity) || 0;
                const price = Number(it.price) || 0;
                const lineTotal = Number(it.lineTotal) || (qty * price);

                if (!map[name]) {
                    map[name] = {
                        name,
                        unit: it.unit || 'cái',
                        totalQty: 0,
                        totalRevenue: 0,
                        quoteCount: 0,
                        confirmedRevenue: 0
                    };
                }
                map[name].totalQty += qty;
                map[name].totalRevenue += lineTotal;
                map[name].quoteCount += 1;
                if (isConfirmed) map[name].confirmedRevenue += lineTotal;

                totalItemsSold += qty;
                totalItemsRevenue += lineTotal;
            });
        });

        const list = Object.values(map);
        // Top theo doanh thu
        const byRevenue = [...list].sort((a, b) => b.totalRevenue - a.totalRevenue);
        // Top theo sản lượng
        const byQuantity = [...list].sort((a, b) => b.totalQty - a.totalQty);

        return { list, byRevenue, byQuantity, totalItemsSold, totalItemsRevenue };
    }

    // ── Engine tính toán Khách hàng & Công nợ (Customer & Debt Analytics) ──
    function computeCustomerAnalytics(quotes) {
        const map = {};
        quotes.forEach(q => {
            const phone = (q.customerPhone || '').trim();
            const name = (q.customerName || 'Khách vãng lai').trim();
            const key = phone || name;

            const tot = Number(q.total) || 0;
            const st = q.orderStatus || 'pending';
            let rec = 0;
            let debt = 0;

            if (st === 'completed') {
                rec = tot;
            } else if (st === 'deposited') {
                rec = Number(q.depositAmount) || Math.round(tot * 0.4);
                debt = Math.max(0, tot - rec);
            } else if (st === 'no_deposit') {
                debt = tot;
            }

            if (!map[key]) {
                map[key] = {
                    key,
                    name,
                    phone: phone || '—',
                    address: q.customerAddress || '—',
                    totalSpent: 0,
                    totalReceived: 0,
                    totalDebt: 0,
                    quoteCount: 0,
                    confirmedCount: 0,
                    lastDate: (q.savedAt || q.createdAt || '').slice(0, 10),
                    debtQuotes: []
                };
            }

            map[key].totalSpent += tot;
            map[key].totalReceived += rec;
            map[key].totalDebt += debt;
            map[key].quoteCount += 1;
            if (st !== 'pending') map[key].confirmedCount += 1;

            if (debt > 0) {
                map[key].debtQuotes.push({
                    id: q.quoteNumber || q.id,
                    date: (q.savedAt || q.createdAt || '').slice(0, 10),
                    total: tot,
                    debt
                });
            }

            const curDate = (q.savedAt || q.createdAt || '').slice(0, 10);
            if (curDate > map[key].lastDate) map[key].lastDate = curDate;
        });

        const list = Object.values(map);
        // Top khách hàng VIP (chi tiêu nhiều nhất)
        const topVip = [...list].sort((a, b) => b.totalSpent - a.totalSpent);
        // Danh sách khách nợ nhiều nhất
        const debtRanking = list.filter(c => c.totalDebt > 0).sort((a, b) => b.totalDebt - a.totalDebt);

        // Tính Pareto: Top 20% khách hàng mang lại bao nhiêu % doanh thu
        const totalAllSpend = list.reduce((s, c) => s + c.totalSpent, 0);
        const top20Count = Math.max(1, Math.ceil(list.length * 0.2));
        const top20Spend = topVip.slice(0, top20Count).reduce((s, c) => s + c.totalSpent, 0);
        const paretoRatio = totalAllSpend > 0 ? Math.round((top20Spend / totalAllSpend) * 100) : 0;

        return { list, topVip, debtRanking, paretoRatio, top20Count, totalAllSpend };
    }

    // ── Engine tính toán Xu hướng 12 tháng trong năm ──
    function computeMonthlyRevenue(year) {
        if (typeof loadSavedQuotes === 'function') loadSavedQuotes();
        const quotes = Array.isArray(window.savedQuotes) ? window.savedQuotes : [];
        const months = [];
        for (let m = 1; m <= 12; m++) {
            const mm = String(m).padStart(2, '0');
            months.push({
                key: `${year}-${mm}`,
                month: m,
                label: `T${m}`,
                total: 0,
                received: 0,
                debt: 0,
                count: 0,
                confirmedCount: 0
            });
        }
        const map = Object.fromEntries(months.map(m => [m.key, m]));

        quotes.forEach(q => {
            const ds = (q.savedAt || q.createdAt || '').slice(0, 7);
            if (!ds || !map[ds]) return;
            const entry = map[ds];
            const tot = Number(q.total) || 0;
            const st = q.orderStatus || 'pending';

            entry.total += tot;
            entry.count += 1;
            if (st !== 'pending') entry.confirmedCount += 1;

            if (st === 'completed') {
                entry.received += tot;
            } else if (st === 'deposited') {
                const dep = Number(q.depositAmount) || Math.round(tot * 0.4);
                entry.received += dep;
                entry.debt += Math.max(0, tot - dep);
            } else if (st === 'no_deposit') {
                entry.debt += tot;
            }
        });

        return months;
    }
    window.computeMonthlyRevenue = computeMonthlyRevenue;

    // ── Sinh Đúc kết Chiến lược Tự Động (Strategic Business Insights) ──
    function generateInsightsHtml(kpis, prodData, custData) {
        const bullets = [];

        // 1. Tỷ lệ chốt đơn & Pipeline
        if (kpis.totalCount > 0) {
            bullets.push(`Tỷ lệ chốt đơn đạt <strong>${kpis.winRate}%</strong> (${kpis.confirmedCount}/${kpis.totalCount} báo giá). ${kpis.winRate >= 70 ? 'Hiệu suất bán hàng rất tốt!' : 'Nên đôn đốc chăm sóc thêm các báo giá còn đang chờ duyệt.'}`);
        }

        // 2. Doanh thu & Giá trị trung bình đơn
        if (kpis.confirmedCount > 0) {
            bullets.push(`Giá trị đơn hàng trung bình (AOV) đạt <strong>${fmt(kpis.aov)}đ</strong>/đơn.`);
        }

        // 3. Mặt hàng Best Seller
        if (prodData.byRevenue.length > 0) {
            const top1 = prodData.byRevenue[0];
            const top1Pct = kpis.totalConfirmed > 0 ? Math.round((top1.totalRevenue / kpis.totalConfirmed) * 100) : 0;
            bullets.push(`Mặt hàng chủ lực: <strong>${top1.name}</strong> dẫn đầu với doanh thu <strong>${fmt(top1.totalRevenue)}đ</strong> (${top1Pct}% tổng doanh thu chốt). Cần đảm bảo đủ nguồn vật tư & phôi in.`);
        }

        // 4. Khách hàng VIP & Pareto 80/20
        if (custData.list.length > 0) {
            bullets.push(`Quy luật Pareto: Top <strong>${custData.top20Count} khách hàng VIP</strong> đang đóng góp <strong>${custData.paretoRatio}%</strong> doanh số. Nên duy trì chính sách ưu đãi và chăm sóc định kỳ.`);
        }

        // 5. Rủi ro công nợ
        if (kpis.totalDebt > 0) {
            const topDebtor = custData.debtRanking[0];
            bullets.push(`Công nợ đang ở mức <strong>${fmt(kpis.totalDebt)}đ</strong> (${kpis.debtRatio}% doanh thu). ${topDebtor ? `Khách nợ lớn nhất: <strong>${topDebtor.name}</strong> (${fmt(topDebtor.totalDebt)}đ) cần ưu tiên thu hồi.` : ''}`);
        } else {
            bullets.push(`Tình hình dòng tiền xuất sắc: <strong>100% công nợ đã được thu hồi đầy đủ!</strong>`);
        }

        return `
            <div class="rev-insights-box">
                <div class="rev-insights-header">
                    <span style="display:inline-flex;align-items:center;gap:6px;">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                        ĐÚC KẾT CHIẾN LƯỢC VẬN HÀNH
                    </span>
                    <span style="font-size:11px;font-weight:normal;opacity:0.8;">Phân tích thời gian thực</span>
                </div>
                <ul class="rev-insights-list">
                    ${bullets.map(b => `<li>${b}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    // ── Render Thanh Lọc Thời Gian (Time Filter Bar) ──
    function renderTimeFilterBarHtml() {
        const presets = [
            { id: 'all', label: 'Tất cả' },
            { id: 'today', label: 'Hôm nay' },
            { id: 'last_7d', label: '7 ngày' },
            { id: 'this_month', label: 'Tháng này' },
            { id: 'last_month', label: 'Tháng trước' },
            { id: 'this_quarter', label: 'Quý này' },
            { id: 'this_year', label: 'Năm nay' }
        ];

        return `
            <div class="rev-filter-bar">
                <div class="rev-filter-presets">
                    <span style="font-size:11.5px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-right:4px;">Thời gian:</span>
                    ${presets.map(p => `
                        <button type="button" class="rev-filter-btn ${_activeFilter === p.id ? 'active' : ''}" onclick="window.setRevenueTimeFilter('${p.id}')">
                            ${p.label}
                        </button>
                    `).join('')}
                </div>
                <div class="rev-custom-range">
                    <span>Hoặc từ:</span>
                    <input type="date" id="revDateFrom" value="${_customFrom}" onchange="window.setRevenueCustomDate()">
                    <span>đến:</span>
                    <input type="date" id="revDateTo" value="${_customTo}" onchange="window.setRevenueCustomDate()">
                </div>
            </div>
        `;
    }

    // ── Tab 1: Tổng quan & Sức khỏe Kinh doanh ──
    function renderOverviewTab(quotes, kpis, prodData, custData) {
        // Biểu đồ Area biến động 30 ngày / thời gian lọc
        const days = 30;
        const now = new Date();
        const series = Array.from({ length: days }).map((_, i) => {
            const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1 - i));
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            const key = `${yyyy}-${mm}-${dd}`;
            return { key, label: `${dd}/${mm}`, total: 0 };
        });
        const seriesMap = Object.fromEntries(series.map(s => [s.key, s]));

        quotes.forEach(q => {
            const dateStr = (q.savedAt || q.createdAt || '').slice(0, 10);
            if (seriesMap[dateStr]) seriesMap[dateStr].total += Number(q.total) || 0;
        });

        const seriesVals = series.map(s => s.total);
        const maxV = Math.max(...seriesVals, 1);
        const w = 700, h = 160, pad = 12;

        const points = seriesVals.map((v, i) => {
            const x = pad + (i * (w - pad * 2) / Math.max(1, seriesVals.length - 1));
            const y = pad + (1 - (v / maxV)) * (h - pad * 2);
            return `${x},${y}`;
        }).join(' ');

        const areaPoints = `${pad},${h} ` + points + ` ${w - pad},${h}`;

        // Phân bổ trạng thái
        const statusMeta = [
            { key: 'completed', label: 'Hoàn thành', color: '#10b981' },
            { key: 'deposited', label: 'Đã đặt cọc', color: '#0ea5e9' },
            { key: 'no_deposit', label: 'Không cọc', color: '#f59e0b' },
            { key: 'pending', label: 'Chờ xác nhận', color: '#94a3b8' }
        ];

        const statusStats = statusMeta.map(st => {
            const list = quotes.filter(q => (q.orderStatus || 'pending') === st.key);
            const sum = list.reduce((s, q) => s + (Number(q.total) || 0), 0);
            const pct = kpis.totalPipeline > 0 ? Math.round((sum / kpis.totalPipeline) * 100) : 0;
            return { ...st, count: list.length, sum, pct };
        });

        return `
            ${generateInsightsHtml(kpis, prodData, custData)}

            <!-- 5 Thẻ KPI sức khỏe -->
            <div class="rev-kpi-grid">
                <div class="rev-kpi-card">
                    <div class="rev-kpi-label">Doanh thu chốt</div>
                    <div class="rev-kpi-value" style="color:#0ea5e9;">${fmt(kpis.totalConfirmed)}đ</div>
                    <div class="rev-kpi-sub">
                        <span class="rev-kpi-badge success">${kpis.winRate}% win-rate</span>
                        <span>${kpis.confirmedCount} đơn chốt</span>
                    </div>
                </div>

                <div class="rev-kpi-card">
                    <div class="rev-kpi-label">Thực thu tiền mặt</div>
                    <div class="rev-kpi-value" style="color:#10b981;">${fmt(kpis.received)}đ</div>
                    <div class="rev-kpi-sub">
                        <span>Đã vào tài khoản / quỹ</span>
                    </div>
                </div>

                <div class="rev-kpi-card">
                    <div class="rev-kpi-label">Công nợ cần thu</div>
                    <div class="rev-kpi-value" style="color:${kpis.totalDebt > 0 ? '#ef4444' : 'var(--text-primary)'};">${fmt(kpis.totalDebt)}đ</div>
                    <div class="rev-kpi-sub">
                        <span class="rev-kpi-badge ${kpis.debtRatio > 20 ? 'danger' : 'warning'}">${kpis.debtRatio}% doanh số</span>
                        <span>chưa thu đủ</span>
                    </div>
                </div>

                <div class="rev-kpi-card">
                    <div class="rev-kpi-label">Giá trị TB / Đơn (AOV)</div>
                    <div class="rev-kpi-value">${fmt(kpis.aov)}đ</div>
                    <div class="rev-kpi-sub">
                        <span>Quy mô đơn bình quân</span>
                    </div>
                </div>

                <div class="rev-kpi-card">
                    <div class="rev-kpi-label">Tiềm năng (Pipeline)</div>
                    <div class="rev-kpi-value" style="color:var(--text-secondary);">${fmt(kpis.totalPipeline)}đ</div>
                    <div class="rev-kpi-sub">
                        <span>${kpis.totalCount} báo giá đã lập</span>
                    </div>
                </div>
            </div>

            <!-- Layout 2 cột: Biểu đồ + Cơ cấu trạng thái -->
            <div class="rev-grid-2col">
                <div class="rev-panel">
                    <div class="rev-panel-header">
                        <h4 class="rev-panel-title">Biểu đồ dòng tiền (30 ngày gần nhất)</h4>
                        <span style="font-size:11px;color:var(--text-muted);">Đơn vị: VNĐ</span>
                    </div>
                    <div style="width:100%;overflow:hidden;border-radius:var(--radius-sm);background:var(--pastel-50);padding:4px 0;">
                        <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="width:100%;height:150px;display:block;">
                            <defs>
                                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stop-color="#0284c7" stop-opacity="0.35"/>
                                    <stop offset="100%" stop-color="#0284c7" stop-opacity="0.0"/>
                                </linearGradient>
                            </defs>
                            <polygon fill="url(#areaGrad)" points="${areaPoints}" />
                            <polyline fill="none" stroke="#0284c7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="${points}" />
                        </svg>
                    </div>
                </div>

                <div class="rev-panel">
                    <div class="rev-panel-header">
                        <h4 class="rev-panel-title">Cơ cấu trạng thái đơn hàng</h4>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:10px;margin-top:4px;">
                        ${statusStats.map(st => `
                            <div>
                                <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px;">
                                    <span style="font-weight:600;display:flex;align-items:center;gap:6px;">
                                        <i style="width:8px;height:8px;border-radius:50%;background:${st.color};display:inline-block;"></i>
                                        ${st.label} (${st.count})
                                    </span>
                                    <span style="font-weight:700;">${fmt(st.sum)}đ <span style="font-weight:normal;color:var(--text-muted);font-size:11px;">(${st.pct}%)</span></span>
                                </div>
                                <div class="rev-prog-track">
                                    <div class="rev-prog-fill" style="width:${st.pct}%;background:${st.color};"></div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <!-- Bảng danh sách báo giá trong kỳ lọc -->
            <div class="rev-panel">
                <div class="rev-panel-header">
                    <h4 class="rev-panel-title">Danh sách giao dịch trong kỳ lọc (${quotes.length} báo giá)</h4>
                    <button type="button" class="btn btn-secondary" onclick="window.exportRevenueFilterCsv()" style="padding:4px 10px;font-size:12px;">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        Xuất Excel/CSV
                    </button>
                </div>
                <div style="overflow-x:auto;max-height:360px;">
                    <table class="quote-list-table" style="width:100%;">
                        <thead>
                            <tr>
                                <th>Mã BG</th>
                                <th>Khách hàng</th>
                                <th style="text-align:center;">Ngày</th>
                                <th style="text-align:center;">Trạng thái</th>
                                <th style="text-align:right;">Tổng tiền</th>
                                <th style="text-align:right;">Đã thu</th>
                                <th style="text-align:right;">Còn nợ</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${quotes.slice(0, 50).map(q => {
                                const tot = Number(q.total) || 0;
                                const st = q.orderStatus || 'pending';
                                const rec = st === 'completed' ? tot : (st === 'deposited' ? (Number(q.depositAmount) || Math.round(tot * 0.4)) : 0);
                                const owe = st === 'pending' ? 0 : Math.max(0, tot - rec);
                                const stBadge = st === 'completed' ? '<span class="badge badge-completed">Hoàn thành</span>'
                                    : (st === 'deposited' ? '<span class="badge badge-deposited">Đã cọc</span>'
                                    : (st === 'no_deposit' ? '<span class="badge badge-no-deposit">Không cọc</span>'
                                    : '<span class="badge badge-pending">Chờ duyệt</span>'));

                                return `<tr>
                                    <td class="td-code" onclick="if(typeof viewSavedQuote==='function') viewSavedQuote('${q.id}')" style="cursor:pointer;" title="Bấm để xem chi tiết">${escapeHtml(q.quoteNumber || q.id)}</td>
                                    <td class="td-strong">${escapeHtml(q.customerName || '—')}</td>
                                    <td style="text-align:center;" class="td-muted">${(q.savedAt || q.createdAt || '').slice(0, 10)}</td>
                                    <td style="text-align:center;">${stBadge}</td>
                                    <td style="text-align:right;" class="td-strong">${fmt(tot)}đ</td>
                                    <td style="text-align:right;color:#10b981;">${fmt(rec)}đ</td>
                                    <td style="text-align:right;color:${owe > 0 ? '#ef4444' : 'var(--text-muted)'};font-weight:${owe > 0 ? '700' : 'normal'}">${fmt(owe)}đ</td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // ── Tab 2: Chiến lược Sản phẩm (Best-Sellers & Portfolio) ──
    function renderProductsTab(prodData, kpis) {
        const top10Rev = prodData.byRevenue.slice(0, 10);
        const top10Qty = prodData.byQuantity.slice(0, 10);
        const maxRev = top10Rev.length > 0 ? top10Rev[0].totalRevenue : 1;

        return `
            <div class="rev-panel">
                <div class="rev-panel-header">
                    <div>
                        <h4 class="rev-panel-title">Top 10 Sản Phẩm Đem Lại Doanh Thu Cao Nhất</h4>
                        <div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">Sản phẩm mũi nhọn đóng góp nhiều lợi nhuận nhất cho xưởng in</div>
                    </div>
                    <span class="count-pill">${prodData.list.length} mặt hàng</span>
                </div>
                <div style="overflow-x:auto;">
                    <table class="quote-list-table" style="width:100%;">
                        <thead>
                            <tr>
                                <th style="width:50px;text-align:center;">#</th>
                                <th>Tên hàng hóa / Quy cách</th>
                                <th style="text-align:center;">ĐVT</th>
                                <th style="text-align:right;">Sản lượng bán</th>
                                <th style="text-align:right;">Doanh thu</th>
                                <th style="text-align:center;width:180px;">Tỷ trọng đóng góp</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${top10Rev.map((p, idx) => {
                                const rankClass = idx === 0 ? 'top-1' : (idx === 1 ? 'top-2' : (idx === 2 ? 'top-3' : ''));
                                const pct = Math.round((p.totalRevenue / maxRev) * 100);
                                return `<tr>
                                    <td style="text-align:center;"><span class="rev-rank ${rankClass}">${idx + 1}</span></td>
                                    <td class="td-strong" style="font-size:13px;">${escapeHtml(p.name)}</td>
                                    <td style="text-align:center;" class="td-muted">${escapeHtml(p.unit)}</td>
                                    <td style="text-align:right;font-weight:600;">${fmt(p.totalQty)}</td>
                                    <td style="text-align:right;" class="td-strong">${fmt(p.totalRevenue)}đ</td>
                                    <td>
                                        <div style="display:flex;align-items:center;gap:8px;">
                                            <div class="rev-prog-track" style="margin-top:0;flex:1;">
                                                <div class="rev-prog-fill" style="width:${pct}%;"></div>
                                            </div>
                                            <span style="font-size:11px;font-weight:600;min-width:32px;">${pct}%</span>
                                        </div>
                                    </td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="rev-grid-2col">
                <div class="rev-panel">
                    <div class="rev-panel-header">
                        <h4 class="rev-panel-title">Top 10 Mặt Hàng Tiêu Thụ Nhiều Nhất (Theo Sản Lượng)</h4>
                    </div>
                    <div style="overflow-x:auto;">
                        <table class="quote-list-table" style="width:100%;">
                            <thead>
                                <tr>
                                    <th style="width:40px;text-align:center;">#</th>
                                    <th>Sản phẩm</th>
                                    <th style="text-align:center;">ĐVT</th>
                                    <th style="text-align:right;">Số lượng</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${top10Qty.map((p, idx) => `
                                    <tr>
                                        <td style="text-align:center;"><span class="rev-rank ${idx < 3 ? 'top-' + (idx + 1) : ''}">${idx + 1}</span></td>
                                        <td class="td-strong">${escapeHtml(p.name)}</td>
                                        <td style="text-align:center;" class="td-muted">${escapeHtml(p.unit)}</td>
                                        <td style="text-align:right;font-weight:700;color:var(--accent);">${fmt(p.totalQty)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="rev-panel">
                    <div class="rev-panel-header">
                        <h4 class="rev-panel-title">Gợi ý chiến lược sản phẩm</h4>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:12px;font-size:12.5px;color:var(--text-secondary);line-height:1.6;">
                        <div style="background:var(--pastel-50);padding:10px 12px;border-radius:var(--radius-sm);border:1px solid var(--border);">
                            <strong style="color:var(--navy-900);display:block;margin-bottom:2px;">1. Dự trữ nguyên vật liệu:</strong>
                            Các mặt hàng thuộc Top sản lượng cần kiểm tra tồn kho phôi, màng ép định kỳ vào mỗi đầu tuần để tránh đứt gãy sản xuất.
                        </div>
                        <div style="background:var(--pastel-50);padding:10px 12px;border-radius:var(--radius-sm);border:1px solid var(--border);">
                            <strong style="color:var(--navy-900);display:block;margin-bottom:2px;">2. Chiến lược bán chéo (Cross-selling):</strong>
                            Khi khách đặt các mặt hàng Best-Seller, nhân viên kinh doanh có thể tư vấn kèm phụ kiện hoặc quy cách in cao cấp hơn để tăng giá trị đơn hàng (AOV).
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // ── Tab 3: Khách hàng & Công nợ (Customer Pareto & Debt Ranking) ──
    function renderCustomersTab(custData) {
        return `
            <!-- Bảng cảnh báo đôn đốc công nợ -->
            <div class="rev-panel" style="border-left:4px solid #ef4444;">
                <div class="rev-panel-header">
                    <div>
                        <h4 class="rev-panel-title" style="color:#ef4444;display:flex;align-items:center;gap:6px;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                            Ưu Tiên Đôn Đốc Thu Hồi Công Nợ
                        </h4>
                        <div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">Danh sách khách hàng đang có đơn hàng chưa thanh toán đủ</div>
                    </div>
                    <span class="count-pill" style="background:#fee2e2;color:#b91c1c;">${custData.debtRanking.length} khách nợ</span>
                </div>
                ${custData.debtRanking.length === 0 ? `
                    <div style="text-align:center;padding:24px;color:#10b981;font-weight:600;">
                        Tuyệt vời! Không có khách hàng nào đang nợ tiền trong kỳ này.
                    </div>
                ` : `
                    <div style="overflow-x:auto;">
                        <table class="quote-list-table" style="width:100%;">
                            <thead>
                                <tr>
                                    <th>Khách hàng</th>
                                    <th>Số điện thoại</th>
                                    <th style="text-align:right;">Tổng nợ</th>
                                    <th style="text-align:center;">Số đơn nợ</th>
                                    <th style="text-align:right;">Thao tác nhanh</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${custData.debtRanking.map(c => `
                                    <tr>
                                        <td class="td-strong">${escapeHtml(c.name)}</td>
                                        <td>
                                            <a href="tel:${escapeHtml(c.phone)}" style="color:var(--accent);font-weight:600;text-decoration:none;display:inline-flex;align-items:center;gap:4px;">
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                                                ${escapeHtml(c.phone)}
                                            </a>
                                        </td>
                                        <td style="text-align:right;color:#ef4444;font-weight:800;font-size:14px;">${fmt(c.totalDebt)}đ</td>
                                        <td style="text-align:center;"><span class="count-pill">${c.debtQuotes.length} đơn</span></td>
                                        <td style="text-align:right;">
                                            <button type="button" class="btn btn-secondary" onclick="window.viewCustomerDebtDetails('${escapeHtml(c.key)}')" style="padding:3px 8px;font-size:11.5px;">
                                                Xem đơn nợ
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `}
            </div>

            <!-- Top Khách hàng VIP theo doanh số -->
            <div class="rev-panel">
                <div class="rev-panel-header">
                    <div>
                        <h4 class="rev-panel-title">Bảng Vàng Khách Hàng VIP (Quy luật Pareto 80/20)</h4>
                        <div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">Top khách hàng đem lại doanh thu cao nhất cho xưởng</div>
                    </div>
                    <span class="count-pill">${custData.topVip.length} khách hàng</span>
                </div>
                <div style="overflow-x:auto;">
                    <table class="quote-list-table" style="width:100%;">
                        <thead>
                            <tr>
                                <th style="width:40px;text-align:center;">#</th>
                                <th>Tên khách hàng</th>
                                <th>Số điện thoại</th>
                                <th style="text-align:center;">Lần mua</th>
                                <th style="text-align:center;">Giao dịch gần nhất</th>
                                <th style="text-align:right;">Tổng tiền chi trả</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${custData.topVip.slice(0, 15).map((c, idx) => {
                                const rankClass = idx === 0 ? 'top-1' : (idx === 1 ? 'top-2' : (idx === 2 ? 'top-3' : ''));
                                return `<tr>
                                    <td style="text-align:center;"><span class="rev-rank ${rankClass}">${idx + 1}</span></td>
                                    <td class="td-strong">${escapeHtml(c.name)}</td>
                                    <td>${escapeHtml(c.phone)}</td>
                                    <td style="text-align:center;font-weight:700;"><span class="count-pill">${c.confirmedCount} đơn</span></td>
                                    <td style="text-align:center;" class="td-muted">${c.lastDate}</td>
                                    <td style="text-align:right;color:#0ea5e9;font-weight:800;">${fmt(c.totalSpent)}đ</td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // ── Tab 4: Xu hướng & Chu kỳ 12 Tháng ──
    function renderTrendsTab(year) {
        const months = computeMonthlyRevenue(year);
        const totals = months.map(m => m.total);
        const maxV = Math.max(...totals, 1);
        const w = 760, h = 190, pad = 22;
        const barW = Math.floor((w - pad * 2) / 12) - 10;

        const yearTotal = months.reduce((s, m) => s + m.total, 0);
        const yearReceived = months.reduce((s, m) => s + m.received, 0);
        const yearDebt = months.reduce((s, m) => s + m.debt, 0);
        const yearCount = months.reduce((s, m) => s + m.count, 0);

        const monthBars = months.map((m, i) => {
            const x = pad + i * ((w - pad * 2) / 12);
            const hVal = Math.max(4, Math.round((m.total / maxV) * (h - pad * 2 - 10)));
            const y = pad + (h - pad * 2 - 10) - hVal;
            const fill = m.total > 0 ? '#0284c7' : 'var(--pastel-200)';
            return `<g onclick="window.showMonthlyDetails('${m.key}')" style="cursor:pointer" title="${m.label}: ${fmt(m.total)}đ">
                <rect x="${x}" y="${y}" width="${barW}" height="${hVal}" rx="4" fill="${fill}"></rect>
                <text x="${x + barW / 2}" y="${h - 6}" font-size="11" font-weight="600" fill="var(--text-secondary)" text-anchor="middle">T${i + 1}</text>
            </g>`;
        }).join('\n');

        return `
            <div style="display:flex;justify-content:space-between;align-items:center;background:var(--bg-surface);padding:8px 12px;border-radius:var(--radius-md);border:1px solid var(--border);">
                <div style="display:flex;gap:6px;align-items:center;">
                    <button type="button" class="ql-pg-btn" onclick="window.changeTrendsYear(${year - 1})" title="Năm trước">‹</button>
                    <span class="count-pill" style="font-size:12.5px;padding:3px 12px;">Năm ${year}</span>
                    <button type="button" class="ql-pg-btn" onclick="window.changeTrendsYear(${year + 1})" title="Năm sau">›</button>
                    <span style="font-size:12px;color:var(--text-secondary);margin-left:6px;">(${yearCount} đơn trong năm)</span>
                </div>
                <button type="button" class="btn btn-secondary" onclick="window.exportMonthlyRevenueCsv(${year})" style="padding:4px 10px;font-size:12px;">
                    Xuất CSV Năm ${year}
                </button>
            </div>

            <div class="rev-kpi-grid" style="grid-template-columns:repeat(4,1fr);">
                <div class="rev-kpi-card">
                    <div class="rev-kpi-label">Tổng doanh thu năm</div>
                    <div class="rev-kpi-value" style="color:#0ea5e9;">${fmt(yearTotal)}đ</div>
                </div>
                <div class="rev-kpi-card">
                    <div class="rev-kpi-label">Thực thu</div>
                    <div class="rev-kpi-value" style="color:#10b981;">${fmt(yearReceived)}đ</div>
                </div>
                <div class="rev-kpi-card">
                    <div class="rev-kpi-label">Công nợ năm</div>
                    <div class="rev-kpi-value" style="color:${yearDebt > 0 ? '#ef4444' : 'var(--text-muted)'};">${fmt(yearDebt)}đ</div>
                </div>
                <div class="rev-kpi-card">
                    <div class="rev-kpi-label">Tổng số báo giá</div>
                    <div class="rev-kpi-value">${yearCount}</div>
                </div>
            </div>

            <div class="rev-panel">
                <div class="rev-panel-header">
                    <h4 class="rev-panel-title">Biểu đồ doanh thu 12 tháng (Bấm vào cột tháng để xem đơn)</h4>
                </div>
                <div style="width:100%;overflow:hidden;border-radius:var(--radius-sm);background:var(--pastel-50);padding:4px 0;">
                    <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="width:100%;height:190px;display:block;">${monthBars}</svg>
                </div>
            </div>

            <div id="monthlyDetails" class="rev-panel" style="color:var(--text-muted);font-size:13px;">
                Chọn một cột tháng (T1 – T12) trên biểu đồ để xem danh sách báo giá của tháng đó.
            </div>
        `;
    }

    // ── HÀM ĐIỀU PHỐI CHÍNH: showRevenueAnalyticsHub ──
    function showRevenueAnalyticsHub(activeTab, yearParam) {
        if (typeof _setActiveNav === 'function') _setActiveNav('sbNavRevenueHub');
        if (activeTab) _activeTab = activeTab;
        if (typeof yearParam === 'number' && !isNaN(yearParam)) _trendsYear = yearParam;

        const mainContent = typeof _prepareReportContainer === 'function' ? _prepareReportContainer() : document.querySelector('.container .main-content');
        if (!mainContent) return;

        const quotes = getFilteredQuotes();
        const kpis = computeKpis(quotes);
        const prodData = computeProductAnalytics(quotes);
        const custData = computeCustomerAnalytics(quotes);

        let tabBody = '';
        if (_activeTab === 'products') {
            tabBody = renderProductsTab(prodData, kpis);
        } else if (_activeTab === 'customers') {
            tabBody = renderCustomersTab(custData);
        } else if (_activeTab === 'trends') {
            tabBody = renderTrendsTab(_trendsYear);
        } else {
            tabBody = renderOverviewTab(quotes, kpis, prodData, custData);
        }

        mainContent.innerHTML = `
            <div class="rev-hub-wrap">
                <!-- Topbar -->
                <div class="rev-hub-topbar">
                    <div class="rev-hub-title-group">
                        <h2 class="rev-hub-title">Trung Tâm Quản Trị & Chiến Lược</h2>
                        <span class="count-pill">${quotes.length} báo giá</span>
                    </div>
                    <div class="rev-hub-tabs">
                        <button type="button" class="rev-hub-tab-btn ${_activeTab === 'overview' ? 'active' : ''}" onclick="window.switchRevenueTab('overview')">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
                            <span>Tổng quan & KPIs</span>
                        </button>
                        <button type="button" class="rev-hub-tab-btn ${_activeTab === 'products' ? 'active' : ''}" onclick="window.switchRevenueTab('products')">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                            <span>Chiến lược Sản phẩm</span>
                        </button>
                        <button type="button" class="rev-hub-tab-btn ${_activeTab === 'customers' ? 'active' : ''}" onclick="window.switchRevenueTab('customers')">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                            <span>Khách hàng & Công nợ</span>
                        </button>
                        <button type="button" class="rev-hub-tab-btn ${_activeTab === 'trends' ? 'active' : ''}" onclick="window.switchRevenueTab('trends')">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>
                            <span>Xu hướng 12 Tháng</span>
                        </button>
                    </div>
                </div>

                <!-- Thanh lọc thời gian (Áp dụng cho mọi tab trừ tab năm) -->
                ${_activeTab !== 'trends' ? renderTimeFilterBarHtml() : ''}

                <!-- Nội dung chính của Tab -->
                <div id="revHubContent" style="display:flex;flex-direction:column;gap:14px;">
                    ${tabBody}
                </div>
            </div>
        `;
    }

    // ── Các hàm xử lý tương tác Global (Window Bindings) ──
    window.showRevenueAnalyticsHub = showRevenueAnalyticsHub;

    window.switchRevenueTab = function (tab) {
        showRevenueAnalyticsHub(tab);
    };

    window.setRevenueTimeFilter = function (filterKey) {
        _activeFilter = filterKey;
        _customFrom = '';
        _customTo = '';
        showRevenueAnalyticsHub();
    };

    window.setRevenueCustomDate = function () {
        const fromEl = document.getElementById('revDateFrom');
        const toEl = document.getElementById('revDateTo');
        if (fromEl && toEl && fromEl.value && toEl.value) {
            _activeFilter = 'custom';
            _customFrom = fromEl.value;
            _customTo = toEl.value;
            showRevenueAnalyticsHub();
        }
    };

    window.changeTrendsYear = function (y) {
        _trendsYear = y;
        showRevenueAnalyticsHub('trends', y);
    };

    window.showMonthlyDetails = function (monthKey) {
        if (typeof loadSavedQuotes === 'function') loadSavedQuotes();
        const quotes = Array.isArray(window.savedQuotes) ? window.savedQuotes : [];
        const rows = quotes.filter(q => ((q.savedAt || q.createdAt || '').slice(0, 7)) === monthKey);
        const ct = document.getElementById('monthlyDetails');
        if (!ct) return;
        if (!rows.length) {
            ct.innerHTML = `<div style="color:var(--text-muted);padding:10px;">Không có báo giá cho tháng ${monthKey}.</div>`;
            return;
        }

        ct.innerHTML = `
            <div class="rev-panel-header" style="margin-bottom:10px;">
                <h4 class="rev-panel-title">Danh sách báo giá tháng ${monthKey} (${rows.length} đơn)</h4>
            </div>
            <div style="overflow-x:auto;max-height:300px;">
                <table class="quote-list-table" style="width:100%;">
                    <thead>
                        <tr>
                            <th>Mã BG</th>
                            <th>Khách hàng</th>
                            <th style="text-align:center;">Ngày</th>
                            <th style="text-align:right;">Tổng tiền</th>
                            <th style="text-align:right;">Đã nhận</th>
                            <th style="text-align:right;">Còn nợ</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map(q => {
                            const tot = Number(q.total) || 0;
                            const st = q.orderStatus || 'pending';
                            const rec = st === 'completed' ? tot : (st === 'deposited' ? (Number(q.depositAmount) || Math.round(tot * 0.4)) : 0);
                            const owe = st === 'pending' ? 0 : Math.max(0, tot - rec);
                            return `<tr>
                                <td class="td-code" onclick="if(typeof viewSavedQuote==='function') viewSavedQuote('${q.id}')" style="cursor:pointer;" title="Bấm để xem chi tiết">${escapeHtml(q.quoteNumber || q.id)}</td>
                                <td class="td-strong">${escapeHtml(q.customerName || '—')}</td>
                                <td style="text-align:center;" class="td-muted">${(q.savedAt || q.createdAt || '').slice(0, 10)}</td>
                                <td style="text-align:right;" class="td-strong">${fmt(tot)}đ</td>
                                <td style="text-align:right;color:#10b981;">${fmt(rec)}đ</td>
                                <td style="text-align:right;color:${owe > 0 ? '#ef4444' : 'var(--text-muted)'};font-weight:${owe > 0 ? '700' : 'normal'}">${fmt(owe)}đ</td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    };

    window.viewCustomerDebtDetails = function (custKey) {
        if (typeof loadSavedQuotes === 'function') loadSavedQuotes();
        const quotes = Array.isArray(window.savedQuotes) ? window.savedQuotes : [];
        const debtQuotes = quotes.filter(q => {
            const key = (q.customerPhone || '').trim() || (q.customerName || '').trim();
            if (key !== custKey) return false;
            const st = q.orderStatus || 'pending';
            const tot = Number(q.total) || 0;
            const rec = st === 'completed' ? tot : (st === 'deposited' ? (Number(q.depositAmount) || Math.round(tot * 0.4)) : 0);
            return (tot - rec) > 0 && st !== 'pending';
        });

        if (debtQuotes.length === 0) {
            alert('Khách hàng này hiện không có đơn nợ nào.');
            return;
        }

        const msg = debtQuotes.map(q => {
            const tot = Number(q.total) || 0;
            const rec = q.orderStatus === 'deposited' ? (Number(q.depositAmount) || Math.round(tot * 0.4)) : 0;
            return `• Đơn ${q.quoteNumber || q.id} (${(q.savedAt || q.createdAt || '').slice(0, 10)}): Nợ ${fmt(tot - rec)}đ (Tổng: ${fmt(tot)}đ)`;
        }).join('\n');

        alert(`CHI TIẾT ĐƠN NỢ CỦA ${custKey.toUpperCase()}:\n\n${msg}\n\n(Bấm vào mã báo giá trong danh sách để mở đơn thu tiền)`);
    };

    // ── Xuất báo cáo CSV chuẩn UTF-8 ──
    window.exportRevenueFilterCsv = function () {
        const quotes = getFilteredQuotes();
        if (!quotes.length) { alert('Không có dữ liệu để xuất.'); return; }

        const rows = quotes.map(q => {
            const tot = Number(q.total) || 0;
            const st = q.orderStatus || 'pending';
            const rec = st === 'completed' ? tot : (st === 'deposited' ? (Number(q.depositAmount) || Math.round(tot * 0.4)) : 0);
            const owe = st === 'pending' ? 0 : Math.max(0, tot - rec);
            return {
                'Mã Báo Giá': q.quoteNumber || q.id,
                'Khách Hàng': q.customerName || '',
                'Số Điện Thoại': q.customerPhone || '',
                'Địa Chỉ': q.customerAddress || '',
                'Ngày Lập': (q.savedAt || q.createdAt || '').slice(0, 10),
                'Trạng Thái': st,
                'Tổng Tiền': tot,
                'Đã Thu': rec,
                'Còn Nợ': owe
            };
        });

        const headers = Object.keys(rows[0] || {});
        const lines = [headers.join(','), ...rows.map(r => headers.map(h => `"${String(r[h]).replace(/"/g, '""')}"`).join(','))];
        const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `BaoCao_DoanhThu_${_activeFilter}.csv`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
    };

    window.exportMonthlyRevenueCsv = function (year) {
        const months = computeMonthlyRevenue(year);
        const rows = months.map(m => ({ 'Tháng': m.key, 'Tổng Doanh Thu': m.total, 'Đã Thu': m.received, 'Công Nợ': m.debt, 'Số Lượng Đơn': m.count }));
        const headers = Object.keys(rows[0] || {});
        const lines = [headers.join(','), ...rows.map(r => headers.map(h => `"${String(r[h]).replace(/"/g, '""')}"`).join(','))];
        const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `DoanhThu_12Thang_${year}.csv`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
    };

    // ── Backward-compatibility aliases cho các nút & menu cũ ──
    window.showTotalRevenue = () => showRevenueAnalyticsHub('overview');
    window.showMonthlyRevenue = () => showRevenueAnalyticsHub('trends');
    window.showAnnualStatistics = () => showRevenueAnalyticsHub('trends');
    window.renderMonthlyRevenueView = (year) => showRevenueAnalyticsHub('trends', year);
    window.renderAnnualRevenueView = (year) => showRevenueAnalyticsHub('trends', year);

})();
