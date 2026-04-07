/**
 * utils/dom.js
 * DOM helper utilities used across multiple modules.
 */

/**
 * Safely read the value of an input/select inside a table cell.
 * For price-input cells, returns the raw numeric string from dataset.raw.
 * @param {HTMLTableRowElement} row
 * @param {number} cellIndex  – 0-based column index
 * @returns {string}
 */
function getCellInputValue(row, cellIndex) {
    try {
        const cell = row.cells[cellIndex];
        if (!cell) return '';
        const inp = cell.querySelector('input');
        if (inp) {
            if (inp.classList && inp.classList.contains('price-input')) {
                return inp.dataset && inp.dataset.raw != null
                    ? inp.dataset.raw
                    : (inp.value || '').replace(/[^0-9]/g, '');
            }
            return inp.value;
        }
        const sel = cell.querySelector('select');
        if (sel) return sel.value;
        return cell.textContent.trim();
    } catch (e) {
        return '';
    }
}

/**
 * Read the full VND price (as number) from the price-input in a row.
 * dataset.raw stores full VND digits; falls back to stripping the displayed value.
 * @param {HTMLTableRowElement} row
 * @returns {number}
 */
function getPriceThousandsFromRow(row) {
    try {
        if (!row) return 0;
        const cell = row.cells[4];
        if (!cell) return 0;
        const inp = cell.querySelector('input');
        if (!inp) return 0;
        if (inp.dataset && inp.dataset.raw != null) return parseFloat(inp.dataset.raw) || 0;
        const v = String(inp.value || '').replace(/[^0-9]/g, '');
        return parseFloat(v) || 0;
    } catch (e) {
        return 0;
    }
}
