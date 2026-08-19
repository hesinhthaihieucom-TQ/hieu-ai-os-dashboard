// Serverless function — gợi ý cách "đẩy bài" theo từng mốc lượt xem trên Facebook:
// câu bình luận tự đăng (kích người khác cmt theo / dẫn CTA), gợi ý trả lời bình luận người khác,
// và nên gắn tài sản quảng bá nào (sản phẩm số, aff, cộng đồng) phù hợp với đúng giai đoạn đó.
const { requireUser } = require('./_lib/auth');
const { checkAndConsumeTrialQuota } = require('./_lib/trial-quota');

const MILESTONES = {
  m1: { label:'Trước 1.000 view đầu tiên', desc:'Giai đoạn khơi mào — mục tiêu duy nhất là kích người xem để lại bình luận đầu tiên, tuyệt đối chưa nên gắn link bán hàng vì dễ làm giảm reach.' },
  m2: { label:'Đạt 10.000 view', desc:'Bài đã có đà — có thể bắt đầu dẫn nhẹ về 1 tài sản ít cam kết (cộng đồng miễn phí, hoặc aff sản phẩm người khác) mà không phá vỡ mạch tương tác tự nhiên.' },
  m3: { label:'Đạt 100.000 view', desc:'Bài đang viral thật — đủ lượng người lạ để bắt đầu dẫn về tài sản có giá trị hơn (sản phẩm số của mình hoặc aff của mình), CTA rõ ràng hơn.' },
  m4: { label:'Đạt 1 triệu view', desc:'Bài đã viral lớn — đây là lúc tận dụng tối đa, CTA mạnh và cụ thể để chuyển đổi số đông người xem thành khách hàng/lead thật.' },
  m5: { label:'Trên 1 triệu view', desc:'Bài viral cực lớn — ưu tiên tài sản có giá trị chuyển đổi cao nhất (sản phẩm số/aff chính), đồng thời tận dụng để mở rộng cộng đồng cho các đợt sau.' },
};

const SYSTEM_PROMPT = `Bạn là chuyên gia tăng trưởng kênh mạng xã hội tại Việt Nam, chuyên "đẩy bài" theo từng mốc lượt xem để tối đa hoá tương tác rồi chuyển đổi đúng thời điểm.

NGUYÊN TẮC BẮT BUỘC:
- Mỗi mốc lượt xem có mục tiêu khác nhau — không dùng chung 1 kiểu bình luận cho mọi mốc.
- Bình luận tự đăng (cmt_tu_dang) ở mốc đầu (trước 1.000 view) phải là bình luận KÍCH THÍCH người khác trả lời/tranh luận, tuyệt đối không chèn link hay CTA bán hàng.
- Từ mốc 10.000 view trở đi, nếu bình luận có CTA, luôn chốt bằng đúng 1 từ khoá kích hoạt 2 chữ theo mẫu "Để lại bình luận chữ '...' và mình sẽ gửi bạn ...", giống quy tắc CTA dùng trong Viết Content.
- Chỉ đề xuất gắn 1 tài sản quảng bá trong danh sách được cung cấp — nếu danh sách rỗng hoặc không có tài sản nào phù hợp với mốc này, để trống và giải thích rõ vì sao chưa nên gắn gì.
- Nếu người dùng đã chỉ định rõ 1 TÀI SẢN MUỐN DÙNG, ưu tiên chọn đúng tài sản đó (trừ khi nó thực sự không phù hợp mốc này — ví dụ mốc trước 1.000 view thì dù người dùng chỉ định vẫn không nên gắn link) — khi đó giải thích rõ vì sao chưa hợp và gợi ý nên đợi mốc nào.
- Gợi ý trả lời bình luận (goi_y_tra_loi_cmt) phải là các mẫu câu tự nhiên, đúng giọng, dùng được cho nhiều loại bình luận khác nhau (khen, hỏi, nghi ngờ...).
- Output tiếng Việt.`;

const TOOL_DAY_BAI = {
  name: 'xuat_goi_y_day_bai',
  description: 'Xuất gợi ý đẩy bài cho đúng 1 mốc lượt xem.',
  input_schema: {
    type: 'object',
    properties: {
      chien_luoc_moc_nay: { type: 'string', description: 'Mục tiêu chính cần tập trung ở mốc này, 1-2 câu.' },
      cmt_tu_dang: { type: 'string', description: 'Câu bình luận tự đăng/ghim phù hợp với đúng mốc này.' },
      goi_y_tra_loi_cmt: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 3, description: 'Đúng 3 mẫu câu trả lời bình luận người khác, dùng được cho nhiều tình huống.' },
      tai_san_de_xuat: {
        type: 'object',
        properties: {
          label: { type: 'string', description: 'Tên tài sản được chọn — PHẢI khớp đúng 1 label trong danh sách được cung cấp, hoặc để rỗng nếu chưa nên gắn gì.' },
          ly_do: { type: 'string', description: 'Vì sao chọn (hoặc chưa chọn) tài sản này cho đúng mốc này.' },
        },
        required: ['label', 'ly_do'],
      },
    },
    required: ['chien_luoc_moc_nay', 'cmt_tu_dang', 'goi_y_tra_loi_cmt', 'tai_san_de_xuat'],
  },
};

async function callClaude({ apiKey, system, userContent, tool }) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 2000,
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

  const quotaError = await checkAndConsumeTrialQuota(user.id);
  if (quotaError) { res.status(402).json({ error: quotaError, quotaExceeded: true }); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'Server chưa được cấu hình ANTHROPIC_API_KEY.' }); return; }

  try {
    const { topic, milestone, assets, preferred_asset, positioning, quick_context } = req.body || {};
    if (!topic || !topic.trim()) { res.status(400).json({ error: 'Thiếu nội dung/chủ đề bài đang đẩy.' }); return; }
    const m = MILESTONES[milestone];
    if (!m) { res.status(400).json({ error: 'Mốc lượt xem không hợp lệ.' }); return; }

    const assetsList = Array.isArray(assets) && assets.length
      ? assets.map(a => `- ${a.label}${a.url ? ` (${a.url})` : ''}`).join('\n')
      : '(chưa có tài sản quảng bá nào được lưu)';

    const contextBlock = positioning && positioning.luot1
      ? `ĐỊNH VỊ THƯƠNG HIỆU ĐÃ CHỐT:\n${JSON.stringify(positioning.luot1, null, 2)}`
      : (quick_context && quick_context.trim()
        ? `BỐI CẢNH NHANH (chưa làm Định Vị đầy đủ): ${quick_context.trim()}`
        : 'BỐI CẢNH: (không cung cấp — viết tự nhiên, phổ quát)');

    const preferredLine = preferred_asset && preferred_asset.trim()
      ? `\n\nTÀI SẢN NGƯỜI DÙNG MUỐN DÙNG CHO BÀI NÀY: ${preferred_asset.trim()}`
      : '';

    const userContent = `BÀI ĐANG ĐẨY (chủ đề/nội dung):\n${topic}\n\nMỐC LƯỢT XEM HIỆN TẠI: ${m.label} — ${m.desc}\n\nDANH SÁCH TÀI SẢN QUẢNG BÁ CÓ SẴN:\n${assetsList}${preferredLine}\n\n${contextBlock}\n\nHãy gợi ý đẩy bài đúng cho mốc này.`;

    const result = await callClaude({ apiKey, system: SYSTEM_PROMPT, userContent, tool: TOOL_DAY_BAI });
    res.status(200).json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Có lỗi xảy ra khi gợi ý đẩy bài.' });
  }
};
