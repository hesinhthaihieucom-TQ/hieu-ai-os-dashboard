# Nối form đăng ký với Google Sheet (làm 1 lần, ~3 phút)

1. Mở Google Sheet "Em Xinh Ween Đỉnh – Đăng ký".
2. Menu **Tiện ích mở rộng → Apps Script**.
3. Xóa code mẫu, dán toàn bộ nội dung file `google-apps-script.gs` vào, bấm **Lưu**.
4. Bấm **Triển khai → Tùy chọn triển khai mới** → loại **Ứng dụng web**:
   - Thực thi bằng: **Tôi**
   - Người có quyền truy cập: **Bất kỳ ai**
   - Bấm **Triển khai**, cho phép các quyền Google hỏi (Sheets + Drive).
5. Copy **URL ứng dụng web** (đuôi `/exec`) gửi cho Claude, hoặc dán vào biến `SHEET_ENDPOINT` ở cuối `index.html`.

Mỗi lượt đăng ký sẽ thành 1 dòng mới: thời gian, tên, SĐT, bảng, đồng đội, phí áp dụng (490K/590K theo ngày), link hình thiệp, link hình chuyển khoản, cột Trạng thái (chọn Chờ xác nhận / Đã nhận phí / Đã xác nhận / Hủy). Hình lưu trong thư mục Drive `EmXinh_WeenDinh_HinhDangKy`.
