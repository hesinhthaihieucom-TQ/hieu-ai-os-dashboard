(function(){
const CATEGORIES = {
  noi_dau: 'Nỗi đau', su_that_nguoc: 'Sự thật ngược', canh_bao: 'Cảnh báo',
  ket_qua_mong_muon: 'Kết quả mong muốn', tu_khoa_kich_hoat: 'Từ khoá kích hoạt chú ý',
};

function render(container, ctx){
  const state = {
    tab:'kho-toi', personal:[], shared:[], error:null, positioning:null,
    newEntry:{ hook_text:'', category:'', note:'' },
    writeFor:null, writeLoading:false, writeIdeas:null, writeError:null, writeQuickContext:'',
  };

  function draw(){ container.innerHTML = html(); bind(); }

  async function boot(){
    container.innerHTML = `<div class="loading"><div class="spinner"></div><p>Đang tải…</p></div>`;
    const { data: pos } = await ctx.supabase.from('positioning_results').select('*').eq('user_id', ctx.user.id).maybeSingle();
    state.positioning = pos || null;
    await Promise.all([loadPersonal(), loadShared()]);
    draw();
  }
  async function loadPersonal(){
    const { data, error } = await ctx.supabase.from('hooks_bank_personal').select('*').eq('user_id', ctx.user.id).order('created_at', { ascending:false });
    if(error) state.error = error.message;
    state.personal = data || [];
  }
  async function loadShared(){
    const { data, error } = await ctx.supabase.from('hooks_bank_shared').select('*').order('created_at', { ascending:false });
    if(error) state.error = error.message;
    state.shared = data || [];
  }

  function findSourceText(key){
    if(!key) return '';
    const [kind, id] = key.split(':');
    if(kind==='personal') return (state.personal.find(h=>h.id===id)||{}).hook_text || '';
    if(kind==='shared') return (state.shared.find(h=>h.id===id)||{}).hook_text || '';
    return '';
  }

  function html(){
    if(state.error) return `
      <div class="page-head"><h1>Kho Hook</h1></div>
      <div class="error-box">Chưa dùng được mục này: ${esc(state.error)}. Cần chạy file supabase/schema_v2.sql trong Supabase SQL Editor trước.</div>`;
    return `
      <div class="page-head"><h1>Kho Hook</h1><p>Lưu lại các câu hook hay để tra cứu nhanh khi cần mở đầu bài.</p></div>
      <div class="tab-row">
        <div class="tab-btn ${state.tab==='kho-toi'?'active':''}" data-tab="kho-toi">Kho của tôi (${state.personal.length})</div>
        <div class="tab-btn ${state.tab==='kho-chung'?'active':''}" data-tab="kho-chung">Kho chung (${state.shared.length})</div>
      </div>
      ${state.tab==='kho-toi' ? khoToiTab() : khoChungTab()}
    `;
  }

  function writeActionHtml(key){
    const isOpen = state.writeFor === key;
    return `
      <div style="margin-top:10px;">
        <span class="btn-ghost btn btn-sm" data-write-toggle="${key}">${isOpen?'Đóng':'Viết bài từ hook này →'}</span>
        ${isOpen ? writePanelHtml() : ''}
      </div>
    `;
  }

  function writePanelHtml(){
    const hasPositioning = !!(state.positioning && state.positioning.luot1);
    if(!hasPositioning && !state.writeIdeas && !state.writeLoading){
      return `<div class="hint-box" style="margin-top:10px;">Chưa có <a href="#dinh-vi">Định Vị</a> đã lưu — điền nhanh ngành/đối tượng bên dưới để vẫn sinh được ý tưởng đúng hướng, hoặc giữ nguyên hook để viết luôn.</div>
        <textarea id="write-quick-context" style="min-height:auto;height:44px;margin-top:8px;" placeholder="Ví dụ: Coach tài chính cá nhân, hướng tới người mới đi làm...">${esc(state.writeQuickContext)}</textarea>
        <div class="btn-row" style="margin-top:10px;justify-content:flex-start;">
          <button class="btn btn-sm" data-write-keep="1">Giữ nguyên hook này</button>
          <button class="btn-ghost btn btn-sm" data-write-generate="1">Tạo 5 ý tưởng mới từ đây</button>
        </div>`;
    }
    if(state.writeLoading) return `<div style="margin-top:10px;font-size:13px;color:var(--ink-soft);">Đang sinh ý tưởng…</div>`;
    if(state.writeIdeas){
      return `<div style="margin-top:10px;display:flex;flex-direction:column;gap:8px;">
        ${state.writeIdeas.map((idea,i)=>`<div style="border:1px solid var(--line);border-radius:8px;padding:10px 12px;background:var(--accent-soft);">
          <div style="font-size:13px;">${esc(idea)}</div>
          <span style="display:inline-block;margin-top:6px;color:var(--accent);font-size:12px;font-weight:600;cursor:pointer;" data-use-idea="${i}">Dùng ý tưởng này →</span>
        </div>`).join('')}
      </div>`;
    }
    return `
      ${state.writeError?`<div class="error-box" style="margin-top:10px;">${esc(state.writeError)}</div>`:''}
      <div class="btn-row" style="margin-top:10px;justify-content:flex-start;">
        <button class="btn btn-sm" data-write-keep="1">Giữ nguyên hook này</button>
        <button class="btn-ghost btn btn-sm" data-write-generate="1">Tạo 5 ý tưởng mới từ đây</button>
      </div>`;
  }

  function khoToiTab(){
    return `
      <div class="card">
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:6px;">Câu hook</label>
        <textarea id="ne-hook" style="min-height:auto;height:56px;">${esc(state.newEntry.hook_text)}</textarea>
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 6px;">Loại hook</label>
        <select id="ne-cat">
          <option value="">— Chọn —</option>
          ${Object.entries(CATEGORIES).map(([k,v])=>`<option value="${k}" ${state.newEntry.category===k?'selected':''}>${esc(v)}</option>`).join('')}
        </select>
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 6px;">Ghi chú (tuỳ chọn)</label>
        <textarea id="ne-note" style="min-height:auto;height:44px;">${esc(state.newEntry.note)}</textarea>
        <div class="btn-row"><button class="btn" data-action="add">Thêm vào kho của tôi</button></div>
      </div>
      <div style="margin-top:20px;">
        ${state.personal.length===0?`<div style="color:var(--ink-soft);font-size:14px;">Kho của bạn đang trống.</div>`:''}
        ${state.personal.map(h=>`
          <div class="section">
            <div class="meta" style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--ink-soft);text-transform:uppercase;margin-bottom:6px;">${esc(CATEGORIES[h.category]||h.category||'')}</div>
            <div class="body"><b>${esc(h.hook_text)}</b>${h.note?`<br><span style="color:var(--ink-soft);">${esc(h.note)}</span>`:''}</div>
            <div class="btn-row" style="margin-top:10px;justify-content:space-between;">
              <span style="color:var(--danger);cursor:pointer;font-size:12px;" data-del="${h.id}">Xoá</span>
            </div>
            ${writeActionHtml('personal:'+h.id)}
          </div>
        `).join('')}
      </div>
    `;
  }

  function khoChungTab(){
    if(state.shared.length===0) return `<div class="card" style="color:var(--ink-soft);">Kho chung chưa có hook nào — sẽ được cập nhật từ đội ngũ.</div>`;
    return state.shared.map(h=>`
      <div class="section">
        <div class="meta" style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--ink-soft);text-transform:uppercase;margin-bottom:6px;">${esc(CATEGORIES[h.category]||h.category||'')}</div>
        <div class="body"><b>${esc(h.hook_text)}</b>${h.note?`<br><span style="color:var(--ink-soft);">${esc(h.note)}</span>`:''}</div>
        ${writeActionHtml('shared:'+h.id)}
      </div>
    `).join('');
  }

  function bind(){
    container.querySelectorAll('[data-tab]').forEach(el=>{ el.onclick = ()=>{ state.tab = el.getAttribute('data-tab'); draw(); }; });
    const h = container.querySelector('#ne-hook'); if(h) h.oninput = ()=>state.newEntry.hook_text = h.value;
    const c = container.querySelector('#ne-cat'); if(c) c.onchange = ()=>state.newEntry.category = c.value;
    const n = container.querySelector('#ne-note'); if(n) n.oninput = ()=>state.newEntry.note = n.value;
    const addBtn = container.querySelector('[data-action="add"]');
    if(addBtn) addBtn.onclick = addHook;
    container.querySelectorAll('[data-del]').forEach(el=>{
      el.onclick = async ()=>{
        await ctx.supabase.from('hooks_bank_personal').delete().eq('id', el.getAttribute('data-del'));
        await loadPersonal(); draw();
      };
    });

    container.querySelectorAll('[data-write-toggle]').forEach(el=>{
      el.onclick = ()=>{
        const key = el.getAttribute('data-write-toggle');
        state.writeFor = state.writeFor===key ? null : key;
        state.writeIdeas = null; state.writeError = null; state.writeLoading = false; state.writeQuickContext = '';
        draw();
      };
    });
    const keepBtn = container.querySelector('[data-write-keep]');
    if(keepBtn) keepBtn.onclick = ()=>{
      window.PendingTopic = findSourceText(state.writeFor);
      location.hash = 'viet-content';
    };
    const genBtn = container.querySelector('[data-write-generate]');
    if(genBtn) genBtn.onclick = generateIdeasFromSource;
    const wqc = container.querySelector('#write-quick-context');
    if(wqc) wqc.oninput = ()=>{ state.writeQuickContext = wqc.value; };
    container.querySelectorAll('[data-use-idea]').forEach(el=>{
      el.onclick = ()=>{
        const i = Number(el.getAttribute('data-use-idea'));
        window.PendingTopic = state.writeIdeas[i];
        location.hash = 'viet-content';
      };
    });
  }

  async function generateIdeasFromSource(){
    state.writeLoading = true; state.writeError = null; draw();
    try{
      const data = await callApi('/api/goi-y-tu-nguon', {
        source_text: findSourceText(state.writeFor),
        positioning: (state.positioning && state.positioning.luot1) ? { luot1: state.positioning.luot1, luot2: state.positioning.luot2 } : null,
        quick_context: state.writeQuickContext,
      });
      state.writeIdeas = data.result.y_tuong;
    } catch(e){ state.writeError = e.message; }
    state.writeLoading = false; draw();
  }

  async function addHook(){
    if(!state.newEntry.hook_text.trim()) return;
    await ctx.supabase.from('hooks_bank_personal').insert({
      user_id: ctx.user.id, hook_text: state.newEntry.hook_text,
      category: state.newEntry.category || null, note: state.newEntry.note || null,
    });
    state.newEntry = { hook_text:'', category:'', note:'' };
    await loadPersonal();
    draw();
  }

  boot();
}
window.Modules = window.Modules || {};
window.Modules['kho-hook'] = { title:'Kho Hook', render };
})();
