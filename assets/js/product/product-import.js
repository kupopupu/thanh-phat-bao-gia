/**
 * product/product-import.js
 * --------------------------------------------------
 * Handles importing a product list from an Excel (.xlsx) file
 * and populating the global productList array.
 *
 * Depends on: state.js (currentQuoteType, productList),
 *             ui/notification.js (showNotification)
 * Requires:   SheetJS (XLSX) loaded before this file.
 * --------------------------------------------------
 */

/**
 * Called by the hidden #productXlsx file-input's onchange.
 * Only active when quote type is 'cup'.
 * Parses columns: [Tên hàng hóa, ĐVT, Đơn giá]
 */
function handleProductXlsx(event) {
    // Guard: only allow for in-ly quotes
    if (typeof currentQuoteType !== 'undefined' && currentQuoteType !== 'cup') {
        alert('⚠️ Import sản phẩm chỉ dành cho chế độ In Ly. Hãy chuyển sang In Ly rồi thử lại.');
        event.target.value = '';
        return;
    }

    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data      = new Uint8Array(e.target.result);
            const workbook  = XLSX.read(data, { type: 'array' });
            const sheet     = workbook.Sheets[workbook.SheetNames[0]];
            const json      = XLSX.utils.sheet_to_json(sheet, { header: 1 });

            productList = [];
            for (let i = 1; i < json.length; i++) {
                const row = json[i];
                if (!row || !row[0]) continue;
                productList.push({
                    name:  String(row[0]).trim(),
                    unit:  row[1] ? String(row[1]).trim() : '',
                    price: row[2] ? parseFloat(String(row[2]).replace(/,/g, '')) || 0 : 0,
                });
            }
            showNotification('✅ Đã tải ' + productList.length + ' sản phẩm từ Excel');
        } catch (err) {
            console.error('Error parsing product xlsx', err);
            alert('❌ Không thể đọc file sản phẩm. Hãy kiểm tra định dạng Excel.');
        }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = ''; // allow re-selecting the same file
}
