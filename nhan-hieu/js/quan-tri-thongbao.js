(function(){
// Đăng thông báo tính năng mới (2026-08-22, theo yêu cầu chị Quỳnh: "mỗi khi mình cập nhật tính
// năng gì mới thì trên app của khách cũng hiện thông báo và hướng dẫn sử dụng cái tính năng đó" —
// sau đó chốt lại: "hiện kiểu popup giữa màn hình... hỏi ngta có muốn hướng dẫn ko, ấn có thì
// hướng dẫn từng bước y hệt như hướng dẫn lúc đầu vô app"). Đăng ở đây → hiện popup cho MỌI user
// (feature-tour.js so profiles.last_seen_announcement_id) + đẩy push cho ai đã bật thông báo
// (api/cron/send-reminders.js quét bảng feature_announcements). "Các bước hướng dẫn" là TUỲ CHỌN —
// để trống thì popup chỉ hiện nội dung + nút "Đã hiểu", không có tour.
function render(container, ctx){
  const state = { title:'', body:'', steps:[], posting:false, list:[] };
  // Chỉ cho chọn các mục sidebar THẬT SỰ hiện ra được (không phải mục ẩn/chỉ-admin) — feature-tour.js
  // trỏ sáng bằng .sidebar-item[data-key], mục không hiện trong sidebar thì không trỏ được.
  const navOptions = (typeof NAV !== 'undefined' ? NAV : []).filter(n => !n.hidden && !n.adminOnly);

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

  function canPost(){ return !state.posting && state.title.trim() && state.body.trim(); }

  async function post(){
    if(!canPost()) return;
    state.posting = true; draw();
    const cleanSteps = state.steps.filter(s => s.key && s.text.trim()).map(s => ({ key:s.key, text:s.text.trim() }));
    const { error } = await ctx.supabase.from('feature_announcements').insert({
      title: state.title.trim(), body: state.body.trim(), steps: cleanSteps, created_by: ctx.user.id,
    });
    state.posting = false;
    if(error){ alert('Lỗi khi đăng: ' + error.message); draw(); return; }
    state.title = ''; state.body = ''; state.steps = [];
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

  function stepRowHtml(step, i){
    return `
      <div class="section" data-step-row="${i}" style="display:flex;gap:8px;align-items:flex-start;margin-bottom:8px;">
        <select data-step-key="${i}" style="flex:0 0 200px;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-size:13.5px;background:#FDFCF8;">
          <option value="">— Chọn mục trong app —</option>
          ${navOptions.map(n => `<option value="${esc(n.key)}" ${step.key===n.key?'selected':''}>${esc(n.title)}</option>`).join('')}
        </select>
        <input data-step-text="${i}" type="text" placeholder="Nói gì ở bước này..." value="${esc(step.text)}"
          style="flex:1;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-size:13.5px;background:#FDFCF8;">
        <span data-step-remove="${i}" class="btn-ghost btn btn-sm" style="color:var(--danger);white-space:nowrap;">Xoá</span>
      </div>
    `;
  }

  function html(){
    return `
      <div class="page-head"><h1>Thông báo tính năng</h1><p>Đăng ở đây sẽ hiện popup giữa màn hình cho tất cả khách, kèm gửi thông báo đẩy cho ai đã bật. Thêm "các bước hướng dẫn" nếu muốn có tuỳ chọn dẫn khách đi từng bước trong app (giống hướng dẫn lúc mới vào app).</p></div>
      <div class="card" style="margin-bottom:24px;">
        <div class="field" style="margin-bottom:14px;">
          <label>Tiêu đề</label>
          <input id="tb-title" type="text" placeholder="VD: Mới: Lịch quay content có nút Đã làm" value="${esc(state.title)}"
            style="width:100%;padding:12px 14px;border:1px solid var(--line);border-radius:10px;font-size:14.5px;background:#FDFCF8;">
        </div>
        <div class="field" style="margin-bottom:18px;">
          <label>Nội dung</label>
          <textarea id="tb-body" rows="4" placeholder="Mô tả ngắn tính năng mới..."
            style="width:100%;padding:12px 14px;border:1px solid var(--line);border-radius:10px;font-size:14.5px;background:#FDFCF8;resize:vertical;">${esc(state.body)}</textarea>
        </div>
        <div class="field" style="margin-bottom:10px;">
          <label>Các bước hướng dẫn (tuỳ chọn) — để trống nếu chỉ cần thông báo, không cần dẫn từng bước</label>
        </div>
        ${state.steps.map(stepRowHtml).join('')}
        <span id="tb-add-step" class="btn-ghost btn btn-sm" style="margin-bottom:18px;">+ Thêm bước</span>
        <div>
          <button id="tb-post" class="btn btn-sm" ${canPost() ? '' : 'disabled'}>
            ${state.posting ? 'Đang đăng...' : 'Đăng thông báo'}
          </button>
        </div>
      </div>
      <div class="page-head" style="margin-bottom:12px;"><h2 style="font-size:16px;">Đã đăng gần đây</h2></div>
      ${state.list.length===0 ? `<div style="color:var(--ink-soft);font-size:14px;">Chưa đăng thông báo nào.</div>` : ''}
      ${state.list.map(a=>`
        <div class="section" style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
          <div>
            <div style="font-weight:600;font-size:14.5px;margin-bottom:4px;">${esc(a.title)}</div>
            <div style="font-size:13.5px;color:var(--ink-soft);white-space:pre-wrap;">${esc(a.body)}</div>
            <div style="font-size:12px;color:var(--ink-soft);margin-top:6px;">
              ${esc(new Date(a.created_at).toLocaleString('vi-VN'))}${a.steps && a.steps.length ? ` — ${a.steps.length} bước hướng dẫn` : ''}
            </div>
          </div>
          <span class="btn-ghost btn btn-sm" data-remove="${a.id}" style="color:var(--danger);white-space:nowrap;">Xoá</span>
        </div>
      `).join('')}
    `;
  }

  function bind(){
    const title = container.querySelector('#tb-title');
    const body = container.querySelector('#tb-body');
    const refreshPostBtn = ()=>{ const d=container.querySelector('#tb-post'); if(d) d.disabled = !canPost(); };
    if(title) title.oninput = ()=>{ state.title = title.value; refreshPostBtn(); };
    if(body) body.oninput = ()=>{ state.body = body.value; refreshPostBtn(); };

    const addStepBtn = container.querySelector('#tb-add-step');
    if(addStepBtn) addStepBtn.onclick = ()=>{ state.steps.push({ key:'', text:'' }); draw(); };

    container.querySelectorAll('[data-step-key]').forEach(el=>{
      el.onchange = ()=>{ state.steps[Number(el.getAttribute('data-step-key'))].key = el.value; };
    });
    container.querySelectorAll('[data-step-text]').forEach(el=>{
      el.oninput = ()=>{ state.steps[Number(el.getAttribute('data-step-text'))].text = el.value; };
    });
    container.querySelectorAll('[data-step-remove]').forEach(el=>{
      el.onclick = ()=>{ state.steps.splice(Number(el.getAttribute('data-step-remove')), 1); draw(); };
    });

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
