// Serverless function — gợi ý lịch đăng bài 7 ngày, dựa trên trục nội dung, dạng content phù hợp,
// giờ đăng tối ưu, và mục tiêu tuần này người dùng nhập.
const { requireUser } = require('./_lib/auth');
const { checkAndConsumeTrialQuota, refundTrialQuota } = require('./_lib/trial-quota');
const { FORMAT_GUIDE } = require('./_lib/formats');

const SYSTEM_PROMPT = `Bạn là trợ lý lập lịch đăng bài cho người xây thương hiệu cá nhân tại Việt Nam.

${FORMAT_GUIDE}

KHUNG GIỜ ĐĂNG TỐT (tham khảo, chọn khung phù hợp mục tiêu từng bài):
- Facebook: 7-9h / 11-13h / 20-22h.
- TikTok: 6-9h / 11-13h / 19-22h.
- Tối thiểu 1 bài/ngày.

NGUYÊN TẮC:
- Xuất đúng số bài mỗi ngày người dùng yêu cầu cho đủ 7 ngày (Thứ 2 → Chủ nhật). Nếu nhiều hơn 1 bài/ngày, rải vào các slot Sáng/Trưa/Tối khác nhau trong cùng 1 ngày (không trùng slot trong cùng 1 ngày), và đảm bảo các bài trong cùng ngày không trùng chủ đề/dạng content.
- Bám sát trục nội dung chính đã chốt trong định vị — trụ phụ chỉ nên xuất hiện 1-2 lần/tuần, không lấn át trục chính.
- Nếu người dùng có nêu mục tiêu tuần này (ra mắt sản phẩm, tăng follow, xây niềm tin...), ưu tiên xếp bài phục vụ đúng mục tiêu đó vào các ngày giữa/cuối tuần, đầu tuần vẫn giữ bài kéo reach/xây niềm tin để làm nóng trước.
- Mỗi bài chọn 1 dạng content phù hợp (theo đúng 12 dạng ở trên) và 1 gợi ý hook ngắn, cụ thể — không chung chung.
- CTA phải khớp mục tiêu bài đó, không phải ngày nào cũng "inbox".
- BÀI ĐÃ VIẾT SẴN: nếu người dùng có cung cấp danh sách bài đã viết, ƯU TIÊN xếp các bài đó vào lịch trước (ghi đúng nguyên văn tiêu đề vào bai_co_san) — chỉ bịa chủ đề mới (chu_de) cho những ngày/slot không còn bài có sẵn nào phù hợp. Mỗi bài đã viết chỉ dùng 1 lần trong cả tuần, không lặp lại.
- Nếu người dùng KHÔNG cung cấp bài đã viết nào (hoặc đã dùng hết), luôn để bai_co_san rỗng và chỉ gợi ý chu_de (chủ đề) — không tự bịa ra nội dung bài hoàn chỉnh.
- Luôn ghi rõ truc_noi_dung cho mỗi bài (trục chính hay trục phụ, tên trục gì) để người dùng biết mỗi bài đang phục vụ trục nào.
- KẾT QUẢ THẬT (nếu có cung cấp): đây là tín hiệu quan trọng NHẤT, đáng tin hơn mọi quy tắc chung ở trên — ưu tiên lặp lại đúng định dạng/trục/kiểu CTA của các bài có view/tương tác cao nhất, hạn chế lặp lại kiểu bài có kết quả thấp. Nếu KHÔNG có dữ liệu này, bỏ qua nguyên tắc này, cứ theo các quy tắc chung phía trên.
- Output tiếng Việt.`;

// Từ 2 bài/ngày trở lên (14-21 mục/tuần), KHÔNG bắt AI nghĩ chi tiết chủ đề/dạng/hook/cta cho
// từng mục — vừa nặng (dễ vượt max_tokens, bị cắt giữa chừng), vừa không cần thiết vì người dùng
// sẽ vào thẳng Kho Content Viral đúng trục đó để tự chọn bài/hook cụ thể. AI chỉ cần quyết định
// mỗi slot phục vụ trục nội dung nào (và có bài đã viết sẵn khớp không) — nhẹ và nhanh hơn nhiều.
const SIMPLE_MODE_NOTE = `

CHẾ ĐỘ RÚT GỌN (đang bật vì người dùng chọn từ 2 bài/ngày trở lên): CHỈ cần xác định mỗi slot phục
vụ trục nội dung nào (truc_noi_dung) và có bài đã viết sẵn khớp không (bai_co_san) — KHÔNG cần nghĩ
chủ đề cụ thể, dạng content, hook, hay CTA cho những slot chưa có bài viết sẵn. Người dùng sẽ tự
chọn bài mẫu đúng trục đó trong Kho Content Viral.`;

function buildToolLich(postsPerDay) {
  const total = 7 * postsPerDay;
  const simple = postsPerDay >= 2;
  const baseProps = {
    thu: { type: 'integer', minimum: 0, maximum: 6, description: '0=Thứ 2 ... 6=Chủ nhật' },
    slot: { type: 'string', enum: ['sang', 'trua', 'toi'] },
    truc_noi_dung: { type: 'string', description: 'Trục nội dung (chính hoặc phụ) mà bài này phục vụ — ngắn gọn, ví dụ "Trục chính: Tài chính gia đình".' },
    bai_co_san: { type: 'string', description: 'Nếu 1 trong các BÀI ĐÃ VIẾT được cung cấp khớp tốt với ngày/trục này, ghi ĐÚNG NGUYÊN VĂN tiêu đề bài đó. Nếu không có bài nào phù hợp, để chuỗi rỗng "".' },
  };
  const detailProps = {
    chu_de: { type: 'string', description: 'Chủ đề/góc content cụ thể cho bài này — chỉ dùng khi bai_co_san rỗng (chưa có bài viết sẵn phù hợp).' },
    dinh_dang: { type: 'string', description: 'Tên 1 trong 12 dạng content.' },
    hook_goi_y: { type: 'string' },
    cta: { type: 'string' },
  };
  const properties = simple ? baseProps : { ...baseProps, ...detailProps };
  const required = simple
    ? ['thu', 'slot', 'truc_noi_dung', 'bai_co_san']
    : ['thu', 'slot', 'truc_noi_dung', 'bai_co_san', 'chu_de', 'dinh_dang', 'hook_goi_y', 'cta'];
  return {
  name: 'xuat_lich_tuan',
  description: `Xuất lịch đăng bài đề xuất cho 7 ngày, đúng ${postsPerDay} bài/ngày (tổng ${total} bài).`,
  input_schema: {
    type: 'object',
    properties: {
      lich: {
        type: 'array',
        minItems: total,
        maxItems: total,
        items: { type: 'object', properties, required },
      },
    },
    required: ['lich'],
  },
  };
}

async function callClaude({ apiKey, system, userContent, tool, maxTokens }) {
  // fetch() mặc định KHÔNG có giới hạn thời gian chờ — nếu Anthropic bị treo/chậm bất thường,
  // request có thể "treo" tới tận khi Vercel tự ngắt hàm (300s) mới có phản hồi, thay vì báo lỗi
  // sớm để người dùng biết mà thử lại. Đặt trần 90s riêng cho lệnh gọi AI.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90000);
  let resp;
  try {
    resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: userContent }],
        tools: [tool],
        tool_choice: { type: 'tool', name: tool.name },
      }),
      signal: controller.signal,
    });
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('AI phản hồi quá lâu (quá 90 giây) — có thể đang quá tải, thử lại giúp mình.');
    throw e;
  } finally {
    clearTimeout(timer);
  }
  if (!resp.ok) throw new Error(`Anthropic API lỗi (${resp.status}): ${await resp.text()}`);
  const data = await resp.json();
  // Nếu bị cắt giữa chừng vì hết max_tokens, tool_use trả về sẽ thiếu/hỏng dữ liệu — báo lỗi rõ
  // ràng ngay tại đây thay vì để lọt xuống dưới rồi gãy khó hiểu ở phía frontend.
  if (data.stop_reason === 'max_tokens') {
    throw new Error('AI sinh kết quả dài quá giới hạn cho phép — thử giảm số bài/ngày hoặc thử lại.');
  }
  const toolUse = (data.content || []).find((b) => b.type === 'tool_use');
  if (!toolUse) throw new Error('Không nhận được kết quả có cấu trúc từ AI.');
  return toolUse.input;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const user = await requireUser(req);
  if (!user) { res.status(401).json({ error: 'Bạn cần đăng nhập để dùng tính năng này.' }); return; }

  const quotaError = await checkAndConsumeTrialQuota(user.id, 'goi-y-lich');
  if (quotaError) { res.status(402).json({ error: quotaError, quotaExceeded: true }); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'Server chưa được cấu hình ANTHROPIC_API_KEY.' }); return; }

  try {
    const { positioning, quick_context, weekly_goal, posts_per_day, existing_posts, performance_data } = req.body || {};
    const hasPositioning = !!(positioning && positioning.luot1);
    if (!hasPositioning && !(quick_context && quick_context.trim())) {
      res.status(400).json({ error: 'Cần có Định Vị hoặc mô tả nhanh ngành/đối tượng trước khi gợi ý lịch.' }); return;
    }
    const postsPerDay = [1, 2, 3].includes(posts_per_day) ? posts_per_day : 1;

    const contextBlock = hasPositioning
      ? `ĐỊNH VỊ THƯƠNG HIỆU ĐÃ CHỐT:\n${JSON.stringify(positioning.luot1, null, 2)}\n${positioning.luot2 ? JSON.stringify(positioning.luot2, null, 2) : ''}`
      : `BỐI CẢNH NHANH (chưa làm Định Vị đầy đủ): ${quick_context.trim()}`;

    const postsList = Array.isArray(existing_posts) ? existing_posts.filter(p => p && p.title) : [];
    const postsBlock = postsList.length
      ? `BÀI ĐÃ VIẾT SẴN (ưu tiên xếp vào lịch trước, ghi đúng nguyên văn tiêu đề vào bai_co_san):\n${postsList.map((p, i) => `${i + 1}. "${p.title}" — ${(p.content || '').slice(0, 150)}`).join('\n')}`
      : 'BÀI ĐÃ VIẾT SẴN: (chưa có bài nào — chỉ gợi ý chủ đề, để bai_co_san rỗng)';

    // Kết quả thật (view/like/cmt/share) của các bài đã đăng gần đây — CHỈ có nếu người dùng tự
    // nguyện điền sau khi đăng (xem lich-dang.js, mảng rỗng nếu chưa từng điền, không bắt buộc).
    // Khi có, đây là tín hiệu THẬT về công thức đang hiệu quả với ĐÚNG người này, đáng tin hơn hẳn
    // quy tắc chung ở NGUYÊN TẮC bên trên (2026-08-23, theo đề xuất chị Quỳnh).
    const perfList = Array.isArray(performance_data) ? performance_data.filter(p => p && p.title) : [];
    const perfBlock = perfList.length
      ? `\n\nKẾT QUẢ THẬT CỦA CÁC BÀI GẦN ĐÂY (do người dùng tự điền, xếp theo view giảm dần — ưu tiên lặp lại đúng trục/định dạng/CTA của những bài view cao nhất, tránh lặp lại kiểu bài view thấp):\n${perfList.map((p, i) => `${i + 1}. "${p.title}" — định dạng: ${p.format || '(không rõ)'} — CTA: ${p.cta || '(không rõ)'} — ${p.views ?? '?'} view, ${p.likes ?? '?'} like, ${p.comments ?? '?'} cmt, ${p.shares ?? '?'} share`).join('\n')}`
      : '';

    const userContent = `${contextBlock}

MỤC TIÊU TUẦN NÀY: ${weekly_goal && weekly_goal.trim() ? weekly_goal : '(không nêu cụ thể — cứ bám trục nội dung chính là được)'}

SỐ BÀI MUỐN ĐĂNG MỖI NGÀY: ${postsPerDay}

${postsBlock}${perfBlock}

Hãy xuất lịch 7 ngày, đúng ${postsPerDay} bài/ngày.`;

    // max_tokens phải đủ cho TOÀN BỘ 7*postsPerDay mục cùng lúc (tool_choice bắt buộc xuất hết 1
    // lần) — cố định 3000 trước đây chỉ đủ cho 1 bài/ngày (7 mục), 2-3 bài/ngày (14-21 mục) bị cắt
    // giữa chừng nên lỗi/không ra kết quả. Từ 2 bài/ngày dùng schema rút gọn (ít field/mục hơn hẳn)
    // nên chỉ cần nhân hệ số nhỏ hơn nhiều so với chế độ đầy đủ của 1 bài/ngày.
    const simple = postsPerDay >= 2;
    const totalItems = 7 * postsPerDay;
    const maxTokens = simple ? Math.min(4000, 800 + totalItems * 100) : 3000;
    const system = simple ? SYSTEM_PROMPT + SIMPLE_MODE_NOTE : SYSTEM_PROMPT;
    const result = await callClaude({ apiKey, system, userContent, tool: buildToolLich(postsPerDay), maxTokens });
    res.status(200).json({ result });
  } catch (err) {
    await refundTrialQuota(user.id, 'goi-y-lich');
    res.status(500).json({ error: err.message || 'Có lỗi xảy ra khi gợi ý lịch.' });
  }
};
