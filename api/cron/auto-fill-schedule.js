// Cron job (xem "crons" trong vercel.json, chạy 1 lần/ngày sáng sớm giờ VN) — tự động lấp các Ô
// LỊCH CÒN TRỐNG (chưa từng tạo trong Lịch Đăng Bài) của admin bằng bài viết mới, cho CẢ 2 lane:
// - Fanpage (autoFillForAdmin, Phase 2): 1 bài/ngày, viết từ hook/content viral hoặc case study, rồi
//   bật auto_publish_fb=true để api/cron/auto-publish-fb.js tự nhặt đúng giờ đăng lên Fanpage.
// - Cá nhân (autoFillPersonalForAdmin, Phase 9): 3 bài/ngày (Sáng/Trưa/Tối), KHÔNG tự đăng (Facebook
//   không cho app đăng hộ trang cá nhân) — chị Quỳnh tự đăng tay. Mỗi buổi khoá 1 kiểu content: Tối
//   luôn "Video Ngồi Nói" (100% lấy từ kho hook/content viral, không tự bịa), Trưa XEN KẼ case study
//   và quote (random 50/50, rơi sang loại còn lại nếu 1 loại hết — chốt 2026-08-31, xem fillQuoteSlot()/
//   pickUnusedQuote()), Sáng là bài thường (không phải "Video Ngồi Nói"). Cả 3 buổi đều lọc đúng trục
//   nội dung đã định vị (classifyUserPillar()/filterPoolByPillar(), chốt 2026-08-31) và CTA phải dẫn
//   thẳng sản phẩm khi có sản phẩm được chọn (productCtaBlock(), chốt 2026-08-31).
//
// CHỈ chạy cho tài khoản admin (đúng chị Quỳnh — không phải tính năng cho khách hàng khác). Mỗi lần
// chạy có giới hạn an toàn riêng cho từng lane (tránh sinh hàng loạt nếu có lỗi) — ô nào bị bỏ qua do
// chạm giới hạn được ghi lại trong response, không im lặng bỏ qua. Chỉ lấp ô HOÀN TOÀN CHƯA CÓ GÌ
// (không có dòng calendar_entries nào) — ô chị Quỳnh đã tự xếp tay (dù chưa viết xong) thì không đụng.
const { supabaseAdmin } = require('../_lib/supabase-admin');
const { SYSTEM_PROMPT: KHO_GOC_SYSTEM_PROMPT, TOOL_POST_KHO_GOC } = require('../viet-tu-kho-goc');
const {
  TOOL_POST_CORE, TOOL_POST_EXTRAS, HASHTAG_CAPTION_RULES, CTA_COMMENT_RULES, ANTI_AI_CLICHE_RULES,
  assemblePost, stripDiacritics, contextBlockOf, extraFieldsBlock, customInstructionsBlock,
} = require('../_lib/post-schema');
const { FORMAT_GUIDE } = require('../_lib/formats');
const { compositeCaseStudyImage, renderPersonalTemplateImage, safeLayoutsForCorner, autoPickAndRenderImage } = require('../_lib/image-gen');
const { TEXT_CLASSIFY_SYSTEM_PROMPT, TOOL_PHAN_LOAI_TRUC } = require('../_lib/pillars');

const MAX_FILL_PER_RUN = 3;
const LOOKAHEAD_DAYS = 3; // hôm nay + 2 ngày tới
// Chị Quỳnh chốt (2026-08-27): chỉ tự động 1 bài/ngày, không phải lấp cả 3 buổi — cố định buổi sáng
// cho bài tự-viết. Lưới lịch vẫn giữ nguyên 3 buổi, chị vẫn tự thêm tay buổi khác nếu muốn — chỉ
// riêng phần TỰ ĐỘNG lấp giới hạn còn 1 buổi/ngày.
const FANPAGE_DAILY_SLOT = 'sang';
// Phải khớp tay với default ở cột profiles.slot_time_* trong schema_full.sql, giống send-reminders.js.
const DEFAULT_SLOT_TIME = { sang: '08:00', trua: '12:00', toi: '19:00' };
// Tỷ lệ ưu tiên bài case study (bán hàng/bằng chứng) so với bài hook/content thường (giá trị/giáo
// dục) khi cả 2 nguồn đều sẵn sàng — chốt 2026-08-28 sau khi kho ảnh case study/cá nhân đầy khiến
// MỌI bài đều rơi vào case study, mất đa dạng. Xem nhánh chọn ở autoFillForAdmin().
const CASE_STUDY_RATIO = 0.3;

// Phase 9 (2026-08-29) — lane Cá nhân cũng được tự động viết + xếp lịch như Fanpage, nhưng KHÔNG tự
// đăng (Facebook không cho app đăng hộ trang cá nhân) — chị Quỳnh tự đăng tay. Chốt 3 bài/ngày, đúng
// 3 buổi có sẵn, mỗi buổi khoá 1 kiểu dạng content cố định (xem autoFillPersonalForAdmin()).
const PERSONAL_SLOTS = ['sang', 'trua', 'toi'];
const MAX_FILL_PER_RUN_PERSONAL = LOOKAHEAD_DAYS * PERSONAL_SLOTS.length; // 3 ngày × 3 buổi = 9
const NGOI_NOI_FORMAT = 'Video Ngồi Nói'; // phải khớp đúng tên trong FORMAT_NAMES (api/_lib/formats.js)
const FORCE_NGOI_NOI = `BẮT BUỘC: chọn dinh_dang_de_xuat = "${NGOI_NOI_FORMAT}" cho bài này (khung giờ tối dành riêng cho dạng video ngồi nói chia sẻ trực diện) — viết ly_do_dinh_dang và goi_y_caption khớp đúng dạng này.`;
const EXCLUDE_NGOI_NOI = `KHÔNG được chọn dinh_dang_de_xuat = "${NGOI_NOI_FORMAT}" cho bài này — dạng đó chỉ dành riêng cho khung giờ tối, chọn 1 trong các dạng còn lại phù hợp hơn.`;

// Giống hệt SYSTEM_PROMPT ghép ở api/viet-content-extras.js — viết lại tại đây (4 dòng) thay vì sửa
// file đó, vì nó vẫn đang phục vụ endpoint HTTP riêng, không muốn đổi hành vi chỗ đang chạy thật.
const EXTRAS_SYSTEM_PROMPT = `Bạn là trợ lý content cho người xây thương hiệu cá nhân tại Việt Nam. Nhiệm vụ: dựa trên 1 bài viết ĐÃ HOÀN CHỈNH, gợi ý hashtag, ý tưởng hình ảnh/video minh hoạ, dạng content phù hợp nhất và caption gợi ý — không viết lại nội dung bài.

${HASHTAG_CAPTION_RULES}

${FORMAT_GUIDE}
(Chọn đúng 1 dạng khớp nhất với ngành + mục tiêu bài này.)`;

// Viết bài TỪ 1 ẢNH CASE STUDY (2026-08-28, theo yêu cầu chị Quỳnh: "viết bài case study nghe thật
// tự nhiên, dễ chốt khách") — khác hẳn KHO_GOC_SYSTEM_PROMPT (paraphrase từ 1 bài gốc có sẵn): ở đây
// không có "bài gốc", chỉ có 1 TẤM ẢNH — AI phải THỰC SỰ NHÌN ảnh (vision) để viết đúng tinh thần kết
// quả đang cho thấy, không đoán mò/bịa số liệu không có trong ảnh. Dùng chung TOOL_POST_CORE (cùng
// shape hook/van_de/gia_tri/niem_tin/cta/tu_khoa_cta/cau_cmt_ghim) để phần lưu posts/EXTRAS/hashtag
// phía sau dùng lại y hệt code hiện có.
const SYSTEM_PROMPT_CASE_STUDY = `Bạn là trợ lý viết content bán hàng cho người xây thương hiệu cá nhân tại Việt Nam.

Bạn được xem 1 ẢNH CASE STUDY/KẾT QUẢ THẬT — có thể là ảnh chụp màn hình số liệu, ảnh trước/sau, ảnh testimonial của khách hàng, hoặc bằng chứng kết quả khác của chính tác giả hoặc khách hàng của họ. NHIỆM VỤ: viết 1 bài đăng Facebook NGẮN GỌN kể lại câu chuyện đằng sau kết quả trong ảnh này — giọng kể tự nhiên như chính tác giả đang chia sẻ thật, KHÔNG phải mô tả ảnh khô khan kiểu báo cáo, và KHÔNG chỉ đơn thuần "tường thuật lại" từng chi tiết nhìn thấy trong ảnh.

BẮT BUỘC — NGẮN GỌN (2026-08-31, theo yêu cầu chị Quỳnh: "cách viết bài case study quá dài dòng, ngắn gọn thôi"): mỗi đoạn (hook, van_de, gia_tri, niem_tin) chỉ 1-3 câu NGẮN, không viết dài kiểu tiểu thuyết. Đây là bài case study lướt Facebook — người đọc quyết định dừng lại hay lướt qua trong vài giây, càng dài càng dễ bị lướt. Cắt hết những câu miêu tả/dẫn dắt không thật sự cần thiết, chỉ giữ lại phần cốt lõi: kết quả, 1 câu chuyện/cảm nhận ngắn của tác giả, bài học, CTA.

QUAN TRỌNG — KHÔNG THUẬT LẠI CHI TIẾT GIAO DIỆN VÔ NGHĨA: nếu ảnh là ảnh chụp màn hình tin nhắn/chat, TUYỆT ĐỐI KHÔNG nhắc tới giờ/ngày gửi tin nhắn, tên app nhắn tin, trạng thái "đã xem", số thông báo... — đây chỉ là bối cảnh kỹ thuật của tấm ảnh chụp màn hình, kể vào nghe rất máy móc/lộ AI. Chỉ lấy NỘI DUNG THẬT (lời khách nói, kết quả đạt được, cảm xúc trong lời nhắn) làm chất liệu kể chuyện.

BẮT BUỘC — LỒNG CÂU CHUYỆN CỦA CHÍNH TÁC GIẢ, KHÔNG CHỈ KỂ CHUYỆN NGƯỜI TRONG ẢNH: bài phải có góc nhìn/trải nghiệm/cảm xúc của CHÍNH TÁC GIẢ khi đồng hành hoặc chứng kiến kết quả này (vì sao tác giả tin cách này hiệu quả, tác giả đã đồng hành/hướng dẫn thế nào, cảm giác của tác giả khi thấy kết quả) — viết như 1 người có câu chuyện, chuyên môn, cảm xúc thật của riêng mình, không phải chỉ đọc hộ nội dung ảnh cho người xem.

BẮT BUỘC — ĐOẠN GIÁ TRỊ (gia_tri) PHẢI LÀ 1 DANH SÁCH BÀI HỌC/BÍ QUYẾT RÚT RA TỪ CASE NÀY: viết dạng liệt kê ngắn gọn quen thuộc trên Facebook, kiểu "3 điều mình rút ra từ case này", "2 lý do vì sao bạn ấy làm được"... (CHỈ 2-3 mục, không quá 3 — mỗi mục ĐÚNG 1 câu thật ngắn) — để người đọc thấy được giá trị/bài học áp dụng được cho chính mình, không chỉ đọc xong 1 câu chuyện suông không rút ra được gì.

QUAN TRỌNG — TRÁNH BỊA SỐ LIỆU: bạn không biết chi tiết chính xác đằng sau ảnh (tên khách hàng thật, ngày tháng chính xác...). CHỈ nhắc tới những gì THỰC SỰ NHÌN THẤY RÕ trong ảnh, diễn đạt khéo léo. Nếu ảnh có số liệu cụ thể nhìn rõ được, có thể nhắc lại đúng số đó; nếu không chắc/không nhìn rõ, nói chung chung theo CẢM XÚC/Ý NGHĨA của kết quả (ví dụ "nhìn con số này mà...") thay vì bịa ra số liệu không có trong ảnh.

BẮT BUỘC — CTA PHẢI RẤT MẠNH, TẬP TRUNG ĐẨY SẢN PHẨM (2026-08-30, theo yêu cầu chị Quỳnh): case study là bài BẰNG CHỨNG/KẾT QUẢ THẬT — đúng lúc người đọc tin nhất, không được lãng phí bằng CTA mờ nhạt/chỉ xin bình luận cho vui như bài giá trị thông thường. cta/tu_khoa_cta phải hướng THẲNG người đọc tới hành động để có được đúng kết quả như trong case này (tìm hiểu/mua/đăng ký sản phẩm-dịch vụ) — nếu có SẢN PHẨM/DỊCH VỤ được cung cấp, PHẢI nhắc rõ, không né tránh bán hàng bằng câu chung chung kiểu "để lại bình luận mình gửi tài liệu" khi thực chất nên là mời dùng thử/mua sản phẩm đó. Vẫn theo đúng khuôn "từ khoá 2 chữ" ở QUY TẮC CTA bên dưới, nhưng thứ hứa hẹn nhận được phải gắn thẳng với sản phẩm/dịch vụ thật, không phải 1 tài liệu miễn phí lấp lửng.

${ANTI_AI_CLICHE_RULES}

${CTA_COMMENT_RULES}`;

// Viết bài TỪ 1 CÂU QUOTE/CHÂM NGÔN hoàn chỉnh (2026-08-31, theo yêu cầu chị Quỳnh: "phần case study
// buổi trưa thì xen kẽ câu quote với case study") — nguồn là hook category='quote' trong Kho Hook
// (xem CATEGORIES ở nhan-hieu/js/kho-hook.js — quote KHÁC hook thật, là câu hoàn chỉnh không tạo
// khoảng trống tò mò). KHÁC fillOneSlot(): không "paraphrase lại 70% câu chữ" vì quote vốn đã hoàn
// chỉnh, giữ NGUYÊN VĂN — chỉ viết thêm phần cảm nhận/góc nhìn ngắn của chính tác giả xung quanh.
const SYSTEM_PROMPT_QUOTE = `Bạn là trợ lý viết content cho người xây thương hiệu cá nhân tại Việt Nam, chuyên biến 1 câu quote/châm ngôn có sẵn thành 1 bài đăng Facebook ngắn gọn.

Đây KHÔNG PHẢI 1 bài dài kiểu kể chuyện. Quote đã hoàn chỉnh — GIỮ NGUYÊN VĂN câu quote này (dùng làm hook mở đầu, hoặc câu chốt cuối bài, tuỳ hợp), rồi viết thêm phần NGẮN GỌN (chỉ 2-4 câu, không dài dòng lan man) là góc nhìn/cảm nhận/cách chính tác giả áp dụng câu này vào công việc hoặc cuộc sống thật — KHÔNG giải thích/diễn giải quote 1 cách khô khan như đang phân tích văn học, KHÔNG thêm 1 câu chuyện dài không liên quan.

BẮT BUỘC — đoạn giá trị (gia_tri) vẫn phải có, nhưng NGẮN (1-2 mục thôi, không kéo dài như bài thường) — nêu đúng 1-2 điều áp dụng được ngay từ quote này, không lan man.

${ANTI_AI_CLICHE_RULES}

${CTA_COMMENT_RULES}`;

// Bỏ prefix "data:image/...;base64," nếu có (ảnh lưu trong DB là data URL từ canvas.toDataURL phía
// client) — Anthropic Messages API cần đúng phần base64 thuần.
function stripDataUrlPrefix(dataUrl) {
  return String(dataUrl || '').replace(/^data:image\/\w+;base64,/, '');
}

// Cùng khuôn callClaude() đang tự lặp lại ở viet-tu-kho-goc.js/viet-content-extras.js — repo chưa có
// 1 helper dùng chung để import, nên viết lại đúng khuôn ở đây thay vì bịa cách khác.
async function callClaude({ apiKey, system, userContent, tool }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90000);
  let resp;
  try {
    resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 4000,
        system,
        messages: [{ role: 'user', content: userContent }],
        tools: [tool],
        tool_choice: { type: 'tool', name: tool.name },
      }),
      signal: controller.signal,
    });
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('AI phản hồi quá lâu (quá 90 giây).');
    throw e;
  } finally {
    clearTimeout(timer);
  }
  if (!resp.ok) throw new Error(`Anthropic API lỗi (${resp.status}): ${await resp.text()}`);
  const data = await resp.json();
  const toolUse = (data.content || []).find((b) => b.type === 'tool_use');
  if (!toolUse) throw new Error('Không nhận được kết quả có cấu trúc từ AI.');
  return toolUse.input;
}

// "Lịch tự động làm đang bị 1 màu quá... y hệt chủ đề và nội dung luôn" (chị Quỳnh 2026-08-31) — khi
// nhiều candidate trong kho hook/content của cùng 1 trục hẹp (vd tài chính-tâm linh) đều dùng chung 1
// mô-típ mở bài phổ biến ("tín hiệu/dấu hiệu vũ trụ đang gửi đến bạn"...), fillOneSlot() GIỮ NGUYÊN
// hook gốc + chỉ paraphrase thân bài — nên nhiều bài trong cùng 1 đợt xếp lịch đọc rất giống nhau dù
// nguồn khác nhau, vì bản thân các nguồn đã na ná nhau. Cách sửa: mỗi lần viết xong 1 bài, tiêu đề
// được cộng dồn vào `recentTitles`, feed vào lượt viết TIẾP THEO trong CÙNG 1 đợt xếp lịch, bắt AI né
// hẳn mô-típ mở bài đã dùng — không đổi cách chọn nguồn/paraphrase, chỉ thêm 1 lớp "đừng lặp mô-típ".
function recentTitlesBlock(recentTitles) {
  if (!recentTitles || !recentTitles.length) return '';
  return `\nCÁC BÀI ĐÃ VIẾT TRONG ĐỢT XẾP LỊCH NÀY (cùng 1 lượt, có thể cùng nguồn/chủ đề gần giống) — TUYỆT ĐỐI KHÔNG lặp lại cùng 1 kiểu mở đầu/mô-típ/góc nhìn với các bài dưới đây, dù nội dung gốc có giống nhau (ví dụ nhiều bài đã mở theo kiểu "tín hiệu/dấu hiệu vũ trụ đang gửi đến bạn" thì bài này BẮT BUỘC chọn hẳn 1 cách vào bài khác hoàn toàn — không dùng lại từ "tín hiệu", "dấu hiệu", "vũ trụ", "không phải ngẫu nhiên" nếu các bài dưới đã dùng):\n${recentTitles.map((t) => `- ${t}`).join('\n')}\n`;
}

// "lưu ý tất cả các bài đều có CTA dẫn sản phẩm" (chị Quỳnh 2026-08-31) — trước đây product chỉ được
// đưa vào lượt EXTRAS riêng (writeExtrasAndSave, cho cmt_cta_san_pham) chứ KHÔNG hề xuất hiện trong
// lượt viết CORE này (nơi thật sự sinh ra cta/tu_khoa_cta chính của bài) — nên CTA chính nhiều bài
// không hề nhắc gì tới sản phẩm dù chị đã lưu sẵn. Giờ feed product ngay từ đây, bắt buộc CTA chính
// dẫn thẳng sản phẩm khi có, cùng tinh thần với BẮT BUỘC CTA của SYSTEM_PROMPT_CASE_STUDY.
function productCtaBlock(product) {
  if (!product || !product.label) return '';
  return `\nBẮT BUỘC — CTA PHẢI DẪN VỀ ĐÚNG SẢN PHẨM/DỊCH VỤ ĐÃ CHỌN CHO BÀI NÀY: "${product.label}"${product.url ? ` (link: ${product.url})` : ''}${product.cta_mau ? `\nCâu CTA mẫu đã lưu cho sản phẩm này (bám theo tinh thần/giọng điệu, biến tấu lại câu chữ, KHÔNG copy y nguyên vì có thể đã dùng cho bài khác): "${product.cta_mau}"` : ''}\ncta/tu_khoa_cta không được chỉ dừng ở mức xin bình luận chung chung kiểu "để lại bình luận mình gửi tài liệu" — phải hướng thẳng người đọc tới việc tìm hiểu/dùng thử/mua sản phẩm-dịch vụ này. Vẫn giữ đúng khuôn "từ khoá 2 chữ" ở QUY TẮC CTA bên dưới.\n`;
}

function vnDateStr(offsetDays) {
  const vn = new Date(Date.now() + 7 * 3600 * 1000 + offsetDays * 86400000);
  return vn.toISOString().slice(0, 10);
}

// Chị Quỳnh chốt 2026-08-29: sáng Chủ Nhật muốn thấy lấp sẵn HẾT lịch tuần tới, không phải trickle
// 3 ngày/lượt như ngày thường — mở rộng tầm nhìn lên nguyên 1 tuần đúng ngày Chủ Nhật (giờ VN), các
// ngày khác giữ nguyên cửa sổ 3 ngày cũ. Cron giờ chạy mỗi 3 tiếng thay vì 1 lần/ngày (xem
// vercel.json) để phần lấp mở rộng này thật sự lấp XONG hết trong ngày Chủ Nhật thay vì phải đợi cả
// tuần cửa sổ 3 ngày cũ mới trôi dần tới — không tốn thêm chi phí AI vì tổng số ô cần lấp/tuần không
// đổi, chỉ đổi tốc độ lấp.
function isVnSunday() {
  const vn = new Date(Date.now() + 7 * 3600 * 1000);
  return vn.getUTCDay() === 0;
}
const SUNDAY_LOOKAHEAD_DAYS = 8; // hôm nay (Chủ Nhật, phòng hờ) + trọn 7 ngày tuần tới

async function loadCandidatePool(userId) {
  const [hp, hs, cp, cs] = await Promise.all([
    supabaseAdmin(`hooks_bank_personal?user_id=eq.${userId}&select=id,hook_text,category,tags&order=created_at.desc`),
    supabaseAdmin(`hooks_bank_shared?select=id,hook_text,category,tags&order=created_at.desc`),
    supabaseAdmin(`content_bank_personal?user_id=eq.${userId}&select=id,title,content,tags&order=created_at.desc`),
    supabaseAdmin(`content_bank_shared?select=id,title,content,tags&order=pin_order.asc,created_at.desc`),
  ]);
  const [hpRows, hsRows, cpRows, csRows] = await Promise.all([
    hp.ok ? hp.json() : [], hs.ok ? hs.json() : [], cp.ok ? cp.json() : [], cs.ok ? cs.json() : [],
  ]);
  return [
    ...hpRows.map((h) => ({ table: 'hooks_bank_personal', id: h.id, text: h.hook_text, title: h.category, tags: h.tags })),
    ...hsRows.map((h) => ({ table: 'hooks_bank_shared', id: h.id, text: h.hook_text, title: h.category, tags: h.tags })),
    ...cpRows.map((c) => ({ table: 'content_bank_personal', id: c.id, text: c.content, title: c.title, tags: c.tags })),
    ...csRows.map((c) => ({ table: 'content_bank_shared', id: c.id, text: c.content, title: c.title, tags: c.tags })),
  ].filter((c) => c.text && c.text.trim());
}

// BUG THẬT (2026-08-31, chị Quỳnh: "lịch tự động nó đang lấy tất cả các mẫu content trong khi có
// những cái k liên quan đến trục nội dung của e 1 tí nào") — 2 hàm lấp lịch riêng của admin
// (fillSlotsForAdmin/autoFillPersonalForAdmin) trước giờ chọn thẳng từ poolCandidates KHÔNG hề lọc
// theo trục nội dung — khác hẳn api/auto-fill-week.js (nút công khai) vốn đã lọc đúng trục qua
// classifyUserPillar()/poolFiltered từ trước. Copy nguyên logic đó vào đây cho nhất quán, để cron
// riêng của admin cũng chỉ chọn trong đúng trục đã định vị, không lấy bừa cả kho không liên quan.
async function classifyUserPillar(apiKey, positioning) {
  try {
    const result = await callClaude({
      apiKey, system: TEXT_CLASSIFY_SYSTEM_PROMPT, tool: TOOL_PHAN_LOAI_TRUC,
      userContent: contextBlockOf(positioning, null).slice(0, 3000),
    });
    return (result && result.truc) || null;
  } catch (e) { return null; }
}
function filterPoolByPillar(poolCandidates, truc) {
  return (truc && poolCandidates.some((c) => Array.isArray(c.tags) && c.tags.includes(truc)))
    ? poolCandidates.filter((c) => Array.isArray(c.tags) && c.tags.includes(truc))
    : poolCandidates; // không có ứng viên nào khớp đúng trục — thà dùng tạm còn hơn bỏ qua cả lượt điền
}

// "sản phẩm là tùy bài đó nói về cái j thì chọn sản phẩm đó chứ sao lung tung đc" (chị Quỳnh
// 2026-08-31) — trước đây chọn NGẪU NHIÊN 1 sản phẩm trước khi biết bài sẽ viết về gì, hoàn toàn
// không liên quan chủ đề. Giờ so khớp từ khoá trong TÊN sản phẩm với văn bản nguồn (hook/content/quote
// sắp viết) — không có AI riêng để tránh tốn thêm lượt, chỉ so khớp từ đơn giản. Khớp được thì ưu
// tiên sản phẩm khớp (random giữa các sản phẩm đồng điểm cao nhất nếu có nhiều); KHÔNG khớp được từ
// nào thì rơi về random như cũ (còn hơn không gắn sản phẩm nào). Case study không có văn bản nguồn
// trước (chỉ có ảnh, AI mới biết nội dung SAU khi viết) nên vẫn giữ random ở đó.
function pickMatchingProduct(products, sourceText) {
  if (!products.length) return null;
  const text = String(sourceText || '').toLowerCase();
  const scored = products.map((p) => {
    const words = String(p.label || '').toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    const score = words.filter((w) => text.includes(w)).length;
    return { p, score };
  });
  const topScore = Math.max(...scored.map((s) => s.score));
  const top = topScore > 0 ? scored.filter((s) => s.score === topScore) : scored;
  return top[Math.floor(Math.random() * top.length)].p;
}

// Y hệt usageCountFor()/sortUnusedFirst() ở nhan-hieu/js/kho-hook.js và kho-content.js — ưu tiên ứng
// viên CHƯA TỪNG được viết thành bài (posts.source_table/source_id). usedRefs được cập nhật NGAY
// trong vòng lặp (không chỉ đọc 1 lần từ DB) để không chọn trùng 1 nguồn cho 2 ô trống khác nhau
// trong cùng 1 lượt chạy.
// allowReuse (mặc định true, GIỮ NGUYÊN hành vi cũ cho api/auto-fill-week.js — nút "AI tự viết + xếp
// cả tuần" của MỌI khách hàng, kho hook/content của khách mới có thể rất ít, ép "hết thì để trống"
// dễ khiến bấm nút mà nửa lịch trống trơn, phá hỏng đúng cái "khoảnh khắc aha" của tính năng đó) —
// truyền false CHỈ ở cron tự động riêng cho tài khoản admin (theo yêu cầu chị Quỳnh 2026-08-30: "cái
// nào đã làm rồi cũng ko đc lấy trùng lặp nữa"), nơi kho hook/content viral của chị đủ lớn để chấp
// nhận để trống còn hơn lặp lại.
function pickUnusedCandidate(candidates, usedRefs, allowReuse = true) {
  const isUsed = (c) => usedRefs.some((r) => r.table === c.table && r.id === c.id);
  const unused = candidates.filter((c) => !isUsed(c));
  // BUG THẬT (phát hiện 2026-08-31, chị Quỳnh: "chủ đề đang nguyên 1 lịch là chung 1 chủ đề... lấy
  // đúng 1 cái content xong ra nhiều bài trên lịch thôi") — trước đây luôn trả về unused[0]/candidates[0]
  // (PHẦN TỬ ĐẦU TIÊN cố định, không random) — khi trục của khách hẹp (vd chỉ khớp vài hook/content),
  // pool "chưa dùng" cạn rất nhanh trong 1 lượt bấm "AI tự viết + xếp cả tuần" (nhiều ô/lần, xem
  // MAX_FILL_PER_CLICK ở auto-fill-week.js), rồi rơi vào nhánh allowReuse=true → LUÔN trả về ĐÚNG 1
  // candidates[0] giống hệt nhau cho MỌI ô còn lại — cả tuần bài viết ra từ đúng 1 nguồn, dù đã
  // paraphrase 70% câu chữ vẫn cùng 1 chủ đề. Giờ chọn NGẪU NHIÊN trong cả 2 nhánh — vẫn không lặp
  // trong cùng 1 lượt chạy khi còn ứng viên chưa dùng (usedRefs cập nhật ngay trong vòng lặp gọi hàm
  // này), và khi PHẢI dùng lại (hết ứng viên mới) thì ít nhất mỗi ô có cơ hội rơi vào 1 nguồn khác
  // nhau thay vì luôn đúng 1 nguồn cố định.
  if (unused.length) return unused[Math.floor(Math.random() * unused.length)];
  if (!allowReuse) return null;
  return candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : null;
}

// KHÁC pickUnusedCandidate() ở trên: case study KHÔNG được lặp lại 1 khi đã dùng — hết ảnh chưa dùng
// thì trả về null (để trống ô, KHÔNG rơi về dùng lại ảnh cũ), theo yêu cầu chị Quỳnh 2026-08-30: "mục
// case study ko đc trùng lặp, nếu hết rồi thì để trống, ko tự điền".
function pickUnusedCaseStudy(caseStudies, usedRefs) {
  const isUsed = (c) => usedRefs.some((r) => r.table === 'case_studies' && r.id === c.id);
  const unused = caseStudies.filter((c) => !isUsed(c));
  if (!unused.length) return null;
  return unused[Math.floor(Math.random() * unused.length)];
}

// Hook category='quote' (xem CATEGORIES ở nhan-hieu/js/kho-hook.js) trong đúng poolFiltered đã lọc
// trục — candidate.title thực chất chứa category (xem loadCandidatePool()), nên lọc bằng title==='quote'.
// Cùng quy tắc "không lặp lại" như pickUnusedCaseStudy() — hết quote chưa dùng thì trả về null (rơi
// về case study bên gọi hàm), không dùng lại quote cũ.
function pickUnusedQuote(poolFiltered, usedRefs) {
  const isUsed = (c) => usedRefs.some((r) => r.table === c.table && r.id === c.id);
  const unused = poolFiltered.filter((c) => c.title === 'quote' && !isUsed(c));
  if (!unused.length) return null;
  return unused[Math.floor(Math.random() * unused.length)];
}

// Tổng quát hoá cho cả 2 lane (Phase 9) — nhận thẳng `channel` + danh sách `slots` cần xét thay vì
// hardcode Fanpage/1 buổi. Lane Cá nhân độc lập hoàn toàn với Fanpage (2 lane khác `channel`, xem
// schema_full.sql) — ô đã điền bên lane này KHÔNG tính là "đã có lịch" ở lane kia.
async function findEmptySlots(userId, dateStrs, channel, slots) {
  const resp = await supabaseAdmin(
    `calendar_entries?user_id=eq.${userId}&channel=eq.${channel}&scheduled_date=in.(${dateStrs.join(',')})&select=scheduled_date,slot`
  );
  const existing = resp.ok ? await resp.json() : [];
  const taken = new Set(existing.map((e) => `${e.scheduled_date}:${e.slot}`));
  const empty = [];
  for (const dateStr of dateStrs) {
    for (const slot of slots) {
      if (!taken.has(`${dateStr}:${slot}`)) empty.push({ dateStr, slot });
    }
  }
  return empty;
}

// Dùng chung cho CẢ 2 luồng viết bài (paraphrase từ hook/content VÀ viết từ ảnh case study) — lượt
// EXTRAS (hashtag/cmt_cta_san_pham), lưu posts + calendar_entries đều giống hệt nhau, chỉ khác nguồn
// `core` (từ đâu ra tieu_de/hook/van_de/...) và cách có được ảnh (imageDataBase64).
async function writeExtrasAndSave({
  apiKey, positioning, core, channelHandle, brandName, product, group,
  userId, tags, sourceTable, sourceId, imageDataBase64, slotInfo, slotTime, channel, formatConstraint,
}) {
  const bodyText = assemblePost(core);

  // Kế thừa trục nội dung từ nguồn (hook/content/case study) nếu có. Nếu KHÔNG có (nguồn chưa từng
  // được phân loại) — để AI tự phân loại ngay, y hệt cách viet-content.js làm khi lưu bài viết tay —
  // tránh bài tự-viết nào cũng rơi vào "Chưa phân loại" trong Kho Content (phản hồi chị Quỳnh 2026-08-28).
  let finalTags = Array.isArray(tags) && tags.length ? tags : null;
  if (!finalTags) {
    try {
      const classified = await callClaude({
        apiKey, system: TEXT_CLASSIFY_SYSTEM_PROMPT, tool: TOOL_PHAN_LOAI_TRUC,
        userContent: `TIÊU ĐỀ: ${core.tieu_de || '(không có)'}\nNỘI DUNG:\n${bodyText.slice(0, 3000)}`,
      });
      if (classified && classified.truc) finalTags = [classified.truc];
    } catch (e) { /* không phân loại được (vd lỗi mạng) — vẫn lưu bài, chỉ để trống trục */ }
  }

  const extras = await callClaude({
    apiKey, system: EXTRAS_SYSTEM_PROMPT, tool: TOOL_POST_EXTRAS,
    userContent: `${contextBlockOf(positioning, null)}

BÀI VIẾT ĐÃ HOÀN CHỈNH:\n${bodyText}

${extraFieldsBlock({
      channel_handle: channelHandle, brand_name: brandName,
      product_name: product && product.label, product_url: product && product.url, product_cta_mau: product && product.cta_mau,
      group_name: group && group.label, group_url: group && group.url, group_cta_mau: group && group.cta_mau,
    })}
${formatConstraint ? `\n${formatConstraint}\n` : ''}
Hãy xuất hashtag, gợi ý hình ảnh, dạng content phù hợp và caption gợi ý cho đúng bài này.`,
  });
  const hashtags = Array.isArray(extras.hashtag) ? extras.hashtag.map(stripDiacritics).filter(Boolean) : [];
  const content = hashtags.length ? `${bodyText}\n\n${hashtags.map((h) => `#${h}`).join(' ')}` : bodyText;

  const postResp = await supabaseAdmin('posts', {
    method: 'POST',
    body: JSON.stringify({
      user_id: userId,
      title: core.tieu_de,
      content,
      structure: {
        hook: core.hook, van_de: core.van_de, gia_tri: core.gia_tri, niem_tin: core.niem_tin,
        cta: core.cta, tu_khoa_cta: core.tu_khoa_cta, cau_cmt_ghim: core.cau_cmt_ghim,
        hashtag: hashtags, format: extras.dinh_dang_de_xuat,
        cmt_cta_san_pham: Array.isArray(extras.cmt_cta_san_pham) ? extras.cmt_cta_san_pham : [],
      },
      tags: finalTags,
      source_table: sourceTable || null,
      source_id: sourceId || null,
      image_data: imageDataBase64 || null,
    }),
  });
  if (!postResp.ok) throw new Error(`Lưu bài thất bại: ${await postResp.text()}`);
  const [post] = await postResp.json();

  // auto_publish_fb: chỉ true cho lane Fanpage (tự đăng thật lên Facebook đúng giờ, không cần chị
  // tick tay, chốt 2026-08-28) — lane Cá nhân không có khái niệm tự đăng (Facebook không cho app
  // đăng hộ trang cá nhân), luôn false. Checkbox "Tự động đăng lên Fanpage" ở Lịch Đăng Bài vẫn còn
  // để chị tự tắt riêng 1 bài Fanpage nào đó nếu không muốn nó tự đăng.
  await supabaseAdmin('calendar_entries', {
    method: 'POST',
    body: JSON.stringify({
      user_id: userId, post_id: post.id, scheduled_date: slotInfo.dateStr, slot: slotInfo.slot,
      channel,
      scheduled_time: slotTime, title: core.tieu_de, cta: core.cta, posted: false, auto_publish_fb: channel === 'fanpage',
    }),
  });

  return { date: slotInfo.dateStr, slot: slotInfo.slot, post_id: post.id, title: core.tieu_de };
}

async function fillOneSlot({ userId, positioning, slotInfo, candidate, slotTime, apiKey, product, group, channelHandle, brandName, channel, formatConstraint, recentTitles, customInstructions }) {
  // "Lấy từ kho viral nhưng tự bịa tiêu đề còn gì??" (chị Quỳnh 2026-08-30) — trước đây LUÔN cho phép
  // AI tự đặt tiêu đề mới "tham khảo tinh thần" tiêu đề gốc, kể cả khi nguồn là 1 bài Kho Content đã
  // có sẵn tiêu đề THẬT (đã viral/kiểm chứng) — giờ BẮT BUỘC giữ nguyên tiêu đề đó, không tự sáng tác
  // tiêu đề khác. Riêng nguồn từ Kho Hook (hooks_bank_*) thì candidate.title thực chất là category
  // ('viral'/'uy_tin', xem loadCandidatePool()) chứ KHÔNG PHẢI tiêu đề thật — vẫn để AI tự đặt tiêu đề
  // như cũ, ép giữ category làm tiêu đề sẽ ra bài lỗi (tiêu đề bài viết thành chữ "viral").
  const isHookSource = candidate.table === 'hooks_bank_personal' || candidate.table === 'hooks_bank_shared';
  const hasRealTitle = (candidate.table === 'content_bank_personal' || candidate.table === 'content_bank_shared') && candidate.title && candidate.title.trim();
  const titleLine = hasRealTitle
    ? `TIÊU ĐỀ (BẮT BUỘC GIỮ NGUYÊN Y HỆT — đây là tiêu đề đã viral/kiểm chứng hiệu quả, KHÔNG được tự đặt tiêu đề khác dù nghĩ ra hay hơn): ${candidate.title.trim()}`
    : `TIÊU ĐỀ: (không có tiêu đề gốc — tự đặt 1 tiêu đề mới khớp đúng hook/nội dung bên dưới)`;
  // "các bài ko hề lấy hook chuẩn trong kho, cứ tự chế thôi" (chị Quỳnh 2026-08-31) — ĐÚNG, bug thật:
  // khi nguồn là 1 HOOK (hooks_bank_*, chỉ 1 câu/đoạn ngắn, KHÔNG có thân bài), prompt cũ vẫn nói
  // chung chung "BÀI GỐC TỪ KHO CONTENT... các đoạn còn lại paraphrase" — nhưng hook không CÓ "các
  // đoạn còn lại" để paraphrase, nên AI hiểu lầm thành "cứ lấy cảm hứng rồi tự viết mới", kể cả câu
  // hook cũng bị viết lại/tự chế thay vì giữ NGUYÊN VĂN. Giờ tách 2 trường hợp rõ ràng: hook thật (chỉ
  // 1 câu, PHẢI giữ y hệt, viết THÊM phần sau) khác hẳn content thật (cả bài, hook nằm bên trong, giữ
  // nguyên cấu trúc + paraphrase phần còn lại).
  const sourceBlock = isHookSource
    ? `HOOK GỐC (BẮT BUỘC dùng NGUYÊN VĂN đúng câu này làm câu hook mở đầu — TUYỆT ĐỐI KHÔNG paraphrase/đổi câu chữ/tự chế câu khác dù chỉ 1 chữ, đây là hook đã kiểm chứng hiệu quả thật):
${candidate.text.trim()}

Hook đã có sẵn ở trên — nhiệm vụ của bạn là viết TIẾP phần còn lại của bài (vấn đề, giá trị, niềm tin) ăn khớp với đúng hook này, theo giọng định vị và câu chuyện của người dùng. KHÔNG viết lại hook, chỉ viết phần SAU hook.`
    : `BÀI GỐC TỪ KHO CONTENT (giữ nguyên cấu trúc/trình tự từng đoạn, chỉ giữ y hệt câu hook — các đoạn còn lại paraphrase lại câu chữ, không copy nguyên văn):
${candidate.text.trim()}`;
  const core = await callClaude({
    apiKey, system: KHO_GOC_SYSTEM_PROMPT, tool: TOOL_POST_KHO_GOC,
    userContent: `${contextBlockOf(positioning, null)}

${titleLine}

${sourceBlock}

CÂU CHUYỆN/TRẢI NGHIỆM RIÊNG CỦA NGƯỜI DÙNG (lấy chi tiết thật, diễn đạt lại bằng câu từ khác, lồng xuyên suốt thân bài): (không cung cấp — viết lại thân bài theo giọng định vị, không tự bịa câu chuyện)

${extraFieldsBlock({ channel_handle: channelHandle, brand_name: brandName, product_name: product && product.label })}
${productCtaBlock(product)}${recentTitlesBlock(recentTitles)}${customInstructionsBlock(customInstructions)}
${isHookSource
      ? 'Hãy viết bài dựa trên đúng hook trên, theo đúng nguyên tắc đã nêu — giữ nguyên văn hook, viết mới phần còn lại.'
      : 'Hãy viết lại bài này theo đúng nguyên tắc đã nêu — giữ nguyên cấu trúc/trình tự và câu hook, viết lại ít nhất 70% câu chữ ở các đoạn còn lại bằng giọng và câu chuyện của người dùng.'}`,
  });

  // KHÔNG gán image_data ở đây — case study (ảnh thật) chỉ dùng qua fillCaseStudySlot() riêng, luôn
  // ghép cùng ảnh cá nhân (theo yêu cầu chị Quỳnh 2026-08-28, không đăng ảnh case study trần trụi
  // nữa). Luồng hook/content này để trống ảnh, auto-publish-fb.js tự tạo ảnh AI lúc đăng nếu có
  // OPENAI_API_KEY.
  return writeExtrasAndSave({
    apiKey, positioning, core, channelHandle, brandName, product, group,
    userId, tags: candidate.tags, sourceTable: candidate.table, sourceId: candidate.id,
    imageDataBase64: null, slotInfo, slotTime, channel, formatConstraint,
  });
}

// Viết bài TỪ 1 ảnh case study (vision), tuỳ chọn ghép thêm ảnh cá nhân làm nền (chỉ Fanpage —
// personalPhoto truyền null thì bỏ qua hẳn bước ghép ảnh, dùng cho lane Cá nhân vốn không cần ảnh do
// hệ thống tạo, chị tự đăng tay). Không có "nguồn hook/content" nên source_table/source_id để trống.
async function fillCaseStudySlot({ userId, positioning, slotInfo, caseStudy, personalPhoto, slotTime, apiKey, product, group, channelHandle, brandName, channel, formatConstraint, recentTitles, customInstructions }) {
  const core = await callClaude({
    apiKey, system: SYSTEM_PROMPT_CASE_STUDY, tool: TOOL_POST_CORE,
    userContent: [
      { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: stripDataUrlPrefix(caseStudy.image) } },
      {
        type: 'text',
        text: `${contextBlockOf(positioning, null)}

${extraFieldsBlock({ channel_handle: channelHandle, brand_name: brandName, product_name: product && product.label })}
${productCtaBlock(product)}${recentTitlesBlock(recentTitles)}${customInstructionsBlock(customInstructions)}
Hãy viết bài dựa trên đúng ảnh case study vừa xem, theo đúng nguyên tắc đã nêu.`,
      },
    ],
  });

  // sourceTable/sourceId = 'case_studies'/caseStudy.id (2026-08-30, trước đây để null) — BẮT BUỘC để
  // usedRefs (đọc từ posts.source_table/source_id) nhận diện đúng ảnh case study nào đã dùng rồi,
  // phục vụ pickUnusedCaseStudy() không lặp lại ảnh cũ.
  const result = await writeExtrasAndSave({
    apiKey, positioning, core, channelHandle, brandName, product, group,
    userId, tags: caseStudy.tags, sourceTable: 'case_studies', sourceId: caseStudy.id,
    imageDataBase64: null, slotInfo, slotTime, channel, formatConstraint,
  });

  // Ghép ảnh SAU khi đã lưu bài (composite tốn thời gian, không cần chặn việc lưu bài chính) — lỗi ở
  // bước ghép ảnh không làm fail cả lượt lấp lịch, chỉ để bài đó không có ảnh (auto-publish-fb.js sẽ
  // tự rơi về ảnh AI hoặc bỏ qua đăng theo đúng quy tắc "không đăng bài chữ trần"). Bỏ qua hẳn nếu
  // không có personalPhoto (lane Cá nhân, xem ghi chú ở chữ ký hàm).
  // 2 BƯỚC (2026-08-31, theo yêu cầu chị Quỳnh: "sau khi ghép ảnh thì cho vào mục tạo ảnh có sẵn...
  // chọn lấy 1 loại trong 4 loại phù hợp xong cho xuất từ đó chứ đừng để ai viết chữ") — (1) ghép ảnh
  // nền (cá nhân + card case study, KHÔNG chữ), (2) đưa qua renderPersonalTemplateImage() — đúng hệ 4
  // mẫu của Tạo Ảnh Thương Hiệu — để đè tiêu đề, chỉ chọn trong các mẫu KHÔNG đè lên góc đã đặt card
  // (safeLayoutsForCorner). Trước đây dùng riêng 1 kiểu applyTitleBar(), giờ nhất quán với ảnh cá nhân
  // thường.
  if (personalPhoto) {
    try {
      const baseImage = await compositeCaseStudyImage({
        cardCorner: personalPhoto.card_corner,
        personalImageBuffer: Buffer.from(stripDataUrlPrefix(personalPhoto.image), 'base64'),
        caseStudyImageBuffer: Buffer.from(stripDataUrlPrefix(caseStudy.image), 'base64'),
      });
      const image = await renderPersonalTemplateImage({
        photoBuffer: baseImage, title: core.tieu_de, handle: channelHandle,
        allowedLayouts: safeLayoutsForCorner(personalPhoto.card_corner),
      });
      await supabaseAdmin(`posts?id=eq.${result.post_id}`, {
        method: 'PATCH', prefer: 'return=minimal',
        body: JSON.stringify({ image_data: image.toString('base64') }),
      });
    } catch (e) { /* không ghép được ảnh — bài vẫn đã lưu, chỉ thiếu ảnh, xử lý tiếp ở auto-publish-fb.js */ }
  }

  return result;
}

// Viết bài từ 1 quote/châm ngòn hoàn chỉnh (2026-08-31, "buổi trưa xen kẽ câu quote với case study")
// — sourceTable/sourceId trỏ thẳng về đúng bảng chứa quote (hooks_bank_personal/shared, xem
// candidate.table ở loadCandidatePool()) để usedRefs nhận diện đúng, phục vụ pickUnusedQuote() không
// lặp lại quote cũ, giống hệt cơ chế pickUnusedCaseStudy().
async function fillQuoteSlot({ userId, positioning, slotInfo, quote, slotTime, apiKey, product, group, channelHandle, brandName, channel, formatConstraint, recentTitles, customInstructions }) {
  const core = await callClaude({
    apiKey, system: SYSTEM_PROMPT_QUOTE, tool: TOOL_POST_CORE,
    userContent: `${contextBlockOf(positioning, null)}

QUOTE GỐC (GIỮ NGUYÊN VĂN, không paraphrase câu quote này — chỉ viết thêm phần cảm nhận/góc nhìn ngắn xung quanh, xem đúng nguyên tắc đã nêu):
${quote.text.trim()}

${extraFieldsBlock({ channel_handle: channelHandle, brand_name: brandName, product_name: product && product.label })}
${productCtaBlock(product)}${recentTitlesBlock(recentTitles)}${customInstructionsBlock(customInstructions)}
Hãy viết bài dựa trên đúng quote trên, theo đúng nguyên tắc đã nêu.`,
  });

  return writeExtrasAndSave({
    apiKey, positioning, core, channelHandle, brandName, product, group,
    userId, tags: quote.tags, sourceTable: quote.table, sourceId: quote.id,
    imageDataBase64: null, slotInfo, slotTime, channel, formatConstraint,
  });
}

// Nhận thẳng danh sách slotInfos CẦN LẤP (đã biết trước, không tự tính "ô nào đang trống") — tách
// riêng khỏi autoFillForAdmin() để dùng lại được cho cả cron (tự tìm ô trống, giới hạn an toàn
// MAX_FILL_PER_RUN) LẪN api/regen-fanpage-week.js (admin chủ động chọn nguyên 1 tuần, xoá rồi viết
// lại từ đầu — không qua findEmptySlots vì lúc đó các ô đã bị xoá sạch, không còn gì để "tìm trống").
async function fillSlotsForAdmin(admin, apiKey, slotInfos) {
  const [posResp, profResp, poolCandidates, assetsResp, caseStudiesResp, personalPhotosResp] = await Promise.all([
    supabaseAdmin(`positioning_results?user_id=eq.${admin.id}&select=luot1,luot2&limit=1`),
    supabaseAdmin(`profiles?id=eq.${admin.id}&select=slot_time_sang,slot_time_trua,slot_time_toi,channel_handle,brand_name`),
    loadCandidatePool(admin.id),
    // promo_assets: kho sản phẩm/dịch vụ/group chị Quỳnh đã tự lưu ở Định Vị (label/url/cta_mau) —
    // dùng để CTA trong bài trỏ đúng sản phẩm thật, không để AI tự bịa (theo yêu cầu chị Quỳnh
    // 2026-08-27). Group phân biệt bằng kind='cong_dong', còn lại coi là sản phẩm/dịch vụ.
    supabaseAdmin(`promo_assets?user_id=eq.${admin.id}&select=id,label,url,kind,cta_mau&order=created_at.asc`),
    // case_studies + personal_photos: 2 kho ảnh riêng (xem schema_full.sql) — có ĐỦ CẢ 2 mới ưu tiên
    // viết bài case study bằng vision + ghép ảnh (fillCaseStudySlot), theo yêu cầu chị Quỳnh
    // 2026-08-28 (không đăng ảnh case study trần trụi nữa).
    supabaseAdmin(`case_studies?user_id=eq.${admin.id}&select=id,image,tags`),
    supabaseAdmin(`personal_photos?user_id=eq.${admin.id}&select=id,image,card_corner`),
  ]);
  const posRows = posResp.ok ? await posResp.json() : [];
  const positioning = posRows[0] && posRows[0].luot1 ? posRows[0] : null;
  if (!positioning) return { filled: [], skipped_no_positioning: true };
  const truc = await classifyUserPillar(apiKey, positioning);
  const poolFiltered = filterPoolByPillar(poolCandidates, truc);

  const profRows = profResp.ok ? await profResp.json() : [];
  const profile = profRows[0] || {};

  const assets = assetsResp.ok ? await assetsResp.json() : [];
  const products = assets.filter((a) => a.kind !== 'cong_dong');
  const groups = assets.filter((a) => a.kind === 'cong_dong');

  const caseStudies = caseStudiesResp.ok ? await caseStudiesResp.json() : [];
  const personalPhotos = personalPhotosResp.ok ? await personalPhotosResp.json() : [];

  const postsResp = await supabaseAdmin(`posts?user_id=eq.${admin.id}&select=source_table,source_id`);
  const postsRows = postsResp.ok ? await postsResp.json() : [];
  const usedRefs = postsRows
    .filter((p) => p.source_table && p.source_id)
    .map((p) => ({ table: p.source_table, id: p.source_id }));

  const filled = [];
  const skippedNoCandidate = [];
  const recentTitles = []; // cộng dồn tiêu đề đã viết trong đợt này, feed vào lượt sau để né lặp mô-típ
  for (const slotInfo of slotInfos) {
    const slotTime = profile['slot_time_' + slotInfo.slot] || DEFAULT_SLOT_TIME[slotInfo.slot];
    // Chọn ngẫu nhiên 1 group mỗi lần lấp (không có văn bản nguồn để so khớp trước như sản phẩm bên
    // dưới — cứ tạm random, qua nhiều lượt chạy sẽ tự dàn đều). Sản phẩm giờ chọn theo TỪNG NHÁNH bên
    // dưới, so khớp với đúng nội dung sắp viết (pickMatchingProduct) — "sản phẩm là tùy bài đó nói về
    // cái j thì chọn sản phẩm đó chứ sao lung tung đc" (chị Quỳnh 2026-08-31, trước đây random tuyệt
    // đối, không liên quan chủ đề bài).
    const group = groups.length ? groups[Math.floor(Math.random() * groups.length)] : null;
    // Trộn nội dung thay vì luôn ưu tiên tuyệt đối case study khi có đủ ảnh (phản hồi chị Quỳnh
    // 2026-08-28: có nhiều ảnh trong kho khiến MỌI bài đều rơi vào case study, mất đa dạng nội dung).
    // CASE_STUDY_RATIO=0.3: ~30% số bài là case study (bán hàng/bằng chứng), 70% còn lại là hook/
    // content thường (giá trị/giáo dục) — tránh cảm giác ngày nào cũng chốt sale. Vẫn có fallback 2
    // chiều: hết hook/content chưa dùng thì dùng case study thay, hết ảnh case study CHƯA DÙNG thì
    // dùng hook/content thay — chỉ thật sự bỏ qua khi CẢ 2 nguồn đều cạn. Case study không bao giờ
    // lặp lại ảnh cũ (pickUnusedCaseStudy) — theo yêu cầu chị Quỳnh 2026-08-30.
    const hasCaseStudyAssets = caseStudies.length > 0 && personalPhotos.length > 0;
    const preferCaseStudy = hasCaseStudyAssets && Math.random() < CASE_STUDY_RATIO;
    try {
      const preferredCaseStudy = preferCaseStudy ? pickUnusedCaseStudy(caseStudies, usedRefs) : null;
      if (preferredCaseStudy) {
        // Case study không có văn bản nguồn trước (chỉ ảnh, AI mới biết nội dung SAU khi viết) — vẫn
        // random sản phẩm ở đây, không có gì để so khớp trước.
        const product = products.length ? products[Math.floor(Math.random() * products.length)] : null;
        const personalPhoto = personalPhotos[Math.floor(Math.random() * personalPhotos.length)];
        usedRefs.push({ table: 'case_studies', id: preferredCaseStudy.id });
        const result = await fillCaseStudySlot({
          userId: admin.id, positioning, slotInfo, caseStudy: preferredCaseStudy, personalPhoto, slotTime, apiKey, product, group,
          channelHandle: profile.channel_handle, brandName: profile.brand_name,
          channel: 'fanpage', formatConstraint: null, recentTitles,
        });
        filled.push(result); recentTitles.push(result.title);
        continue;
      }
      const candidate = pickUnusedCandidate(poolFiltered, usedRefs, false);
      if (!candidate) {
        // Kho hook/content không còn ứng viên nào — dùng case study CHƯA DÙNG thay thế nếu có, còn
        // hơn bỏ qua cả lượt chỉ vì kho hook/content tạm cạn. Hết cả 2 mới thật sự bỏ trống ô.
        const fallbackCaseStudy = pickUnusedCaseStudy(caseStudies, usedRefs);
        if (fallbackCaseStudy && personalPhotos.length) {
          const product = products.length ? products[Math.floor(Math.random() * products.length)] : null;
          const personalPhoto = personalPhotos[Math.floor(Math.random() * personalPhotos.length)];
          usedRefs.push({ table: 'case_studies', id: fallbackCaseStudy.id });
          const result = await fillCaseStudySlot({
            userId: admin.id, positioning, slotInfo, caseStudy: fallbackCaseStudy, personalPhoto, slotTime, apiKey, product, group,
            channelHandle: profile.channel_handle, brandName: profile.brand_name,
            channel: 'fanpage', formatConstraint: null, recentTitles,
          });
          filled.push(result); recentTitles.push(result.title);
          continue;
        }
        skippedNoCandidate.push(slotInfo); continue;
      }
      usedRefs.push({ table: candidate.table, id: candidate.id }); // không chọn trùng trong cùng lượt chạy
      const product = pickMatchingProduct(products, candidate.text);
      const result = await fillOneSlot({
        userId: admin.id, positioning, slotInfo, candidate, slotTime, apiKey, product, group,
        channelHandle: profile.channel_handle, brandName: profile.brand_name,
        channel: 'fanpage', formatConstraint: null, recentTitles,
      });
      filled.push(result); recentTitles.push(result.title);
    } catch (e) {
      skippedNoCandidate.push({ ...slotInfo, error: e.message });
    }
  }

  return { filled, skipped_no_candidate: skippedNoCandidate };
}

async function autoFillForAdmin(admin, apiKey) {
  const dateStrs = Array.from({ length: isVnSunday() ? SUNDAY_LOOKAHEAD_DAYS : LOOKAHEAD_DAYS }, (_, i) => vnDateStr(i));
  const emptySlots = await findEmptySlots(admin.id, dateStrs, 'fanpage', [FANPAGE_DAILY_SLOT]);
  const toFill = emptySlots.slice(0, MAX_FILL_PER_RUN);
  const skippedCap = Math.max(0, emptySlots.length - MAX_FILL_PER_RUN);
  const result = await fillSlotsForAdmin(admin, apiKey, toFill);
  return { ...result, skipped_cap: skippedCap };
}

// Phase 9 (2026-08-29) — lane Cá nhân: tự viết + tự xếp 3 bài/ngày (Sáng/Trưa/Tối), KHÔNG tự đăng
// (Facebook không cho app đăng hộ trang cá nhân — chị Quỳnh tự đăng tay). Mỗi buổi khoá 1 kiểu dạng
// content cố định theo yêu cầu chị Quỳnh: Tối luôn "Video Ngồi Nói", Trưa XEN KẼ case study/quote
// (2026-08-31), Sáng là bài thường (hook/content) miễn không phải "Video Ngồi Nói" (dạng đó dành
// riêng buổi tối).
async function autoFillPersonalForAdmin(admin, apiKey) {
  const [posResp, profResp, poolCandidates, assetsResp, caseStudiesResp, personalPhotosResp] = await Promise.all([
    supabaseAdmin(`positioning_results?user_id=eq.${admin.id}&select=luot1,luot2&limit=1`),
    supabaseAdmin(`profiles?id=eq.${admin.id}&select=slot_time_sang,slot_time_trua,slot_time_toi,channel_handle,brand_name`),
    loadCandidatePool(admin.id),
    supabaseAdmin(`promo_assets?user_id=eq.${admin.id}&select=id,label,url,kind,cta_mau&order=created_at.asc`),
    supabaseAdmin(`case_studies?user_id=eq.${admin.id}&select=id,image,tags`),
    // personal_photos (2026-08-30, trước đây không tải ở đây) — trước đó lane Cá nhân luôn truyền
    // personalPhoto:null vào fillCaseStudySlot() nên KHÔNG BAO GIỜ có ảnh ghép, theo đúng thiết kế cũ
    // "chị tự đăng tay nên tự gắn ảnh" — nhưng chị Quỳnh phản hồi 2026-08-30 "ko thấy hình ở case
    // study" nghĩa là chị MUỐN thấy ảnh ngay trong app trước khi tự đăng tay, nên giờ ghép luôn.
    supabaseAdmin(`personal_photos?user_id=eq.${admin.id}&select=id,image,card_corner`),
  ]);
  const posRows = posResp.ok ? await posResp.json() : [];
  const positioning = posRows[0] && posRows[0].luot1 ? posRows[0] : null;
  if (!positioning) return { filled: [], skipped_no_positioning: true };
  const truc = await classifyUserPillar(apiKey, positioning);
  const poolFiltered = filterPoolByPillar(poolCandidates, truc);

  const profRows = profResp.ok ? await profResp.json() : [];
  const profile = profRows[0] || {};

  const assets = assetsResp.ok ? await assetsResp.json() : [];
  const products = assets.filter((a) => a.kind !== 'cong_dong');
  const groups = assets.filter((a) => a.kind === 'cong_dong');

  const caseStudies = caseStudiesResp.ok ? await caseStudiesResp.json() : [];
  const personalPhotos = personalPhotosResp.ok ? await personalPhotosResp.json() : [];

  const postsResp = await supabaseAdmin(`posts?user_id=eq.${admin.id}&select=source_table,source_id`);
  const postsRows = postsResp.ok ? await postsResp.json() : [];
  const usedRefs = postsRows
    .filter((p) => p.source_table && p.source_id)
    .map((p) => ({ table: p.source_table, id: p.source_id }));

  const dateStrs = Array.from({ length: isVnSunday() ? SUNDAY_LOOKAHEAD_DAYS : LOOKAHEAD_DAYS }, (_, i) => vnDateStr(i));
  const emptySlots = await findEmptySlots(admin.id, dateStrs, 'ca_nhan', PERSONAL_SLOTS);
  const toFill = emptySlots.slice(0, MAX_FILL_PER_RUN_PERSONAL);
  const skippedCap = Math.max(0, emptySlots.length - MAX_FILL_PER_RUN_PERSONAL);

  // Chữ ký "@tenkhongdau" y hệt cách hiển thị khi tự đăng lên Fanpage (xem auto-publish-fb.js) — dùng
  // cho ảnh tự tạo bên dưới, dù lane Cá nhân không tự đăng thật, vẫn giữ đồng bộ hình thức 1 kiểu.
  const rawHandle = profile.brand_name || profile.channel_handle || '';
  const handle = rawHandle ? `@${stripDiacritics(rawHandle).toLowerCase()}` : '';
  // "phần cá nhân thêm các phần y hệt như fanpage trừ cái đăng tự động" (chị Quỳnh 2026-09-01) — trước
  // đây CHỈ case study (fillCaseStudySlot tự ghép ảnh) có ảnh sẵn trong app, bài thường (Sáng/Tối) và
  // quote (Trưa) lưu KHÔNG ảnh, chị phải tự tìm/gắn ảnh khi đăng tay. Giờ áp DÙNG CHUNG đúng thứ tự ưu
  // tiên nguồn ảnh của Fanpage (autoPickAndRenderImage — xem image-gen.js): tâm linh → ảnh cá nhân thật
  // → ảnh AI chung, đè 1 trong 4 mẫu — chỉ khác là ghép NGAY lúc lấp lịch (không có bước "đăng" để hoãn
  // tới lúc đó như Fanpage). Lỗi ghép ảnh không làm fail cả lượt lấp lịch, chỉ để bài đó thiếu ảnh.
  async function attachAutoImage(result, tags) {
    try {
      const image = await autoPickAndRenderImage({ title: result.title, handle, tags, personalPhotos });
      if (image) {
        await supabaseAdmin(`posts?id=eq.${result.post_id}`, {
          method: 'PATCH', prefer: 'return=minimal',
          body: JSON.stringify({ image_data: image.toString('base64') }),
        });
      }
    } catch (e) { /* không ghép được ảnh — bài vẫn đã lưu, chỉ thiếu ảnh, chị tự thêm tay khi đăng */ }
  }

  const filled = [];
  const skippedNoCandidate = [];
  const recentTitles = []; // cộng dồn tiêu đề đã viết trong đợt này, feed vào lượt sau để né lặp mô-típ
  for (const slotInfo of toFill) {
    const slotTime = profile['slot_time_' + slotInfo.slot] || DEFAULT_SLOT_TIME[slotInfo.slot];
    // Sản phẩm chọn theo TỪNG NHÁNH bên dưới, so khớp đúng văn bản nguồn sắp viết (pickMatchingProduct)
    // — "sản phẩm là tùy bài đó nói về cái j thì chọn sản phẩm đó chứ sao lung tung đc" (chị Quỳnh
    // 2026-08-31, trước đây random tuyệt đối trước khi biết bài viết về gì).
    const group = groups.length ? groups[Math.floor(Math.random() * groups.length)] : null;
    try {
      if (slotInfo.slot === 'toi') {
        // 100% từ kho hook/content viral (KHÔNG bao giờ AI tự bịa mới) — pickUnusedCandidate() chỉ
        // chọn trong poolCandidates (hooks_bank_*/content_bank_*), không có nguồn nào khác ở đây.
        const candidate = pickUnusedCandidate(poolFiltered, usedRefs, false);
        if (!candidate) { skippedNoCandidate.push(slotInfo); continue; }
        usedRefs.push({ table: candidate.table, id: candidate.id });
        const product = pickMatchingProduct(products, candidate.text);
        const result = await fillOneSlot({
          userId: admin.id, positioning, slotInfo, candidate, slotTime, apiKey, product, group,
          channelHandle: profile.channel_handle, brandName: profile.brand_name,
          channel: 'ca_nhan', formatConstraint: FORCE_NGOI_NOI, recentTitles,
        });
        await attachAutoImage(result, candidate.tags);
        filled.push(result); recentTitles.push(result.title);
        continue;
      }
      if (slotInfo.slot === 'trua') {
        // "phần case study buổi trưa thì xen kẽ câu quote với case study" (chị Quỳnh 2026-08-31) —
        // random 50/50 ưu tiên quote hay case study trước, rơi sang loại còn lại nếu loại ưu tiên đã
        // hết CHƯA DÙNG — chỉ thật sự để TRỐNG ô khi CẢ 2 đều cạn (giữ đúng nguyên tắc "hết thì để
        // trống, ko tự điền" đã chốt 2026-08-30, không âm thầm rơi về bài thường).
        const preferQuote = Math.random() < 0.5;
        const tryQuote = () => { const quote = pickUnusedQuote(poolFiltered, usedRefs); return quote ? { type: 'quote', quote } : null; };
        const tryCaseStudy = () => { const caseStudy = pickUnusedCaseStudy(caseStudies, usedRefs); return caseStudy ? { type: 'case_study', caseStudy } : null; };
        const picked = preferQuote ? (tryQuote() || tryCaseStudy()) : (tryCaseStudy() || tryQuote());
        if (!picked) { skippedNoCandidate.push(slotInfo); continue; }
        let result;
        if (picked.type === 'quote') {
          usedRefs.push({ table: picked.quote.table, id: picked.quote.id });
          const product = pickMatchingProduct(products, picked.quote.text);
          result = await fillQuoteSlot({
            userId: admin.id, positioning, slotInfo, quote: picked.quote, slotTime, apiKey, product, group,
            channelHandle: profile.channel_handle, brandName: profile.brand_name,
            channel: 'ca_nhan', formatConstraint: EXCLUDE_NGOI_NOI, recentTitles,
          });
          await attachAutoImage(result, picked.quote.tags);
        } else {
          // Case study không có văn bản nguồn trước (chỉ ảnh) — vẫn random sản phẩm, không có gì để
          // so khớp trước khi AI viết xong.
          const product = products.length ? products[Math.floor(Math.random() * products.length)] : null;
          const personalPhoto = personalPhotos.length ? personalPhotos[Math.floor(Math.random() * personalPhotos.length)] : null;
          usedRefs.push({ table: 'case_studies', id: picked.caseStudy.id });
          result = await fillCaseStudySlot({
            userId: admin.id, positioning, slotInfo, caseStudy: picked.caseStudy, personalPhoto, slotTime, apiKey, product, group,
            channelHandle: profile.channel_handle, brandName: profile.brand_name,
            channel: 'ca_nhan', formatConstraint: EXCLUDE_NGOI_NOI, recentTitles,
          });
        }
        filled.push(result); recentTitles.push(result.title);
        continue;
      }
      // Buổi sáng — bài thường từ hook/content.
      const candidate = pickUnusedCandidate(poolFiltered, usedRefs, false);
      if (!candidate) { skippedNoCandidate.push(slotInfo); continue; }
      usedRefs.push({ table: candidate.table, id: candidate.id });
      const product = pickMatchingProduct(products, candidate.text);
      const result = await fillOneSlot({
        userId: admin.id, positioning, slotInfo, candidate, slotTime, apiKey, product, group,
        channelHandle: profile.channel_handle, brandName: profile.brand_name,
        channel: 'ca_nhan', formatConstraint: EXCLUDE_NGOI_NOI, recentTitles,
      });
      await attachAutoImage(result, candidate.tags);
      filled.push(result); recentTitles.push(result.title);
    } catch (e) {
      skippedNoCandidate.push({ ...slotInfo, error: e.message });
    }
  }

  return { filled, skipped_cap: skippedCap, skipped_no_candidate: skippedNoCandidate };
}

module.exports = async (req, res) => {
  // Vercel Cron tự thêm header này khi biến môi trường CRON_SECRET được cấu hình — chặn người ngoài
  // gọi thẳng URL này để sinh bài/tốn phí AI tuỳ ý.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers['authorization'] || '';
    if (auth !== `Bearer ${secret}`) { res.status(401).json({ error: 'unauthorized' }); return; }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(200).json({ ok: false, reason: 'ANTHROPIC_API_KEY chưa được cấu hình.' }); return; }

  try {
    const adminsResp = await supabaseAdmin('profiles?role=eq.admin&select=id');
    const admins = adminsResp.ok ? await adminsResp.json() : [];
    const results = {};
    for (const admin of admins) {
      results[admin.id] = {
        fanpage: await autoFillForAdmin(admin, apiKey),
        ca_nhan: await autoFillPersonalForAdmin(admin, apiKey),
      };
    }
    res.status(200).json({ ok: true, results });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};

// Export thêm để api/regen-fanpage-week.js tái dùng đúng logic viết bài (không copy lại) — Vercel vẫn
// gọi được file này như cũ (require(...)(req,res)) vì default export vẫn là 1 hàm, chỉ gắn thêm
// thuộc tính lên chính hàm đó.
module.exports.fillSlotsForAdmin = fillSlotsForAdmin;
module.exports.vnDateStr = vnDateStr;
module.exports.FANPAGE_DAILY_SLOT = FANPAGE_DAILY_SLOT;
// Export thêm (2026-08-29) để api/auto-fill-week.js (nút "AI tự viết + xếp cả tuần" cho MỌI khách,
// khác hẳn cron này chỉ chạy cho admin) tái dùng đúng logic viết 1 bài từ 1 candidate (hook/content
// có sẵn) — fillOneSlot()/writeExtrasAndSave() vốn đã nhận userId tường minh (không hardcode admin),
// chỉ cần export thêm, không cần sửa gì bên trong.
module.exports.loadCandidatePool = loadCandidatePool;
module.exports.pickUnusedCandidate = pickUnusedCandidate;
module.exports.findEmptySlots = findEmptySlots;
module.exports.fillOneSlot = fillOneSlot;
module.exports.PERSONAL_SLOTS = PERSONAL_SLOTS;
module.exports.DEFAULT_SLOT_TIME = DEFAULT_SLOT_TIME;
// Export thêm (2026-08-31) để auto-fill-week.js chọn sản phẩm so khớp đúng nội dung sắp viết thay vì
// random tuyệt đối — xem pickMatchingProduct().
module.exports.pickMatchingProduct = pickMatchingProduct;
