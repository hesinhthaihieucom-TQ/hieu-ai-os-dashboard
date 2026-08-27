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
const { TOOL_POST_EXTRAS, HASHTAG_CAPTION_RULES, assemblePost, stripDiacritics, contextBlockOf } = require('../_lib/post-schema');
const { FORMAT_GUIDE } = require('../_lib/formats');

const MAX_FILL_PER_RUN = 3;
const LOOKAHEAD_DAYS = 3; // hôm nay + 2 ngày tới
const SLOTS = ['sang', 'trua', 'toi'];
// Phải khớp tay với default ở cột profiles.slot_time_* trong schema_full.sql, giống send-reminders.js.
const DEFAULT_SLOT_TIME = { sang: '08:00', trua: '12:00', toi: '19:00' };

// Giống hệt SYSTEM_PROMPT ghép ở api/viet-content-extras.js — viết lại tại đây (4 dòng) thay vì sửa
// file đó, vì nó vẫn đang phục vụ endpoint HTTP riêng, không muốn đổi hành vi chỗ đang chạy thật.
const EXTRAS_SYSTEM_PROMPT = `Bạn là trợ lý content cho người xây thương hiệu cá nhân tại Việt Nam. Nhiệm vụ: dựa trên 1 bài viết ĐÃ HOÀN CHỈNH, gợi ý hashtag, ý tưởng hình ảnh/video minh hoạ, dạng content phù hợp nhất và caption gợi ý — không viết lại nội dung bài.

${HASHTAG_CAPTION_RULES}

${FORMAT_GUIDE}
(Chọn đúng 1 dạng khớp nhất với ngành + mục tiêu bài này.)`;

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
    for (const slot of SLOTS) {
      if (!taken.has(`${dateStr}:${slot}`)) empty.push({ dateStr, slot });
    }
  }
  return empty;
}

async function fillOneSlot({ userId, positioning, slotInfo, candidate, slotTime, apiKey }) {
  const core = await callClaude({
    apiKey, system: KHO_GOC_SYSTEM_PROMPT, tool: TOOL_POST_KHO_GOC,
    userContent: `${contextBlockOf(positioning, null)}

TIÊU ĐỀ GỐC (tham khảo tinh thần, không bắt buộc giữ y hệt): ${candidate.title && candidate.title.trim() ? candidate.title.trim() : '(không có, tự đặt tiêu đề mới khớp hook)'}

BÀI GỐC TỪ KHO CONTENT (giữ nguyên cấu trúc/trình tự từng đoạn, chỉ giữ y hệt câu hook — các đoạn còn lại paraphrase lại câu chữ, không copy nguyên văn):
${candidate.text.trim()}

CÂU CHUYỆN/TRẢI NGHIỆM RIÊNG CỦA NGƯỜI DÙNG (lấy chi tiết thật, diễn đạt lại bằng câu từ khác, lồng xuyên suốt thân bài): (không cung cấp — viết lại thân bài theo giọng định vị, không tự bịa câu chuyện)

Hãy viết lại bài này theo đúng nguyên tắc đã nêu — giữ nguyên cấu trúc/trình tự và câu hook, viết lại ít nhất 70% câu chữ ở các đoạn còn lại bằng giọng và câu chuyện của người dùng.`,
  });

  const bodyText = assemblePost(core);
  const extras = await callClaude({
    apiKey, system: EXTRAS_SYSTEM_PROMPT, tool: TOOL_POST_EXTRAS,
    userContent: `${contextBlockOf(positioning, null)}

BÀI VIẾT ĐÃ HOÀN CHỈNH:\n${bodyText}

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
      },
      tags: candidate.tags || null,
      source_table: candidate.table,
      source_id: candidate.id,
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

async function autoFillForAdmin(admin, apiKey) {
  const [posResp, profResp, poolCandidates] = await Promise.all([
    supabaseAdmin(`positioning_results?user_id=eq.${admin.id}&select=luot1,luot2&limit=1`),
    supabaseAdmin(`profiles?id=eq.${admin.id}&select=slot_time_sang,slot_time_trua,slot_time_toi`),
    loadCandidatePool(admin.id),
  ]);
  const posRows = posResp.ok ? await posResp.json() : [];
  const positioning = posRows[0] && posRows[0].luot1 ? posRows[0] : null;
  if (!positioning) return { filled: [], skipped_no_positioning: true };

  const profRows = profResp.ok ? await profResp.json() : [];
  const profile = profRows[0] || {};

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
    const candidate = pickUnusedCandidate(poolCandidates, usedRefs);
    if (!candidate) { skippedNoCandidate.push(slotInfo); continue; }
    usedRefs.push({ table: candidate.table, id: candidate.id }); // không chọn trùng trong cùng lượt chạy
    const slotTime = profile['slot_time_' + slotInfo.slot] || DEFAULT_SLOT_TIME[slotInfo.slot];
    try {
      filled.push(await fillOneSlot({ userId: admin.id, positioning, slotInfo, candidate, slotTime, apiKey }));
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
