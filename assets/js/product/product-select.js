/**
 * product/product-select.js
 * --------------------------------------------------
 * Builds the product name input with datalist suggestion
 * when a product list has been imported.
 * Auto-fills unit and price when an exact match is selected.
 *
 * Depends on: state.js (productList),
 *             utils/format.js (formatVndShort),
 *             quote/quote-table.js (updateRowTotal, attachPriceBehavior)
 * --------------------------------------------------
 */

/**
 * Build a <div> wrapping an <input> + <datalist> for the product name cell.
 * When user selects an existing product by exact name, unit & price are auto-filled.
 * @param {string} [selectedName]  – pre-selected value
 * @returns {HTMLDivElement}
 */
function buildProductSelect(selectedName) {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'width:100%; display:block;';

    const dlId   = 'product-datalist-' + Math.random().toString(36).slice(2, 8);
    const input  = document.createElement('input');
    input.type        = 'text';
    input.placeholder = selectedName || '-- Chọn hàng hóa hoặc gõ mới --';
    input.style.width = '100%';
    input.setAttribute('list', dlId);

    const datalist = document.createElement('datalist');
    datalist.id = dlId;
    productList.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.name;
        datalist.appendChild(opt);
    });

    // Auto-fill unit & price when an exact product match is selected
    input.addEventListener('change', function () {
        const tr    = this.closest('tr');
        const val   = (this.value || '').trim();
        const found = productList.find(x => x.name === val);
        if (!tr || !found) return;

        // Fill unit
        const unitCell = tr.cells[2];
        if (unitCell) {
            let inp = unitCell.querySelector('input');
            if (!inp) {
                unitCell.innerHTML = '';
                inp = document.createElement('input');
                inp.type = 'text';
                inp.addEventListener('change', e => updateRowTotal(e.target));
                unitCell.appendChild(inp);
            }
            inp.value = found.unit || '';
        }

        // Fill price
        const priceCell = tr.cells[4];
        if (priceCell) {
            let inp = priceCell.querySelector('input');
            if (!inp) {
                unitCell.innerHTML = '';
                inp = document.createElement('input');
                inp.type = 'text';
                inp.dataset.raw = '';
                priceCell.appendChild(inp);
                attachPriceBehavior(inp);
            }
            inp.dataset.raw = String(found.price || 0);
            inp.value       = formatVndShort(parseFloat(inp.dataset.raw) || 0);
            updateRowTotal(inp);
        }
    });

    wrapper.appendChild(input);
    wrapper.appendChild(datalist);
    return wrapper;
}
