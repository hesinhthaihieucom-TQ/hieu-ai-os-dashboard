(function(){
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
// với việc nhìn lại cuối tháng.
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
    networthHistory: [],
    reflection: { ...EMPTY_REFLECTION },
    budgetActuals: {},
    budgetForm: {},
    totalMinPayments: 0,
    savingNetworth: false,
    savingReflection: false,
    savingBudget: false,
    savedNetworthMsg: '',
    savedReflectionMsg: '',
    savedBudgetMsg: '',
  };

  function draw(){ container.innerHTML = html(); bind(); }
  draw();

  async function load(){
    state.loading = true; draw();
    const monthStart = `${state.month}-01`;
    const monthEndExclusive = `${nextMonthKey(state.month)}-01`;
    const [entriesRes, snapshotRes, historyRes, reflectionRes, budgetsRes, debtsRes] = await Promise.all([
      ctx.supabase.from('tc_finance_entries').select('type, amount, category_label')
        .eq('user_id', ctx.user.id).gte('entry_date', monthStart).lt('entry_date', monthEndExclusive),
      ctx.supabase.from('tc_networth_snapshots').select('*')
        .eq('user_id', ctx.user.id).eq('snapshot_month', state.month).maybeSingle(),
      ctx.supabase.from('tc_networth_snapshots').select('*')
        .eq('user_id', ctx.user.id).order('snapshot_month', { ascending:true }),
      ctx.supabase.from('tc_monthly_reflections').select('*')
        .eq('user_id', ctx.user.id).eq('month', state.month).maybeSingle(),
      ctx.supabase.from('tc_budgets').select('*')
        .eq('user_id', ctx.user.id).eq('month', state.month),
      ctx.supabase.from('tc_debts').select('minimum_payment')
        .eq('user_id', ctx.user.id).eq('is_paid_off', false),
    ]);
    const entries = entriesRes.data || [];
    state.cashFlow = {
      income: entries.filter(e=>e.type==='income').reduce((s,e)=>s+Number(e.amount),0),
      expense: entries.filter(e=>e.type==='expense').reduce((s,e)=>s+Number(e.amount),0),
    };
    state.budgetActuals = {};
    entries.filter(e=>e.type==='expense').forEach(e=>{
      const key = e.category_label || 'Khác';
      state.budgetActuals[key] = (state.budgetActuals[key]||0) + Number(e.amount);
    });
    state.budgetForm = {};
    (budgetsRes.data||[]).forEach(b=>{ state.budgetForm[b.category_label] = String(b.limit_amount); });
    state.totalMinPayments = (debtsRes.data||[]).reduce((s,d)=>s+Number(d.minimum_payment||0),0);
    const snap = snapshotRes.data;
    state.networth = snap
      ? Object.fromEntries([...ASSET_FIELDS, ...DEBT_FIELDS].map(f=>[f.key, snap[f.key]!=null ? String(snap[f.key]) : '']))
      : { ...EMPTY_NETWORTH };
    state.networthHistory = historyRes.data || [];
    const refl = reflectionRes.data;
    state.reflection = refl
      ? Object.fromEntries(Object.keys(EMPTY_REFLECTION).map(k=>[k, refl[k]!=null ? String(refl[k]) : '']))
      : { ...EMPTY_REFLECTION };
    state.loading = false;
    draw();
  }

  async function saveBudget(){
    state.savingBudget = true; draw();
    const rows = Object.keys(state.budgetForm)
      .filter(key => key.trim() && Number(state.budgetForm[key]) > 0)
      .map(key => ({ user_id: ctx.user.id, month: state.month, category_label: key, limit_amount: Number(state.budgetForm[key]) }));
    if(rows.length > 0){
      await ctx.supabase.from('tc_budgets').upsert(rows, { onConflict:'user_id,month,category_label' });
    }
    state.savingBudget = false;
    state.savedBudgetMsg = 'Đã lưu ✓';
    await load();
    setTimeout(()=>{ state.savedBudgetMsg=''; const el = container.querySelector('#tk-budget-saved'); if(el) el.textContent=''; }, 1800);
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

    const budgetCategoryKeys = [...new Set([...Object.keys(state.budgetActuals), ...Object.keys(state.budgetForm)])]
      .filter(k => (state.budgetActuals[k]||0) > 0 || Number(state.budgetForm[k]) > 0)
      .sort((a,b)=> (state.budgetActuals[b]||0) - (state.budgetActuals[a]||0));

    return `
      <div class="page-head">
        <h1>Tổng Kết Tháng</h1>
        <p>Cuối tháng, tính Tài Sản Ròng = Tổng Tài Sản − Tổng Tiêu Sản/Nợ. Đây là con số QUAN TRỌNG NHẤT.</p>
      </div>

      <div class="btn-row" style="justify-content:space-between;margin-top:0;margin-bottom:16px;">
        <span class="btn-ghost btn btn-sm" id="tk-prev">← Tháng trước</span>
        <span style="font-weight:600;align-self:center;">${esc(monthLabel(state.month))}</span>
        <span class="btn-ghost btn btn-sm" id="tk-next">Tháng sau →</span>
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
          <h3>A2. Ngân sách chi tiêu tháng này</h3>
          ${budgetCategoryKeys.length===0 ? `<div style="color:var(--ink-soft);font-size:14px;">Chưa có chi tiêu hoặc hạn mức nào tháng này.</div>` : budgetCategoryKeys.map(key=>{
            const actual = state.budgetActuals[key]||0;
            const limit = Number(state.budgetForm[key])||0;
            const pct = limit>0 ? Math.min(100, Math.round(actual/limit*100)) : 0;
            const over = limit>0 && actual>limit;
            return `
              <div style="margin-bottom:14px;">
                <div style="display:flex;justify-content:space-between;font-size:13.5px;margin-bottom:4px;">
                  <span>${esc(key)}</span>
                  <span>${actual.toLocaleString('vi-VN')}đ${limit>0?` / ${limit.toLocaleString('vi-VN')}đ`:''}</span>
                </div>
                <div style="display:flex;align-items:center;gap:10px;">
                  <div style="flex:1;height:8px;border-radius:999px;background:var(--line);overflow:hidden;">
                    <div style="height:100%;width:${limit>0?pct:0}%;background:${over?'var(--danger)':'var(--accent)'};border-radius:999px;"></div>
                  </div>
                  <input type="number" min="0" data-budget="${esc(key)}" value="${esc(state.budgetForm[key]||'')}" placeholder="Hạn mức" style="width:110px;padding:6px 8px;border:1px solid var(--line);border-radius:8px;font-size:12.5px;background:#FDFCF8;color:var(--ink);">
                </div>
                ${over?`<div style="font-size:11.5px;color:var(--danger);margin-top:2px;">Đã vượt hạn mức ${(actual-limit).toLocaleString('vi-VN')}đ</div>`:''}
              </div>
            `;
          }).join('')}
          <div style="display:flex;gap:8px;align-items:center;margin-top:10px;">
            <input type="text" id="tk-new-budget-category" list="tk-budget-category-datalist" placeholder="+ Thêm danh mục ngân sách..." style="flex:1;padding:8px 10px;border:1px solid var(--line);border-radius:8px;font-size:13px;background:#FDFCF8;color:var(--ink);">
            <datalist id="tk-budget-category-datalist">
              ${SUGGESTED_EXPENSE_CATEGORIES.map(c=>`<option value="${esc(c)}">`).join('')}
            </datalist>
            <input type="number" min="0" id="tk-new-budget-amount" placeholder="Hạn mức" style="width:110px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;font-size:13px;background:#FDFCF8;color:var(--ink);">
            <span class="btn-ghost btn btn-sm" id="tk-add-budget-category">+ Thêm</span>
          </div>
          <button class="btn btn-sm" style="margin-top:14px;" id="tk-save-budget" ${state.savingBudget?'disabled':''}>${state.savingBudget?'Đang lưu…':'Lưu ngân sách'}</button>
          <span id="tk-budget-saved" style="margin-left:10px;color:var(--accent);font-weight:600;">${state.savedBudgetMsg}</span>
        </div>

        <div class="section">
          <h3>B. Cân đối tài sản & tiêu sản</h3>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
            <div>
              <div style="font-weight:600;font-size:13px;color:var(--accent);margin-bottom:8px;">🏦 Tài sản sinh lợi</div>
              ${ASSET_FIELDS.map(f=>`
                <label style="display:block;font-size:12.5px;color:var(--ink-soft);margin:10px 0 4px;">${esc(f.label)}</label>
                <input type="number" min="0" data-networth="${f.key}" value="${esc(state.networth[f.key])}" placeholder="0" style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-size:14px;background:#FDFCF8;color:var(--ink);">
              `).join('')}
            </div>
            <div>
              <div style="font-weight:600;font-size:13px;color:var(--danger);margin-bottom:8px;">🔴 Tiêu sản / Nợ</div>
              ${DEBT_FIELDS.map(f=>`
                <label style="display:block;font-size:12.5px;color:var(--ink-soft);margin:10px 0 4px;">${esc(f.label)}</label>
                <input type="number" min="0" data-networth="${f.key}" value="${esc(state.networth[f.key])}" placeholder="0" style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-size:14px;background:#FDFCF8;color:var(--ink);">
              `).join('')}
            </div>
          </div>

          <div class="hint-box" id="tk-networth-preview" style="margin-top:16px;">${networthPreviewHtml(totalAssets, totalDebts, netWorth)}</div>

          <button class="btn" style="margin-top:14px;" id="tk-save-networth" ${state.savingNetworth?'disabled':''}>${state.savingNetworth?'Đang lưu…':'Lưu cân đối tháng này'}</button>
          <span id="tk-networth-saved" style="margin-left:10px;color:var(--accent);font-weight:600;">${state.savedNetworthMsg}</span>

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

          <button class="btn" style="margin-top:16px;" id="tk-save-reflection" ${state.savingReflection?'disabled':''}>${state.savingReflection?'Đang lưu…':'Lưu bài học nhìn lại'}</button>
          <span id="tk-reflection-saved" style="margin-left:10px;color:var(--accent);font-weight:600;">${state.savedReflectionMsg}</span>
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
      el.oninput = ()=>{ state.networth[el.getAttribute('data-networth')] = el.value; recomputeNetworthPreview(); };
    });
    const saveNetworthBtn = container.querySelector('#tk-save-networth');
    if(saveNetworthBtn) saveNetworthBtn.onclick = saveNetworth;

    container.querySelectorAll('[data-budget]').forEach(el=>{
      el.oninput = ()=>{ state.budgetForm[el.getAttribute('data-budget')] = el.value; };
    });
    const addBudgetCategoryBtn = container.querySelector('#tk-add-budget-category');
    if(addBudgetCategoryBtn) addBudgetCategoryBtn.onclick = ()=>{
      const nameEl = container.querySelector('#tk-new-budget-category');
      const amountEl = container.querySelector('#tk-new-budget-amount');
      const name = nameEl.value.trim();
      if(!name || !Number(amountEl.value)) return;
      state.budgetActuals[name] = state.budgetActuals[name] || 0;
      state.budgetForm[name] = amountEl.value;
      draw();
    };
    const saveBudgetBtn = container.querySelector('#tk-save-budget');
    if(saveBudgetBtn) saveBudgetBtn.onclick = saveBudget;

    container.querySelectorAll('[data-reflection]').forEach(el=>{
      el.oninput = ()=>{ state.reflection[el.getAttribute('data-reflection')] = el.value; };
    });
    const saveReflectionBtn = container.querySelector('#tk-save-reflection');
    if(saveReflectionBtn) saveReflectionBtn.onclick = saveReflection;
  }

  load();
}

window.Modules = window.Modules || {};
window.Modules['tong-ket-thang'] = { title:'Tổng Kết Tháng', render };
})();
