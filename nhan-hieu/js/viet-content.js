(function(){
function render(container, ctx){
  const state = { screen:'loading', positioning:null, ideaText:'', ideaId:null, result:null, error:null, generating:false, recentPosts:[], savedId:null };

  function draw(){ container.innerHTML = html(); bind(); }

  async function boot(){
    draw();
    const { data: pos } = await ctx.supabase.from('positioning_results').select('*').eq('user_id', ctx.user.id).maybeSingle();
    if(!pos || !pos.luot1){ state.screen='need-positioning'; draw(); return; }
    state.positioning = pos;

    if(window.PendingIdea){
      state.ideaText = window.PendingIdea.idea_text;
      state.ideaId = window.PendingIdea.id;
      window.PendingIdea = null;
    }
    await loadRecent();
    state.screen='main';
    draw();
  }

  async function loadRecent(){
    const { data } = await ctx.supabase.from('posts').select('*').eq('user_id', ctx.user.id).order('created_at', { ascending:false }).limit(10);
    state.recentPosts = data || [];
  }

  function html(){
    if(state.screen==='loading') return `<div class="loading"><div class="spinner"></div><p>Đang tải…</p></div>`;
    if(state.screen==='need-positioning') return `
      <div class="page-head"><div class="tag">Bước 4 · Viết Content</div><h1>Cần Định Vị trước đã</h1>
      <p>Hoàn thành bước Định Vị để bài viết ra đúng giọng văn của bạn.</p></div>
      <div class="btn-row"><a class="btn" href="#dinh-vi">Đi tới Định Vị</a></div>`;

    return `
      <div class="page-head"><div class="tag">Bước 4 · Viết Content</div><h1>Viết bài tự động</h1>
      <p>Nhập chủ đề/ý tưởng, hoặc bấm "Viết →" từ 1 ý tưởng ở bước Ý Tưởng — AI sẽ viết bài đầy đủ đúng giọng văn định vị.</p></div>
      <div class="card">
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:6px;">Chủ đề / ý tưởng muốn viết</label>
        <textarea id="idea-input" placeholder="Ví dụ: 3 sai lầm khiến dòng tiền cá nhân bị nghẽn...">${esc(state.ideaText)}</textarea>
        <div class="btn-row"><button class="btn" data-action="generate" ${state.generating?'disabled':''}>${state.generating?'Đang viết…':'Viết bài'}</button></div>
        ${state.error?`<div class="error-box">${esc(state.error)}</div>`:''}
      </div>

      ${state.result ? resultHtml() : ''}

      <div style="margin-top:28px;">
        <h3 style="font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px;">Bài đã viết gần đây</h3>
        ${state.recentPosts.length===0?`<div style="color:var(--ink-soft);font-size:14px;">Chưa có bài nào được lưu.</div>`:''}
        ${state.recentPosts.map(p=>`
          <div class="list-item">
            <div class="txt"><b>${esc(p.title||'(không tiêu đề)')}</b><br><span style="color:var(--ink-soft);font-size:13px;">${esc((p.content||'').slice(0,120))}${(p.content||'').length>120?'…':''}</span></div>
            <button class="btn btn-sm" data-schedule="${p.id}">Đưa vào lịch →</button>
          </div>
        `).join('')}
      </div>
    `;
  }

  function resultHtml(){
    const r = state.result;
    return `
      <div class="section highlight"><h3>${esc(r.tieu_de)}</h3><div class="body">${esc(r.bai_hoan_chinh)}</div></div>
      <div class="section"><h3>Cấu trúc bài</h3>
        <div class="body"><b>Hook:</b> ${esc(r.hook)}</div>
        <div class="body" style="margin-top:8px;"><b>Vấn đề:</b> ${esc(r.van_de)}</div>
        <div class="body" style="margin-top:8px;"><b>Giá trị:</b> ${esc(r.gia_tri)}</div>
        <div class="body" style="margin-top:8px;"><b>Niềm tin:</b> ${esc(r.niem_tin)}</div>
        <div class="body" style="margin-top:8px;"><b>CTA:</b> ${esc(r.cta)}</div>
      </div>
      <div class="section"><h3>Hashtag</h3><div class="body">${r.hashtag.map(h=>'#'+h.replace(/^#/,'')).join(' ')}</div></div>
      <div class="section"><h3>Gợi ý hình ảnh/video</h3><div class="body">${esc(r.goi_y_hinh_anh)}</div></div>
      <div class="section highlight"><h3>Dạng content phù hợp nhất</h3>
        <div class="body" style="font-weight:700;margin-bottom:6px;">${esc(r.dinh_dang_de_xuat)}</div>
        <div class="body">${esc(r.ly_do_dinh_dang)}</div>
      </div>
      <div class="btn-row no-print" style="margin-top:-6px;margin-bottom:10px;">
        <a class="btn-ghost btn" href="#dinh-dang-content">Xem cách làm dạng này →</a>
      </div>
      <div class="btn-row no-print">
        <button class="btn" data-action="save">${state.savedId?'Đã lưu vào thư viện ✓':'Lưu vào thư viện bài viết'}</button>
        ${state.savedId?`<a class="btn-ghost btn" href="#lich-dang">Đưa vào Lịch Đăng Bài →</a>`:''}
      </div>
    `;
  }

  function bind(){
    const ideaInput = container.querySelector('#idea-input');
    if(ideaInput) ideaInput.oninput = ()=>{ state.ideaText = ideaInput.value; };

    const genBtn = container.querySelector('[data-action="generate"]');
    if(genBtn) genBtn.onclick = generate;

    const saveBtn = container.querySelector('[data-action="save"]');
    if(saveBtn) saveBtn.onclick = save;

    container.querySelectorAll('[data-schedule]').forEach(el=>{
      el.onclick = ()=>{
        const id = el.getAttribute('data-schedule');
        window.PendingPost = state.recentPosts.find(p=>p.id===id);
        location.hash = 'lich-dang';
      };
    });
  }

  async function generate(){
    if(!state.ideaText.trim()) return;
    state.generating = true; state.error = null; state.result = null; state.savedId = null; draw();
    try{
      const data = await callApi('/api/viet-content', {
        positioning: { luot1: state.positioning.luot1, luot2: state.positioning.luot2 },
        idea_text: state.ideaText,
      });
      state.result = data.result;
      state.generating = false; draw();
    } catch(e){ state.error = e.message; state.generating = false; draw(); }
  }

  async function save(){
    if(!state.result || state.savedId) return;
    const r = state.result;
    const { data, error } = await ctx.supabase.from('posts').insert({
      user_id: ctx.user.id,
      idea_id: state.ideaId,
      title: r.tieu_de,
      content: r.bai_hoan_chinh,
      structure: { hook:r.hook, van_de:r.van_de, gia_tri:r.gia_tri, niem_tin:r.niem_tin, cta:r.cta, hashtag:r.hashtag, goi_y_hinh_anh:r.goi_y_hinh_anh, format: r.dinh_dang_de_xuat },
    }).select().single();
    if(error){ state.error = error.message; draw(); return; }
    state.savedId = data.id;
    if(state.ideaId) await ctx.supabase.from('ideas').update({ used:true }).eq('id', state.ideaId);
    await loadRecent();
    draw();
  }

  boot();
}

window.Modules = window.Modules || {};
window.Modules['viet-content'] = { title:'Viết Content', render };
})();
