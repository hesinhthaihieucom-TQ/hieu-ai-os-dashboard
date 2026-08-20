(function(){
const KINDS = { cta: 'CTA', binh_luan_ghim: 'Bình luận ghim' };

function render(container, ctx){
  const state = {
    screen:'loading', entries:[], filterKind:'all', search:'', error:null,
    newEntry:{ text:'', kind:'cta', note:'' }, adding:false, addError:null,
    editingId:null, editEntry:{ text:'', kind:'cta', note:'' }, copiedId:null,
  };

  function draw(){ container.innerHTML = html(); bind(); }

  async function boot(){
    draw();
    await loadEntries();
    state.screen = 'main';
    draw();
  }

  async function loadEntries(){
    const { data, error } = await ctx.supabase.from('cta_bank_personal').select('*').eq('user_id', ctx.user.id).order('created_at', { ascending:false });
    if(error){ state.error = error.message; return; }
    state.entries = data || [];
  }

  function filteredEntries(){
    let list = state.filterKind==='all' ? state.entries : state.entries.filter(e=>e.kind===state.filterKind);
    const q = state.search.trim().toLowerCase();
    if(q) list = list.filter(e=>(e.text||'').toLowerCase().includes(q) || (e.note||'').toLowerCase().includes(q));
    return list;
  }

  function entryRowHtml(e){
    if(state.editingId===e.id){
      return `
        <div style="padding:12px 0;border-bottom:1px solid var(--line);display:flex;flex-direction:column;gap:8px;">
          <select id="ee-kind">
            ${Object.entries(KINDS).map(([k,v])=>`<option value="${k}" ${state.editEntry.kind===k?'selected':''}>${esc(v)}</option>`).join('')}
          </select>
          <textarea id="ee-text" style="min-height:auto;height:70px;">${esc(state.editEntry.text)}</textarea>
          <textarea id="ee-note" style="min-height:auto;height:40px;" placeholder="Ghi chú (không bắt buộc) — vd dùng cho bài nào, hiệu quả ra sao">${esc(state.editEntry.note)}</textarea>
          <div class="btn-row" style="justify-content:flex-start;">
            <button class="btn btn-sm" data-action="save-edit">Lưu</button>
            <span class="btn-ghost btn btn-sm" data-action="cancel-edit">Huỷ</span>
          </div>
        </div>
      `;
    }
    return `
      <div style="padding:12px 0;border-bottom:1px solid var(--line);">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
          <div style="flex:1;">
            <span style="display:inline-block;margin-bottom:6px;padding:2px 9px;border-radius:999px;background:var(--accent-soft);color:var(--accent);font-size:11px;font-weight:700;">${esc(KINDS[e.kind]||e.kind)}</span>
            <div style="font-size:14px;white-space:pre-wrap;">${esc(e.text)}</div>
            ${e.note?`<div style="margin-top:6px;font-size:12px;color:var(--ink-soft);">${esc(e.note)}</div>`:''}
          </div>
          <div style="display:flex;gap:10px;flex-shrink:0;">
            <span style="color:var(--accent);cursor:pointer;font-size:12px;" data-copy-entry="${e.id}">${state.copiedId===e.id?'Đã copy ✓':'Copy'}</span>
            <span style="color:var(--accent);cursor:pointer;font-size:12px;" data-edit-entry="${e.id}">Sửa</span>
            <span style="color:var(--danger);cursor:pointer;font-size:12px;" data-del-entry="${e.id}">Xoá</span>
          </div>
        </div>
      </div>
    `;
  }

  function html(){
    if(state.screen==='loading') return `<div class="loading"><div class="spinner"></div><p>Đang tải…</p></div>`;
    const list = filteredEntries();
    return `
      <div class="page-head"><div class="tag">Thư viện</div><h1>Kho CTA &amp; Bình luận ghim</h1>
      <p>Lưu lại câu CTA/bình luận ghim đã có sẵn (dán tay, hoặc lưu từ bài AI vừa viết) — dùng làm mẫu tham khảo cho AI viết bài sau này, không phải copy y nguyên mỗi lần.</p>
      </div>
      ${state.error?`<div class="error-box">${esc(state.error)}</div>`:''}
      <div class="card">
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:6px;">Thêm mẫu mới</label>
        <select id="new-kind" style="margin-bottom:8px;">
          ${Object.entries(KINDS).map(([k,v])=>`<option value="${k}" ${state.newEntry.kind===k?'selected':''}>${esc(v)}</option>`).join('')}
        </select>
        <textarea id="new-text" style="min-height:auto;height:70px;" placeholder="Dán câu CTA/bình luận ghim bạn đã có sẵn từ trước...">${esc(state.newEntry.text)}</textarea>
        <textarea id="new-note" style="min-height:auto;height:40px;margin-top:8px;" placeholder="Ghi chú (không bắt buộc)">${esc(state.newEntry.note)}</textarea>
        ${state.addError?`<div class="error-box" style="margin-top:8px;">${esc(state.addError)}</div>`:''}
        <div class="btn-row" style="margin-top:10px;">
          <button class="btn" data-action="add-entry" ${state.adding?'disabled':''}>${state.adding?'Đang lưu…':'Lưu vào kho'}</button>
        </div>
      </div>

      <div class="btn-row no-print" style="margin:20px 0 4px;">
        <span class="btn-sm ${state.filterKind==='all'?'btn':'btn-ghost btn'}" data-filter="all">Tất cả (${state.entries.length})</span>
        <span class="btn-sm ${state.filterKind==='cta'?'btn':'btn-ghost btn'}" data-filter="cta">CTA (${state.entries.filter(e=>e.kind==='cta').length})</span>
        <span class="btn-sm ${state.filterKind==='binh_luan_ghim'?'btn':'btn-ghost btn'}" data-filter="binh_luan_ghim">Bình luận ghim (${state.entries.filter(e=>e.kind==='binh_luan_ghim').length})</span>
      </div>
      <input type="text" data-search value="${esc(state.search)}" placeholder="Tìm theo nội dung..." style="width:100%;padding:8px 12px;border:1px solid var(--line);border-radius:8px;font-size:13.5px;margin-bottom:12px;">
      <div class="card">
        ${list.length===0?`<div style="color:var(--ink-soft);font-size:14px;padding:8px 0;">Chưa có mẫu nào — dán vào ô trên, hoặc bấm "💾 Lưu vào Kho" cạnh CTA/bình luận ghim khi viết bài ở Viết Content.</div>`:''}
        ${list.map(entryRowHtml).join('')}
      </div>
    `;
  }

  function bind(){
    container.querySelectorAll('[data-filter]').forEach(el=>{
      el.onclick = ()=>{ state.filterKind = el.getAttribute('data-filter'); draw(); };
    });
    const searchInput = container.querySelector('[data-search]');
    if(searchInput) searchInput.oninput = ()=>{
      state.search = searchInput.value;
      const pos = searchInput.selectionStart;
      draw();
      const newEl = container.querySelector('[data-search]');
      if(newEl){ newEl.focus(); newEl.setSelectionRange(pos, pos); }
    };

    const newKind = container.querySelector('#new-kind');
    const newText = container.querySelector('#new-text');
    const newNote = container.querySelector('#new-note');
    if(newKind) newKind.onchange = ()=>{ state.newEntry.kind = newKind.value; };
    if(newText) newText.oninput = ()=>{ state.newEntry.text = newText.value; };
    if(newNote) newNote.oninput = ()=>{ state.newEntry.note = newNote.value; };

    const addBtn = container.querySelector('[data-action="add-entry"]');
    if(addBtn) addBtn.onclick = async ()=>{
      const text = (newText ? newText.value : state.newEntry.text).trim();
      if(!text){ state.addError = 'Chưa nhập nội dung.'; draw(); return; }
      state.adding = true; state.addError = null; draw();
      const { error } = await ctx.supabase.from('cta_bank_personal').insert({
        user_id: ctx.user.id, text, kind: state.newEntry.kind, note: (newNote?newNote.value:state.newEntry.note).trim() || null,
      });
      state.adding = false;
      if(error){ state.addError = error.message; draw(); return; }
      state.newEntry = { text:'', kind:'cta', note:'' };
      await loadEntries();
      draw();
    };

    container.querySelectorAll('[data-copy-entry]').forEach(el=>{
      el.onclick = async ()=>{
        const id = el.getAttribute('data-copy-entry');
        const entry = state.entries.find(e=>e.id===id);
        if(!entry) return;
        try{ await navigator.clipboard.writeText(entry.text); } catch(e){}
        state.copiedId = id; draw();
        setTimeout(()=>{ if(state.copiedId===id){ state.copiedId=null; draw(); } }, 1500);
      };
    });

    container.querySelectorAll('[data-edit-entry]').forEach(el=>{
      el.onclick = ()=>{
        const id = el.getAttribute('data-edit-entry');
        const entry = state.entries.find(e=>e.id===id);
        if(!entry) return;
        state.editingId = id;
        state.editEntry = { text: entry.text, kind: entry.kind, note: entry.note || '' };
        draw();
      };
    });
    const cancelEditBtn = container.querySelector('[data-action="cancel-edit"]');
    if(cancelEditBtn) cancelEditBtn.onclick = ()=>{ state.editingId = null; draw(); };
    const eeKind = container.querySelector('#ee-kind');
    const eeText = container.querySelector('#ee-text');
    const eeNote = container.querySelector('#ee-note');
    if(eeKind) eeKind.onchange = ()=>{ state.editEntry.kind = eeKind.value; };
    if(eeText) eeText.oninput = ()=>{ state.editEntry.text = eeText.value; };
    if(eeNote) eeNote.oninput = ()=>{ state.editEntry.note = eeNote.value; };
    const saveEditBtn = container.querySelector('[data-action="save-edit"]');
    if(saveEditBtn) saveEditBtn.onclick = async ()=>{
      const text = (eeText?eeText.value:state.editEntry.text).trim();
      if(!text) return;
      await ctx.supabase.from('cta_bank_personal').update({
        text, kind: state.editEntry.kind, note: (eeNote?eeNote.value:state.editEntry.note).trim() || null,
      }).eq('id', state.editingId);
      state.editingId = null;
      await loadEntries();
      draw();
    };

    container.querySelectorAll('[data-del-entry]').forEach(el=>{
      el.onclick = async ()=>{
        const id = el.getAttribute('data-del-entry');
        if(!(await confirmModal('Xoá mẫu này khỏi kho? Không khôi phục lại được.'))) return;
        await ctx.supabase.from('cta_bank_personal').delete().eq('id', id);
        await loadEntries();
        draw();
      };
    });
  }

  boot();
}

window.Modules = window.Modules || {};
window.Modules['kho-cta'] = { title:'Kho CTA', render };
})();
