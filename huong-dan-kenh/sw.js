// Service worker "trống" — chỉ để trình duyệt cho phép cài app (PWA), KHÔNG cache gì cả.
// Giống Xây Nhân Hiệu: team từng bị hại vì trình duyệt giữ JS/CSS cũ nên mọi request đi thẳng ra mạng.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => { event.respondWith(fetch(event.request)); });
