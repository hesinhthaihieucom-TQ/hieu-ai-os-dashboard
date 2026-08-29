# Cloudflare Worker — hesinhthaihieu.com

Worker đứng trước domain `hesinhthaihieu.com`, proxy ngược từng path prefix trong `ROUTES`
(`worker.js`) sang đúng thư mục con tương ứng trên Vercel (`hieu-ai-os-dashboard.vercel.app`).

**Đây KHÔNG phải phần của `hieu-dashboard` repo trên Vercel** — nó là 1 Cloudflare Worker riêng,
được lưu source ở đây (trong repo này) để dễ theo dõi thay đổi, nhưng **không tự deploy theo git
push** như phần còn lại của repo.

## Đổi route (thêm/sửa app mới)

Sửa mảng `ROUTES` trong `worker.js` — mỗi app chỉ cần đúng 1 dòng:

```js
{ prefix: '/ten-duong-dan', originPath: '/ten-thu-muc-tren-vercel' },
```

`prefix` là phần path sau `hesinhthaihieu.com/`, `originPath` là thư mục tương ứng trong repo
`hieu-dashboard` (đã deploy sẵn ở `hieu-ai-os-dashboard.vercel.app/<originPath>/`).

## Thêm app mới — 2 bước, không chỉ sửa code

Sửa `ROUTES` trong `worker.js` là CHƯA ĐỦ — phải thêm cả 1 **Cloudflare Route** riêng cho path đó
thì request mới thật sự tới được worker này (route dạng `hesinhthaihieu.com/*` gộp chung KHÔNG tự
động bắt hết mọi path mới, đã kiểm chứng thực tế 2026-08-27 — mỗi app cần đúng 1 route riêng, y hệt
`hesinhthaihieu.com/webxaynhanhieu*` đang có cho nhan-hieu):

1. Thêm 1 dòng vào `ROUTES` trong `worker.js` (xem phần trên).
2. Vào **Cloudflare Dashboard → Workers & Pages → (worker đang chạy cho hesinhthaihieu.com) → tab
   Domains → bấm "+ Add Route"** → điền Route `hesinhthaihieu.com/<prefix-mới>*`, Zone
   `hesinhthaihieu.com`.
3. Deploy code (xem bên dưới).

## Deploy — đã nối Git, tự động (từ 2026-08-29)

Worker đang chạy tên là **`xaynhanhieu-proxy`** (xem `wrangler.toml` trong thư mục này). Đã nối
Git — **git push lên `main` là Cloudflare tự deploy**, không cần copy/dán tay nữa.

Nối 1 lần duy nhất trong Cloudflare Dashboard (nếu cần nối lại/nối máy khác):

1. Vào **Cloudflare Dashboard → Workers & Pages → `xaynhanhieu-proxy`**.
2. Vào tab **Settings** → mục **Builds** (hoặc "Git integration") → **Connect to Git**.
3. Chọn đúng repo GitHub của `hieu-dashboard`, nhánh `main`.
4. **Root directory** đặt đúng là `cloudflare-worker` (vì `wrangler.toml` + `worker.js` nằm ở đây,
   không phải gốc repo).
5. Build command để trống (không cần build gì, chỉ deploy thẳng `worker.js`).
6. Lưu — Cloudflare sẽ tự chạy `wrangler deploy` bằng `wrangler.toml` mỗi lần có commit mới trên
   `main` chạm tới thư mục `cloudflare-worker/`.

Routes (`hesinhthaihieu.com/...`) vẫn quản lý thủ công ở tab **Domains & Routes** của worker này
như trước — `wrangler.toml` CỐ TÌNH không khai routes để tránh 2 nơi cùng quản lý đá nhau. Thêm app
mới vẫn cần thêm 1 Route riêng trong Dashboard như hướng dẫn ở mục trên, chỉ có bước "deploy code"
là không cần làm tay nữa.

### Cách cũ (copy/dán tay) — chỉ dùng khi Git integration bị lỗi

1. Copy toàn bộ nội dung file `worker.js` sau khi sửa.
2. Vào **Cloudflare Dashboard → Workers & Pages → `xaynhanhieu-proxy`**.
3. Vào tab **Edit Code** (hoặc "Quick Edit") → dán đè nội dung mới vào.
4. Bấm **Deploy** (hoặc **Save and Deploy**).
5. Kiểm tra lại domain mới hoạt động (vd `hesinhthaihieu.com/hieudekhoemanh/`).
