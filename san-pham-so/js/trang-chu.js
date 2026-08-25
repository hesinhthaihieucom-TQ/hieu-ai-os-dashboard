// Sản Phẩm Số — Trang chủ, vào qua bấm logo (route 'home', ẩn khỏi tab bar).
(function () {
function render(container, profile) {
  container.innerHTML = `
    <h2>Chào ${esc((profile && profile.full_name) || 'bạn')} 👋</h2>
    <div class="hint-box">Tạo sản phẩm số hoàn chỉnh và bán ngay trong app — không cần rời sang nhiều công cụ khác.</div>
    <div class="card">
      <div style="font-size:15px;font-weight:600;margin-bottom:4px;">✨ Sản Phẩm Số</div>
      <div style="font-size:13px;color:var(--ink-soft);margin-bottom:10px;">Tìm ý tưởng, tạo nội dung, nghiên cứu giá &amp; marketing.</div>
      <button class="btn" id="home-go-hub">Bắt đầu →</button>
    </div>
    <div class="card">
      <div style="font-size:15px;font-weight:600;margin-bottom:4px;">🛒 Sản phẩm của tôi</div>
      <div style="font-size:13px;color:var(--ink-soft);margin-bottom:10px;">Quản lý, đăng bán, xem link sản phẩm đã tạo.</div>
      <button class="btn btn-ghost" id="home-go-list">Xem danh sách →</button>
    </div>
  `;
  container.querySelector('#home-go-hub').onclick = () => { location.hash = 'san-pham-so-hub'; };
  container.querySelector('#home-go-list').onclick = () => { location.hash = 'san-pham'; };
}

window.SanPhamSoScreens = window.SanPhamSoScreens || {};
window.SanPhamSoScreens['home'] = render;
})();
