# Google Sheet "ai đã chuyển khoản" — khoá Làm Chủ Edit Video Bằng AI

Sheet tự lấy tiền VÀO từ SePay, chỉ giữ khoản có nội dung chuyển khoản `SEVQR EDITAI <sđt>` (đúng nội dung mã QR trên ladipage), mỗi khoản 1 dòng, không bị trùng khi chạy lại.

## Cài 1 lần (khoảng 5 phút)
1. Mở Google Sheet → **Tiện ích mở rộng → Apps Script**. Xóa code mẫu, dán toàn bộ `google-apps-script.gs`, bấm **Lưu**.
2. Chọn hàm **setup** → **Chạy** → cho phép quyền Google hỏi (dựng sẵn tab "Đã chuyển khoản").
3. Vào my.sepay.vn → **Cấu hình công ty → API Access** → tạo API token, copy.
4. Apps Script → **Cài đặt dự án (bánh răng) → Thuộc tính tập lệnh → Thêm thuộc tính**:
   - `SEPAY_TOKEN` = token vừa copy
   - (tuỳ chọn) `SEPAY_ACCOUNT` = số tài khoản VietinBank như SePay hiển thị, nếu SePay có nhiều tài khoản
5. Chọn hàm **caiTuDong** → **Chạy**. Từ đó sheet tự cập nhật mỗi 10 phút.

## Cách đọc
- Mỗi dòng = 1 khoản tiền về: giờ, SĐT, số tiền, "Đúng giá?" (so với 990.000đ), nội dung, mã giao dịch.
- Cột **"Đã mời vào nhóm Zalo?"** có ô tick để bạn đánh dấu người đã vào nhóm (trang cũng tự đưa khách vào nhóm khi tiền về).
- Dòng **tô đỏ** = bất thường: thiếu tiền, hoặc không đọc được SĐT — nhắn hỏi khách.
- Sheet chỉ ghi tên theo SĐT vì ladipage chỉ đưa SĐT vào nội dung chuyển khoản; muốn có cả họ tên thì cần thêm bước lưu tên khi khách bấm "lấy mã QR" (nói để làm thêm).
- Tiền thật chỉ tính khi giao dịch hiện trong SePay; khách chuyển sai nội dung sẽ KHÔNG vào sheet này — kiểm tra thêm trong my.sepay.vn.
