/**
 * templates/template-quote.js
 * --------------------------------------------------
 * Generates the HTML string for the báo giá (quote) document.
 * Used by both preview and PDF/JPG export.
 *
 * Depends on:
 *   state.js        (quoteNumber, window.depositDisabled)
 *   utils/format.js (formatCurrency, escapeHtml)
 *   utils/dom.js    (getCellInputValue, getPriceThousandsFromRow)
 *   quote/quote-summary.js (computeDepositFromTotal)
 * --------------------------------------------------
 */

/**
 * Full-width portrait A4 quote template (primary template used for PDF & preview).
 * @returns {string}  Inner HTML string for the A4 printable area
 */
function generateQuoteHTMLFullWidth() {
    const customerName    = document.getElementById('customerName').value    || 'Chưa nhập';
    const customerPhone   = document.getElementById('customerPhone').value   || 'Chưa nhập';
    const customerAddress = document.getElementById('customerAddress').value || 'Chưa nhập';

    // Totals – accumulated inside the forEach loop below
    let subtotal = 0;
    let discountAmt = 0;
    const vat = parseFloat(document.getElementById('vat').value) || 0;

    // Rows HTML
    let itemsHTML = '';
    let itemCount = 0;
    document.querySelectorAll('#itemsBody tr').forEach((row, index) => {
      // ── Special: points-redemption row ──
      if (row.getAttribute('data-points-row') === 'true') {
        const totalCell = row.querySelector('.row-total');
        const lineTotal = parseInt(String(totalCell?.dataset.raw || '0').replace(/[^0-9\-]/g, '') || '0', 10) || 0;
        const qty       = parseInt(String(row.cells[3]?.textContent || '0'), 10) || 0;
        if (lineTotal !== 0) {
          subtotal += lineTotal; // lineTotal is negative → reduces total
          const rowBg = index % 2 === 0 ? '#ffffff' : '#f8f9fa';
          itemsHTML += `
        <tr style="background:${rowBg};">
          <td style="padding:8px 10px;text-align:center;border-right:1px solid #e9ecef;font-size:13px;font-weight:500;color:#495057;">${index + 1}</td>
          <td style="padding:8px 10px;border-right:1px solid #e9ecef;font-size:13px;color:#7b5800;font-weight:600;font-style:italic;">Điểm đã tích</td>
          <td style="padding:8px 10px;text-align:center;border-right:1px solid #e9ecef;font-size:13px;color:#495057;">Điểm</td>
          <td style="padding:8px 10px;text-align:center;border-right:1px solid #e9ecef;font-size:13px;font-weight:600;">${qty}</td>
          <td style="padding:8px 10px;text-align:right;border-right:1px solid #e9ecef;font-size:13px;font-weight:600;">1.000đ</td>
          <td style="padding:8px 10px;text-align:right;border-right:1px solid #e9ecef;font-size:13px;color:#adb5bd;">—</td>
          <td style="padding:8px 10px;text-align:right;font-size:13px;color:#c0392b;font-weight:700;">-${new Intl.NumberFormat('vi-VN').format(Math.abs(lineTotal))}đ</td>
        </tr>`;
          itemCount++;
        }
        return; // skip normal row parsing
      }

      const nameInp = row.querySelector('.product-name-cell input') || row.cells[1]?.querySelector('input');
      const unitInp = row.querySelector('.unit-cell input')         || row.cells[2]?.querySelector('input');
      const qtyInp  = row.cells[3]?.querySelector('input');

      const itemName = nameInp?.value || '';
      const unit     = unitInp?.value || '';
      const quantity = parseFloat(qtyInp?.value || 0) || 0;
      const price    = getPriceThousandsFromRow(row) || 0;

      // Determine per-unit discount (prefer the discount input's dataset.raw; fall back to stored row dataset values)
      let discountPerUnit = 0;
      const discInp = row.querySelector('.discount-input');
      if (discInp && discInp.dataset && discInp.dataset.raw != null) {
        discountPerUnit = parseFloat(discInp.dataset.raw) || 0;
      } else if (row.querySelector('.row-total') && row.querySelector('.row-total').dataset && row.querySelector('.row-total').dataset.discRow) {
        const discRowTotal = parseFloat(row.querySelector('.row-total').dataset.discRow) || 0;
        discountPerUnit = quantity > 0 ? (discRowTotal / quantity) : 0;
      } else if (row.dataset && row.dataset.rowDiscount) {
        discountPerUnit = parseFloat(row.dataset.rowDiscount) || 0;
      }

      const effectiveUnit = Math.max(0, price - discountPerUnit);
      const lineTotal = quantity * effectiveUnit;

      // Accumulate totals used in the summary: pre-discount subtotal, and total discount amount
      subtotal += quantity * price;
      discountAmt += quantity * discountPerUnit;

      if (itemName) {
        const rowBg = index % 2 === 0 ? '#ffffff' : '#f8f9fa';
        itemsHTML += `
        <tr style="background:${rowBg};">
          <td style="padding:8px 10px;text-align:center;border-right:1px solid #e9ecef;font-size:13px;font-weight:500;color:#495057;">${index + 1}</td>
          <td style="padding:8px 10px;border-right:1px solid #e9ecef;font-size:13px;color:#2c3e50;font-weight:500;">${escapeHtml(itemName)}</td>
          <td style="padding:8px 10px;text-align:center;border-right:1px solid #e9ecef;font-size:13px;color:#495057;">${escapeHtml(unit)}</td>
          <td style="padding:8px 10px;text-align:center;border-right:1px solid #e9ecef;font-size:13px;font-weight:600;">${quantity}</td>
          <td style="padding:8px 10px;text-align:right;border-right:1px solid #e9ecef;font-size:13px;font-weight:600;">${new Intl.NumberFormat('vi-VN').format(price)}đ</td>
          <td style="padding:8px 10px;text-align:right;border-right:1px solid #e9ecef;font-size:13px;font-weight:600;color:#d46a0a;">${new Intl.NumberFormat('vi-VN').format(discountPerUnit)}đ</td>
          <td style="padding:8px 10px;text-align:right;font-size:13px;color:#1D75AE;font-weight:700;">${new Intl.NumberFormat('vi-VN').format(lineTotal)}đ</td>
        </tr>`;
        itemCount++;
      }
    });

    // Derived totals – computed AFTER forEach has accumulated subtotal/discountAmt
    const afterDisc = subtotal - discountAmt;
    const vatAmt    = afterDisc * (vat / 100);
    const total     = afterDisc + vatAmt;
    const totalVal  = Number(total) || 0;
    const deposit   = computeDepositFromTotal(totalVal);
    const remaining = Math.max(0, Math.round(totalVal - deposit));

    // ── Deposit row (only when exporting a quote confirmed with deposit) ──
    const _expCtx = window._quoteExportCtx;
    const _isDepositedExport = _expCtx && _expCtx.orderStatus === 'deposited' && _expCtx.depositAmount > 0;
    const _exportDepositAmt  = _isDepositedExport ? Math.round(_expCtx.depositAmount) : 0;

    if (_isDepositedExport) {
        const rowBg = itemCount % 2 === 0 ? '#ffffff' : '#f8f9fa';
        itemsHTML += `
        <tr style="background:${rowBg};">
          <td style="padding:8px 10px;text-align:center;border-right:1px solid #e9ecef;font-size:13px;font-weight:500;color:#495057;">${itemCount + 1}</td>
          <td style="padding:8px 10px;border-right:1px solid #e9ecef;font-size:13px;color:#c0392b;font-weight:700;font-style:italic;">Tiền cọc hàng</td>
          <td style="padding:8px 10px;text-align:center;border-right:1px solid #e9ecef;font-size:13px;color:#495057;">Đợt</td>
          <td style="padding:8px 10px;text-align:center;border-right:1px solid #e9ecef;font-size:13px;font-weight:600;">1</td>
          <td style="padding:8px 10px;text-align:right;border-right:1px solid #e9ecef;font-size:13px;font-weight:700;color:#c0392b;">-${new Intl.NumberFormat('vi-VN').format(_exportDepositAmt)}đ</td>
          <td style="padding:8px 10px;text-align:right;border-right:1px solid #e9ecef;font-size:13px;color:#adb5bd;">—</td>
          <td style="padding:8px 10px;text-align:right;font-size:13px;color:#c0392b;font-weight:700;">-${new Intl.NumberFormat('vi-VN').format(_exportDepositAmt)}đ</td>
        </tr>`;
        itemCount++;
    }

    // Padding rows (reduce count by 1 for each extra row injected)
    for (let i = itemCount; i < 10; i++) {
        const rowBg = i % 2 === 0 ? '#ffffff' : '#f8f9fa';
        itemsHTML += `
        <tr style="background:${rowBg};">
          <td style="padding:5px 6px;text-align:center;border-right:1px solid #e9ecef;font-size:10px;color:#adb5bd;">${i + 1}</td>
          <td style="padding:5px 6px;border-right:1px solid #e9ecef;height:16px;"></td>
          <td style="padding:5px 6px;border-right:1px solid #e9ecef;"></td>
          <td style="padding:5px 6px;border-right:1px solid #e9ecef;"></td>
          <td style="padding:5px 6px;border-right:1px solid #e9ecef;"></td>
          <td style="padding:5px 6px;border-right:1px solid #e9ecef;"></td>
          <td style="padding:5px 6px;"></td>
        </tr>`;
    }

    // ── Summary & QR values: adjust when deposit row is injected ──
    const _displayDeposit   = _isDepositedExport ? 0 : deposit;
    const _displayRemaining = _isDepositedExport
        ? Math.max(0, Math.round(totalVal - _exportDepositAmt))
        : remaining;
    const _qrAmount = _isDepositedExport
        ? _displayRemaining
        : (window.depositDisabled ? remaining : deposit);

    const qrCustomerInfo  = (customerName && customerName !== 'Chưa nhập')
        ? customerName + ' thanh toán ' + quoteNumber
        : 'Thanh toán ' + quoteNumber;
    const qrSrc = `https://img.vietqr.io/image/TCB-19038289004015-compact2.png?amount=${_qrAmount}&addInfo=${encodeURIComponent(qrCustomerInfo)}`;

    // Loyalty points: 1 point per 200.000 VND
    // totalPoints = điểm đã ghi nhận từ các đơn COMPLETED (thu đủ tiền)
    let totalPoints = 0;
    try {
      loadSavedQuotes();
      totalPoints = savedQuotes.reduce(function(s, q) {
        try {
            if ((q.customerPhone || '').trim() === (customerPhone || '').trim() &&
            (q.orderStatus || '') === 'completed') {
            return s + Math.floor((Number(q.total) || 0) / 200000);
          }
        } catch (e) {}
        return s;
      }, 0);
    } catch (e) { totalPoints = 0; }

    return `
    <div style="font-family:'Be Vietnam Pro','Segoe UI',Tahoma,Geneva,Verdana,sans-serif;color:#2c3e50;width:100%;padding:0;box-sizing:border-box;">
      <div style="width:100%;max-width:920px;padding:16px;box-sizing:border-box;background:#ffffff;border-radius:6px;">

        <!-- Header -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;padding:18px 26px;background:#1D75AE;color:white;border-radius:10px;">
          <div style="display:flex;flex-direction:column;gap:6px;">
            <img src="assets/image/Thanh Phát Trắng.png" alt="Thanh Phát" style="height:64px;object-fit:contain;display:block;" crossorigin="anonymous"/>
            <div style="font-size:12px;color:rgba(255,255,255,0.95);line-height:1.3;">
              <div>0966 767 731</div>
              <div>thanhhien.po24@gmail.com</div>
              <div>Địa chỉ: Số 114/12 hẻm Quản Cơ Thành, K. Bình Thới 2, P. Bình Đức, An Giang</div>
            </div>
          </div>
          <div style="text-align:right;">
            <h1 style="margin:0;font-size:48px;font-weight:900;font-style:italic;text-transform:uppercase;">BÁO GIÁ</h1>
            <div style="font-size:13px;margin-top:6px;">Số: ${escapeHtml(quoteNumber)}</div>
            <div style="font-size:12px;">${new Date().toLocaleDateString('vi-VN')}</div>
          </div>
        </div>

        <!-- Customer info -->
        <div style="margin-bottom:12px;padding:12px;background:#f8f9fa;border-radius:8px;border-left:5px solid #1D75AE;">
          <div style="font-size:13px;">
            <div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:6px;flex-wrap:wrap;">
              <div style="flex:1;min-width:120px;"><strong>Tên KH:</strong> ${escapeHtml(customerName)}</div>
              <div style="flex:1;min-width:120px;text-align:center;"><strong>ĐT:</strong> ${escapeHtml(customerPhone)}</div>
              <div style="flex:1;min-width:160px;text-align:right;"><strong>Tổng điểm:</strong> ${totalPoints} điểm</div>
            </div>
            <div style="margin-top:4px;display:flex;gap:12px;flex-wrap:wrap;align-items:center;">
              <div style="flex:1;min-width:160px;"><strong>Địa chỉ:</strong> ${escapeHtml(customerAddress)}</div>
              <div style="min-width:160px;text-align:right;font-size:11px;color:#555;font-style:italic;">* bạn sẽ được tích 1 điểm với mỗi 100.000đ sau khi thanh toán</div>
            </div>
          </div>
        </div>

        <!-- Items table -->
        <div style="margin-bottom:12px;">
          <table style="width:100%;border-collapse:separate;border-spacing:0;font-size:15px;border-radius:8px;overflow:hidden;">
            <thead>
              <tr style="background:#1D75AE;color:white;">
                <th style="padding:10px 8px;border:1px solid rgba(255,255,255,0.2);width:6%;font-size:14px;">STT</th>
                <th style="padding:10px 8px;border:1px solid rgba(255,255,255,0.2);width:44%;font-size:14px;">Tên hàng hóa</th>
                <th style="padding:10px 8px;border:1px solid rgba(255,255,255,0.2);width:8%;font-size:14px;">ĐVT</th>
                <th style="padding:10px 8px;border:1px solid rgba(255,255,255,0.2);width:6%;font-size:14px;">SL</th>
                <th style="padding:10px 8px;border:1px solid rgba(255,255,255,0.2);width:12%;font-size:14px;">Đơn giá</th>
                <th style="padding:10px 8px;border:1px solid rgba(255,255,255,0.2);width:8%;font-size:14px;">Chiết khấu</th>
                <th style="padding:10px 8px;border:1px solid rgba(255,255,255,0.2);width:16%;font-size:14px;">Thành tiền</th>
              </tr>
            </thead>
            <tbody>${itemsHTML}</tbody>
          </table>
        </div>

        <!-- Payment + Totals -->
        <div style="margin-top:20px;display:flex;gap:16px;align-items:flex-start;">
          <!-- QR + bank info -->
          <div style="flex:1.6;background:#FFFFFF;padding:14px;border-radius:8px;display:flex;gap:4px;align-items:stretch;border:1px solid #e0e8f0;">
            <div style="display:flex;align-items:center;justify-content:center;">
              <img src="${qrSrc}" alt="QR" style="max-width:200px;max-height:290px;width:auto;height:auto;display:block;" crossorigin="anonymous" onerror="this.src='assets/image/Mã QR Techcombank-02.png'"/>
            </div>
            <div style="flex:1;font-size:14px;color:#333;line-height:1.5;padding-left:8px;">
              <div style="font-weight:700;color:#1D75AE;margin-bottom:6px;">THÔNG TIN CHUYỂN KHOẢN</div>
              <div><strong>Ngân hàng:</strong> TechcomBank</div>
              <div><strong>Số tài khoản:</strong> 19038289004015</div>
              <div><strong>Chủ tài khoản:</strong> Nguyễn Thanh Hiền</div>
              <div><strong>Nội dung:</strong> ${escapeHtml(qrCustomerInfo)}</div>
            </div>
          </div>

          <!-- Totals box -->
          <div style="flex:0.9;background:#1D75AE;color:white;padding:18px;border-radius:8px;display:flex;flex-direction:column;gap:8px;min-width:200px;">
            <div style="width:100%;display:flex;justify-content:space-between;font-size:13px;"><span>Tổng tiền hàng:</span><span>${formatCurrency(subtotal)}</span></div>
            <div style="width:100%;display:flex;justify-content:space-between;font-size:13px;"><span>Chiết khấu:</span><span>-${formatCurrency(discountAmt)}</span></div>
            <div style="width:100%;display:flex;justify-content:space-between;font-size:13px;"><span>VAT (${vat}%):</span><span>${formatCurrency(vatAmt)}</span></div>
            <div style="width:100%;border-top:1px solid rgba(255,255,255,0.25);padding-top:8px;display:flex;justify-content:space-between;font-size:15px;font-weight:800;"><span>TỔNG:</span><span>${formatCurrency(total)}</span></div>
            <div style="width:100%;display:flex;justify-content:space-between;font-size:13px;"><span>${_isDepositedExport ? 'Tiền cọc' : (window.depositDisabled ? 'Cọc' : 'Cọc (40%)')}:</span><span>${_isDepositedExport ? '0đ' : formatCurrency(_displayDeposit)}</span></div>
            <div style="width:100%;display:flex;justify-content:space-between;font-size:13px;"><span>${_isDepositedExport ? 'Còn lại' : (window.depositDisabled ? 'Còn lại' : 'Còn lại (60%)')}:</span><span>${formatCurrency(_displayRemaining)}</span></div>
          </div>
        </div>

        <!-- Notes + Signature -->
        <div style="margin-top:12px;display:flex;gap:16px;align-items:flex-start;">
          <div style="flex:1.6;font-size:15px;color:#333;padding:8px;">
            <div style="font-weight:700;color:#1D75AE;margin-bottom:6px;">LƯU Ý</div>
            <div>- Giá đã bao gồm in ấn và MIỄN PHÍ vận chuyển.</div>
            <div>- Thời gian giao hàng: 4-7 ngày làm việc.</div>
            <div>- Báo giá có hiệu lực trong 7 ngày.</div>
            <div>- Mỗi điểm quy đổi ra 1.000đ.</div>
            <div>- Tích điểm chỉ được khấu trừ trực tiếp vào đơn hàng không được quy đổi ra tiền mặt.</div>
            <div>- Mỗi báo giá quy đổi tối thiểu 50 điểm và tối đa 100 điểm.</div>
          </div>
          <div style="flex:0.9;text-align:center;font-size:13px;color:#333;">
            <div style="font-weight:700;color:#1D75AE;margin-bottom:6px;">Người Lập Báo Giá</div>
            <div style="height:80px;border-bottom:1px dashed rgba(0,0,0,0.15);margin-bottom:8px;"></div>
            <div style="font-weight:700;">Nguyễn Thanh Hiền</div>
          </div>
        </div>

        <!-- Footer -->
        <div style="width:100%;margin-top:18px;">
          <hr style="border:none;border-top:2px solid #1D75AE;margin:0 0 10px 0;"/>
          <div style="text-align:center;font-size:14px;color:#1D75AE;font-weight:700;line-height:1.6;">
            <div>Nếu có bất kỳ điều gì khiến quý khách không hài lòng xin hãy liên hệ để được giải quyết,</div>
            <div style="font-size:16px;letter-spacing:1px;">Cảm ơn quý khách đã sử dụng dịch vụ!</div>
          </div>
        </div>

      </div>
    </div>`;
}

