// Rút gọn từ suc-khoe/js/app-shell.js — routing + đăng nhập/đăng ký Supabase Auth + sidebar.
// Tên sản phẩm: "Trợ Lý AI Tư Vấn & CRM" — thay thế luồng ChatGPT Custom GPT + Lark Base thủ công
// (xem trang-ban-dich-vu.html, ngoài repo). Đăng ký/đăng nhập ĐỘC LẬP, CÙNG Supabase project với
// nhan-hieu/tai-chinh/suc-khoe/san-pham-so — nếu khách đăng nhập đúng email đã dùng ở Xây Nhân
// Hiệu, user_id trùng tự nhiên nên đọc lại được positioning_results (hồ sơ câu chuyện) mà không
// cần code riêng để "dùng chung tài khoản".
const NAV = [
  { key:'trang-chu', title:'Trang chủ', hidden:true }, // không hiện trong sidebar — vào lại qua bấm logo đầu sidebar
  { key:'tu-van', title:'Tư Vấn AI' },
  { key:'khach-hang', title:'Khách Hàng' },
  { key:'doi-tac', title:'Đối Tác' },
  { key:'case-study', title:'Kho Case Study' },
  { key:'cau-chuyen', title:'Câu Chuyện Của Bạn' },
  { key:'nang-cap', title:'Nâng Cấp' },
  { key:'tai-khoan', title:'Tài khoản', hidden:true }, // vào qua bấm tên ở cuối sidebar
  { key:'quan-tri-hub', title:'Quản Trị', adminOnly:true }, // chỉ hiện khi profiles.role==='admin' — gộp Thành viên/Tài chính/Thông báo, xem quan-tri-hub.js
];

const AppState = { user:null, profile:null, route:'trang-chu', authMode:'login', reviewPromptEligible:false };
// Điều kiện hiện popup xin đánh giá (2026-09-07, "quản trị bên xây nhân hiệu có gì bên crm có đó")
// — đã dùng có kết quả thật (từ 3 khách đã lưu) HOẶC đã dùng app đủ lâu (từ 3 ngày), khớp đúng
// ngưỡng nhan-hieu/js/app-shell.js đang dùng.
const CRM_REVIEW_PROMPT_MIN_CUSTOMERS = 3;
const CRM_REVIEW_PROMPT_MIN_DAYS = 3;
const CRM_REVIEW_MIN_WORDS_FOR_REWARD = 50;
const CRM_REVIEW_REWARD_LUOT = 20;

// Chương trình giới thiệu (2026-09-01, "làm tương tự như web xây nhân hiệu") — bắt lấy ?ref=<mã>
// ngay khi vào web (kể cả trước khi đăng ký/đăng nhập) và lưu tạm vào localStorage, tới lúc signUp()
// mới thực sự gửi lên (xem renderAuthScreen bên dưới). Tiền tố RIÊNG "crm_..." khác "xnh_..." của
// nhan-hieu vì 2 app có thể chung 1 origin. profiles.referred_by_ref_code là cột ecosystem-wide
// (schema_core.sql, handle_new_user) — hầu hết user đã có mã này từ trước nếu từng đăng ký qua app
// khác trong hệ sinh thái; capture ở đây chỉ cần cho người CHƯA TỪNG dùng app nào, đăng ký thẳng qua
// link giới thiệu riêng của tro-ly-crm.
const CRM_REF_STORAGE_KEY = 'crm_referred_by_ref_code';
(function captureCrmReferralCode(){
  try {
    const m = /[?&]ref=([A-Za-z0-9]+)/.exec(location.search);
    if(m && !localStorage.getItem(CRM_REF_STORAGE_KEY)) localStorage.setItem(CRM_REF_STORAGE_KEY, m[1].toUpperCase());
  } catch(e){}
})();

// Cùng cặp VAPID key với nhan-hieu/tai-chinh (server chỉ có 1 VAPID_PRIVATE_KEY dùng chung cho toàn
// bộ hệ sinh thái HIỂU, xem api/_lib/push.js) — dùng khi bật thông báo nhắc follow khách.
const VAPID_PUBLIC_KEY = 'BNTlCve7JFY6nki3SBjlPAQVsmOD68oTIvSDMP1VkNe-jWtCPQuPUY4xz2SisvwpU3IWo_ciiGTMxoLJq42QzkE';

// Lượt AI (2026-08-30, chị Quỳnh chốt "làm như Xây Nhân Hiệu — hiện bộ đếm lượt", sau đó yêu cầu
// tính lại đúng chi phí thật) — PHẢI khớp đúng CRM_MONTHLY_AI_LIMIT/CRM_AI_WEIGHTS ở
// api/_lib/crm-ai-quota.js (nơi THỰC SỰ trừ lượt); bảng này chỉ dùng để cập nhật ngay số lượt hiển
// thị ở sidebar cho mượt, không cần đợi tải lại trang. case-study-classify KHÔNG có trong bảng này
// vì không tính lượt (xem api/case-study-classify.js).
const CRM_MONTHLY_AI_LIMIT = 300;
const GATED_API_WEIGHTS = { 'api/crm-tuvan': 3, 'api/crm-cap-nhat-ho-so': 1 };

function crmMonthlyUsage(p){
  // Chu kỳ 30 ngày từ lúc NÂNG CẤP (crm_first_paid_at), không phải tháng lịch (chị Quỳnh 2026-09-07,
  // xem paidCycleAnchor() ở util.js) — BUG THẬT trước đây: RPC (consume_crm_ai_quota) đã đổi sang
  // định dạng chu kỳ số ('14'...) nhưng chỗ này vẫn so bằng chuỗi tháng lịch ('2026-09'), 2 bên KHÔNG
  // BAO GIỜ khớp nhau, khiến số "đã dùng" hiển thị luôn ra 0 dù dùng bao nhiêu cũng vậy.
  const sameMonth = p.crm_ai_month === currentCycleKey(paidCycleAnchor(p));
  const used = sameMonth ? (p.crm_ai_uses||0) : 0;
  const bonus = sameMonth ? (p.crm_ai_bonus||0) : 0;
  return { used, limit: CRM_MONTHLY_AI_LIMIT + bonus };
}
function crmQuotaHint(){
  const p = AppState.profile;
  if(!p) return '';
  const { used, limit } = crmMonthlyUsage(p);
  const period = currentCycleRangeLabel(paidCycleAnchor(p));
  if(p.role==='admin') return `<span style="color:#8A8F82;">🔥 Đã dùng ${used} lượt (${period}) — không giới hạn</span>`;
  const remaining = Math.max(0, limit - used);
  const color = remaining<=10 ? 'var(--danger)' : '#9CA396';
  return `<span style="color:${color};">✨ Còn ${remaining}/${limit} lượt (${period})</span>`;
}
window.onGatedApiSuccess = function(relativePath, weightOverride){
  const p = AppState.profile;
  if(!p) return;
  const path = relativePath.split('?')[0];
  const weight = weightOverride != null ? weightOverride : GATED_API_WEIGHTS[path];
  if(!weight) return;
  const cycleKey = currentCycleKey(paidCycleAnchor(p));
  if(p.crm_ai_month !== cycleKey){ p.crm_ai_month = cycleKey; p.crm_ai_uses = 0; p.crm_ai_bonus = 0; }
  p.crm_ai_uses = (p.crm_ai_uses||0) + weight;
  const el = document.getElementById('sidebar-foot-info');
  if(el) el.innerHTML = sidebarFootHtml();
};

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
    ${crmQuotaHint()}
  `;
}

function currentRouteFromHash(){
  const h = (location.hash || '').replace('#','');
  return NAV.some(n=>n.key===h) ? h : 'trang-chu';
}

// App này không có tour hướng dẫn riêng như nhan-hieu/tai-chinh (nơi hỏi cài app ngay sau khi tour
// kết thúc) — thay vào đó hỏi 1 lần duy nhất sau khi màn hình chính render xong, trễ 1.5s để không
// chen ngang lúc trang đang vẽ lần đầu. installPromptShownOnce chặn hỏi lại nhiều lần trong 1 phiên
// (vd sau khi đăng nhập rồi lại điều hướng qua vài route).
let installPromptShownOnce = false;
function maybeTriggerInstallPromptOnce(){
  if(installPromptShownOnce) return;
  installPromptShownOnce = true;
  setTimeout(()=>{ if(window.maybeShowInstallPrompt) window.maybeShowInstallPrompt(); }, 1500);
}

// Thông báo tính năng mới (2026-08-31) — kiểm tra NGAY (không delay) mỗi khi vào app/đăng nhập mới,
// trước cả install-prompt (quan trọng hơn) — xem announcement-popup.js. Best-effort, không throw.
let announcementsCheckedOnce = false;
function maybeCheckCrmAnnouncementsOnce(){
  if(announcementsCheckedOnce) return;
  announcementsCheckedOnce = true;
  if(window.checkAndShowCrmAnnouncements){
    window.checkAndShowCrmAnnouncements({ supabase: supabaseClient, user: AppState.user, profile: AppState.profile });
  }
}

// Tính điều kiện 1 LẦN lúc vào app (giống maybeCheckCrmAnnouncementsOnce) — nếu đã "dismissed" (đã
// bấm Để sau HOẶC đã từng gửi đánh giá, xem submit-review.js) thì bỏ qua luôn, khỏi tốn thêm 1 truy
// vấn đếm khách mỗi lần vào app cho người chắc chắn không cần hỏi lại nữa.
async function loadReviewPromptEligibility(){
  if(!AppState.user || !AppState.profile) { AppState.reviewPromptEligible = false; return; }
  if(AppState.profile.crm_review_prompt_dismissed) { AppState.reviewPromptEligible = false; return; }
  const daysSinceSignup = AppState.profile.created_at
    ? (Date.now() - new Date(AppState.profile.created_at).getTime()) / 86400000 : 0;
  let qualifies = daysSinceSignup >= CRM_REVIEW_PROMPT_MIN_DAYS;
  if(!qualifies){
    const { count } = await supabaseClient.from('crm_customers').select('id', { count:'exact', head:true }).eq('user_id', AppState.user.id);
    qualifies = (count || 0) >= CRM_REVIEW_PROMPT_MIN_CUSTOMERS;
  }
  AppState.reviewPromptEligible = qualifies;
}

// Popup xin cảm nhận — CHỈ hiện nếu không có overlay nào khác đang mở (thông báo tính năng/cài app)
// để tránh chồng 2 popup cùng lúc.
function maybeShowReviewPrompt(){
  if(!AppState.reviewPromptEligible) return;
  if(document.getElementById('crm-announcement-overlay') || document.getElementById('install-prompt-overlay') || document.getElementById('review-prompt-overlay')) return;
  AppState.reviewPromptEligible = false; // hỏi đúng 1 lần/phiên tải trang, không hiện lại nếu re-render

  const overlay = document.createElement('div');
  overlay.id = 'review-prompt-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(20,24,20,.78);display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `
    <div style="max-width:420px;width:100%;background:#fff;border-radius:14px;padding:26px 24px;box-shadow:0 12px 36px rgba(0,0,0,.3);">
      <div style="font-family:'Playfair Display',serif;font-size:19px;color:#1E2420;margin-bottom:8px;">Khoe trải nghiệm của bạn với Trợ Lý AI Tư Vấn &amp; CRM 🎉</div>
      <div style="font-size:13.5px;line-height:1.6;color:#5B5F55;margin-bottom:14px;"><b style="color:var(--danger,#A6462E);">Tặng ngay ${CRM_REVIEW_REWARD_LUOT} lượt AI miễn phí</b> khi viết từ ${CRM_REVIEW_MIN_WORDS_FOR_REWARD} từ trở lên! Kể thoải mái 3-5 điều bạn thích nhất — tư vấn nhanh hơn bao nhiêu, đỡ quên follow khách thế nào, tiết kiệm được bao nhiêu thời gian mỗi tuần...</div>
      <textarea id="rp-comment" placeholder="Ví dụ: 1. Tư vấn nhanh hơn hẳn, không còn quên follow khách 2. AI đọc ảnh chat và tự lưu hồ sơ khách chính xác 3. Sổ tay tư vấn giúp mình biết nên hỏi gì tiếp theo..." style="width:100%;min-height:100px;padding:10px 12px;border:1px solid var(--line,#E4DFCF);border-radius:8px;font-family:inherit;font-size:14px;resize:vertical;"></textarea>
      <div id="rp-error" style="display:none;color:var(--danger,#A6462E);font-size:12.5px;margin-top:8px;"></div>
      <div style="display:flex;gap:10px;justify-content:flex-end;align-items:center;margin-top:16px;">
        <span id="rp-skip" style="font-size:13px;color:#5B5F55;cursor:pointer;">Để sau</span>
        <button id="rp-submit" class="btn btn-sm">Gửi đánh giá</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  function close(){ overlay.remove(); }
  async function dismissServerSide(){
    if(AppState.profile) AppState.profile.crm_review_prompt_dismissed = true;
    try{ await supabaseClient.rpc('set_crm_review_prompt_dismissed'); } catch(e){}
  }
  overlay.querySelector('#rp-skip').onclick = async ()=>{ close(); await dismissServerSide(); };

  overlay.querySelector('#rp-submit').onclick = async ()=>{
    const textarea = overlay.querySelector('#rp-comment');
    const errorEl = overlay.querySelector('#rp-error');
    const comment = textarea.value.trim();
    if(!comment){ errorEl.textContent = 'Chưa nhập cảm nhận.'; errorEl.style.display = 'block'; return; }
    const btn = overlay.querySelector('#rp-submit');
    btn.disabled = true; btn.textContent = 'Đang gửi…';
    try{
      const data = await callApi('/api/submit-review', { comment, app: 'tro-ly-crm' });
      if(window.onCrmReviewSubmitted) window.onCrmReviewSubmitted(data);
      close();
    } catch(e){
      errorEl.textContent = e.message || 'Không gửi được, thử lại giúp mình.';
      errorEl.style.display = 'block';
      btn.disabled = false; btn.textContent = 'Gửi đánh giá';
    }
  };
}
// Cập nhật ngay số lượt hiển thị ở sidebar sau khi gửi đánh giá được thưởng — gọi từ trang-chu.js's
// submitReview() KHÔNG được vì popup này độc lập với route hiện tại (có thể hiện ở bất kỳ trang nào).
window.onCrmReviewSubmitted = function(result){
  const p = AppState.profile;
  if(!p) return;
  p.crm_review_prompt_dismissed = true;
  if(result && result.rewarded){
    const month = new Date().toISOString().slice(0,7);
    if(p.crm_ai_month !== month){ p.crm_ai_month = month; p.crm_ai_uses = 0; p.crm_ai_bonus = 0; }
    p.crm_ai_bonus = (p.crm_ai_bonus||0) + (result.rewardLuot || CRM_REVIEW_REWARD_LUOT);
    p.crm_review_reward_given = true;
  }
  const el = document.getElementById('sidebar-foot-info');
  if(el) el.innerHTML = sidebarFootHtml();
};

async function initApp(){
  const root = document.getElementById('app');
  root.innerHTML = `<div class="loading"><div class="spinner"></div><p>Đang tải…</p></div>`;

  const { data } = await supabaseClient.auth.getSession();
  if(data.session){
    AppState.user = data.session.user;
    await loadProfile();
    AppState.route = currentRouteFromHash();
    renderApp();
    maybeCheckCrmAnnouncementsOnce();
    maybeTriggerInstallPromptOnce();
    loadReviewPromptEligibility().then(()=> setTimeout(maybeShowReviewPrompt, 2000));
  } else {
    renderAuthScreen();
  }

  // Cảnh báo trình duyệt trong app (Facebook/Instagram/Zalo...) NGAY LẦN ĐẦU VÀO, kể cả CHƯA đăng
  // nhập (2026-09-03, áp dụng lại từ tai-chinh theo góp ý Quỳnh "áp dụng cho tất cả các app về
  // sau"). Gọi ĐỘC LẬP với maybeTriggerInstallPromptOnce() (cái đó chỉ chạy sau khi đăng nhập).
  if(window.maybeShowInAppBrowserBanner) window.maybeShowInAppBrowserBanner();

  supabaseClient.auth.onAuthStateChange((event, session) => {
    if(event === 'SIGNED_IN' && session){
      // Supabase cũng bắn lại "SIGNED_IN" khi refresh token nền hoặc khi tab được focus lại — chỉ
      // render lại toàn bộ khi đây thực sự là 1 phiên đăng nhập MỚI, tránh xoá state đang gõ dở.
      if(AppState.user && AppState.user.id === session.user.id) return;
      AppState.user = session.user;
      AppState.route = 'trang-chu';
      loadProfile().then(()=>{
        location.hash = 'trang-chu';
        renderApp();
        maybeCheckCrmAnnouncementsOnce();
        maybeTriggerInstallPromptOnce();
        loadReviewPromptEligibility().then(()=> setTimeout(maybeShowReviewPrompt, 2000));
      });
    } else if(event === 'SIGNED_OUT'){
      AppState.user = null;
      AppState.profile = null;
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
  // Đánh dấu lần đầu vào app này — RPC vì user không .update() thẳng profiles được (RLS đã khoá,
  // xem supabase/schema_full.sql) — dùng để Quản Trị > Thành viên lọc đúng người liên quan tới app
  // này (không lẫn người chỉ dùng nhan-hieu/tai-chinh/suc-khoe).
  if(AppState.profile && !AppState.profile.crm_first_visited_at){
    await supabaseClient.rpc('mark_crm_first_visit');
    const { data: refreshed } = await supabaseClient.from('profiles').select('*').eq('id', AppState.user.id).maybeSingle();
    if(refreshed) AppState.profile = refreshed;
  }
}

let authFields = { name:'', email:'', pass:'', passConfirm:'' };

function renderAuthScreen(err, successMsg){
  const root = document.getElementById('app');
  const isLogin = AppState.authMode === 'login';
  root.innerHTML = `
    <div class="auth-shell">
      <h1>Trợ Lý AI Tư Vấn &amp; CRM</h1>
      <div class="sub">Tư vấn khách hàng đúng quy trình<br>CRM tự lưu, tự nhắc lịch follow<br><span class="sub-brand">Hệ sinh thái Hiểu</span></div>
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
        <button class="btn btn-full" id="af-submit">${isLogin?'Đăng nhập':'Tạo tài khoản'}</button>
        ${err ? `<div class="error-box">${esc(err)}</div>` : ''}
        ${successMsg ? `<div class="hint-box">${esc(successMsg)}</div>` : ''}
      </div>
      <p class="cta-note" style="text-align:center;color:var(--ink-soft);font-size:12.5px;margin-top:18px;">Đã có tài khoản Xây Nhân Hiệu? Đăng nhập đúng email/mật khẩu đó — hồ sơ câu chuyện của bạn sẽ tự dùng lại ở đây.</p>
    </div>
  `;

  root.querySelectorAll('.auth-tab').forEach(el=>{
    el.onclick = ()=>{ AppState.authMode = el.getAttribute('data-mode'); renderAuthScreen(); };
  });

  const nameEl = root.querySelector('#af-name'); if(nameEl) nameEl.oninput = ()=>{ authFields.name = nameEl.value; };
  root.querySelector('#af-email').oninput = (e)=>{ authFields.email = e.target.value; };
  root.querySelector('#af-pass').oninput = (e)=>{ authFields.pass = e.target.value; };
  const confirmEl = root.querySelector('#af-pass-confirm'); if(confirmEl) confirmEl.oninput = ()=>{ authFields.passConfirm = confirmEl.value; };

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
        btn.disabled = true; btn.textContent = 'Đang xử lý…';
        const full_name = root.querySelector('#af-name').value.trim();
        let referredByRefCode = null;
        try { referredByRefCode = localStorage.getItem(CRM_REF_STORAGE_KEY) || null; } catch(e){}
        const { data, error } = await supabaseClient.auth.signUp({ email, password: pass, options:{ data:{ full_name, referred_by_ref_code: referredByRefCode } } });
        if(error) throw error;
        try { localStorage.removeItem(CRM_REF_STORAGE_KEY); } catch(e){}
        if(!data.session){
          AppState.authMode = 'login';
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
  if(!AppState.user){ renderAuthScreen(); return; }
  const root = document.getElementById('app');
  root.innerHTML = `
    <div class="topbar-mobile">
      <span class="menu-toggle" id="menu-toggle-btn">☰</span>
      <span class="topbar-title">Trợ Lý AI &amp; CRM</span>
    </div>
    <div class="app-layout">
      <div class="sidebar-overlay" id="sidebar-overlay"></div>
      <div class="sidebar" id="sidebar">
        <div class="sidebar-brand" id="sidebar-brand-home" style="cursor:pointer;">
          <img src="assets/logo-tu-van-crm.png" class="brand-logo" alt="" onerror="this.style.display='none'">
          <div class="brand-text">TRỢ LÝ AI<br>&amp; CRM<small>Hệ sinh thái HIỂU</small></div>
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
  const visibleNav = NAV.filter(n=> !n.hidden && (!n.adminOnly || isAdmin));
  const nav = root.querySelector('#sidebar-nav');
  nav.innerHTML = visibleNav.map((n,i)=>`
    <div class="sidebar-item ${AppState.route===n.key?'active':''}" data-key="${n.key}">
      <span class="num">${i+1}</span><span>${esc(n.title)}</span>
    </div>
  `).join('');

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
