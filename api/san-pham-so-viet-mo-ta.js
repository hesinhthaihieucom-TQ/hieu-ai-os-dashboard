// Sản Phẩm Số — AI viết mô tả bán hàng cho trang giới thiệu sản phẩm, theo khung PAS/AIDA (Vấn đề
// → Khơi cảm xúc → Giải pháp → Lợi ích → Hành động). Người bán vẫn sửa tay tiếp được sau khi AI điền
// vào ô mô tả — đây chỉ là bản nháp gợi ý, không tự động lưu.

const { requireUser } = require('./_lib/auth');
const { checkAndConsumeTrialQuota, refundTrialQuota } = require('./_lib/trial-quota');

const TOOL_VIET_MO_TA = {
  name: 'xuat_mo_ta_ban_hang',
  description: 'Viết mô tả bán hàng cho 1 sản phẩm số, theo khung Vấn đề → Khơi cảm xúc → Giải pháp → Lợi ích → Hành động.',
  input_schema: {
    type: 'object',
    properties: {
      mo_ta: {
        type: 'string',
        description: 'Mô tả bán hàng hoàn chỉnh, 4-6 câu, xuống dòng thật giữa các ý (không gõ ký tự "\\n" theo nghĩa đen) — mở đầu bằng vấn đề/nỗi đau cụ thể của đối tượng, khơi cảm xúc, giới thiệu sản phẩm là giải pháp, nêu 2-3 lợi ích cụ thể, kết bằng lời kêu gọi hành động ngắn gọn. Giọng văn tự nhiên, không sáo rỗng, không bịa số liệu/cam kết không có căn cứ.',
      },
    },
    required: ['mo_ta'],
  },
};

const SYSTEM_PROMPT = `Bạn là chuyên gia viết mô tả bán hàng cho sản phẩm số — viết mô tả ngắn gọn, thuyết phục, theo khung PAS/AIDA (Vấn đề → Khơi cảm xúc → Giải pháp → Lợi ích → Hành động).

NGUYÊN TẮC BẮT BUỘC:
- Chỉ dựa vào tên sản phẩm và mô tả hiện tại (nếu có) người dùng cung cấp — không bịa tính năng/số liệu/cam kết không có căn cứ.
- Giọng văn tự nhiên, gần gũi, như người thật viết, không sáo rỗng, không như văn bản AI.
- Output tiếng Việt, gọi người đọc là "bạn".`;

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const user = await requireUser(req);
  if (!user) { res.status(401).json({ error: 'Bạn cần đăng nhập để dùng tính năng này.' }); return; }

  const quotaError = await checkAndConsumeTrialQuota(user.id, 'san-pham-so-viet-mo-ta');
  if (quotaError) { res.status(402).json({ error: quotaError, quotaExceeded: true }); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'Server chưa được cấu hình ANTHROPIC_API_KEY.' }); return; }

  try {
    const { title, description_hien_tai } = req.body || {};
    if (!title || !String(title).trim()) { res.status(400).json({ error: 'Thiếu tên sản phẩm.' }); return; }

    const userContent = `TÊN SẢN PHẨM: ${title}\n${description_hien_tai ? `MÔ TẢ HIỆN TẠI (có thể dùng làm gợi ý, không bắt buộc giữ nguyên):\n${description_hien_tai}` : 'Chưa có mô tả — viết mới hoàn toàn dựa trên tên sản phẩm.'}\n\nHãy viết mô tả bán hàng theo đúng schema.`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 90000);
    let resp;
    try {
      resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-5',
          max_tokens: 1500,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userContent }],
          tools: [TOOL_VIET_MO_TA],
          tool_choice: { type: 'tool', name: TOOL_VIET_MO_TA.name },
        }),
        signal: controller.signal,
      });
    } catch (e) {
      if (e.name === 'AbortError') throw new Error('AI phản hồi quá lâu (quá 90 giây) — thử lại giúp mình.');
      throw e;
    } finally {
      clearTimeout(timer);
    }
    if (!resp.ok) throw new Error(`Anthropic API lỗi (${resp.status}): ${await resp.text()}`);
    const data = await resp.json();
    if (data.stop_reason === 'max_tokens') throw new Error('AI trả lời quá dài bị cắt giữa chừng — thử lại giúp mình.');
    const toolUse = (data.content || []).find((b) => b.type === 'tool_use');
    if (!toolUse || !toolUse.input.mo_ta) throw new Error('Không nhận được kết quả có cấu trúc từ AI.');

    res.status(200).json({ mo_ta: toolUse.input.mo_ta });
  } catch (err) {
    await refundTrialQuota(user.id, 'san-pham-so-viet-mo-ta');
    res.status(500).json({ error: err.message || 'Có lỗi xảy ra khi viết mô tả.' });
  }
};
