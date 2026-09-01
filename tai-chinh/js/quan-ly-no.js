(function(){
const TOUR_STEPS = [
  { selector: '#ef-target', title: 'Quỹ Khẩn Cấp trước', text: 'Đặt mục tiêu Quỹ Khẩn Cấp (thường 10-20 triệu để bắt đầu, không cần đủ 3-6 tháng chi phí ngay khi đang nợ) — có quỹ nhỏ trước để 1 sự cố bất ngờ không đẻ ra khoản nợ mới.' },
  { selector: '#add-debt', title: 'Khai chi tiết từng khoản nợ', text: 'Thêm từng khoản nợ với lãi suất, hạn trả — càng chi tiết, chiến lược trả nợ bên dưới càng chính xác.' },
  { selector: '#extra-payment', title: 'Chiến lược trả nợ', text: 'Nhập số tiền dư ra có thể trả thêm mỗi tháng — hệ thống tự tính thứ tự nên trả khoản nào trước để hết nợ nhanh nhất, ít lãi nhất.' },
];

const MAX_MONTHS = 600; // trần mô phỏng (50 năm) — vượt mốc này coi như "chưa xác định" (trả tối
// thiểu + dư không đủ bù lãi, nợ sẽ không bao giờ hết theo cách trả hiện tại).

// Mô phỏng trả nợ theo tháng: mỗi tháng cộng lãi rồi trả tối thiểu mọi khoản + dồn hết phần dư
// vào ĐÚNG 1 khoản đang ưu tiên (nhỏ nhất = snowball, lãi cao nhất = avalanche), khoản đó hết thì
// dồn tiếp sang khoản kế (hiệu ứng "lăn tuyết"). Trả về số tháng hết nợ + tổng lãi phải trả.
// Trả về thêm THỨ TỰ hết nợ (payoffOrder) — góp ý Quỳnh 2026-08-26: "chiến lược trả nợ cần làm kỹ
// và cụ thể hơn", không chỉ nói tổng tháng/tổng lãi mà phải nói RÕ khoản nào hết trước, tháng thứ
// mấy — để người dùng biết chính xác nên nhìn vào đâu tiếp theo, không chỉ 1 con số tổng khô khan.
function simulateStrategy(debts, extraPerMonth, strategy){
  let working = debts.map(d => ({ id:d.id, name:d.creditor_name, balance: Number(d.current_balance)||0, rate: Number(d.interest_rate)||0, minPayment: Number(d.minimum_payment)||0 }))
    .filter(d => d.balance > 0);
  if(working.length === 0) return { months: 0, totalInterest: 0, converged: true, payoffOrder: [] };

  let months = 0, totalInterest = 0;
  const payoffOrder = [];
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
    const justPaidOff = working.filter(d => d.balance <= 0.5);
    justPaidOff.forEach(d => payoffOrder.push({ name: d.name, month: months }));
    working = working.filter(d => d.balance > 0.5);
  }
  const converged = working.length === 0;
  return { months: converged ? months : null, totalInterest: converged ? totalInterest : null, converged, payoffOrder };
}

function render(container, ctx){
  const state = {
    loading: true,
    emergencyFund: { target_amount:'', current_amount:'' },
    debts: [],
    newDebt: { creditor_name:'', current_balance:'', cost_type:'percent', interest_rate:'', flat_fee_amount:'', minimum_payment:'', due_day:'', crit_legit_source:false, crit_real_value:false, crit_clear_plan:false },
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
      cost_type: d.cost_type,
      interest_rate: d.cost_type==='percent' ? (Number(d.interest_rate)||0) : 0,
      flat_fee_amount: d.cost_type==='flat_fee' ? (Number(d.flat_fee_amount)||0) : null,
      minimum_payment: Number(d.minimum_payment)||0,
      due_day: d.due_day ? Number(d.due_day) : null,
      crit_legit_source: !!d.crit_legit_source,
      crit_real_value: !!d.crit_real_value,
      crit_clear_plan: !!d.crit_clear_plan,
    });
    state.savingDebt = false;
    if(error){ state.error = 'Không lưu được — thử lại. (' + error.message + ')'; draw(); return; }
    state.newDebt = { creditor_name:'', current_balance:'', cost_type:'percent', interest_rate:'', flat_fee_amount:'', minimum_payment:'', due_day:'', crit_legit_source:false, crit_real_value:false, crit_clear_plan:false };
    await clearModuleDraft(ctx, DRAFT_KEY);
    await load();
  }

  async function saveEdit(id){
    const f = state.editForm;
    await ctx.supabase.from('tc_debts').update({
      creditor_name: f.creditor_name.trim(),
      current_balance: Number(f.current_balance)||0,
      cost_type: f.cost_type,
      interest_rate: f.cost_type==='percent' ? (Number(f.interest_rate)||0) : 0,
      flat_fee_amount: f.cost_type==='flat_fee' ? (Number(f.flat_fee_amount)||0) : null,
      minimum_payment: Number(f.minimum_payment)||0,
      due_day: f.due_day ? Number(f.due_day) : null,
      crit_legit_source: !!f.crit_legit_source,
      crit_real_value: !!f.crit_real_value,
      crit_clear_plan: !!f.crit_clear_plan,
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

  // Gợi ý xử lý trước — góp ý Quỳnh 2026-08-26: "AI cũng cần gợi ý cho người dùng cái nào nên xử lý
  // trước". Không có AI thật trong app này (xem CLAUDE.md) nên đây là gợi ý DỰA TRÊN QUY TẮC rõ ràng,
  // không phải suy luận mờ ảo: Nợ Hoảng Loạn LUÔN ưu tiên xử lý trước — không phải vì lãi cao/thấp,
  // mà vì bản chất nó đang rút cạn bạn theo cách khác (nguồn không lành mạnh/không có kế hoạch) —
  // rồi trong các khoản còn lại (Nợ Kiến Tạo) mới áp chiến lược Đà Thắng Nhỏ/Diệt Lãi Cao như cũ.
  function priorityHtml(){
    const panicDebts = state.debts.filter(d => !(d.crit_legit_source && d.crit_real_value && d.crit_clear_plan));
    if(panicDebts.length === 0) return `<div class="hint-box">Tất cả khoản nợ hiện tại đều là 🟢 Nợ Kiến Tạo — cứ áp dụng 1 trong 2 chiến lược bên dưới theo tính cách của bạn, không có khoản nào cần xử lý gấp trước.</div>`;
    return `
      <div class="hint-box" style="border-color:var(--danger);background:#FBE5E5;">
        <b>💡 Nên xử lý trước:</b> ${panicDebts.map(d=>`<b>${esc(d.creditor_name)}</b>`).join(', ')} — đây là 🔴 Nợ Hoảng Loạn, nên dồn lực xử lý TRƯỚC cả 2 chiến lược bên dưới, bất kể lãi suất cao hay thấp. Nợ Hoảng Loạn thường đi kèm nguồn không lành mạnh hoặc không có kế hoạch rõ ràng — để càng lâu, rủi ro (bị siết nợ, lãi phạt, vòng xoáy nợ chồng nợ) tăng nhanh hơn con số lãi suất thể hiện.
      </div>
    `;
  }

  function strategyResultsHtml(){
    if(state.debts.length === 0) return '';
    const extra = Number(state.extraPerMonth) || 0;
    const snowball = simulateStrategy(state.debts, extra, 'snowball');
    const avalanche = simulateStrategy(state.debts, extra, 'avalanche');
    function fmtOrder(r){
      if(!r.converged || r.payoffOrder.length === 0) return '';
      return `<div style="margin-top:8px;font-size:12.5px;color:var(--ink-soft);">Thứ tự hết nợ: ${r.payoffOrder.map((p,i)=>`${i+1}) <b>${esc(p.name)}</b> (tháng ${p.month})`).join(' → ')}</div>`;
    }
    function fmtResult(r){
      if(!r.converged) return `<span style="color:var(--danger);">Chưa xác định — số tiền trả thêm chưa đủ bù lãi, nợ sẽ không giảm.</span>`;
      const years = Math.floor(r.months/12), rem = r.months%12;
      const timeLabel = years>0 ? `${years} năm ${rem} tháng` : `${rem} tháng`;
      return `Hết nợ sau <b>${timeLabel}</b> · Tổng lãi phải trả: <b style="color:var(--danger);">${Math.round(r.totalInterest).toLocaleString('vi-VN')}đ</b>${fmtOrder(r)}`;
    }
    const interestDiff = (snowball.converged && avalanche.converged) ? Math.round(snowball.totalInterest - avalanche.totalInterest) : null;
    return `
      ${priorityHtml()}
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
      <div class="hint-box" style="margin-top:12px;">${interestDiff!=null && interestDiff>0
        ? `Diệt Lãi Cao tiết kiệm thêm <b>${interestDiff.toLocaleString('vi-VN')}đ</b> tiền lãi so với Đà Thắng Nhỏ trong trường hợp của bạn — nhưng Đà Thắng Nhỏ tạo cảm giác chiến thắng nhanh (trả hết 1 khoản nhỏ sớm) nên nhiều người kiên trì hơn.`
        : `2 chiến lược cho kết quả tương đương trong trường hợp của bạn.`} Chọn theo tính cách của bạn, không có cách nào "sai".</div>
    `;
  }

  function debtFormFields(d, prefix){
    const costType = d.cost_type || 'percent';
    return `
      <label style="display:block;font-size:12.5px;color:var(--ink-soft);margin:10px 0 4px;">Tên Ân Nhân Hỗ Trợ Vốn (chủ nợ / khoản vay)</label>
      <input type="text" data-${prefix}="creditor_name" value="${esc(d.creditor_name)}" placeholder="VD: Thẻ tín dụng Vietcombank" style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-size:14px;background:#FDFCF8;color:var(--ink);">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div>
          <label style="display:block;font-size:12.5px;color:var(--ink-soft);margin:10px 0 4px;">Nguồn Lực Đã Đón Nhận — số dư hiện tại (đ)</label>
          <input type="text" inputmode="numeric" data-${prefix}="current_balance" data-money value="${esc(formatThousands(d.current_balance))}" style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-size:14px;background:#FDFCF8;color:var(--ink);">
        </div>
        <div>
          <label style="display:block;font-size:12.5px;color:var(--ink-soft);margin:10px 0 4px;">Trả tối thiểu/tháng (đ)</label>
          <input type="text" inputmode="numeric" data-${prefix}="minimum_payment" data-money value="${esc(formatThousands(d.minimum_payment))}" style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-size:14px;background:#FDFCF8;color:var(--ink);">
        </div>
        <div>
          <label style="display:block;font-size:12.5px;color:var(--ink-soft);margin:10px 0 4px;">Ngày Cam Kết Tri Ân (ngày trong tháng)</label>
          <input type="number" min="1" max="31" data-${prefix}="due_day" value="${esc(d.due_day)}" placeholder="VD: 15" style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-size:14px;background:#FDFCF8;color:var(--ink);">
        </div>
      </div>

      <label style="display:block;font-size:12.5px;color:var(--ink-soft);margin:10px 0 4px;">Cách tính chi phí — không phải khoản nào cũng có lãi %/năm (thẻ trả góp/đáo hạn thường tính phí cố định)</label>
      <div class="chips" data-${prefix}-costtype-group>
        <div class="chip ${costType==='percent'?'selected':''}" data-${prefix}-costtype="percent">Lãi suất %/năm</div>
        <div class="chip ${costType==='flat_fee'?'selected':''}" data-${prefix}-costtype="flat_fee">Phí cố định (trả góp/đáo thẻ)</div>
      </div>
      ${costType==='percent' ? `
        <label style="display:block;font-size:12.5px;color:var(--ink-soft);margin:10px 0 4px;">Lãi suất (%/năm)</label>
        <input type="number" min="0" data-${prefix}="interest_rate" value="${esc(d.interest_rate)}" style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-size:14px;background:#FDFCF8;color:var(--ink);">
      ` : `
        <label style="display:block;font-size:12.5px;color:var(--ink-soft);margin:10px 0 4px;">Phí cố định (đ) — vd phí trả góp/phí đáo hạn thẻ tín dụng</label>
        <input type="text" inputmode="numeric" data-${prefix}="flat_fee_amount" data-money value="${esc(formatThousands(d.flat_fee_amount))}" style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-size:14px;background:#FDFCF8;color:var(--ink);">
      `}

      <label style="display:block;font-size:12.5px;color:var(--ink-soft);margin:14px 0 6px;">${glossaryWrap('Khoản nợ này có phải Nợ Kiến Tạo?', 'no_xanh', 'no_do')} — tích cả 3 ý dưới đây thì mới là Nợ Kiến Tạo, thiếu 1 ý là Nợ Hoảng Loạn:</label>
      <div style="display:flex;flex-direction:column;gap:6px;">
        <label style="display:flex;gap:8px;align-items:flex-start;font-size:13px;cursor:pointer;">
          <input type="checkbox" data-${prefix}="crit_legit_source" ${d.crit_legit_source?'checked':''} style="margin-top:3px;">
          <span>Vay từ nguồn chính thống (ngân hàng, tổ chức tín dụng hợp pháp) — không phải vay nóng/tín dụng đen</span>
        </label>
        <label style="display:flex;gap:8px;align-items:flex-start;font-size:13px;cursor:pointer;">
          <input type="checkbox" data-${prefix}="crit_real_value" ${d.crit_real_value?'checked':''} style="margin-top:3px;">
          <span>Dùng để tạo giá trị/tài sản tăng trưởng thật (mua nhà, học tập, kinh doanh) — không phải tiêu xài mất giá ngay</span>
        </label>
        <label style="display:flex;gap:8px;align-items:flex-start;font-size:13px;cursor:pointer;">
          <input type="checkbox" data-${prefix}="crit_clear_plan" ${d.crit_clear_plan?'checked':''} style="margin-top:3px;">
          <span>Có kế hoạch trả rõ ràng, nằm trong khả năng chi trả — không vay trong lúc hoảng loạn</span>
        </label>
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
    const isGreenDebt = !!(d.crit_legit_source && d.crit_real_value && d.crit_clear_plan);
    const costLabel = d.cost_type === 'flat_fee'
      ? `Phí cố định ${Number(d.flat_fee_amount||0).toLocaleString('vi-VN')}đ`
      : `Lãi ${esc(d.interest_rate)}%/năm`;
    return `
      <div class="card" style="margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
          <div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <span style="font-weight:700;font-size:15.5px;">${esc(d.creditor_name)}</span>
              <span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:99px;${isGreenDebt?'background:var(--accent-soft);color:var(--accent);':'background:#FBE5E5;color:var(--danger);'}">${isGreenDebt?'🟢 Nợ Kiến Tạo':'🔴 Nợ Hoảng Loạn'}</span>
            </div>
            <div style="font-size:12.5px;color:var(--ink-soft);margin-top:2px;">${costLabel} · Tối thiểu ${Number(d.minimum_payment).toLocaleString('vi-VN')}đ/tháng${d.due_day?` · Cam kết tri ân ngày ${esc(d.due_day)}`:''}</div>
            ${d.cost_type !== 'flat_fee' ? `<div style="font-size:11.5px;color:var(--ink-soft);margin-top:2px;">~${Math.round(monthlyInterest).toLocaleString('vi-VN')}đ tiền lãi/tháng</div>` : ''}
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
                <input type="text" inputmode="numeric" id="pay-amount" value="${esc(formatThousands(state.paymentForm.amount))}" style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-size:14px;background:#FDFCF8;color:var(--ink);">
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
      <span class="tour-trigger" id="qln-start-tour">❓ Hướng dẫn</span>
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
              <input type="text" inputmode="numeric" id="ef-target" value="${esc(formatThousands(ef.target_amount))}" placeholder="VD: 15.000.000" style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-size:14px;background:#FDFCF8;color:var(--ink);">
            </div>
            <div>
              <label style="display:block;font-size:12.5px;color:var(--ink-soft);margin-bottom:4px;">Hiện có (đ)</label>
              <input type="text" inputmode="numeric" id="ef-current" value="${esc(formatThousands(ef.current_amount))}" style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-size:14px;background:#FDFCF8;color:var(--ink);">
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
            <input type="text" inputmode="numeric" id="extra-payment" value="${esc(formatThousands(state.extraPerMonth))}" placeholder="0" style="width:100%;padding:12px 14px;border:1px solid var(--line);border-radius:10px;font-size:14.5px;background:#FDFCF8;color:var(--ink);">
            <div id="strategy-results">${strategyResultsHtml()}</div>
          </div>
        ` : ''}
      `}
    `;
  }

  function readDebtForm(prefix, target){
    container.querySelectorAll(`[data-${prefix}]`).forEach(el=>{
      target[el.getAttribute(`data-${prefix}`)] = el.type === 'checkbox' ? el.checked : (el.hasAttribute('data-money') ? onlyDigits(el.value) : el.value);
    });
  }

  function bind(){
    const tourBtn = container.querySelector('#qln-start-tour');
    if(tourBtn) tourBtn.onclick = ()=>window.startPageTour(TOUR_STEPS);

    const efTargetEl = container.querySelector('#ef-target');
    if(efTargetEl) efTargetEl.oninput = (e)=>{ e.target.value = formatThousands(e.target.value); state.emergencyFund.target_amount = onlyDigits(e.target.value); };
    const efCurrentEl = container.querySelector('#ef-current');
    if(efCurrentEl) efCurrentEl.oninput = (e)=>{ e.target.value = formatThousands(e.target.value); state.emergencyFund.current_amount = onlyDigits(e.target.value); };
    // Các ô trong form thêm/sửa khoản nợ (current_balance/minimum_payment/flat_fee_amount) chỉ cần
    // format HIỂN THỊ ngay lúc gõ — giá trị thật được đọc lại (bỏ dấu chấm) ở readDebtForm() lúc bấm
    // Lưu, không cần đồng bộ vào state mỗi phím gõ như các ô có state riêng.
    container.querySelectorAll('input[data-money]').forEach(el=>{
      el.oninput = ()=>{ el.value = formatThousands(el.value); };
    });
    const efSaveEl = container.querySelector('#ef-save');
    if(efSaveEl) efSaveEl.onclick = saveEmergencyFund;

    container.querySelectorAll('[data-new]').forEach(el=>{
      el.oninput = ()=>{
        if(el.hasAttribute('data-money')){ el.value = formatThousands(el.value); state.newDebt[el.getAttribute('data-new')] = onlyDigits(el.value); }
        else state.newDebt[el.getAttribute('data-new')] = el.type==='checkbox' ? el.checked : el.value;
        persistDraft();
      };
    });
    container.querySelectorAll('[data-new-costtype]').forEach(el=>{
      el.onclick = ()=>{ state.newDebt.cost_type = el.getAttribute('data-new-costtype'); persistDraft(); draw(); };
    });
    const addBtn = container.querySelector('#add-debt');
    if(addBtn) addBtn.onclick = addDebt;

    container.querySelectorAll('[data-edit]').forEach(el=>{
      el.onclick = ()=>{
        const d = state.debts.find(x=>x.id===el.getAttribute('data-edit'));
        state.editingId = d.id;
        state.editForm = {
          creditor_name:d.creditor_name, current_balance:String(d.current_balance),
          cost_type: d.cost_type || 'percent', interest_rate:String(d.interest_rate),
          flat_fee_amount: d.flat_fee_amount!=null ? String(d.flat_fee_amount) : '',
          minimum_payment:String(d.minimum_payment), due_day: d.due_day?String(d.due_day):'',
          crit_legit_source: !!d.crit_legit_source, crit_real_value: !!d.crit_real_value, crit_clear_plan: !!d.crit_clear_plan,
        };
        draw();
      };
    });
    const cancelEditEl = container.querySelector('[data-cancel-edit]');
    if(cancelEditEl) cancelEditEl.onclick = ()=>{ state.editingId = null; draw(); };
    container.querySelectorAll('[data-edit-costtype]').forEach(el=>{
      el.onclick = ()=>{ state.editForm.cost_type = el.getAttribute('data-edit-costtype'); draw(); };
    });
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
    if(payAmountEl) payAmountEl.oninput = (e)=>{ e.target.value = formatThousands(e.target.value); state.paymentForm.amount = onlyDigits(e.target.value); };
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
      e.target.value = formatThousands(e.target.value);
      state.extraPerMonth = onlyDigits(e.target.value);
      const resultsEl = container.querySelector('#strategy-results');
      if(resultsEl) resultsEl.innerHTML = strategyResultsHtml();
    };
  }

  load();
}

window.Modules = window.Modules || {};
window.Modules['quan-ly-no'] = { title:'Quản Lý Nợ', render };
})();
