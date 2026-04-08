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

// ---- Row Management --------------------------------------------------

/** Add a new data row to the items table. */
function addRow() {
    rowCount++;
    const tbody  = document.getElementById('itemsBody');
    const newRow = document.createElement('tr');

    const placeholder     = currentQuoteType === 'cup' ? 'Ly giấy 12oz, Ly nhựa PP 16oz...' : 'Banner, Poster, Sticker, Namecard...';
    const unitPlaceholder = currentQuoteType === 'cup' ? 'Thùng' : 'Cái';

    newRow.innerHTML = `
        <td>${rowCount}</td>
        <td class="product-name-cell"></td>
        <td class="unit-cell"></td>
        <td><input type="number" placeholder="1" min="0" step="0.01" onchange="updateRowTotal(this)"></td>
        <td class="price-cell"></td>
        <td class="discount-cell"></td>
        <td class="row-total">0</td>
        <td><button class="remove-btn" onclick="removeRow(this)">Xóa</button></td>
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
        <td>1</td>
        <td class="product-name-cell"></td>
        <td class="unit-cell"></td>
        <td><input type="number" placeholder="1" min="0" step="0.01" onchange="updateRowTotal(this)"></td>
        <td class="price-cell"></td>
        <td class="discount-cell"></td>
        <td class="row-total">0</td>
        <td><button class="remove-btn" onclick="removeRow(this)" disabled>Xóa</button></td>
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
    tr.style.background = '#fff8e1';
    tr.innerHTML = `
        <td style="text-align:center;color:#888;">${rowNum}</td>
        <td class="product-name-cell" style="font-style:italic;color:#7b5800;font-weight:600;">Điểm đã tích</td>
        <td class="unit-cell" style="text-align:center;color:#555;">Điểm</td>
        <td style="text-align:center;font-weight:600;">${pts}</td>
        <td class="price-cell" style="text-align:right;color:#555;">1.000đ</td>
        <td class="discount-cell" style="text-align:right;color:#aaa;">—</td>
        <td class="row-total" data-raw="${lineTotal}" data-disc-row="0"
            style="text-align:right;color:#c0392b;font-weight:700;">-${fmt(lineTotal)}đ</td>
        <td style="text-align:center;">
            <button class="remove-btn" onclick="_removePointsRow();">Xóa</button>
        </td>`;

    body.appendChild(tr);
    updateSummary();
}
