(function(){
// Trọng số lượt hiển thị cho người dùng tự lên kế hoạch — PHẢI khớp tay với AI_WEIGHTS ở
// api/_lib/trial-quota.js (và bản sao GATED_API_WEIGHTS ở app-shell.js) mỗi khi đổi trọng số,
// giống quy ước đã có ở app-shell.js. Đây chỉ là bảng để NGƯỜI DÙNG xem, không phải nơi chặn thật.
const ACTION_WEIGHTS_DISPLAY = [
  { label:'Cải thiện hook / Chấm điểm hook / Gợi ý hook theo chủ đề / Gợi ý đẩy bài / Gợi ý từ nguồn', weight:1 },
  { label:'Chấm điểm Content / AI gợi ý lịch tuần', weight:2 },
  { label:'Viết Content (bài mới hoặc từ Kho gốc) / Tái Chế Content Viral', weight:3 },
  { label:'Sửa Kênh (audit kênh)', weight:4 },
  { label:'Định Vị (làm hoặc sửa lại 16 câu)', weight:8 },
  { label:'Định Vị — dán kết quả có sẵn', weight:6 },
];

// Các mục cho người dùng tự đặt "mục tiêu tháng này" — dùng đúng trọng số ở trên (weight) để cộng
// dồn ra tổng lượt cần, so với lượt CÒN LẠI (không phải tổng trần) để cảnh báo đúng thực tế. Phủ
// đủ các hành động hay lặp lại hàng tháng — Định Vị/dán kết quả không đưa vào đây vì thường chỉ
// làm 1 lần, đã có trong bảng "mỗi hành động tốn bao nhiêu lượt" ở trên rồi.
const GOAL_ITEMS = [
  { key:'viet', label:'Viết Content (bài)', weight:3 },
  { key:'taicheviral', label:'Tái Chế Content Viral (lần)', weight:3 },
  { key:'chamdiemcontent', label:'Chấm điểm Content (lần)', weight:2 },
  { key:'lich', label:'Gợi ý lịch đăng bài (lần/tuần)', weight:2 },
  { key:'chamdiemhook', label:'Chấm điểm Hook (lần)', weight:1 },
  { key:'hook', label:'Tạo/Cải thiện Hook (lần)', weight:1 },
  { key:'suakenh', label:'Sửa Kênh (lần)', weight:4 },
];

// action_key thật (khớp AI_WEIGHTS ở api/_lib/trial-quota.js) → nhóm hiển thị ở GOAL_ITEMS phía trên.
const ACTION_KEY_TO_GOAL = {
  'viet-content':'viet', 'viet-tu-kho-goc':'viet',
  'tai-che-viral':'taicheviral',
  'cham-diem-content':'chamdiemcontent',
  'goi-y-lich':'lich',
  'cham-diem-hook':'chamdiemhook',
  'cai-thien-hook':'hook', 'goi-y-hook-theo-chu-de':'hook', 'goi-y-day-bai':'hook', 'goi-y-tu-nguon':'hook',
  'sua-kenh':'suakenh',
};

function render(container, ctx){
  const state = {
    fullName: (ctx.profile && ctx.profile.full_name) || '',
    avatarPreview: (ctx.profile && ctx.profile.avatar_url) || null,
    avatarSaving:false, nameSaving:false, nameSaved:false,
    newPassword:'', confirmPassword:'', passwordSaving:false, passwordError:null, passwordSaved:false,
    goals: { viet:0, taicheviral:0, chamdiemcontent:0, lich:0, chamdiemhook:0, hook:0, suakenh:0 },
    actualUsage: {}, actualLuot: {},
    referralCount: 0, referralLuotEarned: 0, referralLinkCopied: false,
  };

  const DRAFT_KEY = 'tai-khoan-goals';
  function persistGoals(){ saveModuleDraft(ctx, DRAFT_KEY, state.goals); }

  function draw(){ container.innerHTML = html(); bind(); }

  async function loadGoalsDraft(){
    const draft = await loadModuleDraft(ctx, DRAFT_KEY);
    if(draft) Object.assign(state.goals, draft);
    draw();
  }

  // Đếm số lần thật đã dùng từng nhóm hành động — dùng thử thì tính TRỌN ĐỜI (khớp cách trial_ai_uses
  // hoạt động), trả phí thì chỉ tính THÁNG NÀY (khớp cách paid_ai_uses tự reset mỗi tháng).
  async function loadActualUsage(){
    const { isTrial } = remainingInfo();
    let query = ctx.supabase.from('ai_usage_log').select('action_key, weight').eq('user_id', ctx.user.id);
    if(!isTrial){
      const now = new Date();
      query = query.gte('created_at', new Date(now.getFullYear(), now.getMonth(), 1).toISOString());
    }
    const { data } = await query;
    const counts = {}; const luot = {};
    (data||[]).forEach(r=>{
      const g = ACTION_KEY_TO_GOAL[r.action_key]; if(!g) return;
      counts[g] = (counts[g]||0)+1;
      // Cộng đúng weight ĐÃ GHI ở từng dòng log (không tự nhân lại theo weight hiện tại) — chính xác
      // ngay cả khi trọng số 1 hành động đổi theo thời gian, khớp đúng số lượt thật đã bị trừ.
      luot[g] = (luot[g]||0) + (r.weight||0);
    });
    state.actualUsage = counts;
    state.actualLuot = luot;
    draw();
  }

  // Đếm số người đã giới thiệu thành công + tổng lượt đã được thưởng — bảng referrals chỉ có dòng
  // khi referee đã trả tiền THẬT (xem creditReferralReward trong api/sepay-webhook.js), nên đây
  // đúng nghĩa "đã giới thiệu thành công", không tính người mới bấm link nhưng chưa mua gì.
  async function loadReferralStats(){
    const { data } = await ctx.supabase.from('referrals').select('reward_luot').eq('referrer_id', ctx.user.id);
    const rows = data || [];
    state.referralCount = rows.length;
    state.referralLuotEarned = rows.reduce((sum,r)=> sum + (r.reward_luot||0), 0);
    draw();
  }

  function referralLink(){
    const refCode = ctx.profile && ctx.profile.ref_code;
    if(!refCode) return '';
    return `${location.origin}${location.pathname}?ref=${refCode}`;
  }

  function remainingInfo(){
    const p = ctx.profile;
    if(!p) return { used:0, limit:100, remaining:100, isTrial:true };
    if(p.has_paid){
      const month = new Date().toISOString().slice(0,7);
      const sameMonth = p.paid_ai_month === month;
      const used = sameMonth ? (p.paid_ai_uses||0) : 0;
      const bonus = sameMonth ? (p.paid_ai_bonus||0) : 0;
      const limit = 250 + bonus;
      return { used, limit, remaining: Math.max(0, limit-used), isTrial:false };
    }
    const used = p.trial_ai_uses || 0;
    return { used, limit:100, remaining: Math.max(0, 100-used), isTrial:true };
  }

  function limitLabel(){
    const { used, limit, isTrial } = remainingInfo();
    return isTrial
      ? `Đã dùng <b>${used}/${limit}</b> lượt AI dùng thử (trọn đời) — còn <b>${Math.max(0,limit-used)}</b> lượt.`
      : `Đã dùng <b>${used}/${limit}</b> lượt AI tháng này — còn <b>${Math.max(0,limit-used)}</b> lượt.`;
  }

  function goalTotal(){
    return GOAL_ITEMS.reduce((sum,g)=> sum + (Number(state.goals[g.key])||0) * g.weight, 0);
  }

  function html(){
    return `
      <div class="page-head"><h1>Tài khoản</h1><p>Thông tin đăng nhập, ảnh đại diện, và cách lượt AI được tính để bạn tự lên kế hoạch dùng trong tháng.</p></div>

      <div class="card" style="margin-bottom:20px;">
        <h3 style="margin-bottom:12px;">Hồ sơ</h3>
        <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
          ${state.avatarPreview
            ? `<img src="${state.avatarPreview}" style="width:72px;height:72px;border-radius:50%;object-fit:cover;">`
            : `<div style="width:72px;height:72px;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:26px;">${esc((state.fullName||'?').charAt(0).toUpperCase())}</div>`}
          <div>
            <input type="file" accept="image/*" id="tk-avatar-upload" style="font-size:13px;">
            ${state.avatarSaving?`<div style="font-size:12px;color:var(--ink-soft);margin-top:4px;">Đang lưu…</div>`:''}
          </div>
        </div>

        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:16px 0 6px;">Tên hiển thị</label>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <input id="tk-name" type="text" value="${esc(state.fullName)}" style="flex:1;min-width:200px;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-size:14px;">
          <button class="btn btn-sm" data-action="save-name" ${state.nameSaving?'disabled':''}>${state.nameSaving?'Đang lưu…':'Lưu tên'}</button>
        </div>
        ${state.nameSaved?`<div style="color:var(--accent);font-size:12.5px;margin-top:6px;">✓ Đã lưu</div>`:''}

        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:16px 0 6px;">Email đăng nhập</label>
        <div class="body" style="background:var(--accent-soft);padding:10px 12px;border-radius:8px;font-size:13.5px;">${esc((ctx.user&&ctx.user.email)||'')}</div>
      </div>

      <div class="card" style="margin-bottom:20px;">
        <h3 style="margin-bottom:12px;">Đổi mật khẩu</h3>
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:6px;">Mật khẩu mới (ít nhất 6 ký tự)</label>
        <input id="tk-pass" type="password" placeholder="Mật khẩu mới" style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-size:14px;margin-bottom:10px;">
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:6px;">Nhập lại mật khẩu mới</label>
        <input id="tk-pass-confirm" type="password" placeholder="Nhập lại mật khẩu mới" style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-size:14px;margin-bottom:10px;">
        <button class="btn btn-sm" data-action="save-password" ${state.passwordSaving?'disabled':''}>${state.passwordSaving?'Đang đổi…':'Đổi mật khẩu'}</button>
        ${state.passwordError?`<div class="error-box" style="margin-top:10px;">${esc(state.passwordError)}</div>`:''}
        ${state.passwordSaved?`<div style="color:var(--accent);font-size:12.5px;margin-top:8px;">✓ Đã đổi mật khẩu thành công</div>`:''}
      </div>

      <div class="card" style="margin-bottom:20px;">
        <h3 style="margin-bottom:6px;">Giới thiệu bạn bè</h3>
        <div class="hint-box" style="margin-bottom:14px;">Chia sẻ link dưới đây — bạn bè bấm vào đăng ký sẽ được <b>giảm 15%</b> khi mua gói giá thường (không áp dụng gói ưu đãi/flash-sale), còn bạn được <b>tặng lượt AI</b> tương đương 15% giá trị đơn hàng của họ ngay khi họ thanh toán thành công lần đầu.</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <input readonly value="${esc(referralLink())}" style="flex:1;min-width:220px;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-size:13px;background:var(--panel);" onclick="this.select()">
          <button class="btn btn-sm" data-action="copy-referral-link">${state.referralLinkCopied?'✓ Đã copy':'Copy link'}</button>
        </div>
        <div style="display:flex;gap:24px;margin-top:14px;flex-wrap:wrap;">
          <div><div style="font-size:20px;font-weight:700;color:var(--accent);">${state.referralCount}</div><div style="font-size:12px;color:var(--ink-soft);">người đã giới thiệu thành công</div></div>
          <div><div style="font-size:20px;font-weight:700;color:var(--accent);">${state.referralLuotEarned}</div><div style="font-size:12px;color:var(--ink-soft);">lượt AI đã được tặng</div></div>
        </div>
      </div>

      <div class="card">
        <h3 style="margin-bottom:6px;">Lượt AI — lên kế hoạch dùng trong tháng</h3>
        <div class="hint-box" style="margin-bottom:14px;">${limitLabel()}</div>

        <label style="display:block;font-family:'IBM Plex Mono',monospace;font-size:12px;text-transform:uppercase;letter-spacing:.04em;font-weight:700;color:var(--gold);margin-bottom:8px;">Mỗi hành động tốn bao nhiêu lượt</label>
        ${ACTION_WEIGHTS_DISPLAY.map(a=>`
          <div style="display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid var(--line);font-size:13.5px;">
            <span>${esc(a.label)}</span>
            <span style="font-weight:700;color:var(--accent);white-space:nowrap;">${a.weight} lượt</span>
          </div>
        `).join('')}

        <label style="display:block;font-family:'IBM Plex Mono',monospace;font-size:12px;text-transform:uppercase;letter-spacing:.04em;font-weight:700;color:var(--accent);margin:20px 0 4px;padding-top:16px;border-top:1px solid var(--line);">Đặt mục tiêu tháng này — tự tính xem có đủ lượt không</label>
        <div style="font-size:12.5px;color:var(--ink-soft);margin-bottom:10px;">Ô bên dưới điền <b>số LẦN</b> bạn dự định làm (không phải số lượt) — hệ thống tự nhân theo trọng số để ra tổng lượt cần, rồi báo ngay nếu vượt quá số lượt bạn còn. "Thực tế" hiện cả số lần đã thực sự làm và số lượt AI thật đã tiêu cho đúng nhóm đó${remainingInfo().isTrial?' (tính trọn đời dùng thử)':' (tính trong tháng này)'}, để tự đối chiếu với kế hoạch.</div>
        ${GOAL_ITEMS.map(g=>`
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:6px 0;flex-wrap:wrap;">
            <span style="font-size:13.5px;">${esc(g.label)} <span style="color:var(--ink-soft);font-size:12px;">(${g.weight} lượt/lần)</span></span>
            <div style="display:flex;align-items:center;gap:10px;">
              <span style="font-size:12px;color:var(--ink-soft);white-space:nowrap;">Thực tế: <b style="color:var(--accent);">${state.actualUsage[g.key]||0} lần</b> · <b style="color:var(--accent);">${state.actualLuot[g.key]||0} lượt</b></span>
              <input type="number" min="0" data-goal="${g.key}" value="${state.goals[g.key]}" style="width:70px;padding:6px 8px;border:1px solid var(--line);border-radius:6px;font-size:13.5px;text-align:center;"> <span style="font-size:11.5px;color:var(--ink-soft);">lần</span>
            </div>
          </div>
        `).join('')}
        ${(() => {
          const { remaining } = remainingInfo();
          const total = goalTotal();
          const over = total > remaining;
          return `
            <div style="margin-top:12px;padding:12px;border-radius:8px;background:${over?'#FBEAE4':'var(--accent-soft)'};">
              <b style="color:${over?'var(--danger)':'var(--accent)'};">Tổng cần: ${total} lượt</b> — bạn còn ${remaining} lượt.
              ${over ? `<div style="margin-top:4px;color:var(--danger);font-size:13px;">⚠️ Vượt quá ${total-remaining} lượt so với số bạn còn — nên giảm bớt mục tiêu, hoặc <a href="#nang-cap">mua thêm lượt</a>.</div>` : `<div style="margin-top:4px;font-size:13px;color:var(--ink-soft);">Đủ dùng, còn dư ${remaining-total} lượt.</div>`}
            </div>
          `;
        })()}
      </div>
    `;
  }

  function bind(){
    const copyRefBtn = container.querySelector('[data-action="copy-referral-link"]');
    if(copyRefBtn) copyRefBtn.onclick = async ()=>{
      try{ await navigator.clipboard.writeText(referralLink()); } catch(e){}
      state.referralLinkCopied = true; draw();
      setTimeout(()=>{ state.referralLinkCopied = false; draw(); }, 2000);
    };
    container.querySelectorAll('[data-goal]').forEach(el=>{
      el.oninput = ()=>{
        const key = el.getAttribute('data-goal');
        state.goals[key] = Number(el.value)||0;
        draw();
        persistGoals();
        const newEl = container.querySelector(`[data-goal="${key}"]`);
        if(newEl) newEl.focus();
      };
    });
    const upload = container.querySelector('#tk-avatar-upload');
    if(upload) upload.onchange = ()=>{
      const file = upload.files[0];
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
          const { error } = await ctx.supabase.from('profiles').update({ avatar_url: dataUrl }).eq('id', ctx.user.id);
          state.avatarSaving = false;
          // ctx.profile là CÙNG 1 tham chiếu object với AppState.profile (app-shell.js truyền thẳng
          // AppState.profile khi tạo ctx) — sửa ctx.profile ở đây tự động cập nhật AppState.profile
          // luôn, không cần đụng gì thêm.
          if(!error && ctx.profile) ctx.profile.avatar_url = dataUrl;
          const footEl = document.getElementById('sidebar-foot-info');
          if(footEl) footEl.innerHTML = sidebarFootHtml();
          draw();
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    };

    const nameInput = container.querySelector('#tk-name');
    if(nameInput) nameInput.oninput = ()=>{ state.fullName = nameInput.value; state.nameSaved = false; };

    const saveNameBtn = container.querySelector('[data-action="save-name"]');
    if(saveNameBtn) saveNameBtn.onclick = async ()=>{
      state.nameSaving = true; draw();
      const { error } = await ctx.supabase.from('profiles').update({ full_name: state.fullName.trim() }).eq('id', ctx.user.id);
      state.nameSaving = false;
      if(!error){
        state.nameSaved = true;
        if(ctx.profile) ctx.profile.full_name = state.fullName.trim();
        const footEl = document.getElementById('sidebar-foot-info');
        if(footEl) footEl.innerHTML = sidebarFootHtml();
      }
      draw();
    };

    const passInput = container.querySelector('#tk-pass');
    if(passInput) passInput.oninput = ()=>{ state.newPassword = passInput.value; };
    const passConfirmInput = container.querySelector('#tk-pass-confirm');
    if(passConfirmInput) passConfirmInput.oninput = ()=>{ state.confirmPassword = passConfirmInput.value; };

    const savePassBtn = container.querySelector('[data-action="save-password"]');
    if(savePassBtn) savePassBtn.onclick = async ()=>{
      state.passwordSaved = false;
      if(state.newPassword.length < 6){ state.passwordError = 'Mật khẩu mới cần ít nhất 6 ký tự.'; draw(); return; }
      if(state.newPassword !== state.confirmPassword){ state.passwordError = 'Mật khẩu xác nhận không khớp — kiểm tra lại.'; draw(); return; }
      state.passwordSaving = true; state.passwordError = null; draw();
      const { error } = await ctx.supabase.auth.updateUser({ password: state.newPassword });
      state.passwordSaving = false;
      if(error){ state.passwordError = error.message; }
      else { state.passwordSaved = true; state.newPassword = ''; state.confirmPassword = ''; }
      draw();
    };
  }

  draw();
  loadGoalsDraft();
  loadActualUsage();
  loadReferralStats();
}
window.Modules = window.Modules || {};
window.Modules['tai-khoan'] = { title:'Tài khoản', render };
})();
