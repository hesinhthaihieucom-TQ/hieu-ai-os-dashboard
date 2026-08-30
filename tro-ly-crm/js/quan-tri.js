// Quản Trị — màn hình admin để kích hoạt/gia hạn tay khi webhook SePay khớp lệch/trễ, giống đúng
// cách làm ở nhan-hieu/js/quan-tri.js (extend()/toggleHasPaid() — update thẳng qua Supabase client,
// dựa vào RLS admin, không qua serverless function) áp dụng lên các cột crm_* riêng của app này.
// Danh sách thành viên lọc theo crm_first_visited_at (set tự động ở app-shell.js khi vào app lần
// đầu) — đúng pattern suc-khoe/js/quan-tri.js dùng sk_first_visited_at, vì bảng profiles dùng CHUNG
// cho mọi app trong hệ sinh thái HIỂU.
(function(){
function statusOf(p){
  if(p.role==='admin') return { label:'Admin', cls:'admin' };
  if(!p.crm_access_until) return { label:'Chưa kích hoạt', cls:'none' };
  const diffMs = new Date(p.crm_access_until).getTime() - Date.now();
  if(diffMs <= 0) return { label:'Đã hết hạn', cls:'expired' };
  const days = Math.ceil(diffMs / 86400000);
  if(days <= 3) return { label:`Sắp hết hạn (${days} ngày)`, cls:'soon' };
  return { label:`Đang hoạt động (${days} ngày)`, cls:'active' };
}

function render(container, ctx){
  const state = { screen:'loading', profiles:[], q:'', error:null, busyId:null, extendDays:{} };

  let searchDebounceTimer = null;
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
    const { data, error } = await ctx.supabase.from('profiles')
      .select('id,email,full_name,role,crm_has_paid,crm_access_until,crm_plan_days')
      .not('crm_first_visited_at', 'is', null)
      .order('crm_access_until', { ascending:true });
    if(error){ state.error = error.message; state.profiles = []; return; }
    state.profiles = data || [];
  }

  function filtered(){
    const q = state.q.trim().toLowerCase();
    if(!q) return state.profiles;
    return state.profiles.filter(p =>
      (p.email||'').toLowerCase().includes(q) || (p.full_name||'').toLowerCase().includes(q)
    );
  }

  function html(){
    if(state.screen==='loading') return `<div class="loading"><div class="spinner"></div><p>Đang tải…</p></div>`;
    if(state.screen==='denied') return `<div class="page-head"><h1>Không có quyền truy cập</h1><p>Mục này chỉ dành cho quản trị viên.</p></div>`;

    const list = filtered();
    return `
      <div class="page-head"><h1>Quản Trị</h1><p>Danh sách khách dùng Trợ Lý AI Tư Vấn &amp; CRM — kích hoạt/gia hạn tay khi webhook SePay khớp lệch hoặc trễ.</p></div>

      <div class="card" style="margin-bottom:20px;">
        <input id="q-search" type="text" placeholder="Tìm theo email hoặc tên..." value="${esc(state.q)}"
          style="width:100%;padding:12px 14px;border:1px solid var(--line);border-radius:10px;font-size:14.5px;background:#FDFCF8;">
      </div>

      ${state.error?`<div class="error-box">${esc(state.error)}</div>`:''}

      ${list.length===0 ? `<div style="color:var(--ink-soft);font-size:14px;">Không có kết quả.</div>` : ''}

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

          ${p.role!=='admin' ? `
            <div style="margin-top:12px;display:grid;grid-template-columns:1fr 1fr;gap:5px 16px;font-size:13px;">
              <div><span style="color:var(--ink-soft);">Hạn dùng:</span> ${p.crm_access_until ? esc(new Date(p.crm_access_until).toLocaleString('vi-VN')) : '(chưa có)'}</div>
              <div><span style="color:var(--ink-soft);">Gói gần nhất:</span> ${p.crm_plan_days ? `${p.crm_plan_days} ngày` : 'Chưa rõ'}</div>
              <div style="grid-column:1/-1;"><span style="color:var(--ink-soft);">Thanh toán:</span> ${p.crm_has_paid?'💰 Đã trả phí':'Chưa trả phí'}
                <span style="text-decoration:underline;cursor:pointer;font-size:12px;margin-left:4px;" data-toggle-paid="${p.id}|${!p.crm_has_paid}">đổi</span></div>
            </div>

            <div style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.05em;margin-top:14px;margin-bottom:6px;">Gia hạn thủ công</div>
            <div class="btn-row" style="justify-content:flex-start;align-items:center;">
              <input type="number" data-extend-days="${p.id}" placeholder="Số ngày, vd 30" style="width:130px;padding:6px 10px;border:1px solid var(--line);border-radius:6px;font-size:12.5px;" value="${esc(state.extendDays[p.id]||'')}">
              <button class="btn btn-sm" data-extend="${p.id}" ${state.busyId===p.id?'disabled':''}>Gia hạn</button>
              <button class="btn-ghost btn btn-sm" data-extend-quick="${p.id}|30" ${state.busyId===p.id?'disabled':''}>+30</button>
              <button class="btn-ghost btn btn-sm" data-extend-quick="${p.id}|180" ${state.busyId===p.id?'disabled':''}>+180</button>
              <button class="btn-ghost btn btn-sm" data-extend-quick="${p.id}|365" ${state.busyId===p.id?'disabled':''}>+365</button>
            </div>
            <div style="font-size:11.5px;color:var(--ink-soft);margin-top:4px;">Gia hạn từ hạn dùng hiện tại nếu còn hạn, ngược lại tính từ hôm nay — tự bật "đã trả phí" luôn.</div>
          ` : ''}
        </div>
      `;}).join('')}
    `;
  }

  function bind(){
    const search = container.querySelector('#q-search');
    if(search) search.oninput = ()=>{
      state.q = search.value;
      // Debounce redraw (gõ tiếng Việt có dấu bị lỗi nếu vẽ lại ngay mỗi phím — xem giải thích ở
      // khach-hang.js's #kh-search, cùng nguyên nhân).
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        const pos = search.selectionStart;
        draw();
        const newEl = container.querySelector('#q-search');
        if(newEl){ newEl.focus(); newEl.setSelectionRange(pos, pos); }
      }, 300);
    };

    container.querySelectorAll('[data-toggle-paid]').forEach(el=>{
      el.onclick = ()=>{
        const [id, next] = el.getAttribute('data-toggle-paid').split('|');
        toggleHasPaid(id, next === 'true');
      };
    });
    container.querySelectorAll('[data-extend-days]').forEach(el=>{
      el.oninput = ()=>{ state.extendDays[el.getAttribute('data-extend-days')] = el.value; };
    });
    container.querySelectorAll('[data-extend]').forEach(el=>{
      el.onclick = ()=>{
        const id = el.getAttribute('data-extend');
        extend(id, Number(state.extendDays[id]));
      };
    });
    container.querySelectorAll('[data-extend-quick]').forEach(el=>{
      el.onclick = ()=>{
        const [id, days] = el.getAttribute('data-extend-quick').split('|');
        extend(id, Number(days));
      };
    });
  }

  // Dùng khi kích hoạt TAY cho khách đã chuyển khoản thật (vd webhook SePay khớp lệch/trễ) —
  // nếu current crm_access_until còn ở tương lai thì gia hạn TIẾP từ đó, ngược lại tính từ hôm nay,
  // đúng nguyên tắc "extend()" ở nhan-hieu/js/quan-tri.js.
  async function extend(id, days){
    if(!days || days <= 0 || !Number.isFinite(days)){ state.error = 'Nhập số ngày hợp lệ (lớn hơn 0) trước khi gia hạn.'; draw(); return; }
    const p = state.profiles.find(x=>x.id===id);
    const base = (p.crm_access_until && new Date(p.crm_access_until).getTime() > Date.now()) ? new Date(p.crm_access_until) : new Date();
    const next = new Date(base.getTime() + days*86400000);
    const msg = `Gia hạn cho ${p.email||'người này'}: hạn dùng sẽ đổi thành ${next.toLocaleString('vi-VN')} — sẽ tự đánh dấu ĐÃ TRẢ PHÍ luôn. Xác nhận?`;
    if(!(await confirmModal(msg))) return;
    state.busyId = id; draw();
    const { error } = await ctx.supabase.from('profiles').update({
      crm_access_until: next.toISOString(), crm_has_paid: true, crm_plan_days: days,
    }).eq('id', id);
    if(error) state.error = error.message; else { state.error = null; state.extendDays[id] = ''; }
    await load();
    state.busyId = null;
    draw();
  }

  async function toggleHasPaid(id, hasPaid){
    state.busyId = id; draw();
    const { error } = await ctx.supabase.from('profiles').update({ crm_has_paid: hasPaid }).eq('id', id);
    if(error) state.error = error.message; else state.error = null;
    await load();
    state.busyId = null;
    draw();
  }

  boot();
}

window.Modules = window.Modules || {};
window.Modules['quan-tri'] = { title:'Quản Trị', render };
})();
