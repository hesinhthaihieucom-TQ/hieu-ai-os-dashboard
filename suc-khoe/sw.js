// Service worker "trống" — chỉ tồn tại để trình duyệt cho phép cài app (PWA), KHÔNG cache gì cả.
// Copy nguyên quy tắc từ nhan-hieu/sw.js và tai-chinh/sw.js — tuyệt đối không thêm cache ở đây, luôn
// để mọi request đi thẳng ra mạng như bình thường, tránh bug cache JS/CSS cũ từng gặp bên đó.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
