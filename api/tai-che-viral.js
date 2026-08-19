// Serverless function — Phân Tích & Tái Chế Content Viral.
// Tách thành nhiều bước nhẹ thay vì 1 lệnh gọi AI nặng duy nhất (từng bị lỗi/cắt giữa chừng khi
// chọn "5 bài viết mới" — 5 bài hoàn chỉnh cùng lúc rất dễ vượt giới hạn model):
//   stage="phan_tich" — chỉ mổ xẻ bài gốc, xong hỏi người dùng có muốn tái chế không.
//   stage="tieu_de"   — sinh 10 tiêu đề mới, dùng lại kết quả phan_tich đã có (không phân tích lại).
//   stage="mot_bai"   — sinh ĐÚNG 1 bài mới/lần, gọi lặp lại 5 lần phía client ("Bài tiếp theo →"),
//                       biết các ý đã viết trước đó để không lặp góc độ.
const { requireUser } = require('./_lib/auth');
const { checkAndConsumeTrialQuota, refundTrialQuota } = require('./_lib/trial-quota');

const ANALYZE_PROMPT = `Bạn là chuyên gia phân tích tâm lý học content viral, giỏi mổ xẻ vì sao 1 bài viết/video thành công.

Phân tích chính xác 3 điều sau từ bài viral người dùng cung cấp:
(1) Yếu tố nào trong câu/đoạn mở đầu khiến người đọc dừng lại — gọi tên đúng cơ chế tâm lý (tò mò bỏ ngỏ, cảnh báo mất mát, nghịch lý, chỉ đích danh...).
(2) Điểm nào trong bài tạo ra cảm xúc mạnh nhất, và đó là cảm xúc gì (sợ hãi, hy vọng, phẫn nộ, đồng cảm, tự hào, xấu hổ...).
(3) Vì sao người đọc muốn chia sẻ bài này cho người khác — họ chia sẻ để thể hiện điều gì về bản thân, hay muốn giúp ai.
Output tiếng Việt.`;

function recycleSystemPrompt() {
  return `Bạn là chuyên gia tái chế content viral — dựa đúng vào 1 bản MỔ XẺ TÂM LÝ đã có sẵn của 1 bài viral gốc (không phải tự phân tích lại), áp dụng cấu trúc tâm lý đó cho 1 chủ đề mới. Không copy câu chữ bài gốc, chỉ giữ cơ chế tâm lý.
Nếu người dùng có cung cấp định vị thương hiệu hoặc bối cảnh nhanh (ngành/đối tượng), bám theo giọng điệu và đối tượng đó. Nếu không có, viết tự nhiên, phổ quát, dễ áp dụng.
Output tiếng Việt.`;
}

const TOOL_PHAN_TICH = {
  name: 'xuat_phan_tich',
  description: 'Xuất kết quả mổ xẻ tâm lý bài viral gốc.',
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
    },
    required: ['phan_tich'],
  },
};

const TOOL_TIEU_DE = {
  name: 'xuat_tieu_de_moi',
  description: 'Xuất đúng 10 tiêu đề mới, giữ nguyên cơ chế tâm lý mở đầu đã mổ xẻ.',
  input_schema: {
    type: 'object',
    properties: {
      tieu_de_moi: { type: 'array', items: { type: 'string' }, minItems: 10, maxItems: 10, description: 'Đúng 10 tiêu đề mới cho chủ đề mới.' },
    },
    required: ['tieu_de_moi'],
  },
};

const TOOL_MOT_BAI = {
  name: 'xuat_mot_bai_moi',
  description: 'Xuất đúng 1 bài viết mới hoàn chỉnh, tái chế theo đúng cấu trúc tâm lý đã mổ xẻ.',
  input_schema: {
    type: 'object',
    properties: {
      tieu_de: { type: 'string' },
      noi_dung: { type: 'string', description: 'Toàn bộ bài viết mới hoàn chỉnh (mở đầu - thân bài - kết), sẵn sàng đăng.' },
    },
    required: ['tieu_de', 'noi_dung'],
  },
};

async function callClaudeOnce({ apiKey, system, userContent, tool, maxTokens }) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userContent }],
      tools: [tool],
      tool_choice: { type: 'tool', name: tool.name },
    }),
  });
  if (!resp.ok) throw new Error(`Anthropic API lỗi (${resp.status}): ${await resp.text()}`);
  return resp.json();
}

// Bài dài/chủ đề phức tạp thỉnh thoảng vẫn vượt maxTokens dù đã đặt khá cao — thay vì báo lỗi ngay
// bắt người dùng tự bấm lại, tự động thử lại 1 lần với giới hạn gấp đôi trước khi thật sự báo lỗi.
async function callClaude({ apiKey, system, userContent, tool, maxTokens }) {
  let data = await callClaudeOnce({ apiKey, system, userContent, tool, maxTokens });
  if (data.stop_reason === 'max_tokens') {
    data = await callClaudeOnce({ apiKey, system, userContent, tool, maxTokens: maxTokens * 2 });
  }
  if (data.stop_reason === 'max_tokens') {
    throw new Error('AI sinh kết quả dài quá giới hạn cho phép — thử lại giúp mình.');
  }
  const toolUse = (data.content || []).find((b) => b.type === 'tool_use');
  if (!toolUse) throw new Error('Không nhận được kết quả có cấu trúc từ AI.');
  return toolUse.input;
}

function contextBlockOf(positioning, quick_context) {
  return positioning && positioning.luot1
    ? `ĐỊNH VỊ THƯƠNG HIỆU ĐÃ CHỐT:\n${JSON.stringify(positioning.luot1, null, 2)}`
    : (quick_context && quick_context.trim()
      ? `BỐI CẢNH NHANH (chưa làm Định Vị đầy đủ): ${quick_context.trim()}`
      : 'BỐI CẢNH: (không cung cấp — viết tự nhiên, phổ quát)');
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
    const { viral_text, topic, positioning, quick_context, stage, phan_tich, previous_ideas, post_index, total_posts } = req.body || {};
    if (!viral_text || !viral_text.trim()) { res.status(400).json({ error: 'Thiếu bài viral gốc để phân tích.' }); return; }

    if (stage === 'phan_tich') {
      const userContent = `BÀI VIRAL GỐC:\n${viral_text}\n\nHãy mổ xẻ đúng 3 điều theo hướng dẫn.`;
      const result = await callClaude({ apiKey, system: ANALYZE_PROMPT, userContent, tool: TOOL_PHAN_TICH, maxTokens: 1200 });
      res.status(200).json({ result });
      return;
    }

    if (!topic || !topic.trim()) { res.status(400).json({ error: 'Thiếu chủ đề mới muốn áp dụng.' }); return; }
    if (!phan_tich) { res.status(400).json({ error: 'Thiếu kết quả phân tích bài gốc — phân tích lại giúp mình.' }); return; }
    const contextBlock = contextBlockOf(positioning, quick_context);
    const phanTichBlock = `MỔ XẺ TÂM LÝ BÀI GỐC (đã có sẵn, KHÔNG phân tích lại):\n${JSON.stringify(phan_tich, null, 2)}`;

    if (stage === 'tieu_de') {
      const userContent = `${phanTichBlock}\n\n${contextBlock}\n\nCHỦ ĐỀ MỚI MUỐN ÁP DỤNG:\n${topic}\n\nHãy tạo đúng 10 tiêu đề mới giữ nguyên cơ chế tâm lý mở đầu ở trên.`;
      const result = await callClaude({ apiKey, system: recycleSystemPrompt(), userContent, tool: TOOL_TIEU_DE, maxTokens: 2000 });
      res.status(200).json({ result });
      return;
    }

    if (stage === 'mot_bai') {
      const idx = Number.isInteger(post_index) ? post_index : 0;
      const total = Number.isInteger(total_posts) ? total_posts : 5;
      const prevList = Array.isArray(previous_ideas) ? previous_ideas.filter(Boolean) : [];
      const prevBlock = prevList.length
        ? `CÁC BÀI ĐÃ VIẾT TRƯỚC ĐÓ TRONG LOẠT NÀY (không lặp lại góc độ/ví dụ, phải khác hẳn):\n${prevList.map((t, i) => `${i + 1}. ${t}`).join('\n')}`
        : '(đây là bài đầu tiên trong loạt, chưa có bài nào trước đó)';
      const userContent = `${phanTichBlock}\n\n${contextBlock}\n\nCHỦ ĐỀ MỚI MUỐN ÁP DỤNG:\n${topic}\n\n${prevBlock}\n\nHãy viết ĐÚNG 1 bài mới hoàn chỉnh (bài thứ ${idx + 1}/${total}) giữ nguyên cấu trúc tâm lý (hook, điểm cảm xúc cao trào, lý do đáng chia sẻ) như bài gốc, nội dung/câu chữ/ví dụ hoàn toàn mới và khác các bài đã liệt kê ở trên.`;
      const result = await callClaude({ apiKey, system: recycleSystemPrompt(), userContent, tool: TOOL_MOT_BAI, maxTokens: 4000 });
      res.status(200).json({ result });
      return;
    }

    res.status(400).json({ error: 'Thiếu hoặc sai "stage" (phan_tich | tieu_de | mot_bai).' });
  } catch (err) {
    await refundTrialQuota(user.id);
    res.status(500).json({ error: err.message || 'Có lỗi xảy ra khi phân tích/tái chế content.' });
  }
};
