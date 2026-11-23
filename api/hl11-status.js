// Ladipage "Khoá Huấn Luyện 1:1" — kiểm tra khách đã đóng học phí chưa, TỰ kích hoạt 2 quà tặng ngay
// khi phát hiện tiền về (không cần đụng tới AMOUNT_TO_DAYS dùng chung ở api/sepay-webhook.js, tránh
// rủi ro đụng độ/làm sai lệch luồng kích hoạt gói App bình thường — xem CLAUDE.md "mỗi gói giá phải
// khác nhau" — 5.900.000đ/8.900.000đ KHÔNG trùng bất kỳ mức giá nào khác trong hệ thống, đã kiểm tra).
// Cùng pattern api/edit-ai-lp-status.js: tự dò thẳng sepay_transactions theo nội dung CK + đúng 1
// trong 2 mức giá (ưu đãi hiện tại / giá gốc, phòng trường hợp đồng hồ vừa nhảy mốc lúc khách chuyển
// khoản), KHÔNG cần chờ webhook xử lý trước.
//
// 2 quà tặng kèm khoá:
// 1) Free 1 tháng App Xây Nhân Hiệu — PATCH thẳng profiles (has_paid=true, access_until=+30 ngày),
//    CHỈ patch 1 LẦN DUY NHẤT (check has_paid trước) để tránh polling nhiều lần tự đẩy access_until
//    lùi xa thêm mỗi lần gọi.
// 2) Gói Edit Video AI — tặng bằng cách đưa thẳng vào CÙNG nhóm Zalo lớp học Edit Video AI (GROUP_URL
//    bên dưới, same link api/edit-ai-lp-status.js trả cho khách TRẢ TIỀN khoá đó) — không cần thêm
//    cột/flag riêng trong DB, link chỉ lộ ra sau khi xác nhận đã thanh toán, y hệt cách trang kia làm.
const { supabaseAdmin } = require('./_lib/supabase-admin');

const GROUP_URL_EDIT_VIDEO_AI = 'https://zalo.me/g/c9y7thxlocz9b9axgw1k';
const AMOUNTS = [5900000, 8900000];
const FREE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

module.exports = async (req, res) => {
  const refCode = (req.method === 'GET' ? req.query.ref_code : (req.body || {}).ref_code) || '';
  if (!refCode || !/^[A-Za-z0-9]+$/.test(refCode)) { res.status(400).json({ error: 'Thiếu mã đối chiếu.' }); return; }

  // Dấu * là ký tự đại diện của PostgREST ilike; *HL11*REFCODE* chịu được việc ngân hàng đổi khoảng
  // trắng/chèn thêm chữ vào nội dung chuyển khoản gốc "SEVQR HL11 <REFCODE>".
  const pattern = encodeURIComponent('*HL11*' + refCode + '*');
  const payResp = await supabaseAdmin(`sepay_transactions?content=ilike.${pattern}&transfer_amount=in.(${AMOUNTS.join(',')})&select=id&limit=1`);
  const payRows = payResp.ok ? await payResp.json() : [];
  const paid = payRows.length > 0;

  if (!paid) { res.status(200).json({ ok: true, paid: false }); return; }

  const profResp = await supabaseAdmin(`profiles?ref_code=eq.${encodeURIComponent(refCode)}&select=id,has_paid`);
  const profRows = profResp.ok ? await profResp.json() : [];
  const profile = profRows[0];
  if (profile && !profile.has_paid) {
    const accessUntil = new Date(Date.now() + FREE_MONTH_MS).toISOString();
    await supabaseAdmin(`profiles?id=eq.${profile.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ has_paid: true, access_until: accessUntil, first_paid_at: new Date().toISOString() }),
    });
  }

  res.status(200).json({ ok: true, paid: true, group: GROUP_URL_EDIT_VIDEO_AI });
};
