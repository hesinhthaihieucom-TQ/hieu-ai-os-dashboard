// 21 Ngày Giải Nghiệp — rút gọn từ suc-khoe/js/app-shell.js (routing + đăng nhập/đăng ký Supabase Auth +
// sidebar), thêm CỔNG THANH TOÁN: chưa gn_has_paid (và không phải admin) thì chỉ thấy màn thanh toán,
// không vào được bài học. gn_has_paid CHỈ bật bởi api/sepay-webhook.js khi nội dung CK có "GN21".

const NAV = [
  { key:'trang-chu', title:'Hành Trình 21 Ngày' },
  { key:'ngay', title:'Bài Học Hôm Nay', hidden:true }, // vào qua bấm 1 ngày ở Hành Trình
  { key:'nhat-ky', title:'Nhật Ký Của Tôi' },
  { key:'tai-khoan', title:'Tài khoản', hidden:true }, // vào qua bấm tên ở cuối sidebar
];

const AppState = { user:null, profile:null, route:'trang-chu', authMode:'login', passwordRecoveryMode:false };

// Giá + đồng hồ đếm ngược DÙNG CHUNG với ladipage (giai-nghiep/lp/, cùng origin nên cùng localStorage) —
// khách đi từ ladipage sang app thấy đúng giá/đồng hồ đang chạy, không bị reset.
const GN_PROMO_PRICE = 199000, GN_REGULAR_PRICE = 299000, GN_DEADLINE_KEY = 'gn21_lp_deadline_ts';
function gnActivePrice(){
  let deadline = NaN;
  try { deadline = parseInt(localStorage.getItem(GN_DEADLINE_KEY), 10); } catch(e){}
  if(!deadline || isNaN(deadline)){
    deadline = Date.now() + 60*60*1000;
    try { localStorage.setItem(GN_DEADLINE_KEY, String(deadline)); } catch(e){}
  }
  return Date.now() < deadline ? GN_PROMO_PRICE : GN_REGULAR_PRICE;
}
const GN_PAYMENT_BANK = { code:'vietinbank', account:'199339288888', accountName:'LE TU QUYNH' };

function sidebarFootHtml(){
  const p = AppState.profile;
  const name = (p && p.full_name && p.full_name.trim()) || 'Chưa đặt tên';
  const initial = name.charAt(0).toUpperCase();
  return `
    <div style="display:flex;align-items:center;gap:8px;">
      <div style="width:32px;height:32px;border-radius:50%;background:var(--gold);color:#1E2420;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15.5px;flex-shrink:0;">${esc(initial)}</div>
      <div style="min-width:0;font-weight:600;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(name)}</div>
    </div>`;
}

function currentRouteFromHash(){
  const h = (location.hash || '').replace('#','');
  return NAV.some(n=>n.key===h) ? h : 'trang-chu';
}

async function initApp(){
  const root = document.getElementById('app');
  root.innerHTML = `<div class="loading"><div class="spinner"></div><p>Đang tải…</p></div>`;

  // Đăng ký onAuthStateChange TRƯỚC getSession() để không lỡ sự kiện PASSWORD_RECOVERY (xem app-shell.js nhan-hieu).
  supabaseClient.auth.onAuthStateChange((event, session) => {
    if(event === 'PASSWORD_RECOVERY' && session){
      AppState.passwordRecoveryMode = true;
      AppState.user = session.user;
      renderSetNewPasswordScreen();
      return;
    }
    if(event === 'SIGNED_IN' && session){
      if(AppState.passwordRecoveryMode) return;
      // Supabase bắn lại SIGNED_IN khi refresh token/focus tab — chỉ render lại khi là phiên MỚI.
      if(AppState.user && AppState.user.id === session.user.id) return;
      AppState.user = session.user;
      AppState.route = 'trang-chu';
      loadProfile().then(()=>{
        location.hash = 'trang-chu';
        renderApp();
        if(window.maybeShowInstallPrompt && hasAccess()) window.maybeShowInstallPrompt();
      });
    } else if(event === 'SIGNED_OUT'){
      stopPayPolling();
      AppState.user = null; AppState.profile = null; AppState.route = 'trang-chu'; AppState.passwordRecoveryMode = false;
      location.hash = '';
      renderAuthScreen();
    }
  });

  const { data } = await supabaseClient.auth.getSession();
  if(AppState.passwordRecoveryMode) return;
  if(data.session){
    AppState.user = data.session.user;
    await loadProfile();
    AppState.route = currentRouteFromHash();
    renderApp();
  } else {
    renderAuthScreen();
  }
  if(window.maybeShowInAppBrowserBanner) window.maybeShowInAppBrowserBanner();

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

function hasAccess(){
  const p = AppState.profile;
  return !!(p && (p.gn_has_paid || p.role === 'admin'));
}

let authFields = { name:'', email:'', pass:'', passConfirm:'', newPass:'', newPassConfirm:'' };

function renderAuthScreen(err, successMsg){
  const root = document.getElementById('app');
  const isLogin = AppState.authMode === 'login';
  if(AppState.authMode === 'forgot'){
    root.innerHTML = `
      <div class="auth-shell">
        <img src="assets/logo-hieu-hanh.png" class="auth-logo" alt="">
        <h1>Quên mật khẩu</h1>
        <div class="sub">Nhập email đã đăng ký — hệ thống gửi link đặt mật khẩu mới qua email đó.</div>
        <div class="card">
          <label>Email</label>
          <input id="af-email" type="email" placeholder="ban@email.com" value="${esc(authFields.email)}">
          <button class="btn btn-full" id="af-submit">Gửi email đặt lại mật khẩu</button>
          ${err ? `<div class="error-box">${esc(err)}</div>` : ''}
          ${successMsg ? `<div class="hint-box">${esc(successMsg)}</div>` : ''}
          <div class="btn-row" style="margin-top:14px;"><span class="signout" id="af-back-login" style="cursor:pointer;">← Quay lại đăng nhập</span></div>
        </div>
      </div>`;
    root.querySelector('#af-email').oninput = (e)=>{ authFields.email = e.target.value; };
    root.querySelector('#af-back-login').onclick = ()=>{ AppState.authMode = 'login'; renderAuthScreen(); };
    root.querySelector('#af-submit').onclick = async ()=>{
      const email = root.querySelector('#af-email').value.trim();
      if(!email){ renderAuthScreen('Vui lòng nhập email.'); return; }
      const btn = root.querySelector('#af-submit'); btn.disabled = true; btn.textContent = 'Đang gửi…';
      try{
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + window.location.pathname });
        if(error) throw error;
        renderAuthScreen(null, 'Đã gửi email — kiểm tra hộp thư (cả mục Spam) và bấm vào link trong email để đặt mật khẩu mới.');
      } catch(e){ renderAuthScreen(e.message); }
    };
    return;
  }
  root.innerHTML = `
    <div class="auth-shell">
      <img src="assets/logo-hieu-hanh.png" class="auth-logo" alt="">
      <h1>21 NGÀY GIẢI NGHIỆP</h1>
      <div class="sub">Mỗi ngày một bài học, một bài tập,<br>ba câu nhật ký và một lời cam kết<br><span class="sub-brand">Hệ sinh thái Hiểu</span></div>
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
        ${isLogin ? `<div style="text-align:center;margin-top:12px;"><span class="signout" id="af-forgot" style="cursor:pointer;font-size:14.5px;">Quên mật khẩu?</span></div>` : ''}
        ${err ? `<div class="error-box">${esc(err)}</div>` : ''}
        ${successMsg ? `<div class="hint-box">${esc(successMsg)}</div>` : ''}
      </div>
    </div>`;
  root.querySelectorAll('.auth-tab').forEach(el=>{ el.onclick = ()=>{ AppState.authMode = el.getAttribute('data-mode'); renderAuthScreen(); }; });
  const forgotEl = root.querySelector('#af-forgot'); if(forgotEl) forgotEl.onclick = ()=>{ AppState.authMode = 'forgot'; renderAuthScreen(); };
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
          authFields = { name:'', email:'', pass:'', passConfirm:'', newPass:'', newPassConfirm:'' };
          renderAuthScreen(null, 'Đăng ký thành công! Nếu tài khoản cần xác nhận email, kiểm tra hộp thư rồi quay lại đăng nhập.');
        }
      }
    } catch(e){ renderAuthScreen(e.message); }
  };
}

function renderSetNewPasswordScreen(err, successMsg){
  const root = document.getElementById('app');
  root.innerHTML = `
    <div class="auth-shell">
      <img src="assets/logo-hieu-hanh.png" class="auth-logo" alt="">
      <h1>Đặt mật khẩu mới</h1>
      <div class="sub">Nhập mật khẩu mới cho tài khoản ${esc((AppState.user&&AppState.user.email)||'')}.</div>
      <div class="card">
        <label>Mật khẩu mới</label>
        <input id="af-new-pass" type="password" placeholder="Ít nhất 6 ký tự" value="${esc(authFields.newPass)}">
        <label>Xác nhận mật khẩu mới</label>
        <input id="af-new-pass-confirm" type="password" placeholder="Nhập lại mật khẩu mới" value="${esc(authFields.newPassConfirm)}">
        <button class="btn btn-full" id="af-submit-new-pass">Đặt mật khẩu mới</button>
        ${err ? `<div class="error-box">${esc(err)}</div>` : ''}
        ${successMsg ? `<div class="hint-box">${esc(successMsg)}</div>` : ''}
      </div>
    </div>`;
  root.querySelector('#af-new-pass').oninput = (e)=>{ authFields.newPass = e.target.value; };
  root.querySelector('#af-new-pass-confirm').oninput = (e)=>{ authFields.newPassConfirm = e.target.value; };
  root.querySelector('#af-submit-new-pass').onclick = async ()=>{
    const pass = root.querySelector('#af-new-pass').value;
    const confirmPass = root.querySelector('#af-new-pass-confirm').value;
    if(!pass || pass.length < 6){ renderSetNewPasswordScreen('Mật khẩu cần ít nhất 6 ký tự.'); return; }
    if(pass !== confirmPass){ renderSetNewPasswordScreen('Mật khẩu xác nhận không khớp — kiểm tra lại.'); return; }
    const btn = root.querySelector('#af-submit-new-pass'); btn.disabled = true; btn.textContent = 'Đang lưu…';
    try{
      const { error } = await supabaseClient.auth.updateUser({ password: pass });
      if(error) throw error;
      authFields.newPass = ''; authFields.newPassConfirm = '';
      AppState.passwordRecoveryMode = false;
      AppState.route = currentRouteFromHash();
      await loadProfile();
      renderApp();
    } catch(e){ renderSetNewPasswordScreen(e.message); }
  };
}

// ===== Cổng thanh toán =====
let payPollTimer = null;
function stopPayPolling(){ if(payPollTimer){ clearInterval(payPollTimer); payPollTimer = null; } }

function renderPaywall(){
  const root = document.getElementById('app');
  const p = AppState.profile;
  const refCode = p && p.ref_code;
  const amount = gnActivePrice();
  // "GN21" là cờ để webhook biết đây là 21 Ngày Giải Nghiệp (giá 199k/299k trùng giá Sổ Dòng Tiền nên
  // KHÔNG thể phân biệt chỉ bằng số tiền) — xem nhánh GN21 trong api/sepay-webhook.js. Bắt đầu bằng SEVQR
  // vì VietinBank chỉ báo biến động số dư khi nội dung CK bắt đầu bằng từ khoá này.
  const memo = `SEVQR GN21 ${refCode || ''}`.trim();
  const qrUrl = `https://img.vietqr.io/image/${GN_PAYMENT_BANK.code}-${GN_PAYMENT_BANK.account}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(memo)}&accountName=${encodeURIComponent(GN_PAYMENT_BANK.accountName)}`;
  root.innerHTML = `
    <div class="auth-shell" style="padding-top:40px;">
      <img src="assets/logo-hieu-hanh.png" class="auth-logo" alt="">
      <h1>Mở khoá 21 Ngày Giải Nghiệp</h1>
      <div class="sub">Thanh toán 1 lần · Truy cập trọn đời</div>
      <div class="card" style="text-align:center;">
        ${refCode ? `
        <img src="${qrUrl}" alt="Mã VietQR" style="max-width:260px;width:100%;border-radius:12px;border:1px solid var(--line);">
        <div style="text-align:left;margin-top:14px;">
          <div class="gn-pay-row"><b>Ngân hàng:</b> Vietinbank</div>
          <div class="gn-pay-row"><b>Số tài khoản:</b> ${GN_PAYMENT_BANK.account} <span class="gn-copy" data-copy="${GN_PAYMENT_BANK.account}">Copy</span></div>
          <div class="gn-pay-row"><b>Chủ tài khoản:</b> ${GN_PAYMENT_BANK.accountName}</div>
          <div class="gn-pay-row"><b>Số tiền:</b> ${amount.toLocaleString('vi-VN')}đ <span class="gn-copy" data-copy="${amount}">Copy</span></div>
          <div class="gn-pay-row"><b>Nội dung CK (giữ nguyên):</b> ${esc(memo)} <span class="gn-copy" data-copy="${esc(memo)}">Copy</span></div>
        </div>
        <div class="hint-box" id="gn-pay-status">⏳ Đang chờ chuyển khoản… Chuyển xong trang tự mở khoá, không cần tải lại.</div>
        ` : `<div class="error-box">Chưa lấy được mã thanh toán của tài khoản này — tải lại trang, nếu vẫn lỗi nhắn Zalo 0866849193 giúp mình.</div>`}
        <div class="btn-row" style="margin-top:18px;"><span class="signout" id="gn-paywall-logout" style="cursor:pointer;">Đăng xuất</span></div>
      </div>
    </div>`;
  root.querySelectorAll('[data-copy]').forEach(el=>{
    el.onclick = async ()=>{ try{ await navigator.clipboard.writeText(el.getAttribute('data-copy')); const o=el.textContent; el.textContent='Đã copy ✓'; setTimeout(()=>{el.textContent=o;},1500); }catch(e){} };
  });
  root.querySelector('#gn-paywall-logout').onclick = async ()=>{ await supabaseClient.auth.signOut(); };

  // Poll thẳng profiles (RLS cho user đọc dòng của chính mình) thay vì gọi API riêng — webhook bật gn_has_paid
  // thì vài giây sau trang tự mở khoá.
  stopPayPolling();
  payPollTimer = setInterval(async ()=>{
    await loadProfile();
    if(hasAccess()){
      stopPayPolling();
      location.hash = 'trang-chu';
      renderApp();
      if(window.maybeShowInstallPrompt) window.maybeShowInstallPrompt();
    }
  }, 4000);
}

function renderApp(){
  // Chặn NGAY TẠI ĐÂY (nơi duy nhất mọi đường gọi đều đi qua) — xem race-condition ở app-shell.js nhan-hieu.
  if(AppState.passwordRecoveryMode) return;
  if(!AppState.user){ renderAuthScreen(); return; }
  if(!hasAccess()){ renderPaywall(); return; }
  stopPayPolling();
  const root = document.getElementById('app');
  root.innerHTML = `
    <div class="topbar-mobile">
      <span class="menu-toggle" id="menu-toggle-btn">☰</span>
      <span class="topbar-title">21 NGÀY GIẢI NGHIỆP</span>
    </div>
    <div class="app-layout">
      <div class="sidebar-overlay" id="sidebar-overlay"></div>
      <div class="sidebar" id="sidebar">
        <div class="sidebar-brand" id="sidebar-brand-home" style="cursor:pointer;">
          <img src="assets/logo-hieu-hanh.png" class="brand-logo" alt="">
          <div class="brand-text">21 NGÀY<br>GIẢI NGHIỆP<small>Hệ sinh thái HIỂU</small></div>
        </div>
        <div class="sidebar-nav" id="sidebar-nav"></div>
        <div class="sidebar-foot">
          <div id="sidebar-foot-info" style="cursor:pointer;margin-bottom:6px;" title="Bấm để vào Tài khoản">${sidebarFootHtml()}</div>
          <span class="signout" id="signout-btn">Đăng xuất</span>
        </div>
      </div>
      <div class="main"><div class="main-inner" id="main-content"></div></div>
    </div>`;

  const visibleNav = NAV.filter(n=>!n.hidden);
  const nav = root.querySelector('#sidebar-nav');
  nav.innerHTML = visibleNav.map((n,i)=>`
    <div class="sidebar-item ${AppState.route===n.key?'active':''}" data-key="${n.key}">
      <span class="num">${i+1}</span><span>${esc(n.title)}</span>
    </div>`).join('');

  const sidebar = root.querySelector('#sidebar');
  const overlay = root.querySelector('#sidebar-overlay');
  const closeDrawer = ()=>{ sidebar.classList.remove('open'); overlay.classList.remove('open'); };
  root.querySelector('#menu-toggle-btn').onclick = ()=>{ sidebar.classList.add('open'); overlay.classList.add('open'); };
  overlay.onclick = closeDrawer;
  root.querySelector('#sidebar-brand-home').onclick = ()=>{ location.hash = 'trang-chu'; closeDrawer(); };
  nav.querySelectorAll('.sidebar-item').forEach(el=>{ el.onclick = ()=>{ location.hash = el.getAttribute('data-key'); closeDrawer(); }; });
  root.querySelector('#signout-btn').onclick = async ()=>{ await supabaseClient.auth.signOut(); };
  root.querySelector('#sidebar-foot-info').onclick = ()=>{ location.hash = 'tai-khoan'; };

  const content = root.querySelector('#main-content');
  const mod = window.Modules && window.Modules[AppState.route];
  if(mod && mod.render) mod.render(content, { supabase: supabaseClient, user: AppState.user, profile: AppState.profile });
  else content.innerHTML = `<div class="card">Module đang được xây dựng.</div>`;
}

window.Modules = window.Modules || {};
document.addEventListener('DOMContentLoaded', initApp);
