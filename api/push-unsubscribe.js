// Gỡ đăng ký nhận thông báo cho ĐÚNG thiết bị này (theo endpoint) — không xoá hết mọi thiết bị của
// user, vì họ có thể còn cài app trên máy khác vẫn muốn tiếp tục nhận thông báo.
const { requireUser } = require('./_lib/auth');
const { supabaseAdmin } = require('./_lib/supabase-admin');

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const user = await requireUser(req);
  if (!user) { res.status(401).json({ error: 'Bạn cần đăng nhập để dùng tính năng này.' }); return; }

  const { endpoint } = req.body || {};
  if (!endpoint) { res.status(400).json({ error: 'Thiếu endpoint.' }); return; }

  await supabaseAdmin(`push_subscriptions?user_id=eq.${user.id}&endpoint=eq.${encodeURIComponent(endpoint)}`, {
    method: 'DELETE', prefer: 'return=minimal',
  });
  res.status(200).json({ ok: true });
};
