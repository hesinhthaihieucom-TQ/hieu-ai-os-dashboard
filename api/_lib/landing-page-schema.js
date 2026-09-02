// "Tạo Landing Page" — AI viết nội dung landing page cho 1 sản phẩm số đã có (title/description/
// dinh_dang/price). KHÔNG gồm testimonial/bảng trước-sau — những phần đó cần dữ liệu THẬT từ khách
// hàng, AI không được bịa (xem quy tắc "không được bịa ví dụ/bằng chứng" áp dụng xuyên suốt app này,
// 2026-09-01). 9 phần cốt lõi theo đúng công thức landing page hiệu quả (tham khảo cấu trúc landing
// page thật Quỳnh đang dùng cho gói cao cấp — rút gọn, bỏ phần cần dữ liệu thật).
const TOOL_LANDING_PAGE = {
  name: 'xuat_landing_page',
  description: 'Viết nội dung landing page bán 1 sản phẩm số, theo đúng công thức: hook, vấn đề, lợi ích, giới thiệu nội dung, về người bán, phù hợp với ai, FAQ, CTA.',
  input_schema: {
    type: 'object',
    properties: {
      hook: {
        type: 'string',
        description: '1 câu tiêu đề chính, chạm đúng nỗi đau/mong muốn của đối tượng — KHÔNG lặp lại tên sản phẩm, phải khiến người đọc thấy ngay đây là dành cho mình.',
      },
      van_de: {
        type: 'string',
        description: 'Đoạn mô tả vấn đề/nỗi đau người đọc đang gặp, đủ cụ thể để họ thấy "đúng là mình" — 3-5 câu, có thể xuống dòng giữa các ý. Kết ở việc chỉ ra gốc rễ vấn đề, không chỉ bề mặt.',
      },
      loi_ich: {
        type: 'array',
        items: { type: 'string' },
        minItems: 3,
        maxItems: 6,
        description: 'Lợi ích/kết quả CỤ THỂ đạt được sau khi dùng sản phẩm — mỗi ý 1 câu ngắn, tránh chung chung kiểu "học được nhiều điều".',
      },
      noi_dung_gioi_thieu: {
        type: 'string',
        description: 'Đoạn giới thiệu ngắn về nội dung/cấu trúc sản phẩm, viết hấp dẫn dựa theo mô tả đã có — KHÔNG bịa thêm nội dung không có trong mô tả gốc.',
      },
      ve_nguoi_ban: {
        type: 'string',
        description: 'Đoạn giới thiệu ngắn tạo niềm tin về người bán — CHỈ dựa trên thông tin có sẵn (tên, ngành), giữ chung chung/không bịa số liệu/thành tích cụ thể nếu không có thông tin đó.',
      },
      phu_hop_voi_ai: {
        type: 'array',
        items: { type: 'string' },
        minItems: 3,
        maxItems: 5,
        description: 'Tiêu chí cụ thể ai phù hợp với sản phẩm này, dựa theo đối tượng đã nêu.',
      },
      faq: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            cau_hoi: { type: 'string' },
            tra_loi: { type: 'string' },
          },
          required: ['cau_hoi', 'tra_loi'],
        },
        minItems: 3,
        maxItems: 6,
        description: 'Câu hỏi thường gặp + trả lời — xử lý trước các lo ngại/lý do ngần ngại mua phổ biến nhất (giá, thời gian, có phù hợp với mình không, cách nhận sản phẩm...).',
      },
      cta_text: {
        type: 'string',
        description: 'Câu kêu gọi hành động ngắn (dưới 10 từ), thúc đẩy mua ngay — vd "Bắt đầu thay đổi ngay hôm nay".',
      },
    },
    required: ['hook', 'van_de', 'loi_ich', 'noi_dung_gioi_thieu', 've_nguoi_ban', 'phu_hop_voi_ai', 'faq', 'cta_text'],
  },
};

module.exports = { TOOL_LANDING_PAGE };
