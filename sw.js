// Service worker tối giản — chỉ để trình duyệt coi đây là PWA cài được (Add to Home Screen/Install).
// Luôn lấy dữ liệu mới nhất từ mạng, không cache data.json để tránh hiện số liệu cũ.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
