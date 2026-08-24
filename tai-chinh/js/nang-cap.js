(function(){
// "Nâng Cấp" — vào được CHỦ ĐỘNG bất cứ lúc nào, khác với màn khoá tự động renderUpgradeScreen()
// (chỉ hiện khi bấm vào đúng route premium mà chưa trả phí). Tái dùng tcBenefitsHtml() (3 khối lợi
// ích cụ thể — nợ/tài sản/kiểm soát tài chính) + tcPaymentCardHtml()/bindTcPaymentCard() từ
// app-shell.js (không lặp code) — LUÔN hiện lợi ích TRƯỚC thẻ QR (góp ý Quỳnh 2026-08-24: đưa STK
// ra trước khi người chưa hiểu tính năng gì dễ giống vội/đáng ngờ).
function render(container, ctx){
  const p = ctx.profile;
  const alreadyPaid = !!(p && p.tc_has_paid);

  function draw(){
    container.innerHTML = `
      <div class="page-head">
        <h1>Nâng Cấp</h1>
        <p>${alreadyPaid
          ? 'Bạn đã mở khoá TRỌN ĐỜI toàn bộ tính năng — cảm ơn bạn đã đồng hành!'
          : 'Mở khoá TRỌN ĐỜI chỉ 1 lần, dùng mãi mãi — không phải trả lại theo tháng.'}</p>
      </div>
      ${alreadyPaid ? `
        <div class="card" style="max-width:460px;text-align:center;">
          <div style="font-size:34px;margin-bottom:8px;">🎉</div>
          <div style="font-weight:600;font-size:15px;">Tài khoản của bạn đã ở bản trọn đời</div>
        </div>
      ` : `
        <div class="card" style="max-width:460px;">
          ${tcBenefitsHtml()}
          ${tcPaymentCardHtml()}
        </div>
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
