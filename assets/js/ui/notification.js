/**
 * ui/notification.js
 * --------------------------------------------------
 * Displays a transient toast notification at the bottom-right
 * using Thanh Phát's Deep Navy & Pastel Sky branding.
 * Không bị che đè lên floating toolbar hay các nút điều khiển.
 * --------------------------------------------------
 */

/**
 * Show a toast notification message.
 * @param {string} message
 * @param {'info'|'error'|'success'} [type='info']
 * @param {number} [duration=3000]  ms before auto-dismiss
 */
function showNotification(message, type = 'info', duration = 3000) {
    const existing = document.getElementById('tp-notification');
    if (existing) existing.remove();

    const bg     = type === 'error' ? '#991b1b' : (type === 'success' ? '#064e3b' : '#0b2545');
    const border = type === 'error' ? '#fecaca' : (type === 'success' ? '#34d399' : '#38bdf8');

    const note = document.createElement('div');
    note.id = 'tp-notification';
    note.textContent = message;
    note.style.cssText = [
        'position:fixed',
        'bottom:24px',
        'right:24px',
        `background:${bg}`,
        `border:1px solid ${border}`,
        'color:#ffffff',
        'padding:10px 18px',
        'border-radius:8px',
        'font-size:13px',
        'font-family:"Be Vietnam Pro",sans-serif',
        'font-weight:600',
        'box-shadow:0 10px 30px rgba(0,0,0,0.45)',
        'z-index:99999',
        'animation:slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        'max-width:380px',
        'word-break:break-word',
        'pointer-events:none',
    ].join(';');
    document.body.appendChild(note);

    setTimeout(() => {
        note.style.animation = 'slideOut 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards';
        setTimeout(() => note.remove(), 260);
    }, duration);
}
