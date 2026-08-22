(function(){
// "Chấm Điểm Nghiệp Tiền" (trước gọi "Thiết Lập Nhanh") — vẫn giữ đúng 7 câu hỏi số liệu gốc từ
// "Bản Đồ Sức Khỏe Tài Chính" (bandosuckhoetaichinh.netlify.app, công cụ thu lead riêng của Quỳnh)
// để điền sẵn dữ liệu ban đầu, NHƯNG thêm 1 câu Vibe Check (tâm thức) ngay sau mỗi nhóm số liệu —
// góp ý 2026-08-22: ứng dụng tài chính thường chỉ hỏi con số vô cảm, mất kết nối cảm xúc; ở đây mỗi
// lần điền số đều bắt cặp với 1 câu hỏi cảm xúc để ra thêm "Điểm Nghiệp Tiền" (0-100, KHÔNG lưu DB —
// tính lại mỗi lần làm bài, đúng nguyên tắc "không lưu điểm suy ra được" xuyên suốt app) và chỉ ra
// đang yếu nhất ở khâu Đón Nhận/Chi Dùng/Đối Diện Nợ. Chỉ lưu vào bảng nào ĐÃ CÓ sẵn trong app (Quỹ
// Khẩn Cấp, 1 dòng Nợ gộp, Cân Đối Tài Sản tháng này) — Thu nhập tự động/Số nguồn thu/Vibe Check
// chưa có chỗ lưu theo thời gian trong schema nên chỉ hiện ở phần kết quả, không lưu lại.
const SEED_DEBT_NAME = 'Tổng nợ hiện tại (ước tính ban đầu)';
// Toàn bộ ô nhập tiền trong wizard này tính bằng ĐƠN VỊ TRIỆU (khớp bandosuckhoetaichinh.netlify.app)
// nhưng các bảng tc_debts/tc_emergency_fund/tc_networth_snapshots lưu bằng ĐỒNG thật — phải nhân/chia
// cho TRIEU khi ghi/đọc, nếu không số sẽ sai 1 triệu lần so với phần còn lại của app.
const TRIEU = 1000000;

const VIBE_QUESTIONS = {
  income: {
    q: 'Khi tiền về tài khoản (lương, thu nhập...), lồng ngực bạn thường ở trạng thái nào?',
    options: [
      { k:'A', points:10, label:'🟢 Hoan hỷ, biết ơn', d:'Thấy đó là thành quả xứng đáng, chúc phúc cho dòng tiền vừa về.' },
      { k:'B', points:5, label:'🟡 Hiển nhiên, vô cảm', d:'Coi đó là chuyện đương nhiên phải có, không cảm xúc gì đặc biệt.' },
      { k:'C', points:0, label:'🔴 Lo âu, co thắt', d:'Chưa kịp vui đã nghĩ ngay tới hoá đơn, nợ nần sắp phải trả.' },
    ],
  },
  expense: {
    q: 'Mỗi lần bấm chuyển khoản trả 1 hoá đơn lớn (điện, học phí, trả nợ...), bạn thường phản ứng thế nào?',
    options: [
      { k:'A', points:10, label:'🟢 Trân trọng, chúc phúc', d:'Biết ơn giá trị mình nhận được, chuyển tiền trong sự nhẹ nhõm.' },
      { k:'B', points:5, label:'🟡 Tặc lưỡi cho xong', d:'Làm theo quán tính, không để tâm nhiều.' },
      { k:'C', points:0, label:'🔴 Ấm ức, xót xa', d:'Thở dài, tiếc nuối như vừa "mất" một khoản tiền.' },
    ],
  },
  ef: {
    q: 'Nếu ngày mai nguồn thu nhập chính của bạn đột ngột dừng hẳn, cảm xúc đầu tiên trong bạn là gì?',
    options: [
      { k:'A', points:10, label:'🟢 Bình tĩnh, chấp nhận', d:'Tin vào năng lực bản thân, sẵn sàng lên kế hoạch xoay xở.' },
      { k:'B', points:5, label:'🟡 Sốt ruột, né tránh', d:'Biết là nguy nhưng không dám nghĩ tới, tự trấn an qua loa.' },
      { k:'C', points:0, label:'🔴 Hoảng loạn, mất ngủ', d:'Muốn lao ngay vào kiếm tiền thật nhanh bằng mọi giá.' },
    ],
  },
  debt: {
    q: 'Khi nghĩ về khoản nợ và người đã cho bạn vay hiện tại, bạn thường nuôi cảm xúc gì?',
    options: [
      { k:'A', points:10, label:'🟢 Biết ơn sâu sắc', d:'Coi họ là người đã tin tưởng trao nguồn lực, cam kết trả sòng phẳng.' },
      { k:'B', points:5, label:'🟡 Né tránh, trì hoãn', d:'Ngại xem tin nhắn nhắc nợ, không dám nhìn thẳng con số thật.' },
      { k:'C', points:0, label:'🔴 Oán trách, tủi thân', d:'Thấy nhục nhã hoặc trách người đang đòi nợ mình.' },
    ],
  },
  asset: {
    q: 'Động cơ sâu nhất khiến bạn muốn tích luỹ nhiều tài sản hơn là gì?',
    options: [
      { k:'A', points:10, label:'🟢 Phụng sự, kiến tạo', d:'Để lo cho gia đình ấm êm và tạo thêm giá trị cho người khác.' },
      { k:'B', points:5, label:'🟡 Sĩ diện, công nhận', d:'Để chứng minh năng lực bản thân, để người khác nể phục.' },
      { k:'C', points:0, label:'🔴 Sợ đói khổ', d:'Tích trữ vì sợ biến cố, sợ một ngày rơi vào cảnh nghèo khó.' },
    ],
  },
  passive: {
    q: 'Khi nghĩ tới việc có dòng tiền tự động chảy về đều đặn, niềm tin nào thầm thì trong đầu bạn?',
    options: [
      { k:'A', points:10, label:'🟢 Tôi xứng đáng', d:'Xứng đáng được tự do tài chính và bình an — không cần vắt kiệt sức.' },
      { k:'B', points:5, label:'🟡 Hoài nghi', d:'Nghe xa vời quá, chắc chỉ người giỏi hoặc may mắn mới có được.' },
      { k:'C', points:0, label:'🔴 Không đủ tốt', d:'Thấy bản thân còn nhiều thiếu sót, khó mà đạt tới cột mốc đó.' },
    ],
  },
};
const WEAKEST_AREA_INFO = {
  income: { label:'Đón Nhận', explain:'Bạn đang khó đón nhận trọn vẹn — mỗi khi tiền về, nỗi lo che mất niềm vui. Đây là gốc rễ dễ tạo ra Dòng Tiền Sợ Hãi lặp lại.', nutChan:2 },
  expense: { label:'Chi Dùng', explain:'Bạn đang xót của mỗi khi chi tiền ra — phản ứng này âm thầm nuôi Nút Chặn Dòng Tiền #3 (Khi chính mình chi tiền ra).', nutChan:3 },
  debt: { label:'Đối Diện Nợ', explain:'Bạn đang né tránh đối diện với nợ — điều này dễ khiến gánh nặng tâm lý về khoản nợ càng lúc càng nặng thêm.', nutChan:null },
};

function render(container, ctx){
  const month = new Date().toISOString().slice(0,7);
  const state = {
    loading: true,
    form: { income:'', expense:'', ef_current:'', ef_monthly_min:'', debt_total:'', debt_monthly:'', assets_total:'', passive_income:'', income_sources:'' },
    vibe: { income:null, expense:null, ef:null, debt:null, asset:null, passive:null },
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

    // Điểm Nghiệp Tiền: trung bình điểm các câu Vibe Check ĐÃ trả lời (bỏ qua câu chưa trả lời,
    // không ép trả lời đủ 6 câu mới xem được các chỉ số vật lý phía trên). Nút Chặn nặng nhất chỉ
    // xét trong 3 khâu Đón Nhận/Chi Dùng/Đối Diện Nợ — 3 khâu có hành động lặp lại hàng ngày/tháng,
    // khác Quỹ Khẩn Cấp/Tài Sản/Thu Nhập Tự Động vốn là trạng thái tĩnh hơn.
    const answered = Object.entries(state.vibe).filter(([,v])=>v!=null);
    let vibeScore = null, weakestArea = null;
    if(answered.length > 0){
      const totalPoints = answered.reduce((s,[key,ansKey])=>{
        const opt = VIBE_QUESTIONS[key].options.find(o=>o.k===ansKey);
        return s + (opt ? opt.points : 0);
      }, 0);
      vibeScore = Math.round((totalPoints / (answered.length*10)) * 100);
      const coreAreas = ['income','expense','debt'].filter(key=>state.vibe[key]!=null);
      if(coreAreas.length > 0){
        weakestArea = coreAreas.reduce((worst,key)=>{
          const pts = VIBE_QUESTIONS[key].options.find(o=>o.k===state.vibe[key]).points;
          const worstPts = VIBE_QUESTIONS[worst].options.find(o=>o.k===state.vibe[worst]).points;
          return pts < worstPts ? key : worst;
        }, coreAreas[0]);
      }
    }

    return { cashFlow, savingsRate, efMonths, netWorth, dti, passivePct, note, vibeScore, weakestArea };
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

  function vibeQuestionHtml(key){
    const q = VIBE_QUESTIONS[key];
    const selected = state.vibe[key];
    return `
      <div style="margin-top:16px;padding-top:14px;border-top:1px dashed var(--line);">
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:8px;">${esc(q.q)}</label>
        <div class="chips" data-vibe-group="${key}">
          ${q.options.map(o=>`<div class="chip ${selected===o.k?'selected':''}" data-vibe-key="${key}" data-vibe-val="${o.k}">${esc(o.label)}</div>`).join('')}
        </div>
        ${selected ? `<div class="hint-box" style="margin-top:8px;">${esc(q.options.find(o=>o.k===selected).d)}</div>` : ''}
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
      </div>

      ${r.vibeScore!=null ? `
        <div class="section">
          <h3>🔥 Điểm Nghiệp Tiền của bạn</h3>
          <div style="text-align:center;padding:12px 0;">
            <div style="font-family:'IBM Plex Mono',monospace;font-size:40px;font-weight:700;color:var(--accent);">${r.vibeScore}<span style="font-size:18px;color:var(--ink-soft);">/100</span></div>
          </div>
          ${r.weakestArea ? `
            <div class="hint-box">Khâu đang yếu nhất hiện tại: <b>${esc(WEAKEST_AREA_INFO[r.weakestArea].label)}</b> — ${esc(WEAKEST_AREA_INFO[r.weakestArea].explain)}</div>
            <div class="btn-row" style="justify-content:flex-start;margin-top:10px;">
              <span class="btn-ghost btn btn-sm" data-tangthuc-area="${r.weakestArea}">🌱 Ghi niềm tin gốc về khâu này vào Tàng Thức →</span>
            </div>
          ` : ''}
          <div class="hint-box" style="margin-top:10px;">Điểm này KHÔNG lưu lại — làm lại bài này bất cứ lúc nào để thấy tâm thức tiền của bạn đã dịch chuyển ra sao.</div>
        </div>
      ` : ''}

      <div class="section">
        <div class="btn-row" style="justify-content:flex-start;">
          <span class="btn btn-sm" data-goto="trang-chu">Về Trang chủ →</span>
          <span class="btn-ghost btn btn-sm" data-goto="quan-ly-no">Xem Quản Lý Nợ →</span>
        </div>
      </div>
    `;
  }

  function html(){
    return `
      <div class="page-head">
        <h1>Chấm Điểm Nghiệp Tiền</h1>
        <p>7 câu hỏi số liệu + 6 câu Vibe Check đi kèm — vừa điền sẵn Quỹ Khẩn Cấp, Nợ, Cân Đối Tài Sản ban đầu, vừa soi ra khâu nào trong dòng tiền đang bị tâm thức sợ hãi chi phối. Có thể làm lại bất cứ lúc nào để cập nhật.</p>
      </div>

      ${state.loading ? `<div class="loading"><div class="spinner"></div></div>` : `
        <div class="section">
          <h3>Bước 1 · Thu nhập</h3>
          ${fieldHtml('income', 'Thu nhập trung bình/tháng', 'Trung bình 3 tháng gần nhất, tổng thu nhập thực nhận.', 'triệu đ')}
          ${vibeQuestionHtml('income')}
        </div>

        <div class="section">
          <h3>Bước 2 · Chi tiêu</h3>
          ${fieldHtml('expense', 'Chi tiêu trung bình/tháng', 'Tính hết mọi khoản: sinh hoạt, nợ, mua sắm, giải trí...', 'triệu đ')}
          ${vibeQuestionHtml('expense')}
        </div>

        <div class="section">
          <h3>Bước 3 · Quỹ Khẩn Cấp</h3>
          ${fieldHtml('ef_current', 'Tiền dự phòng có thể dùng nhanh', 'Nếu ngày mai thu nhập chính dừng lại, bạn có bao nhiêu để xoay xở ngay?', 'triệu đ')}
          ${fieldHtml('ef_monthly_min', 'Chi phí tối thiểu cần mỗi tháng', 'Để duy trì cuộc sống cơ bản.', 'triệu đ')}
          ${vibeQuestionHtml('ef')}
        </div>

        <div class="section">
          <h3>Bước 4 · Nợ</h3>
          ${fieldHtml('debt_total', 'Tổng dư nợ hiện tại', 'Không có nợ thì để 0.', 'triệu đ')}
          ${fieldHtml('debt_monthly', 'Số tiền trả nợ mỗi tháng', '', 'triệu đ')}
          <div class="hint-box" style="margin-top:10px;">Đây là số gộp để có điểm khởi đầu nhanh. Sang <a href="#quan-ly-no" style="color:var(--accent);font-weight:600;">Quản Lý Nợ →</a> để khai chi tiết từng khoản (lãi suất, hạn trả) khi có thời gian.</div>
          ${vibeQuestionHtml('debt')}
        </div>

        <div class="section">
          <h3>Bước 5 · Tài sản</h3>
          ${fieldHtml('assets_total', 'Tổng tài sản hiện có', 'Tiền mặt, tiết kiệm, vàng, chứng khoán, bất động sản, xe... — ước tính tổng.', 'triệu đ')}
          ${vibeQuestionHtml('asset')}
        </div>

        <div class="section">
          <h3>Bước 6-7 · Thu nhập tự động & Số nguồn thu</h3>
          <p style="font-size:12.5px;color:var(--ink-soft);margin-bottom:0;">2 câu số này chỉ để tham khảo trong kết quả, chưa có chỗ lưu theo thời gian trong app.</p>
          ${fieldHtml('passive_income', 'Thu nhập tự động/tháng', 'Tiền đến từ tài sản/hệ thống, không cần trực tiếp làm việc trong tháng đó.', 'triệu đ')}
          ${fieldHtml('income_sources', 'Số nguồn thu đang hoạt động', 'VD: lương + bán hàng online + cho thuê nhà = 3 nguồn.', 'nguồn')}
          ${vibeQuestionHtml('passive')}

          <button class="btn btn-full" style="margin-top:18px;" id="setup-submit" ${state.saving?'disabled':''}>${state.saving?'Đang lưu…':'Xem Kết Quả →'}</button>
        </div>

        ${state.result ? resultHtml() : ''}
      `}
    `;
  }

  function bind(){
    container.querySelectorAll('[data-field]').forEach(el=>{
      el.oninput = ()=>{ state.form[el.getAttribute('data-field')] = el.value; };
    });
    container.querySelectorAll('[data-vibe-key]').forEach(el=>{
      el.onclick = ()=>{
        const key = el.getAttribute('data-vibe-key'), val = el.getAttribute('data-vibe-val');
        state.vibe[key] = state.vibe[key]===val ? null : val;
        draw();
      };
    });
    const submitBtn = container.querySelector('#setup-submit');
    if(submitBtn) submitBtn.onclick = submit;
    container.querySelectorAll('[data-goto]').forEach(el=>{
      el.onclick = ()=>{ location.hash = el.getAttribute('data-goto'); };
    });
    container.querySelectorAll('[data-tangthuc-area]').forEach(el=>{
      el.onclick = ()=>{
        const area = el.getAttribute('data-tangthuc-area');
        // Truyền ngữ cảnh sang Tàng Thức qua window.Pending* — đúng quy ước đã dùng ở nhan-hieu/
        // (vd window.PendingHookText) để 1 module đưa dữ liệu tạm sang module khác qua điều hướng.
        window.PendingTangThucContext = { areaLabel: WEAKEST_AREA_INFO[area].label, nutChan: WEAKEST_AREA_INFO[area].nutChan };
        location.hash = 'tang-thuc';
      };
    });
  }

  load();
}

window.Modules = window.Modules || {};
window.Modules['thiet-lap-nhanh'] = { title:'Chấm Điểm Nghiệp Tiền', render };
})();
