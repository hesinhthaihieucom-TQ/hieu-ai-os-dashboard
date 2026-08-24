// Sản Phẩm Số — sinh signed upload URL để người bán upload file (ebook...) THẲNG lên Supabase
// Storage TỪ TRÌNH DUYỆT, không đi qua hàm serverless này. Lý do: hàm serverless (Vercel) có giới
// hạn kích thước payload request (~4.5MB) — 1 file ebook vài chục MB gửi qua base64 trong body JSON
// (như cách tao-anh.js xử lý ảnh nhỏ) sẽ vượt giới hạn đó và luôn lỗi. Chỉ endpoint NÀY (trả về 1
// URL có chữ ký, hết hạn sau vài phút) đi qua server; file bytes thật đi thẳng trình duyệt -> Storage.

const { requireUser } = require('./_lib/auth');
const { supabaseAdmin, SUPABASE_URL } = require('./_lib/supabase-admin');

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const user = await requireUser(req);
  if (!user) { res.status(401).json({ error: 'Chưa đăng nhập.' }); return; }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) { res.status(500).json({ error: 'Server chưa cấu hình SUPABASE_SERVICE_ROLE_KEY.' }); return; }

  try {
    const { product_id, file_name } = req.body || {};
    if (!product_id || !file_name) { res.status(400).json({ error: 'Thiếu product_id hoặc file_name.' }); return; }

    // Xác nhận đúng chủ sở hữu sản phẩm trước khi cấp quyền ghi vào path của sản phẩm đó.
    const prodResp = await supabaseAdmin(`digital_products?id=eq.${product_id}&owner_id=eq.${user.id}&select=id`);
    const prodRows = prodResp.ok ? await prodResp.json() : [];
    if (!prodRows[0]) { res.status(404).json({ error: 'Không tìm thấy sản phẩm.' }); return; }

    const safeFileName = String(file_name).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'file';
    const path = `${product_id}/${Date.now()}-${safeFileName}`;

    const signResp = await fetch(`${SUPABASE_URL}/storage/v1/object/upload/sign/digital-products/${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({}),
    });
    if (!signResp.ok) { res.status(500).json({ error: 'Không tạo được link upload — thử lại giúp mình.' }); return; }
    const signData = await signResp.json();

    // signData.url dạng "/object/upload/sign/digital-products/<path>?token=..." — client PUT thẳng
    // vào đây (đã có token trong query, không cần gửi kèm Authorization nào khác).
    res.status(200).json({
      uploadUrl: `${SUPABASE_URL}/storage/v1${signData.url}`,
      path,
    });
  } catch (e) {
    res.status(500).json({ error: 'Có lỗi xảy ra — thử lại giúp mình.' });
  }
};
