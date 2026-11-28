// Đếm phễu trang xay-kenh/ (vào trang → thấy form → bắt đầu điền → bấm lấy QR → thấy QR).
// Không cookie, không lưu IP: sid là chuỗi ngẫu nhiên do trình duyệt tự sinh, chỉ để đếm số người khác nhau.
// Mọi lỗi đều trả 200 im lặng — đếm hỏng không được làm phiền khách.
const { supabaseAdmin } = require('./_lib/supabase-admin');

const EVENTS = ['view', 'form_seen', 'form_focus', 'qr_click', 'qr_shown'];

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  const b = req.body && typeof req.body === 'object' ? req.body : {};
  const event = String(b.event || '');
  const sid = String(b.sid || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
  if (!EVENTS.includes(event) || !sid) { res.status(200).json({ ok: false }); return; }
  const src = String(b.src || '').slice(0, 80) || null;
  try {
    await supabaseAdmin('xay_kenh_events', { method: 'POST', body: JSON.stringify({ sid, event, src }), prefer: 'return=minimal' });
  } catch (e) { console.error('xay_kenh_events insert error', e.message); }
  res.status(200).json({ ok: true });
};
