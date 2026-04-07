/**
 * quote/quote-summary.js
 * --------------------------------------------------
 * Computes and displays the quote summary totals
 * (subtotal, discount, VAT, total, deposit, remaining).
 *
 * Depends on:
 *   state.js       (window.depositDisabled, editingLockedDeposit, editingDepositAmount)
 *   utils/format.js (formatCurrency)
 *   utils/dom.js    (getCellInputValue)
 * --------------------------------------------------
 */

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
        return Math.round((Number(total) || 0) * 0.4);
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

        const vat       = parseFloat(document.getElementById('vat').value) || 0;
        const vatAmount = subtotal * (vat / 100);
        const total     = subtotal + vatAmount;
        const totalVal      = Number(total) || 0;
        const deposit       = computeDepositFromTotal(totalVal);
        const remaining     = Math.max(0, Math.round(totalVal - deposit));

        document.getElementById('subtotal').textContent  = formatCurrency(subtotal);

        // Show total row-level discount
        const discDispEl = document.getElementById('discountDisplay');
        if (discDispEl) {
            discDispEl.textContent = formatCurrency(totalDiscount);
            discDispEl.dataset.raw = totalDiscount;
        }

        const totalEl = document.getElementById('total');
        if (totalEl) {
            totalEl.textContent      = formatCurrency(Math.round(total));
            totalEl.dataset.raw      = Math.round(total);
        }
        document.getElementById('deposit').textContent   = formatCurrency(deposit);
        document.getElementById('remaining').textContent = formatCurrency(remaining);

        // Store raw integers so save functions never need to parse formatted text
        const depEl = document.getElementById('deposit');
        if (depEl) depEl.dataset.raw = deposit;
        const remEl = document.getElementById('remaining');
        if (remEl) remEl.dataset.raw = remaining;
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
        updateSummary();
    } catch (e) {
        console.error('toggleDepositDisabled error', e);
    }
}
