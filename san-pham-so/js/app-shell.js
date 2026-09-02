// Sản Phẩm Số — shell: đăng nhập, điều hướng qua location.hash. Mở cho MỌI tài khoản Xây Nhân Hiệu
// đã đăng nhập (bỏ cổng allowlist can_sell_products theo yêu cầu Quỳnh 2026-08-25 — chặn/mở qua SQL
// tay gây phiền, không cần allowlist nữa).
// Y HỆT khung nhan-hieu/js/app-shell.js (theo yêu cầu Quỳnh 2026-08-25): sidebar cố định bên trái,
// danh sách mục PHẲNG có đánh số (không phân nhóm/hub), sidebar-foot có tên + đăng xuất, sập thành
// ngăn kéo (drawer) trên di động qua nút ☰. Dùng lại nguyên CSS class .app-layout/.sidebar/... từ
// nhan-hieu/style.css (đã copy sang san-pham-so/app.css).

window.SanPhamSoScreens = window.SanPhamSoScreens || {}; // mỗi file màn tự đăng ký vào đây

const NAV = [
  { key: 'home', title: 'Trang chủ', hidden: true }, // không hiện trong sidebar — vào qua bấm logo
  { key: 'tao-ai', title: '🧭 Tìm Sản Phẩm Phù Hợp' },
  { key: 'chon-loai', title: '🗂️ Chọn Loại Sản Phẩm Số' },
  { key: 'tao-template', title: '🎨 Tạo Template' },
  { key: 'ke-hoach-ra-mat', title: '🚀 Kế Hoạch Ra Mắt' },
  { key: 'tao-landing-page', title: '🖥️ Tạo Landing Page' },
  { key: 'san-pham', title: '🛒 Sản phẩm của tôi' },
];
let currentRoute = 'home';

function currentRouteFromHash() {
  const h = (location.hash || '').replace('#', '');
  return NAV.some(n => n.key === h) ? h : 'home';
}

function renderLogin(err) {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="wrap" style="max-width:400px;">
      <h1 style="text-align:center;">Sản Phẩm Số</h1>
      <div class="card">
        <label>Email</label>
        <input id="login-email" type="email" placeholder="ban@email.com">
        <label>Mật khẩu</label>
        <input id="login-pass" type="password" placeholder="Mật khẩu">
        <div class="btn-row" style="justify-content:center;">
          <button class="btn btn-full" id="login-btn">Đăng nhập</button>
        </div>
        ${err ? `<div class="error-box">${esc(err)}</div>` : ''}
        <div class="hint-box">Dùng đúng email/mật khẩu tài khoản Xây Nhân Hiệu — không cần tạo tài khoản mới ở đây.</div>
      </div>
    </div>
  `;
  const passEl = document.getElementById('login-pass');
  passEl.onkeydown = (e) => { if (e.key === 'Enter') document.getElementById('login-btn').click(); };
  document.getElementById('login-btn').onclick = async () => {
    const email = document.getElementById('login-email').value.trim();
    const pass = passEl.value;
    const btn = document.getElementById('login-btn');
    btn.disabled = true; btn.textContent = 'Đang đăng nhập…';
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password: pass });
    if (error) { renderLogin(error.message); return; }
    boot();
  };
}

function renderShell(profile) {
  currentRoute = currentRouteFromHash();
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="topbar-mobile">
      <span class="menu-toggle" id="menu-toggle-btn">☰</span>
      <span class="topbar-title">Sản Phẩm Số</span>
    </div>
    <div class="app-layout">
      <div class="sidebar-overlay" id="sidebar-overlay"></div>
      <div class="sidebar" id="sidebar">
        <div class="sidebar-brand" id="sidebar-brand-home">
          <div class="brand-text">🛒 SẢN PHẨM SỐ</div>
        </div>
        <div class="sidebar-nav" id="sidebar-nav"></div>
        <div class="sidebar-foot">
          <div style="margin-bottom:6px;">${esc((profile && profile.full_name) || '')}</div>
          <span class="signout" id="signout-btn">Đăng xuất</span>
        </div>
      </div>
      <div class="main"><div class="main-inner" id="main-content"></div></div>
    </div>
  `;

  const visibleNav = NAV.filter(n => !n.hidden);
  const nav = app.querySelector('#sidebar-nav');
  nav.innerHTML = visibleNav.map((n, i) => `
    <div class="sidebar-item ${currentRoute === n.key ? 'active' : ''}" data-key="${n.key}">
      <span class="num">${i + 1}</span><span>${esc(n.title)}</span>
    </div>
  `).join('');

  const sidebar = app.querySelector('#sidebar');
  const overlay = app.querySelector('#sidebar-overlay');
  const closeDrawer = () => { sidebar.classList.remove('open'); overlay.classList.remove('open'); };
  const menuBtn = app.querySelector('#menu-toggle-btn');
  if (menuBtn) menuBtn.onclick = () => { sidebar.classList.add('open'); overlay.classList.add('open'); };
  overlay.onclick = closeDrawer;
  app.querySelector('#sidebar-brand-home').onclick = () => { location.hash = 'home'; closeDrawer(); };

  nav.querySelectorAll('.sidebar-item').forEach(el => {
    el.onclick = () => { location.hash = el.getAttribute('data-key'); closeDrawer(); };
  });
  app.querySelector('#signout-btn').onclick = async () => { await supabaseClient.auth.signOut(); };

  const content = app.querySelector('#main-content');
  const screen = window.SanPhamSoScreens[currentRoute];
  if (screen) screen(content, profile);
  else content.innerHTML = `<div class="card">Màn đang được xây dựng.</div>`;
}

window.addEventListener('hashchange', () => {
  if (!currentUser) return;
  renderShell(currentProfile);
});

async function boot() {
  const app = document.getElementById('app');
  app.innerHTML = `<div class="wrap"><div class="loading">Đang tải…</div></div>`;
  const { data } = await supabaseClient.auth.getSession();
  if (!data.session) { renderLogin(); return; }
  currentUser = data.session.user;
  const { data: profile } = await supabaseClient.from('profiles').select('id,full_name').eq('id', currentUser.id).maybeSingle();
  currentProfile = profile;
  renderShell(profile);
}

supabaseClient.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') { currentUser = null; currentProfile = null; renderLogin(); }
});

boot();
