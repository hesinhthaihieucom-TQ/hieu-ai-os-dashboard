// Schema ép Claude trả về (tool_choice) cho Trợ Lý AI Tư Vấn & CRM (tro-ly-crm/) — gộp 1 lần gọi cả
// phần tư vấn (đọc cho người vận hành) lẫn phần cần ghi vào CRM (crm_customers/crm_interactions),
// thay cho kiểu multi-tool-call (search→upsert→log tách rời) của GPT Actions cũ.
const TOOL_TU_VAN_CRM = {
  name: 'xuat_tu_van_crm',
  description: 'Xuất kết quả tư vấn cho người vận hành + dữ liệu cần ghi vào hồ sơ khách và nhật ký tương tác.',
  input_schema: {
    type: 'object',
    properties: {
      tom_tat: { type: 'string', description: 'Tóm tắt nhanh tình huống — tối đa 2-3 câu ngắn.' },
      nhanh: { type: 'string', enum: ['A','B','C','D'], description: 'A=Sức khỏe, B=Tâm linh/Tài chính/Phát triển bản thân, C=Nhân hiệu/Content/Kinh doanh online, D=Kinh doanh/Đối tác.' },
      buoc_hien_tai: { type: 'string', description: 'Đang ở bước/giai đoạn nào trong quy trình tư vấn của nhánh này.' },
      phan_tich: {
        type: 'object',
        properties: {
          noi_dau: { type: 'string', description: 'Nỗi đau/vấn đề cụ thể của khách.' },
          san_sang: { type: 'string', description: 'Mức độ sẵn sàng mua/hành động.' },
          giai_doan: { type: 'string', description: 'VD: Mới liên hệ, Đang tư vấn, Chăm sóc, Follow, Chốt, Đã mua/onboarding, Mất.' },
          do_nong: { type: 'string', enum: ['Nóng','Ấm','Lạnh'] },
        },
        required: ['noi_dau','san_sang','giai_doan','do_nong'],
      },
      cau_hoi_cau_chot: { type: 'string', description: 'Câu hỏi hoặc câu chốt người vận hành nên nhắn ngay cho khách — 1-2 câu, tự nhiên như đang nhắn tin thật, không giáo điều/không ép chốt cứng.' },
      khach_hang: {
        type: 'object',
        description: 'Toàn bộ field cần ghi/cập nhật vào hồ sơ khách — chỉ điền field có dữ liệu thật, để trống field chưa rõ (đừng bịa).',
        properties: {
          ten_khach_hang: { type: 'string', description: 'Đọc tên khách từ đầu đoạn chat (tên hiển thị trên Messenger/Zalo) hoặc từ nội dung/ghi chú. Nếu KHÔNG xác định được tên thật nào (ảnh không có tên, ghi chú không nhắc tên), ghi ĐÚNG NGUYÊN VĂN "CHƯA_RÕ_TEN" — hệ thống sẽ tự hỏi lại người vận hành, không tự bịa tên.' },
          leader_phu_trach: { type: 'string', description: 'Chỉ điền nếu HỒ SƠ KHÁCH ĐÃ CÓ đã có sẵn giá trị này hoặc chat nêu rõ — không tự bịa tên người khác.' },
          kenh: { type: 'string', description: 'VD: Facebook, Zalo, Instagram, TikTok.' },
          link_lien_he: { type: 'string' },
          nhom_nhu_cau: { type: 'array', items: { type: 'string' }, description: 'Chỉ liệt kê nhóm nhu cầu MỚI phát hiện/xác nhận rõ hơn trong đoạn chat đang đọc — hệ thống tự cộng dồn với mảng cũ (nếu có), không cần bạn tự chép lại các mục cũ.' },
          nhu_cau_cu_the: { type: 'string' },
          van_de_noi_dau: { type: 'string' },
          giai_doan: { type: 'string' },
          do_nong: { type: 'string', enum: ['Nóng','Ấm','Lạnh'] },
          rao_can: { type: 'array', items: { type: 'string' }, description: 'Chỉ liệt kê rào cản MỚI phát hiện/xác nhận rõ hơn trong đoạn chat đang đọc — hệ thống tự cộng dồn với mảng cũ (nếu có), không cần bạn tự chép lại các mục cũ.' },
          giai_phap_phu_hop: { type: 'string', description: 'Tên gói/sản phẩm phù hợp + lý do khớp nhu cầu — CHỈ nêu nếu có đủ dữ liệu để khớp đúng, không bịa tên gói không chắc.' },
          hanh_dong_tiep_theo: { type: 'string' },
          gia_tri_du_kien: { type: 'string' },
          ket_qua: { type: 'string' },
          ghi_chu_ai: { type: 'string', description: 'Tóm tắt nỗi đau + tiến trình tư vấn tới thời điểm này, phục vụ đọc lại lần sau.' },
          form_hd: {
            type: 'object',
            description: 'CHỈ xuất field này khi "nhanh" ở trên = "D" (Kinh doanh/Đối tác) — khung khai thác riêng F-O-R-M-H-D cho nhánh này. Nếu nhanh khác D thì BỎ QUA hoàn toàn, không xuất object này. Field nào chưa khai thác được từ chat/ảnh thì ghi ĐÚNG NGUYÊN VĂN "Chưa có" — TUYỆT ĐỐI không bịa/suy đoán. Nếu HỒ SƠ KHÁCH ĐÃ CÓ đã có form_hd với field nào khác "Chưa có" thì giữ nguyên giá trị đó (không ghi đè lại thành "Chưa có"), chỉ cập nhật field nào có tin mới.',
            properties: {
              gia_dinh: { type: 'string', description: 'F — Gia đình: tình trạng hôn nhân, con cái, người phụ thuộc.' },
              cong_viec: { type: 'string', description: 'O — Occupation: đang làm gì, thu nhập hiện tại, thời gian rảnh.' },
              so_thich_quan_he: { type: 'string', description: 'R — Sở thích/Quan hệ: sở thích cá nhân, mối quan hệ xã hội, mạng lưới.' },
              money: { type: 'string', description: 'M — Money: khả năng tài chính, mức đầu tư sẵn sàng bỏ ra.' },
              suc_khoe: { type: 'string', description: 'H — Sức khỏe: tình trạng hiện tại, có ảnh hưởng gì tới khả năng làm việc.' },
              mong_muon: { type: 'string', description: 'D — Desire: mục tiêu, ước mơ, điều họ đang tìm kiếm.' },
            },
          },
        },
        required: ['ten_khach_hang'],
      },
      tuong_tac: {
        type: 'object',
        description: 'Nội dung ghi vào nhật ký tương tác lần này.',
        properties: {
          ten_tuong_tac: { type: 'string', description: 'Ngắn gọn kiểu "[Tên khách] – [nội dung chính]".' },
          noi_dung: { type: 'string', description: 'Tóm tắt nội dung trao đổi lần này.' },
          thong_tin_moi: { type: 'string' },
          hanh_dong_da_thuc_hien: { type: 'string' },
          ket_qua: { type: 'string' },
          buoc_tiep_theo: { type: 'string' },
        },
        required: ['ten_tuong_tac','noi_dung','buoc_tiep_theo'],
      },
      ngay_follow_tiep: { type: 'string', description: 'Định dạng YYYY-MM-DD, tính theo đúng nhịp: Nóng +1-2 ngày, Ấm +3-5 ngày, Lạnh +7-14 ngày kể từ HÔM NAY được cho trong ngữ cảnh. Bỏ trống nếu giai đoạn là Chốt/Đã mua-onboarding/Mất.' },
    },
    required: ['tom_tat','nhanh','buoc_hien_tai','phan_tich','cau_hoi_cau_chot','khach_hang','tuong_tac'],
  },
};

module.exports = { TOOL_TU_VAN_CRM };
