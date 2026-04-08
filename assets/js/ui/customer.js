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
    _updatePointsDisplay(c.phone);
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
    _updatePointsDisplay('');
    // Remove any applied points row
    _removePointsRow();
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

// ── Points display & use-points ──────────────────────────────────────────────

/** Cached total points for the current customer being quoted. */
let _currentCustomerPoints = 0;

/**
 * Look up completed-order points for a phone number and update the
 * #customerPointsBar display. Called from the phone input's oninput.
 * @param {string} phone
 */
function _updatePointsDisplay(phone) {
    const bar   = document.getElementById('customerPointsBar');
    const valEl = document.getElementById('pointsDisplayVal');
    const badge = document.getElementById('pointsAppliedBadge');
    if (!bar) return;

    const ph = (phone || '').trim();
    if (!ph) {
        bar.style.display = 'none';
        _currentCustomerPoints = 0;
        return;
    }

    // Sum points from COMPLETED orders only
    try {
        loadSavedQuotes();
    } catch (e) {}
    const pts = (savedQuotes || []).reduce(function(s, q) {
        try {
            if ((q.customerPhone || '').trim() === ph &&
                (q.orderStatus || '') === 'completed') {
                return s + Math.floor((Number(q.total) || 0) / 200000);
            }
        } catch (e) {}
        return s;
    }, 0);

    _currentCustomerPoints = pts;
    if (valEl) valEl.textContent = pts.toLocaleString('vi-VN');
    if (badge) badge.style.display = 'none';
    bar.style.display = pts > 0 ? 'flex' : 'none';
}

/** Open the use-points modal pre-filled with available points. */
function openUsePointsModal() {
    const modal  = document.getElementById('usePointsModal');
    const avail  = document.getElementById('usePointsAvail');
    const inp    = document.getElementById('usePointsInput');
    const errEl  = document.getElementById('usePointsError');
    if (!modal) return;
    if (avail) avail.textContent = _currentCustomerPoints.toLocaleString('vi-VN');
    if (inp)   { inp.value = ''; inp.max = Math.min(100, _currentCustomerPoints); }
    if (errEl) errEl.style.display = 'none';
    modal.style.display = 'flex';
}

/** Close the use-points modal without applying. */
function closeUsePointsModal() {
    const modal = document.getElementById('usePointsModal');
    if (modal) modal.style.display = 'none';
}

/** Validate input and apply the points row. */
function confirmUsePoints() {
    const inp   = document.getElementById('usePointsInput');
    const errEl = document.getElementById('usePointsError');
    const pts   = parseInt((inp ? inp.value : ''), 10) || 0;

    const showErr = (msg) => {
        if (errEl) { errEl.textContent = msg; errEl.style.display = 'block'; }
    };

    if (pts < 50) { showErr('Cần tối thiểu 50 điểm.'); return; }
    if (pts > 100) { showErr('Tối đa 100 điểm mỗi đơn.'); return; }
    if (pts > _currentCustomerPoints) {
        showErr('Điểm nhập vượt quá số điểm hiện có (' + _currentCustomerPoints + ' điểm).'); return;
    }

    applyPointsRow(pts);
    closeUsePointsModal();

    // Update badge
    const badge    = document.getElementById('pointsAppliedBadge');
    const amtSpan  = document.getElementById('pointsAppliedAmt');
    if (badge)   badge.style.display = 'inline';
    if (amtSpan) amtSpan.textContent = pts;
}

/** Remove any existing points-row from the items table. */
function _removePointsRow() {
    const existing = document.querySelector('#itemsBody tr[data-points-row]');
    if (existing) {
        existing.remove();
        // Renumber rows
        document.querySelectorAll('#itemsBody tr').forEach((r, i) => {
            if (r.cells[0]) r.cells[0].textContent = i + 1;
        });
        if (typeof updateSummary === 'function') updateSummary();
    }
    const badge = document.getElementById('pointsAppliedBadge');
    if (badge) badge.style.display = 'none';
}
