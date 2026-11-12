(function(){
  window.Modules = window.Modules || {};
  window.Modules['tai-khoan'] = {
    title: 'Tài khoản',
    render(container, ctx){
      const p = ctx.profile || {};
      container.innerHTML = `
        <div class="page-head"><span class="tag">Tài khoản</span><h1>Tài khoản của bạn</h1></div>
        <div class="card">
          <label style="font-weight:600;color:var(--ink-soft);font-size:14.5px;">Email</label>
          <div style="font-size:16.5px;margin:4px 0 14px;">${esc(ctx.user.email||'')}</div>
          <label style="font-weight:600;color:var(--ink-soft);font-size:14.5px;">Họ tên</label>
          <input id="tk-name" type="text" value="${esc(p.full_name||'')}" placeholder="Tên của bạn">
          <button class="btn btn-sm" id="tk-save" style="margin-top:14px;">Lưu tên</button>
          <div id="tk-msg" style="margin-top:10px;font-size:15px;color:var(--ink-soft);"></div>
          <div style="margin-top:18px;font-size:15.5px;color:var(--ink-soft);">Gói: <b>${p.role==='admin'?'Quản trị':'Trọn đời'}</b>${p.gn_paid_at?' · kích hoạt '+new Date(p.gn_paid_at).toLocaleDateString('vi-VN'):''}</div>
          <div style="margin-top:6px;font-size:15.5px;color:var(--ink-soft);">Cần hỗ trợ: Zalo 0866849193</div>
        </div>
        <div class="card" style="margin-top:14px;">
          <h2 style="font-size:19px;margin:0 0 10px;">Đổi mật khẩu</h2>
          <input id="tk-pw1" type="password" placeholder="Mật khẩu mới (ít nhất 6 ký tự)" autocomplete="new-password">
          <input id="tk-pw2" type="password" placeholder="Nhập lại mật khẩu mới" autocomplete="new-password" style="margin-top:10px;">
          <button class="btn btn-sm" id="tk-pw-save" style="margin-top:14px;">Đổi mật khẩu</button>
          <div id="tk-pw-msg" style="margin-top:10px;font-size:15px;color:var(--ink-soft);"></div>
        </div>
        ${p.role==='admin' ? `<div class="card" style="margin-top:14px;">
          <h2 style="font-size:19px;margin:0 0 6px;">Quản trị: mở khoá tay cho khách</h2>
          <div style="font-size:15px;color:var(--ink-soft);margin-bottom:10px;">Dùng khi khách đã chuyển khoản mà app chưa tự mở. Nhập đúng email khách rồi bấm.</div>
          <input id="tk-ad-email" type="email" placeholder="email-cua-khach@gmail.com">
          <button class="btn btn-sm" id="tk-ad-on" style="margin-top:14px;">Mở khoá cho email này</button>
          <div id="tk-ad-msg" style="margin-top:10px;font-size:15px;color:var(--ink-soft);"></div>
        </div>` : ''}`;
      container.querySelector('#tk-pw-save').onclick = async ()=>{
        const a1 = container.querySelector('#tk-pw1').value, a2 = container.querySelector('#tk-pw2').value;
        const m = container.querySelector('#tk-pw-msg');
        if(a1.length < 6){ m.textContent = 'Mật khẩu cần ít nhất 6 ký tự.'; return; }
        if(a1 !== a2){ m.textContent = 'Hai ô mật khẩu chưa giống nhau.'; return; }
        const { error } = await ctx.supabase.auth.updateUser({ password: a1 });
        m.textContent = error ? 'Chưa đổi được: ' + error.message : '✓ Đã đổi mật khẩu — lần sau đăng nhập bằng mật khẩu mới.';
        if(!error){ container.querySelector('#tk-pw1').value = ''; container.querySelector('#tk-pw2').value = ''; }
      };
      const adOn = container.querySelector('#tk-ad-on');
      if(adOn) adOn.onclick = async ()=>{
        const email = container.querySelector('#tk-ad-email').value.trim();
        const m = container.querySelector('#tk-ad-msg');
        if(!email){ m.textContent = 'Nhập email khách.'; return; }
        const { data, error } = await ctx.supabase.rpc('admin_set_gn_paid', { p_email: email, p_paid: true });
        m.textContent = error ? 'Chưa mở được: ' + error.message : (data > 0 ? '✓ Đã mở khoá cho ' + email : 'Không thấy tài khoản nào có email này.');
      };
      container.querySelector('#tk-save').onclick = async ()=>{
        const name = container.querySelector('#tk-name').value.trim();
        const msg = container.querySelector('#tk-msg');
        const { error } = await ctx.supabase.rpc('update_my_full_name', { new_name: name });
        msg.textContent = error ? 'Chưa lưu được: ' + error.message : '✓ Đã lưu';
        if(!error && AppState.profile) AppState.profile.full_name = name;
      };
    }
  };
})();
