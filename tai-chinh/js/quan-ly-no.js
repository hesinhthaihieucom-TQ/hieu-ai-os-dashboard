(function(){
const MAX_MONTHS = 600; // trần mô phỏng (50 năm) — vượt mốc này coi như "chưa xác định" (trả tối
// thiểu + dư không đủ bù lãi, nợ sẽ không bao giờ hết theo cách trả hiện tại).

// Mô phỏng trả nợ theo tháng: mỗi tháng cộng lãi rồi trả tối thiểu mọi khoản + dồn hết phần dư
// vào ĐÚNG 1 khoản đang ưu tiên (nhỏ nhất = snowball, lãi cao nhất = avalanche), khoản đó hết thì
// dồn tiếp sang khoản kế (hiệu ứng "lăn tuyết"). Trả về số tháng hết nợ + tổng lãi phải trả.
function simulateStrategy(debts, extraPerMonth, strategy){
  let working = debts.map(d => ({ balance: Number(d.current_balance)||0, rate: Number(d.interest_rate)||0, minPayment: Number(d.minimum_payment)||0 }))
    .filter(d => d.balance > 0);
  if(working.length === 0) return { months: 0, totalInterest: 0, converged: true };

  let months = 0, totalInterest = 0;
  while(working.length > 0 && months < MAX_MONTHS){
    months++;
    working.forEach(d => {
      const interest = d.balance * (d.rate/100) / 12;
      totalInterest += interest;
      d.balance += interest;
    });
    working.sort((a,b) => strategy === 'snowball' ? a.balance - b.balance : b.rate - a.rate);
    working.forEach(d => { d.balance = Math.max(0, d.balance - Math.min(d.minPayment, d.balance)); });
    let pool = Number(extraPerMonth) || 0;
    for(let i=0; i<working.length && pool > 0; i++){
      const pay = Math.min(pool, working[i].balance);
      working[i].balance -= pay;
      pool -= pay;
    }
    working = working.filter(d => d.balance > 0.5);
  }
  const converged = working.length === 0;
  return { months: converged ? months : null, totalInterest: converged ? totalInterest : null, converged };
}

function render(container, ctx){
  const state = {
    loading: true,
    emergencyFund: { target_amount:'', current_amount:'' },
    debts: [],
    newDebt: { creditor_name:'', current_balance:'', interest_rate:'', minimum_payment:'', due_day:'' },
    editingId: null,
    editForm: {},
    paymentOpenId: null,
    paymentForm: { amount:'', date: isoDate(new Date()) },
    gratitudeOpenId: null,
    gratitudeForm: '',
    extraPerMonth: '',
    savingEmergency: false,
    savingDebt: false,
    error: null,
  };
  const DRAFT_KEY = 'quan-ly-no-new-debt';
  function persistDraft(){ saveModuleDraft(ctx, DRAFT_KEY, { newDebt: state.newDebt }); }

  function draw(){ container.innerHTML = html(); bind(); }
  draw();

  async function load(){
    state.loading = true; draw();
    const [efRes, debtsRes] = await Promise.all([
      ctx.supabase.from('tc_emergency_fund').select('*').eq('user_id', ctx.user.id).maybeSingle(),
      ctx.supabase.from('tc_debts').select('*').eq('user_id', ctx.user.id).eq('is_paid_off', false).order('created_at', { ascending:true }),
    ]);
    state.emergencyFund = efRes.data
      ? { target_amount: String(efRes.data.target_amount||0), current_amount: String(efRes.data.current_amount||0) }
      : { target_amount:'', current_amount:'' };
    state.debts = debtsRes.data || [];
    // Đang gõ dở form "+ Thêm khoản nợ" mà lỡ rời trang thì không được mất (góp ý Quỳnh 2026-08-22).
    const draft = await loadModuleDraft(ctx, DRAFT_KEY);
    if(draft && draft.newDebt) Object.assign(state.newDebt, draft.newDebt);
    state.loading = false;
    draw();
  }

  async function saveEmergencyFund(){
    state.savingEmergency = true; draw();
    await ctx.supabase.from('tc_emergency_fund').upsert({
      user_id: ctx.user.id,
      target_amount: Number(state.emergencyFund.target_amount)||0,
      current_amount: Number(state.emergencyFund.current_amount)||0,
      updated_at: new Date().toISOString(),
    }, { onConflict:'user_id' });
    state.savingEmergency = false;
    draw();
  }

  async function addDebt(){
    const d = state.newDebt;
    if(!d.creditor_name.trim()){ state.error = 'Vui lòng nhập tên chủ nợ/khoản vay.'; draw(); return; }
    if(!d.current_balance || Number(d.current_balance) <= 0){ state.error = 'Vui lòng nhập số dư nợ hợp lệ.'; draw(); return; }
    state.savingDebt = true; state.error = null; draw();
    const { error } = await ctx.supabase.from('tc_debts').insert({
      user_id: ctx.user.id,
      creditor_name: d.creditor_name.trim(),
      current_balance: Number(d.current_balance)||0,
      interest_rate: Number(d.interest_rate)||0,
      minimum_payment: Number(d.minimum_payment)||0,
      due_day: d.due_day ? Number(d.due_day) : null,
    });
    state.savingDebt = false;
    if(error){ state.error = 'Không lưu được — thử lại. (' + error.message + ')'; draw(); return; }
    state.newDebt = { creditor_name:'', current_balance:'', interest_rate:'', minimum_payment:'', due_day:'' };
    await clearModuleDraft(ctx, DRAFT_KEY);
    await load();
  }

  async function saveEdit(id){
    const f = state.editForm;
    await ctx.supabase.from('tc_debts').update({
      creditor_name: f.creditor_name.trim(),
      current_balance: Number(f.current_balance)||0,
      interest_rate: Number(f.interest_rate)||0,
      minimum_payment: Number(f.minimum_payment)||0,
      due_day: f.due_day ? Number(f.due_day) : null,
    }).eq('id', id);
    state.editingId = null;
    await load();
  }

  async function deleteDebt(id){
    const ok = await confirmModal('Xoá khoản nợ này? Lịch sử thanh toán liên quan cũng sẽ bị xoá.');
    if(!ok) return;
    await ctx.supabase.from('tc_debts').delete().eq('id', id);
    await load();
  }

  async function markPaidOff(id){
    const ok = await confirmModal('Đánh dấu khoản nợ này đã trả hết? 🎉');
    if(!ok) return;
    await ctx.supabase.from('tc_debts').update({ current_balance:0, is_paid_off:true }).eq('id', id);
    await load();
  }

  async function submitPayment(debt){
    const amount = Number(state.paymentForm.amount);
    if(!amount || amount <= 0){ state.error = 'Vui lòng nhập số tiền thanh toán hợp lệ.'; draw(); return; }
    const newBalance = Math.max(0, Number(debt.current_balance) - amount);
    await Promise.all([
      ctx.supabase.from('tc_debt_payments').insert({ user_id: ctx.user.id, debt_id: debt.id, payment_date: state.paymentForm.date, amount }),
      ctx.supabase.from('tc_debts').update({ current_balance: newBalance }).eq('id', debt.id),
      ctx.supabase.from('tc_finance_entries').insert({
        user_id: ctx.user.id, entry_date: state.paymentForm.date, type:'expense', amount,
        description: `Trả nợ - ${debt.creditor_name}`, category_label:'Trả nợ', vibe:'gray',
      }),
    ]);
    state.paymentOpenId = null;
    state.paymentForm = { amount:'', date: isoDate(new Date()) };
    state.error = null;
    await load();
  }

  async function submitGratitude(debtId){
    await ctx.supabase.from('tc_debts').update({ gratitude_note: state.gratitudeForm.trim() }).eq('id', debtId);
    state.gratitudeOpenId = null;
    state.gratitudeForm = '';
    await load();
  }

  function totalDebt(){ return state.debts.reduce((s,d)=>s+Number(d.current_balance),0); }
  function monthlyInterestCost(){ return state.debts.reduce((s,d)=>s + Number(d.current_balance) * (Number(d.interest_rate)/100) / 12, 0); }

  function strategyResultsHtml(){
    if(state.debts.length === 0) return '';
    const extra = Number(state.extraPerMonth) || 0;
    const snowball = simulateStrategy(state.debts, extra, 'snowball');
    const avalanche = simulateStrategy(state.debts, extra, 'avalanche');
    function fmtResult(r){
      if(!r.converged) return `<span style="color:var(--danger);">Chưa xác định — số tiền trả thêm chưa đủ bù lãi, nợ sẽ không giảm.</span>`;
      const years = Math.floor(r.months/12), rem = r.months%12;
      const timeLabel = years>0 ? `${years} năm ${rem} tháng` : `${rem} tháng`;
      return `Hết nợ sau <b>${timeLabel}</b> · Tổng lãi phải trả: <b style="color:var(--danger);">${Math.round(r.totalInterest).toLocaleString('vi-VN')}đ</b>`;
    }
    return `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px;">
        <div class="source-card" style="text-align:left;padding:16px;">
          <div style="font-weight:700;color:var(--ink);margin-bottom:6px;">❄️ Đà Thắng Nhỏ (nợ nhỏ nhất trước)</div>
          <div style="font-size:13px;line-height:1.6;">${fmtResult(snowball)}</div>
        </div>
        <div class="source-card" style="text-align:left;padding:16px;">
          <div style="font-weight:700;color:var(--ink);margin-bottom:6px;">🏔️ Diệt Lãi Cao (lãi cao nhất trước)</div>
          <div style="font-size:13px;line-height:1.6;">${fmtResult(avalanche)}</div>
        </div>
      </div>
      <div class="hint-box" style="margin-top:12px;">Diệt Lãi Cao luôn tiết kiệm tiền lãi bằng hoặc nhiều hơn Đà Thắng Nhỏ — nhưng Đà Thắng Nhỏ tạo cảm giác chiến thắng nhanh (trả hết 1 khoản nhỏ sớm) nên nhiều người kiên trì hơn. Chọn theo tính cách của bạn, không có cách nào "sai".</div>
    `;
  }

  function debtFormFields(d, prefix){
    return `
      <label style="display:block;font-size:12.5px;color:var(--ink-soft);margin:10px 0 4px;">Tên Ân Nhân Hỗ Trợ Vốn (chủ nợ / khoản vay)</label>
      <input type="text" data-${prefix}="creditor_name" value="${esc(d.creditor_name)}" placeholder="VD: Thẻ tín dụng Vietcombank" style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-size:14px;background:#FDFCF8;color:var(--ink);">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div>
          <label style="display:block;font-size:12.5px;color:var(--ink-soft);margin:10px 0 4px;">Nguồn Lực Đã Đón Nhận — số dư hiện tại (đ)</label>
          <input type="number" min="0" data-${prefix}="current_balance" value="${esc(d.current_balance)}" style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-size:14px;background:#FDFCF8;color:var(--ink);">
        </div>
        <div>
          <label style="display:block;font-size:12.5px;color:var(--ink-soft);margin:10px 0 4px;">Lãi suất (%/năm)</label>
          <input type="number" min="0" data-${prefix}="interest_rate" value="${esc(d.interest_rate)}" style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-size:14px;background:#FDFCF8;color:var(--ink);">
        </div>
        <div>
          <label style="display:block;font-size:12.5px;color:var(--ink-soft);margin:10px 0 4px;">Trả tối thiểu/tháng (đ)</label>
          <input type="number" min="0" data-${prefix}="minimum_payment" value="${esc(d.minimum_payment)}" style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-size:14px;background:#FDFCF8;color:var(--ink);">
        </div>
        <div>
          <label style="display:block;font-size:12.5px;color:var(--ink-soft);margin:10px 0 4px;">Ngày Cam Kết Tri Ân (ngày trong tháng)</label>
          <input type="number" min="1" max="31" data-${prefix}="due_day" value="${esc(d.due_day)}" placeholder="VD: 15" style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-size:14px;background:#FDFCF8;color:var(--ink);">
        </div>
      </div>
    `;
  }

  function debtCardHtml(d){
    if(state.editingId === d.id){
      return `
        <div class="card" style="margin-bottom:12px;">
          ${debtFormFields(state.editForm, 'edit')}
          <div class="btn-row" style="justify-content:flex-start;margin-top:14px;">
            <button class="btn btn-sm" data-save-edit="${d.id}">Lưu</button>
            <span class="btn-ghost btn btn-sm" data-cancel-edit="1">Huỷ</span>
          </div>
        </div>
      `;
    }
    const monthlyInterest = Number(d.current_balance) * (Number(d.interest_rate)/100) / 12;
    return `
      <div class="card" style="margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
          <div>
            <div style="font-weight:700;font-size:15.5px;">${esc(d.creditor_name)}</div>
            <div style="font-size:12.5px;color:var(--ink-soft);margin-top:2px;">Lãi ${esc(d.interest_rate)}%/năm · Tối thiểu ${Number(d.minimum_payment).toLocaleString('vi-VN')}đ/tháng${d.due_day?` · Cam kết tri ân ngày ${esc(d.due_day)}`:''}</div>
            <div style="font-size:11.5px;color:var(--ink-soft);margin-top:2px;">~${Math.round(monthlyInterest).toLocaleString('vi-VN')}đ tiền lãi/tháng</div>
          </div>
          <div style="font-size:19px;font-weight:700;color:var(--danger);white-space:nowrap;">${Number(d.current_balance).toLocaleString('vi-VN')}đ</div>
        </div>
        ${d.gratitude_note ? `<div class="hint-box" style="margin-top:12px;">💛 ${esc(d.gratitude_note)}</div>` : ''}
        <div class="btn-row" style="justify-content:flex-start;margin-top:14px;">
          <span class="btn btn-sm" data-toggle-payment="${d.id}">💰 Ghi nhận thanh toán</span>
          <span class="btn-ghost btn btn-sm" data-toggle-gratitude="${d.id}">💛 Gửi lời tri ân ngầm</span>
          <span class="btn-ghost btn btn-sm" data-edit="${d.id}">Sửa</span>
          <span class="btn-ghost btn btn-sm" data-paidoff="${d.id}">Đã trả hết</span>
          <span class="btn-ghost btn btn-sm" data-delete="${d.id}" style="color:var(--danger);">Xoá</span>
        </div>
        ${state.gratitudeOpenId === d.id ? `
          <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--line);">
            <label style="display:block;font-size:12.5px;color:var(--ink-soft);margin-bottom:4px;">Lời cảm ơn ngầm gửi tới ${esc(d.creditor_name)} vì đã tin tưởng giao nguồn lực cho bạn</label>
            <textarea id="gratitude-text" placeholder="VD: Cảm ơn vì đã tin tưởng và đồng hành cùng mình lúc khó khăn...">${esc(state.gratitudeForm)}</textarea>
            <button class="btn btn-sm" style="margin-top:10px;" data-submit-gratitude="${d.id}">Lưu lời tri ân</button>
          </div>
        ` : ''}
        ${state.paymentOpenId === d.id ? `
          <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--line);">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div>
                <label style="display:block;font-size:12.5px;color:var(--ink-soft);margin-bottom:4px;">Số tiền trả (đ)</label>
                <input type="number" min="0" id="pay-amount" value="${esc(state.paymentForm.amount)}" style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-size:14px;background:#FDFCF8;color:var(--ink);">
              </div>
              <div>
                <label style="display:block;font-size:12.5px;color:var(--ink-soft);margin-bottom:4px;">Ngày trả</label>
                <input type="date" id="pay-date" value="${esc(state.paymentForm.date)}" style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-size:14px;background:#FDFCF8;color:var(--ink);">
              </div>
            </div>
            ${state.error ? `<div class="error-box">${esc(state.error)}</div>` : ''}
            <button class="btn btn-sm" style="margin-top:12px;" data-submit-payment="${d.id}">Xác nhận đã trả</button>
          </div>
        ` : ''}
      </div>
    `;
  }

  function html(){
    const ef = state.emergencyFund;
    const efTarget = Number(ef.target_amount)||0, efCurrent = Number(ef.current_amount)||0;
    const efPct = efTarget>0 ? Math.min(100, Math.round(efCurrent/efTarget*100)) : 0;

    return `
      <div class="page-head">
        <h1>Quản Lý Nợ</h1>
        <p>Có quỹ khẩn cấp nhỏ trước, rồi dồn lực trả nợ theo đúng thứ tự — tránh 1 sự cố bất ngờ lại đẻ ra khoản nợ mới.</p>
      </div>

      ${state.loading ? `<div class="loading"><div class="spinner"></div></div>` : `
        <div class="section">
          <h3>A. Quỹ Khẩn Cấp</h3>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div>
              <label style="display:block;font-size:12.5px;color:var(--ink-soft);margin-bottom:4px;">Mục tiêu (đ)</label>
              <input type="number" min="0" id="ef-target" value="${esc(ef.target_amount)}" placeholder="VD: 15.000.000" style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-size:14px;background:#FDFCF8;color:var(--ink);">
            </div>
            <div>
              <label style="display:block;font-size:12.5px;color:var(--ink-soft);margin-bottom:4px;">Hiện có (đ)</label>
              <input type="number" min="0" id="ef-current" value="${esc(ef.current_amount)}" style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-size:14px;background:#FDFCF8;color:var(--ink);">
            </div>
          </div>
          <div style="margin-top:14px;height:10px;border-radius:999px;background:var(--line);overflow:hidden;">
            <div style="height:100%;width:${efPct}%;background:var(--accent);border-radius:999px;"></div>
          </div>
          <div style="margin-top:6px;font-size:12.5px;color:var(--ink-soft);">${efPct}% mục tiêu${efTarget===0?' — đặt mục tiêu trước (thường 10-20 triệu để bắt đầu, không cần đủ 3-6 tháng chi phí ngay khi đang nợ).':''}</div>
          <button class="btn btn-sm" style="margin-top:14px;" id="ef-save" ${state.savingEmergency?'disabled':''}>${state.savingEmergency?'Đang lưu…':'Lưu quỹ khẩn cấp'}</button>
        </div>

        <div class="section">
          <h3>${glossaryWrap('B. Các khoản nợ', 'danh_xung_tri_an', 'no_xanh', 'no_do')}</h3>
          ${state.debts.length>0 ? `
            <div class="source-grid" style="margin-bottom:16px;">
              <div class="source-card"><div class="ic" style="font-size:17px;color:var(--danger);">${totalDebt().toLocaleString('vi-VN')}đ</div><div class="label">Tổng nợ hiện tại</div></div>
              <div class="source-card"><div class="ic" style="font-size:17px;color:var(--danger);">${Math.round(monthlyInterestCost()).toLocaleString('vi-VN')}đ</div><div class="label">Ước tính lãi mất mỗi tháng</div></div>
            </div>
          ` : `<div style="color:var(--ink-soft);font-size:14px;margin-bottom:16px;">Chưa có khoản nợ nào được ghi nhận 🎉</div>`}

          ${state.debts.map(debtCardHtml).join('')}

          <div class="card" style="background:var(--accent-soft);">
            <div style="font-weight:600;font-size:13px;color:var(--ink-soft);margin-bottom:4px;">+ Thêm khoản nợ mới</div>
            ${debtFormFields(state.newDebt, 'new')}
            ${state.error ? `<div class="error-box">${esc(state.error)}</div>` : ''}
            <button class="btn btn-sm" style="margin-top:14px;" id="add-debt" ${state.savingDebt?'disabled':''}>${state.savingDebt?'Đang lưu…':'+ Thêm khoản nợ'}</button>
          </div>
        </div>

        ${state.debts.length>0 ? `
          <div class="section">
            <h3>C. Chiến lược trả nợ</h3>
            <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:6px;">Số tiền dư ra có thể trả THÊM mỗi tháng (ngoài mức tối thiểu)</label>
            <input type="number" min="0" id="extra-payment" value="${esc(state.extraPerMonth)}" placeholder="0" style="width:100%;padding:12px 14px;border:1px solid var(--line);border-radius:10px;font-size:14.5px;background:#FDFCF8;color:var(--ink);">
            <div id="strategy-results">${strategyResultsHtml()}</div>
          </div>
        ` : ''}
      `}
    `;
  }

  function readDebtForm(prefix, target){
    container.querySelectorAll(`[data-${prefix}]`).forEach(el=>{
      target[el.getAttribute(`data-${prefix}`)] = el.value;
    });
  }

  function bind(){
    const efTargetEl = container.querySelector('#ef-target');
    if(efTargetEl) efTargetEl.oninput = (e)=>{ state.emergencyFund.target_amount = e.target.value; };
    const efCurrentEl = container.querySelector('#ef-current');
    if(efCurrentEl) efCurrentEl.oninput = (e)=>{ state.emergencyFund.current_amount = e.target.value; };
    const efSaveEl = container.querySelector('#ef-save');
    if(efSaveEl) efSaveEl.onclick = saveEmergencyFund;

    container.querySelectorAll('[data-new]').forEach(el=>{
      el.oninput = ()=>{ state.newDebt[el.getAttribute('data-new')] = el.value; persistDraft(); };
    });
    const addBtn = container.querySelector('#add-debt');
    if(addBtn) addBtn.onclick = addDebt;

    container.querySelectorAll('[data-edit]').forEach(el=>{
      el.onclick = ()=>{
        const d = state.debts.find(x=>x.id===el.getAttribute('data-edit'));
        state.editingId = d.id;
        state.editForm = { creditor_name:d.creditor_name, current_balance:String(d.current_balance), interest_rate:String(d.interest_rate), minimum_payment:String(d.minimum_payment), due_day: d.due_day?String(d.due_day):'' };
        draw();
      };
    });
    const cancelEditEl = container.querySelector('[data-cancel-edit]');
    if(cancelEditEl) cancelEditEl.onclick = ()=>{ state.editingId = null; draw(); };
    container.querySelectorAll('[data-save-edit]').forEach(el=>{
      el.onclick = ()=>{ readDebtForm('edit', state.editForm); saveEdit(el.getAttribute('data-save-edit')); };
    });

    container.querySelectorAll('[data-delete]').forEach(el=>{
      el.onclick = ()=>{ deleteDebt(el.getAttribute('data-delete')); };
    });
    container.querySelectorAll('[data-paidoff]').forEach(el=>{
      el.onclick = ()=>{ markPaidOff(el.getAttribute('data-paidoff')); };
    });
    container.querySelectorAll('[data-toggle-payment]').forEach(el=>{
      el.onclick = ()=>{
        const id = el.getAttribute('data-toggle-payment');
        state.paymentOpenId = state.paymentOpenId === id ? null : id;
        state.paymentForm = { amount:'', date: isoDate(new Date()) };
        state.error = null;
        draw();
      };
    });
    container.querySelectorAll('[data-toggle-gratitude]').forEach(el=>{
      el.onclick = ()=>{
        const id = el.getAttribute('data-toggle-gratitude');
        const d = state.debts.find(x=>x.id===id);
        state.gratitudeOpenId = state.gratitudeOpenId === id ? null : id;
        state.gratitudeForm = (d && d.gratitude_note) || '';
        draw();
      };
    });
    const gratitudeTextEl = container.querySelector('#gratitude-text');
    if(gratitudeTextEl) gratitudeTextEl.oninput = (e)=>{ state.gratitudeForm = e.target.value; };
    container.querySelectorAll('[data-submit-gratitude]').forEach(el=>{
      el.onclick = ()=>{ submitGratitude(el.getAttribute('data-submit-gratitude')); };
    });
    const payAmountEl = container.querySelector('#pay-amount');
    if(payAmountEl) payAmountEl.oninput = (e)=>{ state.paymentForm.amount = e.target.value; };
    const payDateEl = container.querySelector('#pay-date');
    if(payDateEl) payDateEl.oninput = (e)=>{ state.paymentForm.date = e.target.value; };
    container.querySelectorAll('[data-submit-payment]').forEach(el=>{
      el.onclick = ()=>{
        const d = state.debts.find(x=>x.id===el.getAttribute('data-submit-payment'));
        submitPayment(d);
      };
    });

    const extraEl = container.querySelector('#extra-payment');
    if(extraEl) extraEl.oninput = (e)=>{
      state.extraPerMonth = e.target.value;
      const resultsEl = container.querySelector('#strategy-results');
      if(resultsEl) resultsEl.innerHTML = strategyResultsHtml();
    };
  }

  load();
}

window.Modules = window.Modules || {};
window.Modules['quan-ly-no'] = { title:'Quản Lý Nợ', render };
})();
