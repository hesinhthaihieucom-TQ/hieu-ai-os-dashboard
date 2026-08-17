// Serverless function — sinh ý tưởng content từ 5 kho nguồn, dựa trên định vị đã chốt.
const { requireUser } = require('./_lib/auth');

const SOURCE_LABELS = {
  ca_nhan: 'Câu chuyện cá nhân',
  case_hoc_vien: 'Case học viên / khách hàng',
  cau_hoi_kh: 'Câu hỏi khách hàng hay gặp',
  xu_huong: 'Xu hướng thị trường',
  quan_diem_nguoc_dong: 'Quan điểm ngược dòng',
};

const SYSTEM_PROMPT = `Bạn là trợ lý sinh ý tưởng content cho người xây thương hiệu cá nhân tại Việt Nam, dựa trên định vị thương hiệu đã chốt của họ.

NGUYÊN TẮC:
- Ý tưởng phải bám sát định vị, hệ trục nội dung và chân dung khách hàng đã chốt — không lệch trục.
- Mỗi ý tưởng là 1 dòng mô tả góc content cụ thể (không phải bài viết hoàn chỉnh) — đủ cụ thể để người dùng biết ngay sẽ viết về gì, đủ hấp dẫn để muốn viết.
- Không chung chung, không sáo rỗng. Ưu tiên dùng chất liệu thật (từ kho nội dung cá nhân/chung nếu có) làm nguyên liệu ý tưởng.
- Output tiếng Việt, giữ nguyên thuật ngữ chuyên ngành (hook, CTA, content, insight...).`;

const TOOL_IDEAS = {
  name: 'xuat_y_tuong',
  description: 'Xuất đúng 5 ý tưởng content, mỗi ý tưởng gắn với 1 trong 5 kho nguồn.',
  input_schema: {
    type: 'object',
    properties: {
      y_tuong: {
        type: 'array',
        minItems: 5,
        maxItems: 5,
        items: {
          type: 'object',
          properties: {
            nguon: { type: 'string', enum: Object.keys(SOURCE_LABELS) },
            y_tuong: { type: 'string', description: 'Mô tả góc content cụ thể, 1-3 câu.' },
          },
          required: ['nguon', 'y_tuong'],
        },
      },
    },
    required: ['y_tuong'],
  },
};

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
    const { positioning, sources, context, personalBank, sharedBank } = req.body || {};
    if (!positioning || !positioning.luot1) { res.status(400).json({ error: 'Cần có kết quả Định Vị trước khi sinh ý tưởng.' }); return; }

    const chosenSources = (sources && sources.length ? sources : Object.keys(SOURCE_LABELS))
      .map((s) => SOURCE_LABELS[s]).filter(Boolean);

    const bankBlock = [
      (personalBank || []).length ? `KHO NỘI DUNG RIÊNG CỦA NGƯỜI DÙNG:\n${personalBank.map((b) => `- [${b.source_type || ''}] ${b.title}: ${b.content}`).join('\n')}` : '',
      (sharedBank || []).length ? `KHO NỘI DUNG CHUNG (tham khảo thêm):\n${sharedBank.map((b) => `- [${b.source_type || ''}] ${b.title}: ${b.content}`).join('\n')}` : '',
    ].filter(Boolean).join('\n\n');

    const userContent = `ĐỊNH VỊ THƯƠNG HIỆU ĐÃ CHỐT:\n${JSON.stringify(positioning.luot1, null, 2)}\n${positioning.luot2 ? JSON.stringify(positioning.luot2, null, 2) : ''}

KHO NGUỒN ĐƯỢC CHỌN ĐỂ SINH Ý TƯỞNG: ${chosenSources.join(', ')}

BỐI CẢNH THÊM (nếu có): ${context || '(không có)'}

${bankBlock}

Hãy sinh đúng 5 ý tưởng content, ưu tiên rải đều trong các kho nguồn được chọn.`;

    const result = await callClaude({ apiKey, system: SYSTEM_PROMPT, userContent, tool: TOOL_IDEAS });
    res.status(200).json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Có lỗi xảy ra khi sinh ý tưởng.' });
  }
};
