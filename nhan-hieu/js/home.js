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

function render(container, ctx){
  const state = {
    loading:true, done:{},
    reviews:[], reviewsLoading:true, reviewComment:'', reviewSubmitting:false, reviewError:null, reviewJustSubmitted:false,
  };
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
  }

  async function loadReviews(){
    const { data } = await ctx.supabase.from('app_reviews').select('display_name,comment,created_at')
      .eq('approved', true).order('created_at', { ascending:false }).limit(20);
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

  function reviewSectionHtml(){
    const alreadyRewarded = !!(ctx.profile && ctx.profile.review_reward_given);
    return `
      <div style="margin-top:28px;">
        <h3 style="font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px;">⭐ Đánh giá từ mọi người</h3>
        <div class="card" style="margin-bottom:16px;background:var(--accent-soft);border:1px solid var(--accent);">
          ${state.reviewJustSubmitted
            ? `<div style="color:var(--accent);font-weight:600;font-size:14px;">✓ Cảm ơn bạn đã gửi đánh giá!</div>`
            : `
            ${!alreadyRewarded ? `<div style="font-size:15px;font-weight:700;color:var(--danger);margin-bottom:10px;">🎁 Tặng ngay 20 lượt AI miễn phí khi viết từ 30 từ trở lên!</div>` : ''}
            <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:6px;">Kể ra 3-5 điều bạn thấy TỐT khi dùng app</label>
            <textarea id="rv-comment" placeholder="Ví dụ: 1. Viết bài nhanh hơn hẳn trước đây 2. AI bám đúng giọng văn của mình 3. Lên lịch tuần không còn phải nghĩ..." style="min-height:70px;">${esc(state.reviewComment)}</textarea>
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
