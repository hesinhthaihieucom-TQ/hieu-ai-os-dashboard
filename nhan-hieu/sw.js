// Service worker "trống" — chỉ tồn tại để trình duyệt cho phép cài app (PWA), KHÔNG cache gì cả.
// Team này từng bị hại nặng vì trình duyệt cache JS/CSS cũ gây ra hàng loạt bug khó hiểu (xem
// vercel.json header no-cache cho /nhan-hieu/js/* và style.css) — tuyệt đối không thêm cache ở đây,
// luôn để mọi request đi thẳng ra mạng như bình thường.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});

// Nhắc lịch đăng bài/Đẩy Bài/quay content (2026-08-21, xem api/cron/send-reminders.js) — payload
// gửi từ server luôn là JSON { title, body, url }, xem api/_lib/push.js.
self.addEventListener('push', (event) => {
  let data = { title: 'Xây Nhân Hiệu', body: 'Bạn có 1 thông báo mới.' };
  try { if (event.data) data = { ...data, ...event.data.json() }; } catch (e) {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: 'assets/icon-192.png',
      badge: 'assets/icon-192.png',
      data: { url: data.url || './' },
    })
  );
});

// Bấm vào thông báo — mở đúng trang liên quan nếu app đã mở sẵn 1 tab, không mở tab mới tràn lan.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || './';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      for (const client of clientsArr) {
        if ('focus' in client) { client.navigate(targetUrl); return client.focus(); }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
