// Sản Phẩm Số — "🔥 Nâng cấp / Mua gói": gói RIÊNG của Sản Phẩm Số (599.000đ/tháng), TÁCH BIỆT hoàn
// toàn khỏi gói Xây Nhân Hiệu — xem giải thích đầy đủ ở san-pham-so/js/app-shell.js (spsPaymentCardHtml
// và các hàm sps* xung quanh nó). Y hệt khung nhan-hieu/js/nang-cap.js: chỉ hiện card chọn gói + QR,
// mọi logic thật (mã ref, QR, đối chiếu) nằm ở app-shell.js để dùng chung được ở nơi khác nếu cần.
(function () {
function render(container) {
  container.innerHTML = `<div class="loading"><div class="spinner"></div></div>`;
  boot();

  async function boot() {
    const refCode = await ensureSpsRefCode();
    draw(refCode);
  }

  function draw(refCode) {
    const p = currentProfile;
    const active = spsHasActiveAccess();
    container.innerHTML = `
      <h2>Nâng cấp Sản Phẩm Số</h2>
      ${active ? `<div class="hint-box">Gói của bạn đang hoạt động, hết hạn ${esc(new Date(p.sps_access_until).toLocaleDateString('vi-VN'))}. Vẫn có thể chuyển khoản thêm bên dưới để gia hạn nối tiếp.</div>` : `<div class="hint-box">Sản Phẩm Số là gói riêng, tách biệt khỏi Xây Nhân Hiệu — cần thanh toán đúng gói này để dùng AI không giới hạn ở đây.</div>`}
      ${spsPaymentCardHtml(refCode)}
    `;
    bindSpsPaymentCard(container);
  }
}

window.SanPhamSoScreens = window.SanPhamSoScreens || {};
window.SanPhamSoScreens['nang-cap'] = render;
})();
