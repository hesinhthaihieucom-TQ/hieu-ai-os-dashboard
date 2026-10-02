# Nối form đăng ký với Google Sheet

## Cập nhật giao diện sheet mới (làm 1 lần, ~2 phút)
1. Mở Google Sheet "Em Xinh Ween Đỉnh – Đăng ký" → **Tiện ích mở rộng → Apps Script**.
2. Xóa hết code cũ, dán toàn bộ nội dung file `google-apps-script.gs` (bản mới), bấm **Lưu**.
3. Chọn hàm **setup** ở thanh trên → bấm **Chạy**. Lần đầu Google hỏi quyền → cho phép.
   Sheet sẽ tự dựng lại: tab **Tổng quan** (thẻ số liệu + biểu đồ) và 3 tab **Series A / Series B / KOL** (màu riêng, ảnh thu nhỏ, danh sách trạng thái). Dữ liệu đăng ký đã có được giữ nguyên.
4. **Triển khai → Quản lý các bản triển khai → biểu tượng bút chì → Phiên bản: Phiên bản mới → Triển khai**. Link `/exec` giữ nguyên, không cần đổi gì ở ladipage.

## Cách dùng hằng ngày
- Mỗi lượt đăng ký là 1 dòng ở tab của đúng bảng thi đấu, kèm ảnh thiệp / ảnh chuyển khoản thu nhỏ (bấm "Mở thiệp" / "Mở CK" để xem ảnh lớn).
- Cột **Trạng thái**: Chờ xác nhận → Đã nhận phí → Đã xác nhận (hoặc Hủy). Ô tự đổi màu, tab Tổng quan tự cập nhật số liệu và tiền đã thu.
- Hình lưu trong thư mục Drive `EmXinh_WeenDinh_HinhDangKy`.
