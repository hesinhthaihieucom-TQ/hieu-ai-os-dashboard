(function(){
// Duyệt đánh giá app trước khi hiện công khai ở Trang chủ (2026-08-24) — giống pattern Kho Content
// Viral/Kho Hook Viral: khách gửi → admin duyệt → mới hiện cho mọi người, tránh review linh
// tinh/tiêu cực hiện ngay không kiểm soát được.
function render(container, ctx){
  const state = { reviews:[], q:'', busyId:null };

  function draw(){ container.innerHTML = html(); bind(); }

  async function boot(){
    draw();
    await load();
    draw();
  }

  async function load(){
    const { data } = await ctx.supabase.from('app_reviews').select('*').eq('app', 'nhan-hieu').order('created_at', { ascending:false }).limit(100);
    state.reviews = data || [];
  }

  function filtered(){
    const q = state.q.trim().toLowerCase();
    if(!q) return state.reviews;
    return state.reviews.filter(r => (r.comment||'').toLowerCase().includes(q) || (r.display_name||'').toLowerCase().includes(q));
  }

  function html(){
    const list = filtered();
    const pendingCount = state.reviews.filter(r=>!r.approved).length;
    return `
      <div class="page-head"><h1>Đánh giá app</h1><p>${pendingCount} đánh giá đang chờ duyệt. Duyệt xong mới hiện công khai ở Trang chủ.</p></div>
      <div class="card" style="margin-bottom:20px;">
        <input id="dg-search" type="text" placeholder="Tìm theo nội dung hoặc tên..." value="${esc(state.q)}"
          style="width:100%;padding:12px 14px;border:1px solid var(--line);border-radius:10px;font-size:14.5px;background:#FDFCF8;">
      </div>
      ${list.length===0 ? `<div style="color:var(--ink-soft);font-size:14px;">Chưa có đánh giá nào.</div>` : ''}
      ${list.map(r=>`
        <div class="section">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
            <div style="font-size:13px;color:var(--ink-soft);">${esc(r.display_name||'Ẩn danh')} · ${esc(new Date(r.created_at).toLocaleString('vi-VN'))}</div>
            <span style="font-family:'IBM Plex Mono',monospace;font-size:11px;padding:3px 10px;border-radius:999px;
              background:${r.approved?'var(--accent-soft)':'#FBF6E9'};color:${r.approved?'var(--accent)':'var(--gold)'};">${r.approved?'Đã duyệt':'Chờ duyệt'}</span>
          </div>
          <div class="body" style="margin-top:10px;white-space:pre-wrap;">${esc(r.comment)}</div>
          <div class="btn-row" style="margin-top:12px;justify-content:flex-start;">
            ${!r.approved ? `<button class="btn btn-sm" data-approve="${r.id}" ${state.busyId===r.id?'disabled':''}>Duyệt, hiện công khai</button>` : `<span class="btn-ghost btn btn-sm" data-unapprove="${r.id}" ${state.busyId===r.id?'disabled':''}>Ẩn khỏi Trang chủ</span>`}
            <span class="btn-ghost btn btn-sm" style="color:var(--danger);" data-delete="${r.id}" ${state.busyId===r.id?'disabled':''}>Xoá</span>
          </div>
        </div>
      `).join('')}
    `;
  }

  function bind(){
    const search = container.querySelector('#dg-search');
    if(search) search.oninput = ()=>{ state.q = search.value; draw(); search.focus(); search.selectionStart = search.selectionEnd = search.value.length; };
    container.querySelectorAll('[data-approve]').forEach(el=>{
      el.onclick = ()=>setApproved(el.getAttribute('data-approve'), true);
    });
    container.querySelectorAll('[data-unapprove]').forEach(el=>{
      el.onclick = ()=>setApproved(el.getAttribute('data-unapprove'), false);
    });
    container.querySelectorAll('[data-delete]').forEach(el=>{
      el.onclick = async ()=>{
        const id = el.getAttribute('data-delete');
        if(!(await confirmModal('Xoá vĩnh viễn đánh giá này? Không khôi phục được.'))) return;
        state.busyId = id; draw();
        await ctx.supabase.from('app_reviews').delete().eq('id', id);
        await load();
        state.busyId = null;
        draw();
      };
    });
  }

  async function setApproved(id, approved){
    state.busyId = id; draw();
    await ctx.supabase.from('app_reviews').update({ approved }).eq('id', id);
    await load();
    state.busyId = null;
    draw();
  }

  boot();
}
window.Modules = window.Modules || {};
window.Modules['quan-tri-danhgia'] = { title:'Đánh giá app', render };
})();
