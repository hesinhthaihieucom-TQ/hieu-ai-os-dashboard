(function(){
function statusOf(p){
  if(p.role==='admin') return { label:'Admin', cls:'admin' };
  if(!p.access_until) return { label:'Chưa kích hoạt', cls:'none' };
  const diffMs = new Date(p.access_until).getTime() - Date.now();
  if(diffMs <= 0) return { label:'Đã hết hạn', cls:'expired' };
  const days = Math.ceil(diffMs / 86400000);
  if(days <= 3) return { label:`Sắp hết hạn (${days} ngày)`, cls:'soon' };
  return { label:`Đang hoạt động (${days} ngày)`, cls:'active' };
}

function render(container, ctx){
  const state = { screen:'loading', profiles:[], q:'', error:null, busyId:null };

  function draw(){ container.innerHTML = html(); bind(); }

  async function boot(){
    draw();
    if(!ctx.profile || ctx.profile.role !== 'admin'){
      state.screen = 'denied'; draw(); return;
    }
    await load();
    state.screen = 'main';
    draw();
  }

  async function load(){
    const { data, error } = await ctx.supabase.from('profiles').select('*').order('access_until', { ascending:true, nullsFirst:true });
    if(error){ state.error = error.message; state.profiles = []; return; }
    state.profiles = data || [];
  }

  function filtered(){
    const q = state.q.trim().toLowerCase();
    if(!q) return state.profiles;
    return state.profiles.filter(p => (p.email||'').toLowerCase().includes(q) || (p.full_name||'').toLowerCase().includes(q));
  }

  function html(){
    if(state.screen==='loading') return `<div class="loading"><div class="spinner"></div><p>Đang tải…</p></div>`;
    if(state.screen==='denied') return `<div class="page-head"><h1>Không có quyền truy cập</h1><p>Mục này chỉ dành cho quản trị viên.</p></div>`;

    const list = filtered();
    const counts = state.profiles.reduce((acc,p)=>{ const s=statusOf(p).cls; acc[s]=(acc[s]||0)+1; return acc; }, {});

    return `
      <div class="page-head"><h1>Quản trị học viên</h1><p>Danh sách tài khoản, hạn dùng, và gia hạn nhanh sau khi học viên thanh toán.</p></div>

      <div class="source-grid" style="margin-bottom:20px;">
        <div class="source-card"><div class="ic">${counts.active||0}</div><div class="label">Đang hoạt động</div></div>
        <div class="source-card"><div class="ic">${counts.soon||0}</div><div class="label">Sắp hết hạn</div></div>
        <div class="source-card"><div class="ic">${counts.expired||0}</div><div class="label">Đã hết hạn</div></div>
        <div class="source-card"><div class="ic">${counts.none||0}</div><div class="label">Chưa kích hoạt</div></div>
      </div>

      <div class="card" style="margin-bottom:20px;">
        <input id="q-search" type="text" placeholder="Tìm theo email hoặc tên..." value="${esc(state.q)}"
          style="width:100%;padding:12px 14px;border:1px solid var(--line);border-radius:10px;font-size:14.5px;background:#FDFCF8;">
      </div>

      ${state.error?`<div class="error-box">${esc(state.error)}</div>`:''}

      ${list.map(p=>{
        const st = statusOf(p);
        return `
        <div class="section">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
            <div>
              <h3 style="margin-bottom:2px;">${esc(p.email||'(không có email)')}</h3>
              <div style="color:var(--ink-soft);font-size:13px;">${esc(p.full_name||'')}</div>
            </div>
            <span style="font-family:'IBM Plex Mono',monospace;font-size:11.5px;padding:4px 10px;border-radius:999px;white-space:nowrap;
              background:${st.cls==='active'?'var(--accent-soft)':st.cls==='soon'?'#FBF6E9':st.cls==='expired'?'#FBEAE4':st.cls==='admin'?'#EDEAE0':'var(--line)'};
              color:${st.cls==='active'?'var(--accent)':st.cls==='soon'?'var(--gold)':st.cls==='expired'?'var(--danger)':'var(--ink-soft)'};">${esc(st.label)}</span>
          </div>
          <div class="body" style="margin-top:8px;font-size:13px;">Hạn dùng: ${p.access_until ? esc(new Date(p.access_until).toLocaleString('vi-VN')) : '(chưa có)'}</div>
          ${p.role!=='admin' ? `
            <div class="btn-row" style="margin-top:12px;justify-content:flex-start;">
              <button class="btn btn-sm" data-extend="${p.id}|30" ${state.busyId===p.id?'disabled':''}>+30 ngày</button>
              <button class="btn btn-sm" data-extend="${p.id}|180" ${state.busyId===p.id?'disabled':''}>+180 ngày</button>
              <button class="btn btn-sm" data-extend="${p.id}|365" ${state.busyId===p.id?'disabled':''}>+365 ngày</button>
              <button class="btn-ghost btn btn-sm" data-revoke="${p.id}" ${state.busyId===p.id?'disabled':''}>Thu hồi ngay</button>
            </div>
          ` : ''}
        </div>
      `;}).join('')}
    `;
  }

  function bind(){
    const search = container.querySelector('#q-search');
    if(search) search.oninput = ()=>{ state.q = search.value; draw(); search.focus(); search.selectionStart = search.selectionEnd = search.value.length; };

    container.querySelectorAll('[data-extend]').forEach(el=>{
      el.onclick = ()=>{
        const [id, days] = el.getAttribute('data-extend').split('|');
        extend(id, Number(days));
      };
    });
    container.querySelectorAll('[data-revoke]').forEach(el=>{
      el.onclick = ()=>{ revoke(el.getAttribute('data-revoke')); };
    });
  }

  async function extend(id, days){
    state.busyId = id; draw();
    const p = state.profiles.find(x=>x.id===id);
    const base = (p.access_until && new Date(p.access_until).getTime() > Date.now()) ? new Date(p.access_until) : new Date();
    const next = new Date(base.getTime() + days*86400000);
    const { error } = await ctx.supabase.from('profiles').update({ access_until: next.toISOString() }).eq('id', id);
    if(error) state.error = error.message; else state.error = null;
    await load();
    state.busyId = null;
    draw();
  }

  async function revoke(id){
    state.busyId = id; draw();
    const { error } = await ctx.supabase.from('profiles').update({ access_until: null }).eq('id', id);
    if(error) state.error = error.message; else state.error = null;
    await load();
    state.busyId = null;
    draw();
  }

  boot();
}
window.Modules = window.Modules || {};
window.Modules['quan-tri'] = { title:'Quản trị', render };
})();
