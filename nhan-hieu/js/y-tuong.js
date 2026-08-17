(function(){
const SOURCES = [
  {key:'ca_nhan', label:'Câu chuyện cá nhân', icon:'📖'},
  {key:'case_hoc_vien', label:'Case học viên', icon:'🎓'},
  {key:'cau_hoi_kh', label:'Câu hỏi khách hàng', icon:'💬'},
  {key:'xu_huong', label:'Xu hướng thị trường', icon:'📈'},
  {key:'quan_diem_nguoc_dong', label:'Quan điểm ngược dòng', icon:'🔀'},
];
const SOURCE_MAP = Object.fromEntries(SOURCES.map(s=>[s.key, s.label]));

function render(container, ctx){
  const state = { screen:'loading', tab:'sinh', positioning:null, selectedSources:[], context:'', ideas:[], personalBank:[], sharedBank:[], generating:false, error:null, newEntry:{ title:'', content:'', source_type:'', tags:'' } };

  function draw(){ container.innerHTML = html(); bind(); }

  async function boot(){
    draw();
    const { data: pos } = await ctx.supabase.from('positioning_results').select('*').eq('user_id', ctx.user.id).maybeSingle();
    if(!pos || !pos.luot1){ state.screen='need-positioning'; draw(); return; }
    state.positioning = pos;
    await Promise.all([loadIdeas(), loadPersonalBank(), loadSharedBank()]);
    state.screen='main';
    draw();
  }

  async function loadIdeas(){
    const { data } = await ctx.supabase.from('ideas').select('*').eq('user_id', ctx.user.id).eq('used', false).order('created_at', { ascending:false });
    state.ideas = data || [];
  }
  async function loadPersonalBank(){
    const { data } = await ctx.supabase.from('content_bank_personal').select('*').eq('user_id', ctx.user.id).order('created_at', { ascending:false });
    state.personalBank = data || [];
  }
  async function loadSharedBank(){
    const { data } = await ctx.supabase.from('content_bank_shared').select('*').order('created_at', { ascending:false });
    state.sharedBank = data || [];
  }

  function html(){
    if(state.screen==='loading') return `<div class="loading"><div class="spinner"></div><p>Đang tải…</p></div>`;
    if(state.screen==='need-positioning') return `
      <div class="page-head"><div class="tag">Bước 3 · Ý Tưởng</div><h1>Cần Định Vị trước đã</h1>
      <p>Hoàn thành bước Định Vị để ý tưởng sinh ra đúng trục nội dung của bạn.</p></div>
      <div class="btn-row"><a class="btn" href="#dinh-vi">Đi tới Định Vị</a></div>`;
    return `
      <div class="page-head"><div class="tag">Bước 3 · Ý Tưởng</div><h1>Sinh ý tưởng content</h1>
      <p>Chọn 1 hoặc nhiều kho nguồn, AI sẽ sinh ý tưởng bám sát định vị của bạn.</p></div>
      <div class="tab-row">
        <div class="tab-btn ${state.tab==='sinh'?'active':''}" data-tab="sinh">Sinh ý tưởng</div>
        <div class="tab-btn ${state.tab==='kho-toi'?'active':''}" data-tab="kho-toi">Kho của tôi (${state.personalBank.length})</div>
        <div class="tab-btn ${state.tab==='kho-chung'?'active':''}" data-tab="kho-chung">Kho chung (${state.sharedBank.length})</div>
      </div>
      ${state.tab==='sinh' ? sinhTab() : state.tab==='kho-toi' ? khoToiTab() : khoChungTab()}
    `;
  }

  function sinhTab(){
    return `
      <div class="card">
        <div class="source-grid">
          ${SOURCES.map(s=>`<div class="source-card ${state.selectedSources.includes(s.key)?'selected':''}" data-source="${s.key}">
            <div class="ic">${s.icon}</div><div class="label">${esc(s.label)}</div></div>`).join('')}
        </div>
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:18px 0 6px;">Bối cảnh thêm (tuỳ chọn)</label>
        <textarea id="ctx-input" placeholder="Ví dụ: tuần này mình mới ra mắt sản phẩm mới, muốn ý tưởng xoay quanh đó...">${esc(state.context)}</textarea>
        <div class="btn-row">
          <button class="btn" data-action="generate" ${state.generating?'disabled':''}>${state.generating?'Đang sinh ý tưởng…':'Sinh 5 ý tưởng'}</button>
        </div>
        ${state.error?`<div class="error-box">${esc(state.error)}</div>`:''}
      </div>
      <div style="margin-top:24px;">
        <h3 style="font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px;">Ý tưởng chưa dùng (${state.ideas.length})</h3>
        ${state.ideas.length===0?`<div style="color:var(--ink-soft);font-size:14px;">Chưa có ý tưởng nào — bấm "Sinh 5 ý tưởng" ở trên.</div>`:''}
        ${state.ideas.map(idea=>`
          <div class="idea-item">
            <div class="txt"><div class="meta">${esc(SOURCE_MAP[idea.source_type]||idea.source_type||'')}</div>${esc(idea.idea_text)}</div>
            <div style="display:flex;gap:8px;flex-shrink:0;">
              <button class="btn btn-sm" data-write="${idea.id}">Viết →</button>
              <span style="align-self:center;color:var(--ink-soft);cursor:pointer;font-size:12px;" data-dismiss="${idea.id}">Bỏ qua</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function khoToiTab(){
    return `
      <div class="card">
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:6px;">Tiêu đề</label>
        <textarea id="ne-title" style="min-height:auto;height:44px;">${esc(state.newEntry.title)}</textarea>
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 6px;">Nội dung (content viral / mẫu bạn muốn lưu)</label>
        <textarea id="ne-content">${esc(state.newEntry.content)}</textarea>
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 6px;">Loại nguồn</label>
        <select id="ne-source">
          <option value="">— Chọn —</option>
          ${SOURCES.map(s=>`<option value="${s.key}" ${state.newEntry.source_type===s.key?'selected':''}>${esc(s.label)}</option>`).join('')}
        </select>
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 6px;">Tags (cách nhau bởi dấu phẩy)</label>
        <textarea id="ne-tags" style="min-height:auto;height:44px;">${esc(state.newEntry.tags)}</textarea>
        <div class="btn-row"><button class="btn" data-action="add-personal">Thêm vào kho của tôi</button></div>
      </div>
      <div style="margin-top:20px;">
        ${state.personalBank.length===0?`<div style="color:var(--ink-soft);font-size:14px;">Kho của bạn đang trống.</div>`:''}
        ${state.personalBank.map(b=>`
          <div class="list-item">
            <div class="txt"><div class="meta">${esc(SOURCE_MAP[b.source_type]||b.source_type||'')}${(b.tags&&b.tags.length)?' · '+b.tags.map(esc).join(', '):''}</div><b>${esc(b.title)}</b><br>${esc(b.content)}</div>
            <span style="color:var(--danger);cursor:pointer;font-size:12px;flex-shrink:0;" data-del-personal="${b.id}">Xoá</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  function khoChungTab(){
    return `
      <div>
        ${state.sharedBank.length===0?`<div class="card" style="color:var(--ink-soft);">Kho chung chưa có nội dung — sẽ được cập nhật từ đội ngũ.</div>`:''}
        ${state.sharedBank.map(b=>`
          <div class="list-item">
            <div class="txt"><div class="meta">${esc(SOURCE_MAP[b.source_type]||b.source_type||'')}${(b.tags&&b.tags.length)?' · '+b.tags.map(esc).join(', '):''}</div><b>${esc(b.title)}</b><br>${esc(b.content)}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function bind(){
    container.querySelectorAll('[data-tab]').forEach(el=>{
      el.onclick = ()=>{ state.tab = el.getAttribute('data-tab'); draw(); };
    });
    if(state.tab!=='sinh') return void bindBankTabs();

    container.querySelectorAll('[data-source]').forEach(el=>{
      el.onclick = ()=>{
        const k = el.getAttribute('data-source');
        const idx = state.selectedSources.indexOf(k);
        if(idx>=0) state.selectedSources.splice(idx,1); else state.selectedSources.push(k);
        draw();
      };
    });
    const ctxInput = container.querySelector('#ctx-input');
    if(ctxInput) ctxInput.oninput = ()=>{ state.context = ctxInput.value; };

    const genBtn = container.querySelector('[data-action="generate"]');
    if(genBtn) genBtn.onclick = generate;

    container.querySelectorAll('[data-write]').forEach(el=>{
      el.onclick = ()=>{
        const id = el.getAttribute('data-write');
        const idea = state.ideas.find(i=>i.id===id);
        window.PendingIdea = idea;
        location.hash = 'viet-content';
      };
    });
    container.querySelectorAll('[data-dismiss]').forEach(el=>{
      el.onclick = async ()=>{
        const id = el.getAttribute('data-dismiss');
        await ctx.supabase.from('ideas').update({ used:true }).eq('id', id);
        state.ideas = state.ideas.filter(i=>i.id!==id);
        draw();
      };
    });
  }

  function bindBankTabs(){
    const t = container.querySelector('#ne-title'); if(t) t.oninput = ()=>state.newEntry.title = t.value;
    const c = container.querySelector('#ne-content'); if(c) c.oninput = ()=>state.newEntry.content = c.value;
    const s = container.querySelector('#ne-source'); if(s) s.onchange = ()=>state.newEntry.source_type = s.value;
    const tg = container.querySelector('#ne-tags'); if(tg) tg.oninput = ()=>state.newEntry.tags = tg.value;
    const addBtn = container.querySelector('[data-action="add-personal"]');
    if(addBtn) addBtn.onclick = addPersonal;
    container.querySelectorAll('[data-del-personal]').forEach(el=>{
      el.onclick = async ()=>{
        await ctx.supabase.from('content_bank_personal').delete().eq('id', el.getAttribute('data-del-personal'));
        await loadPersonalBank(); draw();
      };
    });
  }

  async function addPersonal(){
    if(!state.newEntry.title.trim() || !state.newEntry.content.trim()) return;
    const tags = state.newEntry.tags.split(',').map(t=>t.trim()).filter(Boolean);
    await ctx.supabase.from('content_bank_personal').insert({
      user_id: ctx.user.id, title: state.newEntry.title, content: state.newEntry.content,
      source_type: state.newEntry.source_type || null, tags,
    });
    state.newEntry = { title:'', content:'', source_type:'', tags:'' };
    await loadPersonalBank();
    draw();
  }

  async function generate(){
    state.generating = true; state.error = null; draw();
    try{
      const data = await callApi('/api/y-tuong', {
        positioning: { luot1: state.positioning.luot1, luot2: state.positioning.luot2 },
        sources: state.selectedSources,
        context: state.context,
        personalBank: state.personalBank.slice(0,10),
        sharedBank: state.sharedBank.slice(0,10),
      });
      const rows = data.result.y_tuong.map(i=>({ user_id: ctx.user.id, source_type: i.nguon, context: state.context, idea_text: i.y_tuong }));
      const { data: inserted } = await ctx.supabase.from('ideas').insert(rows).select();
      state.ideas = [...(inserted||[]), ...state.ideas];
      state.generating = false; draw();
    } catch(e){ state.error = e.message; state.generating = false; draw(); }
  }

  boot();
}

window.Modules = window.Modules || {};
window.Modules['y-tuong'] = { title:'Ý Tưởng', render };
})();
