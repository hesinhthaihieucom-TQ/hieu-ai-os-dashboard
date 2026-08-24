(function(){
const EXPENSE_CATEGORIES = [
  { key:'tai_san', label:'Tài sản', hint:'mua vàng, gửi TK, đầu tư...' },
  { key:'tieu_san', label:'Tiêu sản', hint:'mất giá trị, thu phí hàng tháng...' },
  { key:'cp_co_dinh', label:'CP cố định', hint:'thuê nhà, bảo hiểm...' },
  { key:'cp_bien_doi', label:'CP biến đổi', hint:'ăn uống, mua sắm...' },
];

// Nếu đang có khoản nợ lãi ≥15%/năm (xem loadDebtWarning), gợi ý ưu tiên trả nợ thay vì chia
// đều 10/5/85% — quy tắc này chỉ đúng khi không có nợ lãi cao (chuyên gia tài chính đều khuyên
// dồn lực trả nợ lãi cao trước, vì lãi nợ "ăn" nhanh hơn bất kỳ khoản đầu tư nào có thể sinh ra).
function vibeIcon(v){ return v==='green' ? '💚' : v==='red' ? '❤️' : '🩶'; }

// Giải thích gốc rễ tâm thức phía sau mỗi lựa chọn (theo đúng Phần I tài liệu spec) — hiện ngay khi
// chọn, để Vibe Check không phải 1 lựa chọn vô nghĩa mà thực sự dạy người dùng điều gì đó mỗi lần.
const VIBE_INFO = {
  green: { label:'💚 Biết ơn, hoan hỷ', explain:'Tiền chuyển động trong sự biết ơn, hoan hỷ là Dòng Tiền Bình An — mang năng lượng sinh sôi, giúp khơi thông Nút Chặn Dòng Tiền của bạn.' },
  red: { label:'😰 Lo âu, xót xa', explain:'Tiền chuyển động trong sự sợ hãi, lo âu, xót xa là Dòng Tiền Sợ Hãi — mang năng lượng huỷ hoại, tự tay tạo thêm Nút Chặn Dòng Tiền cho chính bạn.' },
  gray: { label:'🩶 Vô cảm, tự động', explain:'Bấm tiền ra/vào như một nghĩa vụ, không cảm xúc gì — tín hiệu bạn đang ngắt kết nối với dòng tiền. Thử dừng lại 1 nhịp thở trước khi chọn tiếp.' },
};

// Danh mục giờ đọc từ tc_categories — THIẾT LẬP SẴN (xem danh-muc.js), không còn "học" dần từ lịch
// sử ghi chép nữa (góp ý Quỳnh 2026-08-24: "muốn nó là thiết lập ban đầu, không phải chọn lúc
// ghi"). "+ Khác" vẫn cho thêm nhanh ngay tại đây (xem submit()) — nhưng giờ ghi THẲNG vào
// tc_categories luôn, để lần sau hiện lại ở đúng 1 nơi (cả đây và màn Quản Lý Danh Mục).

function fundSplitHtml(amount, debtWarning){
  if(debtWarning){
    return `⚠️ Bạn đang có khoản nợ <b>${esc(debtWarning.creditorName)}</b> lãi <b>${esc(debtWarning.rate)}%/năm</b> — ước tính mất <b>${Math.round(debtWarning.monthlyInterest).toLocaleString('vi-VN')}đ tiền lãi/tháng</b>. Chuyên gia khuyên dồn phần lớn khoản thu này trả nợ lãi cao trước, thay vì chia đều 10/5/85%. <a href="#quan-ly-no" style="color:var(--accent);font-weight:600;">Xem Quản Lý Nợ →</a>`;
  }
  const n = Number(amount) || 0;
  const tuDo = Math.round(n * 0.10), choDi = Math.round(n * 0.05), noCp = Math.round(n * 0.85);
  return `Tự động chia quỹ: 💰 Tự Do Tài Chính (10%) <b>${tuDo.toLocaleString('vi-VN')}đ</b> · 🎁 Cho Đi (5%) <b>${choDi.toLocaleString('vi-VN')}đ</b> · 📋 Nợ & Chi Phí (85%) <b>${noCp.toLocaleString('vi-VN')}đ</b>`;
}

function render(container, ctx){
  const DRAFT_KEY = 'ghi-chep';
  const state = {
    loading: true,
    date: isoDate(new Date()),
    entries: [],
    form: { type:'expense', amount:'', description:'', category:'cp_bien_doi', category_label:'', vibe:null, vibe_reason:'' },
    saving: false,
    error: null,
    debtWarning: null,
    categories: [],
    showCustomCategory: false,
  };
  function persistDraft(){ saveModuleDraft(ctx, DRAFT_KEY, { form: state.form }); }

  function draw(){ container.innerHTML = html(); bind(); }
  draw();

  async function load(){
    state.loading = true; state.error = null; draw();
    const { data, error } = await ctx.supabase.from('tc_finance_entries')
      .select('*').eq('user_id', ctx.user.id).eq('entry_date', state.date)
      .order('created_at', { ascending:true });
    state.entries = error ? [] : (data||[]);
    state.loading = false;
    draw();
  }

  // Đang gõ dở 1 giao dịch (chọn loại, nhập số tiền, chọn Vibe Check...) mà lỡ bấm sang màn khác
  // thì không được mất — khôi phục lại đúng draft đã gõ khi quay lại (góp ý Quỳnh 2026-08-22).
  async function restoreDraft(){
    const draft = await loadModuleDraft(ctx, DRAFT_KEY);
    if(draft && draft.form) { state.form = draft.form; draw(); }
  }

  async function loadDebtWarning(){
    const { data } = await ctx.supabase.from('tc_debts')
      .select('creditor_name, interest_rate, current_balance')
      .eq('user_id', ctx.user.id).eq('is_paid_off', false).gte('interest_rate', 15)
      .order('interest_rate', { ascending:false }).limit(1).maybeSingle();
    if(data){
      state.debtWarning = {
        creditorName: data.creditor_name,
        rate: data.interest_rate,
        monthlyInterest: Number(data.current_balance) * (Number(data.interest_rate)/100) / 12,
      };
      draw();
    }
  }

  async function loadCategories(){
    await ensureCategoriesSeeded(ctx);
    const { data } = await ctx.supabase.from('tc_categories').select('*').eq('user_id', ctx.user.id).order('label');
    state.categories = data || [];
    draw();
  }

  async function submit(){
    const amt = Number(state.form.amount);
    if(!amt || amt <= 0){ state.error = 'Vui lòng nhập số tiền hợp lệ.'; draw(); return; }
    if(!state.form.description.trim()){ state.error = 'Vui lòng nhập nội dung.'; draw(); return; }
    if(!state.form.vibe){ state.error = 'Vui lòng chọn cảm nhận của bạn trước khi lưu — đây là bước quan trọng nhất để nâng cao tâm thức tài chính.'; draw(); return; }
    state.saving = true; state.error = null; draw();
    const payload = {
      user_id: ctx.user.id,
      entry_date: state.date,
      type: state.form.type,
      amount: amt,
      description: state.form.description.trim(),
      category: state.form.type === 'expense' ? state.form.category : null,
      category_label: state.form.category_label.trim() || null,
      vibe: state.form.vibe,
      vibe_reason: state.form.vibe_reason.trim() || null,
    };
    const { error } = await ctx.supabase.from('tc_finance_entries').insert(payload);
    state.saving = false;
    if(error){ state.error = 'Không lưu được — thử lại. (' + error.message + ')'; draw(); return; }
    // Gõ danh mục mới qua "+ Khác" ngay lúc ghi (không bắt phải qua Quản Lý Danh Mục trước) — lưu
    // luôn vào tc_categories để lần sau hiện lại ở đúng 1 nơi, cả đây và màn Quản Lý Danh Mục.
    if(payload.category_label && !state.categories.some(c=>c.type===payload.type && c.label===payload.category_label)){
      await ctx.supabase.from('tc_categories').insert({
        user_id: ctx.user.id, type: payload.type, label: payload.category_label,
        default_classification: payload.type==='expense' ? payload.category : null,
      });
    }
    state.form = { type: state.form.type, amount:'', description:'', category:'cp_bien_doi', category_label:'', vibe:null, vibe_reason:'' };
    state.showCustomCategory = false;
    await clearModuleDraft(ctx, DRAFT_KEY);
    await load();
    await loadCategories();
  }

  function html(){
    const income = state.entries.filter(e=>e.type==='income');
    const expense = state.entries.filter(e=>e.type==='expense');
    const totalIncome = income.reduce((s,e)=>s+Number(e.amount),0);
    const totalExpense = expense.reduce((s,e)=>s+Number(e.amount),0);
    const isIncome = state.form.type === 'income';

    return `
      <div class="page-head">
        <h1>Ghi Chép Hàng Ngày</h1>
        <p>Ghi chân thật, dù những khoản nhỏ nhất — cách duy nhất để hiểu rõ tiền của bạn đi đâu.</p>
      </div>

      <div class="card" style="margin-bottom:20px;">
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:8px;">Ngày</label>
        <input type="date" id="gc-date" value="${esc(state.date)}" style="width:100%;padding:12px 14px;border:1px solid var(--line);border-radius:10px;font-size:14.5px;font-family:'Be Vietnam Pro',sans-serif;background:#FDFCF8;color:var(--ink);">

        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:16px 0 8px;">Loại giao dịch</label>
        <div class="chips" id="gc-type-chips">
          <div class="chip ${isIncome?'selected':''}" data-type="income">💰 Thu nhập</div>
          <div class="chip ${!isIncome?'selected':''}" data-type="expense">💸 Chi tiêu</div>
        </div>

        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:16px 0 8px;">${isIncome?'Nguồn thu (Lương, thưởng, thu nhập phụ...)':'Nội dung chi (Mua gì? Ở đâu?)'}</label>
        <input type="text" id="gc-desc" placeholder="${isIncome?'VD: Lương tháng 8':'VD: Ăn trưa, đổ xăng...'}" value="${esc(state.form.description)}" style="width:100%;padding:12px 14px;border:1px solid var(--line);border-radius:10px;font-size:14.5px;font-family:'Be Vietnam Pro',sans-serif;background:#FDFCF8;color:var(--ink);">

        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:16px 0 8px;">Số tiền (đồng)</label>
        <input type="number" id="gc-amount" min="0" placeholder="0" value="${esc(state.form.amount)}" style="width:100%;padding:12px 14px;border:1px solid var(--line);border-radius:10px;font-size:14.5px;font-family:'Be Vietnam Pro',sans-serif;background:#FDFCF8;color:var(--ink);">

        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:16px 0 8px;">${glossaryWrap('Bạn đang cảm nhận gì lúc này?', 'dong_tien_xanh', 'dong_tien_do')}</label>
        <div class="chips" id="gc-vibe-chips">
          <div class="chip ${state.form.vibe==='green'?'selected':''}" data-vibe="green">${VIBE_INFO.green.label}</div>
          <div class="chip ${state.form.vibe==='red'?'selected':''}" data-vibe="red">${VIBE_INFO.red.label}</div>
          <div class="chip ${state.form.vibe==='gray'?'selected':''}" data-vibe="gray">${VIBE_INFO.gray.label}</div>
        </div>
        <div class="hint-box" id="gc-vibe-explain" style="margin-top:10px;">${state.form.vibe ? esc(VIBE_INFO[state.form.vibe].explain) : 'Chọn 1 cảm nhận để hiểu gốc rễ tâm thức phía sau — đây là bước quan trọng nhất của cuốn sổ này.'}</div>

        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 6px;">Vì sao bạn cảm thấy vậy? <span style="font-weight:400;">(viết ra giúp bạn hiểu chính mình hơn, không bắt buộc)</span></label>
        <textarea id="gc-vibe-reason" placeholder="VD: Vì đây là tiền dành dụm bao lâu mới có...">${esc(state.form.vibe_reason)}</textarea>

        ${isIncome ? `
          <div class="hint-box" id="gc-fund-split" style="margin-top:14px;">${fundSplitHtml(state.form.amount, state.debtWarning)}</div>
        ` : `
          <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:16px 0 8px;">${glossaryWrap('Phân loại (kế toán)', 'tai_san', 'tieu_san', 'cp_co_dinh', 'cp_bien_doi')}</label>
          <div class="chips" id="gc-category-chips">
            ${EXPENSE_CATEGORIES.map(c=>`<div class="chip ${state.form.category===c.key?'selected':''}" data-category="${c.key}" title="${esc(c.hint)}">${esc(c.label)}</div>`).join('')}
          </div>
        `}

        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:16px 0 8px;">${isIncome?'Danh mục nguồn thu':'Danh mục chi tiêu'} <span style="font-weight:400;">(chọn 1 mục — bấm "+ Khác" nếu chưa có sẵn, hoặc <a href="#danh-muc" style="color:var(--accent);font-weight:600;">quản lý danh mục →</a>)</span></label>
        <div class="chips" id="gc-category-label-chips">
          ${state.categories.filter(c=>c.type===state.form.type).map(c=>`<div class="chip ${state.form.category_label===c.label?'selected':''}" data-category-label="${esc(c.label)}" data-category-classification="${c.default_classification||''}">${esc(c.label)}</div>`).join('')}
          <div class="chip ${state.showCustomCategory?'selected':''}" id="gc-category-label-custom-toggle">+ Khác</div>
        </div>
        ${state.showCustomCategory ? `
          <input type="text" id="gc-category-label-custom" value="${esc(state.form.category_label)}" placeholder="${isIncome?'VD: Cho thuê nhà...':'VD: Tiền điện nước...'}" style="width:100%;margin-top:8px;padding:12px 14px;border:1px solid var(--line);border-radius:10px;font-size:14.5px;font-family:'Be Vietnam Pro',sans-serif;background:#FDFCF8;color:var(--ink);">
        ` : ''}

        ${state.error ? `<div class="error-box">${esc(state.error)}</div>` : ''}
        <button class="btn btn-full" id="gc-submit" ${state.saving?'disabled':''}>${state.saving?'Đang lưu…':'+ Thêm giao dịch'}</button>
      </div>

      <div class="source-grid" style="margin-bottom:16px;">
        <div class="source-card"><div class="ic" style="font-size:17px;color:var(--accent);">${totalIncome.toLocaleString('vi-VN')}đ</div><div class="label">Tổng thu ngày này</div></div>
        <div class="source-card"><div class="ic" style="font-size:17px;color:var(--danger);">${totalExpense.toLocaleString('vi-VN')}đ</div><div class="label">Tổng chi ngày này</div></div>
      </div>

      ${state.loading ? `<div class="loading"><div class="spinner"></div></div>` : (state.entries.length===0 ? `<div style="color:var(--ink-soft);font-size:14px;">Chưa có giao dịch nào cho ngày này.</div>` : state.entries.map(e=>{
        const catLabel = e.type==='expense' ? ((EXPENSE_CATEGORIES.find(c=>c.key===e.category)||{}).label) : null;
        const spendLabel = e.category_label || null;
        return `
        <div class="list-item">
          <div class="txt">
            <div class="meta">${vibeIcon(e.vibe)} ${e.type==='income'?'💰 Thu nhập':'💸 Chi tiêu'}${catLabel?` · ${esc(catLabel)}`:''}${spendLabel?` · ${esc(spendLabel)}`:''}</div>
            ${esc(e.description||'(không ghi chú)')}
            ${e.vibe_reason ? `<div style="font-size:12px;color:var(--ink-soft);font-style:italic;margin-top:4px;">"${esc(e.vibe_reason)}"</div>` : ''}
          </div>
          <div style="display:flex;align-items:center;gap:10px;flex-shrink:0;">
            <div style="font-weight:700;color:${e.type==='income'?'var(--accent)':'var(--danger)'};">${e.type==='income'?'+':'-'}${Number(e.amount).toLocaleString('vi-VN')}đ</div>
            <span class="btn-ghost btn btn-sm" data-delete="${e.id}" style="padding:5px 10px;font-size:12px;">Xoá</span>
          </div>
        </div>
      `;}).join(''))}
    `;
  }

  function bind(){
    container.querySelector('#gc-date').onchange = (e)=>{ state.date = e.target.value; load(); };
    container.querySelectorAll('#gc-type-chips [data-type]').forEach(el=>{
      el.onclick = ()=>{ state.form.type = el.getAttribute('data-type'); state.error = null; draw(); persistDraft(); };
    });
    const catChips = container.querySelector('#gc-category-chips');
    if(catChips) catChips.querySelectorAll('[data-category]').forEach(el=>{
      el.onclick = ()=>{ state.form.category = el.getAttribute('data-category'); draw(); persistDraft(); };
    });
    const vibeChips = container.querySelector('#gc-vibe-chips');
    if(vibeChips) vibeChips.querySelectorAll('[data-vibe]').forEach(el=>{
      el.onclick = ()=>{ state.form.vibe = el.getAttribute('data-vibe'); state.error = null; draw(); persistDraft(); };
    });
    container.querySelector('#gc-vibe-reason').oninput = (e)=>{ state.form.vibe_reason = e.target.value; persistDraft(); };
    container.querySelectorAll('#gc-category-label-chips [data-category-label]').forEach(el=>{
      el.onclick = ()=>{
        state.form.category_label = el.getAttribute('data-category-label');
        // Danh mục đã gắn sẵn CP cố định/CP biến đổi (thiết lập ở Quản Lý Danh Mục) thì tự điền
        // luôn "Phân loại (kế toán)" ở trên — đỡ phải chọn lại mỗi lần ghi cùng 1 danh mục quen.
        // Danh mục chưa gắn (data-category-classification rỗng) thì giữ nguyên lựa chọn hiện tại.
        const classification = el.getAttribute('data-category-classification');
        if(classification) state.form.category = classification;
        state.showCustomCategory = false;
        draw();
        persistDraft();
      };
    });
    const customToggle = container.querySelector('#gc-category-label-custom-toggle');
    if(customToggle) customToggle.onclick = ()=>{ state.showCustomCategory = !state.showCustomCategory; draw(); };
    const customInput = container.querySelector('#gc-category-label-custom');
    if(customInput) customInput.oninput = (e)=>{ state.form.category_label = e.target.value; persistDraft(); };
    container.querySelector('#gc-desc').oninput = (e)=>{ state.form.description = e.target.value; persistDraft(); };
    container.querySelector('#gc-amount').oninput = (e)=>{
      state.form.amount = e.target.value;
      // Chỉ cập nhật riêng ô gợi ý chia quỹ, KHÔNG gọi draw() lại toàn bộ — nếu không sẽ mất focus
      // ngay sau ký tự đầu tiên gõ vào (innerHTML bị thay hoàn toàn mỗi lần gõ).
      const splitEl = container.querySelector('#gc-fund-split');
      if(splitEl) splitEl.innerHTML = fundSplitHtml(state.form.amount, state.debtWarning);
      persistDraft();
    };
    container.querySelector('#gc-submit').onclick = submit;
    container.querySelectorAll('[data-delete]').forEach(el=>{
      el.onclick = async ()=>{
        const ok = await confirmModal('Xoá giao dịch này?');
        if(!ok) return;
        await ctx.supabase.from('tc_finance_entries').delete().eq('id', el.getAttribute('data-delete'));
        load();
      };
    });
  }

  load();
  loadDebtWarning();
  loadCategories();
  restoreDraft();
}

window.Modules = window.Modules || {};
window.Modules['ghi-chep'] = { title:'Ghi Chép Hàng Ngày', render };
})();
