// Sản Phẩm Số — shell: đăng nhập, kiểm tra quyền (can_sell_products), điều hướng qua location.hash,
// giống tinh thần app-shell.js của nhan-hieu nhưng gọn hơn nhiều.
//
// Cấu trúc khung app (chốt với Quỳnh 2026-08-25): "Trang chủ" vào qua bấm logo (ẩn khỏi tab, giống
// 'trang-chu' hidden ở nhan-hieu); 2 tab chính "✨ Sản Phẩm Số" (hub) và "🛒 Sản phẩm của tôi". Hub
// liệt kê 6 mục con (chon-loai/tao-ai/tao-ebook/tao-landing-page/tao-template/nghien-cuu-thi-truong)
// — các mục con này KHÔNG hiện trong tab bar, chỉ vào được qua bấm card trong hub hoặc quay lại từ
// màn con, nhưng khi đang ở màn con vẫn tô sáng đúng tab "✨ Sản Phẩm Số" (xem activeTabKey).

window.SanPhamSoScreens = window.SanPhamSoScreens || {}; // mỗi file màn tự đăng ký vào đây

const NAV_TABS = [
  { key: 'san-pham-so-hub', title: '✨ Sản Phẩm Số' },
  { key: 'san-pham', title: '🛒 Sản phẩm của tôi' },
];
// Mọi route con thuộc hub "Sản Phẩm Số" — vẫn tô sáng tab hub dù đang ở màn con nào trong nhóm này.
const HUB_CHILD_ROUTES = ['san-pham-so-hub', 'tao-ai', 'chon-loai', 'tao-ebook', 'tao-landing-page', 'tao-template', 'nghien-cuu-thi-truong'];
let currentRoute = 'san-pham-so-hub';

function currentRouteFromHash() {
  const h = (location.hash || '').replace('#', '');
  if (h === 'home') return 'home';
  if (window.SanPhamSoScreens && window.SanPhamSoScreens[h]) return h;
  return 'san-pham-so-hub';
}

function activeTabKey(route) {
  if (route === 'san-pham') return 'san-pham';
  if (HUB_CHILD_ROUTES.includes(route)) return 'san-pham-so-hub';
  return null; // 'home' không tô sáng tab nào
}

function topbarHtml(profile) {
  const active = activeTabKey(currentRoute);
  return `
    <div class="topbar">
      <h1 id="sps-logo-btn" style="cursor:pointer;">🛒 Sản Phẩm Số</h1>
      <span class="signout" id="signout-btn">${esc((profile && profile.full_name) || '')} — Đăng xuất</span>
    </div>
    <div class="tabs">
      ${NAV_TABS.map(r => `<span class="tab ${active === r.key ? 'active' : ''}" data-route="${r.key}">${esc(r.title)}</span>`).join('')}
    </div>
  `;
}
function bindTopbar() {
  const btn = document.getElementById('signout-btn');
  if (btn) btn.onclick = async () => { await supabaseClient.auth.signOut(); };
  const logo = document.getElementById('sps-logo-btn');
  if (logo) logo.onclick = () => { location.hash = 'home'; };
  document.querySelectorAll('[data-route]').forEach(el => {
    el.onclick = () => { location.hash = el.getAttribute('data-route'); };
  });
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

function renderNotEnabled(profile) {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="wrap" style="max-width:460px;">
      ${topbarHtml(profile)}
      <div class="card">Tài khoản của bạn chưa được bật tính năng bán Sản Phẩm Số. Liên hệ để được hỗ trợ.</div>
    </div>
  `;
  bindTopbar();
}

function renderShell(profile) {
  currentRoute = currentRouteFromHash();
  const app = document.getElementById('app');
  app.innerHTML = `<div class="wrap">${topbarHtml(profile)}<div id="sps-body"></div></div>`;
  bindTopbar();
  const bodyEl = document.getElementById('sps-body');
  const screen = window.SanPhamSoScreens[currentRoute];
  if (screen) screen(bodyEl, profile);
  else bodyEl.innerHTML = `<div class="card">Màn đang được xây dựng.</div>`;
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
  const { data: profile } = await supabaseClient.from('profiles').select('id,full_name,can_sell_products').eq('id', currentUser.id).maybeSingle();
  if (!profile || !profile.can_sell_products) { renderNotEnabled(profile); return; }
  currentProfile = profile;
  renderShell(profile);
}

supabaseClient.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') { currentUser = null; currentProfile = null; renderLogin(); }
});

boot();
