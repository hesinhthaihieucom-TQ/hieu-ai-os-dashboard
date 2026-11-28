// Đăng ký buổi chia sẻ 30/11 (phí cam kết năng lượng 79K) từ trang xay-kenh/. Tạo 1 dòng
// xay_kenh_buoi_dang_ky với mã ref ngẫu nhiên, trả ref cho trang dựng mã QR. KHÔNG kích hoạt gì tự động:
// mã ở đây cố ý không dính tiền tố app nào (XNH/SPS/CRM/SPUP) để webhook SePay không nhận nhầm
// (xem schema_xay_kenh_leads.sql) — Quỳnh đối chiếu sao kê theo ref rồi gửi link buổi qua Zalo.
const crypto = require('crypto');
const { supabaseAdmin } = require('./_lib/supabase-admin');
const { sendEmail, escHtml } = require('./_lib/send-email');

const ALPHABET = 'ABCDEFGHJKMNPQRTUVWYZ23456789'; // bỏ S/X/I/L/O/0/1 cho khỏi đọc nhầm và khỏi dính tiền tố SPS/XNH
const makeRef = () => Array.from(crypto.randomBytes(6), (b) => ALPHABET[b % ALPHABET.length]).join('');

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  const b = req.body && typeof req.body === 'object' ? req.body : {};
  const name = String(b.name || '').trim().slice(0, 120);
  const zalo = String(b.zalo || '').replace(/[\s.\-]/g, '').slice(0, 20);
  const email = String(b.email || '').trim().slice(0, 160);
  if (!name) { res.status(400).json({ error: 'Vui lòng nhập tên.' }); return; }
  if (!/^0\d{9}$/.test(zalo)) { res.status(400).json({ error: 'Số Zalo cần đủ 10 số, bắt đầu bằng 0.' }); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { res.status(400).json({ error: 'Vui lòng nhập email để nhận thư chào mừng.' }); return; }

  // Mã trùng (unique) cực hiếm — thử lại vài lần là đủ.
  let ref = null;
  for (let i = 0; i < 4 && !ref; i++) {
    const candidate = makeRef();
    try {
      const r = await supabaseAdmin('xay_kenh_buoi_dang_ky', {
        method: 'POST',
        body: JSON.stringify({ name, zalo, email, ref: candidate, amount: 79000 }),
        prefer: 'return=minimal',
      });
      if (r.ok) ref = candidate;
      else console.error('xay_kenh_buoi_dang_ky insert failed', r.status, await r.text().catch(() => ''));
    } catch (e) { console.error('xay_kenh_buoi_dang_ky insert error', e.message); }
  }
  if (!ref) { res.status(500).json({ error: 'Chưa lưu được đăng ký, bạn thử lại hoặc nhắn Zalo giúp mình.' }); return; }

  const to = process.env.XAY_KENH_NOTIFY_EMAIL || process.env.ZOOM_LEAD_NOTIFY_EMAIL;
  if (to) {
    await sendEmail({
      to,
      subject: `Đăng ký buổi 30/11: ${name} (chờ CK 79K)`,
      html: `<p><b>${escHtml(name)}</b> — Zalo: ${escHtml(zalo)}${email ? ' — ' + escHtml(email) : ''}</p><p>Mã CK: <code>SEVQR BUOI29 ${ref}</code></p>`,
    }).catch(() => {});
  }
  res.status(200).json({ ok: true, ref });
};
