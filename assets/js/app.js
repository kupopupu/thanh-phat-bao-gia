/**
 * app.js
 * --------------------------------------------------
 * Application bootstrap – runs after all modules are loaded.
 * Sets up initial state, attaches global event listeners,
 * and wires DOM elements to functions defined in other modules.
 * --------------------------------------------------
 */

/* ------------------------------------------------------------------ */
/*  Quote number display                                               */
/* ------------------------------------------------------------------ */

function updateQuoteDisplay() {
    const el = document.getElementById('currentQuoteDisplay');
    if (!el) return;
    el.textContent = quoteNumber
        ? `Số BG: ${quoteNumber}`
        : 'Chưa có số BG';
}

/* ------------------------------------------------------------------ */
/*  Quote form modal (full-screen)                                     */
/* ------------------------------------------------------------------ */

/** Open the full-screen quote form modal (for an existing quote). */
function openQuoteFormModal() {
    const modal = document.getElementById('quoteFormModal');
    if (!modal) return;
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    // scroll form to top
    modal.scrollTop = 0;
}

/**
 * Reset the form to a blank state and open the modal as a new quote.
 */
function openNewQuoteModal() {
    // Clear customer fields
    ['customerName', 'customerPhone', 'customerAddress'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const codeEl = document.getElementById('customerCode');
    if (codeEl) codeEl.value = '';

    // Reset items table to one blank row
    const tbody = document.getElementById('itemsBody');
    if (tbody) {
        tbody.innerHTML = `<tr>
            <td>1</td>
            <td class="product-name-cell"><input type="text" placeholder="-- Chọn hoặc nhập tên hàng hóa --" onchange="updateRowTotal(this)"></td>
            <td class="unit-cell"><input type="text" placeholder="Cái" onchange="updateRowTotal(this); handleUnitChange(this)"></td>
            <td><input type="number" placeholder="1" min="0" step="1" onchange="updateRowTotal(this)"></td>
            <td class="price-cell"></td>
            <td class="discount-cell"></td>
            <td class="row-total">0đ</td>
            <td style="text-align:center;"><button class="remove-btn" onclick="removeRow(this)" disabled>Xóa</button></td>
        </tr>`;
        const row = tbody.querySelector('tr');
        if (row) {
            // Setup price cell
            const priceInp = document.createElement('input');
            priceInp.type = 'text'; priceInp.placeholder = '.000đ'; priceInp.dataset.raw = '';
            row.querySelector('.price-cell').appendChild(priceInp);
            attachPriceBehavior(priceInp);
            // Setup discount cell with negative display
            const discInp = document.createElement('input');
            discInp.type = 'text'; discInp.placeholder = '0đ'; discInp.dataset.raw = '';
            discInp.dataset.negativeDisplay = '1';
            discInp.classList.add('discount-input');
            row.querySelector('.discount-cell').appendChild(discInp);
            attachPriceBehavior(discInp);
            attachRowListeners(row);
        }
    }

    // Reset summary fields
    ['discount', 'vat'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = id === 'vat' ? '0' : '';
    });
    const depToggle = document.getElementById('depositToggle');
    if (depToggle) {
        depToggle.disabled = false;
        depToggle.checked = false;
    }
    window.depositToggleLocked = false;
    window.editingLockedDeposit = false;
    window.editingDepositAmount = 0;
    toggleDepositDisabled(false);

    // Reset quote type to cup
    if (typeof selectQuoteType === 'function') selectQuoteType('cup');

    // New quote number
    window.editingQuoteId = null;
    quoteNumber = generateQuoteNumber();
    updateQuoteDisplay();
    updateSummary();

    // Update modal title
    const title = document.getElementById('quoteFormModalTitle');
    if (title) title.textContent = '📝 Báo giá mới';
    const finalizeBtn = document.getElementById('finalizeQuoteBtn');
    if (finalizeBtn) finalizeBtn.textContent = '✅ Xác nhận đã xong BG';

    openQuoteFormModal();
}

/**
 * Close the quote form modal and refresh the dashboard.
 */
function closeQuoteFormModal() {
    const modal = document.getElementById('quoteFormModal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
    renderQuoteList(document.getElementById('mainQuoteSearch')?.value || '');
    renderDashboardStats();
}

/* ------------------------------------------------------------------ */
/*  Customer code field interactions                                   */
/* ------------------------------------------------------------------ */

function _setupCustomerCodeField() {
    const codeEl = document.getElementById('customerCode');
    if (!codeEl) return;

    // Click-to-generate new code
    codeEl.addEventListener('click', () => {
        if (!codeEl.value) {
            codeEl.value = generateNewCustomerCode();
        }
    });

    // Blur – if field left empty, generate a code
    codeEl.addEventListener('blur', () => {
        if (!codeEl.value.trim()) {
            codeEl.value = generateNewCustomerCode();
        }
    });

    // Enter key → search phone
    codeEl.addEventListener('keydown', e => {
        if (e.key === 'Enter') searchCustomerByPhone();
    });
}

/* ------------------------------------------------------------------ */
/*  Close modals on backdrop click                                     */
/* ------------------------------------------------------------------ */

function _setupModalBackdropClose() {
    const modals = [
        { id: 'previewModal',          closeFn: closePreview          },
        { id: 'deliveryPreviewModal',  closeFn: closeDeliveryPreview   },
        { id: 'finalizePreviewModal',  closeFn: closeFinalizePreview   },
        { id: 'printInfoModal',        closeFn: closePrintInfoModal    },
        // quoteFormModal is full-screen content; no backdrop close
    ];
    modals.forEach(({ id, closeFn }) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('click', e => {
            if (e.target === el) closeFn();
        });
    });
}

/* ------------------------------------------------------------------ */
/*  Quote search filter in the list modal                              */
/* ------------------------------------------------------------------ */

function _setupQuoteListSearch() {
    // The main search input on the dashboard (inline oninput already wired in HTML).
    // This is a no-op kept for compatibility.
}

/* ------------------------------------------------------------------ */
/*  Initialize first row listeners                                     */
/* ------------------------------------------------------------------ */

function _initFirstRow() {
    // Rebuild the first row with proper inputs (price-cell + discount-cell)
    resetFormForQuoteType();
}

/* ------------------------------------------------------------------ */
/*  DOMContentLoaded                                                   */
/* ------------------------------------------------------------------ */

document.addEventListener('DOMContentLoaded', () => {
    // Load persisted data
    loadSavedQuotes();
    loadSavedCustomers();

    // Default VAT = 0%
    const vatEl = document.getElementById('vat');
    if (vatEl && !vatEl.value) vatEl.value = '0';

    // Initial row
    _initFirstRow();

    // Summary
    updateSummary();

    // Quote number
    quoteNumber = generateQuoteNumber();
    updateQuoteDisplay();

    // Image buttons
    updateImageUploadButtons();

    // Cup rows in print-info modal
    const cupContainer = document.getElementById('cupRowsContainer');
    if (cupContainer && !cupContainer.children.length) addCupRow();

    // Customer code
    _setupCustomerCodeField();

    // Modal backdrops
    _setupModalBackdropClose();

    // Quote list search
    _setupQuoteListSearch();

    // Render inline dashboard
    renderQuoteList('');
    renderDashboardStats();

    // Đồng bộ dữ liệu từ Neon (chỉ hoạt động khi chạy trên Vercel/server, silent khi offline)
    if (typeof initApiSync === 'function') initApiSync();

    // Dropdown close on Escape is handled by dropdown.js

    // Window resize → rescale open modals is handled by preview.js
});
