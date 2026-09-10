(function(){
// Cho người ĐANG CÒN HẠN (chưa hết dùng thử/gói) chủ động vào mua sớm — dùng lại đúng bảng giá/QR
// ở app-shell.js (paymentCardHtml/bindPaymentCard), tránh phải đợi tới lúc hết hạn mới thấy được
// giá. Cần thiết cho các đợt ưu đãi có thời hạn (vd "chốt trong buổi Zoom hôm nay") vì người mới
// đăng ký còn nguyên 7 ngày dùng thử, không tự thấy màn thanh toán bắt buộc.
function render(container, ctx){
  // 2026-08-29: trang này giờ dùng chung cho CẢ 2 trường hợp — chủ động vào mua sớm lúc còn hạn,
  // LẪN bị tự động đưa vào đây lúc hết hạn (renderApp() ở app-shell.js không còn màn chặn riêng
  // renderExpiredScreen nữa, xem "cho xem lại nội dung cũ mãi mãi sau khi hết hạn"). Đổi tiêu đề/mô
  // tả theo đúng trạng thái thật, tránh hiện nhầm "bạn vẫn còn hạn dùng" cho người đã hết hạn.
  const p = AppState.profile;
  const isAdmin = p && p.role === 'admin';
  const expired = !isAdmin && !hasActiveAccess();
  const hadAccessBefore = !!(p && p.access_until);
  // "cho mua thêm lượt AI đi, mục nâng cấp á" + "để thành 2 mục riêng... để ng dùng ko cần kéo xuống
  // cũng nhìn thấy để bấm vào" (chị Quỳnh 2026-09-07) — trước đây "Mua thêm lượt" đã có sẵn (chỉ hiện
  // cho khách has_paid=true), nhưng luôn nằm CUỐI trang dưới cả khối "Mua gói" (QR/bảng giá dài) —
  // phải kéo hết xuống mới thấy, dễ bị bỏ sót. Giờ tách thành 2 tab riêng ngay đầu trang khi khách đủ
  // điều kiện mua thêm lượt (has_paid), thấy được cả 2 lựa chọn ngay không cần kéo.
  const canTopup = !!(p && p.has_paid);
  let tab = 'goi';
  // "mục đánh giá nên để đâu cho dễ thấy nhất" (chị Quỳnh 2026-09-10) — đặt NGAY TRANG NÂNG CẤP, sát
  // giá, đúng lúc khách đang cân nhắc bấm mua — social proof hiệu quả nhất ở ĐÚNG thời điểm ra quyết
  // định, không phải ở trang chủ (khách đã lướt qua từ trước, không còn đúng lúc). Dùng lại đúng bảng
  // app_reviews đã duyệt ở home.js, CHỈ hiện danh sách (không có form gửi đánh giá — trang này không
  // phải chỗ để viết đánh giá).
  let reviews = []; let reviewsLoading = true; let showAllReviews = false;
  const REVIEWS_COLLAPSED_COUNT = 3;
  async function loadReviews(){
    const { data } = await ctx.supabase.from('app_reviews').select('display_name,comment,created_at')
      .eq('approved', true).eq('app', 'nhan-hieu').order('created_at', { ascending:false }).limit(20);
    reviews = data || [];
    reviewsLoading = false;
    draw();
  }
  function reviewsBlockHtml(){
    if(!reviewsLoading && reviews.length===0) return '';
    return `
      <div class="card" style="margin-bottom:20px;">
        <h3 style="font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px;">⭐ Mọi người đang nói gì</h3>
        ${reviewsLoading ? `<div style="color:var(--ink-soft);font-size:14px;">Đang tải…</div>`
          : (showAllReviews ? reviews : reviews.slice(0, REVIEWS_COLLAPSED_COUNT)).map(r=>`
            <div class="section">
              <div class="body" style="white-space:pre-wrap;">${esc(r.comment)}</div>
              <div style="font-size:12px;color:var(--ink-soft);margin-top:8px;">${esc(r.display_name||'Ẩn danh')} · ${esc(new Date(r.created_at).toLocaleDateString('vi-VN'))}</div>
            </div>
          `).join('')}
        ${!showAllReviews && reviews.length > REVIEWS_COLLAPSED_COUNT ? `
          <div class="btn-row" style="justify-content:flex-start;"><span class="btn-ghost btn btn-sm" data-action="show-all-reviews">Xem thêm ${reviews.length - REVIEWS_COLLAPSED_COUNT} đánh giá →</span></div>
        ` : ''}
      </div>
    `;
  }
  function draw(){
    container.innerHTML = `
      <div class="page-head">
        <h1>${expired ? (hadAccessBefore ? 'Gói dùng đã hết hạn' : 'Dùng thử đã kết thúc') : 'Nâng cấp / Mua gói'}</h1>
        <p>${expired
          ? (hadAccessBefore ? `Gói của bạn đã hết hạn ngày ${esc(new Date(p.access_until).toLocaleDateString('vi-VN'))} — chuyển khoản để tiếp tục dùng AI ngay. Nội dung cũ (Kho Content, Lịch Đăng Bài...) bạn vẫn xem lại được bình thường.` : 'Chuyển khoản theo đúng hướng dẫn bên dưới — hệ thống tự kích hoạt trong vài phút, không cần chờ ai xác nhận.')
          : 'Bạn vẫn còn hạn dùng — mua sớm để giữ giá tốt và không bị gián đoạn khi hết hạn.'}</p>
      </div>
      ${reviewsBlockHtml()}
      ${canTopup ? `
        <div class="tab-row">
          <div class="tab-btn ${tab==='goi'?'active':''}" data-nc-tab="goi">Mua gói / Gia hạn</div>
          <div class="tab-btn ${tab==='topup'?'active':''}" data-nc-tab="topup">Mua thêm lượt AI</div>
        </div>
      ` : ''}
      ${(!canTopup || tab==='goi') ? `
        <div class="card" style="max-width:460px;">
          ${window.paymentCardHtml()}
        </div>
      ` : ''}
      ${(canTopup && tab==='topup') ? window.topupCardHtml() : ''}
    `;
    window.bindPaymentCard(container, draw);
    window.bindTopupCard(container, draw);
    container.querySelectorAll('[data-nc-tab]').forEach(el=>{
      el.onclick = ()=>{ tab = el.getAttribute('data-nc-tab'); draw(); };
    });
    const showAllRvBtn = container.querySelector('[data-action="show-all-reviews"]');
    if(showAllRvBtn) showAllRvBtn.onclick = ()=>{ showAllReviews = true; draw(); };
  }
  draw();
  loadReviews();
}
window.Modules = window.Modules || {};
window.Modules['nang-cap'] = { title:'Nâng cấp / Mua gói', render };
})();
