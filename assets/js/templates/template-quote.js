/**
 * templates/template-quote.js
 * --------------------------------------------------
 * Generates the HTML string for the báo giá (quote) document.
 * Used by both preview and PDF/JPG export.
 *
 * Depends on:
 *   state.js        (quoteNumber, window.depositDisabled)
 *   utils/format.js (formatCurrency, escapeHtml, getQuoteDisplayDate)
 *   utils/dom.js    (getCellInputValue, getPriceThousandsFromRow)
 *   quote/quote-summary.js (computeDepositFromTotal)
 * --------------------------------------------------
 */

/**
 * Full-width portrait A4 quote template (primary template used for PDF & preview).
 * Automatically adjusts layout scaling according to item count so content never gets cut off.
 * @returns {string}  Inner HTML string for the A4 printable area
 */
function generateQuoteHTMLFullWidth() {
    const customerName    = document.getElementById('customerName').value    || 'Chưa nhập';
    const customerPhone   = document.getElementById('customerPhone').value   || 'Chưa nhập';
    const customerAddress = document.getElementById('customerAddress').value || 'Chưa nhập';

    let subtotal = 0;
    let discountAmt = 0;
    const vat = parseFloat(document.getElementById('vat').value) || 0;

    // Count valid items first to compute dynamic scaling
    let itemCount = 0;
    const rows = document.querySelectorAll('#itemsBody tr');
    rows.forEach((row) => {
      if (row.getAttribute('data-points-row') === 'true') {
        const qty = parseInt(String(row.cells[3]?.textContent || '0').replace(/[^0-9]/g, ''), 10) || 0;
        if (qty > 0) itemCount++;
        return;
      }
      const nameInp = row.querySelector('.product-name-cell input') || row.cells[1]?.querySelector('input');
      if (nameInp?.value) itemCount++;
    });

    const _expCtx = window._quoteExportCtx;
    const _isDepositedExport = _expCtx && _expCtx.orderStatus === 'deposited' && _expCtx.depositAmount > 0;
    const _exportDepositAmt  = _isDepositedExport ? Math.round(_expCtx.depositAmount) : 0;
    if (_isDepositedExport) itemCount++; // include deposit row

    // Fixed layout for 15 product rows to fit 1 A4 page perfectly with generous spacing & large QR
    const totalRows = itemCount;
    let headerPadding = '14px 22px';
    let logoHeight = '52px';
    let titleFontSize = '40px';
    let sectionMargin = '10px';
    let custPadding = '10px 14px';
    let custFontSize = '12px';
    let thPadding = '8px 8px';
    let thFontSize = '13px';
    let tdPadding = '5.5px 8px';
    let tdFontSize = '11.5px';
    let qrMaxH = '190px';
    let totalsPadding = '12px 14px';
    let totalsFontSize = '12px';
    let totalsTitleFontSize = '14px';
    let notesFontSize = '11px';
    let notesLineHeight = '1.4';
    let sigHeight = '45px';
    let footerMargin = '10px';
    let footerFontSize = '12.5px';
    let footerSubFontSize = '14px';

    if (totalRows > 15) {
        headerPadding = '8px 14px';
        logoHeight = '36px';
        titleFontSize = '28px';
        sectionMargin = '4px';
        custPadding = '5px 8px';
        custFontSize = '10px';
        thPadding = '4px 4px';
        thFontSize = '10.5px';
        tdPadding = '2px 4px';
        tdFontSize = '9.5px';
        qrMaxH = '90px';
        totalsPadding = '6px 8px';
        totalsFontSize = '9.5px';
        totalsTitleFontSize = '11px';
        notesFontSize = '8.5px';
        notesLineHeight = '1.25';
        sigHeight = '22px';
        footerMargin = '4px';
        footerFontSize = '10px';
        footerSubFontSize = '11px';
    }

    // Rows HTML
    let itemsHTML = '';
    let currIndex = 0;
    rows.forEach((row) => {
      // ── Special: points-redemption row ──
      if (row.getAttribute('data-points-row') === 'true') {
        const totalCell = row.querySelector('.row-total');
        const qty       = parseInt(String(row.cells[3]?.textContent || '0').replace(/[^0-9]/g, ''), 10) || 0;
        let lineTotal   = 0;
        if (totalCell) {
          const rawVal = totalCell.dataset ? totalCell.dataset.raw : null;
          if (rawVal != null && rawVal !== '') {
            lineTotal = parseInt(String(rawVal), 10) || 0;
          } else {
            const textVal = String(totalCell.textContent || '').replace(/[^0-9\-]/g, '');
            lineTotal = parseInt(textVal, 10) || 0;
          }
        }
        if (lineTotal === 0 && qty > 0) {
          lineTotal = -(qty * 1000);
        }

        if (lineTotal !== 0) {
          subtotal += lineTotal;
          const rowBg = currIndex % 2 === 0 ? '#ffffff' : '#f8f9fa';
          itemsHTML += `
        <tr style="background:${rowBg};">
          <td style="padding:${tdPadding};text-align:center;border-right:1px solid #e9ecef;font-size:${tdFontSize};font-weight:500;color:#495057;">${currIndex + 1}</td>
          <td style="padding:${tdPadding};border-right:1px solid #e9ecef;font-size:${tdFontSize};color:#7b5800;font-weight:600;font-style:italic;">Khấu trừ điểm thưởng</td>
          <td style="padding:${tdPadding};text-align:center;border-right:1px solid #e9ecef;font-size:${tdFontSize};color:#495057;">Điểm</td>
          <td style="padding:${tdPadding};text-align:center;border-right:1px solid #e9ecef;font-size:${tdFontSize};font-weight:600;">${qty}</td>
          <td style="padding:${tdPadding};text-align:right;border-right:1px solid #e9ecef;font-size:${tdFontSize};font-weight:600;">1.000đ</td>
          <td style="padding:${tdPadding};text-align:right;border-right:1px solid #e9ecef;font-size:${tdFontSize};color:#adb5bd;">—</td>
          <td style="padding:${tdPadding};text-align:right;font-size:${tdFontSize};color:#c0392b;font-weight:700;">-${new Intl.NumberFormat('vi-VN').format(Math.abs(lineTotal))}đ</td>
        </tr>`;
          currIndex++;
        }
        return;
      }

      const nameInp = row.querySelector('.product-name-cell input') || row.cells[1]?.querySelector('input');
      const unitInp = row.querySelector('.unit-cell input')         || row.cells[2]?.querySelector('input');
      const qtyInp  = row.cells[3]?.querySelector('input');

      const itemName = nameInp?.value || '';
      const unit     = unitInp?.value || '';
      const quantity = parseFloat(qtyInp?.value || 0) || 0;
      const price    = getPriceThousandsFromRow(row) || 0;

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

      subtotal += quantity * price;
      discountAmt += quantity * discountPerUnit;

      if (itemName) {
        const rowBg = currIndex % 2 === 0 ? '#ffffff' : '#f8f9fa';
        itemsHTML += `
        <tr style="background:${rowBg};">
          <td style="padding:${tdPadding};text-align:center;border-right:1px solid #e9ecef;font-size:${tdFontSize};font-weight:500;color:#495057;">${currIndex + 1}</td>
          <td style="padding:${tdPadding};border-right:1px solid #e9ecef;font-size:${tdFontSize};color:#2c3e50;font-weight:500;">${escapeHtml(itemName)}</td>
          <td style="padding:${tdPadding};text-align:center;border-right:1px solid #e9ecef;font-size:${tdFontSize};color:#495057;">${escapeHtml(unit)}</td>
          <td style="padding:${tdPadding};text-align:center;border-right:1px solid #e9ecef;font-size:${tdFontSize};font-weight:600;">${quantity}</td>
          <td style="padding:${tdPadding};text-align:right;border-right:1px solid #e9ecef;font-size:${tdFontSize};font-weight:600;">${new Intl.NumberFormat('vi-VN').format(price)}đ</td>
          <td style="padding:${tdPadding};text-align:right;border-right:1px solid #e9ecef;font-size:${tdFontSize};font-weight:600;color:#d46a0a;">${new Intl.NumberFormat('vi-VN').format(discountPerUnit)}đ</td>
          <td style="padding:${tdPadding};text-align:right;font-size:${tdFontSize};color:#1D75AE;font-weight:700;">${new Intl.NumberFormat('vi-VN').format(lineTotal)}đ</td>
        </tr>`;
        currIndex++;
      }
    });

    // Derived totals
    const afterDisc = subtotal - discountAmt;
    const vatAmt    = afterDisc * (vat / 100);
    const total     = afterDisc + vatAmt;
    const totalVal  = Number(total) || 0;
    const deposit   = computeDepositFromTotal(totalVal);
    const remaining = Math.max(0, Math.round(totalVal - deposit));

    // ── Deposit row ──
    if (_isDepositedExport) {
        const rowBg = currIndex % 2 === 0 ? '#ffffff' : '#f8f9fa';
        itemsHTML += `
        <tr style="background:${rowBg};">
          <td style="padding:${tdPadding};text-align:center;border-right:1px solid #e9ecef;font-size:${tdFontSize};font-weight:500;color:#495057;">${currIndex + 1}</td>
          <td style="padding:${tdPadding};border-right:1px solid #e9ecef;font-size:${tdFontSize};color:#c0392b;font-weight:700;font-style:italic;">Tiền cọc hàng</td>
          <td style="padding:${tdPadding};text-align:center;border-right:1px solid #e9ecef;font-size:${tdFontSize};color:#495057;">Đợt</td>
          <td style="padding:${tdPadding};text-align:center;border-right:1px solid #e9ecef;font-size:${tdFontSize};font-weight:600;">1</td>
          <td style="padding:${tdPadding};text-align:right;border-right:1px solid #e9ecef;font-size:${tdFontSize};font-weight:700;color:#c0392b;">-${new Intl.NumberFormat('vi-VN').format(_exportDepositAmt)}đ</td>
          <td style="padding:${tdPadding};text-align:right;border-right:1px solid #e9ecef;font-size:${tdFontSize};color:#adb5bd;">—</td>
          <td style="padding:${tdPadding};text-align:right;font-size:${tdFontSize};color:#c0392b;font-weight:700;">-${new Intl.NumberFormat('vi-VN').format(_exportDepositAmt)}đ</td>
        </tr>`;
        currIndex++;
    }

    // Padding rows (always pad to at least 15 rows for consistent A4 fill)
    const minRows = 15;
    for (let i = currIndex; i < minRows; i++) {
        const rowBg = i % 2 === 0 ? '#ffffff' : '#f8f9fa';
        itemsHTML += `
        <tr style="background:${rowBg};">
          <td style="padding:${tdPadding};text-align:center;border-right:1px solid #e9ecef;font-size:10px;color:#adb5bd;">${i + 1}</td>
          <td style="padding:${tdPadding};border-right:1px solid #e9ecef;height:22px;"></td>
          <td style="padding:${tdPadding};border-right:1px solid #e9ecef;"></td>
          <td style="padding:${tdPadding};border-right:1px solid #e9ecef;"></td>
          <td style="padding:${tdPadding};border-right:1px solid #e9ecef;"></td>
          <td style="padding:${tdPadding};border-right:1px solid #e9ecef;"></td>
          <td style="padding:${tdPadding};"></td>
        </tr>`;
    }

    // ── Summary & QR values ──
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

    let totalPoints = 0;
    try {
      loadSavedQuotes();
      totalPoints = savedQuotes.reduce(function(s, q) {
        try {
            if ((q.customerPhone || '').trim() === (customerPhone || '').trim()) {
                let earned = 0;
                if ((q.orderStatus || '') === 'completed') {
                    earned = Math.floor((Number(q.total) || 0) / 200000);
                }
                const used = Number(q.pointsUsed) || 0;
                return s + (earned - used);
            }
        } catch (e) {}
        return s;
      }, 0);
      if (totalPoints < 0) totalPoints = 0;
    } catch (e) { totalPoints = 0; }

    return `
    <div style="font-family:'Be Vietnam Pro','Segoe UI',Tahoma,Geneva,Verdana,sans-serif;color:#2c3e50;width:100%;height:100%;padding:0;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;">
      <div style="width:100%;height:100%;padding:12px;box-sizing:border-box;background:#ffffff;border-radius:6px;display:flex;flex-direction:column;justify-content:space-between;flex:1;">

        <!-- Header -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:${sectionMargin};padding:${headerPadding};background:#1D75AE;color:white;border-radius:10px;">
          <div style="display:flex;flex-direction:column;gap:4px;">
            <img src="assets/image/Thanh Phát Trắng.png" alt="Thanh Phát" style="height:${logoHeight};object-fit:contain;display:block;" crossorigin="anonymous"/>
            <div style="font-size:11px;color:rgba(255,255,255,0.95);line-height:1.3;">
              <div>0966 767 731</div>
              <div>thanhhien.po24@gmail.com</div>
              <div>Địa chỉ: Số 114/12 hẻm Quản Cơ Thành, K. Bình Thới 2, P. Bình Đức, An Giang</div>
            </div>
          </div>
          <div style="text-align:right;">
            <h1 style="margin:0;font-size:${titleFontSize};font-weight:900;font-style:italic;text-transform:uppercase;">BÁO GIÁ</h1>
            <div style="font-size:12px;margin-top:4px;">Số: ${escapeHtml(quoteNumber)}</div>
            <div style="font-size:11px;">${getQuoteDisplayDate()}</div>
          </div>
        </div>

        <!-- Customer info -->
        <div style="margin-bottom:${sectionMargin};padding:${custPadding};background:#f8f9fa;border-radius:8px;border-left:4px solid #1D75AE;">
          <div style="font-size:${custFontSize};">
            <div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:4px;flex-wrap:wrap;">
              <div style="flex:1;min-width:120px;"><strong>Tên KH:</strong> ${escapeHtml(customerName)}</div>
              <div style="flex:1;min-width:120px;text-align:center;"><strong>ĐT:</strong> ${escapeHtml(customerPhone)}</div>
              <div style="flex:1;min-width:160px;text-align:right;"><strong>Tổng điểm:</strong> ${totalPoints} điểm</div>
            </div>
            <div style="margin-top:2px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
              <div style="flex:1;min-width:160px;"><strong>Địa chỉ:</strong> ${escapeHtml(customerAddress)}</div>
              <div style="min-width:160px;text-align:right;font-size:10px;color:#555;font-style:italic;">* bạn sẽ được tích 1 điểm với mỗi 200.000đ sau khi thanh toán</div>
            </div>
          </div>
        </div>

        <!-- Items table -->
        <div style="margin-bottom:${sectionMargin};">
          <table style="width:100%;border-collapse:separate;border-spacing:0;font-size:${tdFontSize};border-radius:8px;overflow:hidden;">
            <thead>
              <tr style="background:#1D75AE;color:white;">
                <th style="padding:${thPadding};border:1px solid rgba(255,255,255,0.2);width:6%;font-size:${thFontSize};">STT</th>
                <th style="padding:${thPadding};border:1px solid rgba(255,255,255,0.2);width:44%;font-size:${thFontSize};">Tên hàng hóa</th>
                <th style="padding:${thPadding};border:1px solid rgba(255,255,255,0.2);width:8%;font-size:${thFontSize};">ĐVT</th>
                <th style="padding:${thPadding};border:1px solid rgba(255,255,255,0.2);width:6%;font-size:${thFontSize};">SL</th>
                <th style="padding:${thPadding};border:1px solid rgba(255,255,255,0.2);width:12%;font-size:${thFontSize};">Đơn giá</th>
                <th style="padding:${thPadding};border:1px solid rgba(255,255,255,0.2);width:8%;font-size:${thFontSize};">Chiết khấu</th>
                <th style="padding:${thPadding};border:1px solid rgba(255,255,255,0.2);width:16%;font-size:${thFontSize};">Thành tiền</th>
              </tr>
            </thead>
            <tbody>${itemsHTML}</tbody>
          </table>
        </div>

        <!-- Payment + Totals -->
        <div style="margin-top:${sectionMargin};display:flex;gap:12px;align-items:flex-start;">
          <!-- QR + bank info -->
          <div style="flex:1.5;background:#FFFFFF;padding:10px;border-radius:8px;display:flex;gap:6px;align-items:center;border:1px solid #e0e8f0;">
            <div style="display:flex;align-items:center;justify-content:center;">
              <img src="${qrSrc}" alt="QR" style="max-width:210px;max-height:${qrMaxH};width:auto;height:auto;display:block;" crossorigin="anonymous" onerror="this.src='assets/image/Mã QR Techcombank-02.png'"/>
            </div>
            <div style="flex:1;font-size:${custFontSize};color:#333;line-height:1.4;padding-left:4px;">
              <div style="font-weight:700;color:#1D75AE;margin-bottom:4px;">THÔNG TIN CHUYỂN KHOẢN</div>
              <div><strong>Ngân hàng:</strong> TechcomBank</div>
              <div><strong>Số tài khoản:</strong> 19038289004015</div>
              <div><strong>Chủ tài khoản:</strong> Nguyễn Thanh Hiền</div>
              <div><strong>Nội dung:</strong> ${escapeHtml(qrCustomerInfo)}</div>
            </div>
          </div>

          <!-- Totals box -->
          <div style="flex:1;background:#1D75AE;color:white;padding:${totalsPadding};border-radius:8px;display:flex;flex-direction:column;gap:6px;min-width:190px;">
            <div style="width:100%;display:flex;justify-content:space-between;font-size:${totalsFontSize};"><span>Tổng tiền hàng:</span><span>${formatCurrency(subtotal)}</span></div>
            <div style="width:100%;display:flex;justify-content:space-between;font-size:${totalsFontSize};"><span>Chiết khấu:</span><span>-${formatCurrency(discountAmt)}</span></div>
            <div style="width:100%;display:flex;justify-content:space-between;font-size:${totalsFontSize};"><span>VAT (${vat}%):</span><span>${formatCurrency(vatAmt)}</span></div>
            <div style="width:100%;border-top:1px solid rgba(255,255,255,0.25);padding-top:6px;display:flex;justify-content:space-between;font-size:${totalsTitleFontSize};font-weight:800;"><span>TỔNG:</span><span>${formatCurrency(total)}</span></div>
            <div style="width:100%;display:flex;justify-content:space-between;font-size:${totalsFontSize};"><span>${_isDepositedExport ? 'Tiền cọc' : (window.depositDisabled ? 'Cọc' : 'Cọc (40%)')}:</span><span>${_isDepositedExport ? '0đ' : formatCurrency(_displayDeposit)}</span></div>
            <div style="width:100%;display:flex;justify-content:space-between;font-size:${totalsFontSize};"><span>${_isDepositedExport ? 'Còn lại' : (window.depositDisabled ? 'Còn lại' : 'Còn lại (60%)')}:</span><span>${formatCurrency(_displayRemaining)}</span></div>
          </div>
        </div>

        <!-- Notes + Signature -->
        <div style="margin-top:${sectionMargin};display:flex;gap:12px;align-items:flex-start;">
          <div style="flex:1.5;font-size:${notesFontSize};color:#333;padding:4px;line-height:${notesLineHeight};">
            <div style="font-weight:700;color:#1D75AE;margin-bottom:4px;">LƯU Ý</div>
            <div>- Giá đã bao gồm in ấn và MIỄN PHÍ vận chuyển.</div>
            <div>- Thời gian giao hàng: 4-7 ngày làm việc.</div>
            <div>- Báo giá có hiệu lực trong 7 ngày.</div>
            <div>- Mỗi điểm quy đổi ra 1.000đ.</div>
            <div>- Tích điểm chỉ được khấu trừ trực tiếp vào đơn hàng không quy đổi ra tiền mặt.</div>
            <div>- Mỗi báo giá quy đổi tối thiểu 50 điểm và tối đa 100 điểm.</div>
          </div>
          <div style="flex:1;text-align:center;font-size:${totalsFontSize};color:#333;">
            <div style="font-weight:700;color:#1D75AE;margin-bottom:4px;">Người Lập Báo Giá</div>
            <div style="height:${sigHeight};border-bottom:1px dashed rgba(0,0,0,0.15);margin-bottom:6px;"></div>
            <div style="font-weight:700;">Nguyễn Thanh Hiền</div>
          </div>
        </div>

        <!-- Footer -->
        <div style="width:100%;margin-top:${footerMargin};">
          <hr style="border:none;border-top:2px solid #1D75AE;margin:0 0 6px 0;"/>
          <div style="text-align:center;font-size:${footerFontSize};color:#1D75AE;font-weight:700;line-height:1.4;">
            <div>Nếu có bất kỳ điều gì khiến quý khách không hài lòng xin hãy liên hệ để được giải quyết,</div>
            <div style="font-size:${footerSubFontSize};letter-spacing:0.5px;">Cảm ơn quý khách đã sử dụng dịch vụ!</div>
          </div>
        </div>

      </div>
    </div>`;
}
