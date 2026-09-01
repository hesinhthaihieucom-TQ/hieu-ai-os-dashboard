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
            bai_tap: { type: 'string', description: '1 bài tập/checklist/template thực hành cuối phần, làm được ngay không cần giải thích thêm — gợi ý DẠNG checklist để tick hoặc câu hỏi có chỗ trống để người đọc tự điền bằng chữ của họ, không phải mô tả lý thuyết chung chung.' },
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
  description: 'Tổng hợp kiến thức nền cần thiết để viết 1 phần nội dung cụ thể — từ tri thức sẵn có của Claude, hoặc từ khối "THÔNG TIN TỪ WEB" nếu userContent có kèm (tìm kiếm thật, xem researchViaWebSearch() ở api/xay-dung-noi-dung.js).',
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
        description: 'Ví dụ/tình huống minh hoạ cho chủ đề này. NẾU có khối "THÔNG TIN TỪ WEB" kèm theo: ưu tiên dùng case study/câu chuyện thành công-thất bại THẬT có số liệu/nguồn cụ thể tìm được từ đó (không còn phải mơ hồ). NẾU KHÔNG có thông tin web: chỉ gợi HƯỚNG ví dụ, không bịa số liệu/tên riêng cụ thể giả làm như đã kiểm chứng.',
      },
      rao_can_tam_ly: {
        type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 4,
        description: 'Rào cản tâm lý phổ biến khiến người học dễ trì hoãn/bỏ cuộc với chủ đề này (VD "không có đủ thời gian", "đã từng thử mà thất bại") — mỗi mục nêu rõ rào cản + cách phần viết nên trả lời/trấn an ngay, không đợi người đọc tự vượt qua.',
      },
      // Cả 2 field dưới đây KHÔNG bắt buộc — chỉ điền khi userContent có kèm khối "THÔNG TIN TỪ WEB".
      // nguon_tham_khao để người dùng thấy được nguồn thật (minh bạch, giống NotebookLM cũ);
      // khoang_trong_thi_truong lấp đúng góc "nghiên cứu thị trường" trong quy trình cũ của Quỳnh
      // (sản phẩm/khoá học tương tự đang bán tốt, người mua khen/chê gì) — CHỈ điền khi có dữ liệu
      // tìm kiếm thật hỗ trợ, không suy đoán khi không có (tránh bịa số liệu "đang bán chạy").
      nguon_tham_khao: {
        type: 'array', items: { type: 'string' },
        description: 'CHỈ điền khi có dùng thông tin tìm được từ web trong ngữ liệu — mỗi mục 1 nguồn dạng "Tên trang — link". Bỏ trống/không điền nếu không có thông tin web nào được cung cấp.',
      },
      khoang_trong_thi_truong: {
        type: 'array', items: { type: 'string' },
        description: 'CHỈ điền khi có thông tin tìm được từ web về sản phẩm/khoá học/sách tương tự đang bán — mỗi mục 1 khoảng trống/thiếu sót mà nội dung phần này có thể lấp đầy (VD "các khoá học hiện có ít hướng dẫn thực hành, chỉ có lý thuyết"). Bỏ trống nếu không có dữ liệu thị trường thật, không suy đoán.',
      },
    },
    required: ['kien_thuc_nen', 'sai_lam_pho_bien', 'huong_vi_du', 'rao_can_tam_ly'],
  },
};

const TOOL_VIET = {
  name: 'xuat_noi_dung_phan',
  description: 'Viết nội dung đầy đủ cho 1 phần của sản phẩm số, dựa trên outline cấp 2 và kết quả nghiên cứu nền tảng.',
  input_schema: {
    type: 'object',
    properties: {
      noi_dung: {
        type: 'string',
        description: 'Nội dung ĐẦY ĐỦ, CHI TIẾT của phần này — đây là sản phẩm số người đọc TRẢ TIỀN mua, không phải bản tóm tắt sơ sài. Viết dài khoảng 500-800 từ (không tính ví dụ/bài tập), khai triển từng ý trong "nội dung con" thành đoạn văn đầy đủ có giải thích/lý do/cách làm cụ thể, không liệt kê gạch đầu dòng cụt lủn. Theo đúng giọng văn/đối tượng đã cho, có ví dụ thật, không viết chung chung.' + XUONG_DONG,
      },
      vi_du: { type: 'string', description: 'Ví dụ minh hoạ cụ thể được lồng vào nội dung (tách riêng để dễ kiểm tra ở bước review) — ưu tiên có số liệu/tình huống cụ thể (không phải mô tả trừu tượng).' },
      bai_tap: {
        type: 'string',
        description: 'Bài tập/checklist cuối phần, làm được ngay, không cần giải thích thêm — DẠNG checklist để tick hoặc câu hỏi có chỗ trống để người đọc tự viết ra câu trả lời của họ (không phải đoạn mô tả lý thuyết nên làm gì). PHẢI gắn với tình huống CỤ THỂ, thật, có thể xảy ra trong đời sống của đúng đối tượng đã cho (nhắc tới hoàn cảnh/con số/lựa chọn quen thuộc với họ) — không phải câu hỏi chung chung ai cũng viết được.',
      },
      tom_tat_3_y: {
        type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 3,
        description: 'Đúng 3 ý quan trọng nhất người đọc cần nhớ sau phần này — ngắn gọn (1 câu/ý), để hiện thành khối tóm tắt cuối phần, giúp người đọc không phải đọc lại cả phần để nắm ý chính.',
      },
    },
    required: ['noi_dung', 'vi_du', 'bai_tap', 'tom_tat_3_y'],
  },
};

const TOOL_TONG_DUYET = {
  name: 'xuat_danh_gia_tong_the',
  description: 'Đọc lại toàn bộ nội dung đã viết của sản phẩm số và đánh giá tính mạch lạc, trùng lặp giữa các phần, có đúng lời hứa outline không.',
  input_schema: {
    type: 'object',
    properties: {
      mach_lac: { type: 'boolean', description: 'true nếu các phần đọc liền mạch, có chuyển tiếp hợp lý giữa các phần.' },
      trung_lap: {
        type: 'array', items: { type: 'string' },
        description: 'Các ý bị lặp lại giữa nhiều phần — mỗi mục nêu rõ lặp ở đâu (tên phần) và nội dung gì. Mảng rỗng nếu không phát hiện trùng lặp.',
      },
      cho_thieu_lien_ket: {
        type: 'array', items: { type: 'string' },
        description: 'Các chỗ chuyển từ phần này sang phần khác bị cộc/đột ngột, cần thêm câu nối — mỗi mục nêu rõ giữa 2 phần nào. Mảng rỗng nếu mạch đã liền.',
      },
      giu_dung_loi_hua_outline: { type: 'boolean', description: 'true nếu nội dung đã viết đúng những gì outline cấp 2 đã hứa (kết quả cụ thể, nội dung con của từng phần).' },
      nhan_xet_tong_quan: { type: 'string', description: '2-4 câu tóm tắt đánh giá chung, nêu rõ ưu điểm và điều nên sửa nếu có.' },
    },
    required: ['mach_lac', 'trung_lap', 'cho_thieu_lien_ket', 'giu_dung_loi_hua_outline', 'nhan_xet_tong_quan'],
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

module.exports = { TOOL_OUTLINE2, TOOL_NGHIEN_CUU, TOOL_VIET, TOOL_REVIEW, TOOL_TONG_DUYET };
