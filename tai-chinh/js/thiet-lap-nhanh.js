(function(){
// "Thiết Lập Nhanh" — cùng 7 câu hỏi với "Bản Đồ Sức Khỏe Tài Chính" (bandosuckhoetaichinh.netlify.app,
// công cụ thu lead/bán hàng riêng của Quỳnh), nhưng ở đây dùng để ĐIỀN SẴN dữ liệu ban đầu cho Sổ
// Dòng Tiền Tâm Thức thay vì bắt đầu từ con số 0 trống trơn. Chỉ lưu vào bảng nào ĐÃ CÓ sẵn trong
// app (Quỹ Khẩn Cấp, 1 dòng Nợ gộp, Cân Đối Tài Sản tháng này) — Thu nhập tự động/Số nguồn thu chưa
// có chỗ lưu trong schema nên chỉ hiện ở phần kết quả, không lưu lại.
const SEED_DEBT_NAME = 'Tổng nợ hiện tại (ước tính ban đầu)';
// Toàn bộ ô nhập tiền trong wizard này tính bằng ĐƠN VỊ TRIỆU (khớp bandosuckhoetaichinh.netlify.app)
// nhưng các bảng tc_debts/tc_emergency_fund/tc_networth_snapshots lưu bằng ĐỒNG thật — phải nhân/chia
// cho TRIEU khi ghi/đọc, nếu không số sẽ sai 1 triệu lần so với phần còn lại của app.
const TRIEU = 1000000;

function render(container, ctx){
  const month = new Date().toISOString().slice(0,7);
  const state = {
    loading: true,
    form: { income:'', expense:'', ef_current:'', ef_monthly_min:'', debt_total:'', debt_monthly:'', assets_total:'', passive_income:'', income_sources:'' },
    saving: false,
    result: null,
  };

  function draw(){ container.innerHTML = html(); bind(); }
  draw();

  async function load(){
    state.loading = true; draw();
    const [efRes, debtRes, netRes] = await Promise.all([
      ctx.supabase.from('tc_emergency_fund').select('*').eq('user_id', ctx.user.id).maybeSingle(),
      ctx.supabase.from('tc_debts').select('*').eq('user_id', ctx.user.id).eq('creditor_name', SEED_DEBT_NAME).maybeSingle(),
      ctx.supabase.from('tc_networth_snapshots').select('*').eq('user_id', ctx.user.id).eq('snapshot_month', month).maybeSingle(),
    ]);
    if(efRes.data && efRes.data.current_amount) state.form.ef_current = String(efRes.data.current_amount/TRIEU);
    if(debtRes.data){
      if(debtRes.data.current_balance) state.form.debt_total = String(debtRes.data.current_balance/TRIEU);
      if(debtRes.data.minimum_payment) state.form.debt_monthly = String(debtRes.data.minimum_payment/TRIEU);
    }
    if(netRes.data && netRes.data.asset_other) state.form.assets_total = String(netRes.data.asset_other/TRIEU);
    state.loading = false;
    draw();
  }

  function computeResult(){
    const f = state.form;
    const income = Number(f.income)||0, expense = Number(f.expense)||0;
    const efCurrent = Number(f.ef_current)||0, efMonthlyMin = Number(f.ef_monthly_min)||0;
    const debtTotal = Number(f.debt_total)||0, debtMonthly = Number(f.debt_monthly)||0;
    const assetsTotal = Number(f.assets_total)||0;
    const passiveIncome = Number(f.passive_income)||0;

    const cashFlow = income - expense;
    const savingsRate = income>0 ? Math.round(cashFlow/income*100*10)/10 : 0;
    const efMonths = efMonthlyMin>0 ? Math.round(efCurrent/efMonthlyMin*10)/10 : null;
    const netWorth = assetsTotal - debtTotal;
    const dti = income>0 ? Math.round(debtMonthly/income*100*10)/10 : 0;
    const passivePct = income>0 ? Math.round(passiveIncome/income*100*10)/10 : 0;

    let note;
    if(dti >= 43) note = `Áp lực trả nợ đang ở mức đáng lo (${dti}% thu nhập) — ưu tiên số 1 lúc này là giảm bớt khoản trả nợ hàng tháng trước khi tính tới mục tiêu khác.`;
    else if(efMonths!=null && efMonths < 1) note = 'Quỹ dự phòng gần như chưa có — nên ưu tiên gây dựng trước khi mở rộng mục tiêu tài chính khác.';
    else if(efMonths!=null && efMonths < 3) note = 'Quỹ dự phòng còn khá mỏng — nên ưu tiên củng cố trước khi mở rộng mục tiêu tài chính khác.';
    else if(savingsRate < 0) note = 'Chi tiêu đang vượt thu nhập — đây là điểm cần nhìn thẳng vào đầu tiên, trước khi bàn tới tích luỹ hay đầu tư.';
    else if(dti >= 36) note = `Áp lực trả nợ đang ở mức cần chú ý (${dti}% thu nhập) — cân nhắc ưu tiên trả bớt trước khi vay/mua thêm.`;
    else note = 'Bức tranh hiện tại khá ổn — duy trì đều đặn và bắt đầu đặt mục tiêu cụ thể ở phần Mục Tiêu & Cam Kết.';

    return { cashFlow, savingsRate, efMonths, netWorth, dti, passivePct, note };
  }

  async function submit(){
    state.saving = true; draw();
    const f = state.form;
    // Nhân TRIEU vì ô nhập ở đây tính bằng đơn vị triệu, còn các bảng lưu bằng đồng thật.
    const efCurrent = (Number(f.ef_current)||0) * TRIEU;
    const efMonthlyMin = (Number(f.ef_monthly_min)||0) * TRIEU;
    const debtTotal = (Number(f.debt_total)||0) * TRIEU;
    const debtMonthly = (Number(f.debt_monthly)||0) * TRIEU;
    const assetsTotal = (Number(f.assets_total)||0) * TRIEU;

    const existingEf = await ctx.supabase.from('tc_emergency_fund').select('target_amount').eq('user_id', ctx.user.id).maybeSingle();
    const suggestedTarget = Math.round(efMonthlyMin * 3);
    const targetAmount = (existingEf.data && Number(existingEf.data.target_amount) > 0) ? existingEf.data.target_amount : suggestedTarget;

    await Promise.all([
      ctx.supabase.from('tc_emergency_fund').upsert({
        user_id: ctx.user.id, current_amount: efCurrent, target_amount: targetAmount, updated_at: new Date().toISOString(),
      }, { onConflict:'user_id' }),
      (async () => {
        const existingDebt = await ctx.supabase.from('tc_debts').select('id').eq('user_id', ctx.user.id).eq('creditor_name', SEED_DEBT_NAME).maybeSingle();
        const payload = { creditor_name: SEED_DEBT_NAME, current_balance: debtTotal, minimum_payment: debtMonthly };
        if(existingDebt.data) await ctx.supabase.from('tc_debts').update(payload).eq('id', existingDebt.data.id);
        else if(debtTotal > 0) await ctx.supabase.from('tc_debts').insert({ ...payload, user_id: ctx.user.id, interest_rate:0 });
      })(),
      ctx.supabase.from('tc_networth_snapshots').upsert({
        user_id: ctx.user.id, snapshot_month: month, asset_other: assetsTotal, updated_at: new Date().toISOString(),
      }, { onConflict:'user_id,snapshot_month' }),
    ]);

    state.saving = false;
    state.result = computeResult();
    draw();
  }

  function fieldHtml(dataKey, label, hint, unit){
    return `
      <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 4px;">${esc(label)}</label>
      ${hint?`<div style="font-size:12px;color:var(--ink-soft);margin-bottom:6px;">${esc(hint)}</div>`:''}
      <div style="display:flex;align-items:center;gap:8px;">
        <input type="number" min="0" data-field="${dataKey}" value="${esc(state.form[dataKey])}" placeholder="0" style="flex:1;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-size:14px;background:#FDFCF8;color:var(--ink);">
        <span style="font-size:13px;color:var(--ink-soft);white-space:nowrap;">${esc(unit)}</span>
      </div>
    `;
  }

  function resultHtml(){
    const r = state.result;
    return `
      <div class="section">
        <h3>🧭 Bức tranh tài chính của bạn</h3>
        <div class="source-grid">
          <div class="source-card"><div class="ic" style="font-size:16px;color:${r.cashFlow>=0?'var(--accent)':'var(--danger)'};">${r.cashFlow>=0?'+':''}${r.cashFlow.toLocaleString('vi-VN')}tr</div><div class="label">Dòng tiền/tháng</div></div>
          <div class="source-card"><div class="ic" style="font-size:16px;">${r.savingsRate}%</div><div class="label">Tỷ lệ tiết kiệm</div></div>
          <div class="source-card"><div class="ic" style="font-size:16px;">${r.efMonths==null?'—':r.efMonths+' tháng'}</div><div class="label">Dự phòng</div></div>
          <div class="source-card"><div class="ic" style="font-size:16px;color:${r.netWorth>=0?'var(--accent)':'var(--danger)'};">${r.netWorth.toLocaleString('vi-VN')}tr</div><div class="label">Tài sản ròng</div></div>
          <div class="source-card"><div class="ic" style="font-size:16px;color:${r.dti>=36?'var(--danger)':'var(--ink)'};">${r.dti}%</div><div class="label">Áp lực trả nợ</div></div>
          <div class="source-card"><div class="ic" style="font-size:16px;">${r.passivePct}%</div><div class="label">Thu nhập tự động</div></div>
        </div>
        <div class="hint-box" style="margin-top:14px;">${esc(r.note)}</div>
        <div class="btn-row" style="justify-content:flex-start;margin-top:16px;">
          <span class="btn btn-sm" data-goto="trang-chu">Về Trang chủ →</span>
          <span class="btn-ghost btn btn-sm" data-goto="quan-ly-no">Xem Quản Lý Nợ →</span>
        </div>
      </div>
    `;
  }

  function html(){
    return `
      <div class="page-head">
        <h1>Thiết Lập Nhanh</h1>
        <p>7 câu hỏi, khoảng 3 phút — điền sẵn Quỹ Khẩn Cấp, Nợ, Cân Đối Tài Sản ban đầu, thay vì bắt đầu từ con số 0. Có thể làm lại bất cứ lúc nào để cập nhật.</p>
      </div>

      ${state.loading ? `<div class="loading"><div class="spinner"></div></div>` : `
        <div class="section">
          <h3>Bước 1-2 · Thu nhập & Chi tiêu</h3>
          ${fieldHtml('income', 'Thu nhập trung bình/tháng', 'Trung bình 3 tháng gần nhất, tổng thu nhập thực nhận.', 'triệu đ')}
          ${fieldHtml('expense', 'Chi tiêu trung bình/tháng', 'Tính hết mọi khoản: sinh hoạt, nợ, mua sắm, giải trí...', 'triệu đ')}
        </div>

        <div class="section">
          <h3>Bước 3 · Quỹ Khẩn Cấp</h3>
          ${fieldHtml('ef_current', 'Tiền dự phòng có thể dùng nhanh', 'Nếu ngày mai thu nhập chính dừng lại, bạn có bao nhiêu để xoay xở ngay?', 'triệu đ')}
          ${fieldHtml('ef_monthly_min', 'Chi phí tối thiểu cần mỗi tháng', 'Để duy trì cuộc sống cơ bản.', 'triệu đ')}
        </div>

        <div class="section">
          <h3>Bước 4 · Nợ</h3>
          ${fieldHtml('debt_total', 'Tổng dư nợ hiện tại', 'Không có nợ thì để 0.', 'triệu đ')}
          ${fieldHtml('debt_monthly', 'Số tiền trả nợ mỗi tháng', '', 'triệu đ')}
          <div class="hint-box" style="margin-top:10px;">Đây là số gộp để có điểm khởi đầu nhanh. Sang <a href="#quan-ly-no" style="color:var(--accent);font-weight:600;">Quản Lý Nợ →</a> để khai chi tiết từng khoản (lãi suất, hạn trả) khi có thời gian.</div>
        </div>

        <div class="section">
          <h3>Bước 5 · Tài sản</h3>
          ${fieldHtml('assets_total', 'Tổng tài sản hiện có', 'Tiền mặt, tiết kiệm, vàng, chứng khoán, bất động sản, xe... — ước tính tổng.', 'triệu đ')}
        </div>

        <div class="section">
          <h3>Bước 6-7 · Thu nhập tự động & Số nguồn thu</h3>
          <p style="font-size:12.5px;color:var(--ink-soft);margin-bottom:0;">2 câu này chỉ để tham khảo trong kết quả, chưa có chỗ lưu theo thời gian trong app.</p>
          ${fieldHtml('passive_income', 'Thu nhập tự động/tháng', 'Tiền đến từ tài sản/hệ thống, không cần trực tiếp làm việc trong tháng đó.', 'triệu đ')}
          ${fieldHtml('income_sources', 'Số nguồn thu đang hoạt động', 'VD: lương + bán hàng online + cho thuê nhà = 3 nguồn.', 'nguồn')}

          <button class="btn btn-full" style="margin-top:18px;" id="setup-submit" ${state.saving?'disabled':''}>${state.saving?'Đang lưu…':'Xem Bản Đồ Nhanh →'}</button>
        </div>

        ${state.result ? resultHtml() : ''}
      `}
    `;
  }

  function bind(){
    container.querySelectorAll('[data-field]').forEach(el=>{
      el.oninput = ()=>{ state.form[el.getAttribute('data-field')] = el.value; };
    });
    const submitBtn = container.querySelector('#setup-submit');
    if(submitBtn) submitBtn.onclick = submit;
    container.querySelectorAll('[data-goto]').forEach(el=>{
      el.onclick = ()=>{ location.hash = el.getAttribute('data-goto'); };
    });
  }

  load();
}

window.Modules = window.Modules || {};
window.Modules['thiet-lap-nhanh'] = { title:'Thiết Lập Nhanh', render };
})();
