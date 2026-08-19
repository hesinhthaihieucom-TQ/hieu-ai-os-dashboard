// Serverless function — sửa lại 1 hook yếu thành 5 hook mới, bám đúng điểm yếu vừa được
// Chấm Điểm Hook chỉ ra (khác api/goi-y-hook-theo-chu-de.js — endpoint đó cần chọn 1 trong 15 loại
// hook cố định theo chủ đề mới, còn đây chỉ sửa đúng lỗi của 1 hook có sẵn, giữ nguyên chủ đề gốc).
const { requireUser } = require('./_lib/auth');
const { checkAndConsumeTrialQuota } = require('./_lib/trial-quota');

const SYSTEM_PROMPT = `Bạn là chuyên gia viết hook (câu mở đầu) cho content mạng xã hội tại Việt Nam, chuyên sửa hook yếu thành hook mạnh.

NGUYÊN TẮC BẮT BUỘC:
- Đọc đúng điểm yếu đã được chỉ ra, sửa ĐÚNG điểm yếu đó trong cả 5 bản — không lặp lại lỗi cũ.
- Giữ đúng chủ đề/ý chính của hook gốc, chỉ đổi cách thể hiện để mạnh hơn, không lạc sang chủ đề khác.
- 5 hook phải khác góc độ/cấu trúc câu nhau, không hook nào lặp lại cách mở đầu của hook khác.
- Câu ngắn gọn (1-2 dòng), đọc lên là dừng lại ngay.
- Nếu có định vị thương hiệu, bám đúng giọng điệu và đối tượng trong định vị đó.
- Output tiếng Việt.`;

const TOOL_HOOK = {
  name: 'xuat_hook_cai_thien',
  description: 'Xuất đúng 5 hook mới đã sửa đúng điểm yếu được chỉ ra.',
  input_schema: {
    type: 'object',
    properties: {
      hooks: { type: 'array', items: { type: 'string' }, minItems: 5, maxItems: 5 },
    },
    required: ['hooks'],
  },
};

async function callClaude({ apiKey, system, userContent, tool }) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 1500,
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

  const quotaError = await checkAndConsumeTrialQuota(user.id);
  if (quotaError) { res.status(402).json({ error: quotaError, quotaExceeded: true }); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'Server chưa được cấu hình ANTHROPIC_API_KEY.' }); return; }

  try {
    const { hook_text, diem_yeu, goi_y, positioning, quick_context } = req.body || {};
    if (!hook_text || !hook_text.trim()) { res.status(400).json({ error: 'Thiếu hook gốc cần sửa.' }); return; }

    const contextBlock = positioning && positioning.luot1
      ? `ĐỊNH VỊ THƯƠNG HIỆU ĐÃ CHỐT:\n${JSON.stringify(positioning.luot1, null, 2)}`
      : (quick_context && quick_context.trim()
        ? `BỐI CẢNH NHANH (chưa làm Định Vị đầy đủ): ${quick_context.trim()}`
        : 'BỐI CẢNH: (không cung cấp — viết tự nhiên, phổ quát)');

    const userContent = `HOOK GỐC: ${hook_text}\nĐIỂM YẾU ĐÃ ĐƯỢC CHỈ RA KHI CHẤM ĐIỂM: ${diem_yeu || '(không có)'}\n${goi_y ? `GỢI Ý HƯỚNG SỬA THAM KHẢO: ${goi_y}\n` : ''}\n${contextBlock}\n\nHãy viết đúng 5 hook mới sửa đúng điểm yếu trên, giữ nguyên chủ đề của hook gốc.`;

    const result = await callClaude({ apiKey, system: SYSTEM_PROMPT, userContent, tool: TOOL_HOOK });
    res.status(200).json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Có lỗi xảy ra khi sửa hook.' });
  }
};
