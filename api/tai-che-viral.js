// Serverless function — Phân Tích & Tái Chế Content Viral.
// Mổ xẻ 1 bài viral có sẵn theo 3 câu hỏi (hook, điểm cảm xúc mạnh nhất, lý do muốn share),
// sau đó tái chế sang chủ đề mới bằng cách giữ nguyên cấu trúc tâm lý đã khiến bài gốc thành công —
// theo đúng công thức phân tích/tái chế content viral của đội ngũ.
const { requireUser } = require('./_lib/auth');

const SYSTEM_PROMPT = `Bạn là chuyên gia phân tích tâm lý học content viral, giỏi mổ xẻ vì sao 1 bài viết/video thành công và tái tạo lại cấu trúc đó cho chủ đề khác.

BƯỚC 1 — MỔ XẺ BÀI GỐC (bắt buộc, luôn làm trước):
Phân tích chính xác 3 điều sau từ bài viral người dùng cung cấp:
(1) Yếu tố nào trong câu/đoạn mở đầu khiến người đọc dừng lại — gọi tên đúng cơ chế tâm lý (tò mò bỏ ngỏ, cảnh báo mất mát, nghịch lý, chỉ đích danh...).
(2) Điểm nào trong bài tạo ra cảm xúc mạnh nhất, và đó là cảm xúc gì (sợ hãi, hy vọng, phẫn nộ, đồng cảm, tự hào, xấu hổ...).
(3) Vì sao người đọc muốn chia sẻ bài này cho người khác — họ chia sẻ để thể hiện điều gì về bản thân, hay muốn giúp ai.

BƯỚC 2 — TÁI CHẾ SANG CHỦ ĐỀ MỚI:
Dựa đúng vào cấu trúc tâm lý vừa mổ xẻ ở Bước 1 (không phải copy câu chữ), áp dụng cho chủ đề mới người dùng cung cấp. Tuỳ chế độ được chọn:
- Nếu chế độ là "tieu_de": tạo đúng 10 tiêu đề mới cho chủ đề mới, mỗi tiêu đề phải giữ được đúng cơ chế tâm lý mở đầu đã mổ xẻ ở Bước 1.
- Nếu chế độ là "bai_moi": tạo đúng 5 bài viết mới hoàn chỉnh (mở đầu - thân bài - kết) cho chủ đề mới, mỗi bài phải giữ nguyên cấu trúc tâm lý (hook, điểm cảm xúc cao trào, lý do đáng chia sẻ) như bài gốc, nhưng nội dung, câu chữ, ví dụ phải hoàn toàn mới, không sao chép bài gốc.
Chỉ điền đúng 1 trong 2 trường tieu_de_moi/bai_moi theo chế độ được yêu cầu, trường còn lại để mảng rỗng.

Nếu người dùng có cung cấp định vị thương hiệu hoặc bối cảnh nhanh (ngành/đối tượng), bám theo giọng điệu và đối tượng đó khi tái chế. Nếu không có, viết tự nhiên, phổ quát, dễ áp dụng.
Output tiếng Việt.`;

const TOOL_TAI_CHE = {
  name: 'xuat_phan_tich_tai_che',
  description: 'Xuất kết quả mổ xẻ bài viral gốc và nội dung tái chế theo chủ đề mới.',
  input_schema: {
    type: 'object',
    properties: {
      phan_tich: {
        type: 'object',
        properties: {
          yeu_to_mo_dau: { type: 'string', description: 'Cơ chế tâm lý trong câu/đoạn mở đầu khiến người đọc dừng lại.' },
          diem_cam_xuc_manh_nhat: { type: 'string', description: 'Đoạn/chi tiết tạo ra cảm xúc mạnh nhất trong bài.' },
          loai_cam_xuc: { type: 'string', description: 'Tên cụ thể của cảm xúc đó (sợ hãi, hy vọng, phẫn nộ, đồng cảm...).' },
          ly_do_muon_share: { type: 'string', description: 'Vì sao người đọc muốn chia sẻ bài này cho người khác.' },
        },
        required: ['yeu_to_mo_dau', 'diem_cam_xuc_manh_nhat', 'loai_cam_xuc', 'ly_do_muon_share'],
      },
      tieu_de_moi: {
        type: 'array', items: { type: 'string' }, minItems: 0, maxItems: 10,
        description: 'Đúng 10 tiêu đề mới nếu chế độ là tieu_de, mảng rỗng nếu không.',
      },
      bai_moi: {
        type: 'array', minItems: 0, maxItems: 5,
        items: {
          type: 'object',
          properties: {
            tieu_de: { type: 'string' },
            noi_dung: { type: 'string', description: 'Toàn bộ bài viết mới hoàn chỉnh, sẵn sàng đăng.' },
          },
          required: ['tieu_de', 'noi_dung'],
        },
        description: 'Đúng 5 bài mới hoàn chỉnh nếu chế độ là bai_moi, mảng rỗng nếu không.',
      },
    },
    required: ['phan_tich', 'tieu_de_moi', 'bai_moi'],
  },
};

async function callClaude({ apiKey, system, userContent, tool }) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 6000,
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

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'Server chưa được cấu hình ANTHROPIC_API_KEY.' }); return; }

  try {
    const { viral_text, topic, mode, positioning, quick_context } = req.body || {};
    if (!viral_text || !viral_text.trim()) { res.status(400).json({ error: 'Thiếu bài viral gốc để phân tích.' }); return; }
    if (!topic || !topic.trim()) { res.status(400).json({ error: 'Thiếu chủ đề mới muốn áp dụng.' }); return; }
    if (!['tieu_de', 'bai_moi'].includes(mode)) { res.status(400).json({ error: 'Chế độ không hợp lệ.' }); return; }

    const contextBlock = positioning && positioning.luot1
      ? `ĐỊNH VỊ THƯƠNG HIỆU ĐÃ CHỐT:\n${JSON.stringify(positioning.luot1, null, 2)}`
      : (quick_context && quick_context.trim()
        ? `BỐI CẢNH NHANH (chưa làm Định Vị đầy đủ): ${quick_context.trim()}`
        : 'BỐI CẢNH: (không cung cấp — viết tự nhiên, phổ quát)');

    const userContent = `BÀI VIRAL GỐC:\n${viral_text}\n\n${contextBlock}\n\nCHỦ ĐỀ MỚI MUỐN ÁP DỤNG:\n${topic}\n\nCHẾ ĐỘ TÁI CHẾ: ${mode === 'tieu_de' ? 'tieu_de (tạo 10 tiêu đề mới)' : 'bai_moi (tạo 5 bài mới hoàn chỉnh)'}\n\nHãy mổ xẻ bài gốc trước, sau đó tái chế đúng theo chế độ trên.`;

    const result = await callClaude({ apiKey, system: SYSTEM_PROMPT, userContent, tool: TOOL_TAI_CHE });
    res.status(200).json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Có lỗi xảy ra khi phân tích/tái chế content.' });
  }
};
