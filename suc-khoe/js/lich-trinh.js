// Lịch Trình Của Bạn — lịch trình MẪU theo gói (sk_package_schedule_items, admin thiết lập qua Quản
// Trị > Gói & Lịch Trình) được tính ra ngày cụ thể dựa trên profiles.sk_package_started_at của từng
// người, tiến độ hoàn thành (sk_schedule_progress) là riêng của từng người dù dùng chung 1 lịch mẫu.
(function(){
function render(container, ctx){
  const state = { loading:true, items:[], doneIds:new Set(), packageName:null, busyId:null };

  function draw(){ container.innerHTML = html(); bind(); }

  async function load(){
    const packageId = ctx.profile && ctx.profile.sk_package_id;
    if(!packageId){ state.loading = false; draw(); return; }
    const [{ data: pkg }, { data: items }, { data: progress }] = await Promise.all([
      ctx.supabase.from('sk_packages').select('name').eq('id', packageId).maybeSingle(),
      ctx.supabase.from('sk_package_schedule_items').select('*').eq('package_id', packageId).order('day_offset', { ascending:true }),
      ctx.supabase.from('sk_schedule_progress').select('schedule_item_id').eq('user_id', ctx.user.id),
    ]);
    state.packageName = pkg ? pkg.name : null;
    state.items = items || [];
    state.doneIds = new Set((progress||[]).map(p=>p.schedule_item_id));
    state.loading = false;
    draw();
  }

  function targetDate(dayOffset){
    const started = ctx.profile && ctx.profile.sk_package_started_at;
    if(!started) return null;
    const d = new Date(started);
    d.setDate(d.getDate() + Number(dayOffset));
    return d;
  }

  async function toggleDone(itemId, isDone){
    state.busyId = itemId; draw();
    if(isDone){
      await ctx.supabase.from('sk_schedule_progress').delete().eq('user_id', ctx.user.id).eq('schedule_item_id', itemId);
      state.doneIds.delete(itemId);
    } else {
      await ctx.supabase.from('sk_schedule_progress').upsert({ user_id: ctx.user.id, schedule_item_id: itemId }, { onConflict:'user_id,schedule_item_id' });
      state.doneIds.add(itemId);
    }
    state.busyId = null;
    draw();
  }

  function html(){
    if(!ctx.profile || !ctx.profile.sk_package_id){
      return `
        <div class="page-head"><h1>Lịch Trình Của Bạn</h1></div>
        <div class="hint-box">Bạn chưa được gán gói sản phẩm/chương trình nào — liên hệ để được kích hoạt đúng gói bạn đã mua, lịch trình sẽ tự hiện ra ở đây.</div>
      `;
    }
    if(state.loading) return `<div class="loading"><div class="spinner"></div></div>`;
    const doneCount = state.items.filter(i=>state.doneIds.has(i.id)).length;
    return `
      <div class="page-head">
        <h1>Lịch Trình Của Bạn</h1>
        <p>Gói: <b>${esc(state.packageName || '—')}</b> — đã hoàn thành ${doneCount}/${state.items.length} mục.</p>
      </div>
      ${state.items.length===0 ? `<div class="hint-box">Gói này chưa có lịch trình chi tiết — chị Quỳnh sẽ bổ sung sớm.</div>` : state.items.map(item=>{
        const isDone = state.doneIds.has(item.id);
        const date = targetDate(item.day_offset);
        return `
          <div class="section" style="display:flex;gap:14px;align-items:flex-start;">
            <span data-toggle="${item.id}|${isDone?'1':'0'}" style="cursor:pointer;font-size:22px;flex-shrink:0;margin-top:2px;" title="${isDone?'Bấm để bỏ đánh dấu':'Bấm để đánh dấu đã xong'}">
              ${state.busyId===item.id ? '…' : (isDone ? '✅' : '⬜')}
            </span>
            <div>
              <div class="meta">${date ? esc(fmtDate(date)) : `Ngày ${item.day_offset}`}</div>
              <div style="font-weight:600;font-size:14.5px;${isDone?'text-decoration:line-through;color:var(--ink-soft);':''}">${esc(item.title)}</div>
              ${item.description ? `<div style="font-size:13.5px;color:var(--ink-soft);margin-top:4px;">${esc(item.description)}</div>` : ''}
            </div>
          </div>
        `;
      }).join('')}
    `;
  }

  function bind(){
    container.querySelectorAll('[data-toggle]').forEach(el=>{
      el.onclick = ()=>{
        const [id, doneFlag] = el.getAttribute('data-toggle').split('|');
        toggleDone(id, doneFlag==='1');
      };
    });
  }

  draw();
  load();
}

window.Modules = window.Modules || {};
window.Modules['lich-trinh'] = { title:'Lịch Trình Của Bạn', render };
})();
