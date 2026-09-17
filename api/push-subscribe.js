// Lưu lại 1 đăng ký nhận thông báo đẩy (Web Push) cho user hiện tại — gọi ngay sau khi trình duyệt
// cấp subscription (PushManager.subscribe() ở client). 1 user có thể có nhiều dòng (nhiều thiết
// bị/trình duyệt đã cài app) — endpoint là duy nhất tự nhiên nên dùng upsert theo cột đó.
// "app" (bắt buộc từ 2026-09-17, xem BUG THẬT ở schema_nhan_hieu.sql) — mỗi app tự gửi đúng key của
// mình (nhan-hieu/tro-ly-crm/suc-khoe/tai-chinh...) để api/_lib/push.js lọc đúng đối tượng, không để
// thông báo app này lẫn sang app khác dù cùng 1 user_id.
const { requireUser } = require('./_lib/auth');
const { supabaseAdmin } = require('./_lib/supabase-admin');

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const user = await requireUser(req);
  if (!user) { res.status(401).json({ error: 'Bạn cần đăng nhập để dùng tính năng này.' }); return; }

  const { endpoint, keys, app } = req.body || {};
  if (!endpoint || !keys || !keys.p256dh || !keys.auth || !app) {
    res.status(400).json({ error: 'Thiếu thông tin đăng ký thông báo.' }); return;
  }

  const resp = await supabaseAdmin('push_subscriptions?on_conflict=endpoint', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=minimal',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ user_id: user.id, endpoint, p256dh: keys.p256dh, auth_key: keys.auth, app }),
  });
  if (!resp.ok) { res.status(500).json({ error: 'Không lưu được đăng ký thông báo — thử lại giúp mình.' }); return; }
  res.status(200).json({ ok: true });
};
