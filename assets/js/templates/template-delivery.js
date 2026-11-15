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
  const customerName = document.getElementById('customerName').value || 'Chưa nhập';
  const customerPhone = document.getElementById('customerPhone').value || 'Chưa nhập';
  const customerAddress = document.getElementById('customerAddress').value || 'Chưa nhập';

  const _expCtx = window._quoteExportCtx;
  let _isCompletedExport = false;
  if (_expCtx && (_expCtx.orderStatus === 'completed' || _expCtx.paid === true)) {
    _isCompletedExport = true;
  }
  if (!_isCompletedExport) {
    try {
      if (typeof loadSavedQuotes === 'function') loadSavedQuotes();
      const curQ = (window.savedQuotes || []).find(q => q.id === quoteNumber || (window.editingQuoteId && q.id === window.editingQuoteId));
      if (curQ && (curQ.orderStatus === 'completed' || curQ.paid === true || (Number(curQ.receivedAmount) > 0 && Number(curQ.receivedAmount) >= Number(curQ.total)))) {
        _isCompletedExport = true;
      }
    } catch (e) { }
  }

  let stampHTML = '';
  if (_isCompletedExport) {
    let paidDateStr = getQuoteDisplayDate();
    try {
      const curQ = (window.savedQuotes || []).find(q => q.id === quoteNumber || (window.editingQuoteId && q.id === window.editingQuoteId));
      if (curQ && curQ.completedAt) {
        const d = new Date(curQ.completedAt);
        paidDateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      } else if (curQ && (curQ.createdAt || curQ.savedAt)) {
        const d = new Date(curQ.createdAt || curQ.savedAt);
        paidDateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      }
    } catch (e) { }

    stampHTML = `
        <div style="position:absolute;left:50%;top:55%;transform:translate(-50%, -50%) rotate(-12deg);pointer-events:none;z-index:20;user-select:none;">
          <div style="border:3.5px double #dc2626;border-radius:6px;padding:8px 24px;background:transparent;text-align:center;min-width:235px;display:inline-block;box-sizing:border-box;">
            <div style="font-size:12px;font-weight:700;color:#dc2626;letter-spacing:2.5px;text-transform:uppercase;line-height:1.2;">THANH PHÁT</div>
            <div style="font-size:23px;font-weight:900;color:#dc2626;letter-spacing:3px;text-transform:uppercase;line-height:1.25;margin:4px 0;border-top:2px dashed rgba(220,38,38,0.7);border-bottom:2px dashed rgba(220,38,38,0.7);padding:4px 0;">★ ĐÃ THU ĐỦ ★</div>
            <div style="font-size:10.5px;font-weight:700;color:#dc2626;letter-spacing:1.5px;text-transform:uppercase;line-height:1.2;">XÁC NHẬN THANH TOÁN</div>
            <div style="font-size:9.5px;color:#dc2626;margin-top:3px;font-weight:600;">Ngày: ${paidDateStr}</div>
          </div>
        </div>`;
  }

  let itemsHTML = '';
  let itemCount = 0;
  document.querySelectorAll('#itemsBody tr').forEach((row, index) => {
    const nameInp = row.querySelector('.product-name-cell input') || row.cells[1]?.querySelector('input');
    const unitInp = row.querySelector('.unit-cell input') || row.cells[2]?.querySelector('input');
    const qtyInp = row.cells[3]?.querySelector('input');

    const itemName = nameInp?.value || '';
    const unit = unitInp?.value || '';
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
            <div style="font-size:12px;">${getQuoteDisplayDate()}</div>
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
        <div style="margin-bottom:16px;position:relative;">
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
          ${stampHTML}
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
