(function(){
function render(container, ctx){
  const weekStart = isoDate(startOfWeek(new Date()));
  const state = { loading:true, rows:[], form:{ weight:'', sleep_hours:'', energy_level:3, mood_level:3, note:'' }, saving:false };

  function draw(){ container.innerHTML = html(); bind(); }

  async function load(){
    const { data } = await ctx.supabase.from('sk_weekly_logs').select('*').eq('user_id', ctx.user.id).order('week_start', { ascending:false }).limit(12);
    state.rows = data || [];
    const current = state.rows.find(r=>r.week_start===weekStart);
    if(current){
      state.form = { weight: current.weight ?? '', sleep_hours: current.sleep_hours ?? '', energy_level: current.energy_level ?? 3, mood_level: current.mood_level ?? 3, note: current.note || '' };
    }
    state.loading = false;
    draw();
  }

  async function save(){
    state.saving = true; draw();
    const payload = {
      user_id: ctx.user.id, week_start: weekStart,
      weight: state.form.weight===''? null : Number(state.form.weight),
      sleep_hours: state.form.sleep_hours===''? null : Number(state.form.sleep_hours),
      energy_level: Number(state.form.energy_level),
      mood_level: Number(state.form.mood_level),
      note: state.form.note.trim() || null,
    };
    const { error } = await ctx.supabase.from('sk_weekly_logs').upsert(payload, { onConflict:'user_id,week_start' });
    state.saving = false;
    if(error){ alert('Lỗi khi lưu: ' + error.message); draw(); return; }
    await load();
  }

  function levelChips(field, labels){
    return `<div class="chips">${labels.map((l,i)=>`
      <div class="chip ${Number(state.form[field])===i+1?'selected':''}" data-level="${field}:${i+1}">${l}</div>
    `).join('')}</div>`;
  }

  function html(){
    const trendWeeks = [...state.rows].reverse().slice(-8);
    return `
      <div class="page-head">
        <h1>Theo Dõi Sức Khỏe Theo Tuần</h1>
        <p>Ghi lại vài chỉ số cơ bản mỗi tuần để thấy rõ xu hướng thay đổi theo thời gian.</p>
      </div>

      ${state.loading ? `<div class="loading"><div class="spinner"></div></div>` : `
        <div class="card" style="margin-bottom:24px;">
          <h3 style="font-family:'IBM Plex Mono',monospace;font-size:12.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--gold);margin-bottom:14px;">Tuần này (từ ${esc(fmtDate(weekStart))})</h3>
          <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);">Cân nặng (kg)</label>
          <input type="number" id="tt-weight" step="0.1" value="${esc(state.form.weight)}" placeholder="VD: 58.5">
          <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-top:14px;">Giờ ngủ trung bình / đêm</label>
          <input type="number" id="tt-sleep" step="0.5" value="${esc(state.form.sleep_hours)}" placeholder="VD: 6.5">
          <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-top:14px;">Mức năng lượng</label>
          ${levelChips('energy_level', ['1 😴','2','3','4','5 ⚡'])}
          <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-top:14px;">Tâm trạng</label>
          ${levelChips('mood_level', ['1 😔','2','3','4','5 😄'])}
          <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-top:14px;">Ghi chú</label>
          <textarea id="tt-note" placeholder="Cảm nhận trong tuần...">${esc(state.form.note)}</textarea>
          <button class="btn" style="margin-top:16px;" id="tt-save" ${state.saving?'disabled':''}>${state.saving?'Đang lưu…':'Lưu tuần này'}</button>
        </div>

        <div class="page-head" style="margin-bottom:12px;"><h2 style="font-size:17px;">Xu hướng cân nặng</h2></div>
        <div class="card" style="margin-bottom:24px;">
          ${trendBarChartHtml(trendWeeks.map(r=>({ label: fmtDate(r.week_start).slice(0,6), amount: Number(r.weight)||0 })), categoryColor('weight'))}
        </div>

        <div class="page-head" style="margin-bottom:12px;"><h2 style="font-size:17px;">Lịch sử</h2></div>
        ${state.rows.length===0 ? `<div style="color:var(--ink-soft);font-size:14px;">Chưa có dữ liệu tuần nào.</div>` : state.rows.map(r=>`
          <div class="section">
            <div class="meta">Tuần từ ${esc(fmtDate(r.week_start))}</div>
            <div class="body">
              ${r.weight!=null?`⚖️ ${r.weight} kg`:''} ${r.sleep_hours!=null?` · 😴 ${r.sleep_hours} giờ`:''} ${r.energy_level!=null?` · ⚡ Năng lượng ${r.energy_level}/5`:''} ${r.mood_level!=null?` · 🙂 Tâm trạng ${r.mood_level}/5`:''}
            </div>
            ${r.note ? `<div style="font-size:13px;color:var(--ink-soft);margin-top:6px;">${esc(r.note)}</div>` : ''}
          </div>
        `).join('')}
      `}
    `;
  }

  function bind(){
    const weightEl = container.querySelector('#tt-weight'); if(weightEl) weightEl.oninput = (e)=>{ state.form.weight = e.target.value; };
    const sleepEl = container.querySelector('#tt-sleep'); if(sleepEl) sleepEl.oninput = (e)=>{ state.form.sleep_hours = e.target.value; };
    const noteEl = container.querySelector('#tt-note'); if(noteEl) noteEl.oninput = (e)=>{ state.form.note = e.target.value; };
    container.querySelectorAll('[data-level]').forEach(el=>{
      el.onclick = ()=>{
        const [field, val] = el.getAttribute('data-level').split(':');
        state.form[field] = Number(val);
        draw();
      };
    });
    const saveBtn = container.querySelector('#tt-save'); if(saveBtn) saveBtn.onclick = save;
  }

  draw();
  load();
}

window.Modules = window.Modules || {};
window.Modules['theo-doi-tuan'] = { title:'Theo Dõi Sức Khỏe Theo Tuần', render };
})();
