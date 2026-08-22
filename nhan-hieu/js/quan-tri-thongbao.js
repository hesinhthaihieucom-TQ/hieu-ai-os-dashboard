(function(){
// Đăng thông báo tính năng mới (2026-08-22, theo yêu cầu chị Quỳnh: "mỗi khi mình cập nhật tính
// năng gì mới thì trên app của khách cũng hiện thông báo và hướng dẫn sử dụng cái tính năng đó").
// Đăng ở đây → hiện banner cho MỌI user (app-shell.js so profiles.last_seen_announcement_id) + đẩy
// push cho ai đã bật thông báo (api/cron/send-reminders.js quét bảng feature_announcements).
function render(container, ctx){
  const state = { title:'', body:'', posting:false, list:[] };

  function draw(){ container.innerHTML = html(); bind(); }

  async function boot(){
    draw();
    await load();
    draw();
  }

  async function load(){
    const { data } = await ctx.supabase.from('feature_announcements').select('*').order('created_at', { ascending:false }).limit(20);
    state.list = data || [];
  }

  async function post(){
    if(state.posting || !state.title.trim() || !state.body.trim()) return;
    state.posting = true; draw();
    const { error } = await ctx.supabase.from('feature_announcements').insert({
      title: state.title.trim(), body: state.body.trim(), created_by: ctx.user.id,
    });
    state.posting = false;
    if(error){ alert('Lỗi khi đăng: ' + error.message); draw(); return; }
    state.title = ''; state.body = '';
    await load();
    draw();
  }

  async function remove(id){
    const ok = await confirmModal('Xoá thông báo này? Ai chưa đọc sẽ không thấy nữa.', 'Xoá');
    if(!ok) return;
    await ctx.supabase.from('feature_announcements').delete().eq('id', id);
    await load();
    draw();
  }

  function html(){
    return `
      <div class="page-head"><h1>Thông báo tính năng</h1><p>Đăng ở đây sẽ hiện banner cho tất cả khách trong app, kèm gửi thông báo đẩy cho ai đã bật.</p></div>
      <div class="card" style="margin-bottom:24px;">
        <div class="field" style="margin-bottom:14px;">
          <label>Tiêu đề</label>
          <input id="tb-title" type="text" placeholder="VD: Mới: Lịch quay content có nút Đã làm" value="${esc(state.title)}"
            style="width:100%;padding:12px 14px;border:1px solid var(--line);border-radius:10px;font-size:14.5px;background:#FDFCF8;">
        </div>
        <div class="field" style="margin-bottom:14px;">
          <label>Nội dung / hướng dẫn dùng</label>
          <textarea id="tb-body" rows="4" placeholder="Mô tả ngắn tính năng mới và cách dùng..."
            style="width:100%;padding:12px 14px;border:1px solid var(--line);border-radius:10px;font-size:14.5px;background:#FDFCF8;resize:vertical;">${esc(state.body)}</textarea>
        </div>
        <button id="tb-post" class="btn btn-sm" ${state.posting || !state.title.trim() || !state.body.trim() ? 'disabled' : ''}>
          ${state.posting ? 'Đang đăng...' : 'Đăng thông báo'}
        </button>
      </div>
      <div class="page-head" style="margin-bottom:12px;"><h2 style="font-size:16px;">Đã đăng gần đây</h2></div>
      ${state.list.length===0 ? `<div style="color:var(--ink-soft);font-size:14px;">Chưa đăng thông báo nào.</div>` : ''}
      ${state.list.map(a=>`
        <div class="section" style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
          <div>
            <div style="font-weight:600;font-size:14.5px;margin-bottom:4px;">${esc(a.title)}</div>
            <div style="font-size:13.5px;color:var(--ink-soft);white-space:pre-wrap;">${esc(a.body)}</div>
            <div style="font-size:12px;color:var(--ink-soft);margin-top:6px;">${esc(new Date(a.created_at).toLocaleString('vi-VN'))}</div>
          </div>
          <span class="btn-ghost btn btn-sm" data-remove="${a.id}" style="color:var(--danger);white-space:nowrap;">Xoá</span>
        </div>
      `).join('')}
    `;
  }

  function bind(){
    const title = container.querySelector('#tb-title');
    const body = container.querySelector('#tb-body');
    if(title) title.oninput = ()=>{ state.title = title.value; const d=container.querySelector('#tb-post'); if(d) d.disabled = state.posting || !state.title.trim() || !state.body.trim(); };
    if(body) body.oninput = ()=>{ state.body = body.value; const d=container.querySelector('#tb-post'); if(d) d.disabled = state.posting || !state.title.trim() || !state.body.trim(); };
    const postBtn = container.querySelector('#tb-post');
    if(postBtn) postBtn.onclick = post;
    container.querySelectorAll('[data-remove]').forEach(el=>{
      el.onclick = ()=>remove(el.getAttribute('data-remove'));
    });
  }

  boot();
}
window.Modules = window.Modules || {};
window.Modules['quan-tri-thongbao'] = { title:'Thông báo tính năng', render };
})();
