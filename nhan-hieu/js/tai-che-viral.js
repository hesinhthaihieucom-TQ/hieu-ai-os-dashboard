(function(){
const TOUR_STEPS = [
  { selector: '#viral-text', title: 'Dán bài đang viral', text: 'Dán nguyên văn caption, kịch bản video, hoặc bài viết đang viral bạn muốn học theo cấu trúc.' },
  { selector: '[data-action="analyze"]', title: 'Phân tích bài viral', text: 'AI mổ xẻ đúng lý do bài gốc viral (tốn 3 lượt AI) — sau khi có kết quả, chọn tái chế thành tiêu đề mới hoặc bài mới đúng chủ đề của bạn.' },
];

function render(container, ctx){
  const state = {
    screen:'loading', positioning:null, quickContext:'',
    viralText:'', topic:'',
    analyzing:false, analyzeError:null, phanTich:null,
    recycleMode:null, // 'tieu_de' | 'bai_moi'
    titlesLoading:false, titlesError:null, titles:null, savedTitleIdx:{},
    postsLoading:false, postsError:null, posts:[], savedPostIdx:{},
  };
  const TOTAL_POSTS = 5;
  const DRAFT_KEY = 'tai-che-viral';
  function draftPayload(){
    return {
      viralText: state.viralText, topic: state.topic, phanTich: state.phanTich,
      recycleMode: state.recycleMode, titles: state.titles, savedTitleIdx: state.savedTitleIdx,
      posts: state.posts, savedPostIdx: state.savedPostIdx,
    };
  }
  function persistDraft(){ saveModuleDraft(ctx, DRAFT_KEY, draftPayload()); }

  function draw(){ container.innerHTML = html(); bind(); }

  async function boot(){
    draw();
    const { data: pos } = await ctx.supabase.from('positioning_results').select('*').eq('user_id', ctx.user.id).maybeSingle();
    state.positioning = (pos && pos.luot1) ? pos : null;
    const draft = await loadModuleDraft(ctx, DRAFT_KEY);
    if(draft) Object.assign(state, draft);
    state.screen = 'main';
    draw();
  }

  function html(){
    if(state.screen==='loading') return `<div class="loading"><div class="spinner"></div><p>Đang tải…</p></div>`;
    return `
      <span class="tour-trigger" id="tcv-start-tour">❓ Hướng dẫn</span>
      <div class="page-head"><h1>Phân Tích &amp; Tái Chế Content Viral</h1>
      <p>Dán 1 bài/video đang viral, để AI mổ xẻ đúng lý do nó thành công — rồi áp dụng chính cấu trúc tâm lý đó cho chủ đề của bạn.</p>
      ${(state.phanTich || state.viralText) ? `<span class="btn-ghost btn btn-sm" data-action="reset-draft" style="margin-top:8px;">Reset, làm bài mới</span>` : ''}
      </div>

      ${!state.positioning ? `
        <div class="hint-box">Chưa có Định Vị đã lưu — vẫn dùng được bình thường, nhưng nếu <a href="#dinh-vi">làm Định Vị trước</a>, kết quả sẽ đúng giọng văn và đối tượng của bạn hơn.</div>
      ` : ''}

      <div class="card">
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:6px;">1. Dán nguyên văn bài/video đang viral</label>
        <textarea id="viral-text" style="min-height:180px;" placeholder="Dán caption, kịch bản video, hoặc bài viết đang viral bạn muốn học theo...">${esc(state.viralText)}</textarea>
        <div class="btn-row" style="margin-top:14px;"><button class="btn" data-action="analyze" ${state.analyzing?'disabled':''}>${state.analyzing?'Đang phân tích…':(state.phanTich?'Phân tích lại':'Phân tích bài viral')}</button> <span style="font-size:11px;color:var(--ink-soft);align-self:center;">(tốn 3 lượt AI)</span></div>
        <div class="hint-box" style="margin-top:10px;">Chỉ mổ xẻ vì sao bài gốc viral trước — chọn tái chế thành gì sau khi có kết quả.</div>
        ${state.analyzeError?`<div class="error-box">${esc(state.analyzeError)}</div>`:''}
      </div>

      ${state.phanTich ? phanTichHtml() : ''}
    `;
  }

  // AI hay dồn các ý đánh số "(1)...(2)...(3)..." liền thành 1 đoạn dài, đọc rất rối mắt — tách
  // mỗi ý xuống dòng riêng và làm đậm số thứ tự để dễ quét ý chính.
  function formatAnalysisText(text){
    if(!text) return '';
    const withBreaks = text.replace(/\s*(\(\d+\))\s*/g, (m, marker, offset) => (offset===0 ? '' : '\n') + marker + ' ');
    return esc(withBreaks).replace(/\(\d+\)/g, m => `<b>${m}</b>`);
  }

  function phanTichHtml(){
    const r = state.phanTich;
    return `
      <div class="section highlight" style="margin-top:20px;"><h3>Vì sao bài gốc viral</h3>
        <div style="margin-bottom:14px;">
          <div style="font-size:12.5px;font-weight:700;color:var(--gold);text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px;">Yếu tố mở đầu khiến người đọc dừng lại</div>
          <div class="body">${formatAnalysisText(r.yeu_to_mo_dau)}</div>
        </div>
        <div style="margin-bottom:14px;">
          <div style="font-size:12.5px;font-weight:700;color:var(--gold);text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px;">Điểm cảm xúc mạnh nhất <span style="text-transform:none;font-weight:600;color:var(--ink-soft);">(cảm xúc: ${esc(r.loai_cam_xuc)})</span></div>
          <div class="body">${formatAnalysisText(r.diem_cam_xuc_manh_nhat)}</div>
        </div>
        <div>
          <div style="font-size:12.5px;font-weight:700;color:var(--gold);text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px;">Vì sao người đọc muốn share</div>
          <div class="body">${formatAnalysisText(r.ly_do_muon_share)}</div>
        </div>
      </div>

      <div class="card" style="margin-top:16px;">
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:6px;">Chủ đề mới bạn muốn áp dụng</label>
        <textarea id="topic-text" style="min-height:auto;height:52px;" placeholder="Ví dụ: Sai lầm khiến dòng tiền cá nhân bị nghẽn">${esc(state.topic)}</textarea>
        ${!state.positioning ? `
          <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 6px;">Ngành/lĩnh vực &amp; đối tượng của bạn (không bắt buộc)</label>
          <textarea id="quick-context" style="min-height:auto;height:52px;" placeholder="Ví dụ: Coach tài chính cá nhân, hướng tới người mới đi làm...">${esc(state.quickContext)}</textarea>
        ` : ''}
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 6px;">Bạn muốn tái chế thành gì?</label>
        <div class="chips">
          <div class="chip ${state.recycleMode==='tieu_de'?'selected':''}" data-recycle-mode="tieu_de">10 tiêu đề mới</div>
          <div class="chip ${state.recycleMode==='bai_moi'?'selected':''}" data-recycle-mode="bai_moi">5 bài viết mới hoàn chỉnh</div>
        </div>
        ${recycleActionHtml()}
      </div>

      ${state.recycleMode==='tieu_de' && state.titles ? titlesHtml() : ''}
      ${state.recycleMode==='bai_moi' && state.posts.length ? postsHtml() : ''}
    `;
  }

  function recycleActionHtml(){
    if(!state.recycleMode) return '';
    if(state.recycleMode==='tieu_de'){
      return `
        <div class="btn-row" style="margin-top:14px;"><button class="btn" data-action="fetch-titles" ${state.titlesLoading?'disabled':''}>${state.titlesLoading?'Đang tạo…':(state.titles?'Tạo lại 10 tiêu đề':'Tạo 10 tiêu đề mới →')}</button> <span style="font-size:11px;color:var(--ink-soft);align-self:center;">(tốn 3 lượt AI)</span></div>
        ${state.titlesError?`<div class="error-box" style="margin-top:10px;">${esc(state.titlesError)}</div>`:''}
      `;
    }
    const done = state.posts.length >= TOTAL_POSTS;
    return `
      ${!done ? `<div class="btn-row" style="margin-top:14px;"><button class="btn" data-action="next-post" ${state.postsLoading?'disabled':''}>${state.postsLoading?'Đang viết…':(state.posts.length===0?'Viết bài đầu tiên →':`Viết bài tiếp theo (${state.posts.length+1}/${TOTAL_POSTS}) →`)}</button> <span style="font-size:11px;color:var(--ink-soft);align-self:center;">(tốn 3 lượt AI)</span></div>` : `<div class="hint-box" style="margin-top:14px;">Đã viết đủ ${TOTAL_POSTS} bài — xem bên dưới, bấm "Lưu vào Kho Content" cho bài nào bạn ưng ý.</div>`}
      ${state.postsError?`<div class="error-box" style="margin-top:10px;">${esc(state.postsError)}</div>`:''}
    `;
  }

  function titlesHtml(){
    return `
      <h3 style="font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.05em;margin:22px 0 12px;">10 tiêu đề mới — giữ nguyên cấu trúc tâm lý bài gốc</h3>
      ${state.titles.map((t,i)=>`
        <div class="section">
          <div class="body" style="font-weight:600;">${esc(t)}</div>
          <div class="btn-row" style="margin-top:10px;justify-content:flex-start;">
            <button class="btn btn-sm" data-save-title="${i}" ${state.savedTitleIdx[i]?'disabled':''}>${state.savedTitleIdx[i]?'Đã lưu vào Kho Hook ✓':'Lưu vào Kho Hook'}</button>
            <span class="btn-ghost btn btn-sm" data-write-title="${i}">Viết bài từ tiêu đề này →</span>
          </div>
        </div>
      `).join('')}
    `;
  }

  function postsHtml(){
    return `
      <h3 style="font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.05em;margin:22px 0 12px;">Bài mới đã viết (${state.posts.length}/${TOTAL_POSTS}) — áp dụng đúng công thức bài gốc</h3>
      ${state.posts.map((p,i)=>`
        <div class="section">
          <h3>${esc(p.tieu_de)}</h3>
          <div class="body">${esc(breakSentences(p.noi_dung))}</div>
          <div class="btn-row" style="margin-top:10px;justify-content:flex-start;">
            <button class="btn btn-sm" data-save-post="${i}" ${state.savedPostIdx[i]?'disabled':''}>${state.savedPostIdx[i]?'Đã lưu vào Kho Content ✓':'Lưu vào Kho Content'}</button>
          </div>
        </div>
      `).join('')}
    `;
  }

  function bind(){
    const tourBtn = container.querySelector('#tcv-start-tour');
    if(tourBtn) tourBtn.onclick = ()=>window.startPageTour(TOUR_STEPS);

    const vt = container.querySelector('#viral-text'); if(vt) vt.oninput = ()=>{ state.viralText = vt.value; };
    const qc = container.querySelector('#quick-context'); if(qc) qc.oninput = ()=>{ state.quickContext = qc.value; };
    const tp = container.querySelector('#topic-text'); if(tp) tp.oninput = ()=>{ state.topic = tp.value; };

    const analyzeBtn = container.querySelector('[data-action="analyze"]');
    if(analyzeBtn) analyzeBtn.onclick = analyzeViral;

    const resetDraftBtn = container.querySelector('[data-action="reset-draft"]');
    if(resetDraftBtn) resetDraftBtn.onclick = async ()=>{
      if(!(await confirmModal('Xoá bài đang làm dở và làm bài mới? Không khôi phục lại được.'))) return;
      await clearModuleDraft(ctx, DRAFT_KEY);
      state.viralText=''; state.topic=''; state.phanTich=null;
      state.recycleMode=null; state.titles=null; state.savedTitleIdx={};
      state.posts=[]; state.savedPostIdx={}; state.analyzeError=null; state.titlesError=null; state.postsError=null;
      draw();
    };

    container.querySelectorAll('[data-recycle-mode]').forEach(el=>{
      el.onclick = ()=>{
        state.recycleMode = el.getAttribute('data-recycle-mode');
        state.titles = null; state.titlesError = null; state.savedTitleIdx = {};
        state.posts = []; state.postsError = null; state.savedPostIdx = {};
        draw();
        persistDraft();
      };
    });

    const fetchTitlesBtn = container.querySelector('[data-action="fetch-titles"]');
    if(fetchTitlesBtn) fetchTitlesBtn.onclick = fetchTitles;
    const nextPostBtn = container.querySelector('[data-action="next-post"]');
    if(nextPostBtn) nextPostBtn.onclick = fetchNextPost;

    container.querySelectorAll('[data-save-title]').forEach(el=>{
      el.onclick = ()=>{ saveTitle(Number(el.getAttribute('data-save-title'))); };
    });
    container.querySelectorAll('[data-write-title]').forEach(el=>{
      el.onclick = ()=>{
        const i = Number(el.getAttribute('data-write-title'));
        window.PendingTopic = state.titles[i];
        // Tiêu đề này đã giữ đúng cơ chế tâm lý mở đầu đã mổ xẻ — Viết Content phải dùng nguyên
        // văn làm hook, không viết lại (cùng quy tắc với hook chọn từ Kho Hook).
        window.PendingIsHook = true;
        location.hash = 'viet-content';
      };
    });
    container.querySelectorAll('[data-save-post]').forEach(el=>{
      el.onclick = ()=>{ savePost(Number(el.getAttribute('data-save-post'))); };
    });
  }

  async function analyzeViral(){
    if(!state.viralText.trim()) return;
    state.analyzing = true; state.analyzeError = null; state.phanTich = null;
    state.recycleMode = null; state.titles = null; state.posts = []; state.savedTitleIdx = {}; state.savedPostIdx = {};
    draw();
    const stopProgress = animateProgressButton(container.querySelector('[data-action="analyze"]'), 18, 'Đang phân tích');
    acquireWakeLock();
    try{
      const data = await callApi('/api/tai-che-viral', { viral_text: state.viralText, stage:'phan_tich' }, 60000);
      state.phanTich = data.result.phan_tich;
      persistDraft();
    } catch(e){ state.analyzeError = e.message; }
    stopProgress(); releaseWakeLock();
    state.analyzing = false; draw();
  }

  async function fetchTitles(){
    if(!state.topic.trim()){ state.titlesError = 'Nhập chủ đề mới muốn áp dụng trước đã.'; draw(); return; }
    state.titlesLoading = true; state.titlesError = null; draw();
    const stopProgress = animateProgressButton(container.querySelector('[data-action="fetch-titles"]'), 20, 'Đang tạo');
    acquireWakeLock();
    try{
      const data = await callApi('/api/tai-che-viral', {
        viral_text: state.viralText, stage:'tieu_de', topic: state.topic, phan_tich: state.phanTich,
        positioning: state.positioning ? { luot1: state.positioning.luot1, luot2: state.positioning.luot2 } : null,
        quick_context: state.quickContext,
      }, 150000);
      state.titles = data.result.tieu_de_moi;
      state.savedTitleIdx = {};
      persistDraft();
    } catch(e){ state.titlesError = e.message; }
    stopProgress(); releaseWakeLock();
    state.titlesLoading = false; draw();
  }

  async function fetchNextPost(){
    if(!state.topic.trim()){ state.postsError = 'Nhập chủ đề mới muốn áp dụng trước đã.'; draw(); return; }
    state.postsLoading = true; state.postsError = null; draw();
    const stopProgress = animateProgressButton(container.querySelector('[data-action="next-post"]'), 20, 'Đang viết');
    acquireWakeLock();
    try{
      const data = await callApi('/api/tai-che-viral', {
        viral_text: state.viralText, stage:'mot_bai', topic: state.topic, phan_tich: state.phanTich,
        positioning: state.positioning ? { luot1: state.positioning.luot1, luot2: state.positioning.luot2 } : null,
        quick_context: state.quickContext,
        post_index: state.posts.length, total_posts: TOTAL_POSTS,
        previous_ideas: state.posts.map(p=>p.tieu_de),
      }, 150000);
      state.posts.push({ tieu_de: data.result.tieu_de, noi_dung: data.result.noi_dung });
      persistDraft();
    } catch(e){ state.postsError = e.message; }
    stopProgress(); releaseWakeLock();
    state.postsLoading = false; draw();
  }

  async function saveTitle(i){
    const title = state.titles[i];
    await ctx.supabase.from('hooks_bank_personal').insert({
      user_id: ctx.user.id, hook_text: title, category: 'Tái chế từ bài viral',
      note: `Chủ đề: ${state.topic}`,
    });
    state.savedTitleIdx[i] = true; draw();
  }

  async function savePost(i){
    const p = state.posts[i];
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
