/**
 * ui/image.js
 * --------------------------------------------------
 * Print-info modal & image upload flow.
 *
 * Depends on:
 *   state.js           (uploadedImages, currentQuoteType)
 *   ui/notification.js (showNotification)
 * --------------------------------------------------
 */

/* ------------------------------------------------------------------ */
/*  Cup rows (In Ly mode)                                              */
/* ------------------------------------------------------------------ */

let _cupRowCounter = 0;

/**
 * Open the print-info modal, refreshing its content for the current quote type.
 */
function uploadImage() {
    updatePrintInfoModalForQuoteType();
    scalePrintInfoModal();
    const modal = document.getElementById('printInfoModal');
    if (modal) modal.style.display = 'flex';
}

/**
 * Update the print-info modal UI depending on the active quote type.
 */
function updatePrintInfoModalForQuoteType() {
    const cupSection   = document.getElementById('cupSection');
    const otherSection = document.getElementById('otherSection');
    if (!cupSection || !otherSection) return;
    if (currentQuoteType === 'cup') {
        cupSection.style.display   = 'block';
        otherSection.style.display = 'none';
    } else {
        cupSection.style.display   = 'none';
        otherSection.style.display = 'block';
    }
}

/**
 * Reset image upload buttons back to their default "choose file" state.
 */
function resetImageUploadButtons() {
    ['designUploadBtn', 'mockupUploadBtn'].forEach(id => {
        const btn = document.getElementById(id);
        if (!btn) return;
        if (id === 'designUploadBtn') {
            btn.textContent = uploadedImages.design  ? '✓ Đã có thiết kế (đổi)' : '📎 Chọn file thiết kế';
        } else {
            btn.textContent = uploadedImages.mockup  ? '✓ Đã có mockup (đổi)'   : '📎 Chọn file mockup';
        }
    });
}

/**
 * Populate cup rows from a saved quote's cupList array.
 * @param {Array<{name:string, qty:string|number}>} cupList
 */
function loadCupsFromQuote(cupList) {
    const container = document.getElementById('cupRowsContainer');
    if (!container) return;
    container.innerHTML = '';
    _cupRowCounter = 0;
    if (!cupList || !cupList.length) {
        addCupRow();
        return;
    }
    cupList.forEach(c => addCupRowWithData(c.name, c.qty));
    updateCupRemoveButtons();
}

/** Add an empty cup row. */
function addCupRow() {
    addCupRowWithData('', '');
}

/**
 * Add a cup row pre-filled with name + qty.
 * @param {string} name
 * @param {string|number} qty
 */
function addCupRowWithData(name, qty) {
    const container = document.getElementById('cupRowsContainer');
    if (!container) return;
    const id = ++_cupRowCounter;
    const row = document.createElement('div');
    row.className = 'cup-row';
    row.dataset.rowId = id;
    row.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:8px;';
    row.innerHTML = `
        <input type="text" class="cup-name-input" placeholder="Tên loại ly..." value="${escapeHtml(String(name || ''))}"
            style="flex:1;padding:8px 12px;border:1px solid #dee2e6;border-radius:6px;font-size:14px;font-family:inherit;"/>
        <input type="text" class="cup-qty-input" placeholder="Số lượng" value="${escapeHtml(String(qty || ''))}"
            style="width:100px;padding:8px 12px;border:1px solid #dee2e6;border-radius:6px;font-size:14px;font-family:inherit;"/>
        <button onclick="removeCupRow(${id})" style="width:32px;height:32px;background:#dc3545;color:#fff;border:none;border-radius:6px;font-size:16px;cursor:pointer;flex-shrink:0;">×</button>
    `;
    container.appendChild(row);
    updateCupRemoveButtons();
}

/**
 * Remove a cup row by its ID.
 * @param {number} rowId
 */
function removeCupRow(rowId) {
    const container = document.getElementById('cupRowsContainer');
    if (!container) return;
    const row = container.querySelector(`[data-row-id="${rowId}"]`);
    if (row) row.remove();
    updateCupRemoveButtons();
}

/** Show remove buttons only when there are multiple rows. */
function updateCupRemoveButtons() {
    const container = document.getElementById('cupRowsContainer');
    if (!container) return;
    const rows     = container.querySelectorAll('.cup-row');
    const showBtn  = rows.length > 1;
    rows.forEach(r => {
        const btn = r.querySelector('button');
        if (btn) btn.style.visibility = showBtn ? 'visible' : 'hidden';
    });
}

/** Close the print info / image upload modal. */
function closePrintInfoModal() {
    const modal = document.getElementById('printInfoModal');
    if (modal) modal.style.display = 'none';
}

/**
 * Scale the print-info modal content to fit the viewport (same pattern as preview).
 */
function scalePrintInfoModal() {
    const inner = document.getElementById('printInfoModalInner');
    if (!inner) return;
    const vw = window.innerWidth  * 0.9;
    const vh = window.innerHeight * 0.9;
    const nw = 560;
    const nh = inner.scrollHeight || 600;
    const scaleX = Math.min(vw / nw, 1);
    const scaleY = Math.min(vh / nh, 1);
    const scale  = Math.min(scaleX, scaleY);
    inner.style.transform       = `scale(${scale})`;
    inner.style.transformOrigin = 'top center';
}

/* ------------------------------------------------------------------ */
/*  Image type selection & file reading                                */
/* ------------------------------------------------------------------ */

/** Current image type being uploaded ('design' | 'mockup') */
let _pendingImageType = null;

/**
 * Open file picker for the given image type.
 * @param {'design'|'mockup'} imageType
 */
function proceedToImageUpload(imageType) {
    _pendingImageType = imageType;
    const input    = document.createElement('input');
    input.type     = 'file';
    input.accept   = 'image/*';
    input.onchange = handleImageUpload;
    input.click();
}

/**
 * Handle file input change event, read image as Data URL.
 * @param {Event} event
 */
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file || !_pendingImageType) return;

    const reader = new FileReader();
    reader.onload = e => {
        uploadedImages[_pendingImageType] = e.target.result;
        updateImageUploadButtons();
        showNotification(`Đã tải ${_pendingImageType === 'design' ? 'file thiết kế' : 'ảnh mockup'}!`);
    };
    reader.readAsDataURL(file);
}

/** Refresh upload button labels based on whether images are loaded. */
function updateImageUploadButtons() {
    const designBtn = document.getElementById('designUploadBtn');
    const mockupBtn = document.getElementById('mockupUploadBtn');
    if (designBtn) designBtn.textContent = uploadedImages.design ? '✓ Đã có thiết kế (đổi)' : '📎 Chọn file thiết kế';
    if (mockupBtn) mockupBtn.textContent = uploadedImages.mockup ? '✓ Đã có mockup (đổi)'   : '📎 Chọn file mockup';
}
