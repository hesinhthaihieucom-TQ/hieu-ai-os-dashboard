(function(){
const CATEGORIES = {
  noi_dau: 'Nỗi đau', su_that_nguoc: 'Sự thật ngược', canh_bao: 'Cảnh báo',
  ket_qua_mong_muon: 'Kết quả mong muốn', tu_khoa_kich_hoat: 'Từ khoá kích hoạt chú ý',
};

function render(container, ctx){
  const state = { tab:'kho-toi', personal:[], shared:[], error:null, newEntry:{ hook_text:'', category:'', note:'' } };

  function draw(){ container.innerHTML = html(); bind(); }

  async function boot(){
    container.innerHTML = `<div class="loading"><div class="spinner"></div><p>Đang tải…</p></div>`;
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
          <div class="list-item">
            <div class="txt"><div class="meta">${esc(CATEGORIES[h.category]||h.category||'')}</div><b>${esc(h.hook_text)}</b>${h.note?`<br><span style="color:var(--ink-soft);">${esc(h.note)}</span>`:''}</div>
            <span style="color:var(--danger);cursor:pointer;font-size:12px;flex-shrink:0;" data-del="${h.id}">Xoá</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  function khoChungTab(){
    if(state.shared.length===0) return `<div class="card" style="color:var(--ink-soft);">Kho chung chưa có hook nào — sẽ được cập nhật từ đội ngũ.</div>`;
    return state.shared.map(h=>`
      <div class="list-item">
        <div class="txt"><div class="meta">${esc(CATEGORIES[h.category]||h.category||'')}</div><b>${esc(h.hook_text)}</b>${h.note?`<br><span style="color:var(--ink-soft);">${esc(h.note)}</span>`:''}</div>
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
