const XUONG_DONG = ' (xuống dòng thật giữa các ý — không dồn thành 1 đoạn văn dài dính liền, không gõ ký tự "\\n" theo nghĩa đen).';

const TOOL_OUTLINE2 = {
  name: 'xuat_outline_cap_2',
  description: 'Mở rộng outline cấp 1 thành outline cấp 2 chi tiết, sẵn sàng để viết nội dung.',
  input_schema: {
    type: 'object',
    properties: {
      mo_dau: {
        type: 'object',
        description: 'Phần Mở đầu — tại sao sản phẩm này tồn tại, ai nên dùng, ai không nên dùng, cách dùng hiệu quả nhất.',
        properties: {
          tieu_de: { type: 'string' },
          ket_qua_cu_the: { type: 'string', description: '1 câu, đo được — người đọc hiểu rõ mình sắp nhận được gì.' },
          noi_dung_con: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 5 },
        },
        required: ['tieu_de', 'ket_qua_cu_the', 'noi_dung_con'],
      },
      phan: {
        type: 'array',
        description: 'Mở rộng ĐÚNG từng phần đã có trong outline cấp 1, theo ĐÚNG thứ tự gốc — không bớt, không thêm phần ngoài outline cấp 1 (Mở đầu/Kết xử lý riêng ở mo_dau/ket).',
        items: {
          type: 'object',
          properties: {
            tieu_de: { type: 'string' },
            ket_qua_cu_the: { type: 'string', description: '1 câu, đo được — người đọc đạt được gì cụ thể sau phần này.' },
            noi_dung_con: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 5, description: '3-5 nội dung con cần có trong phần này.' },
            bai_tap: { type: 'string', description: '1 bài tập/checklist/template thực hành cuối phần, làm được ngay không cần giải thích thêm.' },
            vi_du_goi_y: { type: 'string', description: 'Hướng ví dụ thật có thể dùng minh hoạ cho phần này — gợi hướng, KHÔNG bịa số liệu/tên riêng cụ thể giả làm như thật.' },
          },
          required: ['tieu_de', 'ket_qua_cu_the', 'noi_dung_con', 'bai_tap', 'vi_du_goi_y'],
        },
      },
      ket: {
        type: 'object',
        description: 'Phần Kết — tóm tắt hành trình, bước tiếp theo, lời nhắn từ tác giả.',
        properties: {
          tieu_de: { type: 'string' },
          ket_qua_cu_the: { type: 'string' },
          noi_dung_con: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 5 },
        },
        required: ['tieu_de', 'ket_qua_cu_the', 'noi_dung_con'],
      },
    },
    required: ['mo_dau', 'phan', 'ket'],
  },
};

const TOOL_NGHIEN_CUU = {
  name: 'xuat_nghien_cuu_nen_tang',
  description: 'Tổng hợp kiến thức nền cần thiết để viết 1 phần nội dung cụ thể, từ tri thức đã có (không tìm kiếm web trực tiếp).',
  input_schema: {
    type: 'object',
    properties: {
      kien_thuc_nen: {
        type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 8,
        description: 'Các điểm kiến thức nền quan trọng nhất, xếp từ cơ bản đến nâng cao — mỗi điểm ghi rõ khái niệm + tại sao quan trọng.',
      },
      sai_lam_pho_bien: {
        type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 5,
        description: 'Sai lầm phổ biến người mới hay mắc về chủ đề này — mỗi mục ghi: người ta thường làm gì sai, hậu quả, cách đúng.',
      },
      huong_vi_du: {
        type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 4,
        description: 'Hướng ví dụ/tình huống thật có thể dùng minh hoạ — gợi HƯỚNG, không bịa số liệu/tên riêng cụ thể giả làm như đã kiểm chứng.',
      },
    },
    required: ['kien_thuc_nen', 'sai_lam_pho_bien', 'huong_vi_du'],
  },
};

const TOOL_VIET = {
  name: 'xuat_noi_dung_phan',
  description: 'Viết nội dung đầy đủ cho 1 phần của sản phẩm số, dựa trên outline cấp 2 và kết quả nghiên cứu nền tảng.',
  input_schema: {
    type: 'object',
    properties: {
      noi_dung: { type: 'string', description: 'Nội dung đầy đủ của phần này, viết theo đúng giọng văn/đối tượng đã cho, có ví dụ thật, không viết chung chung.' + XUONG_DONG },
      vi_du: { type: 'string', description: 'Ví dụ minh hoạ cụ thể được lồng vào nội dung (tách riêng để dễ kiểm tra ở bước review).' },
      bai_tap: { type: 'string', description: 'Bài tập/checklist cuối phần, làm được ngay, không cần giải thích thêm.' },
    },
    required: ['noi_dung', 'vi_du', 'bai_tap'],
  },
};

const TOOL_REVIEW = {
  name: 'xuat_danh_gia_chat_luong',
  description: 'Chấm bản nháp theo 5 tiêu chí chất lượng, trả góp ý và bản đã chỉnh nếu cần.',
  input_schema: {
    type: 'object',
    properties: {
      checklist: {
        type: 'object',
        properties: {
          co_vi_du_that: { type: 'boolean' },
          co_bai_tap_lam_ngay: { type: 'boolean' },
          giong_van_tu_nhien: { type: 'boolean' },
          khong_chung_chung: { type: 'boolean' },
          biet_buoc_tiep_theo: { type: 'boolean' },
        },
        required: ['co_vi_du_that', 'co_bai_tap_lam_ngay', 'giong_van_tu_nhien', 'khong_chung_chung', 'biet_buoc_tiep_theo'],
      },
      gop_y: { type: 'string', description: 'Góp ý cụ thể cho từng tiêu chí KHÔNG đạt — chuỗi rỗng nếu tất cả tiêu chí đều đạt.' },
      ban_da_chinh: { type: 'string', description: 'Bản đã tự chỉnh sửa theo góp ý ở trên, dùng được ngay. Để nguyên bản gốc nếu tất cả tiêu chí đã đạt.' },
    },
    required: ['checklist', 'gop_y', 'ban_da_chinh'],
  },
};

module.exports = { TOOL_OUTLINE2, TOOL_NGHIEN_CUU, TOOL_VIET, TOOL_REVIEW };
