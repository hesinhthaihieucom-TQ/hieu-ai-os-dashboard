// Dựng Video AI — cấp link xem/tải file (video đã dựng, bìa, ảnh trong kho) có chữ ký, hết hạn 1 giờ.
// Khách chỉ lấy được file nằm dưới thư mục mang user.id của chính mình; admin lấy được mọi file.

const { requireUser } = require('./_lib/auth');
const { supabaseAdmin, SUPABASE_URL } = require('./_lib/supabase-admin');

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  const user = await requireUser(req);
  if (!user) { res.status(401).json({ error: 'Chưa đăng nhập.' }); return; }
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) { res.status(500).json({ error: 'Server chưa cấu hình SUPABASE_SERVICE_ROLE_KEY.' }); return; }
  try {
    const { path, download_name } = req.body || {};
    if (!path || typeof path !== 'string' || path.includes('..')) { res.status(400).json({ error: 'Thiếu path.' }); return; }
    if (!path.startsWith(`${user.id}/`)) {
      const pr = await supabaseAdmin(`profiles?id=eq.${user.id}&select=role`);
      const rows = pr.ok ? await pr.json() : [];
      if (!rows[0] || rows[0].role !== 'admin') { res.status(403).json({ error: 'Không có quyền xem file này.' }); return; }
    }
    const r = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/dung-video/${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({ expiresIn: 3600 }),
    });
    if (!r.ok) { res.status(404).json({ error: 'Không tìm thấy file.' }); return; }
    const d = await r.json();
    const dl = download_name ? `&download=${encodeURIComponent(String(download_name).slice(0, 120))}` : '';
    res.status(200).json({ url: `${SUPABASE_URL}/storage/v1${d.signedURL}${dl}` });
  } catch (e) {
    res.status(500).json({ error: 'Có lỗi xảy ra — thử lại giúp mình.' });
  }
};
