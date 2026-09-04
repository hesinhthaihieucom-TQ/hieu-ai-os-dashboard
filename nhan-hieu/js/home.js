(function(){
// Quy trình dùng app hiệu quả nhất (2026-08-23, chốt cùng chị Quỳnh) — GỘP checklist làm quen app
// lần đầu với quy trình LẶP LẠI mỗi tuần khi sản xuất content thành 1 khối duy nhất (trước đó tách 2
// thẻ riêng, chị Quỳnh phản hồi thấy trùng/thừa). Vẫn giữ tick hoàn thành + nút "Bắt đầu/Xem lại" cho
// từng bước, chỉ đổi tên/thứ tự cho đúng quy trình hiệu quả (lên lịch AI TRƯỚC khi viết).
// Bản ĐẦY ĐỦ (kèm lý do) chỉ nằm ở ĐÂY — chị Quỳnh chốt 23/8: "trang chủ cứ ghi full đi, bỏ hẳn cái
// mục ở hỏi đi" (trước đó thử tách 2 bản ngắn/dài ở 2 trang, thấy vẫn trùng nên bỏ luôn 1 bên thay vì
// tối giản thêm). Hỏi & Trợ Giúp không còn khối này nữa, chỉ còn FAQ "nên làm theo thứ tự nào" trỏ
// thẳng về đây.
// group:'once' — làm 1 lần duy nhất, KHÔNG lặp lại mỗi tuần. group:'weekly' — 3 bước còn lại mới
// thật sự lặp lại mỗi khi sản xuất content mới.
const STEPS = [
  { key:'dinh-vi', label:'Định Vị thật chi tiết', group:'once', why:'Nền tảng cho mọi bước sau — trục nội dung, chân dung khách hàng, giọng văn AI dùng lại xuyên suốt đều lấy từ đây, nên trả lời kỹ ngay từ đầu, đỡ phải sửa lại nhiều lần về sau.' },
  { key:'sua-kenh', label:'Sửa Kênh khớp định vị', group:'once', why:'Đồng bộ ảnh đại diện/ảnh bìa/bio khớp với định vị vừa chốt. Chỉ cần làm 1 lần, nhưng nên làm trước khi đẩy content ra ngoài — bài viral kéo người lạ vào trang mà kênh chưa khớp định vị thì phí mất khách.' },
  { key:'lich-dang', label:'Lịch Đăng Bài → AI gợi ý lịch tuần', group:'weekly', why:'Lên khung trục nội dung + định dạng cho cả 7 ngày TRƯỚC khi viết bất kỳ bài nào — tránh viết lan man rồi không biết nhét vào đâu. Nhập mục tiêu tuần này (ra mắt sản phẩm, tăng follow...) để AI ưu tiên đúng chỗ.' },
  { key:'viet-content', label:'Viết từng ô lịch từ Kho Content/Kho Hook', group:'weekly', why:'Ô nào AI đã khớp sẵn 1 bài bạn từng viết — Chấm Điểm Content/Hook nhanh trước khi dùng (1 lượt) để chắc bài đủ chuẩn trước khi lên lịch thật. Ô chưa có bài — bấm "Chọn bài mẫu đúng trục" vào Kho Content/Kho Hook đúng trục để viết; nếu vừa thấy 1 bài viral ở nơi khác thì qua Tái Chế Content Viral thay vì viết từ đầu.' },
  { key:'day-bai', label:'Đẩy Bài khi bài đạt view tốt', group:'weekly', why:'Gợi ý mốc trên 1000 view. App cũng tự nhắc theo giờ (3h/6h/24h sau khi đăng) để không quên vào kiểm tra — 2 cái bổ trợ nhau, đừng bỏ qua bước này vì đây là lúc tối ưu hoá đúng bài đang viral, không phải lúc để yên.' },
];
const STEP_GROUP_LABEL = { once:'Làm 1 lần đầu tiên (nền tảng)', weekly:'Lặp lại mỗi khi sản xuất content mới' };

const IMPORTANT_NOTES = [
  { icon:'🎯', text:'<b>Định Vị luôn làm trước tiên</b> — mọi bài viết/kết quả AI ở các bước sau đều dựa vào kết quả Định Vị, nên trả lời thật kỹ ngay từ đầu.' },
  { icon:'💾', text:'<b>Không lo mất dữ liệu khi chuyển trang</b> — mọi tiến trình đang làm dở (câu trả lời, bài đang viết, ảnh đã tải lên...) tự động lưu lại, quay lại vẫn còn nguyên.' },
  { icon:'⚡', text:'<b>Lượt AI tính theo độ phức tạp</b> — hành động càng nhiều bước AI xử lý thì càng tốn nhiều lượt hơn, không đồng giá. Xem chi tiết và tự lên kế hoạch dùng ở mục <b>Tài khoản</b> (bấm vào ảnh đại diện/tên ở cuối sidebar).' },
  { icon:'⏱️', text:'<b>AI cần khoảng 30 giây - 2 phút để xử lý</b> mỗi lần — đừng thoát app hay khoá màn hình giữa chừng, cứ để chờ.' },
  { icon:'🌐', text:'<b>Kho chung vs Kho của tôi</b> — Kho Content/Kho Hook có phần "chung" (nội dung viral, dùng chung mọi người) và phần "của tôi" (riêng tư, chỉ bạn thấy).' },
  { icon:'💬', text:'<b>Đọc kỹ mục <a href="#tro-giup" style="color:var(--accent);font-weight:600;">Hỏi &amp; Trợ Giúp</a> trước khi hỏi trong nhóm</b> — AI trả lời ngay lập tức, không cần đợi admin rảnh mới trả lời trong group.' },
];

const EXPLORE = [
  { key:'kho-content', label:'Kho Content' },
  { key:'kho-hook', label:'Kho Hook' },
  { key:'tao-anh', label:'Tạo Ảnh Thương Hiệu' },
  { key:'tro-giup', label:'Hỏi & Trợ Giúp' },
];

// "Momentum" thấy được (2026-08-29, theo yêu cầu chị Quỳnh: giữ chân bằng tâm lý sợ mất chuỗi +
// thấy công sức ra kết quả thật) — tính theo TUẦN (không phải ngày), vì nhịp lên lịch của app vốn
// đã theo tuần (postsPerDay 1-3/ngày, không phải ai cũng đăng đúng 7/7 ngày) — chuỗi theo ngày sẽ
// bị "gãy oan" quá dễ, nản hơn là tạo động lực.
function startOfWeekMon(d){
  const x = new Date(d); const day = (x.getDay()+6)%7; x.setDate(x.getDate()-day); x.setHours(0,0,0,0);
  return x;
}
function isoDateStr(d){ return d.toISOString().slice(0,10); }
// dateStrs: mảng 'YYYY-MM-DD' của MỌI bài đã đăng (posted=true) — trả về số tuần liên tục tính lùi
// từ tuần hiện tại. Nếu tuần này CHƯA có bài, không tính tuần này vào chuỗi (nhưng vẫn giữ nguyên
// chuỗi các tuần trước, kèm cờ thisWeekHasPost để nhắc "đăng ngay để giữ chuỗi").
function computeStreak(dateStrs){
  const weekSet = new Set(dateStrs.map(d => isoDateStr(startOfWeekMon(new Date(d)))));
  const cursor = startOfWeekMon(new Date());
  const thisWeekHasPost = weekSet.has(isoDateStr(cursor));
  if(!thisWeekHasPost) cursor.setDate(cursor.getDate()-7);
  let streak = 0;
  while(weekSet.has(isoDateStr(cursor))){ streak++; cursor.setDate(cursor.getDate()-7); }
  return { streak, thisWeekHasPost };
}

function render(container, ctx){
  const state = {
    loading:true, done:{},
    reviews:[], reviewsLoading:true, reviewComment:'', reviewSubmitting:false, reviewError:null, reviewJustSubmitted:false,
    showAllReviews:false,
    statsLoading:true, streak:0, thisWeekHasPost:false, monthlyViews:0, viewsByDay:{}, daysInMonth:30,
  };
  const REVIEWS_COLLAPSED_COUNT = 3; // "mục nào mà dài quá cũng cho rút gọn" (chị Quỳnh 2026-09-04)
  function draw(){ container.innerHTML = html(); bind(); }
  draw();

  async function boot(){
    const [pos, audit, posts, cal, dayBai] = await Promise.all([
      ctx.supabase.from('positioning_results').select('luot1').eq('user_id', ctx.user.id).maybeSingle(),
      ctx.supabase.from('channel_audits').select('id').eq('user_id', ctx.user.id).limit(1).maybeSingle(),
      ctx.supabase.from('posts').select('id').eq('user_id', ctx.user.id).limit(1).maybeSingle(),
      ctx.supabase.from('calendar_entries').select('id').eq('user_id', ctx.user.id).limit(1).maybeSingle(),
      ctx.supabase.from('posts').select('id').eq('user_id', ctx.user.id).not('day_bai_plan', 'is', null).limit(1).maybeSingle(),
    ]);
    state.done = {
      'dinh-vi': !!(pos.data && pos.data.luot1),
      'sua-kenh': !!audit.data,
      'viet-content': !!posts.data,
      'lich-dang': !!cal.data,
      'day-bai': !!dayBai.data,
    };
    state.loading = false;
    draw();
    loadReviews();
    loadStats();
  }

  // Tách riêng khỏi boot() (không chặn hiện checklist ngay) — chỉ cần 180 ngày gần nhất là đủ cho
  // CẢ streak (26 tuần) lẫn view tháng này, khỏi phải quét toàn bộ lịch sử calendar_entries.
  async function loadStats(){
    const sinceStr = isoDateStr(new Date(Date.now() - 180*86400000));
    const { data } = await ctx.supabase.from('calendar_entries')
      .select('scheduled_date,views').eq('user_id', ctx.user.id).eq('posted', true).gte('scheduled_date', sinceStr);
    const rows = data || [];
    const { streak, thisWeekHasPost } = computeStreak(rows.map(r=>r.scheduled_date));
    state.streak = streak;
    state.thisWeekHasPost = thisWeekHasPost;

    const now = new Date();
    const monthPrefix = now.toISOString().slice(0,7); // 'YYYY-MM'
    state.daysInMonth = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
    const viewsByDay = {};
    let monthlyViews = 0;
    for(const r of rows){
      if(!r.scheduled_date || !r.scheduled_date.startsWith(monthPrefix)) continue;
      const v = r.views || 0;
      monthlyViews += v;
      viewsByDay[r.scheduled_date] = (viewsByDay[r.scheduled_date]||0) + v;
    }
    state.monthlyViews = monthlyViews;
    state.viewsByDay = viewsByDay;
    state.statsLoading = false;
    draw();
  }

  async function loadReviews(){
    const { data } = await ctx.supabase.from('app_reviews').select('display_name,comment,created_at')
      .eq('approved', true).eq('app', 'nhan-hieu').order('created_at', { ascending:false }).limit(20);
    state.reviews = data || [];
    state.reviewsLoading = false;
    draw();
  }

  async function submitReview(){
    if(state.reviewSubmitting || !state.reviewComment.trim()) return;
    state.reviewSubmitting = true; state.reviewError = null; draw();
    try{
      const data = await callApi('/api/submit-review', { comment: state.reviewComment.trim() });
      if(window.onReviewSubmitted) window.onReviewSubmitted(data);
      state.reviewComment = '';
      state.reviewJustSubmitted = true;
      loadReviews();
    } catch(e){ state.reviewError = e.message; }
    state.reviewSubmitting = false; draw();
  }

  function html(){
    const name = (ctx.profile && ctx.profile.full_name) ? ctx.profile.full_name.split(' ').slice(-1)[0] : '';
    const nextIdx = STEPS.findIndex(s => !state.done[s.key]);
    // Đã dùng đủ lâu để có ý kiến thật (cùng điều kiện với popup xin đánh giá, xem AppState.pastReviewThreshold
    // ở app-shell.js) — đẩy mục Đánh giá lên NGAY SAU checklist thay vì để tít dưới cùng nơi ít ai
    // lướt tới, kèm luôn lời mời nâng cấp ngay bên dưới (theo yêu cầu chị Quỳnh 2026-08-24).
    const isProminent = !!AppState.pastReviewThreshold;
    return `
      <div class="page-head">
        <h1>Chào mừng${name?` ${esc(name)}`:''} đến với Xây Nhân Hiệu 👋</h1>
        <p>Đây là nơi bạn đi qua từng bước để xây dựng thương hiệu cá nhân: định vị đúng trục nội dung, tối ưu kênh, để AI viết bài đều đặn theo đúng giọng văn của bạn, và lên lịch đăng không bị đứt quãng. Đi lần lượt theo checklist bên dưới nếu chưa biết bắt đầu từ đâu.</p>
      </div>

      <div class="card">
        <h3 style="font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.05em;margin-bottom:14px;">📋 Quy trình dùng app hiệu quả nhất</h3>
        ${state.loading ? `<div style="color:var(--ink-soft);font-size:14px;">Đang tải tiến độ…</div>` : STEPS.map((s,i)=>{
          const isDone = state.done[s.key];
          const isNext = i===nextIdx;
          const groupHeader = (i===0 || STEPS[i-1].group!==s.group)
            ? `<div style="font-size:11px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:.04em;margin:${i===0?'0':'16px'} 0 8px;">${esc(STEP_GROUP_LABEL[s.group])}</div>`
            : '';
          return `
          ${groupHeader}
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

      ${momentumSectionHtml()}

      ${isProminent ? reviewSectionHtml() + upgradeBannerHtml() : ''}

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

      ${!isProminent ? reviewSectionHtml() : ''}
    `;
  }

  function momentumSectionHtml(){
    if(state.statsLoading){
      return `<div class="card" style="margin-top:20px;"><div style="color:var(--ink-soft);font-size:14px;">Đang tải momentum…</div></div>`;
    }
    const now = new Date();
    const todayDate = now.getDate();
    let maxViews = 1;
    for(let d=1; d<=state.daysInMonth; d++){
      const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      maxViews = Math.max(maxViews, state.viewsByDay[dateStr] || 0);
    }
    const bars = Array.from({length: todayDate}, (_,i)=>{
      const d = i+1;
      const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const v = state.viewsByDay[dateStr] || 0;
      const h = Math.max(3, Math.round((v/maxViews)*44));
      return `<div style="flex:1;min-width:2px;height:${h}px;background:${v>0?'var(--accent)':'var(--line)'};border-radius:2px;" title="${d}/${now.getMonth()+1}: ${v} view"></div>`;
    }).join('');
    return `
      <div class="card" style="margin-top:20px;">
        <h3 style="font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.05em;margin-bottom:14px;">🔥 Đà đăng bài của bạn</h3>
        <div style="display:flex;gap:28px;flex-wrap:wrap;margin-bottom:16px;">
          <div>
            <div style="font-size:32px;font-weight:800;color:var(--accent);line-height:1;">${state.streak}</div>
            <div style="font-size:12.5px;color:var(--ink-soft);margin-top:4px;">tuần liên tục có đăng bài</div>
          </div>
          <div>
            <div style="font-size:32px;font-weight:800;line-height:1;">${state.monthlyViews.toLocaleString('vi-VN')}</div>
            <div style="font-size:12.5px;color:var(--ink-soft);margin-top:4px;">tổng view tháng này</div>
          </div>
        </div>
        ${!state.thisWeekHasPost && state.streak>0 ? `<div class="hint-box" style="margin-bottom:14px;">Tuần này chưa có bài nào được đánh dấu đã đăng — đăng ngay để giữ chuỗi <b>${state.streak} tuần liên tục</b>!</div>` : ''}
        ${state.monthlyViews>0 ? `
          <div style="display:flex;gap:3px;align-items:flex-end;height:48px;">${bars}</div>
          <div style="font-size:11px;color:var(--ink-soft);margin-top:6px;">Số view theo ngày trong tháng này (bài đã đăng, tính theo view bạn tự điền ở Lịch Đăng Bài)</div>
        ` : `<div style="font-size:12.5px;color:var(--ink-soft);">Chưa có view nào ghi nhận tháng này — điền view thật ở Lịch Đăng Bài sau khi đăng bài để theo dõi hiệu quả theo thời gian.</div>`}
      </div>
    `;
  }

  function upgradeBannerHtml(){
    if(!ctx.profile || ctx.profile.has_paid) return '';
    return `
      <div class="card" style="margin-top:16px;margin-bottom:24px;background:var(--accent);color:#fff;">
        <div style="font-weight:700;font-size:15px;margin-bottom:6px;">Dùng quen tay rồi đúng không? 🚀</div>
        <div style="font-size:13.5px;line-height:1.6;margin-bottom:14px;opacity:.95;">Nâng cấp ngay để dùng không giới hạn thời gian dùng thử, không lo hết lượt giữa chừng.</div>
        <span class="btn-ghost btn btn-sm" style="background:#fff;color:var(--accent);border:none;font-weight:600;" data-key="nang-cap">Xem bảng giá →</span>
      </div>
    `;
  }

  function reviewSectionHtml(){
    const alreadyRewarded = !!(ctx.profile && ctx.profile.review_reward_given);
    return `
      <div style="margin-top:28px;">
        <h3 style="font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px;">⭐ Đánh giá từ mọi người</h3>
        <div class="card" style="margin-bottom:16px;background:var(--accent-soft);border:1px solid var(--accent);">
          ${state.reviewJustSubmitted
            ? `<div style="color:var(--accent);font-weight:600;font-size:14px;">✓ Cảm ơn bạn đã gửi đánh giá!</div>`
            : `
            ${!alreadyRewarded ? `<div style="font-size:15px;font-weight:700;color:var(--danger);margin-bottom:10px;">🎁 Tặng ngay 20 lượt AI miễn phí khi viết từ 50 từ trở lên!</div>` : ''}
            <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:6px;">Khoe trải nghiệm của bạn — kể thoải mái 3-5 điều bạn thích nhất</label>
            <div style="font-size:12px;color:var(--ink-soft);margin-bottom:8px;">Viết nhanh hơn bao nhiêu, tự tin hơn thế nào, tiết kiệm được bao nhiêu thời gian mỗi tuần... Viết càng thật, càng chi tiết càng tốt, cảm nhận của bạn sẽ truyền cảm hứng cho rất nhiều người sau này.</div>
            <textarea id="rv-comment" placeholder="Ví dụ: 1. Viết bài nhanh hơn hẳn trước đây, mỗi tuần tiết kiệm được vài tiếng 2. AI bám đúng giọng văn của mình, đọc lên như chính mình viết 3. Lên lịch tuần không còn phải nghĩ, cứ theo AI gợi ý là xong..." style="min-height:70px;">${esc(state.reviewComment)}</textarea>
            ${state.reviewError?`<div class="error-box" style="margin-top:10px;">${esc(state.reviewError)}</div>`:''}
            <div class="btn-row" style="margin-top:10px;justify-content:flex-start;">
              <button class="btn btn-sm" data-action="submit-review" ${state.reviewSubmitting?'disabled':''}>${state.reviewSubmitting?'Đang gửi…':'Gửi đánh giá'}</button>
            </div>
          `}
        </div>
        ${state.reviewsLoading ? `<div style="color:var(--ink-soft);font-size:14px;">Đang tải…</div>`
          : state.reviews.length===0 ? `<div style="color:var(--ink-soft);font-size:14px;">Chưa có đánh giá nào được duyệt.</div>`
          : (state.showAllReviews ? state.reviews : state.reviews.slice(0, REVIEWS_COLLAPSED_COUNT)).map(r=>`
            <div class="section">
              <div class="body" style="white-space:pre-wrap;">${esc(r.comment)}</div>
              <div style="font-size:12px;color:var(--ink-soft);margin-top:8px;">${esc(r.display_name||'Ẩn danh')} · ${esc(new Date(r.created_at).toLocaleDateString('vi-VN'))}</div>
            </div>
          `).join('')}
        ${!state.showAllReviews && state.reviews.length > REVIEWS_COLLAPSED_COUNT ? `
          <div class="btn-row" style="justify-content:flex-start;"><span class="btn-ghost btn btn-sm" data-action="show-all-reviews">Xem thêm ${state.reviews.length - REVIEWS_COLLAPSED_COUNT} đánh giá →</span></div>
        ` : ''}
      </div>
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
    const showAllRvBtn = container.querySelector('[data-action="show-all-reviews"]');
    if(showAllRvBtn) showAllRvBtn.onclick = ()=>{ state.showAllReviews = true; draw(); };
  }

  boot();
}

window.Modules = window.Modules || {};
window.Modules['trang-chu'] = { title:'Trang chủ', render };
})();
