// Sản Phẩm Số — "📖 Đã có PDF hoàn chỉnh, biến thành sách lật" (san-pham-so/js/chon-loai.js, 2026-09-04).
// Quỳnh yêu cầu trực tiếp: "khi người dùng có sẵn file PDF full sản phẩm... không cần tạo outline
// gì, muốn chuyển nó thành dạng ebook trang lật ở Heyzine" — luồng này TRƯỚC ĐÓ HOÀN TOÀN CHƯA CÓ.
// Cố ý đặt trong "Chọn Loại Sản Phẩm Số" (không phải "Sản phẩm của tôi" — Quỳnh: "Sản phẩm của tôi
// chỉ là nơi LƯU sản phẩm đã hoàn thành/đang làm dở, không làm gì ở đó cả"). KHÔNG dựng/viết PDF gì
// (khác api/san-pham-so-xuat-ebook.js) — nhận thẳng 1 file PDF người bán vừa tải lên qua
// api/san-pham-so-upload-material-url.js, chỉ ký URL tạm rồi đưa cho Heyzine.
const { requireUser } = require('./_lib/auth');
const { signMaterialUrl } = require('./_lib/material-storage');
const { supabaseAdmin } = require('./_lib/supabase-admin');
const { createFlipbook } = require('./_lib/heyzine');

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const user = await requireUser(req);
  if (!user) { res.status(401).json({ error: 'Chưa đăng nhập.' }); return; }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) { res.status(500).json({ error: 'Server chưa cấu hình SUPABASE_SERVICE_ROLE_KEY.' }); return; }

  const { materialPath, title } = req.body || {};
  if (!materialPath) { res.status(400).json({ error: 'Thiếu file PDF.' }); return; }

  // Người bán BẮT BUỘC tự kết nối Heyzine riêng trước (2026-09-04, Quỳnh: "cho tất cả mng đều bắt
  // buộc kết nối heyzine đi" — bỏ hẳn fallback tài khoản chung: (1) tài khoản chung free chỉ có hạn 5
  // flipbook TOÀN APP; (2) mỗi người bán cần tự chỉnh nhạc nền/tiếng lật trang được, chỉ chủ tài
  // khoản mới làm được — xem san-pham-so/js/tai-khoan.js.
  const profResp = await supabaseAdmin(`profiles?id=eq.${user.id}&select=sps_heyzine_api_key,sps_heyzine_client_id`);
  const profRows = profResp.ok ? await profResp.json() : [];
  const ownCreds = profRows[0] || {};
  const heyzineApiKey = ownCreds.sps_heyzine_api_key;
  const heyzineClientId = ownCreds.sps_heyzine_client_id;
  if (!heyzineApiKey || !heyzineClientId) {
    res.status(400).json({ error: 'Cần kết nối Heyzine riêng của bạn trước khi tạo sách lật — dán API Key/Client ID vào ô ở trên rồi bấm "Lưu kết nối".' });
    return;
  }

  try {
    const pdfSignedUrl = await signMaterialUrl(user.id, materialPath);
    if (!pdfSignedUrl) { res.status(400).json({ error: 'Không tìm thấy file — tải lên lại giúp mình.' }); return; }

    const flipbook = await createFlipbook({
      apiKey: heyzineApiKey,
      clientId: heyzineClientId,
      pdfUrl: pdfSignedUrl,
      title: title || undefined,
    });

    res.status(200).json({ heyzineUrl: flipbook.url, thumbnail: flipbook.thumbnail });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Có lỗi xảy ra khi tạo sách lật.' });
  }
};
