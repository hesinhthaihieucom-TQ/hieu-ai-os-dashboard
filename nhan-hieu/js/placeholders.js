(function(){
function comingSoon(title, desc){
  return function render(container){
    container.innerHTML = `
      <div class="page-head"><h1>${esc(title)}</h1><p>${esc(desc)}</p></div>
      <div class="card" style="text-align:center;color:var(--ink-soft);padding:50px 24px;">
        Đang được xây dựng — sẽ cập nhật dần trong các bản tiếp theo.
      </div>
    `;
  };
}

const HELP_ITEMS = [
  { q:'Vì sao Sửa Kênh / Ý Tưởng / Viết Content bắt tôi làm Định Vị trước?', a:'Toàn bộ nội dung AI sinh ra đều bám theo định vị đã chốt để không bị lệch trục — nên cần có Định Vị trước mới dùng được các bước sau.' },
  { q:'Kho Content và Kho Hook khác gì nhau?', a:'Kho Content lưu bài viết/mẫu content (của bạn và của đội ngũ). Kho Hook lưu riêng các câu hook hay để tra cứu nhanh khi cần mở đầu bài.' },
  { q:'Chấm Điểm Content dùng để làm gì?', a:'Dán 1 bài đã viết (tự viết hoặc AI viết) vào để AI chấm theo đúng khung Hook-Vấn đề-Giá trị-Niềm tin-CTA, chỉ ra chỗ yếu và cách sửa cụ thể.' },
  { q:'Dữ liệu của tôi có bị người khác xem không?', a:'Không. Mỗi tài khoản chỉ thấy dữ liệu của chính mình, trừ "Kho chung" do đội ngũ quản lý là mọi người đều xem được.' },
];

function renderHelp(container){
  container.innerHTML = `
    <div class="page-head"><h1>Hỏi & Trợ Giúp</h1><p>Câu hỏi thường gặp khi dùng Xây Nhân Hiệu.</p></div>
    ${HELP_ITEMS.map(i=>`<div class="section"><h3>${esc(i.q)}</h3><div class="body">${esc(i.a)}</div></div>`).join('')}
  `;
}

window.Modules = window.Modules || {};
window.Modules['bai-viet-mau'] = { title:'Bài Viết Mẫu', render: comingSoon('Bài Viết Mẫu', 'Thư viện bài mẫu đã lên triệu view, đóng gói theo cấu trúc — do đội ngũ tuyển chọn.') };
window.Modules['tao-anh'] = { title:'Tạo Ảnh Thương Hiệu', render: comingSoon('Tạo Ảnh Thương Hiệu', 'Ghép ảnh thương hiệu (tiêu đề, chữ nổi bật, handle) và tải PNG chỉ trong vài giây.') };
window.Modules['tro-giup'] = { title:'Hỏi & Trợ Giúp', render: renderHelp };
})();
