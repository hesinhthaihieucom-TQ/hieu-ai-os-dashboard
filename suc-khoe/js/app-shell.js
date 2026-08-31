// Rút gọn từ tai-chinh/js/app-shell.js — CHỈ giữ routing + đăng nhập/đăng ký Supabase Auth + sidebar.
// Tên sản phẩm: "HIỂU ĐỂ KHOẺ MẠNH" (khớp tên app hiện có ở hieu-de-khoe-manh.vercel.app mà chị
// Quỳnh dùng làm ví dụ, 2026-08-26) — đây là BỘ KHUNG ban đầu, chưa có thanh toán/khoá tính năng như
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

const AppState = { user:null, profile:null, route:'trang-chu', authMode:'login' };

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
    await loadProfile();
    AppState.route = currentRouteFromHash();
    renderApp();
  } else {
    renderAuthScreen();
  }

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
  // Đánh dấu lần đầu vào app suc-khoe — RPC vì user không .update() thẳng profiles được (RLS đã
  // khoá, xem supabase/schema_full.sql). Dùng để Quản Trị > Thành viên lọc đúng người liên quan tới
  // app này (không lẫn người chỉ dùng nhan-hieu/tai-chinh).
  if(AppState.profile && !AppState.profile.sk_first_visited_at){
    await supabaseClient.rpc('mark_sk_first_visit');
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
      <img src="assets/logo-hieu-manh.png" class="auth-logo" alt="" onerror="this.style.display='none'">
      <h1>HIỂU ĐỂ KHOẺ MẠNH</h1>
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
  if(!AppState.user){ renderAuthScreen(); return; }
  const root = document.getElementById('app');
  root.innerHTML = `
    <div class="topbar-mobile">
      <span class="menu-toggle" id="menu-toggle-btn">☰</span>
      <span class="topbar-title">HIỂU ĐỂ KHOẺ MẠNH</span>
    </div>
    <div class="app-layout">
      <div class="sidebar-overlay" id="sidebar-overlay"></div>
      <div class="sidebar" id="sidebar">
        <div class="sidebar-brand" id="sidebar-brand-home" style="cursor:pointer;">
          <img src="assets/logo-hieu-manh.png" class="brand-logo" alt="" onerror="this.style.display='none'">
          <div class="brand-text">HIỂU ĐỂ<br>KHOẺ MẠNH<small>Hệ sinh thái HIỂU</small></div>
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
