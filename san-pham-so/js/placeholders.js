// Sản Phẩm Số — placeholder cho các mục sidebar chưa build chi tiết (giống nhan-hieu/js/placeholders.js).
// Xây dần từng mục theo thứ tự đã bàn với Quỳnh.
(function () {
function comingSoon(title, desc) {
  return function render(container) {
    container.innerHTML = `
      <h2>${esc(title)}</h2>
      <div class="hint-box">${esc(desc)}</div>
      <div class="card" style="text-align:center;color:var(--ink-soft);padding:50px 24px;">
        Đang được xây dựng — sẽ cập nhật trong bản tiếp theo.
      </div>
    `;
  };
}

window.SanPhamSoScreens = window.SanPhamSoScreens || {};
window.SanPhamSoScreens['chon-loai'] = comingSoon('Chọn Loại Sản Phẩm Số', 'Chọn thẳng loại sản phẩm muốn làm, không cần qua bước Tìm Sản Phẩm Phù Hợp.');
window.SanPhamSoScreens['tao-landing-page'] = comingSoon('Tạo Landing Page', 'Công cụ tạo trang giới thiệu/bán hàng đầy đủ hơn form nhanh ở "Sản phẩm của tôi" hiện tại.');
window.SanPhamSoScreens['tao-template'] = comingSoon('Tạo Template', 'Công cụ tạo bộ file mẫu (checklist/Notion/Excel...) để bán.');
window.SanPhamSoScreens['nghien-cuu-thi-truong'] = comingSoon('Nghiên Cứu Thị Trường & Giá/Marketing', 'Sau khi có sản phẩm, nghiên cứu thị trường để quyết định giá bán và hướng marketing.');

// "Tạo Ebook/Workbook" thực ra ĐÃ chạy được — nhưng hiện chỉ vào qua sau khi chọn xong 1 phương án
// ở "Tìm Sản Phẩm Phù Hợp" (route 'tao-ai'), chưa có lối vào thẳng riêng (bỏ qua bước tìm ý tưởng).
// Màn này là cầu nối tạm, sẽ thay bằng lối vào thẳng khi build chi tiết mục "Chọn Loại Sản Phẩm Số".
window.SanPhamSoScreens['tao-ebook'] = function (container) {
  container.innerHTML = `
    <h2>📖 Tạo Ebook/Workbook</h2>
    <div class="hint-box">Tính năng viết nội dung bằng AI hiện nằm trong luồng "Tìm Sản Phẩm Phù Hợp" — sau khi có ý tưởng, bạn sẽ được dẫn thẳng sang viết nội dung. Lối vào thẳng riêng (bỏ qua bước tìm ý tưởng) sẽ có khi build chi tiết mục "Chọn Loại Sản Phẩm Số".</div>
    <div class="btn-row"><button class="btn" id="ph-go-tao-ai">Bắt đầu từ Tìm Sản Phẩm Phù Hợp →</button></div>
  `;
  container.querySelector('#ph-go-tao-ai').onclick = () => { location.hash = 'tao-ai'; };
};
})();
