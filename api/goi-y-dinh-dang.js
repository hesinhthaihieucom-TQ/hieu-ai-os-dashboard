// Serverless function — gợi ý 2-3 dạng content phù hợp nhất với trục nội dung đã định vị.
const { requireUser } = require('./_lib/auth');
const { FORMAT_NAMES, FORMAT_GUIDE } = require('./_lib/formats');

// Livestream không phải dạng content cố định/lặp lại được theo lịch (phụ thuộc lịch trực tiếp),
// nên không đưa vào danh sách được AI chọn gợi ý cá nhân hoá — vẫn giữ trong 12 dạng để tham khảo.
const SUGGESTABLE_FORMAT_NAMES = FORMAT_NAMES.filter(n => n !== 'Livestream / Mini Q&A');

const SYSTEM_PROMPT = `Bạn là trợ lý chọn dạng content phù hợp cho người xây thương hiệu cá nhân tại Việt Nam.

${FORMAT_GUIDE}

NGUYÊN TẮC:
- Dựa vào định vị đã chốt (ngành, trục nội dung, hình ảnh nên xây, style) để chọn ra 2-3 dạng phù hợp NHẤT — không phải liệt kê hết.
- Ưu tiên dạng khớp cả ngành lẫn mức độ thoải mái xuất hiện trước camera của người dùng nếu có trong dữ liệu.
- Giải thích ngắn gọn, cụ thể vì sao dạng đó phù hợp với đúng định vị này — không nói chung chung.
- Trong đoạn giải thích (ly_do), bọc 2-4 cụm từ khoá quan trọng nhất trong dấu **...** (ví dụ: **talking head kết hợp storytelling**) để người đọc lướt nhanh vẫn nắm được ý chính — không bọc cả câu, chỉ bọc đúng cụm từ cốt lõi.`;

const TOOL_GOI_Y = {
  name: 'xuat_goi_y_dinh_dang',
  description: 'Xuất 2-3 dạng content phù hợp nhất.',
  input_schema: {
    type: 'object',
    properties: {
      goi_y: {
        type: 'array',
        minItems: 2,
        maxItems: 3,
        items: {
          type: 'object',
          properties: {
            dinh_dang: { type: 'string', enum: SUGGESTABLE_FORMAT_NAMES },
            ly_do: { type: 'string' },
          },
          required: ['dinh_dang', 'ly_do'],
        },
      },
    },
    required: ['goi_y'],
  },
};

async function callClaude({ apiKey, system, userContent, tool }) {
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
        max_tokens: 1500,
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
    const { positioning } = req.body || {};
    if (!positioning || !positioning.luot1) { res.status(400).json({ error: 'Cần có kết quả Định Vị trước khi gợi ý dạng content.' }); return; }

    const userContent = `ĐỊNH VỊ THƯƠNG HIỆU ĐÃ CHỐT:\n${JSON.stringify(positioning.luot1, null, 2)}\n${positioning.luot2 ? JSON.stringify(positioning.luot2, null, 2) : ''}\n\nHãy chọn 2-3 dạng content phù hợp nhất.`;

    const result = await callClaude({ apiKey, system: SYSTEM_PROMPT, userContent, tool: TOOL_GOI_Y });
    res.status(200).json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Có lỗi xảy ra khi gợi ý dạng content.' });
  }
};
