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

// Mỗi mức 1-5 có mô tả riêng — góp ý Quỳnh 2026-08-26: "các mục đánh sticker đang hơi qua loa" (trước
// đây chỉ có 5 emoji trơn, không nói rõ mức nào nghĩa là gì, khác hẳn độ sâu ở REACTION_OPTIONS/
// VIBE_QUESTIONS). Không đổi thang điểm 1-5 hay tên cột DB, chỉ thêm mô tả hiện ra SAU khi chọn.
const SELF_RATING_LEVELS = {
  relationship_score: ['Căng thẳng, xa cách, ít nói chuyện thật lòng', 'Bình thường, không có gì đặc biệt', 'Ổn, có lắng nghe nhau', 'Gắn kết, chia sẻ thật lòng', 'Rất gắn kết, thấu hiểu và biết ơn nhau'],
  health_score: ['Mệt mỏi, mất ngủ, bỏ bê cơ thể', 'Tạm ổn, chưa chăm chút gì thêm', 'Có vận động/ăn uống điều độ 1 phần', 'Ngủ đủ, ăn uống lành mạnh, có vận động', 'Tràn đầy năng lượng, chăm sóc bản thân trọn vẹn'],
  purpose_score: ['Trống rỗng, không biết mình đang sống vì điều gì', 'Làm theo quán tính, chưa nghĩ nhiều', 'Có lúc thấy ý nghĩa, có lúc mơ hồ', 'Thấy công việc/cuộc sống có ý nghĩa rõ ràng', 'Tràn đầy cảm hứng, biết chính xác mình đang tạo giá trị gì'],
  parents_connection_score: ['Né tránh, chưa muốn liên lạc', 'Có liên lạc nhưng hời hợt', 'Bình thường, hỏi thăm đủ lễ', 'Có trò chuyện thật lòng, quan tâm nhau', 'Rất gắn kết, biết ơn sâu sắc'],
  finance_mindset_score: ['Lo âu, sợ hãi mỗi khi nghĩ tới tiền', 'Thấy tiền là chuyện hiển nhiên, vô cảm', 'Bình tĩnh, không quá lo cũng không quá vui', 'Biết ơn, thấy tiền là dòng chảy tự nhiên', 'Hoàn toàn an tâm, tin tưởng dòng tiền luôn đủ'],
};
function scoreLevelExplain(field, value){
  const levels = SELF_RATING_LEVELS[field];
  return levels && value ? levels[value-1] : 'Chọn 1 mức thật nhất theo cảm nhận tuần này.';
}
function scoreChipGroupHtml(field, question, idSuffix, value, extraHint){
  return `
    <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:16px 0 6px;">${question}</label>
    <div class="chips" id="tt-${idSuffix}-chips">
      ${[1,2,3,4,5].map(v=>`<div class="chip ${value===v?'selected':''}" data-score-field="${field}" data-score-value="${v}" style="font-size:18px;padding:8px 14px;">${SELF_RATING_EMOJI[v-1]}</div>`).join('')}
    </div>
    <div class="hint-box" id="tt-${idSuffix}-explain" style="margin-top:8px;">${esc(scoreLevelExplain(field, value))}</div>
    ${extraHint || ''}
  `;
}

function render(container, ctx){
  const state = {
    loading: true,
    weekStart: startOfWeek(new Date()),
    entries: [],
    reflection: { regret_expense:'', unexpected_expense:'', spending_feeling:'', went_well:'', to_change:'', relationship_score:null, health_score:null, purpose_score:null, parents_connection_score:null, finance_mindset_score:null, reaction_to_others_success:null },
    saving: false,
    savedMsg: '',
    // Tab "Chi tiết" (donut theo danh mục) / "Xu hướng" (cột theo từng ngày trong tuần) — kiểu Money
    // Lover, 2026-08-24 góp ý Quỳnh. Không lưu draft — chỉ là cách xem, không phải dữ liệu.
    breakdownTab: { expense:'chi-tiet', income:'chi-tiet' },
  };
  // Draft khoá riêng theo TỪNG TUẦN — không thì đổi tuần (Tuần trước/sau) sẽ vô tình dán nhầm bản
  // nháp của tuần khác vào tuần đang xem (góp ý Quỳnh 2026-08-22: gõ dở bị mất khi rời trang).
  function draftKey(){ return 'tong-ket-tuan-' + isoDate(state.weekStart); }
  function persistDraft(){ saveModuleDraft(ctx, draftKey(), { reflection: state.reflection }); }

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
    // Draft đè lên SAU dữ liệu đã lưu — draft luôn là bản mới hơn (đang gõ dở, chưa bấm "Lưu nhận
    // xét tuần").
    const draft = await loadModuleDraft(ctx, draftKey());
    if(draft && draft.reflection) Object.assign(state.reflection, draft.reflection);
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
    await clearModuleDraft(ctx, draftKey());
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

    // 7 cột, đúng từng ngày trong tuần (T2→CN) — bucket theo entry_date, không theo danh mục.
    function groupByDayOfWeek(list){
      const byDate = {};
      list.forEach(e=>{ byDate[e.entry_date] = (byDate[e.entry_date]||0) + Number(e.amount); });
      const DAY_LABELS = ['CN','T2','T3','T4','T5','T6','T7'];
      return Array.from({length:7}, (_,i)=>{
        const d = new Date(state.weekStart); d.setDate(d.getDate()+i);
        return { label: DAY_LABELS[d.getDay()], amount: byDate[isoDate(d)] || 0 };
      });
    }
    const expenseByDay = groupByDayOfWeek(expense);
    const incomeByDay = groupByDayOfWeek(income);

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
          <h3>Chi tiêu</h3>
          ${breakdownToggleHtml('expense', state.breakdownTab.expense, expenseByCategory, expenseByDay, 'var(--danger)')}
        </div>

        <div class="section">
          <h3>Thu nhập</h3>
          ${breakdownToggleHtml('income', state.breakdownTab.income, incomeByCategory, incomeByDay, 'var(--accent)')}
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

          <div class="hint-box" style="margin:16px 0 10px;">5 câu chấm điểm dưới đây tương ứng đúng 5 Trụ Cột ở <a href="#thiet-lap-nhanh" style="color:var(--accent);font-weight:600;">Điểm Nghiệp ở Chấm Điểm Nghiệp Tiền →</a> — chấm thật theo cảm nhận tuần này, không cần nghĩ nhiều.</div>

          ${scoreChipGroupHtml('relationship_score', 'Mối quan hệ tuần này thế nào?', 'relationship', state.reflection.relationship_score)}
          ${scoreChipGroupHtml('health_score', 'Sức khoẻ tuần này thế nào?', 'health', state.reflection.health_score)}
          ${scoreChipGroupHtml('purpose_score', 'Cảm giác về mục đích sống tuần này?', 'purpose', state.reflection.purpose_score)}
          ${scoreChipGroupHtml('parents_connection_score', 'Kết nối với bố mẹ/cội nguồn tuần này thế nào?', 'parents', state.reflection.parents_connection_score)}
          ${scoreChipGroupHtml('finance_mindset_score', glossaryWrap('Tâm thức về tiền của bạn tuần này thế nào?', 'karma_score'), 'finance-mindset', state.reflection.finance_mindset_score,
            `<div class="hint-box" style="margin-top:6px;">Câu này CHECK trực tiếp Trụ Tài Chính Tâm Thức — vì tài chính bất ổn kéo theo mọi mặt khác, điểm này còn ảnh hưởng nhẹ tới cả 4 trụ còn lại ở <a href="#thiet-lap-nhanh" style="color:var(--accent);font-weight:600;">Điểm Nghiệp ở Chấm Điểm Nghiệp Tiền →</a>.</div>`)}

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
    container.querySelectorAll('[data-breakdown-tab]').forEach(el=>{
      el.onclick = ()=>{
        const [id, tab] = el.getAttribute('data-breakdown-tab').split(':');
        state.breakdownTab[id] = tab;
        draw();
      };
    });
    const prevEl = container.querySelector('#tt-prev');
    if(prevEl) prevEl.onclick = ()=>{ const d = new Date(state.weekStart); d.setDate(d.getDate()-7); state.weekStart = d; load(); };
    const nextEl = container.querySelector('#tt-next');
    if(nextEl) nextEl.onclick = ()=>{ const d = new Date(state.weekStart); d.setDate(d.getDate()+7); state.weekStart = d; load(); };

    const feelingChips = container.querySelector('#tt-feeling-chips');
    if(feelingChips) feelingChips.querySelectorAll('[data-feeling]').forEach(el=>{
      el.onclick = ()=>{ state.reflection.spending_feeling = el.getAttribute('data-feeling'); draw(); persistDraft(); };
    });

    const bindText = (id, field)=>{
      const el = container.querySelector(id);
      if(el) el.oninput = (e)=>{ state.reflection[field] = e.target.value; persistDraft(); };
    };
    bindText('#tt-regret', 'regret_expense');
    bindText('#tt-unexpected', 'unexpected_expense');
    bindText('#tt-went-well', 'went_well');
    bindText('#tt-to-change', 'to_change');

    container.querySelectorAll('[data-score-field]').forEach(el=>{
      el.onclick = ()=>{
        state.reflection[el.getAttribute('data-score-field')] = Number(el.getAttribute('data-score-value'));
        draw();
        persistDraft();
      };
    });
    const reactionChips = container.querySelector('#tt-reaction-chips');
    if(reactionChips) reactionChips.querySelectorAll('[data-reaction]').forEach(el=>{
      el.onclick = ()=>{ state.reflection.reaction_to_others_success = el.getAttribute('data-reaction'); draw(); persistDraft(); };
    });

    const saveBtn = container.querySelector('#tt-save');
    if(saveBtn) saveBtn.onclick = saveReflection;
  }

  load();
}

window.Modules = window.Modules || {};
window.Modules['tong-ket-tuan'] = { title:'Tổng Kết Tuần', render };
})();
