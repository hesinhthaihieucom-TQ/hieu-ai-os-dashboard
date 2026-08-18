// Serverless function — sinh hook mẫu theo đúng 1 chủ đề + 1 loại hook người dùng chọn.
// Thay cho việc lục kho hook chung cố định, để luôn ra hook mới, sát chủ đề, đúng kiểu tâm lý muốn dùng.
const { requireUser } = require('./_lib/auth');

const HOOK_CATEGORIES = {
  to_mo_bo_ngo: { label: 'Tò mò bỏ ngỏ', desc: 'Mở ra một khoảng trống thông tin khiến người đọc phải đọc tiếp mới biết câu trả lời.' },
  canh_bao_mat_mat: { label: 'Cảnh báo / mất mát', desc: 'Chỉ ra thứ người đọc đang mất/sắp mất nếu không hành động.' },
  nghich_ly: { label: 'Nghịch lý / phản trực giác', desc: 'Nêu một điều nghe ngược với lẽ thường, khiến người đọc khựng lại.' },
  cau_hoi_goi_mo: { label: 'Câu hỏi gợi mở', desc: 'Đặt câu hỏi chạm đúng vấn đề/nỗi đau khiến người đọc tự soi vào mình.' },
  con_so_cu_the: { label: 'Con số cụ thể', desc: 'Dùng số liệu/tỷ lệ cụ thể, gây tò mò hoặc gây sốc.' },
  bi_mat_noi_bo: { label: 'Bí mật / nội bộ ngành', desc: 'Hé lộ điều ít ai nói ra, kiểu insider trong ngành.' },
  truoc_sau: { label: 'So sánh trước - sau', desc: 'Đối lập rõ trạng thái trước và sau một hành động/quyết định.' },
  khan_hiem_thoi_han: { label: 'Khan hiếm / thời hạn', desc: 'Tạo cảm giác cấp bách, sắp hết cơ hội/thời gian.' },
  thu_nhan_ca_nhan: { label: 'Thú nhận cá nhân', desc: 'Kể thật một sai lầm/trải nghiệm cá nhân để tạo sự chân thật, gần gũi.' },
  loi_sai_pho_bien: { label: 'Lỗi sai phổ biến', desc: 'Chỉ thẳng 1 sai lầm rất nhiều người mắc mà không biết.' },
  ket_qua_gay_soc: { label: 'Kết quả gây sốc / bằng chứng xã hội', desc: 'Đưa ra 1 kết quả cụ thể, ấn tượng làm bằng chứng đáng tin.' },
  lat_nguoc_niem_tin: { label: 'Lật ngược niềm tin', desc: 'Đập tan một niềm tin phổ biến mà người đọc vẫn tin là đúng.' },
  chi_dich_danh: { label: 'Chỉ đích danh / hiệu ứng gương', desc: 'Gọi đúng tên đối tượng cụ thể khiến người đọc thấy "đang nói về mình".' },
  kich_ban_gia_dinh: { label: 'Kịch bản giả định', desc: 'Đặt người đọc vào 1 tình huống giả định cụ thể để họ hình dung ngay.' },
  su_that_phu_phang: { label: 'Sự thật phũ phàng', desc: 'Nói thẳng một sự thật khó nghe nhưng đúng, không né tránh.' },
};

const SYSTEM_PROMPT = `Bạn là chuyên gia viết hook (câu mở đầu) cho content mạng xã hội tại Việt Nam.

NGUYÊN TẮC BẮT BUỘC:
- Chỉ viết ĐÚNG 1 loại hook được yêu cầu — bám sát cơ chế tâm lý của loại đó, không lẫn sang loại khác.
- Hook phải cụ thể, gắn chặt với đúng chủ đề người dùng đưa ra — không chung chung, không dùng được cho chủ đề khác.
- Câu ngắn gọn (1-2 dòng), đọc lên là dừng lại ngay, không cần giải thích thêm mới hiểu.
- Nếu có định vị thương hiệu, bám đúng giọng điệu và đối tượng trong định vị đó.
- 5 hook phải khác góc độ nhau, không lặp cấu trúc câu.
- Ngoài 5 hook, luôn xuất thêm 3 gợi ý TIÊU ĐỀ THUMBNAIL — chữ ngắn ghi đè lên ảnh bìa/thumbnail video,
  KHÁC với hook: cực ngắn (tối đa 6-8 từ), viết hoa hoặc nhấn mạnh từ khoá chính, không cần đủ câu ngữ pháp,
  đọc lướt 1 giây là hiểu ngay — kiểu chữ hay thấy trên thumbnail YouTube/Reels/TikTok.
- Output tiếng Việt.`;

const TOOL_HOOK = {
  name: 'xuat_hook_theo_chu_de',
  description: 'Xuất đúng 5 hook mẫu và 3 gợi ý tiêu đề thumbnail theo 1 chủ đề và 1 loại hook cụ thể.',
  input_schema: {
    type: 'object',
    properties: {
      hooks: { type: 'array', items: { type: 'string' }, minItems: 5, maxItems: 5 },
      tieu_de_thumbnail: {
        type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 3,
        description: 'Đúng 3 gợi ý chữ ngắn để ghi đè lên ảnh thumbnail/bìa, tối đa 6-8 từ mỗi câu.',
      },
    },
    required: ['hooks', 'tieu_de_thumbnail'],
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

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'Server chưa được cấu hình ANTHROPIC_API_KEY.' }); return; }

  try {
    const { topic, category, positioning, quick_context } = req.body || {};
    if (!topic || !topic.trim()) { res.status(400).json({ error: 'Thiếu chủ đề để sinh hook.' }); return; }
    const cat = HOOK_CATEGORIES[category];
    if (!cat) { res.status(400).json({ error: 'Loại hook không hợp lệ.' }); return; }

    const contextBlock = positioning && positioning.luot1
      ? `ĐỊNH VỊ THƯƠNG HIỆU ĐÃ CHỐT:\n${JSON.stringify(positioning.luot1, null, 2)}`
      : (quick_context && quick_context.trim()
        ? `BỐI CẢNH NHANH (chưa làm Định Vị đầy đủ): ${quick_context.trim()}`
        : 'BỐI CẢNH: (không cung cấp — viết tự nhiên, phổ quát)');

    const userContent = `CHỦ ĐỀ: ${topic}\n\nLOẠI HOOK CẦN VIẾT: ${cat.label} — ${cat.desc}\n\n${contextBlock}\n\nHãy viết đúng 5 hook theo loại trên, sát chủ đề.`;

    const result = await callClaude({ apiKey, system: SYSTEM_PROMPT, userContent, tool: TOOL_HOOK });
    res.status(200).json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Có lỗi xảy ra khi sinh hook.' });
  }
};
