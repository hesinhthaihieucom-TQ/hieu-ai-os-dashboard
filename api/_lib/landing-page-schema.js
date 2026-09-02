// "Tạo Landing Page" — AI viết nội dung landing page cho 1 sản phẩm số đã có (title/description/
// dinh_dang/price). KHÔNG gồm testimonial/bảng trước-sau/số liệu-thành tích/ưu đãi-tặng kèm cụ thể —
// những phần đó cần dữ liệu THẬT (ảnh case study, bonus...) do NGƯỜI BÁN tự cung cấp (xem
// san-pham-so/js/tao-landing-page.js — case_study_images/bonus_items), AI không được bịa (quy tắc
// "không được bịa ví dụ/bằng chứng" áp dụng xuyên suốt app này, 2026-09-01).
//
// 2026-09-02 — MỞ RỘNG theo phản hồi Quỳnh sau khi so với landing page thật của chị
// (30ngaytamlinhtaichinh.netlify.app): bản cũ (9 trường phẳng) "hời hợt" so với trang thật — trang
// thật có vấn đề được ĐẶT TÊN riêng dễ nhớ (không phải 1 đoạn văn chung), có LỘ TRÌNH/chương trình
// chia theo từng chặng (không phải 1 đoạn giới thiệu), và có LỜI NHẮN cá nhân trực tiếp từ người bán
// (khác đoạn tiểu sử "về người bán"). Đổi 3 trường phẳng cũ (van_de, loi_ich, noi_dung_gioi_thieu)
// thành cấu trúc sâu hơn + thêm loi_nhan_nguoi_ban — vẫn giữ nguyên các quy tắc chống bịa.
const TOOL_LANDING_PAGE = {
  name: 'xuat_landing_page',
  description: 'Viết nội dung landing page bán 1 sản phẩm số, đầy đủ và có cấu trúc như 1 landing page bán hàng thật: hook, vấn đề (đặt tên riêng từng vấn đề), kết quả đạt được, lộ trình/chương trình, lời nhắn cá nhân từ người bán, về người bán, phù hợp với ai, FAQ, CTA.',
  input_schema: {
    type: 'object',
    properties: {
      hook: {
        type: 'string',
        description: '1 câu tiêu đề chính, chạm đúng nỗi đau/mong muốn của đối tượng — KHÔNG lặp lại tên sản phẩm. Ưu tiên cấu trúc "không phải X mà là Y" (nêu bật khác biệt) nếu hợp lý, để khiến người đọc thấy ngay đây khác những thứ họ đã biết.',
      },
      van_de_intro: {
        type: 'string',
        description: '2-3 câu mở đầu, gợi đúng cảm giác/hoàn cảnh người đọc đang gặp — dẫn vào phần liệt kê vấn đề chi tiết bên dưới, không lặp lại nội dung của các vấn đề đó.',
      },
      van_de_chi_tiet: {
        type: 'array',
        minItems: 3,
        maxItems: 5,
        items: {
          type: 'object',
          properties: {
            ten: { type: 'string', description: 'Tên NGẮN, DỄ NHỚ cho 1 vấn đề/pattern cụ thể (như đặt tên 1 "hội chứng" hay thói quen xấu) — không phải câu mô tả dài.' },
            mo_ta: { type: 'string', description: '1-2 câu giải thích vấn đề này cụ thể là gì, đủ chi tiết để người đọc thấy "đúng là mình".' },
          },
          required: ['ten', 'mo_ta'],
        },
        description: 'Chia vấn đề chung thành 3-5 vấn đề CON cụ thể, MỖI VẤN ĐỀ CÓ TÊN RIÊNG dễ nhớ — không viết 1 đoạn văn dài chung, phải tách rõ từng ý kèm tên.',
      },
      ket_qua_dat_duoc: {
        type: 'array',
        items: { type: 'string' },
        minItems: 3,
        maxItems: 6,
        description: 'Kết quả/năng lực CỤ THỂ đạt được sau khi dùng sản phẩm — viết theo hướng "bạn sẽ làm được gì/thay đổi gì", mỗi ý 1 câu ngắn, tránh chung chung kiểu "học được nhiều điều".',
      },
      chuong_trinh: {
        type: 'array',
        minItems: 2,
        maxItems: 8,
        items: {
          type: 'object',
          properties: {
            ten: { type: 'string', description: 'Tên phần/chặng (VD "Phần 1", "Tuần 1", hoặc tên chủ đề riêng của phần đó) — ngắn.' },
            mo_ta: { type: 'string', description: '1-2 câu mô tả phần này làm gì/đạt được gì — BÁM SÁT mô tả sản phẩm đã có, không bịa thêm nội dung không tồn tại.' },
          },
          required: ['ten', 'mo_ta'],
        },
        description: 'Chia nội dung/cấu trúc sản phẩm thành các phần/chặng cụ thể (dựa theo mô tả đã có) — thay cho 1 đoạn giới thiệu chung, giúp người đọc thấy rõ lộ trình cụ thể sẽ nhận được.',
      },
      loi_nhan_nguoi_ban: {
        type: 'string',
        description: 'Lời nhắn TRỰC TIẾP từ người bán tới người đọc, giọng cá nhân/tâm sự (xưng "tôi"/tên người bán nếu có, gọi người đọc là "bạn") — 3-5 câu, khác đoạn "về người bán" (đoạn đó là tiểu sử, đoạn này là 1 lời nhắn/cam kết ngắn). KHÔNG bịa số liệu/thành tích.',
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
    required: ['hook', 'van_de_intro', 'van_de_chi_tiet', 'ket_qua_dat_duoc', 'chuong_trinh', 'loi_nhan_nguoi_ban', 've_nguoi_ban', 'phu_hop_voi_ai', 'faq', 'cta_text'],
  },
};

module.exports = { TOOL_LANDING_PAGE };
