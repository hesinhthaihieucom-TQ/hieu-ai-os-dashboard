// Serverless function — gợi ý lịch đăng bài 7 ngày, dựa trên trục nội dung, dạng content phù hợp,
// giờ đăng tối ưu, và mục tiêu tuần này người dùng nhập.
const { requireUser } = require('./_lib/auth');
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
- Output tiếng Việt.`;

function buildToolLich(postsPerDay) {
  const total = 7 * postsPerDay;
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
        items: {
          type: 'object',
          properties: {
            thu: { type: 'integer', minimum: 0, maximum: 6, description: '0=Thứ 2 ... 6=Chủ nhật' },
            slot: { type: 'string', enum: ['sang', 'trua', 'toi'] },
            truc_noi_dung: { type: 'string', description: 'Trục nội dung (chính hoặc phụ) mà bài này phục vụ — ngắn gọn, ví dụ "Trục chính: Tài chính gia đình".' },
            bai_co_san: { type: 'string', description: 'Nếu 1 trong các BÀI ĐÃ VIẾT được cung cấp khớp tốt với ngày/trục này, ghi ĐÚNG NGUYÊN VĂN tiêu đề bài đó. Nếu không có bài nào phù hợp, để chuỗi rỗng "".' },
            chu_de: { type: 'string', description: 'Chủ đề/góc content cụ thể cho bài này — chỉ dùng khi bai_co_san rỗng (chưa có bài viết sẵn phù hợp).' },
            dinh_dang: { type: 'string', description: 'Tên 1 trong 12 dạng content.' },
            hook_goi_y: { type: 'string' },
            cta: { type: 'string' },
          },
          required: ['thu', 'slot', 'truc_noi_dung', 'bai_co_san', 'chu_de', 'dinh_dang', 'hook_goi_y', 'cta'],
        },
      },
    },
    required: ['lich'],
  },
  };
}

async function callClaude({ apiKey, system, userContent, tool }) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 3000,
      system,
      messages: [{ role: 'user', content: userContent }],
      tools: [tool],
      tool_choice: { type: 'tool', name: tool.name },
    }),
  });
  if (!resp.ok) throw new Error(`Anthropic API lỗi (${resp.status}): ${await resp.text()}`);
  const data = await resp.json();
  const toolUse = (data.content || []).find((b) => b.type === 'tool_use');
  if (!toolUse) throw new Error('Không nhận được kết quả có cấu trúc từ AI.');
  return toolUse.input;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const user = await requireUser(req);
  if (!user) { res.status(401).json({ error: 'Bạn cần đăng nhập để dùng tính năng này.' }); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'Server chưa được cấu hình ANTHROPIC_API_KEY.' }); return; }

  try {
    const { positioning, quick_context, weekly_goal, posts_per_day, existing_posts } = req.body || {};
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

    const userContent = `${contextBlock}

MỤC TIÊU TUẦN NÀY: ${weekly_goal && weekly_goal.trim() ? weekly_goal : '(không nêu cụ thể — cứ bám trục nội dung chính là được)'}

SỐ BÀI MUỐN ĐĂNG MỖI NGÀY: ${postsPerDay}

${postsBlock}

Hãy xuất lịch 7 ngày, đúng ${postsPerDay} bài/ngày.`;

    const result = await callClaude({ apiKey, system: SYSTEM_PROMPT, userContent, tool: buildToolLich(postsPerDay) });
    res.status(200).json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Có lỗi xảy ra khi gợi ý lịch.' });
  }
};
