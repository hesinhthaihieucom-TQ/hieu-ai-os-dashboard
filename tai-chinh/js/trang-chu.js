(function(){
// Trang chủ đổi hẳn sang kiểu checklist "Quy trình dùng app hiệu quả nhất" y hệt nhan-hieu/js/home.js
// (2026-08-24, góp ý Quỳnh: "trang chủ làm y hệt web xây nhân hiệu bây giờ đi") — không còn radar
// Điểm Nghiệp/số liệu tháng nữa, cả khối đó đã DI CHUYỂN hẳn sang tai-chinh/js/thiet-lap-nhanh.js
// (Chấm Điểm Nghiệp Tiền). Trang chủ giờ không hiện trong sidebar (xem NAV ở app-shell.js, cờ
// hidden:true) — vào lại qua bấm logo/"SỔ DÒNG TIỀN TÂM THỨC" ở đầu sidebar, đúng quy ước nhan-hieu.
//
// Thứ tự 5 bước đúng luồng thật của app (khác nhan-hieu ở NỘI DUNG, giữ nguyên CƠ CHẾ): Chấm Điểm
// Nghiệp Tiền (thiết lập ban đầu) → Mục Tiêu & Cam Kết (đặt mục tiêu TRƯỚC khi ghi chép, đúng như
// muc-tieu-cam-ket.js tự nói) → Ghi Chép Hàng Ngày (thói quen lặp lại) → Tổng Kết Tuần → Tổng Kết
// Tháng. Mỗi bước có 1 câu "why" + tick hoàn thành, boot() query đúng bảng module đó ghi vào.
const STEPS = [
  { key:'thiet-lap-nhanh', label:'Chấm Điểm Nghiệp Tiền', why:'Điền sẵn Quỹ Khẩn Cấp/Nợ/Tài Sản ban đầu, đồng thời ra luôn Điểm Nghiệp 5 Trụ Cột và soi khâu tâm thức tiền đang yếu nhất — làm trước tiên để có điểm khởi đầu.' },
  { key:'muc-tieu', label:'Mục Tiêu & Cam Kết', why:'Đặt mục tiêu tháng này TRƯỚC khi ghi chép — đây là nghi thức mở đầu, không phải chuyện nghĩ tới cuối tháng.' },
  { key:'ghi-chep', label:'Ghi Chép Hàng Ngày', why:'Ghi thu chi + chọn Vibe Check mỗi ngày — dữ liệu gốc nuôi mọi tính năng khác, kể cả Điểm Nghiệp.' },
  { key:'tong-ket-tuan', label:'Tổng Kết Tuần', why:'Cuối tuần xem tiền đi đâu nhiều nhất, tự đánh giá thêm vài trục ngoài tài chính.' },
  { key:'tong-ket-thang', label:'Tổng Kết Tháng', why:'Cập nhật tài sản/tiêu sản mỗi tháng — Tài Sản Ròng là con số quan trọng nhất của cuốn sổ này.' },
];

const IMPORTANT_NOTES = [
  { icon:'📈', text:'<b>Điểm Nghiệp không lưu số cố định</b> — luôn tính lại từ đúng dữ liệu bạn vừa ghi, xem ở <a href="#thiet-lap-nhanh" style="color:var(--accent);font-weight:600;">Chấm Điểm Nghiệp Tiền →</a>.' },
  { icon:'💾', text:'<b>Không lo mất dữ liệu khi chuyển trang</b> — mọi tiến trình đang làm dở (số đang gõ, câu vừa chọn...) tự động lưu lại, quay lại vẫn còn nguyên.' },
  { icon:'🌱', text:'<b>Niềm tin cũ chưa chuyển hoá sẽ kéo điểm xuống</b> — ghi lại ở <a href="#tang-thuc" style="color:var(--accent);font-weight:600;">Hạt Giống Phước - Nghiệp →</a> khi thấy 1 Nút Chặn Dòng Tiền lặp lại mãi.' },
  { icon:'💛', text:`<b>${glossaryWrap('Vibe Check', 'vibe_check')} mỗi lần ghi chép là bước quan trọng nhất</b> — không phải ô điền cho có, đây là chỗ tâm thức tiền thật sự được nhìn thấy.` },
  { icon:'🔓', text:'<b>Dùng thử miễn phí, mở khoá trọn đời chỉ 1 lần</b> — xem chi tiết ở <a href="#nang-cap" style="color:var(--accent);font-weight:600;">Nâng Cấp →</a>.' },
];

const EXPLORE = [
  { key:'kien-thuc', label:'Kiến Thức Nền Tảng' },
  { key:'tang-thuc', label:'Hạt Giống Phước - Nghiệp' },
  { key:'quan-ly-no', label:'Quản Lý Nợ' },
];

// Khách chưa đăng nhập (2026-08-26, góp ý Quỳnh: "trang này không có màn đăng nhập, mà là trang chủ
// chào mừng, nút đăng nhập/đăng ký ở góc phải, để gửi link cho người ta làm bài Chấm Điểm Nghiệp
// không cần đăng ký, làm xong muốn lưu mới hiện popup đăng ký") — trang chủ đổi hẳn sang màn chào
// mừng + CTA làm bài ngay, KHÔNG dùng lại checklist/review-box của người đã đăng nhập (những khối đó
// cần ctx.user để query). Nút "Đăng nhập / Đăng ký" thật đã nằm sẵn ở góc phải khung khách (xem
// renderGuestShell() ở app-shell.js) — trang này chỉ cần đúng 1 CTA rõ ràng.
function guestWelcomeHtml(){
  return `
    <div style="max-width:640px;margin:40px auto;text-align:center;padding:0 16px;">
      <div style="font-family:'Playfair Display',serif;font-size:30px;color:var(--ink);margin-bottom:14px;">Sổ Dòng Tiền Tâm Thức</div>
      <p style="font-size:15px;line-height:1.7;color:var(--ink-soft);margin-bottom:28px;">"Số dư là Quả, rung động là Nhân." Làm bài <b>Chấm Điểm Nghiệp Tiền</b> miễn phí ngay bên dưới để biết Điểm Nghiệp theo 5 Trụ Cột Năng Lượng Bản Thể của bạn đang ở đâu — không cần đăng ký trước, làm xong muốn lưu lại mới cần tạo tài khoản.</p>
      <button class="btn" style="padding:16px 32px;font-size:15.5px;" data-key="thiet-lap-nhanh">Làm bài Chấm Điểm Nghiệp Tiền →</button>
    </div>
  `;
}

function render(container, ctx){
  if(!ctx.user){
    container.innerHTML = guestWelcomeHtml();
    container.querySelectorAll('[data-key]').forEach(el=>{
      el.onclick = ()=>{ location.hash = el.getAttribute('data-key'); };
    });
    return;
  }
  const state = {
    loading:true, done:{},
    reviews:[], reviewsLoading:true, reviewComment:'', reviewSubmitting:false, reviewError:null, reviewJustSubmitted:false,
  };
  function draw(){ container.innerHTML = html(); bind(); }
  draw();

  async function loadReviews(){
    const { data } = await ctx.supabase.from('app_reviews').select('display_name,comment,created_at')
      .eq('approved', true).eq('app', 'tai-chinh').order('created_at', { ascending:false }).limit(20);
    state.reviews = data || [];
    state.reviewsLoading = false;
    draw();
  }

  async function submitReview(){
    if(state.reviewSubmitting || !state.reviewComment.trim()) return;
    state.reviewSubmitting = true; state.reviewError = null; draw();
    try{
      await callApi('/api/submit-review', { comment: state.reviewComment.trim(), app:'tai-chinh' });
      if(ctx.profile) ctx.profile.tc_review_prompt_dismissed = true;
      state.reviewComment = '';
      state.reviewJustSubmitted = true;
      loadReviews();
    } catch(e){ state.reviewError = e.message; }
    state.reviewSubmitting = false; draw();
  }

  function reviewSectionHtml(){
    return `
      <div style="margin-top:28px;">
        <h3 style="font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px;">⭐ Đánh giá từ mọi người</h3>
        <div class="card" style="margin-bottom:16px;background:var(--accent-soft);border:1px solid var(--accent);">
          ${state.reviewJustSubmitted
            ? `<div style="color:var(--accent);font-weight:600;font-size:14px;">✓ Cảm ơn bạn đã gửi đánh giá!</div>`
            : `
            <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:6px;">Khoe trải nghiệm của bạn với Sổ Dòng Tiền Tâm Thức</label>
            <div style="font-size:12px;color:var(--ink-soft);margin-bottom:8px;">Điều gì bạn thấy thay đổi rõ nhất — dòng tiền bớt hoảng loạn hơn, thấy rõ tiền đi đâu, hay đơn giản là thói quen ghi chép đều hơn trước.</div>
            <textarea id="rv-comment" placeholder="Ví dụ: Trước đây mình không biết tiền đi đâu hết, giờ nhìn Tổng Kết Tháng là biết ngay...">${esc(state.reviewComment)}</textarea>
            ${state.reviewError?`<div class="error-box" style="margin-top:10px;">${esc(state.reviewError)}</div>`:''}
            <div class="btn-row" style="margin-top:10px;justify-content:flex-start;">
              <button class="btn btn-sm" data-action="submit-review" ${state.reviewSubmitting?'disabled':''}>${state.reviewSubmitting?'Đang gửi…':'Gửi đánh giá'}</button>
            </div>
          `}
        </div>
        ${state.reviewsLoading ? `<div style="color:var(--ink-soft);font-size:14px;">Đang tải…</div>`
          : state.reviews.length===0 ? `<div style="color:var(--ink-soft);font-size:14px;">Chưa có đánh giá nào được duyệt.</div>`
          : state.reviews.map(r=>`
            <div class="section">
              <div class="body" style="white-space:pre-wrap;">${esc(r.comment)}</div>
              <div style="font-size:12px;color:var(--ink-soft);margin-top:8px;">${esc(r.display_name||'Ẩn danh')} · ${esc(new Date(r.created_at).toLocaleDateString('vi-VN'))}</div>
            </div>
          `).join('')}
      </div>
    `;
  }

  async function boot(){
    const month = new Date().toISOString().slice(0,7);
    const [setup, monthRefl, entry, weekly] = await Promise.all([
      ctx.supabase.from('tc_networth_snapshots').select('estimated_income')
        .eq('user_id', ctx.user.id).not('estimated_income', 'is', null).limit(1).maybeSingle(),
      ctx.supabase.from('tc_monthly_reflections').select('*')
        .eq('user_id', ctx.user.id).order('month', { ascending:false }).limit(1).maybeSingle(),
      ctx.supabase.from('tc_finance_entries').select('id').eq('user_id', ctx.user.id).limit(1).maybeSingle(),
      ctx.supabase.from('tc_weekly_reflections').select('id').eq('user_id', ctx.user.id).limit(1).maybeSingle(),
    ]);
    const r = monthRefl.data;
    const hasGoal = !!(r && (Number(r.goal_income)||Number(r.goal_savings)||Number(r.goal_debt_reduction)||Number(r.goal_new_asset)||(r.goal_new_asset_type||'').trim()));
    const hasMonthReflection = !!(r && (r.reflection_regret||r.reflection_worth||r.reflection_blocker||r.reflection_good_habit||r.reflection_bad_habit));
    state.done = {
      'thiet-lap-nhanh': !!setup.data,
      'muc-tieu': hasGoal,
      'ghi-chep': !!entry.data,
      'tong-ket-tuan': !!weekly.data,
      'tong-ket-thang': hasMonthReflection,
    };
    state.loading = false;
    draw();
    loadReviews();
  }

  function html(){
    const name = (ctx.profile && ctx.profile.full_name) ? ctx.profile.full_name.split(' ').slice(-1)[0] : '';
    const nextIdx = STEPS.findIndex(s => !state.done[s.key]);
    return `
      <div class="page-head">
        <h1>Chào${name?` ${esc(name)}`:''} 👋</h1>
        <p>"Số dư là Quả, rung động là Nhân." Đi lần lượt theo checklist bên dưới nếu chưa biết bắt đầu từ đâu — ghi chép mỗi ngày, tổng kết mỗi tuần/tháng, để nhìn rõ tâm thức nào đang dẫn dắt dòng tiền của bạn.</p>
      </div>

      <div class="card">
        <h3 style="font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.05em;margin-bottom:14px;">📋 Quy trình dùng app hiệu quả nhất</h3>
        ${state.loading ? `<div style="color:var(--ink-soft);font-size:14px;">Đang tải tiến độ…</div>` : STEPS.map((s,i)=>{
          const isDone = state.done[s.key];
          const isNext = i===nextIdx;
          return `
          <div class="list-item">
            <div style="display:flex;align-items:flex-start;gap:12px;">
              <div style="flex-shrink:0;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;
                background:${isDone?'var(--accent)':'var(--accent-soft)'};color:${isDone?'#fff':'var(--accent)'};">${isDone?'✓':i+1}</div>
              <div class="txt">
                <b>${esc(s.label)}</b><br>
                <span style="color:var(--ink-soft);font-size:13px;">${esc(s.why)}</span>
              </div>
            </div>
            <button class="${isNext?'btn':'btn-ghost btn'} btn-sm" data-key="${s.key}">${isDone?'Xem lại →':(isNext?'Bắt đầu →':'→')}</button>
          </div>
        `;}).join('')}
      </div>

      <div class="card" style="margin-top:20px;background:var(--accent-soft);">
        <h3 style="font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--accent);text-transform:uppercase;letter-spacing:.05em;margin-bottom:14px;">Lưu ý quan trọng</h3>
        ${IMPORTANT_NOTES.map(n=>`
          <div style="display:flex;gap:10px;padding:8px 0;font-size:13.5px;line-height:1.55;">
            <span style="flex-shrink:0;">${n.icon}</span>
            <span>${n.text}</span>
          </div>
        `).join('')}
      </div>

      <div style="margin-top:24px;">
        <h3 style="font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px;">Khám phá thêm</h3>
        <div class="chips">
          ${EXPLORE.map(e=>`<div class="chip" data-key="${e.key}">${esc(e.label)}</div>`).join('')}
        </div>
      </div>

      ${reviewSectionHtml()}
    `;
  }

  function bind(){
    container.querySelectorAll('[data-key]').forEach(el=>{
      el.onclick = ()=>{ location.hash = el.getAttribute('data-key'); };
    });
    const rvComment = container.querySelector('#rv-comment');
    if(rvComment) rvComment.oninput = ()=>{ state.reviewComment = rvComment.value; };
    const rvSubmit = container.querySelector('[data-action="submit-review"]');
    if(rvSubmit) rvSubmit.onclick = submitReview;
  }

  boot();
}

window.Modules = window.Modules || {};
window.Modules['trang-chu'] = { title:'Trang chủ', render };
})();
