// Serverless function — nhận webhook từ SePay mỗi khi có giao dịch vào tài khoản Vietinbank
// dùng chung cho Xây Nhân Hiệu, Sổ Dòng Tiền Tâm Thức, Sản Phẩm Số VÀ Trợ Lý AI Tư Vấn & CRM
// (2026-08-29, chị Quỳnh chỉ có 1 tài khoản ngân hàng thật), tự đối chiếu mã tham chiếu (ref_code)
// trong nội dung chuyển khoản và số tiền, rồi tự gia hạn access_until (nhan-hieu)/bật tc_has_paid
// (tai-chinh)/gia hạn crm_access_until (tro-ly-crm) cho đúng tài khoản — không cần admin bấm tay.
// Nhan-hieu/tai-chinh phân biệt sản phẩm CHỈ qua số tiền (ref_code dùng chung định dạng "XNH...")
// — 2 tập số tiền đó không được trùng nhau. tro-ly-crm dùng CỘT + TIỀN TỐ ref_code riêng ("CRM...",
// xem extractCrmRefCode) nên số tiền của nó ĐƯỢC PHÉP trùng nhan-hieu, không cần rà số tiền nữa.
//
// Bảo mật: xác thực bằng header "Authorization: Apikey <SEPAY_WEBHOOK_APIKEY>" (khớp đúng
// method "API Key" cấu hình trong SePay dashboard khi tạo webhook). Dùng SUPABASE_SERVICE_ROLE_KEY
// (bỏ qua RLS) vì đây là thao tác hệ thống, không gắn với 1 phiên đăng nhập user nào.

const crypto = require('crypto');
const { currentCycleKey } = require('./_lib/quota-cycle');

const SUPABASE_URL = 'https://ltcjlnvceuspnwldsbgi.supabase.co';

// Ưu đãi "mua sớm trong lúc dùng thử" — CHUẨN HOÁ THÀNH QUY TẮC LÂU DÀI (2026-08-26, theo quyết
// định chị Quỳnh: "sẽ luôn có chế độ ưu đãi mua 6 tặng 1 và mua 12 tặng 2 trong 3 ngày đầu dùng
// thử, sau 3 ngày thì giá về như cũ"), thay cho bản một-lần-duy-nhất "đúng ngày Zoom 26/8" trước đó
// (ZOOM_BONUS_DATE cũ so 1 NGÀY LỊCH chung cho mọi người — giờ so ĐÚNG 3 NGÀY ĐẦU của TỪNG người kể
// từ lúc HỌ đăng ký, không phụ thuộc ngày nào trên lịch). Hợp lý vì hạn dùng thử mới cũng chỉ còn 3
// ngày (xem handle_new_user() ở schema_full.sql) — tạo lý do cụ thể để quyết định mua NGAY trong
// lúc còn đang hào hứng dùng thử, thay vì để nguội rồi quên mất.
// KHÔNG tặng lượt AI (chị Quỳnh nhận định: người mới chưa dùng app thì chưa hiểu giá trị 1 lượt là
// gì, tặng thêm THỜI GIAN dùng dễ hiểu/hấp dẫn hơn hẳn với người lần đầu quyết định mua). Chỉ áp
// dụng gói 6/12 tháng (days=180/365) — gói 1 tháng không có. Không cộng vào last_plan_days (giữ
// đúng số ngày GỐC của gói) để Quản trị vẫn lọc đúng "6 tháng"/"12 tháng" như bình thường — bonus
// chỉ cộng thêm vào access_until thực tế.
const EARLY_BIRD_WINDOW_DAYS = 3;
const EARLY_BIRD_BONUS_DAYS_BY_PLAN = { 180: 30, 365: 60 }; // 6 tháng +1 tháng, 12 tháng +2 tháng
// 2026-08-26, chị Quỳnh chốt: học viên KHÔNG được cộng dồn ưu đãi mua sớm (giá học viên đã là mức
// giảm riêng rồi) — loại 2 số tiền giá học viên 6/12 tháng khỏi bonus, dù cùng days=180/365 với giá
// thường. Gói flash-sale cũng loại tương tự (đã là ưu đãi riêng theo ngày lịch, xem app-shell.js).
const EARLY_BIRD_EXCLUDED_AMOUNTS = new Set([1912000, 3192000, 1890000, 2790000]);
function isWithinEarlyBirdWindow(profileCreatedAt) {
  if (!profileCreatedAt) return false;
  const ageMs = Date.now() - new Date(profileCreatedAt).getTime();
  return ageMs <= EARLY_BIRD_WINDOW_DAYS * 86400000;
}

// Số tiền → số ngày được cộng thêm. Phải khớp CHÍNH XÁC 1 trong các mức giá đang bán, và
// TUYỆT ĐỐI KHÔNG được trùng số tiền giữa 2 gói khác thời hạn — hệ thống chỉ nhận diện gói
// qua đúng số tiền chuyển khoản, trùng số tiền sẽ cộng sai số ngày mà không có cách nào phát hiện.
const AMOUNT_TO_DAYS = {
  499000: 30,    // 1 tháng, giá chuẩn (cũng là giá gói 1 tháng của học viên SAU KHI đã dùng ưu đãi tháng đầu)
  2390000: 180,  // 6 tháng, giá chuẩn
  3990000: 365,  // 12 tháng, giá chuẩn
  399200: 30,    // 1 tháng, ưu đãi học viên khoá Xây Nhân Hiệu — CHỈ áp dụng ĐÚNG THÁNG ĐẦU TIÊN (xem cờ first_month_discount_used)
  1912000: 180,  // 6 tháng, giá học viên (giảm 20% so với giá chuẩn 2.390.000đ) — áp dụng lâu dài
  3192000: 365,  // 12 tháng, giá học viên (giảm 20% so với giá chuẩn 3.990.000đ) — áp dụng lâu dài
  // Ưu đãi flash-sale 19-20/8 (xem FLASH_SALE_PLANS ở nhan-hieu/js/app-shell.js) — THIẾU 2 dòng này
  // là lý do khách chuyển đúng giá ưu đãi đêm 19/8 vẫn không tự kích hoạt được dù đã fix SEVQR.
  1890000: 180,  // 6 tháng, ưu đãi flash-sale
  2790000: 365,  // 12 tháng, ưu đãi flash-sale
  // Giá giới thiệu (referral, xem REFERRAL_REGULAR_PLANS ở nhan-hieu/js/app-shell.js) — giảm 15%
  // so với giá thường, CHỈ hiện cho người có referred_by_ref_code. Khớp đúng những số tiền này còn
  // kích hoạt thưởng lượt AI cho người đã giới thiệu (xem creditReferralReward bên dưới).
  424000: 30,    // 1 tháng, giá giới thiệu
  2032000: 180,  // 6 tháng, giá giới thiệu
  3392000: 365,  // 12 tháng, giá giới thiệu
};
// Số tiền coi là "đã dùng ưu đãi tháng đầu" — sau lần này học viên mua gói 1 tháng sẽ trả giá thường.
const FIRST_MONTH_DISCOUNT_AMOUNT = 399200;

// Gói TRỌN ĐỜI của Sổ Dòng Tiền Tâm Thức (tai-chinh/, sản phẩm KHÁC, giá KHÁC — không đụng
// access_until/has_paid ở trên, xem tc_has_paid/tc_paid_at trong schema_full.sql). 3 mức giá THEO
// TỪNG NGƯỜI DÙNG (2026-08-26, chị Quỳnh chốt — THAY hẳn mốc giá ra mắt theo lịch chung trước đó):
// đếm từ lúc người đó vào app lần đầu, xem tcCurrentPrice()/TC_PRICE_TIER_* ở tai-chinh/js/app-shell.js
// — ngày 0-15: 299k, 15-30: 599k, sau 30: 999k (giá chuẩn). Webhook KHÔNG tự tính lại mốc ngày của
// từng người — chỉ cần khớp ĐÚNG 1 trong 3 số tiền này thì coi là mua trọn đời tai-chinh, kích hoạt
// tc_has_paid ngay (validate "đúng mức giá của đúng người" là việc của UI lúc hiện mã QR, không phải
// của webhook — không có cách nào server tự chặn ai đó cố ý trả ít hơn giá đang hiện cho họ, coi
// đây là rủi ro chấp nhận được, giống hệt rủi ro đã có sẵn từ trước ở mốc giá ra mắt theo lịch cũ).
// CẢ 3 số đã kiểm tra không trùng bất kỳ giá trị nào trong AMOUNT_TO_DAYS/AMOUNT_TO_TOPUP_LUOT ở trên
// (đặc biệt tránh 499000 đang là giá tháng chuẩn của Xây Nhân Hiệu) — webhook phân biệt 2 sản phẩm
// CHỈ qua số tiền chuyển khoản, ref_code dùng chung định dạng "SEVQR <ref_code>" với nhan-hieu (cùng
// 1 tài khoản ngân hàng thật).
const TC_PRICE_TIER_1_AMOUNT = 299000; // ngày 0-15 kể từ lần đầu vào app
const TC_PRICE_TIER_2_AMOUNT = 599000; // ngày 15-30
const TC_PRICE_TIER_3_AMOUNT = 999000; // sau ngày 30 — giá chuẩn
const TC_LIFETIME_AMOUNTS = new Set([TC_PRICE_TIER_1_AMOUNT, TC_PRICE_TIER_2_AMOUNT, TC_PRICE_TIER_3_AMOUNT]);
// Chương trình giới thiệu tai-chinh (2026-08-23, chị Quỳnh chốt "20% cho người giới thiệu") — MỘT
// CHIỀU, referee vẫn trả nguyên giá đang bán lúc đó (khác nhan-hieu có giảm giá riêng cho referee).
// Trả bằng TIỀN THẬT (không có hệ lượt AI như nhan-hieu để quy đổi) — ghi vào sổ tc_referrals, chị
// Quỳnh tự chuyển khoản tay rồi đánh dấu đã trả trong Quản Trị (xem tai-chinh/js/quan-tri.js). Tính
// theo ĐÚNG số tiền referee vừa trả (299k/599k/999k tuỳ mốc ngày của họ) — không dùng 1 số cố định — để thưởng đúng 20%
// giá trị đơn hàng thật, không lệch khi giá đổi qua mốc ra mắt.
const TC_REFERRAL_REWARD_PERCENT = 0.20;

// Gói VIP Partner — mua trọn 55.000.000đ (Unicity Cân Bằng Chuyển Hoá 2 tháng + coaching 1:1 hàng
// tuần 2 tháng + dùng mọi chương trình đào tạo/sản phẩm số 1 năm, 2026-08-27 chị Quỳnh chốt). Mua 1
// lần, set is_vip_partner=true VĨNH VIỄN trên profiles — không hết hạn theo năm dùng sản phẩm đi kèm,
// không liên quan số lượt giới thiệu (khác hẳn "Hiểu Partner" ở PARTNER_REFERRAL_THRESHOLD, xem
// quan-tri.js/tai-khoan.js). VIP Partner cộng thêm +10 điểm % hoa hồng trên MỌI sản phẩm có cơ chế
// giới thiệu ở FILE NÀY (nhan-hieu + tai-chinh) — không cần loại trừ Unicity riêng vì Unicity không
// có mặt trong file này, hoa hồng Unicity xử lý hoàn toàn ngoài hệ thống theo đúng chính sách Unicity.
const VIP_PARTNER_AMOUNT = 55000000;
const VIP_PARTNER_BONUS_PERCENT = 0.10;

// Số tiền giá giới thiệu — khớp 1 trong 3 số này thì mới kích hoạt thưởng cho người đã giới thiệu
// (gói ưu đãi/flash-sale và giá học viên KHÔNG bao giờ tính hoa hồng, theo yêu cầu chị Quỳnh).
const REFERRAL_AMOUNTS = new Set([424000, 2032000, 3392000]);
// Quy đổi: người giới thiệu được thưởng lượt AI = 15% giá trị đơn hàng, tính theo giá bán lẻ
// "Mua thêm lượt" hiện tại (1.500đ/lượt, xem AMOUNT_TO_TOPUP_LUOT) — chốt cùng lúc với % giảm giá
// cho người được giới thiệu (xem memory project_referral_program_plan).
const REFERRAL_LUOT_PER_DONG = 1500;
const REFERRAL_REWARD_PERCENT = 0.15;

// "Mua thêm lượt" — dành cho khách ĐÃ TRẢ PHÍ dùng vượt trần 200 lượt/tháng (xem
// api/_lib/trial-quota.js). Số tiền này KHÔNG được trùng bất kỳ số tiền nào ở AMOUNT_TO_DAYS.
// Cộng thẳng vào paid_ai_bonus của đúng tháng hiện tại, KHÔNG đụng access_until/has_paid.
// 3 mức, mua càng nhiều giá/lượt càng rẻ (2026-08-21, chốt cùng chị Quỳnh — chi phí Anthropic thực
// tế đo được hôm 20/8 chỉ ~550-650đ/lượt nên còn nhiều dư địa giảm giá mà vẫn lãi tốt):
// 100 lượt = 1.500đ/lượt, 300 lượt = 1.400đ/lượt (~7%), 600 lượt = 1.300đ/lượt (~13%).
const AMOUNT_TO_TOPUP_LUOT = {
  150000: 100,
  420000: 300,
  780000: 600,
};

function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function extractRefCode(content) {
  const m = /XNH[A-Z0-9]{6}/i.exec(content || '');
  return m ? m[0].toUpperCase() : null;
}

// Sản Phẩm Số (san-pham-so/) — mã đơn hàng của khách MUA LẺ, KHÔNG có tài khoản/profile (khác hẳn
// XNH ở trên, gắn với 1 profile). Tiền tố "SPS" tách biệt hoàn toàn khỏi "XNH" nên 2 luồng đối chiếu
// không bao giờ đụng nhau dù cùng chạy trong 1 webhook. Không dùng bảng số tiền cố định như
// AMOUNT_TO_DAYS (giá sản phẩm số do người bán tự đặt, không cố định) — tra thẳng theo ref_code, số
// tiền chỉ để đối chiếu an toàn (xem nhánh xử lý bên dưới).
function extractProductOrderRefCode(content) {
  const m = /SPS[A-Z0-9]{6,}/i.exec(content || '');
  return m ? m[0].toUpperCase() : null;
}

// Trợ Lý AI Tư Vấn & CRM (tro-ly-crm/, 2026-08-29) — gắn với 1 profile (khác SPS ở trên) nhưng
// dùng CỘT RIÊNG profiles.crm_ref_code (tiền tố "CRM"), không đụng ref_code "XNH" của nhan-hieu —
// chị Quỳnh chốt dùng tiền tố riêng để không phải rà số tiền cho khỏi trùng giữa các sản phẩm nữa
// (xem CRM_AMOUNT_TO_DAYS bên dưới — được PHÉP trùng số với AMOUNT_TO_DAYS vì tiền tố đã phân biệt
// sản phẩm trước khi so số tiền).
function extractCrmRefCode(content) {
  const m = /CRM[A-Z0-9]{6}/i.exec(content || '');
  return m ? m[0].toUpperCase() : null;
}

// Sản Phẩm Số — GÓI THÁNG riêng (2026-09-01, chị Quỳnh: "e vẫn thu phí người dùng là 599k cho app
// này 1 tháng"), KHÁC HẲN nhánh SPS ở trên (đơn mua lẻ 1 sản phẩm, không có profile) — đây là gói
// thuê bao gắn với 1 profile (giống crm_ref_code), dùng cột riêng profiles.sps_ref_code/sps_has_paid/
// sps_access_until. Tiền tố "SPUP" (Sản Phẩm Số Upgrade) CỐ Ý không bắt đầu bằng "SPS" — mã bắt đầu
// "SPS..." đã bị regex extractProductOrderRefCode ở trên "vồ" mất trước khi tới được đây.
function extractSpsSubRefCode(content) {
  const m = /SPUP[A-Z0-9]{6}/i.exec(content || '');
  return m ? m[0].toUpperCase() : null;
}
// Chỉ 1 gói (599.000đ/tháng) — chưa có gói 6/12 tháng hay "mua thêm lượt" (thêm sau nếu Quỳnh cần).
const SPS_SUB_AMOUNT_TO_DAYS = {
  599000: 30,
};
const CRM_AMOUNT_TO_DAYS = {
  499000: 30,    // 1 tháng
  2490000: 180,  // 6 tháng
  3990000: 365,  // 1 năm
  // Giá giới thiệu (referral, 2026-09-01, "làm tương tự như web xây nhân hiệu") — giảm 15% so giá
  // thường, CHỈ hiện cho người có referred_by_ref_code (xem tro-ly-crm/js/nang-cap.js). Khớp đúng
  // những số tiền này còn kích hoạt thưởng lượt AI cho người đã giới thiệu (creditCrmReferralReward
  // bên dưới). 1 tháng/1 năm TRÙNG SỐ với giá giới thiệu của nhan-hieu (424000/3392000) vì 2 sản
  // phẩm cùng giá gốc 499000/3990000 — an toàn vì nhánh crmRefCode đã tách biệt hoàn toàn theo tiền
  // tố trước khi so số tiền, không có rủi ro đụng độ.
  424000: 30,    // 1 tháng, giá giới thiệu
  2116000: 180,  // 6 tháng, giá giới thiệu (giảm 15% so 2.490.000đ — KHÁC số của nhan-hieu vì giá gốc 6 tháng khác nhau)
  3392000: 365,  // 1 năm, giá giới thiệu
};
// Số tiền coi là "đã mua giá giới thiệu" — khớp 1 trong 3 số này thì mới kích hoạt thưởng cho
// referrer (không tính khi mua "Mua thêm lượt" hay các số tiền khác).
const CRM_REFERRAL_AMOUNTS = new Set([424000, 2116000, 3392000]);
// Quy đổi giống hệt nhan-hieu — thưởng lượt AI = 15% giá trị đơn hàng, quy đổi theo giá bán lẻ
// "Mua thêm lượt" hiện tại (1.500đ/lượt, dùng lại REFERRAL_LUOT_PER_DONG đã khai báo ở trên).
const CRM_REFERRAL_REWARD_PERCENT = 0.15;
// "Mua thêm lượt" tro-ly-crm (2026-08-30, chị Quỳnh chốt "tính tiền như web xây nhân hiệu") — CỐ Ý
// dùng lại ĐÚNG số tiền/giá của AMOUNT_TO_TOPUP_LUOT (nhan-hieu) — an toàn vì nhánh crmRefCode ở
// dưới tách biệt hoàn toàn (chỉ vào nhánh này khi content khớp "CRM......", không rơi qua nhánh XNH
// nữa), không có rủi ro đụng độ dù trùng số tiền. Cộng vào crm_ai_bonus (xem consume_crm_ai_quota).
const CRM_AMOUNT_TO_TOPUP_LUOT = {
  150000: 100,
  420000: 300,
  780000: 600,
};

// Thưởng người ĐÃ giới thiệu (referrer) khi người ĐƯỢC giới thiệu (referee) vừa thanh toán thành
// công giá giới thiệu lần ĐẦU TIÊN — best-effort, KHÔNG throw ra ngoài: nếu bước này lỗi, referee
// vẫn đã được kích hoạt gói bình thường ở trên, không nên rollback hay chặn cả webhook chỉ vì phần
// thưởng phụ này thất bại. Tự thưởng bằng đúng cơ chế đã có sẵn (không cần bảng/cột lượt mới):
// - Người giới thiệu ĐANG dùng thử: hoàn (trừ ngược) trial_ai_uses — giống hệt refund_ai_quota,
//   cho họ thêm dư địa dưới trần dùng thử hiện có.
// - Người giới thiệu ĐÃ trả phí: cộng thẳng vào paid_ai_bonus tháng hiện tại — giống hệt cách
//   "Mua thêm lượt" cộng bonus (dùng hết trong tháng, không cộng dồn vĩnh viễn).
async function creditReferralReward(refereeProfile, transferAmount) {
  if (!REFERRAL_AMOUNTS.has(transferAmount)) return;
  if (!refereeProfile.referred_by_ref_code || refereeProfile.referral_reward_given) return;

  const referrerResp = await supabaseAdmin(
    `profiles?ref_code=eq.${refereeProfile.referred_by_ref_code}&select=id,has_paid,trial_ai_uses,paid_ai_uses,paid_ai_month,paid_ai_bonus,is_vip_partner,created_at`
  );
  const referrerRows = referrerResp.ok ? await referrerResp.json() : [];
  const referrer = referrerRows[0];
  if (!referrer) return; // mã giới thiệu không còn khớp ai (vd tài khoản đã bị xoá) — bỏ qua, không lỗi

  // VIP Partner (xem VIP_PARTNER_AMOUNT ở trên) cộng thêm +10 điểm % — 15% thành 25%.
  const rewardPercent = REFERRAL_REWARD_PERCENT + (referrer.is_vip_partner ? VIP_PARTNER_BONUS_PERCENT : 0);
  const rewardLuot = Math.round((transferAmount * rewardPercent) / REFERRAL_LUOT_PER_DONG);
  if (rewardLuot <= 0) return;

  const rewardPatch = referrer.has_paid
    ? (() => {
        // Chu kỳ 30 ngày từ ngày đăng ký, không phải tháng lịch (xem api/_lib/quota-cycle.js).
        const cycleKey = currentCycleKey(referrer.created_at);
        const sameCycle = referrer.paid_ai_month === cycleKey;
        return sameCycle
          ? { paid_ai_bonus: (referrer.paid_ai_bonus || 0) + rewardLuot }
          : { paid_ai_month: cycleKey, paid_ai_uses: 0, paid_ai_bonus: rewardLuot };
      })()
    : { trial_ai_uses: Math.max(0, (referrer.trial_ai_uses || 0) - rewardLuot) };

  const patchResp = await supabaseAdmin(`profiles?id=eq.${referrer.id}`, {
    method: 'PATCH',
    body: JSON.stringify(rewardPatch),
  });
  if (!patchResp.ok) return;

  // Đánh dấu đã thưởng NGAY (trước khi ghi log referrals) — referee này không được thưởng lại lần
  // 2 kể cả nếu bước ghi log referrals bên dưới lỗi.
  await supabaseAdmin(`profiles?id=eq.${refereeProfile.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ referral_reward_given: true }),
  });
  await supabaseAdmin('referrals', {
    method: 'POST',
    prefer: 'return=minimal',
    body: JSON.stringify({
      referrer_id: referrer.id,
      referee_id: refereeProfile.id,
      package_amount: transferAmount,
      reward_luot: rewardLuot,
    }),
  });
}

// Thưởng referrer của tai-chinh khi referee vừa mua TRỌN ĐỜI lần ĐẦU TIÊN — tiền thật, ghi sổ
// tc_referrals (paid=false), chị Quỳnh tự chuyển khoản tay + đánh dấu đã trả sau. Best-effort,
// KHÔNG throw ra ngoài — referee đã kích hoạt tc_has_paid xong ở trên rồi, phần thưởng cho
// referrer là phụ, không nên làm hỏng cả webhook chỉ vì bước này lỗi.
async function creditTcReferralReward(refereeProfile, transferAmount) {
  if (!refereeProfile.referred_by_ref_code || refereeProfile.tc_referral_reward_given) return;

  const referrerResp = await supabaseAdmin(`profiles?ref_code=eq.${refereeProfile.referred_by_ref_code}&select=id,is_vip_partner`);
  const referrerRows = referrerResp.ok ? await referrerResp.json() : [];
  const referrer = referrerRows[0];
  if (!referrer) return; // mã giới thiệu không còn khớp ai (vd tài khoản đã bị xoá) — bỏ qua, không lỗi

  // VIP Partner (xem VIP_PARTNER_AMOUNT ở trên) cộng thêm +10 điểm % — 20% thành 30%.
  const rewardPercent = TC_REFERRAL_REWARD_PERCENT + (referrer.is_vip_partner ? VIP_PARTNER_BONUS_PERCENT : 0);
  await supabaseAdmin('tc_referrals', {
    method: 'POST',
    prefer: 'return=minimal',
    body: JSON.stringify({
      referrer_id: referrer.id,
      referee_id: refereeProfile.id,
      reward_amount: Math.round(transferAmount * rewardPercent),
    }),
  });
  // Đánh dấu đã thưởng SAU KHI ghi sổ thành công — nếu ghi sổ lỗi, lần webhook sau (nếu SePay retry)
  // vẫn còn cơ hội thử lại, không mất luôn phần thưởng của referrer.
  await supabaseAdmin(`profiles?id=eq.${refereeProfile.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ tc_referral_reward_given: true }),
  });
}

// Thưởng referrer của tro-ly-crm khi referee vừa mua giá giới thiệu lần ĐẦU TIÊN — best-effort,
// KHÔNG throw ra ngoài (referee đã kích hoạt crm_access_until xong ở trên rồi). Khác nhan-hieu ở
// chỗ tro-ly-crm KHÔNG có khái niệm "dùng thử" — referrer chưa từng trả phí vẫn được cộng thẳng
// vào crm_ai_bonus (giống hệt cách nhánh topupLuot cộng bonus bên dưới), nằm chờ tới khi họ trả phí
// thì dùng được ngay, không cần refund ngược 1 bộ đếm dùng thử nào (không tồn tại ở sản phẩm này).
async function creditCrmReferralReward(refereeProfile, transferAmount) {
  if (!CRM_REFERRAL_AMOUNTS.has(transferAmount)) return;
  if (!refereeProfile.referred_by_ref_code || refereeProfile.crm_referral_reward_given) return;

  const referrerResp = await supabaseAdmin(
    `profiles?ref_code=eq.${refereeProfile.referred_by_ref_code}&select=id,is_vip_partner,crm_ai_uses,crm_ai_month,crm_ai_bonus`
  );
  const referrerRows = referrerResp.ok ? await referrerResp.json() : [];
  const referrer = referrerRows[0];
  if (!referrer) return; // mã giới thiệu không còn khớp ai (vd tài khoản đã bị xoá) — bỏ qua, không lỗi

  // VIP Partner (xem VIP_PARTNER_AMOUNT ở trên) cộng thêm +10 điểm % — 15% thành 25%.
  const rewardPercent = CRM_REFERRAL_REWARD_PERCENT + (referrer.is_vip_partner ? VIP_PARTNER_BONUS_PERCENT : 0);
  const rewardLuot = Math.round((transferAmount * rewardPercent) / REFERRAL_LUOT_PER_DONG);
  if (rewardLuot <= 0) return;

  // Cộng vào crm_ai_bonus của THÁNG HIỆN TẠI — khớp đúng logic nhánh topupLuot ở dưới (crm dùng
  // tháng lịch, không phải chu kỳ 30 ngày như paid_ai_* của nhan-hieu).
  const month = new Date().toISOString().slice(0, 7);
  const sameMonth = referrer.crm_ai_month === month;
  const rewardPatch = sameMonth
    ? { crm_ai_bonus: (referrer.crm_ai_bonus || 0) + rewardLuot }
    : { crm_ai_month: month, crm_ai_uses: 0, crm_ai_bonus: rewardLuot };

  const patchResp = await supabaseAdmin(`profiles?id=eq.${referrer.id}`, {
    method: 'PATCH',
    body: JSON.stringify(rewardPatch),
  });
  if (!patchResp.ok) return;

  // Đánh dấu đã thưởng NGAY (trước khi ghi log crm_referrals) — referee này không được thưởng lại
  // lần 2 kể cả nếu bước ghi log bên dưới lỗi.
  await supabaseAdmin(`profiles?id=eq.${refereeProfile.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ crm_referral_reward_given: true }),
  });
  await supabaseAdmin('crm_referrals', {
    method: 'POST',
    prefer: 'return=minimal',
    body: JSON.stringify({
      referrer_id: referrer.id,
      referee_id: refereeProfile.id,
      package_amount: transferAmount,
      reward_luot: rewardLuot,
    }),
  });
}

// fetch() mặc định KHÔNG có giới hạn thời gian chờ — nếu Supabase bị kẹt, request có thể treo tới
// tận khi Vercel tự ngắt hàm (300s), khiến SePay coi webhook là timeout và gửi lại giao dịch (retry),
// có nguy cơ xử lý trùng. Đặt trần 12s giống supabaseRpc ở trial-quota.js.
async function supabaseAdmin(path, opts = {}) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    return await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      ...opts,
      headers: {
        'content-type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Prefer: opts.prefer || 'return=representation',
        ...(opts.headers || {}),
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ success: false }); return; }

  const expectedKey = process.env.SEPAY_WEBHOOK_APIKEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!expectedKey || !serviceKey) {
    // Chưa cấu hình xong — trả lỗi rõ ràng để dễ debug lúc setup, không âm thầm bỏ qua.
    res.status(500).json({ success: false, error: 'Server chưa cấu hình SEPAY_WEBHOOK_APIKEY hoặc SUPABASE_SERVICE_ROLE_KEY.' });
    return;
  }

  const authHeader = req.headers['authorization'] || '';
  const providedKey = authHeader.replace(/^Apikey\s+/i, '');
  if (!timingSafeEqual(providedKey, expectedKey)) {
    res.status(401).json({ success: false });
    return;
  }

  try {
    const body = req.body || {};
    const {
      id: sepayId, gateway, transactionDate, accountNumber,
      transferAmount, content, transferType,
    } = body;

    // Giao dịch tiền RA thì bỏ qua hoàn toàn, không ghi log (không liên quan đến kích hoạt).
    if (transferType !== 'in') {
      res.status(200).json({ success: true });
      return;
    }

    // Chống xử lý trùng nếu SePay gửi lại cùng 1 giao dịch (retry).
    if (sepayId) {
      const dupCheck = await supabaseAdmin(`sepay_transactions?sepay_id=eq.${sepayId}&select=id`, { prefer: 'return=minimal' });
      const dupRows = dupCheck.ok ? await dupCheck.json() : [];
      if (Array.isArray(dupRows) && dupRows.length > 0) {
        res.status(200).json({ success: true });
        return;
      }
    }

    const refCode = extractRefCode(content);
    // Chỉ thử nhận diện mã đơn Sản Phẩm Số nếu KHÔNG khớp mã XNH — 2 định dạng không thể cùng khớp
    // 1 nội dung chuyển khoản thật (tiền tố khác nhau), nhưng giữ if/else rõ ràng cho dễ đọc.
    const productOrderRefCode = !refCode ? extractProductOrderRefCode(content) : null;
    const crmRefCode = (!refCode && !productOrderRefCode) ? extractCrmRefCode(content) : null;
    const spsSubRefCode = (!refCode && !productOrderRefCode && !crmRefCode) ? extractSpsSubRefCode(content) : null;
    let status = 'unmatched_code';
    let matchedProfileId = null;
    let matchedProductOrderId = null;
    let daysGranted = null;
    let topupLuotGranted = null;

    if (refCode) {
      const profResp = await supabaseAdmin(`profiles?ref_code=eq.${refCode}&select=id,access_until,has_paid,paid_ai_uses,paid_ai_month,paid_ai_bonus,referred_by_ref_code,referral_reward_given,tc_referral_reward_given,created_at`);
      const profRows = profResp.ok ? await profResp.json() : [];
      const profile = profRows[0];

      if (profile) {
        const days = AMOUNT_TO_DAYS[transferAmount];
        const topupLuot = AMOUNT_TO_TOPUP_LUOT[transferAmount];
        if (days) {
          const bonusDays = (!EARLY_BIRD_EXCLUDED_AMOUNTS.has(transferAmount) && isWithinEarlyBirdWindow(profile.created_at) && EARLY_BIRD_BONUS_DAYS_BY_PLAN[days]) ? EARLY_BIRD_BONUS_DAYS_BY_PLAN[days] : 0;
          const base = (profile.access_until && new Date(profile.access_until).getTime() > Date.now())
            ? new Date(profile.access_until) : new Date();
          const next = new Date(base.getTime() + (days + bonusDays) * 86400000);
          // has_paid=true tắt hẳn giới hạn lượt AI dùng thử (xem api/_lib/trial-quota.js) — ngay
          // khi khớp được 1 giao dịch thật, không còn giới hạn nào áp dụng nữa.
          const patchBody = { access_until: next.toISOString(), has_paid: true, last_plan_days: days };
          // Ưu đãi tháng đầu chỉ áp dụng đúng 1 lần — đánh dấu đã dùng để lần mua gói 1 tháng sau
          // đó tự động về giá thường (gói 6/12 tháng học viên không bị ảnh hưởng bởi cờ này).
          if (transferAmount === FIRST_MONTH_DISCOUNT_AMOUNT) patchBody.first_month_discount_used = true;
          const updateResp = await supabaseAdmin(`profiles?id=eq.${profile.id}`, {
            method: 'PATCH',
            body: JSON.stringify(patchBody),
          });
          if (updateResp.ok) {
            status = 'matched';
            matchedProfileId = profile.id;
            daysGranted = days + bonusDays; // ghi cả bonus vào log giao dịch để đối soát thấy rõ
            // Best-effort, KHÔNG để lỗi ở đây làm mất luôn việc ghi log sepay_transactions bên
            // dưới — referee đã kích hoạt xong gói của họ rồi, phần thưởng cho referrer là phụ.
            try { await creditReferralReward(profile, transferAmount); } catch (e) { /* bỏ qua, xem log Vercel nếu cần điều tra */ }
          } else {
            status = 'unmatched_amount'; // update thất bại, giữ nguyên để admin soát lại
          }
        } else if (topupLuot) {
          // Cộng thẳng vào lượt bonus của CHU KỲ HIỆN TẠI (30 ngày từ ngày đăng ký, không phải tháng
          // lịch — xem api/_lib/quota-cycle.js) — nếu profile đang ở chu kỳ cũ (paid_ai_month khác
          // chu kỳ hiện tại) thì coi bonus/uses hiện có là đã hết hạn, cộng lượt mới vào chu kỳ mới.
          const cycleKey = currentCycleKey(profile.created_at);
          const sameCycle = profile.paid_ai_month === cycleKey;
          const patchBody = sameCycle
            ? { paid_ai_bonus: (profile.paid_ai_bonus || 0) + topupLuot }
            : { paid_ai_month: cycleKey, paid_ai_uses: 0, paid_ai_bonus: topupLuot };
          const updateResp = await supabaseAdmin(`profiles?id=eq.${profile.id}`, {
            method: 'PATCH',
            body: JSON.stringify(patchBody),
          });
          if (updateResp.ok) {
            status = 'matched';
            matchedProfileId = profile.id;
            topupLuotGranted = topupLuot;
          } else {
            status = 'unmatched_amount';
          }
        } else if (TC_LIFETIME_AMOUNTS.has(transferAmount)) {
          // Sổ Dòng Tiền Tâm Thức (tai-chinh/) — trọn đời, KHÔNG đụng access_until/has_paid của
          // nhan-hieu. Idempotent tự nhiên: PATCH lại true/timestamp mới nếu lỡ chuyển trùng không
          // sao, không có tác dụng phụ nào (khác gói theo ngày, cộng dồn được nên phải chống trùng
          // ở nơi khác — ở đây chỉ set 1 cờ boolean).
          const updateResp = await supabaseAdmin(`profiles?id=eq.${profile.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ tc_has_paid: true, tc_paid_at: new Date().toISOString() }),
          });
          if (updateResp.ok) {
            status = 'matched';
            matchedProfileId = profile.id;
            try { await creditTcReferralReward(profile, transferAmount); } catch (e) { /* bỏ qua, xem log Vercel nếu cần điều tra */ }
          } else {
            status = 'unmatched_amount';
          }
        } else if (transferAmount === VIP_PARTNER_AMOUNT) {
          // Gói VIP Partner (55tr, xem VIP_PARTNER_AMOUNT ở trên) — mua cho CHÍNH mình (nội dung CK
          // là ref_code của người mua, không phải người giới thiệu), set is_vip_partner VĨNH VIỄN.
          // Idempotent tự nhiên giống tc_has_paid ở trên — PATCH lại true nếu lỡ chuyển trùng không sao.
          const updateResp = await supabaseAdmin(`profiles?id=eq.${profile.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ is_vip_partner: true }),
          });
          if (updateResp.ok) {
            status = 'matched';
            matchedProfileId = profile.id;
          } else {
            status = 'unmatched_amount';
          }
        } else {
          status = 'unmatched_amount';
        }
      } else {
        status = 'unmatched_code';
      }
    } else if (productOrderRefCode) {
      // Sản Phẩm Số — khách mua lẻ không có profile, tra thẳng theo ref_code của ĐÚNG đơn hàng
      // (không đối chiếu qua bảng số tiền cố định vì giá do người bán tự đặt). Số tiền chỉ dùng để
      // đối chiếu AN TOÀN — lệch số tiền thì KHÔNG duyệt, ghi 'unmatched_amount' để tự soát tay.
      const orderResp = await supabaseAdmin(`digital_product_orders?ref_code=eq.${productOrderRefCode}&select=id,status,amount`);
      const orderRows = orderResp.ok ? await orderResp.json() : [];
      const order = orderRows[0];

      if (order) {
        if (order.status === 'paid') {
          // SePay gửi lại đúng giao dịch đã xử lý (retry) — coi như thành công, không lỗi, không
          // patch lại (idempotent, tránh cấp lại download_token mới làm mất token đã gửi khách).
          status = 'matched';
          matchedProductOrderId = order.id;
        } else if (order.amount === transferAmount) {
          const updateResp = await supabaseAdmin(`digital_product_orders?id=eq.${order.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'paid', paid_at: new Date().toISOString(), download_token: crypto.randomUUID() }),
          });
          if (updateResp.ok) {
            status = 'matched';
            matchedProductOrderId = order.id;
          } else {
            status = 'unmatched_amount';
          }
        } else {
          status = 'unmatched_amount';
        }
      } else {
        status = 'unmatched_code';
      }
    } else if (crmRefCode) {
      // Trợ Lý AI Tư Vấn & CRM — hạn dùng RIÊNG (crm_access_until), cộng dồn giống access_until của
      // nhan-hieu (base = hạn cũ nếu còn hiệu lực, else từ hôm nay). Không có ưu đãi mua sớm/giới
      // thiệu/học viên cho sản phẩm này (bản đầu, thêm sau nếu chị Quỳnh cần).
      const profResp = await supabaseAdmin(`profiles?crm_ref_code=eq.${crmRefCode}&select=id,crm_access_until,crm_ai_uses,crm_ai_month,crm_ai_bonus,referred_by_ref_code,crm_referral_reward_given`);
      const profRows = profResp.ok ? await profResp.json() : [];
      const profile = profRows[0];

      if (profile) {
        const days = CRM_AMOUNT_TO_DAYS[transferAmount];
        const topupLuot = CRM_AMOUNT_TO_TOPUP_LUOT[transferAmount];
        if (days) {
          const base = (profile.crm_access_until && new Date(profile.crm_access_until).getTime() > Date.now())
            ? new Date(profile.crm_access_until) : new Date();
          const next = new Date(base.getTime() + days * 86400000);
          const updateResp = await supabaseAdmin(`profiles?id=eq.${profile.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ crm_access_until: next.toISOString(), crm_has_paid: true, crm_plan_days: days }),
          });
          if (updateResp.ok) {
            status = 'matched';
            matchedProfileId = profile.id;
            daysGranted = days;
            // Best-effort, KHÔNG để lỗi ở đây làm mất luôn việc ghi log sepay_transactions bên
            // dưới — referee đã kích hoạt xong gói của họ rồi, phần thưởng cho referrer là phụ.
            try { await creditCrmReferralReward(profile, transferAmount); } catch (e) { /* bỏ qua, xem log Vercel nếu cần điều tra */ }
          } else {
            status = 'unmatched_amount';
          }
        } else if (topupLuot) {
          // Cộng thẳng vào crm_ai_bonus của THÁNG HIỆN TẠI — nếu profile đang ở tháng cũ thì coi
          // bonus/uses hiện có là đã hết hạn, cộng lượt mới vào tháng mới (giống hệt nhánh topupLuot
          // của nhan-hieu ở trên, chỉ khác cột: crm_ai_* thay vì paid_ai_*).
          const month = new Date().toISOString().slice(0, 7);
          const sameMonth = profile.crm_ai_month === month;
          const patchBody = sameMonth
            ? { crm_ai_bonus: (profile.crm_ai_bonus || 0) + topupLuot }
            : { crm_ai_month: month, crm_ai_uses: 0, crm_ai_bonus: topupLuot };
          const updateResp = await supabaseAdmin(`profiles?id=eq.${profile.id}`, {
            method: 'PATCH',
            body: JSON.stringify(patchBody),
          });
          if (updateResp.ok) {
            status = 'matched';
            matchedProfileId = profile.id;
            topupLuotGranted = topupLuot;
          } else {
            status = 'unmatched_amount';
          }
        } else {
          status = 'unmatched_amount';
        }
      } else {
        status = 'unmatched_code';
      }
    } else if (spsSubRefCode) {
      // Gói tháng Sản Phẩm Số — hạn dùng RIÊNG (sps_access_until), cộng dồn giống access_until của
      // nhan-hieu (base = hạn cũ nếu còn hiệu lực, else từ hôm nay). Không đụng gì tới has_paid/
      // access_until gốc (Xây Nhân Hiệu) hay crm_has_paid (Trợ Lý CRM).
      const profResp = await supabaseAdmin(`profiles?sps_ref_code=eq.${spsSubRefCode}&select=id,sps_access_until`);
      const profRows = profResp.ok ? await profResp.json() : [];
      const profile = profRows[0];

      if (profile) {
        const days = SPS_SUB_AMOUNT_TO_DAYS[transferAmount];
        if (days) {
          const base = (profile.sps_access_until && new Date(profile.sps_access_until).getTime() > Date.now())
            ? new Date(profile.sps_access_until) : new Date();
          const next = new Date(base.getTime() + days * 86400000);
          const updateResp = await supabaseAdmin(`profiles?id=eq.${profile.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ sps_access_until: next.toISOString(), sps_has_paid: true }),
          });
          if (updateResp.ok) {
            status = 'matched';
            matchedProfileId = profile.id;
            daysGranted = days;
          } else {
            status = 'unmatched_amount';
          }
        } else {
          status = 'unmatched_amount';
        }
      } else {
        status = 'unmatched_code';
      }
    }

    await supabaseAdmin('sepay_transactions', {
      method: 'POST',
      prefer: 'return=minimal',
      body: JSON.stringify({
        sepay_id: sepayId || null,
        gateway: gateway || null,
        transaction_date: transactionDate || null,
        account_number: accountNumber || null,
        transfer_amount: transferAmount || null,
        content: content || null,
        ref_code_found: refCode || productOrderRefCode || crmRefCode || spsSubRefCode,
        matched_profile_id: matchedProfileId,
        matched_product_order_id: matchedProductOrderId,
        days_granted: daysGranted,
        topup_luot_granted: topupLuotGranted,
        status,
      }),
    });

    res.status(200).json({ success: true });
  } catch (err) {
    // Luôn trả success:true cho SePay để tránh spam retry — lỗi thật đã được ghi log ở trên
    // (nếu ghi log cũng lỗi thì đây là sự cố hạ tầng, cần xem log Vercel trực tiếp).
    res.status(200).json({ success: true });
  }
};
