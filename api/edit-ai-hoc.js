// Trả nội dung khoá "Làm Chủ Edit Video Bằng AI — Hướng dẫn làm" CHỈ KHI sđt đã thanh toán (cùng cách kiểm tra với edit-ai-lp-status.js:
// sepay-webhook ghi mọi giao dịch vào sepay_transactions, nội dung CK luôn "SEVQR EDITAI <sđt>").
// OWNER_PHONES: sđt chủ khoá (Quỳnh) luôn được vào để xem/thử app, không cần chuyển khoản.
const { supabaseAdmin } = require('./_lib/supabase-admin');
const { MODULES, KIT_URL } = require('./_lib/edit-ai-hoc-content');

const GROUP_URL = 'https://zalo.me/g/c9y7thxlocz9b9axgw1k';
const AMOUNTS = [990000, 1290000];
const OWNER_PHONES = ['0866849193'];

module.exports = async (req, res) => {
  const phone = String((req.method === 'GET' ? req.query.phone : (req.body || {}).phone) || '').replace(/[\s.\-]/g, '');
  if (!/^0\d{9}$/.test(phone)) { res.status(400).json({ error: 'Số điện thoại không hợp lệ.' }); return; }
  let paid = OWNER_PHONES.includes(phone);
  if (!paid) {
    const pattern = encodeURIComponent('*EDITAI*' + phone + '*');
    const resp = await supabaseAdmin(`sepay_transactions?content=ilike.${pattern}&transfer_amount=in.(${AMOUNTS.join(',')})&select=id&limit=1`);
    const rows = resp.ok ? await resp.json() : [];
    paid = rows.length > 0;
  }
  res.setHeader('Cache-Control', 'no-store');
  if (!paid) { res.status(200).json({ ok: true, paid: false }); return; }
  res.status(200).json({ ok: true, paid: true, modules: MODULES, kitUrl: KIT_URL, group: GROUP_URL });
};
