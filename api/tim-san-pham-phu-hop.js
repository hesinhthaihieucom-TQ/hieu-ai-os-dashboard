// Giai đoạn 1 của "Tạo Sản Phẩm Bằng AI" (san-pham-so/) — tổng hợp 12 câu trả lời (mô hình Ikigai
// rút gọn) thành 2-3 phương án tên sản phẩm + outline cấp 1, hoặc cảnh báo nếu dữ liệu quá yếu để
// chốt. Cùng pattern callClaude/forced-tool-use với api/dinh-vi.js — xem file đó để đối chiếu.

const { requireUser } = require('./_lib/auth');
const { checkAndConsumeTrialQuota, refundTrialQuota } = require('./_lib/trial-quota');
const { TOOL_TIM_SAN_PHAM } = require('./_lib/tim-san-pham-schema');

const QUESTION_LABELS = {
  nganh: 'Ngành/lĩnh vực sản phẩm',
  a1: 'Kênh hiện có (nếu có) + số theo dõi + chủ đề họ quan tâm',
  a2: 'Mọi người hay nhắn hỏi/nhờ giúp điều gì nhất',
  a3: 'Tự học/luyện điều gì đủ lâu thành phản xạ',
  b1: 'Vấn đề đó mọi người đang tự xử lý thế nào, đã ai làm tốt chưa',
  b2: 'Ai đang bán thứ gần giống, họ chưa tốt ở đâu mà mình khác/tốt hơn',
  b3: 'Dạy trong 7-21 ngày có chia được 3 bước nhỏ không',
  c1: 'Có ai từng trả tiền cho thứ gần giống chưa, khoảng bao nhiêu',
  c2: 'Nếu hỏi thẳng 3 người mục tiêu, họ sẽ phản ứng thế nào',
  d1: 'Đối tượng cụ thể nhắm tới (không phải "mọi người")',
  d2: 'Phần nào hào hứng nhất, làm không thấy mệt',
};

const SYSTEM_PROMPT = `Bạn là chuyên gia tìm sản phẩm số phù hợp — giúp người dùng chốt ra 1 sản phẩm số cụ thể (không phải định vị thương hiệu, không dạy marketing/bán hàng) dựa trên đúng 12 câu trả lời của họ, theo tinh thần mô hình Ikigai (giao điểm giữa giỏi, thị trường cần, được trả tiền, và hào hứng làm).

NGUYÊN TẮC BẮT BUỘC:
- Chỉ dựa vào dữ liệu người dùng cung cấp — không tự bịa bằng chứng thị trường/số liệu không có trong dữ liệu.
- ĐỐI TƯỢNG trong mọi phương án phải cụ thể (tuổi/hoàn cảnh/giới tính nếu có) — tuyệt đối không viết "mọi người" hay chung chung.
- Trước khi đề xuất phương án, tự đánh giá dữ liệu có đủ mạnh không (xem quy tắc du_lieu_du_manh trong schema) — thà báo cảnh báo còn hơn ép ra 1 sản phẩm không có cơ sở.
- Tên sản phẩm phải áp đúng 1 trong 4 công thức đặt tên đã định nghĩa trong schema, chọn công thức khớp với định dạng đề xuất.
- Mỗi phương án phải khác nhau THẬT SỰ (khác định dạng hoặc khác góc tiếp cận), không phải 3 cách diễn đạt của cùng 1 ý.
- Output tiếng Việt, gọi người dùng là "bạn".`;

function buildUserBlock(answers) {
  const lines = Object.keys(QUESTION_LABELS).map((id) => {
    const val = (answers && answers[id]) ? String(answers[id]).trim() : '(không trả lời)';
    return `- ${QUESTION_LABELS[id]}: ${val}`;
  });
  return `DỮ LIỆU NGƯỜI DÙNG CUNG CẤP:\n${lines.join('\n')}`;
}

async function callClaude({ apiKey, system, userContent, tool }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90000);
  let resp;
  try {
    resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 4000,
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

  const quotaError = await checkAndConsumeTrialQuota(user.id, 'tim-san-pham-phu-hop');
  if (quotaError) { res.status(402).json({ error: quotaError, quotaExceeded: true }); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Server chưa được cấu hình ANTHROPIC_API_KEY.' });
    return;
  }

  try {
    const { answers } = req.body || {};
    const userContent = `${buildUserBlock(answers)}\n\nHãy đánh giá và đề xuất kết quả theo đúng schema.`;
    const result = await callClaude({ apiKey, system: SYSTEM_PROMPT, userContent, tool: TOOL_TIM_SAN_PHAM });
    res.status(200).json({ result });
  } catch (err) {
    await refundTrialQuota(user.id, 'tim-san-pham-phu-hop');
    res.status(500).json({ error: err.message || 'Có lỗi xảy ra khi tìm sản phẩm phù hợp.' });
  }
};
