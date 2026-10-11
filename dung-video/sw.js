// Service worker "trống" — chỉ để trình duyệt cho phép cài app (PWA), KHÔNG cache gì cả (quy tắc
// chung của mọi app trong repo, tránh bug cache JS/CSS cũ). Chưa có thông báo đẩy ở bản khung này.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => { event.respondWith(fetch(event.request)); });
