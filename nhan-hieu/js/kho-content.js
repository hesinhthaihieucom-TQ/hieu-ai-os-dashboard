(function(){
const SOURCE_MAP = {
  ca_nhan: 'Câu chuyện cá nhân', case_hoc_vien: 'Case học viên', cau_hoi_kh: 'Câu hỏi khách hàng',
  xu_huong: 'Xu hướng thị trường', quan_diem_nguoc_dong: 'Quan điểm ngược dòng',
};

function render(container, ctx){
  const state = { tab:'da-viet', posts:[], personalBank:[], sharedBank:[], newEntry:{ title:'', content:'', source_type:'', tags:'' } };

  function draw(){ container.innerHTML = html(); bind(); }

  async function boot(){
    container.innerHTML = `<div class="loading"><div class="spinner"></div><p>Đang tải…</p></div>`;
    await Promise.all([loadPosts(), loadPersonal(), loadShared()]);
    draw();
  }
  async function loadPosts(){
    const { data } = await ctx.supabase.from('posts').select('*').eq('user_id', ctx.user.id).order('created_at', { ascending:false });
    state.posts = data || [];
  }
  async function loadPersonal(){
    const { data } = await ctx.supabase.from('content_bank_personal').select('*').eq('user_id', ctx.user.id).order('created_at', { ascending:false });
    state.personalBank = data || [];
  }
  async function loadShared(){
    const { data } = await ctx.supabase.from('content_bank_shared').select('*').order('created_at', { ascending:false });
    state.sharedBank = data || [];
  }

  function html(){
    return `
      <div class="page-head"><h1>Kho Content</h1><p>Bài đã viết, tư liệu bạn tự sưu tầm, và kho chung do đội ngũ cập nhật.</p></div>
      <div class="tab-row">
        <div class="tab-btn ${state.tab==='da-viet'?'active':''}" data-tab="da-viet">Bài đã viết (${state.posts.length})</div>
        <div class="tab-btn ${state.tab==='kho-toi'?'active':''}" data-tab="kho-toi">Kho của tôi (${state.personalBank.length})</div>
        <div class="tab-btn ${state.tab==='kho-chung'?'active':''}" data-tab="kho-chung">Kho chung (${state.sharedBank.length})</div>
      </div>
      ${state.tab==='da-viet' ? daVietTab() : state.tab==='kho-toi' ? khoToiTab() : khoChungTab()}
    `;
  }

  function daVietTab(){
    if(state.posts.length===0) return `<div class="card" style="color:var(--ink-soft);">Chưa có bài nào — sang mục Viết Content để tạo bài đầu tiên.</div>`;
    return state.posts.map(p=>`
      <div class="section">
        <h3>${esc(p.title||'(không tiêu đề)')}</h3>
        <div class="body">${esc(p.content)}</div>
        <div class="btn-row" style="margin-top:14px;"><button class="btn btn-sm" data-schedule="${p.id}">Đưa vào lịch →</button></div>
      </div>
    `).join('');
  }

  function khoToiTab(){
    return `
      <div class="card">
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:6px;">Tiêu đề</label>
        <textarea id="ne-title" style="min-height:auto;height:44px;">${esc(state.newEntry.title)}</textarea>
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 6px;">Nội dung</label>
        <textarea id="ne-content">${esc(state.newEntry.content)}</textarea>
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 6px;">Loại nguồn</label>
        <select id="ne-source">
          <option value="">— Chọn —</option>
          ${Object.entries(SOURCE_MAP).map(([k,v])=>`<option value="${k}" ${state.newEntry.source_type===k?'selected':''}>${esc(v)}</option>`).join('')}
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
    if(state.sharedBank.length===0) return `<div class="card" style="color:var(--ink-soft);">Kho chung chưa có nội dung — sẽ được cập nhật từ đội ngũ.</div>`;
    return state.sharedBank.map(b=>`
      <div class="list-item">
        <div class="txt"><div class="meta">${esc(SOURCE_MAP[b.source_type]||b.source_type||'')}${(b.tags&&b.tags.length)?' · '+b.tags.map(esc).join(', '):''}</div><b>${esc(b.title)}</b><br>${esc(b.content)}</div>
      </div>
    `).join('');
  }

  function bind(){
    container.querySelectorAll('[data-tab]').forEach(el=>{ el.onclick = ()=>{ state.tab = el.getAttribute('data-tab'); draw(); }; });

    container.querySelectorAll('[data-schedule]').forEach(el=>{
      el.onclick = ()=>{
        window.PendingPost = state.posts.find(p=>p.id===el.getAttribute('data-schedule'));
        location.hash = 'lich-dang';
      };
    });

    const t = container.querySelector('#ne-title'); if(t) t.oninput = ()=>state.newEntry.title = t.value;
    const c = container.querySelector('#ne-content'); if(c) c.oninput = ()=>state.newEntry.content = c.value;
    const s = container.querySelector('#ne-source'); if(s) s.onchange = ()=>state.newEntry.source_type = s.value;
    const tg = container.querySelector('#ne-tags'); if(tg) tg.oninput = ()=>state.newEntry.tags = tg.value;
    const addBtn = container.querySelector('[data-action="add-personal"]');
    if(addBtn) addBtn.onclick = addPersonal;
    container.querySelectorAll('[data-del-personal]').forEach(el=>{
      el.onclick = async ()=>{
        await ctx.supabase.from('content_bank_personal').delete().eq('id', el.getAttribute('data-del-personal'));
        await loadPersonal(); draw();
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
    await loadPersonal();
    draw();
  }

  boot();
}
window.Modules = window.Modules || {};
window.Modules['kho-content'] = { title:'Kho Content', render };
})();
