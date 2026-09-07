// "tính theo tháng kể từ ngày người dùng đăng ký chứ không phải theo tháng trên lịch" (chị Quỳnh
// 2026-09-01) — BUG THẬT phát hiện đúng lúc bước sang tháng 9: paid_ai_month trước đây so bằng
// CHUỖI THÁNG LỊCH ('YYYY-MM', to_char(now(),'YYYY-MM')) — nghĩa là MỌI khách trả phí cùng bị reset
// lượt về 0 đúng ngày 1 mỗi tháng, bất kể họ trả tiền/đăng ký ngày nào trong tháng. Khách đăng ký
// giữa tháng bị cắt ngắn chu kỳ đầu (chưa hết 1 tháng thật đã bị reset về 0, mất lượt còn dư oan),
// còn khách đăng ký cuối tháng lại được "làm mới" gần như ngay sau khi vừa hết hạn cũ (được lợi oan)
// — không công bằng, và cũng sai với cách access_until đã tính (theo SỐ NGÀY từ lúc trả tiền, xem
// AMOUNT_TO_DAYS ở api/sepay-webhook.js — "1 tháng" luôn là ĐÚNG 30 ngày trong toàn bộ codebase này,
// không phải theo lịch).
//
// Đổi paid_ai_month từ chuỗi 'YYYY-MM' sang CHỈ SỐ CHU KỲ 30 NGÀY tính từ profiles.created_at (ngày
// đăng ký) — mỗi user có mốc reset RIÊNG, không còn dồn chung về ngày 1 mỗi tháng. Vẫn lưu vào đúng
// cột paid_ai_month (không đổi tên cột — quá nhiều nơi đọc/ghi cột này), chỉ đổi Ý NGHĨA giá trị lưu
// bên trong (từ 'YYYY-MM' sang '<số chu kỳ>', vd '14') — mọi so sánh "===" ở các nơi khác vẫn hoạt
// động y hệt, chỉ cần đổi cách TÍNH giá trị để so sánh.
//
// CÔNG THỨC PHẢI khớp Y HỆT giữa đây (JS, dùng ở các API cộng lượt bonus: sepay-webhook.js,
// submit-review.js) và consume_ai_quota()/refund_ai_quota() (SQL, xem supabase/schema_core.sql) —
// lệch công thức giữa 2 nơi sẽ khiến chúng tính khác chu kỳ cho cùng 1 user tại cùng 1 thời điểm,
// gây đúng lại loại bug đang sửa (reset nhầm lúc). Nếu sửa công thức ở 1 nơi, PHẢI sửa nơi kia y hệt.
function currentCycleKey(createdAtIso) {
  const createdAt = new Date(createdAtIso).getTime();
  const days = Math.floor((Date.now() - createdAt) / 86400000);
  return String(Math.max(0, Math.floor(days / 30)));
}

// Mốc neo ĐÚNG cho chu kỳ trả phí — first_paid_at (mốc bắt đầu trả phí) nếu có, fallback created_at
// cho ai chưa từng trả phí hoặc trả phí TỪ TRƯỚC KHI cột first_paid_at tồn tại. "tính cho họ từ thời
// điểm họ nâng cấp chứ không phải từ thời điểm đăng ký" (chị Quỳnh 2026-09-07) — dùng hàm này thay vì
// tự viết "profile.first_paid_at || profile.created_at" rải rác. Y HỆT paidCycleAnchor() ở util.js.
function paidCycleAnchor(profile) {
  return (profile && (profile.first_paid_at || profile.created_at)) || null;
}

module.exports = { currentCycleKey, paidCycleAnchor };
