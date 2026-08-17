(function(){
const SLOTS = [ {key:'sang', label:'Sáng'}, {key:'trua', label:'Trưa'}, {key:'toi', label:'Tối'} ];
const DAY_NAMES = ['CN','Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7'];

function render(container, ctx){
  const state = { screen:'loading', weekStart:startOfWeek(new Date()), entries:[], posts:[], pending:null, pickerFor:null };

  function draw(){ container.innerHTML = html(); bind(); }

  async function boot(){
    draw();
    if(window.PendingPost){ state.pending = window.PendingPost; window.PendingPost = null; }
    await Promise.all([loadEntries(), loadPosts()]);
    state.screen='main';
    draw();
  }

  async function loadEntries(){
    const from = isoDate(state.weekStart);
    const toDate = new Date(state.weekStart); toDate.setDate(toDate.getDate()+6);
    const to = isoDate(toDate);
    const { data } = await ctx.supabase.from('calendar_entries').select('*').eq('user_id', ctx.user.id).gte('scheduled_date', from).lte('scheduled_date', to);
    state.entries = data || [];
  }
  async function loadPosts(){
    const { data } = await ctx.supabase.from('posts').select('*').eq('user_id', ctx.user.id).order('created_at', { ascending:false }).limit(30);
    state.posts = data || [];
  }

  function weekDays(){
    return Array.from({length:7}, (_,i)=>{ const d = new Date(state.weekStart); d.setDate(d.getDate()+i); return d; });
  }

  function entryFor(dateStr, slotKey){
    return state.entries.find(e=> e.scheduled_date===dateStr && e.slot===slotKey);
  }

  function html(){
    if(state.screen==='loading') return `<div class="loading"><div class="spinner"></div><p>Đang tải…</p></div>`;
    const days = weekDays();
    const weekLabel = `${fmtDate(days[0])} – ${fmtDate(days[6])}`;
    return `
      <div class="page-head"><div class="tag">Bước 5 · Lịch Đăng Bài</div><h1>Lịch đăng bài theo tuần</h1></div>
      ${state.pending ? `
        <div class="hint-box" style="display:flex;justify-content:space-between;align-items:center;">
          <span>Đang xếp lịch cho: <b>${esc(state.pending.title||'(không tiêu đề)')}</b> — bấm 1 khung giờ trống bên dưới để xếp.</span>
          <span style="cursor:pointer;font-weight:600;" data-action="cancel-pending">Huỷ</span>
        </div>` : ''}
      <div style="display:flex;justify-content:space-between;align-items:center;margin:18px 0;">
        <span style="cursor:pointer;color:var(--ink-soft);" data-action="prev-week">← Tuần trước</span>
        <b style="font-family:'IBM Plex Mono',monospace;font-size:13px;">${esc(weekLabel)}</b>
        <span style="cursor:pointer;color:var(--ink-soft);" data-action="next-week">Tuần sau →</span>
      </div>
      <div class="week-grid">
        ${days.map(d=>{
          const dateStr = isoDate(d);
          return `<div class="week-col">
            <div class="day">${DAY_NAMES[d.getDay()]} ${d.getDate()}/${d.getMonth()+1}</div>
            ${SLOTS.map(s=>{
              const e = entryFor(dateStr, s.key);
              if(state.pickerFor && state.pickerFor.date===dateStr && state.pickerFor.slot===s.key){
                return `<div class="week-slot filled">
                  <div class="slot-label">${s.label}</div>
                  <select data-picker-select style="width:100%;margin-top:4px;font-size:12px;padding:6px;">
                    <option value="">— Chọn bài đã viết —</option>
                    ${state.posts.map(p=>`<option value="${p.id}">${esc((p.title||'(không tiêu đề)').slice(0,40))}</option>`).join('')}
                  </select>
                  <div style="display:flex;gap:6px;margin-top:6px;">
                    <button class="btn btn-sm" data-picker-save="${dateStr}|${s.key}">Lưu</button>
                    <span style="align-self:center;font-size:11px;color:var(--ink-soft);cursor:pointer;" data-picker-cancel="1">Huỷ</span>
                  </div>
                </div>`;
              }
              if(e){
                return `<div class="week-slot filled">
                  <div class="slot-label">${s.label}</div>
                  <b style="font-size:12.5px;">${esc(e.title||'')}</b>
                  ${e.format?`<div style="color:var(--ink-soft);font-size:11px;margin-top:2px;">${esc(e.format)}</div>`:''}
                  <span style="display:block;margin-top:6px;color:var(--danger);font-size:11px;cursor:pointer;" data-remove="${e.id}">Xoá</span>
                </div>`;
              }
              return `<div class="week-slot" data-empty="${dateStr}|${s.key}" style="cursor:pointer;">
                <div class="slot-label">${s.label}</div>
                <div style="color:var(--ink-soft);font-size:20px;text-align:center;margin-top:4px;">+</div>
              </div>`;
            }).join('')}
          </div>`;
        }).join('')}
      </div>
    `;
  }

  function bind(){
    const prev = container.querySelector('[data-action="prev-week"]');
    if(prev) prev.onclick = ()=>{ state.weekStart.setDate(state.weekStart.getDate()-7); loadEntries().then(draw); };
    const next = container.querySelector('[data-action="next-week"]');
    if(next) next.onclick = ()=>{ state.weekStart.setDate(state.weekStart.getDate()+7); loadEntries().then(draw); };
    const cancelPending = container.querySelector('[data-action="cancel-pending"]');
    if(cancelPending) cancelPending.onclick = ()=>{ state.pending = null; draw(); };

    container.querySelectorAll('[data-empty]').forEach(el=>{
      el.onclick = async ()=>{
        const [dateStr, slotKey] = el.getAttribute('data-empty').split('|');
        if(state.pending){
          await ctx.supabase.from('calendar_entries').insert({
            user_id: ctx.user.id, post_id: state.pending.id, scheduled_date: dateStr, slot: slotKey,
            title: state.pending.title, format: (state.pending.structure && state.pending.structure.format) || null,
            cta: (state.pending.structure && state.pending.structure.cta) || null,
          });
          state.pending = null;
          await loadEntries();
          draw();
        } else {
          state.pickerFor = { date:dateStr, slot:slotKey };
          draw();
        }
      };
    });

    container.querySelectorAll('[data-picker-cancel]').forEach(el=>{
      el.onclick = ()=>{ state.pickerFor = null; draw(); };
    });
    container.querySelectorAll('[data-picker-save]').forEach(el=>{
      el.onclick = async ()=>{
        const [dateStr, slotKey] = el.getAttribute('data-picker-save').split('|');
        const select = container.querySelector('[data-picker-select]');
        const postId = select ? select.value : '';
        const post = state.posts.find(p=>p.id===postId);
        await ctx.supabase.from('calendar_entries').insert({
          user_id: ctx.user.id, post_id: post ? post.id : null, scheduled_date: dateStr, slot: slotKey,
          title: post ? post.title : 'Bài mới', format: post && post.structure ? (post.structure.format||null) : null,
          cta: post && post.structure ? (post.structure.cta||null) : null,
        });
        state.pickerFor = null;
        await loadEntries();
        draw();
      };
    });
    container.querySelectorAll('[data-remove]').forEach(el=>{
      el.onclick = async ()=>{
        await ctx.supabase.from('calendar_entries').delete().eq('id', el.getAttribute('data-remove'));
        await loadEntries();
        draw();
      };
    });
  }

  boot();
}

window.Modules = window.Modules || {};
window.Modules['lich-dang'] = { title:'Lịch Đăng Bài', render };
})();
