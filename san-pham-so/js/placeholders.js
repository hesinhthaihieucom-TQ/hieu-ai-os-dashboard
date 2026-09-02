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
// 'chon-loai' đã build thật ở san-pham-so/js/chon-loai.js (2026-09-01).
// 'tao-landing-page' đã build thật ở san-pham-so/js/tao-landing-page.js (2026-09-01).
// 'viet-noi-dung' đã build thật ở san-pham-so/js/viet-noi-dung.js (2026-09-02).
// 'nghien-cuu-thi-truong' đã đổi thành 'ke-hoach-ra-mat' (san-pham-so/js/ke-hoach-ra-mat.js, đã build
// thật) — phần hữu ích nhất của mục cũ (nghiên cứu thị trường, giá/marketing) đã có ở nơi khác rồi.

// 'tao-ebook' (mục sidebar "Tạo Ebook/Workbook") đã BỎ hẳn khỏi NAV (app-shell.js) 2026-09-01 — nó
// từng là màn cầu nối tạm dẫn sang 'tao-ai' trong lúc "Chọn Loại Sản Phẩm Số" chưa xây xong, giờ
// "Chọn Loại" đã là lối vào thẳng thật (bỏ qua bước tìm ý tưởng đúng như màn cầu nối này định làm),
// nên không còn lý do giữ mục riêng — tránh 3 lối vào cho cùng 1 đích gây rối người dùng mới.

// 'tao-template' (mục sidebar "Tạo Template") đã BỎ hẳn khỏi NAV (app-shell.js) 2026-09-02, cùng lý
// do với 'tao-ebook' ở trên — Quỳnh: "nếu ebook đã cho vào mục chọn loại sản phẩm số thì tạo template
// cũng bỏ ở task bar đi". "Template/File mẫu" vốn đã là 1 trong 7 loại chọn được thẳng ở "Chọn Loại
// Sản Phẩm Số" (chon-loai.js), placeholder riêng chỉ là 1 đích trùng lặp chưa từng có nội dung thật.
})();
