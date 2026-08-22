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
  };

  function draw(){ container.innerHTML = html(); bind(); }
  draw();

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
  }
}

window.Modules = window.Modules || {};
window.Modules['tai-khoan'] = { title:'Tài khoản', render };
})();
