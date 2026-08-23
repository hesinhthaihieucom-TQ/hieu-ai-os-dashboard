// Service worker "trống" — chỉ tồn tại để trình duyệt cho phép cài app (PWA), KHÔNG cache gì cả.
// Copy nguyên quy tắc từ nhan-hieu/sw.js (2026-08-23) — tuyệt đối không thêm cache ở đây, luôn để
// mọi request đi thẳng ra mạng như bình thường, tránh bug cache JS/CSS cũ từng gặp bên đó.
// KHÔNG xử lý push notification ở đây (khác nhan-hieu/sw.js) — Sổ Dòng Tiền Tâm Thức chưa có hệ
// thông báo đẩy/nhắc lịch, chỉ cần cài được lên màn hình chính là đủ theo yêu cầu hiện tại.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
