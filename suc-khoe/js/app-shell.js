// Rút gọn từ tai-chinh/js/app-shell.js — CHỈ giữ routing + đăng nhập/đăng ký Supabase Auth + sidebar.
// Tên sản phẩm: "Hiểu để Khỏe" (đổi tên 2026-09-19 từ "Hiểu Để Khoẻ Mạnh", chị Quỳnh chốt gọn hơn —
// tên gốc khớp tên app hieu-de-khoe-manh.vercel.app mà chị Quỳnh dùng làm ví dụ, 2026-08-26) — đây là
// BỘ KHUNG ban đầu, chưa có thanh toán/khoá tính năng như
// nhan-hieu/tai-chinh: mọi khách đăng ký xong vào được hết các mục, GÓI đang dùng (nếu có) do admin
// gán tay qua Quản Trị > Thành viên. Không có freemium/premium/referral/review-prompt ở bản khung
// này — thêm sau nếu chị Quỳnh cần, giữ file này gọn để dễ đọc lúc mới dựng khung. Thông báo đẩy
// (bản tin sức khỏe mỗi ngày) đã thêm 2026-08-31, xem tai-khoan.js + api/cron/send-reminders.js.

// Public key VAPID DÙNG CHUNG với mọi app khác trong hệ sinh thái (1 cặp key cho cả Vercel project,
// đã cấu hình VAPID_PRIVATE_KEY ở Vercel, xem api/_lib/push.js) — KHÔNG tự đổi key riêng cho app
// này, đổi sẽ ký sai với server và mọi app khác cũng hỏng theo.
const VAPID_PUBLIC_KEY = 'BNTlCve7JFY6nki3SBjlPAQVsmOD68oTIvSDMP1VkNe-jWtCPQuPUY4xz2SisvwpU3IWo_ciiGTMxoLJq42QzkE';
const NAV = [
  { key:'trang-chu', title:'Trang chủ', hidden:true }, // không hiện trong sidebar (giống nhan-hieu/tai-chinh) — vào lại qua bấm logo đầu sidebar
  { key:'kiem-tra-suc-khoe', title:'Kiểm Tra Sức Khỏe' },
  { key:'theo-doi-tuan', title:'Theo Dõi Sức Khỏe Theo Tuần' },
  { key:'lich-trinh', title:'Lịch Trình Của Bạn' },
  { key:'thu-vien-suc-khoe', title:'Thư Viện Sức Khỏe' },
  { key:'cau-chuyen-thanh-cong', title:'Câu Chuyện Thành Công' },
  { key:'san-pham', title:'Sản Phẩm Unicity' },
  { key:'tich-diem-hoa-hong', title:'Tích Điểm & Hoa Hồng' },
  { key:'tuyen-doi-tac', title:'Cơ Hội Kinh Doanh' },
  { key:'tai-khoan', title:'Tài khoản', hidden:true }, // vào qua bấm tên ở cuối sidebar
  { key:'quan-tri', title:'Quản Trị', adminOnly:true }, // chỉ hiện khi profiles.role==='admin'
];

const AppState = { user:null, profile:null, route:'trang-chu', authMode:'login', showAuthForm:false };

function sidebarFootHtml(){
  const p = AppState.profile;
  const name = (p && p.full_name && p.full_name.trim()) || 'Chưa đặt tên';
  const initial = name.charAt(0).toUpperCase();
  const avatarHtml = (p && p.avatar_url)
    ? `<img src="${p.avatar_url}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;flex-shrink:0;">`
    : `<div style="width:32px;height:32px;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15.5px;flex-shrink:0;">${esc(initial)}</div>`;
  return `
    <div style="display:flex;align-items:center;gap:8px;">
      ${avatarHtml}
      <div style="min-width:0;font-weight:600;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(name)}</div>
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
    await loadProfile();
    AppState.route = currentRouteFromHash();
    renderApp();
  } else {
    renderUnauthedScreen();
  }

  // Cảnh báo trình duyệt trong app (Facebook/Instagram/Zalo...) NGAY LẦN ĐẦU VÀO, kể cả CHƯA đăng
  // nhập (2026-09-03, áp dụng từ tai-chinh theo góp ý Quỳnh "áp dụng cho tất cả các app về sau").
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
        // 2026-09-16, chị Quỳnh: hỏi cài app đúng lúc hợp lý (ngay sau khi đăng nhập/đăng ký xong lần
        // đầu vào app thật, giống pattern tai-chinh/nhan-hieu) — app này chưa có tour riêng nên gọi
        // thẳng ở đây thay vì chờ callback tour như 2 app kia.
        if(window.maybeShowInstallPrompt) window.maybeShowInstallPrompt();
      });
    } else if(event === 'SIGNED_OUT'){
      AppState.user = null;
      AppState.profile = null;
      AppState.route = 'trang-chu';
      AppState.showAuthForm = false;
      location.hash = '';
      renderUnauthedScreen();
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
  // Đánh dấu lần đầu vào app suc-khoe — RPC vì user không .update() thẳng profiles được (RLS đã
  // khoá, xem supabase/schema_full.sql). Dùng để Quản Trị > Thành viên lọc đúng người liên quan tới
  // app này (không lẫn người chỉ dùng nhan-hieu/tai-chinh).
  if(AppState.profile && !AppState.profile.sk_first_visited_at){
    await supabaseClient.rpc('mark_sk_first_visit');
    const { data: refreshed } = await supabaseClient.from('profiles').select('*').eq('id', AppState.user.id).maybeSingle();
    if(refreshed) AppState.profile = refreshed;
  }
  await transferGuestCheckinDraftIfAny();
}

// 2026-09-16, chị Quỳnh: "e muốn khi ng dùng vào là sẽ được check kiểm tra sức khỏe luôn xong mới
// đăng ký" — khách tick xong ở màn hình khách (renderGuestCheckScreen) được lưu tạm localStorage (xem
// util.js saveGuestCheckinDraft, chưa có user_id lúc đó). Ngay khi có user_id thật (vừa đăng nhập/
// đăng ký), chuyển nháp đó vào sk_health_checkins — không bắt khách tick lại từ đầu. CỘNG DỒN (không
// ghi đè) với dữ liệu đã có sẵn của tài khoản (phòng khi khách đăng nhập vào tài khoản cũ đã có kết
// quả riêng) để không mất dữ liệu bên nào.
async function transferGuestCheckinDraftIfAny(){
  const draft = loadGuestCheckinDraft();
  if(!draft || !AppState.user) return;
  const { data: existing } = await supabaseClient.from('sk_health_checkins').select('survey_insulin,survey_toxin,survey_metabolic').eq('user_id', AppState.user.id).maybeSingle();
  const merge = (a,b) => Array.from(new Set([...(a||[]), ...(b||[])]));
  const { error } = await supabaseClient.from('sk_health_checkins').upsert({
    user_id: AppState.user.id,
    survey_insulin: merge(existing && existing.survey_insulin, draft.insulin),
    survey_toxin: merge(existing && existing.survey_toxin, draft.toxin),
    survey_metabolic: merge(existing && existing.survey_metabolic, draft.metabolic),
    updated_at: new Date().toISOString(),
  }, { onConflict:'user_id' });
  if(!error) clearGuestCheckinDraft();
}

let authFields = { name:'', email:'', pass:'', passConfirm:'' };

// 2026-09-16, chị Quỳnh: "e muốn khi ng dùng vào là sẽ được check kiểm tra sức khỏe luôn xong mới
// đăng ký" — trước đây chưa đăng nhập là CHỈ thấy màn hình đăng nhập/đăng ký (renderAuthScreen), không
// vào được gì cả. Giờ mặc định cho khách CHƯA đăng nhập thấy thẳng Kiểm Tra Sức Khỏe (renderGuestCheckScreen)
// — chỉ chuyển sang màn hình đăng nhập/đăng ký khi khách chủ động bấm "Đăng nhập"/"Đăng ký" (từ kết
// quả Kiểm Tra hoặc link ở góc màn hình). AppState.showAuthForm quyết định hiện màn nào.
function renderUnauthedScreen(err, successMsg){
  if(AppState.showAuthForm){ renderAuthScreen(err, successMsg); return; }
  renderGuestCheckScreen();
}

function renderGuestCheckScreen(){
  const root = document.getElementById('app');
  root.innerHTML = `
    <div style="max-width:720px;margin:0 auto;padding:24px 16px 60px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
        <img src="assets/logo-hieu-manh.png" alt="" style="height:34px;" onerror="this.style.display='none'">
        <span id="guest-login-link" style="font-size:15px;color:var(--accent);cursor:pointer;font-weight:600;">Đã có tài khoản? Đăng nhập</span>
      </div>
      <div id="guest-check-mount"></div>
    </div>
  `;
  root.querySelector('#guest-login-link').onclick = ()=>{
    AppState.showAuthForm = true; AppState.authMode = 'login'; renderUnauthedScreen();
  };
  const mount = root.querySelector('#guest-check-mount');
  window.Modules['kiem-tra-suc-khoe'].render(mount, { supabase: supabaseClient, user: null, profile: null });
}

// Cầu nối để kiem-tra-suc-khoe.js (không biết gì về AppState/auth) gọi được khi khách bấm nút "Đăng
// ký" ngay tại kết quả — tránh phải truyền thẳng AppState vào module (module chỉ nhận ctx supabase/
// user/profile như mọi module khác).
window.skRequestGuestSignup = function(){
  AppState.showAuthForm = true; AppState.authMode = 'signup'; renderUnauthedScreen();
};

function renderAuthScreen(err, successMsg){
  const root = document.getElementById('app');
  const isLogin = AppState.authMode === 'login';
  root.innerHTML = `
    <div class="auth-shell">
      <img src="assets/logo-hieu-manh.png" class="auth-logo" alt="" onerror="this.style.display='none'">
      <h1>HIỂU ĐỂ KHỎE</h1>
      <div class="sub">Kiểm tra & theo dõi sức khỏe mỗi tuần<br>Lịch trình đồng hành cùng bạn<br>Thư viện tra cứu sức khỏe<br><span class="sub-brand">Hệ sinh thái Hiểu</span></div>
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
      <div id="guest-back-link" style="margin-top:14px;font-size:14.5px;color:var(--ink-soft);cursor:pointer;">← Quay lại Kiểm Tra Sức Khỏe</div>
    </div>
  `;

  root.querySelectorAll('.auth-tab').forEach(el=>{
    el.onclick = ()=>{ AppState.authMode = el.getAttribute('data-mode'); renderAuthScreen(); };
  });
  const backLink = root.querySelector('#guest-back-link');
  if(backLink) backLink.onclick = ()=>{ AppState.showAuthForm = false; renderUnauthedScreen(); };

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
        const { data, error } = await supabaseClient.auth.signUp({ email, password: pass, options:{ data:{ full_name } } });
        if(error) throw error;
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
  if(!AppState.user){ renderUnauthedScreen(); return; }
  const root = document.getElementById('app');
  root.innerHTML = `
    <div class="topbar-mobile">
      <span class="menu-toggle" id="menu-toggle-btn">☰</span>
      <span class="topbar-title">HIỂU ĐỂ KHỎE</span>
    </div>
    <div class="app-layout">
      <div class="sidebar-overlay" id="sidebar-overlay"></div>
      <div class="sidebar" id="sidebar">
        <div class="sidebar-brand" id="sidebar-brand-home" style="cursor:pointer;">
          <img src="assets/logo-hieu-manh.png" class="brand-logo" alt="" onerror="this.style.display='none'">
          <div class="brand-text">HIỂU ĐỂ<br>KHỎE<small>Hệ sinh thái HIỂU</small></div>
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
