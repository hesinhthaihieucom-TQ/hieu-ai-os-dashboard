(function(){
// Khớp đúng TRIAL_AI_LIMIT/PAID_MONTHLY_AI_LIMIT ở api/_lib/trial-quota.js + nhan-hieu/js/app-shell.js
// — chỉ để HIỂN THỊ cho admin theo dõi, không phải nơi chặn thật (chặn thật luôn ở server).
function aiUsageLabel(p){
  if(p.has_paid){
    // Chu kỳ 30 ngày từ lúc NÂNG CẤP (first_paid_at), không phải ngày đăng ký/tháng lịch (chị Quỳnh
    // 2026-09-01, sửa lại 2026-09-07, xem paidCycleAnchor() ở util.js).
    const sameMonth = p.paid_ai_month === currentCycleKey(paidCycleAnchor(p));
    const used = sameMonth ? (p.paid_ai_uses||0) : 0;
    const bonus = sameMonth ? (p.paid_ai_bonus||0) : 0;
    // Chuyển sang trả phí là ĐỔI SANG bộ đếm khác (paid_ai_uses, theo tháng) chứ không xoá trial_ai_uses
    // — số lượt dùng thử cũ vẫn còn nguyên trong DB, chỉ không còn bị tính vào trần nào cả, không
    // "mất". LUÔN hiện cả 2 bộ đếm (kể cả trial_ai_uses=0) — theo yêu cầu chị Quỳnh 21/8: "người
    // dùng đã đăng ký gói thì ngoài 200 lượt/tháng thì thông tin của họ cũng hiện luôn 100 lượt
    // free" — trước đây chỉ hiện dòng dùng thử NẾU trial_ai_uses>0, ẩn mất với khách chưa dùng thử
    // lượt nào trước khi mua, gây cảm giác thiếu thông tin.
    const paidLabel = `${used}/${PAID_MONTHLY_AI_LIMIT+bonus} lượt AI (chu kỳ ${currentCycleRangeLabel(paidCycleAnchor(p))})`;
    return `${paidLabel} · ${p.trial_ai_uses||0}/${p.trial_ai_limit||TRIAL_AI_LIMIT} lượt dùng thử trọn đời đã dùng trước đó (không tính vào trần tháng)`;
  }
  // trial_ai_limit chốt riêng lúc đăng ký — người đăng ký trước/sau có thể khác nhau (xem
  // schema_full.sql), không còn đồng giá 1 số TRIAL_AI_LIMIT cho mọi người.
  return `${p.trial_ai_uses||0}/${p.trial_ai_limit||TRIAL_AI_LIMIT} lượt AI (dùng thử, trọn đời)`;
}

// Bản RÚT GỌN của aiUsageLabel() — hiện ngay ở thẻ THU GỌN (không cần bấm "Xem chi tiết" mới thấy),
// theo yêu cầu chị Quỳnh 2026-09-03: "mình cũng thấy được cái lượt AI đó của người dùng ở trang
// quản trị" — trước đây số lượt bị giấu hẳn sau "Xem chi tiết", phải bấm từng người một mới thấy,
// không liếc qua cả danh sách để phát hiện ai dùng bất thường/gần hết lượt được.
function aiUsageShortLabel(p){
  if(p.has_paid){
    const sameMonth = p.paid_ai_month === currentCycleKey(paidCycleAnchor(p));
    const used = sameMonth ? (p.paid_ai_uses||0) : 0;
    const bonus = sameMonth ? (p.paid_ai_bonus||0) : 0;
    return `${used}/${PAID_MONTHLY_AI_LIMIT+bonus} lượt AI (${currentCycleRangeLabel(paidCycleAnchor(p))})`;
  }
  return `${p.trial_ai_uses||0}/${p.trial_ai_limit||TRIAL_AI_LIMIT} lượt AI dùng thử`;
}

// Cảnh báo dữ liệu lệch: admin đã gắn "Gói" (last_plan_days) bằng tay hoặc hạn dùng còn rất dài —
// rõ ràng coi là khách đã trả phí — nhưng lại QUÊN bấm "💰 Đánh dấu đã trả phí" nên has_paid vẫn
// false, khiến trang hiện sai "Chưa trả phí (trần 100 lượt)" thay vì đúng 200 lượt/tháng (sự cố
// thực tế phát hiện 22/8 — 2 nút Gia hạn/Đánh dấu đã trả phí độc lập nhau, dễ quên 1 trong 2).
function hasPaidMismatch(p){
  return p.role!=='admin' && !p.has_paid && !!p.last_plan_days;
}

// "cái chu kỳ AI rà soát lại 1 loạt khách xem ai bị lỗi ko" (chị Quỳnh 2026-09-07) — em không đọc
// được database trực tiếp, nên thay vì đoán, kiểm tra NGAY TRONG APP này (chị mở trang là thấy số
// thật) — cờ lên bất kỳ tài khoản trả phí nào có dữ liệu VÔ LÝ theo đúng logic consume_ai_quota()/
// refund_ai_quota() (schema_core.sql):
// 1. Vượt trần: paid_ai_uses (đúng chu kỳ hiện tại) > 200 + paid_ai_bonus — không nên xảy ra vì RPC
//    luôn chặn trước khi cho vượt, có nghĩa là bug thật nếu thấy.
// 2. Bonus âm — refund_ai_quota() dùng greatest(0,...) nên không nên bao giờ âm.
// 3. first_paid_at ở TƯƠNG LAI hoặc TRƯỚC created_at — dữ liệu hỏng/nhập tay sai.
function quotaAnomaly(p){
  if(p.role==='admin' || !p.has_paid) return null;
  const anchor = paidCycleAnchor(p);
  const sameMonth = p.paid_ai_month === currentCycleKey(anchor);
  const usedThisCycle = sameMonth ? (p.paid_ai_uses||0) : 0;
  const bonus = p.paid_ai_bonus||0;
  if(usedThisCycle > PAID_MONTHLY_AI_LIMIT + bonus) return `Vượt trần: đã dùng ${usedThisCycle}/${PAID_MONTHLY_AI_LIMIT+bonus} lượt trong chu kỳ hiện tại`;
  if(bonus < 0) return `Lượt bonus âm (${bonus})`;
  if(p.first_paid_at){
    const fp = new Date(p.first_paid_at).getTime();
    if(fp > Date.now()) return 'first_paid_at ở tương lai';
    if(p.created_at && fp < new Date(p.created_at).getTime()) return 'first_paid_at trước cả ngày đăng ký';
  }
  return null;
}

// "có cách nào chặn được kiểu ng ta tự đăng ký 1 tài khoản xong lấy tài khoản đó giới thiệu để đc
// giảm giá không" (chị Quỳnh 2026-09-07) — KHÔNG chặn cứng được (người cố tình gian có thể tự đặt
// tên/email khác nhau, không có gì phân biệt tuyệt đối với 1 lượt giới thiệu thật) — chặn cứng theo
// suy đoán còn dễ chặn NHẦM anh chị em/vợ chồng giới thiệu nhau thật. Thay vào đó CỜ NGHI VẤN cho
// admin tự mắt kiểm tra, y hệt tinh thần "duyệt tay" đã dùng cho Kho Content/is_student — không tự
// động thu hồi gì cả.
function selfReferralSuspect(p, referrer){
  if(!referrer) return null;
  const nameA = (p.full_name||'').trim().toLowerCase();
  const nameB = (referrer.full_name||'').trim().toLowerCase();
  if(nameA && nameB && nameA === nameB) return 'Trùng họ tên với người giới thiệu';
  // Phần trước @ (bỏ +alias kiểu ten+123@gmail.com) giống hệt nhau — dấu hiệu 1 người tạo nhiều địa chỉ.
  const localOf = (email) => (email||'').split('@')[0].replace(/\+.*$/, '').toLowerCase();
  const localA = localOf(p.email), localB = localOf(referrer.email);
  if(localA && localB && localA === localB) return 'Email gần giống người giới thiệu (cùng tên trước @)';
  // Người giới thiệu vừa tự tạo tài khoản ngay trước đó, CHƯA từng dùng gì (chưa trả phí, 0 lượt
  // dùng thử) — dấu hiệu tài khoản chỉ tạo ra để giới thiệu chứ không dùng thật.
  if(referrer.created_at && p.created_at && !referrer.has_paid && (referrer.trial_ai_uses||0)===0){
    const gapMs = new Date(p.created_at).getTime() - new Date(referrer.created_at).getTime();
    if(gapMs >= 0 && gapMs < 2*3600000) return 'Người giới thiệu vừa tạo tài khoản (chưa dùng gì) ngay trước khi giới thiệu';
  }
  return null;
}

function statusOf(p){
  if(p.role==='admin') return { label:'Admin', cls:'admin' };
  if(!p.access_until) return { label:'Chưa kích hoạt', cls:'none' };
  const diffMs = new Date(p.access_until).getTime() - Date.now();
  if(diffMs <= 0) return { label:'Đã hết hạn', cls:'expired' };
  const days = Math.ceil(diffMs / 86400000);
  if(days <= 3) return { label:`Sắp hết hạn (${days} ngày)`, cls:'soon' };
  return { label:`Đang hoạt động (${days} ngày)`, cls:'active' };
}

function render(container, ctx){
  const state = { screen:'loading', profiles:[], revenueTotal:0, revenueThisMonth:0, revenueByProfile:{}, q:'', planFilter:'all', statusFilter:'all', studentOnly:false, error:null, busyId:null, confirmDeleteId:null, manualAmount:{}, manualDays:{}, manualLuot:{}, justMarkedId:null, referralPartners:[], referralCounts:{}, customDays:{}, expandedMemberIds:new Set(), journeyDinhVi:new Set(), journeyPosted:new Set() };

  // Ai giới thiệu >= ngưỡng này được coi là "partner" — chị Quỳnh tự nhắn/chuyển khoản tay trả hoa
  // hồng tiền mặt cho họ (KHÔNG tự động chuyển tiền — SePay chỉ nhận tiền vào, không có API chuyển
  // ra). reward_luot ở bảng referrals chỉ để tham khảo mức % đã áp dụng, không phải số tiền mặt.
  const PARTNER_REFERRAL_THRESHOLD = 5;

  const PLAN_TABS = [
    { key:'all', label:'Tất cả' },
    { key:'30', label:'1 tháng' },
    { key:'180', label:'6 tháng' },
    { key:'365', label:'12 tháng' },
    { key:'none', label:'Chưa rõ gói' },
  ];
  function planKeyOf(p){ return p.last_plan_days ? String(p.last_plan_days) : 'none'; }

  // "k có bộ lọc chưa rõ gói, chỉ có đã hết hạn thôi" (chị Quỳnh 2026-09-07) — trước đây 4 ô số liệu
  // (Đang hoạt động/Sắp hết hạn/Đã hết hạn/Chưa kích hoạt) chỉ để XEM, không bấm lọc được — dùng lại
  // đúng statusOf(p).cls đã có sẵn (khớp 100% với 4 ô số liệu đó) làm bộ lọc thật.
  const STATUS_TABS = [
    { key:'all', label:'Tất cả' },
    { key:'active', label:'Đang hoạt động' },
    { key:'soon', label:'Sắp hết hạn' },
    { key:'expired', label:'Đã hết hạn' },
    { key:'none', label:'Chưa kích hoạt' },
  ];

  function draw(){ container.innerHTML = html(); bind(); }

  async function boot(){
    draw();
    if(!ctx.profile || ctx.profile.role !== 'admin'){
      state.screen = 'denied'; draw(); return;
    }
    // load() TRƯỚC (không gộp Promise.all) — loadReferralPartners() cần state.profiles đã có sẵn
    // để tra email theo referrer_id, chạy song song sẽ có lúc profiles vẫn còn rỗng.
    await load();
    await Promise.all([loadRevenue(), loadReferralPartners(), loadJourneySignals()]);
    state.screen = 'main';
    draw();
  }

  // Hành trình dùng thử → mua gói (theo yêu cầu chị Quỳnh 2026-08-29: tối ưu chuyển đổi) — đủ 3 mốc
  // để nhìn 1 phát biết khách đang kẹt ở đâu: Định Vị xong chưa (positioning_results.luot1), đã thử
  // "AI tự viết + xếp cả tuần" chưa (profiles.used_auto_fill_week_at, xem api/auto-fill-week.js), và
  // đã ĐĂNG bài thật chưa (calendar_entries.posted). 2 mốc đầu cần join riêng vì không nằm trên
  // profiles hoặc load() chỉ select('*') từ profiles.
  async function loadJourneySignals(){
    const [{ data: pos }, { data: posted }] = await Promise.all([
      ctx.supabase.from('positioning_results').select('user_id').not('luot1', 'is', null),
      ctx.supabase.from('calendar_entries').select('user_id').eq('posted', true),
    ]);
    state.journeyDinhVi = new Set((pos||[]).map(r=>r.user_id));
    state.journeyPosted = new Set((posted||[]).map(r=>r.user_id));
  }

  function journeyBadgesHtml(p){
    const steps = [
      { label:'Định Vị', done: state.journeyDinhVi.has(p.id) },
      { label:'AI xếp cả tuần', done: !!p.used_auto_fill_week_at },
      { label:'Đã đăng bài', done: state.journeyPosted.has(p.id) },
    ];
    return steps.map(s=>`<span style="font-size:10.5px;padding:2px 8px;border-radius:999px;background:${s.done?'var(--accent-soft)':'var(--line)'};color:${s.done?'var(--accent)':'var(--ink-soft)'};white-space:nowrap;">${s.done?'✓':'○'} ${s.label}</span>`).join('');
  }

  // Đăng ký mới (theo phản hồi chị Quỳnh 21/8: "người đăng ký mới sẽ đẩy lên đầu danh sách để kiểm
  // soát") đẩy lên ĐẦU danh sách trong 48h đầu, mới nhất lên trước — sau 48h tự rơi về đúng thứ tự
  // cũ (sắp hết hạn lên đầu, giúp việc gia hạn không bị lãng quên). Sort ở client vì logic 2 tầng
  // này khó diễn đạt gọn bằng ORDER BY của PostgREST.
  const NEW_ACCOUNT_WINDOW_MS = 48 * 3600 * 1000;
  function isNewAccount(p){ return !!p.created_at && (Date.now() - new Date(p.created_at).getTime()) < NEW_ACCOUNT_WINDOW_MS; }

  async function load(){
    const { data, error } = await ctx.supabase.from('profiles').select('*');
    if(error){ state.error = error.message; state.profiles = []; return; }
    const rows = (data || []).slice();
    rows.sort((a, b) => {
      const aNew = isNewAccount(a), bNew = isNewAccount(b);
      if (aNew !== bNew) return aNew ? -1 : 1;
      if (aNew) return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      const aU = a.access_until ? new Date(a.access_until).getTime() : -Infinity;
      const bU = b.access_until ? new Date(b.access_until).getTime() : -Infinity;
      return aU - bU;
    });
    state.profiles = rows;
  }

  async function loadReferralPartners(){
    const [{ data }, { data: tcData }, { data: crmData }] = await Promise.all([
      ctx.supabase.from('referrals').select('referrer_id, reward_luot'),
      // Hạng "Hiểu Partner" đếm CỘNG DỒN cả referrals (Xây Nhân Hiệu), tc_referrals (Sổ Dòng Tiền),
      // và crm_referrals (Trợ Lý AI Tư Vấn & CRM) — không lưu tổng ở profiles, tính trực tiếp mỗi
      // lần cần (xem comment is_vip_partner ở schema_full.sql).
      ctx.supabase.from('tc_referrals').select('referrer_id'),
      ctx.supabase.from('crm_referrals').select('referrer_id, reward_luot'),
    ]);
    const rows = data || [];
    const byReferrer = {};
    rows.forEach(r=>{
      if(!byReferrer[r.referrer_id]) byReferrer[r.referrer_id] = { count:0, luot:0 };
      byReferrer[r.referrer_id].count++;
      byReferrer[r.referrer_id].luot += (r.reward_luot||0);
    });
    (tcData || []).forEach(r=>{
      if(!byReferrer[r.referrer_id]) byReferrer[r.referrer_id] = { count:0, luot:0 };
      byReferrer[r.referrer_id].count++;
    });
    (crmData || []).forEach(r=>{
      if(!byReferrer[r.referrer_id]) byReferrer[r.referrer_id] = { count:0, luot:0 };
      byReferrer[r.referrer_id].count++;
      byReferrer[r.referrer_id].luot += (r.reward_luot||0);
    });
    // Giữ lại TOÀN BỘ map (không chỉ ai đủ ngưỡng partner) để hiện số liệu giới thiệu ngay trên
    // từng thẻ tài khoản bên dưới — không phải chỉ ai đạt >= PARTNER_REFERRAL_THRESHOLD mới thấy.
    state.referralCounts = byReferrer;
    state.referralPartners = Object.entries(byReferrer)
      .filter(([, v]) => v.count >= PARTNER_REFERRAL_THRESHOLD)
      .map(([referrerId, v]) => {
        const p = state.profiles.find(pr => pr.id === referrerId);
        return { id: referrerId, email: (p && p.email) || referrerId, fullName: p && p.full_name, count: v.count, luot: v.luot };
      })
      .sort((a, b) => b.count - a.count);
  }

  // Tính tổng doanh thu từ TOÀN BỘ giao dịch đã khớp (không giới hạn 20 dòng như danh sách hiển
  // thị bên trên) — chỉ lấy 2 cột cần thiết cho nhẹ, cộng dồn ở client.
  async function loadRevenue(){
    const { data } = await ctx.supabase.from('sepay_transactions').select('transfer_amount, created_at, matched_profile_id').eq('status', 'matched');
    const rows = data || [];
    state.revenueTotal = rows.reduce((sum, r) => sum + (r.transfer_amount || 0), 0);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    state.revenueThisMonth = rows
      .filter(r => new Date(r.created_at).getTime() >= startOfMonth)
      .reduce((sum, r) => sum + (r.transfer_amount || 0), 0);
    // Tổng đã ghi nhận riêng từng người — hiện ngay trên thẻ của họ, để "Ghi nhận vào doanh thu"
    // có kết quả nhìn thấy được lâu dài chứ không chỉ 1 thông báo thoáng qua rồi biến mất.
    state.revenueByProfile = rows.reduce((acc, r) => {
      if(r.matched_profile_id) acc[r.matched_profile_id] = (acc[r.matched_profile_id]||0) + (r.transfer_amount||0);
      return acc;
    }, {});
  }

  function filtered(){
    const q = state.q.trim().toLowerCase();
    return state.profiles.filter(p => {
      if(state.planFilter !== 'all' && planKeyOf(p) !== state.planFilter) return false;
      if(state.statusFilter !== 'all' && statusOf(p).cls !== state.statusFilter) return false;
      if(state.studentOnly && !p.is_student) return false;
      if(!q) return true;
      return (p.email||'').toLowerCase().includes(q) ||
        (p.full_name||'').toLowerCase().includes(q) ||
        (p.ref_code||'').toLowerCase().includes(q);
    });
  }

  function html(){
    if(state.screen==='loading') return `<div class="loading"><div class="spinner"></div><p>Đang tải…</p></div>`;
    if(state.screen==='denied') return `<div class="page-head"><h1>Không có quyền truy cập</h1><p>Mục này chỉ dành cho quản trị viên.</p></div>`;

    const list = filtered();
    const counts = state.profiles.reduce((acc,p)=>{ const s=statusOf(p).cls; acc[s]=(acc[s]||0)+1; return acc; }, {});
    const mismatchCount = state.profiles.filter(hasPaidMismatch).length;
    const anomalies = state.profiles.map(p=>({ p, msg: quotaAnomaly(p) })).filter(x=>x.msg);
    const referralSuspects = state.profiles
      .map(p=>({ p, referrer: p.referred_by_ref_code ? state.profiles.find(x=>x.ref_code===p.referred_by_ref_code) : null }))
      .map(x=>({ p:x.p, msg: x.referrer ? selfReferralSuspect(x.p, x.referrer) : null }))
      .filter(x=>x.msg);
    return `
      <div class="page-head"><h1>Quản trị học viên</h1><p>Danh sách tài khoản, hạn dùng, và gia hạn nhanh sau khi học viên thanh toán. Xem doanh thu/chi phí/lợi nhuận ở tab <b>Tài chính</b>.</p></div>
      <div style="font-size:11.5px;color:var(--ink-soft);margin-top:-12px;margin-bottom:16px;">Trần lượt dùng thử (trọn đời) chốt riêng lúc mỗi người đăng ký, xem đúng số ở từng thẻ bên dưới (mục "Đã dùng") — hiện tại người đăng ký từ 24/8 là 50 lượt, người đăng ký trước đó là ${TRIAL_AI_LIMIT} lượt. Trả phí thì đổi sang <b>${PAID_MONTHLY_AI_LIMIT} lượt/tháng</b> (bộ đếm khác, không cộng dồn với lượt dùng thử).</div>

      <div class="source-grid" style="margin-bottom:20px;">
        <div class="source-card"><div class="ic">${counts.active||0}</div><div class="label">Đang hoạt động</div></div>
        <div class="source-card"><div class="ic">${counts.soon||0}</div><div class="label">Sắp hết hạn</div></div>
        <div class="source-card"><div class="ic">${counts.expired||0}</div><div class="label">Đã hết hạn</div></div>
        <div class="source-card"><div class="ic">${counts.none||0}</div><div class="label">Chưa kích hoạt</div></div>
      </div>

      ${mismatchCount>0 ? `<div class="error-box" style="margin-bottom:20px;">⚠️ Có <b>${mismatchCount} tài khoản</b> đã gắn "Gói" (chắc chắn đã kích hoạt tay) nhưng CHƯA bấm "💰 Đánh dấu đã trả phí" — họ đang bị hiện SAI trần lượt (trần dùng thử thay vì ${PAID_MONTHLY_AI_LIMIT} lượt/tháng). Tìm nhãn "⚠️ Chưa đánh dấu trả phí" trên từng thẻ bên dưới để sửa nhanh.</div>` : ''}
      ${anomalies.length>0 ? `<div class="error-box" style="margin-bottom:20px;">⚠️ Rà soát chu kỳ lượt AI: <b>${anomalies.length} tài khoản</b> có dữ liệu bất thường —
        <ul style="margin:6px 0 0;padding-left:18px;">
          ${anomalies.map(x=>`<li>${esc(x.p.email||x.p.id.slice(0,8))}: ${esc(x.msg)}</li>`).join('')}
        </ul>
      </div>` : (state.profiles.some(p=>p.has_paid && p.role!=='admin') ? `<div class="hint-box" style="margin-bottom:20px;">✓ Đã rà soát chu kỳ lượt AI cho toàn bộ tài khoản trả phí — không thấy bất thường.</div>` : '')}
      ${referralSuspects.length>0 ? `<div class="error-box" style="margin-bottom:20px;">⚠️ Nghi có <b>${referralSuspects.length} lượt giới thiệu</b> tự giới thiệu chính mình — chỉ là dấu hiệu, chị tự kiểm tra, không tự động chặn/thu hồi gì:
        <ul style="margin:6px 0 0;padding-left:18px;">
          ${referralSuspects.map(x=>`<li>${esc(x.p.email||x.p.id.slice(0,8))}: ${esc(x.msg)}</li>`).join('')}
        </ul>
      </div>` : ''}

      ${state.referralPartners.length ? `
      <div class="card" style="margin-bottom:20px;border-color:var(--gold);">
        <h3 style="margin-bottom:6px;">🌟 Hiểu Partner (≥ ${PARTNER_REFERRAL_THRESHOLD} người, cộng dồn mọi sản phẩm)</h3>
        <div style="font-size:12px;color:var(--ink-soft);margin-bottom:12px;">Đủ ngưỡng để cân nhắc trả hoa hồng tiền mặt — tự nhắn/chuyển khoản tay, hệ thống không tự động chuyển tiền.</div>
        ${state.referralPartners.map(rp=>`
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:6px 0;border-bottom:1px solid var(--line);font-size:13.5px;flex-wrap:wrap;">
            <span>${esc(rp.email)}${rp.fullName?` <span style="color:var(--ink-soft);">(${esc(rp.fullName)})</span>`:''}</span>
            <span><b style="color:var(--accent);">${rp.count}</b> người · đã tặng <b>${rp.luot}</b> lượt</span>
          </div>
        `).join('')}
      </div>
      ` : ''}

      <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:8px;">Lọc theo gói đã mua gần nhất</label>
      <div class="chips" style="margin-bottom:20px;">
        ${PLAN_TABS.map(t=>{
          const n = t.key==='all' ? state.profiles.filter(p=>p.role!=='admin').length : state.profiles.filter(p=>p.role!=='admin' && planKeyOf(p)===t.key).length;
          return `<div class="chip ${state.planFilter===t.key?'selected':''}" data-plan-filter="${t.key}">${esc(t.label)} (${n})</div>`;
        }).join('')}
      </div>

      <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:8px;">Lọc theo trạng thái hạn dùng</label>
      <div class="chips" style="margin-bottom:20px;">
        ${STATUS_TABS.map(t=>{
          const n = t.key==='all' ? state.profiles.filter(p=>p.role!=='admin').length : state.profiles.filter(p=>p.role!=='admin' && statusOf(p).cls===t.key).length;
          return `<div class="chip ${state.statusFilter===t.key?'selected':''}" data-status-filter="${t.key}">${esc(t.label)} (${n})</div>`;
        }).join('')}
      </div>

      <div class="chips" style="margin-bottom:20px;">
        <div class="chip ${state.studentOnly?'selected':''}" data-student-filter="1">🎓 Chỉ học viên (${state.profiles.filter(p=>p.role!=='admin' && p.is_student).length})</div>
      </div>

      <div class="card" style="margin-bottom:20px;">
        <input id="q-search" type="text" placeholder="Tìm theo email, tên, hoặc mã tham chiếu chuyển khoản..." value="${esc(state.q)}"
          style="width:100%;padding:12px 14px;border:1px solid var(--line);border-radius:10px;font-size:14.5px;background:#FDFCF8;">
      </div>

      ${state.error?`<div class="error-box">${esc(state.error)}</div>`:''}

      ${list.map(p=>{
        const st = statusOf(p);
        const miniLabel = `font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.05em;`;
        const planUnclear = planKeyOf(p) === 'none';
        const isExpanded = state.expandedMemberIds.has(p.id);
        return `
        <div class="section">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;cursor:pointer;" data-toggle-member="${p.id}">
            <div>
              <h3 style="margin-bottom:2px;">${esc(p.email||'(không có email)')}${isNewAccount(p) ? ` <span style="font-size:11px;font-weight:700;color:var(--gold);vertical-align:middle;">🆕 Mới đăng ký</span>` : ''}${hasPaidMismatch(p) ? ` <span style="font-size:11px;font-weight:700;color:var(--danger);vertical-align:middle;">⚠️ Chưa đánh dấu trả phí</span>` : ''}${quotaAnomaly(p) ? ` <span style="font-size:11px;font-weight:700;color:var(--danger);vertical-align:middle;" title="${esc(quotaAnomaly(p))}">⚠️ Lượt AI bất thường</span>` : ''}</h3>
              <div style="color:var(--ink-soft);font-size:13px;">${esc(p.full_name||'')}</div>
              ${p.role!=='admin' ? `<div style="margin-top:4px;font-size:12px;color:var(--ink-soft);">⚡ ${esc(aiUsageShortLabel(p))}</div>` : ''}
              ${p.role!=='admin' && !p.has_paid ? `<div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap;">${journeyBadgesHtml(p)}</div>` : ''}
            </div>
            <span style="font-family:'IBM Plex Mono',monospace;font-size:11.5px;padding:4px 10px;border-radius:999px;white-space:nowrap;
              background:${st.cls==='active'?'var(--accent-soft)':st.cls==='soon'?'#FBF6E9':st.cls==='expired'?'#FBEAE4':st.cls==='admin'?'#EDEAE0':'var(--line)'};
              color:${st.cls==='active'?'var(--accent)':st.cls==='soon'?'var(--gold)':st.cls==='expired'?'var(--danger)':'var(--ink-soft)'};">${esc(st.label)}</span>
          </div>

          ${p.role!=='admin' && !isExpanded ? `<span style="color:var(--accent);font-size:12.5px;font-weight:600;cursor:pointer;" data-toggle-member="${p.id}">▸ Xem chi tiết</span>` : ''}
          ${p.role!=='admin' && isExpanded ? `<span style="display:block;margin-top:6px;color:var(--accent);font-size:12.5px;font-weight:600;cursor:pointer;" data-toggle-member="${p.id}">▾ Thu gọn</span>` : ''}

          ${p.role!=='admin' && isExpanded ? `
            <div style="margin-top:12px;display:grid;grid-template-columns:1fr 1fr;gap:5px 16px;font-size:13px;">
              <div><span style="color:var(--ink-soft);">Hạn dùng:</span> ${p.access_until ? esc(new Date(p.access_until).toLocaleString('vi-VN')) : '(chưa có)'}</div>
              <div><span style="color:var(--ink-soft);">Gói:</span> <b>${esc((PLAN_TABS.find(t=>t.key===planKeyOf(p))||{}).label||'Chưa rõ')}</b>
                <span style="margin-left:6px;font-size:12px;">— gắn tay:
                  <span style="text-decoration:underline;cursor:pointer;" data-set-plan="${p.id}|30">1th</span>/<span style="text-decoration:underline;cursor:pointer;" data-set-plan="${p.id}|180">6th</span>/<span style="text-decoration:underline;cursor:pointer;" data-set-plan="${p.id}|365">12th</span>${!planUnclear ? `/<span style="text-decoration:underline;cursor:pointer;color:var(--danger);" data-set-plan="${p.id}|clear">xoá</span>` : ''}</span>
              </div>
              <div><span style="color:var(--ink-soft);">Đã dùng:</span> ${esc(aiUsageLabel(p))}</div>
              <div><span style="color:var(--ink-soft);">Loại khách:</span> ${p.is_student?'🎓 Học viên':'Thường'}
                <span style="text-decoration:underline;cursor:pointer;font-size:12px;margin-left:4px;" data-toggle-student="${p.id}|${!p.is_student}">đổi</span></div>
              <div style="grid-column:1/-1;"><span style="color:var(--ink-soft);">Thanh toán:</span> ${p.has_paid?`💰 Đã trả phí (trần ${PAID_MONTHLY_AI_LIMIT} lượt/tháng)`:`Chưa trả phí (trần dùng thử ${p.trial_ai_limit||TRIAL_AI_LIMIT} lượt)`}
                <span style="text-decoration:underline;cursor:pointer;font-size:12px;margin-left:4px;" data-toggle-paid="${p.id}|${!p.has_paid}">đổi</span></div>
              ${p.ref_code ? `<div style="grid-column:1/-1;color:var(--ink-soft);font-size:12.5px;">Nội dung CK: <span style="font-family:'IBM Plex Mono',monospace;">SEVQR ${esc(p.ref_code)}</span></div>` : ''}
              ${p.is_vip_partner ? `<div style="grid-column:1/-1;color:var(--gold,var(--accent));font-size:12.5px;font-weight:600;">👑 VIP Partner (+10 điểm % hoa hồng)</div>` : ''}
              ${(() => {
                const rc = state.referralCounts[p.id];
                const referrer = p.referred_by_ref_code ? state.profiles.find(x=>x.ref_code===p.referred_by_ref_code) : null;
                if(!rc && !referrer) return '';
                const parts = [];
                if(rc) parts.push(`đã giới thiệu <b>${rc.count}</b> người (tặng ${rc.luot} lượt)${rc.count>=PARTNER_REFERRAL_THRESHOLD?' 🌟 Hiểu Partner':''}`);
                if(referrer) parts.push(`được giới thiệu bởi <b>${esc(referrer.email||referrer.ref_code)}</b>`);
                const suspect = referrer ? selfReferralSuspect(p, referrer) : null;
                return `<div style="grid-column:1/-1;color:var(--ink-soft);font-size:12.5px;">Giới thiệu: ${parts.join(' · ')}${suspect?` <span style="color:var(--danger);font-weight:600;" title="Chỉ là nghi vấn, không tự động chặn/thu hồi gì — chị tự kiểm tra">⚠️ Nghi tự giới thiệu chính mình: ${esc(suspect)}</span>`:''}</div>`;
              })()}
            </div>

            <div style="${miniLabel}margin-top:14px;margin-bottom:6px;">Gia hạn thủ công</div>
            <div class="btn-row" style="justify-content:flex-start;">
              <button class="btn btn-sm" data-extend="${p.id}|30" ${state.busyId===p.id?'disabled':''}>+30 ngày</button>
              <button class="btn btn-sm" data-extend="${p.id}|180" ${state.busyId===p.id?'disabled':''}>+180 ngày</button>
              <button class="btn btn-sm" data-extend="${p.id}|365" ${state.busyId===p.id?'disabled':''}>+365 ngày</button>
              <button class="btn-ghost btn btn-sm" data-revoke="${p.id}" ${state.busyId===p.id?'disabled':''}>Thu hồi ngay</button>
            </div>
            <div class="btn-row" style="justify-content:flex-start;margin-top:4px;">
              <button class="btn-ghost btn btn-sm" style="color:var(--danger);" data-extend="${p.id}|-30" ${state.busyId===p.id?'disabled':''}>Hoàn tác -30</button>
              <button class="btn-ghost btn btn-sm" style="color:var(--danger);" data-extend="${p.id}|-180" ${state.busyId===p.id?'disabled':''}>Hoàn tác -180</button>
              <button class="btn-ghost btn btn-sm" style="color:var(--danger);" data-extend="${p.id}|-365" ${state.busyId===p.id?'disabled':''}>Hoàn tác -365</button>
            </div>
            <div style="font-size:11.5px;color:var(--ink-soft);margin-top:4px;">Không tự tính vào doanh thu — kích hoạt tay cho khách chuyển khoản thật thì ghi nhận doanh thu riêng bên dưới.</div>

            <div class="btn-row" style="justify-content:flex-start;align-items:center;margin-top:8px;">
              <input type="number" data-custom-days="${p.id}" placeholder="Số ngày, vd 4" style="width:110px;padding:6px 10px;border:1px solid var(--line);border-radius:6px;font-size:12.5px;" value="${esc(state.customDays[p.id]||'')}">
              <button class="btn-ghost btn btn-sm" data-extend-trial="${p.id}" ${state.busyId===p.id?'disabled':''}>Bù ngày dùng thử (không đánh dấu đã trả phí)</button>
            </div>
            <div style="font-size:11.5px;color:var(--ink-soft);margin-top:4px;">Dùng khi cần cộng bù đúng số ngày lẻ (vd sửa lỗi thiếu ngày dùng thử) — chỉ đổi hạn dùng, KHÔNG bật "đã trả phí" như 3 nút bên trên.</div>

            <div style="${miniLabel}margin-top:14px;margin-bottom:6px;">Cộng/hoàn lượt AI thủ công</div>
            <div class="btn-row" style="justify-content:flex-start;align-items:center;">
              <input type="number" data-manual-luot="${p.id}" placeholder="Số lượt, vd 22" style="width:120px;padding:6px 10px;border:1px solid var(--line);border-radius:6px;font-size:12.5px;" value="${esc(state.manualLuot[p.id]||'')}">
              <button class="btn-ghost btn btn-sm" data-credit-luot="${p.id}" ${state.busyId===p.id?'disabled':''}>Cộng lượt</button>
            </div>
            <div style="font-size:11.5px;color:var(--ink-soft);margin-top:4px;">Dùng khi cần hoàn lượt cho khách bị lỗi (vd bấm "AI viết cả tuần" bị timeout mà vẫn bị trừ lượt) — trừ thẳng vào số đã dùng của chu kỳ hiện tại (dùng thử: trọn đời, đã trả phí: đúng chu kỳ 30 ngày đang tính), không đụng gì khác.</div>

            <div style="${miniLabel}margin-top:14px;margin-bottom:6px;">Ghi nhận doanh thu thủ công</div>
            <div class="btn-row" style="justify-content:flex-start;align-items:center;">
              <input type="number" data-manual-amount="${p.id}" placeholder="Số tiền đã nhận, vd 499000" style="width:180px;padding:6px 10px;border:1px solid var(--line);border-radius:6px;font-size:12.5px;" value="${esc(state.manualAmount[p.id]||'')}">
              <select data-manual-days="${p.id}" style="padding:6px 10px;border:1px solid var(--line);border-radius:6px;font-size:12.5px;">
                <option value="" ${!state.manualDays[p.id]?'selected':''}>Gói (không rõ)</option>
                <option value="30" ${state.manualDays[p.id]==='30'?'selected':''}>1 tháng</option>
                <option value="180" ${state.manualDays[p.id]==='180'?'selected':''}>6 tháng</option>
                <option value="365" ${state.manualDays[p.id]==='365'?'selected':''}>12 tháng</option>
              </select>
              <button class="btn-ghost btn btn-sm" data-mark-revenue="${p.id}" ${state.busyId===p.id?'disabled':''}>Ghi nhận</button>
              ${state.justMarkedId===p.id ? `<span style="color:var(--accent);font-weight:600;font-size:12.5px;">✓ Thành công</span>` : ''}
              ${state.revenueByProfile[p.id] ? `<span style="color:var(--accent);font-size:12.5px;">Đã ghi nhận: ${state.revenueByProfile[p.id].toLocaleString('vi-VN')}đ</span>` : ''}
            </div>
            <div style="font-size:11px;color:var(--ink-soft);margin-top:4px;">Chọn đúng gói để tính đúng "Gói đã mua gần nhất" và phân bổ doanh thu theo tháng ở tab Tài chính — bỏ trống nếu không rõ khách mua gói mấy tháng.</div>

            <div style="margin-top:16px;padding-top:10px;border-top:1px solid var(--line);">
              ${state.confirmDeleteId===p.id ? `
                <span style="font-size:12.5px;color:var(--danger);font-weight:600;">Xoá vĩnh viễn tài khoản này? Không khôi phục được.</span>
                <button class="btn btn-sm" style="background:var(--danger);margin-left:8px;" data-confirm-delete="${p.id}" ${state.busyId===p.id?'disabled':''}>${state.busyId===p.id?'Đang xoá…':'Xác nhận xoá'}</button>
                <span class="btn-ghost btn btn-sm" data-cancel-delete="1">Huỷ</span>
              ` : `
                <span style="color:var(--danger);cursor:pointer;font-size:12px;" data-ask-delete="${p.id}">Xoá tài khoản (tài khoản test/rác)</span>
              `}
            </div>
          ` : ''}
        </div>
      `;}).join('')}
    `;
  }

  function bind(){
    container.querySelectorAll('[data-toggle-member]').forEach(el=>{
      el.onclick = ()=>{
        const id = el.getAttribute('data-toggle-member');
        if(state.expandedMemberIds.has(id)) state.expandedMemberIds.delete(id); else state.expandedMemberIds.add(id);
        draw();
      };
    });
    const search = container.querySelector('#q-search');
    if(search) search.oninput = ()=>{
      state.q = search.value;
      const pos = search.selectionStart;
      draw();
      // draw() vẽ lại toàn bộ innerHTML nên input cũ bị xoá khỏi DOM — gọi .focus() trên biến
      // "search" (đã detach) không có tác dụng gì, phải lấy lại đúng ô MỚI rồi mới focus được,
      // không thì gõ mỗi chữ lại mất focus, phải bấm chuột vào ô lần nữa mới gõ tiếp được.
      const newEl = container.querySelector('#q-search');
      if(newEl){ newEl.focus(); newEl.setSelectionRange(pos, pos); }
    };

    container.querySelectorAll('[data-plan-filter]').forEach(el=>{
      el.onclick = ()=>{ state.planFilter = el.getAttribute('data-plan-filter'); draw(); };
    });
    container.querySelectorAll('[data-status-filter]').forEach(el=>{
      el.onclick = ()=>{ state.statusFilter = el.getAttribute('data-status-filter'); draw(); };
    });
    const studentFilterEl = container.querySelector('[data-student-filter]');
    if(studentFilterEl) studentFilterEl.onclick = ()=>{ state.studentOnly = !state.studentOnly; draw(); };
    container.querySelectorAll('[data-set-plan]').forEach(el=>{
      el.onclick = ()=>{
        const [id, days] = el.getAttribute('data-set-plan').split('|');
        setPlanOnly(id, days === 'clear' ? null : Number(days));
      };
    });

    container.querySelectorAll('[data-extend]').forEach(el=>{
      el.onclick = ()=>{
        const [id, days] = el.getAttribute('data-extend').split('|');
        extend(id, Number(days));
      };
    });
    container.querySelectorAll('[data-revoke]').forEach(el=>{
      el.onclick = ()=>{ revoke(el.getAttribute('data-revoke')); };
    });
    container.querySelectorAll('[data-custom-days]').forEach(el=>{
      el.oninput = ()=>{ state.customDays[el.getAttribute('data-custom-days')] = el.value; };
    });
    container.querySelectorAll('[data-extend-trial]').forEach(el=>{
      el.onclick = ()=>{
        const id = el.getAttribute('data-extend-trial');
        extendTrialOnly(id, Number(state.customDays[id]));
      };
    });
    container.querySelectorAll('[data-toggle-student]').forEach(el=>{
      el.onclick = ()=>{
        const [id, next] = el.getAttribute('data-toggle-student').split('|');
        toggleStudent(id, next === 'true');
      };
    });
    container.querySelectorAll('[data-toggle-paid]').forEach(el=>{
      el.onclick = ()=>{
        const [id, next] = el.getAttribute('data-toggle-paid').split('|');
        toggleHasPaid(id, next === 'true');
      };
    });
    container.querySelectorAll('[data-manual-days]').forEach(el=>{
      el.onchange = ()=>{ state.manualDays[el.getAttribute('data-manual-days')] = el.value; };
    });
    container.querySelectorAll('[data-manual-amount]').forEach(el=>{
      el.oninput = ()=>{ state.manualAmount[el.getAttribute('data-manual-amount')] = el.value; };
    });
    container.querySelectorAll('[data-manual-luot]').forEach(el=>{
      el.oninput = ()=>{ state.manualLuot[el.getAttribute('data-manual-luot')] = el.value; };
    });
    container.querySelectorAll('[data-credit-luot]').forEach(el=>{
      el.onclick = ()=>{
        const id = el.getAttribute('data-credit-luot');
        creditManualLuot(id, Number(state.manualLuot[id]));
      };
    });
    container.querySelectorAll('[data-mark-revenue]').forEach(el=>{
      el.onclick = ()=>{ markRevenue(el.getAttribute('data-mark-revenue')); };
    });

    container.querySelectorAll('[data-ask-delete]').forEach(el=>{
      el.onclick = ()=>{ state.confirmDeleteId = el.getAttribute('data-ask-delete'); draw(); };
    });
    const cancelDeleteLink = container.querySelector('[data-cancel-delete]');
    if(cancelDeleteLink) cancelDeleteLink.onclick = ()=>{ state.confirmDeleteId = null; draw(); };
    container.querySelectorAll('[data-confirm-delete]').forEach(el=>{
      el.onclick = ()=>{ deleteAccount(el.getAttribute('data-confirm-delete')); };
    });
  }

  async function deleteAccount(id){
    state.busyId = id; draw();
    try{
      await callApi('/api/admin-delete-user', { user_id: id });
      state.error = null;
    } catch(e){ state.error = e.message; }
    state.confirmDeleteId = null;
    state.busyId = null;
    await load();
    draw();
  }

  async function toggleStudent(id, isStudent){
    state.busyId = id; draw();
    const { error } = await ctx.supabase.from('profiles').update({ is_student: isStudent }).eq('id', id);
    if(error) state.error = error.message; else state.error = null;
    await load();
    state.busyId = null;
    draw();
  }

  // Dùng khi kích hoạt TAY cho khách đã chuyển khoản thật (vd lúc webhook SePay bị lỗi/trễ đồng bộ)
  // — "Gia hạn" chỉ cộng ngày dùng (access_until), không tự bật has_paid, nên nếu không bấm thêm nút
  // này, khách vẫn bị tính lượt AI theo trần dùng thử (100 lượt trọn đời) dù đã có hạn dùng dài hơn.
  async function toggleHasPaid(id, hasPaid){
    state.busyId = id; draw();
    // first_paid_at: mốc bắt đầu trả phí, neo chu kỳ lượt/tháng (chị Quỳnh 2026-09-07, xem cột này ở
    // schema_core.sql) — CHỈ set khi bật has_paid VÀ chưa từng có mốc này (tránh bấm tắt/bật lại đè
    // mất mốc gốc thật của khách).
    const p = (state.profiles||[]).find(x=>x.id===id);
    const patch = { has_paid: hasPaid };
    if(hasPaid && p && !p.first_paid_at) patch.first_paid_at = new Date().toISOString();
    const { error } = await ctx.supabase.from('profiles').update(patch).eq('id', id);
    if(error) state.error = error.message; else state.error = null;
    await load();
    state.busyId = null;
    draw();
  }

  // Ghi nhận 1 khoản kích hoạt tay vào sepay_transactions (qua serverless function, vì bảng này chỉ
  // cho service_role ghi) — để nó được cộng vào "Tổng doanh thu"/"Doanh thu tháng này" ở trên, thứ
  // mà "Gia hạn"/"Đánh dấu đã trả phí" một mình không làm được.
  async function markRevenue(id){
    const amount = Number(state.manualAmount[id]);
    if(!amount || amount <= 0){ state.error = 'Nhập đúng số tiền đã nhận trước khi ghi nhận.'; draw(); return; }
    const days = Number(state.manualDays[id]) || null;
    state.busyId = id; draw();
    try{
      await callApi('/api/admin-mark-manual-payment', { user_id: id, amount, days });
      // Trước đây ghi nhận doanh thu không gắn nhãn gói (last_plan_days) — nên "Lọc theo gói đã
      // mua gần nhất" ở trên không đếm đúng người vừa ghi nhận doanh thu qua đây. Gắn nhãn gói
      // luôn nếu admin có chọn (chỉ gắn nhãn, không đụng access_until — vẫn cần bấm "Gia hạn" riêng).
      if(days) await ctx.supabase.from('profiles').update({ last_plan_days: days }).eq('id', id);
      state.manualAmount[id] = '';
      state.manualDays[id] = '';
      state.error = null;
      state.justMarkedId = id;
      setTimeout(()=>{ if(state.justMarkedId===id){ state.justMarkedId = null; draw(); } }, 4000);
    } catch(e){ state.error = e.message; }
    await Promise.all([load(), loadRevenue()]);
    state.busyId = null;
    draw();
  }

  async function extend(id, days){
    const p = state.profiles.find(x=>x.id===id);
    const base = (p.access_until && new Date(p.access_until).getTime() > Date.now()) ? new Date(p.access_until) : new Date();
    const next = new Date(base.getTime() + days*86400000);
    // "Hoàn tác" chỉ TRỪ THẲNG N ngày khỏi hạn dùng hiện tại — không biết có thật sự vừa cộng nhầm
    // N ngày đó hay không, nên nếu bấm nhầm người/nhầm nút có thể trừ vào hạn dùng THẬT của họ, đẩy
    // về quá khứ (hết hạn oan, kể cả đang dùng thử). Luôn cho xem trước ngày mới + cảnh báo rõ nếu
    // kết quả là hết hạn, để admin tự huỷ nếu thấy sai trước khi bấm xác nhận.
    const willExpire = next.getTime() <= Date.now();
    const msg = `${days<0?'Hoàn tác':'Gia hạn'} cho ${p.email||'người này'}: hạn dùng sẽ đổi thành ${next.toLocaleString('vi-VN')}`
      + (days > 0 && !p.has_paid ? ' — sẽ tự đánh dấu ĐÃ TRẢ PHÍ luôn (trần đổi sang 200 lượt/tháng).' : '')
      + (willExpire ? ' — CHÚ Ý: ngày này đã ở QUÁ KHỨ, tài khoản sẽ bị coi là hết hạn ngay lập tức. Chắc chắn đúng người/đúng số ngày chưa?' : '. Xác nhận?');
    if(!(await confirmModal(msg))) return;
    state.busyId = id; draw();
    // days âm = nút "Hoàn tác" (lỡ bấm nhầm) — xoá luôn nhãn gói vừa gán sai (không biết chắc gói
    // thật trước đó là gì nên đưa về "Chưa rõ gói", admin gắn nhãn lại tay nếu cần) thay vì để nhãn
    // sai (vd tự bị gắn "6 tháng") tồn tại mãi dù đã hoàn tác hạn dùng.
    const patch = { access_until: next.toISOString(), last_plan_days: days > 0 ? days : null };
    // Tự động bật has_paid khi Gia hạn THẬT (days>0) — theo yêu cầu chị Quỳnh 22/8, gộp nút này với
    // "Đánh dấu đã trả phí" để tránh sự cố quên bấm 1 trong 2 (Gia hạn vốn chỉ dùng khi khách đã
    // thanh toán thật, xem page-head). "Hoàn tác" (days<0) KHÔNG đụng has_paid — không chắc trạng
    // thái trả phí trước đó, tắt oan có thể ảnh hưởng 1 giao dịch thật trước đó của cùng người.
    if(days > 0){
      patch.has_paid = true;
      // first_paid_at: mốc bắt đầu trả phí, neo chu kỳ lượt/tháng (chị Quỳnh 2026-09-07) — CHỈ set
      // nếu chưa từng có, tránh Gia hạn nhiều lần sau đó đè mất mốc gốc thật của khách.
      if(!p.first_paid_at) patch.first_paid_at = new Date().toISOString();
    }
    const { error } = await ctx.supabase.from('profiles').update(patch).eq('id', id);
    if(error) state.error = error.message; else state.error = null;
    await load();
    state.busyId = null;
    draw();
  }

  // Bù ngày dùng thử lẻ (vd sửa lỗi thiếu ngày do đổi cấu hình giữa chừng, 2026-08-23) — KHÁC "Gia
  // hạn" ở trên: chỉ đổi access_until, KHÔNG tự bật has_paid/last_plan_days, vì đây không phải xác
  // nhận thanh toán thật, chỉ là bù đúng số ngày còn thiếu cho người đang dùng thử.
  async function extendTrialOnly(id, days){
    if(!days || days <= 0 || !Number.isFinite(days)){ state.error = 'Nhập số ngày hợp lệ (lớn hơn 0) trước khi bù.'; draw(); return; }
    const p = state.profiles.find(x=>x.id===id);
    const base = (p.access_until && new Date(p.access_until).getTime() > Date.now()) ? new Date(p.access_until) : new Date();
    const next = new Date(base.getTime() + days*86400000);
    const msg = `Bù ${days} ngày dùng thử cho ${p.email||'người này'}: hạn dùng sẽ đổi thành ${next.toLocaleString('vi-VN')} — KHÔNG đánh dấu đã trả phí. Xác nhận?`;
    if(!(await confirmModal(msg))) return;
    state.busyId = id; draw();
    const { error } = await ctx.supabase.from('profiles').update({ access_until: next.toISOString() }).eq('id', id);
    if(error) state.error = error.message; else { state.error = null; state.customDays[id] = ''; }
    await load();
    state.busyId = null;
    draw();
  }

  // Cộng/hoàn lượt AI thủ công cho 1 khách — dùng khi tính năng nào đó lỗi trừ lượt oan (vd "AI viết
  // cả tuần" timeout, xem lich-dang.js) và không có cách nào tự hoàn qua code (lỗi xảy ra ở phía
  // client, không throw exception ở server nên refundTrialQuota() không tự chạy được).
  // - Dùng thử (has_paid=false): trial_ai_uses là bộ đếm TRỌN ĐỜI — trừ thẳng, không âm.
  // - Đã trả phí: paid_ai_uses/paid_ai_bonus tính theo CHU KỲ 30 NGÀY hiện tại (paidCycleAnchor) —
  //   nếu paid_ai_month đang khớp đúng chu kỳ này thì trừ thẳng vào paid_ai_uses (giống hệt
  //   refund_ai_quota() ở schema_core.sql); nếu profile CHƯA dùng AI lần nào trong chu kỳ hiện tại
  //   (paid_ai_month cũ/rỗng) thì phải set luôn paid_ai_month=chu kỳ hiện tại kèm bonus dương — nếu chỉ
  //   cộng bonus mà không sửa paid_ai_month, lần dùng AI tiếp theo của khách sẽ bị RPC coi là "sang chu
  //   kỳ mới" và tự xoá sạch bonus vừa cộng (xem consume_ai_quota()).
  async function creditManualLuot(id, amount){
    if(!amount || amount <= 0 || !Number.isFinite(amount)){ state.error = 'Nhập đúng số lượt (lớn hơn 0) trước khi cộng.'; draw(); return; }
    const p = state.profiles.find(x=>x.id===id);
    if(!p) return;
    if(!(await confirmModal(`Cộng ${amount} lượt AI cho ${p.email||'người này'}? Xác nhận?`))) return;
    state.busyId = id; draw();
    let patch;
    if(p.has_paid){
      const cycle = currentCycleKey(paidCycleAnchor(p));
      patch = p.paid_ai_month === cycle
        ? { paid_ai_uses: Math.max(0, (p.paid_ai_uses||0) - amount) }
        : { paid_ai_month: cycle, paid_ai_uses: 0, paid_ai_bonus: amount };
    } else {
      patch = { trial_ai_uses: Math.max(0, (p.trial_ai_uses||0) - amount) };
    }
    const { error } = await ctx.supabase.from('profiles').update(patch).eq('id', id);
    if(error) state.error = error.message; else { state.error = null; state.manualLuot[id] = ''; }
    await load();
    state.busyId = null;
    draw();
  }

  // Chỉ gắn nhãn gói (last_plan_days) để lọc/đếm cho đúng — KHÔNG đụng access_until, dùng cho các
  // tài khoản đã kích hoạt tay TRƯỚC KHI có tính năng lọc theo gói (nên đang hiện "Chưa rõ gói").
  async function setPlanOnly(id, days){
    state.busyId = id; draw();
    const { error } = await ctx.supabase.from('profiles').update({ last_plan_days: days }).eq('id', id);
    if(error) state.error = error.message; else state.error = null;
    await load();
    state.busyId = null;
    draw();
  }

  async function revoke(id){
    state.busyId = id; draw();
    const { error } = await ctx.supabase.from('profiles').update({ access_until: null }).eq('id', id);
    if(error) state.error = error.message; else state.error = null;
    await load();
    state.busyId = null;
    draw();
  }

  boot();
}
window.Modules = window.Modules || {};
window.Modules['quan-tri'] = { title:'Quản trị thành viên', render };
})();
