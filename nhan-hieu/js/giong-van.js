(function(){
function render(container, ctx){
  const state = { positioning:null, positioningId:null, sharedBank:[], personalBank:[], applying:null, applyError:null, justApplied:false };

  function draw(){ container.innerHTML = html(); bind(); }

  async function boot(){
    container.innerHTML = `<div class="loading"><div class="spinner"></div><p>Đang tải…</p></div>`;
    const { data: pos } = await ctx.supabase.from('positioning_results').select('*').eq('user_id', ctx.user.id).maybeSingle();
    if(pos && pos.luot1){
      state.positioning = pos;
      state.positioningId = pos.id;
    }
    await Promise.all([loadShared(), loadPersonal()]);
    draw();
  }

  async function loadShared(){
    const { data } = await ctx.supabase.from('content_bank_shared').select('*').order('created_at', { ascending:false }).limit(10);
    state.sharedBank = data || [];
  }
  async function loadPersonal(){
    const { data } = await ctx.supabase.from('content_bank_personal').select('*').eq('user_id', ctx.user.id).order('created_at', { ascending:false }).limit(10);
    state.personalBank = data || [];
  }

  function html(){
    const r = state.positioning ? state.positioning.luot1 : null;
    const samples = [...state.sharedBank, ...state.personalBank];
    return `
      <div class="page-head"><h1>Giọng Văn</h1><p>Đây là "kim chỉ nam" giọng văn của bạn — dùng để tự kiểm tra khi viết tay, hoặc đối chiếu khi AI viết hộ.</p></div>
      ${!r ? `<div class="hint-box">Chưa có <a href="#dinh-vi">Định Vị</a> đã lưu — vẫn chọn giọng mẫu bên dưới được bình thường, kết quả sẽ được lưu riêng cho bạn. Làm Định Vị đầy đủ để có thêm phần bản sắc/triết lý thương hiệu ở đây.</div>` : `
      <div class="section highlight"><h3>Kết luận định vị</h3><div class="body" style="font-family:'Playfair Display',serif;font-size:18px;font-style:italic;">${esc(r.ket_luan_dinh_vi)}</div></div>
      <div class="section"><h3>Giọng điệu & ngôn ngữ hiện tại</h3><div class="body">${esc(r.giong_dieu_ngon_ngu)}</div></div>
      <div class="section"><h3>Bản sắc thương hiệu</h3><div class="body">${esc(r.ban_sac_thuong_hieu)}</div></div>
      <div class="section"><h3>Triết lý thương hiệu</h3><div class="body">${esc(r.triet_ly_thuong_hieu)}</div></div>
      <div class="section"><h3>Không theo đuổi</h3><div class="body">${esc(r.khong_theo_duoi)}</div></div>
      <div class="section"><h3>Kiểu hook phù hợp</h3><div class="body">${esc(r.hook_mo_dau && r.hook_mo_dau.kieu_hook)}</div>
        <ul>${((r.hook_mo_dau && r.hook_mo_dau.vi_du)||[]).map(h=>`<li>${esc(h)}</li>`).join('')}</ul></div>
      `}
      ${(!r && state.positioning && state.positioning.luot1 && state.positioning.luot1.giong_dieu_ngon_ngu) ? `
        <div class="section highlight"><h3>Giọng điệu &amp; ngôn ngữ vừa chọn</h3><div class="body">${esc(state.positioning.luot1.giong_dieu_ngon_ngu)}</div></div>
      ` : ''}

      <div class="page-head" style="margin-top:30px;"><h1 style="font-size:20px;">Hoặc chọn giọng mẫu từ Kho Content</h1>
      <p>Không muốn tự mô tả giọng văn? Chọn 1 bài mẫu bạn thích trong Kho Content — hệ thống sẽ tự rút ra giọng điệu từ bài đó và áp thẳng cho bạn.</p></div>
      ${samples.length===0 ? `<div class="card" style="color:var(--ink-soft);">Kho Content đang trống — sang <a href="#kho-content">Kho Content</a> để thêm bài mẫu trước.</div>` : ''}
      ${samples.map(s=>`
        <div class="section">
          <h3>${esc(s.title)}</h3>
          <div class="body">${esc((s.content||'').slice(0,220))}${(s.content||'').length>220?'…':''}</div>
          <div class="btn-row" style="margin-top:12px;justify-content:flex-start;">
            <button class="btn btn-sm" data-apply="${s.id}" ${state.applying===s.id?'disabled':''}>${state.applying===s.id?'Đang phân tích…':'Dùng giọng này'}</button>
          </div>
        </div>
      `).join('')}
      ${state.applyError?`<div class="error-box">${esc(state.applyError)}</div>`:''}
      ${state.justApplied?`<div class="hint-box">Đã cập nhật giọng điệu & ngôn ngữ theo bài mẫu bạn chọn — xem lại ở phần trên.</div>`:''}

      <div class="btn-row" style="margin-top:20px;"><a class="btn-ghost btn" href="#dinh-vi">Xem toàn bộ Định Vị →</a></div>
    `;
  }

  function bind(){
    const samples = [...state.sharedBank, ...state.personalBank];
    container.querySelectorAll('[data-apply]').forEach(el=>{
      el.onclick = ()=>{
        const id = el.getAttribute('data-apply');
        const sample = samples.find(s=>s.id===id);
        if(sample) applyVoice(sample);
      };
    });
  }

  async function applyVoice(sample){
    state.applying = sample.id; state.applyError = null; state.justApplied = false; draw();
    try{
      const data = await callApi('/api/goi-y-giong-van', { sample_text: sample.content });
      if(state.positioning){
        const newLuot1 = { ...state.positioning.luot1, giong_dieu_ngon_ngu: data.result.giong_dieu_ngon_ngu };
        const { error } = await ctx.supabase.from('positioning_results').update({ luot1: newLuot1 }).eq('id', state.positioningId);
        if(error) throw error;
        state.positioning.luot1 = newLuot1;
      } else {
        const { data: row, error } = await ctx.supabase.from('positioning_results')
          .upsert({ user_id: ctx.user.id, luot1: { giong_dieu_ngon_ngu: data.result.giong_dieu_ngon_ngu } }, { onConflict:'user_id' })
          .select().single();
        if(error) throw error;
        state.positioning = row;
        state.positioningId = row.id;
      }
      state.justApplied = true;
    } catch(e){ state.applyError = e.message; }
    state.applying = null;
    draw();
  }

  boot();
}
window.Modules = window.Modules || {};
window.Modules['giong-van'] = { title:'Giọng Văn', render };
})();
