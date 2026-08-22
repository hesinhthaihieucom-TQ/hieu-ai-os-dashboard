(function(){
const FEELING_OPTIONS = ['Tiết kiệm tốt', 'Vừa phải', 'Hơi nhiều', 'Quá nhiều'];
const SELF_RATING_EMOJI = ['😞','😐','🙂','😊','🤩'];
// "Soi Nút Chặn" — thái độ khi chứng kiến người khác nhận tin vui về tiền (ý tưởng gốc từ tài
// liệu Quỳnh gửi, đặt lại tên KHÔNG dùng "Khoá Van" vì đó là thuật ngữ độc quyền của bên dạy).
const REACTION_OPTIONS = [
  { key:'vui_that', label:'😊 Vui thật lòng, chúc mừng trọn vẹn', explain:'Đây là tần số "trên cầu" — bạn không phân biệt ranh giới túi tiền, sự hân hoan này giúp mở thông dòng tiền của chính bạn.' },
  { key:'gia_an', label:'🙂 Vui nhưng hơi chạnh lòng', explain:'Miệng chúc mừng nhưng lòng chạnh lòng — tâm thức chỉ ghi nhận phần chạnh lòng bên dưới. Nhận ra được điều này đã là một bước tiến.' },
  { key:'tho_o', label:'😐 Thấy không liên quan tới mình', explain:'Thấy dửng dưng cũng là một cách vô thức từ chối đón nhận năng lượng thịnh vượng đang ở ngay trước mắt.' },
  { key:'do', label:'😣 Chạnh lòng, so sánh, khó chịu', explain:'Bình thường thôi — nhận ra được cảm xúc này chính là bước đầu để chuyển hoá nó, không phải điều gì đáng xấu hổ.' },
];
function reactionExplain(key){ const f = REACTION_OPTIONS.find(o=>o.key===key); return f ? f.explain : ''; }

function render(container, ctx){
  const state = {
    loading: true,
    weekStart: startOfWeek(new Date()),
    entries: [],
    reflection: { regret_expense:'', unexpected_expense:'', spending_feeling:'', went_well:'', to_change:'', relationship_score:null, health_score:null, purpose_score:null, parents_connection_score:null, finance_mindset_score:null, reaction_to_others_success:null },
    saving: false,
    savedMsg: '',
  };

  function draw(){ container.innerHTML = html(); bind(); }
  draw();

  function weekEnd(){ const d = new Date(state.weekStart); d.setDate(d.getDate()+6); return d; }
  function weekLabel(){
    const s = state.weekStart, e = weekEnd();
    return `${s.getDate()}/${s.getMonth()+1} — ${e.getDate()}/${e.getMonth()+1}/${e.getFullYear()}`;
  }

  async function load(){
    state.loading = true; draw();
    const weekStartIso = isoDate(state.weekStart);
    const weekEndIso = isoDate(weekEnd());
    const [entriesRes, reflectionRes] = await Promise.all([
      ctx.supabase.from('tc_finance_entries').select('*')
        .eq('user_id', ctx.user.id).gte('entry_date', weekStartIso).lte('entry_date', weekEndIso),
      ctx.supabase.from('tc_weekly_reflections').select('*')
        .eq('user_id', ctx.user.id).eq('week_start', weekStartIso).maybeSingle(),
    ]);
    state.entries = entriesRes.data || [];
    const r = reflectionRes.data;
    state.reflection = r
      ? { regret_expense: r.regret_expense||'', unexpected_expense: r.unexpected_expense||'', spending_feeling: r.spending_feeling||'', went_well: r.went_well||'', to_change: r.to_change||'', relationship_score: r.relationship_score||null, health_score: r.health_score||null, purpose_score: r.purpose_score||null, parents_connection_score: r.parents_connection_score||null, finance_mindset_score: r.finance_mindset_score||null, reaction_to_others_success: r.reaction_to_others_success||null }
      : { regret_expense:'', unexpected_expense:'', spending_feeling:'', went_well:'', to_change:'', relationship_score:null, health_score:null, purpose_score:null, parents_connection_score:null, finance_mindset_score:null, reaction_to_others_success:null };
    state.loading = false;
    draw();
  }

  async function saveReflection(){
    state.saving = true; draw();
    await ctx.supabase.from('tc_weekly_reflections').upsert({
      user_id: ctx.user.id,
      week_start: isoDate(state.weekStart),
      ...state.reflection,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,week_start' });
    state.saving = false;
    state.savedMsg = 'Đã lưu ✓';
    draw();
    setTimeout(()=>{ state.savedMsg=''; const el = container.querySelector('#tt-saved-msg'); if(el) el.textContent=''; }, 1800);
  }

  function html(){
    const income = state.entries.filter(e=>e.type==='income');
    const expense = state.entries.filter(e=>e.type==='expense');
    const totalIncome = income.reduce((s,e)=>s+Number(e.amount),0);
    const totalExpense = expense.reduce((s,e)=>s+Number(e.amount),0);
    const savingsRate = totalIncome>0 ? Math.round(((totalIncome-totalExpense)/totalIncome)*100) : 0;

    function groupByCategory(list){
      const by = {};
      list.forEach(e=>{
        const key = e.category_label || 'Khác';
        by[key] = (by[key]||0) + Number(e.amount);
      });
      return Object.entries(by).map(([label,amount])=>({label,amount})).sort((a,b)=>b.amount-a.amount);
    }
    const expenseByCategory = groupByCategory(expense);
    const incomeByCategory = groupByCategory(income);

    const top3 = [...expense].sort((a,b)=>Number(b.amount)-Number(a.amount)).slice(0,3);

    return `
      <div class="page-head">
        <h1>Tổng Kết Tuần</h1>
        <p>Nhận diện xu hướng chi tiêu theo từng tuần — cuối mỗi tuần cộng dồn lại và tìm ra 3 khoản chi lớn nhất.</p>
      </div>

      <div class="btn-row" style="justify-content:space-between;margin-top:0;margin-bottom:16px;">
        <span class="btn-ghost btn btn-sm" id="tt-prev">← Tuần trước</span>
        <span style="font-weight:600;align-self:center;">${weekLabel()}</span>
        <span class="btn-ghost btn btn-sm" id="tt-next">Tuần sau →</span>
      </div>

      ${state.loading ? `<div class="loading"><div class="spinner"></div></div>` : `
        <div class="source-grid" style="margin-bottom:16px;">
          <div class="source-card"><div class="ic" style="font-size:16px;color:var(--accent);">${totalIncome.toLocaleString('vi-VN')}đ</div><div class="label">Tổng thu nhập</div></div>
          <div class="source-card"><div class="ic" style="font-size:16px;color:var(--danger);">${totalExpense.toLocaleString('vi-VN')}đ</div><div class="label">Tổng chi tiêu</div></div>
          <div class="source-card"><div class="ic" style="font-size:16px;color:${savingsRate>=20?'var(--accent)':'var(--ink)'};">${savingsRate}%</div><div class="label">Tỷ lệ tiết kiệm</div></div>
        </div>

        <div class="section">
          <h3>Chi tiêu theo danh mục</h3>
          ${expenseByCategory.length===0 ? `<div style="color:var(--ink-soft);font-size:14px;">Chưa có khoản chi nào.</div>` : donutChartHtml(expenseByCategory)}
        </div>

        <div class="section">
          <h3>Thu nhập theo nguồn</h3>
          ${incomeByCategory.length===0 ? `<div style="color:var(--ink-soft);font-size:14px;">Chưa có khoản thu nào.</div>` : donutChartHtml(incomeByCategory)}
        </div>

        <div class="section">
          <h3>Top 3 khoản chi lớn nhất</h3>
          ${top3.length===0 ? `<div style="color:var(--ink-soft);font-size:14px;">Chưa có khoản chi nào.</div>` : top3.map((e,i)=>`
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--line);font-size:14px;">
              <span>${i+1}. ${esc(e.description||'(không ghi chú)')}</span>
              <b style="color:var(--danger);">${Number(e.amount).toLocaleString('vi-VN')}đ</b>
            </div>
          `).join('')}
        </div>

        <div class="section">
          <h3>Nhận xét & đánh giá tuần</h3>
          <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:8px;">Cảm giác về chi tiêu tuần này</label>
          <div class="chips" id="tt-feeling-chips" style="margin-bottom:14px;">
            ${FEELING_OPTIONS.map(f=>`<div class="chip ${state.reflection.spending_feeling===f?'selected':''}" data-feeling="${esc(f)}">${esc(f)}</div>`).join('')}
          </div>

          <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:6px;">Khoản chi HỐI TIẾC nhất tuần này</label>
          <textarea id="tt-regret" placeholder="Khoản chi nào bạn ước gì đã không tiêu?">${esc(state.reflection.regret_expense)}</textarea>

          <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 6px;">Khoản chi BẤT NGỜ tuần này</label>
          <textarea id="tt-unexpected" placeholder="Có khoản chi phát sinh ngoài dự tính không?">${esc(state.reflection.unexpected_expense)}</textarea>

          <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 6px;">Điều làm ĐƯỢC tốt tuần này</label>
          <textarea id="tt-went-well" placeholder="Bạn đã làm tốt điều gì về chi tiêu/tiết kiệm?">${esc(state.reflection.went_well)}</textarea>

          <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 6px;">Điều cần THAY ĐỔI tuần tới</label>
          <textarea id="tt-to-change" placeholder="Tuần tới bạn muốn thay đổi điều gì?">${esc(state.reflection.to_change)}</textarea>

          <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:16px 0 6px;">Mối quan hệ tuần này thế nào?</label>
          <div class="chips" id="tt-relationship-chips" style="margin-bottom:14px;">
            ${[1,2,3,4,5].map(v=>`<div class="chip ${state.reflection.relationship_score===v?'selected':''}" data-score-field="relationship_score" data-score-value="${v}" style="font-size:18px;padding:8px 14px;">${SELF_RATING_EMOJI[v-1]}</div>`).join('')}
          </div>

          <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:6px;">Sức khoẻ tuần này thế nào?</label>
          <div class="chips" id="tt-health-chips" style="margin-bottom:14px;">
            ${[1,2,3,4,5].map(v=>`<div class="chip ${state.reflection.health_score===v?'selected':''}" data-score-field="health_score" data-score-value="${v}" style="font-size:18px;padding:8px 14px;">${SELF_RATING_EMOJI[v-1]}</div>`).join('')}
          </div>

          <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:6px;">Cảm giác về mục đích sống tuần này?</label>
          <div class="chips" id="tt-purpose-chips" style="margin-bottom:14px;">
            ${[1,2,3,4,5].map(v=>`<div class="chip ${state.reflection.purpose_score===v?'selected':''}" data-score-field="purpose_score" data-score-value="${v}" style="font-size:18px;padding:8px 14px;">${SELF_RATING_EMOJI[v-1]}</div>`).join('')}
          </div>

          <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:6px;">Kết nối với bố mẹ/cội nguồn tuần này thế nào?</label>
          <div class="chips" id="tt-parents-chips" style="margin-bottom:14px;">
            ${[1,2,3,4,5].map(v=>`<div class="chip ${state.reflection.parents_connection_score===v?'selected':''}" data-score-field="parents_connection_score" data-score-value="${v}" style="font-size:18px;padding:8px 14px;">${SELF_RATING_EMOJI[v-1]}</div>`).join('')}
          </div>

          <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:6px;">${glossaryWrap('Tâm thức về tiền của bạn tuần này thế nào?', 'karma_score')}</label>
          <div class="chips" id="tt-finance-mindset-chips">
            ${[1,2,3,4,5].map(v=>`<div class="chip ${state.reflection.finance_mindset_score===v?'selected':''}" data-score-field="finance_mindset_score" data-score-value="${v}" style="font-size:18px;padding:8px 14px;">${SELF_RATING_EMOJI[v-1]}</div>`).join('')}
          </div>
          <div class="hint-box" style="margin-top:10px;">Đây là câu hỏi CHECK trực tiếp Trụ Tài Chính Tâm Thức — điểm này ảnh hưởng nhẹ tới cả 4 trụ còn lại ở Karma Radar trang chủ.</div>

          <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:16px 0 6px;">Tuần này khi thấy người khác (đồng nghiệp, bạn bè) nhận tin vui về tiền, bạn cảm thấy thế nào?</label>
          <div class="chips" id="tt-reaction-chips">
            ${REACTION_OPTIONS.map(o=>`<div class="chip ${state.reflection.reaction_to_others_success===o.key?'selected':''}" data-reaction="${o.key}">${o.label}</div>`).join('')}
          </div>
          <div class="hint-box" id="tt-reaction-explain" style="margin-top:10px;">${state.reflection.reaction_to_others_success ? esc(reactionExplain(state.reflection.reaction_to_others_success)) : 'Chọn 1 cảm nhận thật nhất — không có lựa chọn nào sai.'}</div>

          <button class="btn" style="margin-top:16px;" id="tt-save" ${state.saving?'disabled':''}>${state.saving?'Đang lưu…':'Lưu nhận xét tuần'}</button>
          <span id="tt-saved-msg" style="margin-left:10px;color:var(--accent);font-weight:600;">${state.savedMsg}</span>
        </div>
      `}
    `;
  }

  function bind(){
    const prevEl = container.querySelector('#tt-prev');
    if(prevEl) prevEl.onclick = ()=>{ const d = new Date(state.weekStart); d.setDate(d.getDate()-7); state.weekStart = d; load(); };
    const nextEl = container.querySelector('#tt-next');
    if(nextEl) nextEl.onclick = ()=>{ const d = new Date(state.weekStart); d.setDate(d.getDate()+7); state.weekStart = d; load(); };

    const feelingChips = container.querySelector('#tt-feeling-chips');
    if(feelingChips) feelingChips.querySelectorAll('[data-feeling]').forEach(el=>{
      el.onclick = ()=>{ state.reflection.spending_feeling = el.getAttribute('data-feeling'); draw(); };
    });

    const bindText = (id, field)=>{
      const el = container.querySelector(id);
      if(el) el.oninput = (e)=>{ state.reflection[field] = e.target.value; };
    };
    bindText('#tt-regret', 'regret_expense');
    bindText('#tt-unexpected', 'unexpected_expense');
    bindText('#tt-went-well', 'went_well');
    bindText('#tt-to-change', 'to_change');

    container.querySelectorAll('[data-score-field]').forEach(el=>{
      el.onclick = ()=>{
        state.reflection[el.getAttribute('data-score-field')] = Number(el.getAttribute('data-score-value'));
        draw();
      };
    });
    const reactionChips = container.querySelector('#tt-reaction-chips');
    if(reactionChips) reactionChips.querySelectorAll('[data-reaction]').forEach(el=>{
      el.onclick = ()=>{ state.reflection.reaction_to_others_success = el.getAttribute('data-reaction'); draw(); };
    });

    const saveBtn = container.querySelector('#tt-save');
    if(saveBtn) saveBtn.onclick = saveReflection;
  }

  load();
}

window.Modules = window.Modules || {};
window.Modules['tong-ket-tuan'] = { title:'Tổng Kết Tuần', render };
})();
