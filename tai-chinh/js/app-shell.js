// Rút gọn từ nhan-hieu/js/app-shell.js — CHỈ giữ routing + đăng nhập/đăng ký Supabase Auth.
// Tên sản phẩm: "SỔ DÒNG TIỀN TÂM THỨC" (chốt 2026-08-21, đổi từ "SỔ DÒNG TIỀN" — mã nội bộ/kỹ
// thuật là KarmaFlow, không hiện trên UI) — đổi tên sau này chỉ cần sửa các chuỗi trong file này
// + index.html <title>/meta, không ảnh hưởng gì tới dữ liệu/kiến trúc.
//
// Bắt mã giới thiệu (?ref=...) CÀNG SỚM CÀNG TỐT, trước khi người dùng kịp rời trang landing —
// copy quy tắc từ nhan-hieu/js/app-shell.js. Key RIÊNG "tc_referred_by_ref_code" (khác
// "xnh_referred_by_ref_code" của nhan-hieu) vì 2 app cùng chia sẻ 1 domain/localStorage khi deploy
// qua hesinhthaihieu.com — không được lẫn link giới thiệu của app này với app kia. Ghi vào ĐÚNG cột
// profiles.referred_by_ref_code lúc đăng ký (tái dùng cột chung, xem schema_full.sql phần chương
// trình giới thiệu) — không ghi đè nếu đã có sẵn 1 mã khác, tôn trọng link giới thiệu ĐẦU TIÊN.
const TC_REF_STORAGE_KEY = 'tc_referred_by_ref_code';
(function captureReferralCode(){
  try {
    const m = /[?&]ref=([A-Za-z0-9]+)/.exec(location.search);
    if(m && !localStorage.getItem(TC_REF_STORAGE_KEY)) localStorage.setItem(TC_REF_STORAGE_KEY, m[1].toUpperCase());
  } catch(e){}
})();
//
// Thu phí (2026-08-23, theo yêu cầu chị Quỳnh; SỬA 2026-08-24 — bỏ hẳn 14 ngày dùng thử): freemium,
// KHÔNG phải all-or-nothing như nhan-hieu. Ghi Chép Hàng Ngày + Kiến Thức Nền Tảng luôn FREE mãi mãi
// (giữ thói quen ghi chép hàng ngày + marketing tự nhiên qua nội dung giáo dục). Chấm Điểm Nghiệp
// Tiền CŨNG free mãi mãi — cố ý dùng làm "mồi": cho làm bài chẩn đoán miễn phí (ra Điểm Nghiệp +
// khâu yếu nhất), rồi mời nâng cấp NGAY lúc vừa thấy kết quả, đúng lúc động lực cao nhất, thay vì
// phải chờ hết 14 ngày mới gặp màn khoá. 5 route còn lại trong PREMIUM_ROUTES khoá THẲNG (không có
// giai đoạn dùng thử nào) trừ khi tc_has_paid — xem hasActiveAccess()/renderApp() (TC_TRIAL_DAYS=0).
// Chưa có tài khoản thật nào dùng app lúc đổi quy tắc này nên không cần lo ai bị "cắt" quyền đang
// dùng — áp dụng ngay cho tất cả. KHÁC nhan-hieu: không có renderExpiredScreen chiếm toàn màn hình —
// sidebar vẫn dùng được bình thường, chỉ đúng route premium hiện màn nâng cấp.
const NAV = [
  { key:'trang-chu', title:'Trang chủ', hidden:true }, // không hiện trong sidebar (giống nhan-hieu) — 2026-08-24 góp ý Quỳnh, vào lại qua bấm logo/"SỔ DÒNG TIỀN TÂM THỨC" ở đầu sidebar (đã có sẵn #sidebar-brand-home)
  { key:'thiet-lap-nhanh', title:'Chấm Điểm Nghiệp Tiền' }, // KHÔNG premium — free mãi mãi, dùng làm bài chẩn đoán mồi trước khi mời nâng cấp (2026-08-24). "Theo Dõi Kết Quả" là 1 TAB bên trong route này (xem thiet-lap-nhanh.js), KHÔNG phải route riêng — 2026-08-25, góp ý Quỳnh: "là 1 mục của chấm điểm nghiệp chứ không phải trang mới ẩn trong sidebar".
  { key:'kien-thuc', title:'Kiến Thức Nền Tảng' },
  { key:'tang-thuc', title:'Hạt Giống Phước - Nghiệp', premium:true },
  { key:'muc-tieu', title:'Mục Tiêu & Cam Kết', premium:true },
  { key:'ghi-chep', title:'Ghi Chép Hàng Ngày' },
  { key:'danh-muc', title:'Danh Mục', hidden:true }, // không hiện trong sidebar — vào qua link "Quản lý danh mục →" ở Ghi Chép Hàng Ngày/Ngân sách. KHÔNG premium (dù Ngân sách premium) vì Ghi Chép Hàng Ngày free cần danh mục hoạt động được ngay.
  { key:'tong-ket-tuan', title:'Tổng Kết Tuần', premium:true },
  { key:'tong-ket-thang', title:'Tổng Kết Tháng', premium:true },
  { key:'tong-ket-nam', title:'Tổng Kết Năm', premium:true }, // 2026-08-26, góp ý Quỳnh — gộp 12 tháng + chấm điểm nghiệp cuối năm (từ tc_karma_history) + ôn lại Hạt Giống trong năm + lời cam kết năm tới
  { key:'quan-ly-no', title:'Quản Lý Nợ', premium:true },
  { key:'nang-cap', title:'Nâng Cấp' }, // luôn vào được, kể cả đang còn hạn dùng thử — không phải premium
  { key:'tai-khoan', title:'Tài khoản', hidden:true }, // vào qua bấm email ở cuối sidebar, không hiện trong danh sách
  { key:'quan-tri', title:'Quản Trị', adminOnly:true }, // chỉ hiện khi profiles.role==='admin', xem renderApp()
];
const PREMIUM_ROUTES = new Set(NAV.filter(n=>n.premium).map(n=>n.key));
// Route khách (chưa đăng nhập) được vào thẳng — 2026-08-26, góp ý Quỳnh: "gửi link cho người ta làm
// bài Chấm Điểm Nghiệp, người ta ko phải đăng ký, làm xong muốn lưu thì mới hiện popup đăng ký".
// 'trang-chu' giờ là màn chào mừng công khai (xem trang-chu.js), 'thiet-lap-nhanh' là bài chẩn đoán
// tự tính kết quả trên máy khách, không đụng Supabase (xem isGuest trong thiet-lap-nhanh.js).
const GUEST_ALLOWED_ROUTES = new Set(['trang-chu', 'thiet-lap-nhanh']);
const TC_TRIAL_DAYS = 0; // 2026-08-24: bỏ hẳn dùng thử, xem comment NAV phía trên
// Giá 3 mức THEO TỪNG NGƯỜI DÙNG (2026-08-26, chị Quỳnh chốt — THAY hẳn mốc giá ra mắt theo lịch
// chung 15/9 trước đó): đếm từ lúc NGƯỜI ĐÓ vào app tai-chinh lần đầu (tc_trial_started_at — mượn
// lại cột này từ hệ thống dùng thử cũ đã bỏ, KHÔNG liên quan gì tới TC_TRIAL_DAYS/hasActiveAccess()
// vẫn khoá thẳng như cũ, chỉ mượn đúng cái MỐC THỜI GIAN). Ngày 0-15: 299k, 15-30: 599k, sau 30: 999k
// (giá chuẩn). KHÁC "giá ra mắt" ở chỗ: đây là chính sách giá THƯỜNG TRỰC cho MỌI người dùng mới,
// không phải 1 sự kiện chung có ngày hết hạn — vẫn là mốc THẬT (mỗi người chỉ có đúng 1 lần 15 ngày
// đầu của chính họ, không reset/lặp lại), không phải giá gốc bịa ra để giảm ảo. 3 số tiền (299k/599k/
// 999k) đã kiểm tra không trùng bất kỳ giá trị nào ở AMOUNT_TO_DAYS/AMOUNT_TO_TOPUP_LUOT (xem
// TC_LIFETIME_AMOUNTS ở api/sepay-webhook.js — phải sửa CẢ 2 nơi cùng lúc nếu đổi số tiền/mốc ngày).
const TC_PRICE_TIER_1 = 299000; // ngày 0-15 kể từ lần đầu vào app
const TC_PRICE_TIER_2 = 599000; // ngày 15-30
const TC_PRICE_TIER_3 = 999000; // sau ngày 30 — giá chuẩn
function tcSignupElapsedDays(profile){
  const p = profile || AppState.profile;
  if(!p || !p.tc_trial_started_at) return 0; // chưa có mốc (vd chưa load xong profile) — coi như ngày 0, an toàn hơn là báo giá cao nhầm
  return (Date.now() - new Date(p.tc_trial_started_at).getTime()) / 86400000;
}
function tcCurrentPrice(profile){
  const days = tcSignupElapsedDays(profile);
  return days < 15 ? TC_PRICE_TIER_1 : days < 30 ? TC_PRICE_TIER_2 : TC_PRICE_TIER_3;
}
// Số ngày còn lại ở ĐÚNG mức giá hiện tại (không phải tổng số ngày dùng thử) — null nếu đã ở mức giá
// chuẩn cuối cùng (không còn "sắp tăng" nữa).
function tcPriceTierDaysLeft(profile){
  const days = tcSignupElapsedDays(profile);
  if(days < 15) return Math.max(0, Math.ceil(15 - days));
  if(days < 30) return Math.max(0, Math.ceil(30 - days));
  return null;
}
function tcNextTierPrice(profile){
  const days = tcSignupElapsedDays(profile);
  if(days < 15) return TC_PRICE_TIER_2;
  if(days < 30) return TC_PRICE_TIER_3;
  return null;
}
// Khối giá DÙNG CHUNG ở MỌI nơi mời nâng cấp (2026-08-26, góp ý Quỳnh: "hiển thị đều cho người ta
// thấy được cái sự rẻ của bắt đầu ngay với 299k") — gạch ngang giá chuẩn 999k bên cạnh giá hiện tại +
// nói rõ số tiền tiết kiệm được, thay vì chỉ nói giá suông. 999k là mốc giá THẬT (chính người này sẽ
// phải trả nếu chờ đủ 30 ngày), không phải giá bịa ra để so sánh — an toàn về mặt không lừa dối.
function tcPriceAnchorHtml(profile){
  const price = tcCurrentPrice(profile);
  const tierDaysLeft = tcPriceTierDaysLeft(profile);
  const nextPrice = tcNextTierPrice(profile);
  if(!nextPrice){
    return `<div style="text-align:center;font-size:24px;font-weight:800;color:var(--accent);">${price.toLocaleString('vi-VN')}đ</div>`;
  }
  const savings = TC_PRICE_TIER_3 - price;
  // Giá GỐC to hơn giá phải trả (2026-08-26, góp ý Quỳnh: "để giá gốc to hơn... mới tạo hiệu ứng giá
  // phải trả ít hơn, bé hơn") — giữ nguyên đảo ngược này.
  //
  // 2026-09-03, góp ý Quỳnh: "làm sao để nhấn mạnh thật rõ" việc giá tăng theo thời gian — bản cũ
  // roadmap chỉ là 1 DÒNG CHỮ NHỎ 11px màu mờ, dễ bị lướt qua/không hiểu đúng cơ chế (mốc mức 2 còn
  // viết tương đối "15 ngày tiếp" thay vì mốc ngày thật, càng khó hiểu). Đổi hẳn sang: (1) 1 khối cảnh
  // báo màu đỏ nói THẲNG bằng câu, không phải số suông — "còn X ngày... sau đó TỰ ĐỘNG tăng lên Yđ";
  // (2) 1 hàng 3 Ô hiển thị ĐỦ cả 3 mốc giá cùng lúc, mốc ĐANG áp dụng tô đậm màu accent, 2 mốc còn
  // lại làm mờ — nhìn là hiểu ngay "mình đang ở bước nào trên đường giá tăng dần" không cần đọc chữ.
  const currentStep = price === TC_PRICE_TIER_1 ? 0 : 1;
  const STEPS = [
    { price: TC_PRICE_TIER_1, label:'0–15 ngày đầu' },
    { price: TC_PRICE_TIER_2, label:'Ngày 15–30' },
    { price: TC_PRICE_TIER_3, label:'Sau 30 ngày' },
  ];
  const stepsHtml = STEPS.map((s,i)=>{
    const active = i === currentStep;
    return `
      <div style="flex:1;text-align:center;padding:7px 4px;border-radius:8px;${active ? 'background:var(--accent-soft);border:1.5px solid var(--accent);' : 'border:1.5px dashed var(--line);opacity:.55;'}">
        <div style="font-family:'IBM Plex Mono',monospace;font-weight:700;font-size:${active?'13px':'11.5px'};color:${active?'var(--accent)':'var(--ink-soft)'};">${s.price.toLocaleString('vi-VN')}đ</div>
        <div style="font-size:10px;color:var(--ink-soft);margin-top:2px;">${s.label}</div>
      </div>
    `;
  }).join(`<div style="display:flex;align-items:center;color:var(--ink-soft);font-size:12px;padding:0 1px;">→</div>`);
  return `
    <div style="text-align:center;font-size:20px;color:var(--ink-soft);text-decoration:line-through;line-height:1.3;">${TC_PRICE_TIER_3.toLocaleString('vi-VN')}đ</div>
    <div style="text-align:center;font-size:17px;font-weight:800;color:var(--accent);line-height:1.3;margin-top:2px;">Chỉ ${price.toLocaleString('vi-VN')}đ</div>
    <div style="text-align:center;font-size:12px;font-weight:700;color:var(--gold);margin-top:8px;line-height:1.5;">🎁 Tiết kiệm ${savings.toLocaleString('vi-VN')}đ nếu bắt đầu ngay</div>
    <div style="background:#FBEAE5;border:1px solid var(--danger);border-radius:8px;padding:9px 12px;margin-top:10px;text-align:center;font-size:12.5px;font-weight:700;color:var(--danger);line-height:1.5;">⏰ Còn ${tierDaysLeft} ngày ở mức giá này — hết hạn TỰ ĐỘNG tăng lên ${nextPrice.toLocaleString('vi-VN')}đ, không cần chờ ai bấm nút</div>
    <div style="display:flex;align-items:stretch;gap:0;margin-top:12px;">${stepsHtml}</div>
  `;
}
// Cùng 1 tài khoản ngân hàng thật với nhan-hieu (chị Quỳnh chỉ có 1 tài khoản) — VietQR/ref_code
// dùng chung cơ chế "SEVQR <ref_code>" nhưng số tiền là DUY NHẤT, không trùng bất kỳ gói nào của
// nhan-hieu (xem AMOUNT_TO_DAYS ở api/sepay-webhook.js) nên webhook phân biệt được đúng sản phẩm
// nào đang được thanh toán chỉ qua số tiền, không cần đổi định dạng ref_code.
const PAYMENT_BANK = { code:'vietinbank', account:'199339288888', accountName:'LE TU QUYNH' };

// Public key VAPID cho Web Push — DÙNG CHUNG đúng 1 cặp key cho cả hệ sinh thái (copy verbatim từ
// nhan-hieu/js/app-shell.js, đổi key này thì phải đổi VAPID_PRIVATE_KEY tương ứng ở Vercel env, xem
// api/_lib/push.js). tai-khoan.js dùng key này lúc bật "Nhắc ghi chép".
const VAPID_PUBLIC_KEY = 'BNTlCve7JFY6nki3SBjlPAQVsmOD68oTIvSDMP1VkNe-jWtCPQuPUY4xz2SisvwpU3IWo_ciiGTMxoLJq42QzkE';

const AppState = { user:null, profile:null, route:'trang-chu', authMode:'login', latestAnnouncement:null, tcReviewPromptEligible:false };

function sidebarFootHtml(){
  const p = AppState.profile;
  const name = (p && p.full_name && p.full_name.trim()) || 'Chưa đặt tên';
  const initial = name.charAt(0).toUpperCase();
  const avatarHtml = (p && p.avatar_url)
    ? `<img src="${p.avatar_url}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;flex-shrink:0;">`
    : `<div style="width:32px;height:32px;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0;">${esc(initial)}</div>`;
  return `
    <div style="display:flex;align-items:center;gap:8px;">
      ${avatarHtml}
      <div style="min-width:0;font-weight:600;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(name)}</div>
    </div>
  `;
}

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
    // loadProfile() TRƯỚC, riêng — loadTcReviewPromptEligibility() cần profile.tc_trial_started_at/
    // tc_review_prompt_dismissed đã tải xong, chạy song song với loadLatestAnnouncement() có thể đọc
    // trúng profile rỗng lúc mới vào (cùng lý do nhan-hieu/js/app-shell.js làm tuần tự).
    await loadProfile();
    await Promise.all([loadLatestAnnouncement(), loadTcReviewPromptEligibility()]);
  }
  // Chưa đăng nhập: KHÔNG còn màn hình đăng nhập chặn hết mọi thứ nữa — renderApp() tự biết render
  // khung khách (renderGuestShell()) cho đúng route công khai, xem GUEST_ALLOWED_ROUTES ở trên.
  AppState.route = currentRouteFromHash();
  renderApp();

  // Cảnh báo trình duyệt trong app (Facebook/Instagram/Zalo...) NGAY LẦN ĐẦU VÀO, kể cả CHƯA đăng
  // nhập — đây chính là lúc khách bấm link chia sẻ từ Facebook/Zalo vào làm bài Chấm Điểm Nghiệp
  // Tiền (route công khai, xem GUEST_ALLOWED_ROUTES), rồi thoát ra là mất hẳn kết quả vì trình duyệt
  // trong app không cài được PWA/không nhận thông báo (2026-09-01, chị Quỳnh phản ánh). Gọi ĐỘC LẬP
  // với maybeShowInstallPrompt() (cái đó chỉ chạy sau tour, chỉ cho user đã đăng nhập).
  if(window.maybeShowInAppBrowserBanner) window.maybeShowInAppBrowserBanner();

  // Kiểm tra định kỳ thông báo tính năng mới — để người ĐANG MỞ SẴN app (không tải lại trang) cũng
  // thấy popup mà không cần tắt/mở lại app (giống cơ chế bên nhan-hieu/js/app-shell.js).
  setInterval(async ()=>{
    if(!AppState.user) return;
    await loadLatestAnnouncement();
    maybeShowFeatureAnnouncement();
  }, 3 * 60 * 1000);

  supabaseClient.auth.onAuthStateChange((event, session) => {
    if(event === 'SIGNED_IN' && session){
      // Supabase cũng bắn lại "SIGNED_IN" khi refresh token nền hoặc khi tab được focus lại — chỉ
      // render lại toàn bộ khi đây thực sự là 1 phiên đăng nhập MỚI (user id khác), không phải mỗi
      // lần bắn sự kiện, tránh xoá mất state tạm đang gõ dở ở module hiện tại.
      if(AppState.user && AppState.user.id === session.user.id) return;
      AppState.user = session.user;
      // Vừa đăng ký/đăng nhập ngay SAU KHI làm bài Chấm Điểm Nghiệp Tiền lúc còn là khách (câu trả
      // lời còn nằm trong TC_GUEST_QUIZ_KEY, xem util.js) — giữ nguyên route ở đúng trang đó để
      // thiet-lap-nhanh.js tự phát hiện + lưu thật kết quả, KHÔNG nhảy về Trang chủ như bình thường
      // (mất ngữ cảnh, người dùng lại tưởng phải làm lại từ đầu).
      let hasGuestQuiz = false;
      try{ hasGuestQuiz = !!localStorage.getItem(TC_GUEST_QUIZ_KEY); }catch(e){}
      if(!hasGuestQuiz) AppState.route = 'trang-chu';
      loadProfile().then(()=>Promise.all([loadLatestAnnouncement(), loadTcReviewPromptEligibility()])).then(()=>{
        if(hasGuestQuiz) AppState.route = 'thiet-lap-nhanh';
        location.hash = AppState.route;
        renderApp();
      });
    } else if(event === 'SIGNED_OUT'){
      AppState.user = null;
      AppState.profile = null;
      AppState.route = 'trang-chu';
      location.hash = '';
      renderApp();
    }
  });

  window.addEventListener('hashchange', () => {
    AppState.route = currentRouteFromHash();
    renderApp();
  });
}

async function loadProfile(){
  if(!AppState.user) return;
  const { data } = await supabaseClient.from('profiles').select('*').eq('id', AppState.user.id).maybeSingle();
  AppState.profile = data || null;
  // Set mốc dùng thử 14 ngày ở LẦN ĐẦU vào app tai-chinh — RPC tự bỏ qua nếu đã set rồi (idempotent),
  // không reset lại đồng hồ đếm ngược mỗi lần load profile.
  if(AppState.profile && !AppState.profile.tc_trial_started_at){
    await supabaseClient.rpc('start_tc_trial');
    const { data: refreshed } = await supabaseClient.from('profiles').select('*').eq('id', AppState.user.id).maybeSingle();
    if(refreshed) AppState.profile = refreshed;
  }
}

// Popup xin đánh giá — 2026-08-26, "từ giờ làm app nào cũng có phần review, auto" (mirror
// maybeShowReviewPrompt() ở nhan-hieu/js/app-shell.js, KHÔNG có phần thưởng lượt AI vì app này
// không có hệ lượt). Đủ điều kiện khi: đã dùng đủ 14 ngày (tc_trial_started_at) HOẶC đã hoàn thành
// Tổng Kết Tuần ít nhất 1 lần (đúng như đề xuất ban đầu: "sau 14 ngày hoặc sau khi hoàn thành Tổng
// Kết Tuần lần đầu") — và profile.tc_review_prompt_dismissed chưa true (chưa từng bấm "Để sau"
// hoặc đã gửi đánh giá rồi, xem api/submit-review.js).
const TC_REVIEW_PROMPT_MIN_DAYS = 14;
async function loadTcReviewPromptEligibility(){
  if(!AppState.user || !AppState.profile) { AppState.tcReviewPromptEligible = false; return; }
  const daysSinceSignup = AppState.profile.tc_trial_started_at
    ? (Date.now() - new Date(AppState.profile.tc_trial_started_at).getTime()) / 86400000 : 0;
  let qualifies = daysSinceSignup >= TC_REVIEW_PROMPT_MIN_DAYS;
  if(!qualifies){
    const { count } = await supabaseClient.from('tc_weekly_reflections').select('user_id', { count:'exact', head:true }).eq('user_id', AppState.user.id);
    qualifies = (count || 0) >= 1;
  }
  AppState.tcReviewPromptEligible = qualifies && !AppState.profile.tc_review_prompt_dismissed;
}

function maybeShowTcReviewPrompt(){
  if(!AppState.tcReviewPromptEligible) return;
  if(document.getElementById('onboarding-tour-overlay') || document.getElementById('tc-review-prompt-overlay')) return;
  AppState.tcReviewPromptEligible = false; // hỏi đúng 1 lần/phiên tải trang

  const overlay = document.createElement('div');
  overlay.id = 'tc-review-prompt-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(20,24,20,.78);display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `
    <div style="max-width:420px;width:100%;background:#fff;border-radius:14px;padding:26px 24px;box-shadow:0 12px 36px rgba(0,0,0,.3);">
      <div style="font-family:'Playfair Display',serif;font-size:19px;color:#1E2420;margin-bottom:8px;">Khoe trải nghiệm của bạn với Sổ Dòng Tiền Tâm Thức 🌱</div>
      <div style="font-size:13.5px;line-height:1.6;color:#5B5F55;margin-bottom:14px;">Kể thoải mái điều bạn thấy thay đổi rõ nhất — dòng tiền bớt hoảng loạn hơn, thấy rõ tiền đi đâu, hay đơn giản là thói quen ghi chép đều hơn trước. Cảm nhận thật của bạn sẽ giúp rất nhiều người khác quyết định bắt đầu.</div>
      <textarea id="tcrp-comment" placeholder="Ví dụ: Trước đây mình không biết tiền đi đâu hết, giờ nhìn Tổng Kết Tháng là biết ngay..." style="width:100%;min-height:100px;padding:10px 12px;border:1px solid var(--line,#E4DFCF);border-radius:8px;font-family:inherit;font-size:14px;resize:vertical;"></textarea>
      <div id="tcrp-error" style="display:none;color:var(--danger,#A6462E);font-size:12.5px;margin-top:8px;"></div>
      <div style="display:flex;gap:10px;justify-content:flex-end;align-items:center;margin-top:16px;">
        <span id="tcrp-skip" style="font-size:13px;color:#5B5F55;cursor:pointer;">Để sau</span>
        <button id="tcrp-submit" style="background:var(--accent, #2F6F62);color:#fff;border:none;border-radius:8px;padding:10px 18px;font-size:13.5px;font-weight:600;cursor:pointer;">Gửi đánh giá</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  function close(){ overlay.remove(); }
  overlay.querySelector('#tcrp-skip').onclick = async ()=>{
    close();
    if(AppState.profile) AppState.profile.tc_review_prompt_dismissed = true;
    try{ await supabaseClient.rpc('mark_tc_review_prompt_dismissed'); } catch(e){}
  };
  overlay.querySelector('#tcrp-submit').onclick = async ()=>{
    const textarea = overlay.querySelector('#tcrp-comment');
    const errorEl = overlay.querySelector('#tcrp-error');
    const comment = textarea.value.trim();
    if(!comment){ errorEl.textContent = 'Chưa nhập cảm nhận.'; errorEl.style.display = 'block'; return; }
    const btn = overlay.querySelector('#tcrp-submit');
    btn.disabled = true; btn.textContent = 'Đang gửi…';
    try{
      await callApi('/api/submit-review', { comment, app:'tai-chinh' });
      if(AppState.profile) AppState.profile.tc_review_prompt_dismissed = true;
      close();
    } catch(e){
      errorEl.textContent = e.message; errorEl.style.display = 'block';
      btn.disabled = false; btn.textContent = 'Gửi đánh giá';
    }
  };
}

function tcTrialDaysLeft(){
  const p = AppState.profile;
  if(!p || !p.tc_trial_started_at) return TC_TRIAL_DAYS;
  const elapsedDays = (Date.now() - new Date(p.tc_trial_started_at).getTime()) / 86400000;
  return Math.max(0, Math.ceil(TC_TRIAL_DAYS - elapsedDays));
}
function hasActiveAccess(){
  const p = AppState.profile;
  if(p && p.role === 'admin') return true;
  if(p && p.tc_has_paid) return true;
  return tcTrialDaysLeft() > 0;
}

// Thông báo tính năng mới — chỉ lấy 1 dòng MỚI NHẤT, so với profiles.tc_last_seen_announcement_id
// để quyết định có hiện banner hay không (áp dụng quy tắc bên nhan-hieu/js/app-shell.js, bảng riêng
// tc_feature_announcements + cột riêng tc_last_seen_announcement_id — xem schema_full.sql).
async function loadLatestAnnouncement(){
  if(!AppState.user) return;
  const { data } = await supabaseClient.from('tc_feature_announcements').select('*').order('created_at', { ascending:false }).limit(1).maybeSingle();
  AppState.latestAnnouncement = data || null;
}
function maybeShowFeatureAnnouncement(){
  const ann = AppState.latestAnnouncement;
  const annUnseen = ann && (!AppState.profile || AppState.profile.tc_last_seen_announcement_id !== ann.id);
  if(window.startFeatureAnnouncement && annUnseen){
    window.startFeatureAnnouncement(ann, async ()=>{
      if(AppState.profile) AppState.profile.tc_last_seen_announcement_id = ann.id;
      // RPC, không .update() thẳng — RLS đã khoá user tự update profiles (xem schema_full.sql).
      await supabaseClient.rpc('mark_tc_announcement_seen', { ann_id: ann.id });
    });
  }
}

let authFields = { name:'', email:'', pass:'', passConfirm:'' };

// Khung cho khách chưa đăng nhập (2026-08-26) — thay hẳn cho renderAuthScreen() cũ (màn đăng nhập
// chặn hết mọi thứ). Chỉ có logo/tên app + nút "Đăng nhập / Đăng ký" góc phải (mở modal, xem
// renderTcAuthModal() bên dưới) — nội dung chính render qua ĐÚNG module đang route tới (trang-chu
// hoặc thiet-lap-nhanh, xem GUEST_ALLOWED_ROUTES), y hệt cách render module cho người đã đăng nhập,
// chỉ khác ctx.user/ctx.profile đều null.
function renderGuestShell(){
  const root = document.getElementById('app');
  root.innerHTML = `
    <div class="guest-shell">
      <header class="guest-header">
        <div class="guest-brand" id="guest-brand-home">
          <img src="assets/logo-hieu-hanh.png" alt="" onerror="this.style.display='none'">
          <span>SỔ DÒNG TIỀN TÂM THỨC</span>
        </div>
        <button class="btn btn-sm" id="guest-login-btn">Đăng nhập / Đăng ký</button>
      </header>
      <div class="guest-content" id="guest-content"></div>
    </div>
  `;
  root.querySelector('#guest-brand-home').onclick = ()=>{ location.hash = 'trang-chu'; };
  root.querySelector('#guest-login-btn').onclick = ()=>{ AppState.authMode = 'login'; renderTcAuthModal(); };
  const content = root.querySelector('#guest-content');
  const mod = window.Modules && window.Modules[AppState.route];
  if(mod && mod.render) mod.render(content, { supabase: supabaseClient, user: null, profile: null });
}

// Popup đăng nhập/đăng ký (2026-08-26, góp ý Quỳnh: "làm xong bài mà muốn lưu thì mới hiện popup
// đăng ký") — dùng CHUNG cho cả nút góc phải (renderGuestShell) lẫn nút "Lưu kết quả" của khách ở
// Chấm Điểm Nghiệp Tiền (window.startTcAuthModal, gọi từ thiet-lap-nhanh.js). Đăng nhập/đăng ký
// thành công thì onAuthStateChange (ở initApp()) tự lo phần còn lại — kể cả tự lưu lại bài vừa làm
// nếu có (xem TC_GUEST_QUIZ_KEY) — modal này chỉ cần đóng lại khi xong.
window.startTcAuthModal = function(mode){ AppState.authMode = mode || 'login'; renderTcAuthModal(); };
function renderTcAuthModal(err, successMsg){
  const existing = document.getElementById('tc-auth-modal');
  if(existing) existing.remove();
  const isLogin = AppState.authMode === 'login';
  const overlay = document.createElement('div');
  overlay.id = 'tc-auth-modal';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(20,24,20,.7);display:flex;align-items:center;justify-content:center;padding:20px;overflow-y:auto;';
  overlay.innerHTML = `
    <div class="auth-shell" style="max-width:380px;padding:28px 24px;margin:auto;background:#fff;border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.4);position:relative;">
      <span id="am-close" style="position:absolute;top:14px;right:16px;cursor:pointer;font-size:20px;color:var(--ink-soft);line-height:1;">&times;</span>
      <h1 style="font-size:20px;">${isLogin?'Đăng nhập':'Tạo tài khoản miễn phí'}</h1>
      <div class="sub" style="margin-bottom:14px;">${isLogin?'Đăng nhập để lưu lại kết quả và dùng đầy đủ.':'30 giây, không cần thẻ — lưu lại kết quả vừa làm.'}</div>
      <div class="auth-tabs">
        <div class="auth-tab ${isLogin?'active':''}" data-mode="login">Đăng nhập</div>
        <div class="auth-tab ${!isLogin?'active':''}" data-mode="signup">Đăng ký</div>
      </div>
      ${!isLogin ? `<label>Họ tên</label><input id="am-name" type="text" placeholder="Tên của bạn" value="${esc(authFields.name)}">` : ''}
      <label>Email</label>
      <input id="am-email" type="email" placeholder="ban@email.com" value="${esc(authFields.email)}">
      <label>Mật khẩu</label>
      <input id="am-pass" type="password" placeholder="Ít nhất 6 ký tự" value="${esc(authFields.pass)}">
      ${!isLogin ? `<label>Xác nhận mật khẩu</label><input id="am-pass-confirm" type="password" placeholder="Nhập lại mật khẩu" value="${esc(authFields.passConfirm)}">` : ''}
      <button class="btn btn-full" id="am-submit" style="margin-top:16px;">${isLogin?'Đăng nhập':'Tạo tài khoản'}</button>
      ${err ? `<div class="error-box" style="margin-top:10px;">${esc(err)}</div>` : ''}
      ${successMsg ? `<div class="hint-box" style="margin-top:10px;">${esc(successMsg)}</div>` : ''}
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('#am-close').onclick = ()=>overlay.remove();
  overlay.onclick = (e)=>{ if(e.target===overlay) overlay.remove(); };
  overlay.querySelectorAll('.auth-tab').forEach(el=>{
    el.onclick = ()=>{ AppState.authMode = el.getAttribute('data-mode'); renderTcAuthModal(); };
  });

  const nameEl = overlay.querySelector('#am-name'); if(nameEl) nameEl.oninput = ()=>{ authFields.name = nameEl.value; };
  overlay.querySelector('#am-email').oninput = (e)=>{ authFields.email = e.target.value; };
  overlay.querySelector('#am-pass').oninput = (e)=>{ authFields.pass = e.target.value; };
  const confirmEl = overlay.querySelector('#am-pass-confirm'); if(confirmEl) confirmEl.oninput = ()=>{ authFields.passConfirm = confirmEl.value; };

  overlay.querySelector('#am-submit').onclick = async ()=>{
    const email = overlay.querySelector('#am-email').value.trim();
    const pass = overlay.querySelector('#am-pass').value;
    const btn = overlay.querySelector('#am-submit');
    try{
      if(isLogin){
        btn.disabled = true; btn.textContent = 'Đang xử lý…';
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password: pass });
        if(error) throw error;
        overlay.remove();
        // onAuthStateChange lo phần còn lại (kể cả tự lưu bài vừa làm nếu có).
      } else {
        const confirmPass = overlay.querySelector('#am-pass-confirm').value;
        if(!email){ renderTcAuthModal('Vui lòng nhập email.'); return; }
        if(pass !== confirmPass){ renderTcAuthModal('Mật khẩu xác nhận không khớp — kiểm tra lại.'); return; }
        btn.disabled = true; btn.textContent = 'Đang xử lý…';
        const full_name = overlay.querySelector('#am-name').value.trim();
        let referredByRefCode = null;
        try { referredByRefCode = localStorage.getItem(TC_REF_STORAGE_KEY) || null; } catch(e){}
        const { data, error } = await supabaseClient.auth.signUp({ email, password: pass, options:{ data:{ full_name, referred_by_ref_code: referredByRefCode } } });
        if(error) throw error;
        try { localStorage.removeItem(TC_REF_STORAGE_KEY); } catch(e){}
        if(!data.session){
          AppState.authMode = 'login';
          authFields = { name:'', email:'', pass:'', passConfirm:'' };
          renderTcAuthModal(null, 'Đăng ký thành công! Kiểm tra email để xác nhận rồi quay lại đăng nhập — kết quả vừa làm sẽ tự lưu (dùng đúng trình duyệt này).');
        } else {
          overlay.remove();
        }
        // Nếu có session ngay (không bật xác nhận email), onAuthStateChange sẽ tự đưa vào app.
      }
    } catch(e){
      renderTcAuthModal(e.message);
    }
  };
}

function renderApp(){
  if(!AppState.user){
    if(!GUEST_ALLOWED_ROUTES.has(AppState.route)) AppState.route = 'trang-chu';
    renderGuestShell();
    return;
  }
  const root = document.getElementById('app');
  root.innerHTML = `
    <div class="topbar-mobile">
      <span class="menu-toggle" id="menu-toggle-btn">☰</span>
      <span class="topbar-title">SỔ DÒNG TIỀN TÂM THỨC</span>
    </div>
    <div class="app-layout">
      <div class="sidebar-overlay" id="sidebar-overlay"></div>
      <div class="sidebar" id="sidebar">
        <div class="sidebar-brand" id="sidebar-brand-home" style="cursor:pointer;">
          <img src="assets/logo-hieu-hanh.png" class="brand-logo" alt="" onerror="this.style.display='none'">
          <div class="brand-text">SỔ DÒNG TIỀN<br>TÂM THỨC<small>Hệ sinh thái HIỂU<br>HIỂU HẠNH</small></div>
        </div>
        <div class="sidebar-nav" id="sidebar-nav"></div>
        <div class="sidebar-foot">
          <div id="sidebar-foot-info" style="cursor:pointer;margin-bottom:6px;" title="Bấm để vào Tài khoản">${sidebarFootHtml()}</div>
          <span class="signout" id="signout-btn">Đăng xuất</span>
        </div>
      </div>
      <div class="main"><div class="main-inner" id="main-content"></div></div>
    </div>
  `;

  const isAdmin = AppState.profile && AppState.profile.role === 'admin';
  const canAccess = hasActiveAccess();
  const visibleNav = NAV.filter(n=> !n.hidden && (!n.adminOnly || isAdmin));
  const nav = root.querySelector('#sidebar-nav');
  nav.innerHTML = visibleNav.map((n,i)=>{
    const locked = n.premium && !canAccess;
    return `
    <div class="sidebar-item ${AppState.route===n.key?'active':''}" data-key="${n.key}">
      <span class="num">${i+1}</span><span>${esc(n.title)}</span>${locked?' <span title="Cần nâng cấp">🔒</span>':''}
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
      closeDrawer();
    };
  });

  root.querySelector('#signout-btn').onclick = async ()=>{ await supabaseClient.auth.signOut(); };
  const footInfo = root.querySelector('#sidebar-foot-info');
  if(footInfo) footInfo.onclick = ()=>{ location.hash = 'tai-khoan'; };

  if(window.startOnboardingTour && AppState.user){
    const alreadySeen = !!(AppState.profile && AppState.profile.tc_onboarding_seen);
    window.startOnboardingTour(AppState.user.id, alreadySeen, async ()=>{
      const { error } = await supabaseClient.rpc('mark_tc_onboarding_seen');
      if(!error && AppState.profile) AppState.profile.tc_onboarding_seen = true;
      // Hỏi cài app NGAY SAU KHI tour kết thúc — đúng lúc hợp lý để rủ cài thay vì hỏi giữa chừng
      // (giống nhan-hieu/js/app-shell.js) — thay cho setTimeout tạm trước đây.
      if(window.maybeShowInstallPrompt) window.maybeShowInstallPrompt();
    });
  }

  maybeShowFeatureAnnouncement();
  maybeShowTcReviewPrompt();

  const content = root.querySelector('#main-content');
  const mod = window.Modules && window.Modules[AppState.route];
  if(mod && mod.render){
    mod.render(content, { supabase: supabaseClient, user: AppState.user, profile: AppState.profile });
  } else {
    content.innerHTML = `<div class="card">Module đang được xây dựng.</div>`;
  }
  // Route premium khi chưa mở khoá: vẫn RENDER thật trang đó (để thấy trước có gì trong đây, không
  // bị hỏi mua "mù" — góp ý Quỳnh 2026-08-26: "phải cho ngta thấy preview chứ") rồi che 1 lớp mờ +
  // popup khoá đè lên trên (chặn hết click xuống nội dung thật phía dưới bằng pointer-events, không
  // cho sửa/lưu dữ liệu premium khi chưa trả phí) — KHÁC hẳn trước đây (render thẳng renderUpgradeScreen
  // thay hoàn toàn nội dung, không cho thấy trang thật là gì trước khi mua).
  if(PREMIUM_ROUTES.has(AppState.route) && !canAccess) renderLockOverlay(content);
  else removeLockOverlay();
}

// 3 khối lợi ích CỤ THỂ — góp ý Quỳnh 2026-08-24: "để ngay STK, người ta bị sợ không? người ta
// chưa biết tính năng app". Đưa thẻ QR/chuyển khoản đi thẳng vào mặt người chưa hiểu gì về app dễ
// giống lừa đảo/quá vội — đặt khối lợi ích này NGAY TRƯỚC tcPaymentCardHtml() (cùng 1 trang, không
// tách riêng landing page — thêm 1 bước bấm chỉ làm rơi mất người ĐÃ sẵn sàng trả tiền) để lập lòng
// tin bằng giá trị thật trước khi hỏi tiền. Đúng 3 gạch đầu dòng Quỳnh chốt: thanh khoản nợ/gia
// tăng tài sản/kiểm soát tài chính — nói bằng KẾT QUẢ cụ thể, không phải tên module (module tên ẩn
// dụ tâm thức, người mới chưa hiểu "Hạt Giống Phước - Nghiệp" nghĩa là gì).
function tcBenefitsHtml(){
  const BENEFITS = {
    debt: { icon:'💳', title:'Thanh khoản nợ nhanh hơn, đỡ tốn lãi', text:'Quản Lý Nợ tự tính chiến lược Đà Thắng Nhỏ/Diệt Lãi Cao — biết chính xác nên dồn tiền trả khoản nào trước để tiết kiệm tiền lãi nhiều nhất, không phải đoán mò.' },
    asset: { icon:'📈', title:'Tài sản ròng tăng đều, nhìn thấy rõ từng tháng', text:'Tổng Kết Tháng tự vẽ biểu đồ Tài Sản Ròng qua từng tháng — biết ngay đang giàu lên hay đang lùi, không phải chỉ cảm giác chung chung.' },
    control: { icon:'🎯', title:'Kiểm soát dòng tiền, không chỉ ghi cho có', text:'Mục Tiêu & Cam Kết đặt hạn mức từng danh mục TRƯỚC khi tiêu, Tổng Kết Tuần báo ngay lệch mục tiêu ở đâu — còn Hạt Giống Phước - Nghiệp giúp gỡ tận gốc niềm tin cũ khiến tiền cứ lặp lại đúng 1 vấn đề.' },
  };
  // Xếp lại thứ tự theo ĐÚNG số liệu vừa nhập ở Chấm Điểm Nghiệp Tiền (window.TcLastHasDebt, xem
  // thiet-lap-nhanh.js submit()) — góp ý Quỳnh 2026-08-24: "có [cá nhân hoá], và cần giải thích tại
  // sao". CÓ nợ thật thì thanh khoản nợ lên đầu (đúng nỗi đau cấp bách nhất); KHÔNG nợ thì đẩy xuống
  // cuối, ưu tiên kiểm soát dòng tiền/tài sản trước — kèm 1 dòng giải thích rõ vì sao xếp vậy, để
  // không có cảm giác ngẫu nhiên. window.TcLastHasDebt undefined (chưa làm bài trong session này) =
  // giữ thứ tự mặc định, không hiện dòng giải thích.
  const hasDebt = window.TcLastHasDebt;
  let order, reasonNote;
  if(hasDebt === true){
    order = ['debt','asset','control'];
    reasonNote = 'Dựa trên số liệu bạn vừa nhập ở Chấm Điểm Nghiệp Tiền — bạn đang có khoản nợ, nên đây là điều nên ưu tiên trước.';
  } else if(hasDebt === false){
    order = ['control','asset','debt'];
    reasonNote = 'Dựa trên số liệu bạn vừa nhập ở Chấm Điểm Nghiệp Tiền — bạn hiện không có nợ, nên phần này phù hợp hơn với bạn ngay bây giờ.';
  } else {
    order = ['debt','asset','control'];
    reasonNote = null;
  }
  return `
    ${reasonNote ? `<div class="hint-box" style="margin-bottom:14px;">📌 ${esc(reasonNote)}</div>` : ''}
    <div style="margin-bottom:16px;">
      ${order.map(key=>BENEFITS[key]).map(b=>`
        <div style="display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--line);">
          <span style="font-size:20px;flex-shrink:0;">${b.icon}</span>
          <div>
            <div style="font-weight:700;font-size:14px;margin-bottom:3px;">${esc(b.title)}</div>
            <div style="font-size:13px;color:var(--ink-soft);line-height:1.55;">${esc(b.text)}</div>
          </div>
        </div>
      `).join('')}
    </div>
    <div class="hint-box" style="margin-bottom:20px;background:var(--accent-soft);">🔁 <b>Cam kết hoàn tiền 100%</b> trong 7 ngày đầu nếu bạn dùng thấy không hợp — không cần lý do, chỉ cần nhắn email đăng ký.</div>
  `;
}

// Tách riêng thẻ QR/thông tin chuyển khoản để dùng lại được ở CẢ màn khoá tự động (renderUpgradeScreen,
// hiện khi bấm vào route premium mà chưa có quyền) LẪN trang "Nâng Cấp" chủ động (module nang-cap.js,
// vào được bất cứ lúc nào kể cả đang còn hạn dùng thử) — giống pattern paymentCardHtml() bên
// nhan-hieu/js/app-shell.js, chỉ đơn giản hơn vì tai-chinh chỉ có ĐÚNG 1 gói (không cần chọn gói).
function tcPaymentCardHtml(){
  const p = AppState.profile;
  const refCode = p && p.ref_code;
  const price = tcCurrentPrice(p);
  // VietinBank CHỈ báo biến động số dư về SePay nếu nội dung chuyển khoản bắt đầu bằng "SEVQR"
  // (yêu cầu riêng SePay cho VietinBank) — xem api/sepay-webhook.js.
  const transferContent = refCode ? `SEVQR ${refCode}` : null;
  const qrUrl = refCode
    ? `https://img.vietqr.io/image/${PAYMENT_BANK.code}-${PAYMENT_BANK.account}-compact2.png?amount=${price}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(PAYMENT_BANK.accountName)}`
    : null;

  return `
    ${tcPriceAnchorHtml(p)}
    <div style="text-align:center;font-size:12.5px;color:var(--ink-soft);margin-top:6px;margin-bottom:14px;">1 lần duy nhất — chưa tới ${Math.ceil(price/365/100)*100}đ/ngày nếu dùng đều trong năm đầu tiên</div>
    ${qrUrl ? `
      <div style="text-align:center;">
        <img src="${qrUrl}" alt="Mã VietQR" style="max-width:260px;width:100%;border-radius:12px;border:1px solid var(--line);">
        <div style="margin-top:8px;">
          <a href="${qrUrl}" download="vietqr-tai-chinh.png" target="_blank" rel="noopener" style="font-size:12.5px;color:var(--accent);font-weight:600;text-decoration:none;">📥 Tải ảnh mã QR về máy</a>
        </div>
      </div>
      <div style="margin-top:14px;font-size:13.5px;line-height:1.7;">
        <div><b>Ngân hàng:</b> Vietinbank</div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;"><b>Số tài khoản:</b> ${esc(PAYMENT_BANK.account)} <span class="btn-ghost btn btn-sm" style="padding:3px 10px;font-size:11.5px;" data-copy-value="${esc(PAYMENT_BANK.account)}">Copy</span></div>
        <div><b>Chủ tài khoản:</b> ${esc(PAYMENT_BANK.accountName)}</div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;"><b>Số tiền:</b> ${price.toLocaleString('vi-VN')}đ <span class="btn-ghost btn btn-sm" style="padding:3px 10px;font-size:11.5px;" data-copy-value="${price}">Copy</span></div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;"><b>Nội dung CK (bắt buộc giữ nguyên):</b> <span style="font-family:'IBM Plex Mono',monospace;background:var(--accent-soft);padding:2px 8px;border-radius:6px;">${esc(transferContent)}</span> <span class="btn-ghost btn btn-sm" style="padding:3px 10px;font-size:11.5px;" data-copy-value="${esc(transferContent)}">Copy</span></div>
      </div>
      <div class="hint-box" style="margin-top:14px;">Quét mã hoặc chuyển khoản đúng số tiền + giữ nguyên nội dung <b>${esc(transferContent)}</b> (bắt buộc có chữ SEVQR ở đầu) — hệ thống tự đối chiếu và mở khoá, không cần chờ ai xác nhận. Chuyển xong đợi 1-2 phút rồi bấm nút bên dưới.</div>
    ` : `
      <div class="error-box">Chưa có mã tài khoản để đối chiếu tự động. Nhắn email đăng ký (${esc((AppState.user&&AppState.user.email)||'')}) để được kích hoạt thủ công.</div>
    `}
    <div class="btn-row" style="margin-top:16px;justify-content:center;">
      <button class="btn-ghost btn" id="tc-reload-status-btn">Tôi đã chuyển khoản — tải lại trạng thái</button>
    </div>
  `;
}
function bindTcPaymentCard(root, onReload){
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
  const reloadBtn = root.querySelector('#tc-reload-status-btn');
  if(reloadBtn) reloadBtn.onclick = async ()=>{ await loadProfile(); onReload(); };
}

// Khác nhan-hieu (renderExpiredScreen chiếm TOÀN màn hình, không cho dùng gì nữa) — ở đây CHỈ đúng
// route premium bị khoá mới hiện màn này, sidebar/Ghi Chép/Kiến Thức vẫn dùng bình thường. Vẽ vào
// #main-content như 1 module bình thường, không thay root.innerHTML.
function renderUpgradeScreen(content){
  // Cá nhân hoá bằng khâu yếu nhất vừa đo được ở Chấm Điểm Nghiệp Tiền (window.TcLastWeakestArea,
  // xem thiet-lap-nhanh.js) — CHỈ tồn tại tạm trong session, không lưu DB (đúng nguyên tắc "Điểm
  // Nghiệp Tiền không lưu lại"). Đúng lúc động lực cao nhất (vừa thấy mình yếu ở đâu) thì gặp ngay
  // lời mời nâng cấp nhắm đúng vào đó, thay vì 1 câu chung chung không liên quan gì tới họ.
  const weakest = window.TcLastWeakestArea;
  content.innerHTML = `
    <div class="page-head">
      <h1>🔒 Tính năng trả phí</h1>
      ${weakest ? `<p>Bạn vừa làm Chấm Điểm Nghiệp Tiền và đang yếu nhất ở khâu <b>${esc(weakest.label)}</b> — ${esc(weakest.explain)}</p>` : ''}
      <p>Mở khoá TRỌN ĐỜI chỉ 1 lần, dùng mãi mãi — không phải trả lại theo tháng.</p>
    </div>
    <div class="card" style="max-width:460px;">
      ${tcBenefitsHtml()}
      ${tcPaymentCardHtml()}
    </div>
  `;
  bindTcPaymentCard(content, renderApp);
}

// Lớp mờ + popup khoá đè lên trang premium THẬT (xem renderApp() — render module thật vào content
// TRƯỚC, gọi hàm này SAU) — góp ý Quỳnh 2026-08-26: "phải cho ngta thấy preview chứ" thay vì nhảy
// thẳng vào renderUpgradeScreen thay hết nội dung. Gắn vào document.body (KHÔNG phải con của
// content) vì nhiều module tự vẽ lại content.innerHTML sau khi load xong dữ liệu (async) — nếu overlay
// là con của content sẽ bị xoá mất theo lần vẽ lại đó, dù người dùng chưa hề bấm gì. fixed theo đúng
// vùng bên phải sidebar (trừ mobile — sidebar là ngăn kéo ẩn, không chiếm chỗ) để không che luôn cả
// sidebar, và pointer-events phủ kín để chặn hẳn việc sửa/lưu dữ liệu premium phía dưới khi chưa mở khoá.
function removeLockOverlay(){
  const el = document.getElementById('tc-lock-overlay');
  if(el) el.remove();
}
function renderLockOverlay(content){
  removeLockOverlay();
  const sidebarEl = document.querySelector('.sidebar');
  const isNarrow = window.innerWidth <= 820; // khớp breakpoint sidebar thành ngăn kéo ở style.css
  const leftOffset = (sidebarEl && !isNarrow) ? sidebarEl.getBoundingClientRect().width : 0;
  const weakest = window.TcLastWeakestArea;
  const overlay = document.createElement('div');
  overlay.id = 'tc-lock-overlay';
  overlay.style.cssText = `position:fixed;top:0;left:${leftOffset}px;right:0;bottom:0;z-index:50;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(20,24,20,.4);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);`;
  overlay.innerHTML = `
    <div class="card" style="max-width:400px;text-align:center;pointer-events:auto;">
      <div style="font-size:30px;margin-bottom:6px;">🔒</div>
      <div style="font-family:'Playfair Display',serif;font-size:18px;color:#1E2420;margin-bottom:8px;">Tính năng trả phí</div>
      ${weakest ? `<p style="font-size:13.5px;color:var(--ink-soft);line-height:1.5;margin-bottom:14px;">Bạn đang yếu nhất ở khâu <b>${esc(weakest.label)}</b> — mở khoá để đi sâu vào đúng chỗ này.</p>` : `<p style="font-size:13.5px;color:var(--ink-soft);line-height:1.5;margin-bottom:14px;">Đây là bản xem trước trang này — mở khoá trọn đời để dùng đầy đủ, lưu được dữ liệu.</p>`}
      <button id="tc-lock-cta" class="btn" style="width:100%;">Mở khoá ngay — ${tcCurrentPrice().toLocaleString('vi-VN')}đ</button>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('#tc-lock-cta').onclick = ()=>{
    removeLockOverlay();
    renderUpgradeScreen(document.querySelector('#main-content'));
  };
}

window.Modules = window.Modules || {};
document.addEventListener('DOMContentLoaded', initApp);
