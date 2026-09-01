(function(){
const TOUR_STEPS = [
  { selector: '.source-grid', title: 'Dòng tiền tháng', text: 'Tổng thu, tổng chi, tỷ lệ tiết kiệm, và DTI (tỷ lệ nợ/thu nhập nếu có khai ở Quản Lý Nợ) của tháng đang xem.' },
  { selector: '#tk-save-networth', title: 'Cân đối Tài Sản Ròng', text: 'Điền tài sản/tiêu sản-nợ để ra Tài Sản Ròng — con số QUAN TRỌNG NHẤT của trang này. Bấm lưu để cộng điểm cho Trụ Thân Tâm Bản Thể ở Điểm Nghiệp.' },
  { selector: '#tk-save-reflection', title: 'Bài học nhìn lại tháng qua', text: 'Trả lời vài câu ngắn về khoản chi hối tiếc/xứng đáng, thói quen tốt/xấu, rồi lưu lại — muốn đặt mục tiêu tháng tới thì sang Mục Tiêu & Cam Kết.' },
];

const ASSET_FIELDS = [
  { key:'asset_cash', label:'Tiền mặt & Tiền gửi TK' },
  { key:'asset_savings', label:'Tiết kiệm có kỳ hạn' },
  { key:'asset_gold_fx', label:'Vàng / Ngoại tệ' },
  { key:'asset_stocks', label:'Cổ phiếu / Quỹ đầu tư' },
  { key:'asset_realestate', label:'Bất động sản' },
  { key:'asset_other', label:'Khác' },
];
const DEBT_FIELDS = [
  { key:'debt_credit_card', label:'Nợ thẻ tín dụng' },
  { key:'debt_installment', label:'Vay trả góp (xe, đồ dùng...)' },
  { key:'debt_bank_loan', label:'Vay ngân hàng' },
  { key:'debt_other', label:'Nợ bạn bè / Khác' },
];
const EMPTY_NETWORTH = Object.fromEntries([...ASSET_FIELDS, ...DEBT_FIELDS].map(f=>[f.key, '']));
// Chỉ còn "Bài học nhìn lại tháng qua" (retrospective) ở đây — phần đặt mục tiêu (goal_*, prospective)
// đã chuyển hẳn sang module "Mục Tiêu & Cam Kết" (tai-chinh/js/muc-tieu-cam-ket.js), theo đúng góp ý
// Quỳnh 2026-08-21: đặt mục tiêu phải là 1 khoảnh khắc riêng TRƯỚC khi ghi chép, không gộp chung
// với việc nhìn lại cuối tháng. Cùng lý do đó, KHOẢN NGÂN SÁCH (đặt hạn mức, cũng là 1 việc làm
// TRƯỚC khi tiêu) chuyển sang muc-tieu-cam-ket.js luôn (2026-08-24, góp ý Quỳnh "ngân sách phải ở
// phần mục tiêu chứ") — ở đây chỉ còn XEM chi tiêu thật đã tiêu vào đâu (mục A1), không còn đặt/sửa
// hạn mức.
const EMPTY_REFLECTION = {
  reflection_regret:'', reflection_worth:'', reflection_blocker:'', reflection_good_habit:'', reflection_bad_habit:'',
};

function nextMonthKey(m){
  const [y, mo] = m.split('-').map(Number);
  const d = new Date(y, mo, 1);
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
}
function monthLabel(m){
  const [y, mo] = m.split('-').map(Number);
  return `Tháng ${mo}/${y}`;
}
function sumFields(row, fields){
  return fields.reduce((s,f)=> s + Number((row && row[f.key]) || 0), 0);
}
// "Xu hướng" kiểu Money Lover — chia tháng thành các khoảng 7 ngày (1-7, 8-14...) thay vì vẽ 28-31
// cột riêng lẻ (quá dày, khó đọc trên điện thoại). entries cần có entry_date 'YYYY-MM-DD'.
function groupByDayRange(entries, month){
  const [y, mo] = month.split('-').map(Number);
  const daysInMonth = new Date(y, mo, 0).getDate();
  const buckets = [];
  for(let start=1; start<=daysInMonth; start+=7){
    const end = Math.min(start+6, daysInMonth);
    buckets.push({ start, end, label: start===end ? `${start}` : `${start}-${end}`, amount:0 });
  }
  entries.forEach(e=>{
    const day = Number(e.entry_date.slice(8,10));
    const b = buckets.find(b=>day>=b.start && day<=b.end);
    if(b) b.amount += Number(e.amount);
  });
  return buckets;
}

// Biểu đồ cột tài sản ròng theo tháng — tự vẽ SVG thô, không thêm thư viện. Hỗ trợ cả trường hợp
// tài sản ròng ÂM (đang nợ nhiều hơn tài sản) bằng cách neo mốc 0 linh động thay vì cố định đáy.
function networthChartHtml(historyRows){
  if(historyRows.length < 2) return '';
  const w = 680, h = 180, padTop = 16, padBottom = 28, padSide = 12;
  const innerW = w - padSide*2, innerH = h - padTop - padBottom;
  const n = historyRows.length;
  const maxVal = Math.max(0, ...historyRows.map(r=>r.net));
  const minVal = Math.min(0, ...historyRows.map(r=>r.net));
  const range = Math.max(1, maxVal - minVal);
  const zeroY = padTop + innerH * (maxVal / range);
  const slot = innerW / n;
  const barW = Math.max(10, Math.min(40, slot * 0.6));

  const parts = historyRows.map((r,i)=>{
    const x = padSide + slot*i + (slot-barW)/2;
    const valueY = padTop + innerH * ((maxVal - r.net) / range);
    const y = r.net >= 0 ? valueY : zeroY;
    const barH = Math.max(1, Math.abs(valueY - zeroY));
    const color = r.net >= 0 ? 'var(--accent)' : 'var(--danger)';
    const [yy, mm] = r.month.split('-');
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${barH.toFixed(1)}" fill="${color}" rx="2"/><text x="${(x+barW/2).toFixed(1)}" y="${h-8}" text-anchor="middle" font-size="9" fill="var(--ink-soft)" font-family="IBM Plex Mono, monospace">${mm}/${yy.slice(2)}</text>`;
  }).join('');

  return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:${h}px;margin-top:10px;">
    <line x1="${padSide}" y1="${zeroY.toFixed(1)}" x2="${w-padSide}" y2="${zeroY.toFixed(1)}" stroke="var(--line)" stroke-width="1"/>
    ${parts}
  </svg>`;
}

function render(container, ctx){
  const state = {
    loading: true,
    month: new Date().toISOString().slice(0,7),
    cashFlow: { income:0, expense:0 },
    networth: { ...EMPTY_NETWORTH },
    networthCarriedForward: false,
    networthHistory: [],
    reflection: { ...EMPTY_REFLECTION },
    budgetActuals: {},
    totalMinPayments: 0,
    savingNetworth: false,
    savingReflection: false,
    savedNetworthMsg: '',
    savedReflectionMsg: '',
    expenseEntries: [],
    // Tab "Chi tiết" (donut theo danh mục) / "Xu hướng" (cột theo từng khoảng ngày trong tháng) —
    // kiểu Money Lover, 2026-08-24 góp ý Quỳnh. Không lưu draft — chỉ là cách xem, không phải dữ liệu.
    breakdownTab: 'chi-tiet',
  };
  // Draft khoá riêng theo TỪNG THÁNG (giống tong-ket-tuan.js) — đổi tháng (Tháng trước/sau) không
  // được dán nhầm bản nháp của tháng khác vào (góp ý Quỳnh 2026-08-22: gõ dở bị mất khi rời trang).
  function draftKey(){ return 'tong-ket-thang-' + state.month; }
  function persistDraft(){ saveModuleDraft(ctx, draftKey(), { networth: state.networth, reflection: state.reflection }); }
  // Không gọi clearModuleDraft() sau mỗi lần lưu — 2 khối (tài sản/bài học) lưu ĐỘC LẬP, xoá cả draft
  // khi chỉ 1 khối vừa lưu sẽ mất nháp đang gõ dở của khối còn lại. Vô hại nếu để draft tồn tại sau
  // khi đã lưu: load() luôn merge draft ĐÈ SAU dữ liệu thật, nên khối đã lưu chỉ bị ghi đè lại đúng
  // giá trị vừa lưu (không đổi gì).

  function draw(){ container.innerHTML = html(); bind(); }
  draw();

  async function load(){
    state.loading = true; draw();
    const monthStart = `${state.month}-01`;
    const monthEndExclusive = `${nextMonthKey(state.month)}-01`;
    const [entriesRes, snapshotRes, historyRes, reflectionRes, debtsRes] = await Promise.all([
      ctx.supabase.from('tc_finance_entries').select('type, amount, category_label, entry_date')
        .eq('user_id', ctx.user.id).gte('entry_date', monthStart).lt('entry_date', monthEndExclusive),
      ctx.supabase.from('tc_networth_snapshots').select('*')
        .eq('user_id', ctx.user.id).eq('snapshot_month', state.month).maybeSingle(),
      ctx.supabase.from('tc_networth_snapshots').select('*')
        .eq('user_id', ctx.user.id).order('snapshot_month', { ascending:true }),
      ctx.supabase.from('tc_monthly_reflections').select('*')
        .eq('user_id', ctx.user.id).eq('month', state.month).maybeSingle(),
      ctx.supabase.from('tc_debts').select('minimum_payment')
        .eq('user_id', ctx.user.id).eq('is_paid_off', false),
    ]);
    const entries = entriesRes.data || [];
    state.cashFlow = {
      income: entries.filter(e=>e.type==='income').reduce((s,e)=>s+Number(e.amount),0),
      // Tiền chuyển vào Tích Lũy không tính vào "chi tiêu thật" — loại khỏi tổng để Tỷ lệ tiết kiệm
      // không bị trừ 2 lần (xem comment TICH_LUY_CATEGORY_LABEL ở util.js).
      expense: entries.filter(e=>e.type==='expense' && e.category_label!==TICH_LUY_CATEGORY_LABEL).reduce((s,e)=>s+Number(e.amount),0),
    };
    state.expenseEntries = entries.filter(e=>e.type==='expense');
    state.budgetActuals = {};
    state.expenseEntries.forEach(e=>{
      const key = e.category_label || 'Khác';
      state.budgetActuals[key] = (state.budgetActuals[key]||0) + Number(e.amount);
    });
    state.totalMinPayments = (debtsRes.data||[]).reduce((s,d)=>s+Number(d.minimum_payment||0),0);
    const snap = snapshotRes.data;
    state.networthHistory = historyRes.data || [];
    if(snap){
      state.networth = Object.fromEntries([...ASSET_FIELDS, ...DEBT_FIELDS].map(f=>[f.key, snap[f.key]!=null ? String(snap[f.key]) : '']));
      state.networthCarriedForward = false;
    } else {
      // Tự nhảy số từ tháng gần nhất đã có, không bắt gõ lại từ đầu mỗi tháng — góp ý Quỳnh
      // 2026-08-26: "phần cân đối tài sản tiêu sản... có tự nhảy không hay phải điền". CHỈ áp dụng
      // khi tháng này CHƯA có snapshot nào (chưa bấm Lưu) — không đè lên dữ liệu thật đã lưu.
      const priorRows = state.networthHistory.filter(r => r.snapshot_month < state.month);
      const lastPrior = priorRows[priorRows.length - 1];
      state.networth = lastPrior
        ? Object.fromEntries([...ASSET_FIELDS, ...DEBT_FIELDS].map(f=>[f.key, lastPrior[f.key]!=null ? String(lastPrior[f.key]) : '']))
        : { ...EMPTY_NETWORTH };
      state.networthCarriedForward = !!lastPrior;
    }
    const refl = reflectionRes.data;
    state.reflection = refl
      ? Object.fromEntries(Object.keys(EMPTY_REFLECTION).map(k=>[k, refl[k]!=null ? String(refl[k]) : '']))
      : { ...EMPTY_REFLECTION };
    // Draft đè lên SAU dữ liệu đã lưu — draft luôn là bản mới hơn (đang gõ dở, chưa bấm lưu).
    const draft = await loadModuleDraft(ctx, draftKey());
    if(draft){
      if(draft.networth) Object.assign(state.networth, draft.networth);
      if(draft.reflection) Object.assign(state.reflection, draft.reflection);
    }
    state.loading = false;
    draw();
  }

  async function saveNetworth(){
    state.savingNetworth = true; draw();
    const payload = { user_id: ctx.user.id, snapshot_month: state.month, updated_at: new Date().toISOString() };
    [...ASSET_FIELDS, ...DEBT_FIELDS].forEach(f=>{ payload[f.key] = Number(state.networth[f.key]) || 0; });
    await ctx.supabase.from('tc_networth_snapshots').upsert(payload, { onConflict: 'user_id,snapshot_month' });
    state.savingNetworth = false;
    state.savedNetworthMsg = 'Đã lưu ✓';
    await load();
    setTimeout(()=>{ state.savedNetworthMsg=''; const el = container.querySelector('#tk-networth-saved'); if(el) el.textContent=''; }, 1800);
  }

  async function saveReflection(){
    state.savingReflection = true; draw();
    const payload = { user_id: ctx.user.id, month: state.month, updated_at: new Date().toISOString(), ...state.reflection };
    await ctx.supabase.from('tc_monthly_reflections').upsert(payload, { onConflict: 'user_id,month' });
    state.savingReflection = false;
    state.savedReflectionMsg = 'Đã lưu ✓';
    draw();
    setTimeout(()=>{ state.savedReflectionMsg=''; const el = container.querySelector('#tk-reflection-saved'); if(el) el.textContent=''; }, 1800);
  }

  function html(){
    const totalAssets = sumFields(state.networth, ASSET_FIELDS);
    const totalDebts = sumFields(state.networth, DEBT_FIELDS);
    const netWorth = totalAssets - totalDebts;
    const savingsRate = state.cashFlow.income>0 ? Math.round(((state.cashFlow.income-state.cashFlow.expense)/state.cashFlow.income)*100) : 0;

    const historyRows = state.networthHistory.map(s=>({
      month: s.snapshot_month,
      net: sumFields(s, ASSET_FIELDS) - sumFields(s, DEBT_FIELDS),
    }));

    const dti = state.cashFlow.income>0 ? Math.round(state.totalMinPayments/state.cashFlow.income*100) : null;
    const dtiColor = dti==null ? 'var(--ink)' : dti<36 ? 'var(--accent)' : dti<43 ? 'var(--gold)' : 'var(--danger)';

    const expenseByCategory = Object.entries(state.budgetActuals).map(([label,amount])=>({label,amount})).sort((a,b)=>b.amount-a.amount);
    const expenseByDayRange = groupByDayRange(state.expenseEntries, state.month);

    return `
      <span class="tour-trigger" id="tk-start-tour">❓ Hướng dẫn</span>
      <div class="page-head">
        <h1>Tổng Kết Tháng</h1>
        <p>Cuối tháng, tính Tài Sản Ròng = Tổng Tài Sản − Tổng Tiêu Sản/Nợ. Đây là con số QUAN TRỌNG NHẤT.</p>
      </div>

      <div class="btn-row" style="justify-content:space-between;margin-top:0;margin-bottom:16px;">
        <span class="btn-ghost btn btn-sm no-print" id="tk-prev">← Tháng trước</span>
        <span style="font-weight:600;align-self:center;">${esc(monthLabel(state.month))}</span>
        <span class="btn-ghost btn btn-sm no-print" id="tk-next">Tháng sau →</span>
      </div>
      <div class="btn-row no-print" style="justify-content:flex-end;margin-top:-4px;margin-bottom:16px;">
        <span class="btn-ghost btn btn-sm" id="tk-print">🖨️ In trang này</span>
      </div>

      ${state.loading ? `<div class="loading"><div class="spinner"></div></div>` : `
        <div class="section">
          <h3>A. Dòng tiền tháng</h3>
          <div class="source-grid">
            <div class="source-card"><div class="ic" style="font-size:16px;color:var(--accent);">${state.cashFlow.income.toLocaleString('vi-VN')}đ</div><div class="label">Tổng thu</div></div>
            <div class="source-card"><div class="ic" style="font-size:16px;color:var(--danger);">${state.cashFlow.expense.toLocaleString('vi-VN')}đ</div><div class="label">Tổng chi</div></div>
            <div class="source-card"><div class="ic" style="font-size:16px;">${savingsRate}%</div><div class="label">Tỷ lệ tiết kiệm</div></div>
            ${dti!=null ? `<div class="source-card"><div class="ic" style="font-size:16px;color:${dtiColor};">${dti}%</div><div class="label">Tỷ lệ nợ/thu nhập (DTI)</div></div>` : ''}
          </div>
          ${dti!=null && dti>=36 ? `<div class="hint-box" style="margin-top:12px;">DTI ${dti}% ${dti>=43?'ở mức đáng lo (≥43%)':'ở mức cần chú ý (36-43%)'} — ngân hàng thường coi trên 43% là rủi ro cao. Cân nhắc ưu tiên trả bớt nợ trước khi vay/mua thêm.</div>` : ''}
        </div>

        <div class="section">
          <h3>A1. Chi tiêu theo danh mục</h3>
          ${breakdownToggleHtml('expense', state.breakdownTab, expenseByCategory, expenseByDayRange, 'var(--danger)')}
        </div>

        <div class="section">
          <h3>B. Cân đối tài sản & tiêu sản</h3>
          ${state.networthCarriedForward ? `<div class="hint-box" style="margin-bottom:14px;">Số liệu dưới đây tự lấy từ tháng trước — chỉnh lại đúng số thật của tháng này rồi bấm "Lưu cân đối tháng này".</div>` : ''}
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
            <div>
              <div style="font-weight:600;font-size:13px;color:var(--accent);margin-bottom:8px;">🏦 Tài sản sinh lợi</div>
              ${ASSET_FIELDS.map(f=>`
                <label style="display:block;font-size:12.5px;color:var(--ink-soft);margin:10px 0 4px;">${esc(f.label)}</label>
                <input type="text" inputmode="numeric" data-networth="${f.key}" value="${esc(formatThousands(state.networth[f.key]))}" placeholder="0" style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-size:14px;background:#FDFCF8;color:var(--ink);">
              `).join('')}
            </div>
            <div>
              <div style="font-weight:600;font-size:13px;color:var(--danger);margin-bottom:8px;">🔴 Tiêu sản / Nợ</div>
              ${DEBT_FIELDS.map(f=>`
                <label style="display:block;font-size:12.5px;color:var(--ink-soft);margin:10px 0 4px;">${esc(f.label)}</label>
                <input type="text" inputmode="numeric" data-networth="${f.key}" value="${esc(formatThousands(state.networth[f.key]))}" placeholder="0" style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-size:14px;background:#FDFCF8;color:var(--ink);">
              `).join('')}
            </div>
          </div>

          <div class="hint-box" id="tk-networth-preview" style="margin-top:16px;">${networthPreviewHtml(totalAssets, totalDebts, netWorth)}</div>

          <button class="btn no-print" style="margin-top:14px;" id="tk-save-networth" ${state.savingNetworth?'disabled':''}>${state.savingNetworth?'Đang lưu…':'Lưu cân đối tháng này'}</button>
          <span class="no-print" id="tk-networth-saved" style="margin-left:10px;color:var(--accent);font-weight:600;">${state.savedNetworthMsg}</span>
          <div class="hint-box" style="margin-top:12px;">Lưu cân đối tháng này giúp cộng thêm điểm cho Trụ Thân Tâm Bản Thể ở <a href="#thiet-lap-nhanh" style="color:var(--accent);font-weight:600;">Điểm Nghiệp →</a> — bỏ trống tháng nào, Điểm Nghiệp tháng đó cũng bị kéo nhẹ xuống theo. Xem xu hướng riêng phần tiết kiệm/vàng/cổ phiếu ở <a href="#tich-luy" style="color:var(--accent);font-weight:600;">Tích Lũy →</a>, hoặc cả năm ở <a href="#tong-ket-nam" style="color:var(--accent);font-weight:600;">Tổng Kết Năm →</a>.</div>

          ${historyRows.length>1 ? `
            <div style="margin-top:20px;">
              <div style="font-family:'IBM Plex Mono',monospace;font-size:12px;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-soft);margin-bottom:8px;">Lịch sử Tài Sản Ròng</div>
              ${networthChartHtml(historyRows)}
              ${historyRows.slice().reverse().map(r=>`
                <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--line);font-size:13.5px;">
                  <span>${esc(r.month)}</span>
                  <b style="color:${r.net>=0?'var(--accent)':'var(--danger)'};">${r.net.toLocaleString('vi-VN')}đ</b>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>

        <div class="section">
          <h3>C. Bài học nhìn lại tháng qua</h3>
          <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:6px;">Khoản chi khiến bạn HỐI TIẾC nhất? Lần sau xử lý thế nào?</label>
          <textarea data-reflection="reflection_regret">${esc(state.reflection.reflection_regret)}</textarea>

          <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 6px;">Khoản chi/đầu tư XỨNG ĐÁNG nhất? Tại sao?</label>
          <textarea data-reflection="reflection_worth">${esc(state.reflection.reflection_worth)}</textarea>

          <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 6px;">Điều gì đã ngăn cản bạn tiết kiệm được nhiều hơn?</label>
          <textarea data-reflection="reflection_blocker">${esc(state.reflection.reflection_blocker)}</textarea>

          <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 6px;">Thói quen tài chính TỐT đã xây dựng được tháng này?</label>
          <textarea data-reflection="reflection_good_habit">${esc(state.reflection.reflection_good_habit)}</textarea>

          <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 6px;">Thói quen tài chính XẤU cần loại bỏ?</label>
          <textarea data-reflection="reflection_bad_habit">${esc(state.reflection.reflection_bad_habit)}</textarea>

          <div class="hint-box" style="margin-top:16px;">Muốn đặt mục tiêu cho tháng tới? Sang <a href="#muc-tieu" style="color:var(--accent);font-weight:600;">Mục Tiêu & Cam Kết →</a> — đặt mục tiêu là một nghi thức riêng, nên làm TRƯỚC khi bắt đầu ghi chép tháng mới, không gộp chung với việc nhìn lại ở đây.</div>

          <button class="btn no-print" style="margin-top:16px;" id="tk-save-reflection" ${state.savingReflection?'disabled':''}>${state.savingReflection?'Đang lưu…':'Lưu bài học nhìn lại'}</button>
          <span class="no-print" id="tk-reflection-saved" style="margin-left:10px;color:var(--accent);font-weight:600;">${state.savedReflectionMsg}</span>
        </div>
      `}
    `;
  }

  function networthPreviewHtml(totalAssets, totalDebts, netWorth){
    return `Tổng tài sản: <b>${totalAssets.toLocaleString('vi-VN')}đ</b> · Tổng tiêu sản: <b>${totalDebts.toLocaleString('vi-VN')}đ</b> · TÀI SẢN RÒNG: <b style="color:${netWorth>=0?'var(--accent)':'var(--danger)'};font-size:15px;">${netWorth.toLocaleString('vi-VN')}đ</b>`;
  }

  function recomputeNetworthPreview(){
    const totalAssets = sumFields(state.networth, ASSET_FIELDS);
    const totalDebts = sumFields(state.networth, DEBT_FIELDS);
    const el = container.querySelector('#tk-networth-preview');
    if(el) el.innerHTML = networthPreviewHtml(totalAssets, totalDebts, totalAssets-totalDebts);
  }

  function bind(){
    const tourBtn = container.querySelector('#tk-start-tour');
    if(tourBtn) tourBtn.onclick = ()=>window.startPageTour(TOUR_STEPS);

    const printBtn = container.querySelector('#tk-print');
    if(printBtn) printBtn.onclick = ()=>window.print();
    container.querySelectorAll('[data-breakdown-tab]').forEach(el=>{
      el.onclick = ()=>{
        const [, tab] = el.getAttribute('data-breakdown-tab').split(':');
        state.breakdownTab = tab;
        draw();
      };
    });
    const prevEl = container.querySelector('#tk-prev');
    if(prevEl) prevEl.onclick = ()=>{
      const [y,mo] = state.month.split('-').map(Number);
      const d = new Date(y, mo-2, 1);
      state.month = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
      load();
    };
    const nextEl = container.querySelector('#tk-next');
    if(nextEl) nextEl.onclick = ()=>{ state.month = nextMonthKey(state.month); load(); };

    container.querySelectorAll('[data-networth]').forEach(el=>{
      el.oninput = ()=>{
        el.value = formatThousands(el.value);
        state.networth[el.getAttribute('data-networth')] = onlyDigits(el.value);
        recomputeNetworthPreview(); persistDraft();
      };
    });
    const saveNetworthBtn = container.querySelector('#tk-save-networth');
    if(saveNetworthBtn) saveNetworthBtn.onclick = saveNetworth;

    container.querySelectorAll('[data-reflection]').forEach(el=>{
      el.oninput = ()=>{ state.reflection[el.getAttribute('data-reflection')] = el.value; persistDraft(); };
    });
    const saveReflectionBtn = container.querySelector('#tk-save-reflection');
    if(saveReflectionBtn) saveReflectionBtn.onclick = saveReflection;
  }

  load();
}

window.Modules = window.Modules || {};
window.Modules['tong-ket-thang'] = { title:'Tổng Kết Tháng', render };
})();
