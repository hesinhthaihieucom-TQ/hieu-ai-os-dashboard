const NAV = [
  { key:'trang-chu', title:'Trang chủ', hidden:true }, // không hiện trong sidebar — chỉ dành cho lúc mới đăng nhập/đăng ký, vào lại qua bấm logo/"XÂY NHÂN HIỆU"
  { key:'dinh-vi', title:'Định Vị' },
  { key:'sua-kenh', title:'Sửa Kênh' },
  { key:'dinh-dang-content', title:'Dạng Content' },
  { key:'kho-content', title:'Kho Content' },
  { key:'kho-hook', title:'Kho Hook' },
  { key:'viet-content', title:'Viết Content' },
  { key:'tai-che-viral', title:'Tái Chế Content Viral' },
  { key:'cham-diem-content', title:'Chấm Điểm Content' },
  { key:'cham-diem-hook', title:'Chấm Điểm Hook' },
  { key:'lich-dang', title:'Lịch Đăng Bài' },
  { key:'day-bai', title:'Đẩy Bài & CTA Comment' },
  { key:'tao-anh', title:'Tạo Ảnh Thương Hiệu' },
  { key:'tro-giup', title:'Hỏi & Trợ Giúp' },
  { key:'nang-cap', title:'🔥 Nâng cấp / Mua gói' },
  { key:'quan-tri-hub', title:'Quản trị', adminOnly:true },
  { key:'tai-khoan', title:'Tài khoản', hidden:true }, // không hiện trong sidebar — vào qua bấm email ở cuối sidebar
];

const AppState = { user:null, profile:null, route:'trang-chu', authMode:'login' };

const PAYMENT_BANK = { code:'vietinbank', account:'199339288888', accountName:'LE TU QUYNH' };
// Public key VAPID cho Web Push (2026-08-21) — an toàn để lộ ở client (đúng bản chất "public" trong
// tên gọi), chỉ dùng để trình duyệt xác nhận đúng server này được phép gửi thông báo cho subscription
// đó. Private key TUYỆT ĐỐI không đưa vào code — chỉ nằm trong biến môi trường VAPID_PRIVATE_KEY ở
// Vercel, dùng ở api/_lib/push.js. Đổi key này thì phải đổi luôn VAPID_PUBLIC_KEY ở Vercel env cho
// khớp, không thì subscribe sẽ ký sai server và bị từ chối.
const VAPID_PUBLIC_KEY = 'BI1GvgYqAsScGulHSSnwaBz9AZt3-A1pW9ioOch0nLA2HDDvrjYSW0GYC1SkOmTm4fPTAlIhtag0ksV1TUeTAL0';
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
  const month = new Date().toISOString().slice(0,7);
  const sameMonth = p.paid_ai_month === month;
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
    const period = p.has_paid ? 'tháng này' : 'trọn đời';
    return `<span style="color:#8A8F82;">🔥 Đã dùng ${used} lượt (${period}) — không giới hạn</span>`;
  }
  if(p.has_paid){
    const { used, limit } = paidMonthlyUsage(p);
    const remaining = Math.max(0, limit - used);
    const color = remaining<=10 ? 'var(--danger)' : '#9CA396';
    return `<span style="color:${color};">✨ Còn ${remaining}/${limit} lượt tháng này</span>`;
  }
  const remaining = Math.max(0, TRIAL_AI_LIMIT - (p.trial_ai_uses||0));
  const color = remaining<=3 ? 'var(--danger)' : '#9CA396';
  return `<span style="color:${color};">🎁 Còn ${remaining}/${TRIAL_AI_LIMIT} lượt dùng thử</span>`;
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
  'api/cham-diem-content': 2, 'api/goi-y-lich': 2, 'api/goi-y-day-bai': 2,
  'api/viet-content': 3, 'api/viet-tu-kho-goc': 3, 'api/tai-che-viral': 3,
  'api/sua-kenh': 4,
  'api/dinh-vi': 8,
  'api/dinh-vi-parse': 6,
};
window.onGatedApiSuccess = function(relativePath){
  const p = AppState.profile;
  if(!p) return;
  const path = relativePath.split('?')[0];
  const weight = GATED_API_WEIGHTS[path];
  if(!weight) return;
  if(!p.has_paid){
    p.trial_ai_uses = (p.trial_ai_uses||0) + weight;
  } else {
    const month = new Date().toISOString().slice(0,7);
    if(p.paid_ai_month !== month){ p.paid_ai_month = month; p.paid_ai_uses = 0; p.paid_ai_bonus = 0; }
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
function currentPaymentPlans(){
  const p = AppState.profile;
  const isStudent = !!(p && p.is_student);
  const base = isStudent
    ? buildStudentPlans(p)
    : (p && p.referred_by_ref_code) ? REFERRAL_REGULAR_PLANS : REGULAR_PLANS;
  return isFlashSaleActive() ? [...FLASH_SALE_PLANS, ...base] : base;
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

  const { data } = await supabaseClient.auth.getSession();
  if(data.session){
    AppState.user = data.session.user;
    await loadProfile();
    AppState.route = currentRouteFromHash();
    renderApp();
  } else {
    renderAuthScreen();
  }

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
      loadProfile().then(()=>{
        location.hash = 'trang-chu';
        renderApp();
      });
    } else if(event === 'SIGNED_OUT'){
      AppState.user = null;
      AppState.profile = null;
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

async function loadProfile(){
  if(!AppState.user) return;
  const { data } = await supabaseClient.from('profiles').select('*').eq('id', AppState.user.id).maybeSingle();
  AppState.profile = data || null;
}

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

  return `
    <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:8px;">${isStudent ? '🎓 Chọn gói muốn mua (giá học viên — đã giảm 20%)' : 'Chọn gói muốn mua'}</label>
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

function renderExpiredScreen(){
  const root = document.getElementById('app');
  const p = AppState.profile;
  const hadAccessBefore = !!(p && p.access_until);

  root.innerHTML = `
    <div class="auth-shell" style="max-width:460px;">
      <img src="assets/logo-hieu-kenh-badge.svg" class="auth-logo" alt="" onerror="this.style.display='none'">
      <h1>${hadAccessBefore ? 'Gói dùng đã hết hạn' : 'Dùng thử 7 ngày đã kết thúc'}</h1>
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
      <img src="assets/logo-hieu-kenh-badge.svg" class="auth-logo" alt="" onerror="this.style.display='none'">
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

function renderApp(){
  if(!hasActiveAccess()){ renderExpiredScreen(); return; }
  const root = document.getElementById('app');
  root.innerHTML = `
    <div class="topbar-mobile">
      <span class="menu-toggle" id="menu-toggle-btn">☰</span>
      <span class="topbar-title">XÂY NHÂN HIỆU</span>
    </div>
    <div class="app-layout">
      <div class="sidebar-overlay" id="sidebar-overlay"></div>
      <div class="sidebar" id="sidebar">
        <div class="sidebar-brand" id="sidebar-brand-home" style="cursor:pointer;">
          <img src="assets/logo-hieu-kenh-badge.svg" class="brand-logo" alt="" onerror="this.style.display='none'">
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
