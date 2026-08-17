(function(){
function render(container, ctx){
  const state = { text:'', result:null, error:null, loading:false, positioning:null, history:[] };

  function draw(){ container.innerHTML = html(); bind(); }

  async function boot(){
    draw();
    const { data: pos } = await ctx.supabase.from('positioning_results').select('*').eq('user_id', ctx.user.id).maybeSingle();
    state.positioning = pos || null;
    const { data: hist } = await ctx.supabase.from('hook_scores').select('*').eq('user_id', ctx.user.id).order('created_at', { ascending:false }).limit(5);
    state.history = hist || [];
    draw();
  }

  function html(){
    return `
      <div class="page-head"><h1>Chấm Điểm Hook</h1><p>Dán 1 câu hook — AI phân tích cơ chế tâm lý, dự đoán mức độ dừng lại, và gợi ý 3 bản cải thiện.</p></div>
      <div class="card">
        <textarea id="hook-input" style="min-height:70px;" placeholder="Ví dụ: Vì sao bạn viết đều mà vẫn không ai nhớ đến?">${esc(state.text)}</textarea>
        <div class="btn-row"><button class="btn" data-action="score" ${state.loading?'disabled':''}>${state.loading?'Đang chấm…':'Chấm điểm hook này'}</button></div>
        ${state.error?`<div class="error-box">${esc(state.error)}</div>`:''}
      </div>
      ${state.result ? resultHtml() : ''}
      ${state.history.length ? `<div style="margin-top:28px;"><h3 style="font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px;">Lịch sử chấm gần đây</h3>
        ${state.history.map(h=>`<div class="list-item"><div class="txt"><div class="meta">${new Date(h.created_at).toLocaleDateString('vi-VN')} · ${h.result.diem_tong}/100</div>${esc(h.hook_text)}</div></div>`).join('')}
      </div>` : ''}
    `;
  }

  function resultHtml(){
    const r = state.result;
    return `
      <div class="section highlight"><h3>Điểm tổng</h3><div class="body" style="font-size:32px;font-weight:700;">${r.diem_tong}<span style="font-size:16px;">/100</span></div></div>
      <div class="section"><h3>Loại hook</h3><div class="body">${esc(r.loai_hook)}</div></div>
      <div class="section"><h3>Cơ chế tâm lý</h3><div class="body">${esc(r.co_che_tam_ly)}</div></div>
      <div class="section"><h3>Có đúng tệp không</h3><div class="body">${esc(r.dung_tep_khong)}</div></div>
      <div class="section"><h3>Dự đoán mức độ dừng lại: ${esc(r.du_doan_muc_do_dung_lai)}</h3><div class="body">${esc(r.giai_thich_du_doan)}</div></div>
      <div class="section"><h3>Điểm yếu</h3><div class="body">${esc(r.diem_yeu)}</div></div>
      <div class="section"><h3>3 bản cải thiện</h3><ul>${r.ban_cai_thien.map(h=>`<li>${esc(h)}</li>`).join('')}</ul></div>
    `;
  }

  function bind(){
    const input = container.querySelector('#hook-input');
    if(input) input.oninput = ()=>{ state.text = input.value; };
    const btn = container.querySelector('[data-action="score"]');
    if(btn) btn.onclick = score;
  }

  async function score(){
    if(!state.text.trim()) return;
    state.loading = true; state.error = null; draw();
    try{
      const data = await callApi('/api/cham-diem-hook', {
        hook_text: state.text,
        positioning: state.positioning && state.positioning.luot1 ? { luot1: state.positioning.luot1 } : null,
      });
      state.result = data.result;
      await ctx.supabase.from('hook_scores').insert({ user_id: ctx.user.id, hook_text: state.text, result: data.result });
      state.loading = false; draw();
    } catch(e){ state.error = e.message; state.loading = false; draw(); }
  }

  boot();
}
window.Modules = window.Modules || {};
window.Modules['cham-diem-hook'] = { title:'Chấm Điểm Hook', render };
})();
