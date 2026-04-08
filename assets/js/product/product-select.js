/**
 * product/product-select.js
 * --------------------------------------------------
 * Builds the product name input with datalist suggestion.
 * Source priority:  savedProducts (catalog) > productList (Excel import).
 * Auto-fills unit & price when an exact match is selected.
 * When the catalog is updated (price/unit edited), the new values are
 * used the next time the product is selected.
 *
 * Depends on: state.js (savedProducts, productList),
 *             storage/storage.js (loadSavedProducts),
 *             utils/format.js (formatVndShort),
 *             quote/quote-table.js (updateRowTotal, attachPriceBehavior)
 * --------------------------------------------------
 */

/**
 * Returns a merged product lookup (catalog wins over Excel import).
 * @returns {Array<{name:string, unit:string, price:number}>}
 */
function _getMergedProductList() {
    try { loadSavedProducts(); } catch (e) { }
    const catalogMap = {};
    (savedProducts || []).forEach(p => { catalogMap[p.name] = p; });
    // Start with Excel-imported products (lower priority)
    const merged = {};
    (productList || []).forEach(p => { merged[p.name] = { name: p.name, unit: p.unit, price: p.price }; });
    // Catalog overrides / supplements
    (savedProducts || []).forEach(p => { merged[p.name] = { name: p.name, unit: p.unit, price: p.price }; });
    return Object.values(merged).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi'));
}

/**
 * Build a <div> wrapping an <input> + <datalist> for the product name cell.
 * When user selects an existing product by exact name, unit & price are auto-filled
 * from the catalog (so catalog edits take effect immediately on next selection).
 * @param {string} [selectedName]  – pre-selected value
 * @returns {HTMLDivElement}
 */
function buildProductSelect(selectedName) {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'width:100%; display:block;';

    const dlId  = 'product-datalist-' + Math.random().toString(36).slice(2, 8);
    const input = document.createElement('input');
    input.type        = 'text';
    input.placeholder = '-- Chọn hàng hóa hoặc gõ mới --';
    if (selectedName) input.value = selectedName;
    input.style.width = '100%';
    input.setAttribute('list', dlId);

    const datalist = document.createElement('datalist');
    datalist.id = dlId;

    // Populate datalist from merged catalog + Excel
    function refreshDatalist() {
        datalist.innerHTML = '';
        _getMergedProductList().forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.name;
            datalist.appendChild(opt);
        });
    }
    refreshDatalist();

    // Auto-fill unit & price when an exact product match is selected
    input.addEventListener('change', function () {
        const tr  = this.closest('tr');
        const val = (this.value || '').trim();
        if (!tr || !val) return;

        // Re-fetch fresh data so catalog edits are reflected immediately
        const allProducts = _getMergedProductList();
        const found = allProducts.find(x => x.name === val);
        if (!found) return;

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
        if (priceCell && found.price > 0) {
            let inp = priceCell.querySelector('input');
            if (!inp) {
                inp = document.createElement('input');
                inp.type = 'text';
                inp.dataset.raw = '';
                priceCell.appendChild(inp);
                attachPriceBehavior(inp);
            }
            inp.dataset.raw = String(found.price);
            inp.value       = formatVndShort(found.price);
            updateRowTotal(inp);
        }
    });

    // Refresh options on focus (in case catalog changed since last open)
    input.addEventListener('focus', refreshDatalist);

    wrapper.appendChild(input);
    wrapper.appendChild(datalist);
    return wrapper;
}
