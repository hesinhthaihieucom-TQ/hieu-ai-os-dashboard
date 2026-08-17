// Serverless function — từ 1 bài mẫu trong Kho Content, rút ra mô tả giọng điệu/ngôn ngữ
// theo đúng khuôn field "giọng điệu & ngôn ngữ" của Định Vị, để áp thẳng cho học viên
// thay vì bắt họ tự mô tả giọng văn của mình.
const { requireUser } = require('./_lib/auth');

const SYSTEM_PROMPT = `Bạn là trợ lý phân tích giọng văn cho người xây thương hiệu cá nhân tại Việt Nam.

NHIỆM VỤ: Đọc 1 bài mẫu, rút ra mô tả GIỌNG ĐIỆU & NGÔN NGỮ của bài đó — để người dùng áp dụng làm giọng văn chuẩn cho chính họ.

NGUYÊN TẮC:
- Mô tả cụ thể: câu ngắn hay dài, storytelling hay phân tích, ví dụ đời thường hay thuật ngữ, mức độ quan điểm riêng, nhịp điệu câu.
- Không tóm tắt NỘI DUNG của bài — chỉ mô tả CÁCH VIẾT/GIỌNG ĐIỆU, để dùng chung được cho bài về chủ đề khác.
- Output tiếng Việt, 3-5 câu, dùng được ngay để áp dụng.`;

const TOOL_GIONG_VAN = {
  name: 'xuat_giong_van',
  description: 'Xuất mô tả giọng điệu & ngôn ngữ rút ra từ bài mẫu.',
  input_schema: {
    type: 'object',
    properties: {
      giong_dieu_ngon_ngu: { type: 'string' },
    },
    required: ['giong_dieu_ngon_ngu'],
  },
};

async function callClaude({ apiKey, system, userContent, tool }) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 800,
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
    const { sample_text } = req.body || {};
    if (!sample_text || !sample_text.trim()) { res.status(400).json({ error: 'Thiếu bài mẫu để phân tích giọng văn.' }); return; }

    const userContent = `BÀI MẪU:\n${sample_text}\n\nHãy rút ra mô tả giọng điệu & ngôn ngữ của bài này.`;
    const result = await callClaude({ apiKey, system: SYSTEM_PROMPT, userContent, tool: TOOL_GIONG_VAN });
    res.status(200).json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Có lỗi xảy ra khi phân tích giọng văn.' });
  }
};
