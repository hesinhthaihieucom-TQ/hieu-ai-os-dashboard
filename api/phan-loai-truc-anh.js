// Serverless function — như api/phan-loai-truc.js nhưng phân loại trục nội dung TỪ 1 ẢNH (dùng cho
// Kho Case Study, nhan-hieu/js/kho-content.js) thay vì từ chữ — chị Quỳnh chỉ muốn tải ảnh lên,
// không muốn gõ tiêu đề/nội dung gì, AI tự nhìn ảnh xếp vào đúng trục (sức khoẻ/xây kênh/tài
// chính...). Dùng khả năng đọc ảnh (vision) có sẵn của Claude Messages API, cùng PILLARS/TOOL/
// callClaude y hệt phan-loai-truc.js — chỉ khác input gửi AI là 1 content block ảnh thay vì chữ.
const { requireUser } = require('./_lib/auth');
const { PILLARS } = require('./_lib/pillars');

const PILLAR_KEYS = PILLARS.map((p) => p.key);

const SYSTEM_PROMPT = `Bạn là chuyên gia phân loại nội dung mạng xã hội theo trục nội dung (content pillar) tại Việt Nam.

Đây là danh sách trục nội dung:
${PILLARS.map((p) => `- ${p.key}: ${p.label}`).join('\n')}

NHIỆM VỤ: Nhìn ảnh được đưa (thường là ảnh case study/kết quả/testimonial của 1 khách hàng), chọn ĐÚNG 1 trục phù hợp nhất trong danh sách trên — không được bịa trục mới ngoài danh sách. Nếu ảnh không rõ thuộc trục nào, chọn trục GẦN ĐÚNG NHẤT dựa trên bối cảnh nhìn thấy (chữ trong ảnh, sản phẩm, bối cảnh...).`;

const TOOL_PHAN_LOAI = {
  name: 'xuat_phan_loai_truc',
  description: 'Xuất đúng 1 trục nội dung phù hợp nhất với ảnh.',
  input_schema: {
    type: 'object',
    properties: {
      truc: { type: 'string', enum: PILLAR_KEYS },
    },
    required: ['truc'],
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
    const { image_base64, media_type } = req.body || {};
    if (!image_base64 || !image_base64.trim()) { res.status(400).json({ error: 'Thiếu ảnh để phân loại.' }); return; }

    const userContent = [
      { type: 'image', source: { type: 'base64', media_type: media_type || 'image/jpeg', data: image_base64 } },
      { type: 'text', text: 'Chọn đúng 1 trục nội dung phù hợp nhất với ảnh case study này.' },
    ];
    const result = await callClaude({ apiKey, system: SYSTEM_PROMPT, userContent, tool: TOOL_PHAN_LOAI });
    res.status(200).json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Có lỗi xảy ra khi phân loại trục nội dung.' });
  }
};
