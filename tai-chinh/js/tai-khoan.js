(function(){
// Số % hoa hồng cho người giới thiệu — khớp TC_REFERRAL_REWARD_PERCENT ở api/sepay-webhook.js, chỉ
// để hiển thị đúng con số cho người dùng thấy, không dùng để tính toán gì (webhook mới là nơi ghi
// sổ thật).
const TC_REFERRAL_REWARD_PERCENT = 20;
// Ngưỡng "Hiểu Partner" — đếm CỘNG DỒN cả tc_referrals (app này) lẫn referrals (Xây Nhân Hiệu),
// PHẢI khớp tay với PARTNER_REFERRAL_THRESHOLD ở nhan-hieu/js/tai-khoan.js + quan-tri.js.
const PARTNER_REFERRAL_THRESHOLD = 5;

function render(container, ctx){
  const state = {
    fullName: (ctx.profile && ctx.profile.full_name) || '',
    savingName: false,
    savedNameMsg: '',
    newPass: '',
    confirmPass: '',
    savingPass: false,
    passMsg: '',
    passError: '',
    referrals: [],
    otherProductReferralCount: 0,
    referralLinkCopied: false,
    pushSupported: !!(window.PushManager && navigator.serviceWorker && window.Notification),
    pushSubscribed: false,
    pushBusy: false,
    pushError: null,
    reminderFreq: (ctx.profile && ctx.profile.tc_reminder_frequency) || 'daily',
    savingFreq: false,
    testPushBusy: false,
    testPushResult: null,
  };

  function draw(){ container.innerHTML = html(); bind(); }
  draw();

  // Đọc trạng thái đã đăng ký push sẵn có chưa (vd đã bật ở thiết bị này trước đó) — không tự hỏi
  // quyền, chỉ đọc để hiện đúng nút Bật/Tắt. Copy pattern từ nhan-hieu/js/lich-dang.js.
  async function checkPushSubscription(){
    if(!state.pushSupported) return;
    try{
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      state.pushSubscribed = !!sub;
    } catch(e){ state.pushSubscribed = false; }
    draw();
  }
  checkPushSubscription();

  async function loadReferrals(){
    const [{ data }, { data: xnhData }, { data: crmData }] = await Promise.all([
      ctx.supabase.from('tc_referrals').select('*').eq('referrer_id', ctx.user.id).order('created_at', { ascending:false }),
      // Hạng "Hiểu Partner" đếm CỘNG DỒN cả tc_referrals (app này), referrals (Xây Nhân Hiệu), và
      // crm_referrals (Trợ Lý AI Tư Vấn & CRM) — không lưu tổng ở profiles, tính trực tiếp mỗi lần
      // cần (xem comment is_vip_partner ở schema_full.sql).
      ctx.supabase.from('referrals').select('id').eq('referrer_id', ctx.user.id),
      ctx.supabase.from('crm_referrals').select('id').eq('referrer_id', ctx.user.id),
    ]);
    state.referrals = data || [];
    state.otherProductReferralCount = (xnhData || []).length + (crmData || []).length;
    draw();
  }
  loadReferrals();

  function referralLink(){
    const refCode = ctx.profile && ctx.profile.ref_code;
    if(!refCode) return '';
    return `${location.origin}${location.pathname}?ref=${refCode}`;
  }

  async function saveName(){
    state.savingName = true; draw();
    const { error } = await ctx.supabase.from('profiles').update({ full_name: state.fullName.trim() }).eq('id', ctx.user.id);
    state.savingName = false;
    if(!error){
      ctx.profile.full_name = state.fullName.trim();
      state.savedNameMsg = 'Đã lưu ✓';
    }
    draw();
    setTimeout(()=>{ state.savedNameMsg=''; const el = container.querySelector('#tk-name-saved'); if(el) el.textContent=''; }, 1800);
  }

  async function changePassword(){
    state.passError = ''; state.passMsg = '';
    if(!state.newPass || state.newPass.length < 6){ state.passError = 'Mật khẩu mới cần ít nhất 6 ký tự.'; draw(); return; }
    if(state.newPass !== state.confirmPass){ state.passError = 'Mật khẩu xác nhận không khớp.'; draw(); return; }
    state.savingPass = true; draw();
    const { error } = await ctx.supabase.auth.updateUser({ password: state.newPass });
    state.savingPass = false;
    if(error){ state.passError = error.message; }
    else { state.passMsg = 'Đã đổi mật khẩu ✓'; state.newPass = ''; state.confirmPass = ''; }
    draw();
  }

  // Bật nhắc ghi chép: xin quyền → đăng ký PushManager → gửi lên server lưu lại. Trên iPhone CHỈ
  // hoạt động nếu đã "Thêm vào Màn hình chính" trước (Safari không hỗ trợ Web Push cho tab thường).
  // Copy pattern từ nhan-hieu/js/lich-dang.js enablePush(), giữ nguyên lý do lỗi để không bị hiểu
  // nhầm "app lỗi" trong khi thực ra là chưa cài app/chưa cấp quyền.
  async function enablePush(){
    if(state.pushBusy) return;
    state.pushBusy = true; state.pushError = null; draw();
    try{
      if(!state.pushSupported) throw new Error('Trình duyệt này không hỗ trợ thông báo đẩy.');
      const permission = await Notification.requestPermission();
      if(permission !== 'granted') throw new Error('Bạn chưa cấp quyền thông báo — vào cài đặt trình duyệt/điện thoại để bật lại nếu muốn thử lại.');
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      await callApi('/api/push-subscribe', sub.toJSON());
      state.pushSubscribed = true;
    } catch(e){
      state.pushError = e.message || 'Không bật được thông báo — thử lại giúp mình.';
    }
    state.pushBusy = false; draw();
  }

  async function disablePush(){
    if(state.pushBusy) return;
    state.pushBusy = true; state.pushError = null; draw();
    try{
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if(sub){
        await callApi('/api/push-unsubscribe', { endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      state.pushSubscribed = false;
    } catch(e){
      state.pushError = e.message || 'Không tắt được thông báo — thử lại giúp mình.';
    }
    state.pushBusy = false; draw();
  }

  // Qua RPC vì user không update() thẳng profiles được (RLS đã khoá — xem comment ở schema_tai_chinh.sql).
  async function setReminderFreq(freq){
    if(state.savingFreq || state.reminderFreq === freq) return;
    state.savingFreq = true; draw();
    const { error } = await ctx.supabase.rpc('set_tc_reminder_frequency', { freq });
    if(!error){ state.reminderFreq = freq; if(ctx.profile) ctx.profile.tc_reminder_frequency = freq; }
    state.savingFreq = false; draw();
  }

  async function testPush(){
    if(state.testPushBusy) return;
    state.testPushBusy = true; state.testPushResult = null; draw();
    try{
      const data = await callApi('/api/test-push', {});
      state.testPushResult = { ok: !!data.ok, message: data.message || (data.ok ? 'Đã gửi thành công.' : 'Không gửi được.') };
    } catch(e){
      state.testPushResult = { ok:false, message: e.message || 'Không gửi được — thử lại giúp mình.' };
    }
    state.testPushBusy = false; draw();
  }

  function html(){
    return `
      <div class="page-head">
        <h1>Tài khoản</h1>
        <p>Thông tin đăng nhập và cài đặt cá nhân.</p>
      </div>

      <div class="section">
        <h3>Thông tin cơ bản</h3>
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:6px;">Email</label>
        <input type="text" value="${esc((ctx.user && ctx.user.email) || '')}" disabled style="width:100%;padding:12px 14px;border:1px solid var(--line);border-radius:10px;font-size:14.5px;background:var(--bg);color:var(--ink-soft);">

        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:16px 0 6px;">Họ tên</label>
        <input type="text" id="tk-name" value="${esc(state.fullName)}" placeholder="Tên của bạn" style="width:100%;padding:12px 14px;border:1px solid var(--line);border-radius:10px;font-size:14.5px;background:#FDFCF8;color:var(--ink);">

        <button class="btn" style="margin-top:14px;" id="tk-save-name" ${state.savingName?'disabled':''}>${state.savingName?'Đang lưu…':'Lưu tên'}</button>
        <span id="tk-name-saved" style="margin-left:10px;color:var(--accent);font-weight:600;">${state.savedNameMsg}</span>
      </div>

      <div class="section">
        <h3>Đổi mật khẩu</h3>
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:6px;">Mật khẩu mới</label>
        <input type="password" id="tk-new-pass" value="${esc(state.newPass)}" placeholder="Ít nhất 6 ký tự" style="width:100%;padding:12px 14px;border:1px solid var(--line);border-radius:10px;font-size:14.5px;background:#FDFCF8;color:var(--ink);">

        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 6px;">Xác nhận mật khẩu mới</label>
        <input type="password" id="tk-confirm-pass" value="${esc(state.confirmPass)}" placeholder="Nhập lại mật khẩu mới" style="width:100%;padding:12px 14px;border:1px solid var(--line);border-radius:10px;font-size:14.5px;background:#FDFCF8;color:var(--ink);">

        ${state.passError ? `<div class="error-box">${esc(state.passError)}</div>` : ''}
        ${state.passMsg ? `<div class="hint-box">${esc(state.passMsg)}</div>` : ''}
        <button class="btn" style="margin-top:14px;" id="tk-save-pass" ${state.savingPass?'disabled':''}>${state.savingPass?'Đang xử lý…':'Đổi mật khẩu'}</button>
      </div>

      <div class="section">
        <h3>Nhắc ghi chép</h3>
        <div class="hint-box" style="margin-bottom:14px;">Bật để được nhắc ghi thu chi, tự chọn tần suất theo thói quen của bạn. Trên iPhone: cần <b>"Thêm vào Màn hình chính"</b> trước khi bật được (Safari không hỗ trợ thông báo cho tab trình duyệt thường) — mở bằng Safari thật, không mở trong Facebook/Zalo/Instagram.</div>
        ${!state.pushSupported ? `
          <div class="error-box">Trình duyệt/thiết bị này không hỗ trợ thông báo đẩy.</div>
        ` : state.pushSubscribed ? `
          <button class="btn-ghost btn btn-sm" data-action="disable-push" ${state.pushBusy?'disabled':''}>${state.pushBusy?'Đang tắt…':'✓ Đã bật — bấm để tắt'}</button>
        ` : `
          <button class="btn btn-sm" data-action="enable-push" ${state.pushBusy?'disabled':''}>${state.pushBusy?'Đang bật…':'Bật thông báo'}</button>
        `}
        ${state.pushError?`<div class="error-box" style="margin-top:10px;">${esc(state.pushError)}</div>`:''}
        ${state.pushSubscribed ? `
          <div style="margin-top:16px;">
            <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:8px;">Tần suất nhắc</label>
            <div class="chips">
              <div class="chip ${state.reminderFreq==='daily'?'selected':''}" data-freq="daily">Hằng ngày (20h)</div>
              <div class="chip ${state.reminderFreq==='weekly'?'selected':''}" data-freq="weekly">Hằng tuần (Chủ Nhật 19h)</div>
              <div class="chip ${state.reminderFreq==='off'?'selected':''}" data-freq="off">Tắt nhắc</div>
            </div>
          </div>
          <div style="margin-top:14px;">
            <span class="btn-ghost btn btn-sm" data-action="test-push" ${state.testPushBusy?'disabled':''}>${state.testPushBusy?'Đang gửi…':'Gửi thử thông báo'}</span>
            ${state.testPushResult ? `<div class="${state.testPushResult.ok?'hint-box':'error-box'}" style="margin-top:8px;">${esc(state.testPushResult.message)}</div>` : ''}
          </div>
        ` : ''}
      </div>

      ${(()=>{
        const totalCount = state.referrals.length;
        const totalEarned = state.referrals.reduce((s,r)=>s+Number(r.reward_amount),0);
        const totalPaid = state.referrals.filter(r=>r.paid).reduce((s,r)=>s+Number(r.reward_amount),0);
        const totalPending = totalEarned - totalPaid;
        const hieuPartnerCount = totalCount + state.otherProductReferralCount;
        const isVip = ctx.profile && ctx.profile.is_vip_partner;
        const effectivePercent = TC_REFERRAL_REWARD_PERCENT + (isVip ? 10 : 0);
        return `
          <div class="section">
            <h3 style="margin-bottom:6px;">Giới thiệu bạn bè</h3>
            <div class="hint-box" style="margin-bottom:14px;">Chia sẻ link dưới đây — khi bạn bè bấm vào đăng ký rồi mua trọn đời, bạn được thưởng <b>${effectivePercent}%</b> giá trị đơn hàng của họ${isVip?' (VIP Partner: +10 điểm %)':''} (~${Math.round(tcCurrentPrice()*effectivePercent/100).toLocaleString('vi-VN')}đ mỗi người ở giá hiện tại). Trả bằng chuyển khoản tay, không tự động — bên dưới là số bạn đang được ghi nợ.</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
              <input readonly value="${esc(referralLink())}" style="flex:1;min-width:220px;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-size:13px;background:var(--bg);color:var(--ink);" onclick="this.select()">
              <button class="btn btn-sm" id="tk-copy-referral-link">${state.referralLinkCopied?'✓ Đã copy':'Copy link'}</button>
            </div>
            <div style="display:flex;gap:24px;margin-top:16px;flex-wrap:wrap;">
              <div><div style="font-size:20px;font-weight:700;color:var(--accent);">${totalCount}</div><div style="font-size:12px;color:var(--ink-soft);">người đã giới thiệu thành công (app này)</div></div>
              <div><div style="font-size:20px;font-weight:700;color:var(--accent);">${totalPaid.toLocaleString('vi-VN')}đ</div><div style="font-size:12px;color:var(--ink-soft);">đã nhận</div></div>
              <div><div style="font-size:20px;font-weight:700;color:${totalPending>0?'var(--danger)':'var(--ink)'};">${totalPending.toLocaleString('vi-VN')}đ</div><div style="font-size:12px;color:var(--ink-soft);">đang chờ chuyển khoản</div></div>
            </div>
            ${hieuPartnerCount >= PARTNER_REFERRAL_THRESHOLD
              ? `<div style="margin-top:12px;padding:10px 14px;background:var(--accent-soft);border-radius:8px;font-size:13px;color:var(--accent);font-weight:600;">🌟 Bạn đã là Hiểu Partner của hệ sinh thái (${hieuPartnerCount} người, cộng dồn mọi sản phẩm)!</div>`
              : `<div style="margin-top:12px;font-size:12.5px;color:var(--ink-soft);">Còn <b>${PARTNER_REFERRAL_THRESHOLD - hieuPartnerCount}</b> người nữa (cộng dồn mọi sản phẩm) để trở thành Hiểu Partner 🌟</div>`}
            ${isVip
              ? `<div style="margin-top:10px;padding:10px 14px;background:var(--gold-soft,var(--accent-soft));border-radius:8px;font-size:13px;color:var(--gold,var(--accent));font-weight:600;">👑 Bạn là VIP Partner — hoa hồng +10 điểm % trên mọi sản phẩm.</div>`
              : `<div style="margin-top:10px;font-size:12.5px;color:var(--ink-soft);">Mua gói VIP Partner (55tr) để được +10 điểm % hoa hồng trên mọi sản phẩm — liên hệ Zalo để tìm hiểu.</div>`}
          </div>
        `;
      })()}

      <div class="btn-row" style="justify-content:flex-start;margin-top:8px;">
        <span class="signout" id="tk-signout-btn" style="cursor:pointer;color:var(--ink-soft);font-size:13px;">Đăng xuất</span>
      </div>
    `;
  }

  function bind(){
    container.querySelector('#tk-name').oninput = (e)=>{ state.fullName = e.target.value; };
    container.querySelector('#tk-save-name').onclick = saveName;

    container.querySelector('#tk-new-pass').oninput = (e)=>{ state.newPass = e.target.value; };
    container.querySelector('#tk-confirm-pass').oninput = (e)=>{ state.confirmPass = e.target.value; };
    container.querySelector('#tk-save-pass').onclick = changePassword;

    container.querySelector('#tk-signout-btn').onclick = async ()=>{ await ctx.supabase.auth.signOut(); };

    const enablePushBtn = container.querySelector('[data-action="enable-push"]');
    if(enablePushBtn) enablePushBtn.onclick = enablePush;
    const disablePushBtn = container.querySelector('[data-action="disable-push"]');
    if(disablePushBtn) disablePushBtn.onclick = disablePush;
    const testPushBtn = container.querySelector('[data-action="test-push"]');
    if(testPushBtn) testPushBtn.onclick = testPush;
    container.querySelectorAll('[data-freq]').forEach(el=>{
      el.onclick = ()=>setReminderFreq(el.getAttribute('data-freq'));
    });

    const copyRefBtn = container.querySelector('#tk-copy-referral-link');
    if(copyRefBtn) copyRefBtn.onclick = async ()=>{
      try{ await navigator.clipboard.writeText(referralLink()); } catch(e){}
      state.referralLinkCopied = true; draw();
      setTimeout(()=>{ state.referralLinkCopied = false; draw(); }, 2000);
    };
  }
}

window.Modules = window.Modules || {};
window.Modules['tai-khoan'] = { title:'Tài khoản', render };
})();
