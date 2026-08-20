// Serverless function — gợi ý 3 ví dụ câu trả lời cụ thể, chi tiết cho 1 câu hỏi trong wizard Định Vị.
// Mục đích: câu trả lời càng cụ thể/chi tiết (kể cả nỗi đau thật) thì định vị ra càng chuẩn.
const { requireUser } = require('./_lib/auth');

const SYSTEM_PROMPT = `Bạn đang hỗ trợ 1 người trả lời câu hỏi trong quy trình xây định vị thương hiệu cá nhân.

NHIỆM VỤ: Viết đúng 3 ví dụ câu trả lời mẫu cho câu hỏi được đưa ra — để người dùng thấy được MỨC ĐỘ CỤ THỂ, CHI TIẾT cần có, từ đó tự viết câu trả lời thật của chính họ tốt hơn (không phải để họ copy nguyên văn).

NGUYÊN TẮC BẮT BUỘC:
- Mỗi ví dụ phải rất rõ ràng, cụ thể, chi tiết — có số liệu/tình huống/cảm xúc/nỗi đau thật nếu câu hỏi liên quan, không viết chung chung kiểu sách giáo khoa.
- Làm đúng theo YÊU CẦU VỀ NGÀNH NGHỀ được nêu rõ ở cuối nội dung người dùng gửi (có thể là "cả 3 ví dụ cùng 1 lĩnh vực" hoặc "3 ví dụ ở 3 ngành khác nhau" tuỳ tình huống).
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
    const { question, previousAnswers } = req.body || {};
    if (!question || !question.trim()) { res.status(400).json({ error: 'Thiếu câu hỏi cần gợi ý.' }); return; }

    const ctxLines = Object.entries(previousAnswers || {})
      .filter(([, v]) => v && String(v).trim())
      .map(([k, v]) => `- ${k}: ${v}`)
      .join('\n');

    // Câu 1 (a1) giờ hỏi thẳng "muốn xây kênh về lĩnh vực gì" — nếu người dùng đã trả lời câu này
    // (đang ở câu sau câu 1) thì mọi ví dụ gợi ý phải bám đúng lĩnh vực đó, không lan sang ngành
    // khác nữa, để họ thấy ngay sự liên quan sát với hoàn cảnh thật. Chỉ khi CHƯA biết lĩnh vực
    // (đang ở đúng câu 1, previousAnswers rỗng) mới cần trải 3 ví dụ ở 3 ngành khác nhau để
    // ai cũng liên hệ được, làm mẫu tham khảo cho việc trả lời câu 1.
    const niche = previousAnswers && previousAnswers.a1 && String(previousAnswers.a1).trim();
    const nicheRule = niche
      ? `Người dùng đã cho biết lĩnh vực/chủ đề muốn xây kênh (xem mục "a1" trong bối cảnh bên dưới) — CẢ 3 ví dụ đều phải nằm trong đúng lĩnh vực đó, không lấy ví dụ ở ngành khác, chỉ khác nhau ở góc độ/tình huống/con số cụ thể.`
      : `Người dùng CHƯA cho biết lĩnh vực cụ thể — viết 3 ví dụ thuộc 3 ngành nghề khác nhau (ví dụ: 1 ví dụ ngành sức khoẻ, 1 ví dụ ngành tài chính, 1 ví dụ ngành làm đẹp/coaching...) để họ dễ liên hệ dù đang làm ngành gì.`;

    const userContent = `CÂU HỎI CẦN GỢI Ý TRẢ LỜI:\n${question}\n\n${ctxLines ? `BỐI CẢNH ĐÃ BIẾT VỀ NGƯỜI DÙNG (từ các câu trả lời trước):\n${ctxLines}\n\n` : ''}YÊU CẦU VỀ NGÀNH NGHỀ: ${nicheRule}\n\nHãy đưa đúng 3 ví dụ câu trả lời mẫu.`;

    const result = await callClaude({ apiKey, system: SYSTEM_PROMPT, userContent, tool: TOOL_GOI_Y });
    res.status(200).json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Có lỗi xảy ra khi gợi ý câu trả lời.' });
  }
};
