const NAV = [
  { key:'trang-chu', title:'Trang chủ', hidden:true }, // không hiện trong sidebar — chỉ dành cho lúc mới đăng nhập/đăng ký, vào lại qua bấm logo/"XÂY NHÂN HIỆU"
  { key:'dinh-vi', title:'Định Vị' },
  { key:'sua-kenh', title:'Sửa Kênh' },
  { key:'dinh-dang-content', title:'Dạng Content' },
  { key:'kho-content', title:'Kho Content' },
  { key:'kho-hook', title:'Kho Hook' },
  { key:'viet-content', title:'Viết Content' },
  { key:'tai-che-viral', title:'Tái Chế Content Viral' },
  { key:'cham-diem-hub', title:'Chấm Điểm' },
  { key:'lich-dang', title:'Lịch Đăng Bài' },
  { key:'day-bai', title:'Đẩy Bài & CTA Comment' },
  { key:'tao-anh', title:'Tạo Ảnh Thương Hiệu' },
  { key:'tro-giup', title:'Hỏi & Trợ Giúp' },
  { key:'nang-cap', title:'🔥 Nâng cấp / Mua gói' },
  { key:'quan-tri-hub', title:'Quản trị', adminOnly:true },
  { key:'tai-khoan', title:'Tài khoản', hidden:true }, // không hiện trong sidebar — vào qua bấm email ở cuối sidebar
];

const AppState = { user:null, profile:null, route:'trang-chu', authMode:'login', announcementQueue:[], reviewPromptEligible:false, pastReviewThreshold:false, profileLoadError:null };
// Điều kiện hiện popup xin đánh giá (2026-08-24, theo yêu cầu chị Quỳnh) — đã dùng có kết quả thật
// (từ 3 bài đã viết) HOẶC đã dùng app đủ lâu (từ 3 ngày), không hỏi ngay lúc mới vào khi chưa kịp
// thấy giá trị gì.
const REVIEW_PROMPT_MIN_POSTS = 3;
const REVIEW_PROMPT_MIN_DAYS = 3;
const REVIEW_MIN_WORDS_FOR_REWARD = 50;
const REVIEW_REWARD_LUOT = 20;

const PAYMENT_BANK = { code:'vietinbank', account:'199339288888', accountName:'LE TU QUYNH' };
// Public key VAPID cho Web Push (đổi lại 2026-08-22 vì key cũ chưa từng set VAPID_PRIVATE_KEY khớp
// trên Vercel nên push chưa gửi được lần nào — coi như phát hành lại cặp key mới cho sạch, không mất
// gì vì chưa có subscription nào thật sự hoạt động) — an toàn để lộ ở client (đúng bản chất "public"
// trong tên gọi), chỉ dùng để trình duyệt xác nhận đúng server này được phép gửi thông báo cho
// subscription đó. Private key TUYỆT ĐỐI không đưa vào code — chỉ nằm trong biến môi trường
// VAPID_PRIVATE_KEY ở Vercel, dùng ở api/_lib/push.js. Đổi key này thì phải đổi luôn VAPID_PUBLIC_KEY
// ở Vercel env cho khớp, không thì subscribe sẽ ký sai server và bị từ chối.
const VAPID_PUBLIC_KEY = 'BNTlCve7JFY6nki3SBjlPAQVsmOD68oTIvSDMP1VkNe-jWtCPQuPUY4xz2SisvwpU3IWo_ciiGTMxoLJq42QzkE';
// Khớp đúng TRIAL_AI_LIMIT/PAID_MONTHLY_AI_LIMIT/PAID_TOPUP_PACKS ở api/_lib/trial-quota.js — chỉ
// để HIỂN THỊ cảnh báo sớm cho người dùng biết ngay từ đầu, việc CHẶN thật sự luôn nằm ở server,
// không phải ở số hiển thị này.
const TRIAL_AI_LIMIT = 100;
const PAID_MONTHLY_AI_LIMIT = 200;
// Khớp đúng AMOUNT_TO_TOPUP_LUOT ở api/sepay-webhook.js — mua càng nhiều giá/lượt càng rẻ.
const PAID_TOPUP_PACKS = [
  { key:'100', amount: 150000, luot: 100 },
  { key:'300', amount: 420000, luot: 300 },
  { key:'600', amount: 780000, luot: 600 },
];
let selectedTopupKey = '300';

// Chương trình giới thiệu: bắt lấy ?ref=<mã> ngay khi vào web (kể cả trước khi đăng ký/đăng nhập —
// người mới có thể lướt vài trang trước khi bấm "Tạo tài khoản") và lưu tạm vào localStorage, tới
// lúc signUp() mới thực sự gửi lên (xem renderAuthScreen bên dưới). Không ghi đè nếu đã lưu sẵn 1
// mã khác — tôn trọng đúng link giới thiệu ĐẦU TIÊN người này từng bấm vào.
const REF_STORAGE_KEY = 'xnh_referred_by_ref_code';
(function captureReferralCode(){
  try {
    const m = /[?&]ref=([A-Za-z0-9]+)/.exec(location.search);
    if(m && !localStorage.getItem(REF_STORAGE_KEY)) localStorage.setItem(REF_STORAGE_KEY, m[1].toUpperCase());
  } catch(e){}
})();
function paidMonthlyUsage(p){
  // Chu kỳ 30 ngày từ ngày đăng ký, không phải tháng lịch (chị Quỳnh 2026-09-01, xem currentCycleKey ở util.js).
  const sameMonth = p.paid_ai_month === currentCycleKey(p.created_at);
  const used = sameMonth ? (p.paid_ai_uses||0) : 0;
  const bonus = sameMonth ? (p.paid_ai_bonus||0) : 0;
  return { used, limit: PAID_MONTHLY_AI_LIMIT + bonus };
}
function trialQuotaHint(){
  const p = AppState.profile;
  if(!p) return '';
  // Admin không bao giờ bị chặn (server luôn cho qua), nhưng vẫn được ĐẾM — hiện dạng thống kê
  // nhẹ nhàng (không cảnh báo đỏ) để chủ web tự theo dõi mức dùng thật của chính mình.
  if(p.role==='admin'){
    const used = p.has_paid ? paidMonthlyUsage(p).used : (p.trial_ai_uses||0);
    const period = p.has_paid ? currentCycleRangeLabel(p.created_at) : 'trọn đời';
    return `<span style="color:#8A8F82;">🔥 Đã dùng ${used} lượt (${period}) — không giới hạn</span>`;
  }
  if(p.has_paid){
    const { used, limit } = paidMonthlyUsage(p);
    const remaining = Math.max(0, limit - used);
    const color = remaining<=10 ? 'var(--danger)' : '#9CA396';
    return `<span style="color:${color};">✨ Còn ${remaining}/${limit} lượt (${currentCycleRangeLabel(p.created_at)})</span>`;
  }
  // trial_ai_limit chốt riêng lúc đăng ký (xem schema_full.sql) — người đăng ký trước/sau có thể
  // khác nhau, KHÔNG dùng chung 1 số TRIAL_AI_LIMIT cho mọi người nữa. Cột null (tài khoản có từ
  // trước cột này) coi như mức cũ, dùng TRIAL_AI_LIMIT làm dự phòng.
  const trialLimit = p.trial_ai_limit || TRIAL_AI_LIMIT;
  const remaining = Math.max(0, trialLimit - (p.trial_ai_uses||0));
  const color = remaining<=3 ? 'var(--danger)' : '#9CA396';
  return `<span style="color:${color};">🎁 Còn ${remaining}/${trialLimit} lượt dùng thử</span>`;
}
// Chỉ hiện ảnh đại diện + tên hiển thị ở đây (không hiện email nữa) — email/thông tin đăng nhập,
// đổi mật khẩu, đổi ảnh... chuyển hết vào mục "Tài khoản" (bấm vào đúng khối này để vào).
function sidebarFootHtml(){
  const p = AppState.profile;
  const name = (p && p.full_name && p.full_name.trim()) || 'Chưa đặt tên';
  const initial = name.charAt(0).toUpperCase();
  const avatarHtml = (p && p.avatar_url)
    ? `<img src="${p.avatar_url}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;flex-shrink:0;">`
    : `<div style="width:32px;height:32px;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0;">${esc(initial)}</div>`;
  return `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
      ${avatarHtml}
      <div style="min-width:0;font-weight:600;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(name)}</div>
    </div>
    ${(AppState.profile && AppState.profile.role !== 'admin' && AppState.profile.access_until)
      ? `Hạn dùng: ${esc(new Date(AppState.profile.access_until).toLocaleDateString('vi-VN'))}<br>` : ''}
    ${trialQuotaHint()}
  `;
}
// Danh sách đúng 13 endpoint có tính lượt (khớp checkAndConsumeTrialQuota ở từng file api/*.js) —
// dùng để nhận biết lệnh gọi nào vừa thành công cần tăng số đếm hiển thị ngay, không cần đợi tải
// lại trang mới thấy số mới (trước đây sidebar chỉ cập nhật lúc load lại profile).
// Trọng số phải khớp đúng với AI_WEIGHTS ở api/_lib/trial-quota.js (bên server mới là nơi THỰC SỰ
// trừ lượt) — bảng này chỉ dùng để cập nhật ngay số lượt hiển thị ở sidebar cho mượt, không cần
// đợi tải lại trang mới thấy số mới.
const GATED_API_WEIGHTS = {
  'api/cai-thien-hook': 1, 'api/cham-diem-hook': 1, 'api/goi-y-hook-theo-chu-de': 1,
  'api/goi-y-tu-nguon': 1, 'api/hoi-dap': 1, 'api/dinh-vi-cap-nhat-cau-chuyen': 1,
  'api/cham-diem-content': 2, 'api/goi-y-day-bai': 2,
  'api/viet-content': 3, 'api/viet-tu-kho-goc': 3, 'api/tai-che-viral': 3, 'api/goi-y-lich': 3, // 2026-09-03: tăng 2->3
  'api/sua-kenh': 4,
  'api/dinh-vi': 8,
  'api/dinh-vi-parse': 6,
};
// weightOverride: cho endpoint tốn lượt BIẾN THIÊN mỗi lần gọi (vd api/auto-fill-week — xem
// opts.gatedWeight ở callApi trong util.js) — dùng số THẬT server vừa trừ thay vì tra bảng cố định.
window.onGatedApiSuccess = function(relativePath, weightOverride){
  const p = AppState.profile;
  if(!p) return;
  const path = relativePath.split('?')[0];
  const weight = weightOverride != null ? weightOverride : GATED_API_WEIGHTS[path];
  if(!weight) return;
  if(!p.has_paid){
    p.trial_ai_uses = (p.trial_ai_uses||0) + weight;
  } else {
    // Chu kỳ 30 ngày từ ngày đăng ký, không phải tháng lịch (chị Quỳnh 2026-09-01, xem currentCycleKey ở util.js).
    const cycleKey = currentCycleKey(p.created_at);
    if(p.paid_ai_month !== cycleKey){ p.paid_ai_month = cycleKey; p.paid_ai_uses = 0; p.paid_ai_bonus = 0; }
    p.paid_ai_uses = (p.paid_ai_uses||0) + weight;
  }
  const el = document.getElementById('sidebar-foot-info');
  if(el) el.innerHTML = sidebarFootHtml();
};
// Giá thường và giá học viên (đã học khoá Xây Nhân Hiệu) tách 2 bảng riêng thay vì gộp chung 1
// danh sách dài — is_student được hỏi ngay lúc đăng ký (xem renderAuthScreen) nên tới màn thanh
// toán chỉ cần hiện đúng 1 bảng phù hợp, không bắt người dùng tự lọc giữa 2 loại giá.
// LƯU Ý QUAN TRỌNG: số tiền mỗi gói (ở cả 2 bảng) phải KHÁC NHAU TUYỆT ĐỐI — webhook SePay chỉ
// nhận diện gói qua đúng số tiền chuyển khoản, trùng số tiền giữa 2 gói sẽ cộng sai số ngày.
const REGULAR_PLANS = [
  { key:'1m', label:'1 tháng', amount:499000 },
  { key:'6m', label:'6 tháng', amount:2390000, note:'~398.000đ/tháng — tiết kiệm 604.000đ (~20%) so với mua 6 tháng theo giá lẻ 1 tháng', recommended:true },
  { key:'12m', label:'12 tháng', amount:3990000, note:'~332.500đ/tháng — tiết kiệm 1.998.000đ (~33%) so với mua 12 tháng theo giá lẻ 1 tháng — giữ giá lâu nhất trước khi web tăng giá', recommended:true },
];
// Gói 6/12 tháng học viên = giảm đều 20% so với giá thường tương ứng, áp dụng LÂU DÀI (không phải
// ưu đãi tạm thời). Riêng gói 1 tháng chỉ giảm giá (399.200đ) cho ĐÚNG THÁNG ĐẦU TIÊN — từ tháng
// thứ 2 trở đi nếu vẫn mua theo tháng thì về giá thường 499.000đ (xem buildStudentPlans + cờ
// first_month_discount_used) — khuyến khích chọn gói 6/12 tháng để giữ giá tốt lâu hơn.
const STUDENT_PLANS_LONG = [
  { key:'6m_hv', label:'6 tháng', amount:1912000, note:'~319.000đ/tháng — rẻ hơn 1.082.000đ (~36%) so với mua lẻ từng tháng theo giá thường (499.000đ × 6 = 2.994.000đ).', recommended:true },
  { key:'12m_hv', label:'12 tháng', amount:3192000, note:'~266.000đ/tháng — rẻ hơn 2.796.000đ (~47%) so với mua lẻ từng tháng theo giá thường (499.000đ × 12 = 5.988.000đ) — giữ giá lâu nhất trước khi web tăng giá.', recommended:true },
];
function buildStudentPlans(profile){
  const usedFirstMonth = !!(profile && profile.first_month_discount_used);
  const oneMonth = usedFirstMonth
    ? { key:'1m_hv', label:'1 tháng', amount:499000, note:'Đã dùng ưu đãi tháng đầu — gói 1 tháng từ giờ theo giá thường. Chọn gói 6/12 tháng bên dưới để có giá học viên.' }
    : { key:'1m_hv', label:'1 tháng (ưu đãi tháng đầu)', amount:399200, note:'Chỉ áp dụng cho đúng tháng đầu tiên — từ tháng thứ 2 nếu vẫn mua theo tháng sẽ về giá thường 499.000đ (chọn gói 6/12 tháng bên dưới để giữ giá học viên lâu hơn).' };
  return [oneMonth, ...STUDENT_PLANS_LONG];
}
// Ưu đãi "chốt ngay trong buổi Zoom hướng dẫn" 19/8 — giảm thẳng 500k (gói 6 tháng) / 1.2 triệu
// (gói 12 tháng) cho ai thanh toán TRONG NGÀY hôm đó, không phân biệt học viên hay không. Gia hạn
// thêm 1 ngày (tới hết 20/8) vì tối 19/8 ngân hàng VietinBank/SePay bị lỗi (thiếu tiền tố SEVQR,
// xem api/sepay-webhook.js + PAYMENT_BANK bên dưới) khiến nhiều khách chuyển khoản không kích hoạt
// được — công bằng cho những khách bị ảnh hưởng đêm đó. Tự động hết hạn sau mốc thời gian dưới đây
// (không cần quay lại xoá tay) — LƯU Ý: 2 số tiền này đã kiểm tra KHÔNG trùng với bất kỳ gói nào
// khác (thường/học viên) để webhook SePay nhận đúng gói.
const FLASH_SALE_CUTOFF = new Date('2026-08-21T00:00:00+07:00');
function isFlashSaleActive(){ return new Date() < FLASH_SALE_CUTOFF; }
const FLASH_SALE_PLANS = [
  { key:'6m_flash', label:'6 tháng — Ưu đãi 19-20/8', amount:1890000, note:'🔥 Chỉ áp dụng nếu chuyển khoản trong ngày 19-20/8 — giảm thẳng 500.000đ so với giá thường (2.390.000đ).', recommended:true, flash:true },
  { key:'12m_flash', label:'12 tháng — Ưu đãi 19-20/8', amount:2790000, note:'🔥 Chỉ áp dụng nếu chuyển khoản trong ngày 19-20/8 — giảm thẳng 1.200.000đ so với giá thường (3.990.000đ).', recommended:true, flash:true },
];
// Chương trình giới thiệu (2026-08-20): người ĐƯỢC giới thiệu (referred_by_ref_code có giá trị,
// gán 1 lần lúc đăng ký — xem handle_new_user trong schema_full.sql) được giảm 15% ngay lúc mua,
// CHỈ áp dụng gói giá thường — không cộng dồn với giá học viên (đã giảm 20% sẵn) hay flash-sale
// (ưu đãi có thời hạn riêng, không tính hoa hồng giới thiệu, xem api/sepay-webhook.js). Người giới
// thiệu được thưởng lượt AI tương đương 15% giá trị đơn này, cộng tự động qua webhook khi khớp
// đúng 1 trong 3 số tiền dưới đây — 3 số tiền này ĐÃ kiểm tra không trùng bất kỳ gói nào khác.
const REFERRAL_REGULAR_PLANS = [
  { key:'1m_ref', label:'1 tháng (giá giới thiệu)', amount:424000, note:'Giảm 15% nhờ vào qua link giới thiệu — còn 424.000đ so với giá thường 499.000đ.' },
  { key:'6m_ref', label:'6 tháng (giá giới thiệu)', amount:2032000, note:'Giảm 15% nhờ vào qua link giới thiệu — còn 2.032.000đ so với giá thường 2.390.000đ.', recommended:true },
  { key:'12m_ref', label:'12 tháng (giá giới thiệu)', amount:3392000, note:'Giảm 15% nhờ vào qua link giới thiệu — còn 3.392.000đ so với giá thường 3.990.000đ.', recommended:true },
];
// Ưu đãi "mua sớm trong 3 ngày đầu dùng thử" (2026-08-26, chính sách lâu dài — khớp
// isWithinEarlyBirdWindow ở api/sepay-webhook.js, nơi thật sự cộng thêm ngày dùng) — PHẢI hiện rõ
// ngay ở bảng giá thì mới có tác dụng thúc đẩy mua ngay trong lúc còn hào hứng dùng thử, không thì
// khách chỉ vô tình "được tặng" mà không biết để tranh thủ mua sớm.
// 2026-08-26: chị Quỳnh chốt học viên KHÔNG được cộng dồn ưu đãi này (giá học viên đã là mức giảm
// riêng, mua sớm chỉ áp cho giá thường/giới thiệu) — currentPaymentPlans() bên dưới bỏ qua bước
// decorateEarlyBird() hẳn khi isStudent, khớp đúng phía api/sepay-webhook.js (nơi thật sự cộng
// thêm ngày dùng) đã loại 2 số tiền giá học viên khỏi EARLY_BIRD_EXCLUDED_AMOUNTS.
const EARLY_BIRD_WINDOW_DAYS = 3;
const EARLY_BIRD_BONUS_MONTHS = { '6m':1, '12m':2 }; // áp cho biến thể thường/giới thiệu (không áp cho học viên)
function isInEarlyBirdWindow(profile){
  if(!profile || !profile.created_at) return false;
  return (Date.now() - new Date(profile.created_at).getTime()) <= EARLY_BIRD_WINDOW_DAYS * 86400000;
}
// Đếm ngược theo GIỜ (không phải ngày, khác tcPriceTierDaysLeft() bên tai-chinh) — cửa sổ chỉ vỏn
// vẹn 3 ngày nên tính theo ngày sẽ hầu như luôn hiện "1 ngày" suốt gần cả cửa sổ, không đủ khẩn cấp.
// null = đã hết ưu đãi hoặc chưa có profile — không hiện khối cảnh báo.
function earlyBirdHoursLeft(profile){
  if(!profile || !profile.created_at) return null;
  const elapsedMs = Date.now() - new Date(profile.created_at).getTime();
  const totalMs = EARLY_BIRD_WINDOW_DAYS * 86400000;
  if(elapsedMs >= totalMs) return null;
  return Math.max(0, Math.ceil((totalMs - elapsedMs) / 3600000));
}
function earlyBirdTimeLeftLabel(profile){
  const h = earlyBirdHoursLeft(profile);
  if(h == null) return null;
  const days = Math.floor(h / 24);
  const hours = h % 24;
  return days > 0 ? `${days} ngày ${hours} giờ` : `${hours} giờ`;
}
function decorateEarlyBird(plans, profile){
  if(!isInEarlyBirdWindow(profile)) return plans;
  return plans.map(pl=>{
    if(pl.flash) return pl; // flash-sale đã là ưu đãi riêng theo ngày lịch, không cộng dồn thêm
    const prefix = Object.keys(EARLY_BIRD_BONUS_MONTHS).find(k=>pl.key.startsWith(k));
    if(!prefix) return pl;
    const bonusMonths = EARLY_BIRD_BONUS_MONTHS[prefix];
    return { ...pl, note: `🎁 Mua trong 3 ngày đầu dùng thử được TẶNG THÊM ${bonusMonths} tháng dùng! ${pl.note||''}`.trim() };
  });
}
function currentPaymentPlans(){
  const p = AppState.profile;
  const isStudent = !!(p && p.is_student);
  const base = isStudent
    ? buildStudentPlans(p)
    : (p && p.referred_by_ref_code) ? REFERRAL_REGULAR_PLANS : REGULAR_PLANS;
  const withFlash = isFlashSaleActive() ? [...FLASH_SALE_PLANS, ...base] : base;
  return isStudent ? withFlash : decorateEarlyBird(withFlash, p);
}
// Cách tính "rẻ hơn" KHÁC NHAU theo từng gói học viên:
// - Gói 1 tháng: so với giá thường CÙNG 1 tháng (499.000đ) — không hiện gì nếu đã hết ưu đãi
//   tháng đầu (giá bằng giá thường, không có gì để "rẻ hơn").
// - Gói 6/12 tháng: so với mua lẻ từng tháng theo giá thường (499.000đ x 6 hoặc x12) — vì đây là
//   khoản tiết kiệm THẬT SỰ nếu không mua trọn gói, gộp cả phần giảm học viên lẫn phần giảm theo
//   gói dài hạn, nên số tiền/% sẽ lớn hơn nhiều so với chỉ so với giá gói 6/12 tháng thường.
function planSavingsLabel(pl){
  const retailMonthly = REGULAR_PLANS.find(r => r.key === '1m').amount;
  if(pl.key === '1m_hv'){
    if(pl.amount >= retailMonthly) return '';
    const saved = retailMonthly - pl.amount;
    const pct = Math.round((saved / retailMonthly) * 100);
    return `rẻ hơn ${saved.toLocaleString('vi-VN')}đ (~${pct}%)`;
  }
  // Áp dụng chung cho MỌI gói 6/12 tháng (thường/học viên/flash sale) — luôn so với đúng 1 mốc
  // duy nhất: giá lẻ 1 tháng x số tháng, để số "tiết kiệm" nhất quán dù xem bảng giá nào.
  const match = /^(\d+)m/.exec(pl.key);
  const months = match ? parseInt(match[1], 10) : null;
  if(!months || months <= 1) return '';
  const retailTotal = retailMonthly * months;
  if(pl.amount >= retailTotal) return '';
  const saved = retailTotal - pl.amount;
  const pct = Math.round((saved / retailTotal) * 100);
  return `tiết kiệm ${saved.toLocaleString('vi-VN')}đ (~${pct}%) so với giá lẻ 1 tháng`;
}
// Mặc định gợi ý gói 6 tháng thay vì gói 1 tháng — web sẽ còn cập nhật/mở rộng thêm (đặc biệt
// Kho Content và Kho Hook viral), lúc đó giá sẽ tăng, nên chọn gói dài ngay bây giờ để giữ được
// mức giá hiện tại lâu hơn. Key khác nhau giữa 2 bảng (6m vs 6m_hv) nên set lại đúng lúc render.
let selectedPaymentPlanKey = isFlashSaleActive() ? '6m_flash' : '6m';

function currentRouteFromHash(){
  const h = (location.hash || '').replace('#','');
  return NAV.some(n=>n.key===h) ? h : 'trang-chu';
}

async function initApp(){
  const root = document.getElementById('app');
  root.innerHTML = `<div class="loading"><div class="spinner"></div><p>Đang tải…</p></div>`;

  const { data, error: sessionError } = await withTimeout(
    supabaseClient.auth.getSession(),
    10000, 'Kết nối mạng chậm/không ổn định — không kiểm tra được đăng nhập.'
  );
  if(sessionError){
    root.innerHTML = `<div class="loading">
      <p style="color:var(--danger);padding:0 20px 18px;">${esc(sessionError.message)}</p>
      <button class="btn" onclick="location.reload()">Tải lại trang</button>
    </div>`;
    return;
  }
  if(data.session){
    AppState.user = data.session.user;
    // TUẦN TỰ, không Promise.all — loadAnnouncementQueue() cần đọc profile.last_seen_announcement_at
    // vừa tải xong ở loadProfile(), chạy song song sẽ có lúc đọc trúng profile rỗng, coi như "chưa
    // xem gì" và hiện lại TOÀN BỘ thông báo cũ mỗi lần vào app.
    await loadProfile();
    await loadAnnouncementQueue();
    await loadReviewPromptEligibility();
    AppState.route = currentRouteFromHash();
    renderApp();
  } else {
    renderAuthScreen();
  }

  // Kiểm tra định kỳ thông báo tính năng mới — để người ĐANG MỞ SẴN app (không tải lại trang) cũng
  // thấy popup mà không cần tắt/mở lại app. 3 phút là đủ nhanh để cảm giác "gần như ngay", không quá
  // dày để tốn query liên tục trong lúc họ không rời khỏi app.
  setInterval(async ()=>{
    if(!AppState.user) return;
    await loadAnnouncementQueue();
    maybeShowFeatureAnnouncement();
  }, 3 * 60 * 1000);

  supabaseClient.auth.onAuthStateChange((event, session) => {
    if(event === 'SIGNED_IN' && session){
      // Supabase cũng bắn lại "SIGNED_IN" khi refresh token nền hoặc khi tab được focus lại —
      // không phải chỉ lúc đăng nhập thật. Nếu render lại toàn bộ app mỗi lần đó, bất kỳ màn hình
      // nào đang có state tạm chưa lưu (ví dụ AI gợi ý lịch tuần vừa chạy xong) sẽ bị xoá sạch
      // ngay khi vừa hiện ra — nhìn như tính năng "không chạy". Chỉ render lại khi đây thực sự là
      // 1 phiên đăng nhập mới (user id khác với user đang có).
      if(AppState.user && AppState.user.id === session.user.id) return;
      AppState.user = session.user;
      // Đây là 1 phiên đăng nhập MỚI (vd vừa đăng ký tài khoản khác trong cùng tab, sau khi tài
      // khoản trước đó đã đăng xuất) — luôn đưa về trang chào mừng, không giữ lại route/hash của
      // tài khoản CŨ (vd nếu tài khoản cũ là admin đang ở Quản trị, tài khoản mới không phải admin
      // sẽ bị kẹt ở "Không có quyền truy cập" — đúng lỗi đã gặp khi test tài khoản mới, 2026-08-20).
      // Đặt location.hash SAU KHI loadProfile() xong (trong .then) — không phải trước — để lúc
      // hashchange tự bắn ra và gọi renderApp() lần nữa, AppState.profile đã có sẵn rồi, tránh
      // render hụt 1 nhịp với profile null.
      AppState.route = 'trang-chu';
      // Tuần tự — cùng lý do đã ghi ở initApp(): loadAnnouncementQueue() cần profile đã tải xong.
      loadProfile().then(loadAnnouncementQueue).then(loadReviewPromptEligibility).then(()=>{
        location.hash = 'trang-chu';
        renderApp();
      });
    } else if(event === 'SIGNED_OUT'){
      AppState.user = null;
      AppState.profile = null;
      AppState.profileLoadError = null;
      AppState.pushPromptAttempted = false; // cho phép hỏi lại nếu 1 người khác đăng nhập cùng phiên tải trang (vd máy dùng chung)
      // Reset route/hash ngay lúc đăng xuất — để nếu có đăng nhập/đăng ký tài khoản khác tiếp theo
      // trong cùng tab (không tải lại trang), route không bị kẹt lại ở trang của tài khoản cũ.
      AppState.route = 'trang-chu';
      location.hash = '';
      renderAuthScreen();
    }
  });

  window.addEventListener('hashchange', () => {
    if(!AppState.user) return;
    AppState.route = currentRouteFromHash();
    renderApp();
  });
}

// Lỗi mạng/API thoáng qua lúc tải hồ sơ TRƯỚC ĐÂY bị nuốt lặng lẽ (chỉ lấy data, bỏ qua error) —
// AppState.profile thành null y hệt "chưa có hồ sơ", khiến hasActiveAccess() coi là hết hạn và hiện
// nhầm "Dùng thử 7 ngày đã kết thúc" cho người VẪN CÒN HẠN DÙNG THẬT (phát hiện 2026-08-23: khách báo
// hết hạn dù SQL kiểm tra access_until vẫn còn nguyên 7 ngày — chỉ là 1 lần tải hồ sơ bị lỗi thoáng
// qua). Thử lại 1 lần sau 1.5s cho các lỗi mạng chập chờn tự qua; nếu vẫn lỗi thì ghi lại
// profileLoadError để renderApp() hiện đúng màn hình "lỗi tải" thay vì "hết hạn".
async function loadProfile(){
  if(!AppState.user) return;
  let { data, error } = await withTimeout(
    supabaseClient.from('profiles').select('*').eq('id', AppState.user.id).maybeSingle(),
    12000, 'Kết nối mạng chậm/không ổn định — không tải được hồ sơ. Kiểm tra mạng rồi thử lại.'
  );
  if(error){
    await new Promise(r=>setTimeout(r, 1500));
    ({ data, error } = await withTimeout(
      supabaseClient.from('profiles').select('*').eq('id', AppState.user.id).maybeSingle(),
      12000, 'Kết nối mạng chậm/không ổn định — không tải được hồ sơ. Kiểm tra mạng rồi thử lại.'
    ));
  }
  AppState.profile = data || null;
  AppState.profileLoadError = error ? error.message : null;
}

// Thông báo tính năng mới — trước đây chỉ lấy ĐÚNG 1 dòng MỚI NHẤT, nên ai đăng nhiều thông báo
// liên tiếp trong lúc 1 khách không mở app thì khách đó BỎ LỠ hẳn các thông báo ở giữa (chỉ thấy
// đúng thông báo cuối cùng khi quay lại) — theo yêu cầu chị Quỳnh 2026-08-24: "có rất nhiều tính
// năng mng chưa biết", muốn khách xem ĐỦ mọi thông báo, không bỏ sót cái nào. Giờ lấy TOÀN BỘ thông
// báo mới hơn mốc "đã xem tới đâu" (profiles.last_seen_announcement_at), xếp cũ→mới, xếp thành 1
// hàng đợi hiện lần lượt từng cái — bấm xong/bỏ qua 1 cái mới đẩy mốc lên đúng đến đó rồi hiện tiếp
// cái kế, không đẩy mốc thẳng lên cái mới nhất như cách cũ.
async function loadAnnouncementQueue(){
  if(!AppState.user) return;
  const sinceAt = (AppState.profile && AppState.profile.last_seen_announcement_at) || '1970-01-01';
  // Không quan trọng bằng loadProfile() — timeout ngắn hơn (8s) và lỗi/treo thì bỏ qua thẳng (hàng
  // đợi rỗng), không được để tính năng phụ này chặn cả app vào không được.
  const { data } = await withTimeout(
    supabaseClient.from('feature_announcements').select('*').gt('created_at', sinceAt).order('created_at', { ascending:true }),
    8000
  );
  AppState.announcementQueue = data || [];
}

// Hiện popup CHO THÔNG BÁO CŨ NHẤT còn chưa xem trong hàng đợi — gọi từ renderApp() (lúc mới vào
// app/đổi trang) VÀ từ vòng lặp định kỳ ở initApp() (để người đang MỞ SẴN app, không tải lại trang,
// vẫn thấy popup mà không cần tắt/mở lại). CHỈ hiện ĐÚNG 1 thông báo mỗi lần gọi (không tự nối sang
// cái kế tiếp — theo phản hồi chị Quỳnh 2026-08-24: "nhiều quá", dồn hết trong 1 lượt gây rối) — nếu
// hàng đợi còn nhiều hơn 1, các cái còn lại chỉ hiện dần ở lần mở app/lần kiểm tra định kỳ SAU đó.
function maybeShowFeatureAnnouncement(){
  const queue = AppState.announcementQueue;
  if(!queue || !queue.length || !window.startFeatureAnnouncement) return;
  const ann = queue[0];
  window.startFeatureAnnouncement(ann, async ()=>{
    if(AppState.profile) AppState.profile.last_seen_announcement_at = ann.created_at;
    await supabaseClient.from('profiles').update({ last_seen_announcement_at: ann.created_at }).eq('id', AppState.user.id);
    queue.shift();
  });
}

// Chỉ tính điều kiện 1 LẦN lúc vào app (giống loadAnnouncementQueue) — nếu đã bị "dismissed" (đã
// bấm Để sau HOẶC đã từng gửi đánh giá, xem submit-review.js) thì bỏ qua luôn, khỏi tốn thêm 1 truy
// vấn đếm bài viết mỗi lần vào app cho người chắc chắn không cần hỏi lại nữa.
// pastReviewThreshold: KHÔNG bị "tiêu thụ"/reset như reviewPromptEligible (cái đó tắt hẳn sau khi
// popup hiện 1 lần) — dùng để Trang chủ tự đẩy mục "Đánh giá" lên vị trí nổi bật hơn khi người dùng
// đã đủ điều kiện (đã dùng có kết quả thật), kể cả khi họ đã bấm "Để sau"/đã gửi đánh giá rồi (xem
// home.js) — 2 mục đích khác nhau nên tách 2 cờ riêng dù cùng 1 điều kiện tính.
async function loadReviewPromptEligibility(){
  if(!AppState.user || !AppState.profile) { AppState.reviewPromptEligible = false; AppState.pastReviewThreshold = false; return; }
  const daysSinceSignup = AppState.profile.created_at
    ? (Date.now() - new Date(AppState.profile.created_at).getTime()) / 86400000 : 0;
  let qualifies = daysSinceSignup >= REVIEW_PROMPT_MIN_DAYS;
  if(!qualifies){
    const { count } = await withTimeout(
      supabaseClient.from('posts').select('id', { count:'exact', head:true }).eq('user_id', AppState.user.id),
      8000
    );
    qualifies = (count || 0) >= REVIEW_PROMPT_MIN_POSTS;
  }
  AppState.pastReviewThreshold = qualifies;
  AppState.reviewPromptEligible = qualifies && !AppState.profile.review_prompt_dismissed;
}

// Popup xin cảm nhận — CHỈ hiện nếu không có overlay nào khác đang mở (thông báo tính năng/onboarding
// tour) để tránh chồng 2 popup cùng lúc; gọi SAU maybeShowFeatureAnnouncement() ở mọi điểm gọi để
// thông báo tính năng luôn được ưu tiên hiện trước nếu cả 2 cùng đủ điều kiện.
function maybeShowReviewPrompt(){
  if(!AppState.reviewPromptEligible) return;
  if(document.getElementById('fa-overlay') || document.getElementById('onboarding-tour-overlay') || document.getElementById('review-prompt-overlay') || document.getElementById('push-prompt-overlay') || document.getElementById('early-bird-prompt-overlay')) return;
  AppState.reviewPromptEligible = false; // hỏi đúng 1 lần/phiên tải trang, không hiện lại nếu re-render

  const overlay = document.createElement('div');
  overlay.id = 'review-prompt-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(20,24,20,.78);display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `
    <div style="max-width:420px;width:100%;background:#fff;border-radius:14px;padding:26px 24px;box-shadow:0 12px 36px rgba(0,0,0,.3);">
      <div style="font-family:'Playfair Display',serif;font-size:19px;color:#1E2420;margin-bottom:8px;">Khoe trải nghiệm của bạn với Xây Nhân Hiệu 🎉</div>
      <div style="font-size:13.5px;line-height:1.6;color:#5B5F55;margin-bottom:14px;"><b style="color:var(--danger,#A6462E);">Tặng ngay ${REVIEW_REWARD_LUOT} lượt AI miễn phí</b> khi viết từ ${REVIEW_MIN_WORDS_FOR_REWARD} từ trở lên! Kể thoải mái 3-5 điều bạn thích nhất — viết nhanh hơn bao nhiêu, tự tin hơn thế nào, tiết kiệm được bao nhiêu thời gian mỗi tuần... Viết càng thật, càng chi tiết càng tốt, cảm nhận của bạn sẽ truyền cảm hứng cho rất nhiều người sau này.</div>
      <textarea id="rp-comment" placeholder="Ví dụ: 1. Viết bài nhanh hơn hẳn trước đây, mỗi tuần tiết kiệm được vài tiếng 2. AI bám đúng giọng văn của mình, đọc lên như chính mình viết 3. Lên lịch tuần không còn phải nghĩ, cứ theo AI gợi ý là xong..." style="width:100%;min-height:100px;padding:10px 12px;border:1px solid var(--line,#E4DFCF);border-radius:8px;font-family:inherit;font-size:14px;resize:vertical;"></textarea>
      <div id="rp-error" style="display:none;color:var(--danger,#A6462E);font-size:12.5px;margin-top:8px;"></div>
      <div style="display:flex;gap:10px;justify-content:flex-end;align-items:center;margin-top:16px;">
        <span id="rp-skip" style="font-size:13px;color:#5B5F55;cursor:pointer;">Để sau</span>
        <button id="rp-submit" style="background:var(--accent,#2F6F62);color:#fff;border:none;border-radius:8px;padding:10px 18px;font-size:13.5px;font-weight:600;cursor:pointer;">Gửi đánh giá</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  function close(){ overlay.remove(); }
  const dismissServerSide = async ()=>{
    if(AppState.profile) AppState.profile.review_prompt_dismissed = true;
    try{ await supabaseClient.rpc('mark_review_prompt_dismissed'); } catch(e){}
  };
  overlay.querySelector('#rp-skip').onclick = async ()=>{ close(); await dismissServerSide(); };

  overlay.querySelector('#rp-submit').onclick = async ()=>{
    const textarea = overlay.querySelector('#rp-comment');
    const errorEl = overlay.querySelector('#rp-error');
    const comment = textarea.value.trim();
    if(!comment){ errorEl.textContent = 'Chưa nhập cảm nhận.'; errorEl.style.display = 'block'; return; }
    const btn = overlay.querySelector('#rp-submit');
    btn.disabled = true; btn.textContent = 'Đang gửi…';
    try{
      const data = await callApi('/api/submit-review', { comment });
      if(window.onReviewSubmitted) window.onReviewSubmitted(data);
      close();
    } catch(e){
      errorEl.textContent = e.message; errorEl.style.display = 'block';
      btn.disabled = false; btn.textContent = 'Gửi đánh giá';
    }
  };
}

function markPushPromptSeen(){
  if(AppState.profile) AppState.profile.push_prompt_seen = true;
  supabaseClient.rpc('mark_push_prompt_seen').catch(()=>{});
}

function markEarlyBirdPromptSeen(){
  if(AppState.profile) AppState.profile.early_bird_prompt_seen = true;
  supabaseClient.rpc('mark_early_bird_prompt_seen').catch(()=>{});
}

// Popup báo riêng về ưu đãi "mua sớm trong 3 ngày đầu dùng thử" (2026-09-03, góp ý Quỳnh: "làm cái
// pop up y hệt như app sổ dòng tiền về cái này" — cùng khung overlay/2-nút với maybeShowPushPrompt(),
// khác NỘI DUNG và MỤC ĐÍCH: đây là mời MUA ngay để nhận thêm 1-2 tháng, không phải mời bật thông
// báo). Chạy TRƯỚC maybeShowPushPrompt() trong chuỗi gọi — ưu đãi có hạn 3 ngày nên ưu tiên cao hơn,
// đủ điều kiện cho MỌI người còn trong cửa sổ + CHƯA trả phí + KHÔNG phải học viên (ưu đãi này không
// áp cho học viên, xem decorateEarlyBird()) + chưa từng thấy popup này. Đồng bộ (không có await nào
// thật sự cần chờ như push prompt) nên không cần AppState.*Attempted chặn gọi lại — reviewPromptEligible-
// style tắt ngay sau khi hiện là đủ.
function maybeShowEarlyBirdPrompt(){
  const p = AppState.profile;
  if(!AppState.user || !p) return;
  if(p.early_bird_prompt_seen || p.has_paid || p.role === 'admin' || p.is_student) return;
  if(!isInEarlyBirdWindow(p)) return;
  if(document.getElementById('fa-overlay') || document.getElementById('onboarding-tour-overlay') || document.getElementById('review-prompt-overlay') || document.getElementById('push-prompt-overlay')) return;

  const label = earlyBirdTimeLeftLabel(p);
  const overlay = document.createElement('div');
  overlay.id = 'early-bird-prompt-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(20,24,20,.78);display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `
    <div style="max-width:420px;width:100%;background:#fff;border-radius:14px;padding:26px 24px;box-shadow:0 12px 36px rgba(0,0,0,.3);">
      <div style="font-family:'Playfair Display',serif;font-size:19px;color:#1E2420;margin-bottom:8px;">🎁 Ưu đãi chỉ dành cho 3 ngày đầu dùng thử</div>
      <div style="font-size:13.5px;line-height:1.6;color:#5B5F55;margin-bottom:14px;">Mua gói <b>6 tháng</b> được TẶNG THÊM <b>1 tháng</b>, mua gói <b>12 tháng</b> được TẶNG THÊM <b>2 tháng</b> — cùng 1 mức giá, chỉ áp dụng nếu chuyển khoản trong 3 ngày đầu kể từ lúc đăng ký. ${label ? `Còn <b style="color:var(--danger,#A6462E);">${esc(label)}</b> là hết ưu đãi này.` : ''}</div>
      <div style="display:flex;gap:10px;justify-content:flex-end;align-items:center;">
        <span id="ebp-skip" style="font-size:13px;color:#5B5F55;cursor:pointer;">Để sau</span>
        <button id="ebp-view" style="background:var(--accent,#2F6F62);color:#fff;border:none;border-radius:8px;padding:10px 18px;font-size:13.5px;font-weight:600;cursor:pointer;">Xem gói ngay</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  function close(){ overlay.remove(); }
  overlay.querySelector('#ebp-skip').onclick = ()=>{ close(); markEarlyBirdPromptSeen(); };
  overlay.querySelector('#ebp-view').onclick = ()=>{ close(); markEarlyBirdPromptSeen(); location.hash = 'nang-cap'; };
}

// Popup mời bật thông báo đẩy NGAY TỪ ĐẦU (2026-09-03, mượn lại ý tưởng vừa làm cho tai-chinh — xem
// maybeShowTcPushPrompt() ở tai-chinh/js/app-shell.js) — lý do mời bật ở ĐÂY là để không lỡ hạn dùng
// thử: cron đã gửi sẵn 'trial-ending-24h'/'trial-expired' (api/cron/send-reminders.js
// checkTrialEnding()) từ lâu, nhưng chưa từng ai chủ động mời bật thông báo, chỉ có nút im lìm trong
// Lịch Đăng Bài (lich-dang.js) — rất nhiều người chưa từng bật nên nhắc đó gửi ra mà chẳng ai thấy.
// Chỉ hỏi người CHƯA trả phí (đã mua thì không còn hạn dùng thử để lo mất). Hỏi ĐÚNG 1 lần/tài khoản
// (push_prompt_seen) — bấm "Bật thông báo" hay "Để sau" đều đánh dấu đã hỏi. KHÔNG tự hỏi nếu trình
// duyệt không hỗ trợ Web Push, đã từng bị từ chối quyền, hoặc đã đăng ký sẵn rồi.
// AppState.pushPromptAttempted chặn gọi lại nhiều lần trong lúc đang chờ async bên dưới (renderApp()
// gọi hàm này ở MỌI lần render, không chỉ lần đầu).
async function maybeShowPushPrompt(){
  if(AppState.pushPromptAttempted) return;
  if(!AppState.user || !AppState.profile) return;
  if(AppState.profile.push_prompt_seen || AppState.profile.has_paid || AppState.profile.role === 'admin') return;
  if(!(window.PushManager && navigator.serviceWorker && window.Notification)) return;
  if(Notification.permission === 'denied') return;
  if(document.getElementById('fa-overlay') || document.getElementById('onboarding-tour-overlay') || document.getElementById('review-prompt-overlay') || document.getElementById('early-bird-prompt-overlay')) return;
  AppState.pushPromptAttempted = true;

  let sub;
  try{
    const reg = await navigator.serviceWorker.ready;
    sub = await reg.pushManager.getSubscription();
  } catch(e){ return; } // service worker chưa sẵn sàng — thử lại ở phiên tải trang sau
  if(sub){ markPushPromptSeen(); return; } // đã bật sẵn rồi — không cần hỏi
  // Overlay khác có thể vừa mở trong lúc đang chờ await ở trên — kiểm tra lại lần nữa trước khi vẽ.
  if(document.getElementById('fa-overlay') || document.getElementById('onboarding-tour-overlay') || document.getElementById('review-prompt-overlay') || document.getElementById('early-bird-prompt-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'push-prompt-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(20,24,20,.78);display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `
    <div style="max-width:420px;width:100%;background:#fff;border-radius:14px;padding:26px 24px;box-shadow:0 12px 36px rgba(0,0,0,.3);">
      <div style="font-family:'Playfair Display',serif;font-size:19px;color:#1E2420;margin-bottom:8px;">🔔 Bật thông báo để không bị khoá app</div>
      <div style="font-size:13.5px;line-height:1.6;color:#5B5F55;margin-bottom:14px;">Bạn đang dùng thử miễn phí — bật thông báo để được nhắc trước 24 giờ khi sắp hết hạn, không cần tự nhớ ngày rồi bất ngờ bị khoá app giữa chừng.</div>
      <div id="pp-error" style="display:none;color:var(--danger,#A6462E);font-size:12.5px;margin-bottom:10px;"></div>
      <div style="display:flex;gap:10px;justify-content:flex-end;align-items:center;">
        <span id="pp-skip" style="font-size:13px;color:#5B5F55;cursor:pointer;">Để sau</span>
        <button id="pp-enable" style="background:var(--accent,#2F6F62);color:#fff;border:none;border-radius:8px;padding:10px 18px;font-size:13.5px;font-weight:600;cursor:pointer;">Bật thông báo</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  function close(){ overlay.remove(); }
  overlay.querySelector('#pp-skip').onclick = ()=>{ close(); markPushPromptSeen(); };
  overlay.querySelector('#pp-enable').onclick = async ()=>{
    const btn = overlay.querySelector('#pp-enable');
    const errorEl = overlay.querySelector('#pp-error');
    btn.disabled = true; btn.textContent = 'Đang bật…';
    try{
      const permission = await Notification.requestPermission();
      if(permission !== 'granted') throw new Error('Bạn chưa cấp quyền thông báo — vào cài đặt trình duyệt/điện thoại để bật lại nếu muốn thử lại.');
      const reg = await navigator.serviceWorker.ready;
      const newSub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      await callApi('/api/push-subscribe', newSub.toJSON());
      close(); markPushPromptSeen();
    } catch(e){
      errorEl.textContent = e.message || 'Không bật được thông báo — thử lại giúp mình.';
      errorEl.style.display = 'block';
      btn.disabled = false; btn.textContent = 'Bật thông báo';
    }
  };
}

// Cập nhật ngay lập tức số lượt hiển thị sau khi được thưởng (tương tự onGatedApiSuccess) — không
// cần đợi tải lại trang mới thấy — dùng chung ở cả popup này VÀ ô viết đánh giá ở Trang chủ
// (home.js), vì cả 2 đều gọi cùng /api/submit-review.
window.onReviewSubmitted = function(result){
  const p = AppState.profile;
  if(!p) return;
  p.review_prompt_dismissed = true;
  if(result && result.rewarded){
    if(p.has_paid){
      // Chu kỳ 30 ngày từ ngày đăng ký, không phải tháng lịch (chị Quỳnh 2026-09-01, xem currentCycleKey ở util.js).
      const cycleKey = currentCycleKey(p.created_at);
      if(p.paid_ai_month !== cycleKey){ p.paid_ai_month = cycleKey; p.paid_ai_uses = 0; p.paid_ai_bonus = 0; }
      p.paid_ai_bonus = (p.paid_ai_bonus||0) + (result.rewardLuot || REVIEW_REWARD_LUOT);
    } else {
      p.trial_ai_limit = (p.trial_ai_limit || TRIAL_AI_LIMIT) + (result.rewardLuot || REVIEW_REWARD_LUOT);
    }
  }
  const el = document.getElementById('sidebar-foot-info');
  if(el) el.innerHTML = sidebarFootHtml();
};

function hasActiveAccess(){
  const p = AppState.profile;
  if(p && p.role === 'admin') return true;
  if(!p || !p.access_until) return false;
  return new Date(p.access_until).getTime() > Date.now();
}

// Tách riêng phần "card" chọn gói + QR + thông tin chuyển khoản để dùng lại được ở CẢ MÀN HÌNH
// BẮT BUỘC thanh toán (hết hạn/hết dùng thử — renderExpiredScreen) LẪN màn hình "Nâng cấp / Mua
// gói" cho người ĐANG CÒN HẠN chủ động vào mua sớm (vd để chốt ưu đãi trong buổi Zoom hôm nay) —
// tránh phải đợi hết hạn mới thấy được bảng giá.
function paymentCardHtml(){
  const p = AppState.profile;
  const refCode = p && p.ref_code;
  const isStudent = !!(p && p.is_student);
  const plans = currentPaymentPlans();
  const plan = plans.find(pl => pl.key === selectedPaymentPlanKey) || plans.find(pl => pl.recommended) || plans[0];
  selectedPaymentPlanKey = plan.key; // đồng bộ lại key — các bảng giá dùng key khác nhau (vd 6m vs 6m_hv vs 6m_flash)

  // VietinBank CHỈ báo biến động số dư về SePay nếu nội dung chuyển khoản bắt đầu bằng từ khoá
  // "SEVQR" (yêu cầu riêng của SePay cho VietinBank, xem mục Ngân hàng > VietinBank trong SePay) —
  // thiếu tiền tố này thì webhook sẽ KHÔNG BAO GIỜ được gọi dù tiền vẫn vào tài khoản bình thường.
  const transferContent = refCode ? `SEVQR ${refCode}` : null;
  const qrUrl = refCode
    ? `https://img.vietqr.io/image/${PAYMENT_BANK.code}-${PAYMENT_BANK.account}-compact2.png?amount=${plan.amount}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(PAYMENT_BANK.accountName)}`
    : null;

  // Khối cảnh báo đếm ngược ưu đãi "mua sớm trong 3 ngày đầu" — nhấn mạnh RÕ như cách vừa làm bên
  // tai-chinh (tcPriceAnchorHtml, 2026-09-03, góp ý Quỳnh: "làm cái hạn sẽ hết y hệt luôn") — trước
  // đây chỉ có 1 dòng ghi chú nhỏ (plan.note) gắn theo TỪNG gói đang chọn, dễ bị lướt qua và chỉ hiện
  // khi đã chọn đúng gói 6/12 tháng. Khối này hiện NGAY TỪ ĐẦU, không phụ thuộc gói đang chọn — không
  // áp cho học viên (đã loại ở decorateEarlyBird()/isInEarlyBirdWindow() phía server, giữ nhất quán).
  const earlyBirdLabel = !isStudent ? earlyBirdTimeLeftLabel(p) : null;

  return `
    <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:8px;">${isStudent ? '🎓 Chọn gói muốn mua (giá học viên — đã giảm 20%)' : 'Chọn gói muốn mua'}</label>
    ${earlyBirdLabel ? `<div style="background:#FBEAE5;border:1px solid var(--danger);border-radius:8px;padding:10px 14px;margin-bottom:12px;text-align:center;font-size:13px;font-weight:700;color:var(--danger);line-height:1.5;">⏰ Còn ${esc(earlyBirdLabel)} là hết ưu đãi TẶNG THÊM tháng — mua gói 6/12 tháng ngay để được tặng thêm 1-2 tháng dùng miễn phí</div>` : ''}
    <div class="hint-box" style="margin-bottom:12px;line-height:1.7;">
      💡 <b>Đặc biệt Kho Content và Kho Hook viral</b> — nơi giúp bạn viết content dễ dàng từ các content đang có tín hiệu tốt trên thị trường.<br><br>
      Kho này được <b>cập nhật liên tục</b> và <b>mở rộng vô hạn theo từng tuần</b> — càng dùng lâu càng có nhiều để khai thác.<br><br>
      Web cũng sẽ <b>tăng giá dần theo thời gian</b>, nên chọn <b>gói 6 hoặc 12 tháng ngay bây giờ</b> để giữ mức giá hiện tại lâu hơn, thay vì phải mua lại theo giá mới mỗi tháng.
    </div>
    ${(() => {
      function chipHtml(pl){
        const savings = planSavingsLabel(pl);
        // Gói flash sale/giá giới thiệu: hiện thêm giá gốc gạch ngang ngay trong chip — thấy ngay
        // đang được giảm bao nhiêu mà không cần bấm chọn mới thấy, tăng cảm giác "hời" ngay từ cái
        // nhìn đầu tiên.
        const originalPlan = pl.flash ? REGULAR_PLANS.find(r => r.key === pl.key.replace('_flash',''))
          : pl.key.endsWith('_ref') ? REGULAR_PLANS.find(r => r.key === pl.key.replace('_ref','')) : null;
        const priceHtml = originalPlan
          ? `<s style="opacity:.65;font-weight:400;">${originalPlan.amount.toLocaleString('vi-VN')}đ</s> ${pl.amount.toLocaleString('vi-VN')}đ`
          : `${pl.amount.toLocaleString('vi-VN')}đ`;
        // Tag đỏ "FLASH SALE" kiểu app bán hàng — nổi bật hơn hẳn emoji 🔥 đứng trước chữ, giúp
        // phân biệt ngay gói ưu đãi có thời hạn với gói giá thường trong danh sách (theo phản hồi
        // chị Quỳnh 2026-08-20). Gắn theo pl.flash (đúng ngữ nghĩa "đang giảm giá có hạn"), không
        // gắn theo pl.recommended (khái niệm khác — gói được đề xuất, có thể không phải flash sale).
        const flashTag = pl.flash ? `<span style="display:inline-block;background:#E5484D;color:#fff;font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;letter-spacing:.03em;margin-right:6px;vertical-align:middle;">FLASH SALE</span>` : '';
        return `<div class="chip ${pl.key===selectedPaymentPlanKey?'selected':''}" data-plan="${pl.key}">${flashTag}${esc(pl.label)} — ${priceHtml}${savings?` <span style="opacity:.72;font-size:11.5px;">(${savings})</span>`:''}</div>`;
      }
      const flashPlans = plans.filter(pl => pl.flash);
      const basePlans = plans.filter(pl => !pl.flash);
      return `
        <div class="chips" id="plan-chips">
          ${flashPlans.map(chipHtml).join('')}
          ${flashPlans.length ? `<div style="flex-basis:100%;font-size:12px;color:var(--ink-soft);margin:4px 2px 0;">— Sau ngày 20/8, chỉ còn giá thường bên dưới —</div>` : ''}
          ${basePlans.map(chipHtml).join('')}
        </div>
      `;
    })()}
    ${plan.note?`<div style="margin-top:8px;font-size:12.5px;color:var(--accent);">${esc(plan.note)}</div>`:''}

    ${qrUrl ? `
      <div style="text-align:center;margin-top:18px;">
        <img src="${qrUrl}" alt="Mã VietQR" style="max-width:260px;width:100%;border-radius:12px;border:1px solid var(--line);">
        <div style="margin-top:8px;">
          <a href="${qrUrl}" download="vietqr-thanh-toan.png" target="_blank" rel="noopener" style="font-size:12.5px;color:var(--accent);font-weight:600;text-decoration:none;">📥 Tải ảnh mã QR về máy</a>
        </div>
      </div>
      <div style="margin-top:14px;font-size:13.5px;line-height:1.7;">
        <div><b>Ngân hàng:</b> Vietinbank</div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;"><b>Số tài khoản:</b> ${esc(PAYMENT_BANK.account)} <span class="btn-ghost btn btn-sm" style="padding:3px 10px;font-size:11.5px;" data-copy-value="${esc(PAYMENT_BANK.account)}">Copy</span></div>
        <div><b>Chủ tài khoản:</b> ${esc(PAYMENT_BANK.accountName)}</div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;"><b>Số tiền:</b> ${plan.amount.toLocaleString('vi-VN')}đ <span class="btn-ghost btn btn-sm" style="padding:3px 10px;font-size:11.5px;" data-copy-value="${plan.amount}">Copy</span></div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;"><b>Nội dung CK (bắt buộc giữ nguyên):</b> <span style="font-family:'IBM Plex Mono',monospace;background:var(--accent-soft);padding:2px 8px;border-radius:6px;">${esc(transferContent)}</span> <span class="btn-ghost btn btn-sm" style="padding:3px 10px;font-size:11.5px;" data-copy-value="${esc(transferContent)}">Copy</span></div>
      </div>
      <div class="hint-box" style="margin-top:14px;">Quét mã hoặc chuyển khoản đúng số tiền + giữ nguyên nội dung <b>${esc(transferContent)}</b> (bắt buộc có chữ SEVQR ở đầu thì ngân hàng mới báo về hệ thống được) — hệ thống tự đối chiếu và kích hoạt, không cần nội dung nào khác. Chuyển xong đợi 1-2 phút rồi tải lại trang.</div>
    ` : `
      <div class="error-box" style="margin-top:14px;">Chưa có mã tài khoản để đối chiếu tự động. Nhắn email đăng ký (${esc((AppState.user&&AppState.user.email)||'')}) qua Zalo/Fanpage để được kích hoạt thủ công.</div>
    `}
  `;
}
// redraw: hàm vẽ lại màn hình đang gọi (khác nhau giữa renderExpiredScreen và module Nâng Cấp)
function bindPaymentCard(root, redraw){
  root.querySelectorAll('[data-plan]').forEach(el=>{
    el.onclick = ()=>{ selectedPaymentPlanKey = el.getAttribute('data-plan'); redraw(); };
  });
  root.querySelectorAll('[data-copy-value]').forEach(el=>{
    el.onclick = async ()=>{
      try{
        await navigator.clipboard.writeText(el.getAttribute('data-copy-value'));
        const old = el.textContent;
        el.textContent = 'Đã copy ✓';
        setTimeout(()=>{ el.textContent = old; }, 1500);
      } catch(e){}
    };
  });
}

// Chỉ dành cho khách ĐÃ TRẢ PHÍ (has_paid) — trần 200 lượt/tháng đã đủ rộng cho use-case bình
// thường, gói này để dành riêng cho khách dùng vượt mức (nhiều kênh, tần suất cao...), không hiện
// cho khách dùng thử (họ nên mua gói chính thức, không phải mua thêm lượt).
function topupCardHtml(){
  const p = AppState.profile;
  if(!p || !p.has_paid) return '';
  const refCode = p.ref_code;
  const { used, limit } = paidMonthlyUsage(p);
  const basePricePerLuot = PAID_TOPUP_PACKS[0].amount / PAID_TOPUP_PACKS[0].luot;
  const pack = PAID_TOPUP_PACKS.find(pk => pk.key === selectedTopupKey) || PAID_TOPUP_PACKS[0];
  selectedTopupKey = pack.key;
  const transferContent = refCode ? `SEVQR ${refCode}` : null;
  const qrUrl = refCode
    ? `https://img.vietqr.io/image/${PAYMENT_BANK.code}-${PAYMENT_BANK.account}-compact2.png?amount=${pack.amount}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(PAYMENT_BANK.accountName)}`
    : null;
  return `
    <div class="card" style="max-width:460px;margin-top:16px;">
      <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:8px;">Mua thêm lượt AI</label>
      <div class="hint-box" style="margin-bottom:12px;">Tháng này bạn đã dùng <b>${used}/${limit} lượt</b>. Nếu cần dùng nhiều hơn mức bình thường (nhiều kênh, tần suất đăng cao...), mua thêm lượt dùng ngay trong tháng, không cần chờ đầu tháng sau. Mua càng nhiều, giá/lượt càng rẻ.</div>
      <div class="chips" id="topup-chips">
        ${PAID_TOPUP_PACKS.map(pk => {
          const pricePerLuot = pk.amount / pk.luot;
          const pct = Math.round((1 - pricePerLuot / basePricePerLuot) * 100);
          return `<div class="chip ${pk.key===selectedTopupKey?'selected':''}" data-topup="${pk.key}">+${pk.luot} lượt — ${pk.amount.toLocaleString('vi-VN')}đ${pct>0?` <span style="opacity:.72;font-size:11.5px;">(giảm ${pct}%)</span>`:''}</div>`;
        }).join('')}
      </div>
      ${qrUrl ? `
        <div style="text-align:center;margin-top:14px;">
          <img src="${qrUrl}" alt="Mã VietQR mua thêm lượt" style="max-width:220px;width:100%;border-radius:12px;border:1px solid var(--line);">
          <div style="margin-top:8px;"><a href="${qrUrl}" download="vietqr-mua-them-luot.png" target="_blank" rel="noopener" style="font-size:12.5px;color:var(--accent);font-weight:600;text-decoration:none;">📥 Tải ảnh mã QR về máy</a></div>
        </div>
        <div style="margin-top:14px;font-size:13.5px;line-height:1.7;">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;"><b>Số tiền:</b> ${pack.amount.toLocaleString('vi-VN')}đ <span class="btn-ghost btn btn-sm" style="padding:3px 10px;font-size:11.5px;" data-copy-value="${pack.amount}">Copy</span></div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;"><b>Nội dung CK (bắt buộc giữ nguyên):</b> <span style="font-family:'IBM Plex Mono',monospace;background:var(--accent-soft);padding:2px 8px;border-radius:6px;">${esc(transferContent)}</span> <span class="btn-ghost btn btn-sm" style="padding:3px 10px;font-size:11.5px;" data-copy-value="${esc(transferContent)}">Copy</span></div>
        </div>
        <div class="hint-box" style="margin-top:14px;">Quét mã hoặc chuyển khoản đúng số tiền + giữ nguyên nội dung <b>${esc(transferContent)}</b> (bắt buộc có chữ SEVQR ở đầu thì ngân hàng mới báo về hệ thống được) — lượt được cộng thẳng trong vài phút, dùng được ngay, không ảnh hưởng tới hạn gói đang có.</div>
      ` : ''}
    </div>
  `;
}
function bindTopupCard(root, redraw){
  root.querySelectorAll('[data-topup]').forEach(el=>{
    el.onclick = ()=>{ selectedTopupKey = el.getAttribute('data-topup'); redraw(); };
  });
  root.querySelectorAll('[data-copy-value]').forEach(el=>{
    if(el.onclick) return; // đã bind bởi bindPaymentCard trong cùng màn hình, khỏi gán trùng
    el.onclick = async ()=>{
      try{
        await navigator.clipboard.writeText(el.getAttribute('data-copy-value'));
        const old = el.textContent;
        el.textContent = 'Đã copy ✓';
        setTimeout(()=>{ el.textContent = old; }, 1500);
      } catch(e){}
    };
  });
}

// Màn hình lỗi tải hồ sơ (2026-08-23) — KHÁC renderExpiredScreen(): không mời mua gói, không có QR
// chuyển khoản, chỉ báo lỗi tạm thời + nút Thử lại, để không khiến người còn hạn dùng thật hiểu nhầm
// là phải trả tiền.
function renderProfileLoadErrorScreen(){
  const root = document.getElementById('app');
  root.innerHTML = `
    <div class="auth-shell" style="max-width:420px;">
      <img src="assets/logo-hieu-kenh-badge.png" class="auth-logo" alt="" onerror="this.style.display='none'">
      <h1>Không tải được thông tin tài khoản</h1>
      <div class="sub">Có thể do mạng chập chờn — đây không phải hết hạn dùng, tài khoản của bạn vẫn nguyên vẹn. Thử tải lại giúp mình nhé.</div>
      <div class="card">
        ${AppState.profileLoadError ? `<div class="error-box">${esc(AppState.profileLoadError)}</div>` : ''}
        <div class="btn-row" style="margin-top:10px;justify-content:center;">
          <button class="btn" id="retry-load-profile-btn">Thử lại</button>
        </div>
        <div class="btn-row" style="margin-top:6px;justify-content:center;">
          <span class="signout" id="signout-btn-loaderr" style="cursor:pointer;color:var(--ink-soft);font-size:13px;">Đăng xuất</span>
        </div>
      </div>
    </div>
  `;
  const retryBtn = root.querySelector('#retry-load-profile-btn');
  if(retryBtn) retryBtn.onclick = async ()=>{ await loadProfile(); renderApp(); };
  const btn = root.querySelector('#signout-btn-loaderr');
  if(btn) btn.onclick = async ()=>{ await supabaseClient.auth.signOut(); };
}

function renderExpiredScreen(){
  const root = document.getElementById('app');
  const p = AppState.profile;
  const hadAccessBefore = !!(p && p.access_until);

  root.innerHTML = `
    <div class="auth-shell" style="max-width:460px;">
      <img src="assets/logo-hieu-kenh-badge.png" class="auth-logo" alt="" onerror="this.style.display='none'">
      <h1>${hadAccessBefore ? 'Gói dùng đã hết hạn' : 'Dùng thử đã kết thúc'}</h1>
      <div class="sub">${hadAccessBefore
        ? `Gói của bạn đã hết hạn ngày ${esc(new Date(p.access_until).toLocaleDateString('vi-VN'))}. Chuyển khoản để tiếp tục dùng ngay.`
        : 'Chuyển khoản theo đúng hướng dẫn bên dưới — hệ thống tự kích hoạt trong vài phút, không cần chờ ai xác nhận.'}</div>

      <div class="card">
        ${paymentCardHtml()}
        <div class="btn-row" style="margin-top:16px;justify-content:center;">
          <button class="btn-ghost btn" id="reload-status-btn">Tôi đã chuyển khoản — tải lại trạng thái</button>
        </div>
        <div class="btn-row" style="margin-top:6px;justify-content:center;">
          <span class="signout" id="signout-btn-expired" style="cursor:pointer;color:var(--ink-soft);font-size:13px;">Đăng xuất</span>
        </div>
      </div>
    </div>
  `;

  bindPaymentCard(root, renderExpiredScreen);
  const reloadBtn = root.querySelector('#reload-status-btn');
  if(reloadBtn) reloadBtn.onclick = async ()=>{ await loadProfile(); renderApp(); };
  const btn = root.querySelector('#signout-btn-expired');
  if(btn) btn.onclick = async ()=>{ await supabaseClient.auth.signOut(); };
}

let signupIsStudent = null;
// Giữ lại đúng những gì người dùng đã gõ (tên/email/mật khẩu) qua các lần renderAuthScreen() re-render
// (đổi tab đăng nhập/đăng ký, chọn "đã học/chưa học", báo lỗi validate...) — TRƯỚC ĐÂY mỗi lần render
// lại là các input bị XOÁ TRẮNG hoàn toàn (không có "value=" nào cả), nên chỉ cần bấm nhầm thứ tự (vd
// gõ hết form rồi mới chọn "Chưa" ở cuối) là mất sạch, bấm "Tạo tài khoản" với ô email trống sẽ ra lỗi
// khó hiểu "Anonymous sign-ins are disabled" (Supabase hiểu signUp với email rỗng là đăng ký ẩn danh).
let authFields = { name:'', email:'', pass:'', passConfirm:'' };

function renderAuthScreen(err, successMsg){
  const root = document.getElementById('app');
  const isLogin = AppState.authMode === 'login';
  root.innerHTML = `
    <div class="auth-shell">
      <img src="assets/logo-hieu-kenh-badge.png" class="auth-logo" alt="" onerror="this.style.display='none'">
      <h1>XÂY NHÂN HIỆU</h1>
      <div class="sub">Định vị · Sửa kênh · Viết content · Lịch đăng<br><span class="sub-brand">Hệ sinh thái HIỂU - HIỂU KÊNH</span></div>
      <div class="auth-tabs">
        <div class="auth-tab ${isLogin?'active':''}" data-mode="login">Đăng nhập</div>
        <div class="auth-tab ${!isLogin?'active':''}" data-mode="signup">Đăng ký</div>
      </div>
      <div class="card">
        ${!isLogin ? `<label>Họ tên</label><input id="af-name" type="text" placeholder="Tên của bạn" value="${esc(authFields.name)}">` : ''}
        <label>Email</label>
        <input id="af-email" type="email" placeholder="ban@email.com" value="${esc(authFields.email)}">
        <label>Mật khẩu</label>
        <input id="af-pass" type="password" placeholder="Ít nhất 6 ký tự" value="${esc(authFields.pass)}">
        ${!isLogin ? `<label>Xác nhận mật khẩu</label><input id="af-pass-confirm" type="password" placeholder="Nhập lại mật khẩu" value="${esc(authFields.passConfirm)}">` : ''}
        ${!isLogin ? `
          <label>Bạn đã học khoá Xây Nhân Hiệu chưa?</label>
          <div class="chips" id="af-student-chips" style="margin-bottom:14px;">
            <div class="chip ${signupIsStudent===true?'selected':''}" data-student="yes">Đã học rồi</div>
            <div class="chip ${signupIsStudent===false?'selected':''}" data-student="no">Chưa</div>
          </div>
        ` : ''}
        <button class="btn btn-full" id="af-submit">${isLogin?'Đăng nhập':'Tạo tài khoản'}</button>
        ${err ? `<div class="error-box">${esc(err)}</div>` : ''}
        ${successMsg ? `<div class="hint-box">${esc(successMsg)}</div>` : ''}
      </div>
    </div>
  `;

  root.querySelectorAll('.auth-tab').forEach(el=>{
    el.onclick = ()=>{ AppState.authMode = el.getAttribute('data-mode'); renderAuthScreen(); };
  });

  const nameEl = root.querySelector('#af-name'); if(nameEl) nameEl.oninput = ()=>{ authFields.name = nameEl.value; };
  root.querySelector('#af-email').oninput = (e)=>{ authFields.email = e.target.value; };
  root.querySelector('#af-pass').oninput = (e)=>{ authFields.pass = e.target.value; };
  const confirmEl = root.querySelector('#af-pass-confirm'); if(confirmEl) confirmEl.oninput = ()=>{ authFields.passConfirm = confirmEl.value; };

  root.querySelectorAll('#af-student-chips [data-student]').forEach(el=>{
    el.onclick = ()=>{ signupIsStudent = (el.getAttribute('data-student') === 'yes'); renderAuthScreen(); };
  });

  root.querySelector('#af-submit').onclick = async ()=>{
    const email = root.querySelector('#af-email').value.trim();
    const pass = root.querySelector('#af-pass').value;
    const btn = root.querySelector('#af-submit');
    try{
      if(isLogin){
        btn.disabled = true; btn.textContent = 'Đang xử lý…';
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password: pass });
        if(error) throw error;
      } else {
        const confirmPass = root.querySelector('#af-pass-confirm').value;
        if(!email){ renderAuthScreen('Vui lòng nhập email.'); return; }
        if(pass !== confirmPass){ renderAuthScreen('Mật khẩu xác nhận không khớp — kiểm tra lại.'); return; }
        if(signupIsStudent === null){ renderAuthScreen('Vui lòng chọn bạn đã học khoá Xây Nhân Hiệu hay chưa.'); return; }
        btn.disabled = true; btn.textContent = 'Đang xử lý…';
        const full_name = root.querySelector('#af-name').value.trim();
        let referredByRefCode = null;
        try { referredByRefCode = localStorage.getItem(REF_STORAGE_KEY) || null; } catch(e){}
        const { data, error } = await supabaseClient.auth.signUp({ email, password: pass, options:{ data:{ full_name, is_student: signupIsStudent, referred_by_ref_code: referredByRefCode } } });
        if(error) throw error;
        // Đã dùng xong (handle_new_user trong schema_full.sql đã đọc metadata này lúc tạo profile)
        // — xoá để lần đăng ký SAU đó (vd tài khoản khác trên cùng máy) không bị gán nhầm referrer cũ.
        try { localStorage.removeItem(REF_STORAGE_KEY); } catch(e){}
        // Đẩy lead sang Brevo để chăm sóc qua email — không chờ, không chặn luồng đăng ký dù lỗi
        // (vd chưa cấu hình BREVO_API_KEY) vì đây chỉ là việc phụ, không phải điều kiện đăng ký.
        fetch('api/sync-lead-brevo', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email, full_name, is_student: signupIsStudent }),
        }).catch(()=>{});
        if(!data.session){
          AppState.authMode = 'login';
          signupIsStudent = null;
          authFields = { name:'', email:'', pass:'', passConfirm:'' };
          renderAuthScreen(null, 'Đăng ký thành công! Nếu tài khoản cần xác nhận email, kiểm tra hộp thư rồi quay lại đăng nhập bằng email/mật khẩu vừa tạo.');
        }
        // Nếu có session ngay (không bật xác nhận email), onAuthStateChange sẽ tự đưa vào app.
      }
    } catch(e){
      renderAuthScreen(e.message);
    }
  };
}

// 2026-08-29, theo yêu cầu chị Quỳnh "cho xem lại nội dung cũ mãi mãi sau khi hết hạn" — trước
// đây renderApp() chặn CỨNG toàn bộ app (renderExpiredScreen) ngay khi access_until qua hạn, kể cả
// chỉ để xem lại Kho Content/Lịch Đăng Bài cũ. Giờ chỉ ép về đúng trang Nâng cấp MỘT LẦN ngay khi
// phát hiện hết hạn (để chắc chắn họ thấy ngay), sau đó cho tự do xem mọi mục khác như bình thường.
// Chặn hành động AI MỚI vẫn là chặn THẬT ở consume_ai_quota() (schema_full.sql) — không phải chặn
// điều hướng ở đây, nên không cần ẩn/khoá từng mục sidebar theo tay.
let expiredRedirectDone = false;

function renderApp(){
  // Tải hồ sơ thất bại (lỗi mạng/API, đã thử lại 1 lần trong loadProfile() rồi vẫn lỗi) khác hẳn
  // "thật sự hết hạn" — không được rơi vào renderExpiredScreen() (hasActiveAccess() thấy profile=null
  // sẽ hiểu nhầm là "chưa từng dùng thử", hiện oan "Dùng thử 7 ngày đã kết thúc" cho người còn hạn
  // dùng thật, xem loadProfile()).
  if(AppState.user && !AppState.profile && AppState.profileLoadError){ renderProfileLoadErrorScreen(); return; }
  // Hồ sơ hoàn toàn chưa có (không phải lỗi tải, cũng không phải hết hạn) — chưa đủ dữ liệu để vẽ
  // sidebar (role, nav theo quyền...) nên vẫn giữ màn chặn cũ cho ĐÚNG trường hợp hiếm này.
  if(AppState.user && !AppState.profile){ renderExpiredScreen(); return; }
  const expired = !hasActiveAccess();
  if(expired && !expiredRedirectDone && AppState.route !== 'nang-cap'){
    expiredRedirectDone = true;
    location.hash = 'nang-cap';
    return; // hashchange sẽ tự gọi lại renderApp() với route đã cập nhật
  }
  const root = document.getElementById('app');
  root.innerHTML = `
    <div class="topbar-mobile">
      <span class="menu-toggle" id="menu-toggle-btn">☰</span>
      <span class="topbar-title">XÂY NHÂN HIỆU</span>
    </div>
    ${expired ? `<div style="background:var(--danger);color:#fff;padding:9px 16px;font-size:13px;text-align:center;">Gói dùng đã hết hạn — bạn vẫn xem được nội dung cũ, <a href="#nang-cap" style="color:#fff;text-decoration:underline;font-weight:600;">nâng cấp ngay</a> để tiếp tục dùng AI.</div>` : ''}
    <div class="app-layout">
      <div class="sidebar-overlay" id="sidebar-overlay"></div>
      <div class="sidebar" id="sidebar">
        <div class="sidebar-brand" id="sidebar-brand-home" style="cursor:pointer;">
          <img src="assets/logo-hieu-kenh-badge.png" class="brand-logo" alt="" onerror="this.style.display='none'">
          <div class="brand-text">XÂY NHÂN HIỆU<small>Hệ sinh thái HIỂU<br>HIỂU KÊNH</small></div>
        </div>
        <div class="sidebar-nav" id="sidebar-nav"></div>
        <div class="sidebar-foot">
          <div id="sidebar-foot-info" style="cursor:pointer;" title="Bấm để vào Tài khoản">${sidebarFootHtml()}</div>
          <span class="signout" id="signout-btn">Đăng xuất</span>
        </div>
      </div>
      <div class="main"><div class="main-inner" id="main-content"></div></div>
    </div>
  `;

  const isAdmin = AppState.profile && AppState.profile.role === 'admin';
  const visibleNav = NAV.filter(n=> !n.hidden && (!n.adminOnly || isAdmin));
  const nav = root.querySelector('#sidebar-nav');
  nav.innerHTML = visibleNav.map((n,i)=>{
    return `
    <div class="sidebar-item ${AppState.route===n.key?'active':''}" data-key="${n.key}">
      <span class="num">${i+1}</span><span>${esc(n.title)}</span>
    </div>
  `;}).join('');

  const sidebar = root.querySelector('#sidebar');
  const overlay = root.querySelector('#sidebar-overlay');
  const closeDrawer = ()=>{ sidebar.classList.remove('open'); overlay.classList.remove('open'); };
  const menuBtn = root.querySelector('#menu-toggle-btn');
  if(menuBtn) menuBtn.onclick = ()=>{ sidebar.classList.add('open'); overlay.classList.add('open'); };
  overlay.onclick = closeDrawer;
  root.querySelector('#sidebar-brand-home').onclick = ()=>{ location.hash = 'trang-chu'; closeDrawer(); };

  nav.querySelectorAll('.sidebar-item').forEach(el=>{
    el.onclick = ()=>{
      location.hash = el.getAttribute('data-key');
      closeDrawer(); // trên điện thoại, chọn xong 1 mục thì tự đóng ngăn kéo lại, khỏi phải bấm tay
    };
  });

  root.querySelector('#signout-btn').onclick = async ()=>{ await supabaseClient.auth.signOut(); };
  const footInfo = root.querySelector('#sidebar-foot-info');
  if(footInfo) footInfo.onclick = ()=>{ location.hash = 'tai-khoan'; };

  if(window.startOnboardingTour && AppState.user){
    const alreadySeen = !!(AppState.profile && AppState.profile.onboarding_seen);
    window.startOnboardingTour(AppState.user.id, alreadySeen, async ()=>{
      const { error } = await supabaseClient.rpc('mark_onboarding_seen');
      if(!error && AppState.profile) AppState.profile.onboarding_seen = true;
      if(window.maybeShowInstallPrompt) window.maybeShowInstallPrompt();
    });
  }

  maybeShowFeatureAnnouncement();
  // Thứ tự ưu tiên: thông báo tính năng → ưu đãi 3 ngày đầu (có hạn, giá trị doanh thu rõ nhất) →
  // mời bật thông báo → xin đánh giá. Nối chuỗi bằng .then() (không gọi song song) để không có 2
  // overlay cùng bật đè lên nhau — maybeShowPushPrompt() có await bên trong nên không đồng bộ như
  // 2 cái còn lại, phải chờ nó tự quyết xong (có vẽ overlay hay không) rồi mới xét review prompt.
  maybeShowEarlyBirdPrompt();
  maybeShowPushPrompt().then(maybeShowReviewPrompt);

  const content = root.querySelector('#main-content');
  const mod = window.Modules && window.Modules[AppState.route];
  if(mod && mod.render){
    mod.render(content, { supabase: supabaseClient, user: AppState.user, profile: AppState.profile });
  } else {
    content.innerHTML = `<div class="card">Module đang được xây dựng.</div>`;
  }
}

window.Modules = window.Modules || {};
document.addEventListener('DOMContentLoaded', initApp);
