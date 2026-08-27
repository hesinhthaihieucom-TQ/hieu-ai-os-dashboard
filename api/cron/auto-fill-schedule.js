// Cron job (xem "crons" trong vercel.json, chạy 1 lần/ngày sáng sớm giờ VN) — Phase 2 của auto-đăng
// Fanpage: tự động lấp các Ô LỊCH CÒN TRỐNG (chưa từng tạo trong Lịch Đăng Bài) của admin bằng 1 bài
// viết mới — viết từ 1 hook/content viral CHƯA DÙNG trong kho, kèm hashtag — rồi bật
// auto_publish_fb=true để api/cron/auto-publish-fb.js tự nhặt đúng giờ đăng lên Fanpage + tự cmt.
// Theo yêu cầu chị Quỳnh 2026-08-27: "tự động chọn 1 trong số các content hoặc hook viral để viết
// bài xong tự đăng đúng lịch kèm hashtag xong tự cmt".
//
// CHỈ chạy cho tài khoản admin (đúng chị Quỳnh, giống phạm vi Phase 1 — không phải tính năng cho
// khách hàng khác). Mỗi lần chạy tối đa lấp 3 ô (an toàn, tránh sinh hàng loạt nếu có lỗi) — ô nào
// bị bỏ qua do chạm giới hạn được ghi lại trong response, không im lặng bỏ qua. Chỉ lấp ô HOÀN TOÀN
// CHƯA CÓ GÌ (không có dòng calendar_entries nào) — ô chị Quỳnh đã tự xếp tay (dù chưa viết xong) thì
// không đụng vào.
const { supabaseAdmin } = require('../_lib/supabase-admin');
const { SYSTEM_PROMPT: KHO_GOC_SYSTEM_PROMPT, TOOL_POST_KHO_GOC } = require('../viet-tu-kho-goc');
const {
  TOOL_POST_CORE, TOOL_POST_EXTRAS, HASHTAG_CAPTION_RULES, CTA_COMMENT_RULES, ANTI_AI_CLICHE_RULES,
  assemblePost, stripDiacritics, contextBlockOf, extraFieldsBlock,
} = require('../_lib/post-schema');
const { FORMAT_GUIDE } = require('../_lib/formats');
const { compositeCaseStudyImage } = require('../_lib/image-gen');
const { TEXT_CLASSIFY_SYSTEM_PROMPT, TOOL_PHAN_LOAI_TRUC } = require('../_lib/pillars');

const MAX_FILL_PER_RUN = 3;
const LOOKAHEAD_DAYS = 3; // hôm nay + 2 ngày tới
// Chị Quỳnh chốt (2026-08-27): chỉ tự động 1 bài/ngày, không phải lấp cả 3 buổi — cố định buổi sáng
// cho bài tự-viết. Lưới lịch vẫn giữ nguyên 3 buổi, chị vẫn tự thêm tay buổi khác nếu muốn — chỉ
// riêng phần TỰ ĐỘNG lấp giới hạn còn 1 buổi/ngày.
const FANPAGE_DAILY_SLOT = 'sang';
// Phải khớp tay với default ở cột profiles.slot_time_* trong schema_full.sql, giống send-reminders.js.
const DEFAULT_SLOT_TIME = { sang: '08:00', trua: '12:00', toi: '19:00' };

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

Bạn được xem 1 ẢNH CASE STUDY/KẾT QUẢ THẬT — có thể là ảnh chụp màn hình số liệu, ảnh trước/sau, ảnh testimonial của khách hàng, hoặc bằng chứng kết quả khác của chính tác giả hoặc khách hàng của họ. NHIỆM VỤ: viết 1 bài đăng Facebook kể lại câu chuyện đằng sau kết quả trong ảnh này — giọng kể tự nhiên như chính tác giả đang chia sẻ thật, KHÔNG phải mô tả ảnh khô khan kiểu báo cáo.

QUAN TRỌNG — TRÁNH BỊA SỐ LIỆU: bạn không biết chi tiết chính xác đằng sau ảnh (tên khách hàng thật, ngày tháng chính xác...). CHỈ nhắc tới những gì THỰC SỰ NHÌN THẤY RÕ trong ảnh, diễn đạt khéo léo. Nếu ảnh có số liệu cụ thể nhìn rõ được, có thể nhắc lại đúng số đó; nếu không chắc/không nhìn rõ, nói chung chung theo CẢM XÚC/Ý NGHĨA của kết quả (ví dụ "nhìn con số này mà...") thay vì bịa ra số liệu không có trong ảnh.

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

function vnDateStr(offsetDays) {
  const vn = new Date(Date.now() + 7 * 3600 * 1000 + offsetDays * 86400000);
  return vn.toISOString().slice(0, 10);
}

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

// Y hệt usageCountFor()/sortUnusedFirst() ở nhan-hieu/js/kho-hook.js và kho-content.js — ưu tiên ứng
// viên CHƯA TỪNG được viết thành bài (posts.source_table/source_id), rơi về ứng viên đã dùng nếu hết
// ứng viên chưa dùng. usedRefs được cập nhật NGAY trong vòng lặp (không chỉ đọc 1 lần từ DB) để
// không chọn trùng 1 nguồn cho 2 ô trống khác nhau trong cùng 1 lượt chạy.
function pickUnusedCandidate(candidates, usedRefs) {
  const isUsed = (c) => usedRefs.some((r) => r.table === c.table && r.id === c.id);
  const unused = candidates.filter((c) => !isUsed(c));
  return (unused.length ? unused : candidates)[0] || null;
}

async function findEmptySlots(userId, dateStrs) {
  // channel=eq.fanpage: chỉ xét lane Fanpage — ô đã điền bên lane "ca_nhan" (kế hoạch FB cá nhân,
  // đăng thủ công) KHÔNG được tính là "đã có lịch" ở đây, 2 lane độc lập hoàn toàn (xem cột channel
  // ở schema_full.sql, thêm 2026-08-27 theo phản hồi chị Quỳnh).
  const resp = await supabaseAdmin(
    `calendar_entries?user_id=eq.${userId}&channel=eq.fanpage&scheduled_date=in.(${dateStrs.join(',')})&select=scheduled_date,slot`
  );
  const existing = resp.ok ? await resp.json() : [];
  const taken = new Set(existing.map((e) => `${e.scheduled_date}:${e.slot}`));
  const empty = [];
  for (const dateStr of dateStrs) {
    if (!taken.has(`${dateStr}:${FANPAGE_DAILY_SLOT}`)) empty.push({ dateStr, slot: FANPAGE_DAILY_SLOT });
  }
  return empty;
}

// Dùng chung cho CẢ 2 luồng viết bài (paraphrase từ hook/content VÀ viết từ ảnh case study) — lượt
// EXTRAS (hashtag/cmt_cta_san_pham), lưu posts + calendar_entries đều giống hệt nhau, chỉ khác nguồn
// `core` (từ đâu ra tieu_de/hook/van_de/...) và cách có được ảnh (imageDataBase64).
async function writeExtrasAndSave({
  apiKey, positioning, core, channelHandle, brandName, product, group,
  userId, tags, sourceTable, sourceId, imageDataBase64, slotInfo, slotTime,
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

  await supabaseAdmin('calendar_entries', {
    method: 'POST',
    body: JSON.stringify({
      user_id: userId, post_id: post.id, scheduled_date: slotInfo.dateStr, slot: slotInfo.slot,
      channel: 'fanpage',
      scheduled_time: slotTime, title: core.tieu_de, cta: core.cta, posted: false, auto_publish_fb: true,
    }),
  });

  return { date: slotInfo.dateStr, slot: slotInfo.slot, post_id: post.id, title: core.tieu_de };
}

async function fillOneSlot({ userId, positioning, slotInfo, candidate, slotTime, apiKey, product, group, channelHandle, brandName }) {
  const core = await callClaude({
    apiKey, system: KHO_GOC_SYSTEM_PROMPT, tool: TOOL_POST_KHO_GOC,
    userContent: `${contextBlockOf(positioning, null)}

TIÊU ĐỀ GỐC (tham khảo tinh thần, không bắt buộc giữ y hệt): ${candidate.title && candidate.title.trim() ? candidate.title.trim() : '(không có, tự đặt tiêu đề mới khớp hook)'}

BÀI GỐC TỪ KHO CONTENT (giữ nguyên cấu trúc/trình tự từng đoạn, chỉ giữ y hệt câu hook — các đoạn còn lại paraphrase lại câu chữ, không copy nguyên văn):
${candidate.text.trim()}

CÂU CHUYỆN/TRẢI NGHIỆM RIÊNG CỦA NGƯỜI DÙNG (lấy chi tiết thật, diễn đạt lại bằng câu từ khác, lồng xuyên suốt thân bài): (không cung cấp — viết lại thân bài theo giọng định vị, không tự bịa câu chuyện)

${extraFieldsBlock({ channel_handle: channelHandle, brand_name: brandName, product_name: product && product.label })}

Hãy viết lại bài này theo đúng nguyên tắc đã nêu — giữ nguyên cấu trúc/trình tự và câu hook, viết lại ít nhất 70% câu chữ ở các đoạn còn lại bằng giọng và câu chuyện của người dùng.`,
  });

  // KHÔNG gán image_data ở đây — case study (ảnh thật) chỉ dùng qua fillCaseStudySlot() riêng, luôn
  // ghép cùng ảnh cá nhân (theo yêu cầu chị Quỳnh 2026-08-28, không đăng ảnh case study trần trụi
  // nữa). Luồng hook/content này để trống ảnh, auto-publish-fb.js tự tạo ảnh AI lúc đăng nếu có
  // OPENAI_API_KEY.
  return writeExtrasAndSave({
    apiKey, positioning, core, channelHandle, brandName, product, group,
    userId, tags: candidate.tags, sourceTable: candidate.table, sourceId: candidate.id,
    imageDataBase64: null, slotInfo, slotTime,
  });
}

// Viết bài TỪ 1 ảnh case study (vision) + ghép ảnh cá nhân làm nền — luồng ưu tiên khi có sẵn cả 2
// kho ảnh (xem autoFillForAdmin). Không có "nguồn hook/content" nên source_table/source_id để trống.
async function fillCaseStudySlot({ userId, positioning, slotInfo, caseStudy, personalPhoto, slotTime, apiKey, product, group, channelHandle, brandName }) {
  const core = await callClaude({
    apiKey, system: SYSTEM_PROMPT_CASE_STUDY, tool: TOOL_POST_CORE,
    userContent: [
      { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: stripDataUrlPrefix(caseStudy.image) } },
      {
        type: 'text',
        text: `${contextBlockOf(positioning, null)}

${extraFieldsBlock({ channel_handle: channelHandle, brand_name: brandName, product_name: product && product.label })}

Hãy viết bài dựa trên đúng ảnh case study vừa xem, theo đúng nguyên tắc đã nêu.`,
      },
    ],
  });

  const result = await writeExtrasAndSave({
    apiKey, positioning, core, channelHandle, brandName, product, group,
    userId, tags: caseStudy.tags, sourceTable: null, sourceId: null,
    imageDataBase64: null, slotInfo, slotTime,
  });

  // Ghép ảnh SAU khi đã lưu bài (composite tốn thời gian, không cần chặn việc lưu bài chính) — lỗi ở
  // bước ghép ảnh không làm fail cả lượt lấp lịch, chỉ để bài đó không có ảnh (auto-publish-fb.js sẽ
  // tự rơi về ảnh AI hoặc bỏ qua đăng theo đúng quy tắc "không đăng bài chữ trần").
  try {
    const image = await compositeCaseStudyImage({
      cardCorner: personalPhoto.card_corner,
      personalImageBuffer: Buffer.from(stripDataUrlPrefix(personalPhoto.image), 'base64'),
      caseStudyImageBuffer: Buffer.from(stripDataUrlPrefix(caseStudy.image), 'base64'),
      title: core.tieu_de,
    });
    await supabaseAdmin(`posts?id=eq.${result.post_id}`, {
      method: 'PATCH', prefer: 'return=minimal',
      body: JSON.stringify({ image_data: image.toString('base64') }),
    });
  } catch (e) { /* không ghép được ảnh — bài vẫn đã lưu, chỉ thiếu ảnh, xử lý tiếp ở auto-publish-fb.js */ }

  return result;
}

async function autoFillForAdmin(admin, apiKey) {
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

  const dateStrs = Array.from({ length: LOOKAHEAD_DAYS }, (_, i) => vnDateStr(i));
  const emptySlots = await findEmptySlots(admin.id, dateStrs);
  const toFill = emptySlots.slice(0, MAX_FILL_PER_RUN);
  const skippedCap = Math.max(0, emptySlots.length - MAX_FILL_PER_RUN);

  const filled = [];
  const skippedNoCandidate = [];
  for (const slotInfo of toFill) {
    const slotTime = profile['slot_time_' + slotInfo.slot] || DEFAULT_SLOT_TIME[slotInfo.slot];
    // Chọn ngẫu nhiên 1 sản phẩm + 1 group mỗi lần lấp — không có logic xoay vòng riêng, nhưng qua
    // nhiều lượt chạy sẽ tự dàn đều các sản phẩm/group đã lưu, không lặp mãi 1 sản phẩm.
    const product = products.length ? products[Math.floor(Math.random() * products.length)] : null;
    const group = groups.length ? groups[Math.floor(Math.random() * groups.length)] : null;
    try {
      if (caseStudies.length && personalPhotos.length) {
        const caseStudy = caseStudies[Math.floor(Math.random() * caseStudies.length)];
        const personalPhoto = personalPhotos[Math.floor(Math.random() * personalPhotos.length)];
        filled.push(await fillCaseStudySlot({
          userId: admin.id, positioning, slotInfo, caseStudy, personalPhoto, slotTime, apiKey, product, group,
          channelHandle: profile.channel_handle, brandName: profile.brand_name,
        }));
        continue;
      }
      const candidate = pickUnusedCandidate(poolCandidates, usedRefs);
      if (!candidate) { skippedNoCandidate.push(slotInfo); continue; }
      usedRefs.push({ table: candidate.table, id: candidate.id }); // không chọn trùng trong cùng lượt chạy
      filled.push(await fillOneSlot({
        userId: admin.id, positioning, slotInfo, candidate, slotTime, apiKey, product, group,
        channelHandle: profile.channel_handle, brandName: profile.brand_name,
      }));
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
      results[admin.id] = await autoFillForAdmin(admin, apiKey);
    }
    res.status(200).json({ ok: true, results });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};
