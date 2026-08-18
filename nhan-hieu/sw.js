// Service worker "trống" — chỉ tồn tại để trình duyệt cho phép cài app (PWA), KHÔNG cache gì cả.
// Team này từng bị hại nặng vì trình duyệt cache JS/CSS cũ gây ra hàng loạt bug khó hiểu (xem
// vercel.json header no-cache cho /nhan-hieu/js/* và style.css) — tuyệt đối không thêm cache ở đây,
// luôn để mọi request đi thẳng ra mạng như bình thường.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
