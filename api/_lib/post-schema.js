// Schema + helper dùng chung cho mọi endpoint xuất ra 1 bài viết hoàn chỉnh
// (Viết Content viết mới, và Viết từ Kho Content giữ nguyên cấu trúc gốc) —
// giữ chung 1 shape để lưu vào bảng posts và hiển thị bằng đúng 1 UI.
//
// Tách CORE (hook/van_de/gia_tri/niem_tin/cta/cmt...) và EXTRAS (hashtag/gợi ý hình ảnh/dạng
// content/caption) thành 2 lượt gọi AI riêng thay vì 1 lượt gộp hết — CORE là thứ người dùng cần
// đọc/dùng ngay, hiển thị xong ngay khi có; EXTRAS là gợi ý bổ sung, chạy tiếp ngầm ở bước sau
// (giống cách Định Vị tách Lượt 1 hiện ngay, Lượt 2 chạy ngầm) — vừa thấy kết quả nhanh hơn hẳn,
// vừa không bắt người dùng chờ đủ mọi thứ mới thấy được bài viết.
const { FORMAT_NAMES } = require('./formats');

const TOOL_POST_CORE = {
  name: 'xuat_bai_viet_core',
  description: 'Xuất nội dung chính của 1 bài viết — chưa gồm hashtag/gợi ý hình ảnh/dạng content/caption (sẽ hỏi riêng ở bước sau).',
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
      cau_cmt_ghim: { type: 'string', description: 'Câu bình luận ghim — đánh thẳng vào nỗi đau/nỗi sợ/mong muốn của người đọc để kích hoạt hành động, không phải chỉ nhắc lại CTA cho có (xem QUY TẮC BÌNH LUẬN GHIM).' },
      cmt_cta_san_pham: {
        type: 'array', items: { type: 'string' }, minItems: 0, maxItems: 2,
        description: 'Câu bình luận CTA dẫn về sản phẩm/group cụ thể nếu người dùng có cung cấp; mảng rỗng nếu không có.',
      },
    },
    required: ['tieu_de','hook','van_de','gia_tri','niem_tin','cta','tu_khoa_cta','cau_cmt_ghim','cmt_cta_san_pham'],
  },
};

const TOOL_POST_EXTRAS = {
  name: 'xuat_goi_y_bo_sung',
  description: 'Xuất hashtag, gợi ý hình ảnh, dạng content phù hợp và caption gợi ý cho 1 bài viết đã viết xong.',
  input_schema: {
    type: 'object',
    properties: {
      hashtag: { type: 'array', items: { type: 'string' }, minItems: 5, maxItems: 5, description: 'Đúng 5 hashtag theo quy tắc hashtag đã nêu.' },
      goi_y_hinh_anh: { type: 'string', description: '1 ý tưởng hình ảnh/video minh hoạ cho bài này, khớp dấu ấn hình ảnh trong định vị.' },
      dinh_dang_de_xuat: {
        type: 'string',
        enum: FORMAT_NAMES,
        description: 'Chọn đúng 1 trong các dạng content phù hợp nhất với ngành và mục tiêu bài này.',
      },
      ly_do_dinh_dang: { type: 'string', description: 'Vì sao dạng content này phù hợp nhất cho bài này.' },
      goi_y_caption: {
        type: 'object',
        description: 'Caption dùng khi đăng dạng VIDEO — khác với tiêu đề ghi trên ảnh/thumbnail. LUÔN điền đầy đủ mục này, KỂ CẢ khi dinh_dang_de_xuat không phải dạng video — người dùng có thể tự chọn quay video (vd Video Ngồi Nói) dù không phải dạng AI đề xuất, nên không được để trống chỉ vì lý do đó.',
        properties: {
          giu_nguyen_tieu_de: { type: 'boolean', description: 'true nếu nên dùng ĐÚNG tiêu đề ghi trên thumbnail làm caption luôn (tiêu đề đã đủ mạnh để đứng riêng); false nếu nên viết 1 caption khác đi, hiệu quả hơn.' },
          caption_chinh: { type: 'string', minLength: 1, description: 'Caption chính đề xuất — trùng tiêu đề nếu giu_nguyen_tieu_de=true, hoặc bản viết riêng nếu false. BẮT BUỘC có nội dung, tuyệt đối không được là chuỗi rỗng.' },
          theo_nen_tang: {
            type: 'array', minItems: 0, maxItems: 3,
            items: {
              type: 'object',
              properties: { nen_tang: { type: 'string', enum: ['TikTok', 'YouTube', 'Zalo'] }, caption: { type: 'string' } },
              required: ['nen_tang', 'caption'],
            },
            description: 'CHỈ liệt kê nền tảng nào thực sự nên dùng caption/hook khác đáng kể so với caption_chinh (TikTok: ngắn gọn, bắt trend, ít hashtag; YouTube: có thể dài hơn, chèn từ khoá SEO; Zalo: giọng gần gũi cá nhân hơn) — bỏ qua nền tảng nào dùng chung caption_chinh là đủ, không liệt kê cho có.',
          },
        },
        required: ['giu_nguyen_tieu_de', 'caption_chinh', 'theo_nen_tang'],
      },
    },
    required: ['hashtag','goi_y_hinh_anh','dinh_dang_de_xuat','ly_do_dinh_dang','goi_y_caption'],
  },
};

// Trước đây bắt AI viết riêng "bai_hoan_chinh" (toàn bài ghép liền mạch) NGOÀI 5 đoạn hook/van_de/
// gia_tri/niem_tin/cta đã có — tức là AI phải viết lại gần như đúng nội dung đó lần thứ 2, tốn thêm
// rất nhiều token sinh ra (gần gấp đôi độ dài bài) mà không thêm giá trị, khiến mỗi lần viết chậm hẳn.
// Ghép lại bằng code thay vì bắt AI sinh riêng — nhanh hơn nhiều, nội dung y hệt vì các đoạn vốn đã
// được viết liền mạch để đọc nối tiếp nhau.
function assemblePost({ hook, van_de, gia_tri, niem_tin, cta }) {
  return [hook, van_de, gia_tri, niem_tin, cta].filter(p => p && p.trim()).join('\n\n');
}

function stripDiacritics(str) {
  return (str || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9]/g, '');
}

const CTA_COMMENT_RULES = `QUY TẮC CTA (BẮT BUỘC):
- CTA luôn phải chốt bằng 1 từ khoá kích hoạt cụ thể gồm ĐÚNG 2 CHỮ (ví dụ: "Dòng tiền", "Sổ tay", "Bí kíp", "Bắt đầu"...), theo mẫu: "Để lại bình luận chữ '<từ khoá 2 chữ>' và mình sẽ gửi bạn <thứ nhận được cụ thể>." — không dùng CTA chung chung kiểu "inbox mình nhé" hay "để lại bình luận bên dưới" mà không có từ khoá.
- Từ khoá phải khớp chủ đề bài và thứ người đọc sẽ nhận được (tài liệu, link, ưu đãi, tư vấn...).

QUY TẮC BÌNH LUẬN GHIM (BẮT BUỘC MẠNH TAY — đây là cú hích cuối cùng, không phải nhắc lại CTA cho có):
- Bình luận ghim (cau_cmt_ghim) phải đánh THẲNG vào đúng nỗi đau/nỗi sợ/mong muốn đã nêu ở đoạn vấn đề (van_de) của bài — không viết chung chung, phải khiến người đang lưỡng lự cảm thấy "nói đúng tim đen mình" thì mới bấm bình luận. Chọn 1 trong các hướng sau, tuỳ hợp bài:
  • Xoáy vào cái giá phải trả nếu CỨ ĐỂ NGUYÊN tình trạng hiện tại, không hành động gì.
  • Gọi đúng tên nỗi ngại/lý do trì hoãn phổ biến nhất của người đọc, rồi trấn an bằng đúng 1 câu ngắn gọn.
  • Tạo cảm giác cấp bách thật (vì sao nên làm ngay lúc đọc bài này, không phải "để đó tính sau").
- Vẫn phải nhắc đúng từ khoá CTA để người đọc biết gõ gì, nhưng viết như 1 câu tác giả buột miệng nói thêm — có cảm xúc thật, KHÔNG được viết kiểu thông báo hành chính ("Bình luận '...' để nhận ngay...").

QUY TẮC CMT CTA SẢN PHẨM/GROUP:
- Nếu người dùng có cung cấp tên sản phẩm/dịch vụ và/hoặc tên group/cộng đồng, viết thêm 1-2 câu bình luận CTA (cmt_cta_san_pham) dẫn khéo về đúng sản phẩm hoặc group đó, giọng chia sẻ tự nhiên, không quảng cáo lộ liễu.
- Nếu người dùng KHÔNG cung cấp sản phẩm/group nào, trả về mảng rỗng cho cmt_cta_san_pham — không tự bịa ra sản phẩm/group.`;

const HASHTAG_CAPTION_RULES = `QUY TẮC CAPTION VIDEO (goi_y_caption):
- LUÔN điền đầy đủ goi_y_caption cho MỌI bài, bất kể dinh_dang_de_xuat AI chọn là gì — người dùng có thể tự quyết định quay video (vd Video Ngồi Nói) dù đó không phải dạng AI đề xuất là phù hợp nhất, nên không được bỏ trống vì lý do "bài này hợp ảnh tĩnh hơn".
- Tự quyết định giu_nguyen_tieu_de: true nếu tiêu đề trên thumbnail đã đủ mạnh để dùng luôn làm caption; false nếu nên viết 1 caption riêng, khác đi, hiệu quả hơn khi đứng dưới video.
- Chỉ thêm biến thể theo_nen_tang cho nền tảng thực sự nên viết khác caption_chinh đáng kể — không liệt kê cho đủ 3 nền tảng nếu không cần thiết. Khi có thêm, PHẢI viết đúng đặc thù thuật toán/hành vi người dùng từng nền tảng, không chỉ đổi giọng văn qua loa:
  • TikTok: caption NGẮN (dưới ~150 ký tự, phần dài bị ẩn), câu đầu phải giữ được sự tò mò vì đây là phần luôn hiện — không lặp lại y hệt hook trên video; có thể chèn 1 câu hỏi cuối để kích thích bình luận (thuật toán ưu tiên watch time + tương tác bình luận/chia sẻ); 3-5 hashtag ngắn (trộn hashtag ngách + hashtag rộng đang thịnh hành), viết liền không dấu.
  • YouTube: caption/mô tả dùng cho SEO nên có thể dài hơn hẳn — 2-3 câu ĐẦU phải chứa đúng từ khoá chính người xem hay tìm (vì đây là phần hiện trong kết quả tìm kiếm/preview), sau đó có thể mô tả thêm chi tiết/bối cảnh; hashtag đặt cuối cùng, tối đa 3-5 (YouTube chỉ hiện 3 hashtag đầu phía trên tiêu đề nên đặt hashtag quan trọng nhất lên đầu).
  • Zalo: giọng gần gũi, cá nhân, như đang nhắn tin chia sẻ với người quen chứ không phải đăng bài quảng cáo; ngắn gọn, hầu như KHÔNG dùng hashtag (Zalo không dùng hashtag để gợi ý khám phá nội dung như TikTok/YouTube); nên có 1 CTA rõ ràng dẫn về Zalo OA/nhóm nếu phù hợp.

QUY TẮC HASHTAG (BẮT BUỘC):
- Xuất ĐÚNG 5 hashtag, không hơn không kém.
- TẤT CẢ hashtag phải viết KHÔNG DẤU (bỏ hết dấu thanh và dấu chữ tiếng Việt, ví dụ "Tài Chính" → "TaiChinh"), viết liền không có khoảng trắng, không ký tự đặc biệt.
- Nếu người dùng có cung cấp tên kênh Facebook/TikTok, 1 trong 5 hashtag PHẢI là tên kênh đó (không dấu, viết liền).
- Nếu người dùng có cung cấp tên thương hiệu/sản phẩm cố định (khác tên kênh), thêm 1 hashtag riêng cho tên đó (không dấu, viết liền).
- Các hashtag còn lại bám sát chủ đề bài + trục nội dung định vị.
- Nếu không có tên kênh/thương hiệu nào được cung cấp, tự suy ra 1 hashtag đại diện thương hiệu từ bản sắc thương hiệu trong định vị.`;

// Chỉ gửi phần luot2 THỰC SỰ cần cho việc viết văn phong 1 bài — bỏ các phần chiến lược kinh
// doanh/dòng tiền (dong_tien_phu_hop, lo_trinh_dan_ve_dong_tien, script_gioi_thieu_30s, can_sua_ngay,
// canh_bao) không ảnh hưởng câu chữ của bài, giảm bớt dung lượng input gửi AI mỗi lần viết bài —
// dùng chung cho viet-content.js/viet-tu-kho-goc.js/viet-content-extras.js thay vì gửi cả luot2.
function trimLuot2ForWriting(luot2) {
  if (!luot2) return null;
  const { chan_dung_khach_hang, noi_dau_rao_can, khao_khat_muc_tieu, insight_cot_loi, he_truc_noi_dung } = luot2;
  return { chan_dung_khach_hang, noi_dau_rao_can, khao_khat_muc_tieu, insight_cot_loi, he_truc_noi_dung };
}

function contextBlockOf(positioning, quick_context) {
  if (positioning && positioning.luot1) {
    const trimmedLuot2 = trimLuot2ForWriting(positioning.luot2);
    return `ĐỊNH VỊ THƯƠNG HIỆU ĐÃ CHỐT:\n${JSON.stringify(positioning.luot1, null, 2)}\n${trimmedLuot2 ? JSON.stringify(trimmedLuot2, null, 2) : ''}`;
  }
  if (quick_context && quick_context.trim()) return `BỐI CẢNH NHANH (chưa làm Định Vị đầy đủ): ${quick_context.trim()}`;
  return 'BỐI CẢNH: (không có)';
}

function extraFieldsBlock({ channel_handle, brand_name, product_name, group_name }) {
  return `TÊN KÊNH FACEBOOK/TIKTOK: ${channel_handle && channel_handle.trim() ? channel_handle.trim() : '(không cung cấp — tự suy ra hashtag thương hiệu từ định vị)'}
TÊN THƯƠNG HIỆU/SẢN PHẨM CỐ ĐỊNH (khác tên kênh, nếu có): ${brand_name && brand_name.trim() ? brand_name.trim() : '(không có)'}
SẢN PHẨM/DỊCH VỤ MUỐN NHẮC TRONG BÀI NÀY: ${product_name && product_name.trim() ? product_name.trim() : '(không có)'}
GROUP/CỘNG ĐỒNG MUỐN NHẮC: ${group_name && group_name.trim() ? group_name.trim() : '(không có)'}`;
}

// Yêu cầu tự do riêng cho 1 bài cụ thể (vd "viết ngắn hơn", "giọng hài hước", "nhấn số liệu") — KHÁC
// với Định Vị (áp dụng cho MỌI bài) và câu chuyện riêng (chỉ dùng khi viết từ Kho Content). Ưu tiên
// tuân theo nhưng không được phá vỡ khung 5 phần/quy tắc CTA bắt buộc đã nêu ở trên.
function customInstructionsBlock(custom_instructions) {
  if (!custom_instructions || !custom_instructions.trim()) return '';
  return `\nYÊU CẦU RIÊNG CHO BÀI NÀY (ưu tiên tuân theo, miễn không phá vỡ các nguyên tắc bắt buộc đã nêu ở trên): ${custom_instructions.trim()}\n`;
}

module.exports = { TOOL_POST_CORE, TOOL_POST_EXTRAS, assemblePost, stripDiacritics, CTA_COMMENT_RULES, HASHTAG_CAPTION_RULES, extraFieldsBlock, contextBlockOf, customInstructionsBlock };
