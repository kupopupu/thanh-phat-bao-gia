/**
 * ui/customer.js
 * --------------------------------------------------
 * Customer-related UI helpers.
 *
 * Depends on:
 *   state.js           (savedQuotes, savedCustomers)
 *   storage/storage.js (upsertCustomer)
 * --------------------------------------------------
 */

const CUSTOMER_PHONE_MAP_KEY = 'tp_customer_phone_map_v1';

// ── Autocomplete ────────────────────────────────────────────────────────────
let _custDropHideTimer = null;

/** Build list of known customers from savedCustomers + savedQuotes. */
function buildCustomerSuggestions() {
    const map = {};
    // Từ savedCustomers (theo code)
    Object.values(savedCustomers || {}).forEach(c => {
        const key = (c.phone || '').trim();
        if (!key) return;
        map[key] = { name: c.name || '', phone: key, address: c.address || '' };
    });
    // Từ savedQuotes (thêm khách chưa có trong savedCustomers)
    (savedQuotes || []).forEach(q => {
        const key = (q.customerPhone || '').trim();
        if (!key) return;
        if (!map[key]) {
            map[key] = { name: q.customerName || '', phone: key, address: q.customerAddress || '' };
        } else {
            if (!map[key].name && q.customerName) map[key].name = q.customerName;
            if (!map[key].address && q.customerAddress) map[key].address = q.customerAddress;
        }
    });
    return Object.values(map);
}

/**
 * Show autocomplete dropdown for customerName or customerPhone.
 * @param {'name'|'phone'} field
 * @param {string} term
 */
function showCustDropdown(field, term) {
    clearTimeout(_custDropHideTimer);
    const dd  = document.getElementById('custDropdown');
    const inp = document.getElementById(field === 'name' ? 'customerName' : 'customerPhone');
    if (!dd || !inp) return;

    const q = (term || '').trim().toLowerCase();
    if (!q) { dd.style.display = 'none'; return; }

    const all = buildCustomerSuggestions();
    const matches = all.filter(c => {
        if (field === 'name')  return c.name.toLowerCase().includes(q);
        if (field === 'phone') return c.phone.toLowerCase().includes(q);
        return false;
    }).slice(0, 8);

    if (!matches.length) { dd.style.display = 'none'; return; }

    dd.innerHTML = matches.map((c, i) =>
        `<div class="cust-drop-item" onmousedown="selectCustSuggestion(${i})">
            <span class="cust-drop-name">${escapeHtml(c.name || '(chưa có tên)')}</span>
            <span class="cust-drop-phone">${escapeHtml(c.phone)}</span>
            ${c.address ? `<div class="cust-drop-addr">${escapeHtml(c.address)}</div>` : ''}
        </div>`
    ).join('');
    dd._matches = matches;

    // Vị trí ngay dưới input
    const rect = inp.getBoundingClientRect();
    dd.style.left   = rect.left + 'px';
    dd.style.top    = (rect.bottom + 2) + 'px';
    dd.style.width  = rect.width + 'px';
    dd.style.display = 'block';
}

/** Fill all customer fields from selected suggestion index. */
function selectCustSuggestion(idx) {
    const dd = document.getElementById('custDropdown');
    if (!dd || !dd._matches) return;
    const c = dd._matches[idx];
    if (!c) return;
    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
    setVal('customerName',    c.name);
    setVal('customerPhone',   c.phone);
    setVal('customerAddress', c.address);
    dd.style.display = 'none';
}

/** Delay hiding so mousedown on item can fire first. */
function hideCustDropdownDelayed() {
    _custDropHideTimer = setTimeout(() => {
        const dd = document.getElementById('custDropdown');
        if (dd) dd.style.display = 'none';
    }, 200);
}

// ── Legacy / compat ────────────────────────────────────────────────────────────
/**
 * Look up a customer by phone number and populate the form fields.
 * (kept for backward compatibility)
 */
function searchCustomerByPhone() {
    const searchEl = document.getElementById('customerPhoneSearch') || document.getElementById('customerPhone');
    const phone    = (searchEl ? searchEl.value : '').trim();
    if (!phone) return;
    const all = buildCustomerSuggestions();
    const c   = all.find(x => x.phone === phone);
    if (c) {
        const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
        setVal('customerName',    c.name);
        setVal('customerPhone',   c.phone);
        setVal('customerAddress', c.address);
    }
}

/**
 * Clear all customer input fields.
 */
function clearCustomerFields() {
    ['customerName', 'customerPhone', 'customerAddress', 'customerCode'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
}

/**
 * Generate a new unique customer code (e.g. KH001, KH002…).
 * @returns {string}
 */
function generateNewCustomerCode() {
    const existingCodes = Object.keys(savedCustomers);
    const nums = existingCodes
        .filter(c => /^KH\d+$/.test(c))
        .map(c => parseInt(c.replace('KH', ''), 10))
        .filter(n => !isNaN(n));
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    return 'KH' + String(max + 1).padStart(3, '0');
}

/**
 * Convert unit shorthand on blur (e.g. "m2" → "m²").
 * @param {HTMLInputElement} input
 */
function handleUnitChange(input) {
    if (!input) return;
    const unitMap = {
        'm2': 'm²', 'M2': 'm²',
        'cm2': 'cm²', 'CM2': 'cm²',
        'dm2': 'dm²', 'DM2': 'dm²',
    };
    const key = input.value.trim();
    if (unitMap[key]) input.value = unitMap[key];
}
