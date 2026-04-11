# Ghi chú chỉnh sửa — 2026-04-05

Tình trạng: Tạm dừng chỉnh sửa theo yêu cầu.

## Tóm tắt các thay đổi gần đây
- `assets/js/templates/template-quote.js`:
  - Thêm cột **Chiết khấu** (sau cột Đơn giá) trong mẫu xuất/Xem trước.
  - Giảm chiều rộng cột `Tên hàng hóa` để nhường chỗ cho cột chiết khấu.
  - Tính toán tổng dựa trên giá gốc và chiết khấu trên mỗi dòng (subtotal, tổng chiết khấu, VAT, tổng).

## Các file đáng chú ý đã chỉnh sửa (đã làm trước đó hoặc trong phiên này)
- `assets/js/templates/template-quote.js`
- `assets/js/quote/quote-table.js` (logic chiết khấu dòng, dataset.raw, auto-scroll khi thêm hàng)
- `assets/js/quote/quote-summary.js` (tổng hợp chiết khấu dòng và cập nhật summary)
- `assets/js/quote/quote-core.js` (lưu/khôi phục giá và chiết khấu dòng, VAT mặc định = 0)
- `assets/js/export/export-jpg.js` (xuất JPG không flash preview)
- `assets/css/table.css` (điều chỉnh kích thước ô `ĐVT`/`SL`/input)

## Ghi chú kỹ thuật ngắn
- Giá tiền được lưu dưới dạng số nguyên VND trong `dataset.raw` để tránh lỗi parsing định dạng tiếng Việt.
- Chiết khấu hiện là giá trên mỗi đơn vị (đơn vị VND) trên từng hàng; công thức dòng: `Số lượng * (Đơn giá - Chiết khấu)`.
- VAT mặc định đã chuyển về `0%` cho báo giá mới.

## Việc tiếp theo (khi tiếp tục)
1. Kiểm tra preview và xuất JPG để xác nhận cột Chiết khấu hiển thị đúng.
2. Tinh chỉnh chiều rộng cột & CSS nếu cần (người dùng chọn số px mong muốn).
3. Chạy kiểm tra với dữ liệu đã lưu (localStorage) để đảm bảo migration không phá dữ liệu cũ.

---

Nếu bạn muốn tôi lưu thêm log chi tiết từng thay đổi (diff/commit-like) vào cùng thư mục, tôi có thể tạo thêm `CHANGELOG.md` hoặc copy các diff vào `docs/patches/`.
