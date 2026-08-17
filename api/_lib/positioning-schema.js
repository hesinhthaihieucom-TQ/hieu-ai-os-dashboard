const TOOL_LUOT1 = {
  name: 'xuat_dinh_vi_luot_1',
  description: 'Xuất kết quả Định Vị Cốt Lõi (Lượt 1) dựa trên dữ liệu người dùng.',
  input_schema: {
    type: 'object',
    properties: {
      tong_quan_thuong_hieu: { type: 'string', description: 'Là ai, nền tảng đang có, nên xây hình ảnh hướng nào. 3-5 câu cụ thể.' },
      ho_so_chuyen_mon: { type: 'string', description: 'Công việc / kinh nghiệm / năng lực chính / kết quả đã tạo ra / lĩnh vực nên chia sẻ lâu dài.' },
      loi_the_canh_tranh: { type: 'string', description: 'Điểm khác biệt thật: câu chuyện, trải nghiệm, chuyên môn, tính cách, năng lượng — không bị lẫn với người khác trong ngành.' },
      hinh_anh_nen_xay: { type: 'string', description: 'Nên được người xem nhớ là ai: chọn rõ 1-2 hình ảnh chủ đạo trong nhóm truyền cảm hứng / chuyên gia thực chiến / người chữa lành / dẫn đường / kết quả thật / chiều sâu / gần gũi đáng tin, và giải thích vì sao khớp dữ liệu.' },
      ban_sac_thuong_hieu: { type: 'string', description: 'Định vị trên các trục: mộc mạc hay sang / đời thường hay chuyên gia / mạnh hay nhẹ / thực tế hay cảm xúc / gần gũi hay cao cấp — chọn rõ vị trí trên từng trục, có lý do.' },
      giong_dieu_ngon_ngu: { type: 'string', description: 'Giọng viết/nói cụ thể: câu ngắn hay dài, storytelling hay phân tích, ví dụ đời thường hay thuật ngữ, mức độ quan điểm riêng.' },
      hook_mo_dau: {
        type: 'object',
        description: 'Kiểu hook phù hợp nhất với định vị này + 5 hook mẫu dùng được ngay.',
        properties: {
          kieu_hook: { type: 'string', description: 'Mô tả kiểu hook chủ đạo phù hợp (nỗi đau / sự thật ngược / cảnh báo / kết quả mong muốn / từ khoá kích hoạt chú ý) và lý do.' },
          vi_du: { type: 'array', items: { type: 'string' }, minItems: 5, maxItems: 5, description: 'Đúng 5 câu hook mẫu, mỗi câu 1-2 dòng, dùng ngay được cho kênh này.' },
        },
        required: ['kieu_hook', 'vi_du'],
      },
      triet_ly_thuong_hieu: { type: 'string', description: 'Tin gì / không đồng tình gì / bảo vệ khách hàng khỏi điều gì / muốn họ thay đổi nhận thức nào.' },
      khong_theo_duoi: { type: 'string', description: 'Liệt kê rõ những gì nội dung của kênh này KHÔNG nên làm: không sáo rỗng, không phóng đại, không bán lộ, không câu view bằng nỗi đau, không chạy trend lệch định vị — cụ thể hoá theo đúng bối cảnh người dùng.' },
      ket_luan_dinh_vi: { type: 'string', description: 'Một câu định vị sắc, dạng: "Nếu tóm gọn, kênh của bạn nên được định vị là…"' },
      dau_an_hinh_anh: {
        type: 'object',
        description: 'Dấu ấn hình ảnh thương hiệu cụ thể để quay/chụp ngay.',
        properties: {
          hanh_dong_dac_trung: { type: 'string', description: 'Hành động đặc trưng nên xuất hiện xuyên suốt — cái người này làm nhiều nhất mỗi ngày.' },
          do_vat_prop: { type: 'string', description: 'Đồ vật/prop thương hiệu — thứ luôn có trong tay hoặc trong frame.' },
          khong_gian_signature: { type: 'string', description: 'Không gian signature — góc quay quen thuộc, nhất quán.' },
          phong_cach_xuat_hien: { type: 'string', description: 'Phong cách xuất hiện: màu sắc, trang phục, năng lượng hình ảnh.' },
          goc_quay_pov: { type: 'string', description: 'Góc quay POV đặc trưng đề xuất: quay từ đâu, cầm gì, cảnh nền là gì — cụ thể.' },
          canh_mo_dau: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 3, description: 'Đúng 3 cảnh mở đầu video signature — 3 giây đầu người xem nhận ra ngay là kênh này.' },
        },
        required: ['hanh_dong_dac_trung', 'do_vat_prop', 'khong_gian_signature', 'phong_cach_xuat_hien', 'goc_quay_pov', 'canh_mo_dau'],
      },
    },
    required: ['tong_quan_thuong_hieu', 'ho_so_chuyen_mon', 'loi_the_canh_tranh', 'hinh_anh_nen_xay', 'ban_sac_thuong_hieu', 'giong_dieu_ngon_ngu', 'hook_mo_dau', 'triet_ly_thuong_hieu', 'khong_theo_duoi', 'ket_luan_dinh_vi', 'dau_an_hinh_anh'],
  },
};

const TOOL_LUOT2 = {
  name: 'xuat_dinh_vi_luot_2',
  description: 'Xuất Chiến Lược & Dòng Tiền (Lượt 2), dựa trên dữ liệu người dùng và kết quả Lượt 1 đã chốt.',
  input_schema: {
    type: 'object',
    properties: {
      chan_dung_khach_hang: { type: 'string', description: 'Là ai / độ tuổi / công việc / đang kẹt gì / có khả năng chi trả không / vì sao nên theo dõi kênh này.' },
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
      khao_khat_muc_tieu: { type: 'string', description: 'Muốn kết quả gì / muốn trở thành ai / muốn được nhìn nhận thế nào / điều gì khiến họ sẵn sàng trả tiền.' },
      insight_cot_loi: { type: 'string', description: 'Theo đúng khuôn: "Họ không chỉ muốn [bề mặt], thật sự muốn [sâu hơn], vì đang sợ [nỗi sợ], và sẽ tin người giúp họ [chuyển hoá cụ thể]."' },
      he_truc_noi_dung: {
        type: 'object',
        description: 'Hệ trục nội dung của kênh — BẮT BUỘC chỉ chọn ĐÚNG 1 trục chính duy nhất, không dàn trải. Đây là tiêu chí quan trọng nhất của cả bản định vị.',
        properties: {
          cong_thuc: { type: 'string', description: 'Theo khuôn: "Mình giúp [ai] từ [kẹt] sang [kết quả] qua [lợi thế]."' },
          truc_chinh: { type: 'string', description: 'Tên 1 trục nội dung chính DUY NHẤT — trục rõ nhất, quan trọng nhất, xuyên suốt toàn kênh. Không được ghép nhiều ý thành 1 trục mơ hồ.' },
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
      style_dang_noi_dung: {
        type: 'object',
        description: 'Style thể hiện và dạng nội dung phù hợp.',
        properties: {
          style: { type: 'string', description: 'Style/kiểu thể hiện phù hợp nhất (talking head / POV / B-roll+voiceover / storytelling...) + lý do.' },
          dang_chinh: { type: 'array', items: { type: 'string' }, description: '1-2 dạng nội dung chính.' },
          dang_phu: { type: 'array', items: { type: 'string' }, description: '2-3 dạng nội dung phụ.' },
          ty_le_format_7_ngay: { type: 'string', description: 'Tỷ lệ format đề xuất để test trong 7 ngày đầu.' },
        },
        required: ['style', 'dang_chinh', 'dang_phu', 'ty_le_format_7_ngay'],
      },
      chu_de_dau_tien: {
        type: 'array',
        description: 'Đúng 15 chủ đề bài đăng đầu tiên, chia theo nhóm: nhận diện / kể chuyện / giáo dục / nỗi đau / niềm tin / dẫn dòng tiền.',
        minItems: 15,
        maxItems: 15,
        items: {
          type: 'object',
          properties: { nhom: { type: 'string' }, ten: { type: 'string' } },
          required: ['nhom', 'ten'],
        },
      },
      ke_hoach_7_ngay: {
        type: 'array',
        description: 'Kế hoạch đăng bài 7 ngày đầu tiên, mỗi ngày 1 mục.',
        minItems: 7,
        maxItems: 7,
        items: {
          type: 'object',
          properties: {
            ngay: { type: 'string' },
            dang_gi: { type: 'string' },
            format: { type: 'string' },
            muc_tieu: { type: 'string' },
            hook: { type: 'string' },
            cta: { type: 'string' },
            chi_so_quan_sat: { type: 'string' },
          },
          required: ['ngay', 'dang_gi', 'format', 'muc_tieu', 'hook', 'cta', 'chi_so_quan_sat'],
        },
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
      lo_trinh_dan_ve_dong_tien: { type: 'string', description: 'Theo khuôn: Nội dung → Niềm tin → Hội thoại → Tài nguyên miễn phí → Tư vấn/sự kiện → Sản phẩm — cụ thể hoá theo dữ liệu người dùng.' },
      bio_3_phien_ban: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 3, description: '3 phiên bản bio, mỗi bản ≤100 ký tự: rõ chuyên môn / cảm xúc / định vị mạnh.' },
      script_gioi_thieu_30s: { type: 'string', description: 'Script tự giới thiệu 30 giây, dùng khi livestream, gặp khách, sự kiện.' },
      hook_ca_nhan: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 3, description: '2-3 phiên bản câu mở đầu đặc trưng cho bài đăng/video.' },
      can_sua_ngay: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 5, description: '3-5 việc cần sửa ngay: bio / ảnh / bài ghim / chủ đề / CTA / format / cách kể chuyện / cách dẫn dòng tiền.' },
      canh_bao: { type: 'array', items: { type: 'string' }, description: 'Nội dung không nên làm / không bán quá sớm / format không phù hợp / trend không nên chạy.' },
    },
    required: ['chan_dung_khach_hang', 'noi_dau_rao_can', 'khao_khat_muc_tieu', 'insight_cot_loi', 'he_truc_noi_dung', 'style_dang_noi_dung', 'chu_de_dau_tien', 'ke_hoach_7_ngay', 'dong_tien_phu_hop', 'lo_trinh_dan_ve_dong_tien', 'bio_3_phien_ban', 'script_gioi_thieu_30s', 'hook_ca_nhan', 'can_sua_ngay', 'canh_bao'],
  },
};

module.exports = { TOOL_LUOT1, TOOL_LUOT2 };
