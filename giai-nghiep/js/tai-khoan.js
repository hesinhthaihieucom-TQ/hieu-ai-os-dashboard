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
        </div>`;
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
