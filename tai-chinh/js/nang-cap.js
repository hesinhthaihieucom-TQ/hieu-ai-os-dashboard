(function(){
// "Nâng Cấp" — vào được CHỦ ĐỘNG bất cứ lúc nào (kể cả đang còn hạn dùng thử), khác với màn khoá
// tự động renderUpgradeScreen() (chỉ hiện khi bấm vào đúng route premium mà hết quyền). Tái dùng
// tcPaymentCardHtml()/bindTcPaymentCard() từ app-shell.js (không lặp lại code QR/chuyển khoản) —
// giống cách nhan-hieu tách paymentCardHtml() dùng chung giữa renderExpiredScreen và module Nâng Cấp.
function render(container, ctx){
  const p = ctx.profile;
  const alreadyPaid = !!(p && p.tc_has_paid);

  function draw(){
    container.innerHTML = `
      <div class="page-head">
        <h1>Nâng Cấp</h1>
        <p>${alreadyPaid
          ? 'Bạn đã mở khoá TRỌN ĐỜI toàn bộ tính năng — cảm ơn bạn đã đồng hành!'
          : 'Mở khoá TRỌN ĐỜI Hạt Giống Phước - Nghiệp, Mục Tiêu & Cam Kết, Tổng Kết Tuần/Tháng, Quản Lý Nợ — chỉ 1 lần, dùng mãi mãi, không phải trả lại theo tháng.'}</p>
      </div>
      ${alreadyPaid ? `
        <div class="card" style="max-width:460px;text-align:center;">
          <div style="font-size:34px;margin-bottom:8px;">🎉</div>
          <div style="font-weight:600;font-size:15px;">Tài khoản của bạn đã ở bản trọn đời</div>
        </div>
      ` : `
        <div class="card" style="max-width:460px;">${tcPaymentCardHtml()}</div>
      `}
    `;
    // Gọi renderApp() (không phải draw() cục bộ) sau khi tải lại hồ sơ — ctx.profile ở closure này
    // là ảnh chụp lúc render() được gọi, sẽ CŨ nếu chỉ vẽ lại cục bộ; renderApp() dựng lại từ
    // AppState.profile mới nhất, tự nhiên hiện đúng trạng thái đã trả phí nếu vừa kích hoạt xong.
    if(!alreadyPaid) bindTcPaymentCard(container, renderApp);
  }

  draw();
}
window.Modules = window.Modules || {};
window.Modules['nang-cap'] = { title:'Nâng Cấp', render };
})();
