(function(){
// Trang Quản Trị cho Sổ Dòng Tiền Tâm Thức — áp dụng quy tắc bên nhan-hieu/js/quan-tri-thongbao.js
// (2026-08-23, theo yêu cầu chị Quỳnh). 5 tab: Thông báo (đăng feature announcement) + Thành viên
// (xem/gán tc_has_paid, gia hạn dùng thử) + Hoa Hồng (chương trình giới thiệu 20%, trả tay) + Tài
// Chính (doanh thu, kèm luôn danh sách giao dịch SePay gần nhất — KHÔNG tách riêng "Giao dịch SePay"
// thành 1 tab như nhan-hieu vì tai-chinh chỉ 1 sản phẩm/3 mức giá, ít dữ liệu hơn hẳn) + Đánh Giá
// (duyệt review trước khi hiện công khai ở Trang chủ — dùng CHUNG bảng app_reviews với nhan-hieu, lọc
// theo cột `app`, xem api/submit-review.js). 2026-08-26, góp ý Quỳnh: "Quản trị cũng cần y hệt bên
// Xây Nhân Hiệu" — thêm Tài Chính/Đánh Giá cho gần với cấu trúc bên đó, phần nào còn thiếu (vd Kho
// nội dung) là do tai-chinh không có khái niệm tương ứng, không phải bỏ sót. Route này chỉ hiện
// trong sidebar khi profiles.role==='admin' (xem app-shell.js NAV, cờ adminOnly) — nhưng RLS ở
// Supabase (is_admin()) mới là chốt chặn thật, ẩn sidebar chỉ để đỡ rối giao diện cho user thường.
const EMOJI_OPTIONS = ['🎉','🚀','🎁','⚠️','✨','🔥','📢','💡'];
const TC_TRIAL_DAYS_FOR_ADMIN = 0; // khớp TC_TRIAL_DAYS ở app-shell.js (2026-08-24: bỏ hẳn dùng thử) — chỉ để hiện đúng số ngày còn lại; admin vẫn "Gia hạn" tay được qua extendTrial() nếu cần cho 1 tài khoản cụ thể

function render(container, ctx){
  const hubState = { tab:'thongbao' };
  function drawHub(){
    container.innerHTML = `
      <div class="page-head"><h1>Quản Trị</h1><p>Đăng thông báo tính năng mới, quản lý thành viên trả phí, hoặc xem hoa hồng giới thiệu đang chờ trả.</p></div>
      <div class="chips" style="margin-bottom:18px;">
        <div class="chip ${hubState.tab==='thongbao'?'selected':''}" data-hub-tab="thongbao">Thông báo</div>
        <div class="chip ${hubState.tab==='thanhvien'?'selected':''}" data-hub-tab="thanhvien">Thành viên</div>
        <div class="chip ${hubState.tab==='hoahong'?'selected':''}" data-hub-tab="hoahong">Hoa Hồng</div>
        <div class="chip ${hubState.tab==='taichinh'?'selected':''}" data-hub-tab="taichinh">Tài Chính</div>
        <div class="chip ${hubState.tab==='danhgia'?'selected':''}" data-hub-tab="danhgia">Đánh Giá</div>
      </div>
      <div id="qt-hub-sub"></div>
    `;
    container.querySelectorAll('[data-hub-tab]').forEach(el=>{
      el.onclick = ()=>{ hubState.tab = el.getAttribute('data-hub-tab'); drawHub(); };
    });
    const sub = container.querySelector('#qt-hub-sub');
    if(hubState.tab === 'thongbao') renderThongBao(sub, ctx);
    else if(hubState.tab === 'thanhvien') renderThanhVien(sub, ctx);
    else if(hubState.tab === 'hoahong') renderHoaHong(sub, ctx);
    else if(hubState.tab === 'taichinh') renderTaiChinh(sub, ctx);
    else renderDanhGia(sub, ctx);
  }
  drawHub();
}

function renderThongBao(container, ctx){
  const state = { title:'', body:'', emoji:EMOJI_OPTIONS[0], steps:[], posting:false, list:[] };
  // Chỉ cho chọn các mục sidebar THẬT SỰ hiện ra được (không phải mục ẩn/chỉ-admin) — feature-tour.js
  // trỏ sáng bằng .sidebar-item[data-key], mục không hiện trong sidebar thì không trỏ được.
  const navOptions = (typeof NAV !== 'undefined' ? NAV : []).filter(n => !n.hidden && !n.adminOnly);

  function draw(){ container.innerHTML = html(); bind(); }

  async function boot(){
    draw();
    await load();
    draw();
  }

  async function load(){
    const { data } = await ctx.supabase.from('tc_feature_announcements').select('*').order('created_at', { ascending:false }).limit(20);
    state.list = data || [];
  }

  function canPost(){ return !state.posting && state.title.trim() && state.body.trim(); }

  async function post(){
    if(!canPost()) return;
    state.posting = true; draw();
    const cleanSteps = state.steps.filter(s => s.key && s.text.trim()).map(s => ({ key:s.key, text:s.text.trim() }));
    const { error } = await ctx.supabase.from('tc_feature_announcements').insert({
      title: state.title.trim(), body: state.body.trim(), emoji: state.emoji, steps: cleanSteps, created_by: ctx.user.id,
    });
    state.posting = false;
    if(error){ alert('Lỗi khi đăng: ' + error.message); draw(); return; }
    state.title = ''; state.body = ''; state.emoji = EMOJI_OPTIONS[0]; state.steps = [];
    await load();
    draw();
  }

  async function remove(id){
    const ok = await confirmModal('Xoá thông báo này? Ai chưa đọc sẽ không thấy nữa.', 'Xoá');
    if(!ok) return;
    await ctx.supabase.from('tc_feature_announcements').delete().eq('id', id);
    await load();
    draw();
  }

  function stepRowHtml(step, i){
    return `
      <div class="section" data-step-row="${i}" style="display:flex;gap:8px;align-items:flex-start;margin-bottom:8px;">
        <select data-step-key="${i}" style="flex:0 0 200px;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-size:13.5px;background:#FDFCF8;">
          <option value="">— Chọn mục trong app —</option>
          ${navOptions.map(n => `<option value="${esc(n.key)}" ${step.key===n.key?'selected':''}>${esc(n.title)}</option>`).join('')}
        </select>
        <input data-step-text="${i}" type="text" placeholder="Nói gì ở bước này..." value="${esc(step.text)}"
          style="flex:1;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-size:13.5px;background:#FDFCF8;">
        <span data-step-remove="${i}" class="btn-ghost btn btn-sm" style="color:var(--danger);white-space:nowrap;">Xoá</span>
      </div>
    `;
  }

  function html(){
    return `
      <p style="color:var(--ink-soft);font-size:13.5px;margin-bottom:16px;">Đăng ở đây sẽ hiện popup giữa màn hình cho tất cả khách đang dùng Sổ Dòng Tiền Tâm Thức. Thêm "các bước hướng dẫn" nếu muốn dẫn khách đi từng bước trong app (giống hướng dẫn lúc mới vào app).</p>
      <div class="card" style="margin-bottom:24px;">
        <div class="field" style="margin-bottom:14px;">
          <label>Tiêu đề</label>
          <input id="tb-title" type="text" placeholder="VD: Mới: Hạt Giống Phước - Nghiệp" value="${esc(state.title)}"
            style="width:100%;padding:12px 14px;border:1px solid var(--line);border-radius:10px;font-size:14.5px;background:#FDFCF8;">
        </div>
        <div class="field" style="margin-bottom:18px;">
          <label>Nội dung</label>
          <textarea id="tb-body" rows="4" placeholder="Mô tả ngắn tính năng mới..."
            style="width:100%;padding:12px 14px;border:1px solid var(--line);border-radius:10px;font-size:14.5px;background:#FDFCF8;resize:vertical;">${esc(state.body)}</textarea>
        </div>
        <div class="field" style="margin-bottom:18px;">
          <label>Sticker</label>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            ${EMOJI_OPTIONS.map(e => `
              <span data-emoji="${e}" style="font-size:22px;padding:6px 10px;border-radius:8px;cursor:pointer;border:2px solid ${state.emoji===e?'var(--accent)':'transparent'};background:${state.emoji===e?'var(--accent-soft)':'#FDFCF8'};">${e}</span>
            `).join('')}
          </div>
        </div>
        <div class="field" style="margin-bottom:10px;">
          <label>Các bước hướng dẫn (tuỳ chọn) — để trống nếu chỉ cần thông báo, không cần dẫn từng bước</label>
        </div>
        ${state.steps.map(stepRowHtml).join('')}
        <span id="tb-add-step" class="btn-ghost btn btn-sm" style="margin-bottom:18px;">+ Thêm bước</span>
        <div>
          <button id="tb-post" class="btn btn-sm" ${canPost() ? '' : 'disabled'}>
            ${state.posting ? 'Đang đăng...' : 'Đăng thông báo'}
          </button>
        </div>
      </div>
      <div class="page-head" style="margin-bottom:12px;"><h2 style="font-size:16px;">Đã đăng gần đây</h2></div>
      ${state.list.length===0 ? `<div style="color:var(--ink-soft);font-size:14px;">Chưa đăng thông báo nào.</div>` : ''}
      ${state.list.map(a=>`
        <div class="section" style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
          <div>
            <div style="font-weight:600;font-size:14.5px;margin-bottom:4px;">${esc(a.emoji || '🎉')} ${esc(a.title)}</div>
            <div style="font-size:13.5px;color:var(--ink-soft);white-space:pre-wrap;">${esc(a.body)}</div>
            <div style="font-size:12px;color:var(--ink-soft);margin-top:6px;">
              ${esc(new Date(a.created_at).toLocaleString('vi-VN'))}${a.steps && a.steps.length ? ` — ${a.steps.length} bước hướng dẫn` : ''}
            </div>
          </div>
          <span class="btn-ghost btn btn-sm" data-remove="${a.id}" style="color:var(--danger);white-space:nowrap;">Xoá</span>
        </div>
      `).join('')}
    `;
  }

  function bind(){
    const title = container.querySelector('#tb-title');
    const body = container.querySelector('#tb-body');
    const refreshPostBtn = ()=>{ const d=container.querySelector('#tb-post'); if(d) d.disabled = !canPost(); };
    if(title) title.oninput = ()=>{ state.title = title.value; refreshPostBtn(); };
    if(body) body.oninput = ()=>{ state.body = body.value; refreshPostBtn(); };

    container.querySelectorAll('[data-emoji]').forEach(el=>{
      el.onclick = ()=>{ state.emoji = el.getAttribute('data-emoji'); draw(); };
    });

    const addStepBtn = container.querySelector('#tb-add-step');
    if(addStepBtn) addStepBtn.onclick = ()=>{ state.steps.push({ key:'', text:'' }); draw(); };

    container.querySelectorAll('[data-step-key]').forEach(el=>{
      el.onchange = ()=>{ state.steps[Number(el.getAttribute('data-step-key'))].key = el.value; };
    });
    container.querySelectorAll('[data-step-text]').forEach(el=>{
      el.oninput = ()=>{ state.steps[Number(el.getAttribute('data-step-text'))].text = el.value; };
    });
    container.querySelectorAll('[data-step-remove]').forEach(el=>{
      el.onclick = ()=>{ state.steps.splice(Number(el.getAttribute('data-step-remove')), 1); draw(); };
    });

    const postBtn = container.querySelector('#tb-post');
    if(postBtn) postBtn.onclick = post;
    container.querySelectorAll('[data-remove]').forEach(el=>{
      el.onclick = ()=>remove(el.getAttribute('data-remove'));
    });
  }

  boot();
}

// Tab "Thành viên" — xem/gán tc_has_paid + gia hạn dùng thử. RÚT GỌN nhiều so với
// nhan-hieu/js/quan-tri.js (486 dòng, nhiều gói tháng/năm cần đối soát) vì tai-chinh chỉ có ĐÚNG
// 1 gói (trọn đời) — không cần chọn số ngày gia hạn, chỉ cần 1 nút bật tc_has_paid.
function renderThanhVien(container, ctx){
  const state = { loading:true, rows:[], search:'', busyId:null };

  function draw(){ container.innerHTML = html(); bind(); }

  async function load(){
    state.loading = true; draw();
    // Chỉ lấy người dùng ĐÃ TỪNG vào app tai-chinh (tc_trial_started_at chỉ được set ở loadProfile()
    // của tai-chinh/js/app-shell.js lúc vào lần đầu) — góp ý Quỳnh 2026-08-26: "Quản Trị đang hiện cả
    // bên app Xây Nhân Hiệu, quản trị app nào hiện người dùng bên đó thôi". `profiles` là bảng CHUNG
    // giữa 2 app nên phải lọc rõ, không thể lấy hết rồi hiện — sẽ lẫn cả người chỉ dùng nhan-hieu.
    const { data } = await ctx.supabase.from('profiles')
      .select('id,email,full_name,role,tc_has_paid,tc_trial_started_at,tc_paid_at,created_at')
      .not('tc_trial_started_at', 'is', null)
      .order('created_at', { ascending:false }).limit(200);
    state.rows = data || [];
    state.loading = false;
    draw();
  }

  function trialDaysLeft(row){
    if(!row.tc_trial_started_at) return TC_TRIAL_DAYS_FOR_ADMIN;
    const elapsed = (Date.now() - new Date(row.tc_trial_started_at).getTime()) / 86400000;
    return Math.max(0, Math.ceil(TC_TRIAL_DAYS_FOR_ADMIN - elapsed));
  }

  function statusBadge(row){
    if(row.role === 'admin') return `<span style="font-size:11.5px;font-weight:600;padding:3px 9px;border-radius:99px;background:#E5F0E5;color:#2E7D32;">Admin</span>`;
    if(row.tc_has_paid) return `<span style="font-size:11.5px;font-weight:600;padding:3px 9px;border-radius:99px;background:#E5F0E5;color:#2E7D32;">Đã trả phí</span>`;
    const left = trialDaysLeft(row);
    return left > 0
      ? `<span style="font-size:11.5px;font-weight:600;padding:3px 9px;border-radius:99px;background:#FDF0E0;color:#B5691A;">Còn ${left} ngày dùng thử</span>`
      : `<span style="font-size:11.5px;font-weight:600;padding:3px 9px;border-radius:99px;background:#FBE5E5;color:#B5271A;">Hết dùng thử</span>`;
  }

  async function markPaid(id, value){
    state.busyId = id; draw();
    await ctx.supabase.from('profiles').update({ tc_has_paid: value, tc_paid_at: value ? new Date().toISOString() : null }).eq('id', id);
    state.busyId = null;
    await load();
  }

  async function extendTrial(id, days){
    state.busyId = id; draw();
    const row = state.rows.find(r=>r.id===id);
    // Lùi mốc bắt đầu dùng thử về trước N ngày — tương đương cộng thêm N ngày dùng thử kể từ giờ,
    // dùng lại đúng cột tc_trial_started_at (không cần cột riêng cho "gia hạn").
    const base = row && row.tc_trial_started_at ? new Date(row.tc_trial_started_at) : new Date();
    base.setDate(base.getDate() - days);
    await ctx.supabase.from('profiles').update({ tc_trial_started_at: base.toISOString() }).eq('id', id);
    state.busyId = null;
    await load();
  }

  function html(){
    const filtered = state.search.trim()
      ? state.rows.filter(r => (r.email||'').toLowerCase().includes(state.search.toLowerCase()) || (r.full_name||'').toLowerCase().includes(state.search.toLowerCase()))
      : state.rows;
    return `
      <input type="text" id="tv-search" placeholder="Tìm theo email hoặc tên..." value="${esc(state.search)}"
        style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-size:13.5px;background:#FDFCF8;margin-bottom:16px;">
      ${state.loading ? `<div class="loading"><div class="spinner"></div></div>` : filtered.map(r=>`
        <div class="section" style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;">
          <div>
            <div style="font-weight:600;font-size:14px;">${esc(r.full_name||'(chưa đặt tên)')} ${statusBadge(r)}</div>
            <div style="font-size:12.5px;color:var(--ink-soft);margin-top:2px;">${esc(r.email||'')}</div>
            <div style="font-size:11.5px;color:var(--ink-soft);margin-top:4px;">
              Vào tai-chinh: ${r.tc_trial_started_at ? esc(new Date(r.tc_trial_started_at).toLocaleDateString('vi-VN')) : 'chưa vào'}
              ${r.tc_paid_at ? ` · Trả phí: ${esc(new Date(r.tc_paid_at).toLocaleDateString('vi-VN'))}` : ''}
            </div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            ${r.tc_has_paid
              ? `<span class="btn-ghost btn btn-sm" style="color:var(--danger);" data-mark-unpaid="${r.id}" ${state.busyId===r.id?'disabled':''}>Bỏ đánh dấu trả phí</span>`
              : `<span class="btn btn-sm" data-mark-paid="${r.id}" ${state.busyId===r.id?'disabled':''}>💰 Đánh dấu đã trả phí</span>`}
            <span class="btn-ghost btn btn-sm" data-extend-trial="${r.id}|14" ${state.busyId===r.id?'disabled':''}>+14 ngày dùng thử</span>
          </div>
        </div>
      `).join('')}
      ${!state.loading && filtered.length===0 ? `<div style="color:var(--ink-soft);font-size:14px;">Không có kết quả.</div>` : ''}
    `;
  }

  function bind(){
    const searchEl = container.querySelector('#tv-search');
    // Danh sách thành viên lọc SỐNG theo state.search nên vẫn cần draw() lại, nhưng draw() thay
    // toàn bộ innerHTML → input cũ bị huỷ, phải lưu vị trí con trỏ trước rồi query lại NODE MỚI để
    // focus + đặt lại con trỏ, không thì gõ tiếng Việt có dấu (Telex/VNI) sẽ bị nhảy chữ.
    if(searchEl) searchEl.oninput = (e)=>{
      state.search = e.target.value;
      const pos = searchEl.selectionStart;
      draw();
      const newEl = container.querySelector('#tv-search');
      if(newEl){ newEl.focus(); newEl.setSelectionRange(pos, pos); }
    };
    container.querySelectorAll('[data-mark-paid]').forEach(el=>{
      el.onclick = ()=>markPaid(el.getAttribute('data-mark-paid'), true);
    });
    container.querySelectorAll('[data-mark-unpaid]').forEach(el=>{
      el.onclick = ()=>markPaid(el.getAttribute('data-mark-unpaid'), false);
    });
    container.querySelectorAll('[data-extend-trial]').forEach(el=>{
      el.onclick = ()=>{
        const [id, days] = el.getAttribute('data-extend-trial').split('|');
        extendTrial(id, Number(days));
      };
    });
  }

  load();
}

// Tab "Hoa Hồng" — chương trình giới thiệu 20%, trả bằng chuyển khoản tay (không có API tự động).
// Gộp tc_referrals theo TỪNG referrer để chị thấy ngay ai đang được nợ bao nhiêu, thay vì phải cộng
// tay từng dòng. Join thủ công với profiles bằng 2 query riêng (không dùng PostgREST embed) vì FK
// của tc_referrals trỏ vào auth.users, không trỏ thẳng profiles — embed tự động không chắc ăn.
function renderHoaHong(container, ctx){
  const state = { loading:true, rows:[], profileById:{}, busyReferrerId:null };

  function draw(){ container.innerHTML = html(); bind(); }

  async function load(){
    state.loading = true; draw();
    const { data: rows } = await ctx.supabase.from('tc_referrals').select('*').order('created_at', { ascending:false });
    state.rows = rows || [];
    const ids = [...new Set(state.rows.flatMap(r=>[r.referrer_id, r.referee_id]))];
    if(ids.length > 0){
      const { data: profs } = await ctx.supabase.from('profiles').select('id,email,full_name,is_vip_partner').in('id', ids);
      state.profileById = {};
      (profs||[]).forEach(p=>{ state.profileById[p.id] = p; });
    }
    state.loading = false;
    draw();
  }

  function nameOf(id){
    const p = state.profileById[id];
    return p ? (p.full_name || p.email || id) : id;
  }

  function groupByReferrer(){
    const groups = {};
    state.rows.forEach(r=>{
      if(!groups[r.referrer_id]) groups[r.referrer_id] = [];
      groups[r.referrer_id].push(r);
    });
    return Object.entries(groups).map(([referrerId, rows])=>({
      referrerId,
      rows,
      totalPending: rows.filter(r=>!r.paid).reduce((s,r)=>s+Number(r.reward_amount),0),
      totalPaid: rows.filter(r=>r.paid).reduce((s,r)=>s+Number(r.reward_amount),0),
    })).sort((a,b)=> b.totalPending - a.totalPending);
  }

  async function markGroupPaid(referrerId){
    state.busyReferrerId = referrerId; draw();
    const unpaidIds = state.rows.filter(r=>r.referrer_id===referrerId && !r.paid).map(r=>r.id);
    if(unpaidIds.length > 0){
      await ctx.supabase.from('tc_referrals').update({ paid:true, paid_at: new Date().toISOString() }).in('id', unpaidIds);
    }
    state.busyReferrerId = null;
    await load();
  }

  function html(){
    const groups = groupByReferrer();
    return `
      <p style="color:var(--ink-soft);font-size:13.5px;margin-bottom:16px;">Mỗi người giới thiệu thành công 1 khách mua trọn đời được thưởng 20% (~59.800đ), VIP Partner được 30%. Không có chuyển khoản tự động — chị tự chuyển khoản tay cho người giới thiệu rồi bấm "Đánh dấu đã trả" bên dưới.</p>
      ${state.loading ? `<div class="loading"><div class="spinner"></div></div>` : groups.length===0 ? `<div style="color:var(--ink-soft);font-size:14px;">Chưa có ai được thưởng hoa hồng.</div>` : groups.map(g=>`
        <div class="section">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;">
            <div>
              <div style="font-weight:600;font-size:14.5px;">${esc(nameOf(g.referrerId))}${(state.profileById[g.referrerId]&&state.profileById[g.referrerId].is_vip_partner)?' <span style="color:var(--gold,var(--accent));">👑 VIP Partner</span>':''}</div>
              <div style="font-size:12.5px;color:var(--ink-soft);margin-top:4px;">Đã giới thiệu: ${g.rows.map(r=>esc(nameOf(r.referee_id))).join(', ')}</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:12px;color:var(--ink-soft);">Đã trả: ${g.totalPaid.toLocaleString('vi-VN')}đ</div>
              <div style="font-size:15px;font-weight:700;color:${g.totalPending>0?'var(--danger)':'var(--ink)'};">Đang nợ: ${g.totalPending.toLocaleString('vi-VN')}đ</div>
            </div>
          </div>
          ${g.totalPending>0 ? `<button class="btn btn-sm" style="margin-top:10px;" data-mark-group-paid="${g.referrerId}" ${state.busyReferrerId===g.referrerId?'disabled':''}>${state.busyReferrerId===g.referrerId?'Đang lưu…':'✓ Đánh dấu đã trả hết'}</button>` : ''}
        </div>
      `).join('')}
    `;
  }

  function bind(){
    container.querySelectorAll('[data-mark-group-paid]').forEach(el=>{
      el.onclick = ()=>markGroupPaid(el.getAttribute('data-mark-group-paid'));
    });
  }

  load();
}

// Tab "Tài Chính" — mirror layout của nhan-hieu/js/quan-tri-taichinh.js (page-head, source-grid,
// bảng theo tháng) nhưng KHÔNG có cột lượt dùng/chi phí AI/lợi nhuận — tai-chinh không có hệ lượt
// (app này không gate tính năng AI theo lượt, xem app-shell.js dòng comment "app này không có hệ
// lượt"), nên "chi phí AI ước tính" của nhan-hieu không có gì tương ứng để hiển thị. Lọc đúng 3
// mức giá tai-chinh (299k/599k/999k, TC_PRICE_TIER_* ở app-shell.js) để KHÔNG lẫn doanh thu Xây
// Nhân Hiệu — sepay_transactions dùng CHUNG bảng cho cả 2 app. Không tách tab riêng "Giao dịch
// SePay" như nhan-hieu — lý do nhan-hieu tách ra là danh sách giao dịch dài sẽ đẩy danh sách thành
// viên xuống xa (xem comment quan-tri-giaodich.js), nhưng tab này không đứng cạnh danh sách thành
// viên nào cả nên không có vấn đề đó; danh sách giao dịch gần nhất vẫn đủ dùng gộp ở cuối tab này.
function renderTaiChinh(container, ctx){
  const TC_AMOUNTS = [299000, 599000, 999000];
  const state = { loading:true, rows:[] };

  function draw(){ container.innerHTML = html(); }

  async function load(){
    state.loading = true; draw();
    const { data } = await ctx.supabase.from('sepay_transactions').select('*')
      .eq('status', 'matched').in('transfer_amount', TC_AMOUNTS)
      .order('created_at', { ascending:false }).limit(200);
    state.rows = data || [];
    state.loading = false;
    draw();
  }

  function html(){
    if(state.loading) return `<div class="loading"><div class="spinner"></div></div>`;

    const totalRevenue = state.rows.reduce((s,r)=>s+Number(r.transfer_amount||0), 0);
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
    const revenueThisMonth = state.rows.filter(r=>new Date(r.created_at).getTime() >= startOfMonth).reduce((s,r)=>s+Number(r.transfer_amount||0),0);
    const byMonth = {};
    state.rows.forEach(r=>{
      const m = (r.created_at||'').slice(0,7);
      if(!byMonth[m]) byMonth[m] = { month:m, revenue:0, count:0 };
      byMonth[m].revenue += Number(r.transfer_amount||0);
      byMonth[m].count += 1;
    });
    const monthlyRows = Object.values(byMonth).sort((a,b)=> b.month.localeCompare(a.month));
    const byTier = {};
    TC_AMOUNTS.forEach(a=>{ byTier[a] = state.rows.filter(r=>Number(r.transfer_amount)===a).length; });

    return `
      <div class="page-head"><h1>Tài chính</h1><p>Doanh thu thật (chỉ 3 mức giá tai-chinh) — tổng quan và theo từng tháng. Tai-chinh không có hệ lượt AI như Xây Nhân Hiệu nên không có mục chi phí/lợi nhuận ước tính.</p></div>

      <div class="source-grid" style="margin-bottom:12px;">
        <div class="source-card"><div class="ic" style="font-size:18px;">${totalRevenue.toLocaleString('vi-VN')}đ</div><div class="label">Tổng doanh thu</div></div>
        <div class="source-card"><div class="ic" style="font-size:18px;">${revenueThisMonth.toLocaleString('vi-VN')}đ</div><div class="label">Doanh thu tháng này</div></div>
        <div class="source-card"><div class="ic" style="font-size:18px;">${state.rows.length}</div><div class="label">Số giao dịch đã khớp</div></div>
      </div>

      <div style="font-family:'IBM Plex Mono',monospace;font-size:12.5px;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-soft);margin-bottom:10px;">Theo mức giá</div>
      <div class="card" style="overflow-x:auto;padding:0;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;font-size:13.5px;white-space:nowrap;">
          <thead><tr style="text-align:left;border-bottom:1px solid var(--line);">
            <th style="padding:10px 14px;">Mức giá</th><th style="padding:10px 14px;">Số người mua</th>
          </tr></thead>
          <tbody>
            ${TC_AMOUNTS.map(a=>`
              <tr style="border-bottom:1px solid var(--line);">
                <td style="padding:10px 14px;font-weight:600;">${a.toLocaleString('vi-VN')}đ</td>
                <td style="padding:10px 14px;">${byTier[a]}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div style="font-family:'IBM Plex Mono',monospace;font-size:12.5px;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-soft);margin-bottom:10px;">Theo từng tháng</div>
      ${monthlyRows.length===0 ? `<div style="color:var(--ink-soft);font-size:14px;margin-bottom:24px;">Chưa có dữ liệu.</div>` : `
      <div class="card" style="overflow-x:auto;padding:0;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;font-size:13.5px;white-space:nowrap;">
          <thead><tr style="text-align:left;border-bottom:1px solid var(--line);">
            <th style="padding:10px 14px;">Tháng</th><th style="padding:10px 14px;">Doanh thu</th><th style="padding:10px 14px;">Số giao dịch</th>
          </tr></thead>
          <tbody>
            ${monthlyRows.map(row=>`
              <tr style="border-bottom:1px solid var(--line);">
                <td style="padding:10px 14px;font-weight:600;">${esc(row.month)}</td>
                <td style="padding:10px 14px;">${row.revenue.toLocaleString('vi-VN')}đ</td>
                <td style="padding:10px 14px;">${row.count}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      `}

      <div style="font-family:'IBM Plex Mono',monospace;font-size:12.5px;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-soft);margin-bottom:10px;">Giao dịch gần nhất</div>
      ${state.rows.length===0 ? `<div style="color:var(--ink-soft);font-size:14px;">Chưa có giao dịch nào.</div>` : state.rows.slice(0,50).map(r=>`
        <div class="section" style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
          <span style="font-size:13px;">${esc(new Date(r.created_at).toLocaleString('vi-VN'))} · <span style="font-family:'IBM Plex Mono',monospace;">${esc(r.ref_code_found||'—')}</span></span>
          <b style="color:var(--accent);">${Number(r.transfer_amount).toLocaleString('vi-VN')}đ</b>
        </div>
      `).join('')}
    `;
  }

  load();
}

// Tab "Đánh Giá" — mirror nhan-hieu/js/quan-tri-danhgia.js nhưng lọc app='tai-chinh' (app_reviews
// dùng CHUNG bảng với nhan-hieu, xem api/submit-review.js).
function renderDanhGia(container, ctx){
  const state = { reviews:[], q:'', busyId:null };

  function draw(){ container.innerHTML = html(); bind(); }

  async function load(){
    const { data } = await ctx.supabase.from('app_reviews').select('*').eq('app', 'tai-chinh').order('created_at', { ascending:false }).limit(100);
    state.reviews = data || [];
  }

  function filtered(){
    const q = state.q.trim().toLowerCase();
    if(!q) return state.reviews;
    return state.reviews.filter(r => (r.comment||'').toLowerCase().includes(q) || (r.display_name||'').toLowerCase().includes(q));
  }

  function html(){
    const list = filtered();
    const pendingCount = state.reviews.filter(r=>!r.approved).length;
    return `
      <div class="page-head"><h1>Đánh giá app</h1><p>${pendingCount} đánh giá đang chờ duyệt. Duyệt xong mới hiện công khai ở Trang chủ.</p></div>
      <div class="card" style="margin-bottom:20px;">
        <input id="dg-search" type="text" placeholder="Tìm theo nội dung hoặc tên..." value="${esc(state.q)}"
          style="width:100%;padding:12px 14px;border:1px solid var(--line);border-radius:10px;font-size:14.5px;background:#FDFCF8;">
      </div>
      ${list.length===0 ? `<div style="color:var(--ink-soft);font-size:14px;">Chưa có đánh giá nào.</div>` : ''}
      ${list.map(r=>`
        <div class="section">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
            <div style="font-size:13px;color:var(--ink-soft);">${esc(r.display_name||'Ẩn danh')} · ${esc(new Date(r.created_at).toLocaleString('vi-VN'))}</div>
            <span style="font-family:'IBM Plex Mono',monospace;font-size:11px;padding:3px 10px;border-radius:999px;
              background:${r.approved?'var(--accent-soft)':'#FBF6E9'};color:${r.approved?'var(--accent)':'var(--gold)'};">${r.approved?'Đã duyệt':'Chờ duyệt'}</span>
          </div>
          <div class="body" style="margin-top:10px;white-space:pre-wrap;">${esc(r.comment)}</div>
          <div class="btn-row" style="margin-top:12px;justify-content:flex-start;">
            ${!r.approved ? `<button class="btn btn-sm" data-approve="${r.id}" ${state.busyId===r.id?'disabled':''}>Duyệt, hiện công khai</button>` : `<span class="btn-ghost btn btn-sm" data-unapprove="${r.id}" ${state.busyId===r.id?'disabled':''}>Ẩn khỏi Trang chủ</span>`}
            <span class="btn-ghost btn btn-sm" style="color:var(--danger);" data-delete="${r.id}" ${state.busyId===r.id?'disabled':''}>Xoá</span>
          </div>
        </div>
      `).join('')}
    `;
  }

  function bind(){
    const search = container.querySelector('#dg-search');
    // Danh sách đánh giá lọc SỐNG theo state.q nên vẫn cần draw() lại, nhưng draw() thay toàn bộ
    // innerHTML → node `search` cũ bị huỷ, gán lại .focus()/.selectionStart trên node cũ vô tác
    // dụng (đã bị gỡ khỏi DOM) — phải lưu vị trí con trỏ trước rồi query lại NODE MỚI sau draw().
    if(search) search.oninput = ()=>{
      state.q = search.value;
      const pos = search.selectionStart;
      draw();
      const newEl = container.querySelector('#dg-search');
      if(newEl){ newEl.focus(); newEl.setSelectionRange(pos, pos); }
    };
    container.querySelectorAll('[data-approve]').forEach(el=>{
      el.onclick = ()=>setApproved(el.getAttribute('data-approve'), true);
    });
    container.querySelectorAll('[data-unapprove]').forEach(el=>{
      el.onclick = ()=>setApproved(el.getAttribute('data-unapprove'), false);
    });
    container.querySelectorAll('[data-delete]').forEach(el=>{
      el.onclick = async ()=>{
        const id = el.getAttribute('data-delete');
        if(!(await confirmModal('Xoá vĩnh viễn đánh giá này? Không khôi phục được.'))) return;
        state.busyId = id; draw();
        await ctx.supabase.from('app_reviews').delete().eq('id', id);
        await load();
        state.busyId = null;
        draw();
      };
    });
  }

  async function setApproved(id, approved){
    state.busyId = id; draw();
    await ctx.supabase.from('app_reviews').update({ approved }).eq('id', id);
    await load();
    state.busyId = null;
    draw();
  }

  (async ()=>{ draw(); await load(); draw(); })();
}

window.Modules = window.Modules || {};
window.Modules['quan-tri'] = { title:'Quản Trị', render };
})();
