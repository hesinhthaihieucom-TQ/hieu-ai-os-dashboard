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
    },
    // cmt_cta_san_pham (bình luận CTA dẫn sản phẩm/group) đã chuyển sang TOOL_POST_EXTRAS — đây là
    // field DUY NHẤT ở CORE từng cần tên kênh/thương hiệu/sản phẩm/group, khiến bước "Viết bài" bị
    // chậm/dễ treo hẳn khi người dùng có chọn các mục đó ở "Tuỳ chọn thêm" (đúng lúc AI phải vừa viết
    // bài vừa suy nghĩ thêm câu CTA sản phẩm). CORE giờ không cần các trường đó nữa, luôn nhanh như
    // nhau bất kể có chọn thương hiệu/sản phẩm/group hay không.
    required: ['tieu_de','hook','van_de','gia_tri','niem_tin','cta','tu_khoa_cta','cau_cmt_ghim'],
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
      cmt_cta_san_pham: {
        type: 'array', items: { type: 'string' }, minItems: 0, maxItems: 2,
        description: 'Câu bình luận CTA dẫn về sản phẩm/group cụ thể nếu người dùng có cung cấp (xem QUY TẮC CMT CTA SẢN PHẨM/GROUP); mảng rỗng nếu không có.',
      },
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
    required: ['hashtag','goi_y_hinh_anh','cmt_cta_san_pham','dinh_dang_de_xuat','ly_do_dinh_dang','goi_y_caption'],
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

// Từ hướng dẫn content riêng của chị Quỳnh (2026-08-20) — danh sách cụm mở đầu/chuyển đoạn đặc
// trưng của AI, đọc vào là lộ ngay không phải người thật viết. Áp cho mọi endpoint VIẾT bài mới
// (không áp cho viet-tu-kho-goc.js phần giữ nguyên hook gốc — hook gốc giữ y hệt theo đúng thiết kế).
const ANTI_AI_CLICHE_RULES = `QUY TẮC TRÁNH GIỌNG "NGHE NHƯ AI" (BẮT BUỘC):
- TUYỆT ĐỐI KHÔNG mở đầu hoặc chuyển đoạn bằng các cụm kể chuyện sáo rỗng sau (đặc trưng giọng AI, đọc vào lộ ngay): "Có một giai đoạn...", "Ngày trước mình...", "Mình từng...", "Có một thời điểm...", "Hồi đó...", "Có một lần...", "Mình nhận ra một điều...", "Có một sự thật...", "Điều lạ là...", "Nhìn bên ngoài...", "Có lúc...", "Có thời điểm...", "Có giai đoạn...", "Có một khoảng thời gian...", "Đã từng...".
- Nếu cần lồng trải nghiệm cá nhân, viết theo kiểu ĐANG NÓI VỀ 1 NHẬN THỨC đã đúc kết, không phải kể chuyện theo trình tự thời gian. Ví dụ: thay vì "Mình từng nghĩ cuộc đời sẽ tự thay đổi...", viết "Mình đã mất khá lâu mới hiểu rằng, biết nhiều không đồng nghĩa với việc cuộc đời sẽ thay đổi."`;

// Viết theo tư duy chuyên gia tăng trưởng Facebook (2026-08-20, theo yêu cầu chị Quỳnh): thuật toán
// Facebook đẩy bài rộng hơn chủ yếu dựa trên TỐC ĐỘ + SỐ LƯỢNG tương tác thật trong khoảng 30-60
// phút đầu, và bình luận có TRỌNG SỐ CAO HƠN HẲN lượt thích — đặc biệt bình luận sinh ra PHẢN HỒI
// QUA LẠI (tác giả trả lời, người khác trả lời tiếp) được xếp vào nhóm "tương tác có ý nghĩa", đẩy
// mạnh hơn nữa. Vì vậy toàn bộ CTA/bình luận ghim phải tối ưu để hạ thấp rào cản bình luận NGAY LÚC
// ĐỌC, không phải để đẹp câu chữ suông.
// Từ sự cố thực tế 2026-08-21 (bài viết theo giọng "gia tiên nói với con cháu" khiến AI mang luôn
// cách xưng "con" sang cả bình luận CTA/cmt_cta_san_pham — tác giả thật gọi người lạ theo dõi mình
// là "con" đọc rất kỳ, thậm chí phản cảm) — chốt 1 quy tắc CỨNG dùng chung cho MỌI bình luận/CTA
// (CTA_COMMENT_RULES lẫn HASHTAG_CAPTION_RULES bên dưới), tách khỏi giọng kể bên trong bài viết.
// cau_cmt_ghim CŨNG thuộc quy tắc này (chốt lại 2026-08-21 sau phản hồi trực tiếp chị Quỳnh: bình
// luận ghim LÀ bình luận CỦA CHÍNH TÁC GIẢ, có cấu trúc NHƯ CTA, mục đích kích thêm bình luận —
// KHÔNG phải giọng 1 người đọc lạ giả danh như bản trước từng viết nhầm).
const ADDRESS_FORM_RULE = `QUY TẮC XƯNG HÔ TRONG CTA/BÌNH LUẬN (BẮT BUỘC — không có ngoại lệ, áp dụng cho cta, tu_khoa_cta, cau_cmt_ghim, cmt_cta_san_pham):
- Đây là lời TÁC GIẢ (chủ trang, ngoài đời thật) nói trực tiếp với người theo dõi lạ trên mạng xã hội — LUÔN xưng "mình", gọi người đọc là "bạn" (chỉ đổi sang "anh/chị" nếu định vị nêu rõ đối tượng lớn tuổi/cần trang trọng hơn hẳn).
- TUYỆT ĐỐI KHÔNG gọi người đọc là "con", "em" hay bất kỳ đại từ mang tính bề trên/quá thân mật nào.
- Kể cả khi BÀI VIẾT dùng 1 giọng kể đặc biệt bên trong nội dung (ví dụ giọng gia tiên/tổ tiên xưng "con" với con cháu như 1 thủ pháp văn học cho đoạn hook/thân bài) — giọng đó CHỈ tồn tại bên trong bài viết, KHÔNG được mang sang bình luận/CTA. Bình luận/CTA là lúc tác giả bước ra khỏi giọng kể đó, nói chuyện thật với 1 người lạ, phải quay về xưng hô bình thường như trên.`;

const CTA_COMMENT_RULES = `QUY TẮC CTA (BẮT BUỘC — tối ưu theo cách Facebook đẩy bài):
${ADDRESS_FORM_RULE}
- Facebook ưu tiên đẩy bài có nhiều bình luận thật, đến sớm, và có phản hồi qua lại — hơn hẳn lượt thích/lượt xem. CTA phải hạ THẤP NHẤT rào cản để người đọc bình luận ngay lúc đó, không phải "để lúc khác".
- CTA luôn phải chốt bằng 1 từ khoá kích hoạt cụ thể gồm ĐÚNG 2 CHỮ, càng NGẮN — DỄ GÕ TRÊN ĐIỆN THOẠI — GÂY CẢM XÚC càng tốt (ví dụ: "Dòng tiền", "Sổ tay", "Bí kíp", "Bắt đầu"...) — từ khoá càng dễ gõ thì tỷ lệ người đọc thật sự bấm bình luận (thay vì chỉ định bụng rồi lướt qua) càng cao. Theo mẫu: "Để lại bình luận chữ '<từ khoá 2 chữ>' và mình sẽ gửi bạn <thứ nhận được cụ thể>." — không dùng CTA chung chung kiểu "inbox mình nhé" hay "để lại bình luận bên dưới" mà không có từ khoá.
- Từ khoá phải khớp chủ đề bài và thứ người đọc sẽ nhận được (tài liệu, link, ưu đãi, tư vấn...) — hứa hẹn mơ hồ khiến người đọc nghi ngờ, giảm hẳn tỷ lệ bình luận thật.
- Nếu có SẢN PHẨM/DỊCH VỤ MUỐN NHẮC hoặc GROUP/CỘNG ĐỒNG MUỐN NHẮC được cung cấp (xem block bên dưới), thứ HỨA GỬI trong CTA/bình luận ghim BẮT BUỘC phải là đúng sản phẩm/group đó (hoặc thứ dẫn thẳng vào đó, ví dụ tài liệu giới thiệu ngắn) — TUYỆT ĐỐI không tự bịa ra 1 phần thưởng/tài liệu khác không liên quan gì tới sản phẩm/group đã chọn. Nếu KHÔNG có sản phẩm/group nào được cung cấp, tự nghĩ ra 1 thứ hứa hẹn hợp chủ đề bài như bình thường.

QUY TẮC BÌNH LUẬN GHIM (BẮT BUỘC MẠNH TAY — cau_cmt_ghim LÀ bình luận của CHÍNH TÁC GIẢ, đăng và ghim ngay dưới bài của mình — CÓ CẤU TRÚC NHƯ 1 CÂU CTA, mục đích kích thêm người đọc để lại bình luận tiếp theo, KHÔNG PHẢI giọng 1 người đọc lạ giả danh):
- Cùng xưng hô "mình"/"bạn" như QUY TẮC XƯNG HÔ ở trên (đây là tác giả nói, không phải người đọc) — được phép hứa hẹn/nhắc lại thứ người đọc sẽ nhận được, giống hệt tinh thần câu CTA trong bài, chỉ khác câu chữ/góc nói để không đọc như copy y nguyên CTA.
- Phải đánh THẲNG vào đúng nỗi đau/nỗi sợ/mong muốn đã nêu ở đoạn vấn đề (van_de) của bài — không viết chung chung, phải khiến người đang lưỡng lự cảm thấy "nói đúng tim đen mình" thì mới bấm bình luận. Chọn 1 trong các hướng sau, tuỳ hợp bài:
  • Xoáy vào cái giá phải trả nếu CỨ ĐỂ NGUYÊN tình trạng hiện tại, không hành động gì.
  • Gọi đúng tên nỗi ngại/lý do trì hoãn phổ biến nhất của người đọc, rồi trấn an bằng đúng 1 câu ngắn gọn.
  • Tạo cảm giác cấp bách thật (vì sao nên làm ngay lúc đọc bài này, không phải "để đó tính sau").
- Vẫn phải nhắc đúng từ khoá CTA để người đọc biết gõ gì, nhưng viết như 1 câu tác giả buột miệng nói thêm — có cảm xúc thật, KHÔNG được viết kiểu thông báo hành chính ("Bình luận '...' để nhận ngay...").
- Người đọc lưỡng lự thường bắt chước đúng bình luận đầu tiên họ nhìn thấy — viết sao cho tự nhiên như tác giả thật sự buột miệng bình luận thêm dưới bài mình, để khi có người bình luận theo, cả luồng bình luận đọc tự nhiên, không lộ dàn dựng.`;

// QUY TẮC CMT CTA SẢN PHẨM/GROUP nằm ở EXTRAS (không phải CORE) vì đây là field DUY NHẤT phụ thuộc
// tên kênh/thương hiệu/sản phẩm/group người dùng chọn ở "Tuỳ chọn thêm" — tách ra khỏi CORE để bước
// viết bài chính không bị chậm/nặng thêm chỉ vì có chọn các mục đó (xem ghi chú ở TOOL_POST_CORE).
const HASHTAG_CAPTION_RULES = `QUY TẮC CMT CTA SẢN PHẨM/GROUP:
${ADDRESS_FORM_RULE}
- Nếu người dùng có cung cấp tên sản phẩm/dịch vụ và/hoặc tên group/cộng đồng, viết thêm 1-2 câu bình luận CTA (cmt_cta_san_pham) dẫn khéo về đúng sản phẩm hoặc group đó, giọng chia sẻ tự nhiên, không quảng cáo lộ liễu.
- BẮT BUỘC: nếu có LINK kèm theo (xem LINK SẢN PHẨM/DỊCH VỤ ĐÓ, LINK GROUP/CỘNG ĐỒNG ĐÓ), phải CHÈN THẲNG đúng link đó vào trong câu bình luận — không chỉ nhắc tên suông rồi để người đọc tự tìm. Chèn tự nhiên, ví dụ "...mình để link ở đây nha: <link>" hoặc "...tham gia tại <link>".
- Nếu có tên sản phẩm/group nhưng KHÔNG có link kèm theo, vẫn viết bình luận nhắc tên như bình thường, không tự bịa ra link.
- Nếu người dùng có để sẵn CÂU CTA MẪU ĐÃ LƯU cho đúng sản phẩm/group đó, ưu tiên bám theo TINH THẦN/GIỌNG ĐIỆU câu mẫu đó — biến tấu lại câu chữ cho hợp bài hiện tại, TUYỆT ĐỐI không copy y nguyên (mẫu đó có thể đã dùng cho bài khác trước đây).
- Nếu người dùng KHÔNG cung cấp sản phẩm/group nào, trả về mảng rỗng cho cmt_cta_san_pham — không tự bịa ra sản phẩm/group.

QUY TẮC CAPTION VIDEO (goi_y_caption):
- LUÔN điền đầy đủ goi_y_caption cho MỌI bài, bất kể dinh_dang_de_xuat AI chọn là gì — người dùng có thể tự quyết định quay video (vd Video Ngồi Nói) dù đó không phải dạng AI đề xuất là phù hợp nhất, nên không được bỏ trống vì lý do "bài này hợp ảnh tĩnh hơn".
- Tự quyết định giu_nguyen_tieu_de: true nếu tiêu đề trên thumbnail đã đủ mạnh để dùng luôn làm caption; false nếu nên viết 1 caption riêng, khác đi, hiệu quả hơn khi đứng dưới video.
- Chỉ thêm biến thể theo_nen_tang cho nền tảng thực sự nên viết khác caption_chinh đáng kể — không liệt kê cho đủ 3 nền tảng nếu không cần thiết. Khi có thêm, PHẢI viết đúng đặc thù thuật toán/hành vi người dùng từng nền tảng, không chỉ đổi giọng văn qua loa:
  • TikTok: caption NGẮN (dưới ~150 ký tự, phần dài bị ẩn), câu đầu phải giữ được sự tò mò vì đây là phần luôn hiện — không lặp lại y hệt hook trên video; có thể chèn 1 câu hỏi cuối để kích thích bình luận (thuật toán ưu tiên watch time + tương tác bình luận/chia sẻ); 3-5 hashtag ngắn (trộn hashtag ngách + hashtag rộng đang thịnh hành), viết liền không dấu.
  • YouTube: caption/mô tả dùng cho SEO nên có thể dài hơn hẳn — 2-3 câu ĐẦU phải chứa đúng từ khoá chính người xem hay tìm (vì đây là phần hiện trong kết quả tìm kiếm/preview), sau đó có thể mô tả thêm chi tiết/bối cảnh; hashtag đặt cuối cùng, tối đa 3-5 (YouTube chỉ hiện 3 hashtag đầu phía trên tiêu đề nên đặt hashtag quan trọng nhất lên đầu).
  • Zalo: giọng gần gũi, cá nhân, như đang nhắn tin chia sẻ với người quen chứ không phải đăng bài quảng cáo; ngắn gọn, hầu như KHÔNG dùng hashtag (Zalo không dùng hashtag để gợi ý khám phá nội dung như TikTok/YouTube); nên có 1 CTA rõ ràng dẫn về Zalo OA/nhóm nếu phù hợp.

QUY TẮC HASHTAG (BẮT BUỘC — lưu ý về thuật toán, tránh kỳ vọng sai):
- Trên Facebook, hashtag gần như KHÔNG ảnh hưởng tới lượt tiếp cận/đẩy bài — khác hẳn TikTok/Instagram, nơi hashtag là 1 kênh khám phá nội dung thật sự. Trên Facebook, hashtag chủ yếu để PHÂN LOẠI/tìm lại nội dung cũ (của người đăng và người xem), không phải đòn bẩy tăng reach. Vì vậy ưu tiên hashtag ĐÚNG NGÁCH/thương hiệu để dễ tìm lại và xây nhận diện nhất quán, không cố nhồi hashtag "đang viral" chung chung với hi vọng tăng tiếp cận trên Facebook — không có tác dụng đó ở nền tảng này (hashtag viral/trending chỉ thật sự đáng cân nhắc khi đăng dạng video lên TikTok — xem QUY TẮC CAPTION VIDEO bên dưới).
- Xuất ĐÚNG 5 hashtag, không hơn không kém.
- TẤT CẢ hashtag phải viết KHÔNG DẤU (bỏ hết dấu thanh và dấu chữ tiếng Việt, ví dụ "Tài Chính" → "TaiChinh"), viết liền không có khoảng trắng, không ký tự đặc biệt.
- Nếu người dùng có cung cấp tên kênh Facebook/TikTok, 1 trong 5 hashtag PHẢI là tên kênh đó (không dấu, viết liền).
- Nếu người dùng có cung cấp tên thương hiệu/sản phẩm cố định (khác tên kênh), thêm 1 hashtag riêng cho tên đó (không dấu, viết liền).
- Nếu người dùng có cung cấp SẢN PHẨM/DỊCH VỤ MUỐN NHẮC TRONG BÀI NÀY và/hoặc GROUP/CỘNG ĐỒNG MUỐN NHẮC (riêng cho bài này, khác thương hiệu cố định ở trên), PHẢI có thêm hashtag cho tên đó — nếu cả 2 đều có mà không đủ chỗ trong 5 hashtag, ưu tiên sản phẩm/dịch vụ trước, group sau.
- Các hashtag còn lại bám sát chủ đề bài + trục nội dung định vị.
- Nếu không có tên kênh/thương hiệu nào được cung cấp, tự suy ra 1 hashtag đại diện thương hiệu từ bản sắc thương hiệu trong định vị.`;

// Chỉ gửi phần luot2 THỰC SỰ cần cho việc viết văn phong 1 bài — bỏ các phần chiến lược kinh
// doanh/dòng tiền (dong_tien_phu_hop, lo_trinh_dan_ve_dong_tien, can_sua_ngay) không ảnh hưởng câu
// chữ của bài, giảm bớt dung lượng input gửi AI mỗi lần viết bài — dùng chung cho
// viet-content.js/viet-tu-kho-goc.js/viet-content-extras.js thay vì gửi cả luot2.
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

// product_cta_mau/group_cta_mau: câu CTA mẫu lưu RIÊNG cho đúng tài sản đó ở Định Vị (thay cho Kho
// CTA chung cũ, đã bỏ 2026-08-20 theo phản hồi chị Quỳnh — CTA nên gắn liền với từng sản phẩm/group
// cụ thể, không phải 1 kho chung tách rời). Dùng làm tham khảo giọng điệu cho cmt_cta_san_pham, KHÔNG
// copy y nguyên (xem QUY TẮC CMT CTA SẢN PHẨM/GROUP ở HASHTAG_CAPTION_RULES).
function extraFieldsBlock({ channel_handle, brand_name, product_name, product_url, product_cta_mau, group_name, group_url, group_cta_mau }) {
  return `TÊN KÊNH FACEBOOK/TIKTOK: ${channel_handle && channel_handle.trim() ? channel_handle.trim() : '(không cung cấp — tự suy ra hashtag thương hiệu từ định vị)'}
TÊN THƯƠNG HIỆU/SẢN PHẨM CỐ ĐỊNH (khác tên kênh, nếu có): ${brand_name && brand_name.trim() ? brand_name.trim() : '(không có)'}
SẢN PHẨM/DỊCH VỤ MUỐN NHẮC TRONG BÀI NÀY: ${product_name && product_name.trim() ? product_name.trim() : '(không có)'}
LINK SẢN PHẨM/DỊCH VỤ ĐÓ: ${product_url && product_url.trim() ? product_url.trim() : '(không có link)'}
CÂU CTA MẪU ĐÃ LƯU CHO SẢN PHẨM/DỊCH VỤ ĐÓ: ${product_cta_mau && product_cta_mau.trim() ? `"${product_cta_mau.trim()}"` : '(không có, tự viết mới)'}
GROUP/CỘNG ĐỒNG MUỐN NHẮC: ${group_name && group_name.trim() ? group_name.trim() : '(không có)'}
LINK GROUP/CỘNG ĐỒNG ĐÓ: ${group_url && group_url.trim() ? group_url.trim() : '(không có link)'}
CÂU CTA MẪU ĐÃ LƯU CHO GROUP/CỘNG ĐỒNG ĐÓ: ${group_cta_mau && group_cta_mau.trim() ? `"${group_cta_mau.trim()}"` : '(không có, tự viết mới)'}`;
}

// Yêu cầu tự do riêng cho 1 bài cụ thể (vd "viết ngắn hơn", "giọng hài hước", "nhấn số liệu") — KHÁC
// với Định Vị (áp dụng cho MỌI bài) và câu chuyện riêng (chỉ dùng khi viết từ Kho Content). Ưu tiên
// tuân theo nhưng không được phá vỡ khung 5 phần/quy tắc CTA bắt buộc đã nêu ở trên.
function customInstructionsBlock(custom_instructions) {
  if (!custom_instructions || !custom_instructions.trim()) return '';
  return `\nYÊU CẦU RIÊNG CHO BÀI NÀY (ưu tiên tuân theo, miễn không phá vỡ các nguyên tắc bắt buộc đã nêu ở trên): ${custom_instructions.trim()}\n`;
}

// Kiến thức ngành (2026-08-21, theo yêu cầu chị Quỳnh) — người dùng tự lưu ở Kho Content ("Kho của
// tôi", source_type=kien_thuc_nganh), chọn 1 mục cụ thể để lồng vào bài viết này, tạo cảm giác
// content có chuyên môn thật thay vì AI viết chung chung. BẮT BUỘC diễn đạt lại (không copy nguyên
// văn) — người dùng có thể chọn lại đúng mục này cho nhiều bài khác nhau sau này.
function knowledgeBlock(knowledge_text) {
  if (!knowledge_text || !knowledge_text.trim()) return '';
  return `\nKIẾN THỨC NGÀNH MUỐN LỒNG VÀO BÀI NÀY (bắt buộc lồng vào đúng đoạn Giá trị/gia_tri, diễn đạt lại bằng giọng của người dùng — TUYỆT ĐỐI không copy nguyên văn, vì mục này có thể được dùng lại cho nhiều bài khác nhau): ${knowledge_text.trim()}\n`;
}

module.exports = { TOOL_POST_CORE, TOOL_POST_EXTRAS, assemblePost, stripDiacritics, CTA_COMMENT_RULES, ANTI_AI_CLICHE_RULES, HASHTAG_CAPTION_RULES, ADDRESS_FORM_RULE, extraFieldsBlock, contextBlockOf, customInstructionsBlock, knowledgeBlock };
