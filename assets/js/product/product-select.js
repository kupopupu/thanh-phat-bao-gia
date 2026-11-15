/**
 * product/product-select.js
 * --------------------------------------------------
 * Builds custom product autocomplete dropdown with modern rounded UI (border-radius: 0 0 12px 12px).
 * Replaces native browser datalist for consistent cross-device UI on mobile and desktop.
 * Source priority:  savedProducts (catalog) > productList (Excel import).
 * Auto-fills unit & price when a product is selected.
 * --------------------------------------------------
 */

let _prodDropHideTimer = null;
let _activeProdInput = null;

/**
 * Returns a merged product lookup (catalog wins over Excel import).
 * @returns {Array<{name:string, unit:string, price:number}>}
 */
function _getMergedProductList() {
    try { loadSavedProducts(); } catch (e) { }
    const catalogMap = {};
    (savedProducts || []).forEach(p => { catalogMap[p.name] = p; });
    const merged = {};
    (productList || []).forEach(p => { merged[p.name] = { name: p.name, unit: p.unit, price: p.price }; });
    (savedProducts || []).forEach(p => { merged[p.name] = { name: p.name, unit: p.unit, price: p.price }; });
    return Object.values(merged).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi'));
}

/**
 * Auto-fill unit & price to row when product is picked
 */
function _fillProductDataToRow(tr, p) {
    if (!tr || !p) return;

    // Fill unit
    const unitCell = tr.querySelector('.unit-cell') || tr.cells[2];
    if (unitCell) {
        let inp = unitCell.querySelector('input');
        if (!inp) {
            unitCell.innerHTML = '';
            inp = document.createElement('input');
            inp.type = 'text';
            inp.addEventListener('change', e => { if (typeof updateRowTotal === 'function') updateRowTotal(e.target); });
            unitCell.appendChild(inp);
        }
        inp.value = p.unit || '';
        if (typeof handleUnitChange === 'function') handleUnitChange(inp);
    }

    // Fill price
    const priceCell = tr.querySelector('.price-cell') || tr.cells[4];
    if (priceCell && p.price > 0) {
        let inp = priceCell.querySelector('input');
        if (!inp) {
            inp = document.createElement('input');
            inp.type = 'text';
            inp.dataset.raw = '';
            priceCell.appendChild(inp);
            if (typeof attachPriceBehavior === 'function') attachPriceBehavior(inp);
        }
        inp.dataset.raw = String(p.price);
        inp.value = typeof formatVndShort === 'function' ? formatVndShort(p.price) : p.price + 'đ';
        if (typeof updateRowTotal === 'function') updateRowTotal(inp);
    }

    if (typeof updateRowSaveBtnStatus === 'function') {
        updateRowSaveBtnStatus(tr);
    }
}

/**
 * Show custom product dropdown
 */
function showProdDropdown(input) {
    clearTimeout(_prodDropHideTimer);
    _activeProdInput = input;

    let dd = document.getElementById('prodDropdown');
    if (!dd) {
        dd = document.createElement('div');
        dd.id = 'prodDropdown';
        dd.className = 'prod-dropdown';
        document.body.appendChild(dd);
    }

    const term = (input.value || '').trim().toLowerCase();
    const all = _getMergedProductList();
    const matches = term
        ? all.filter(p => (p.name || '').toLowerCase().includes(term)).slice(0, 30)
        : all.slice(0, 30);

    if (!matches.length) {
        dd.style.display = 'none';
        return;
    }

    dd.innerHTML = matches.map((p, idx) => `
        <div class="prod-drop-item" data-idx="${idx}">
            <div class="prod-drop-main">
                <span class="prod-drop-name">${escapeHtml(p.name)}</span>
                ${p.price > 0 ? `<span class="prod-drop-price">${typeof formatVndShort === 'function' ? formatVndShort(p.price) : p.price + 'đ'}</span>` : ''}
            </div>
            ${p.unit ? `<div class="prod-drop-unit">ĐVT: ${escapeHtml(p.unit)}</div>` : ''}
        </div>
    `).join('');

    dd.querySelectorAll('.prod-drop-item').forEach((item, idx) => {
        item.onmousedown = function (e) {
            e.preventDefault();
            const chosen = matches[idx];
            if (chosen && _activeProdInput) {
                _activeProdInput.value = chosen.name;
                const tr = _activeProdInput.closest('tr');
                _fillProductDataToRow(tr, chosen);
            }
            dd.style.display = 'none';
        };
    });

    // Positioning
    const rect = input.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let width = Math.max(rect.width, 270);
    if (width > viewportWidth - 20) width = viewportWidth - 20;

    let left = rect.left;
    if (left + width > viewportWidth - 10) {
        left = viewportWidth - width - 10;
    }
    if (left < 10) left = 10;

    dd.style.left = left + 'px';
    dd.style.width = width + 'px';

    const spaceBelow = viewportHeight - rect.bottom;
    if (spaceBelow < 200 && rect.top > spaceBelow) {
        // Open upwards (bo tròn 2 góc trên)
        dd.style.bottom = (viewportHeight - rect.top + 2) + 'px';
        dd.style.top = 'auto';
        dd.classList.add('open-up');
        dd.classList.remove('open-down');
    } else {
        // Open downwards (bo tròn 2 góc dưới đúng yêu cầu)
        dd.style.top = (rect.bottom + 2) + 'px';
        dd.style.bottom = 'auto';
        dd.classList.add('open-down');
        dd.classList.remove('open-up');
    }

    dd.style.display = 'block';
}

/**
 * Hide custom product dropdown with slight delay for click registration
 */
function hideProdDropdownDelayed() {
    _prodDropHideTimer = setTimeout(() => {
        const dd = document.getElementById('prodDropdown');
        if (dd) dd.style.display = 'none';
    }, 200);
}

// Auto-close dropdown when scrolling inside modal
window.addEventListener('scroll', function (e) {
    if (e.target && e.target.classList && e.target.classList.contains('qfm-body')) {
        const dd = document.getElementById('prodDropdown');
        if (dd && dd.style.display !== 'none') {
            dd.style.display = 'none';
        }
    }
}, true);

/**
 * Build a <div> wrapping an <input> for product name with custom autocomplete dropdown.
 * @param {string} [selectedName] – pre-selected value
 * @returns {HTMLDivElement}
 */
function buildProductSelect(selectedName) {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'width:100%; display:block; position:relative;';

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = '-- Chọn hàng hóa hoặc gõ mới --';
    input.autocomplete = 'off';
    if (selectedName) input.value = selectedName;
    input.style.width = '100%';

    input.addEventListener('focus', function () { showProdDropdown(this); });
    input.addEventListener('click', function () { showProdDropdown(this); });
    input.addEventListener('input', function () {
        showProdDropdown(this);
        const tr = this.closest('tr');
        if (tr && typeof updateRowSaveBtnStatus === 'function') {
            updateRowSaveBtnStatus(tr);
        }
    });
    input.addEventListener('blur', function () { hideProdDropdownDelayed(); });

    input.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            const dd = document.getElementById('prodDropdown');
            if (dd) dd.style.display = 'none';
        }
    });

    input.addEventListener('change', function () {
        const tr = this.closest('tr');
        const val = (this.value || '').trim();
        if (tr && typeof updateRowSaveBtnStatus === 'function') {
            updateRowSaveBtnStatus(tr);
        }
        if (!tr || !val) return;
        const allProducts = _getMergedProductList();
        const found = allProducts.find(x => x.name.toLowerCase() === val.toLowerCase());
        if (found) {
            _fillProductDataToRow(tr, found);
        }
    });

    wrapper.appendChild(input);
    return wrapper;
}
