// Serverless function — suy luận ngược 13 câu trả lời gốc (dạng textarea) từ 1 kết quả Định Vị
// ĐÃ CÓ SẴN (luot1/luot2), dùng khi answers rỗng — thường gặp ở tài khoản từng dán kết quả có sẵn
// TRƯỚC KHI tính năng suy luận lúc dán ra đời, nên không có answers để "Sửa lại câu trả lời" điền
// vào. Khác api/dinh-vi-parse.js (suy luận từ văn bản dán thô): ở đây nguồn suy luận là JSON kết
// quả đã lưu, không có raw_text gốc để dùng lại.
const { requireUser } = require('./_lib/auth');
const { ANSWER_FIELDS } = require('./_lib/positioning-answer-fields');

const SYSTEM_PROMPT = `Bạn là công cụ TRÍCH XUẤT/SUY LUẬN, không phải công cụ sáng tạo. Người dùng đã có sẵn 1 kết quả Định Vị thương hiệu cá nhân (JSON luot1 + luot2) nhưng không còn lưu lại 13 câu trả lời gốc đã dẫn tới kết quả đó.

NGUYÊN TẮC BẮT BUỘC:
- CHỈ suy luận dựa trên thông tin THỰC SỰ có trong JSON kết quả — TUYỆT ĐỐI KHÔNG bịa thêm chi tiết mới không suy ra được.
- Diễn đạt lại thành 1 đoạn văn tự nhiên, ngôi thứ nhất, như chính người dùng tự viết ra câu trả lời đó — không copy nguyên văn thuật ngữ marketing khô khan từ kết quả.
- Câu nào không tìm được thông tin tương ứng trong JSON kết quả thì để chuỗi rỗng "" — không cố gò ép suy diễn khi không có căn cứ.
- Output tiếng Việt.`;

const TOOL_RECONSTRUCT = {
  name: 'xuat_cau_tra_loi_suy_luan',
  description: 'Suy luận ngược 13 câu trả lời gốc từ kết quả Định Vị đã có sẵn.',
  input_schema: {
    type: 'object',
    properties: {
      answers: {
        type: 'object',
        description: 'Suy luận ngược câu trả lời gốc cho từng câu hỏi — để chuỗi rỗng "" nếu không tìm được thông tin tương ứng.',
        properties: Object.fromEntries(Object.entries(ANSWER_FIELDS).map(([k, desc]) => [k, { type: 'string', description: desc }])),
        required: Object.keys(ANSWER_FIELDS),
      },
    },
    required: ['answers'],
  },
};

async function callClaude({ apiKey, system, userContent, tool }) {
  // fetch() mặc định KHÔNG có giới hạn thời gian chờ — nếu Anthropic bị treo/chậm bất thường,
  // request có thể "treo" tới tận khi Vercel tự ngắt hàm (300s) mới có phản hồi, thay vì báo lỗi
  // sớm để người dùng biết mà thử lại. Đặt trần 90s riêng cho lệnh gọi AI.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 150000);
  let resp;
  try {
    resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 4000,
        system: (typeof system === 'string' ? [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }] : system),
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
  if (data.stop_reason === 'max_tokens') {
    throw new Error('AI sinh kết quả dài quá giới hạn cho phép — thử lại giúp mình.');
  }
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
    const { luot1, luot2 } = req.body || {};
    if (!luot1) { res.status(400).json({ error: 'Thiếu kết quả Định Vị để suy luận.' }); return; }

    const userContent = `KẾT QUẢ ĐỊNH VỊ ĐÃ CÓ:\n${JSON.stringify({ luot1, luot2: luot2 || null }, null, 2)}\n\nHãy suy luận ngược đúng 13 câu trả lời gốc theo nguyên tắc.`;

    const result = await callClaude({ apiKey, system: SYSTEM_PROMPT, userContent, tool: TOOL_RECONSTRUCT });
    res.status(200).json({ answers: result.answers || {} });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Có lỗi xảy ra khi suy luận câu trả lời.' });
  }
};
