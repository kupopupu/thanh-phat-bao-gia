/**
 * preview/preview.js
 * --------------------------------------------------
 * Scale preview content inside modals, open/close modals,
 * and trigger template generators.
 *
 * Depends on:
 *   state.js               (quoteNumber)
 *   templates/template-quote.js    (generateQuoteHTMLFullWidth)
 *   templates/template-delivery.js (generateDeliveryHTML)
 *   templates/template-finalize.js (generateFinalizeHTML)
 * --------------------------------------------------
 */

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
        const contW  = content.clientWidth  - 12;
        const contH  = content.clientHeight - 12;
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
        const contentEl = document.getElementById('previewContent');
        if (!contentEl) return;
        let html;
        try { html = generateQuoteHTMLFullWidth(); }
        catch (err) { html = `<div style="padding:20px;color:#c00;font-weight:600;">Lỗi: ${err.message}</div>`; }

        contentEl.innerHTML = `<div class="preview-inner"><div class="a4-page" style="width:210mm;height:297mm;box-sizing:border-box;background:white;">${html}</div></div>`;
        document.getElementById('previewModal').style.display = 'block';
        document.body.style.overflow = 'hidden';
        setTimeout(() => scalePreviewContent('previewContent'), 60);
        setTimeout(() => scalePreviewContent('previewContent'), 400);
    } catch (e) {
        console.error('previewQuote error', e);
        alert('Không thể xem trước báo giá. Vui lòng kiểm tra dữ liệu hoặc thử lại.');
    }
}

function closePreview() {
    document.getElementById('previewModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

// ---- Delivery preview -----------------------------------------------

function previewDeliveryNote() {
    const html = generateDeliveryHTML();
    const a4   = `<div class="preview-inner"><div class="a4-page" style="width:297mm;height:210mm;box-sizing:border-box;background:#fff;">${html}</div></div>`;
    document.getElementById('deliveryPreviewContent').innerHTML = a4;
    document.getElementById('deliveryPreviewModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
    setTimeout(() => scalePreviewContent('deliveryPreviewContent'), 60);
    setTimeout(() => scalePreviewContent('deliveryPreviewContent'), 400);
}

function closeDeliveryPreview() {
    document.getElementById('deliveryPreviewModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

// ---- Finalize (chốt file) preview -----------------------------------

function previewFinalizeQuote() {
    const customerName  = document.getElementById('customerName').value;
    const customerPhone = document.getElementById('customerPhone').value;
    if (!customerName || !customerPhone) {
        alert('⚠️ Vui lòng nhập đầy đủ thông tin khách hàng trước khi chốt file!');
        return;
    }
    const html = generateFinalizeHTML();
    document.getElementById('finalizePreviewContent').innerHTML = `<div class="preview-inner">${html}</div>`;
    document.getElementById('finalizePreviewModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
    setTimeout(() => scalePreviewContent('finalizePreviewContent'), 60);
    setTimeout(() => scalePreviewContent('finalizePreviewContent'), 400);
}

function closeFinalizePreview() {
    document.getElementById('finalizePreviewModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

function confirmFinalizeQuote() {
    try {
        const assigned = finalizeQuoteNumber();
        showNotification('✅ Đã chốt file và lưu báo giá: ' + (assigned || ''));
    } catch (e) {
        showNotification('✅ Đã chốt file thành công với khách hàng!');
    }
}
