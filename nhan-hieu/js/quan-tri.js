(function(){
// Khớp đúng TRIAL_AI_LIMIT/PAID_MONTHLY_AI_LIMIT ở api/_lib/trial-quota.js + nhan-hieu/js/app-shell.js
// — chỉ để HIỂN THỊ cho admin theo dõi, không phải nơi chặn thật (chặn thật luôn ở server).
function aiUsageLabel(p){
  if(p.has_paid){
    const month = new Date().toISOString().slice(0,7);
    const sameMonth = p.paid_ai_month === month;
    const used = sameMonth ? (p.paid_ai_uses||0) : 0;
    const bonus = sameMonth ? (p.paid_ai_bonus||0) : 0;
    // Chuyển sang trả phí là ĐỔI SANG bộ đếm khác (paid_ai_uses, theo tháng) chứ không xoá trial_ai_uses
    // — số lượt dùng thử cũ vẫn còn nguyên trong DB, chỉ không còn bị tính vào trần nào cả, không
    // "mất" — vẫn hiện lại đây để đối chiếu, tránh nhìn như dữ liệu biến mất.
    const paidLabel = `${used}/${PAID_MONTHLY_AI_LIMIT+bonus} lượt AI (tháng này)`;
    return p.trial_ai_uses ? `${paidLabel} · đã dùng ${p.trial_ai_uses} lượt lúc còn dùng thử (không tính vào đây nữa)` : paidLabel;
  }
  return `${p.trial_ai_uses||0}/100 lượt AI (dùng thử, trọn đời)`;
}

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
  const state = { screen:'loading', profiles:[], revenueTotal:0, revenueThisMonth:0, revenueByProfile:{}, q:'', planFilter:'all', error:null, busyId:null, confirmDeleteId:null, manualAmount:{}, justMarkedId:null };

  const PLAN_TABS = [
    { key:'all', label:'Tất cả' },
    { key:'30', label:'1 tháng' },
    { key:'180', label:'6 tháng' },
    { key:'365', label:'12 tháng' },
    { key:'none', label:'Chưa rõ gói' },
  ];
  function planKeyOf(p){ return p.last_plan_days ? String(p.last_plan_days) : 'none'; }

  function draw(){ container.innerHTML = html(); bind(); }

  async function boot(){
    draw();
    if(!ctx.profile || ctx.profile.role !== 'admin'){
      state.screen = 'denied'; draw(); return;
    }
    await Promise.all([load(), loadRevenue()]);
    state.screen = 'main';
    draw();
  }

  async function load(){
    const { data, error } = await ctx.supabase.from('profiles').select('*').order('access_until', { ascending:true, nullsFirst:true });
    if(error){ state.error = error.message; state.profiles = []; return; }
    state.profiles = data || [];
  }

  // Tính tổng doanh thu từ TOÀN BỘ giao dịch đã khớp (không giới hạn 20 dòng như danh sách hiển
  // thị bên trên) — chỉ lấy 2 cột cần thiết cho nhẹ, cộng dồn ở client.
  async function loadRevenue(){
    const { data } = await ctx.supabase.from('sepay_transactions').select('transfer_amount, created_at, matched_profile_id').eq('status', 'matched');
    const rows = data || [];
    state.revenueTotal = rows.reduce((sum, r) => sum + (r.transfer_amount || 0), 0);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    state.revenueThisMonth = rows
      .filter(r => new Date(r.created_at).getTime() >= startOfMonth)
      .reduce((sum, r) => sum + (r.transfer_amount || 0), 0);
    // Tổng đã ghi nhận riêng từng người — hiện ngay trên thẻ của họ, để "Ghi nhận vào doanh thu"
    // có kết quả nhìn thấy được lâu dài chứ không chỉ 1 thông báo thoáng qua rồi biến mất.
    state.revenueByProfile = rows.reduce((acc, r) => {
      if(r.matched_profile_id) acc[r.matched_profile_id] = (acc[r.matched_profile_id]||0) + (r.transfer_amount||0);
      return acc;
    }, {});
  }

  function filtered(){
    const q = state.q.trim().toLowerCase();
    return state.profiles.filter(p => {
      if(state.planFilter !== 'all' && planKeyOf(p) !== state.planFilter) return false;
      if(!q) return true;
      return (p.email||'').toLowerCase().includes(q) ||
        (p.full_name||'').toLowerCase().includes(q) ||
        (p.ref_code||'').toLowerCase().includes(q);
    });
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
      <div style="font-size:11.5px;color:var(--ink-soft);margin-bottom:20px;">Xem ước tính chi phí AI/lợi nhuận và bảng theo tháng ở tab <b>Tài chính</b>.</div>

      <div class="source-grid" style="margin-bottom:20px;">
        <div class="source-card"><div class="ic">${counts.active||0}</div><div class="label">Đang hoạt động</div></div>
        <div class="source-card"><div class="ic">${counts.soon||0}</div><div class="label">Sắp hết hạn</div></div>
        <div class="source-card"><div class="ic">${counts.expired||0}</div><div class="label">Đã hết hạn</div></div>
        <div class="source-card"><div class="ic">${counts.none||0}</div><div class="label">Chưa kích hoạt</div></div>
      </div>

      <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:8px;">Lọc theo gói đã mua gần nhất</label>
      <div class="chips" style="margin-bottom:20px;">
        ${PLAN_TABS.map(t=>{
          const n = t.key==='all' ? state.profiles.filter(p=>p.role!=='admin').length : state.profiles.filter(p=>p.role!=='admin' && planKeyOf(p)===t.key).length;
          return `<div class="chip ${state.planFilter===t.key?'selected':''}" data-plan-filter="${t.key}">${esc(t.label)} (${n})</div>`;
        }).join('')}
      </div>

      <div class="card" style="margin-bottom:20px;">
        <input id="q-search" type="text" placeholder="Tìm theo email, tên, hoặc mã tham chiếu chuyển khoản..." value="${esc(state.q)}"
          style="width:100%;padding:12px 14px;border:1px solid var(--line);border-radius:10px;font-size:14.5px;background:#FDFCF8;">
      </div>

      ${state.error?`<div class="error-box">${esc(state.error)}</div>`:''}

      ${list.map(p=>{
        const st = statusOf(p);
        const miniLabel = `font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.05em;`;
        const planUnclear = planKeyOf(p) === 'none';
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
              <div><span style="color:var(--ink-soft);">Hạn dùng:</span> ${p.access_until ? esc(new Date(p.access_until).toLocaleString('vi-VN')) : '(chưa có)'}</div>
              <div><span style="color:var(--ink-soft);">Gói:</span> <b>${esc((PLAN_TABS.find(t=>t.key===planKeyOf(p))||{}).label||'Chưa rõ')}</b>
                <span style="margin-left:6px;font-size:12px;">— gắn tay:
                  <span style="text-decoration:underline;cursor:pointer;" data-set-plan="${p.id}|30">1th</span>/<span style="text-decoration:underline;cursor:pointer;" data-set-plan="${p.id}|180">6th</span>/<span style="text-decoration:underline;cursor:pointer;" data-set-plan="${p.id}|365">12th</span>${!planUnclear ? `/<span style="text-decoration:underline;cursor:pointer;color:var(--danger);" data-set-plan="${p.id}|clear">xoá</span>` : ''}</span>
              </div>
              <div><span style="color:var(--ink-soft);">Đã dùng:</span> ${esc(aiUsageLabel(p))}</div>
              <div><span style="color:var(--ink-soft);">Loại khách:</span> ${p.is_student?'🎓 Học viên':'Thường'}
                <span style="text-decoration:underline;cursor:pointer;font-size:12px;margin-left:4px;" data-toggle-student="${p.id}|${!p.is_student}">đổi</span></div>
              <div style="grid-column:1/-1;"><span style="color:var(--ink-soft);">Thanh toán:</span> ${p.has_paid?'💰 Đã trả phí (trần 250 lượt/tháng)':'Chưa trả phí (trần dùng thử 100 lượt)'}
                <span style="text-decoration:underline;cursor:pointer;font-size:12px;margin-left:4px;" data-toggle-paid="${p.id}|${!p.has_paid}">đổi</span></div>
              ${p.ref_code ? `<div style="grid-column:1/-1;color:var(--ink-soft);font-size:12.5px;">Nội dung CK: <span style="font-family:'IBM Plex Mono',monospace;">SEVQR ${esc(p.ref_code)}</span></div>` : ''}
            </div>

            <div style="${miniLabel}margin-top:14px;margin-bottom:6px;">Gia hạn thủ công</div>
            <div class="btn-row" style="justify-content:flex-start;">
              <button class="btn btn-sm" data-extend="${p.id}|30" ${state.busyId===p.id?'disabled':''}>+30 ngày</button>
              <button class="btn btn-sm" data-extend="${p.id}|180" ${state.busyId===p.id?'disabled':''}>+180 ngày</button>
              <button class="btn btn-sm" data-extend="${p.id}|365" ${state.busyId===p.id?'disabled':''}>+365 ngày</button>
              <button class="btn-ghost btn btn-sm" data-revoke="${p.id}" ${state.busyId===p.id?'disabled':''}>Thu hồi ngay</button>
            </div>
            <div class="btn-row" style="justify-content:flex-start;margin-top:4px;">
              <button class="btn-ghost btn btn-sm" style="color:var(--danger);" data-extend="${p.id}|-30" ${state.busyId===p.id?'disabled':''}>Hoàn tác -30</button>
              <button class="btn-ghost btn btn-sm" style="color:var(--danger);" data-extend="${p.id}|-180" ${state.busyId===p.id?'disabled':''}>Hoàn tác -180</button>
              <button class="btn-ghost btn btn-sm" style="color:var(--danger);" data-extend="${p.id}|-365" ${state.busyId===p.id?'disabled':''}>Hoàn tác -365</button>
            </div>
            <div style="font-size:11.5px;color:var(--ink-soft);margin-top:4px;">Không tự tính vào doanh thu — kích hoạt tay cho khách chuyển khoản thật thì ghi nhận doanh thu riêng bên dưới.</div>

            <div style="${miniLabel}margin-top:14px;margin-bottom:6px;">Ghi nhận doanh thu thủ công</div>
            <div class="btn-row" style="justify-content:flex-start;align-items:center;">
              <input type="number" data-manual-amount="${p.id}" placeholder="Số tiền đã nhận, vd 499000" style="width:180px;padding:6px 10px;border:1px solid var(--line);border-radius:6px;font-size:12.5px;" value="${esc(state.manualAmount[p.id]||'')}">
              <button class="btn-ghost btn btn-sm" data-mark-revenue="${p.id}" ${state.busyId===p.id?'disabled':''}>Ghi nhận</button>
              ${state.justMarkedId===p.id ? `<span style="color:var(--accent);font-weight:600;font-size:12.5px;">✓ Thành công</span>` : ''}
              ${state.revenueByProfile[p.id] ? `<span style="color:var(--accent);font-size:12.5px;">Đã ghi nhận: ${state.revenueByProfile[p.id].toLocaleString('vi-VN')}đ</span>` : ''}
            </div>

            <div style="margin-top:16px;padding-top:10px;border-top:1px solid var(--line);">
              ${state.confirmDeleteId===p.id ? `
                <span style="font-size:12.5px;color:var(--danger);font-weight:600;">Xoá vĩnh viễn tài khoản này? Không khôi phục được.</span>
                <button class="btn btn-sm" style="background:var(--danger);margin-left:8px;" data-confirm-delete="${p.id}" ${state.busyId===p.id?'disabled':''}>${state.busyId===p.id?'Đang xoá…':'Xác nhận xoá'}</button>
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

    container.querySelectorAll('[data-plan-filter]').forEach(el=>{
      el.onclick = ()=>{ state.planFilter = el.getAttribute('data-plan-filter'); draw(); };
    });
    container.querySelectorAll('[data-set-plan]').forEach(el=>{
      el.onclick = ()=>{
        const [id, days] = el.getAttribute('data-set-plan').split('|');
        setPlanOnly(id, days === 'clear' ? null : Number(days));
      };
    });

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
    container.querySelectorAll('[data-toggle-paid]').forEach(el=>{
      el.onclick = ()=>{
        const [id, next] = el.getAttribute('data-toggle-paid').split('|');
        toggleHasPaid(id, next === 'true');
      };
    });
    container.querySelectorAll('[data-manual-amount]').forEach(el=>{
      el.oninput = ()=>{ state.manualAmount[el.getAttribute('data-manual-amount')] = el.value; };
    });
    container.querySelectorAll('[data-mark-revenue]').forEach(el=>{
      el.onclick = ()=>{ markRevenue(el.getAttribute('data-mark-revenue')); };
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

  // Dùng khi kích hoạt TAY cho khách đã chuyển khoản thật (vd lúc webhook SePay bị lỗi/trễ đồng bộ)
  // — "Gia hạn" chỉ cộng ngày dùng (access_until), không tự bật has_paid, nên nếu không bấm thêm nút
  // này, khách vẫn bị tính lượt AI theo trần dùng thử (100 lượt trọn đời) dù đã có hạn dùng dài hơn.
  async function toggleHasPaid(id, hasPaid){
    state.busyId = id; draw();
    const { error } = await ctx.supabase.from('profiles').update({ has_paid: hasPaid }).eq('id', id);
    if(error) state.error = error.message; else state.error = null;
    await load();
    state.busyId = null;
    draw();
  }

  // Ghi nhận 1 khoản kích hoạt tay vào sepay_transactions (qua serverless function, vì bảng này chỉ
  // cho service_role ghi) — để nó được cộng vào "Tổng doanh thu"/"Doanh thu tháng này" ở trên, thứ
  // mà "Gia hạn"/"Đánh dấu đã trả phí" một mình không làm được.
  async function markRevenue(id){
    const amount = Number(state.manualAmount[id]);
    if(!amount || amount <= 0){ state.error = 'Nhập đúng số tiền đã nhận trước khi ghi nhận.'; draw(); return; }
    state.busyId = id; draw();
    try{
      await callApi('/api/admin-mark-manual-payment', { user_id: id, amount });
      state.manualAmount[id] = '';
      state.error = null;
      state.justMarkedId = id;
      setTimeout(()=>{ if(state.justMarkedId===id){ state.justMarkedId = null; draw(); } }, 4000);
    } catch(e){ state.error = e.message; }
    await loadRevenue();
    state.busyId = null;
    draw();
  }

  async function extend(id, days){
    const p = state.profiles.find(x=>x.id===id);
    const base = (p.access_until && new Date(p.access_until).getTime() > Date.now()) ? new Date(p.access_until) : new Date();
    const next = new Date(base.getTime() + days*86400000);
    // "Hoàn tác" chỉ TRỪ THẲNG N ngày khỏi hạn dùng hiện tại — không biết có thật sự vừa cộng nhầm
    // N ngày đó hay không, nên nếu bấm nhầm người/nhầm nút có thể trừ vào hạn dùng THẬT của họ, đẩy
    // về quá khứ (hết hạn oan, kể cả đang dùng thử). Luôn cho xem trước ngày mới + cảnh báo rõ nếu
    // kết quả là hết hạn, để admin tự huỷ nếu thấy sai trước khi bấm xác nhận.
    const willExpire = next.getTime() <= Date.now();
    const msg = `${days<0?'Hoàn tác':'Gia hạn'} cho ${p.email||'người này'}: hạn dùng sẽ đổi thành ${next.toLocaleString('vi-VN')}`
      + (willExpire ? ' — CHÚ Ý: ngày này đã ở QUÁ KHỨ, tài khoản sẽ bị coi là hết hạn ngay lập tức. Chắc chắn đúng người/đúng số ngày chưa?' : '. Xác nhận?');
    if(!(await confirmModal(msg))) return;
    state.busyId = id; draw();
    // days âm = nút "Hoàn tác" (lỡ bấm nhầm) — xoá luôn nhãn gói vừa gán sai (không biết chắc gói
    // thật trước đó là gì nên đưa về "Chưa rõ gói", admin gắn nhãn lại tay nếu cần) thay vì để nhãn
    // sai (vd tự bị gắn "6 tháng") tồn tại mãi dù đã hoàn tác hạn dùng.
    const patch = { access_until: next.toISOString(), last_plan_days: days > 0 ? days : null };
    const { error } = await ctx.supabase.from('profiles').update(patch).eq('id', id);
    if(error) state.error = error.message; else state.error = null;
    await load();
    state.busyId = null;
    draw();
  }

  // Chỉ gắn nhãn gói (last_plan_days) để lọc/đếm cho đúng — KHÔNG đụng access_until, dùng cho các
  // tài khoản đã kích hoạt tay TRƯỚC KHI có tính năng lọc theo gói (nên đang hiện "Chưa rõ gói").
  async function setPlanOnly(id, days){
    state.busyId = id; draw();
    const { error } = await ctx.supabase.from('profiles').update({ last_plan_days: days }).eq('id', id);
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
window.Modules['quan-tri'] = { title:'Quản trị thành viên', render };
})();
