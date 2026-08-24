(function(){
// Số % hoa hồng cho người giới thiệu — khớp TC_REFERRAL_REWARD_PERCENT ở api/sepay-webhook.js, chỉ
// để hiển thị đúng con số cho người dùng thấy, không dùng để tính toán gì (webhook mới là nơi ghi
// sổ thật).
const TC_REFERRAL_REWARD_PERCENT = 20;

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
    referralLinkCopied: false,
  };

  function draw(){ container.innerHTML = html(); bind(); }
  draw();

  async function loadReferrals(){
    const { data } = await ctx.supabase.from('tc_referrals').select('*').eq('referrer_id', ctx.user.id).order('created_at', { ascending:false });
    state.referrals = data || [];
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

      ${(()=>{
        const totalCount = state.referrals.length;
        const totalEarned = state.referrals.reduce((s,r)=>s+Number(r.reward_amount),0);
        const totalPaid = state.referrals.filter(r=>r.paid).reduce((s,r)=>s+Number(r.reward_amount),0);
        const totalPending = totalEarned - totalPaid;
        return `
          <div class="section">
            <h3 style="margin-bottom:6px;">Giới thiệu bạn bè</h3>
            <div class="hint-box" style="margin-bottom:14px;">Chia sẻ link dưới đây — khi bạn bè bấm vào đăng ký rồi mua trọn đời, bạn được thưởng <b>${TC_REFERRAL_REWARD_PERCENT}%</b> giá trị đơn hàng của họ (~${Math.round(tcCurrentPrice()*TC_REFERRAL_REWARD_PERCENT/100).toLocaleString('vi-VN')}đ mỗi người ở giá hiện tại). Trả bằng chuyển khoản tay, không tự động — bên dưới là số bạn đang được ghi nợ.</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
              <input readonly value="${esc(referralLink())}" style="flex:1;min-width:220px;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-size:13px;background:var(--bg);color:var(--ink);" onclick="this.select()">
              <button class="btn btn-sm" id="tk-copy-referral-link">${state.referralLinkCopied?'✓ Đã copy':'Copy link'}</button>
            </div>
            <div style="display:flex;gap:24px;margin-top:16px;flex-wrap:wrap;">
              <div><div style="font-size:20px;font-weight:700;color:var(--accent);">${totalCount}</div><div style="font-size:12px;color:var(--ink-soft);">người đã giới thiệu thành công</div></div>
              <div><div style="font-size:20px;font-weight:700;color:var(--accent);">${totalPaid.toLocaleString('vi-VN')}đ</div><div style="font-size:12px;color:var(--ink-soft);">đã nhận</div></div>
              <div><div style="font-size:20px;font-weight:700;color:${totalPending>0?'var(--danger)':'var(--ink)'};">${totalPending.toLocaleString('vi-VN')}đ</div><div style="font-size:12px;color:var(--ink-soft);">đang chờ chuyển khoản</div></div>
            </div>
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
