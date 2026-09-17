// Service worker "trống" — chỉ tồn tại để trình duyệt cho phép cài app (PWA), KHÔNG cache gì cả
// (copy nguyên quy tắc từ nhan-hieu/sw.js — tuyệt đối không thêm cache ở đây, luôn để mọi request đi
// thẳng ra mạng như bình thường, tránh bug cache JS/CSS cũ từng gặp bên đó, xem vercel.json header
// no-cache cho /san-pham-so/js/* và style.css). Sản Phẩm Số CHƯA có Web Push (khác nhan-hieu/tro-ly-crm)
// nên KHÔNG có listener 'push'/'notificationclick' — thêm sau nếu Quỳnh cần nhắc lịch qua app này.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
