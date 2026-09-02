// Sản Phẩm Số — Trang chủ, vào qua bấm logo (route 'home', ẩn khỏi sidebar).
(function () {
function render(container, profile) {
  container.innerHTML = `
    <h2>Chào ${esc((profile && profile.full_name) || 'bạn')} 👋</h2>
    <div class="hint-box">Tạo sản phẩm số hoàn chỉnh và bán ngay trong app — không cần rời sang nhiều công cụ khác. Đi theo đúng thứ tự trong sidebar bên trái nếu chưa biết bắt đầu từ đâu.</div>
    <div class="card">
      <div style="font-size:15px;font-weight:600;margin-bottom:4px;">🧭 Tìm Sản Phẩm Phù Hợp</div>
      <div style="font-size:13px;color:var(--ink-soft);margin-bottom:10px;">Chưa biết làm sản phẩm gì, hay nên làm dạng nào? Trả lời vài câu hỏi (hoặc tải tài liệu có sẵn), AI gợi ý cả ý tưởng lẫn định dạng phù hợp.</div>
      <button class="btn" id="home-go-tao-ai">Bắt đầu →</button>
    </div>
    <div class="card">
      <div style="font-size:15px;font-weight:600;margin-bottom:4px;">🗂️ Chọn Loại Sản Phẩm Số</div>
      <div style="font-size:13px;color:var(--ink-soft);margin-bottom:10px;">Đã biết rõ chủ đề/đối tượng muốn nhắm tới? Chọn thẳng định dạng (Ebook, Mini-course...) rồi vào viết nội dung luôn, không cần qua bước hỏi ý tưởng.</div>
      <button class="btn btn-ghost" id="home-go-chon-loai">Bắt đầu →</button>
    </div>
    <div class="card">
      <div style="font-size:15px;font-weight:600;margin-bottom:4px;">🛒 Sản phẩm của tôi</div>
      <div style="font-size:13px;color:var(--ink-soft);margin-bottom:10px;">Quản lý, đăng bán, xem link sản phẩm đã tạo.</div>
      <button class="btn btn-ghost" id="home-go-list">Xem danh sách →</button>
    </div>
  `;
  container.querySelector('#home-go-tao-ai').onclick = () => { location.hash = 'tao-ai'; };
  container.querySelector('#home-go-chon-loai').onclick = () => { location.hash = 'chon-loai'; };
  container.querySelector('#home-go-list').onclick = () => { location.hash = 'san-pham'; };
}

window.SanPhamSoScreens = window.SanPhamSoScreens || {};
window.SanPhamSoScreens['home'] = render;
})();
