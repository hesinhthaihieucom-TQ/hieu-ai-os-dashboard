// Sản Phẩm Số — Quản trị, tab "Doanh thu": admin xem TẤT CẢ đơn hàng của MỌI người bán (khác
// api/san-pham-so-my-orders.js, chỉ trả đơn của chính người bán gọi). digital_product_orders không
// có policy đọc cho anon/authenticated (xem schema_san_pham_so.sql mục 17) — dùng service role,
// nhưng PHẢI tự xác minh người gọi thực sự là admin trước (cùng pattern api/admin-mark-manual-payment.js).

const { requireUser } = require('./_lib/auth');
const { supabaseAdmin } = require('./_lib/supabase-admin');

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const user = await requireUser(req);
  if (!user) { res.status(401).json({ error: 'Chưa đăng nhập.' }); return; }

  try {
    const profResp = await supabaseAdmin(`profiles?id=eq.${user.id}&select=role`);
    const profRows = profResp.ok ? await profResp.json() : [];
    if (!profRows[0] || profRows[0].role !== 'admin') {
      res.status(403).json({ error: 'Chỉ quản trị viên mới xem được doanh thu.' });
      return;
    }

    const ordersResp = await supabaseAdmin(
      `digital_product_orders?select=id,buyer_email,amount,status,paid_at,created_at,product_id,digital_products(title,owner_id)&order=created_at.desc&limit=500`
    );
    const orders = ordersResp.ok ? await ordersResp.json() : [];

    const ownerIds = [...new Set(orders.map(o => o.digital_products && o.digital_products.owner_id).filter(Boolean))];
    let namesById = {};
    if (ownerIds.length) {
      const ownersResp = await supabaseAdmin(`profiles?id=in.(${ownerIds.join(',')})&select=id,full_name`);
      const owners = ownersResp.ok ? await ownersResp.json() : [];
      namesById = Object.fromEntries(owners.map(o => [o.id, o.full_name]));
    }

    const enriched = orders.map(o => ({
      id: o.id,
      buyerEmail: o.buyer_email,
      amount: o.amount,
      status: o.status,
      paidAt: o.paid_at,
      createdAt: o.created_at,
      productTitle: o.digital_products ? o.digital_products.title : null,
      sellerName: o.digital_products ? namesById[o.digital_products.owner_id] : null,
    }));

    const paidOrders = enriched.filter(o => o.status === 'paid');
    const totalRevenue = paidOrders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);

    res.status(200).json({ orders: enriched, totalRevenue, paidCount: paidOrders.length, totalCount: enriched.length });
  } catch (e) {
    res.status(500).json({ error: 'Có lỗi xảy ra — thử lại giúp mình.' });
  }
};
