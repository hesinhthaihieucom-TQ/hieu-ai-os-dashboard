// Nhận đăng ký lớp Zoom "Dựng video AI" (24-25/10/2026) từ trang tĩnh zoom-dung-video-ai/.
// Trang KHÔNG có phiên đăng nhập → ghi bằng service role vào bảng zoom_video_leads
// (xem supabase/zoom_video_leads.sql — Quỳnh phải chạy file đó 1 lần trong Supabase SQL Editor).
// Nếu có RESEND_API_KEY + ZOOM_LEAD_NOTIFY_EMAIL thì gửi thêm email báo có đăng ký mới.
// Trả 200 khi lưu được vào bảng HOẶC gửi được email báo; ngược lại 500 để trang báo "chưa lưu được".
const { supabaseAdmin } = require('./_lib/supabase-admin');
const { sendEmail, escHtml } = require('./_lib/send-email');

const DEVICES = ['mac', 'windows', 'other'];

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  const b = req.body && typeof req.body === 'object' ? req.body : {};
  const name = String(b.name || '').trim().slice(0, 120);
  const zalo = String(b.zalo || '').trim().slice(0, 40);
  const email = String(b.email || '').trim().slice(0, 160);
  const device = DEVICES.includes(b.device) ? b.device : null;
  if (!name || !zalo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !device) {
    res.status(400).json({ error: 'Thiếu hoặc sai thông tin.' }); return;
  }
  const row = {
    name, zalo, email, device,
    chip: String(b.chip || '').slice(0, 40) || null,
    macos: String(b.macos || '').slice(0, 40) || null,
    channel: String(b.channel || '').slice(0, 300) || null,
    ref_code: String(b.ref || '').slice(0, 40) || null,
    status: device === 'mac' ? 'cho_thanh_toan' : 'danh_sach_cho',
  };

  let saved = false;
  try {
    const r = await supabaseAdmin('zoom_video_leads', { method: 'POST', body: JSON.stringify(row), prefer: 'return=minimal' });
    saved = r.ok;
    if (!r.ok) console.error('zoom_video_leads insert failed', r.status, await r.text().catch(() => ''));
  } catch (e) { console.error('zoom_video_leads insert error', e.message); }

  let emailed = false;
  const to = process.env.ZOOM_LEAD_NOTIFY_EMAIL;
  if (to) {
    const r = await sendEmail({
      to,
      subject: `Đăng ký Zoom dựng video AI: ${name} (${device})`,
      html: `<p><b>${escHtml(name)}</b> — ${escHtml(device)}</p><p>Zalo: ${escHtml(zalo)}<br>Email: ${escHtml(email)}<br>Chip/macOS: ${escHtml(row.chip)} / ${escHtml(row.macos)}<br>Kênh: ${escHtml(row.channel)}<br>Mã CK: <code>${escHtml(row.ref_code)}</code><br>Trạng thái: ${row.status}</p>`,
    });
    emailed = !!r.ok;
  }

  if (saved || emailed) { res.status(200).json({ ok: true, saved, emailed }); return; }
  res.status(500).json({ error: 'Chưa lưu được đăng ký.' });
};
