/**
 * quote/quote-summary.js
 * --------------------------------------------------
 * Computes and displays the quote summary totals
 * (subtotal, discount, VAT, total, deposit, remaining).
 *
 * Hỗ trợ cọc tự do:
 *   – Nhập trực tiếp số tiền cọc (VNĐ)
 *   – Hoặc nhập tỷ lệ phần trăm (%)
 *   – Tự động tính "Còn lại phải thu"
 *
 * Depends on:
 *   state.js       (window.depositDisabled, editingLockedDeposit, editingDepositAmount)
 *   utils/format.js (formatCurrency)
 *   utils/dom.js    (getCellInputValue)
 * --------------------------------------------------
 */

window._customDepositManual = false;

/**
 * Xử lý khi người dùng đổi % cọc
 */
function onDepositPercentChange(pct) {
    window._customDepositManual = false;
    const p = Math.max(0, Math.min(100, parseFloat(pct) || 0));
    const totalEl = document.getElementById('total');
    const total = totalEl ? (parseInt(totalEl.dataset.raw || '0', 10) || 0) : 0;
    const depositAmt = Math.round(total * (p / 100));

    const depInp = document.getElementById('depositAmountInput');
    if (depInp) {
        depInp.value = formatCurrency(depositAmt);
        depInp.dataset.raw = depositAmt;
    }
    const depEl = document.getElementById('deposit');
    if (depEl) {
        depEl.textContent = formatCurrency(depositAmt);
        depEl.dataset.raw = depositAmt;
    }

    const remaining = Math.max(0, total - depositAmt);
    const remEl = document.getElementById('remaining');
    if (remEl) {
        remEl.textContent = formatCurrency(remaining);
        remEl.dataset.raw = remaining;
    }
}

/**
 * Xử lý khi người dùng gõ trực tiếp số tiền cọc (VNĐ)
 */
function onDepositAmountInput(el) {
    window._customDepositManual = true;
    const rawDigits = String(el.value || '').replace(/[^0-9]/g, '');
    const depositAmt = parseInt(rawDigits || '0', 10);
    el.dataset.raw = depositAmt;
    el.value = rawDigits ? new Intl.NumberFormat('vi-VN').format(depositAmt) + ' VNĐ' : '';

    const totalEl = document.getElementById('total');
    const total = totalEl ? (parseInt(totalEl.dataset.raw || '0', 10) || 0) : 0;

    // Cập nhật lại số % tương ứng
    const pct = total > 0 ? Math.round((depositAmt / total) * 100) : 0;
    const pctInp = document.getElementById('depositPercent');
    if (pctInp) pctInp.value = pct;

    const depEl = document.getElementById('deposit');
    if (depEl) {
        depEl.textContent = formatCurrency(depositAmt);
        depEl.dataset.raw = depositAmt;
    }

    const remaining = Math.max(0, total - depositAmt);
    const remEl = document.getElementById('remaining');
    if (remEl) {
        remEl.textContent = formatCurrency(remaining);
        remEl.dataset.raw = remaining;
    }
}

/**
 * Compute deposit from a grand total.
 * Respects "Không cọc" toggle and any locked deposit when editing.
 * @param {number} total
 * @returns {number}
 */
function computeDepositFromTotal(total) {
    try {
        if (window.depositDisabled) return 0;
        if (window.editingLockedDeposit && typeof window.editingDepositAmount === 'number' && window.editingDepositAmount > 0) {
            return Math.round(window.editingDepositAmount);
        }
        if (window._customDepositManual) {
            const depInp = document.getElementById('depositAmountInput');
            if (depInp && depInp.dataset.raw != null && depInp.dataset.raw !== '') {
                return Math.max(0, parseInt(depInp.dataset.raw, 10) || 0);
            }
        }
        const pctInp = document.getElementById('depositPercent');
        const pct = pctInp ? (parseFloat(pctInp.value) || 0) : 40;
        return Math.round((Number(total) || 0) * (pct / 100));
    } catch (e) {
        return Math.round((Number(total) || 0) * 0.4);
    }
}

/**
 * Re-read all row totals and update the right-side summary panel.
 * Called every time a quantity, price, discount, or VAT field changes.
 */
function updateSummary() {
    try {
        // Sum row-total cells; also collect per-row discount totals
        let subtotal      = 0;
        let totalDiscount = 0;
        document.querySelectorAll('#itemsBody tr').forEach(row => {
            try {
                const totalCell = row.querySelector('.row-total');
                if (totalCell) {
                    const lineAmt = parseInt(String(totalCell.dataset.raw || totalCell.textContent || '').replace(/[^0-9\-]/g, '') || '0', 10);
                    subtotal += lineAmt || 0;
                    const discAmt = parseInt(String(totalCell.dataset.discRow || '0'), 10) || 0;
                    totalDiscount += discAmt;
                }
            } catch (e) { }
        });

        const vat       = parseFloat(document.getElementById('vat')?.value || '0') || 0;
        const vatAmount = subtotal * (vat / 100);
        const total     = subtotal + vatAmount;
        const totalVal  = Number(total) || 0;

        document.getElementById('subtotal').textContent  = formatCurrency(subtotal);

        // Show total row-level discount
        const discDispEl = document.getElementById('discountDisplay');
        if (discDispEl) {
            discDispEl.textContent = formatCurrency(totalDiscount);
            discDispEl.dataset.raw = totalDiscount;
        }

        const totalEl = document.getElementById('total');
        if (totalEl) {
            totalEl.textContent = formatCurrency(Math.round(totalVal));
            totalEl.dataset.raw = Math.round(totalVal);
        }

        // Deposit and Remaining
        const depInp = document.getElementById('depositAmountInput');
        const pctInp = document.getElementById('depositPercent');

        let deposit = 0;
        if (window.depositDisabled) {
            deposit = 0;
            if (depInp) {
                depInp.value = '0 VNĐ';
                depInp.dataset.raw = 0;
                depInp.disabled = true;
            }
            if (pctInp) {
                pctInp.value = 0;
                pctInp.disabled = true;
            }
        } else {
            if (depInp) depInp.disabled = false;
            if (pctInp) pctInp.disabled = false;

            if (window._customDepositManual && depInp && depInp.dataset.raw != null && depInp.dataset.raw !== '') {
                deposit = parseInt(depInp.dataset.raw, 10) || 0;
                if (pctInp) pctInp.value = totalVal > 0 ? Math.round((deposit / totalVal) * 100) : 0;
            } else {
                const pct = pctInp ? (parseFloat(pctInp.value) || 0) : 40;
                deposit = Math.round(totalVal * (pct / 100));
                if (depInp) {
                    depInp.value = formatCurrency(deposit);
                    depInp.dataset.raw = deposit;
                }
            }
        }

        const remaining = Math.max(0, Math.round(totalVal - deposit));

        const depEl = document.getElementById('deposit');
        if (depEl) {
            depEl.textContent = formatCurrency(deposit);
            depEl.dataset.raw = deposit;
        }
        const remEl = document.getElementById('remaining');
        if (remEl) {
            remEl.textContent = formatCurrency(remaining);
            remEl.dataset.raw = remaining;
        }
        const subEl = document.getElementById('subtotal');
        if (subEl) subEl.dataset.raw = subtotal;
    } catch (e) {
        console.error('updateSummary error', e);
    }
}

/**
 * Called by the "Không cọc" toggle checkbox.
 * @param {boolean} isChecked
 */
function toggleDepositDisabled(isChecked) {
    try {
        if (window.depositToggleLocked) {
            const depToggle = document.getElementById('depositToggle');
            if (depToggle) depToggle.checked = !!window.depositDisabled;
            return;
        }
        window.depositDisabled = !!isChecked;
        if (!isChecked && !window._customDepositManual) {
            const pctInp = document.getElementById('depositPercent');
            if (pctInp && (!pctInp.value || parseFloat(pctInp.value) === 0)) {
                pctInp.value = 40;
            }
        }
        updateSummary();
    } catch (e) {
        console.error('toggleDepositDisabled error', e);
    }
}
