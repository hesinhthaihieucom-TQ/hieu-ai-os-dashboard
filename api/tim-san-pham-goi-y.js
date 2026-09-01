// Gợi ý 3 ví dụ câu trả lời cho 1 câu hỏi trong wizard "Tìm Sản Phẩm Phù Hợp" — MIỄN PHÍ (không gọi
// checkAndConsumeTrialQuota), giới hạn 1 lần/câu ở phía client (xem SUGGEST_LIMIT_PER_QUESTION ở
// san-pham-so/js/tim-san-pham.js). Cùng pattern với api/dinh-vi-goi-y.js.

const { requireUser } = require('./_lib/auth');

const SYSTEM_PROMPT = `Bạn đang hỗ trợ 1 người trả lời câu hỏi trong quy trình "Tìm Sản Phẩm Số Phù Hợp".

NHIỆM VỤ: Viết đúng 3 ví dụ câu trả lời mẫu cho câu hỏi được đưa ra — để người dùng thấy mức độ cụ thể cần có, từ đó tự viết câu trả lời thật của mình tốt hơn (không phải để copy nguyên văn).

NGUYÊN TẮC BẮT BUỘC:
- Mỗi ví dụ cụ thể, chi tiết, có tình huống/số liệu thật nếu câu hỏi liên quan — không viết chung chung.
- Mỗi ví dụ dài 2-4 câu.
- BẮT BUỘC bám đúng ngành/lĩnh vực đã nêu ở cuối nội dung người dùng gửi — cả 3 ví dụ cùng 1 ngành đó, không lấy ví dụ ở ngành khác.
- Viết ở ngôi thứ nhất, như chính người trả lời đang nói.
- Output tiếng Việt.`;

const TOOL_GOI_Y = {
  name: 'xuat_goi_y_tra_loi',
  description: 'Xuất đúng 3 ví dụ câu trả lời mẫu, cụ thể và chi tiết.',
  input_schema: {
    type: 'object',
    properties: {
      vi_du: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 3 },
    },
    required: ['vi_du'],
  },
};

async function callClaude({ apiKey, system, userContent, tool }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 150000);
  let resp;
  try {
    resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 2200,
        system,
        messages: [{ role: 'user', content: userContent }],
        tools: [tool],
        tool_choice: { type: 'tool', name: tool.name },
      }),
      signal: controller.signal,
    });
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('AI phản hồi quá lâu (quá 150 giây) — có thể đang quá tải, thử lại giúp mình.');
    throw e;
  } finally {
    clearTimeout(timer);
  }
  if (!resp.ok) throw new Error(`Anthropic API lỗi (${resp.status}): ${await resp.text()}`);
  const data = await resp.json();
  if (data.stop_reason === 'max_tokens') throw new Error('AI viết gợi ý quá dài bị cắt giữa chừng — thử lại giúp mình.');
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
    const { question, previousAnswers } = req.body || {};
    if (!question || !question.trim()) { res.status(400).json({ error: 'Thiếu câu hỏi cần gợi ý.' }); return; }

    const ctxLines = Object.entries(previousAnswers || {})
      .filter(([, v]) => v && String(v).trim())
      .map(([k, v]) => `- ${k}: ${v}`)
      .join('\n');

    const nganh = previousAnswers && previousAnswers.nganh && String(previousAnswers.nganh).trim();
    const nicheRule = nganh
      ? `Người dùng đã chọn ngành/lĩnh vực "${nganh}" — CẢ 3 ví dụ đều phải nằm trong đúng ngành đó, chỉ khác nhau ở góc độ/tình huống cụ thể.`
      : `Người dùng CHƯA chọn ngành cụ thể — viết 3 ví dụ ở 3 ngành khác nhau (vd sức khoẻ, tài chính, phát triển bản thân) để dễ liên hệ dù đang làm ngành gì.`;

    const userContent = `CÂU HỎI CẦN GỢI Ý TRẢ LỜI:\n${question}\n\n${ctxLines ? `BỐI CẢNH ĐÃ BIẾT (từ các câu trả lời trước):\n${ctxLines}\n\n` : ''}YÊU CẦU VỀ NGÀNH NGHỀ: ${nicheRule}\n\nHãy đưa đúng 3 ví dụ câu trả lời mẫu.`;

    const result = await callClaude({ apiKey, system: SYSTEM_PROMPT, userContent, tool: TOOL_GOI_Y });
    res.status(200).json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Có lỗi xảy ra khi gợi ý câu trả lời.' });
  }
};
