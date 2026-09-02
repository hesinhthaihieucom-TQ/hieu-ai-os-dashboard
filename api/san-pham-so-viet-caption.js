// Sản Phẩm Số — AI viết caption quảng cáo ngắn (Facebook/TikTok) để giới thiệu 1 sản phẩm đã đăng
// bán, người bán copy ra đăng thẳng. Không lưu tự động — chỉ hiện kết quả kèm nút Copy.

const { requireUser } = require('./_lib/auth');
const { checkAndConsumeSpsQuota, refundSpsQuota } = require('./_lib/sps-ai-quota');

const TOOL_VIET_CAPTION = {
  name: 'xuat_caption_quang_cao',
  description: 'Viết 1 caption ngắn để đăng Facebook/TikTok quảng cáo 1 sản phẩm số.',
  input_schema: {
    type: 'object',
    properties: {
      caption: {
        type: 'string',
        description: 'Caption 3-5 câu, xuống dòng thật giữa các ý (không gõ ký tự "\\n" theo nghĩa đen) — câu đầu là 1 hook gây chú ý (câu hỏi/tình huống quen thuộc), giữa nêu ngắn gọn sản phẩm giải quyết gì, kết bằng 1 lời kêu gọi hành động (CTA) rõ ràng. Có thể dùng 1-2 emoji hợp ngữ cảnh, không lạm dụng.',
      },
    },
    required: ['caption'],
  },
};

const SYSTEM_PROMPT = `Bạn là chuyên gia viết caption quảng cáo mạng xã hội cho sản phẩm số — viết ngắn gọn, có hook mở đầu, dễ đọc trên di động, có lời kêu gọi hành động rõ ràng.

NGUYÊN TẮC BẮT BUỘC:
- Chỉ dựa vào tên sản phẩm và mô tả người dùng cung cấp — không bịa tính năng/số liệu/cam kết không có căn cứ.
- Giọng văn tự nhiên, gần gũi, như người thật viết, không sáo rỗng, không như văn bản AI.
- Output tiếng Việt.`;

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const user = await requireUser(req);
  if (!user) { res.status(401).json({ error: 'Bạn cần đăng nhập để dùng tính năng này.' }); return; }

  const quotaError = await checkAndConsumeSpsQuota(user.id, 'san-pham-so-viet-caption');
  if (quotaError) { res.status(402).json({ error: quotaError, quotaExceeded: true }); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'Server chưa được cấu hình ANTHROPIC_API_KEY.' }); return; }

  try {
    const { title, description } = req.body || {};
    if (!title || !String(title).trim()) { res.status(400).json({ error: 'Thiếu tên sản phẩm.' }); return; }

    const userContent = `TÊN SẢN PHẨM: ${title}\n${description ? `MÔ TẢ: ${description}` : '(chưa có mô tả)'}\n\nHãy viết caption quảng cáo theo đúng schema.`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 150000);
    let resp;
    try {
      resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-5',
          max_tokens: 1200,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userContent }],
          tools: [TOOL_VIET_CAPTION],
          tool_choice: { type: 'tool', name: TOOL_VIET_CAPTION.name },
        }),
        signal: controller.signal,
      });
    } catch (e) {
      if (e.name === 'AbortError') throw new Error('AI phản hồi quá lâu (quá 150 giây) — thử lại giúp mình.');
      throw e;
    } finally {
      clearTimeout(timer);
    }
    if (!resp.ok) throw new Error(`Anthropic API lỗi (${resp.status}): ${await resp.text()}`);
    const data = await resp.json();
    if (data.stop_reason === 'max_tokens') throw new Error('AI trả lời quá dài bị cắt giữa chừng — thử lại giúp mình.');
    const toolUse = (data.content || []).find((b) => b.type === 'tool_use');
    if (!toolUse || !toolUse.input.caption) throw new Error('Không nhận được kết quả có cấu trúc từ AI.');

    res.status(200).json({ caption: toolUse.input.caption });
  } catch (err) {
    await refundSpsQuota(user.id, 'san-pham-so-viet-caption');
    res.status(500).json({ error: err.message || 'Có lỗi xảy ra khi viết caption.' });
  }
};
