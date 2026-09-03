// Serverless function — "AI tự viết + xếp cả tuần" cho MỌI khách (khác hẳn api/cron/auto-fill-schedule.js
// chỉ chạy nền cho admin, KHÔNG trừ lượt) — bấm nút mới thực sự chạy, TRỪ LƯỢT THẬT theo từng bài
// viết ra (weight 'viet-tu-kho-goc'=3, cộng thêm 'goi-y-hook-theo-chu-de'=1 nếu chọn Cách 2), theo
// đúng yêu cầu chị Quỳnh 2026-08-29: "cái lịch thì sẽ tính tổng chi phí nếu người ta bấm nút đó".
//
// 2 cách lấy nguồn viết (chị Quỳnh chốt cùng ngày):
// - mode='kho': lấy từ Kho Content/Kho Hook viral (chung + riêng), LỌC theo đúng trục nội dung của
//   người này (phân loại 1 lần từ Định Vị) — không dùng bừa nguồn không liên quan ngành/trục của họ.
// - mode='new_hook': tự sinh 1 hook mới theo đúng ngành/trục của họ (dùng lại prompt ở
//   api/goi-y-hook-theo-chu-de.js), LƯU vào Kho Hook của họ, rồi viết bài từ chính hook vừa tạo.
//
// Giới hạn AN TOÀN mỗi lần bấm (không phải trần lượt, mà trần THỜI GIAN — đây là request đồng bộ,
// người dùng đang chờ, viết hết nguyên 1 tuần 21 ô trong 1 lần gọi dễ vượt quá 300s Vercel cho
// phép). Bấm nhiều lần nếu còn ô trống — trả về rõ số ô còn lại, không âm thầm bỏ sót.
const MAX_FILL_PER_CLICK = 9;

const { requireUser } = require('./_lib/auth');
const { checkAndConsumeTrialQuota, refundTrialQuota } = require('./_lib/trial-quota');
const { supabaseAdmin } = require('./_lib/supabase-admin');
const { contextBlockOf, stripDiacritics } = require('./_lib/post-schema');
const { TEXT_CLASSIFY_SYSTEM_PROMPT, TOOL_PHAN_LOAI_TRUC } = require('./_lib/pillars');
const { autoPickAndRenderImage } = require('./_lib/image-gen');
const {
  loadCandidatePool, pickUnusedCandidate, findEmptySlots, fillOneSlot, PERSONAL_SLOTS, DEFAULT_SLOT_TIME,
  pickMatchingProduct,
} = require('./cron/auto-fill-schedule');
const hookSuggest = require('./goi-y-hook-theo-chu-de');

function dateStrFromWeekStart(weekStartStr, offsetDays) {
  const d = new Date(`${weekStartStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

// Phân loại ĐÚNG 1 trục nội dung chính của người này từ Định Vị — KHÔNG trừ lượt riêng (coi như 1
// bước phụ rẻ, tự nhiên của hành động chính, giống cách writeExtrasAndSave() đã tự phân loại trục
// cho bài mới viết mà không tính thêm lượt).
async function classifyUserPillar(apiKey, positioning) {
  try {
    const result = await hookSuggest.callClaude({
      apiKey, system: TEXT_CLASSIFY_SYSTEM_PROMPT, tool: TOOL_PHAN_LOAI_TRUC,
      userContent: contextBlockOf(positioning, null).slice(0, 3000),
    });
    return (result && result.truc) || null;
  } catch (e) { return null; }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const user = await requireUser(req);
  if (!user) { res.status(401).json({ error: 'Bạn cần đăng nhập để dùng tính năng này.' }); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'Server chưa được cấu hình ANTHROPIC_API_KEY.' }); return; }

  try {
    // custom_instructions (2026-08-31, "với phần AI tự viết bài cả tuần vẫn cho phần yêu cầu vào" —
    // chị Quỳnh) — y hệt "Yêu cầu riêng" đã có ở Viết Content/Viết từ Kho Gốc (customInstructionsBlock,
    // xem api/_lib/post-schema.js), trước đây "AI tự viết + xếp cả tuần" KHÔNG có chỗ nào cho người
    // dùng gõ yêu cầu tuỳ chỉnh — bấm là AI viết theo mặc định, không có cách can thiệp.
    const { week_start, mode, custom_instructions } = req.body || {};
    if (!/^\d{4}-\d{2}-\d{2}$/.test(week_start || '')) { res.status(400).json({ error: 'Thiếu hoặc sai định dạng tuần cần điền.' }); return; }
    const finalMode = mode === 'new_hook' ? 'new_hook' : 'kho';

    const posResp = await supabaseAdmin(`positioning_results?user_id=eq.${user.id}&select=luot1,luot2&limit=1`);
    const posRows = posResp.ok ? await posResp.json() : [];
    const positioning = posRows[0] && posRows[0].luot1 ? posRows[0] : null;
    if (!positioning) { res.status(400).json({ error: 'Cần làm Định Vị trước khi dùng tính năng này — AI cần biết trục nội dung/giọng văn của bạn.' }); return; }

    const profResp = await supabaseAdmin(`profiles?id=eq.${user.id}&select=slot_time_sang,slot_time_trua,slot_time_toi,channel_handle,brand_name,used_auto_fill_week_at`);
    const profRows = profResp.ok ? await profResp.json() : [];
    const profile = profRows[0] || {};

    const assetsResp = await supabaseAdmin(`promo_assets?user_id=eq.${user.id}&select=id,label,url,kind,cta_mau&order=created_at.asc`);
    const assets = assetsResp.ok ? await assetsResp.json() : [];
    const products = assets.filter((a) => a.kind !== 'cong_dong');
    const groups = assets.filter((a) => a.kind === 'cong_dong');

    // Ảnh tự động cho mọi khách (2026-09-03, chị Quỳnh chốt "có, mở luôn cho mọi khách" — trước đây
    // CHỈ admin có ảnh tự tạo, khách thường bấm nút này bài không hề có ảnh nào) — dùng chung đúng
    // autoPickAndRenderImage() đã có cho lane Cá nhân của admin (tâm linh → ảnh cá nhân thật đã tải
    // lên → ảnh AI chung), không tính thêm lượt riêng cho ảnh — gộp chung vào chi phí bài viết đã trừ
    // ở trên (3-4 lượt/bài), giống hệt cách admin đang được miễn phí hoàn toàn cho phần ảnh.
    const personalPhotosResp = await supabaseAdmin(`personal_photos?user_id=eq.${user.id}&select=id,image,card_corner`);
    const personalPhotos = personalPhotosResp.ok ? await personalPhotosResp.json() : [];
    const rawHandle = profile.brand_name || profile.channel_handle || '';
    const handle = rawHandle ? `@${stripDiacritics(rawHandle).toLowerCase()}` : '';
    async function attachAutoImage(result, tags) {
      try {
        const image = await autoPickAndRenderImage({ title: result.title, handle, tags, personalPhotos });
        if (image) {
          await supabaseAdmin(`posts?id=eq.${result.post_id}`, {
            method: 'PATCH', prefer: 'return=minimal', body: JSON.stringify({ image_data: image.toString('base64') }),
          });
        }
      } catch (e) { /* không ghép được ảnh — bài vẫn đã lưu, chỉ thiếu ảnh */ }
    }

    const dateStrs = Array.from({ length: 7 }, (_, i) => dateStrFromWeekStart(week_start, i));
    const emptySlots = await findEmptySlots(user.id, dateStrs, 'ca_nhan', PERSONAL_SLOTS);
    if (!emptySlots.length) { res.status(200).json({ filled: [], skipped_cap: 0, message: 'Tuần này đã kín lịch — không còn ô trống nào để điền.' }); return; }
    const toFill = emptySlots.slice(0, MAX_FILL_PER_CLICK);
    const skippedCap = Math.max(0, emptySlots.length - MAX_FILL_PER_CLICK);

    const truc = await classifyUserPillar(apiKey, positioning);

    const poolCandidates = finalMode === 'kho' ? await loadCandidatePool(user.id) : [];
    const poolFiltered = (truc && poolCandidates.some((c) => Array.isArray(c.tags) && c.tags.includes(truc)))
      ? poolCandidates.filter((c) => Array.isArray(c.tags) && c.tags.includes(truc))
      : poolCandidates; // không có ứng viên nào khớp đúng trục — thà dùng tạm còn hơn bỏ qua cả lượt điền

    const postsResp = await supabaseAdmin(`posts?user_id=eq.${user.id}&select=source_table,source_id`);
    const postsRows = postsResp.ok ? await postsResp.json() : [];
    const usedRefs = postsRows.filter((p) => p.source_table && p.source_id).map((p) => ({ table: p.source_table, id: p.source_id }));
    // Số liệu chẩn đoán (2026-08-31, theo phản hồi chị Quỳnh "kho content viral còn đầy mà, ai kêu
    // hết nguồn" — trả kèm số liệu THẬT trong response thay vì đoán qua đọc code) — pool_all_size là
    // TOÀN BỘ kho hook/content (cá nhân + chung), pool_matched_truc_size là sau khi lọc đúng trục
    // phân loại, pool_unused_size là trong số đó bao nhiêu CHƯA từng dùng viết bài nào trước đây.
    const isUsedRef = (c) => usedRefs.some((r) => r.table === c.table && r.id === c.id);
    const diagnostics = {
      pool_all_size: poolCandidates.length,
      pool_matched_truc_size: poolFiltered.length,
      pool_unused_size: poolFiltered.filter((c) => !isUsedRef(c)).length,
    };

    const filled = [];
    // "Lịch tự động làm đang bị 1 màu quá... y hệt chủ đề và nội dung luôn" (chị Quỳnh 2026-08-31) —
    // cộng dồn tiêu đề đã viết trong đợt bấm nút này, feed vào lượt viết TIẾP THEO để né lặp mô-típ mở
    // bài (xem recentTitlesBlock() ở api/cron/auto-fill-schedule.js, dùng chung logic).
    const recentTitles = [];
    const skippedNoCandidate = [];
    let quotaBlockedMessage = null;
    // Tổng lượt THẬT ĐÃ TRỪ (không tính phần đã refund) — trả về cho client để cập nhật đúng số ở
    // sidebar ngay lập tức, vì endpoint này tốn lượt BIẾN THIÊN theo số ô lấp thành công (khác mọi
    // endpoint khác trong GATED_API_WEIGHTS vốn luôn trừ đúng 1 mức cố định/lần gọi) — xem
    // nhan-hieu/js/app-shell.js (onGatedApiSuccess nhận thêm weight override) và lich-dang.js.
    let luotUsed = 0;

    for (const slotInfo of toFill) {
      const slotTime = profile['slot_time_' + slotInfo.slot] || DEFAULT_SLOT_TIME[slotInfo.slot];
      // Sản phẩm chọn SAU khi biết candidate (so khớp nội dung, xem pickMatchingProduct bên dưới) —
      // "sản phẩm là tùy bài đó nói về cái j thì chọn sản phẩm đó chứ sao lung tung đc" (chị Quỳnh
      // 2026-08-31, trước đây random tuyệt đối trước khi biết bài viết về gì).
      const group = groups.length ? groups[Math.floor(Math.random() * groups.length)] : null;

      let candidate = null;
      if (finalMode === 'kho') {
        candidate = pickUnusedCandidate(poolFiltered, usedRefs);
        if (!candidate) { skippedNoCandidate.push(slotInfo); continue; }
      } else {
        // Cách 2: tự sinh 1 hook mới theo đúng trục/ngành, LƯU vào Kho Hook rồi mới viết — 2 lượt
        // riêng (sinh hook + viết bài), đúng yêu cầu "tính tổng chi phí nếu người ta bấm nút đó".
        const hookQuotaError = await checkAndConsumeTrialQuota(user.id, 'goi-y-hook-theo-chu-de');
        if (hookQuotaError) { quotaBlockedMessage = hookQuotaError; break; }
        try {
          const goal = Math.random() < 0.5 ? 'viral' : 'uy_tin';
          const topic = contextBlockOf(positioning, null).slice(0, 800);
          const hookResult = await hookSuggest.callClaude({
            apiKey, system: hookSuggest.SYSTEM_PROMPT, tool: hookSuggest.TOOL_HOOK,
            userContent: `CHỦ ĐỀ: ${topic}\n\nLOẠI HOOK CẦN VIẾT: ${goal === 'viral' ? 'Viral' : 'Uy tín'}${hookSuggest.CONTENT_GOALS[goal] ? ' — ' + hookSuggest.CONTENT_GOALS[goal] : ''}\n\nĐỊNH VỊ THƯƠNG HIỆU ĐÃ CHỐT:\n${JSON.stringify(positioning.luot1, null, 2)}\n\nHãy viết đúng 5 hook theo loại trên, sát chủ đề, đúng mục tiêu content.`,
          });
          const hooks = Array.isArray(hookResult.hooks) ? hookResult.hooks.filter(Boolean) : [];
          if (!hooks.length) { skippedNoCandidate.push(slotInfo); continue; }
          const hookText = hooks[Math.floor(Math.random() * hooks.length)];
          // "tất cả những câu nào dài trên 2 dòng đều là quote đó" (chị Quỳnh 2026-09-01) — cùng ngưỡng
          // ước lượng ~2 dòng (HOOK_QUOTE_LENGTH_THRESHOLD) và cùng cách ghi đè RAW KEY 'quote' như
          // isLongHook()/addHook() ở nhan-hieu/js/kho-hook.js — hook tự sinh ở đây cũng cần qua đúng 1
          // quy tắc, không để lọt hook dài mà vẫn gắn category='viral'/'uy_tin'.
          const savedCategory = hookText.trim().length > 100 ? 'quote' : goal;
          const savedResp = await supabaseAdmin('hooks_bank_personal', {
            method: 'POST',
            body: JSON.stringify({ user_id: user.id, hook_text: hookText, category: savedCategory, tags: truc ? [truc] : null }),
          });
          if (!savedResp.ok) { skippedNoCandidate.push(slotInfo); continue; }
          const [savedHook] = await savedResp.json();
          candidate = { table: 'hooks_bank_personal', id: savedHook.id, text: hookText, title: goal, tags: truc ? [truc] : null };
          luotUsed += 1;
        } catch (e) {
          await refundTrialQuota(user.id, 'goi-y-hook-theo-chu-de');
          skippedNoCandidate.push({ ...slotInfo, error: e.message });
          continue;
        }
      }

      const writeQuotaError = await checkAndConsumeTrialQuota(user.id, 'viet-tu-kho-goc');
      if (writeQuotaError) { quotaBlockedMessage = writeQuotaError; break; }
      try {
        if (finalMode === 'kho') usedRefs.push({ table: candidate.table, id: candidate.id });
        const product = pickMatchingProduct(products, candidate.text);
        const result = await fillOneSlot({
          userId: user.id, positioning, slotInfo, candidate, slotTime, apiKey, product, group,
          channelHandle: profile.channel_handle, brandName: profile.brand_name,
          channel: 'ca_nhan', formatConstraint: null, recentTitles, customInstructions: custom_instructions,
        });
        filled.push(result);
        recentTitles.push(result.title);
        luotUsed += 3;
        await attachAutoImage(result, candidate.tags || (truc ? [truc] : null));
      } catch (e) {
        await refundTrialQuota(user.id, 'viet-tu-kho-goc');
        skippedNoCandidate.push({ ...slotInfo, error: e.message });
      }
    }

    // Đánh dấu "đã chạm tới khoảnh khắc aha" — CHỈ 1 LẦN đầu tiên thật sự điền được ít nhất 1 ô (nếu
    // filled rỗng vì hết ô/hết lượt thì chưa thấy được giá trị thật, không tính). Không await chặn
    // response — khách đang đợi kết quả AI viết xong, không cần chờ thêm 1 lượt gọi phụ này.
    if (filled.length && !profile.used_auto_fill_week_at) {
      supabaseAdmin(`profiles?id=eq.${user.id}`, {
        method: 'PATCH', body: JSON.stringify({ used_auto_fill_week_at: new Date().toISOString() }),
      }).catch(() => {});
    }

    res.status(200).json({
      filled, skipped_cap: skippedCap, skipped_no_candidate: skippedNoCandidate,
      quota_blocked: quotaBlockedMessage, mode: finalMode, truc, luot_used: luotUsed,
      ...diagnostics,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Có lỗi xảy ra khi tự động điền lịch.' });
  }
};
