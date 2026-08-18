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
  const state = { screen:'loading', profiles:[], transactions:[], revenueTotal:0, revenueThisMonth:0, q:'', error:null, busyId:null, confirmDeleteId:null };

  function draw(){ container.innerHTML = html(); bind(); }

  async function boot(){
    draw();
    if(!ctx.profile || ctx.profile.role !== 'admin'){
      state.screen = 'denied'; draw(); return;
    }
    await Promise.all([load(), loadTransactions(), loadRevenue()]);
    state.screen = 'main';
    draw();
  }

  async function load(){
    const { data, error } = await ctx.supabase.from('profiles').select('*').order('access_until', { ascending:true, nullsFirst:true });
    if(error){ state.error = error.message; state.profiles = []; return; }
    state.profiles = data || [];
  }

  async function loadTransactions(){
    const { data } = await ctx.supabase.from('sepay_transactions').select('*').order('created_at', { ascending:false }).limit(20);
    state.transactions = data || [];
  }

  // Tính tổng doanh thu từ TOÀN BỘ giao dịch đã khớp (không giới hạn 20 dòng như danh sách hiển
  // thị bên trên) — chỉ lấy 2 cột cần thiết cho nhẹ, cộng dồn ở client.
  async function loadRevenue(){
    const { data } = await ctx.supabase.from('sepay_transactions').select('transfer_amount, created_at').eq('status', 'matched');
    const rows = data || [];
    state.revenueTotal = rows.reduce((sum, r) => sum + (r.transfer_amount || 0), 0);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    state.revenueThisMonth = rows
      .filter(r => new Date(r.created_at).getTime() >= startOfMonth)
      .reduce((sum, r) => sum + (r.transfer_amount || 0), 0);
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

      <div class="source-grid" style="margin-bottom:12px;">
        <div class="source-card"><div class="ic" style="font-size:18px;">${state.revenueTotal.toLocaleString('vi-VN')}đ</div><div class="label">Tổng doanh thu</div></div>
        <div class="source-card"><div class="ic" style="font-size:18px;">${state.revenueThisMonth.toLocaleString('vi-VN')}đ</div><div class="label">Doanh thu tháng này</div></div>
      </div>

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

      ${state.transactions.length ? `
        <div class="card" style="margin-bottom:20px;">
          <h3 style="margin-bottom:10px;">Giao dịch SePay gần đây</h3>
          ${state.transactions.map(t=>{
            const ok = t.status === 'matched';
            return `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--line);font-size:13px;flex-wrap:wrap;">
              <span>${esc(new Date(t.created_at).toLocaleString('vi-VN'))} — ${esc((t.transfer_amount||0).toLocaleString('vi-VN'))}đ — <span style="font-family:'IBM Plex Mono',monospace;">${esc(t.ref_code_found||'(không tìm thấy mã)')}</span></span>
              <span style="font-size:11.5px;font-weight:600;padding:3px 9px;border-radius:999px;
                background:${ok?'var(--accent-soft)':'#FBEAE4'};color:${ok?'var(--accent)':'var(--danger)'};">
                ${ok?`Đã cộng ${t.days_granted} ngày`:t.status==='unmatched_code'?'Không tìm thấy mã':'Sai số tiền — cần xử lý tay'}
              </span>
            </div>`;
          }).join('')}
        </div>
      ` : ''}

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
          ${p.ref_code ? `<div class="body" style="margin-top:2px;font-size:12.5px;color:var(--ink-soft);">Mã tham chiếu chuyển khoản: <span style="font-family:'IBM Plex Mono',monospace;">${esc(p.ref_code)}</span></div>` : ''}
          ${p.role!=='admin' ? `
            <div class="body" style="margin-top:6px;font-size:12.5px;">
              ${p.is_student
                ? `<span style="color:var(--accent);font-weight:600;">🎓 Học viên (giá ưu đãi)</span>`
                : `<span style="color:var(--ink-soft);">Khách thường (giá thường)</span>`}
              — tự khai lúc đăng ký, chưa xác minh. Đối chiếu email với danh sách học viên thật rồi bấm nút bên dưới nếu cần sửa lại.
            </div>
            <div class="btn-row" style="margin-top:12px;justify-content:flex-start;">
              <button class="btn btn-sm" data-extend="${p.id}|30" ${state.busyId===p.id?'disabled':''}>+30 ngày</button>
              <button class="btn btn-sm" data-extend="${p.id}|180" ${state.busyId===p.id?'disabled':''}>+180 ngày</button>
              <button class="btn btn-sm" data-extend="${p.id}|365" ${state.busyId===p.id?'disabled':''}>+365 ngày</button>
              <button class="btn-ghost btn btn-sm" data-revoke="${p.id}" ${state.busyId===p.id?'disabled':''}>Thu hồi ngay</button>
              <button class="btn-ghost btn btn-sm" data-toggle-student="${p.id}|${!p.is_student}" ${state.busyId===p.id?'disabled':''}>${p.is_student?'Bỏ đánh dấu học viên':'Đánh dấu là học viên'}</button>
            </div>
            <div class="btn-row" style="margin-top:8px;justify-content:flex-start;">
              ${state.confirmDeleteId===p.id ? `
                <span style="font-size:12.5px;color:var(--danger);font-weight:600;">Xoá vĩnh viễn tài khoản này? Không khôi phục được.</span>
                <button class="btn btn-sm" style="background:var(--danger);" data-confirm-delete="${p.id}" ${state.busyId===p.id?'disabled':''}>${state.busyId===p.id?'Đang xoá…':'Xác nhận xoá'}</button>
                <span class="btn-ghost btn btn-sm" data-cancel-delete="1">Huỷ</span>
              ` : `
                <span style="color:var(--danger);cursor:pointer;font-size:12px;" data-ask-delete="${p.id}">Xoá tài khoản (tài khoản test/rác)</span>
              `}
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
    container.querySelectorAll('[data-toggle-student]').forEach(el=>{
      el.onclick = ()=>{
        const [id, next] = el.getAttribute('data-toggle-student').split('|');
        toggleStudent(id, next === 'true');
      };
    });

    container.querySelectorAll('[data-ask-delete]').forEach(el=>{
      el.onclick = ()=>{ state.confirmDeleteId = el.getAttribute('data-ask-delete'); draw(); };
    });
    const cancelDeleteLink = container.querySelector('[data-cancel-delete]');
    if(cancelDeleteLink) cancelDeleteLink.onclick = ()=>{ state.confirmDeleteId = null; draw(); };
    container.querySelectorAll('[data-confirm-delete]').forEach(el=>{
      el.onclick = ()=>{ deleteAccount(el.getAttribute('data-confirm-delete')); };
    });
  }

  async function deleteAccount(id){
    state.busyId = id; draw();
    try{
      await callApi('/api/admin-delete-user', { user_id: id });
      state.error = null;
    } catch(e){ state.error = e.message; }
    state.confirmDeleteId = null;
    state.busyId = null;
    await load();
    draw();
  }

  async function toggleStudent(id, isStudent){
    state.busyId = id; draw();
    const { error } = await ctx.supabase.from('profiles').update({ is_student: isStudent }).eq('id', id);
    if(error) state.error = error.message; else state.error = null;
    await load();
    state.busyId = null;
    draw();
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
