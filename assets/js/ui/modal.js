/**
 * ui/modal.js
 * --------------------------------------------------
 * Dashboard inline quote list + quote form modal helpers.
 * Chuẩn hóa theo hệ màu thương hiệu Thanh Phát:
 *   Xanh Đen (#0a192f) – Trắng (#ffffff) – Xanh Da Trời Pastel (#f0f7ff / #e0effe)
 * --------------------------------------------------
 */

// ── Phân trang dashboard & Lọc ─────────────────────────────────────
let _qlPage    = 1;
let _qlPerPage = 10;
let _qlSearch  = '';
let _qlFilter  = 'all'; // 'all' | 'debt' | 'received' | 'completed' | 'pending'

function _syncFilterUI() {
    // 1. Đồng bộ Segmented Filter Pills trên thanh công cụ bảng
    document.querySelectorAll('#quoteFilterPills .filter-pill').forEach(btn => {
        const mode = btn.getAttribute('data-filter');
        btn.classList.toggle('active', mode === _qlFilter);
    });

    // 2. Đồng bộ trạng thái active trên 5 thẻ KPI
    const cardMap = {
        all:       'statCardTotal',
        received:  'statCardReceived',
        debt:      'statCardDebt',
        completed: 'statCardRevenue',
    };
    ['statCardTotal', 'statCardReceived', 'statCardDebt', 'statCardRevenue'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('active-filter');
    });
    const activeCardId = cardMap[_qlFilter];
    if (activeCardId) {
        const activeEl = document.getElementById(activeCardId);
        if (activeEl) activeEl.classList.add('active-filter');
    }
}

function filterQuoteList(mode) {
    _qlFilter = mode || 'all';
    _qlPage = 1;
    _syncFilterUI();
    renderQuoteList();
    renderDashboardStats();
}

function qlPrevPage() {
    if (_qlPage > 1) { _qlPage--; renderQuoteList(); }
}
function qlNextPage(total) {
    const tp = Math.max(1, Math.ceil(total / _qlPerPage));
    if (_qlPage < tp) { _qlPage++; renderQuoteList(); }
}
function qlGoPage(val, total) {
    const tp = Math.max(1, Math.ceil(total / _qlPerPage));
    const p  = parseInt(val, 10);
    if (!isNaN(p)) { _qlPage = Math.min(Math.max(1, p), tp); renderQuoteList(); }
}
function qlSetPerPage(val) {
    const n = parseInt(val, 10);
    if (!isNaN(n) && n > 0) { _qlPerPage = n; _qlPage = 1; renderQuoteList(); }
}

/**
 * Kept for backward compatibility – refreshes the inline list.
 */
function showQuoteList() {
    renderQuoteList('');
    renderDashboardStats();
}

/** No-op – kept for compatibility (list is always inline). */
function closeQuoteList() {}

/**
 * Render the inline quote list table.
 * @param {string} [searchTerm]
 */
function renderQuoteList(searchTerm) {
    const container = document.getElementById('quoteListContainer');
    if (!container) return;

    _syncFilterUI();

    // Cập nhật search; reset page nếu search thay đổi
    if (searchTerm !== undefined && searchTerm !== _qlSearch) {
        _qlSearch = searchTerm;
        _qlPage   = 1;
    }
    const term = (_qlSearch || '').toLowerCase().trim();
    const filtered = savedQuotes.filter(q => {
        if (term) {
            const match = (
                (q.quoteNumber   || '').toLowerCase().includes(term) ||
                (q.customerName  || '').toLowerCase().includes(term) ||
                (q.customerPhone || '').toLowerCase().includes(term)
            );
            if (!match) return false;
        }

        const st  = q.orderStatus || 'pending';
        const tot = Number(q.total) || 0;

        if (_qlFilter === 'debt') {
            let debtAmt = 0;
            if (st === 'deposited') {
                const dep = q.depositAmount || Math.round(tot * 0.4);
                debtAmt = Math.max(0, tot - dep);
            } else if (st === 'no_deposit') {
                debtAmt = tot;
            }
            return debtAmt > 0;
        } else if (_qlFilter === 'received') {
            return st === 'deposited' || st === 'completed';
        } else if (_qlFilter === 'completed') {
            return st === 'completed';
        } else if (_qlFilter === 'pending') {
            return st === 'pending';
        }

        return true;
    });

    const I = window.AppIcons || {};

    if (!filtered.length) {
        const emptyIcon = I.fileText ? I.fileText('', 38) : '';
        container.innerHTML = `<div id="quoteListEmptyState" style="text-align:center;padding:56px 16px;color:var(--text-muted);background:var(--pastel-50);border:1px dashed var(--border);border-radius:var(--radius-md);">
            <div style="margin-bottom:10px;opacity:0.55;color:var(--accent);">${emptyIcon}</div>
            <p style="margin:0;font-size:13.5px;font-weight:500;">${term ? 'Không tìm thấy báo giá phù hợp với từ khóa.' : 'Không có báo giá nào trong danh mục lọc hiện tại.'}</p>
        </div>`;
        return;
    }

    // Sort newest first
    const sorted = [...filtered].sort((a, b) => (b.savedAt || b.createdAt || '').localeCompare(a.savedAt || a.createdAt || ''));

    // Phân trang
    const totalItems = sorted.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / _qlPerPage));
    _qlPage = Math.min(Math.max(1, _qlPage), totalPages);
    const globalOffset = (_qlPage - 1) * _qlPerPage;
    const pageItems    = sorted.slice(globalOffset, globalOffset + _qlPerPage);
    const startItemNum = globalOffset + 1;
    const endItemNum   = Math.min(globalOffset + pageItems.length, totalItems);

    const rows = [];
    const cards = [];

    pageItems.forEach((q, i) => {
        const dateStr   = q.savedAt || q.createdAt;
        const date      = dateStr ? new Date(dateStr).toLocaleDateString('vi-VN') : '—';
        const total     = Number(q.total) || 0;
        const id        = escapeHtml(q.id);
        const globalIdx = globalOffset + i;

        // ---- Status badge (Tonal Blue / Navy) ----
        const status = q.orderStatus || 'pending';
        const statusBadges = {
            pending:    '<span class="badge badge-pending"><span class="badge-dot"></span>Chưa xác nhận</span>',
            deposited:  '<span class="badge badge-deposited"><span class="badge-dot"></span>Đã đặt cọc</span>',
            no_deposit: '<span class="badge badge-no-deposit"><span class="badge-dot"></span>Không cọc</span>',
            completed:  '<span class="badge badge-completed"><span class="badge-dot"></span>Hoàn thành</span>',
        };
        const badgeHtml = statusBadges[status] || statusBadges.pending;

        // ---- Tiền cọc / tiền nợ ----
        let depositAmt = 0, debtAmt = 0;
        if (status === 'deposited') {
            depositAmt = q.depositAmount || Math.round(total * 0.4);
            debtAmt    = Math.max(0, total - depositAmt);
        } else if (status === 'no_deposit') {
            depositAmt = 0;
            debtAmt    = total;
        } else if (status === 'completed') {
            depositAmt = q.depositAmount || 0;
            debtAmt    = 0;
        }

        const depositStr = status !== 'pending'
            ? (status === 'completed'
                ? `<span class="td-muted" style="text-decoration:line-through;font-size:12px;">${formatCurrency(depositAmt)}</span>`
                : `<span class="td-medium">${formatCurrency(depositAmt)}</span>`)
            : '<span class="td-muted">—</span>';

        const debtStr = status !== 'pending'
            ? (debtAmt > 0
                ? `<span class="td-strong">${formatCurrency(debtAmt)}</span>`
                : `<span class="td-muted">0đ</span>`)
            : '<span class="td-muted">—</span>';

        // ---- Tích điểm ----
        let points = 0;
        const ph = (q.customerPhone || '').trim();
        if (ph) {
            points = savedQuotes.reduce((s, x) => {
                if ((x.customerPhone || '').trim() === ph) {
                    const earned = (x.orderStatus === 'completed') ? Math.floor((Number(x.total)||0)/200000) : 0;
                    const used = Number(x.pointsUsed) || 0;
                    return s + (earned - used);
                }
                return s;
            }, 0);
            if (points < 0) points = 0;
        }
        const pointsStr = `<span class="td-medium">${points.toLocaleString('vi-VN')}</span>`;

        // ---- Cụm Nút Hành Động Desktop ----
        let primaryBtn = '';
        if (status === 'pending') {
            primaryBtn = `<button class="qlt-btn qlt-btn-confirm" title="Xác nhận đơn hàng" onclick="openConfirmOrderModal('${id}')">${I.check ? I.check('', 12) : ''}<span>Duyệt</span></button>`;
        } else if (status === 'deposited' || status === 'no_deposit') {
            primaryBtn = `<button class="qlt-btn qlt-btn-fullpaid" title="Xác nhận đã thu đủ tiền" onclick="markFullPayment('${id}')">${I.check ? I.check('', 12) : ''}<span>Thu đủ</span></button>`;
        } else {
            primaryBtn = `<button class="qlt-btn qlt-btn-fullpaid" title="Đơn đã thu đủ" disabled>${I.check ? I.check('', 12) : ''}<span>Đã thu</span></button>`;
        }

        const previewBtn = `<button class="qlt-btn" title="Xem trước bản in PDF" onclick="previewSavedQuote('${id}')">${I.eye ? I.eye('', 13.5) : 'Xem'}</button>`;
        const jpgBtn     = `<button class="qlt-btn" title="Tải ảnh JPG báo giá" onclick="exportJPGSavedQuote('${id}')">${I.download ? I.download('', 13.5) : 'JPG'}</button>`;
        const openBtn    = (status === 'completed')
            ? `<button class="qlt-btn" title="Mở chỉnh sửa" disabled>${I.edit ? I.edit('', 13.5) : 'Sửa'}</button>`
            : `<button class="qlt-btn" title="Mở chỉnh sửa" onclick="viewSavedQuote('${id}')">${I.edit ? I.edit('', 13.5) : 'Sửa'}</button>`;
        const recallBtn  = (status !== 'pending')
            ? `<button class="qlt-btn qlt-btn-recall" title="Hoàn tác trạng thái trước" onclick="recallOrderStatus('${id}')">${I.undo ? I.undo('', 13.5) : '↺'}</button>`
            : `<button class="qlt-btn qlt-btn-recall" title="Hoàn tác trạng thái" disabled>${I.undo ? I.undo('', 13.5) : '↺'}</button>`;
        const delBtn     = (status === 'completed')
            ? `<button class="qlt-btn qlt-btn-del" title="Xóa báo giá" disabled>${I.trash ? I.trash('', 13.5) : 'Xóa'}</button>`
            : `<button class="qlt-btn qlt-btn-del" title="Xóa báo giá" onclick="deleteSavedQuote('${id}')">${I.trash ? I.trash('', 13.5) : 'Xóa'}</button>`;

        // Desktop Table Row
        rows.push(`<tr>
            <td style="text-align:center;width:34px;" class="td-muted">${globalIdx + 1}</td>
            <td style="width:78px;" class="td-code">${escapeHtml(q.quoteNumber || q.id)}</td>
            <td style="width:210px;" class="td-strong" title="${escapeHtml(q.customerName || '')}">${escapeHtml(q.customerName || '—')}</td>
            <td style="width:108px;" class="td-muted">${escapeHtml(q.customerPhone || '—')}</td>
            <td style="width:90px;text-align:center;" class="td-muted">${date}</td>
            <td style="width:112px;text-align:center;">${badgeHtml}</td>
            <td style="width:110px;text-align:right;">${depositStr}</td>
            <td style="width:110px;text-align:right;">${debtStr}</td>
            <td style="width:48px;text-align:center;">${pointsStr}</td>
            <td style="width:122px;text-align:right;" class="td-strong">${formatCurrency(total)}</td>
            <td style="width:196px;text-align:right;">
                <div class="qlt-actions">
                    ${primaryBtn}
                    ${previewBtn}
                    ${jpgBtn}
                    ${openBtn}
                    ${recallBtn}
                    ${delBtn}
                </div>
            </td>
        </tr>`);

        // ---- Cụm Nút Hành Động Mobile Card ----
        let primaryBtnM = '';
        if (status === 'pending') {
            primaryBtnM = `<button class="mq-btn mq-btn-confirm" onclick="openConfirmOrderModal('${id}')">${I.check ? I.check('', 13) : '✓'}<span>Duyệt</span></button>`;
        } else if (status === 'deposited' || status === 'no_deposit') {
            primaryBtnM = `<button class="mq-btn mq-btn-fullpaid" onclick="markFullPayment('${id}')">${I.check ? I.check('', 13) : '✓'}<span>Thu đủ</span></button>`;
        } else {
            primaryBtnM = `<button class="mq-btn mq-btn-fullpaid is-done" disabled>${I.check ? I.check('', 13) : '✓'}<span>Đã thu</span></button>`;
        }

        const previewBtnM = `<button class="mq-btn mq-btn-preview" title="Xem trước bản in" onclick="previewSavedQuote('${id}')">${I.eye ? I.eye('', 13) : '👁'}<span>Xem</span></button>`;
        const jpgBtnM     = `<button class="mq-btn mq-btn-jpg" title="Tải ảnh JPG" onclick="exportJPGSavedQuote('${id}')">${I.download ? I.download('', 13) : '📥'}<span>JPG</span></button>`;
        const openBtnM    = (status === 'completed')
            ? `<button class="mq-btn" disabled>${I.edit ? I.edit('', 13) : '✏'}<span>Sửa</span></button>`
            : `<button class="mq-btn" onclick="viewSavedQuote('${id}')">${I.edit ? I.edit('', 13) : '✏'}<span>Sửa</span></button>`;
        const recallBtnM  = (status !== 'pending')
            ? `<button class="mq-btn mq-btn-recall" title="Hoàn tác" onclick="recallOrderStatus('${id}')">${I.undo ? I.undo('', 13) : '↺'}</button>`
            : `<button class="mq-btn mq-btn-recall" disabled>${I.undo ? I.undo('', 13) : '↺'}</button>`;
        const delBtnM     = (status === 'completed')
            ? `<button class="mq-btn mq-btn-del" disabled>${I.trash ? I.trash('', 13) : '🗑'}</button>`
            : `<button class="mq-btn mq-btn-del" title="Xóa" onclick="deleteSavedQuote('${id}')">${I.trash ? I.trash('', 13) : '🗑'}</button>`;

        // Mobile Card HTML
        const customerName = escapeHtml(q.customerName || 'Khách vãng lai');
        const phone = escapeHtml(q.customerPhone || '');
        const phoneHtml = phone 
            ? `<a href="tel:${phone}" class="mq-cust-phone" title="Gọi ngay cho khách"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg><span>${phone}</span></a>`
            : `<span class="mq-cust-phone-none">—</span>`;

        const paidAmt = (status === 'completed') ? total : depositAmt;

        cards.push(`<div class="mq-card status-${status}">
            <div class="mq-card-head">
                <div class="mq-head-left">
                    <span class="mq-card-idx">#${globalIdx + 1}</span>
                    <span class="mq-card-code" onclick="previewSavedQuote('${id}')" title="Bấm để xem trước báo giá">${escapeHtml(q.quoteNumber || q.id)}</span>
                    <span class="mq-card-date">${date}</span>
                </div>
                <div class="mq-head-right">
                    ${badgeHtml}
                </div>
            </div>

            <div class="mq-card-cust-row">
                <div class="mq-card-cust-name" title="${customerName}">${customerName}</div>
                ${phoneHtml}
            </div>

            <div class="mq-finance-strip">
                <div class="mq-fin-total-box">
                    <span class="mq-fin-lbl">Tổng cộng</span>
                    <strong class="mq-fin-val-total">${formatCurrency(total)}</strong>
                </div>
                <div class="mq-fin-sub-group">
                    <div class="mq-fin-sub-item">
                        <span class="mq-fin-sub-lbl">${status === 'completed' ? 'Đã thu:' : 'Đã cọc:'}</span>
                        <strong class="mq-fin-sub-val val-paid">${formatCurrency(paidAmt)}</strong>
                    </div>
                    <div class="mq-fin-sub-item">
                        <span class="mq-fin-sub-lbl">Còn nợ:</span>
                        <strong class="mq-fin-sub-val val-debt ${debtAmt > 0 ? 'has-debt' : ''}">${formatCurrency(debtAmt)}</strong>
                    </div>
                </div>
            </div>

            <div class="mq-card-actions">
                ${primaryBtnM}
                ${previewBtnM}
                ${jpgBtnM}
                ${openBtnM}
                ${recallBtnM}
                ${delBtnM}
            </div>
        </div>`);
    });

    const prevIcon = I.chevronLeft ? I.chevronLeft('', 14) : '‹';
    const nextIcon = I.chevronRight ? I.chevronRight('', 14) : '›';

    container.innerHTML = `
    <div class="desktop-quote-table table-scroll-wrap">
        <table class="quote-list-table" style="min-width:1120px;table-layout:fixed;width:100%;">
            <thead><tr>
                <th style="width:34px;text-align:center;">#</th>
                <th style="width:78px;">Mã BG</th>
                <th style="width:210px;">Tên khách hàng</th>
                <th style="width:108px;">Điện thoại</th>
                <th style="width:90px;text-align:center;">Ngày lập</th>
                <th style="width:112px;text-align:center;">Trạng thái</th>
                <th style="width:110px;text-align:right;">Tiền cọc</th>
                <th style="width:110px;text-align:right;">Công nợ</th>
                <th style="width:48px;text-align:center;">Điểm</th>
                <th style="width:122px;text-align:right;">Tổng tiền</th>
                <th style="width:196px;text-align:right;">Thao tác</th>
            </tr></thead>
            <tbody>${rows.join('')}</tbody>
        </table>
    </div>
    <div class="mobile-quote-cards">
        ${cards.join('')}
    </div>
    <div class="ql-pager">
        <div class="ql-pager-left">
            Hiển thị <strong>${startItemNum}–${endItemNum}</strong> trên tổng <strong>${totalItems}</strong> báo giá
        </div>
        <div class="ql-pager-right">
            <select class="ql-pg-select" onchange="qlSetPerPage(this.value)">
                <option value="10" ${_qlPerPage === 10 ? 'selected' : ''}>10 / trang</option>
                <option value="20" ${_qlPerPage === 20 ? 'selected' : ''}>20 / trang</option>
                <option value="50" ${_qlPerPage === 50 ? 'selected' : ''}>50 / trang</option>
            </select>
            <button class="ql-pg-btn" onclick="qlPrevPage()" ${_qlPage <= 1 ? 'disabled' : ''} title="Trang trước">${prevIcon}</button>
            <span class="ql-pg-label">
                <input class="ql-pg-input" type="number" min="1" max="${totalPages}"
                    value="${_qlPage}"
                    onchange="qlGoPage(this.value, ${totalItems})"
                    onkeydown="if(event.key==='Enter')qlGoPage(this.value,${totalItems})">
                <span>/ ${totalPages}</span>
            </span>
            <button class="ql-pg-btn" onclick="qlNextPage(${totalItems})" ${_qlPage >= totalPages ? 'disabled' : ''} title="Trang sau">${nextIcon}</button>
        </div>
    </div>`;
}

/**
 * Render stats cards in the dashboard (#statTotalCount etc.).
 */
function renderDashboardStats() {
    const now   = new Date();
    const month = now.getMonth();
    const year  = now.getFullYear();

    let totalRevenue = 0;
    let monthRevenue = 0;

    savedQuotes.forEach(q => {
        const st = q.orderStatus || 'pending';
        if (st === 'pending') return;
        const amount = Number(q.total) || 0;
        totalRevenue += amount;
        const dateStr = q.savedAt || q.createdAt;
        if (dateStr) {
            const d = new Date(dateStr);
            if (d.getMonth() === month && d.getFullYear() === year) {
                monthRevenue += amount;
            }
        }
    });

    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

    let receivedAmount = 0;
    let totalDebt = 0;
    savedQuotes.forEach(q => {
        const st = q.orderStatus;
        const tot = Number(q.total) || 0;
        if (st === 'deposited') {
            const dep = q.depositAmount || Math.round(tot * 0.4);
            receivedAmount += dep;
            totalDebt += Math.max(0, tot - dep);
        } else if (st === 'no_deposit') {
            totalDebt += tot;
        } else if (st === 'completed') {
            receivedAmount += tot;
        }
    });

    // Đếm số khách hàng thực tế
    const custCount = (typeof buildCustomerData === 'function')
        ? buildCustomerData().length
        : (typeof savedCustomers !== 'undefined' ? Object.keys(savedCustomers).length : 0);

    setEl('statTotalCount',      savedQuotes.length);
    setEl('statTotalBadge',      `${savedQuotes.length} báo giá`);
    setEl('statCustomerCount',   custCount);
    setEl('statReceivedAmount',  formatCurrency(receivedAmount));
    setEl('statTotalDebt',       formatCurrency(totalDebt));
    setEl('statTotalRevenue',    formatCurrency(totalRevenue));
    setEl('statMonthRevenue',    formatCurrency(monthRevenue));
    setEl('statMonthLabel',      `Tháng ${month + 1}/${year}`);

    _syncFilterUI();
    if (typeof updateSidebarBadges === 'function') updateSidebarBadges();
}

/**
 * Delete a saved quote by id, then refresh the list.
 * @param {string} id
 */
function deleteSavedQuote(id) {
    if (!confirm('Xóa báo giá này?')) return;
    deleteQuoteFromStorage(id);
    renderQuoteList(document.getElementById('mainQuoteSearch')?.value || '');
    renderDashboardStats();
}

/**
 * Load a saved quote into the form, then open the form modal.
 * @param {string} id   Quote id
 */
function viewSavedQuote(id) {
    loadQuoteIntoForm(id);
    const title = document.getElementById('quoteFormModalTitle');
    if (title) title.textContent = `Chỉnh sửa báo giá: ${escapeHtml(id)}`;
    openQuoteFormModal();
}

/* ─────────────────────────────────────────────────────────────────
   ORDER MANAGEMENT  (xác nhận đơn, tiền cọc, thu đủ)
───────────────────────────────────────────────────────────────── */

function patchSavedQuote(id, fields) {
    const idx = savedQuotes.findIndex(q => q.id === id);
    if (idx === -1) return null;
    Object.assign(savedQuotes[idx], fields);
    savedQuotes[idx].savedAt = new Date().toISOString();
    persistSavedQuotes();
    if (typeof _syncQuoteToAPI === 'function') _syncQuoteToAPI(savedQuotes[idx]);
    return savedQuotes[idx];
}

function openConfirmOrderModal(quoteId) {
    const q = savedQuotes.find(q => q.id === quoteId);
    if (!q) return;
    window._confirmOrderId = quoteId;
    const noEl = document.getElementById('comQuoteNo');
    const totEl = document.getElementById('comTotal');
    if (noEl) noEl.textContent = `Mã BG: ${q.quoteNumber || q.id}  •  ${q.customerName || 'Khách hàng'}`;
    if (totEl) totEl.textContent = `Tổng đơn: ${formatCurrency(Number(q.total) || 0)}`;
    document.getElementById('confirmOrderModal').classList.add('show');
}

function confirmOrderWithDeposit(quoteId, hasDeposit) {
    const q = savedQuotes.find(q => q.id === quoteId);
    if (!q) return;
    const total = Number(q.total) || 0;

    if (hasDeposit) {
        const depositAmt = (q.depositAmount && Number(q.depositAmount) > 0)
            ? Number(q.depositAmount)
            : Math.round(total * 0.4);
        patchSavedQuote(quoteId, {
            orderStatus:      'deposited',
            depositConfirmed: true,
            depositAmount:    depositAmt,
            receivedAmount:   depositAmt,
            depositDisabled:  false,
        });
    } else {
        patchSavedQuote(quoteId, {
            orderStatus:      'no_deposit',
            depositConfirmed: false,
            depositAmount:    0,
            receivedAmount:   0,
            depositDisabled:  true,
        });
    }

    document.getElementById('confirmOrderModal').classList.remove('show');
    renderQuoteList(document.getElementById('mainQuoteSearch')?.value || '');
    renderDashboardStats();
}

function markFullPayment(quoteId) {
    const q = savedQuotes.find(q => q.id === quoteId);
    if (!q) return;
    const total = Number(q.total) || 0;
    if (!confirm(`Xác nhận đã thu đủ ${formatCurrency(total)} cho đơn ${q.quoteNumber || quoteId}?`)) return;
    patchSavedQuote(quoteId, {
        orderStatus:    'completed',
        paid:           true,
        receivedAmount: total,
    });
    renderQuoteList(document.getElementById('mainQuoteSearch')?.value || '');
    renderDashboardStats();
}

/* ─────────────────────────────────────────────────────────────────
   PREVIEW & EXPORT từ dashboard
───────────────────────────────────────────────────────────────── */

function previewSavedQuote(quoteId) {
    const q = savedQuotes.find(q => q.id === quoteId);
    window._quoteExportCtx = q ? {
        orderStatus: q.orderStatus || 'pending',
        depositAmount: q.depositAmount || 0,
        createdAt: q.createdAt || q.savedAt || null,
        paid: !!q.paid,
        receivedAmount: Number(q.receivedAmount) || 0,
        completedAt: q.completedAt || null
    } : null;
    loadQuoteIntoForm(quoteId, true);
    if (typeof previewQuote === 'function') previewQuote();
}

function exportJPGSavedQuote(quoteId) {
    const q = savedQuotes.find(q => q.id === quoteId);
    window._quoteExportCtx = q ? {
        orderStatus: q.orderStatus || 'pending',
        depositAmount: q.depositAmount || 0,
        createdAt: q.createdAt || q.savedAt || null,
        paid: !!q.paid,
        receivedAmount: Number(q.receivedAmount) || 0,
        completedAt: q.completedAt || null
    } : null;
    loadQuoteIntoForm(quoteId, true);
    if (typeof exportQuoteAsJPG === 'function') exportQuoteAsJPG();
    window._quoteExportCtx = null;
}

function recallOrderStatus(quoteId) {
    loadSavedQuotes();
    const q = savedQuotes.find(q => (q.id || q.quoteNumber) === quoteId);
    if (!q) return;
    const status = q.orderStatus || 'pending';
    let prevStatus;
    if (status === 'completed') {
        prevStatus = (q.depositAmount && q.depositAmount > 0) ? 'deposited' : 'no_deposit';
    } else if (status === 'deposited' || status === 'no_deposit') {
        prevStatus = 'pending';
    } else {
        return;
    }
    const label = { pending: 'Chưa xác nhận', deposited: 'Đã đặt cọc', no_deposit: 'Không cọc', completed: 'Hoàn thành' };
    if (!confirm(`Hoàn tác trạng thái từ "${label[status]}" về "${label[prevStatus]}"?`)) return;
    const patchFields = { orderStatus: prevStatus };
    if (prevStatus === 'pending') {
        patchFields.depositAmount   = 0;
        patchFields.receivedAmount  = 0;
        patchFields.depositDisabled = false;
        patchFields.paid            = false;
    } else if (prevStatus === 'deposited' || prevStatus === 'no_deposit') {
        patchFields.receivedAmount = 0;
        patchFields.paid           = false;
    }
    patchSavedQuote(quoteId, patchFields);
    renderQuoteList(document.getElementById('mainQuoteSearch')?.value || '');
    renderDashboardStats();
}
