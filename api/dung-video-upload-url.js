// Dựng Video AI — cấp link upload có chữ ký để khách đẩy video/ảnh THẲNG từ trình duyệt lên
// Supabase Storage (file video vài chục–vài trăm MB không thể đi qua body hàm serverless Vercel ~4.5MB).
// Cùng pattern api/san-pham-so-upload-url.js. Path luôn bắt đầu bằng user.id để api/dung-video-file.js
// kiểm tra quyền đọc chỉ bằng tiền tố.

const { requireUser } = require('./_lib/auth');
const { SUPABASE_URL } = require('./_lib/supabase-admin');

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  const user = await requireUser(req);
  if (!user) { res.status(401).json({ error: 'Chưa đăng nhập.' }); return; }
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) { res.status(500).json({ error: 'Server chưa cấu hình SUPABASE_SERVICE_ROLE_KEY.' }); return; }
  try {
    const { purpose, file_name } = req.body || {};
    if (!['source', 'asset', 'extra'].includes(purpose) || !file_name) { res.status(400).json({ error: 'Thiếu purpose hoặc file_name.' }); return; }
    const safe = String(file_name).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'file';
    const path = `${user.id}/${purpose}/${Date.now()}-${safe}`;
    const r = await fetch(`${SUPABASE_URL}/storage/v1/object/upload/sign/dung-video/${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({}),
    });
    if (!r.ok) { res.status(500).json({ error: 'Không tạo được link upload — thử lại giúp mình.' }); return; }
    const d = await r.json();
    res.status(200).json({ uploadUrl: `${SUPABASE_URL}/storage/v1${d.url}`, path });
  } catch (e) {
    res.status(500).json({ error: 'Có lỗi xảy ra — thử lại giúp mình.' });
  }
};
