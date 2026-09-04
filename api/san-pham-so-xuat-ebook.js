// Sản Phẩm Số — "📖 Xuất thành Ebook (PDF + sách lật Heyzine)". Không gọi Claude (không tính lượt
// AI) — chỉ dựng PDF từ nội dung đã viết ở Giai đoạn 2, đưa lên Storage, ký URL tạm, rồi nhờ Heyzine
// biến thành sách lật. Bắt buộc người bán đã tự kết nối Heyzine riêng của họ (sps_heyzine_api_key/
// client_id trên profiles, đăng ký free tại heyzine.com) — không còn fallback tài khoản chung.

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

  // Người bán BẮT BUỘC tự kết nối Heyzine riêng trước (2026-09-04, Quỳnh: "cho tất cả mng đều bắt
  // buộc kết nối heyzine đi" — trước đó có rơi về tài khoản chung của Quỳnh, nay bỏ hẳn fallback đó:
  // (1) tài khoản chung free chỉ có hạn 5 flipbook TOÀN APP, không chịu được traffic thật; (2) mỗi
  // người bán cần tự chỉnh nhạc nền/tiếng lật trang được, chỉ chủ tài khoản mới làm được việc đó.
  // Xem san-pham-so/js/tai-khoan.js + widget kết nối nhúng thẳng ở chon-loai.js/xay-dung-noi-dung.js.
  const profResp = await supabaseAdmin(`profiles?id=eq.${user.id}&select=sps_heyzine_api_key,sps_heyzine_client_id`);
  const profRows = profResp.ok ? await profResp.json() : [];
  const ownCreds = profRows[0] || {};
  const heyzineApiKey = ownCreds.sps_heyzine_api_key;
  const heyzineClientId = ownCreds.sps_heyzine_client_id;
  if (!heyzineApiKey || !heyzineClientId) {
    res.status(400).json({ error: 'Cần kết nối Heyzine riêng của bạn trước khi xuất ebook — dán API Key/Client ID vào ô ở trên rồi bấm "Lưu kết nối".' });
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

    // KHÔNG truyền `template` nữa (2026-09-04) — mẫu HEYZINE_TEMPLATE_ID chỉ tồn tại trong tài khoản
    // CHUNG của Quỳnh, giờ mọi người bán đều dùng tài khoản Heyzine RIÊNG của họ (bắt buộc, xem trên)
    // nên mẫu đó không áp dụng được nữa — mỗi người tự chỉnh nhạc nền/tiếng lật trang trong Heyzine
    // của chính họ sau khi xuất (xem hướng dẫn ở tai-khoan.js).
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
