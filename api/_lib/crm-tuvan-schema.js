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
          ten_khach_hang: { type: 'string' },
          kenh: { type: 'string', description: 'VD: Facebook, Zalo, Instagram, TikTok.' },
          link_lien_he: { type: 'string' },
          nhom_nhu_cau: { type: 'array', items: { type: 'string' } },
          nhu_cau_cu_the: { type: 'string' },
          van_de_noi_dau: { type: 'string' },
          giai_doan: { type: 'string' },
          do_nong: { type: 'string', enum: ['Nóng','Ấm','Lạnh'] },
          rao_can: { type: 'array', items: { type: 'string' } },
          giai_phap_phu_hop: { type: 'string', description: 'Tên gói/sản phẩm phù hợp + lý do khớp nhu cầu — CHỈ nêu nếu có đủ dữ liệu để khớp đúng, không bịa tên gói không chắc.' },
          hanh_dong_tiep_theo: { type: 'string' },
          gia_tri_du_kien: { type: 'string' },
          ket_qua: { type: 'string' },
          ghi_chu_ai: { type: 'string', description: 'Tóm tắt nỗi đau + tiến trình tư vấn tới thời điểm này, phục vụ đọc lại lần sau.' },
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
