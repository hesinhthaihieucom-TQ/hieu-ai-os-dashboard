// Sản Phẩm Số — hub "✨ Sản Phẩm Số", liệt kê 6 bước theo đúng khung app đã chốt với Quỳnh
// 2026-08-25: tìm ý tưởng → chọn loại → tạo (ebook/landing page/template) → nghiên cứu thị trường
// & giá/marketing. Chỉ "Tìm Sản Phẩm Phù Hợp" (bao gồm cả Tạo Ebook/Workbook, chạy nối tiếp nhau
// trong cùng route 'tao-ai') hoạt động đầy đủ — các mục còn lại là khung điều hướng, build chi tiết
// từng mục sau (xem san-pham-so/js/placeholders.js).
(function () {
const ITEMS = [
  { key: 'tao-ai', icon: '🧭', title: 'Tìm Sản Phẩm Phù Hợp', desc: 'AI dẫn dắt qua các câu hỏi để ra ý tưởng + tên sản phẩm cụ thể, rồi viết luôn nội dung.' },
  { key: 'chon-loai', icon: '🗂️', title: 'Chọn Loại Sản Phẩm Số', desc: 'Đã biết muốn làm gì? Chọn thẳng loại sản phẩm, không cần qua bước tìm ý tưởng.' },
  { key: 'tao-ebook', icon: '📖', title: 'Tạo Ebook/Workbook', desc: 'AI viết nội dung từng phần, có ví dụ + bài tập thực hành.' },
  { key: 'tao-landing-page', icon: '🖥️', title: 'Tạo Landing Page', desc: 'Trang giới thiệu + bán hàng, đầy đủ hơn form nhanh hiện tại.' },
  { key: 'tao-template', icon: '🎨', title: 'Tạo Template', desc: 'Bộ file mẫu (checklist/Notion/Excel...) dùng để bán.' },
  { key: 'nghien-cuu-thi-truong', icon: '📊', title: 'Nghiên Cứu Thị Trường & Giá/Marketing', desc: 'Sau khi có sản phẩm — tìm hiểu thị trường để quyết định giá bán và hướng marketing.' },
];

function render(container) {
  container.innerHTML = `
    <h2>✨ Sản Phẩm Số</h2>
    <div class="hint-box">Đi theo thứ tự từ trên xuống nếu chưa biết bắt đầu từ đâu — hoặc bấm thẳng vào mục cần dùng.</div>
    ${ITEMS.map(it => `
      <div class="card" data-open="${it.key}" style="cursor:pointer;">
        <div style="font-size:15px;font-weight:600;margin-bottom:4px;">${it.icon} ${esc(it.title)}</div>
        <div style="font-size:13px;color:var(--ink-soft);">${esc(it.desc)}</div>
      </div>
    `).join('')}
  `;
  container.querySelectorAll('[data-open]').forEach(el => {
    el.onclick = () => { location.hash = el.getAttribute('data-open'); };
  });
}

window.SanPhamSoScreens = window.SanPhamSoScreens || {};
window.SanPhamSoScreens['san-pham-so-hub'] = render;
})();
