(function(){
// "Tổng Kết Năm" (2026-08-26, góp ý Quỳnh: thêm tổng kết năm, liên kết với Chấm Điểm Nghiệp Tiền +
// Hạt Giống Phước - Nghiệp). KHÔNG tính lại từ đầu — gộp lại đúng dữ liệu đã có sẵn của cả năm:
// - Số liệu tài chính: tc_finance_entries (thu/chi cả năm) + tc_networth_snapshots (tài sản ròng/
//   tích luỹ đầu năm so với cuối năm, dùng CHUNG công thức với tich-luy.js).
// - Điểm Nghiệp cuối năm: trung bình mọi lần "💾 Lưu kết quả này" trong năm ở tc_karma_history
//   (KHÔNG bắt làm lại 1 bài chấm điểm riêng cho tổng kết năm — dùng thẳng lịch sử đã lưu).
// - Hạt Giống trong năm: tc_core_beliefs tạo trong năm, tách đã chuyển hoá (still_active=false)/
//   còn active.
// Chỉ lưu MỚI đúng phần không suy ra được: 1 đoạn nhìn lại năm qua + lời cam kết cho năm tới theo
// từng Trụ Cột (tc_yearly_reflections, xem schema_tai_chinh.sql) — cùng tinh thần "không lưu số suy
// ra được" đã áp dụng xuyên suốt app này.
const TICH_LUY_ASSET_FIELDS = ['asset_savings', 'asset_gold_fx', 'asset_stocks'];
function tichLuyStockOf(row){
  return TICH_LUY_ASSET_FIELDS.reduce((s,k)=> s + Number((row && row[k]) || 0), 0);
}
function netWorthOf(row){
  if(!row) return 0;
  const assets = Number(row.asset_cash||0)+Number(row.asset_savings||0)+Number(row.asset_gold_fx||0)+Number(row.asset_stocks||0)+Number(row.asset_realestate||0)+Number(row.asset_other||0);
  const debts = Number(row.debt_credit_card||0)+Number(row.debt_installment||0)+Number(row.debt_bank_loan||0)+Number(row.debt_other||0);
  return assets - debts;
}

function render(container, ctx){
  const state = {
    loading: true, year: new Date().getFullYear(),
    totalIncome: 0, totalExpense: 0,
    netWorthStart: null, netWorthEnd: null, tichLuyStart: null, tichLuyEnd: null,
    karmaAvg: null, karmaCount: 0,
    beliefsResolved: [], beliefsActive: [],
    reflectionSummary: '', nextYearGoals: {}, saving: false, savedMsg: '',
  };

  function draw(){ container.innerHTML = html(); bind(); }

  async function load(){
    state.loading = true; draw();
    const yStart = `${state.year}-01-01`;
    const yEndExclusive = `${state.year+1}-01-01`;
    const [entriesRes, snapshotsRes, karmaRes, beliefsRes, yearlyRes] = await Promise.all([
      ctx.supabase.from('tc_finance_entries').select('type, amount')
        .eq('user_id', ctx.user.id).gte('entry_date', yStart).lt('entry_date', yEndExclusive),
      ctx.supabase.from('tc_networth_snapshots').select('*')
        .eq('user_id', ctx.user.id).gte('snapshot_month', `${state.year}-01`).lte('snapshot_month', `${state.year}-12`).order('snapshot_month', { ascending:true }),
      ctx.supabase.from('tc_karma_history').select('*')
        .eq('user_id', ctx.user.id).gte('taken_at', yStart).lt('taken_at', yEndExclusive),
      ctx.supabase.from('tc_core_beliefs').select('*')
        .eq('user_id', ctx.user.id).gte('created_at', yStart).lt('created_at', yEndExclusive),
      ctx.supabase.from('tc_yearly_reflections').select('*')
        .eq('user_id', ctx.user.id).eq('year', state.year).maybeSingle(),
    ]);

    const entries = entriesRes.data || [];
    state.totalIncome = entries.filter(e=>e.type==='income').reduce((s,e)=>s+Number(e.amount),0);
    state.totalExpense = entries.filter(e=>e.type==='expense').reduce((s,e)=>s+Number(e.amount),0);

    const snapshots = snapshotsRes.data || [];
    state.netWorthStart = snapshots.length ? netWorthOf(snapshots[0]) : null;
    state.netWorthEnd = snapshots.length ? netWorthOf(snapshots[snapshots.length-1]) : null;
    state.tichLuyStart = snapshots.length ? tichLuyStockOf(snapshots[0]) : null;
    state.tichLuyEnd = snapshots.length ? tichLuyStockOf(snapshots[snapshots.length-1]) : null;

    const karmaRows = karmaRes.data || [];
    state.karmaCount = karmaRows.length;
    if(karmaRows.length > 0){
      state.karmaAvg = {};
      HOUSES.forEach(h=>{
        const vals = karmaRows.map(r=>r[h.key]).filter(v=>v!=null);
        state.karmaAvg[h.key] = vals.length ? Math.round(vals.reduce((s,v)=>s+v,0)/vals.length) : null;
      });
    } else {
      state.karmaAvg = null;
    }

    const beliefs = beliefsRes.data || [];
    state.beliefsResolved = beliefs.filter(b=>!b.still_active);
    state.beliefsActive = beliefs.filter(b=>b.still_active);

    const y = yearlyRes.data;
    state.reflectionSummary = (y && y.reflection_summary) || '';
    state.nextYearGoals = (y && y.next_year_goals) || {};

    state.loading = false;
    draw();
  }

  async function save(){
    state.saving = true; draw();
    await ctx.supabase.from('tc_yearly_reflections').upsert({
      user_id: ctx.user.id, year: state.year,
      reflection_summary: state.reflectionSummary.trim() || null,
      next_year_goals: Object.keys(state.nextYearGoals).some(k=>(state.nextYearGoals[k]||'').trim()) ? state.nextYearGoals : null,
      updated_at: new Date().toISOString(),
    }, { onConflict:'user_id,year' });
    state.saving = false;
    state.savedMsg = 'Đã lưu ✓';
    draw();
    setTimeout(()=>{ state.savedMsg=''; const el = container.querySelector('#tn-saved'); if(el) el.textContent=''; }, 1800);
  }

  function html(){
    const savingsRate = state.totalIncome>0 ? Math.round((state.totalIncome-state.totalExpense)/state.totalIncome*1000)/10 : 0;
    const netWorthChange = (state.netWorthStart!=null && state.netWorthEnd!=null) ? state.netWorthEnd - state.netWorthStart : null;
    const tichLuyChange = (state.tichLuyStart!=null && state.tichLuyEnd!=null) ? state.tichLuyEnd - state.tichLuyStart : null;

    return `
      <div class="page-head">
        <h1>Tổng Kết Năm</h1>
        <p>Bản phóng to của Tổng Kết Tháng — nhìn lại cả năm ${state.year}, kèm Điểm Nghiệp trung bình cả năm (từ lịch sử đã lưu ở Chấm Điểm Nghiệp Tiền) và hành trình Hạt Giống Phước - Nghiệp.</p>
      </div>

      <div class="chips" style="margin-bottom:18px;">
        <div class="chip" data-year-nav="-1">← ${state.year-1}</div>
        <div class="chip selected">${state.year}</div>
        <div class="chip" data-year-nav="1">${state.year+1} →</div>
      </div>

      ${state.loading ? `<div class="loading"><div class="spinner"></div></div>` : `
        <div class="section">
          <h3>🧭 Số liệu cả năm</h3>
          <div class="source-grid">
            <div class="source-card"><div class="ic" style="font-size:16px;color:var(--accent);">${state.totalIncome.toLocaleString('vi-VN')}đ</div><div class="label">Tổng thu cả năm</div></div>
            <div class="source-card"><div class="ic" style="font-size:16px;color:var(--danger);">${state.totalExpense.toLocaleString('vi-VN')}đ</div><div class="label">Tổng chi cả năm</div></div>
            <div class="source-card"><div class="ic" style="font-size:16px;">${savingsRate}%</div><div class="label">Tỷ lệ tiết kiệm</div></div>
            <div class="source-card"><div class="ic" style="font-size:16px;${netWorthChange==null?'':`color:${netWorthChange>=0?'var(--accent)':'var(--danger)'};`}">${netWorthChange==null?'Chưa đủ dữ liệu':(netWorthChange>=0?'+':'')+netWorthChange.toLocaleString('vi-VN')+'đ'}</div><div class="label">Tài sản ròng thay đổi</div></div>
            <div class="source-card"><div class="ic" style="font-size:16px;${tichLuyChange==null?'':`color:${tichLuyChange>=0?'var(--accent)':'var(--danger)'};`}">${tichLuyChange==null?'Chưa đủ dữ liệu':(tichLuyChange>=0?'+':'')+tichLuyChange.toLocaleString('vi-VN')+'đ'}</div><div class="label">Tích luỹ thay đổi</div></div>
          </div>
          <div class="hint-box" style="margin-top:10px;">Dựa vào cân đối tài sản đã lưu ở <a href="#tong-ket-thang" style="color:var(--accent);font-weight:600;">Tổng Kết Tháng →</a> đầu năm và tháng gần nhất trong năm ${state.year}. Xem xu hướng chi tiết hơn ở <a href="#tich-luy" style="color:var(--accent);font-weight:600;">Tích Lũy →</a>.</div>
        </div>

        <div class="section">
          <h3>🔥 Điểm Nghiệp trung bình cả năm</h3>
          ${state.karmaAvg === null
            ? `<div class="hint-box">Chưa có lần nào bấm "💾 Lưu kết quả này" trong năm ${state.year} — sang <a href="#thiet-lap-nhanh" style="color:var(--accent);font-weight:600;">Chấm Điểm Nghiệp Tiền →</a> làm bài rồi lưu lại vài lần trong năm để có số liệu ở đây.</div>`
            : `
            <p style="font-size:12.5px;color:var(--ink-soft);margin-bottom:10px;">Trung bình ${state.karmaCount} lần đã lưu trong năm ${state.year}.</p>
            <div style="display:flex;flex-direction:column;gap:8px;">
              ${HOUSES.map(h=>{
                const v = state.karmaAvg[h.key];
                return `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--line);">
                  <span style="font-size:13.5px;">${esc(h.label)}</span>
                  <b style="font-family:'IBM Plex Mono',monospace;color:var(--accent);">${v==null?'—':v+'/100'}</b>
                </div>`;
              }).join('')}
            </div>
            <div class="hint-box" style="margin-top:10px;">Xem lại từng lần chấm điểm trong năm ở tab <a href="#thiet-lap-nhanh" style="color:var(--accent);font-weight:600;">📈 Theo Dõi Kết Quả →</a>.</div>
          `}
        </div>

        <div class="section">
          <h3>🌱 Hạt Giống trong năm</h3>
          ${(state.beliefsResolved.length + state.beliefsActive.length) === 0
            ? `<div class="hint-box">Chưa ghi hạt giống nào trong năm ${state.year} — sang <a href="#tang-thuc" style="color:var(--accent);font-weight:600;">Hạt Giống Phước - Nghiệp →</a> khi thấy 1 Nút Chặn Dòng Tiền lặp lại.</div>`
            : `
            <div class="source-grid" style="margin-bottom:10px;">
              <div class="source-card"><div class="ic" style="font-size:17px;color:var(--accent);">${state.beliefsResolved.length}</div><div class="label">Đã chuyển hoá</div></div>
              <div class="source-card"><div class="ic" style="font-size:17px;color:var(--gold);">${state.beliefsActive.length}</div><div class="label">Còn đang active</div></div>
            </div>
            ${state.beliefsActive.length > 0 ? `<div class="hint-box">Còn <b>${state.beliefsActive.length}</b> hạt giống chưa chuyển hoá — xem lại ở <a href="#tang-thuc" style="color:var(--accent);font-weight:600;">Hạt Giống Phước - Nghiệp →</a>.</div>` : ''}
          `}
        </div>

        <div class="section">
          <h3>✍️ Nhìn lại năm ${state.year}</h3>
          <textarea id="tn-summary" rows="4" placeholder="Năm nay dòng tiền của bạn thay đổi thế nào? Điều gì đáng nhớ nhất về hành trình tâm thức tiền của bạn?">${esc(state.reflectionSummary)}</textarea>
        </div>

        <div class="section">
          <h3>🎯 Lời cam kết cho năm ${state.year+1}</h3>
          <p style="font-size:12.5px;color:var(--ink-soft);margin-bottom:10px;">Không bắt buộc — viết cho trụ nào bạn muốn tập trung năm tới.</p>
          ${HOUSES.map(h=>`
            <div style="margin-top:10px;">
              <label style="display:block;font-size:12.5px;font-weight:600;color:var(--ink-soft);margin-bottom:4px;">${esc(h.label)}</label>
              <textarea data-nextyear-goal="${h.key}" placeholder="${esc(HOUSE_GOAL_ANCHOR[h.key])}">${esc(state.nextYearGoals[h.key] || '')}</textarea>
            </div>
          `).join('')}
          <button class="btn btn-full" style="margin-top:16px;" id="tn-save" ${state.saving?'disabled':''}>${state.saving?'Đang lưu…':(state.savedMsg||'Lưu Tổng Kết Năm')}</button>
        </div>
      `}
    `;
  }

  function bind(){
    container.querySelectorAll('[data-year-nav]').forEach(el=>{
      el.onclick = ()=>{ state.year += Number(el.getAttribute('data-year-nav')); load(); };
    });
    const summaryEl = container.querySelector('#tn-summary');
    if(summaryEl) summaryEl.oninput = (e)=>{ state.reflectionSummary = e.target.value; };
    container.querySelectorAll('[data-nextyear-goal]').forEach(el=>{
      el.oninput = ()=>{ state.nextYearGoals[el.getAttribute('data-nextyear-goal')] = el.value; };
    });
    const saveBtn = container.querySelector('#tn-save');
    if(saveBtn) saveBtn.onclick = save;
  }

  load();
}
window.Modules = window.Modules || {};
window.Modules['tong-ket-nam'] = { title:'Tổng Kết Năm', render };
})();
