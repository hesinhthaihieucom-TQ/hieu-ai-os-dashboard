// Serverless function — tự chọn 1 trục nội dung phù hợp nhất cho 1 bài/tư liệu/hook, để không
// còn bắt người dùng tự chọn trục thủ công và không còn mục "Chưa phân loại".
const { requireUser } = require('./_lib/auth');
const { PILLARS } = require('./_lib/pillars');

const PILLAR_KEYS = PILLARS.map((p) => p.key);

const SYSTEM_PROMPT = `Bạn là chuyên gia phân loại nội dung mạng xã hội theo trục nội dung (content pillar) tại Việt Nam.

Đây là danh sách trục nội dung:
${PILLARS.map((p) => `- ${p.key}: ${p.label}`).join('\n')}

NHIỆM VỤ: Đọc tiêu đề/nội dung được đưa, chọn ĐÚNG 1 trục phù hợp nhất trong danh sách trên — không được bịa trục mới ngoài danh sách. Nếu nội dung pha trộn nhiều chủ đề, chọn trục NỔI BẬT NHẤT.`;

const TOOL_PHAN_LOAI = {
  name: 'xuat_phan_loai_truc',
  description: 'Xuất đúng 1 trục nội dung phù hợp nhất.',
  input_schema: {
    type: 'object',
    properties: {
      truc: { type: 'string', enum: PILLAR_KEYS },
    },
    required: ['truc'],
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
        max_tokens: 200,
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
    const { title, content } = req.body || {};
    const text = [title, content].filter(Boolean).join('\n').trim();
    if (!text) { res.status(400).json({ error: 'Thiếu nội dung để phân loại.' }); return; }

    const userContent = `TIÊU ĐỀ: ${title || '(không có)'}\nNỘI DUNG:\n${(content || '').slice(0, 3000)}`;
    const result = await callClaude({ apiKey, system: SYSTEM_PROMPT, userContent, tool: TOOL_PHAN_LOAI });
    res.status(200).json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Có lỗi xảy ra khi phân loại trục nội dung.' });
  }
};
