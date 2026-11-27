// Trang xay-kenh/ hỏi mỗi vài giây: khách đã chuyển khoản buổi 29/11 chưa? (webhook SePay đánh dấu da_thanh_toan,
// xem nhánh BUOI29 ở api/sepay-webhook.js). Mã ref là chuỗi ngẫu nhiên khó đoán, chỉ trả về paid + tên gọi ngắn,
// không lộ Zalo/email.
const { supabaseAdmin } = require('./_lib/supabase-admin');

module.exports = async (req, res) => {
  const ref = String((req.query && req.query.ref) || '').toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(ref)) { res.status(400).json({ ok: false }); return; }
  try {
    const r = await supabaseAdmin(`xay_kenh_buoi_dang_ky?ref=eq.${ref}&select=status,name`);
    const rows = r.ok ? await r.json() : [];
    const row = rows[0];
    if (!row) { res.status(200).json({ ok: true, found: false, paid: false }); return; }
    res.status(200).json({ ok: true, found: true, paid: row.status === 'da_thanh_toan', name: String(row.name || '').split(' ').slice(-1)[0] });
  } catch (e) {
    res.status(200).json({ ok: true, found: false, paid: false });
  }
};
