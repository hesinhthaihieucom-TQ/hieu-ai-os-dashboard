(function(){
function render(container, ctx){
  const state = {
    screen:'loading', positioning:null, quickContext:'',
    viralText:'', topic:'', mode:'tieu_de',
    generating:false, error:null, result:null,
    savedTitleIdx:{}, savedPostIdx:{},
  };

  function draw(){ container.innerHTML = html(); bind(); }

  async function boot(){
    draw();
    const { data: pos } = await ctx.supabase.from('positioning_results').select('*').eq('user_id', ctx.user.id).maybeSingle();
    state.positioning = (pos && pos.luot1) ? pos : null;
    state.screen = 'main';
    draw();
  }

  function html(){
    if(state.screen==='loading') return `<div class="loading"><div class="spinner"></div><p>Đang tải…</p></div>`;
    return `
      <div class="page-head"><h1>Phân Tích &amp; Tái Chế Content Viral</h1>
      <p>Dán 1 bài/video đang viral, để AI mổ xẻ đúng lý do nó thành công — rồi áp dụng chính cấu trúc tâm lý đó cho chủ đề của bạn.</p></div>

      ${!state.positioning ? `
        <div class="hint-box">Chưa có Định Vị đã lưu — vẫn dùng được bình thường, nhưng nếu <a href="#dinh-vi">làm Định Vị trước</a>, kết quả sẽ đúng giọng văn và đối tượng của bạn hơn.</div>
      ` : ''}

      <div class="card">
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:6px;">1. Dán nguyên văn bài/video đang viral</label>
        <textarea id="viral-text" style="min-height:180px;" placeholder="Dán caption, kịch bản video, hoặc bài viết đang viral bạn muốn học theo...">${esc(state.viralText)}</textarea>

        ${!state.positioning ? `
          <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 6px;">2. Ngành/lĩnh vực &amp; đối tượng của bạn (không bắt buộc)</label>
          <textarea id="quick-context" style="min-height:auto;height:52px;" placeholder="Ví dụ: Coach tài chính cá nhân, hướng tới người mới đi làm...">${esc(state.quickContext)}</textarea>
        ` : ''}

        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 6px;">${state.positioning?'2':'3'}. Chủ đề mới bạn muốn áp dụng</label>
        <textarea id="topic-text" style="min-height:auto;height:52px;" placeholder="Ví dụ: Sai lầm khiến dòng tiền cá nhân bị nghẽn">${esc(state.topic)}</textarea>

        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 6px;">${state.positioning?'3':'4'}. Bạn muốn AI tạo ra gì</label>
        <div class="chips">
          <div class="chip ${state.mode==='tieu_de'?'selected':''}" data-mode="tieu_de">10 tiêu đề mới</div>
          <div class="chip ${state.mode==='bai_moi'?'selected':''}" data-mode="bai_moi">5 bài viết mới hoàn chỉnh</div>
        </div>

        <div class="btn-row"><button class="btn" data-action="generate" ${state.generating?'disabled':''}>${state.generating?'Đang phân tích…':'Phân tích &amp; Tái chế'}</button></div>
        <div class="hint-box" style="margin-top:10px;">AI cần khoảng 1 phút để phân tích và tái chế xong — đừng thoát trang khi đang đợi.</div>
        ${state.error?`<div class="error-box">${esc(state.error)}</div>`:''}
      </div>

      ${state.result ? resultHtml() : ''}
    `;
  }

  function resultHtml(){
    const r = state.result;
    return `
      <div class="section highlight"><h3>Vì sao bài gốc viral</h3>
        <div class="body"><b>Yếu tố mở đầu khiến người đọc dừng lại:</b> ${esc(r.phan_tich.yeu_to_mo_dau)}</div>
        <div class="body" style="margin-top:8px;"><b>Điểm cảm xúc mạnh nhất:</b> ${esc(r.phan_tich.diem_cam_xuc_manh_nhat)} <i>(cảm xúc: ${esc(r.phan_tich.loai_cam_xuc)})</i></div>
        <div class="body" style="margin-top:8px;"><b>Vì sao người đọc muốn share:</b> ${esc(r.phan_tich.ly_do_muon_share)}</div>
      </div>

      ${r.tieu_de_moi && r.tieu_de_moi.length ? `
        <h3 style="font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.05em;margin:22px 0 12px;">10 tiêu đề mới — giữ nguyên cấu trúc tâm lý bài gốc</h3>
        ${r.tieu_de_moi.map((t,i)=>`
          <div class="section">
            <div class="body" style="font-weight:600;">${esc(t)}</div>
            <div class="btn-row" style="margin-top:10px;justify-content:flex-start;">
              <button class="btn btn-sm" data-save-title="${i}" ${state.savedTitleIdx[i]?'disabled':''}>${state.savedTitleIdx[i]?'Đã lưu vào Kho Hook ✓':'Lưu vào Kho Hook'}</button>
              <span class="btn-ghost btn btn-sm" data-write-title="${i}">Viết bài từ tiêu đề này →</span>
            </div>
          </div>
        `).join('')}
      ` : ''}

      ${r.bai_moi && r.bai_moi.length ? `
        <h3 style="font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.05em;margin:22px 0 12px;">5 bài mới — áp dụng đúng công thức bài gốc</h3>
        ${r.bai_moi.map((p,i)=>`
          <div class="section">
            <h3>${esc(p.tieu_de)}</h3>
            <div class="body">${esc(p.noi_dung)}</div>
            <div class="btn-row" style="margin-top:10px;justify-content:flex-start;">
              <button class="btn btn-sm" data-save-post="${i}" ${state.savedPostIdx[i]?'disabled':''}>${state.savedPostIdx[i]?'Đã lưu vào Kho Content ✓':'Lưu vào Kho Content'}</button>
            </div>
          </div>
        `).join('')}
      ` : ''}
    `;
  }

  function bind(){
    const vt = container.querySelector('#viral-text'); if(vt) vt.oninput = ()=>{ state.viralText = vt.value; };
    const qc = container.querySelector('#quick-context'); if(qc) qc.oninput = ()=>{ state.quickContext = qc.value; };
    const tp = container.querySelector('#topic-text'); if(tp) tp.oninput = ()=>{ state.topic = tp.value; };

    container.querySelectorAll('[data-mode]').forEach(el=>{
      el.onclick = ()=>{ state.mode = el.getAttribute('data-mode'); draw(); };
    });

    const genBtn = container.querySelector('[data-action="generate"]');
    if(genBtn) genBtn.onclick = generate;

    container.querySelectorAll('[data-save-title]').forEach(el=>{
      el.onclick = ()=>{ saveTitle(Number(el.getAttribute('data-save-title'))); };
    });
    container.querySelectorAll('[data-write-title]').forEach(el=>{
      el.onclick = ()=>{
        const i = Number(el.getAttribute('data-write-title'));
        window.PendingTopic = state.result.tieu_de_moi[i];
        location.hash = 'viet-content';
      };
    });
    container.querySelectorAll('[data-save-post]').forEach(el=>{
      el.onclick = ()=>{ savePost(Number(el.getAttribute('data-save-post'))); };
    });
  }

  async function generate(){
    if(!state.viralText.trim() || !state.topic.trim()) return;
    state.generating = true; state.error = null; state.result = null;
    state.savedTitleIdx = {}; state.savedPostIdx = {};
    draw();
    try{
      const data = await callApi('/api/tai-che-viral', {
        viral_text: state.viralText,
        topic: state.topic,
        mode: state.mode,
        positioning: state.positioning ? { luot1: state.positioning.luot1, luot2: state.positioning.luot2 } : null,
        quick_context: state.quickContext,
      });
      state.result = data.result;
    } catch(e){ state.error = e.message; }
    state.generating = false; draw();
  }

  async function saveTitle(i){
    const title = state.result.tieu_de_moi[i];
    await ctx.supabase.from('hooks_bank_personal').insert({
      user_id: ctx.user.id, hook_text: title, category: 'Tái chế từ bài viral',
      note: `Chủ đề: ${state.topic}`,
    });
    state.savedTitleIdx[i] = true; draw();
  }

  async function savePost(i){
    const p = state.result.bai_moi[i];
    await ctx.supabase.from('content_bank_personal').insert({
      user_id: ctx.user.id, title: p.tieu_de, content: p.noi_dung,
      source_type: 'tai_che_viral', tags: [state.topic].filter(Boolean),
    });
    state.savedPostIdx[i] = true; draw();
  }

  boot();
}
window.Modules = window.Modules || {};
window.Modules['tai-che-viral'] = { title:'Tái Chế Content Viral', render };
})();
