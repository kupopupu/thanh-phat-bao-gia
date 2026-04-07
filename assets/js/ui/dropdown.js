/**
 * ui/dropdown.js
 * --------------------------------------------------
 * Manages dropdown visibility.
 * The CSS uses .dropdown-menu + .active (opacity/visibility transitions).
 * So we toggle the 'active' class — NOT display:block/none.
 * --------------------------------------------------
 */

/**
 * Toggle a dropdown menu open/closed.
 * @param {string} id  The dropdown element id
 */
function toggleDropdown(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const isOpen = el.classList.contains('active');
    closeAllDropdowns();
    if (!isOpen) {
        el.classList.add('active');
    }
}

/**
 * Explicitly close a single dropdown by id.
 * @param {string} id
 */
function closeDropdown(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
}

/** Close every open dropdown. */
function closeAllDropdowns() {
    document.querySelectorAll('.dropdown-menu').forEach(el => {
        el.classList.remove('active');
    });
}

// Close dropdowns when clicking outside
document.addEventListener('click', e => {
    if (!e.target.closest('.dropdown-container')) {
        closeAllDropdowns();
    }
});

// Also close on Escape key
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeAllDropdowns();
});
