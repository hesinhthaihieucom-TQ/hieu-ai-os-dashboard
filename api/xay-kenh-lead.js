// Nhận khách để lại Zalo từ phễu "Checklist lưu ý khi xây kênh" (trang xay-kenh/).
// Trang tĩnh không có phiên đăng nhập → ghi bằng service role vào xay_kenh_leads
// (xem supabase/schema_xay_kenh_leads.sql — phải chạy file đó 1 lần trong Supabase SQL Editor).
// Giống api/zoom-video-dang-ky.js: lưu bảng HOẶC gửi được email báo là coi như OK, để khách vẫn
// thấy checklist dù bảng chưa tạo — mất 1 lead còn tệ hơn mất 1 dòng log.
const { supabaseAdmin } = require('./_lib/supabase-admin');
const { sendEmail, escHtml } = require('./_lib/send-email');

const PLATFORMS = ['tiktok', 'facebook', 'youtube', 'chua_chon'];
const STAGES = ['chua_co', 'moi_lam', 'co_nguoi_xem'];
const PAINS = ['video', 'noi_dung', 'ban_hang', 'tat_ca'];
const SUPPORTS = ['tu_lam', 'cam_tay'];
const RECS = ['edit_video', 'app_nhan_hieu', 'huan_luyen_1_1'];

const pick = (v, list) => (list.includes(v) ? v : null);

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  const b = req.body && typeof req.body === 'object' ? req.body : {};
  const name = String(b.name || '').trim().slice(0, 120);
  const zalo = String(b.zalo || '').replace(/[\s.\-]/g, '').slice(0, 20);
  const email = String(b.email || '').trim().slice(0, 160);
  if (!name) { res.status(400).json({ error: 'Vui lòng nhập tên.' }); return; }
  if (!/^0\d{9}$/.test(zalo)) { res.status(400).json({ error: 'Số Zalo cần đủ 10 số, bắt đầu bằng 0.' }); return; }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { res.status(400).json({ error: 'Email chưa đúng.' }); return; }

  const row = {
    name, zalo, email: email || null,
    platform: pick(b.platform, PLATFORMS),
    stage: pick(b.stage, STAGES),
    pain: pick(b.pain, PAINS),
    support: pick(b.support, SUPPORTS),
    recommended: pick(b.recommended, RECS),
  };

  let saved = false;
  try {
    const r = await supabaseAdmin('xay_kenh_leads', { method: 'POST', body: JSON.stringify(row), prefer: 'return=minimal' });
    saved = r.ok;
    if (!r.ok) console.error('xay_kenh_leads insert failed', r.status, await r.text().catch(() => ''));
  } catch (e) { console.error('xay_kenh_leads insert error', e.message); }

  let emailed = false;
  const to = process.env.XAY_KENH_NOTIFY_EMAIL || process.env.ZOOM_LEAD_NOTIFY_EMAIL;
  if (to) {
    const r = await sendEmail({
      to,
      subject: `Khách mới từ checklist xây kênh: ${name} → ${row.recommended || '?'}`,
      html: `<p><b>${escHtml(name)}</b> — Zalo: ${escHtml(zalo)}${email ? ' — ' + escHtml(email) : ''}</p><p>Nền tảng: ${escHtml(row.platform)}<br>Giai đoạn: ${escHtml(row.stage)}<br>Vướng nhất: ${escHtml(row.pain)}<br>Muốn: ${escHtml(row.support)}<br>Gợi ý sản phẩm: <b>${escHtml(row.recommended)}</b></p>`,
    });
    emailed = !!r.ok;
  }

  if (saved || emailed) { res.status(200).json({ ok: true, saved, emailed }); return; }
  // Cả bảng lẫn email đều hỏng → vẫn 200 để khách xem được checklist (quà đã hứa), chỉ báo cờ saved=false.
  res.status(200).json({ ok: true, saved: false, emailed: false });
};
