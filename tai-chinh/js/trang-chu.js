(function(){
// Điểm Nghiệp (trước gọi "Karma Score") theo đúng 5 Trụ Cột Năng Lượng Bản Thể — LUÔN tính lại từ dữ liệu thô mỗi lần render
// (không lưu điểm tích luỹ), tránh lệch dữ liệu khi người dùng sửa/xoá giao dịch cũ. Trụ 4 (Giá Trị
// Cống Hiến & Tài Chính Tâm Thức) là trụ DUY NHẤT có câu hỏi check trực tiếp về tâm thức tiền
// (finance_mindset_score) + tỷ lệ Vibe Check — và có ẢNH HƯỞNG LAN sang 4 trụ còn lại (đúng yêu cầu:
// tài chính bất ổn kéo theo mọi mặt khác của đời sống), qua modifier +/-10 điểm quanh mốc 50.
function computeFinanceScore(entries){
  const counts = { green:0, red:0, gray:0 };
  entries.forEach(e=>{ counts[e.vibe||'gray'] = (counts[e.vibe||'gray']||0) + 1; });
  const total = counts.green + counts.red + counts.gray;
  if(total === 0) return 50;
  return Math.round(50 + ((counts.green - counts.red) / total) * 50);
}
function computeMindScore({ distinctDaysLogged, hasGoal, hasNetworthThisMonth }){
  let score = 30 + Math.min(40, distinctDaysLogged * 4);
  if(hasGoal) score += 15;
  if(hasNetworthThisMonth) score += 15;
  return Math.min(100, score);
}
function avgSelfScore(rows, field){
  const vals = rows.map(r=>r[field]).filter(v=>v!=null);
  if(vals.length === 0) return 50;
  const avg = vals.reduce((s,v)=>s+v,0) / vals.length;
  return Math.round((avg/5)*100);
}
function clampScore(v){ return Math.max(0, Math.min(100, Math.round(v))); }

function render(container, ctx){
  const state = { loading:true, monthIncome:0, monthExpense:0, netWorth:null, netWorthMonth:null, totalDebt:0, upcomingDebts:[], karmaAxes:[], needsSetup:false, activeBeliefsCount:0, selectedPillarKey:null };
  const month = new Date().toISOString().slice(0,7);

  function draw(){ container.innerHTML = html(); bind(); }
  draw();

  // Khoản nợ nào có due_day trong vòng 7 ngày tới — vòng qua tháng sau nếu due_day đã qua trong
  // tháng này (vd hôm nay 25/8, hạn ngày 5 -> hạn kế tiếp là 5/9, không phải 5/8 đã qua).
  function computeUpcoming(debts){
    const today = new Date(); today.setHours(0,0,0,0);
    return debts.filter(d=>d.due_day).map(d=>{
      let next = new Date(today.getFullYear(), today.getMonth(), d.due_day);
      if(d.due_day < today.getDate()) next = new Date(today.getFullYear(), today.getMonth()+1, d.due_day);
      const daysUntil = Math.round((next - today) / 86400000);
      return { creditor_name: d.creditor_name, daysUntil };
    }).filter(x=>x.daysUntil <= 7).sort((a,b)=>a.daysUntil-b.daysUntil);
  }

  async function boot(){
    const monthStart = `${month}-01`;
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate()-30);
    const fourteenDaysAgo = new Date(); fourteenDaysAgo.setDate(fourteenDaysAgo.getDate()-14);
    const [entriesRes, netWorthRes, debtsRes, vibeRes, recentDatesRes, monthGoalRes, monthNetworthRes, weeklyRes, efExistsRes, activeBeliefsRes] = await Promise.all([
      ctx.supabase.from('tc_finance_entries').select('type, amount')
        .eq('user_id', ctx.user.id).gte('entry_date', monthStart).lt('entry_date', nextMonthKey(month)+'-01'),
      ctx.supabase.from('tc_networth_snapshots').select('*')
        .eq('user_id', ctx.user.id).order('snapshot_month', { ascending:false }).limit(1).maybeSingle(),
      ctx.supabase.from('tc_debts').select('creditor_name, current_balance, due_day')
        .eq('user_id', ctx.user.id).eq('is_paid_off', false),
      ctx.supabase.from('tc_finance_entries').select('vibe')
        .eq('user_id', ctx.user.id).gte('entry_date', isoDate(thirtyDaysAgo)),
      ctx.supabase.from('tc_finance_entries').select('entry_date')
        .eq('user_id', ctx.user.id).gte('entry_date', isoDate(fourteenDaysAgo)),
      ctx.supabase.from('tc_monthly_reflections').select('goal_income,goal_savings,goal_debt_reduction,goal_new_asset')
        .eq('user_id', ctx.user.id).eq('month', month).maybeSingle(),
      ctx.supabase.from('tc_networth_snapshots').select('snapshot_month')
        .eq('user_id', ctx.user.id).eq('snapshot_month', month).maybeSingle(),
      ctx.supabase.from('tc_weekly_reflections').select('relationship_score,health_score,purpose_score,parents_connection_score,finance_mindset_score')
        .eq('user_id', ctx.user.id).order('week_start', { ascending:false }).limit(4),
      ctx.supabase.from('tc_emergency_fund').select('user_id').eq('user_id', ctx.user.id).maybeSingle(),
      ctx.supabase.from('tc_core_beliefs').select('id').eq('user_id', ctx.user.id).eq('still_active', true),
    ]);
    const entries = entriesRes.data || [];
    state.monthIncome = entries.filter(e=>e.type==='income').reduce((s,e)=>s+Number(e.amount),0);
    state.monthExpense = entries.filter(e=>e.type==='expense').reduce((s,e)=>s+Number(e.amount),0);
    if(netWorthRes.data){
      const s = netWorthRes.data;
      const assets = Number(s.asset_cash||0)+Number(s.asset_savings||0)+Number(s.asset_gold_fx||0)+Number(s.asset_stocks||0)+Number(s.asset_realestate||0)+Number(s.asset_other||0);
      const debts = Number(s.debt_credit_card||0)+Number(s.debt_installment||0)+Number(s.debt_bank_loan||0)+Number(s.debt_other||0);
      state.netWorth = assets - debts;
      state.netWorthMonth = s.snapshot_month;
    }
    const activeDebts = debtsRes.data || [];
    state.totalDebt = activeDebts.reduce((s,d)=>s+Number(d.current_balance),0);
    state.upcomingDebts = computeUpcoming(activeDebts);
    state.needsSetup = !netWorthRes.data && activeDebts.length===0 && !efExistsRes.data;

    const financeScore = computeFinanceScore(vibeRes.data || []);
    const distinctDaysLogged = new Set((recentDatesRes.data||[]).map(r=>r.entry_date)).size;
    const g = monthGoalRes.data;
    const hasGoal = !!(g && (Number(g.goal_income)||Number(g.goal_savings)||Number(g.goal_debt_reduction)||Number(g.goal_new_asset)));
    const mindScore = computeMindScore({ distinctDaysLogged, hasGoal, hasNetworthThisMonth: !!monthNetworthRes.data });
    const weeklyRows = weeklyRes.data || [];

    // Trụ 4 = trung bình(tỷ lệ Vibe Check, tự chấm tâm thức tiền trực tiếp) — đây là trụ "gốc" ảnh
    // hưởng lan sang 4 trụ còn lại, vì tài chính bất ổn kéo theo mọi mặt khác của đời sống. Niềm tin
    // cũ ở Tàng Thức CHƯA chuyển hoá (still_active) kéo nhẹ Trụ 4 xuống — đây là cách vòng lặp
    // Tàng Thức → Tâm Thức → Ý Thức thực sự có tác dụng lên Điểm Nghiệp, không chỉ là 1 cuốn nhật ký
    // rời rạc không liên quan gì tới phần còn lại của app.
    state.activeBeliefsCount = (activeBeliefsRes.data || []).length;
    const beliefPenalty = Math.min(20, state.activeBeliefsCount * 5);
    const financeMindsetScore = avgSelfScore(weeklyRows, 'finance_mindset_score');
    const pillar4Raw = clampScore(Math.round((financeScore + financeMindsetScore) / 2) - beliefPenalty);
    const crossPillarModifier = (pillar4Raw - 50) * 0.2;

    const pillar1Raw = Math.round((avgSelfScore(weeklyRows, 'health_score') + mindScore) / 2);
    const pillar2Raw = avgSelfScore(weeklyRows, 'parents_connection_score');
    const pillar3Raw = avgSelfScore(weeklyRows, 'relationship_score');
    const pillar5Raw = avgSelfScore(weeklyRows, 'purpose_score');

    state.karmaAxes = [
      { key:'than_tam_ban_the', label:'Thân Tâm Bản Thể', value: clampScore(pillar1Raw + crossPillarModifier) },
      { key:'coi_nguon_sinh_thanh', label:'Cội Nguồn Sinh Thành', value: clampScore(pillar2Raw + crossPillarModifier) },
      { key:'ban_doi_moi_quan_he', label:'Mối Quan Hệ Thân Mật', value: clampScore(pillar3Raw + crossPillarModifier) },
      { key:'tai_chinh_tam_thuc', label:'Tài Chính Tâm Thức', value: clampScore(pillar4Raw) },
      { key:'thuan_phap_nhan_qua', label:'Thuận Pháp & Nhân Quả', value: clampScore(pillar5Raw + crossPillarModifier) },
    ];

    state.loading = false;
    draw();
  }

  function nextMonthKey(m){
    const [y, mo] = m.split('-').map(Number);
    const d = new Date(y, mo, 1);
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
  }

  function html(){
    const name = (ctx.profile && ctx.profile.full_name) ? ctx.profile.full_name.split(' ').slice(-1)[0] : '';
    return `
      <div class="page-head">
        <h1>Chào${name?` ${esc(name)}`:''} 👋</h1>
        <p>"Số dư là Quả, rung động là Nhân." Ghi chép mỗi ngày, tổng kết mỗi tuần/tháng, để nhìn rõ tâm thức nào đang dẫn dắt dòng tiền của bạn.</p>
      </div>

      ${state.loading ? `<div class="loading"><div class="spinner"></div></div>` : `
        ${state.needsSetup ? `
          <div class="card" style="margin-bottom:20px;background:var(--accent-soft);">
            <div style="font-weight:700;font-size:15px;margin-bottom:6px;">👋 Chưa thiết lập dữ liệu ban đầu?</div>
            <div style="font-size:13.5px;color:var(--ink);margin-bottom:12px;">Làm bài Thiết Lập Nhanh (3 phút) để điền sẵn Quỹ Khẩn Cấp, Nợ, Tài Sản — thay vì bắt đầu từ con số 0.</div>
            <span class="btn btn-sm" data-key="thiet-lap-nhanh">Thiết Lập Nhanh →</span>
          </div>
        ` : ''}
        <div class="card" style="margin-bottom:20px;">
          <h3 style="font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;text-align:center;">${glossaryWrap('Điểm Nghiệp', 'karma_score')}</h3>
          ${radarChartHtml(state.karmaAxes)}
          <div class="hint-box" id="tc-pillar-explain" style="margin-top:6px;">${
            state.selectedPillarKey
              ? `<b>${esc((HOUSES.find(h=>h.key===state.selectedPillarKey)||{}).label||'')}</b> — ${esc((HOUSES.find(h=>h.key===state.selectedPillarKey)||{}).desc||'')}`
              : 'Bấm vào tên 1 Trụ Cột phía trên để xem trụ đó là gì.'
          }</div>
          ${state.activeBeliefsCount>0 ? `<div class="hint-box" style="margin-top:6px;">🌱 Bạn còn <b>${state.activeBeliefsCount}</b> niềm tin cũ ở Tàng Thức chưa chuyển hoá — đang kéo nhẹ Trụ Tài Chính Tâm Thức (và lan sang cả 4 trụ còn lại) xuống. <a href="#tang-thuc" style="color:var(--accent);font-weight:600;">Xem Tàng Thức →</a></div>` : ''}
        </div>

        <div class="source-grid" style="margin-bottom:20px;">
          <div class="source-card"><div class="ic" style="font-size:17px;color:var(--accent);">${state.monthIncome.toLocaleString('vi-VN')}đ</div><div class="label">Thu tháng này</div></div>
          <div class="source-card"><div class="ic" style="font-size:17px;color:var(--danger);">${state.monthExpense.toLocaleString('vi-VN')}đ</div><div class="label">Chi tháng này</div></div>
          <div class="source-card">
            <div class="ic" style="font-size:17px;${state.netWorth==null?'':`color:${state.netWorth>=0?'var(--accent)':'var(--danger)'};`}">${state.netWorth==null?'Chưa có':state.netWorth.toLocaleString('vi-VN')+'đ'}</div>
            <div class="label">Tài sản ròng${state.netWorthMonth?` (${esc(state.netWorthMonth)})`:''}</div>
          </div>
          <div class="source-card"><div class="ic" style="font-size:17px;${state.totalDebt>0?'color:var(--danger);':''}">${state.totalDebt.toLocaleString('vi-VN')}đ</div><div class="label">Tổng nợ hiện tại</div></div>
        </div>

        ${state.upcomingDebts.length>0 ? `
          <div class="card" style="margin-bottom:20px;border-color:var(--gold);">
            <h3 style="font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--gold);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px;">💛 Cơ hội thanh khoản tri ân sắp tới</h3>
            ${state.upcomingDebts.map(d=>{
              const timeLabel = d.daysUntil===0 ? 'Hôm nay' : d.daysUntil===1 ? 'Ngày mai' : `Còn ${d.daysUntil} ngày`;
              return `
              <div style="padding:6px 0;font-size:13.5px;line-height:1.6;">
                <b>${timeLabel}</b> là cơ hội để bạn thanh khoản tri ân cho <b>${esc(d.creditor_name)}</b> — hãy gửi năng lượng biết ơn đến dòng chảy tài chính đang nâng đỡ bạn nhé.
              </div>
            `;}).join('')}
          </div>
        ` : ''}
      `}

      <div class="card">
        <h3 style="font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.05em;margin-bottom:14px;">Đi đến</h3>
        <div class="list-item" data-key="thiet-lap-nhanh">
          <div class="txt"><b>Thiết Lập Nhanh</b><br><span style="color:var(--ink-soft);font-size:13px;">7 câu hỏi điền sẵn dữ liệu ban đầu, làm lại bất cứ lúc nào.</span></div>
          <button class="btn-ghost btn btn-sm" data-key="thiet-lap-nhanh">Xem →</button>
        </div>
        <div class="list-item" data-key="muc-tieu">
          <div class="txt"><b>Mục Tiêu & Cam Kết</b><br><span style="color:var(--ink-soft);font-size:13px;">Đặt Lời Cam Kết tháng này, ghi lại rắc rối cản trở bạn.</span></div>
          <button class="btn btn-sm" data-key="muc-tieu">Xem →</button>
        </div>
        <div class="list-item" data-key="ghi-chep">
          <div class="txt"><b>Ghi Chép Hàng Ngày</b><br><span style="color:var(--ink-soft);font-size:13px;">Ghi lại thu nhập/chi tiêu hôm nay, chỉ mất vài phút.</span></div>
          <button class="btn btn-sm" data-key="ghi-chep">Ghi ngay →</button>
        </div>
        <div class="list-item" data-key="tong-ket-tuan">
          <div class="txt"><b>Tổng Kết Tuần</b><br><span style="color:var(--ink-soft);font-size:13px;">Xem tuần này chi tiêu vào đâu nhiều nhất, và nhận xét lại.</span></div>
          <button class="btn-ghost btn btn-sm" data-key="tong-ket-tuan">Xem →</button>
        </div>
        <div class="list-item" data-key="tong-ket-thang">
          <div class="txt"><b>Tổng Kết Tháng</b><br><span style="color:var(--ink-soft);font-size:13px;">Cập nhật tài sản/tiêu sản, tính Tài Sản Ròng — con số quan trọng nhất.</span></div>
          <button class="btn-ghost btn btn-sm" data-key="tong-ket-thang">Xem →</button>
        </div>
        <div class="list-item" data-key="quan-ly-no">
          <div class="txt"><b>Quản Lý Nợ</b><br><span style="color:var(--ink-soft);font-size:13px;">Quỹ khẩn cấp, từng khoản nợ, chiến lược trả nợ Snowball/Avalanche.</span></div>
          <button class="btn-ghost btn btn-sm" data-key="quan-ly-no">Xem →</button>
        </div>
      </div>
    `;
  }

  function bind(){
    container.querySelectorAll('[data-key]').forEach(el=>{
      el.onclick = ()=>{ location.hash = el.getAttribute('data-key'); };
    });
    container.querySelectorAll('[data-axis-key]').forEach(el=>{
      el.onclick = ()=>{ state.selectedPillarKey = el.getAttribute('data-axis-key'); draw(); };
    });
  }

  boot();
}

window.Modules = window.Modules || {};
window.Modules['trang-chu'] = { title:'Trang chủ', render };
})();
