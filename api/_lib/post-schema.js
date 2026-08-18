// Schema + helper dùng chung cho mọi endpoint xuất ra 1 bài viết hoàn chỉnh
// (Viết Content viết mới, và Viết từ Kho Content giữ nguyên cấu trúc gốc) —
// giữ chung 1 shape để lưu vào bảng posts và hiển thị bằng đúng 1 UI.
const { FORMAT_NAMES } = require('./formats');

const TOOL_POST = {
  name: 'xuat_bai_viet',
  description: 'Xuất 1 bài viết hoàn chỉnh.',
  input_schema: {
    type: 'object',
    properties: {
      tieu_de: { type: 'string', description: 'Tiêu đề ngắn gọn cho bài, ưu tiên dạng số nếu hợp.' },
      hook: { type: 'string', description: 'Câu/đoạn hook mở đầu.' },
      van_de: { type: 'string', description: 'Đoạn gọi tên vấn đề người đọc đang gặp.' },
      gia_tri: { type: 'string', description: 'Đoạn giá trị: góc nhìn, cách làm, giải pháp cụ thể.' },
      niem_tin: { type: 'string', description: 'Đoạn chất liệu thật: câu chuyện, quan sát, case cụ thể.' },
      cta: { type: 'string', description: 'Câu CTA đầy đủ, chốt bằng đúng 1 từ khoá kích hoạt 2 chữ theo mẫu "Để lại bình luận chữ \'...\' và mình sẽ gửi bạn ...".' },
      tu_khoa_cta: { type: 'string', description: 'Đúng từ khoá 2 chữ dùng trong CTA (tách riêng để hiển thị nổi bật), ví dụ "Dòng tiền".' },
      cau_cmt_ghim: { type: 'string', description: 'Câu bình luận ghim nhắc lại từ khoá CTA, giọng tự nhiên.' },
      cmt_cta_san_pham: {
        type: 'array', items: { type: 'string' }, minItems: 0, maxItems: 2,
        description: 'Câu bình luận CTA dẫn về sản phẩm/group cụ thể nếu người dùng có cung cấp; mảng rỗng nếu không có.',
      },
      bai_hoan_chinh: { type: 'string', description: 'Toàn bộ bài viết ghép liền mạch, sẵn sàng copy đăng ngay.' },
      hashtag: { type: 'array', items: { type: 'string' }, minItems: 5, maxItems: 5, description: 'Đúng 5 hashtag theo quy tắc hashtag đã nêu.' },
      goi_y_hinh_anh: { type: 'string', description: '1 ý tưởng hình ảnh/video minh hoạ cho bài này, khớp dấu ấn hình ảnh trong định vị.' },
      dinh_dang_de_xuat: {
        type: 'string',
        enum: FORMAT_NAMES,
        description: 'Chọn đúng 1 trong các dạng content phù hợp nhất với ngành và mục tiêu bài này.',
      },
      ly_do_dinh_dang: { type: 'string', description: 'Vì sao dạng content này phù hợp nhất cho bài này.' },
    },
    required: ['tieu_de','hook','van_de','gia_tri','niem_tin','cta','tu_khoa_cta','cau_cmt_ghim','cmt_cta_san_pham','bai_hoan_chinh','hashtag','goi_y_hinh_anh','dinh_dang_de_xuat','ly_do_dinh_dang'],
  },
};

function stripDiacritics(str) {
  return (str || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9]/g, '');
}

const CTA_HASHTAG_RULES = `QUY TẮC CTA (BẮT BUỘC):
- CTA luôn phải chốt bằng 1 từ khoá kích hoạt cụ thể gồm ĐÚNG 2 CHỮ (ví dụ: "Dòng tiền", "Sổ tay", "Bí kíp", "Bắt đầu"...), theo mẫu: "Để lại bình luận chữ '<từ khoá 2 chữ>' và mình sẽ gửi bạn <thứ nhận được cụ thể>." — không dùng CTA chung chung kiểu "inbox mình nhé" hay "để lại bình luận bên dưới" mà không có từ khoá.
- Từ khoá phải khớp chủ đề bài và thứ người đọc sẽ nhận được (tài liệu, link, ưu đãi, tư vấn...).

QUY TẮC BÌNH LUẬN GHIM:
- Luôn viết 1 câu bình luận ghim (cau_cmt_ghim) — câu tác giả tự để lại ngay dưới bài, nhắc lại đúng từ khoá CTA để tăng khả năng người đọc làm theo, giọng tự nhiên như đang nói với người đọc chứ không phải thông báo cứng nhắc.

QUY TẮC CMT CTA SẢN PHẨM/GROUP:
- Nếu người dùng có cung cấp tên sản phẩm/dịch vụ và/hoặc tên group/cộng đồng, viết thêm 1-2 câu bình luận CTA (cmt_cta_san_pham) dẫn khéo về đúng sản phẩm hoặc group đó, giọng chia sẻ tự nhiên, không quảng cáo lộ liễu.
- Nếu người dùng KHÔNG cung cấp sản phẩm/group nào, trả về mảng rỗng cho cmt_cta_san_pham — không tự bịa ra sản phẩm/group.

QUY TẮC HASHTAG (BẮT BUỘC):
- Xuất ĐÚNG 5 hashtag, không hơn không kém.
- TẤT CẢ hashtag phải viết KHÔNG DẤU (bỏ hết dấu thanh và dấu chữ tiếng Việt, ví dụ "Tài Chính" → "TaiChinh"), viết liền không có khoảng trắng, không ký tự đặc biệt.
- Nếu người dùng có cung cấp tên kênh Facebook/TikTok, 1 trong 5 hashtag PHẢI là tên kênh đó (không dấu, viết liền).
- Nếu người dùng có cung cấp tên thương hiệu/sản phẩm cố định (khác tên kênh), thêm 1 hashtag riêng cho tên đó (không dấu, viết liền).
- Các hashtag còn lại bám sát chủ đề bài + trục nội dung định vị.
- Nếu không có tên kênh/thương hiệu nào được cung cấp, tự suy ra 1 hashtag đại diện thương hiệu từ bản sắc thương hiệu trong định vị.`;

function extraFieldsBlock({ channel_handle, brand_name, product_name, group_name }) {
  return `TÊN KÊNH FACEBOOK/TIKTOK: ${channel_handle && channel_handle.trim() ? channel_handle.trim() : '(không cung cấp — tự suy ra hashtag thương hiệu từ định vị)'}
TÊN THƯƠNG HIỆU/SẢN PHẨM CỐ ĐỊNH (khác tên kênh, nếu có): ${brand_name && brand_name.trim() ? brand_name.trim() : '(không có)'}
SẢN PHẨM/DỊCH VỤ MUỐN NHẮC TRONG BÀI NÀY: ${product_name && product_name.trim() ? product_name.trim() : '(không có)'}
GROUP/CỘNG ĐỒNG MUỐN NHẮC: ${group_name && group_name.trim() ? group_name.trim() : '(không có)'}`;
}

module.exports = { TOOL_POST, stripDiacritics, CTA_HASHTAG_RULES, extraFieldsBlock };
