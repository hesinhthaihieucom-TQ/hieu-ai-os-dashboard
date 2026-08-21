// Gửi Web Push (chuẩn VAPID) — hoạt động kể cả khi đã tắt app/trình duyệt, MIỄN LÀ người dùng đã
// cài app lên máy (PWA, xem nhan-hieu/manifest.json + nhan-hieu/sw.js) và đã cấp quyền thông báo.
// Trên iPhone: CHỈ hoạt động nếu đã "Thêm vào Màn hình chính" trước (Safari không hỗ trợ Web Push
// cho tab trình duyệt thường, chỉ hỗ trợ PWA đã cài, từ iOS 16.4+).
const webpush = require('web-push');
const { supabaseAdmin } = require('./supabase-admin');

function vapidConfigured() {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

function ensureVapid() {
  if (!vapidConfigured()) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@hesinhthaihieu.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
  return true;
}

// Gửi cho TẤT CẢ thiết bị đã đăng ký của 1 user (họ có thể cài trên nhiều máy). Endpoint hết hạn/
// bị thu hồi (410 Gone hoặc 404) thì tự xoá khỏi push_subscriptions luôn — không để rác tồn lại
// khiến cron cứ thử gửi lại mãi mỗi lần chạy.
async function sendPushToUser(userId, payload) {
  if (!ensureVapid()) return { sent: 0, reason: 'vapid_not_configured' };
  const resp = await supabaseAdmin(`push_subscriptions?user_id=eq.${userId}`);
  const subs = resp.ok ? await resp.json() : [];
  let sent = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
        JSON.stringify(payload),
      );
      sent++;
    } catch (e) {
      if (e.statusCode === 410 || e.statusCode === 404) {
        await supabaseAdmin(`push_subscriptions?id=eq.${sub.id}`, { method: 'DELETE', prefer: 'return=minimal' });
      }
      // Lỗi khác (mạng, quá tải...) — bỏ qua thiết bị này, không chặn gửi cho thiết bị/user khác.
    }
  }
  return { sent, total: subs.length };
}

// Chống gửi trùng 1 sự kiện nhắc — event_key duy nhất theo (user_id, event_key) nhờ unique
// constraint ở notification_log, insert lỗi trùng khoá coi như "đã gửi rồi", bỏ qua êm, không phải lỗi.
async function alreadyNotified(userId, eventKey) {
  const resp = await supabaseAdmin(`notification_log?user_id=eq.${userId}&event_key=eq.${encodeURIComponent(eventKey)}&select=id`);
  const rows = resp.ok ? await resp.json() : [];
  return rows.length > 0;
}

async function markNotified(userId, eventKey) {
  await supabaseAdmin('notification_log', {
    method: 'POST', prefer: 'return=minimal',
    body: JSON.stringify({ user_id: userId, event_key: eventKey }),
  });
}

// Gộp 3 bước trên: kiểm tra chưa gửi → gửi → đánh dấu đã gửi. Dùng chung cho mọi loại nhắc ở cron.
async function notifyOnce(userId, eventKey, payload) {
  if (await alreadyNotified(userId, eventKey)) return { skipped: true };
  const result = await sendPushToUser(userId, payload);
  if (result.sent > 0) await markNotified(userId, eventKey);
  return result;
}

module.exports = { vapidConfigured, sendPushToUser, notifyOnce };
