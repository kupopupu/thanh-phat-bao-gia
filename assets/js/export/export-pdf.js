/**
 * export/export-pdf.js
 * --------------------------------------------------
 * PDF export using jsPDF + html2canvas.
 *
 * Approach: render HTML into an off-screen absolute-positioned container,
 * capture with html2canvas, scale to exact A4 px, embed as single image.
 *
 * Depends on:
 *   templates/template-quote.js    (generateQuoteHTMLFullWidth)
 *   templates/template-delivery.js (generateDeliveryHTML)
 *   templates/template-finalize.js (generateFinalizeHTML)
 *   ui/notification.js             (showNotification)
 * --------------------------------------------------
 */

/**
 * Internal: create an off-screen container, capture with html2canvas,
 * fit into an A4 jsPDF document, and save.
 *
 * @param {string}  htmlContent
 * @param {'p'|'l'} orientation   'p' = portrait, 'l' = landscape
 * @param {string}  filename
 */
async function _renderAndSavePDF(htmlContent, orientation, filename) {
    showNotification('Đang xuất PDF…');

    // A4 at 96 dpi: portrait=794×1123, landscape=1123×794
    const isLandscape = orientation === 'l';
    const cssW = isLandscape ? 1123 : 794;
    const cssH = isLandscape ? 794  : 1123;

    const container = document.createElement('div');
    container.style.cssText = [
        'position:absolute',
        'top:-9999px',
        'left:-9999px',
        `width:${cssW}px`,
        `height:${cssH}px`,
        'background:#fff',
        'padding:0',
        'font-family:Arial,sans-serif',
        'display:flex',
        'flex-direction:column',
        'box-sizing:border-box',
        'overflow:hidden',
    ].join(';');
    container.innerHTML = htmlContent;
    document.body.appendChild(container);

    // Wait for fonts
    if (document.fonts && document.fonts.ready) {
        try { await document.fonts.ready; } catch (_) {}
    }

    // Wait for images
    const imgs = Array.from(container.querySelectorAll('img'));
    await Promise.all(imgs.map(img => new Promise(res => {
        if (img.complete && img.naturalWidth) return res();
        img.onload  = res;
        img.onerror = res;
        setTimeout(res, 2500);
    })));

    try {
        const canvas = await html2canvas(container, {
            backgroundColor: '#ffffff',
            scale: 3,
            useCORS: true,
            allowTaint: false,
            windowWidth:  cssW * 3,
            windowHeight: cssH * 3,
            logging: false,
        });

        // Scale canvas to exact A4 px (300dpi equivalent)
        const targetW = isLandscape ? 3508 : 2480;
        const targetH = isLandscape ? 2480 : 3508;
        const scale   = Math.min(targetW / canvas.width, targetH / canvas.height);
        const drawW   = Math.round(canvas.width  * scale);
        const drawH   = Math.round(canvas.height * scale);
        const offX    = Math.floor((targetW - drawW) / 2);
        const offY    = Math.floor((targetH - drawH) / 2);

        const a4 = document.createElement('canvas');
        a4.width  = targetW;
        a4.height = targetH;
        const ctx = a4.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetW, targetH);
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, offX, offY, drawW, drawH);

        const imgData = a4.toDataURL('image/jpeg', 0.95);
        const pdf     = new jsPDF(orientation, 'mm', 'a4');
        pdf.addImage(
            imgData, 'JPEG', 0, 0,
            pdf.internal.pageSize.getWidth(),
            pdf.internal.pageSize.getHeight()
        );
        pdf.save(filename);
        showNotification('Đã xuất PDF thành công!');
    } catch (err) {
        console.error('PDF export error:', err);
        showNotification('Lỗi khi xuất PDF!');
        alert('Có lỗi khi xuất PDF. Vui lòng thử lại!');
    } finally {
        document.body.removeChild(container);
    }
}

/** Export main quote as portrait A4 PDF */
async function exportToPDF() {
    const html = generateQuoteHTMLFullWidth();
    const name = document.getElementById('customerName').value || 'BaoGia';
    await _renderAndSavePDF(html, 'p', `BaoGia_${name}_${quoteNumber}.pdf`);
}

/** Export delivery note as landscape A4 PDF */
async function exportDeliveryNote() {
    const html = generateDeliveryHTML();
    const name = document.getElementById('customerName').value || 'GiaoHang';
    await _renderAndSavePDF(html, 'l', `PhieuGiao_${name}_${quoteNumber}.pdf`);
}

/** Export finalize / print-approval as portrait A4 PDF */
async function exportFinalizeToPDF() {
    const html = generateFinalizeHTML();
    const name = document.getElementById('customerName').value || 'XacNhan';
    await _renderAndSavePDF(html, 'p', `XacNhanMauIn_${name}_${quoteNumber}.pdf`);
}


/**
 * Render an HTML string into an offscreen container, then capture
 * with html2canvas and add to jsPDF document.
 * @param {string}  htmlContent
 * @param {'p'|'l'} orientation
 * @param {string}  filename
 */
async function _renderAndSavePDF(htmlContent, orientation, filename) {
    showNotification('Đang xuất PDF…');

    const wrapper = document.createElement('div');
    wrapper.style.cssText = [
        'position:fixed',
        'left:-9999px',
        'top:0',
        orientation === 'l'
            ? 'width:1123px;height:794px'
            : 'width:794px;min-height:1123px',
        'background:#fff',
        'overflow:hidden',
        'z-index:-1',
    ].join(';');
    wrapper.innerHTML = htmlContent;
    document.body.appendChild(wrapper);

    // Wait for images
    const imgs = Array.from(wrapper.querySelectorAll('img'));
    await Promise.all(imgs.map(img => new Promise(res => {
        if (img.complete) return res();
        img.onload = img.onerror = res;
    })));

    const isLandscape = orientation === 'l';
    const pageW = isLandscape ? 297 : 210;
    const pageH = isLandscape ? 210 : 297;

    try {
        const canvas = await html2canvas(wrapper, {
            scale: 3,
            useCORS: true,
            allowTaint: false,
            backgroundColor: '#ffffff',
            logging: false,
            width: wrapper.offsetWidth,
            height: wrapper.offsetHeight,
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdf     = new jsPDF(orientation, 'mm', 'a4');

        const canvasW = canvas.width;
        const canvasH = canvas.height;
        const ratio   = Math.min(pageW / canvasW, pageH / canvasH);
        const renderW = canvasW * ratio;
        const renderH = canvasH * ratio;

        let remaining = canvasH;
        let srcY      = 0;
        let page      = 0;

        while (remaining > 0) {
            if (page > 0) pdf.addPage();
            const sliceH     = Math.min(remaining, pageH / ratio);
            const sliceCanvas = document.createElement('canvas');
            sliceCanvas.width  = canvasW;
            sliceCanvas.height = sliceH;
            sliceCanvas.getContext('2d').drawImage(canvas, 0, srcY, canvasW, sliceH, 0, 0, canvasW, sliceH);
            pdf.addImage(sliceCanvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, renderW, sliceH * ratio);
            srcY      += sliceH;
            remaining -= sliceH;
            page++;
        }

        pdf.save(filename);
        showNotification('Đã xuất PDF thành công!');
    } catch (err) {
        console.error('Export PDF error:', err);
        showNotification('Lỗi khi xuất PDF!');
    } finally {
        document.body.removeChild(wrapper);
    }
}

/** Export main quote as PDF */
async function exportToPDF() {
    const html = generateQuoteHTMLFullWidth();
    const customerName = document.getElementById('customerName').value || 'BaoGia';
    await _renderAndSavePDF(html, 'p', `BaoGia_${customerName}_${quoteNumber}.pdf`);
}

/** Export delivery note as landscape PDF */
async function exportDeliveryNote() {
    const html = generateDeliveryHTML();
    const customerName = document.getElementById('customerName').value || 'GiaoHang';
    await _renderAndSavePDF(html, 'l', `PhieuGiao_${customerName}_${quoteNumber}.pdf`);
}

/** Export finalize / print approval as PDF */
async function exportFinalizeToPDF() {
    const html = generateFinalizeHTML();
    const customerName = document.getElementById('customerName').value || 'XacNhan';
    await _renderAndSavePDF(html, 'p', `XacNhanMauIn_${customerName}_${quoteNumber}.pdf`);
}
