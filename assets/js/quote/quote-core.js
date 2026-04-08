/**
 * quote/quote-core.js
 * --------------------------------------------------
 * Core quote lifecycle:
 *   – finalizeQuoteNumber()  : commit & persist a quote, then reset form
 *   – saveCurrentQuote()     : build the quote object and write to localStorage
 *   – loadQuoteIntoForm()    : restore a saved quote into the form for editing
 *
 * Depends on:
 *   state.js               (all state vars)
 *   utils/helpers.js       (generateQuoteNumber, incrementQuoteSeqAndGet)
 *   utils/format.js        (formatCurrency)
 *   utils/dom.js           (getPriceThousandsFromRow)
 *   storage/storage.js     (loadSavedQuotes, persistSavedQuotes, upsertCustomer)
 *   quote/quote-table.js   (addRow, updateRemoveButtons, attachPriceBehavior,
 *                           updateRowTotal, handleUnitChange)
 *   quote/quote-summary.js (updateSummary, computeDepositFromTotal)
 *   ui/notification.js     (showNotification)
 * --------------------------------------------------
 */

// ---- Finalize (commit) a quote number --------------------------------

/**
 * Assign the next sequential quote number, save the current form data,
 * clear the form and prepare for the next quote.
 * If currently editing a saved quote (editingQuoteId set), updates it instead.
 * @returns {string|undefined}  The assigned quote ID
 */
function finalizeQuoteNumber() {
    try {
        // ── Validation ────────────────────────────────────────
        const name    = (document.getElementById('customerName')?.value    || '').trim();
        const phone   = (document.getElementById('customerPhone')?.value   || '').trim();
        const address = (document.getElementById('customerAddress')?.value || '').trim();
        if (!name || !phone || !address) {
            showNotification('⚠️ Vui lòng nhập đủ Tên, Số điện thoại và Địa chỉ khách hàng!', 'error');
            return;
        }
        const rows = document.querySelectorAll('#itemsBody tr');
        const hasProduct = Array.from(rows).some(row => {
            const nameInp = row.querySelector('.product-name-cell input, .product-name-cell select');
            return nameInp && (nameInp.value || '').trim() !== '';
        });
        if (!hasProduct) {
            showNotification('⚠️ Vui lòng nhập ít nhất 1 sản phẩm!', 'error');
            return;
        }
        // ───────────────────────────────────────────────
        if (window.editingQuoteId) {
            const assigned = window.editingQuoteId;
            saveCurrentQuote({ id: assigned });
            window.quoteNumber = generateQuoteNumber();
            const disp = document.getElementById('currentQuoteDisplay');
            if (disp) disp.textContent = window.quoteNumber;
            showNotification('✅ Đã lưu thay đổi cho báo giá: ' + assigned);
            if (typeof closeQuoteFormModal === 'function') closeQuoteFormModal();
            if (typeof renderQuoteList     === 'function') renderQuoteList();
            if (typeof renderDashboardStats === 'function') renderDashboardStats();
            return assigned;
        }

        const assigned = incrementQuoteSeqAndGet();
        saveCurrentQuote({ id: assigned });

        window.quoteNumber = generateQuoteNumber();
        const disp = document.getElementById('currentQuoteDisplay');
        if (disp) disp.textContent = window.quoteNumber;

        const btn = document.getElementById('finalizeQuoteBtn');
        if (btn) {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.textContent = 'Xác nhận đã xong báo giá';
        }

        showNotification('✅ Đã lưu và cấp mã báo giá: ' + assigned);
        if (typeof closeQuoteFormModal  === 'function') closeQuoteFormModal();
        if (typeof renderQuoteList      === 'function') renderQuoteList();
        if (typeof renderDashboardStats === 'function') renderDashboardStats();
        return assigned;
    } catch (e) {
        console.error('finalizeQuoteNumber failed', e);
        alert('Không thể cấp mã báo giá, xem console để biết chi tiết.');
    }
}

// ---- Save current form data ------------------------------------------

/**
 * Collect all form data into a quote object and persist to localStorage.
 * Resets the form for a fresh quote after saving.
 * @param {{ id?: string, balance?: number }} [optionalData]
 * @returns {object}  The saved quote summary
 */
function saveCurrentQuote(optionalData) {
    const id = (optionalData && optionalData.id) || window.quoteNumber || ('BG' + Date.now());
    loadSavedQuotes();
    const existingQuote = savedQuotes.find(q => q.id === id) || null;

    const customerCode    = (document.getElementById('customerCode')?.value    || '').trim();
    const customerName    = (document.getElementById('customerName')?.value    || '').trim();
    const customerPhone   = (document.getElementById('customerPhone')?.value   || '').trim();
    const customerAddress = (document.getElementById('customerAddress')?.value || '').trim();

    // Grand total from the UI display
    let total = 0;
    try {
        const el = document.getElementById('total');
        if (el) {
            // Prefer the exact integer stored by updateSummary()
            total = el.dataset.raw ? parseInt(el.dataset.raw, 10) || 0
                                   : parseInt((el.textContent || '0').replace(/[^\d]/g, ''), 10) || 0;
        }
    } catch (e) { }

    let balance = (optionalData && optionalData.balance != null) ? optionalData.balance : total;
    const createdAt = new Date().toISOString();

    // Collect row items (skip the special points-redemption row)
    const items = [];
    let pointsUsed = 0;
    try {
        document.querySelectorAll('#itemsBody tr').forEach(row => {
            try {
                // Points-redemption row: capture qty, don't add to regular items
                if (row.getAttribute('data-points-row') === 'true') {
                    pointsUsed = parseInt(String(row.cells[3]?.textContent || '0'), 10) || 0;
                    return;
                }
                const nameCell  = row.querySelector('.product-name-cell');
                const nameInp   = nameCell ? nameCell.querySelector('input, select') : null;
                const nameVal   = nameInp ? (nameInp.value || '') : '';

                const unitCell  = row.querySelector('.unit-cell');
                const unitInp   = unitCell ? unitCell.querySelector('input') : null;
                const unitVal   = unitInp ? (unitInp.value || '') : '';

                const qtyInp    = row.querySelector('input[type="number"]');
                const qty       = qtyInp ? parseFloat(qtyInp.value || '0') : 0;

                const priceInp  = row.querySelector('.price-cell input');
                let priceVnd = 0;
                if (priceInp) {
                    priceVnd = (priceInp.dataset && priceInp.dataset.raw != null)
                        ? parseFloat(priceInp.dataset.raw) || 0
                        : parseFloat(String(priceInp.value || '').replace(/[^0-9.-]/g, '')) || 0;
                }

                const discInp  = row.querySelector('.discount-cell input');
                let discVnd = 0;
                if (discInp) {
                    discVnd = (discInp.dataset && discInp.dataset.raw != null)
                        ? parseFloat(discInp.dataset.raw) || 0
                        : parseFloat(String(discInp.value || '').replace(/[^0-9.-]/g, '')) || 0;
                }

                items.push({
                    name:           String(nameVal || ''),
                    unit:           unitVal,
                    qty,
                    price:          priceVnd,
                    priceThousands: Math.round(priceVnd / 1000),
                    discount:       discVnd,
                    lineTotal:      Math.max(0, Math.round(qty * (priceVnd - discVnd))),
                });
            } catch (e) { }
        });
    } catch (e) { }

    // Capture pricing controls for exact restore
    const vatPercent     = parseFloat(document.getElementById('vat')?.value || '0') || 0;
    const quoteType      = currentQuoteType || 'cup';
    let depositDisabledFlag = !!(document.getElementById('depositToggle')?.checked);
    let depositAmount = 0;
    try {
        const depEl = document.getElementById('deposit');
        if (depEl) depositAmount = depEl.dataset.raw ? parseInt(depEl.dataset.raw, 10) || 0
                                                     : parseInt((depEl.textContent || '0').replace(/[^\d]/g, ''), 10) || 0;
    } catch (e) { }

    // Preserve order/payment state when editing an existing saved quote
    const existingOrderStatus = existingQuote?.orderStatus || 'pending';
    const existingDepositConfirmed = !!existingQuote?.depositConfirmed;
    const existingPaid = !!existingQuote?.paid;
    const existingReceivedAmount = Number(existingQuote?.receivedAmount) || 0;
    const existingDepositAmount = Number(existingQuote?.depositAmount) || 0;

    if (existingOrderStatus === 'deposited' && existingDepositAmount > 0) {
        depositDisabledFlag = false;
        depositAmount = existingDepositAmount;
    } else if (existingOrderStatus === 'no_deposit') {
        depositDisabledFlag = true;
        depositAmount = 0;
    } else if (existingOrderStatus === 'completed') {
        depositDisabledFlag = existingQuote?.depositDisabled === true;
        depositAmount = existingDepositAmount;
    }

    let nextReceivedAmount = existingReceivedAmount;
    if (existingOrderStatus === 'deposited') {
        nextReceivedAmount = depositAmount;
    } else if (existingOrderStatus === 'no_deposit') {
        nextReceivedAmount = 0;
    } else if (existingOrderStatus === 'completed') {
        nextReceivedAmount = total;
    }

    const summary = {
        id, customerCode, customerName, customerPhone, customerAddress,
        total, items, pointsUsed,
        vatPercent, quoteType,
        depositDisabled: depositDisabledFlag, depositAmount,
        depositConfirmed: existingDepositConfirmed,
        paid: existingPaid,
        orderStatus: existingOrderStatus,
        receivedAmount: nextReceivedAmount,
        balance,
        createdAt,
    };

    // Compute loyalty points for this quote (1 point per 100.000 VND)
    // pointsEarned     = điểm dự kiến của báo giá này
    // pointsTotalAtSave = tổng điểm đã ghi nhận từ đơn COMPLETED (không tính đơn này trừ khi completed)
    try {
        loadSavedQuotes();
        const completedPoints = savedQuotes.reduce(function(s, q) {
            try {
                if ((q.customerPhone || '').trim() === (customerPhone || '').trim() &&
                    q.id !== id &&
                    (q.orderStatus || '') === 'completed') {
                    return s + Math.floor((Number(q.total) || 0) / 200000);
                }
            } catch (e) { }
            return s;
        }, 0);
        const pointsEarned = Math.floor((Number(total) || 0) / 200000);
        summary.pointsEarned = pointsEarned;
        // Chỉ cộng điểm của đơn này vào tổng khi trạng thái là completed
        summary.pointsTotalAtSave = existingOrderStatus === 'completed'
            ? completedPoints + pointsEarned
            : completedPoints;
    } catch (e) { }

    // Persist (update in place if id already exists, otherwise prepend)
    const existingIdx = savedQuotes.findIndex(q => q.id === id);
    if (existingIdx !== -1) {
        summary.createdAt = savedQuotes[existingIdx].createdAt || summary.createdAt;
        savedQuotes[existingIdx] = summary;
    } else if (window.editingQuoteId && window.editingQuoteId === id) {
        const idx2 = savedQuotes.findIndex(q => q.id === window.editingQuoteId);
        if (idx2 !== -1) savedQuotes[idx2] = summary;
        else savedQuotes.unshift(summary);
    } else {
        savedQuotes.unshift(summary);
    }
    if (savedQuotes.length > 200) savedQuotes.length = 200;
    persistSavedQuotes();

    // Auto-save products/units/prices to the product catalog
    try {
        items.forEach(function(item) {
            if (item.name && item.name.trim() && item.price > 0) {
                upsertProduct(item.name.trim(), item.unit || '', item.price);
            }
        });
    } catch (e) { console.error('upsertProduct loop error', e); }

    if (customerCode) upsertCustomer(customerCode, customerName, customerPhone, customerAddress, createdAt);

    // ---- Reset form for next quote ----
    try {
        // Customer fields
        ['customerCode', 'customerName', 'customerPhone', 'customerAddress'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        const cc = document.getElementById('customerCode');
        if (cc) { cc.readOnly = true; cc.style.background = '#f8f9fa'; }

        // Items table
        const tbody = document.getElementById('itemsBody');
        if (tbody) {
            tbody.innerHTML = '';
            rowCount = 0;
            addRow();
        }

        // Summary display
        ['subtotal', 'total', 'deposit', 'remaining'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '0 VNĐ';
        });

        // State
        quoteNumber = generateQuoteNumber();
        window.editingQuoteId       = null;
        window.editingLockedDeposit = false;
        window.editingDepositAmount = 0;
        window.depositToggleLocked  = false;

        // Deposit toggle
        const depT = document.getElementById('depositToggle');
        if (depT) {
            depT.checked = false;
            depT.disabled = false;
        }
        window.depositDisabled = false;

        // Quote type UI back to 'cup'
        const cupBtn  = document.getElementById('quoteTypeCup');
        const otherBtn = document.getElementById('quoteTypeOther');
        if (cupBtn && otherBtn) { cupBtn.classList.add('active'); otherBtn.classList.remove('active'); }
        const addImageBtn = document.getElementById('addImageBtn');
        const finalBtn    = document.getElementById('finalizeDropdownBtn');
        const finalDiv    = document.getElementById('finalizeDropdownDivider');
        if (addImageBtn) addImageBtn.style.display = 'inline-block';
        if (finalBtn)    finalBtn.style.display    = 'block';
        if (finalDiv)    finalDiv.style.display    = 'block';
        currentQuoteType = 'cup';
    } catch (e) {
        console.error('Error clearing form after save', e);
    }

    return summary;
}

// ---- Load a saved quote back into the form ---------------------------

/**
 * Restore a saved quote object into the form for editing.
 * Sets window.editingQuoteId so that the next "Xác nhận" updates, not inserts.
 * @param {string} id
 */
function loadQuoteIntoForm(id) {
    try {
        loadSavedQuotes();
        const q = (savedQuotes || []).find(x => x.id === id);
        if (!q) { alert('Không tìm thấy báo giá: ' + id); return; }

        window.editingQuoteId = q.id;
        window.quoteNumber    = q.id;
        const disp = document.getElementById('currentQuoteDisplay');
        if (disp) disp.textContent = q.id;

        // Customer info
        document.getElementById('customerCode').value    = q.customerCode    || '';
        document.getElementById('customerName').value    = q.customerName    || '';
        document.getElementById('customerPhone').value   = q.customerPhone   || '';
        document.getElementById('customerAddress').value = q.customerAddress || '';

        // Quote type
        const qt = q.quoteType || 'cup';
        currentQuoteType = qt;
        const cupBtn  = document.getElementById('quoteTypeCup');
        const otherBtn = document.getElementById('quoteTypeOther');
        if (cupBtn && otherBtn) {
            qt === 'cup' ? (cupBtn.classList.add('active'), otherBtn.classList.remove('active'))
                         : (otherBtn.classList.add('active'), cupBtn.classList.remove('active'));
        }
        const addImageBtn = document.getElementById('addImageBtn');
        const finalBtn    = document.getElementById('finalizeDropdownBtn');
        const finalDiv    = document.getElementById('finalizeDropdownDivider');
        if (qt === 'cup') {
            if (addImageBtn) addImageBtn.style.display = 'inline-block';
            if (finalBtn)    finalBtn.style.display    = 'block';
            if (finalDiv)    finalDiv.style.display    = 'block';
        } else {
            if (addImageBtn) addImageBtn.style.display = 'none';
            if (finalBtn)    finalBtn.style.display    = 'none';
            if (finalDiv)    finalDiv.style.display    = 'none';
        }

        // VAT
        document.getElementById('vat').value = (typeof q.vatPercent === 'number' ? q.vatPercent : 0);

        // Deposit toggle and lock
        const depToggle   = document.getElementById('depositToggle');
        const isDisabled  = !!q.depositDisabled;
        const isDepositedLocked = (q.orderStatus === 'deposited' && (Number(q.depositAmount) || 0) > 0);
        if (depToggle) {
            depToggle.checked = isDisabled;
            depToggle.disabled = isDepositedLocked;
        }
        window.depositDisabled = isDisabled;
        window.depositToggleLocked = isDepositedLocked;
        if (isDepositedLocked) {
            window.editingLockedDeposit  = true;
            window.editingDepositAmount  = (typeof q.depositAmount === 'number' ? q.depositAmount : Number(q.depositAmount) || 0);
        } else if (!isDisabled) {
            window.editingLockedDeposit  = true;
            window.editingDepositAmount  = (typeof q.depositAmount === 'number' ? q.depositAmount : 0);
        } else {
            window.editingLockedDeposit  = false;
            window.editingDepositAmount  = 0;
        }

        // Items
        const tbody = document.getElementById('itemsBody');
        tbody.innerHTML = '';
        rowCount = 0;
        (Array.isArray(q.items) ? q.items : []).forEach((it, index) => {
            const row = document.createElement('tr');
            rowCount++;
            row.innerHTML = `
                <td>${rowCount}</td>
                <td class="product-name-cell"></td>
                <td class="unit-cell"></td>
                <td><input type="number" placeholder="1" min="0" step="0.01" onchange="updateRowTotal(this)"></td>
                <td class="price-cell"></td>
                <td class="discount-cell"></td>
                <td class="row-total">0</td>
                <td><button class="remove-btn" onclick="removeRow(this)">Xóa</button></td>
            `;
            tbody.appendChild(row);

            // Name cell with catalog dropdown (preset to saved value)
            row.querySelector('.product-name-cell').appendChild(buildProductSelect(it.name || ''));

            const unitInp = document.createElement('input');
            unitInp.type = 'text';
            unitInp.value = (it.unit || '');
            unitInp.onchange = e => { updateRowTotal(e.target); handleUnitChange(unitInp); };
            row.querySelector('.unit-cell').appendChild(unitInp);

            const qtyInp = row.querySelector('td:nth-child(4) input');
            if (qtyInp) qtyInp.value = (typeof it.qty === 'number' ? it.qty : parseFloat(it.quantity || '0') || 0);

            const priceInp = document.createElement('input');
            priceInp.type = 'text';
            priceInp.dataset.raw = String(
                typeof it.price === 'number' ? it.price
                    : (typeof it.priceThousands === 'number' ? it.priceThousands * 1000 : 0)
            );
            row.querySelector('.price-cell').appendChild(priceInp);
            attachPriceBehavior(priceInp);

            const discInp = document.createElement('input');
            discInp.type = 'text';
            discInp.dataset.raw = String(typeof it.discount === 'number' ? it.discount : 0);
            discInp.classList.add('discount-input');
            row.querySelector('.discount-cell').appendChild(discInp);
            attachPriceBehavior(discInp);

            updateRowTotal(priceInp);
        });
        updateRemoveButtons();
        updateSummary();

        const finalizeBtn = document.getElementById('finalizeQuoteBtn');
        if (finalizeBtn) finalizeBtn.textContent = '💾 Lưu thay đổi báo giá';

        showNotification('📋 Đang chỉnh sửa báo giá: ' + q.id);
    } catch (e) {
        console.error('loadQuoteIntoForm error', e);
        alert('Có lỗi khi tải báo giá.');
    }
}
