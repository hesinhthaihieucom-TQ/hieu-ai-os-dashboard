// Serverless function — viết bài hoàn chỉnh từ 1 ý tưởng, theo cấu trúc Hook-Vấn đề-Giá trị-Niềm tin-CTA
// (khung 5 phần từ tài liệu "Viết Content Có Cấu Trúc"), giọng văn khớp định vị đã chốt.
const { requireUser } = require('./_lib/auth');

const SYSTEM_PROMPT = `Bạn là trợ lý viết content cho người xây thương hiệu cá nhân tại Việt Nam, viết đúng giọng văn và định vị đã chốt của họ.

NGUYÊN TẮC BẮT BUỘC:
- Bám sát giọng điệu, bản sắc và triết lý thương hiệu trong định vị đã chốt — không lệch trục, không chung chung.
- Cấu trúc bài viết bắt buộc theo khung 5 phần: Hook (kéo đúng người đọc dừng lại) → Vấn đề (gọi tên điều người đọc đang gặp) → Giá trị (góc nhìn/cách làm/giải pháp cụ thể) → Niềm tin (chất liệu thật: câu chuyện/quan sát/case) → CTA (dẫn hành động phù hợp mục tiêu bài, không phải bài nào cũng "inbox").
- Bài viết liền mạch, tự nhiên như đang nói chuyện — không viết kiểu 1 câu 1 dòng rời rạc, không sáo rỗng, không kể lể kiểu "ngày xưa mình từng...".
- Luôn có hashtag phù hợp (3-6 cái, tiếng Việt không dấu hoặc tiếng Anh tuỳ ngành).
- Output tiếng Việt, giữ nguyên thuật ngữ chuyên ngành (hook, CTA, content, insight...).`;

const TOOL_POST = {
  name: 'xuat_bai_viet',
  description: 'Xuất 1 bài viết hoàn chỉnh theo khung Hook-Vấn đề-Giá trị-Niềm tin-CTA.',
  input_schema: {
    type: 'object',
    properties: {
      tieu_de: { type: 'string', description: 'Tiêu đề ngắn gọn cho bài, ưu tiên dạng số nếu hợp.' },
      hook: { type: 'string', description: 'Câu/đoạn hook mở đầu.' },
      van_de: { type: 'string', description: 'Đoạn gọi tên vấn đề người đọc đang gặp.' },
      gia_tri: { type: 'string', description: 'Đoạn giá trị: góc nhìn, cách làm, giải pháp cụ thể.' },
      niem_tin: { type: 'string', description: 'Đoạn chất liệu thật: câu chuyện, quan sát, case cụ thể.' },
      cta: { type: 'string', description: 'Câu CTA phù hợp mục tiêu bài.' },
      bai_hoan_chinh: { type: 'string', description: 'Toàn bộ bài viết ghép liền mạch từ 5 phần trên, sẵn sàng copy đăng ngay.' },
      hashtag: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 6 },
      goi_y_hinh_anh: { type: 'string', description: '1 ý tưởng hình ảnh/video minh hoạ cho bài này, khớp dấu ấn hình ảnh trong định vị.' },
    },
    required: ['tieu_de','hook','van_de','gia_tri','niem_tin','cta','bai_hoan_chinh','hashtag','goi_y_hinh_anh'],
  },
};

async function callClaude({ apiKey, system, userContent, tool }) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
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
    const { positioning, idea_text } = req.body || {};
    if (!positioning || !positioning.luot1) { res.status(400).json({ error: 'Cần có kết quả Định Vị trước khi viết content.' }); return; }
    if (!idea_text || !idea_text.trim()) { res.status(400).json({ error: 'Thiếu ý tưởng/chủ đề để viết.' }); return; }

    const userContent = `ĐỊNH VỊ THƯƠNG HIỆU ĐÃ CHỐT:\n${JSON.stringify(positioning.luot1, null, 2)}\n${positioning.luot2 ? JSON.stringify(positioning.luot2, null, 2) : ''}

Ý TƯỞNG / CHỦ ĐỀ CẦN VIẾT:\n${idea_text}

Hãy viết 1 bài hoàn chỉnh theo đúng khung 5 phần, giọng văn khớp định vị trên.`;

    const result = await callClaude({ apiKey, system: SYSTEM_PROMPT, userContent, tool: TOOL_POST });
    res.status(200).json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Có lỗi xảy ra khi viết content.' });
  }
};
