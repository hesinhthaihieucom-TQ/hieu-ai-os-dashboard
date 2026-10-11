(function(){
// Cài đặt — (1) thương hiệu/chữ ký/bộ quy tắc dựng, (2) ghép nối Máy dựng, (3) tài khoản.
// Token ghép nối chỉ hiện ĐÚNG 1 LẦN lúc tạo (server chỉ giữ băm) — khách phải dán ngay vào Máy dựng.
// Tên cột/RPC: profiles.dv_* ghi qua update_my_dv_settings (khách không .update() thẳng profiles).
const CHANNELS = [['phat_trien','Phát triển bản thân'],['suc_khoe','Sức khỏe'],['khac','Kênh khác (quy tắc chung)']];
window.Modules = window.Modules || {};
window.Modules['cai-dat'] = {
  title: 'Cài đặt',
  async render(container, ctx){
    const p = ctx.profile || {};
    const state = { brand:p.dv_brand_name||'', sig:p.dv_signature||'', channel:p.dv_channel||'khac', machines:[], newToken:null, pairName:'Máy dựng của tôi', msg:null, err:null, help:false };
    async function loadMachines(){
      const { data } = await ctx.supabase.from('dv_machines').select('id,name,last_seen_at,info,created_at').eq('user_id', ctx.user.id).order('created_at');
      state.machines = data || [];
    }
    function draw(){
      container.innerHTML = `
        <div class="page-head"><h1>Cài đặt</h1></div>
        <div class="card" style="margin-bottom:16px;"><h3 style="font-family:'Be Vietnam Pro',sans-serif;font-size:18px;">Thương hiệu & bộ quy tắc dựng</h3>
          <div class="field"><label>Thương hiệu trên bìa</label><input type="text" id="brand" maxlength="60" placeholder="VD: Hải Phạm" value="${esc(state.brand)}"></div>
          <div class="field"><label>Chữ ký dưới video</label><input type="text" id="sig" maxlength="60" placeholder="VD: Hiểu để Hạnh Phúc" value="${esc(state.sig)}"></div>
          <div class="field"><label>Bộ quy tắc dựng</label><select id="ch" style="margin-top:0;">${CHANNELS.map(([k,l])=>`<option value="${k}" ${state.channel===k?'selected':''}>${l}</option>`).join('')}</select></div>
          <button class="btn btn-full" id="save">Lưu cài đặt</button>
          ${state.msg?`<div class="hint-box">${esc(state.msg)}</div>`:''}${state.err?`<div class="error-box">${esc(state.err)}</div>`:''}</div>
        <div class="card" style="margin-bottom:16px;"><h3 style="font-family:'Be Vietnam Pro',sans-serif;font-size:18px;">Máy dựng</h3>
          <p style="color:var(--ink-soft);font-size:15.5px;line-height:1.6;margin:8px 0 14px;">Máy dựng là chương trình chạy trên máy tính của bạn: nó nhận video bạn gửi, dựng xong gửi lại. Bật máy tính và chạy chương trình thì việc mới sẽ được nhận trong vài giây.</p>
          ${state.machines.length ? state.machines.map(m=>{ const on = machineOnline(m); return `
            <div class="list-item"><div class="txt"><b>${esc(m.name)}</b><br><span style="font-size:14.5px;color:var(--ink-soft);">${on?'🟢 Đang bật':'⚪ Đang tắt'} · hỏi lần cuối ${esc(fmtWhen(m.last_seen_at)||'chưa lần nào')}${m.info&&m.info.ffmpeg===false?'<br>⚠️ Máy này chưa có ffmpeg':''}</span></div>
              <span class="btn btn-ghost btn-sm" data-revoke="${m.id}">Thu hồi</span></div>`; }).join('') : '<div style="color:var(--ink-soft);margin-bottom:12px;">Chưa ghép nối máy nào.</div>'}
          ${state.newToken?`<div class="hint-box" style="margin-top:14px;"><b>Mã ghép nối (chỉ hiện 1 lần, hãy sao chép ngay):</b><div class="code-box">${esc(state.newToken)}</div>
            <button class="btn btn-ghost btn-sm" id="copy-token">Sao chép mã</button></div>`:''}
          <div class="field"><label>Tên máy</label><input type="text" id="pname" maxlength="40" value="${esc(state.pairName)}"></div>
          <button class="btn btn-sm" id="pair" style="margin-top:10px;">+ Tạo mã ghép nối</button>
          <div><span class="more-toggle" id="help">${state.help?'▴ Thu gọn':'▾ Cách cài Máy dựng'}</span>
          ${state.help?`<ol style="font-size:15.5px;line-height:1.8;color:var(--ink-soft);padding-left:20px;"><li>Cài chương trình Máy dựng lên máy tính của bạn (hướng dẫn kèm theo bộ cài).</li><li>Mở chương trình, dán mã ghép nối ở trên.</li><li>Để máy tính bật và chương trình chạy. Khi trạng thái ở Tổng quan là "Sẵn sàng" là dùng được.</li></ol>`:''}</div></div>
        <div class="card"><h3 style="font-family:'Be Vietnam Pro',sans-serif;font-size:18px;">Tài khoản</h3>
          <div class="field"><label>Họ tên</label><input type="text" id="fname" maxlength="60" value="${esc(p.full_name||'')}"></div>
          <div style="font-size:15px;color:var(--ink-soft);margin-top:12px;">Email: ${esc(ctx.user.email||'')}</div>
          <button class="btn btn-ghost btn-sm" id="save-name" style="margin-top:14px;">Lưu tên</button></div>`;
      const v = (id)=>container.querySelector(id);
      v('#brand').oninput = (e)=>{ state.brand = e.target.value; };
      v('#sig').oninput = (e)=>{ state.sig = e.target.value; };
      v('#ch').onchange = (e)=>{ state.channel = e.target.value; };
      v('#pname').oninput = (e)=>{ state.pairName = e.target.value; };
      v('#help').onclick = ()=>{ state.help = !state.help; draw(); };
      v('#save').onclick = async ()=>{
        const { error } = await ctx.supabase.rpc('update_my_dv_settings', { p_brand:state.brand.trim(), p_signature:state.sig.trim(), p_channel:state.channel });
        state.err = error ? 'Không lưu được — thử lại giúp mình.' : null; state.msg = error ? null : 'Đã lưu.';
        if(!error && window.loadProfile){ await loadProfile(); ctx.profile = AppState.profile; }
        draw();
      };
      v('#save-name').onclick = async ()=>{
        const { error } = await ctx.supabase.rpc('update_my_full_name', { new_name: container.querySelector('#fname').value.trim() });
        state.err = error ? 'Không lưu được tên — thử lại giúp mình.' : null; state.msg = error ? null : 'Đã lưu tên.';
        if(!error){ await loadProfile(); ctx.profile = AppState.profile; }
        draw();
      };
      v('#pair').onclick = async (e)=>{
        e.target.disabled = true; e.target.textContent = 'Đang tạo…';
        try{ const r = await callApi('api/dung-video-pair', { action:'create', name:state.pairName }); state.newToken = r.token; state.err = null; await loadMachines(); }
        catch(err){ state.err = err.message; }
        draw();
      };
      const cp = v('#copy-token'); if(cp) cp.onclick = async ()=>{ try{ await navigator.clipboard.writeText(state.newToken); cp.textContent = 'Đã sao chép ✓'; }catch(e){ cp.textContent = 'Hãy bôi đen mã rồi sao chép tay'; } };
      container.querySelectorAll('[data-revoke]').forEach(el=>{ el.onclick = async ()=>{
        if(!await confirmModal('Thu hồi máy này? Máy sẽ không nhận việc nữa cho đến khi ghép nối lại.', 'Thu hồi')) return;
        await ctx.supabase.from('dv_machines').delete().eq('id', el.getAttribute('data-revoke')); await loadMachines(); draw();
      }; });
    }
    container.innerHTML = `<div class="loading"><div class="spinner"></div><p>Đang tải…</p></div>`;
    await loadMachines(); draw();
  },
};
})();
