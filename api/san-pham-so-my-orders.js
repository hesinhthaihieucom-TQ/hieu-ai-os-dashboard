// Sản Phẩm Số — "📦 Đơn hàng của tôi": người bán tự xem đơn của CHÍNH SẢN PHẨM MÌNH, không cần
// Quỳnh can thiệp tay (2026-09-02, phần "quản lý đơn hàng tự động" trong yêu cầu làm landing page).
// digital_product_orders KHÔNG có policy nào cho anon/authenticated (xem schema_san_pham_so.sql mục
// 17) — dùng service role nhưng LUÔN tự lọc theo product_id THUỘC ĐÚNG owner_id = user.id trước,
// không tin product_id nào từ client, giống pattern các api/*.js khác trong repo.

const { requireUser } = require('./_lib/auth');
const { supabaseAdmin } = require('./_lib/supabase-admin');

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const user = await requireUser(req);
  if (!user) { res.status(401).json({ error: 'Chưa đăng nhập.' }); return; }

  try {
    const prodResp = await supabaseAdmin(`digital_products?owner_id=eq.${user.id}&select=id`);
    const products = prodResp.ok ? await prodResp.json() : [];
    if (!products.length) { res.status(200).json({ orders: [] }); return; }

    const ids = products.map(p => p.id).join(',');
    const ordersResp = await supabaseAdmin(`digital_product_orders?product_id=in.(${ids})&select=id,buyer_email,amount,status,paid_at,created_at,digital_products(title)&order=created_at.desc`);
    const orders = ordersResp.ok ? await ordersResp.json() : [];
    res.status(200).json({ orders });
  } catch (e) {
    res.status(500).json({ error: 'Có lỗi xảy ra — thử lại giúp mình.' });
  }
};
