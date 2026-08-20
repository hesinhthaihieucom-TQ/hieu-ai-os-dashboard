(function(){
// Trọng số lượt hiển thị cho người dùng tự lên kế hoạch — PHẢI khớp tay với AI_WEIGHTS ở
// api/_lib/trial-quota.js (và bản sao GATED_API_WEIGHTS ở app-shell.js) mỗi khi đổi trọng số,
// giống quy ước đã có ở app-shell.js. Đây chỉ là bảng để NGƯỜI DÙNG xem, không phải nơi chặn thật.
const ACTION_WEIGHTS_DISPLAY = [
  { label:'Cải thiện hook / Chấm điểm hook / Gợi ý hook theo chủ đề / Gợi ý đẩy bài / Gợi ý từ nguồn', weight:1 },
  { label:'Chấm điểm Content / AI gợi ý lịch tuần', weight:2 },
  { label:'Viết Content (bài mới hoặc từ Kho gốc) / Tái Chế Content Viral', weight:3 },
  { label:'Sửa Kênh (audit kênh)', weight:4 },
  { label:'Định Vị (làm hoặc sửa lại 18 câu)', weight:5 },
  { label:'Định Vị — dán kết quả có sẵn', weight:6 },
];

function render(container, ctx){
  const state = {
    fullName: (ctx.profile && ctx.profile.full_name) || '',
    avatarPreview: (ctx.profile && ctx.profile.avatar_url) || null,
    avatarSaving:false, nameSaving:false, nameSaved:false,
    newPassword:'', confirmPassword:'', passwordSaving:false, passwordError:null, passwordSaved:false,
  };

  function draw(){ container.innerHTML = html(); bind(); }

  function limitLabel(){
    const p = ctx.profile;
    if(!p) return '';
    if(p.has_paid){
      const month = new Date().toISOString().slice(0,7);
      const sameMonth = p.paid_ai_month === month;
      const used = sameMonth ? (p.paid_ai_uses||0) : 0;
      const bonus = sameMonth ? (p.paid_ai_bonus||0) : 0;
      const limit = 250 + bonus;
      return `Đã dùng <b>${used}/${limit}</b> lượt AI tháng này — còn <b>${Math.max(0,limit-used)}</b> lượt.`;
    }
    const used = p.trial_ai_uses || 0;
    return `Đã dùng <b>${used}/50</b> lượt AI dùng thử (trọn đời) — còn <b>${Math.max(0,50-used)}</b> lượt.`;
  }

  // Ví dụ cụ thể để người dùng tự ước lượng lịch làm việc trong tháng — dùng đúng trọng số thật ở
  // trên, không phải số tuỳ tiện.
  function planningExamples(){
    const limit = (ctx.profile && ctx.profile.has_paid) ? (250 + (ctx.profile.paid_ai_bonus||0)) : 50;
    const onlyContent = Math.floor(limit / 3);
    const contentPlusScore = Math.floor(limit / 5);
    const fullWorkflow = Math.floor(limit / 6);
    return [
      { desc:`Chỉ Viết Content (3 lượt/bài), không làm gì khác`, count:`~${onlyContent} bài/tháng` },
      { desc:`Viết Content + Chấm điểm Content mỗi bài (3+2=5 lượt/bài)`, count:`~${contentPlusScore} bài/tháng` },
      { desc:`Viết Content + Chấm điểm + tạo Hook mỗi bài (3+2+1=6 lượt/bài)`, count:`~${fullWorkflow} bài/tháng` },
    ];
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

      <div class="card">
        <h3 style="margin-bottom:6px;">Lượt AI — lên kế hoạch dùng trong tháng</h3>
        <div class="hint-box" style="margin-bottom:14px;">${limitLabel()}</div>

        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:8px;">Mỗi hành động tốn bao nhiêu lượt</label>
        ${ACTION_WEIGHTS_DISPLAY.map(a=>`
          <div style="display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid var(--line);font-size:13.5px;">
            <span>${esc(a.label)}</span>
            <span style="font-weight:700;color:var(--accent);white-space:nowrap;">${a.weight} lượt</span>
          </div>
        `).join('')}

        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:18px 0 8px;">Ví dụ để dễ hình dung — với số lượt hiện tại của bạn</label>
        ${planningExamples().map(e=>`
          <div style="display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid var(--line);font-size:13.5px;">
            <span>${esc(e.desc)}</span>
            <span style="font-weight:700;white-space:nowrap;">${esc(e.count)}</span>
          </div>
        `).join('')}
        <div style="margin-top:12px;font-size:12.5px;color:var(--ink-soft);">Đây chỉ là ví dụ tham khảo — bạn có thể trộn nhiều hành động khác nhau tuỳ nhu cầu thực tế. Hết lượt trước khi hết tháng thì vào mục <a href="#nang-cap">Nâng cấp / Mua gói</a> để mua thêm.</div>
      </div>
    `;
  }

  function bind(){
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
}
window.Modules = window.Modules || {};
window.Modules['tai-khoan'] = { title:'Tài khoản', render };
})();
