/**
 * ui/notification.js
 * --------------------------------------------------
 * Displays a transient toast notification at the top-right.
 * --------------------------------------------------
 */

/**
 * Show a toast notification message.
 * @param {string} message
 * @param {'info'|'error'} [type='info']
 * @param {number} [duration=3000]  ms before auto-dismiss
 */
function showNotification(message, type = 'info', duration = 3000) {
    // Remove any existing notification
    const existing = document.getElementById('tp-notification');
    if (existing) existing.remove();

    const bg = type === 'error' ? '#c0392b' : '#1D75AE';

    const note = document.createElement('div');
    note.id = 'tp-notification';
    note.textContent = message;
    note.style.cssText = [
        'position:fixed',
        'top:20px',
        'right:20px',
        `background:${bg}`,
        'color:#fff',
        'padding:12px 20px',
        'border-radius:8px',
        'font-size:14px',
        'font-family:"Be Vietnam Pro",sans-serif',
        'font-weight:500',
        'box-shadow:0 4px 16px rgba(0,0,0,0.18)',
        'z-index:99999',
        'animation:slideIn 0.3s ease',
        'max-width:340px',
        'word-break:break-word',
        'pointer-events:none',
    ].join(';');
    document.body.appendChild(note);

    setTimeout(() => {
        note.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => note.remove(), 300);
    }, duration);
}
