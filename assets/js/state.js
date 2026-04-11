/**
 * state.js
 * --------------------------------------------------
 * Single source of truth for all runtime app state.
 * Variables declared here are intentionally global so
 * every module can read / mutate them directly.
 * --------------------------------------------------
 */

// ---- Quote form state ----
let rowCount        = 1;
let quoteNumber     = generateQuoteNumber();   // preview candidate (not yet committed)
let currentQuoteType = 'cup';                  // 'cup' | 'other'

// ---- Editing state (when loading a saved quote back into the form) ----
window.editingQuoteId      = null;   // id of the quote being edited; null = new quote
window.editingLockedDeposit = false; // keep saved deposit amount while editing
window.editingDepositAmount = 0;     // the locked deposit value (VND)
window.depositDisabled      = false; // true = "Không cọc" toggle is on
window.depositToggleLocked  = false; // true = khóa toggle cọc/không cọc khi đơn đã xác nhận cọc

// ---- Image upload state ----
let uploadedImages = { design: null, mockup: null };

// ---- Product list (imported from Excel, used for 'cup' quote type) ----
let productList = [];  // [{ name, unit, price }]

// ---- Persistence keys (shared with storage.js) ----
const SAVED_QUOTES_KEY    = 'tp_saved_quotes_v1';
const SAVED_CUSTOMERS_KEY = 'tp_customers_v1';
const SAVED_PRODUCTS_KEY  = 'tp_product_catalog_v1';

// ---- In-memory stores (loaded from localStorage on demand) ----
let savedQuotes    = [];
let savedCustomers = {};
let savedProducts  = [];  // [{ name, unit, price, updatedAt }]
