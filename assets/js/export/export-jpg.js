/**
 * export/export-jpg.js
 * --------------------------------------------------
 * JPG export using html2canvas.
 *
 * Primary strategy for quote JPG:
 *  - Use the existing preview (.a4-page) to get the rendered size
 *  - Clone that node, render the clone off-screen at a high scale
 *  - Map the result into exact A4 pixels (2480×3508) and download
 *
 * For delivery and finalize, fall back to rendering HTML directly.
 *
 * Depends on: preview/preview.js (previewQuote), templates/*.js
 * --------------------------------------------------
 */

/** Utility: wait for images inside an element to finish loading */
function _waitImages(el, timeout = 3000) {
    const imgs = Array.from(el.querySelectorAll('img'));
    return Promise.all(imgs.map(img => new Promise(res => {
        try { img.crossOrigin = 'anonymous'; } catch (_) {}
        if (img.complete && img.naturalWidth) return res(true);
        const done = () => res(true);
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
        setTimeout(done, timeout);
    })));
}

/** Download a canvas as JPEG */
function _downloadCanvasAsJpeg(canvas, filename, quality = 0.95) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/jpeg', quality);
    document.body.appendChild(link);
    link.dispatchEvent(new MouseEvent('click'));
    setTimeout(() => link.remove(), 200);
}

/**
 * Capture a DOM element (already rendered) into an A4 portrait JPG file.
 * @param {HTMLElement} pageEl  Element representing the A4 page (visual)
 * @param {string} filename
 */
async function _captureElementToA4Jpg(pageEl, filename) {
    showNotification('Đang xuất ảnh JPG…');
    const rect = pageEl.getBoundingClientRect();
    const elW = Math.max(1, rect.width);
    const elH = Math.max(1, rect.height);

    // Clone into an off-screen host
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none;z-index:-1;background:#ffffff;';
    const clone = pageEl.cloneNode(true);
    clone.style.width = elW + 'px';
    clone.style.height = elH + 'px';
    clone.style.boxSizing = 'border-box';
    if (!clone.style.background || clone.style.background === '') clone.style.background = '#ffffff';
    host.appendChild(clone);
    document.body.appendChild(host);

    await _waitImages(clone, 3000);

    if (typeof html2canvas === 'undefined') {
        alert('Thiếu thư viện html2canvas. Không thể xuất JPG.');
        host.remove();
        return;
    }

    const targetW = 2480, targetH = 3508; // A4 portrait @ ~300dpi
    const scaleX = targetW / elW;
    const scaleY = targetH / elH;
    const renderScale = Math.min(scaleX, scaleY);

    let canvas;
    try {
        canvas = await html2canvas(clone, {
            backgroundColor: '#ffffff',
            scale: renderScale,
            useCORS: true,
            allowTaint: false,
            logging: false,
        });
    } catch (err) {
        console.error('html2canvas render error:', err);
        alert('Lỗi khi render ảnh. Xem console để biết chi tiết.');
        host.remove();
        return;
    }

    // Fit to exact A4 pixels
    const out = document.createElement('canvas');
    out.width = targetW;
    out.height = targetH;
    const ctx = out.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.imageSmoothingQuality = 'high';

    const drawW = Math.round(canvas.width);
    const drawH = Math.round(canvas.height);
    const offX = Math.floor((targetW - drawW) / 2);
    const offY = Math.floor((targetH - drawH) / 2);
    ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, offX, offY, drawW, drawH);

    _downloadCanvasAsJpeg(out, filename);
    host.remove();
    showNotification('Đã xuất ảnh JPG thành công!');
}

/** Export main quote as portrait A4 JPG (no preview flash) */
async function exportQuoteAsJPG() {
    try {
        const html = generateQuoteHTMLFullWidth();
        const filename = `BaoGia_${(document.getElementById('customerName') || {}).value || 'BaoGia'}_${quoteNumber}.jpg`;
        await _renderDirectHtmlToJpg(html, 794, 1123, 2480, 3508, filename);
    } catch (err) {
        console.error('exportQuoteAsJPG error:', err);
        alert('Xuất JPG thất bại. Thử lại hoặc dùng PDF.');
    }
}

/**
 * Fallback renderer: render raw HTML into off-screen container and create JPG
 * (used when preview .a4-page isn't available)
 */
async function _renderDirectHtmlToJpg(htmlContent, cssW, cssH, targetW, targetH, filename) {
    showNotification('Đang xuất ảnh JPG…');
    const container = document.createElement('div');
    container.style.cssText = `position:absolute;top:-9999px;left:-9999px;width:${cssW}px;height:${cssH}px;background:#fff;padding:0;box-sizing:border-box;`;
    container.innerHTML = htmlContent;
    document.body.appendChild(container);
    await _waitImages(container, 3000);

    try {
        const canvas = await html2canvas(container, { backgroundColor: '#ffffff', scale: 3, useCORS: true, logging: false });
        // Map to target
        const out = document.createElement('canvas');
        out.width = targetW; out.height = targetH;
        const ctx = out.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0,0,targetW,targetH);
        const scale = Math.min(targetW / canvas.width, targetH / canvas.height);
        const drawW = Math.round(canvas.width * scale);
        const drawH = Math.round(canvas.height * scale);
        const offX = Math.floor((targetW - drawW)/2);
        const offY = Math.floor((targetH - drawH)/2);
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(canvas, 0,0,canvas.width,canvas.height, offX, offY, drawW, drawH);
        _downloadCanvasAsJpeg(out, filename);
        showNotification('Đã xuất ảnh JPG thành công!');
    } catch (err) {
        console.error('Direct JPG render error:', err);
        alert('Lỗi khi xuất JPG.');
    } finally {
        container.remove();
    }
}

/** Export delivery note as landscape JPG */
async function exportDeliveryAsJPG() {
    // Generate delivery HTML and use fallback renderer with landscape targets
    const html = generateDeliveryHTML();
    await _renderDirectHtmlToJpg(html, 1123, 794, 3508, 2480, `PhieuGiao_${document.getElementById('customerName').value || 'GiaoHang'}_${quoteNumber}.jpg`);
}

/** Export finalize as portrait JPG */
async function exportFinalizeAsJPG() {
    const html = generateFinalizeHTML();
    await _renderDirectHtmlToJpg(html, 794, 1123, 2480, 3508, `XacNhanMauIn_${document.getElementById('customerName').value || 'XacNhan'}_${quoteNumber}.jpg`);
}

/** Export both quote + delivery sequentially */
async function exportAllAsJPG() {
    await exportQuoteAsJPG();
    await new Promise(res => setTimeout(res, 800));
    await exportDeliveryAsJPG();
}
