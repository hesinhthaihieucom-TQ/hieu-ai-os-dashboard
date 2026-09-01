// Serverless function — chấm điểm 1 câu hook: cơ chế tâm lý, đúng tệp không, dự đoán mức dừng lại.
const { requireUser } = require('./_lib/auth');
const { checkAndConsumeTrialQuota, refundTrialQuota } = require('./_lib/trial-quota');

const SYSTEM_PROMPT = `Bạn là chuyên gia chấm hook cho content mạng xã hội tại Việt Nam.

KHUNG PHÂN LOẠI HOOK (dùng để nhận diện):
- Nỗi đau: gọi tên đúng vấn đề người đọc đang gặp.
- Sự thật ngược: lật lại 1 niềm tin phổ biến.
- Cảnh báo: chỉ ra hậu quả nếu tiếp tục làm sai.
- Kết quả mong muốn: vẽ ra kết quả người đọc muốn đạt được.
- Từ khoá kích hoạt chú ý: dùng từ như "đầu tiên", "cuối cùng", "duy nhất", "sai lầm lớn nhất", "điều ít ai nói".

NGUYÊN TẮC CHẤM:
- Hook tốt không phải để gây sốc cho tất cả mọi người — mà để ĐÚNG người liên quan dừng lại. Hook chung chung, hợp với ai cũng được, là hook yếu dù nghe "kêu".
- Đánh giá dựa trên cơ chế tâm lý cụ thể (tò mò, sợ mất mát, mâu thuẫn nhận thức...), không nói chung chung "hook này hay/dở".
- Nếu có dữ liệu Định Vị kèm theo, đánh giá hook có gọi đúng tệp khách hàng mục tiêu trong định vị không.
- Không khen xã giao. Chỉ rõ điểm yếu và đưa bản cải thiện cụ thể.
- Output tiếng Việt, giữ nguyên thuật ngữ chuyên ngành (hook, CTA...).`;

const TOOL_SCORE = {
  name: 'xuat_cham_diem_hook',
  description: 'Xuất kết quả chấm điểm 1 câu hook.',
  input_schema: {
    type: 'object',
    properties: {
      loai_hook: { type: 'string', enum: ['Nỗi đau','Sự thật ngược','Cảnh báo','Kết quả mong muốn','Từ khoá kích hoạt chú ý','Khác/không rõ'] },
      diem_tong: { type: 'integer', minimum: 0, maximum: 100 },
      co_che_tam_ly: { type: 'string', description: 'Giải thích cơ chế tâm lý khiến hook này (không) hiệu quả.' },
      dung_tep_khong: { type: 'string', description: 'Đánh giá hook có gọi đúng tệp mục tiêu không — dựa trên định vị nếu có, nếu không thì đánh giá chung.' },
      du_doan_muc_do_dung_lai: { type: 'string', enum: ['Cao','Trung bình','Thấp'] },
      giai_thich_du_doan: { type: 'string' },
      diem_yeu: { type: 'string' },
      ban_cai_thien: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 3, description: 'Đúng 3 phiên bản hook cải thiện, dùng ngay được.' },
    },
    required: ['loai_hook','diem_tong','co_che_tam_ly','dung_tep_khong','du_doan_muc_do_dung_lai','giai_thich_du_doan','diem_yeu','ban_cai_thien'],
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
  const toolUse = (data.content || []).find((b) => b.type === 'tool_use');
  if (!toolUse) throw new Error('Không nhận được kết quả có cấu trúc từ AI.');
  return toolUse.input;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const user = await requireUser(req);
  if (!user) { res.status(401).json({ error: 'Bạn cần đăng nhập để dùng tính năng này.' }); return; }

  const quotaError = await checkAndConsumeTrialQuota(user.id, 'cham-diem-hook');
  if (quotaError) { res.status(402).json({ error: quotaError, quotaExceeded: true }); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'Server chưa được cấu hình ANTHROPIC_API_KEY.' }); return; }

  try {
    const { hook_text, positioning } = req.body || {};
    if (!hook_text || !hook_text.trim()) { res.status(400).json({ error: 'Thiếu câu hook cần chấm.' }); return; }

    const userContent = `${positioning && positioning.luot1 ? `ĐỊNH VỊ THƯƠNG HIỆU ĐÃ CHỐT:\n${JSON.stringify(positioning.luot1, null, 2)}\n\n` : '(Chưa có dữ liệu Định Vị — đánh giá chung, ghi rõ điều này.)\n\n'}HOOK CẦN CHẤM:\n"${hook_text}"\n\nHãy chấm theo đúng khung.`;

    const result = await callClaude({ apiKey, system: SYSTEM_PROMPT, userContent, tool: TOOL_SCORE });
    res.status(200).json({ result });
  } catch (err) {
    await refundTrialQuota(user.id, 'cham-diem-hook');
    res.status(500).json({ error: err.message || 'Có lỗi xảy ra khi chấm điểm hook.' });
  }
};
