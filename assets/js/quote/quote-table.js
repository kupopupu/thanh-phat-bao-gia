/**
 * quote/quote-table.js
 * --------------------------------------------------
 * All logic for the items table:
 *   Add / remove rows, renumber, attach price behaviour,
 *   listen for live calculation, reset/convert for quote type.
 *
 * Depends on:
 *   state.js       (rowCount, currentQuoteType, productList)
 *   utils/format.js (formatCurrency, formatVndShort)
 *   utils/dom.js    (getCellInputValue)
 *   product/product-select.js (buildProductSelect)
 *   quote/quote-summary.js    (updateSummary)  – loaded after this file
 * --------------------------------------------------
 */

// ---- Price Input Behaviour -------------------------------------------

/**
 * Attach rich price-input behaviour to an <input> element:
 * – Shows raw digits on focus, formats with separators while typing,
 *   finalises to "500.000đ" on blur / Enter.
 * – Stores the canonical numeric value as dataset.raw (full VND).
 * @param {HTMLInputElement} el
 */
function attachPriceBehavior(el) {
    if (!el) return;
    el.classList.add('price-input');
    if (!el.dataset) el.dataset = {};
    if (el.dataset.raw == null) {
        el.dataset.raw = String(String(el.value || '').replace(/[^0-9]/g, '') || '');
    }

    el.addEventListener('focus', function () {
        try {
            this.value = this.dataset && this.dataset.raw != null ? String(this.dataset.raw) : '';
            const len = this.value.length;
            if (this.setSelectionRange) this.setSelectionRange(len, len);
        } catch (e) { }
    });

    el.addEventListener('input', function () {
        try {
            const input       = this;
            const before      = input.value || '';
            const selStart    = input.selectionStart || before.length;
            const cleaned     = String(before).replace(/[^0-9]/g, '');
            input.dataset.raw = cleaned || '';

            const formatted = cleaned === '' ? '' : new Intl.NumberFormat('vi-VN').format(parseInt(cleaned, 10));
            input.value = formatted;

            // Restore caret to the approximately correct position
            const digitsBefore = (before.slice(0, selStart).match(/[0-9]/g) || []).length;
            if (formatted) {
                let pos = 0, digitsSeen = 0;
                for (let i = 0; i < formatted.length; i++) {
                    if (/[0-9]/.test(formatted[i])) digitsSeen++;
                    pos = i + 1;
                    if (digitsSeen >= digitsBefore) break;
                }
                try { input.setSelectionRange(pos, pos); } catch (e) { }
            } else {
                try { input.setSelectionRange(0, 0); } catch (e) { }
            }
        } catch (e) {
            this.dataset.raw = '';
        }
        updateRowTotal(this);
    });

    el.addEventListener('paste', function () {
        const self = this;
        setTimeout(() => {
            try {
                const cleaned = String(self.value || '').replace(/[^0-9]/g, '');
                self.dataset.raw = cleaned || '';
                self.value = cleaned === '' ? '' : new Intl.NumberFormat('vi-VN').format(parseInt(cleaned, 10));
            } catch (e) {
                self.dataset.raw = '';
            }
            updateRowTotal(self);
        }, 0);
    });

    const finalize = function () {
        try {
            const raw    = parseFloat(this.dataset.raw || '') || 0;
            const prefix = this.dataset.negativeDisplay ? '-' : '';
            this.value = (this.dataset.raw != null && String(this.dataset.raw).trim() !== '' && raw > 0)
                ? prefix + formatVndShort(raw)
                : '';
        } catch (e) { }
        updateRowTotal(this);
    };
    el.addEventListener('blur',    finalize);
    el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            finalize.call(this);
            try { this.blur(); } catch (er) { }
        }
    });

    // Set initial display
    try {
        const raw0 = parseFloat(el.dataset.raw || '0') || 0;
        el.value = raw0 > 0 ? formatVndShort(raw0) : '';
    } catch (e) { }
}

// ---- Row Total Calculation -------------------------------------------

/**
 * Recalculate a single row's "Thành tiền" cell and trigger updateSummary.
 * @param {HTMLElement} el – any input inside the row
 */
function updateRowTotal(el) {
    try {
        const row = el.closest('tr');
        if (!row) return;

        const qtyInput      = row.querySelector('input[type="number"]') || row.querySelectorAll('input[type="number"]')[0];
        const priceInput    = row.querySelector('.price-cell .price-input');
        const discountInput = row.querySelector('.discount-cell .discount-input');

        const qty  = parseFloat(qtyInput ? qtyInput.value : 0) || 0;
        let priceRaw = 0;
        if (priceInput) {
            priceRaw = parseFloat(
                priceInput.dataset && priceInput.dataset.raw
                    ? priceInput.dataset.raw
                    : String(priceInput.value || '').replace(/[^0-9]/g, '')
            ) || 0;
        } else {
            priceRaw = parseFloat(getCellInputValue(row, 4)) || 0;
        }

        let discountRaw = 0;
        if (discountInput) {
            discountRaw = parseFloat(
                discountInput.dataset && discountInput.dataset.raw
                    ? discountInput.dataset.raw
                    : String(discountInput.value || '').replace(/[^0-9]/g, '')
            ) || 0;
        }

        const lineTotal = Math.max(0, qty * (priceRaw - discountRaw));
        const totalCell = row.querySelector('.row-total');
        if (totalCell) {
            totalCell.textContent     = formatCurrency(lineTotal);
            totalCell.dataset.raw     = Math.round(lineTotal);
            // Store discount contribution so summary can sum them
            totalCell.dataset.discRow = Math.round(qty * discountRaw);
        }

        updateSummary();
    } catch (e) {
        console.error('updateRowTotal error', e);
    }
}

// ---- Row Listeners --------------------------------------------------

/**
 * Attach live-calculation listeners to quantity and price fields in a row,
 * and ensure any existing number-type price input is converted to a price-input.
 * @param {HTMLTableRowElement} row
 */
function attachRowListeners(row) {
    row.querySelectorAll('input[type="number"]').forEach(inp => {
        inp.addEventListener('input',  e => updateRowTotal(e.target));
        inp.addEventListener('change', e => updateRowTotal(e.target));
    });

    // Convert any un-styled price input in column 4
    try {
        const priceCell = row.cells[4];
        if (priceCell) {
            const existing = priceCell.querySelector('input');
            if (existing && !(existing.classList && existing.classList.contains('price-input'))) {
                const raw = String(existing.value || (existing.dataset && existing.dataset.raw) || '').replace(/[^0-9]/g, '') || '';
                try { existing.type = 'text'; } catch (e) { }
                existing.classList.add('price-input');
                if (!existing.dataset) existing.dataset = {};
                existing.dataset.raw = raw;
                try {
                    const num = parseFloat(raw) || 0;
                    existing.value = raw !== '' && num > 0 ? formatVndShort(num) : '';
                } catch (e) { }
                attachPriceBehavior(existing);
            }
        }
    } catch (e) { }

    // Convert any un-styled discount input in column 5
    try {
        const discCell = row.cells[5];
        if (discCell) {
            const existing = discCell.querySelector('input');
            if (existing && !(existing.classList && existing.classList.contains('discount-input'))) {
                const raw = String(existing.value || (existing.dataset && existing.dataset.raw) || '').replace(/[^0-9]/g, '') || '';
                try { existing.type = 'text'; } catch (e) { }
                existing.classList.add('discount-input');
                if (!existing.dataset) existing.dataset = {};
                existing.dataset.raw = raw;
                existing.dataset.negativeDisplay = '1';
                try {
                    const num = parseFloat(raw) || 0;
                    existing.value = raw !== '' && num > 0 ? '-' + formatVndShort(num) : '';
                } catch (e) { }
                attachPriceBehavior(existing);
            }
        }
    } catch (e) { }
}

// ---- Catalog Item Saving Behaviour -----------------------------------

/**
 * Kiểm tra xem một sản phẩm đã có trong danh mục (savedProducts hoặc productList) hay chưa.
 * @param {string} name
 * @returns {boolean}
 */
function isProductInCatalog(name) {
    if (!name) return false;
    const cleanName = String(name).trim().toLowerCase();
    if (!cleanName) return false;
    try {
        if (typeof loadSavedProducts === 'function') loadSavedProducts();
    } catch (e) { }
    const inSaved = Array.isArray(window.savedProducts) && window.savedProducts.some(p => (p.name || '').trim().toLowerCase() === cleanName);
    if (inSaved) return true;
    const inExcel = Array.isArray(window.productList) && window.productList.some(p => (p.name || '').trim().toLowerCase() === cleanName);
    return !!inExcel;
}
window.isProductInCatalog = isProductInCatalog;

/**
 * Cập nhật trạng thái hiển thị của button 'Lưu SP' trên dòng hàng hóa:
 * – Nếu tên trống: disabled, mờ (is-empty)
 * – Nếu sản phẩm ĐÃ CÓ trong danh mục: disabled, hiển thị icon check + 'Đã có' (is-saved)
 * – Nếu sản phẩm CHƯA CÓ trong danh mục: enabled, hiển thị icon + 'Lưu SP' (can-save)
 * @param {HTMLTableRowElement} row
 */
function updateRowSaveBtnStatus(row) {
    if (!row || row.getAttribute('data-points-row') === 'true') return;
    const btn = row.querySelector('.btn-save-item');
    if (!btn) return;

    const nameCell = row.querySelector('.product-name-cell');
    const nameInp = nameCell ? nameCell.querySelector('input, select') : null;
    const nameVal = nameInp ? (nameInp.value || '').trim() : '';

    if (!nameVal) {
        btn.disabled = true;
        btn.className = 'btn-save-item is-empty';
        btn.title = 'Nhập tên hàng hóa để lưu vào danh mục';
        btn.innerHTML = '<span>Lưu SP</span>';
        return;
    }

    if (isProductInCatalog(nameVal)) {
        btn.disabled = true;
        btn.className = 'btn-save-item is-saved';
        btn.title = 'Sản phẩm này đã có sẵn trong danh mục hàng hóa';
        btn.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg><span>Đã có</span>';
    } else {
        btn.disabled = false;
        btn.className = 'btn-save-item can-save';
        btn.title = 'Bấm để thêm sản phẩm mới này vào danh mục hàng hóa';
        btn.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg><span>Lưu SP</span>';
    }
}
window.updateRowSaveBtnStatus = updateRowSaveBtnStatus;

/**
 * Thao tác bấm nút Lưu SP trên dòng hàng hóa.
 * Lưu trực tiếp sản phẩm vào savedProducts, đồng bộ và đổi trạng thái nút sang disabled ('Đã có').
 * @param {HTMLElement} button
 */
function saveRowItemToCatalog(button) {
    try {
        const row = button.closest('tr');
        if (!row) return;

        const nameCell = row.querySelector('.product-name-cell');
        const nameInp = nameCell ? nameCell.querySelector('input, select') : null;
        const name = nameInp ? (nameInp.value || '').trim() : '';

        if (!name) {
            if (typeof showNotification === 'function') showNotification('Vui lòng nhập tên hàng hóa trước khi lưu!', 'warning');
            return;
        }

        const unitCell = row.querySelector('.unit-cell');
        const unitInp = unitCell ? unitCell.querySelector('input') : null;
        const unit = unitInp ? (unitInp.value || '').trim() : '';

        const priceInp = row.querySelector('.price-cell input');
        let price = 0;
        if (priceInp) {
            price = (priceInp.dataset && priceInp.dataset.raw != null)
                ? parseFloat(priceInp.dataset.raw) || 0
                : parseFloat(String(priceInp.value || '').replace(/[^0-9.-]/g, '')) || 0;
        }

        if (typeof upsertProduct === 'function') {
            upsertProduct(name, unit, price);
        }

        if (typeof showNotification === 'function') {
            showNotification('Đã thêm "' + name + '" vào danh mục hàng hóa!');
        }

        // Cập nhật trạng thái nút
        updateRowSaveBtnStatus(row);

        // Kích hoạt làm mới datalist ở các dòng khác để nhận diện sản phẩm mới
        document.querySelectorAll('.product-name-cell input[list]').forEach(inp => {
            try { inp.dispatchEvent(new Event('focus')); } catch (e) { }
        });
    } catch (err) {
        console.error('saveRowItemToCatalog error:', err);
    }
}
window.saveRowItemToCatalog = saveRowItemToCatalog;

// ---- Row Management --------------------------------------------------

/** Add a new data row to the items table. */
function addRow() {
    rowCount++;
    const tbody  = document.getElementById('itemsBody');
    const newRow = document.createElement('tr');

    const placeholder     = currentQuoteType === 'cup' ? 'Ly giấy 12oz, Ly nhựa PP 16oz...' : 'Banner, Poster, Sticker, Namecard...';
    const unitPlaceholder = currentQuoteType === 'cup' ? 'Thùng' : 'Cái';

    newRow.innerHTML = `
        <td style="text-align:center;color:var(--text-sub);">${rowCount}</td>
        <td class="product-name-cell"></td>
        <td class="unit-cell"></td>
        <td><input type="number" placeholder="1" min="0" step="0.01" onchange="updateRowTotal(this)"></td>
        <td class="price-cell"></td>
        <td class="discount-cell"></td>
        <td class="row-total">0đ</td>
        <td style="text-align:center;">
            <button type="button" class="btn-save-item is-empty" disabled onclick="saveRowItemToCatalog(this)" title="Nhập tên hàng hóa để lưu">
                <span>Lưu SP</span>
            </button>
        </td>
        <td style="text-align:center;"><button class="remove-btn" onclick="removeRow(this)" title="Xóa dòng">✕</button></td>
    `;
    tbody.appendChild(newRow);

    // Name cell: always use buildProductSelect (shows catalog + Excel suggestions)
    const nameCell = newRow.querySelector('.product-name-cell');
    nameCell.appendChild(buildProductSelect());

    // Unit cell
    const unitInp = document.createElement('input');
    unitInp.type = 'text';
    unitInp.placeholder = unitPlaceholder;
    unitInp.onchange = e => { updateRowTotal(e.target); handleUnitChange(unitInp); };
    newRow.querySelector('.unit-cell').appendChild(unitInp);

    // Price cell
    const priceInp = document.createElement('input');
    priceInp.type = 'text';
    priceInp.placeholder = '.000đ';
    priceInp.dataset.raw = '';
    newRow.querySelector('.price-cell').appendChild(priceInp);
    attachPriceBehavior(priceInp);

    // Discount cell
    const discInp = document.createElement('input');
    discInp.type = 'text';
    discInp.placeholder = '0đ';
    discInp.dataset.raw = '';
    discInp.dataset.negativeDisplay = '1';
    discInp.classList.add('discount-input');
    newRow.querySelector('.discount-cell').appendChild(discInp);
    attachPriceBehavior(discInp);

    attachRowListeners(newRow);
    updateRowSaveBtnStatus(newRow);
    updateRemoveButtons();
    // Auto-scroll newly added row into view when table grows beyond 4 rows
    try {
        if (rowCount >= 5) {
            // scroll the new row into the nearest scrollable container (modal body)
            newRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    } catch (e) { }
}

/** Remove a row (unless it is the only row). */
function removeRow(button) {
    const row = button.closest('tr');
    row.remove();
    updateRowNumbers();
    updateSummary();
    updateRemoveButtons();
}

/** Re-number all body rows sequentially after a removal. */
function updateRowNumbers() {
    const rows = document.querySelectorAll('#itemsBody tr');
    rows.forEach((row, index) => { row.cells[0].textContent = index + 1; });
    rowCount = rows.length;
}

/** Disable delete button when only one row remains. */
function updateRemoveButtons() {
    try {
        const rows = Array.from(document.querySelectorAll('#itemsBody tr'));
        rows.forEach(row => {
            const btn = row.querySelector('.remove-btn');
            if (!btn) return;
            btn.disabled = rows.length <= 1;
        });
    } catch (e) { }
}

// ---- Reset / Convert for Quote Type ---------------------------------

/**
 * Reset the items table to one empty row matching the current quote type.
 * Called when the quote type button is toggled.
 */
function resetFormForQuoteType() {
    const placeholder     = currentQuoteType === 'cup' ? 'Ly giấy 12oz, Ly nhựa PP 16oz...' : 'Banner, Poster, Sticker, Namecard...';
    const unitPlaceholder = currentQuoteType === 'cup' ? 'Thùng'  : 'Cái';

    const tbody = document.getElementById('itemsBody');
    tbody.innerHTML = '';
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td style="text-align:center;color:var(--text-sub);">1</td>
        <td class="product-name-cell"></td>
        <td class="unit-cell"></td>
        <td><input type="number" placeholder="1" min="0" step="0.01" onchange="updateRowTotal(this)"></td>
        <td class="price-cell"></td>
        <td class="discount-cell"></td>
        <td class="row-total">0đ</td>
        <td style="text-align:center;">
            <button type="button" class="btn-save-item is-empty" disabled onclick="saveRowItemToCatalog(this)" title="Nhập tên hàng hóa để lưu">
                <span>Lưu SP</span>
            </button>
        </td>
        <td style="text-align:center;"><button class="remove-btn" onclick="removeRow(this)" disabled title="Xóa dòng">✕</button></td>
    `;
    tbody.appendChild(tr);

    // Name cell: always use catalog dropdown
    const nameCell = tr.querySelector('.product-name-cell');
    nameCell.appendChild(buildProductSelect());

    // Unit cell
    const unitInp = document.createElement('input');
    unitInp.type = 'text';
    unitInp.placeholder = unitPlaceholder;
    unitInp.onchange = e => { updateRowTotal(e.target); handleUnitChange(unitInp); };
    tr.querySelector('.unit-cell').appendChild(unitInp);

    // Price cell
    const priceInp = document.createElement('input');
    priceInp.type = 'text';
    priceInp.placeholder = '.000đ';
    priceInp.dataset.raw = '';
    tr.querySelector('.price-cell').appendChild(priceInp);
    attachPriceBehavior(priceInp);

    // Discount cell
    const discInp = document.createElement('input');
    discInp.type = 'text';
    discInp.placeholder = '0đ';
    discInp.dataset.raw = '';
    discInp.dataset.negativeDisplay = '1';
    discInp.classList.add('discount-input');
    tr.querySelector('.discount-cell').appendChild(discInp);
    attachPriceBehavior(discInp);

    attachRowListeners(tr);
    updateRowSaveBtnStatus(tr);
    rowCount = 1;
    updateSummary();
}

/**
 * Convert existing row name cells when quote type changes.
 * Always keeps a catalog-aware datalist input.
 */
function convertRowsForQuoteType() {
    document.querySelectorAll('#itemsBody tr').forEach(row => {
        const nameCell = row.querySelector('.product-name-cell');
        if (!nameCell) return;
        const existingInput = nameCell.querySelector('input[list]');
        // Already has a datalist-linked input, just refresh datalist options
        if (existingInput) {
            existingInput.dispatchEvent(new Event('focus'));
            return;
        }
        // Replace plain input with catalog dropdown
        const existingPlain = nameCell.querySelector('input');
        const currentValue  = existingPlain ? existingPlain.value : '';
        nameCell.innerHTML  = '';
        const sel = buildProductSelect(currentValue);
        nameCell.appendChild(sel);
    });
}

/**
 * Insert (or replace) a special "Điểm đã tích" discount row in the items table.
 * The row carries a negative total equal to pts × 1,000đ.
 * @param {number} pts  Number of points to redeem (each = 1,000đ)
 */
function applyPointsRow(pts) {
    // Remove any previous points row
    const prev = document.querySelector('#itemsBody tr[data-points-row]');
    if (prev) prev.remove();

    const body = document.getElementById('itemsBody');
    if (!body) return;

    const rowNum   = body.querySelectorAll('tr').length + 1;
    const unitPrice = 1000;   // 1 điểm = 1,000đ
    const lineTotal = -(pts * unitPrice);   // negative
    const fmt       = v => new Intl.NumberFormat('vi-VN').format(Math.abs(v));

    const tr = document.createElement('tr');
    tr.setAttribute('data-points-row', 'true');
    tr.style.background = 'var(--pastel-50)';
    tr.innerHTML = `
        <td style="text-align:center;color:var(--text-sub);">${rowNum}</td>
        <td class="product-name-cell" style="font-style:italic;color:var(--navy-900);font-weight:600;">Khấu trừ điểm thưởng tích lũy</td>
        <td class="unit-cell" style="text-align:center;color:var(--text-muted);">Điểm</td>
        <td style="text-align:center;font-weight:700;color:var(--navy-900);">${pts}</td>
        <td class="price-cell" style="text-align:right;color:var(--text-muted);">1.000đ</td>
        <td class="discount-cell" style="text-align:right;color:var(--text-sub);">—</td>
        <td class="row-total" data-raw="${lineTotal}" data-disc-row="0"
            style="text-align:right;color:var(--accent);font-weight:700;">-${fmt(lineTotal)}đ</td>
        <td style="text-align:center;color:var(--text-sub);">—</td>
        <td style="text-align:center;">
            <button class="remove-btn" onclick="_removePointsRow();" title="Hủy dùng điểm">✕</button>
        </td>`;

    body.appendChild(tr);
    updateSummary();
}

/** Giữ lại để tương thích ngược nếu có hàm gọi */
function toggleAllRowSaveCheck(checked) {}
window.toggleAllRowSaveCheck = toggleAllRowSaveCheck;
