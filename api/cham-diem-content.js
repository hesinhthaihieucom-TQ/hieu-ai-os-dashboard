// Serverless function — chấm điểm 1 bài content theo rubric tổng hợp từ:
// checklist "Sửa bài AI viết theo chiến lược" (Buổi 3) + tiêu chí HM7-HM9 (SOI KÊNH AI).
const { requireUser } = require('./_lib/auth');
const { checkAndConsumeTrialQuota } = require('./_lib/trial-quota');

const SYSTEM_PROMPT = `Bạn là biên tập viên chấm điểm content cho người xây thương hiệu cá nhân tại Việt Nam.

RUBRIC CHẤM ĐIỂM (bắt buộc theo đúng khung này):
1. Bài thuộc tầng nào: Thu hút / Ảnh hưởng / Chuyển đổi — có nhất quán xuyên suốt không.
2. Bài thuộc loại content nào: Viral / Uy tín / Ra tiền / Cộng đồng.
3. Hook có làm ĐÚNG người cần nghe dừng lại không (không phải chỉ "hay chung chung").
4. Thân bài có chất liệu thật không (câu chuyện, quan sát, case, số liệu) hay chỉ lý thuyết suông.
5. Giá trị sau khi đọc có rõ không — người đọc biết mình nhận được gì hoặc làm được gì.
6. CTA có khớp mục tiêu bài không (không phải bài nào cũng "inbox").
7. Bài có đang bị "AI hoá" — viết chung chung, sáo rỗng, không có góc nhìn riêng — hay không.

NGUYÊN TẮC:
- Không khen xã giao. Chỉ điểm đúng vấn đề, đúng chỗ, đúng cách sửa.
- Nếu có dữ liệu Định Vị kèm theo, chấm thêm mức độ khớp giọng điệu/bản sắc đã chốt. Nếu không có, bỏ qua tiêu chí này một cách rõ ràng (không suy đoán định vị).
- Trích đúng câu/đoạn yếu nhất trong bài để dẫn chứng — không nói chung chung "phần thân bài còn yếu".
- Output tiếng Việt, giữ nguyên thuật ngữ chuyên ngành (hook, CTA, content, insight...).`;

const TOOL_SCORE = {
  name: 'xuat_cham_diem_content',
  description: 'Xuất kết quả chấm điểm 1 bài content theo rubric 7 tiêu chí.',
  input_schema: {
    type: 'object',
    properties: {
      tang_noi_dung: { type: 'string', enum: ['Thu hút','Ảnh hưởng','Chuyển đổi','Không rõ ràng'] },
      loai_content: { type: 'string', enum: ['Viral','Uy tín','Ra tiền','Cộng đồng','Không rõ ràng'] },
      diem_tong: { type: 'integer', minimum: 0, maximum: 100 },
      tieu_chi: {
        type: 'array',
        minItems: 6,
        maxItems: 6,
        description: 'Đúng 6 tiêu chí: Hook đúng người dừng lại, Chất liệu thật, Giá trị rõ ràng, CTA khớp mục tiêu, Không bị AI hoá, Khớp giọng điệu định vị.',
        items: {
          type: 'object',
          properties: {
            ten: { type: 'string' },
            diem: { type: 'integer', minimum: 0, maximum: 10 },
            nhan_xet: { type: 'string' },
            goi_y_sua: { type: 'string' },
          },
          required: ['ten','diem','nhan_xet','goi_y_sua'],
        },
      },
      cau_yeu_nhat: { type: 'string', description: 'Trích nguyên văn câu/đoạn yếu nhất trong bài.' },
      ban_sua_de_xuat: { type: 'string', description: 'Viết lại đoạn yếu nhất đó cho tốt hơn.' },
      ket_luan: { type: 'string', description: 'Kết luận ngắn: đăng được luôn / cần sửa gì trước khi đăng / nên viết lại.' },
    },
    required: ['tang_noi_dung','loai_content','diem_tong','tieu_chi','cau_yeu_nhat','ban_sua_de_xuat','ket_luan'],
  },
};

async function callClaude({ apiKey, system, userContent, tool }) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 3000,
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
    const { content_text, positioning } = req.body || {};
    if (!content_text || !content_text.trim()) { res.status(400).json({ error: 'Thiếu nội dung bài viết cần chấm.' }); return; }

    const userContent = `${positioning && positioning.luot1 ? `ĐỊNH VỊ THƯƠNG HIỆU ĐÃ CHỐT:\n${JSON.stringify(positioning.luot1, null, 2)}\n\n` : '(Chưa có dữ liệu Định Vị — bỏ qua tiêu chí khớp giọng điệu, ghi rõ điều này trong nhận xét.)\n\n'}BÀI VIẾT CẦN CHẤM:\n${content_text}\n\nHãy chấm theo đúng rubric 7 tiêu chí.`;

    const result = await callClaude({ apiKey, system: SYSTEM_PROMPT, userContent, tool: TOOL_SCORE });
    res.status(200).json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Có lỗi xảy ra khi chấm điểm.' });
  }
};
