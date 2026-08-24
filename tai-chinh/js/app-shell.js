// Rút gọn từ nhan-hieu/js/app-shell.js — CHỈ giữ routing + đăng nhập/đăng ký Supabase Auth.
// Tên sản phẩm: "SỔ DÒNG TIỀN TÂM THỨC" (chốt 2026-08-21, đổi từ "SỔ DÒNG TIỀN" — mã nội bộ/kỹ
// thuật là KarmaFlow, không hiện trên UI) — đổi tên sau này chỉ cần sửa các chuỗi trong file này
// + index.html <title>/meta, không ảnh hưởng gì tới dữ liệu/kiến trúc.
//
// Bắt mã giới thiệu (?ref=...) CÀNG SỚM CÀNG TỐT, trước khi người dùng kịp rời trang landing —
// copy quy tắc từ nhan-hieu/js/app-shell.js. Key RIÊNG "tc_referred_by_ref_code" (khác
// "xnh_referred_by_ref_code" của nhan-hieu) vì 2 app cùng chia sẻ 1 domain/localStorage khi deploy
// qua hesinhthaihieu.com — không được lẫn link giới thiệu của app này với app kia. Ghi vào ĐÚNG cột
// profiles.referred_by_ref_code lúc đăng ký (tái dùng cột chung, xem schema_full.sql phần chương
// trình giới thiệu) — không ghi đè nếu đã có sẵn 1 mã khác, tôn trọng link giới thiệu ĐẦU TIÊN.
const TC_REF_STORAGE_KEY = 'tc_referred_by_ref_code';
(function captureReferralCode(){
  try {
    const m = /[?&]ref=([A-Za-z0-9]+)/.exec(location.search);
    if(m && !localStorage.getItem(TC_REF_STORAGE_KEY)) localStorage.setItem(TC_REF_STORAGE_KEY, m[1].toUpperCase());
  } catch(e){}
})();
//
// Thu phí (2026-08-23, theo yêu cầu chị Quỳnh; SỬA 2026-08-24 — bỏ hẳn 14 ngày dùng thử): freemium,
// KHÔNG phải all-or-nothing như nhan-hieu. Ghi Chép Hàng Ngày + Kiến Thức Nền Tảng luôn FREE mãi mãi
// (giữ thói quen ghi chép hàng ngày + marketing tự nhiên qua nội dung giáo dục). Chấm Điểm Nghiệp
// Tiền CŨNG free mãi mãi — cố ý dùng làm "mồi": cho làm bài chẩn đoán miễn phí (ra Điểm Nghiệp +
// khâu yếu nhất), rồi mời nâng cấp NGAY lúc vừa thấy kết quả, đúng lúc động lực cao nhất, thay vì
// phải chờ hết 14 ngày mới gặp màn khoá. 5 route còn lại trong PREMIUM_ROUTES khoá THẲNG (không có
// giai đoạn dùng thử nào) trừ khi tc_has_paid — xem hasActiveAccess()/renderApp() (TC_TRIAL_DAYS=0).
// Chưa có tài khoản thật nào dùng app lúc đổi quy tắc này nên không cần lo ai bị "cắt" quyền đang
// dùng — áp dụng ngay cho tất cả. KHÁC nhan-hieu: không có renderExpiredScreen chiếm toàn màn hình —
// sidebar vẫn dùng được bình thường, chỉ đúng route premium hiện màn nâng cấp.
const NAV = [
  { key:'trang-chu', title:'Trang chủ', hidden:true }, // không hiện trong sidebar (giống nhan-hieu) — 2026-08-24 góp ý Quỳnh, vào lại qua bấm logo/"SỔ DÒNG TIỀN TÂM THỨC" ở đầu sidebar (đã có sẵn #sidebar-brand-home)
  { key:'thiet-lap-nhanh', title:'Chấm Điểm Nghiệp Tiền' }, // KHÔNG premium — free mãi mãi, dùng làm bài chẩn đoán mồi trước khi mời nâng cấp (2026-08-24)
  { key:'kien-thuc', title:'Kiến Thức Nền Tảng' },
  { key:'tang-thuc', title:'Hạt Giống Phước - Nghiệp', premium:true },
  { key:'muc-tieu', title:'Mục Tiêu & Cam Kết', premium:true },
  { key:'ghi-chep', title:'Ghi Chép Hàng Ngày' },
  { key:'danh-muc', title:'Danh Mục', hidden:true }, // không hiện trong sidebar — vào qua link "Quản lý danh mục →" ở Ghi Chép Hàng Ngày/Ngân sách. KHÔNG premium (dù Ngân sách premium) vì Ghi Chép Hàng Ngày free cần danh mục hoạt động được ngay.
  { key:'tong-ket-tuan', title:'Tổng Kết Tuần', premium:true },
  { key:'tong-ket-thang', title:'Tổng Kết Tháng', premium:true },
  { key:'quan-ly-no', title:'Quản Lý Nợ', premium:true },
  { key:'nang-cap', title:'Nâng Cấp' }, // luôn vào được, kể cả đang còn hạn dùng thử — không phải premium
  { key:'tai-khoan', title:'Tài khoản', hidden:true }, // vào qua bấm email ở cuối sidebar, không hiện trong danh sách
  { key:'quan-tri', title:'Quản Trị', adminOnly:true }, // chỉ hiện khi profiles.role==='admin', xem renderApp()
];
const PREMIUM_ROUTES = new Set(NAV.filter(n=>n.premium).map(n=>n.key));
const TC_TRIAL_DAYS = 0; // 2026-08-24: bỏ hẳn dùng thử, xem comment NAV phía trên
const TC_LIFETIME_PRICE = 299000;
// Cùng 1 tài khoản ngân hàng thật với nhan-hieu (chị Quỳnh chỉ có 1 tài khoản) — VietQR/ref_code
// dùng chung cơ chế "SEVQR <ref_code>" nhưng số tiền 299.000đ là DUY NHẤT, không trùng bất kỳ gói
// nào của nhan-hieu (xem AMOUNT_TO_DAYS ở api/sepay-webhook.js) nên webhook phân biệt được đúng
// sản phẩm nào đang được thanh toán chỉ qua số tiền, không cần đổi định dạng ref_code.
const PAYMENT_BANK = { code:'vietinbank', account:'199339288888', accountName:'LE TU QUYNH' };

const AppState = { user:null, profile:null, route:'trang-chu', authMode:'login', latestAnnouncement:null };

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
    await Promise.all([loadProfile(), loadLatestAnnouncement()]);
    AppState.route = currentRouteFromHash();
    renderApp();
  } else {
    renderAuthScreen();
  }

  // Kiểm tra định kỳ thông báo tính năng mới — để người ĐANG MỞ SẴN app (không tải lại trang) cũng
  // thấy popup mà không cần tắt/mở lại app (giống cơ chế bên nhan-hieu/js/app-shell.js).
  setInterval(async ()=>{
    if(!AppState.user) return;
    await loadLatestAnnouncement();
    maybeShowFeatureAnnouncement();
  }, 3 * 60 * 1000);

  supabaseClient.auth.onAuthStateChange((event, session) => {
    if(event === 'SIGNED_IN' && session){
      // Supabase cũng bắn lại "SIGNED_IN" khi refresh token nền hoặc khi tab được focus lại — chỉ
      // render lại toàn bộ khi đây thực sự là 1 phiên đăng nhập MỚI (user id khác), không phải mỗi
      // lần bắn sự kiện, tránh xoá mất state tạm đang gõ dở ở module hiện tại.
      if(AppState.user && AppState.user.id === session.user.id) return;
      AppState.user = session.user;
      AppState.route = 'trang-chu';
      Promise.all([loadProfile(), loadLatestAnnouncement()]).then(()=>{
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
  // Set mốc dùng thử 14 ngày ở LẦN ĐẦU vào app tai-chinh — RPC tự bỏ qua nếu đã set rồi (idempotent),
  // không reset lại đồng hồ đếm ngược mỗi lần load profile.
  if(AppState.profile && !AppState.profile.tc_trial_started_at){
    await supabaseClient.rpc('start_tc_trial');
    const { data: refreshed } = await supabaseClient.from('profiles').select('*').eq('id', AppState.user.id).maybeSingle();
    if(refreshed) AppState.profile = refreshed;
  }
}

function tcTrialDaysLeft(){
  const p = AppState.profile;
  if(!p || !p.tc_trial_started_at) return TC_TRIAL_DAYS;
  const elapsedDays = (Date.now() - new Date(p.tc_trial_started_at).getTime()) / 86400000;
  return Math.max(0, Math.ceil(TC_TRIAL_DAYS - elapsedDays));
}
function hasActiveAccess(){
  const p = AppState.profile;
  if(p && p.role === 'admin') return true;
  if(p && p.tc_has_paid) return true;
  return tcTrialDaysLeft() > 0;
}

// Thông báo tính năng mới — chỉ lấy 1 dòng MỚI NHẤT, so với profiles.tc_last_seen_announcement_id
// để quyết định có hiện banner hay không (áp dụng quy tắc bên nhan-hieu/js/app-shell.js, bảng riêng
// tc_feature_announcements + cột riêng tc_last_seen_announcement_id — xem schema_full.sql).
async function loadLatestAnnouncement(){
  if(!AppState.user) return;
  const { data } = await supabaseClient.from('tc_feature_announcements').select('*').order('created_at', { ascending:false }).limit(1).maybeSingle();
  AppState.latestAnnouncement = data || null;
}
function maybeShowFeatureAnnouncement(){
  const ann = AppState.latestAnnouncement;
  const annUnseen = ann && (!AppState.profile || AppState.profile.tc_last_seen_announcement_id !== ann.id);
  if(window.startFeatureAnnouncement && annUnseen){
    window.startFeatureAnnouncement(ann, async ()=>{
      if(AppState.profile) AppState.profile.tc_last_seen_announcement_id = ann.id;
      // RPC, không .update() thẳng — RLS đã khoá user tự update profiles (xem schema_full.sql).
      await supabaseClient.rpc('mark_tc_announcement_seen', { ann_id: ann.id });
    });
  }
}

let authFields = { name:'', email:'', pass:'', passConfirm:'' };

function renderAuthScreen(err, successMsg){
  const root = document.getElementById('app');
  const isLogin = AppState.authMode === 'login';
  root.innerHTML = `
    <div class="auth-shell">
      <img src="assets/logo-hieu-hanh.png" class="auth-logo" alt="" onerror="this.style.display='none'">
      <h1>SỔ DÒNG TIỀN TÂM THỨC</h1>
      <div class="sub">Tâm an với tiền<br>Nợ nhẹ dần mỗi tháng<br>Tài sản ròng lớn lên<br><span class="sub-brand">Hệ sinh thái Hiểu - Hiểu Hạnh</span></div>
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
        let referredByRefCode = null;
        try { referredByRefCode = localStorage.getItem(TC_REF_STORAGE_KEY) || null; } catch(e){}
        const { data, error } = await supabaseClient.auth.signUp({ email, password: pass, options:{ data:{ full_name, referred_by_ref_code: referredByRefCode } } });
        if(error) throw error;
        try { localStorage.removeItem(TC_REF_STORAGE_KEY); } catch(e){}
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
      <span class="topbar-title">SỔ DÒNG TIỀN TÂM THỨC</span>
    </div>
    <div class="app-layout">
      <div class="sidebar-overlay" id="sidebar-overlay"></div>
      <div class="sidebar" id="sidebar">
        <div class="sidebar-brand" id="sidebar-brand-home" style="cursor:pointer;">
          <img src="assets/logo-hieu-hanh.png" class="brand-logo" alt="" onerror="this.style.display='none'">
          <div class="brand-text">SỔ DÒNG TIỀN<br>TÂM THỨC<small>Hệ sinh thái HIỂU<br>HIỂU HẠNH</small></div>
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
  const canAccess = hasActiveAccess();
  const visibleNav = NAV.filter(n=> !n.hidden && (!n.adminOnly || isAdmin));
  const nav = root.querySelector('#sidebar-nav');
  nav.innerHTML = visibleNav.map((n,i)=>{
    const locked = n.premium && !canAccess;
    return `
    <div class="sidebar-item ${AppState.route===n.key?'active':''}" data-key="${n.key}">
      <span class="num">${i+1}</span><span>${esc(n.title)}</span>${locked?' <span title="Cần nâng cấp">🔒</span>':''}
    </div>
  `;}).join('');

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

  if(window.startOnboardingTour && AppState.user){
    const alreadySeen = !!(AppState.profile && AppState.profile.tc_onboarding_seen);
    window.startOnboardingTour(AppState.user.id, alreadySeen, async ()=>{
      const { error } = await supabaseClient.rpc('mark_tc_onboarding_seen');
      if(!error && AppState.profile) AppState.profile.tc_onboarding_seen = true;
      // Hỏi cài app NGAY SAU KHI tour kết thúc — đúng lúc hợp lý để rủ cài thay vì hỏi giữa chừng
      // (giống nhan-hieu/js/app-shell.js) — thay cho setTimeout tạm trước đây.
      if(window.maybeShowInstallPrompt) window.maybeShowInstallPrompt();
    });
  }

  maybeShowFeatureAnnouncement();

  const content = root.querySelector('#main-content');
  if(PREMIUM_ROUTES.has(AppState.route) && !canAccess){
    renderUpgradeScreen(content);
    return;
  }
  const mod = window.Modules && window.Modules[AppState.route];
  if(mod && mod.render){
    mod.render(content, { supabase: supabaseClient, user: AppState.user, profile: AppState.profile });
  } else {
    content.innerHTML = `<div class="card">Module đang được xây dựng.</div>`;
  }
}

// 3 khối lợi ích CỤ THỂ — góp ý Quỳnh 2026-08-24: "để ngay STK, người ta bị sợ không? người ta
// chưa biết tính năng app". Đưa thẻ QR/chuyển khoản đi thẳng vào mặt người chưa hiểu gì về app dễ
// giống lừa đảo/quá vội — đặt khối lợi ích này NGAY TRƯỚC tcPaymentCardHtml() (cùng 1 trang, không
// tách riêng landing page — thêm 1 bước bấm chỉ làm rơi mất người ĐÃ sẵn sàng trả tiền) để lập lòng
// tin bằng giá trị thật trước khi hỏi tiền. Đúng 3 gạch đầu dòng Quỳnh chốt: thanh khoản nợ/gia
// tăng tài sản/kiểm soát tài chính — nói bằng KẾT QUẢ cụ thể, không phải tên module (module tên ẩn
// dụ tâm thức, người mới chưa hiểu "Hạt Giống Phước - Nghiệp" nghĩa là gì).
function tcBenefitsHtml(){
  const BENEFITS = [
    { icon:'💳', title:'Thanh khoản nợ nhanh hơn, đỡ tốn lãi', text:'Quản Lý Nợ tự tính chiến lược Snowball/Avalanche — biết chính xác nên dồn tiền trả khoản nào trước để tiết kiệm tiền lãi nhiều nhất, không phải đoán mò.' },
    { icon:'📈', title:'Tài sản ròng tăng đều, nhìn thấy rõ từng tháng', text:'Tổng Kết Tháng tự vẽ biểu đồ Tài Sản Ròng qua từng tháng — biết ngay đang giàu lên hay đang lùi, không phải chỉ cảm giác chung chung.' },
    { icon:'🎯', title:'Kiểm soát dòng tiền, không chỉ ghi cho có', text:'Mục Tiêu & Cam Kết đặt hạn mức từng danh mục TRƯỚC khi tiêu, Tổng Kết Tuần báo ngay lệch mục tiêu ở đâu — còn Hạt Giống Phước - Nghiệp giúp gỡ tận gốc niềm tin cũ khiến tiền cứ lặp lại đúng 1 vấn đề.' },
  ];
  return `
    <div style="margin-bottom:20px;">
      ${BENEFITS.map(b=>`
        <div style="display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--line);">
          <span style="font-size:20px;flex-shrink:0;">${b.icon}</span>
          <div>
            <div style="font-weight:700;font-size:14px;margin-bottom:3px;">${esc(b.title)}</div>
            <div style="font-size:13px;color:var(--ink-soft);line-height:1.55;">${esc(b.text)}</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// Tách riêng thẻ QR/thông tin chuyển khoản để dùng lại được ở CẢ màn khoá tự động (renderUpgradeScreen,
// hiện khi bấm vào route premium mà chưa có quyền) LẪN trang "Nâng Cấp" chủ động (module nang-cap.js,
// vào được bất cứ lúc nào kể cả đang còn hạn dùng thử) — giống pattern paymentCardHtml() bên
// nhan-hieu/js/app-shell.js, chỉ đơn giản hơn vì tai-chinh chỉ có ĐÚNG 1 gói (không cần chọn gói).
function tcPaymentCardHtml(){
  const p = AppState.profile;
  const refCode = p && p.ref_code;
  // VietinBank CHỈ báo biến động số dư về SePay nếu nội dung chuyển khoản bắt đầu bằng "SEVQR"
  // (yêu cầu riêng SePay cho VietinBank) — xem api/sepay-webhook.js.
  const transferContent = refCode ? `SEVQR ${refCode}` : null;
  const qrUrl = refCode
    ? `https://img.vietqr.io/image/${PAYMENT_BANK.code}-${PAYMENT_BANK.account}-compact2.png?amount=${TC_LIFETIME_PRICE}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(PAYMENT_BANK.accountName)}`
    : null;

  return `
    <div style="text-align:center;font-size:15px;font-weight:700;">${TC_LIFETIME_PRICE.toLocaleString('vi-VN')}đ — 1 lần duy nhất</div>
    <div style="text-align:center;font-size:12.5px;color:var(--ink-soft);margin-bottom:14px;">Chưa tới ${Math.ceil(TC_LIFETIME_PRICE/365/100)*100}đ/ngày nếu dùng đều trong năm đầu tiên</div>
    ${qrUrl ? `
      <div style="text-align:center;">
        <img src="${qrUrl}" alt="Mã VietQR" style="max-width:260px;width:100%;border-radius:12px;border:1px solid var(--line);">
        <div style="margin-top:8px;">
          <a href="${qrUrl}" download="vietqr-tai-chinh.png" target="_blank" rel="noopener" style="font-size:12.5px;color:var(--accent);font-weight:600;text-decoration:none;">📥 Tải ảnh mã QR về máy</a>
        </div>
      </div>
      <div style="margin-top:14px;font-size:13.5px;line-height:1.7;">
        <div><b>Ngân hàng:</b> Vietinbank</div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;"><b>Số tài khoản:</b> ${esc(PAYMENT_BANK.account)} <span class="btn-ghost btn btn-sm" style="padding:3px 10px;font-size:11.5px;" data-copy-value="${esc(PAYMENT_BANK.account)}">Copy</span></div>
        <div><b>Chủ tài khoản:</b> ${esc(PAYMENT_BANK.accountName)}</div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;"><b>Số tiền:</b> ${TC_LIFETIME_PRICE.toLocaleString('vi-VN')}đ <span class="btn-ghost btn btn-sm" style="padding:3px 10px;font-size:11.5px;" data-copy-value="${TC_LIFETIME_PRICE}">Copy</span></div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;"><b>Nội dung CK (bắt buộc giữ nguyên):</b> <span style="font-family:'IBM Plex Mono',monospace;background:var(--accent-soft);padding:2px 8px;border-radius:6px;">${esc(transferContent)}</span> <span class="btn-ghost btn btn-sm" style="padding:3px 10px;font-size:11.5px;" data-copy-value="${esc(transferContent)}">Copy</span></div>
      </div>
      <div class="hint-box" style="margin-top:14px;">Quét mã hoặc chuyển khoản đúng số tiền + giữ nguyên nội dung <b>${esc(transferContent)}</b> (bắt buộc có chữ SEVQR ở đầu) — hệ thống tự đối chiếu và mở khoá, không cần chờ ai xác nhận. Chuyển xong đợi 1-2 phút rồi bấm nút bên dưới.</div>
    ` : `
      <div class="error-box">Chưa có mã tài khoản để đối chiếu tự động. Nhắn email đăng ký (${esc((AppState.user&&AppState.user.email)||'')}) để được kích hoạt thủ công.</div>
    `}
    <div class="btn-row" style="margin-top:16px;justify-content:center;">
      <button class="btn-ghost btn" id="tc-reload-status-btn">Tôi đã chuyển khoản — tải lại trạng thái</button>
    </div>
  `;
}
function bindTcPaymentCard(root, onReload){
  root.querySelectorAll('[data-copy-value]').forEach(el=>{
    el.onclick = async ()=>{
      try{
        await navigator.clipboard.writeText(el.getAttribute('data-copy-value'));
        const old = el.textContent;
        el.textContent = 'Đã copy ✓';
        setTimeout(()=>{ el.textContent = old; }, 1500);
      } catch(e){}
    };
  });
  const reloadBtn = root.querySelector('#tc-reload-status-btn');
  if(reloadBtn) reloadBtn.onclick = async ()=>{ await loadProfile(); onReload(); };
}

// Khác nhan-hieu (renderExpiredScreen chiếm TOÀN màn hình, không cho dùng gì nữa) — ở đây CHỈ đúng
// route premium bị khoá mới hiện màn này, sidebar/Ghi Chép/Kiến Thức vẫn dùng bình thường. Vẽ vào
// #main-content như 1 module bình thường, không thay root.innerHTML.
function renderUpgradeScreen(content){
  // Cá nhân hoá bằng khâu yếu nhất vừa đo được ở Chấm Điểm Nghiệp Tiền (window.TcLastWeakestArea,
  // xem thiet-lap-nhanh.js) — CHỈ tồn tại tạm trong session, không lưu DB (đúng nguyên tắc "Điểm
  // Nghiệp Tiền không lưu lại"). Đúng lúc động lực cao nhất (vừa thấy mình yếu ở đâu) thì gặp ngay
  // lời mời nâng cấp nhắm đúng vào đó, thay vì 1 câu chung chung không liên quan gì tới họ.
  const weakest = window.TcLastWeakestArea;
  content.innerHTML = `
    <div class="page-head">
      <h1>🔒 Tính năng trả phí</h1>
      ${weakest ? `<p>Bạn vừa làm Chấm Điểm Nghiệp Tiền và đang yếu nhất ở khâu <b>${esc(weakest.label)}</b> — ${esc(weakest.explain)}</p>` : ''}
      <p>Mở khoá TRỌN ĐỜI chỉ 1 lần, dùng mãi mãi — không phải trả lại theo tháng.</p>
    </div>
    <div class="card" style="max-width:460px;">
      ${tcBenefitsHtml()}
      ${tcPaymentCardHtml()}
    </div>
  `;
  bindTcPaymentCard(content, renderApp);
}

window.Modules = window.Modules || {};
document.addEventListener('DOMContentLoaded', initApp);
