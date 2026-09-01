// Sản Phẩm Số — "📖 Xuất thành Ebook (PDF + sách lật Heyzine)". Không gọi Claude (không tính lượt
// AI) — chỉ dựng PDF từ nội dung đã viết ở Giai đoạn 2, đưa lên Storage, ký URL tạm, rồi nhờ Heyzine
// biến thành sách lật. Cần 2 biến môi trường HEYZINE_API_KEY + HEYZINE_CLIENT_ID (đăng ký tài khoản
// free tại heyzine.com để lấy, API access có ở mọi gói kể cả free).

const crypto = require('crypto');
const { requireUser } = require('./_lib/auth');
const { SUPABASE_URL } = require('./_lib/supabase-admin');
const { buildEbookPdf } = require('./_lib/pdf-ebook');
const { createFlipbook } = require('./_lib/heyzine');

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const user = await requireUser(req);
  if (!user) { res.status(401).json({ error: 'Chưa đăng nhập.' }); return; }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const heyzineApiKey = process.env.HEYZINE_API_KEY;
  const heyzineClientId = process.env.HEYZINE_CLIENT_ID;
  if (!serviceKey) { res.status(500).json({ error: 'Server chưa cấu hình SUPABASE_SERVICE_ROLE_KEY.' }); return; }
  if (!heyzineApiKey || !heyzineClientId) {
    res.status(500).json({ error: 'Server chưa cấu hình HEYZINE_API_KEY/HEYZINE_CLIENT_ID — cần đăng ký tài khoản Heyzine rồi thêm 2 biến môi trường này ở Vercel.' });
    return;
  }

  try {
    const { idea, outline2, sections } = req.body || {};
    if (!idea || !outline2) { res.status(400).json({ error: 'Thiếu thông tin sản phẩm/outline.' }); return; }

    const pdfBuffer = await buildEbookPdf({ idea, outline2, sections: sections || {} });

    const path = `ebook-exports/${user.id}-${crypto.randomBytes(6).toString('hex')}.pdf`;
    const uploadResp = await fetch(`${SUPABASE_URL}/storage/v1/object/digital-products/${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/pdf', apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      body: pdfBuffer,
    });
    if (!uploadResp.ok) { res.status(500).json({ error: 'Không tải PDF lên được — thử lại giúp mình.' }); return; }

    const signResp = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/digital-products/${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({ expiresIn: 600 }),
    });
    if (!signResp.ok) { res.status(500).json({ error: 'Không tạo được link tạm cho PDF — thử lại giúp mình.' }); return; }
    const signData = await signResp.json();
    const pdfSignedUrl = `${SUPABASE_URL}/storage/v1${signData.signedURL}`;

    const flipbook = await createFlipbook({
      apiKey: heyzineApiKey,
      clientId: heyzineClientId,
      pdfUrl: pdfSignedUrl,
      title: idea.ten_san_pham,
    });

    res.status(200).json({
      heyzineUrl: flipbook.url,
      thumbnail: flipbook.thumbnail,
      pdfStoragePath: path,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Có lỗi xảy ra khi xuất ebook.' });
  }
};
