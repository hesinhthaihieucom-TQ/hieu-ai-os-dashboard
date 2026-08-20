// LƯU Ý: không mô tả ký tự xuống dòng bằng chữ "\n" trong text này — model hay hiểu nhầm và in ra
// đúng 4 ký tự \,n,\,n theo nghĩa đen thay vì xuống dòng thật. Mô tả bằng lời thường để tránh lỗi đó.
const XUONG_DONG = ' (TỐI ĐA 2-3 ý cốt lõi — không hơn; mỗi ý viết 1 câu NGẮN rồi xuống dòng thật sang ý tiếp theo, giống như đang gõ Enter — KHÔNG dồn nhiều ý thành 1 khối văn dài dính liền nhau, KHÔNG viết thêm ví dụ/diễn giải phụ ngoài đúng ý chính; bọc 1-2 cụm từ khoá quan trọng nhất trong dấu **...**. Người đọc lướt trên điện thoại, càng ngắn gọn càng tốt.).';

const TOOL_LUOT1 = {
  name: 'xuat_dinh_vi_luot_1',
  description: 'Xuất kết quả Định Vị Cốt Lõi (Lượt 1) dựa trên dữ liệu người dùng.',
  input_schema: {
    type: 'object',
    properties: {
      tong_quan_thuong_hieu: { type: 'string', description: 'Là ai, nền tảng đang có, nên xây hình ảnh hướng nào.' + XUONG_DONG },
      ho_so_chuyen_mon: { type: 'string', description: 'Công việc / kinh nghiệm / năng lực chính / kết quả đã tạo ra / lĩnh vực nên chia sẻ lâu dài.' + XUONG_DONG },
      loi_the_canh_tranh: { type: 'string', description: 'Điểm khác biệt thật: câu chuyện, trải nghiệm, chuyên môn, tính cách, năng lượng — không bị lẫn với người khác trong ngành.' + XUONG_DONG },
      hinh_anh_nen_xay: { type: 'string', description: 'Nên được người xem nhớ là ai: chọn rõ 1-2 hình ảnh chủ đạo trong nhóm truyền cảm hứng / chuyên gia thực chiến / người chữa lành / dẫn đường / kết quả thật / chiều sâu / gần gũi đáng tin, và giải thích vì sao khớp dữ liệu.' + XUONG_DONG },
      ban_sac_triet_ly_thuong_hieu: {
        type: 'string',
        description: 'GỘP CHUNG bản sắc + triết lý thương hiệu thành 1 mục duy nhất, không tách 2 mục riêng (tránh lặp ý): vừa định vị trên các trục (mộc mạc hay sang / đời thường hay chuyên gia / mạnh hay nhẹ / thực tế hay cảm xúc / gần gũi hay cao cấp), vừa nêu rõ tin gì / không đồng tình gì / muốn thay đổi nhận thức nào cho người xem — viết liền mạch thành 1 bức tranh thống nhất, câu sau không lặp lại ý câu trước.' + XUONG_DONG,
      },
      giong_dieu_ngon_ngu: { type: 'string', description: 'Giọng viết/nói cụ thể: câu ngắn hay dài, storytelling hay phân tích, ví dụ đời thường hay thuật ngữ, mức độ quan điểm riêng.' + XUONG_DONG },
      khong_theo_duoi: { type: 'string', description: 'Chọn TỐI ĐA 2-3 điều quan trọng nhất mà nội dung kênh này KHÔNG nên làm (không sáo rỗng, không phóng đại, không bán lộ, không câu view bằng nỗi đau, không chạy trend lệch định vị...) — cụ thể hoá đúng theo bối cảnh người dùng, không cần liệt kê hết mọi loại.' + XUONG_DONG },
      ket_luan_dinh_vi: { type: 'string', description: 'CHỈ ĐÚNG 1 CÂU DUY NHẤT, tối đa 30 từ, dạng: "Nếu tóm gọn, kênh của bạn nên được định vị là…". Phần định vị nêu ra PHẢI là 1 ngách cụ thể (ví dụ "Tài chính gia đình", "Tâm linh tài chính", "Tài chính hôn nhân"...), không được chỉ nêu tên 1 ngành lớn chung chung như "Tài chính" hay "Tâm linh". TUYỆT ĐỐI KHÔNG thêm câu thứ 2, không thêm "phiên bản khác", không giải thích thêm, không xuống dòng — chỉ 1 câu duy nhất. Có thể bọc đúng 1 cụm từ ngách trong dấu **...** để nhấn mạnh, ví dụ: kênh nên định vị là **Tài chính gia đình**.' },
      dau_an_hinh_anh: {
        type: 'object',
        description: 'Dấu ấn hình ảnh thương hiệu cụ thể để quay/chụp ngay — CHỈ điền sub-field nào thật sự có căn cứ từ dữ liệu người dùng đã cung cấp (câu hỏi nhóm E). Sub-field nào KHÔNG đủ căn cứ, để chuỗi rỗng "" — TUYỆT ĐỐI không tự bịa nội dung chung chung cho có.',
        properties: {
          hanh_dong_dac_trung: { type: 'string', description: 'Hành động đặc trưng nên xuất hiện xuyên suốt — cái người này làm nhiều nhất mỗi ngày. Để trống nếu dữ liệu không đủ căn cứ.' },
          do_vat_prop: { type: 'string', description: 'Đồ vật/prop thương hiệu — thứ luôn có trong tay hoặc trong frame. Để trống nếu dữ liệu không đủ căn cứ.' },
          khong_gian_signature: { type: 'string', description: 'Không gian signature — góc quay quen thuộc, nhất quán. Để trống nếu dữ liệu không đủ căn cứ.' },
          phong_cach_xuat_hien: { type: 'string', description: 'Phong cách xuất hiện: màu sắc, trang phục, năng lượng hình ảnh. Để trống nếu dữ liệu không đủ căn cứ.' },
          goc_quay_pov: { type: 'string', description: 'Góc quay POV đặc trưng đề xuất: quay từ đâu, cầm gì, cảnh nền là gì — cụ thể. Để trống nếu dữ liệu không đủ căn cứ.' },
          canh_mo_dau: { type: 'array', items: { type: 'string' }, minItems: 0, maxItems: 3, description: 'Tối đa 3 cảnh mở đầu video signature — 3 giây đầu người xem nhận ra ngay là kênh này. Mảng rỗng nếu dữ liệu không đủ căn cứ để gợi ý cụ thể.' },
        },
        required: ['hanh_dong_dac_trung', 'do_vat_prop', 'khong_gian_signature', 'phong_cach_xuat_hien', 'goc_quay_pov', 'canh_mo_dau'],
      },
      cau_chuyen_ca_nhan: {
        type: 'object',
        description: 'Tổng hợp 1 câu chuyện/trải nghiệm cá nhân THẬT của người dùng, DỰA HOÀN TOÀN vào các câu trả lời họ đã cung cấp (đặc biệt câu hỏi về biến cố/hành trình, được hỏi/khen nhiều nhất, từng tự ti/bị chê) — không tự bịa chi tiết không có trong dữ liệu.',
        properties: {
          cau_chuyen: { type: 'string', description: 'Câu chuyện tổng hợp, viết liền mạch như đang kể chuyện thật, dùng đúng chi tiết người dùng đã cho.' + XUONG_DONG },
          qua_so_sai: { type: 'boolean', description: 'true nếu dữ liệu người dùng cung cấp về biến cố/trải nghiệm còn quá mỏng/chung chung để tổng hợp thành 1 câu chuyện cụ thể, có chi tiết thật.' },
          cau_hoi_lam_ro: {
            type: 'array', items: { type: 'string' }, minItems: 0, maxItems: 5,
            description: 'Đúng 5 câu hỏi giúp làm rõ câu chuyện nếu qua_so_sai=true (mỗi câu nhắm 1 chi tiết còn thiếu: mốc thời gian, con số, cảm xúc, người/sự kiện liên quan, kết quả), mảng rỗng nếu qua_so_sai=false.',
          },
        },
        required: ['cau_chuyen', 'qua_so_sai', 'cau_hoi_lam_ro'],
      },
    },
    required: ['tong_quan_thuong_hieu', 'ho_so_chuyen_mon', 'loi_the_canh_tranh', 'hinh_anh_nen_xay', 'ban_sac_triet_ly_thuong_hieu', 'giong_dieu_ngon_ngu', 'khong_theo_duoi', 'ket_luan_dinh_vi', 'dau_an_hinh_anh', 'cau_chuyen_ca_nhan'],
  },
};

const TOOL_LUOT2 = {
  name: 'xuat_dinh_vi_luot_2',
  description: 'Xuất Chiến Lược & Dòng Tiền (Lượt 2), dựa trên dữ liệu người dùng và kết quả Lượt 1 đã chốt.',
  input_schema: {
    type: 'object',
    properties: {
      chan_dung_khach_hang: { type: 'string', description: 'Là ai / độ tuổi / công việc / đang kẹt gì / có khả năng chi trả không / vì sao nên theo dõi kênh này.' + XUONG_DONG },
      noi_dau_rao_can: {
        type: 'object',
        description: '4 tầng nỗi đau & rào cản của khách hàng mục tiêu.',
        properties: {
          be_mat: { type: 'string', description: 'Vấn đề bề mặt khách hàng tự nhận ra.' },
          sau_ben_trong: { type: 'string', description: 'Vấn đề thật sâu hơn bên trong.' },
          noi_so: { type: 'string', description: 'Nỗi sợ ẩn sau vấn đề.' },
          rao_can_chua_hanh_dong: { type: 'string', description: 'Rào cản khiến họ chưa hành động.' },
        },
        required: ['be_mat', 'sau_ben_trong', 'noi_so', 'rao_can_chua_hanh_dong'],
      },
      khao_khat_muc_tieu: { type: 'string', description: 'Muốn kết quả gì / muốn trở thành ai / muốn được nhìn nhận thế nào / điều gì khiến họ sẵn sàng trả tiền.' + XUONG_DONG },
      insight_cot_loi: { type: 'string', description: 'Theo đúng khuôn: "Họ không chỉ muốn [bề mặt], thật sự muốn [sâu hơn], vì đang sợ [nỗi sợ], và sẽ tin người giúp họ [chuyển hoá cụ thể]."' },
      he_truc_noi_dung: {
        type: 'object',
        description: 'Hệ trục nội dung của kênh — BẮT BUỘC chỉ chọn ĐÚNG 1 trục chính duy nhất, không dàn trải. Đây là tiêu chí quan trọng nhất của cả bản định vị.',
        properties: {
          cong_thuc: { type: 'string', description: 'Theo khuôn: "Mình giúp [ai] từ [kẹt] sang [kết quả] qua [lợi thế]."' },
          truc_chinh: { type: 'string', description: 'Tên 1 trục nội dung chính DUY NHẤT — trục rõ nhất, quan trọng nhất, xuyên suốt toàn kênh. Không được ghép nhiều ý thành 1 trục mơ hồ. BẮT BUỘC là 1 ngách cụ thể kết hợp ngành lớn với góc riêng của người này (ví dụ "Tài chính gia đình", "Tâm linh tài chính", "Tài chính hôn nhân", "Sức khoẻ dân văn phòng"...) — TUYỆT ĐỐI không chỉ ghi tên ngành lớn chung chung như "Tài chính" hay "Tâm linh".' },
          tru_phu: {
            type: 'array',
            description: 'CHỈ 1 đến 2 trụ nội dung phụ (không quá 2), mỗi trụ ghi rõ vai trò (kéo reach / xây niềm tin / chuyển đổi / dẫn dòng tiền) và vì sao trụ đó bổ trợ cho trục chính.',
            minItems: 1,
            maxItems: 2,
            items: {
              type: 'object',
              properties: { ten: { type: 'string' }, vai_tro: { type: 'string' } },
              required: ['ten', 'vai_tro'],
            },
          },
        },
        required: ['cong_thuc', 'truc_chinh', 'tru_phu'],
      },
      dong_tien_phu_hop: {
        type: 'object',
        description: 'Đề xuất dòng tiền phù hợp — đề xuất thẳng, không để người dùng tự chọn.',
        properties: {
          uu_tien: { type: 'string', description: 'Thứ tự ưu tiên ngắn/trung/dài hạn + lý do.' },
          danh_sach: {
            type: 'array',
            items: {
              type: 'object',
              properties: { ten: { type: 'string' }, thoi_han: { type: 'string' }, ly_do: { type: 'string' } },
              required: ['ten', 'thoi_han', 'ly_do'],
            },
          },
        },
        required: ['uu_tien', 'danh_sach'],
      },
      lo_trinh_dan_ve_dong_tien: {
        type: 'array',
        description: 'Lộ trình 4-6 bước dẫn từ nội dung miễn phí đến dòng tiền (theo khuôn tinh thần: Nội dung → Niềm tin → Hội thoại → Tài nguyên miễn phí → Tư vấn/sự kiện → Sản phẩm), cụ thể hoá đúng theo dữ liệu người dùng — dùng để vẽ thành sơ đồ các bước nối tiếp nhau, mỗi bước phải NGẮN GỌN. BẮT BUỘC phải điền đủ, không được để mảng rỗng.',
        minItems: 4,
        maxItems: 6,
        items: {
          type: 'object',
          properties: {
            buoc: { type: 'string', description: 'Tên bước, tối đa 4-5 từ, ví dụ "Bài viết miễn phí".' },
            mo_ta: { type: 'string', description: '1 câu ngắn mô tả cụ thể bước này với đúng kênh của người dùng.' },
          },
          required: ['buoc', 'mo_ta'],
        },
      },
      can_sua_ngay: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 5, description: '3-5 việc cần sửa ngay: bio / ảnh / bài ghim / chủ đề / CTA / format / cách kể chuyện / cách dẫn dòng tiền.' },
    },
    // Bỏ script_gioi_thieu_30s (ít dùng, chỉ hợp khi livestream/gặp khách trực tiếp) và canh_bao
    // (trùng lặp với khong_theo_duoi đã có ở Lượt 1) — cho AI sinh nhanh/nhẹ hơn, theo yêu cầu chị
    // Quỳnh 2026-08-20. Không đụng các trường Viết Content còn phụ thuộc (xem post-schema.js).
    required: ['chan_dung_khach_hang', 'noi_dau_rao_can', 'khao_khat_muc_tieu', 'insight_cot_loi', 'he_truc_noi_dung', 'dong_tien_phu_hop', 'lo_trinh_dan_ve_dong_tien', 'can_sua_ngay'],
  },
};

module.exports = { TOOL_LUOT1, TOOL_LUOT2 };
