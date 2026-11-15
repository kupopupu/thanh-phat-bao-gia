/**
 * ui/menu.js
 * --------------------------------------------------
 * Sidebar navigation & all workspace views (Khách hàng, Sản phẩm, Báo cáo).
 * Chuẩn hóa theo hệ màu thương hiệu Thanh Phát:
 *   Xanh Đen (#0a192f) – Trắng (#ffffff) – Xanh Da Trời Pastel (#f0f7ff / #e0effe)
 * --------------------------------------------------
 */

/* ------------------------------------------------------------------ */
/*  Sidebar Active State & Visibility                                  */
/* ------------------------------------------------------------------ */

function _setActiveNav(navId) {
    if (navId === 'sbNavRevenue' || navId === 'sbNavMonthly' || navId === 'sbNavAnnual') {
        navId = 'sbNavRevenueHub';
    }
    document.querySelectorAll('#menuInline .sb-item').forEach(btn => {
        btn.classList.toggle('active', btn.id === navId);
    });
    // Tự động đóng menu drawer trên Mobile khi người dùng chọn mục
    if (window.innerWidth <= 768) {
        closeMobileMenu();
    }
}

function toggleMobileMenu() {
    const menu = document.getElementById('menuInline');
    const backdrop = document.getElementById('mobileDrawerBackdrop');
    if (!menu) return;
    const isOpen = menu.classList.contains('mobile-open');
    if (isOpen) {
        closeMobileMenu();
    } else {
        menu.classList.add('mobile-open');
        if (backdrop) backdrop.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeMobileMenu() {
    const menu = document.getElementById('menuInline');
    const backdrop = document.getElementById('mobileDrawerBackdrop');
    if (menu) menu.classList.remove('mobile-open');
    if (backdrop) backdrop.classList.remove('active');
    document.body.style.overflow = '';
}

window.toggleMobileMenu = toggleMobileMenu;
window.closeMobileMenu = closeMobileMenu;

function showQuoteList() {
    showDashboard();
}
window.showQuoteList = showQuoteList;

/**
 * Cập nhật số lượng hiển thị trên các badge của Sidebar theo thời gian thực.
 */
function updateSidebarBadges() {
    try {
        const qBadge = document.getElementById('sbBadgeQuotes');
        if (qBadge) {
            const count = Array.isArray(window.savedQuotes) ? window.savedQuotes.length : 0;
            qBadge.textContent = String(count);
        }
        const cBadge = document.getElementById('sbBadgeCustomers');
        if (cBadge) {
            const count = typeof buildCustomerData === 'function' ? buildCustomerData().length : 0;
            cBadge.textContent = String(count);
        }
        const pBadge = document.getElementById('sbBadgeProducts');
        if (pBadge) {
            const count = Array.isArray(window.savedProducts) ? window.savedProducts.length : 0;
            pBadge.textContent = String(count);
        }
    } catch (e) {
        console.warn('updateSidebarBadges error:', e);
    }
}
window.updateSidebarBadges = updateSidebarBadges;

function toggleMenu() {
    const menu = document.getElementById('menuInline');
    if (!menu) return;
    const isVisible = menu.style.display !== 'none' && menu.style.display !== '';
    menu.style.display = isVisible ? 'none' : 'block';
}

/* ------------------------------------------------------------------ */
/*  Customer Page (Danh sách Khách Hàng)                               */
/* ------------------------------------------------------------------ */

/** Tổng hợp dữ liệu khách hàng từ savedQuotes (nhận dạng bằng SĐT). */
function buildCustomerData() {
    const map = {};
    savedQuotes.forEach(q => {
        const key = (q.customerPhone || '').trim() || ('__name__' + (q.customerName || '').trim());
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
        const c = map[key];
        if (q.customerName) c.name = q.customerName;
        const st  = q.orderStatus || 'pending';
        const tot = Number(q.total) || 0;
        const confirmed = st !== 'pending';
        if (confirmed) {
            c.orders   += 1;
            c.totalPts += Math.floor(tot / 200000);
            c.totalAmt += tot;
        }
        if (st === 'deposited') {
            const dep = q.depositAmount || Math.round(tot * 0.4);
            c.totalDebt += Math.max(0, tot - dep);
        } else if (st === 'no_deposit') {
            c.totalDebt += tot;
        }
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
        const remain = Math.max(0, c.totalPts - c.usedPts);
        return `<tr>
            <td style="text-align:center;" class="td-muted">${i + 1}</td>
            <td class="td-strong">${escapeHtml(c.name)}</td>
            <td class="td-muted">${escapeHtml(c.phone)}</td>
            <td style="text-align:center;" class="td-code">${c.orders}</td>
            <td style="text-align:right;" class="td-medium">${c.totalPts.toLocaleString('vi-VN')}</td>
            <td style="text-align:right;" class="td-muted">${c.usedPts.toLocaleString('vi-VN')}</td>
            <td style="text-align:right;" class="td-strong">${remain.toLocaleString('vi-VN')}</td>
            <td style="text-align:right;" class="${c.totalDebt > 0 ? 'td-strong' : 'td-muted'}">${fmt(c.totalDebt)}đ</td>
            <td style="text-align:right;" class="td-strong">${fmt(c.totalAmt)}đ</td>
        </tr>`;
    }).join('');

    const ct = document.getElementById('customerPageContent');
    if (!ct) return;
    if (!rows.length) {
        ct.innerHTML = `<div style="text-align:center;padding:56px 20px;color:var(--text-muted);background:var(--pastel-50);border:1px dashed var(--border);border-radius:var(--radius-md);">
            <div style="margin-bottom:10px;opacity:0.55;color:var(--accent);">${window.AppIcons ? window.AppIcons.users('', 38) : ''}</div>
            <p style="margin:0;font-size:13.5px;">${term ? 'Không tìm thấy khách hàng phù hợp.' : 'Chưa có dữ liệu khách hàng (cần có đơn đã xác nhận).'}</p>
        </div>`;
        return;
    }
    ct.innerHTML = `<table class="cp-table">
        <thead><tr>
            <th style="width:42px;text-align:center;">#</th>
            <th style="width:190px;">Tên khách hàng</th>
            <th style="width:120px;">Điện thoại</th>
            <th style="width:80px;text-align:center;">Số đơn</th>
            <th style="width:95px;text-align:right;">Tổng điểm</th>
            <th style="width:90px;text-align:right;">Đã dùng</th>
            <th style="width:95px;text-align:right;">Khả dụng</th>
            <th style="width:125px;text-align:right;">Công nợ</th>
            <th style="width:135px;text-align:right;">Tổng giao dịch</th>
        </tr></thead>
        <tbody>${tbody}</tbody>
    </table>`;
}

function showCustomerList() {
    _setActiveNav('sbNavCustomers');
    _cpAllData = buildCustomerData();
    const mainContent = document.querySelector('.container .main-content');
    const cpPage      = document.getElementById('customerPage');
    const plPage      = document.getElementById('productPage');
    if (mainContent) mainContent.style.display = 'none';
    if (plPage)      plPage.style.display      = 'none';
    if (cpPage)      cpPage.style.display      = 'flex';
    const countEl = document.getElementById('cpCustomerCount');
    if (countEl) countEl.textContent = `${_cpAllData.length} khách hàng`;
    const searchEl = document.getElementById('cpSearch');
    if (searchEl) searchEl.value = '';
    renderCustomerPage('');
    updateSidebarBadges();
}

function showDashboard() {
    _setActiveNav('sbNavQuotes');
    const mainContent = document.querySelector('.container .main-content');
    const cpPage      = document.getElementById('customerPage');
    const plPage      = document.getElementById('productPage');
    if (mainContent) {
        if (window._savedMainContent) mainContent.innerHTML = window._savedMainContent;
        mainContent.style.display = '';
    }
    if (cpPage) cpPage.style.display = 'none';
    if (plPage) plPage.style.display = 'none';
    if (typeof renderQuoteList === 'function') renderQuoteList(document.getElementById('mainQuoteSearch')?.value || '');
    if (typeof renderDashboardStats === 'function') renderDashboardStats();
    updateSidebarBadges();
}

function _prepareReportContainer() {
    const mainContent = document.querySelector('.container .main-content');
    const cpPage      = document.getElementById('customerPage');
    const plPage      = document.getElementById('productPage');
    if (cpPage) cpPage.style.display = 'none';
    if (plPage) plPage.style.display = 'none';
    if (mainContent) {
        if (!window._savedMainContent) window._savedMainContent = mainContent.innerHTML;
        mainContent.style.display = '';
    }
    return mainContent;
}

/* ------------------------------------------------------------------ */
/*  Trung Tâm Báo Cáo Doanh Thu (Revenue Analytics Hub)                */
/*  Hợp nhất đa chiều: [Tổng quan] | [Theo tháng] | [Thống kê năm]     */
/* ------------------------------------------------------------------ */

let _currentRevHubTab = 'overview';
let _currentRevHubYear = (new Date()).getFullYear();

function showRevenueAnalyticsHub(activeTab, yearParam) {
    _setActiveNav('sbNavRevenueHub');
    if (activeTab) _currentRevHubTab = activeTab;
    if (typeof yearParam === 'number' && !isNaN(yearParam)) _currentRevHubYear = yearParam;

    const mainContent = _prepareReportContainer();
    if (!mainContent) return;

    loadSavedQuotes();

    const t = _currentRevHubTab;
    const y = _currentRevHubYear;

    let tabBody = '';
    if (t === 'monthly') {
        tabBody = _buildMonthlyTabHtml(y);
    } else if (t === 'annual') {
        tabBody = _buildAnnualTabHtml(y);
    } else {
        tabBody = _buildOverviewTabHtml();
    }

    mainContent.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:14px;height:100%;overflow-y:auto;padding-right:4px;">
            <div class="report-topbar" style="margin-bottom:0;">
                <div class="page-title-group">
                    <h2 class="report-title">Trung tâm Báo cáo Doanh thu</h2>
                    <span class="count-pill">${savedQuotes.length} báo giá</span>
                </div>
                <div class="rev-hub-nav">
                    <button type="button" class="rev-tab-btn ${t === 'overview' ? 'active' : ''}" onclick="showRevenueAnalyticsHub('overview')">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
                        <span>Tổng quan</span>
                    </button>
                    <button type="button" class="rev-tab-btn ${t === 'monthly' ? 'active' : ''}" onclick="showRevenueAnalyticsHub('monthly')">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                        <span>Theo tháng</span>
                    </button>
                    <button type="button" class="rev-tab-btn ${t === 'annual' ? 'active' : ''}" onclick="showRevenueAnalyticsHub('annual')">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>
                        <span>Thống kê năm</span>
                    </button>
                </div>
            </div>
            <div id="revHubContent" style="display:flex;flex-direction:column;gap:14px;">
                ${tabBody}
            </div>
        </div>
    `;
}
window.showRevenueAnalyticsHub = showRevenueAnalyticsHub;

/* Tab 1: Tổng quan Doanh Thu */
function _buildOverviewTabHtml() {
    const totalAll = savedQuotes.reduce((s, q) => s + (Number(q.total) || 0), 0);
    const confirmedQuotes = savedQuotes.filter(q => (q.orderStatus || 'pending') !== 'pending');
    const totalConfirmed = confirmedQuotes.reduce((s, q) => s + (Number(q.total) || 0), 0);
    const received = savedQuotes.reduce((s, q) => {
        const st = q.orderStatus || 'pending';
        const tot = Number(q.total) || 0;
        if (st === 'completed') return s + tot;
        if (st === 'deposited') return s + (Number(q.depositAmount) || Math.round(tot * 0.4));
        return s + (Number(q.receivedAmount) || 0);
    }, 0);
    const totalDebt = savedQuotes.reduce((s, q) => {
        const st = q.orderStatus || 'pending';
        const tot = Number(q.total) || 0;
        if (st === 'deposited') return s + Math.max(0, tot - (Number(q.depositAmount) || Math.round(tot * 0.4)));
        if (st === 'no_deposit') return s + tot;
        return s;
    }, 0);

    // Time series (30 ngày gần nhất)
    const days = 30;
    const now = new Date();
    const series = Array.from({ length: days }).map((_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1 - i));
        const key = d.toISOString().slice(0, 10);
        return { key, date: d, total: 0 };
    });
    const seriesMap = Object.fromEntries(series.map(s => [s.key, s]));
    savedQuotes.forEach(q => {
        const dateStr = (q.savedAt || q.createdAt || '').slice(0, 10);
        if (seriesMap[dateStr]) seriesMap[dateStr].total += Number(q.total) || 0;
    });
    const seriesVals = series.map(s => s.total);

    const maxV = Math.max(...seriesVals, 1);
    const w = 600, h = 140, pad = 10;
    const points = seriesVals.map((v, i) => {
        const x = pad + (i * (w - pad * 2) / Math.max(1, seriesVals.length - 1));
        const y = pad + (1 - (v / maxV)) * (h - pad * 2);
        return `${x},${y}`;
    }).join(' ');

    const statusMeta = [
        { key: 'pending',    badge: '<span class="badge badge-pending"><span class="badge-dot"></span>Chưa xác nhận</span>' },
        { key: 'no_deposit', badge: '<span class="badge badge-no-deposit"><span class="badge-dot"></span>Không cọc</span>' },
        { key: 'deposited',  badge: '<span class="badge badge-deposited"><span class="badge-dot"></span>Đã đặt cọc</span>' },
        { key: 'completed',  badge: '<span class="badge badge-completed"><span class="badge-dot"></span>Hoàn thành</span>' },
    ];
    const statusRows = statusMeta.map(st => {
        const rows = savedQuotes.filter(q => (q.orderStatus || 'pending') === st.key);
        const sum = rows.reduce((s, q) => s + (Number(q.total) || 0), 0);
        return `<tr>
            <td style="padding:8px 6px;border-bottom:1px solid var(--border-light);">${st.badge}</td>
            <td style="padding:8px 6px;border-bottom:1px solid var(--border-light);text-align:right;" class="td-medium">${rows.length}</td>
            <td style="padding:8px 6px;border-bottom:1px solid var(--border-light);text-align:right;" class="td-strong">${new Intl.NumberFormat('vi-VN').format(sum)}đ</td>
        </tr>`;
    }).join('');

    const fmt = v => new Intl.NumberFormat('vi-VN').format(v);

    return `
        <div style="display:flex;justify-content:space-between;align-items:center;background:var(--pastel-50);padding:8px 12px;border-radius:var(--radius-md);border:1px solid var(--border);">
            <div style="font-size:12.5px;font-weight:600;color:var(--navy-900);">Toàn bộ doanh thu lũy kế từ hệ thống</div>
            <button class="btn btn-secondary" onclick="downloadRevenueReport()" style="padding:4px 10px;font-size:12px;">
                ${window.AppIcons ? window.AppIcons.download('', 13) : ''} Xuất báo cáo CSV
            </button>
        </div>

        <div class="stats-bar" style="grid-template-columns:repeat(4,1fr);margin-bottom:0;">
            <div class="stat-card">
                <div class="stat-label">Tổng giá trị báo giá</div>
                <div class="stat-value">${fmt(totalAll)}đ</div>
                <div class="stat-sub">tất cả báo giá đã lập</div>
            </div>
            <div class="stat-card active-filter">
                <div class="stat-label">Doanh thu đã xác nhận</div>
                <div class="stat-value">${fmt(totalConfirmed)}đ</div>
                <div class="stat-sub">${confirmedQuotes.length} đơn đã duyệt</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Thực thu (Đã nhận)</div>
                <div class="stat-value">${fmt(received)}đ</div>
                <div class="stat-sub">cọc & thanh toán đủ</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Công nợ cần thu</div>
                <div class="stat-value">${fmt(totalDebt)}đ</div>
                <div class="stat-sub">đơn đã duyệt chưa thu đủ</div>
            </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 340px;gap:14px;align-items:stretch;">
            <div style="background:var(--bg-surface);padding:14px 16px;border-radius:var(--radius-md);border:1px solid var(--border);">
                <div class="section-title" style="margin-bottom:10px;">Biểu đồ biến động doanh thu (30 ngày gần nhất)</div>
                <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="width:100%;height:150px;background:var(--pastel-50);border-radius:var(--radius-sm);padding:6px;">
                    <polyline fill="none" stroke="var(--accent)" stroke-width="2.2" points="${points}" />
                </svg>
            </div>
            <div style="background:var(--bg-surface);padding:14px 16px;border-radius:var(--radius-md);border:1px solid var(--border);">
                <div class="section-title" style="margin-bottom:10px;">Phân bổ theo trạng thái</div>
                <table style="width:100%;font-size:12.5px;border-collapse:collapse;font-variant-numeric:tabular-nums;">
                    <thead>
                        <tr style="color:var(--text-muted);font-size:11px;text-transform:uppercase;">
                            <th style="text-align:left;padding-bottom:6px;border-bottom:1px solid var(--border);">Trạng thái</th>
                            <th style="text-align:right;padding-bottom:6px;border-bottom:1px solid var(--border);">Số đơn</th>
                            <th style="text-align:right;padding-bottom:6px;border-bottom:1px solid var(--border);">Giá trị</th>
                        </tr>
                    </thead>
                    <tbody>${statusRows}</tbody>
                </table>
            </div>
        </div>

        <div style="background:var(--bg-surface);padding:14px 16px;border-radius:var(--radius-md);border:1px solid var(--border);">
            <div class="section-title" style="margin-bottom:10px;">Danh sách 50 giao dịch gần nhất</div>
            <div style="overflow:auto;max-height:360px;">
                <table class="quote-list-table" style="width:100%;">
                    <thead>
                        <tr>
                            <th>Mã BG</th>
                            <th>Khách hàng</th>
                            <th style="text-align:center;">Ngày lập</th>
                            <th style="text-align:right;">Tổng tiền</th>
                            <th style="text-align:right;">Đã nhận</th>
                            <th style="text-align:right;">Còn nợ</th>
                        </tr>
                    </thead>
                    <tbody>${savedQuotes.slice(0, 50).map(q => {
                        const tot = Number(q.total) || 0;
                        const st = q.orderStatus || 'pending';
                        const rec = st === 'completed' ? tot : (st === 'deposited' ? (Number(q.depositAmount) || Math.round(tot * 0.4)) : 0);
                        const owe = st === 'pending' ? 0 : Math.max(0, tot - rec);
                        return `<tr>
                            <td class="td-code">${escapeHtml(q.quoteNumber || q.id)}</td>
                            <td class="td-strong">${escapeHtml(q.customerName || '—')}</td>
                            <td style="text-align:center;" class="td-muted">${(q.savedAt || q.createdAt || '').slice(0, 10)}</td>
                            <td style="text-align:right;" class="td-strong">${fmt(tot)}đ</td>
                            <td style="text-align:right;" class="td-medium">${fmt(rec)}đ</td>
                            <td style="text-align:right;" class="${owe > 0 ? 'td-strong' : 'td-muted'}">${fmt(owe)}đ</td>
                        </tr>`;
                    }).join('')}</tbody>
                </table>
            </div>
        </div>`;
}

/* Tab 2: Doanh Thu Theo Tháng */
function _buildMonthlyTabHtml(year) {
    const months = computeMonthlyRevenue(year);
    const totals = months.map(m => m.total);
    const maxV = Math.max(...totals, 1);
    const w = 760, h = 190, pad = 22;
    const barW = Math.floor((w - pad * 2) / 12) - 10;

    const yearTotal    = months.reduce((s, m) => s + m.total, 0);
    const yearReceived = months.reduce((s, m) => s + m.received, 0);
    const yearDebt     = months.reduce((s, m) => s + m.debt, 0);
    const yearCount    = months.reduce((s, m) => s + m.count, 0);

    const monthBars = months.map((m, i) => {
        const x = pad + i * ((w - pad * 2) / 12);
        const hVal = Math.max(4, Math.round((m.total / maxV) * (h - pad * 2 - 10)));
        const y = pad + (h - pad * 2 - 10) - hVal;
        const fill = m.total > 0 ? 'var(--accent)' : 'var(--pastel-200)';
        return `<g onclick="showMonthlyDetails('${m.key}')" style="cursor:pointer">
            <rect x="${x}" y="${y}" width="${barW}" height="${hVal}" rx="4" fill="${fill}"></rect>
            <text x="${x + barW / 2}" y="${h - 6}" font-size="11" font-weight="600" fill="var(--text-secondary)" text-anchor="middle">T${i + 1}</text>
        </g>`;
    }).join('\n');

    const I = window.AppIcons || {};
    const fmt = v => new Intl.NumberFormat('vi-VN').format(v);

    return `
        <div style="display:flex;justify-content:space-between;align-items:center;background:var(--pastel-50);padding:8px 12px;border-radius:var(--radius-md);border:1px solid var(--border);">
            <div style="display:flex;gap:6px;align-items:center;">
                <button type="button" class="ql-pg-btn" onclick="showRevenueAnalyticsHub('monthly', ${year - 1})" title="Năm trước">${I.chevronLeft ? I.chevronLeft('', 14) : '‹'}</button>
                <span class="count-pill" style="font-size:12.5px;padding:3px 12px;">Năm ${year}</span>
                <button type="button" class="ql-pg-btn" onclick="showRevenueAnalyticsHub('monthly', ${year + 1})" title="Năm sau">${I.chevronRight ? I.chevronRight('', 14) : '›'}</button>
                <span style="font-size:12px;color:var(--text-secondary);margin-left:6px;">(${yearCount} đơn trong năm)</span>
            </div>
            <button type="button" class="btn btn-secondary" onclick="exportMonthlyRevenueCsv(${year})" style="padding:4px 10px;font-size:12px;">
                ${I.download ? I.download('', 13) : ''} Xuất CSV
            </button>
        </div>

        <div class="stats-bar" style="grid-template-columns:repeat(4,1fr);margin-bottom:0;">
            <div class="stat-card active-filter">
                <div class="stat-label">Tổng doanh thu năm</div>
                <div class="stat-value">${fmt(yearTotal)}đ</div>
                <div class="stat-sub">tất cả các tháng</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Đã thực thu</div>
                <div class="stat-value">${fmt(yearReceived)}đ</div>
                <div class="stat-sub">cọc & thu đủ</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Công nợ trong năm</div>
                <div class="stat-value">${fmt(yearDebt)}đ</div>
                <div class="stat-sub">chưa thanh toán</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Tổng số đơn</div>
                <div class="stat-value">${yearCount}</div>
                <div class="stat-sub">báo giá đã lập</div>
            </div>
        </div>

        <div style="background:var(--bg-surface);padding:14px 16px;border-radius:var(--radius-md);border:1px solid var(--border);">
            <div class="section-title" style="margin-bottom:10px;">Biểu đồ doanh thu từng tháng (Bấm vào cột tháng để xem đơn)</div>
            <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="width:100%;height:190px;background:var(--pastel-50);border-radius:var(--radius-sm);">${monthBars}</svg>
        </div>

        <div id="monthlyDetails" style="background:var(--bg-surface);padding:14px 16px;border-radius:var(--radius-md);border:1px solid var(--border);color:var(--text-muted);font-size:13px;">
            Chọn một cột tháng (T1 – T12) trên biểu đồ để xem danh sách báo giá của tháng đó.
        </div>`;
}

/* Tab 3: Thống Kê Năm & Lợi Nhuận */
function _buildAnnualTabHtml(year) {
    const months = computeAnnualStats(year);
    const revs = months.map(m => m.revenue);
    const discs = months.map(m => m.discount);
    const purs = months.map(m => m.purchases);
    const profs = months.map(m => m.profit);
    const maxV = Math.max(...revs, ...discs, ...purs, ...profs, 1);
    const w = 820, h = 230, pad = 28;
    const pointsFor = arr => arr.map((v, i) => {
        const x = pad + (i * (w - pad * 2) / 11);
        const y = pad + (1 - (v / maxV)) * (h - pad * 2);
        return `${x},${y}`;
    }).join(' ');

    const revPoints  = pointsFor(revs);
    const profPoints = pointsFor(profs);
    const purPoints  = pointsFor(purs);
    const discPoints = pointsFor(discs);

    const I = window.AppIcons || {};
    const fmt = v => new Intl.NumberFormat('vi-VN').format(v);

    return `
        <div style="display:flex;justify-content:space-between;align-items:center;background:var(--pastel-50);padding:8px 12px;border-radius:var(--radius-md);border:1px solid var(--border);">
            <div style="display:flex;gap:6px;align-items:center;">
                <button type="button" class="ql-pg-btn" onclick="showRevenueAnalyticsHub('annual', ${year - 1})" title="Năm trước">${I.chevronLeft ? I.chevronLeft('', 14) : '‹'}</button>
                <span class="count-pill" style="font-size:12.5px;padding:3px 12px;">Năm ${year}</span>
                <button type="button" class="ql-pg-btn" onclick="showRevenueAnalyticsHub('annual', ${year + 1})" title="Năm sau">${I.chevronRight ? I.chevronRight('', 14) : '›'}</button>
                <span style="font-size:12px;color:var(--text-secondary);margin-left:6px;">(Báo cáo phân tích doanh thu & lợi nhuận 12 tháng)</span>
            </div>
            <button type="button" class="btn btn-secondary" onclick="exportMonthlyRevenueCsv(${year})" style="padding:4px 10px;font-size:12px;">
                ${I.download ? I.download('', 13) : ''} Xuất CSV
            </button>
        </div>

        <div class="stats-bar" style="grid-template-columns:repeat(4,1fr);margin-bottom:0;">
            <div class="stat-card">
                <div class="stat-label">Tổng doanh thu năm</div>
                <div class="stat-value">${fmt(months.reduce((s, m) => s + m.revenue, 0))}đ</div>
                <div class="stat-sub">tổng giá trị đơn hàng</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Tổng chiết khấu</div>
                <div class="stat-value">${fmt(months.reduce((s, m) => s + m.discount, 0))}đ</div>
                <div class="stat-sub">ưu đãi cho khách hàng</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Tổng chi phí nhập</div>
                <div class="stat-value">${fmt(months.reduce((s, m) => s + m.purchases, 0))}đ</div>
                <div class="stat-sub">giá vốn hàng hóa</div>
            </div>
            <div class="stat-card active-filter">
                <div class="stat-label">Lợi nhuận ước tính</div>
                <div class="stat-value">${fmt(months.reduce((s, m) => s + m.profit, 0))}đ</div>
                <div class="stat-sub">doanh thu sau chiết khấu</div>
            </div>
        </div>

        <div style="background:var(--bg-surface);padding:14px 16px;border-radius:var(--radius-md);border:1px solid var(--border);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:10px;">
                <div class="section-title">Biểu đồ tăng trưởng 12 tháng (Bấm vào tháng để xem chi tiết)</div>
                <div style="display:flex;gap:14px;font-size:11.5px;color:var(--text-secondary);font-weight:600;">
                    <span style="display:inline-flex;align-items:center;gap:5px;"><i style="width:10px;height:10px;background:#0a192f;display:inline-block;border-radius:2px;"></i>Doanh thu</span>
                    <span style="display:inline-flex;align-items:center;gap:5px;"><i style="width:10px;height:10px;background:#1d75ae;display:inline-block;border-radius:2px;"></i>Lợi nhuận</span>
                    <span style="display:inline-flex;align-items:center;gap:5px;"><i style="width:10px;height:10px;background:#60a5fa;display:inline-block;border-radius:2px;"></i>Nhập hàng</span>
                    <span style="display:inline-flex;align-items:center;gap:5px;"><i style="width:10px;height:10px;background:#94a3b8;display:inline-block;border-radius:2px;"></i>Chiết khấu</span>
                </div>
            </div>
            <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="width:100%;height:220px;background:var(--pastel-50);border-radius:var(--radius-sm);">
                <polyline fill="none" stroke="#0a192f" stroke-width="2.4" points="${revPoints}" />
                <polyline fill="none" stroke="#1d75ae" stroke-width="2" points="${profPoints}" />
                <polyline fill="none" stroke="#60a5fa" stroke-width="1.8" points="${purPoints}" />
                <polyline fill="none" stroke="#94a3b8" stroke-width="1.6" stroke-dasharray="4 3" points="${discPoints}" />
                ${months.map((m, i) => `<text onclick="showAnnualMonthDetails('${m.key}')" style="cursor:pointer;font-weight:600;" x="${pad + i * (w - pad * 2) / 11}" y="${h - 6}" font-size="11" fill="var(--text-secondary)" text-anchor="middle">T${i + 1}</text>`).join('\n')}
            </svg>
        </div>

        <div id="annualDetails" style="background:var(--bg-surface);padding:14px 16px;border-radius:var(--radius-md);border:1px solid var(--border);color:var(--text-muted);font-size:13px;">
            Chọn một tháng (T1 – T12) trên biểu đồ để xem danh sách báo giá chi tiết.
        </div>`;
}

/* Backward-compatibility aliases for legacy menus/buttons */
function showTotalRevenue() { showRevenueAnalyticsHub('overview'); }
function showMonthlyRevenue() { showRevenueAnalyticsHub('monthly'); }
function showAnnualStatistics() { showRevenueAnalyticsHub('annual'); }
function renderMonthlyRevenueView(year) { showRevenueAnalyticsHub('monthly', year); }
function renderAnnualRevenueView(year) { showRevenueAnalyticsHub('annual', year); }

window.showTotalRevenue = showTotalRevenue;
window.showMonthlyRevenue = showMonthlyRevenue;
window.showAnnualStatistics = showAnnualStatistics;
window.renderMonthlyRevenueView = renderMonthlyRevenueView;
window.renderAnnualRevenueView = renderAnnualRevenueView;

function computeAnnualStats(year) {
    const months = [];
    for (let m = 1; m <= 12; m++) {
        const mm = String(m).padStart(2, '0');
        const key = `${year}-${mm}`;
        months.push({ key, label: `Tháng ${m}`, revenue: 0, received: 0, debt: 0, discount: 0, purchases: 0, profit: 0, count: 0 });
    }
    const map = Object.fromEntries(months.map(m => [m.key, m]));
    savedQuotes.forEach(q => {
        const ds = (q.savedAt || q.createdAt || '').slice(0, 7);
        if (!ds || !map[ds]) return;
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
        if (Array.isArray(q.items)) {
            q.items.forEach(it => {
                const disc = Number(it.discount) || 0;
                const qty = Number(it.qty || it.quantity) || 0;
                entry.discount += disc * qty;
                const cost = Number(it.cost) || Number(it.purchasePrice) || 0;
                entry.purchases += cost * qty;
            });
        }
        entry.count += 1;
    });
    months.forEach(m => {
        m.profit = m.revenue - m.purchases - m.discount;
    });
    return months;
}

function exportMonthlyRevenueCsv(year) {
    const months = computeMonthlyRevenue(year);
    const rows = months.map(m => ({ Thang: m.key, Tong: m.total, DaNhan: m.received, No: m.debt, SoDon: m.count }));
    const headers = Object.keys(rows[0] || {});
    if (!rows.length) { alert('Không có dữ liệu để xuất.'); return; }
    const lines = [headers.join(','), ...rows.map(r => headers.map(h => `"${String(r[h]).replace(/"/g, '""')}"`).join(','))];
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `doanhthu_${year}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function showMonthlyDetails(monthKey) {
    loadSavedQuotes();
    const rows = savedQuotes.filter(q => ((q.savedAt || q.createdAt || '').slice(0, 7)) === monthKey);
    const ct = document.getElementById('monthlyDetails');
    if (!ct) return;
    if (!rows.length) {
        ct.innerHTML = `<div style="color:var(--text-muted);">Không có báo giá cho tháng ${monthKey}.</div>`;
        return;
    }
    const fmt = v => new Intl.NumberFormat('vi-VN').format(v);
    ct.innerHTML = `<div class="section-title" style="margin-bottom:12px;">Danh sách báo giá tháng ${monthKey} (${rows.length} đơn)</div>
    <div style="overflow:auto;max-height:320px;">
        <table class="quote-list-table" style="width:100%;">
            <thead>
                <tr>
                    <th>Mã BG</th>
                    <th>Khách hàng</th>
                    <th style="text-align:center;">Ngày lập</th>
                    <th style="text-align:right;">Tổng tiền</th>
                    <th style="text-align:right;">Đã nhận</th>
                    <th style="text-align:right;">Còn nợ</th>
                </tr>
            </thead>
            <tbody>${rows.map(q => {
                const tot = Number(q.total) || 0;
                const st = q.orderStatus || 'pending';
                const rec = st === 'completed' ? tot : (st === 'deposited' ? (Number(q.depositAmount) || Math.round(tot * 0.4)) : 0);
                const owe = st === 'pending' ? 0 : Math.max(0, tot - rec);
                return `<tr>
                    <td class="td-code">${escapeHtml(q.quoteNumber || q.id)}</td>
                    <td class="td-strong">${escapeHtml(q.customerName || '—')}</td>
                    <td style="text-align:center;" class="td-muted">${(q.savedAt || q.createdAt || '').slice(0, 10)}</td>
                    <td style="text-align:right;" class="td-strong">${fmt(tot)}đ</td>
                    <td style="text-align:right;" class="td-medium">${fmt(rec)}đ</td>
                    <td style="text-align:right;" class="${owe > 0 ? 'td-strong' : 'td-muted'}">${fmt(owe)}đ</td>
                </tr>`;
            }).join('')}</tbody>
        </table>
    </div>`;
}

function showAnnualMonthDetails(monthKey) {
    loadSavedQuotes();
    const rows = savedQuotes.filter(q => ((q.savedAt || q.createdAt || '').slice(0, 7)) === monthKey);
    const ct = document.getElementById('annualDetails');
    if (!ct) return;
    if (!rows.length) {
        ct.innerHTML = `<div style="color:var(--text-muted);">Không có báo giá nào trong tháng ${monthKey}.</div>`;
        return;
    }
    const fmt = v => new Intl.NumberFormat('vi-VN').format(v);
    ct.innerHTML = `<div class="section-title" style="margin-bottom:12px;">Chi tiết báo giá tháng ${monthKey} (${rows.length} đơn)</div>
    <div style="overflow:auto;max-height:320px;">
        <table class="quote-list-table" style="width:100%;">
            <thead>
                <tr>
                    <th>Mã BG</th>
                    <th>Khách hàng</th>
                    <th style="text-align:center;">Ngày lập</th>
                    <th style="text-align:right;">Tổng tiền</th>
                    <th style="text-align:right;">Chiết khấu</th>
                    <th style="text-align:right;">Lợi nhuận</th>
                </tr>
            </thead>
            <tbody>${rows.map(q => {
                const tot = Number(q.total) || 0;
                const disc = (Array.isArray(q.items) ? q.items.reduce((s, it) => s + ((Number(it.discount) || 0) * (Number(it.qty || it.quantity) || 0)), 0) : 0);
                const pur = (Array.isArray(q.items) ? q.items.reduce((s, it) => s + ((Number(it.cost) || Number(it.purchasePrice) || 0) * (Number(it.qty || it.quantity) || 0)), 0) : 0);
                const prof = tot - pur - disc;
                return `<tr>
                    <td class="td-code">${escapeHtml(q.quoteNumber || q.id)}</td>
                    <td class="td-strong">${escapeHtml(q.customerName || '—')}</td>
                    <td style="text-align:center;" class="td-muted">${(q.savedAt || q.createdAt || '').slice(0, 10)}</td>
                    <td style="text-align:right;" class="td-strong">${fmt(tot)}đ</td>
                    <td style="text-align:right;" class="td-muted">${fmt(disc)}đ</td>
                    <td style="text-align:right;" class="td-strong">${fmt(prof)}đ</td>
                </tr>`;
            }).join('')}</tbody>
        </table>
    </div>`;
}
window.showAnnualMonthDetails = showAnnualMonthDetails;
window.showMonthlyDetails = showMonthlyDetails;

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
    const data = buildCustomerData().map(c => ({
        'Tên khách hàng': c.name || '',
        'Số điện thoại': c.phone || '',
        'Số đơn': c.orders || 0,
        'Điểm tích lũy': Math.max(0, c.totalPts - c.usedPts),
        'Công nợ': c.totalDebt || 0,
        'Tổng giao dịch': c.totalAmt || 0,
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
    const lines = [
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
/*  Product List Page (Danh mục Sản Phẩm)                              */
/* ------------------------------------------------------------------ */

function _buildProductStats() {
    const stats = {};
    loadSavedQuotes();
    savedQuotes.forEach(function (q) {
        (q.items || []).forEach(function (item) {
            const n = (item.name || '').trim();
            if (!n) return;
            if (!stats[n]) stats[n] = { qty: 0, revenue: 0 };
            stats[n].qty     += Number(item.qty)      || 0;
            stats[n].revenue += Number(item.lineTotal) || 0;
        });
    });
    return stats;
}

let _plAllData    = [];
let _plSearchTerm = '';
let _plPage       = 1;
const _plPageSize = 12;

function renderProductPage(searchTerm, page) {
    if (searchTerm !== undefined) {
        _plSearchTerm = (searchTerm || '').toLowerCase().trim();
    }
    _plPage = (typeof page === 'number' && page >= 1) ? Math.floor(page) : (_plPage || 1);
    loadSavedProducts();
    const stats = _buildProductStats();
    const fmt   = v => new Intl.NumberFormat('vi-VN').format(v);

    const filtered = _plAllData.filter(function (p) {
        return !_plSearchTerm ||
            (p.code || '').toLowerCase().includes(_plSearchTerm) ||
            (p.name || '').toLowerCase().includes(_plSearchTerm) ||
            (p.unit || '').toLowerCase().includes(_plSearchTerm);
    });

    const ct = document.getElementById('productPageContent');
    if (!ct) return;

    const countEl = document.getElementById('plProductCount');
    if (countEl) countEl.textContent = _plAllData.length + ' sản phẩm';

    if (!filtered.length) {
        ct.innerHTML = `<div style="text-align:center;padding:56px 20px;color:var(--text-muted);background:var(--pastel-50);border:1px dashed var(--border);border-radius:var(--radius-md);">
            <div style="margin-bottom:10px;opacity:0.55;color:var(--accent);">${window.AppIcons ? window.AppIcons.package('', 38) : ''}</div>
            <p style="margin:0;font-size:13.5px;">${_plSearchTerm ? 'Không tìm thấy sản phẩm phù hợp.' : 'Chưa có sản phẩm nào trong danh mục.'}</p>
        </div>`;
        updatePager(1, 1, 0, 0, 0);
        return;
    }

    const totalPages = Math.max(1, Math.ceil(filtered.length / _plPageSize));
    if (!_plPage || _plPage < 1) _plPage = 1;
    if (_plPage > totalPages) _plPage = totalPages;

    const startIndex = (_plPage - 1) * _plPageSize;
    const pageItems  = filtered.slice(startIndex, startIndex + _plPageSize);

    const rows = pageItems.map(function (p, idx) {
        const i      = startIndex + idx;
        const s      = stats[p.name] || { qty: 0, revenue: 0 };
        const safeN  = escapeHtml(p.name);
        const safeU  = escapeHtml(p.unit || '—');
        const safeC  = escapeHtml(p.code || '—');
        const nameJS = p.name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        return `<tr>
            <td style="text-align:center;" class="td-muted">${i + 1}</td>
            <td style="text-align:center;" class="td-code">${safeC}</td>
            <td class="pl-td-name td-strong" title="${safeN}">${safeN}</td>
            <td class="pl-td-unit td-muted" style="text-align:center;">${safeU}</td>
            <td style="text-align:right;" class="td-strong">${fmt(p.price)}đ</td>
            <td style="text-align:right;" class="td-medium">${fmt(s.qty)}</td>
            <td style="text-align:right;" class="td-strong">${fmt(s.revenue)}đ</td>
            <td style="text-align:center;white-space:nowrap;">
                <div class="qlt-actions" style="justify-content:center;">
                    <button class="qlt-btn" onclick="openEditProduct('${nameJS}')" title="Chỉnh sửa sản phẩm">${window.AppIcons ? window.AppIcons.edit('', 14) : 'Sửa'}</button>
                    <button class="qlt-btn qlt-btn-del" onclick="confirmDeleteProduct('${nameJS}')" title="Xóa sản phẩm">${window.AppIcons ? window.AppIcons.trash('', 14) : 'Xóa'}</button>
                </div>
            </td>
        </tr>`;
    }).join('');

    ct.innerHTML = `<table class="pl-table">
        <thead><tr>
            <th style="width:42px;text-align:center;">#</th>
            <th style="width:110px;text-align:center;">Mã SP</th>
            <th>Tên sản phẩm / Quy cách</th>
            <th style="width:90px;text-align:center;">ĐVT</th>
            <th style="width:130px;text-align:right;">Đơn giá</th>
            <th style="width:105px;text-align:right;">SL đã bán</th>
            <th style="width:145px;text-align:right;">Doanh thu lũy kế</th>
            <th style="width:86px;text-align:center;">Thao tác</th>
        </tr></thead>
        <tbody>${rows}</tbody>
    </table>`;

    updatePager(_plPage, totalPages, startIndex + 1, startIndex + pageItems.length, filtered.length);
}

function updatePager(page, totalPages, startNum, endNum, totalItems) {
    const ind = document.getElementById('plPagerIndicator');
    if (ind) ind.textContent = `Trang ${page || 1} / ${totalPages || 1}`;
    const info = document.getElementById('plPagerInfo');
    if (info) {
        info.innerHTML = totalItems > 0
            ? `Hiển thị <strong>${startNum}–${endNum}</strong> trên tổng <strong>${totalItems}</strong> sản phẩm`
            : 'Không có sản phẩm';
    }
    const prev = document.getElementById('plPrevBtn');
    const next = document.getElementById('plNextBtn');
    if (prev) prev.disabled = (page <= 1);
    if (next) next.disabled = (page >= totalPages);
}

function plPrevPage() { if (_plPage > 1) { _plPage--; renderProductPage(_plSearchTerm, _plPage); } }
function plNextPage() { _plPage++; renderProductPage(_plSearchTerm, _plPage); }
window.plPrevPage = plPrevPage;
window.plNextPage = plNextPage;

function showProductList() {
    _setActiveNav('sbNavProducts');
    loadSavedProducts();
    _plAllData = (savedProducts || []).slice().sort(function (a, b) {
        return (a.name || '').localeCompare(b.name || '', 'vi');
    });

    const mainContent = document.querySelector('.container .main-content');
    const cpPage      = document.getElementById('customerPage');
    const plPage      = document.getElementById('productPage');
    if (mainContent) mainContent.style.display = 'none';
    if (cpPage)      cpPage.style.display      = 'none';
    if (plPage)      plPage.style.display      = 'flex';

    const s = document.getElementById('plSearch');
    if (s) s.value = '';
    _plPage = 1;
    renderProductPage('', 1);
    updateSidebarBadges();
}

/** Mở form thêm mới hoặc chỉnh sửa sản phẩm */
function openEditProduct(productName) {
    loadSavedProducts();
    const modal = document.getElementById('editProductModal');
    if (!modal) return;

    const p = productName ? savedProducts.find(function (x) { return x.name === productName; }) : null;

    document.getElementById('epName').value  = p ? p.name : '';
    document.getElementById('epUnit').value  = p ? (p.unit || '') : '';
    document.getElementById('epPrice').value = (p && p.price > 0) ? new Intl.NumberFormat('vi-VN').format(p.price) : '';
    document.getElementById('epPrice').dataset.raw = String(p ? (p.price || 0) : 0);
    document.getElementById('epOrigName').value = p ? p.name : '';
    const codeEl = document.getElementById('epCode');
    if (codeEl) codeEl.value = p ? (p.code || '') : '';

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

    if (!newName) { showNotification('Tên sản phẩm không được để trống!', 'error'); return; }

    loadSavedProducts();
    if (origName && origName !== newName) {
        savedProducts = savedProducts.filter(function (p) { return p.name !== origName; });
        persistSavedProducts();
    }
    upsertProduct(newName, newUnit, rawPrice);
    closeEditProductModal();
    showNotification('Đã lưu sản phẩm: ' + newName);

    loadSavedProducts();
    _plAllData = (savedProducts || []).slice().sort(function (a, b) {
        return (a.name || '').localeCompare(b.name || '', 'vi');
    });
    renderProductPage(_plSearchTerm);
}

function confirmDeleteProduct(productName) {
    if (!confirm('Xóa sản phẩm "' + productName + '" khỏi danh mục?')) return;
    deleteProduct(productName);
    loadSavedProducts();
    _plAllData = (savedProducts || []).slice().sort(function (a, b) {
        return (a.name || '').localeCompare(b.name || '', 'vi');
    });
    showNotification('Đã xóa sản phẩm: ' + productName);
    renderProductPage(_plSearchTerm);
}

function showProductListDashboard() {
    showDashboard();
}
