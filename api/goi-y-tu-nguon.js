// Serverless function — từ 1 nội dung/hook có sẵn (chọn trong Kho Content hoặc Kho Hook),
// sinh 5 ý tưởng biến thể mới bám đúng trục nội dung đã định vị.
const { requireUser } = require('./_lib/auth');
const { checkAndConsumeTrialQuota, refundTrialQuota } = require('./_lib/trial-quota');

const SYSTEM_PROMPT = `Bạn là trợ lý sinh ý tưởng content cho người xây thương hiệu cá nhân tại Việt Nam.

NGUYÊN TẮC:
- Người dùng đưa 1 đoạn nội dung/hook có sẵn mà họ thấy hay (từ kho tư liệu). Nhiệm vụ của bạn là sinh ra 5 GÓC CONTENT MỚI lấy cảm hứng từ đoạn đó, không phải chép lại nguyên văn.
- Mỗi ý tưởng phải bám sát định vị thương hiệu đã chốt (đúng trục nội dung, đúng giọng điệu, đúng tệp khách hàng) — không lệch trục dù nguồn tham khảo thuộc ngành khác.
- Mỗi ý tưởng là 1 dòng mô tả góc content cụ thể (không phải bài viết hoàn chỉnh), đủ cụ thể để biết ngay sẽ viết về gì.
- Không chung chung, không sáo rỗng.
- Output tiếng Việt, giữ nguyên thuật ngữ chuyên ngành (hook, CTA, content...).`;

const TOOL_IDEAS = {
  name: 'xuat_y_tuong_tu_nguon',
  description: 'Xuất đúng 5 ý tưởng content lấy cảm hứng từ nguồn tham khảo.',
  input_schema: {
    type: 'object',
    properties: {
      y_tuong: { type: 'array', items: { type: 'string' }, minItems: 5, maxItems: 5 },
    },
    required: ['y_tuong'],
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
        max_tokens: 2000,
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

  const quotaError = await checkAndConsumeTrialQuota(user.id, 'goi-y-tu-nguon');
  if (quotaError) { res.status(402).json({ error: quotaError, quotaExceeded: true }); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'Server chưa được cấu hình ANTHROPIC_API_KEY.' }); return; }

  try {
    const { source_text, positioning, quick_context } = req.body || {};
    if (!source_text || !source_text.trim()) { res.status(400).json({ error: 'Thiếu nội dung nguồn để sinh ý tưởng.' }); return; }
    const hasPositioning = !!(positioning && positioning.luot1);
    if (!hasPositioning && !(quick_context && quick_context.trim())) {
      res.status(400).json({ error: 'Cần có Định Vị hoặc mô tả nhanh ngành/đối tượng trước khi sinh ý tưởng.' }); return;
    }

    const contextBlock = hasPositioning
      ? `ĐỊNH VỊ THƯƠNG HIỆU ĐÃ CHỐT:\n${JSON.stringify(positioning.luot1, null, 2)}\n${positioning.luot2 ? JSON.stringify(positioning.luot2, null, 2) : ''}`
      : `BỐI CẢNH NHANH (chưa làm Định Vị đầy đủ): ${quick_context.trim()}`;

    const userContent = `${contextBlock}

NỘI DUNG NGUỒN THAM KHẢO (từ kho tư liệu):\n${source_text}

Hãy sinh 5 ý tưởng content mới lấy cảm hứng từ nguồn trên, bám đúng định vị.`;

    const result = await callClaude({ apiKey, system: SYSTEM_PROMPT, userContent, tool: TOOL_IDEAS });
    res.status(200).json({ result });
  } catch (err) {
    await refundTrialQuota(user.id, 'goi-y-tu-nguon');
    res.status(500).json({ error: err.message || 'Có lỗi xảy ra khi sinh ý tưởng.' });
  }
};
