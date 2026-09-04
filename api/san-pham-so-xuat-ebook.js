// Sản Phẩm Số — "📖 Xuất thành Ebook (PDF + sách lật Heyzine)". Không gọi Claude (không tính lượt
// AI) — chỉ dựng PDF từ nội dung đã viết ở Giai đoạn 2, đưa lên Storage, ký URL tạm, rồi nhờ Heyzine
// biến thành sách lật. Cần 2 biến môi trường HEYZINE_API_KEY + HEYZINE_CLIENT_ID (đăng ký tài khoản
// free tại heyzine.com để lấy, API access có ở mọi gói kể cả free).

const crypto = require('crypto');
const { requireUser } = require('./_lib/auth');
const { SUPABASE_URL, supabaseAdmin } = require('./_lib/supabase-admin');
const { buildEbookPdf } = require('./_lib/pdf-ebook');
const { createFlipbook } = require('./_lib/heyzine');

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const user = await requireUser(req);
  if (!user) { res.status(401).json({ error: 'Chưa đăng nhập.' }); return; }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) { res.status(500).json({ error: 'Server chưa cấu hình SUPABASE_SERVICE_ROLE_KEY.' }); return; }

  // Người bán tự kết nối Heyzine riêng (2026-09-04, xem san-pham-so/js/tai-khoan.js) → dùng ĐÚNG tài
  // khoản của họ, flipbook thuộc về họ, tự vào Heyzine chỉnh nhạc nền/style được. Không set gì thì rơi
  // về tài khoản chung của Quỳnh (HEYZINE_API_KEY/HEYZINE_CLIENT_ID env) như trước — không bắt buộc.
  const profResp = await supabaseAdmin(`profiles?id=eq.${user.id}&select=sps_heyzine_api_key,sps_heyzine_client_id`);
  const profRows = profResp.ok ? await profResp.json() : [];
  const ownCreds = profRows[0] || {};
  const usingOwnAccount = !!(ownCreds.sps_heyzine_api_key && ownCreds.sps_heyzine_client_id);
  const heyzineApiKey = usingOwnAccount ? ownCreds.sps_heyzine_api_key : process.env.HEYZINE_API_KEY;
  const heyzineClientId = usingOwnAccount ? ownCreds.sps_heyzine_client_id : process.env.HEYZINE_CLIENT_ID;
  if (!heyzineApiKey || !heyzineClientId) {
    res.status(500).json({ error: 'Server chưa cấu hình HEYZINE_API_KEY/HEYZINE_CLIENT_ID — cần đăng ký tài khoản Heyzine rồi thêm 2 biến môi trường này ở Vercel.' });
    return;
  }

  try {
    const { idea, outline2, sections, theme } = req.body || {};
    if (!idea || !outline2) { res.status(400).json({ error: 'Thiếu thông tin sản phẩm/outline.' }); return; }

    // Bìa & màu (2026-09-04, xem san-pham-so/js/xay-dung-noi-dung.js + product_idea_results.ebook_theme):
    // coverMode 'ai'/'upload' đều mang sẵn coverImageDataUrl (base64) — 'ai' đã có chữ đè sẵn từ
    // api/_lib/ebook-cover.js (coverHasBakedText=true, không vẽ chữ đè lần 2), 'upload' là ảnh thô
    // người bán tự tải lên (pdf-ebook.js tự vẽ chữ đè bằng pdfkit). 'solid' hoặc không đặt gì thì
    // không có ảnh — pdf-ebook.js tự vẽ nền màu.
    let coverImageBuffer = null;
    if (theme && theme.coverImageDataUrl && theme.coverMode !== 'solid') {
      const base64 = String(theme.coverImageDataUrl).split(',')[1] || '';
      coverImageBuffer = Buffer.from(base64, 'base64');
    }
    const pdfBuffer = await buildEbookPdf({
      idea, outline2, sections: sections || {}, theme,
      coverImageBuffer, coverHasBakedText: !!(theme && theme.coverMode === 'ai'),
    });

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
      // ID flipbook mẫu (Quỳnh tự thiết kế sẵn — kiểu lật trang/nền/nhạc nền/tiếng lật trang) để mọi
      // ebook xuất ra đều mang đúng phong cách đó thay vì bản mặc định "thô sơ" (2026-09-01). Đặt qua
      // biến môi trường HEYZINE_TEMPLATE_ID để Quỳnh đổi mẫu sau này không cần sửa code — mặc định
      // dùng đúng flipbook Quỳnh đã gửi làm ví dụ (heyzine.com/flip-book/63e3352a94.html). CHỈ áp dụng
      // khi dùng tài khoản CHUNG của Quỳnh — mẫu đó nằm trong tài khoản của chị, không tồn tại ở tài
      // khoản Heyzine riêng của từng người bán, truyền sang sẽ lỗi "không tìm thấy template".
      template: usingOwnAccount ? undefined : (process.env.HEYZINE_TEMPLATE_ID || '63e3352a94'),
    });

    res.status(200).json({
      heyzineUrl: flipbook.url,
      thumbnail: flipbook.thumbnail,
      pdfStoragePath: path,
      usingOwnHeyzineAccount: usingOwnAccount,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Có lỗi xảy ra khi xuất ebook.' });
  }
};
