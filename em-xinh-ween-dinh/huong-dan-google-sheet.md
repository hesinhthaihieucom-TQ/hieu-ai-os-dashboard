# Google Sheet đăng ký Em Xinh Ween Đỉnh

## Cập nhật script (mỗi khi có bản mới)
1. Mở Google Sheet → **Tiện ích mở rộng → Apps Script**. Xóa code cũ, dán toàn bộ `google-apps-script.gs`, bấm **Lưu**.
2. Chọn hàm **setup** → **Chạy** (dựng lại giao diện, giữ nguyên dữ liệu, xếp lại cột cho các dòng cũ).
3. **Triển khai → Quản lý các bản triển khai → bút chì → Phiên bản mới → Triển khai** (bắt buộc, nếu không form vẫn ghi theo bản cũ).

## Tự kiểm tra tiền về từ SePay (làm 1 lần)
1. Vào my.sepay.vn → **Cấu hình công ty → API Access** → tạo API token, copy.
2. Apps Script → **Cài đặt dự án (bánh răng) → Thuộc tính tập lệnh → Thêm thuộc tính**:
   - `SEPAY_TOKEN` = token vừa copy
   - (tuỳ chọn) `SEPAY_ACCOUNT` = số tài khoản nhận tiền như SePay hiển thị, nếu SePay có nhiều tài khoản
3. Chọn hàm **caiTuDongSePay** → **Chạy** → cho phép các quyền Google hỏi. Từ đó script tự chạy mỗi 10 phút.
4. Kết quả: dòng nào tiền đã về (đủ số tiền + nội dung chuyển khoản có tên hoặc SĐT) tự chuyển "Chờ xác nhận" → "Đã nhận phí" và ghi chú mã giao dịch. Tab **SePay đối soát** liệt kê mọi khoản tiền vào, khoản nào "Chưa khớp" nghĩa là có người chuyển tiền nhưng chưa đăng ký (hoặc ghi sai tên).

## Các hàm tiện ích
- `xoaTrung`: xóa dòng trùng (cùng SĐT **và** cùng tên), có sao lưu sang tab "Đã xóa (trùng)".
- `kiemTraSot`: đối chiếu ảnh trong Drive với dòng trong sheet, tìm lượt đăng ký bị sót (tab "Có thể sót").
- `themTay`: nhập tay 1 người khi form lỗi.
