(function(){
// HOUSES/HOUSE_GOAL_ANCHOR/RESISTANCE_PATTERNS dùng chung, định nghĩa ở util.js (để
// kien-thuc-nen-tang.js dùng lại đúng nội dung, không lệch nhau).
// Phản chiếu lại ngay khi ghi 1 rắc rối — cố định trong code (không phải AI), xoay vòng ngẫu
// nhiên để không lặp lại nhàm chán. Ý tưởng gốc từ tài liệu "Cách Đặt Mục Tiêu..." nhưng KHÔNG
// dùng ký hiệu "A''" trong UI (thuật ngữ độc quyền của bên dạy) — dùng lại hình ảnh "Quy luật Hình
// Sin" (lên xuống tự nhiên) từ chính tài liệu để phản chiếu, không phải để doạ hay hù.
const REFRAME_MESSAGES = [
  'Đây có thể là bài kiểm tra xem gốc rễ quyết tâm của bạn đã đủ vững chưa — không phải dấu hiệu bạn sẽ thất bại.',
  'Rắc rối này không phải để vùi dập bạn. Nó là màng lọc để xem bạn có thực sự sẵn sàng đón nhận điều mình đang hướng tới.',
  'Bạn vẫn đang đi đúng hướng. Ghi lại được chuyện này nghĩa là bạn đang đối diện, không né tránh — đó đã là một bước tiến.',
  'Mọi thứ đều có lúc lên lúc xuống — đây chỉ là một điểm trũng tạm thời, không phải bản án. Bạn không cần chống lại nó, chỉ cần bình tĩnh đi tiếp.',
];

function hasAnyGoal(g){ return !!(Number(g.goal_income) || Number(g.goal_savings) || Number(g.goal_debt_reduction) || Number(g.goal_new_asset) || (g.goal_new_asset_type||'').trim()); }

function render(container, ctx){
  const month = new Date().toISOString().slice(0,7);
  const state = {
    loading: true,
    step: 'goal', // 'goal' | 'reaction' | 'summary'
    goal: { goal_income:'', goal_savings:'', goal_debt_reduction:'', goal_new_asset:'', goal_new_asset_type:'', goal_house:'' },
    goal_first_reaction: '',
    selectedResistance: null,
    saving: false,
    obstacles: [],
    obstacleInput: '',
    lastReframe: '',
    savingObstacle: false,
    // Ngân sách chi tiêu tháng này — DI CHUYỂN nguyên từ tong-ket-thang.js (2026-08-24, góp ý Quỳnh
    // "ngân sách phải ở phần mục tiêu chứ"): đặt hạn mức là 1 việc làm TRƯỚC khi tiêu, giống hệt lý
    // do goal_* đã chuyển sang đây trước đó — không phải việc nhìn lại cuối tháng.
    budgetActuals: {},
    budgetForm: {},
    savingBudget: false,
    savedBudgetMsg: '',
    expenseCategories: [],
  };
  // Hiện ĐỦ mọi danh mục chi tiêu đã thiết lập (xem danh-muc.js) — không chỉ danh mục đã có chi
  // tiêu/hạn mức như trước (2026-08-24, góp ý Quỳnh "để làm ngân sách thì theo đúng cái của người
  // ta luôn"), để đặt hạn mức được ngay cả cho danh mục chưa tiêu đồng nào tháng này.
  function budgetCategoryKeys(){
    const fromCategories = state.expenseCategories.map(c=>c.label);
    return [...new Set([...fromCategories, ...Object.keys(state.budgetActuals), ...Object.keys(state.budgetForm)])]
      .sort((a,b)=> (state.budgetActuals[b]||0) - (state.budgetActuals[a]||0));
  }
  const DRAFT_KEY = 'muc-tieu-' + month;
  function persistDraft(){ saveModuleDraft(ctx, DRAFT_KEY, { goal: state.goal, goal_first_reaction: state.goal_first_reaction, selectedResistance: state.selectedResistance, obstacleInput: state.obstacleInput, step: state.step, budgetForm: state.budgetForm }); }

  function draw(){ container.innerHTML = html(); bind(); }
  draw();

  async function load(){
    state.loading = true; draw();
    await ensureCategoriesSeeded(ctx);
    const monthStart = `${month}-01`;
    const [y, mo] = month.split('-').map(Number);
    const monthEndExclusive = `${new Date(y, mo, 1).getFullYear()}-${String(new Date(y, mo, 1).getMonth()+1).padStart(2,'0')}-01`;
    const [reflRes, obstaclesRes, entriesRes, budgetsRes, categoriesRes] = await Promise.all([
      ctx.supabase.from('tc_monthly_reflections').select('*').eq('user_id', ctx.user.id).eq('month', month).maybeSingle(),
      ctx.supabase.from('tc_obstacle_log').select('*').eq('user_id', ctx.user.id).order('created_at', { ascending:false }).limit(20),
      ctx.supabase.from('tc_finance_entries').select('amount, category_label')
        .eq('user_id', ctx.user.id).eq('type', 'expense').gte('entry_date', monthStart).lt('entry_date', monthEndExclusive),
      ctx.supabase.from('tc_budgets').select('*').eq('user_id', ctx.user.id).eq('month', month),
      ctx.supabase.from('tc_categories').select('*').eq('user_id', ctx.user.id).eq('type', 'expense').order('label'),
    ]);
    state.expenseCategories = categoriesRes.data || [];
    const r = reflRes.data;
    if(r){
      state.goal = {
        goal_income: r.goal_income!=null?String(r.goal_income):'', goal_savings: r.goal_savings!=null?String(r.goal_savings):'',
        goal_debt_reduction: r.goal_debt_reduction!=null?String(r.goal_debt_reduction):'', goal_new_asset: r.goal_new_asset!=null?String(r.goal_new_asset):'',
        goal_new_asset_type: r.goal_new_asset_type||'', goal_house: r.goal_house||'',
      };
      state.goal_first_reaction = r.goal_first_reaction || '';
      state.step = hasAnyGoal(state.goal) ? 'summary' : 'goal';
    }
    state.budgetActuals = {};
    (entriesRes.data||[]).forEach(e=>{
      const key = e.category_label || 'Khác';
      state.budgetActuals[key] = (state.budgetActuals[key]||0) + Number(e.amount);
    });
    state.budgetForm = {};
    (budgetsRes.data||[]).forEach(b=>{ state.budgetForm[b.category_label] = String(b.limit_amount); });
    // Draft (đang gõ dở, chưa bấm Lưu) đè lên SAU dữ liệu đã lưu — draft luôn là bản mới hơn.
    const draft = await loadModuleDraft(ctx, DRAFT_KEY);
    if(draft){
      if(draft.goal) Object.assign(state.goal, draft.goal);
      if(draft.goal_first_reaction) state.goal_first_reaction = draft.goal_first_reaction;
      if(draft.selectedResistance) state.selectedResistance = draft.selectedResistance;
      if(draft.obstacleInput) state.obstacleInput = draft.obstacleInput;
      if(draft.step) state.step = draft.step;
      if(draft.budgetForm) Object.assign(state.budgetForm, draft.budgetForm);
    }
    state.obstacles = obstaclesRes.data || [];
    state.loading = false;
    draw();
  }

  async function saveBudget(){
    state.savingBudget = true; draw();
    const rows = Object.keys(state.budgetForm)
      .filter(key => key.trim() && Number(state.budgetForm[key]) > 0)
      .map(key => ({ user_id: ctx.user.id, month, category_label: key, limit_amount: Number(state.budgetForm[key]) }));
    if(rows.length > 0){
      await ctx.supabase.from('tc_budgets').upsert(rows, { onConflict:'user_id,month,category_label' });
    }
    state.savingBudget = false;
    state.savedBudgetMsg = 'Đã lưu ✓';
    await load();
    setTimeout(()=>{ state.savedBudgetMsg=''; const el = container.querySelector('#mt-budget-saved'); if(el) el.textContent=''; }, 1800);
  }

  async function saveGoal(){
    state.saving = true; draw();
    await ctx.supabase.from('tc_monthly_reflections').upsert({
      user_id: ctx.user.id, month,
      goal_income: Number(state.goal.goal_income)||0, goal_savings: Number(state.goal.goal_savings)||0,
      goal_debt_reduction: Number(state.goal.goal_debt_reduction)||0, goal_new_asset: Number(state.goal.goal_new_asset)||0,
      goal_new_asset_type: state.goal.goal_new_asset_type.trim() || null, goal_house: state.goal.goal_house || null,
      updated_at: new Date().toISOString(),
    }, { onConflict:'user_id,month' });
    state.saving = false;
    state.step = 'reaction';
    draw();
    persistDraft();
  }

  async function saveReaction(){
    state.saving = true; draw();
    await ctx.supabase.from('tc_monthly_reflections').upsert({
      user_id: ctx.user.id, month, goal_first_reaction: state.goal_first_reaction.trim() || null,
      updated_at: new Date().toISOString(),
    }, { onConflict:'user_id,month' });
    // Cả Lời Cam Kết lẫn Tiếng Lòng đều đã lưu xong — draft không còn ý nghĩa cho tháng này nữa.
    await clearModuleDraft(ctx, DRAFT_KEY);
    state.saving = false;
    state.step = 'summary';
    draw();
  }

  async function submitObstacle(){
    const desc = state.obstacleInput.trim();
    if(!desc) return;
    state.savingObstacle = true; draw();
    await ctx.supabase.from('tc_obstacle_log').insert({ user_id: ctx.user.id, description: desc });
    state.lastReframe = REFRAME_MESSAGES[Math.floor(Math.random()*REFRAME_MESSAGES.length)];
    state.obstacleInput = '';
    state.savingObstacle = false;
    persistDraft();
    await load();
  }

  async function deleteObstacle(id){
    const ok = await confirmModal('Xoá dòng nhật ký này?');
    if(!ok) return;
    await ctx.supabase.from('tc_obstacle_log').delete().eq('id', id);
    await load();
  }

  function goalFormHtml(){
    return `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
        <div>
          <label style="display:block;font-size:12.5px;color:var(--ink-soft);margin-bottom:4px;">Mục tiêu thu nhập (đ)</label>
          <input type="number" min="0" data-goal="goal_income" value="${esc(state.goal.goal_income)}" style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-size:14px;background:#FDFCF8;color:var(--ink);">
        </div>
        <div>
          <label style="display:block;font-size:12.5px;color:var(--ink-soft);margin-bottom:4px;">Mục tiêu tiết kiệm (đ)</label>
          <input type="number" min="0" data-goal="goal_savings" value="${esc(state.goal.goal_savings)}" style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-size:14px;background:#FDFCF8;color:var(--ink);">
        </div>
        <div>
          <label style="display:block;font-size:12.5px;color:var(--ink-soft);margin-bottom:4px;">Mục tiêu giảm nợ (đ)</label>
          <input type="number" min="0" data-goal="goal_debt_reduction" value="${esc(state.goal.goal_debt_reduction)}" style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-size:14px;background:#FDFCF8;color:var(--ink);">
        </div>
        <div>
          <label style="display:block;font-size:12.5px;color:var(--ink-soft);margin-bottom:4px;">Mục tiêu tài sản mới (đ)</label>
          <input type="number" min="0" data-goal="goal_new_asset" value="${esc(state.goal.goal_new_asset)}" style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-size:14px;background:#FDFCF8;color:var(--ink);">
        </div>
      </div>
      <label style="display:block;font-size:12.5px;color:var(--ink-soft);margin:12px 0 4px;">Loại tài sản sẽ mua/đầu tư</label>
      <input type="text" data-goal="goal_new_asset_type" value="${esc(state.goal.goal_new_asset_type)}" placeholder="VD: vàng, cổ phiếu, gửi tiết kiệm..." style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-size:14px;background:#FDFCF8;color:var(--ink);">

      <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:16px 0 8px;">${glossaryWrap('Mục tiêu này phục vụ Trụ Cột nào?', 'ngoi_nha')} <span style="font-weight:400;">(không bắt buộc)</span></label>
      <div class="chips" id="mt-house-chips">
        ${HOUSES.map(h=>`<div class="chip ${state.goal.goal_house===h.key?'selected':''}" data-house="${h.key}">${h.label}</div>`).join('')}
      </div>
      <div class="hint-box" id="mt-house-anchor" style="margin-top:10px;">${state.goal.goal_house ? esc(HOUSE_GOAL_ANCHOR[state.goal.goal_house]) : 'Chọn 1 Trụ Cột để xem mục tiêu này thật sự phục vụ điều gì.'}</div>

      <button class="btn btn-full" style="margin-top:18px;" id="mt-save-goal" ${state.saving?'disabled':''}>${state.saving?'Đang lưu…':'Lưu Lời Cam Kết →'}</button>
    `;
  }

  function summaryCardHtml(){
    const rows = [
      state.goal.goal_income && ['Mục tiêu thu nhập', Number(state.goal.goal_income).toLocaleString('vi-VN')+'đ'],
      state.goal.goal_savings && ['Mục tiêu tiết kiệm', Number(state.goal.goal_savings).toLocaleString('vi-VN')+'đ'],
      state.goal.goal_debt_reduction && ['Mục tiêu giảm nợ', Number(state.goal.goal_debt_reduction).toLocaleString('vi-VN')+'đ'],
      state.goal.goal_new_asset && ['Mục tiêu tài sản mới', Number(state.goal.goal_new_asset).toLocaleString('vi-VN')+'đ' + (state.goal.goal_new_asset_type?` (${esc(state.goal.goal_new_asset_type)})`:'')],
    ].filter(Boolean);
    return `
      <div class="card">
        <div style="font-family:'IBM Plex Mono',monospace;font-size:12px;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-soft);margin-bottom:10px;">Lời Cam Kết tháng ${month.slice(5)}/${month.slice(0,4)}</div>
        ${rows.map(([label,val])=>`
          <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--line);font-size:14px;">
            <span>${esc(label)}</span><b>${val}</b>
          </div>
        `).join('')}
        ${state.goal.goal_house?`<div style="margin-top:10px;font-size:13px;color:var(--ink-soft);">Phục vụ: ${houseLabel(state.goal.goal_house)}</div>`:''}
        ${state.goal_first_reaction?`<div class="hint-box" style="margin-top:14px;">💛 Tiếng Lòng lúc đặt mục tiêu: "${esc(state.goal_first_reaction)}"</div>`:''}
        <button class="btn-ghost btn btn-sm" style="margin-top:14px;" id="mt-edit-goal">Sửa lại</button>
      </div>
    `;
  }

  function html(){
    return `
      <div class="page-head">
        <h1>Mục Tiêu & Cam Kết</h1>
        <p>Đặt mục tiêu TRƯỚC khi ghi chép — đây là nghi thức mở đầu, không phải 1 ô nhập số cuối tháng. Chưa rõ các khái niệm dưới đây? Xem <a href="#kien-thuc" style="color:var(--accent);font-weight:600;">Kiến Thức Nền Tảng →</a> trước.</p>
      </div>

      ${state.loading ? `<div class="loading"><div class="spinner"></div></div>` : `
        <div class="section">
          <h3>Lời Cam Kết tháng này</h3>
          ${state.step === 'goal' ? goalFormHtml() : ''}
          ${state.step === 'reaction' ? `
            ${summaryCardHtml()}
            <div style="margin-top:16px;">
              <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:6px;">Ngay lúc này, Tiếng Lòng bạn đang nói gì?</label>
              <div class="hint-box" style="margin-bottom:10px;">Đừng cố viết cho hay hay tích cực — viết đúng cảm xúc thật đang có, dù đó là hoài nghi, mệt mỏi hay sợ hãi. Nhận diện được nó là bước quan trọng nhất.</div>

              <div style="font-size:12.5px;color:var(--ink-soft);margin-bottom:6px;">Không biết diễn tả sao? Xem thử cảm xúc của bạn có giống 1 trong 4 dạng thường gặp này không (chỉ để tham khảo):</div>
              <div class="chips" id="mt-resistance-chips" style="margin-bottom:10px;">
                ${RESISTANCE_PATTERNS.map(p=>`<div class="chip ${state.selectedResistance===p.key?'selected':''}" data-resistance="${p.key}">${p.t}</div>`).join('')}
              </div>
              ${state.selectedResistance ? `<div class="hint-box" style="margin-bottom:10px;">${esc((RESISTANCE_PATTERNS.find(p=>p.key===state.selectedResistance)||{}).d)}</div>` : ''}

              <textarea id="mt-reaction" placeholder="VD: Nghe hay đấy nhưng không biết có làm được không...">${esc(state.goal_first_reaction)}</textarea>
              <button class="btn btn-full" style="margin-top:14px;" id="mt-save-reaction" ${state.saving?'disabled':''}>${state.saving?'Đang lưu…':'Lưu Tiếng Lòng'}</button>
            </div>
          ` : ''}
          ${state.step === 'summary' ? summaryCardHtml() : ''}
        </div>

        <div class="section">
          <h3>Ngân sách chi tiêu tháng này</h3>
          <p style="color:var(--ink-soft);font-size:13.5px;margin-bottom:12px;">Đặt hạn mức từng danh mục TRƯỚC khi tiêu — cùng tinh thần với Lời Cam Kết ở trên. Danh sách dưới đây đúng theo <a href="#danh-muc" style="color:var(--accent);font-weight:600;">danh mục đã thiết lập →</a>. Xem chi tiêu thật đã tiêu vào đâu ở <a href="#tong-ket-thang" style="color:var(--accent);font-weight:600;">Tổng Kết Tháng →</a>.</p>
          ${budgetCategoryKeys().length===0 ? `<div style="color:var(--ink-soft);font-size:14px;">Chưa có danh mục chi tiêu nào — <a href="#danh-muc" style="color:var(--accent);font-weight:600;">thiết lập ngay →</a></div>` : budgetCategoryKeys().map(key=>{
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
            <input type="text" id="mt-new-budget-category" list="mt-budget-category-datalist" placeholder="+ Thêm danh mục ngân sách..." style="flex:1;padding:8px 10px;border:1px solid var(--line);border-radius:8px;font-size:13px;background:#FDFCF8;color:var(--ink);">
            <datalist id="mt-budget-category-datalist">
              ${state.expenseCategories.map(c=>`<option value="${esc(c.label)}">`).join('')}
            </datalist>
            <input type="number" min="0" id="mt-new-budget-amount" placeholder="Hạn mức" style="width:110px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;font-size:13px;background:#FDFCF8;color:var(--ink);">
            <span class="btn-ghost btn btn-sm" id="mt-add-budget-category">+ Thêm</span>
          </div>
          <button class="btn btn-sm" style="margin-top:14px;" id="mt-save-budget" ${state.savingBudget?'disabled':''}>${state.savingBudget?'Đang lưu…':'Lưu ngân sách'}</button>
          <span id="mt-budget-saved" style="margin-left:10px;color:var(--accent);font-weight:600;">${state.savedBudgetMsg}</span>
        </div>

        <div class="section">
          <h3>Nhật Ký Rắc Rối</h3>
          <p style="color:var(--ink-soft);font-size:13.5px;margin-bottom:12px;">Có chuyện gì vừa cản trở bạn trên đường tới mục tiêu? Ghi lại ngay lúc vừa xảy ra — app sẽ phản chiếu lại 1 góc nhìn khác ngay bên dưới, để chuyện này không âm thầm khiến bạn bỏ cuộc. Chỉ để bạn tự nhìn lại, không tính vào Điểm Nghiệp hay điểm số nào.</p>
          <input type="text" id="mt-obstacle-input" value="${esc(state.obstacleInput)}" placeholder="Vừa có chuyện gì cản trở bạn?" style="width:100%;padding:12px 14px;border:1px solid var(--line);border-radius:10px;font-size:14.5px;background:#FDFCF8;color:var(--ink);">
          <button class="btn btn-sm" style="margin-top:10px;" id="mt-submit-obstacle" ${state.savingObstacle?'disabled':''}>${state.savingObstacle?'Đang lưu…':'Ghi lại'}</button>

          ${state.lastReframe ? `<div class="hint-box" style="margin-top:14px;">💛 ${esc(state.lastReframe)}</div>` : ''}

          ${state.obstacles.length>0 ? `
            <div style="margin-top:20px;">
              ${state.obstacles.map(o=>`
                <div class="list-item">
                  <div class="txt">
                    <div class="meta">${new Date(o.created_at).toLocaleDateString('vi-VN')}</div>
                    ${esc(o.description)}
                  </div>
                  <span class="btn-ghost btn btn-sm" data-delete-obstacle="${o.id}" style="padding:5px 10px;font-size:12px;">Xoá</span>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `}
    `;
  }

  function bind(){
    const houseChips = container.querySelector('#mt-house-chips');
    if(houseChips) houseChips.querySelectorAll('[data-house]').forEach(el=>{
      el.onclick = ()=>{ state.goal.goal_house = el.getAttribute('data-house'); draw(); persistDraft(); };
    });
    const resistanceChips = container.querySelector('#mt-resistance-chips');
    if(resistanceChips) resistanceChips.querySelectorAll('[data-resistance]').forEach(el=>{
      el.onclick = ()=>{ state.selectedResistance = el.getAttribute('data-resistance'); draw(); persistDraft(); };
    });
    container.querySelectorAll('[data-goal]').forEach(el=>{
      el.oninput = ()=>{ state.goal[el.getAttribute('data-goal')] = el.value; persistDraft(); };
    });
    const saveGoalBtn = container.querySelector('#mt-save-goal');
    if(saveGoalBtn) saveGoalBtn.onclick = saveGoal;

    const reactionEl = container.querySelector('#mt-reaction');
    if(reactionEl) reactionEl.oninput = (e)=>{ state.goal_first_reaction = e.target.value; persistDraft(); };
    const saveReactionBtn = container.querySelector('#mt-save-reaction');
    if(saveReactionBtn) saveReactionBtn.onclick = saveReaction;

    const editBtn = container.querySelector('#mt-edit-goal');
    if(editBtn) editBtn.onclick = ()=>{ state.step = 'goal'; draw(); persistDraft(); };

    container.querySelectorAll('[data-budget]').forEach(el=>{
      el.oninput = ()=>{ state.budgetForm[el.getAttribute('data-budget')] = el.value; persistDraft(); };
    });
    const addBudgetCategoryBtn = container.querySelector('#mt-add-budget-category');
    if(addBudgetCategoryBtn) addBudgetCategoryBtn.onclick = async ()=>{
      const nameEl = container.querySelector('#mt-new-budget-category');
      const amountEl = container.querySelector('#mt-new-budget-amount');
      const name = nameEl.value.trim();
      if(!name || !Number(amountEl.value)) return;
      state.budgetActuals[name] = state.budgetActuals[name] || 0;
      state.budgetForm[name] = amountEl.value;
      // Gõ danh mục mới ngay đây (chưa có trong Quản Lý Danh Mục) — lưu luôn vào tc_categories để
      // Ghi Chép Hàng Ngày/Quản Lý Danh Mục cũng thấy đúng 1 danh sách, không lệch nhau.
      if(!state.expenseCategories.some(c=>c.label===name)){
        await ctx.supabase.from('tc_categories').insert({ user_id: ctx.user.id, type:'expense', label:name, default_classification:'cp_bien_doi' });
        state.expenseCategories.push({ label:name, type:'expense', default_classification:'cp_bien_doi' });
      }
      draw();
      persistDraft();
    };
    const saveBudgetBtn = container.querySelector('#mt-save-budget');
    if(saveBudgetBtn) saveBudgetBtn.onclick = saveBudget;

    const obstacleInput = container.querySelector('#mt-obstacle-input');
    if(obstacleInput) obstacleInput.oninput = (e)=>{ state.obstacleInput = e.target.value; persistDraft(); };
    const submitObstacleBtn = container.querySelector('#mt-submit-obstacle');
    if(submitObstacleBtn) submitObstacleBtn.onclick = submitObstacle;
    container.querySelectorAll('[data-delete-obstacle]').forEach(el=>{
      el.onclick = ()=>{ deleteObstacle(el.getAttribute('data-delete-obstacle')); };
    });
  }

  load();
}

window.Modules = window.Modules || {};
window.Modules['muc-tieu'] = { title:'Mục Tiêu & Cam Kết', render };
})();
