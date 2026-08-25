// Sản Phẩm Số — shell: đăng nhập, kiểm tra quyền (can_sell_products), 2 tab (Sản phẩm của tôi /
// Tạo Sản Phẩm Bằng AI) điều hướng qua location.hash, giống tinh thần app-shell.js của nhan-hieu
// nhưng gọn hơn nhiều (chỉ 2 màn, không có sidebar/NAV phức tạp).

window.SanPhamSoScreens = window.SanPhamSoScreens || {}; // mỗi file màn tự đăng ký vào đây

const ROUTES = [
  { key: 'san-pham', title: '🛒 Sản phẩm của tôi' },
  { key: 'tao-ai', title: '✨ Tạo Sản Phẩm Bằng AI' },
];
let currentRoute = 'san-pham';

function currentRouteFromHash() {
  const h = (location.hash || '').replace('#', '');
  return ROUTES.some(r => r.key === h) ? h : 'san-pham';
}

function topbarHtml(profile) {
  return `
    <div class="topbar">
      <h1>🛒 Sản Phẩm Số</h1>
      <span class="signout" id="signout-btn">${esc((profile && profile.full_name) || '')} — Đăng xuất</span>
    </div>
    <div class="tabs">
      ${ROUTES.map(r => `<span class="tab ${currentRoute === r.key ? 'active' : ''}" data-route="${r.key}">${esc(r.title)}</span>`).join('')}
    </div>
  `;
}
function bindTopbar() {
  const btn = document.getElementById('signout-btn');
  if (btn) btn.onclick = async () => { await supabaseClient.auth.signOut(); };
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
