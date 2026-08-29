// Service worker "trống" — chỉ tồn tại để trình duyệt cho phép cài app (PWA) + nhận Web Push, KHÔNG
// cache gì cả (copy nguyên quy tắc từ nhan-hieu/sw.js — tuyệt đối không thêm cache ở đây, luôn để
// mọi request đi thẳng ra mạng như bình thường, tránh bug cache JS/CSS cũ từng gặp bên đó).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});

// Nhắc lịch follow khách (2026-08-29, xem api/cron/send-reminders.js checkCrmFollowReminders) —
// payload gửi từ server luôn là JSON { title, body, url }, xem api/_lib/push.js.
self.addEventListener('push', (event) => {
  let data = { title: 'Trợ Lý AI Tư Vấn & CRM', body: 'Bạn có 1 thông báo mới.' };
  try { if (event.data) data = { ...data, ...event.data.json() }; } catch (e) {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
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
