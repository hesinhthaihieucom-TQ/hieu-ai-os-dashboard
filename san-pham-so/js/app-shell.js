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
  { key: 'nang-cap', title: '🔥 Nâng cấp / Mua gói' },
  { key: 'tai-khoan', title: 'Tài khoản', hidden: true }, // không hiện trong sidebar — vào qua bấm tên ở cuối sidebar
];
let currentRoute = 'home';

function currentRouteFromHash() {
  const h = (location.hash || '').replace('#', '');
  return NAV.some(n => n.key === h) ? h : 'home';
}

// ============================================================
// Gói riêng Sản Phẩm Số (2026-09-01) — TÁCH BIỆT hoàn toàn khỏi Xây Nhân Hiệu (dù đăng nhập chung 1
// tài khoản), xem api/_lib/sps-ai-quota.js + schema_san_pham_so.sql. Chỉ 1 gói: 599.000đ/tháng.
// PAYMENT_BANK/mẫu QR/quy ước "SEVQR <mã>" port nguyên xi từ nhan-hieu/js/app-shell.js — cùng tài
// khoản ngân hàng của Quỳnh dùng chung cho mọi sản phẩm trong hệ sinh thái này.
// ============================================================
const PAYMENT_BANK = { code: 'vietinbank', account: '199339288888', accountName: 'LE TU QUYNH' };
const SPS_TRIAL_AI_LIMIT = 20;
const SPS_PAID_MONTHLY_AI_LIMIT = 240;
const SPS_PLAN = { label: '1 tháng', amount: 599000, days: 30 };

function spsPaidMonthlyUsage(p) {
  const sameMonth = p.sps_paid_ai_month === currentCycleKey(p.created_at);
  const used = sameMonth ? (p.sps_paid_ai_uses || 0) : 0;
  const bonus = sameMonth ? (p.sps_paid_ai_bonus || 0) : 0;
  return { used, limit: SPS_PAID_MONTHLY_AI_LIMIT + bonus };
}

function spsQuotaHint() {
  const p = currentProfile;
  if (!p) return '';
  if (p.role === 'admin') {
    const used = p.sps_has_paid ? spsPaidMonthlyUsage(p).used : (p.sps_trial_ai_uses || 0);
    const period = p.sps_has_paid ? 'tháng này' : 'trọn đời';
    return `<span style="color:#8A8F82;font-size:12.5px;">🔥 Đã dùng ${used} lượt SPS (${period}) — không giới hạn</span>`;
  }
  if (p.sps_has_paid) {
    const { used, limit } = spsPaidMonthlyUsage(p);
    const remaining = Math.max(0, limit - used);
    const color = remaining <= 10 ? 'var(--danger)' : '#9CA396';
    return `<span style="color:${color};font-size:12.5px;">✨ Còn ${remaining}/${limit} lượt tháng này</span>`;
  }
  const trialLimit = p.sps_trial_ai_limit || SPS_TRIAL_AI_LIMIT;
  const remaining = Math.max(0, trialLimit - (p.sps_trial_ai_uses || 0));
  const color = remaining <= 3 ? 'var(--danger)' : '#9CA396';
  return `<span style="color:${color};font-size:12.5px;">🎁 Còn ${remaining}/${trialLimit} lượt dùng thử</span>`;
}

function spsHasActiveAccess() {
  const p = currentProfile;
  if (p && p.role === 'admin') return true;
  if (!p) return false;
  return !!(p.sps_has_paid && p.sps_access_until && new Date(p.sps_access_until).getTime() > Date.now());
}

// get_or_create_sps_ref_code (RPC, schema_san_pham_so.sql) sinh mã LAZY lần đầu vào "Nâng cấp" —
// cache lại trong currentProfile để không phải gọi lại RPC mỗi lần vẽ màn.
async function ensureSpsRefCode() {
  if (currentProfile && currentProfile.sps_ref_code) return currentProfile.sps_ref_code;
  try {
    const { data, error } = await supabaseClient.rpc('get_or_create_sps_ref_code');
    if (error) return null;
    if (currentProfile) currentProfile.sps_ref_code = data;
    return data;
  } catch (e) {
    return null;
  }
}

// Card chọn gói + QR — tách riêng để dùng ở san-pham-so/js/nang-cap.js. Quy ước "SEVQR <mã>" BẮT
// BUỘC — VietinBank chỉ báo biến động số dư về SePay nếu nội dung chuyển khoản bắt đầu bằng "SEVQR".
function spsPaymentCardHtml(refCode) {
  const plan = SPS_PLAN;
  const transferContent = refCode ? `SEVQR ${refCode}` : null;
  const qrUrl = refCode
    ? `https://img.vietqr.io/image/${PAYMENT_BANK.code}-${PAYMENT_BANK.account}-compact2.png?amount=${plan.amount}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(PAYMENT_BANK.accountName)}`
    : null;
  return `
    <div class="card">
      <h2 style="font-size:18px;">Gói Sản Phẩm Số — ${esc(plan.label)}</h2>
      <div style="font-size:24px;font-weight:700;color:var(--accent);margin:6px 0 16px;">${plan.amount.toLocaleString('vi-VN')}đ<span style="font-size:13px;color:var(--ink-soft);font-weight:400;"> /${esc(plan.label)}</span></div>
      ${qrUrl ? `
        <img src="${qrUrl}" style="max-width:260px;width:100%;display:block;margin:0 auto 16px;">
        <div style="font-size:13.5px;line-height:2;">
          <div>Ngân hàng: <b>VietinBank</b></div>
          <div>Số tài khoản: <b>${esc(PAYMENT_BANK.account)}</b> <span class="btn-ghost btn btn-sm" data-copy-value="${esc(PAYMENT_BANK.account)}">Copy</span></div>
          <div>Chủ tài khoản: <b>${esc(PAYMENT_BANK.accountName)}</b></div>
          <div>Số tiền: <b>${plan.amount.toLocaleString('vi-VN')}đ</b></div>
          <div>Nội dung CK: <b>${esc(transferContent)}</b> <span class="btn-ghost btn btn-sm" data-copy-value="${esc(transferContent)}">Copy</span></div>
        </div>
        <div class="hint-box" style="margin-top:16px;">Quét mã hoặc chuyển khoản đúng số tiền + giữ nguyên nội dung chuyển khoản — hệ thống tự đối chiếu và kích hoạt, không cần làm gì thêm. Chuyển xong đợi 1-2 phút rồi tải lại trang.</div>
      ` : `<div class="loading"><div class="spinner"></div></div>`}
    </div>
  `;
}

function bindSpsPaymentCard(container) {
  container.querySelectorAll('[data-copy-value]').forEach(el => {
    el.onclick = () => {
      navigator.clipboard.writeText(el.getAttribute('data-copy-value'));
      const orig = el.textContent;
      el.textContent = 'Đã copy ✓';
      setTimeout(() => { el.textContent = orig; }, 1200);
    };
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
          <div id="sidebar-foot-info" style="cursor:pointer;" title="Bấm để vào Tài khoản">
            <div style="margin-bottom:6px;">${esc((profile && profile.full_name) || '')}</div>
            ${spsQuotaHint()}
          </div>
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
  const footInfo = app.querySelector('#sidebar-foot-info');
  if (footInfo) footInfo.onclick = () => { location.hash = 'tai-khoan'; closeDrawer(); };

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
  // Cần thêm role/created_at/sps_* so với bản trước (chỉ id,full_name) — role để nhận diện admin
  // (không giới hạn lượt), created_at để tính đúng chu kỳ 30 ngày (currentCycleKey), sps_* để hiện
  // đúng số lượt còn lại + trạng thái gói riêng của Sản Phẩm Số (xem spsQuotaHint()).
  const { data: profile } = await supabaseClient.from('profiles').select('id,full_name,role,created_at,sps_has_paid,sps_access_until,sps_trial_ai_uses,sps_trial_ai_limit,sps_paid_ai_uses,sps_paid_ai_month,sps_paid_ai_bonus,sps_ref_code').eq('id', currentUser.id).maybeSingle();
  currentProfile = profile;
  renderShell(profile);
}

supabaseClient.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') { currentUser = null; currentProfile = null; renderLogin(); }
});

boot();
