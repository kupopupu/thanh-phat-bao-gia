/**
 * preview/preview.js
 * --------------------------------------------------
 * Scale preview content inside modals, open/close modals,
 * floating action toolbar, smooth zoom & pan, and trigger template generators.
 *
 * Depends on:
 *   state.js               (quoteNumber)
 *   templates/template-quote.js    (generateQuoteHTMLFullWidth)
 *   templates/template-delivery.js (generateDeliveryHTML)
 *   templates/template-finalize.js (generateFinalizeHTML)
 * --------------------------------------------------
 */

// ---- Preview Zoom & Pan State ----------------------------------------
const previewZoomState = {};

/**
 * Lấy hoặc khởi tạo state điều khiển Zoom & Pan cho một viewport preview.
 * @param {string} contentId
 */
function getPreviewZoomState(contentId) {
    if (!previewZoomState[contentId]) {
        previewZoomState[contentId] = {
            baseScale: 1,
            zoomMultiplier: 1.0,
            panX: 0,
            panY: 0,
            isDragging: false,
            startX: 0,
            startY: 0
        };
    }
    return previewZoomState[contentId];
}

/**
 * Cập nhật biến đổi transform (scale + translate) và nhãn zoom cho viewport.
 * @param {string} contentId
 */
function applyPreviewTransform(contentId) {
    try {
        const state = getPreviewZoomState(contentId);
        const content = document.getElementById(contentId);
        if (!content) return;

        const wrapper = content.querySelector('.preview-scale');
        if (wrapper) {
            wrapper.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoomMultiplier})`;
            wrapper.style.transformOrigin = 'center center';
            wrapper.style.transition = state.isDragging ? 'none' : 'transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)';
        }

        // Cập nhật nhãn % Zoom
        const zoomValEl = document.getElementById(contentId + 'ZoomVal');
        if (zoomValEl) {
            zoomValEl.textContent = Math.round(state.zoomMultiplier * 100) + '%';
        }

        // Cập nhật con trỏ chuột
        content.style.cursor = state.isDragging
            ? 'grabbing'
            : (state.zoomMultiplier > 1.05 ? 'grab' : 'default');
    } catch (e) {
        console.error('applyPreviewTransform error', e);
    }
}

/**
 * Phóng to / Thu nhỏ bản in xem trước theo bước delta.
 * @param {string} contentId
 * @param {number} delta
 */
function zoomPreview(contentId, delta) {
    const state = getPreviewZoomState(contentId);
    let nextZoom = state.zoomMultiplier + delta;
    if (nextZoom < 0.35) nextZoom = 0.35;
    if (nextZoom > 3.5) nextZoom = 3.5;

    // Khi đưa về gần 100%, tự động căn chuẩn giữa
    if (Math.abs(nextZoom - 1.0) < 0.05) {
        nextZoom = 1.0;
        state.panX = 0;
        state.panY = 0;
    }

    state.zoomMultiplier = Math.round(nextZoom * 100) / 100;
    applyPreviewTransform(contentId);
}
window.zoomPreview = zoomPreview;

/**
 * Đặt lại tỷ lệ xem trước vừa khít toàn màn hình (100% fit).
 * @param {string} contentId
 */
function resetZoomPreview(contentId) {
    const state = getPreviewZoomState(contentId);
    state.zoomMultiplier = 1.0;
    state.panX = 0;
    state.panY = 0;
    applyPreviewTransform(contentId);
}
window.resetZoomPreview = resetZoomPreview;

/**
 * Gắn các tương tác Mouse Wheel (cuộn để Zoom) và Drag & Drop (kéo rê để xem).
 * @param {string} contentId
 */
function attachPreviewInteractions(contentId) {
    const viewport = document.getElementById(contentId);
    if (!viewport || viewport.dataset.interactionsAttached === 'true') return;
    viewport.dataset.interactionsAttached = 'true';

    const state = getPreviewZoomState(contentId);

    // Cuộn chuột để Zoom In / Zoom Out
    viewport.addEventListener('wheel', function (e) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.12 : -0.12;
        zoomPreview(contentId, delta);
    }, { passive: false });

    // Giữ chuột trái để Kéo rê (Pan)
    viewport.addEventListener('mousedown', function (e) {
        // Chỉ kéo khi click chuột trái và không bấm vào thanh floating toolbar
        if (e.button !== 0 || e.target.closest('.preview-floating-toolbar')) return;
        state.isDragging = true;
        state.startX = e.clientX - state.panX;
        state.startY = e.clientY - state.panY;
        applyPreviewTransform(contentId);
    });

    window.addEventListener('mousemove', function (e) {
        if (!state.isDragging) return;
        state.panX = e.clientX - state.startX;
        state.panY = e.clientY - state.startY;
        applyPreviewTransform(contentId);
    });

    window.addEventListener('mouseup', function () {
        if (state.isDragging) {
            state.isDragging = false;
            applyPreviewTransform(contentId);
        }
    });

    // Nhấp đúp để phóng to 150% hoặc đưa về vừa màn hình
    viewport.addEventListener('dblclick', function (e) {
        if (e.target.closest('.preview-floating-toolbar')) return;
        if (state.zoomMultiplier > 1.2) {
            resetZoomPreview(contentId);
        } else {
            zoomPreview(contentId, 0.45);
        }
    });
}

// Phím tắt bàn phím tiện lợi: Esc, +, -, 0
window.addEventListener('keydown', function (e) {
    const previewModal  = document.getElementById('previewModal');
    const deliveryModal = document.getElementById('deliveryPreviewModal');
    const finalizeModal = document.getElementById('finalizePreviewModal');

    const isOpen = (m) => m && m.style && m.style.display !== 'none';

    let activeContentId = null;
    if (isOpen(previewModal)) activeContentId = 'previewContent';
    else if (isOpen(deliveryModal)) activeContentId = 'deliveryPreviewContent';
    else if (isOpen(finalizeModal)) activeContentId = 'finalizePreviewContent';

    if (!activeContentId) return;

    if (e.key === 'Escape') {
        if (activeContentId === 'previewContent') closePreview();
        else if (activeContentId === 'deliveryPreviewContent') closeDeliveryPreview();
        else if (activeContentId === 'finalizePreviewContent') closeFinalizePreview();
    } else if (e.key === '+' || e.key === '=') {
        zoomPreview(activeContentId, 0.15);
    } else if (e.key === '-' || e.key === '_') {
        zoomPreview(activeContentId, -0.15);
    } else if (e.key === '0') {
        resetZoomPreview(activeContentId);
    }
});

// ---- Scale helper ----------------------------------------------------

/**
 * Scale the .preview-inner element inside a modal content area so that
 * the full A4 page is visible without scrolling.
 * Waits for any <img> tags to load before measuring.
 * @param {string} contentId  – DOM id of the content wrapper div
 * @returns {Promise<number>} The applied scale factor
 */
async function scalePreviewContent(contentId) {
    try {
        const content = document.getElementById(contentId);
        if (!content) return;
        const inner = content.querySelector('.preview-inner');
        if (!inner) return;

        const waitForImages = (el, timeout = 1200) => new Promise(res => {
            const imgs = Array.from(el.querySelectorAll('img'));
            if (imgs.length === 0) return res(true);
            let remaining = imgs.length;
            const done = () => { if (--remaining <= 0) res(true); };
            imgs.forEach(img => {
                if (img.complete && img.naturalWidth !== 0) return done();
                img.addEventListener('load',  done);
                img.addEventListener('error', done);
                setTimeout(done, timeout);
            });
        });

        await waitForImages(inner, 1200);

        inner.style.transform = '';
        inner.style.margin    = '0';
        inner.style.display   = 'block';

        // Ensure a .preview-scale wrapper exists
        let wrapper = inner.parentElement;
        if (!wrapper || !wrapper.classList || !wrapper.classList.contains('preview-scale')) {
            wrapper = document.createElement('div');
            wrapper.className = 'preview-scale';
            content.replaceChild(wrapper, inner);
            wrapper.appendChild(inner);
        }

        // Measure natural size via an off-screen clone
        const measurer = document.createElement('div');
        measurer.style.cssText = 'position:absolute;top:-99999px;left:-99999px;visibility:hidden;width:auto;height:auto;overflow:visible;';
        const clone = inner.cloneNode(true);
        clone.style.transform = '';
        clone.style.margin    = '0';
        clone.style.display   = 'block';
        measurer.appendChild(clone);
        document.body.appendChild(measurer);

        await waitForImages(clone, 1200);

        const innerW = clone.scrollWidth  || clone.offsetWidth;
        const innerH = clone.scrollHeight || clone.offsetHeight;
        // Viewport padding thoáng đãng toàn màn hình (trừ lề trên để né floating toolbar)
        const contW  = (content.clientWidth  || window.innerWidth)  - 60;
        const contH  = (content.clientHeight || window.innerHeight) - 70;
        document.body.removeChild(measurer);

        if (innerW <= 0 || innerH <= 0 || contW <= 0 || contH <= 0) return;

        const hasImage = clone.querySelectorAll('img').length > 0;
        let scale;
        if (hasImage) {
            scale = Math.min(contH / innerH, 1);
            if (innerW * scale > contW) scale = contW / innerW;
        } else {
            scale = Math.min(contW / innerW, contH / innerH, 1);
        }

        wrapper.style.width   = Math.round(innerW * scale) + 'px';
        wrapper.style.height  = Math.round(innerH * scale) + 'px';
        wrapper.style.display = 'inline-block';

        inner.style.transformOrigin = 'top left';
        inner.style.transform       = `scale(${scale})`;

        content.style.display        = 'flex';
        content.style.alignItems     = 'center';
        content.style.justifyContent = 'center';
        content.style.overflow       = 'hidden';

        // Khởi tạo state zoom
        const state = getPreviewZoomState(contentId);
        state.baseScale = scale;
        state.zoomMultiplier = 1.0;
        state.panX = 0;
        state.panY = 0;
        state.isDragging = false;

        applyPreviewTransform(contentId);
        attachPreviewInteractions(contentId);

        return scale;
    } catch (e) {
        console.error('scalePreviewContent error', e);
    }
}

// Re-scale on window resize for any open preview modal
window.addEventListener('resize', () => {
    ['previewContent', 'deliveryPreviewContent', 'finalizePreviewContent'].forEach(id => {
        const modal = document.getElementById(id.replace('Content', 'Modal'));
        if (modal && modal.style && modal.style.display !== 'none') {
            scalePreviewContent(id);
        }
    });
});

// ---- Quote preview --------------------------------------------------

function previewQuote() {
    try {
        const existingToast = document.getElementById('tp-notification');
        if (existingToast) existingToast.remove();

        const contentEl = document.getElementById('previewContent');
        if (!contentEl) return;
        let html;
        try { html = generateQuoteHTMLFullWidth(); }
        catch (err) { html = `<div style="padding:20px;color:#c00;font-weight:600;">Lỗi: ${err.message}</div>`; }

        contentEl.innerHTML = `<div class="preview-inner"><div class="a4-page" style="width:210mm;height:297mm;box-sizing:border-box;background:white;">${html}</div></div>`;
        document.getElementById('previewModal').style.display = 'block';
        document.body.style.overflow = 'hidden';
        setTimeout(() => scalePreviewContent('previewContent'), 60);
        setTimeout(() => scalePreviewContent('previewContent'), 350);
    } catch (e) {
        console.error('previewQuote error', e);
        alert('Không thể xem trước báo giá. Vui lòng kiểm tra dữ liệu hoặc thử lại.');
    }
}

function closePreview() {
    document.getElementById('previewModal').style.display = 'none';
    document.body.style.overflow = 'auto';
    resetZoomPreview('previewContent');
}

// ---- Delivery preview -----------------------------------------------

function previewDeliveryNote() {
    const html = generateDeliveryHTML();
    const a4   = `<div class="preview-inner"><div class="a4-page" style="width:297mm;height:210mm;box-sizing:border-box;background:#fff;">${html}</div></div>`;
    document.getElementById('deliveryPreviewContent').innerHTML = a4;
    document.getElementById('deliveryPreviewModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
    setTimeout(() => scalePreviewContent('deliveryPreviewContent'), 60);
    setTimeout(() => scalePreviewContent('deliveryPreviewContent'), 350);
}

function closeDeliveryPreview() {
    document.getElementById('deliveryPreviewModal').style.display = 'none';
    document.body.style.overflow = 'auto';
    resetZoomPreview('deliveryPreviewContent');
}

// ---- Finalize (chốt file) preview -----------------------------------

function previewFinalizeQuote() {
    const customerName  = document.getElementById('customerName').value;
    const customerPhone = document.getElementById('customerPhone').value;
    if (!customerName || !customerPhone) {
        alert('Vui lòng nhập đầy đủ thông tin khách hàng trước khi chốt file!');
        return;
    }
    const html = generateFinalizeHTML();
    document.getElementById('finalizePreviewContent').innerHTML = `<div class="preview-inner">${html}</div>`;
    document.getElementById('finalizePreviewModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
    setTimeout(() => scalePreviewContent('finalizePreviewContent'), 60);
    setTimeout(() => scalePreviewContent('finalizePreviewContent'), 350);
}

function closeFinalizePreview() {
    document.getElementById('finalizePreviewModal').style.display = 'none';
    document.body.style.overflow = 'auto';
    resetZoomPreview('finalizePreviewContent');
}

function confirmFinalizeQuote() {
    try {
        const assigned = finalizeQuoteNumber();
        showNotification('Đã chốt file và lưu báo giá: ' + (assigned || ''));
    } catch (e) {
        showNotification('Đã chốt file thành công với khách hàng!');
    }
}

