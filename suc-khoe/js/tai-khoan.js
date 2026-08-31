(function(){
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
    pushSupported: !!(window.PushManager && navigator.serviceWorker && window.Notification),
    pushSubscribed: false, pushBusy: false, pushError: null,
    testPushBusy: false, testPushResult: null,
  };

  function draw(){ container.innerHTML = html(); bind(); }
  draw();
  checkPushSubscription();

  // Kiểm tra đã có subscription push sẵn chưa (vd đã bật ở thiết bị này trước đó) — không tự hỏi
  // quyền, chỉ đọc trạng thái hiện có để hiện đúng nút Bật/Tắt (copy y hệt cách nhan-hieu/js/lich-dang.js làm).
  async function checkPushSubscription(){
    if(!state.pushSupported) { draw(); return; }
    try{
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      state.pushSubscribed = !!sub;
    } catch(e){ state.pushSubscribed = false; }
    draw();
  }

  // Bật thông báo: xin quyền trình duyệt → đăng ký PushManager → gửi lên server lưu lại. Trên
  // iPhone CHỈ hoạt động nếu đã cài app qua "Thêm vào Màn hình chính" (Safari không hỗ trợ Web Push
  // cho tab trình duyệt thường).
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

  async function testPush(){
    if(state.testPushBusy) return;
    state.testPushBusy = true; state.testPushResult = null; draw();
    try{
      const data = await callApi('/api/test-push', {});
      state.testPushResult = { ok: data.ok, message: data.message };
    } catch(e){
      state.testPushResult = { ok:false, message: e.message || 'Không gửi được — thử lại giúp mình.' };
    }
    state.testPushBusy = false; draw();
  }

  async function saveName(){
    state.savingName = true; draw();
    // profiles không cho user thường .update() thẳng (RLS đã khoá) — phải qua RPC riêng
    // update_my_full_name (xem supabase/schema_full.sql), khác cách tai-chinh/js/tai-khoan.js làm
    // (.update() thẳng — sẽ bị RLS chặn âm thầm, không báo lỗi nhưng cũng không lưu được gì).
    const { error } = await ctx.supabase.rpc('update_my_full_name', { new_name: state.fullName.trim() });
    state.savingName = false;
    if(!error){
      ctx.profile.full_name = state.fullName.trim();
      state.savedNameMsg = 'Đã lưu ✓';
    } else {
      state.savedNameMsg = 'Có lỗi, thử lại.';
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

  function html(){
    return `
      <div class="page-head">
        <h1>Tài khoản</h1>
        <p>Thông tin đăng nhập và cài đặt cá nhân.</p>
      </div>

      <div class="section">
        <h3>Thông tin cơ bản</h3>
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:6px;">Email</label>
        <input type="text" value="${esc((ctx.user && ctx.user.email) || '')}" disabled style="background:var(--bg);color:var(--ink-soft);">

        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:16px 0 6px;">Họ tên</label>
        <input type="text" id="tk-name" value="${esc(state.fullName)}" placeholder="Tên của bạn">

        <button class="btn" style="margin-top:14px;" id="tk-save-name" ${state.savingName?'disabled':''}>${state.savingName?'Đang lưu…':'Lưu tên'}</button>
        <span id="tk-name-saved" style="margin-left:10px;color:var(--accent);font-weight:600;">${state.savedNameMsg}</span>
      </div>

      <div class="section">
        <h3>Đổi mật khẩu</h3>
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:6px;">Mật khẩu mới</label>
        <input type="password" id="tk-new-pass" value="${esc(state.newPass)}" placeholder="Ít nhất 6 ký tự">

        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 6px;">Xác nhận mật khẩu mới</label>
        <input type="password" id="tk-confirm-pass" value="${esc(state.confirmPass)}" placeholder="Nhập lại mật khẩu mới">

        ${state.passError ? `<div class="error-box">${esc(state.passError)}</div>` : ''}
        ${state.passMsg ? `<div class="hint-box">${esc(state.passMsg)}</div>` : ''}
        <button class="btn" style="margin-top:14px;" id="tk-save-pass" ${state.savingPass?'disabled':''}>${state.savingPass?'Đang xử lý…':'Đổi mật khẩu'}</button>
      </div>

      <div class="section">
        <h3>Bản tin sức khỏe & thông báo</h3>
        <div class="hint-box" style="margin-bottom:14px;">Bật để mỗi ngày nhận 1 bản tin sức khỏe ngắn ngay trên máy, cùng các nhắc khác liên quan gói của bạn. Trên iPhone: cần <b>"Thêm vào Màn hình chính"</b> (bấm nút Chia sẻ trên Safari) trước khi bật được — Safari không hỗ trợ thông báo cho tab trình duyệt thường.</div>
        ${!state.pushSupported ? `
          <div class="error-box">Trình duyệt/thiết bị này không hỗ trợ thông báo đẩy.</div>
        ` : state.pushSubscribed ? `
          <button class="btn-ghost btn btn-sm" data-action="disable-push" ${state.pushBusy?'disabled':''}>${state.pushBusy?'Đang tắt…':'✓ Đã bật — bấm để tắt'}</button>
        ` : `
          <button class="btn btn-sm" data-action="enable-push" ${state.pushBusy?'disabled':''}>${state.pushBusy?'Đang bật…':'Bật thông báo'}</button>
        `}
        ${state.pushError?`<div class="error-box" style="margin-top:10px;">${esc(state.pushError)}</div>`:''}
        ${state.pushSupported ? `
          <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--line);">
            <span class="btn-ghost btn btn-sm" data-action="test-push" ${state.testPushBusy?'disabled':''}>${state.testPushBusy?'Đang gửi…':'Gửi thử thông báo'}</span>
            <div style="font-size:11.5px;color:var(--ink-soft);margin-top:4px;">Bấm để kiểm tra ngay thông báo có hoạt động không, không cần chờ đến giờ bản tin.</div>
            ${state.testPushResult ? `<div class="${state.testPushResult.ok?'hint-box':'error-box'}" style="margin-top:8px;">${esc(state.testPushResult.message)}</div>` : ''}
          </div>
        ` : ''}
      </div>

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

    const enablePushBtn = container.querySelector('[data-action="enable-push"]');
    if(enablePushBtn) enablePushBtn.onclick = enablePush;
    const disablePushBtn = container.querySelector('[data-action="disable-push"]');
    if(disablePushBtn) disablePushBtn.onclick = disablePush;
    const testPushBtn = container.querySelector('[data-action="test-push"]');
    if(testPushBtn) testPushBtn.onclick = testPush;

    container.querySelector('#tk-signout-btn').onclick = async ()=>{ await ctx.supabase.auth.signOut(); };
  }
}

window.Modules = window.Modules || {};
window.Modules['tai-khoan'] = { title:'Tài khoản', render };
})();
