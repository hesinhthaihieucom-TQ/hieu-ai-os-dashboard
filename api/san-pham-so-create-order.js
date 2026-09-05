// Sản Phẩm Số — khách lạ (KHÔNG đăng nhập) bấm "Mua ngay" trên trang công khai, tạo 1 đơn hàng chờ
// thanh toán. ref_code sinh ở đây (tiền tố "SPS", xem api/sepay-webhook.js) là credential DUY NHẤT
// của khách để tra cứu/tải lại sau này — không có tài khoản nào khác gắn với đơn hàng.

const crypto = require('crypto');
const { supabaseAdmin } = require('./_lib/supabase-admin');

function generateRefCode() {
  return 'SPS' + crypto.randomBytes(5).toString('hex').toUpperCase();
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  try {
    const { slug, buyer_email, buyer_name, buyer_phone } = req.body || {};
    if (!slug) { res.status(400).json({ error: 'Thiếu slug sản phẩm.' }); return; }
    // Họ tên/SĐT BẮT BUỘC (2026-09-05, Quỳnh: "mục bấm đăng ký ở ladipage phải đủ chỗ điền thông tin
    // như họ và tên, sđt, email chứ" — trước đó chỉ có email và để tuỳ chọn) — CHỈ để chị biết ai vừa
    // mua/liên hệ lại, KHÔNG dùng để cấp quyền tải (vẫn luôn qua ref_code/status như cũ).
    if (!buyer_name || !buyer_name.trim()) { res.status(400).json({ error: 'Vui lòng nhập họ và tên.' }); return; }
    if (!buyer_phone || !buyer_phone.trim()) { res.status(400).json({ error: 'Vui lòng nhập số điện thoại.' }); return; }

    const prodResp = await supabaseAdmin(`digital_products?slug=eq.${encodeURIComponent(slug)}&status=eq.published&select=id,price`);
    const prodRows = prodResp.ok ? await prodResp.json() : [];
    const product = prodRows[0];
    if (!product) { res.status(404).json({ error: 'Không tìm thấy sản phẩm hoặc sản phẩm chưa được đăng công khai.' }); return; }

    // ref_code unique — thử lại vài lần nếu trùng ngẫu nhiên (cực hiếm, 5 byte random).
    for (let attempt = 0; attempt < 3; attempt++) {
      const refCode = generateRefCode();
      const insertResp = await supabaseAdmin('digital_product_orders', {
        method: 'POST',
        body: JSON.stringify({
          product_id: product.id,
          ref_code: refCode,
          buyer_email: buyer_email || null,
          buyer_name: buyer_name.trim(),
          buyer_phone: buyer_phone.trim(),
          amount: product.price,
        }),
      });
      if (insertResp.ok) {
        res.status(200).json({ ref_code: refCode, amount: product.price });
        return;
      }
      if (insertResp.status !== 409) break;
    }
    res.status(500).json({ error: 'Không tạo được đơn hàng — thử lại giúp mình.' });
  } catch (e) {
    res.status(500).json({ error: 'Có lỗi xảy ra — thử lại giúp mình.' });
  }
};
