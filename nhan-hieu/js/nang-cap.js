(function(){
// Cho người ĐANG CÒN HẠN (chưa hết dùng thử/gói) chủ động vào mua sớm — dùng lại đúng bảng giá/QR
// ở app-shell.js (paymentCardHtml/bindPaymentCard), tránh phải đợi tới lúc hết hạn mới thấy được
// giá. Cần thiết cho các đợt ưu đãi có thời hạn (vd "chốt trong buổi Zoom hôm nay") vì người mới
// đăng ký còn nguyên 7 ngày dùng thử, không tự thấy màn thanh toán bắt buộc.
function render(container, ctx){
  function draw(){
    container.innerHTML = `
      <div class="page-head"><h1>Nâng cấp / Mua gói</h1><p>Bạn vẫn còn hạn dùng — mua sớm để giữ giá tốt và không bị gián đoạn khi hết hạn.</p></div>
      <div class="card" style="max-width:460px;">
        ${window.paymentCardHtml()}
      </div>
      ${window.topupCardHtml()}
    `;
    window.bindPaymentCard(container, draw);
    window.bindTopupCard(container, draw);
  }
  draw();
}
window.Modules = window.Modules || {};
window.Modules['nang-cap'] = { title:'Nâng cấp / Mua gói', render };
})();
