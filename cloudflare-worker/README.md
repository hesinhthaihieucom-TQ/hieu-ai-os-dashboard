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

## Deploy (bắt buộc làm thủ công sau khi sửa `worker.js`)

Hiện tại **chưa nối được Wrangler CLI** (cần Cloudflare account ID + tên Worker + xác thực tài
khoản Cloudflare, chưa thiết lập). Cách deploy hiện tại — 100% qua giao diện web, không cần chia sẻ
mật khẩu/API token với ai:

1. Copy toàn bộ nội dung file `worker.js` sau khi sửa.
2. Vào **Cloudflare Dashboard → Workers & Pages** → chọn đúng Worker đang chạy cho
   `hesinhthaihieu.com`.
3. Vào tab **Edit Code** (hoặc "Quick Edit") → dán đè nội dung mới vào.
4. Bấm **Deploy** (hoặc **Save and Deploy**).
5. Kiểm tra lại domain mới hoạt động (vd `hesinhthaihieu.com/hieudekhoemanh/`).

## Muốn deploy tự động qua `wrangler deploy` sau này?

Cần thêm 1 file `wrangler.toml` (khai báo `account_id`, tên Worker, route domain) + đăng nhập
Cloudflare qua `wrangler login` (mở trình duyệt, tự xác thực — không cần dán token cho ai). Chưa
làm ở bước này vì cần chị Quỳnh cung cấp `account_id`/tên Worker chính xác từ Dashboard trước.
