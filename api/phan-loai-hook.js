// Serverless function — tự phân loại 1 câu hook người dùng tự nhập vào đúng 1 trong 15 loại hook,
// để "Kho của tôi" không bắt người dùng tự chọn loại (đa số không biết phân loại).
const { requireUser } = require('./_lib/auth');
const { HOOK_CATEGORIES } = require('./_lib/hook-categories');

const CATEGORY_KEYS = Object.keys(HOOK_CATEGORIES);

const SYSTEM_PROMPT = `Bạn là chuyên gia phân loại hook (câu mở đầu) content mạng xã hội tại Việt Nam.

Đây là danh sách các loại hook và cách nhận biết từng loại:
${CATEGORY_KEYS.map(k => `- ${k}: ${HOOK_CATEGORIES[k].label} — ${HOOK_CATEGORIES[k].desc}`).join('\n')}

NHIỆM VỤ: Đọc câu hook được đưa, chọn ĐÚNG 1 loại phù hợp nhất trong danh sách trên. Nếu câu hook pha trộn nhiều đặc điểm, chọn loại NỔI BẬT NHẤT — không được bịa loại mới ngoài danh sách.`;

const TOOL_PHAN_LOAI = {
  name: 'xuat_phan_loai_hook',
  description: 'Xuất đúng 1 loại hook phù hợp nhất.',
  input_schema: {
    type: 'object',
    properties: {
      category: { type: 'string', enum: CATEGORY_KEYS },
    },
    required: ['category'],
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
        max_tokens: 200,
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
    const { hook_text } = req.body || {};
    if (!hook_text || !hook_text.trim()) { res.status(400).json({ error: 'Thiếu câu hook để phân loại.' }); return; }

    const userContent = `CÂU HOOK CẦN PHÂN LOẠI:\n${hook_text}`;
    const result = await callClaude({ apiKey, system: SYSTEM_PROMPT, userContent, tool: TOOL_PHAN_LOAI });
    res.status(200).json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Có lỗi xảy ra khi phân loại hook.' });
  }
};
