// Khung app Dựng Video AI — dựng từ suc-khoe/js/app-shell.js (cùng cách đăng nhập/đăng ký/quên mật
// khẩu Supabase Auth + routing hash phẳng). Khác bản gốc: (1) không có màn khách trước đăng nhập,
// (2) trên điện thoại dùng thanh 5 tab dưới đáy thay ngăn kéo ☰ (giống Calita Cut, chị Quỳnh
// 2026-10-11), desktop vẫn sidebar y hệt nhan-hieu, (3) huy hiệu số video "Chờ bạn xem" trên mục Video.
// CHƯA có: tour hướng dẫn, đánh giá app, cộng tác viên, nâng cấp/thanh toán, thông báo đẩy — bản
// khung, thêm từng phần sau theo chuẩn nhan-hieu.
const NAV = [
  { key:'tong-quan', title:'Tổng quan', icon:'🏠' },
  { key:'gui-video', title:'Gửi video', icon:'➕' },
  { key:'video-cua-toi', title:'Video', icon:'🎞️', badgeKey:'review' },
  { key:'kho-hinh', title:'Kho hình', icon:'🖼️' },
  { key:'cai-dat', title:'Cài đặt', icon:'⚙️' },
  { key:'quan-tri', title:'Quản Trị', icon:'🛠️', adminOnly:true, noBottom:true },
];
const AppState = { user:null, profile:null, route:'tong-quan', authMode:'login', passwordRecoveryMode:false, badges:{ review:0 } };

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
  return NAV.some(n=>n.key===h) ? h : 'tong-quan';
}

async function refreshBadges(){
  if(!AppState.user) return;
  const { count } = await supabaseClient.from('dv_jobs').select('id', { count:'exact', head:true }).eq('user_id', AppState.user.id).eq('status','review');
  AppState.badges.review = count || 0;
  document.querySelectorAll('[data-badge="review"]').forEach(el=>{
    el.textContent = AppState.badges.review; el.style.display = AppState.badges.review ? 'flex' : 'none';
  });
}
window.dvRefreshBadges = refreshBadges;

async function loadProfile(){
  if(!AppState.user) return;
  const { data } = await supabaseClient.from('profiles').select('*').eq('id', AppState.user.id).maybeSingle();
  AppState.profile = data || null;
  // Đánh dấu lần đầu vào app này — RPC vì user không .update() thẳng profiles (RLS khoá). Quản Trị
  // dùng cột này để chỉ liệt kê người của app Dựng Video, không lẫn người chỉ dùng app khác.
  if(AppState.profile && !AppState.profile.dv_first_visited_at){
    await supabaseClient.rpc('mark_dv_first_visit');
    const { data: refreshed } = await supabaseClient.from('profiles').select('*').eq('id', AppState.user.id).maybeSingle();
    if(refreshed) AppState.profile = refreshed;
  }
}

async function initApp(){
  const root = document.getElementById('app');
  root.innerHTML = `<div class="loading"><div class="spinner"></div><p>Đang tải…</p></div>`;
  // onAuthStateChange đăng ký TRƯỚC getSession() (xem app-shell.js nhan-hieu 2026-10-01): tránh lỡ
  // PASSWORD_RECOVERY nếu nó bắn sớm lúc client khởi tạo.
  supabaseClient.auth.onAuthStateChange((event, session) => {
    if(event === 'PASSWORD_RECOVERY' && session){
      AppState.passwordRecoveryMode = true; AppState.user = session.user; renderSetNewPasswordScreen(); return;
    }
    if(event === 'SIGNED_IN' && session){
      if(AppState.passwordRecoveryMode) return;
      // SIGNED_IN cũng bắn lại khi refresh token/tab focus lại — chỉ render lại khi là phiên MỚI.
      if(AppState.user && AppState.user.id === session.user.id) return;
      AppState.user = session.user; AppState.route = 'tong-quan';
      loadProfile().then(()=>{ location.hash = 'tong-quan'; renderApp(); });
    } else if(event === 'SIGNED_OUT'){
      AppState.user = null; AppState.profile = null; AppState.route = 'tong-quan'; AppState.passwordRecoveryMode = false;
      location.hash = ''; renderAuthScreen();
    }
  });
  const { data } = await supabaseClient.auth.getSession();
  if(AppState.passwordRecoveryMode) return;
  if(data.session){
    AppState.user = data.session.user; await loadProfile();
    AppState.route = currentRouteFromHash(); renderApp();
  } else { renderAuthScreen(); }
  window.addEventListener('hashchange', () => {
    if(!AppState.user) return;
    AppState.route = currentRouteFromHash(); renderApp();
  });
}

let authFields = { name:'', email:'', pass:'', passConfirm:'', newPass:'', newPassConfirm:'' };

function renderAuthScreen(err, successMsg){
  const root = document.getElementById('app');
  const isLogin = AppState.authMode === 'login';
  const isForgot = AppState.authMode === 'forgot';
  if(isForgot){
    root.innerHTML = `
      <div class="auth-shell">
        <img src="assets/logo.png" class="auth-logo" alt="" onerror="this.style.display='none'">
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
      </div>
    `;
    root.querySelector('#af-email').oninput = (e)=>{ authFields.email = e.target.value; };
    root.querySelector('#af-back-login').onclick = ()=>{ AppState.authMode = 'login'; renderAuthScreen(); };
    root.querySelector('#af-submit').onclick = async ()=>{
      const email = root.querySelector('#af-email').value.trim();
      if(!email){ renderAuthScreen('Vui lòng nhập email.'); return; }
      const btn = root.querySelector('#af-submit');
      btn.disabled = true; btn.textContent = 'Đang gửi…';
      try{
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + window.location.pathname });
        if(error) throw error;
        renderAuthScreen(null, 'Đã gửi email — kiểm tra hộp thư (cả mục Spam) và bấm vào link trong email để đặt mật khẩu mới.');
      } catch(e){
        renderAuthScreen(e.message);
      }
    };
    return;
  }
  root.innerHTML = `
    <div class="auth-shell">
      <img src="assets/logo.png" class="auth-logo" alt="" onerror="this.style.display='none'">
      <h1>DỰNG VIDEO AI</h1>
      <div class="sub">Quay điện thoại, nói vào máy<br>Máy tự cắt, chèn chữ, hình minh hoạ<br>Nhận lại video, ảnh bìa và caption<br><span class="sub-brand">Hệ sinh thái Hiểu</span></div>
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
        ${isLogin ? `<div style="text-align:center;margin-top:12px;"><span class="signout" id="af-forgot" style="cursor:pointer;font-size:13px;">Quên mật khẩu?</span></div>` : ''}
        ${err ? `<div class="error-box">${esc(err)}</div>` : ''}
        ${successMsg ? `<div class="hint-box">${esc(successMsg)}</div>` : ''}
      </div>
    </div>
  `;

  root.querySelectorAll('.auth-tab').forEach(el=>{
    el.onclick = ()=>{ AppState.authMode = el.getAttribute('data-mode'); renderAuthScreen(); };
  });
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

function renderSetNewPasswordScreen(err, successMsg){
  const root = document.getElementById('app');
  root.innerHTML = `
    <div class="auth-shell">
      <img src="assets/logo.png" class="auth-logo" alt="" onerror="this.style.display='none'">
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
    </div>
  `;
  root.querySelector('#af-new-pass').oninput = (e)=>{ authFields.newPass = e.target.value; };
  root.querySelector('#af-new-pass-confirm').oninput = (e)=>{ authFields.newPassConfirm = e.target.value; };
  root.querySelector('#af-submit-new-pass').onclick = async ()=>{
    const pass = root.querySelector('#af-new-pass').value;
    const confirmPass = root.querySelector('#af-new-pass-confirm').value;
    if(!pass || pass.length < 6){ renderSetNewPasswordScreen('Mật khẩu cần ít nhất 6 ký tự.'); return; }
    if(pass !== confirmPass){ renderSetNewPasswordScreen('Mật khẩu xác nhận không khớp — kiểm tra lại.'); return; }
    const btn = root.querySelector('#af-submit-new-pass');
    btn.disabled = true; btn.textContent = 'Đang lưu…';
    try{
      const { error } = await supabaseClient.auth.updateUser({ password: pass });
      if(error) throw error;
      authFields.newPass = ''; authFields.newPassConfirm = '';
      AppState.passwordRecoveryMode = false;
      AppState.route = currentRouteFromHash();
      await loadProfile();
      renderApp();
    } catch(e){
      renderSetNewPasswordScreen(e.message);
    }
  };
}

function renderApp(){
  // Chặn ngay trong renderApp (mọi đường gọi đều đi qua) — race SIGNED_IN/PASSWORD_RECOVERY, xem nhan-hieu.
  if(AppState.passwordRecoveryMode) return;
  if(!AppState.user){ renderAuthScreen(); return; }
  const root = document.getElementById('app');
  const isAdmin = AppState.profile && AppState.profile.role === 'admin';
  const visibleNav = NAV.filter(n=> !n.adminOnly || isAdmin);
  const bottomNav = NAV.filter(n=> !n.adminOnly && !n.noBottom);
  root.innerHTML = `
    <div class="app-layout">
      <div class="sidebar" id="sidebar">
        <div class="sidebar-brand" id="sidebar-brand-home" style="cursor:pointer;">
          <img src="assets/logo.png" class="brand-logo" alt="" onerror="this.style.display='none'">
          <div class="brand-text">DỰNG<br>VIDEO AI<small>Hệ sinh thái HIỂU</small></div>
        </div>
        <div class="sidebar-nav" id="sidebar-nav"></div>
        <div class="sidebar-foot">
          <div id="sidebar-foot-info" style="cursor:pointer;margin-bottom:6px;" title="Bấm để vào Cài đặt">${sidebarFootHtml()}</div>
          <span class="signout" id="signout-btn">Đăng xuất</span>
        </div>
      </div>
      <div class="main"><div class="main-inner" id="main-content"></div></div>
    </div>
    <div class="bottom-nav" id="bottom-nav">
      ${bottomNav.map(n=>`<div class="bn-item ${AppState.route===n.key?'active':''}" data-key="${n.key}"><span class="ic">${n.icon}</span>${esc(n.title)}${n.badgeKey?`<span class="bn-badge" data-badge="${n.badgeKey}" style="display:none">0</span>`:''}</div>`).join('')}
    </div>
  `;
  root.querySelector('#sidebar-nav').innerHTML = visibleNav.map((n,i)=>`
    <div class="sidebar-item ${AppState.route===n.key?'active':''}" data-key="${n.key}">
      <span class="num">${i+1}</span><span>${esc(n.title)}</span>${n.badgeKey?`<span class="badge" data-badge="${n.badgeKey}" style="display:none">0</span>`:''}
    </div>`).join('');
  root.querySelectorAll('.sidebar-item, .bn-item').forEach(el=>{ el.onclick = ()=>{ location.hash = el.getAttribute('data-key'); }; });
  root.querySelector('#sidebar-brand-home').onclick = ()=>{ location.hash = 'tong-quan'; };
  root.querySelector('#signout-btn').onclick = async ()=>{ await supabaseClient.auth.signOut(); };
  root.querySelector('#sidebar-foot-info').onclick = ()=>{ location.hash = 'cai-dat'; };
  refreshBadges();

  const content = root.querySelector('#main-content');
  const mod = window.Modules && window.Modules[AppState.route];
  if(mod && mod.render){
    mod.render(content, { supabase: supabaseClient, user: AppState.user, profile: AppState.profile });
  } else {
    content.innerHTML = `<div class="card">Module đang được xây dựng.</div>`;
  }
  window.scrollTo(0,0);
}

window.Modules = window.Modules || {};
document.addEventListener('DOMContentLoaded', initApp);
