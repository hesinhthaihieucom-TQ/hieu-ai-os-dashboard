// Kiểm tra 1 tài khoản Xây Nhân Hiệu đã thanh toán (has_paid) chưa — dùng để Landing Page
// (nhan-hieu/lp/) tự poll trạng thái ngay sau khi khách quét mã QR chuyển khoản, không cần khách tự
// bấm "tải lại" nhiều lần. Cùng pattern api/tc-lp-status.js, chỉ khác cột kiểm tra (has_paid — cột
// gốc của nhan-hieu, không phải tc_has_paid của tai-chinh). Chỉ nhận vào ref_code (khách đã tự thấy
// mã này ngay trên màn hình của họ, không phải thông tin bí mật) và CHỈ trả về đúng 1 boolean
// has_paid — không lộ thêm bất kỳ dữ liệu nào khác của tài khoản đó, an toàn dù gọi ẩn danh.
const { supabaseAdmin } = require('./_lib/supabase-admin');

module.exports = async (req, res) => {
  const refCode = (req.method === 'GET' ? req.query.ref_code : (req.body || {}).ref_code) || '';
  if (!refCode || !/^[A-Za-z0-9]+$/.test(refCode)) { res.status(400).json({ error: 'Thiếu mã đối chiếu.' }); return; }

  const resp = await supabaseAdmin(`profiles?ref_code=eq.${encodeURIComponent(refCode)}&select=has_paid`);
  const rows = resp.ok ? await resp.json() : [];
  res.status(200).json({ ok: true, paid: !!(rows[0] && rows[0].has_paid) });
};
