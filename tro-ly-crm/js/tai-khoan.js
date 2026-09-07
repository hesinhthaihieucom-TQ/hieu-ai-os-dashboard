(function(){
// Ngưỡng "Hiểu Partner" — đếm CỘNG DỒN referrals (Xây Nhân Hiệu) + tc_referrals (Sổ Dòng Tiền) +
// crm_referrals (app này), PHẢI khớp tay với PARTNER_REFERRAL_THRESHOLD ở nhan-hieu/js/tai-khoan.js
// + tai-chinh/js/tai-khoan.js + nhan-hieu/js/quan-tri.js.
const PARTNER_REFERRAL_THRESHOLD = 5;

function render(container, ctx){
  const state = {
    fullName: (ctx.profile && ctx.profile.full_name) || '',
    avatarPreview: (ctx.profile && ctx.profile.avatar_url) || null,
    avatarSaving: false,
    savingName: false,
    savedNameMsg: '',
    newPass: '',
    confirmPass: '',
    savingPass: false,
    passMsg: '',
    passError: '',
    referralCount: 0, referralLuotEarned: 0, referralLinkCopied: false, hieuPartnerCount: 0,
  };

  function draw(){ container.innerHTML = html(); bind(); }
  draw();

  // Đếm số người đã giới thiệu thành công + tổng lượt đã được thưởng qua tro-ly-crm — bảng
  // crm_referrals chỉ có dòng khi referee đã trả tiền THẬT (xem creditCrmReferralReward trong
  // api/sepay-webhook.js). Đếm hạng "Hiểu Partner" CỘNG DỒN cả referrals (Xây Nhân Hiệu) và
  // tc_referrals (Sổ Dòng Tiền) — không lưu tổng ở profiles, tính trực tiếp mỗi lần cần, giống hệt
  // cách nhan-hieu/js/tai-khoan.js và tai-chinh/js/tai-khoan.js đã làm.
  async function loadReferralStats(){
    const [{ data }, { data: xnhData }, { data: tcData }] = await Promise.all([
      ctx.supabase.from('crm_referrals').select('reward_luot').eq('referrer_id', ctx.user.id),
      ctx.supabase.from('referrals').select('id').eq('referrer_id', ctx.user.id),
      ctx.supabase.from('tc_referrals').select('id').eq('referrer_id', ctx.user.id),
    ]);
    const rows = data || [];
    state.referralCount = rows.length;
    state.referralLuotEarned = rows.reduce((sum,r)=> sum + (r.reward_luot||0), 0);
    state.hieuPartnerCount = rows.length + (xnhData||[]).length + (tcData||[]).length;
    draw();
  }
  loadReferralStats();

  function referralLink(){
    const refCode = ctx.profile && ctx.profile.ref_code;
    if(!refCode) return '';
    return `${location.origin}${location.pathname}?ref=${refCode}`;
  }

  async function saveName(){
    state.savingName = true; draw();
    // profiles không cho user thường .update() thẳng (RLS đã khoá "profiles_self_update" từ v3) —
    // phải qua RPC self-write. Đổi từ update_my_full_name (RPC hẹp, chỉ định nghĩa ở schema_suc_
    // khoe.sql — CRM lỡ phụ thuộc app khác chạy schema TRƯỚC thì mới có RPC này) sang
    // update_own_profile (RPC chung ecosystem-wide ở schema_core.sql, cùng RPC nhan-hieu/js/
    // tai-khoan.js đang dùng — 2026-09-07, "phần thông tin người dùng cũng thế").
    const { error } = await ctx.supabase.rpc('update_own_profile', { p_full_name: state.fullName.trim() });
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

  // Ảnh đại diện (2026-09-07, "phần thông tin người dùng cũng thế" — khớp nhan-hieu/js/tai-
  // khoan.js) — nén vuông 200x200 rồi lưu base64 thẳng vào profiles.avatar_url qua update_own_profile.
  function uploadAvatar(file){
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      const img = new Image();
      img.onload = async ()=>{
        const size = 200;
        const c = document.createElement('canvas');
        c.width = size; c.height = size;
        const cx = c.getContext('2d');
        const scale = Math.max(size/img.width, size/img.height);
        const w = img.width*scale, h = img.height*scale;
        cx.drawImage(img, (size-w)/2, (size-h)/2, w, h);
        const dataUrl = c.toDataURL('image/jpeg', 0.85);
        state.avatarPreview = dataUrl;
        state.avatarSaving = true; draw();
        const { error } = await ctx.supabase.rpc('update_own_profile', { p_avatar_url: dataUrl });
        state.avatarSaving = false;
        if(!error && ctx.profile) ctx.profile.avatar_url = dataUrl;
        const footEl = document.getElementById('sidebar-foot-info');
        if(footEl) footEl.innerHTML = sidebarFootHtml();
        draw();
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
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
        <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:16px;">
          ${state.avatarPreview
            ? `<img src="${state.avatarPreview}" style="width:72px;height:72px;border-radius:50%;object-fit:cover;">`
            : `<div style="width:72px;height:72px;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:26px;">${esc((state.fullName||'?').charAt(0).toUpperCase())}</div>`}
          <div>
            <input type="file" accept="image/*" id="tk-avatar-upload" style="font-size:13px;">
            ${state.avatarSaving?`<div style="font-size:12px;color:var(--ink-soft);margin-top:4px;">Đang lưu…</div>`:''}
          </div>
        </div>

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
        <h3 style="margin-bottom:6px;">Giới thiệu bạn bè</h3>
        <div class="hint-box" style="margin-bottom:14px;">Chia sẻ link dưới đây — bạn bè bấm vào đăng ký sẽ được <b>giảm 15%</b> khi mua gói, còn bạn được <b>tặng lượt AI</b> tương đương 15% giá trị đơn hàng của họ ngay khi họ thanh toán thành công lần đầu${ctx.profile&&ctx.profile.is_vip_partner?' (VIP Partner: 25%)':''}.<br><br>🌟 Giới thiệu thành công từ <b>${PARTNER_REFERRAL_THRESHOLD} người trở lên</b> — cộng dồn cả Xây Nhân Hiệu, Sổ Dòng Tiền Tâm Thức lẫn app này — bạn sẽ được coi là <b>Hiểu Partner</b> của hệ sinh thái — từ đó thay vì tặng lượt AI, bạn sẽ được thưởng bằng <b>hoa hồng tiền mặt</b> — liên hệ để nhận sau khi đạt mốc.</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <input readonly value="${esc(referralLink())}" style="flex:1;min-width:220px;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-size:13px;background:var(--bg);color:var(--ink);" onclick="this.select()">
          <button class="btn btn-sm" id="tk-copy-referral-link">${state.referralLinkCopied?'✓ Đã copy':'Copy link'}</button>
        </div>
        <div style="display:flex;gap:24px;margin-top:14px;flex-wrap:wrap;">
          <div><div style="font-size:20px;font-weight:700;color:var(--accent);">${state.hieuPartnerCount}</div><div style="font-size:12px;color:var(--ink-soft);">người đã giới thiệu thành công (mọi sản phẩm)</div></div>
          <div><div style="font-size:20px;font-weight:700;color:var(--accent);">${state.referralLuotEarned}</div><div style="font-size:12px;color:var(--ink-soft);">lượt AI đã được tặng (app này)</div></div>
        </div>
        ${state.hieuPartnerCount >= PARTNER_REFERRAL_THRESHOLD
          ? `<div style="margin-top:12px;padding:10px 14px;background:var(--accent-soft);border-radius:8px;font-size:13px;color:var(--accent);font-weight:600;">🌟 Bạn đã là Hiểu Partner của hệ sinh thái! Liên hệ để nhận hoa hồng tiền mặt.</div>`
          : `<div style="margin-top:12px;font-size:12.5px;color:var(--ink-soft);">Còn <b>${PARTNER_REFERRAL_THRESHOLD - state.hieuPartnerCount}</b> người nữa để trở thành Hiểu Partner 🌟</div>`}
        ${ctx.profile&&ctx.profile.is_vip_partner
          ? `<div style="margin-top:10px;padding:10px 14px;background:var(--gold-soft,var(--accent-soft));border-radius:8px;font-size:13px;color:var(--gold,var(--accent));font-weight:600;">👑 Bạn là VIP Partner — hoa hồng +10 điểm % trên mọi sản phẩm.</div>`
          : `<div style="margin-top:10px;font-size:12.5px;color:var(--ink-soft);">Mua gói VIP Partner (55tr) để được +10 điểm % hoa hồng trên mọi sản phẩm — liên hệ Zalo để tìm hiểu.</div>`}
      </div>

      <div class="btn-row" style="justify-content:flex-start;margin-top:8px;">
        <span class="signout" id="tk-signout-btn" style="cursor:pointer;color:var(--ink-soft);font-size:13px;">Đăng xuất</span>
      </div>
    `;
  }

  function bind(){
    const avatarUpload = container.querySelector('#tk-avatar-upload');
    if(avatarUpload) avatarUpload.onchange = ()=>uploadAvatar(avatarUpload.files[0]);

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
