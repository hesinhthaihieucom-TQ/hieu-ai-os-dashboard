// Ladipage khoá "Làm Chủ Edit Video Bằng AI" (edit-video-ai/lp/): kiểm tra khách đã chuyển khoản chưa để trang TỰ chuyển họ
// vào nhóm Zalo lớp học ngay sau khi tiền về. Không cần bảng/cột mới: sepay-webhook.js đã ghi MỌI giao dịch vào
// sepay_transactions (kể cả giao dịch không khớp tài khoản nào, status 'unmatched_code') — nội dung CK của khoá này luôn là
// "SEVQR EDITAI <sđt>", nên ở đây chỉ tra đúng sđt + đúng 1 trong 2 mức giá của khoá (ưu đãi / sau hết giờ).
// Link nhóm Zalo chỉ nằm ở đây và chỉ trả về khi ĐÃ thanh toán — không để lộ trong mã nguồn trang (tránh người chưa đóng tiền lấy được).
// Đổi giá ở trang thì phải đổi AMOUNTS ở đây cho khớp (edit-video-ai/lp/index.html: PROMO/REGULAR).
const { supabaseAdmin } = require('./_lib/supabase-admin');

const GROUP_URL = 'https://zalo.me/g/c9y7thxlocz9b9axgw1k';
const AMOUNTS = [990000, 1290000];

module.exports = async (req, res) => {
  const phone = String((req.method === 'GET' ? req.query.phone : (req.body || {}).phone) || '');
  if (!/^0\d{9}$/.test(phone)) { res.status(400).json({ error: 'Số điện thoại không hợp lệ.' }); return; }
  // Dấu * là ký tự đại diện của PostgREST ilike; *EDITAI*sđt* chịu được việc ngân hàng đổi khoảng trắng/chèn thêm chữ.
  const pattern = encodeURIComponent('*EDITAI*' + phone + '*');
  const resp = await supabaseAdmin(`sepay_transactions?content=ilike.${pattern}&transfer_amount=in.(${AMOUNTS.join(',')})&select=id&limit=1`);
  const rows = resp.ok ? await resp.json() : [];
  const paid = rows.length > 0;
  res.status(200).json(paid ? { ok: true, paid: true, group: GROUP_URL } : { ok: true, paid: false });
};
