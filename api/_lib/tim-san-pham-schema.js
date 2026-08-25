// LƯU Ý: không mô tả ký tự xuống dòng bằng chữ "\n" trong text — model hay hiểu nhầm và in ra đúng
// 4 ký tự \,n,\,n theo nghĩa đen thay vì xuống dòng thật (xem cùng lưu ý ở positioning-schema.js).

const TOOL_TIM_SAN_PHAM = {
  name: 'xuat_ket_qua_tim_san_pham',
  description: 'Đánh giá 12 câu trả lời và đề xuất 2-3 phương án sản phẩm số phù hợp, hoặc cảnh báo nếu dữ liệu chưa đủ chắc để chốt.',
  input_schema: {
    type: 'object',
    properties: {
      du_lieu_du_manh: {
        type: 'boolean',
        description: 'false CHỈ KHI hầu hết câu trả lời đều mơ hồ/thiếu tín hiệu THẬT trên CẢ 3 mặt: không có kênh/audience nào, không có bằng chứng thị trường/cạnh tranh nào, không có bằng chứng sẵn sàng trả tiền nào. Việc CHƯA có tài liệu/kinh nghiệm đã làm sẵn KHÔNG tính là thiếu tín hiệu — chỉ đánh giá thiếu khi người dùng thực sự không có điểm tựa nào để bắt đầu.',
      },
      canh_bao: {
        type: 'string',
        description: 'BẮT BUỘC có nội dung cụ thể (không sáo rỗng) nếu du_lieu_du_manh=false — chỉ rõ ĐÚNG phần nào còn yếu (kênh/audience, bằng chứng thị trường, hay bằng chứng trả tiền) và gợi ý 1 hành động cụ thể nên làm trước khi chốt (vd "hỏi thử 3 người quen trong nhóm X xem có ai từng trả tiền cho thứ tương tự chưa"). Chuỗi rỗng "" nếu du_lieu_du_manh=true.',
      },
      phuong_an: {
        type: 'array',
        minItems: 0,
        maxItems: 3,
        description: 'Mảng RỖNG nếu du_lieu_du_manh=false (không ép ra sản phẩm khi dữ liệu quá yếu). Nếu true, đúng 2-3 phương án khác nhau thật sự (khác định dạng hoặc khác góc tiếp cận, không phải 3 biến thể của cùng 1 ý).',
        items: {
          type: 'object',
          properties: {
            ten_san_pham: {
              type: 'string',
              description: 'Tên sản phẩm cụ thể, tối đa 5-6 từ, hiểu ngay trong 2 giây, đúng đủ 5 tiêu chí: có số/mốc thời gian nếu hợp công thức, có động từ mạnh nếu hợp công thức, hiểu ngay, không trùng brand đã phổ biến, độ dài tối đa 5-6 từ.',
            },
            cong_thuc_dat_ten: {
              type: 'string',
              enum: ['So + Thoi gian + Dong tu chuyen hoa', 'So + Danh tu cu the + Muc tieu', 'An du + Chu de', 'Doi tuong cu the + Loi hua'],
              description: 'Công thức đã dùng để đặt tên — chọn đúng công thức hợp với định dạng: workbook/mini-course theo ngày dùng "So + Thoi gian + Dong tu chuyen hoa"; template/prompt-pack dùng "So + Danh tu cu the + Muc tieu"; sản phẩm cần cảm giác sang/chiều sâu dùng "An du + Chu de"; sản phẩm nhắm đúng 1 nhóm rất cụ thể dùng "Doi tuong cu the + Loi hua".',
            },
            doi_tuong: { type: 'string', description: 'Đối tượng CỤ THỂ (tuổi/hoàn cảnh/giới tính nếu có) lấy trực tiếp từ câu trả lời "đối tượng cụ thể" — TUYỆT ĐỐI không viết "mọi người" hay chung chung.' },
            dinh_dang: {
              type: 'string',
              enum: ['ebook', 'checklist_workbook', 'template_file_mau', 'mini_course', 'coaching_1_1', 'cong_dong_tra_phi', 'webinar'],
              description: 'Định dạng phù hợp nhất: cần thực hành hàng ngày/có tiến trình → mini_course hoặc checklist_workbook; cần giải thích khái niệm/tư duy → ebook; cần công cụ tra cứu dùng lặp lại → template_file_mau; cần gặp trực tiếp → coaching_1_1/cong_dong_tra_phi/webinar.',
            },
            do_dai_uoc_luong: { type: 'string', description: 'Độ dài ước lượng cụ thể, vd "12-15 trang", "7 bài học ngắn", "1 file mẫu + hướng dẫn dùng".' },
            ly_do: {
              type: 'string',
              description: 'Lý do NGẮN GỌN (2-3 câu, xuống dòng thật giữa các ý, không viết thành 1 đoạn dài) nối trực tiếp phương án này với ĐÚNG câu trả lời thật của người dùng (trích ý, không bịa) — nêu rõ khớp với: điều họ giỏi/hay được hỏi, vấn đề thị trường thật, và có hào hứng làm không.',
            },
            outline_cap_1: {
              type: 'array',
              items: { type: 'string' },
              minItems: 4,
              maxItems: 7,
              description: '4-7 phần outline cấp 1, mỗi phần 1 dòng ngắn mô tả, đi theo trình tự vấn đề → giải pháp → hành động.',
            },
          },
          required: ['ten_san_pham', 'cong_thuc_dat_ten', 'doi_tuong', 'dinh_dang', 'do_dai_uoc_luong', 'ly_do', 'outline_cap_1'],
        },
      },
    },
    required: ['du_lieu_du_manh', 'canh_bao', 'phuong_an'],
  },
};

module.exports = { TOOL_TIM_SAN_PHAM };
