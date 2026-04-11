/**
 * storage/storage.js
 * --------------------------------------------------
 * All localStorage read/write operations.
 * Khi chạy trên Vercel, mọi thay đổi cũng được đồng bộ lên
 * Neon PostgreSQL qua các API routes /api/quotes và /api/customers.
 *
 * Depends on: state.js  (savedQuotes, savedCustomers, constants)
 * --------------------------------------------------
 */

/* ── API sync helpers ──────────────────────────────────────────────── */

/** Kiểm tra xem có đang chạy trên Vercel (hoặc localhost với vercel dev) */
function _hasApiBackend() {
    return typeof window !== 'undefined' &&
        (window.location.hostname !== '' && window.location.hostname !== 'file');
}

/**
 * Đồng bộ 1 báo giá lên DB (fire & forget — không block UI).
 * Được gọi mỗi khi persistSavedQuotes() chạy.
 */
function _syncQuoteToAPI(quote) {
    if (!_hasApiBackend() || !quote || !quote.id) return;
    fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quote),
    }).then(function(r) {
        if (!r.ok) r.text().then(t => console.warn('[DB] syncQuote failed:', r.status, t));
    }).catch(function(e) { console.warn('[DB] syncQuote error:', e.message); });
}

/**
 * Xóa 1 báo giá khỏi DB.
 * Gọi khi quote bị xóa khỏi savedQuotes.
 */
function _deleteQuoteFromAPI(id) {
    if (!_hasApiBackend() || !id) return;
    fetch('/api/quotes/' + encodeURIComponent(id), {
        method: 'DELETE',
    }).catch(() => {/* silent */});
}

/**
 * Đồng bộ 1 khách hàng lên DB (fire & forget).
 */
function _syncCustomerToAPI(customer) {
    if (!_hasApiBackend() || !customer || !customer.code) return;
    fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customer),
    }).then(function(r) {
        if (!r.ok) r.text().then(t => console.warn('[DB] syncCustomer failed:', r.status, t));
    }).catch(function(e) { console.warn('[DB] syncCustomer error:', e.message); });
}

/**
 * Đồng bộ 1 sản phẩm lên DB (fire & forget).
 */
function _syncProductToAPI(product) {
    if (!_hasApiBackend() || !product || !product.name) return;
    fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product),
    }).then(function(r) {
        if (!r.ok) r.text().then(t => console.warn('[DB] syncProduct failed:', r.status, t));
    }).catch(function(e) { console.warn('[DB] syncProduct error:', e.message); });
}

/**
 * Xóa 1 sản phẩm khỏi DB.
 */
function _deleteProductFromAPI(name) {
    if (!_hasApiBackend() || !name) return;
    fetch('/api/products?name=' + encodeURIComponent(name), {
        method: 'DELETE',
    }).catch(() => {/* silent */});
}

// ---- Product Catalog ----------------------------------------

function loadSavedProducts() {
    try {
        const raw = localStorage.getItem(SAVED_PRODUCTS_KEY) || '[]';
        savedProducts = JSON.parse(raw) || [];
    } catch (e) {
        savedProducts = [];
    }
}

let _productSyncTimer = null;
function persistSavedProducts() {
    try { localStorage.setItem(SAVED_PRODUCTS_KEY, JSON.stringify(savedProducts || [])); } catch (e) { }
    // Debounced bulk-sync lên API (2 giây sau lần cuối)
    if (_hasApiBackend()) {
        clearTimeout(_productSyncTimer);
        _productSyncTimer = setTimeout(function () {
            fetch('/api/products?bulk=1', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(savedProducts || []),
            }).then(function(r) {
                if (!r.ok) r.text().then(t => console.warn('[DB] products bulkSync failed:', r.status, t));
            }).catch(function(e) { console.warn('[DB] products bulkSync error:', e.message); });
        }, 2000);
    }
}

/**
 * Create or update a product in the catalog.
 * Identified by name (trimmed, case-sensitive).
 * @param {string} name
 * @param {string} unit
 * @param {number} price
 */
function upsertProduct(name, unit, price) {
    try {
        const n = (name || '').trim();
        if (!n) return;
        loadSavedProducts();
        const idx = savedProducts.findIndex(p => p.name === n);
        const entry = {
            name: n,
            unit: (unit || '').trim(),
            price: parseFloat(price) || 0,
            updatedAt: new Date().toISOString(),
        };
        if (idx !== -1) {
            // Preserve createdAt; only update unit/price if provided
            entry.createdAt = savedProducts[idx].createdAt || entry.updatedAt;
            savedProducts[idx] = entry;
        } else {
            entry.createdAt = entry.updatedAt;
            savedProducts.push(entry);
        }
        savedProducts.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
        persistSavedProducts();
        // Sync ngay lập tức sản phẩm vừa thêm/cập nhật
        _syncProductToAPI(entry);
    } catch (e) {
        console.error('upsertProduct error', e);
    }
}

/**
 * Delete a product from the catalog by name.
 */
function deleteProduct(name) {
    try {
        const n = (name || '').trim();
        if (!n) return;
        loadSavedProducts();
        savedProducts = savedProducts.filter(p => p.name !== n);
        persistSavedProducts();
        _deleteProductFromAPI(n);
    } catch (e) {
        console.error('deleteProduct error', e);
    }
}

/**
 * Được gọi 1 lần khi app khởi động.
 * Tải dữ liệu từ API về rồi merge vào localStorage (API wins cho conflict).
 * Sau khi merge xong, refresh UI nếu có.
 */
function initApiSync() {
    if (!_hasApiBackend()) return;
    // Quotes
    fetch('/api/quotes')
        .then(r => r.ok ? r.json() : Promise.reject(r.status))
        .then(apiQuotes => {
            if (!Array.isArray(apiQuotes)) return;
            // --- Sync yearly quote sequence from API (so different machines share sequence)
            try {
                const now = new Date();
                const yearFull = now.getFullYear();
                const year2 = String(yearFull).slice(-2);
                let maxSeq = 0;
                apiQuotes.forEach(aq => {
                    try {
                        if (!aq || !aq.id) return;
                        const parts = String(aq.id).split('.');
                        if (parts.length === 2 && parts[0] === year2) {
                            const seq = parseInt(parts[1].replace(/^0+/, '') || '0', 10) || 0;
                            if (seq > maxSeq) maxSeq = seq;
                        }
                    } catch (e) { }
                });
                if (maxSeq > 0) {
                    try {
                        const QUOTE_SEQ_KEY = 'tp_quote_seq_v1';
                        let seqObj = null;
                        try { seqObj = JSON.parse(localStorage.getItem(QUOTE_SEQ_KEY) || 'null'); } catch (e) { }
                        if (!seqObj || seqObj.year !== yearFull || (parseInt(seqObj.seq, 10) || 0) < maxSeq) {
                            const newObj = { year: yearFull, seq: maxSeq };
                            try { localStorage.setItem(QUOTE_SEQ_KEY, JSON.stringify(newObj)); } catch (e) { }
                        }
                    } catch (e) { }
                }
            } catch (e) { }

            loadSavedQuotes();
            const localMap = Object.fromEntries(savedQuotes.map(q => [q.id, q]));
            let changed = false;
            apiQuotes.forEach(aq => {
                const lq = localMap[aq.id];
                // API wins nếu updatedAt API mới hơn hoặc local không có
                if (!lq || (aq.savedAt > (lq.savedAt || lq.createdAt || ''))) {
                    localMap[aq.id] = aq;
                    changed = true;
                }
            });
            if (changed) {
                savedQuotes = Object.values(localMap)
                    .sort((a, b) => (b.savedAt || b.createdAt || '') > (a.savedAt || a.createdAt || '') ? 1 : -1)
                    .slice(0, 200);
                persistSavedQuotesLocalOnly();
                if (typeof renderQuoteList     === 'function') renderQuoteList('');
                if (typeof renderDashboardStats === 'function') renderDashboardStats();
            }
        })
        .catch(function(e) { console.warn('[DB] load quotes error:', e); });
    // Customers
    fetch('/api/customers')
        .then(r => r.ok ? r.json() : Promise.reject(r.status))
        .then(apiCustomers => {
            if (!apiCustomers || typeof apiCustomers !== 'object') return;
            loadSavedCustomers();
            Object.entries(apiCustomers).forEach(([code, c]) => {
                if (!savedCustomers[code] ||
                    (c.updatedAt > (savedCustomers[code].updatedAt || ''))) {
                    savedCustomers[code] = c;
                }
            });
            persistSavedCustomersLocalOnly();
        })
        .catch(function(e) { console.warn('[DB] load customers error:', e); });

    // Products
    fetch('/api/products')
        .then(r => r.ok ? r.json() : Promise.reject(r.status))
        .then(apiProducts => {
            if (!Array.isArray(apiProducts)) return;
            loadSavedProducts();
            const localMap = Object.fromEntries(savedProducts.map(p => [p.name, p]));
            let changed = false;
            apiProducts.forEach(ap => {
                const lp = localMap[ap.name];
                if (!lp || (ap.updatedAt > (lp.updatedAt || lp.createdAt || ''))) {
                    localMap[ap.name] = ap;
                    changed = true;
                }
            });
            if (changed) {
                savedProducts = Object.values(localMap)
                    .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
                try { localStorage.setItem(SAVED_PRODUCTS_KEY, JSON.stringify(savedProducts)); } catch (e) { }
                // Cập nhật dropdown sản phẩm nếu đang mở
                if (typeof refreshProductDropdowns === 'function') refreshProductDropdowns();
            }
        })
        .catch(function(e) { console.warn('[DB] load products error:', e); });
}

// ---- Quotes ------------------------------------------------

function loadSavedQuotes() {
    try {
        const raw = localStorage.getItem(SAVED_QUOTES_KEY) || '[]';
        savedQuotes = JSON.parse(raw) || [];
        // ── Migration: fix totals that were accidentally stored as vi-VN parsed floats
        // e.g. parseFloat("561.000") = 561 instead of 561000.
        // Detect by comparing q.total against the sum of item lineTotals.
        let migrated = false;
        savedQuotes.forEach(q => {
            const itemSum = (q.items || []).reduce((s, it) => s + (Number(it.lineTotal) || 0), 0);
            if (itemSum > 0 && Number(q.total) > 0 && itemSum > Number(q.total) * 100) {
                // total is ~1000x too small – was stored in thousands
                q.total = Math.round(Number(q.total) * 1000);
                migrated = true;
            }
        });
        if (migrated) persistSavedQuotes();
    } catch (e) {
        savedQuotes = [];
    }
}

/** Chỉ lưu localStorage — không gọi API (dùng nội bộ để tránh vòng lặp) */
function persistSavedQuotesLocalOnly() {
    try { localStorage.setItem(SAVED_QUOTES_KEY, JSON.stringify(savedQuotes || [])); } catch (e) { }
}

let _quoteSyncTimer = null;
function persistSavedQuotes() {
    persistSavedQuotesLocalOnly();
    // Debounced full-sync lên API (1.5 giây sau lần cuối persist)
    if (_hasApiBackend()) {
        clearTimeout(_quoteSyncTimer);
        _quoteSyncTimer = setTimeout(function () {
            fetch('/api/quotes?fullSync=1', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(savedQuotes || []),
            }).then(function(r) {
                if (!r.ok) r.text().then(t => console.warn('[DB] fullSync failed:', r.status, t));
            }).catch(function(e) { console.warn('[DB] fullSync error:', e.message); });
        }, 1500);
    }
}

// ---- Customers ---------------------------------------------

function loadSavedCustomers() {
    try {
        const raw = localStorage.getItem(SAVED_CUSTOMERS_KEY) || '{}';
        savedCustomers = JSON.parse(raw) || {};
    } catch (e) {
        savedCustomers = {};
    }
}

/** Chỉ lưu localStorage */
function persistSavedCustomersLocalOnly() {
    try { localStorage.setItem(SAVED_CUSTOMERS_KEY, JSON.stringify(savedCustomers || {})); } catch (e) { }
}

function persistSavedCustomers() {
    persistSavedCustomersLocalOnly();
}

/**
 * Create or update a customer record in localStorage.
 * Also maintains a fast phone→info lookup map.
 */
function upsertCustomer(code, name, phone, address, createdAt) {
    try {
        if (!code) return;
        loadSavedCustomers();
        savedCustomers[code] = {
            code,
            name:      name    || '',
            phone:     phone   || '',
            address:   address || '',
            updatedAt: createdAt || new Date().toISOString(),
        };
        persistSavedCustomers();
        // Đồng bộ lên API
        _syncCustomerToAPI(savedCustomers[code]);

        // Also maintain a phone → info map for fast lookup
        if (phone && phone.trim() !== '') {
            const PHONE_MAP_KEY = 'tp_customer_phone_map_v1';
            let phoneMap = {};
            try { phoneMap = JSON.parse(localStorage.getItem(PHONE_MAP_KEY) || '{}') || {}; } catch (e) { }
            phoneMap[phone.trim()] = { name: name || '', phone: phone.trim(), address: address || '' };
            try { localStorage.setItem(PHONE_MAP_KEY, JSON.stringify(phoneMap)); } catch (e) { }
        }
    } catch (e) {
        console.error('upsertCustomer error', e);
    }
}
