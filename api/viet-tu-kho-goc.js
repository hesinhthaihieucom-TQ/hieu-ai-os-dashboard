// Serverless function — viết bài GIỮ NGUYÊN cấu trúc gốc từ 1 bài trong Kho Content (kho viral),
// chỉ cá nhân hoá ~20% nội dung bằng câu chuyện/trải nghiệm riêng của người dùng — vì cấu trúc
// gốc chính là công thức đã được kiểm chứng viral, không phải "viết lại từ đầu" như Viết Content.
const { requireUser } = require('./_lib/auth');
const { FORMAT_GUIDE } = require('./_lib/formats');
const { TOOL_POST, stripDiacritics, CTA_HASHTAG_RULES, extraFieldsBlock } = require('./_lib/post-schema');

const SYSTEM_PROMPT = `Bạn là trợ lý cá nhân hoá content cho người xây thương hiệu cá nhân tại Việt Nam.

NGUYÊN TẮC BẮT BUỘC — ĐÂY LÀ ĐIỂM KHÁC BIỆT QUAN TRỌNG NHẤT:
Bài gốc được cung cấp là 1 bài trong "kho content" đã được kiểm chứng có cấu trúc kéo người đọc/viral tốt —
KHÔNG được viết lại tự do như viết bài mới. Nhiệm vụ là GIỮ NGUYÊN cấu trúc đã có, chỉ thay ~20% nội dung.
- GIỮ NGUYÊN GẦN NHƯ Y HỆT: câu/đoạn hook mở đầu VÀ tiêu đề của bài gốc (chỉ sửa rất nhỏ nếu cần khớp
  ngữ pháp/tên riêng — tuyệt đối không viết lại hook/tiêu đề theo hướng khác).
- GIỮ NGUYÊN cấu trúc/thứ tự luồng ý của bài gốc (mở đầu → thân bài → kết) — không đảo thứ tự, không
  thêm/bớt phần lớn nào so với bài gốc.
- THAY THẾ khoảng 20% nội dung — cụ thể là đoạn "chất liệu thật/câu chuyện/ví dụ" trong thân bài — bằng
  ĐÚNG câu chuyện/trải nghiệm riêng người dùng cung cấp, chèn tự nhiên vào đúng vị trí hợp lý trong mạch
  bài, không chèn gượng ép, không tóm tắt qua loa câu chuyện của họ — phải dùng đủ chi tiết họ đưa ra.
- 80% còn lại của bài (thông điệp chính, lập luận, cấu trúc câu) giữ tinh thần và mạch văn của bài gốc,
  chỉ điều chỉnh từ ngữ cho khớp giọng điệu định vị nếu có.
- Nếu người dùng KHÔNG cung cấp câu chuyện riêng, vẫn giữ nguyên cấu trúc + hook + tiêu đề bài gốc,
  chỉ tinh chỉnh nhẹ giọng văn cho khớp định vị (không tự bịa câu chuyện thay họ).
- Output tiếng Việt, giữ nguyên thuật ngữ chuyên ngành (hook, CTA, content, insight...).

${CTA_HASHTAG_RULES}

${FORMAT_GUIDE}
(Chọn đúng 1 dạng khớp nhất với ngành + mục tiêu bài này.)`;

async function callClaude({ apiKey, system, userContent, tool }) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
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
    const { positioning, quick_context, source_text, cau_chuyen_rieng, channel_handle, brand_name, product_name, group_name } = req.body || {};
    const hasPositioning = !!(positioning && positioning.luot1);
    if (!hasPositioning && !(quick_context && quick_context.trim())) {
      res.status(400).json({ error: 'Cần có Định Vị hoặc mô tả nhanh ngành/đối tượng trước khi viết.' }); return;
    }
    if (!source_text || !source_text.trim()) { res.status(400).json({ error: 'Thiếu bài gốc từ Kho Content.' }); return; }

    const contextBlock = hasPositioning
      ? `ĐỊNH VỊ THƯƠNG HIỆU ĐÃ CHỐT:\n${JSON.stringify(positioning.luot1, null, 2)}\n${positioning.luot2 ? JSON.stringify(positioning.luot2, null, 2) : ''}`
      : `BỐI CẢNH NHANH (chưa làm Định Vị đầy đủ): ${quick_context.trim()}`;

    const userContent = `${contextBlock}

BÀI GỐC TỪ KHO CONTENT (giữ nguyên cấu trúc + hook + tiêu đề):
${source_text.trim()}

CÂU CHUYỆN/TRẢI NGHIỆM RIÊNG CỦA NGƯỜI DÙNG (chèn ~20% vào thay phần chất liệu thật): ${cau_chuyen_rieng && cau_chuyen_rieng.trim() ? cau_chuyen_rieng.trim() : '(không cung cấp — giữ nguyên cấu trúc gốc, chỉ tinh chỉnh giọng văn)'}

${extraFieldsBlock({ channel_handle, brand_name, product_name, group_name })}

Hãy xuất bài đã cá nhân hoá theo đúng nguyên tắc đã nêu — giữ hook/tiêu đề/cấu trúc gốc, chỉ thay ~20% bằng câu chuyện riêng.`;

    const result = await callClaude({ apiKey, system: SYSTEM_PROMPT, userContent, tool: TOOL_POST });
    if (Array.isArray(result.hashtag)) result.hashtag = result.hashtag.map(stripDiacritics).filter(Boolean);
    res.status(200).json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Có lỗi xảy ra khi cá nhân hoá bài từ kho.' });
  }
};
