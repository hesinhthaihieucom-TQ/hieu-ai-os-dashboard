const NAV = [
  { key:'dinh-vi', title:'Định Vị' },
  { key:'sua-kenh', title:'Sửa Kênh' },
  { key:'dinh-dang-content', title:'Dạng Content' },
  { key:'kho-content', title:'Kho Content' },
  { key:'kho-hook', title:'Kho Hook' },
  { key:'viet-content', title:'Viết Content' },
  { key:'tai-che-viral', title:'Tái Chế Content Viral' },
  { key:'cham-diem-content', title:'Chấm Điểm Content' },
  { key:'cham-diem-hook', title:'Chấm Điểm Hook' },
  { key:'lich-dang', title:'Lịch Đăng Bài' },
  { key:'day-bai', title:'Đẩy Bài & CTA Comment' },
  { key:'tao-anh', title:'Tạo Ảnh Thương Hiệu' },
  { key:'tro-giup', title:'Hỏi & Trợ Giúp' },
  { key:'quan-tri', title:'Quản trị', adminOnly:true },
];

const AppState = { user:null, profile:null, route:'dinh-vi', authMode:'login' };

const PAYMENT_BANK = { code:'vietinbank', account:'199339288888', accountName:'LE TU QUYNH' };
// Giá thường và giá học viên (đã học khoá Xây Nhân Hiệu) tách 2 bảng riêng thay vì gộp chung 1
// danh sách dài — is_student được hỏi ngay lúc đăng ký (xem renderAuthScreen) nên tới màn thanh
// toán chỉ cần hiện đúng 1 bảng phù hợp, không bắt người dùng tự lọc giữa 2 loại giá.
// LƯU Ý QUAN TRỌNG: số tiền mỗi gói (ở cả 2 bảng) phải KHÁC NHAU TUYỆT ĐỐI — webhook SePay chỉ
// nhận diện gói qua đúng số tiền chuyển khoản, trùng số tiền giữa 2 gói sẽ cộng sai số ngày.
const REGULAR_PLANS = [
  { key:'1m', label:'1 tháng', amount:499000 },
  { key:'6m', label:'6 tháng', amount:2390000, note:'~398.000đ/tháng — tiết kiệm 604.000đ (~20%) so với mua 6 tháng theo giá lẻ 1 tháng', recommended:true },
  { key:'12m', label:'12 tháng', amount:3990000, note:'~332.500đ/tháng — tiết kiệm 1.998.000đ (~33%) so với mua 12 tháng theo giá lẻ 1 tháng — giữ giá lâu nhất trước khi web tăng giá', recommended:true },
];
// Gói 6/12 tháng học viên = giảm đều 20% so với giá thường tương ứng, áp dụng LÂU DÀI (không phải
// ưu đãi tạm thời). Riêng gói 1 tháng chỉ giảm giá (399.200đ) cho ĐÚNG THÁNG ĐẦU TIÊN — từ tháng
// thứ 2 trở đi nếu vẫn mua theo tháng thì về giá thường 499.000đ (xem buildStudentPlans + cờ
// first_month_discount_used) — khuyến khích chọn gói 6/12 tháng để giữ giá tốt lâu hơn.
const STUDENT_PLANS_LONG = [
  { key:'6m_hv', label:'6 tháng', amount:1912000, note:'~319.000đ/tháng — rẻ hơn 1.082.000đ (~36%) so với mua lẻ từng tháng theo giá thường (499.000đ × 6 = 2.994.000đ).', recommended:true },
  { key:'12m_hv', label:'12 tháng', amount:3192000, note:'~266.000đ/tháng — rẻ hơn 2.796.000đ (~47%) so với mua lẻ từng tháng theo giá thường (499.000đ × 12 = 5.988.000đ) — giữ giá lâu nhất trước khi web tăng giá.', recommended:true },
];
function buildStudentPlans(profile){
  const usedFirstMonth = !!(profile && profile.first_month_discount_used);
  const oneMonth = usedFirstMonth
    ? { key:'1m_hv', label:'1 tháng', amount:499000, note:'Đã dùng ưu đãi tháng đầu — gói 1 tháng từ giờ theo giá thường. Chọn gói 6/12 tháng bên dưới để có giá học viên.' }
    : { key:'1m_hv', label:'1 tháng (ưu đãi tháng đầu)', amount:399200, note:'Chỉ áp dụng cho đúng tháng đầu tiên — từ tháng thứ 2 nếu vẫn mua theo tháng sẽ về giá thường 499.000đ (chọn gói 6/12 tháng bên dưới để giữ giá học viên lâu hơn).' };
  return [oneMonth, ...STUDENT_PLANS_LONG];
}
function currentPaymentPlans(){
  return (AppState.profile && AppState.profile.is_student) ? buildStudentPlans(AppState.profile) : REGULAR_PLANS;
}
// Cách tính "rẻ hơn" KHÁC NHAU theo từng gói học viên:
// - Gói 1 tháng: so với giá thường CÙNG 1 tháng (499.000đ) — không hiện gì nếu đã hết ưu đãi
//   tháng đầu (giá bằng giá thường, không có gì để "rẻ hơn").
// - Gói 6/12 tháng: so với mua lẻ từng tháng theo giá thường (499.000đ x 6 hoặc x12) — vì đây là
//   khoản tiết kiệm THẬT SỰ nếu không mua trọn gói, gộp cả phần giảm học viên lẫn phần giảm theo
//   gói dài hạn, nên số tiền/% sẽ lớn hơn nhiều so với chỉ so với giá gói 6/12 tháng thường.
function planSavingsLabel(pl){
  const retailMonthly = REGULAR_PLANS.find(r => r.key === '1m').amount;
  if(pl.key === '1m_hv'){
    if(pl.amount >= retailMonthly) return '';
    const saved = retailMonthly - pl.amount;
    const pct = Math.round((saved / retailMonthly) * 100);
    return `rẻ hơn ${saved.toLocaleString('vi-VN')}đ (~${pct}%)`;
  }
  const months = pl.key === '6m_hv' ? 6 : pl.key === '12m_hv' ? 12 : null;
  if(!months) return '';
  const retailTotal = retailMonthly * months;
  const saved = retailTotal - pl.amount;
  const pct = Math.round((saved / retailTotal) * 100);
  return `tiết kiệm ${saved.toLocaleString('vi-VN')}đ (~${pct}%) so với mua lẻ`;
}
// Mặc định gợi ý gói 6 tháng thay vì gói 1 tháng — web sẽ còn cập nhật/mở rộng thêm (đặc biệt
// Kho Content và Kho Hook viral), lúc đó giá sẽ tăng, nên chọn gói dài ngay bây giờ để giữ được
// mức giá hiện tại lâu hơn. Key khác nhau giữa 2 bảng (6m vs 6m_hv) nên set lại đúng lúc render.
let selectedPaymentPlanKey = '6m';

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
      // Supabase cũng bắn lại "SIGNED_IN" khi refresh token nền hoặc khi tab được focus lại —
      // không phải chỉ lúc đăng nhập thật. Nếu render lại toàn bộ app mỗi lần đó, bất kỳ màn hình
      // nào đang có state tạm chưa lưu (ví dụ AI gợi ý lịch tuần vừa chạy xong) sẽ bị xoá sạch
      // ngay khi vừa hiện ra — nhìn như tính năng "không chạy". Chỉ render lại khi đây thực sự là
      // 1 phiên đăng nhập mới (user id khác với user đang có).
      if(AppState.user && AppState.user.id === session.user.id) return;
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

function hasActiveAccess(){
  const p = AppState.profile;
  if(p && p.role === 'admin') return true;
  if(!p || !p.access_until) return false;
  return new Date(p.access_until).getTime() > Date.now();
}

function renderExpiredScreen(){
  const root = document.getElementById('app');
  const p = AppState.profile;
  const hadAccessBefore = !!(p && p.access_until);
  const refCode = p && p.ref_code;
  const isStudent = !!(p && p.is_student);
  const plans = currentPaymentPlans();
  const plan = plans.find(pl => pl.key === selectedPaymentPlanKey) || plans.find(pl => pl.recommended) || plans[0];
  selectedPaymentPlanKey = plan.key; // đồng bộ lại key — 2 bảng giá (thường/học viên) dùng key khác nhau (vd 6m vs 6m_hv)

  const qrUrl = refCode
    ? `https://img.vietqr.io/image/${PAYMENT_BANK.code}-${PAYMENT_BANK.account}-compact2.png?amount=${plan.amount}&addInfo=${encodeURIComponent(refCode)}&accountName=${encodeURIComponent(PAYMENT_BANK.accountName)}`
    : null;

  root.innerHTML = `
    <div class="auth-shell" style="max-width:460px;">
      <img src="assets/logo-hieu-kenh-badge.svg" class="auth-logo" alt="" onerror="this.style.display='none'">
      <h1>${hadAccessBefore ? 'Gói dùng đã hết hạn' : 'Dùng thử 7 ngày đã kết thúc'}</h1>
      <div class="sub">${hadAccessBefore
        ? `Gói của bạn đã hết hạn ngày ${esc(new Date(p.access_until).toLocaleDateString('vi-VN'))}. Chuyển khoản để tiếp tục dùng ngay.`
        : 'Chuyển khoản theo đúng hướng dẫn bên dưới — hệ thống tự kích hoạt trong vài phút, không cần chờ ai xác nhận.'}</div>

      <div class="card">
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:8px;">${isStudent ? '🎓 Chọn gói muốn mua (giá học viên — đã giảm 20%)' : 'Chọn gói muốn mua'}</label>
        <div class="hint-box" style="margin-bottom:12px;line-height:1.7;">
          💡 <b>Đặc biệt Kho Content và Kho Hook viral</b> — nơi giúp bạn viết content dễ dàng từ các content đang có tín hiệu tốt trên thị trường.<br><br>
          Kho này được <b>cập nhật liên tục</b> và <b>mở rộng vô hạn theo từng tuần</b> — càng dùng lâu càng có nhiều để khai thác.<br><br>
          Web cũng sẽ <b>tăng giá dần theo thời gian</b>, nên chọn <b>gói 6 hoặc 12 tháng ngay bây giờ</b> để giữ mức giá hiện tại lâu hơn, thay vì phải mua lại theo giá mới mỗi tháng.
        </div>
        <div class="chips" id="plan-chips">
          ${plans.map(pl=>{
            const savings = isStudent ? planSavingsLabel(pl) : '';
            return `<div class="chip ${pl.key===selectedPaymentPlanKey?'selected':''}" data-plan="${pl.key}">${pl.recommended?'🔥 ':''}${esc(pl.label)} — ${pl.amount.toLocaleString('vi-VN')}đ${savings?` <span style="opacity:.72;font-size:11.5px;">(${savings})</span>`:''}</div>`;
          }).join('')}
        </div>
        ${plan.note?`<div style="margin-top:8px;font-size:12.5px;color:var(--accent);">${esc(plan.note)}</div>`:''}

        ${qrUrl ? `
          <div style="text-align:center;margin-top:18px;">
            <img src="${qrUrl}" alt="Mã VietQR" style="max-width:260px;width:100%;border-radius:12px;border:1px solid var(--line);">
          </div>
          <div style="margin-top:14px;font-size:13.5px;line-height:1.7;">
            <div><b>Ngân hàng:</b> Vietinbank</div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;"><b>Số tài khoản:</b> ${esc(PAYMENT_BANK.account)} <span class="btn-ghost btn btn-sm" style="padding:3px 10px;font-size:11.5px;" data-copy-value="${esc(PAYMENT_BANK.account)}">Copy</span></div>
            <div><b>Chủ tài khoản:</b> ${esc(PAYMENT_BANK.accountName)}</div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;"><b>Số tiền:</b> ${plan.amount.toLocaleString('vi-VN')}đ <span class="btn-ghost btn btn-sm" style="padding:3px 10px;font-size:11.5px;" data-copy-value="${plan.amount}">Copy</span></div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;"><b>Nội dung CK (bắt buộc giữ nguyên):</b> <span style="font-family:'IBM Plex Mono',monospace;background:var(--accent-soft);padding:2px 8px;border-radius:6px;">${esc(refCode)}</span> <span class="btn-ghost btn btn-sm" style="padding:3px 10px;font-size:11.5px;" data-copy-value="${esc(refCode)}">Copy</span></div>
          </div>
          <div class="hint-box" style="margin-top:14px;">Quét mã hoặc chuyển khoản đúng số tiền + giữ nguyên nội dung có mã <b>${esc(refCode)}</b> — hệ thống tự đối chiếu và kích hoạt, không cần nội dung nào khác. Chuyển xong đợi 1-2 phút rồi tải lại trang.</div>
        ` : `
          <div class="error-box" style="margin-top:14px;">Chưa có mã tài khoản để đối chiếu tự động. Nhắn email đăng ký (${esc((AppState.user&&AppState.user.email)||'')}) qua Zalo/Fanpage để được kích hoạt thủ công.</div>
        `}

        <div class="btn-row" style="margin-top:16px;justify-content:center;">
          <button class="btn-ghost btn" id="reload-status-btn">Tôi đã chuyển khoản — tải lại trạng thái</button>
        </div>
        <div class="btn-row" style="margin-top:6px;justify-content:center;">
          <span class="signout" id="signout-btn-expired" style="cursor:pointer;color:var(--ink-soft);font-size:13px;">Đăng xuất</span>
        </div>
      </div>
    </div>
  `;

  root.querySelectorAll('[data-plan]').forEach(el=>{
    el.onclick = ()=>{ selectedPaymentPlanKey = el.getAttribute('data-plan'); renderExpiredScreen(); };
  });
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
  const reloadBtn = root.querySelector('#reload-status-btn');
  if(reloadBtn) reloadBtn.onclick = async ()=>{ await loadProfile(); renderApp(); };
  const btn = root.querySelector('#signout-btn-expired');
  if(btn) btn.onclick = async ()=>{ await supabaseClient.auth.signOut(); };
}

let signupIsStudent = null;

function renderAuthScreen(err, successMsg){
  const root = document.getElementById('app');
  const isLogin = AppState.authMode === 'login';
  root.innerHTML = `
    <div class="auth-shell">
      <img src="assets/logo-hieu-kenh-badge.svg" class="auth-logo" alt="" onerror="this.style.display='none'">
      <h1>XÂY NHÂN HIỆU</h1>
      <div class="sub">Định vị · Sửa kênh · Viết content · Lịch đăng<br><span class="sub-brand">Hệ sinh thái HIỂU - HIỂU KÊNH</span></div>
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
        ${!isLogin ? `<label>Xác nhận mật khẩu</label><input id="af-pass-confirm" type="password" placeholder="Nhập lại mật khẩu">` : ''}
        ${!isLogin ? `
          <label>Bạn đã học khoá Xây Nhân Hiệu chưa?</label>
          <div class="chips" id="af-student-chips" style="margin-bottom:14px;">
            <div class="chip ${signupIsStudent===true?'selected':''}" data-student="yes">🎓 Đã học rồi — giá ưu đãi học viên</div>
            <div class="chip ${signupIsStudent===false?'selected':''}" data-student="no">Chưa — giá thường</div>
          </div>
        ` : ''}
        <button class="btn btn-full" id="af-submit">${isLogin?'Đăng nhập':'Tạo tài khoản'}</button>
        ${err ? `<div class="error-box">${esc(err)}</div>` : ''}
        ${successMsg ? `<div class="hint-box">${esc(successMsg)}</div>` : ''}
        ${(!isLogin && !err && !successMsg) ? `<div class="hint-box">Sau khi đăng ký, kiểm tra email để xác nhận tài khoản (nếu được bật) rồi quay lại đăng nhập.</div>` : ''}
      </div>
    </div>
  `;

  root.querySelectorAll('.auth-tab').forEach(el=>{
    el.onclick = ()=>{ AppState.authMode = el.getAttribute('data-mode'); renderAuthScreen(); };
  });

  root.querySelectorAll('#af-student-chips [data-student]').forEach(el=>{
    el.onclick = ()=>{ signupIsStudent = (el.getAttribute('data-student') === 'yes'); renderAuthScreen(); };
  });

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
        if(pass !== confirmPass){ renderAuthScreen('Mật khẩu xác nhận không khớp — kiểm tra lại.'); return; }
        if(signupIsStudent === null){ renderAuthScreen('Vui lòng chọn bạn đã học khoá Xây Nhân Hiệu hay chưa.'); return; }
        btn.disabled = true; btn.textContent = 'Đang xử lý…';
        const full_name = root.querySelector('#af-name').value.trim();
        const { data, error } = await supabaseClient.auth.signUp({ email, password: pass, options:{ data:{ full_name, is_student: signupIsStudent } } });
        if(error) throw error;
        if(!data.session){
          AppState.authMode = 'login';
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
  if(!hasActiveAccess()){ renderExpiredScreen(); return; }
  const root = document.getElementById('app');
  root.innerHTML = `
    <div class="topbar-mobile">
      <span class="menu-toggle" id="menu-toggle-btn">☰</span>
      <span class="topbar-title">XÂY NHÂN HIỆU</span>
    </div>
    <div class="app-layout">
      <div class="sidebar-overlay" id="sidebar-overlay"></div>
      <div class="sidebar" id="sidebar">
        <div class="sidebar-brand">
          <img src="assets/logo-hieu-kenh-badge.svg" class="brand-logo" alt="" onerror="this.style.display='none'">
          <div class="brand-text">XÂY NHÂN HIỆU<small>Hệ sinh thái HIỂU<br>HIỂU KÊNH</small></div>
        </div>
        <div class="sidebar-nav" id="sidebar-nav"></div>
        <div class="sidebar-foot">
          ${esc((AppState.user && AppState.user.email) || '')}<br>
          ${(AppState.profile && AppState.profile.role !== 'admin' && AppState.profile.access_until)
            ? `Hạn dùng: ${esc(new Date(AppState.profile.access_until).toLocaleDateString('vi-VN'))}<br>` : ''}
          <span class="signout" id="signout-btn">Đăng xuất</span>
        </div>
      </div>
      <div class="main"><div class="main-inner" id="main-content"></div></div>
    </div>
  `;

  const isAdmin = AppState.profile && AppState.profile.role === 'admin';
  const visibleNav = NAV.filter(n=> !n.adminOnly || isAdmin);
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

  nav.querySelectorAll('.sidebar-item').forEach(el=>{
    el.onclick = ()=>{
      location.hash = el.getAttribute('data-key');
      closeDrawer(); // trên điện thoại, chọn xong 1 mục thì tự đóng ngăn kéo lại, khỏi phải bấm tay
    };
  });

  root.querySelector('#signout-btn').onclick = async ()=>{ await supabaseClient.auth.signOut(); };

  if(window.startOnboardingTour && AppState.user){
    const alreadySeen = !!(AppState.profile && AppState.profile.onboarding_seen);
    window.startOnboardingTour(AppState.user.id, alreadySeen, async ()=>{
      const { error } = await supabaseClient.rpc('mark_onboarding_seen');
      if(!error && AppState.profile) AppState.profile.onboarding_seen = true;
      if(window.maybeShowInstallPrompt) window.maybeShowInstallPrompt();
    });
  }

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
