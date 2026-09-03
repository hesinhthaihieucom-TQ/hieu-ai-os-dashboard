// Service worker "trống" — chỉ tồn tại để trình duyệt cho phép cài app (PWA), KHÔNG cache gì cả.
// Copy nguyên quy tắc từ nhan-hieu/sw.js (2026-08-23) — tuyệt đối không thêm cache ở đây, luôn để
// mọi request đi thẳng ra mạng như bình thường, tránh bug cache JS/CSS cũ từng gặp bên đó.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});

// 2026-09-03 — PHÁT HIỆN THIẾU khi làm popup mời bật thông báo: "Nhắc ghi chép" (ghi-chep.js, từ
// 1/9) và thông báo mốc giá (checkTaiChinhLogReminder/checkTcPriceTierDeadline ở
// api/cron/send-reminders.js) đã gửi push THẬT từ server bấy lâu nay, nhưng service worker này chưa
// từng có handler 'push' — tin nhắn tới trình duyệt rồi bị lặng lẽ rơi mất, không ai thấy thông báo
// nào cả. Copy nguyên handler từ nhan-hieu/sw.js — payload gửi từ server luôn là JSON
// { title, body, url }, xem api/_lib/push.js.
self.addEventListener('push', (event) => {
  let data = { title: 'Sổ Dòng Tiền Tâm Thức', body: 'Bạn có 1 thông báo mới.' };
  try { if (event.data) data = { ...data, ...event.data.json() }; } catch (e) {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: 'assets/logo-hieu-hanh.png',
      badge: 'assets/logo-hieu-hanh.png',
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
