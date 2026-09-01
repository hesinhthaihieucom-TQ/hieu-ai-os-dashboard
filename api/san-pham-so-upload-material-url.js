// Sản Phẩm Số — sinh signed upload URL để tải lên 1 file PDF "tài liệu/kiến thức đã có" (nhánh A của
// Tìm Sản Phẩm Phù Hợp, xem api/tim-san-pham-tu-tai-lieu.js) THẲNG từ trình duyệt lên Supabase
// Storage — cùng lý do giới hạn payload như api/san-pham-so-upload-url.js. Dùng CHUNG bucket
// digital-products (private) nhưng path riêng "materials/" — file này chỉ để AI đọc 1 lần khi tìm ý
// tưởng, không phải file bán cho khách, và chưa có product_id nào để kiểm tra chủ sở hữu (khác với
// upload-url.js) nên chỉ cần requireUser + path luôn khoá theo đúng user.id.

const { requireUser } = require('./_lib/auth');
const { SUPABASE_URL } = require('./_lib/supabase-admin');

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const user = await requireUser(req);
  if (!user) { res.status(401).json({ error: 'Chưa đăng nhập.' }); return; }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) { res.status(500).json({ error: 'Server chưa cấu hình SUPABASE_SERVICE_ROLE_KEY.' }); return; }

  try {
    const { file_name } = req.body || {};
    if (!file_name) { res.status(400).json({ error: 'Thiếu file_name.' }); return; }

    const safeFileName = String(file_name).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'file.pdf';
    const path = `materials/${user.id}-${Date.now()}-${safeFileName}`;

    const signResp = await fetch(`${SUPABASE_URL}/storage/v1/object/upload/sign/digital-products/${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({}),
    });
    if (!signResp.ok) { res.status(500).json({ error: 'Không tạo được link upload — thử lại giúp mình.' }); return; }
    const signData = await signResp.json();

    res.status(200).json({
      uploadUrl: `${SUPABASE_URL}/storage/v1${signData.url}`,
      path,
    });
  } catch (e) {
    res.status(500).json({ error: 'Có lỗi xảy ra — thử lại giúp mình.' });
  }
};
