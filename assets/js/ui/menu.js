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
            const list = (typeof savedQuotes !== 'undefined' && Array.isArray(savedQuotes))
                ? savedQuotes
                : (Array.isArray(window.savedQuotes) ? window.savedQuotes : []);
            qBadge.textContent = String(list.length);
        }
        const cBadge = document.getElementById('sbBadgeCustomers');
        if (cBadge) {
            const count = typeof buildCustomerData === 'function' ? buildCustomerData().length : 0;
            cBadge.textContent = String(count);
        }
        const pBadge = document.getElementById('sbBadgeProducts');
        if (pBadge) {
            const list = (typeof savedProducts !== 'undefined' && Array.isArray(savedProducts))
                ? savedProducts
                : (Array.isArray(window.savedProducts) ? window.savedProducts : []);
            pBadge.textContent = String(list.length);
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
/*  Ủy quyền trực tiếp sang mô-đun assets/js/ui/reports.js            */
/* ------------------------------------------------------------------ */

function showRevenueAnalyticsHub(activeTab, yearParam) {
    if (typeof _setActiveNav === 'function') _setActiveNav('sbNavRevenueHub');
    if (typeof window.showRevenueAnalyticsHub === 'function' && window.showRevenueAnalyticsHub !== showRevenueAnalyticsHub) {
        return window.showRevenueAnalyticsHub(activeTab, yearParam);
    }
}
window.showRevenueAnalyticsHub = showRevenueAnalyticsHub;

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
