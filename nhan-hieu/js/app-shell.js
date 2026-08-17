const NAV = [
  { key:'dinh-vi', title:'Định Vị' },
  { key:'sua-kenh', title:'Sửa Kênh' },
  { key:'chan-dung-kh', title:'Chân Dung KH' },
  { key:'giong-van', title:'Giọng Văn' },
  { key:'y-tuong', title:'Ý Tưởng' },
  { key:'dinh-dang-content', title:'12 Dạng Content' },
  { key:'kho-content', title:'Kho Content' },
  { key:'kho-hook', title:'Kho Hook' },
  { key:'viet-content', title:'Viết Content' },
  { key:'cham-diem-content', title:'Chấm Điểm Content' },
  { key:'cham-diem-hook', title:'Chấm Điểm Hook' },
  { key:'lich-dang', title:'Lịch Đăng Bài' },
  { key:'bai-viet-mau', title:'Bài Viết Mẫu' },
  { key:'tao-anh', title:'Tạo Ảnh Thương Hiệu' },
  { key:'tro-giup', title:'Hỏi & Trợ Giúp' },
];

const AppState = { user:null, profile:null, route:'dinh-vi', authMode:'login' };

function currentRouteFromHash(){
  const h = (location.hash || '').replace('#','');
  return NAV.some(n=>n.key===h) ? h : 'dinh-vi';
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
      AppState.user = session.user;
      loadProfile().then(renderApp);
    } else if(event === 'SIGNED_OUT'){
      AppState.user = null;
      AppState.profile = null;
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

function renderAuthScreen(err){
  const root = document.getElementById('app');
  const isLogin = AppState.authMode === 'login';
  root.innerHTML = `
    <div class="auth-shell">
      <h1>XÂY NHÂN HIỆU</h1>
      <div class="sub">Định vị · Sửa kênh · Ý tưởng · Viết content · Lịch đăng — hệ sinh thái HIỂU KÊNH</div>
      <div class="auth-tabs">
        <div class="auth-tab ${isLogin?'active':''}" data-mode="login">Đăng nhập</div>
        <div class="auth-tab ${!isLogin?'active':''}" data-mode="signup">Đăng ký</div>
      </div>
      <div class="card">
        ${!isLogin ? `<label>Họ tên</label><input id="af-name" type="text" placeholder="Tên của bạn">` : ''}
        <label>Email</label>
        <input id="af-email" type="email" placeholder="ban@email.com">
        <label>Mật khẩu</label>
        <input id="af-pass" type="password" placeholder="Ít nhất 6 ký tự">
        <button class="btn btn-full" id="af-submit">${isLogin?'Đăng nhập':'Tạo tài khoản'}</button>
        ${err ? `<div class="error-box">${esc(err)}</div>` : ''}
        ${!isLogin ? `<div class="hint-box">Sau khi đăng ký, kiểm tra email để xác nhận tài khoản (nếu được bật) rồi quay lại đăng nhập.</div>` : ''}
      </div>
    </div>
  `;

  root.querySelectorAll('.auth-tab').forEach(el=>{
    el.onclick = ()=>{ AppState.authMode = el.getAttribute('data-mode'); renderAuthScreen(); };
  });

  root.querySelector('#af-submit').onclick = async ()=>{
    const email = root.querySelector('#af-email').value.trim();
    const pass = root.querySelector('#af-pass').value;
    const btn = root.querySelector('#af-submit');
    btn.disabled = true; btn.textContent = 'Đang xử lý…';
    try{
      if(isLogin){
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password: pass });
        if(error) throw error;
      } else {
        const full_name = root.querySelector('#af-name').value.trim();
        const { error } = await supabaseClient.auth.signUp({ email, password: pass, options:{ data:{ full_name } } });
        if(error) throw error;
      }
    } catch(e){
      renderAuthScreen(e.message);
    }
  };
}

function renderApp(){
  const root = document.getElementById('app');
  root.innerHTML = `
    <div class="app-layout">
      <div class="sidebar">
        <div class="sidebar-brand">XÂY NHÂN HIỆU<small>Hệ sinh thái HIỂU KÊNH</small></div>
        <div class="sidebar-nav" id="sidebar-nav"></div>
        <div class="sidebar-foot">
          ${esc((AppState.user && AppState.user.email) || '')}<br>
          <span class="signout" id="signout-btn">Đăng xuất</span>
        </div>
      </div>
      <div class="main"><div class="main-inner" id="main-content"></div></div>
    </div>
  `;

  const nav = root.querySelector('#sidebar-nav');
  nav.innerHTML = NAV.map((n,i)=>`
    <div class="sidebar-item ${AppState.route===n.key?'active':''}" data-key="${n.key}">
      <span class="num">${i+1}</span><span>${esc(n.title)}</span>
    </div>
  `).join('');
  nav.querySelectorAll('.sidebar-item').forEach(el=>{
    el.onclick = ()=>{ location.hash = el.getAttribute('data-key'); };
  });

  root.querySelector('#signout-btn').onclick = async ()=>{ await supabaseClient.auth.signOut(); };

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
