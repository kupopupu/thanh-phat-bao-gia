/**
 * templates/template-finalize.js
 * --------------------------------------------------
 * Generates the HTML string for "Xác nhận mẫu in" (print finalization).
 * Portrait A4. Shows design image + mockup images + print info.
 *
 * Depends on:
 *   state.js        (quoteNumber, uploadedImages)
 *   utils/format.js (escapeHtml)
 * --------------------------------------------------
 */

/**
 * @returns {string}  Inner HTML for the finalize print-approval document
 */
function generateFinalizeHTML() {
    const customerName    = document.getElementById('customerName').value    || 'Chưa nhập';
    const customerPhone   = document.getElementById('customerPhone').value   || '';
    const customerAddress = document.getElementById('customerAddress').value || '';

    // Collect print info fields from the modal
    const cupRows = document.querySelectorAll('#printInfoModal .cup-row');
    let printInfoHTML = '';
    cupRows.forEach(row => {
        const nameEl = row.querySelector('.cup-name-input');
        const qtyEl  = row.querySelector('.cup-qty-input');
        if (nameEl && qtyEl && nameEl.value) {
            printInfoHTML += `
            <div style="display:flex;gap:8px;align-items:center;margin-bottom:4px;font-size:13px;">
                <span style="flex:1;font-weight:500;">${escapeHtml(nameEl.value)}</span>
                <span style="color:#1D75AE;font-weight:700;">${escapeHtml(qtyEl.value)} cái</span>
            </div>`;
        }
    });

    // Design image (full width top)
    const designImgSrc  = uploadedImages.design  || null;
    const mockupImgSrc  = uploadedImages.mockup  || null;

    const designSection = designImgSrc
        ? `<div style="margin-bottom:14px;text-align:center;">
            <div style="font-size:13px;font-weight:700;color:#1D75AE;margin-bottom:6px;">FILE THIẾT KẾ</div>
            <img src="${designImgSrc}" alt="Thiết kế" style="max-width:100%;max-height:260px;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,0.15);" crossorigin="anonymous"/>
           </div>`
        : `<div style="margin-bottom:14px;padding:24px;text-align:center;background:#f1f3f4;border-radius:6px;color:#aaa;font-size:13px;">
            [Chưa có file thiết kế]
           </div>`;

    const mockupSection = mockupImgSrc
        ? `<div style="text-align:center;">
            <div style="font-size:13px;font-weight:700;color:#1D75AE;margin-bottom:6px;">ẢNH MOCKUP</div>
            <img src="${mockupImgSrc}" alt="Mockup" style="max-width:100%;max-height:200px;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,0.15);" crossorigin="anonymous"/>
           </div>`
        : `<div style="padding:20px;text-align:center;background:#f1f3f4;border-radius:6px;color:#aaa;font-size:13px;">
            [Chưa có ảnh mockup]
           </div>`;

    return `
    <div style="font-family:'Be Vietnam Pro','Segoe UI',sans-serif;color:#2c3e50;width:100%;box-sizing:border-box;background:#ffffff;">
      <div style="width:100%;padding:18px 22px;box-sizing:border-box;">

        <!-- Header -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;padding:16px 22px;background:#1D75AE;color:white;border-radius:10px;">
          <div>
            <img src="assets/image/Thanh Phát Trắng.png" alt="Thanh Phát" style="height:52px;object-fit:contain;display:block;margin-bottom:4px;" crossorigin="anonymous"/>
            <div style="font-size:11px;color:rgba(255,255,255,0.9);">0966 767 731 | thanhhien.po24@gmail.com</div>
          </div>
          <div style="text-align:right;">
            <h1 style="margin:0;font-size:34px;font-weight:900;font-style:italic;text-transform:uppercase;">XÁC NHẬN MẪU IN</h1>
            <div style="font-size:12px;margin-top:4px;">BG: ${escapeHtml(quoteNumber)} | ${new Date().toLocaleDateString('vi-VN')}</div>
          </div>
        </div>

        <!-- Customer info -->
        <div style="margin-bottom:14px;padding:10px 14px;background:#f8f9fa;border-radius:8px;border-left:4px solid #1D75AE;font-size:13px;display:flex;gap:20px;flex-wrap:wrap;">
          <div><strong>Khách hàng:</strong> ${escapeHtml(customerName)}</div>
          ${customerPhone   ? `<div><strong>ĐT:</strong> ${escapeHtml(customerPhone)}</div>` : ''}
          ${customerAddress ? `<div><strong>Địa chỉ:</strong> ${escapeHtml(customerAddress)}</div>` : ''}
        </div>

        <!-- 2-col layout: images left, print info right -->
        <div style="display:grid;grid-template-columns:1fr 280px;gap:16px;margin-bottom:14px;">

          <!-- Images -->
          <div>
            ${designSection}
            ${mockupSection}
          </div>

          <!-- Print info -->
          <div style="display:flex;flex-direction:column;gap:12px;">
            <div style="background:#f8f9fa;padding:12px;border-radius:8px;border-left:4px solid #1D75AE;flex:1;">
              <div style="font-weight:700;color:#1D75AE;margin-bottom:8px;font-size:13px;">THÔNG TIN IN ẤN</div>
              ${printInfoHTML || '<div style="font-size:13px;color:#aaa;">Chưa nhập thông tin</div>'}
            </div>

            <!-- Approval box -->
            <div style="background:#fff3cd;border:1px solid #ffc107;padding:12px;border-radius:8px;font-size:13px;">
              <div style="font-weight:700;color:#e67e22;margin-bottom:6px;">⚠ LƯU Ý QUAN TRỌNG</div>
              <div style="color:#666;line-height:1.5;">Vui lòng kiểm tra kỹ thông tin và hình ảnh trước khi xác nhận. Sau khi ký xác nhận, chúng tôi không chịu trách nhiệm về lỗi thiết kế.</div>
            </div>
          </div>

        </div>

        <!-- Signatures -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:14px;">
          <div style="text-align:center;font-size:13px;">
            <div style="font-weight:700;color:#333;margin-bottom:6px;">Bên Thực Hiện</div>
            <div style="height:64px;border-bottom:1px dashed rgba(0,0,0,0.2);margin-bottom:8px;"></div>
            <div style="font-weight:600;">Nguyễn Thanh Hiền</div>
            <div style="color:#888;font-size:12px;">Thanh Phát</div>
          </div>
          <div style="text-align:center;font-size:13px;">
            <div style="font-weight:700;color:#333;margin-bottom:6px;">Khách Hàng Xác Nhận</div>
            <div style="height:64px;border-bottom:1px dashed rgba(0,0,0,0.2);margin-bottom:8px;"></div>
            <div style="font-weight:600;">${escapeHtml(customerName)}</div>
          </div>
        </div>

        <!-- Footer -->
        <div style="margin-top:14px;text-align:center;font-size:12px;color:#1D75AE;border-top:1px solid #dee2e6;padding-top:10px;">
          Cảm ơn quý khách đã tin tưởng sử dụng dịch vụ in ấn Thanh Phát!
        </div>

      </div>
    </div>`;
}
