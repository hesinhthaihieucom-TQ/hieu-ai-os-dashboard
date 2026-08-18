// Serverless function — chuyển kết quả Định Vị đã có sẵn (dán từ ĐỊNH VỊ AI/ChatGPT trước đây)
// thành đúng cấu trúc luot1 (+ luot2 nếu có) thay vì bắt học viên làm lại wizard 26 câu.
const { requireUser } = require('./_lib/auth');
const { TOOL_LUOT1, TOOL_LUOT2 } = require('./_lib/positioning-schema');

const SYSTEM_PROMPT = `Bạn là công cụ TRÍCH XUẤT dữ liệu, không phải công cụ sáng tạo. Người dùng dán vào 1 đoạn văn bản là kết quả định vị thương hiệu cá nhân họ đã làm trước đây (thường từ 1 trợ lý ChatGPT khác gọi là "ĐỊNH VỊ AI").

NGUYÊN TẮC BẮT BUỘC:
- CHỈ trích xuất và sắp xếp lại đúng nội dung đã có trong văn bản gốc vào đúng cấu trúc field — TUYỆT ĐỐI KHÔNG bịa thêm thông tin không có trong văn bản.
- Nếu văn bản gốc diễn đạt khác cấu trúc mong muốn, hãy diễn giải lại cho khớp field nhưng vẫn giữ đúng nội dung/ý gốc, không thêm chi tiết mới.
- Nếu 1 field hoàn toàn không có thông tin tương ứng trong văn bản gốc, điền "(không có trong dữ liệu gốc)" thay vì bịa.
- Với "luot1": luôn cố gắng trích xuất đầy đủ nếu văn bản có đủ nội dung tương ứng (thường là phần "định vị cốt lõi").
- Với "luot2": CHỈ điền nếu văn bản gốc thực sự có phần chiến lược nội dung/dòng tiền/chân dung khách hàng tương ứng. Nếu văn bản gốc chỉ có phần định vị cốt lõi, KHÔNG gọi tool phần luot2 — bỏ qua hoàn toàn field này.
- 2 mục "dau_an_hinh_anh" và "cau_chuyen_ca_nhan" là mục MỚI, các bản định vị làm TRƯỚC ĐÂY chắc chắn KHÔNG có nội dung tương ứng — đây là chuyện BÌNH THƯỜNG, không phải lỗi. Nếu văn bản gốc không có nội dung khớp 2 mục này: điền mọi sub-field text trong dau_an_hinh_anh = "" và canh_mo_dau = mảng rỗng; điền cau_chuyen = "", qua_so_sai = false, cau_hoi_lam_ro = mảng rỗng. TUYỆT ĐỐI KHÔNG vì 2 mục mới này thiếu mà suy ra các mục CƠ BẢN khác (tong_quan_thuong_hieu, ho_so_chuyen_mon, loi_the_canh_tranh, hinh_anh_nen_xay, ban_sac_triet_ly_thuong_hieu, giong_dieu_ngon_ngu, khong_theo_duoi, ket_luan_dinh_vi...) cũng "không có trong dữ liệu gốc" — các mục đó vẫn phải trích xuất đầy đủ bình thường nếu văn bản gốc có nội dung tương ứng, dù diễn đạt khác cấu trúc hiện tại.
- Output tiếng Việt, giữ nguyên thuật ngữ chuyên ngành có trong văn bản gốc.`;

const TOOL_PARSE = {
  name: 'xuat_ket_qua_da_trich_xuat',
  description: 'Trích xuất văn bản định vị đã dán thành cấu trúc luot1 (bắt buộc) và luot2 (chỉ nếu có trong văn bản gốc).',
  input_schema: {
    type: 'object',
    properties: {
      luot1: TOOL_LUOT1.input_schema,
      co_luot_2: { type: 'boolean', description: 'true nếu văn bản gốc có đủ nội dung chiến lược/dòng tiền/chân dung khách hàng để điền luot2.' },
      luot2: TOOL_LUOT2.input_schema,
    },
    required: ['luot1', 'co_luot_2'],
  },
};

async function callClaude({ apiKey, system, userContent, tool }) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 8000,
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
    const { raw_text } = req.body || {};
    if (!raw_text || !raw_text.trim()) { res.status(400).json({ error: 'Thiếu nội dung dán vào.' }); return; }
    if (raw_text.trim().length < 200) { res.status(400).json({ error: 'Nội dung dán vào có vẻ quá ngắn để là 1 kết quả định vị đầy đủ — kiểm tra lại đã copy đủ chưa.' }); return; }

    const userContent = `VĂN BẢN KẾT QUẢ ĐỊNH VỊ ĐÃ DÁN:\n${raw_text}\n\nHãy trích xuất đúng theo nguyên tắc.`;

    const parsed = await callClaude({ apiKey, system: SYSTEM_PROMPT, userContent, tool: TOOL_PARSE });
    res.status(200).json({ luot1: parsed.luot1, luot2: parsed.co_luot_2 ? parsed.luot2 : null });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Có lỗi xảy ra khi xử lý nội dung dán vào.' });
  }
};
