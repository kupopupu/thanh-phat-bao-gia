/**
 * templates/template-delivery.js
 * --------------------------------------------------
 * Generates the HTML string for the phiếu giao hàng (delivery note).
 * Landscape A4. No pricing shown.
 *
 * Depends on:
 *   state.js        (quoteNumber)
 *   utils/format.js (escapeHtml)
 *   utils/dom.js    (getCellInputValue)
 * --------------------------------------------------
 */

/**
 * @returns {string}  Inner HTML for A4 landscape delivery note
 */
function generateDeliveryHTML() {
    const customerName    = document.getElementById('customerName').value    || 'Chưa nhập';
    const customerPhone   = document.getElementById('customerPhone').value   || 'Chưa nhập';
    const customerAddress = document.getElementById('customerAddress').value || 'Chưa nhập';

    let itemsHTML = '';
    let itemCount = 0;
    document.querySelectorAll('#itemsBody tr').forEach((row, index) => {
        const nameInp = row.querySelector('.product-name-cell input') || row.cells[1]?.querySelector('input');
        const unitInp = row.querySelector('.unit-cell input')         || row.cells[2]?.querySelector('input');
        const qtyInp  = row.cells[3]?.querySelector('input');

        const itemName = nameInp?.value || '';
        const unit     = unitInp?.value || '';
        const quantity = parseFloat(qtyInp?.value || 0) || 0;

        if (itemName) {
            const rowBg = index % 2 === 0 ? '#ffffff' : '#f8f9fa';
            itemsHTML += `
            <tr style="background:${rowBg};">
                <td style="padding:8px 10px;text-align:center;border-right:1px solid #dee2e6;border-bottom:1px solid #dee2e6;font-size:13px;">${index + 1}</td>
                <td style="padding:8px 10px;border-right:1px solid #dee2e6;border-bottom:1px solid #dee2e6;font-size:13px;font-weight:500;">${escapeHtml(itemName)}</td>
                <td style="padding:8px 10px;text-align:center;border-right:1px solid #dee2e6;border-bottom:1px solid #dee2e6;font-size:13px;">${escapeHtml(unit)}</td>
                <td style="padding:8px 10px;text-align:center;border-right:1px solid #dee2e6;border-bottom:1px solid #dee2e6;font-size:13px;font-weight:600;">${quantity}</td>
                <td style="padding:8px 10px;border-bottom:1px solid #dee2e6;font-size:13px;color:#888;font-style:italic;">OK</td>
            </tr>`;
            itemCount++;
        }
    });

    for (let i = itemCount; i < 10; i++) {
        const rowBg = i % 2 === 0 ? '#ffffff' : '#f8f9fa';
        itemsHTML += `
        <tr style="background:${rowBg};">
            <td style="padding:6px 10px;text-align:center;border-right:1px solid #dee2e6;border-bottom:1px solid #dee2e6;font-size:12px;color:#ccc;">${i + 1}</td>
            <td style="padding:6px 10px;border-right:1px solid #dee2e6;border-bottom:1px solid #dee2e6;height:18px;"></td>
            <td style="padding:6px 10px;border-right:1px solid #dee2e6;border-bottom:1px solid #dee2e6;"></td>
            <td style="padding:6px 10px;border-right:1px solid #dee2e6;border-bottom:1px solid #dee2e6;"></td>
            <td style="padding:6px 10px;border-bottom:1px solid #dee2e6;"></td>
        </tr>`;
    }

    return `
    <div style="font-family:'Be Vietnam Pro','Segoe UI',sans-serif;color:#2c3e50;width:100%;box-sizing:border-box;background:#ffffff;">
      <div style="width:100%;padding:20px 24px;box-sizing:border-box;">

        <!-- Header -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;padding:18px 26px;background:#1D75AE;color:white;border-radius:10px;">
          <div style="display:flex;flex-direction:column;gap:4px;">
            <img src="assets/image/Thanh Phát Trắng.png" alt="Thanh Phát" style="height:60px;object-fit:contain;display:block;" crossorigin="anonymous"/>
            <div style="font-size:12px;color:rgba(255,255,255,0.9);line-height:1.4;">
              <div>0966 767 731 | thanhhien.po24@gmail.com</div>
              <div>Số 114/12 hẻm Quản Cơ Thành, K. Bình Thới 2, P. Bình Đức, An Giang</div>
            </div>
          </div>
          <div style="text-align:right;">
            <h1 style="margin:0;font-size:40px;font-weight:900;font-style:italic;text-transform:uppercase;">PHIẾU GIAO HÀNG</h1>
            <div style="font-size:13px;margin-top:4px;">Số BG: ${escapeHtml(quoteNumber)}</div>
            <div style="font-size:12px;">${new Date().toLocaleDateString('vi-VN')}</div>
          </div>
        </div>

        <!-- Customer info grid -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
          <div style="background:#f8f9fa;padding:12px;border-radius:8px;border-left:4px solid #1D75AE;font-size:13px;">
            <div style="font-weight:700;color:#1D75AE;margin-bottom:6px;">THÔNG TIN KHÁCH HÀNG</div>
            <div><strong>Tên:</strong> ${escapeHtml(customerName)}</div>
            <div><strong>Điện thoại:</strong> ${escapeHtml(customerPhone)}</div>
            <div><strong>Địa chỉ:</strong> ${escapeHtml(customerAddress)}</div>
          </div>
          <div style="background:#f8f9fa;padding:12px;border-radius:8px;border-left:4px solid #28a745;font-size:13px;">
            <div style="font-weight:700;color:#28a745;margin-bottom:6px;">THÔNG TIN GIAO HÀNG</div>
            <div><strong>Ngày giao:</strong> ___________________</div>
            <div><strong>Người giao:</strong> Nguyễn Thanh Hiền</div>
            <div><strong>Trạng thái:</strong> Đã giao đủ hàng □</div>
          </div>
        </div>

        <!-- Items table -->
        <div style="margin-bottom:16px;">
          <table style="width:100%;border-collapse:separate;border-spacing:0;font-size:13px;border-radius:8px;overflow:hidden;">
            <thead>
              <tr style="background:#1D75AE;color:white;">
                <th style="padding:10px 8px;width:6%;text-align:center;border-right:1px solid rgba(255,255,255,0.2);">STT</th>
                <th style="padding:10px 8px;width:55%;border-right:1px solid rgba(255,255,255,0.2);">Tên hàng hóa</th>
                <th style="padding:10px 8px;width:10%;text-align:center;border-right:1px solid rgba(255,255,255,0.2);">ĐVT</th>
                <th style="padding:10px 8px;width:10%;text-align:center;border-right:1px solid rgba(255,255,255,0.2);">Số lượng</th>
                <th style="padding:10px 8px;width:19%;text-align:center;">Xác nhận</th>
              </tr>
            </thead>
            <tbody>${itemsHTML}</tbody>
          </table>
        </div>

        <!-- Signatures -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:14px;">
          <div style="text-align:center;font-size:13px;">
            <div style="font-weight:700;color:#333;margin-bottom:6px;">Người Giao Hàng</div>
            <div style="height:64px;border-bottom:1px dashed rgba(0,0,0,0.2);margin-bottom:8px;"></div>
            <div style="font-weight:600;">Nguyễn Thanh Hiền</div>
          </div>
          <div style="text-align:center;font-size:13px;">
            <div style="font-weight:700;color:#333;margin-bottom:6px;">Người Nhận Hàng</div>
            <div style="height:64px;border-bottom:1px dashed rgba(0,0,0,0.2);margin-bottom:8px;"></div>
            <div style="font-weight:600;">${escapeHtml(customerName)}</div>
          </div>
        </div>

        <!-- Footer -->
        <div style="margin-top:14px;text-align:center;font-size:13px;color:#1D75AE;font-weight:600;border-top:2px solid #1D75AE;padding-top:10px;">
          Cảm ơn quý khách đã tin tưởng sử dụng dịch vụ của Thanh Phát!
        </div>

      </div>
    </div>`;
}
