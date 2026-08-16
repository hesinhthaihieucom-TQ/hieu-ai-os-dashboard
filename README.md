# HIỂU AI OS — Bảng Điều Khiển (bản code)

Đây là bộ code thật của dashboard — khác với file HTML tĩnh trước đó,
bộ này deploy được lên web (giống link vercel của bác chị) và có thể
được Claude Code cập nhật tự động mỗi khi chị yêu cầu.

## Cấu trúc

```
hieu-dashboard/
  index.html     ← giao diện dashboard (không cần sửa file này thường xuyên)
  data.json      ← TOÀN BỘ dữ liệu hiển thị (giá, offer, policy, link...)
  vercel.json    ← config để Vercel nhận diện là static site
  README.md      ← file này
```

**Nguyên tắc quan trọng:** mỗi khi cần cập nhật giá/offer/policy/link,
chỉ cần sửa `data.json`. `index.html` tự đọc file này mỗi lần mở trang
— không cần đụng vào code giao diện.

---

## BƯỚC 1 — Đưa code lên GitHub (làm 1 lần)

1. Vào https://github.com → tạo tài khoản nếu chưa có.
2. Bấm **New repository** → đặt tên ví dụ `hieu-ai-os-dashboard` → Create.
3. Trên máy chị, mở terminal tại thư mục `hieu-dashboard` này rồi chạy:

```bash
git init
git add .
git commit -m "Khởi tạo dashboard"
git branch -M main
git remote add origin https://github.com/<TEN-TAI-KHOAN>/hieu-ai-os-dashboard.git
git push -u origin main
```

(Nếu chị không quen dùng terminal, có thể kéo-thả toàn bộ 4 file này
vào GitHub qua giao diện web: mở repo vừa tạo → "Add file" → "Upload
files".)

## BƯỚC 2 — Nối với Vercel (làm 1 lần)

1. Vào https://vercel.com → đăng nhập bằng chính tài khoản GitHub.
2. Bấm **Add New → Project** → chọn repo `hieu-ai-os-dashboard`.
3. Vercel tự nhận đây là static site → bấm **Deploy**.
4. Sau ~30 giây, chị có 1 link dạng `hieu-ai-os-dashboard.vercel.app`
   — đây chính là link sống, giống link của bác chị.

## BƯỚC 3 — Từ giờ về sau: cập nhật bằng Claude Code

Khi chị muốn đổi gì (giá, offer, policy, thêm sản phẩm...), mở
**Claude Code** ngay tại thư mục `hieu-dashboard` này và nói với Claude
Code kiểu:

> "Cập nhật giá MANH_CANBANG_1M thành 25.000.000đ trong data.json,
> commit và push lên GitHub."

Claude Code sẽ:
1. Sửa đúng field trong `data.json`
2. `git add`, `git commit`, `git push`
3. Vercel tự động phát hiện thay đổi trên GitHub → tự deploy lại
4. Chỉ sau vài giây, link web của chị đã hiển thị dữ liệu mới —
   không cần chị làm gì thêm ở bước Vercel.

Đây chính là vòng lặp tự động "bảo Claude làm gì → tự động lên
dashboard" mà chị muốn, vận hành hoàn toàn qua code + GitHub + Vercel.

## Vì sao không làm được ngay trong cửa sổ chat (claude.ai)?

Chat này không giữ được một project sống có địa chỉ web cố định — mỗi
lần chị hỏi, Claude chỉ tạo lại 1 file rồi gửi cho chị tải về. Để có
một link luôn sống, luôn cập nhật, bắt buộc phải có: code + nơi lưu trữ
(GitHub) + nơi host (Vercel). Claude Code là công cụ được thiết kế để
làm việc trực tiếp với bộ ba này.

## Đồng bộ với Project Claude (các file Registry gốc)

`data.json` hiện là **bản sao** dữ liệu từ Project của chị (Pricing
Registry, Offer Registry, Policy Registry, Resource Registry) tại thời
điểm 2026-08-16. Nếu chị cập nhật Project trước, hãy nhờ Claude Code
đồng bộ lại `data.json` cho khớp — hai nơi này không tự động nối với
nhau.
