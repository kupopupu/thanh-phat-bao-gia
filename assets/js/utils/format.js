/**
 * utils/format.js
 * Pure formatting helpers – no DOM, no side-effects
 */

/**
 * Format a number as Vietnamese currency string, e.g. "1.250.000 VNĐ"
 * @param {number} amount
 * @returns {string}
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' VNĐ';
}

/**
 * Short-form VND for inline price inputs, e.g. "500.000đ"
 * @param {number} amount
 * @returns {string}
 */
function formatVndShort(amount) {
    try {
        return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
    } catch (e) {
        return String(amount) + 'đ';
    }
}

/**
 * Escape HTML special characters to prevent XSS in generated HTML strings.
 * @param {*} str
 * @returns {string}
 */
function escapeHtml(str) {
    return String(str || '').replace(/[&<>"'`]/g, function (s) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' })[s];
    });
}
