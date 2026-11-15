/**
 * ui/theme.js
 * --------------------------------------------------
 * Quản lý Dark Mode (Chế độ tối / sáng) cho Thanh Phát Webapp.
 * Hỗ trợ lưu cấu hình vào localStorage và đồng bộ Favicon.
 * --------------------------------------------------
 */

const THEME_STORAGE_KEY = 'tp_theme_mode';
const FAVICON_LIGHT = 'assets/image/Thanh-Phát-16.ico';
const FAVICON_DARK  = 'assets/image/Thanh-Phát-15.ico';

/**
 * Cập nhật Favicon theo theme
 * @param {boolean} isDark
 */
function updateFavicon(isDark) {
    let link = document.getElementById('favicon');
    if (!link) {
        link = document.createElement('link');
        link.id = 'favicon';
        link.rel = 'icon';
        link.type = 'image/x-icon';
        document.head.appendChild(link);
    }
    link.href = isDark ? FAVICON_DARK : FAVICON_LIGHT;
}

/**
 * Cập nhật giao diện nút Theme Toggle
 * @param {boolean} isDark
 */
function updateThemeToggleBtn(isDark) {
    const btn = document.getElementById('themeToggleBtn');
    if (!btn) return;
    btn.setAttribute('title', isDark ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối');
    btn.setAttribute('aria-label', isDark ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối');
    
    // Render icon SVG tối giản
    const iconContainer = btn.querySelector('.theme-icon');
    if (iconContainer) {
        if (window.AppIcons) {
            iconContainer.innerHTML = isDark ? window.AppIcons.sun('', 15) : window.AppIcons.moon('', 15);
        } else {
            iconContainer.innerHTML = isDark 
                ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`
                : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`;
        }
    }
    const label = btn.querySelector('.theme-label');
    if (label) label.textContent = isDark ? 'Sáng' : 'Tối';
}

/**
 * Áp dụng theme ('dark' hoặc 'light')
 * @param {'dark'|'light'} theme
 * @param {boolean} [persist=true]
 */
function applyTheme(theme, persist = true) {
    const isDark = theme === 'dark';
    if (isDark) {
        document.body.classList.add('dark-mode');
        document.documentElement.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
        document.documentElement.classList.remove('dark-mode');
    }

    updateFavicon(isDark);
    updateThemeToggleBtn(isDark);

    if (persist) {
        try { localStorage.setItem(THEME_STORAGE_KEY, theme); } catch (_) {}
    }
}

/**
 * Bật / tắt giữa Dark Mode và Light Mode
 */
function toggleTheme() {
    const currentIsDark = document.body.classList.contains('dark-mode');
    const nextTheme = currentIsDark ? 'light' : 'dark';
    applyTheme(nextTheme, true);
    if (typeof showNotification === 'function') {
        showNotification(nextTheme === 'dark' ? 'Đã kích hoạt chế độ Tối' : 'Đã kích hoạt chế độ Sáng');
    }
}

/**
 * Khởi tạo theme khi trang được load
 */
function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem(THEME_STORAGE_KEY); } catch (_) {}

    if (saved === 'dark' || saved === 'light') {
        applyTheme(saved, false);
    } else {
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        applyTheme(prefersDark ? 'dark' : 'light', false);
    }

    if (window.matchMedia) {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const listener = (e) => {
            let userPref = null;
            try { userPref = localStorage.getItem(THEME_STORAGE_KEY); } catch (_) {}
            if (!userPref) {
                applyTheme(e.matches ? 'dark' : 'light', false);
            }
        };
        if (mq.addEventListener) mq.addEventListener('change', listener);
        else if (mq.addListener) mq.addListener(listener);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTheme);
} else {
    initTheme();
}
