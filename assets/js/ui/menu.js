/**
 * ui/menu.js
 * --------------------------------------------------
 * Left sidebar menu toggle and all menu action handlers.
 *
 * Depends on:
 *   state.js           (savedQuotes, savedCustomers)
 *   storage/storage.js (persistSavedQuotes, persistSavedCustomers)
 *   ui/notification.js (showNotification)
 * --------------------------------------------------
 */

/* ------------------------------------------------------------------ */
/*  Sidebar visibility                                                  */
/* ------------------------------------------------------------------ */

function toggleMenu() {
    const menu = document.getElementById('menuInline');
    if (!menu) return;
    const isVisible = menu.style.display !== 'none' && menu.style.display !== '';
    menu.style.display = isVisible ? 'none' : 'block';
}

/* ------------------------------------------------------------------ */
/*  Placeholder report modals (alert stubs)                            */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Customer Page                                                       */
/* ------------------------------------------------------------------ */

/** Tổng hợp dữ liệu khách hàng từ savedQuotes (nhận dạng bằng SĐT). */
function buildCustomerData() {
    const map = {}; // key = phone (hoặc name nếu không có phone)
    savedQuotes.forEach(q => {
        const key  = (q.customerPhone || '').trim() || ('__name__' + (q.customerName || '').trim());
        if (!key || key === '__name__') return;
        if (!map[key]) {
            map[key] = {
                name:      q.customerName  || '—',
                phone:     q.customerPhone || '—',
                orders:    0,
                totalPts:  0,
                usedPts:   0,
                totalDebt: 0,
                totalAmt:  0,
            };
        }
        const c   = map[key];
        // Cập nhật tên mới nhất
        if (q.customerName) c.name = q.customerName;
        const st  = q.orderStatus || 'pending';
        const tot = Number(q.total) || 0;
        const confirmed = st !== 'pending';
        if (confirmed) {
            c.orders   += 1;
            c.totalPts += Math.floor(tot / 200000);
            c.totalAmt += tot;
        }
        // Tổng nợ
        if (st === 'deposited') {
            const dep = q.depositAmount || Math.round(tot * 0.4);
            c.totalDebt += Math.max(0, tot - dep);
        } else if (st === 'no_deposit') {
            c.totalDebt += tot;
        }
        // Điểm đã dùng (nếu có trường pointsUsed)
        c.usedPts += Number(q.pointsUsed) || 0;
    });
    return Object.values(map).sort((a, b) => b.totalAmt - a.totalAmt);
}

let _cpAllData = [];

function renderCustomerPage(searchTerm) {
    const term = (searchTerm || '').toLowerCase().trim();
    const rows = _cpAllData.filter(c =>
        !term ||
        c.name.toLowerCase().includes(term) ||
        c.phone.toLowerCase().includes(term)
    );
    const fmt = v => new Intl.NumberFormat('vi-VN').format(v);
    const tbody = rows.map((c, i) => {
        const remain = c.totalPts - c.usedPts;
        return `<tr>
            <td style="text-align:center;color:#888;">${i + 1}</td>
            <td style="font-weight:600;">${escapeHtml(c.name)}</td>
            <td style="color:#555;">${escapeHtml(c.phone)}</td>
            <td style="text-align:center;font-weight:700;color:#1D75AE;">${c.orders}</td>
            <td style="text-align:right;" class="cp-pt-total">${c.totalPts.toLocaleString('vi-VN')}</td>
            <td style="text-align:right;" class="cp-pt-used">${c.usedPts.toLocaleString('vi-VN')}</td>
            <td style="text-align:right;" class="cp-pt-remain">${remain.toLocaleString('vi-VN')}</td>
            <td style="text-align:right;" class="cp-debt">${c.totalDebt > 0 ? fmt(c.totalDebt) + 'đ' : '<span style="color:#1a7a35;">0đ</span>'}</td>
            <td style="text-align:right;" class="cp-total">${fmt(c.totalAmt)}đ</td>
        </tr>`;
    }).join('');

    const ct = document.getElementById('customerPageContent');
    if (!ct) return;
    if (!rows.length) {
        ct.innerHTML = `<div style="text-align:center;padding:60px 20px;color:#aaa;">
            <div style="font-size:48px;margin-bottom:12px;">👥</div>
            <p>${term ? 'Không tìm thấy khách hàng phù hợp.' : 'Chưa có dữ liệu khách hàng (cần có đơn đã xác nhận).'}</p>
        </div>`;
        return;
    }
    ct.innerHTML = `<table class="cp-table">
        <thead><tr>
            <th style="width:40px;text-align:center;">#</th>
            <th style="width:170px;">Tên</th>
            <th style="width:120px;">Số ĐT</th>
            <th style="width:72px;text-align:center;">Số đơn</th>
            <th style="width:90px;text-align:right;">Tổng điểm</th>
            <th style="width:85px;text-align:right;">Đã dùng</th>
            <th style="width:90px;text-align:right;">Còn lại</th>
            <th style="width:120px;text-align:right;">Tổng nợ</th>
            <th style="width:130px;text-align:right;">Tổng tiền</th>
        </tr></thead>
        <tbody>${tbody}</tbody>
    </table>`;
}

function showCustomerList() {
    _cpAllData = buildCustomerData();
    const mainContent = document.querySelector('.container .main-content');
    const cpPage      = document.getElementById('customerPage');
    const plPage      = document.getElementById('productPage');
    if (mainContent) mainContent.style.display = 'none';
    if (plPage)      plPage.style.display      = 'none';
    if (cpPage)      cpPage.style.display      = 'block';
    const countEl = document.getElementById('cpCustomerCount');
    if (countEl) countEl.textContent = `${_cpAllData.length} khách hàng`;
    const searchEl = document.getElementById('cpSearch');
    if (searchEl) searchEl.value = '';
    renderCustomerPage('');
}

function showDashboard() {
    const mainContent = document.querySelector('.container .main-content');
    const cpPage      = document.getElementById('customerPage');
    const plPage      = document.getElementById('productPage');
    if (mainContent) {
        // Restore original main content if it was replaced by a report view
        if (window._savedMainContent) mainContent.innerHTML = window._savedMainContent;
        mainContent.style.display = '';
    }
    if (cpPage) cpPage.style.display = 'none';
    if (plPage) plPage.style.display = 'none';
    // Ensure the quote list is rendered after restoring the DOM
    if (typeof renderQuoteList === 'function') renderQuoteList(document.getElementById('mainQuoteSearch')?.value || '');
}

function showInventoryStats() {
    alert('Tính năng thống kê tồn kho đang phát triển.');
}

function showTotalRevenue() {
    // Render a small revenue dashboard in the main content area
    const mainContent = document.querySelector('.container .main-content');
    if (!mainContent) { alert('Không tìm thấy khu vực hiển thị.'); return; }

    // Save original main content once so we can restore it when user clicks back
    if (!window._savedMainContent) window._savedMainContent = mainContent.innerHTML;

    // Aggregate KPIs
    const totalAll = savedQuotes.reduce((s, q) => s + (Number(q.total) || 0), 0);
    const confirmedQuotes = savedQuotes.filter(q => (q.orderStatus || 'pending') !== 'pending');
    const totalConfirmed = confirmedQuotes.reduce((s, q) => s + (Number(q.total) || 0), 0);
    const received = savedQuotes.reduce((s, q) => s + (Number(q.receivedAmount) || 0), 0);
    const totalDebt = savedQuotes.reduce((s, q) => {
        const st = q.orderStatus || 'pending';
        const tot = Number(q.total) || 0;
        if (st === 'deposited') return s + Math.max(0, tot - (Number(q.depositAmount) || Math.round(tot * 0.4)));
        if (st === 'no_deposit') return s + tot;
        return s;
    }, 0);
    const confirmedCount = confirmedQuotes.length;
    const totalCount = savedQuotes.length;
    const convRate = totalCount ? Math.round((confirmedCount / totalCount) * 100) : 0;

    // Time series (last 30 days) by savedAt/createdAt
    const days = 30;
    const now = new Date();
    const series = Array.from({length: days}).map((_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1 - i));
        const key = d.toISOString().slice(0,10);
        return { key, date: d, total: 0 };
    });
    const seriesMap = Object.fromEntries(series.map(s => [s.key, s]));
    savedQuotes.forEach(q => {
        const dateStr = (q.savedAt || q.createdAt || '').slice(0,10);
        if (seriesMap[dateStr]) seriesMap[dateStr].total += Number(q.total) || 0;
    });
    const seriesVals = series.map(s => s.total);

    // Build SVG sparkline
    const maxV = Math.max(...seriesVals, 1);
    const w = 600, h = 120, pad = 6;
    const points = seriesVals.map((v, i) => {
        const x = pad + (i * (w - pad*2) / Math.max(1, seriesVals.length-1));
        const y = pad + (1 - (v / maxV)) * (h - pad*2);
        return `${x},${y}`;
    }).join(' ');

    // Status breakdown table
    const statuses = ['pending','deposited','no_deposit','completed'];
    const statusRows = statuses.map(st => {
        const rows = savedQuotes.filter(q => (q.orderStatus || 'pending') === st);
        const sum = rows.reduce((s,q)=>s+(Number(q.total)||0),0);
        return `<tr><td style="text-transform:capitalize;">${st}</td><td style="text-align:right">${rows.length}</td><td style="text-align:right">${new Intl.NumberFormat('vi-VN').format(sum)} đ</td></tr>`;
    }).join('');

    mainContent.style.display = '';
    mainContent.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:12px;">
            <div style="display:flex;gap:12px;align-items:center;">
                <button class="cp-back-btn" onclick="showDashboard()">&#8592; Quay lại</button>
                <h2 style="margin:0;">📈 Tổng doanh thu</h2>
            </div>
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;">
                <div class="stat-card"><div class="stat-label">Tổng (tất cả)</div><div class="stat-value">${new Intl.NumberFormat('vi-VN').format(totalAll)}đ</div></div>
                <div class="stat-card"><div class="stat-label">Tổng đã xác nhận</div><div class="stat-value">${new Intl.NumberFormat('vi-VN').format(totalConfirmed)}đ</div></div>
                <div class="stat-card"><div class="stat-label">Đã nhận</div><div class="stat-value">${new Intl.NumberFormat('vi-VN').format(received)}đ</div></div>
                <div class="stat-card"><div class="stat-label">Tổng nợ</div><div class="stat-value" style="color:#c0392b;">${new Intl.NumberFormat('vi-VN').format(totalDebt)}đ</div></div>
            </div>

            <div style="display:flex;gap:12px;align-items:flex-start;">
                <div style="flex:1;background:#fff;padding:12px;border-radius:10px;border:1px solid #e6eef7;">
                    <div style="font-weight:700;margin-bottom:8px;">Doanh thu trong 30 ngày</div>
                    <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="width:100%;height:120px;">
                        <polyline fill="none" stroke="#1D75AE" stroke-width="2" points="${points}" />
                    </svg>
                </div>
                <div style="width:280px;background:#fff;padding:12px;border-radius:10px;border:1px solid #e6eef7;">
                    <div style="font-weight:700;margin-bottom:8px;">Tổng quan trạng thái</div>
                    <table style="width:100%;font-size:13px;border-collapse:collapse;"><thead><tr><th>Trạng thái</th><th style="text-align:right">Số</th><th style="text-align:right">Tổng</th></tr></thead><tbody>${statusRows}</tbody></table>
                </div>
            </div>

            <div style="background:#fff;padding:12px;border-radius:10px;border:1px solid #e6eef7;">
                <div style="font-weight:700;margin-bottom:8px;">Danh sách báo giá (gần đây)</div>
                <div style="overflow:auto;max-height:320px;">
                    <table class="quote-list-table" style="width:100%;">
                        <thead><tr><th>Mã</th><th>KH</th><th>Ngày</th><th style="text-align:right">Tổng</th><th style="text-align:right">Đã nhận</th><th style="text-align:right">Còn nợ</th></tr></thead>
                        <tbody>${savedQuotes.slice(0,50).map(q=>{
                            const tot=Number(q.total)||0; const rec=Number(q.receivedAmount)||0; const owe=Math.max(0, tot-rec);
                            return `<tr><td>${escapeHtml(q.quoteNumber||q.id)}</td><td>${escapeHtml(q.customerName||'—')}</td><td>${(q.savedAt||q.createdAt||'').slice(0,10)}</td><td style="text-align:right">${new Intl.NumberFormat('vi-VN').format(tot)} đ</td><td style="text-align:right">${new Intl.NumberFormat('vi-VN').format(rec)} đ</td><td style="text-align:right">${new Intl.NumberFormat('vi-VN').format(owe)} đ</td></tr>`
                        }).join('')}</tbody>
                    </table>
                </div>
            </div>
        </div>`;
}

function showMonthlyRevenue() {
    // default year = current year
    const year = (new Date()).getFullYear();
    renderMonthlyRevenueView(year);
}

function showAnnualStatistics() {
    const year = (new Date()).getFullYear();
    renderAnnualRevenueView(year);
}

function computeAnnualStats(year) {
    // Initialize 12 months
    const months = [];
    for (let m = 1; m <= 12; m++) {
        const mm = String(m).padStart(2, '0');
        const key = `${year}-${mm}`;
        months.push({ key, label: `Tháng ${m}`, revenue: 0, received: 0, debt: 0, discount: 0, purchases: 0, profit: 0, count: 0 });
    }
    const map = Object.fromEntries(months.map(m => [m.key, m]));
    // Aggregate from savedQuotes
    savedQuotes.forEach(q => {
        const ds = (q.savedAt || q.createdAt || '').slice(0,7);
        if (!ds) return;
        if (!map[ds]) return;
        const entry = map[ds];
        const tot = Number(q.total) || 0;
        entry.revenue += tot;
        entry.received += Number(q.receivedAmount) || 0;
        const st = q.orderStatus || 'pending';
        if (st === 'deposited') {
            const dep = Number(q.depositAmount) || Math.round(tot * 0.4);
            entry.debt += Math.max(0, tot - dep);
        } else if (st === 'no_deposit') {
            entry.debt += tot;
        }
        // Discounts: sum per-item discount * qty when available
        if (Array.isArray(q.items)) {
            q.items.forEach(it => {
                const disc = Number(it.discount) || 0;
                const qty = Number(it.qty || it.quantity) || 0;
                entry.discount += disc * qty;
                // Purchases (nhập hàng): try cost/costPrice fields if present
                const cost = Number(it.cost) || Number(it.purchasePrice) || 0;
                entry.purchases += cost * qty;
            });
        }
        entry.count += 1;
    });
    // Profit = revenue - purchases - discount
    months.forEach(m => {
        m.profit = m.revenue - m.purchases - m.discount;
    });
    return months;
}

function renderAnnualRevenueView(year) {
    const mainContent = document.querySelector('.container .main-content');
    if (!mainContent) { alert('Không tìm thấy khu vực hiển thị.'); return; }
    if (!window._savedMainContent) window._savedMainContent = mainContent.innerHTML;
    const months = computeAnnualStats(year);
    const revs = months.map(m => m.revenue);
    const discs = months.map(m => m.discount);
    const purs = months.map(m => m.purchases);
    const profs = months.map(m => m.profit);
    const maxV = Math.max(...revs, ...discs, ...purs, ...profs, 1);
    const w = 820, h = 260, pad = 28;
    const pointsFor = arr => arr.map((v,i)=>{const x=pad+(i*(w-pad*2)/11);const y=pad+(1-(v/maxV))*(h-pad*2);return `${x},${y}`;}).join(' ');
    const revPoints = pointsFor(revs);
    const discPoints = pointsFor(discs);
    const purPoints = pointsFor(purs);
    const profPoints = pointsFor(profs);

    mainContent.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:12px;">
            <div style="display:flex;gap:12px;align-items:center;">
                <button class="cp-back-btn" onclick="showDashboard()">&#8592; Quay lại</button>
                <h2 style="margin:0;">📈 Thống kê năm - ${year}</h2>
                <div style="margin-left:auto;display:flex;gap:8px;align-items:center;">
                    <button class="btn" onclick="renderAnnualRevenueView(${year-1})">◄</button>
                    <strong>${year}</strong>
                    <button class="btn" onclick="renderAnnualRevenueView(${year+1})">►</button>
                </div>
            </div>

            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;">
                <div class="stat-card"><div class="stat-label">Tổng doanh thu</div><div class="stat-value">${new Intl.NumberFormat('vi-VN').format(months.reduce((s,m)=>s+m.revenue,0))}đ</div></div>
                <div class="stat-card"><div class="stat-label">Tổng chiết khấu</div><div class="stat-value" style="color:#e67e22;">${new Intl.NumberFormat('vi-VN').format(months.reduce((s,m)=>s+m.discount,0))}đ</div></div>
                <div class="stat-card"><div class="stat-label">Tổng nhập hàng</div><div class="stat-value">${new Intl.NumberFormat('vi-VN').format(months.reduce((s,m)=>s+m.purchases,0))}đ</div></div>
                <div class="stat-card highlight"><div class="stat-label">Lợi nhuận</div><div class="stat-value">${new Intl.NumberFormat('vi-VN').format(months.reduce((s,m)=>s+m.profit,0))}đ</div></div>
            </div>

            <div style="background:#fff;padding:12px;border-radius:10px;border:1px solid #e6eef7;">
                <div style="font-weight:700;margin-bottom:8px;">Biểu đồ theo tháng</div>
                <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="width:100%;height:260px;">
                    <polyline fill="none" stroke="#1D75AE" stroke-width="2" points="${revPoints}" />
                    <polyline fill="none" stroke="#e67e22" stroke-width="2" points="${discPoints}" />
                    <polyline fill="none" stroke="#8e44ad" stroke-width="2" points="${purPoints}" />
                    <polyline fill="none" stroke="#1a7a35" stroke-width="2" points="${profPoints}" />
                    ${months.map((m,i)=>`<text x="${pad + i*(w-pad*2)/11}" y="${h-6}" font-size="11" fill="#333" text-anchor="middle">${i+1}</text>`).join('\n')}
                </svg>
                <div style="display:flex;gap:12px;margin-top:8px;align-items:center;">
                    <div style="display:flex;gap:8px;align-items:center;"><span style="width:12px;height:12px;background:#1D75AE;display:inline-block;border-radius:2px;"></span>Doanh thu</div>
                    <div style="display:flex;gap:8px;align-items:center;"><span style="width:12px;height:12px;background:#e67e22;display:inline-block;border-radius:2px;"></span>Chiết khấu</div>
                    <div style="display:flex;gap:8px;align-items:center;"><span style="width:12px;height:12px;background:#8e44ad;display:inline-block;border-radius:2px;"></span>Nhập hàng</div>
                    <div style="display:flex;gap:8px;align-items:center;"><span style="width:12px;height:12px;background:#1a7a35;display:inline-block;border-radius:2px;"></span>Lợi nhuận</div>
                </div>
            </div>
            <div id="annualDetails" style="background:#fff;padding:12px;border-radius:10px;border:1px solid #e6eef7;min-height:80px;">Chọn tháng để xem chi tiết báo giá.</div>
        </div>`;

    // Add click handlers for month labels to show details
    // We'll expose a simple handler on the global to reuse existing showMonthlyDetails-like view
    window.showAnnualMonthDetails = function(monthKey) {
        loadSavedQuotes();
        const rows = savedQuotes.filter(q => ((q.savedAt||q.createdAt||'').slice(0,7)) === monthKey);
        const ct = document.getElementById('annualDetails');
        if (!ct) return;
        if (!rows.length) { ct.innerHTML = '<div>Không có báo giá cho tháng này.</div>'; return; }
        ct.innerHTML = `<div style="font-weight:700;margin-bottom:8px;">Danh sách báo giá ${monthKey} (${rows.length})</div><div style="overflow:auto;max-height:320px;"><table class="quote-list-table" style="width:100%;"><thead><tr><th>Mã</th><th>KH</th><th>Ngày</th><th style="text-align:right">Tổng</th><th style="text-align:right">Chiết khấu</th><th style="text-align:right">Nhập hàng</th><th style="text-align:right">Lợi nhuận</th></tr></thead><tbody>${rows.map(q=>{const tot=Number(q.total)||0;const disc=(Array.isArray(q.items)?q.items.reduce((s,it)=>s+((Number(it.discount)||0)*(Number(it.qty||it.quantity)||0)),0):0);const pur=(Array.isArray(q.items)?q.items.reduce((s,it)=>s+((Number(it.cost)||Number(it.purchasePrice)||0)*(Number(it.qty||it.quantity)||0)),0):0);const prof=tot-pur-disc;return `<tr><td>${escapeHtml(q.quoteNumber||q.id)}</td><td>${escapeHtml(q.customerName||'—')}</td><td>${(q.savedAt||q.createdAt||'').slice(0,10)}</td><td style="text-align:right">${new Intl.NumberFormat('vi-VN').format(tot)} đ</td><td style="text-align:right">${new Intl.NumberFormat('vi-VN').format(disc)} đ</td><td style="text-align:right">${new Intl.NumberFormat('vi-VN').format(pur)} đ</td><td style="text-align:right">${new Intl.NumberFormat('vi-VN').format(prof)} đ</td></tr>`}).join('')}</tbody></table></div>`;
    };
}

/**
 * Compute monthly aggregates for a given year.
 * Returns array of 12 months [{key:'YYYY-MM', label:'Tháng X', total, received, debt, count}]
 */
function computeMonthlyRevenue(year) {
    const months = [];
    for (let m = 1; m <= 12; m++) {
        const mm = String(m).padStart(2, '0');
        const key = `${year}-${mm}`;
        months.push({ key, label: `Tháng ${m}`, total: 0, received: 0, debt: 0, count: 0 });
    }
    const map = Object.fromEntries(months.map(m => [m.key, m]));
    savedQuotes.forEach(q => {
        const ds = (q.savedAt || q.createdAt || '').slice(0,7);
        if (!ds) return;
        if (!map[ds]) return;
        const entry = map[ds];
        const tot = Number(q.total) || 0;
        entry.total += tot;
        entry.received += Number(q.receivedAmount) || 0;
        const st = q.orderStatus || 'pending';
        if (st === 'deposited') {
            const dep = Number(q.depositAmount) || Math.round(tot * 0.4);
            entry.debt += Math.max(0, tot - dep);
        } else if (st === 'no_deposit') {
            entry.debt += tot;
        } else if (st === 'completed') {
            // no debt
        }
        entry.count += 1;
    });
    return months;
}

function renderMonthlyRevenueView(year) {
    const mainContent = document.querySelector('.container .main-content');
    if (!mainContent) { alert('Không tìm thấy khu vực hiển thị.'); return; }
    // Save original main content once so we can restore it when user clicks back
    if (!window._savedMainContent) window._savedMainContent = mainContent.innerHTML;
    const months = computeMonthlyRevenue(year);
    const totals = months.map(m => m.total);
    const maxV = Math.max(...totals, 1);
    const w = 760, h = 180, pad = 18;
    const barW = Math.floor((w - pad*2) / 12) - 8;

    // KPIs
    const yearTotal = months.reduce((s,m)=>s+m.total,0);
    const yearReceived = months.reduce((s,m)=>s+m.received,0);
    const yearDebt = months.reduce((s,m)=>s+m.debt,0);
    const yearCount = months.reduce((s,m)=>s+m.count,0);

    const monthBars = months.map((m, i) => {
        const x = pad + i * ((w - pad*2) / 12);
        const hVal = Math.round((m.total / maxV) * (h - pad*2));
        const y = pad + (h - pad*2) - hVal;
        return `<g onclick="showMonthlyDetails('${m.key}')" style="cursor:pointer"><rect x="${x}" y="${y}" width="${barW}" height="${hVal}" fill="#1D75AE"></rect><text x="${x+barW/2}" y="${h-4}" font-size="11" fill="#333" text-anchor="middle">${i+1}</text></g>`;
    }).join('\n');

    mainContent.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:12px;">
            <div style="display:flex;gap:12px;align-items:center;">
                <button class="cp-back-btn" onclick="showDashboard()">&#8592; Quay lại</button>
                <h2 style="margin:0;">📊 Doanh thu theo tháng - ${year}</h2>
                <div style="margin-left:auto;display:flex;gap:8px;align-items:center;">
                    <button class="btn" onclick="renderMonthlyRevenueView(${year-1})">◄</button>
                    <strong>${year}</strong>
                    <button class="btn" onclick="renderMonthlyRevenueView(${year+1})">►</button>
                    <button class="btn" onclick="exportMonthlyRevenueCsv(${year})">📥 Xuất CSV</button>
                </div>
            </div>

            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;">
                <div class="stat-card"><div class="stat-label">Tổng năm</div><div class="stat-value">${new Intl.NumberFormat('vi-VN').format(yearTotal)}đ</div></div>
                <div class="stat-card"><div class="stat-label">Đã nhận</div><div class="stat-value">${new Intl.NumberFormat('vi-VN').format(yearReceived)}đ</div></div>
                <div class="stat-card"><div class="stat-label">Tổng nợ</div><div class="stat-value" style="color:#c0392b;">${new Intl.NumberFormat('vi-VN').format(yearDebt)}đ</div></div>
                <div class="stat-card"><div class="stat-label">Số đơn</div><div class="stat-value">${yearCount}</div></div>
            </div>

            <div style="background:#fff;padding:12px;border-radius:10px;border:1px solid #e6eef7;">
                <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="width:100%;height:180px;">${monthBars}</svg>
            </div>

            <div id="monthlyDetails" style="background:#fff;padding:12px;border-radius:10px;border:1px solid #e6eef7;min-height:80px;">
                <div style="font-weight:700;margin-bottom:8px;">Chi tiết: Chọn tháng để xem danh sách báo giá</div>
            </div>
        </div>`;
}

function exportMonthlyRevenueCsv(year) {
    const months = computeMonthlyRevenue(year);
    const rows = months.map(m => ({ Thang: m.key, Tong: m.total, DaNhan: m.received, No: m.debt, SoDon: m.count }));
    const headers = Object.keys(rows[0] || {});
    if (!rows.length) { alert('Không có dữ liệu để xuất.'); return; }
    const lines = [headers.join(','), ...rows.map(r => headers.map(h => `"${String(r[h]).replace(/"/g,'""')}"`).join(','))];
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `doanhthu_${year}.csv`; a.click(); setTimeout(()=>URL.revokeObjectURL(url),10000);
}

function showMonthlyDetails(monthKey) {
    loadSavedQuotes();
    const rows = savedQuotes.filter(q => ((q.savedAt||q.createdAt||'').slice(0,7)) === monthKey);
    const ct = document.getElementById('monthlyDetails');
    if (!ct) return;
    if (!rows.length) { ct.innerHTML = '<div>Không có báo giá cho tháng này.</div>'; return; }
    ct.innerHTML = `<div style="font-weight:700;margin-bottom:8px;">Danh sách báo giá ${monthKey} (${rows.length})</div><div style="overflow:auto;max-height:320px;"><table class="quote-list-table" style="width:100%;"><thead><tr><th>Mã</th><th>KH</th><th>Ngày</th><th style="text-align:right">Tổng</th><th style="text-align:right">Đã nhận</th><th style="text-align:right">Còn nợ</th></tr></thead><tbody>${rows.map(q=>{const tot=Number(q.total)||0;const rec=Number(q.receivedAmount)||0;const owe=Math.max(0,tot-rec);return `<tr><td>${escapeHtml(q.quoteNumber||q.id)}</td><td>${escapeHtml(q.customerName||'—')}</td><td>${(q.savedAt||q.createdAt||'').slice(0,10)}</td><td style="text-align:right">${new Intl.NumberFormat('vi-VN').format(tot)} đ</td><td style="text-align:right">${new Intl.NumberFormat('vi-VN').format(rec)} đ</td><td style="text-align:right">${new Intl.NumberFormat('vi-VN').format(owe)} đ</td></tr>`}).join('')}</tbody></table></div>`;
}

function showCustomRevenue() {
    alert('Tính năng thống kê doanh thu tùy chọn đang phát triển.');
}

function editCompanyInfo() {
    alert('Tính năng chỉnh sửa thông tin công ty đang phát triển.');
}

function editBankInfo() {
    alert('Tính năng chỉnh sửa thông tin ngân hàng đang phát triển.');
}

function templateSettings() {
    alert('Tính năng cài đặt mẫu in đang phát triển.');
}

function showHelp() {
    alert(
        'HƯỚNG DẪN SỬ DỤNG\n\n' +
        '1. Nhập thông tin khách hàng\n' +
        '2. Chọn loại báo giá (In Ly / In Khác)\n' +
        '3. Thêm sản phẩm và số lượng\n' +
        '4. Kiểm tra tổng tiền và đặt cọc\n' +
        '5. Xem preview rồi xuất PDF / JPG\n' +
        '6. Lưu báo giá để tra cứu sau\n'
    );
}

function showAbout() {
    alert(
        'THANH PHÁT – BÁO GIÁ\n\n' +
        'Phần mềm quản lý báo giá in ấn\n' +
        'Phiên bản: 2.0\n' +
        'Liên hệ: 0966 767 731\n' +
        'Email: thanhhien.po24@gmail.com'
    );
}

/* ------------------------------------------------------------------ */
/*  Download statistics / data                                         */
/* ------------------------------------------------------------------ */

function downloadStatistics() {
    const data = savedQuotes.map(q => ({
        'Số BG': q.quoteNumber || '',
        'Khách hàng': q.customerName || '',
        'SĐT': q.customerPhone || '',
        'Tổng tiền': q.total || 0,
        'Ngày': q.date || '',
    }));
    _downloadCsvOrAlert(data, 'thongke_baogia.csv', 'Thống kê báo giá');
}

function downloadCustomerData() {
    const data = Object.values(savedCustomers).map(c => ({
        'Mã KH': c.code || '',
        'Tên': c.name || '',
        'SĐT': c.phone || '',
        'Địa chỉ': c.address || '',
    }));
    _downloadCsvOrAlert(data, 'danh_sach_khach_hang.csv', 'Danh sách khách hàng');
}

function downloadRevenueReport() {
    downloadStatistics();
}

function _downloadCsvOrAlert(rows, filename, label) {
    if (!rows.length) {
        alert(`Chưa có dữ liệu ${label}.`);
        return;
    }
    const headers = Object.keys(rows[0]);
    const lines   = [
        headers.join(','),
        ...rows.map(r => headers.map(h => `"${String(r[h]).replace(/"/g, '""')}"`).join(',')),
    ];
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    showNotification(`Đã tải file ${filename}!`);
}

/* ------------------------------------------------------------------ */
/*  Demo Excel template                                                 */
/* ------------------------------------------------------------------ */

function createDemoExcelFile(fileName) {
    // Build a minimal XLSX template via a downloadable CSV for simplicity
    const demoRows = [
        ['TÊN', 'ĐVT', 'GIÁ (nghìn đồng)'],
        ['Ly in 8oz', 'Cái', '8'],
        ['Ly in 12oz', 'Cái', '10'],
        ['Ly in 16oz', 'Cái', '12'],
        ['Túi giấy A4', 'Cái', '5'],
        ['Hộp carton', 'Cái', '15'],
    ];
    const lines   = demoRows.map(r => r.map(c => `"${c}"`).join(','));
    const blob    = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url     = URL.createObjectURL(blob);
    const a       = document.createElement('a');
    a.href        = url;
    a.download    = fileName || 'mau_san_pham.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    showNotification('Đã tải file mẫu!');
}

/* ------------------------------------------------------------------ */
/*  Data management                                                     */
/* ------------------------------------------------------------------ */

function clearAllData() {
    if (!confirm('Xóa toàn bộ dữ liệu đã lưu? Hành động này không thể hoàn tác!')) return;
    localStorage.clear();
    savedQuotes.length    = 0;
    Object.keys(savedCustomers).forEach(k => delete savedCustomers[k]);
    showNotification('Đã xóa toàn bộ dữ liệu!');
}

function exportData() {
    const payload = {
        quotes:    savedQuotes,
        customers: savedCustomers,
        exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `tp_backup_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    showNotification('Đã xuất file sao lưu!');
}

function importData() {
    const input    = document.createElement('input');
    input.type     = 'file';
    input.accept   = '.json';
    input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            try {
                const data = JSON.parse(ev.target.result);
                if (data.quotes) {
                    savedQuotes.length = 0;
                    data.quotes.forEach(q => savedQuotes.push(q));
                    persistSavedQuotes();
                }
                if (data.customers) {
                    Object.keys(savedCustomers).forEach(k => delete savedCustomers[k]);
                    Object.assign(savedCustomers, data.customers);
                    persistSavedCustomers();
                }
                showNotification('Đã nhập dữ liệu thành công!');
            } catch (_) {
                showNotification('Lỗi: file không hợp lệ!');
            }
        };
        reader.readAsText(file, 'utf-8');
    };
    input.click();
}

/* ------------------------------------------------------------------ */
/*  Product List Page                                                   */
/* ------------------------------------------------------------------ */

/** Tính SL đã bán & tổng tiền đã bán của từng sản phẩm từ savedQuotes */
function _buildProductStats() {
    const stats = {}; // key = product name
    loadSavedQuotes();
    savedQuotes.forEach(function(q) {
        (q.items || []).forEach(function(item) {
            const n = (item.name || '').trim();
            if (!n) return;
            if (!stats[n]) stats[n] = { qty: 0, revenue: 0 };
            stats[n].qty     += Number(item.qty)       || 0;
            stats[n].revenue += Number(item.lineTotal)  || 0;
        });
    });
    return stats;
}

let _plAllData    = [];
let _plSearchTerm = '';
let _plPage = 1;
const _plPageSize = 10;

function renderProductPage(searchTerm, page) {
    _plSearchTerm = (searchTerm || '').toLowerCase().trim();
    _plPage = (typeof page === 'number' && page >= 1) ? Math.floor(page) : (_plPage || 1);
    loadSavedProducts();
    const stats = _buildProductStats();
    const fmt   = v => new Intl.NumberFormat('vi-VN').format(v);

    const filtered = _plAllData.filter(function(p) {
        return !_plSearchTerm ||
            (p.name || '').toLowerCase().includes(_plSearchTerm) ||
            (p.unit || '').toLowerCase().includes(_plSearchTerm);
    });

    const ct = document.getElementById('productPageContent');
    if (!ct) return;

    const countEl = document.getElementById('plProductCount');
    if (countEl) countEl.textContent = _plAllData.length + ' sản phẩm';

    if (!filtered.length) {
        ct.innerHTML = `<div style="text-align:center;padding:60px 20px;color:#aaa;">
            <div style="font-size:48px;margin-bottom:12px;">📦</div>
            <p>${_plSearchTerm ? 'Không tìm thấy sản phẩm phù hợp.' : 'Chưa có sản phẩm nào trong danh mục. Hãy lập báo giá để tự động thêm sản phẩm!'}</p>
        </div>`;
        // update pager
        updatePager(1,1);
        return;
    }

    const totalPages = Math.max(1, Math.ceil(filtered.length / _plPageSize));
    if (!_plPage || _plPage < 1) _plPage = 1;
    if (_plPage > totalPages) _plPage = totalPages;

    const startIndex = (_plPage - 1) * _plPageSize;
    const pageItems = filtered.slice(startIndex, startIndex + _plPageSize);

    const rows = pageItems.map(function(p, idx) {
        const i = startIndex + idx;
        const s      = stats[p.name] || { qty: 0, revenue: 0 };
        const safeN  = escapeHtml(p.name);
        const safeU  = escapeHtml(p.unit || '');
        const safeC  = escapeHtml(p.code || '');
        const nameJS = p.name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        return `<tr>
            <td style="text-align:center;color:#888;">${i + 1}</td>
            <td style="text-align:center;color:#666;">${safeC}</td>
            <td class="pl-td-name" style="font-weight:600;" title="${safeN}">${safeN}</td>
            <td class="pl-td-unit">${safeU}</td>
            <td style="text-align:right;color:#0d5c92;font-weight:700;">${fmt(p.price)}đ</td>
            <td style="text-align:right;color:#e67e22;">${fmt(s.qty)}</td>
            <td style="text-align:right;color:#1a7a35;font-weight:700;">${fmt(s.revenue)}đ</td>
            <td style="text-align:center;white-space:nowrap;">
                <button class="pl-btn-edit" onclick="openEditProduct('${nameJS}')" title="Sửa">✏️</button>
                <button class="pl-btn-del"  onclick="confirmDeleteProduct('${nameJS}')" title="Xóa">🗑</button>
            </td>
        </tr>`;
    }).join('');

    ct.innerHTML = `<table class="pl-table">
        <thead><tr>
            <th style="width:42px;text-align:center;">#</th>
            <th style="width:120px;text-align:center;">Mã</th>
            <th style="width:320px;">Tên sản phẩm</th>
            <th style="width:80px;">ĐVT</th>
            <th style="width:130px;text-align:right;">Đơn giá</th>
            <th style="width:100px;text-align:right;">SL đã bán</th>
            <th style="width:150px;text-align:right;">Tổng tiền bán</th>
            <th style="width:76px;text-align:center;">Thao tác</th>
        </tr></thead>
        <tbody>${rows}</tbody>
    </table>`;

    updatePager(_plPage, totalPages);
}

function updatePager(page, totalPages) {
    const ind = document.getElementById('plPagerIndicator');
    if (ind) ind.textContent = (page || 1) + '/' + (totalPages || 1);
    const prev = document.getElementById('plPrevBtn');
    const next = document.getElementById('plNextBtn');
    if (prev) prev.disabled = (page <= 1);
    if (next) next.disabled = (page >= totalPages);
}

function plPrevPage() { if (_plPage > 1) { _plPage--; renderProductPage(_plSearchTerm, _plPage); } }
function plNextPage() { _plPage++; renderProductPage(_plSearchTerm, _plPage); }
window.plPrevPage = plPrevPage; window.plNextPage = plNextPage;

function showProductList() {
    loadSavedProducts();
    _plAllData = (savedProducts || []).slice().sort(function(a, b) {
        return (a.name || '').localeCompare(b.name || '', 'vi');
    });

    // Hide main, show product page
    const mainContent = document.querySelector('.container .main-content');
    const cpPage      = document.getElementById('customerPage');
    const plPage      = document.getElementById('productPage');
    if (mainContent) mainContent.style.display = 'none';
    if (cpPage)      cpPage.style.display      = 'none';
    if (plPage)      plPage.style.display      = 'block';

    const s = document.getElementById('plSearch');
    if (s) s.value = '';
    _plPage = 1;
    renderProductPage('', 1);
}

/** Mở form sửa sản phẩm (inline mini-modal) */
function openEditProduct(productName) {
    loadSavedProducts();
    const p = savedProducts.find(function(x) { return x.name === productName; });
    if (!p) return;

    const modal = document.getElementById('editProductModal');
    if (!modal) return;
    document.getElementById('epName').value  = p.name;
    document.getElementById('epUnit').value  = p.unit  || '';
    document.getElementById('epPrice').value = p.price > 0 ? new Intl.NumberFormat('vi-VN').format(p.price) : '';
    document.getElementById('epPrice').dataset.raw = String(p.price || 0);
    document.getElementById('epOrigName').value = p.name;
    const codeEl = document.getElementById('epCode');
    if (codeEl) codeEl.value = p.code || '';
    modal.style.display = 'flex';
}

function closeEditProductModal() {
    const modal = document.getElementById('editProductModal');
    if (modal) modal.style.display = 'none';
}

function saveEditProduct() {
    const origName = (document.getElementById('epOrigName')?.value || '').trim();
    const newName  = (document.getElementById('epName')?.value  || '').trim();
    const newUnit  = (document.getElementById('epUnit')?.value  || '').trim();
    const rawPrice = parseInt((document.getElementById('epPrice')?.dataset?.raw || '0'), 10) || 0;

    if (!newName) { showNotification('⚠️ Tên sản phẩm không được để trống!', 'error'); return; }

    loadSavedProducts();
    // Remove old entry if name changed
    if (origName && origName !== newName) {
        savedProducts = savedProducts.filter(function(p) { return p.name !== origName; });
        persistSavedProducts();
    }
    upsertProduct(newName, newUnit, rawPrice);
    closeEditProductModal();
    showNotification('✅ Đã cập nhật: ' + newName + ' — Giá mới áp dụng cho báo giá tạo về sau.');

    // Re-load to get freshest data then re-render
    loadSavedProducts();
    _plAllData = (savedProducts || []).slice().sort(function(a, b) {
        return (a.name || '').localeCompare(b.name || '', 'vi');
    });
    renderProductPage(_plSearchTerm);
}

function confirmDeleteProduct(productName) {
    if (!confirm('Xóa sản phẩm "' + productName + '" khỏi danh mục?')) return;
    deleteProduct(productName);
    loadSavedProducts();
    _plAllData = (savedProducts || []).slice().sort(function(a, b) {
        return (a.name || '').localeCompare(b.name || '', 'vi');
    });
    showNotification('Đã xóa: ' + productName);
    renderProductPage(_plSearchTerm);
}

function showProductListDashboard() {
    showDashboard();
}

