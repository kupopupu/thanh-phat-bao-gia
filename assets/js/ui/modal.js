/**
 * ui/modal.js
 * --------------------------------------------------
 * Dashboard inline quote list + quote form modal helpers.
 *
 * Depends on:
 *   state.js            (savedQuotes, savedCustomers)
 *   storage/storage.js  (persistSavedQuotes)
 *   quote/quote-core.js (loadQuoteIntoForm)
 *   utils/format.js     (formatCurrency, escapeHtml)
 * --------------------------------------------------
 */

// ── Phân trang dashboard ──────────────────────────────────────────
let _qlPage    = 1;
let _qlPerPage = 10;
let _qlSearch  = '';

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
 * Kept for backward compatibility – just refreshes the inline list.
 */
function showQuoteList() {
    renderQuoteList('');
    renderDashboardStats();
}

/** No-op – kept for compatibility (list is now always inline). */
function closeQuoteList() {}

/**
 * Render the inline quote list table.
 * @param {string} [searchTerm]
 */
function renderQuoteList(searchTerm) {
    const container = document.getElementById('quoteListContainer');
    if (!container) return;

    // Cập nhật search; reset page nếu search thay đổi
    if (searchTerm !== undefined && searchTerm !== _qlSearch) {
        _qlSearch = searchTerm;
        _qlPage   = 1;
    }
    const term = (_qlSearch || '').toLowerCase().trim();
    const filtered = savedQuotes.filter(q => {
        if (!term) return true;
        return (
            (q.quoteNumber   || '').toLowerCase().includes(term) ||
            (q.customerName  || '').toLowerCase().includes(term) ||
            (q.customerPhone || '').toLowerCase().includes(term)
        );
    });

    if (!filtered.length) {
        container.innerHTML = `<div id="quoteListEmptyState">
            <div class="empty-icon">📋</div>
            <p>${term ? 'Không tìm thấy báo giá phù hợp.' : 'Chưa có báo giá nào. Nhấn <strong>＋ Báo giá mới</strong> để bắt đầu!'}</p>
        </div>`;
        return;
    }

    // Sort newest first
    const sorted = [...filtered].sort((a, b) => (b.savedAt || b.createdAt || '').localeCompare(a.savedAt || a.createdAt || ''));

    // Phân trang
    const totalItems = sorted.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / _qlPerPage));
    _qlPage = Math.min(Math.max(1, _qlPage), totalPages);
    const pageItems  = sorted.slice((_qlPage - 1) * _qlPerPage, _qlPage * _qlPerPage);
    const globalOffset = (_qlPage - 1) * _qlPerPage;

    const rows = pageItems.map((q, i) => {
        const dateStr = q.savedAt || q.createdAt;
        const date    = dateStr ? new Date(dateStr).toLocaleDateString('vi-VN') : '—';
        const total   = Number(q.total) || 0;
        const id      = escapeHtml(q.id);
        const globalIdx = globalOffset + i;

        // ---- Status badge ----
        const status = q.orderStatus || 'pending';
        const statusBadges = {
            pending:    '<span class="badge badge-pending">• Chưa XN</span>',
            deposited:  '<span class="badge badge-deposited">💰 Đã cọc</span>',
            no_deposit: '<span class="badge badge-no-deposit">⏳ Không cọc</span>',
            completed:  '<span class="badge badge-completed">✅ Hoàn thành</span>',
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
                ? `<span style="color:#aaa;text-decoration:line-through;font-size:12px;">${formatCurrency(depositAmt)}</span>`
                : formatCurrency(depositAmt))
            : '—';
        const debtStr    = status !== 'pending'
            ? `<span style="color:${debtAmt > 0 ? '#c0392b' : '#1a7a35'};font-weight:700;">${formatCurrency(debtAmt)}</span>`
            : '—';

        // ---- Tích điểm (1 điểm / 100.000đ) ----
        const points = status !== 'pending' ? Math.floor(total / 100000) : 0;
        const pointsStr = status !== 'pending'
            ? `<span style="color:#8e44ad;font-weight:700;">${points.toLocaleString('vi-VN')}</span>`
            : '—';

        // ---- Nút hành động chính (thay đổi theo status) ----
        let primaryBtn = '';
        if (status === 'pending') {
            primaryBtn = `<button class="qlt-btn-confirm" title="Xác nhận đơn" onclick="openConfirmOrderModal('${id}')">✔</button>`;
        } else if (status === 'deposited' || status === 'no_deposit') {
            primaryBtn = `<button class="qlt-btn-fullpaid" title="Đã thu đủ tiền" onclick="markFullPayment('${id}')">$</button>`;
        } else {
            primaryBtn = `<button class="qlt-btn-fullpaid" title="Đã thu đủ" disabled style="opacity:.45;cursor:default;">$</button>`;
        }
        // ---- Nút Recall (hoàn tác trạng thái) ----
        const recallBtn = status !== 'pending'
            ? `<button class="qlt-btn-recall" title="Hoàn tác về bước trước" onclick="recallOrderStatus('${id}')">↺</button>`
            : '';

        // Action buttons order: Confirm/Đã thu -> Xem trước -> JPG -> Sửa -> Xóa -> (spacing) -> Recall
        const previewBtn = `<button class="qlt-btn-preview" title="Xem trước" onclick="previewSavedQuote('${id}')">👁</button>`;
        const jpgBtn     = `<button class="qlt-btn-jpg"     title="Tải JPG" onclick="exportJPGSavedQuote('${id}')">JPG</button>`;
        const openBtn    = (status === 'completed')
            ? `<button class="qlt-btn-open" title="Mở chỉnh sửa" disabled style="opacity:.45;cursor:default;">✏</button>`
            : `<button class="qlt-btn-open" title="Mở chỉnh sửa" onclick="viewSavedQuote('${id}')">✏</button>`;
        const _trashSvg = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M8 6v-1a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1"></path><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path></svg>`;
        const delBtn     = (status === 'completed')
            ? `<button class="qlt-btn-del" title="Xóa" disabled>${_trashSvg}</button>`
            : `<button class="qlt-btn-del" title="Xóa" onclick="deleteSavedQuote('${id}')">${_trashSvg}</button>`;

        return `<tr>
            <td style="text-align:center;width:32px;">${globalIdx + 1}</td>
            <td style="font-weight:700;color:#1D75AE;width:105px;">${escapeHtml(q.quoteNumber || q.id)}</td>
            <td style="width:140px;">${escapeHtml(q.customerName || '—')}</td>
            <td style="width:100px;">${escapeHtml(q.customerPhone || '—')}</td>
            <td style="width:82px;text-align:center;">${date}</td>
            <td style="width:86px;text-align:center;">${badgeHtml}</td>
            <td style="width:88px;text-align:right;">${depositStr}</td>
            <td style="width:88px;text-align:right;">${debtStr}</td>
            <td style="width:60px;text-align:center;">${pointsStr}</td>
            <td style="font-weight:700;color:#1a7a35;width:100px;text-align:right;">${formatCurrency(total)}</td>
            <td style="width:190px;">
                <div class="qlt-actions">
                    ${primaryBtn}
                    ${previewBtn}
                    ${jpgBtn}
                    ${openBtn}
                    ${delBtn}
                    <span style="width:8px;display:inline-block"></span>
                    ${recallBtn}
                </div>
            </td>
        </tr>`;
    }).join('');

    container.innerHTML = `<div style="overflow-x:auto;">
    <table class="quote-list-table" style="min-width:900px;table-layout:fixed;width:100%;">
        <thead><tr>
            <th style="width:32px;text-align:center;">#</th>
            <th style="width:105px;">Mã BG</th>
            <th style="width:140px;">Tên khách hàng</th>
            <th style="width:100px;">SĐT</th>
            <th style="width:82px;text-align:center;">Ngày</th>
            <th style="width:86px;text-align:center;">Trạng thái</th>
            <th style="width:88px;text-align:right;">Tiền cọc</th>
            <th style="width:88px;text-align:right;">Tiền nợ</th>
            <th style="width:60px;text-align:center;">Điểm</th>
            <th style="width:100px;text-align:right;">Tổng tiền</th>
            <th style="width:190px;">Thao tác</th>
        </tr></thead>
        <tbody>${rows}</tbody>
    </table></div>
    <div class="ql-pager">
        <button class="ql-pg-btn" onclick="qlPrevPage()" ${_qlPage <= 1 ? 'disabled' : ''}>◄</button>
        <span class="ql-pg-label">
            <input class="ql-pg-input" type="number" min="1" max="${totalPages}"
                value="${_qlPage}"
                onchange="qlGoPage(this.value, ${totalItems})"
                onkeydown="if(event.key==='Enter')qlGoPage(this.value,${totalItems})">
            <span>/ ${totalPages}</span>
        </span>
        <button class="ql-pg-btn" onclick="qlNextPage(${totalItems})" ${_qlPage >= totalPages ? 'disabled' : ''}>►</button>
        <span class="ql-pg-sep"></span>
        <label class="ql-pg-size">
            <input type="number" min="1" max="200" value="${_qlPerPage}"
                onchange="qlSetPerPage(this.value)"
                onkeydown="if(event.key==='Enter')qlSetPerPage(this.value)">
            / trang
        </label>
        <span class="ql-pg-info">${totalItems} bản ghi</span>
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

    // Chỉ ghi nhận doanh thu của đơn đã xác nhận (deposited / no_deposit / completed)
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

    setEl('statTotalCount',      savedQuotes.length);
    setEl('statCustomerCount',   (typeof savedCustomers !== 'undefined' ? savedCustomers.length : 0));
    setEl('statReceivedAmount',  formatCurrency(receivedAmount));
    setEl('statTotalDebt',       formatCurrency(totalDebt));
    setEl('statTotalRevenue',    formatCurrency(totalRevenue));
    setEl('statMonthRevenue',    formatCurrency(monthRevenue));
    setEl('statMonthLabel',      `Tháng ${month + 1}/${year}`);
}

/**
 * Delete a saved quote by id, then refresh the list.
 * @param {string} id
 */
function deleteSavedQuote(id) {
    if (!confirm('Xóa báo giá này?')) return;
    const idx = savedQuotes.findIndex(q => q.id === id);
    if (idx === -1) return;
    savedQuotes.splice(idx, 1);
    persistSavedQuotes();
    renderQuoteList(document.getElementById('mainQuoteSearch')?.value || '');
    renderDashboardStats();
}

/**
 * Load a saved quote into the form, then open the form modal.
 * @param {string} id   Quote id
 */
function viewSavedQuote(id) {
    loadQuoteIntoForm(id);
    // Update modal title to reflect editing mode
    const title = document.getElementById('quoteFormModalTitle');
    if (title) title.textContent = `✏️ Chỉnh sửa báo giá: ${escapeHtml(id)}`;
    openQuoteFormModal();
}

/* ─────────────────────────────────────────────────────────────────
   ORDER MANAGEMENT  (xác nhận đơn, tiền cọc, thu đủ)
───────────────────────────────────────────────────────────────── */

/**
 * Patch a saved quote in-place without touching the form.
 * @param {string} id       Quote id
 * @param {object} fields   Key/value pairs to merge
 */
function patchSavedQuote(id, fields) {
    const idx = savedQuotes.findIndex(q => q.id === id);
    if (idx === -1) return null;
    Object.assign(savedQuotes[idx], fields);
    persistSavedQuotes();
    return savedQuotes[idx];
}

/**
 * Open the confirm-order mini-modal for a specific quote.
 * @param {string} quoteId
 */
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

/**
 * Confirm an order with or without deposit.
 * @param {string}  quoteId
 * @param {boolean} hasDeposit  true = đã cọc 40%, false = chưa cọc
 */
function confirmOrderWithDeposit(quoteId, hasDeposit) {
    const q = savedQuotes.find(q => q.id === quoteId);
    if (!q) return;
    const total = Number(q.total) || 0;

    if (hasDeposit) {
        const depositAmt = Math.round(total * 0.4);
        patchSavedQuote(quoteId, {
            orderStatus:      'deposited',
            depositConfirmed: true,
            depositAmount:    depositAmt,
            receivedAmount:   depositAmt,
            depositDisabled:  false,
            savedAt:          q.savedAt || q.createdAt,
        });
    } else {
        patchSavedQuote(quoteId, {
            orderStatus:      'no_deposit',
            depositConfirmed: false,
            depositAmount:    0,
            receivedAmount:   0,
            depositDisabled:  true,
            savedAt:          q.savedAt || q.createdAt,
        });
    }

    document.getElementById('confirmOrderModal').classList.remove('show');
    renderQuoteList(document.getElementById('mainQuoteSearch')?.value || '');
    renderDashboardStats();
}

/**
 * Mark a quote as fully paid (thu đủ tiền).
 * Debt → 0, received = full total.
 * @param {string} quoteId
 */
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
   PREVIEW & EXPORT từ dashboard (không mở form modal)
───────────────────────────────────────────────────────────────── */

/**
 * Load a saved quote into the form (silently) and show the preview modal.
 * @param {string} quoteId
 */
function previewSavedQuote(quoteId) {
    const q = savedQuotes.find(q => q.id === quoteId);
    window._quoteExportCtx = q ? { orderStatus: q.orderStatus || 'pending', depositAmount: q.depositAmount || 0 } : null;
    loadQuoteIntoForm(quoteId);
    if (typeof previewQuote === 'function') previewQuote();
}

/**
 * Load a saved quote into the form (silently) and export as JPG.
 * @param {string} quoteId
 */
function exportJPGSavedQuote(quoteId) {
    const q = savedQuotes.find(q => q.id === quoteId);
    window._quoteExportCtx = q ? { orderStatus: q.orderStatus || 'pending', depositAmount: q.depositAmount || 0 } : null;
    loadQuoteIntoForm(quoteId);
    if (typeof exportQuoteAsJPG === 'function') exportQuoteAsJPG();
    window._quoteExportCtx = null;
}

/**
 * Hoàn tác trạng thái về bước trước đó.
 * completed → deposited / no_deposit
 * deposited / no_deposit → pending
 * @param {string} quoteId
 */
function recallOrderStatus(quoteId) {
    const saved = JSON.parse(localStorage.getItem('savedQuotes') || '[]');
    const idx = saved.findIndex(q => (q.id || q.quoteNumber) === quoteId);
    if (idx === -1) return;
    const q = saved[idx];
    const status = q.orderStatus || 'pending';
    let prevStatus;
    if (status === 'completed') {
        prevStatus = (q.depositAmount && q.depositAmount > 0) ? 'deposited' : 'no_deposit';
    } else if (status === 'deposited' || status === 'no_deposit') {
        prevStatus = 'pending';
    } else {
        return;
    }
    const label = { pending: 'Chưa XN', deposited: 'Đã cọc', no_deposit: 'Không cọc', completed: 'Hoàn thành' };
    if (!confirm(`Hoàn tác "${label[status]}" → "${label[prevStatus]}"?`)) return;
    saved[idx].orderStatus = prevStatus;
    if (prevStatus === 'pending') {
        delete saved[idx].depositAmount;
        delete saved[idx].receivedAmount;
        delete saved[idx].depositDisabled;
        delete saved[idx].paid;
    } else if (prevStatus === 'deposited' || prevStatus === 'no_deposit') {
        saved[idx].receivedAmount = 0;
        delete saved[idx].paid;
    }
    localStorage.setItem('savedQuotes', JSON.stringify(saved));
    renderQuoteList(document.getElementById('mainQuoteSearch')?.value || '');
    renderDashboardStats();
}
