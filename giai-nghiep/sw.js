// Service worker "trống" — chỉ để trình duyệt cho phép cài app (PWA), KHÔNG cache gì cả.
// Copy nguyên quy tắc từ tai-chinh/sw.js và suc-khoe/sw.js — tuyệt đối không thêm cache ở đây, tránh
// bug cache JS/CSS cũ từng gặp bên các app kia.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
