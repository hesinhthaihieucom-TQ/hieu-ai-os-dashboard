(function(){
// Quản Trị — bản khung: chỉ ĐỌC. Thống kê người dùng app này (lọc theo dv_first_visited_at, không lẫn
// người chỉ dùng app khác vì profiles dùng chung), số việc theo trạng thái, 30 việc gần nhất, các Máy
// dựng và lần cuối chúng hỏi việc. Chưa có: gia hạn, đánh dấu trả phí, đánh giá, thông báo (làm sau,
// theo cấu trúc Quản Trị của nhan-hieu).
const ORDER = ['uploading','queued','building','review','done','failed'];
window.Modules = window.Modules || {};
window.Modules['quan-tri'] = {
  title: 'Quản Trị',
  async render(container, ctx){
    if(!ctx.profile || ctx.profile.role !== 'admin'){ container.innerHTML = `<div class="card">Chỉ admin được vào mục này.</div>`; return; }
    container.innerHTML = `<div class="loading"><div class="spinner"></div><p>Đang tải…</p></div>`;
    const [u, jobs, machines] = await Promise.all([
      ctx.supabase.from('profiles').select('id', { count:'exact', head:true }).not('dv_first_visited_at','is',null),
      ctx.supabase.from('dv_jobs').select('id,user_id,title,source_name,status,created_at,error').order('created_at', { ascending:false }).limit(30),
      ctx.supabase.from('dv_machines').select('id,name,last_seen_at,user_id').order('last_seen_at', { ascending:false, nullsFirst:false }).limit(30),
    ]);
    const list = jobs.data || [];
    // Không embed profiles:user_id(...) được vì user_id trỏ auth.users chứ không phải profiles → lấy tên riêng.
    const ids = [...new Set([...(list.map(j=>j.user_id)), ...((machines.data||[]).map(m=>m.user_id))])];
    const names = {};
    if(ids.length){ const { data: ps } = await ctx.supabase.from('profiles').select('id,full_name').in('id', ids); (ps||[]).forEach(x=>{ names[x.id] = x.full_name; }); }
    const by = {}; list.forEach(j=>{ by[j.status] = (by[j.status]||0)+1; });
    container.innerHTML = `
      <div class="page-head"><h1>Quản Trị</h1><p>${u.count||0} người đã dùng app · 30 việc gần nhất</p></div>
      <div class="card" style="margin-bottom:16px;"><div class="chips">${ORDER.map(k=>`<span class="chip">${esc((DV_STATUS[k]||{}).label||k)}: <b>${by[k]||0}</b></span>`).join('')}</div></div>
      <h3 style="font-family:'Be Vietnam Pro',sans-serif;font-size:18px;margin:6px 0 12px;">Máy dựng</h3>
      ${(machines.data||[]).map(m=>`<div class="list-item"><div class="txt"><b>${esc(m.name)}</b> · ${esc(names[m.user_id]||'?')}<br><span style="font-size:14px;color:var(--ink-soft);">${machineOnline(m)?'🟢 Đang bật':'⚪ Tắt'} · ${esc(fmtWhen(m.last_seen_at)||'chưa lần nào')}</span></div></div>`).join('') || '<div class="card" style="color:var(--ink-soft);">Chưa có máy nào ghép nối.</div>'}
      <h3 style="font-family:'Be Vietnam Pro',sans-serif;font-size:18px;margin:20px 0 12px;">Việc gần đây</h3>
      ${list.map(j=>`<div class="list-item"><div class="txt"><b>${esc(j.title||j.source_name||'Video')}</b> · ${esc(names[j.user_id]||'?')}<br><span style="font-size:14px;color:var(--ink-soft);">${esc(fmtWhen(j.created_at))}${j.error?' · '+esc(j.error):''}</span></div><span class="st ${j.status}">${esc((DV_STATUS[j.status]||{}).label||j.status)}</span></div>`).join('') || '<div class="card" style="color:var(--ink-soft);">Chưa có việc nào.</div>'}`;
  },
};
})();
