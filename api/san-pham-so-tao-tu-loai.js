// Mục "Chọn Loại Sản Phẩm Số" — người dùng ĐÃ TỰ QUYẾT ĐỊNH ngành/loại sản phẩm/chủ đề/đối tượng,
// không cần qua wizard 11 câu hỏi hay nhánh tài liệu của "Tìm Sản Phẩm Phù Hợp" (api/tim-san-pham-phu-hop.js,
// api/tim-san-pham-tu-tai-lieu.js) — chỉ cần AI dựng outline cấp 1 tốt nhất cho đúng lựa chọn đó rồi
// vào thẳng Giai đoạn 2. Có thể kèm materialPath (PDF tuỳ chọn, cùng luồng upload đã có ở
// api/san-pham-so-upload-material-url.js) để outline bám sát tài liệu nếu người dùng có sẵn.

const { requireUser } = require('./_lib/auth');
const { checkAndConsumeSpsQuota, refundSpsQuota } = require('./_lib/sps-ai-quota');
const { TOOL_TAO_Y_TUONG_TU_LOAI } = require('./_lib/tim-san-pham-schema');
const { signMaterialUrl } = require('./_lib/material-storage');

const SYSTEM_PROMPT = `Bạn là chuyên gia dựng outline sản phẩm số — người dùng ĐÃ TỰ QUYẾT ĐỊNH ngành/loại sản phẩm/chủ đề/đối tượng, nhiệm vụ của bạn là dựng 1 outline hoàn chỉnh, chất lượng cao nhất có thể cho ĐÚNG lựa chọn đó.

NGUYÊN TẮC BẮT BUỘC:
- BÁM SÁT đúng ngành/định dạng/chủ đề/đối tượng người dùng đã chọn — KHÔNG tự đổi sang định dạng hay đối tượng khác dù thấy hợp hơn.
- ĐỐI TƯỢNG phải cụ thể (tuổi/hoàn cảnh/giới tính nếu có) — nếu người dùng nhập còn chung chung, có thể làm rõ thêm nhưng không đổi sang đối tượng khác.
- Tên sản phẩm phải áp đúng 1 trong 4 công thức đặt tên đã định nghĩa trong schema, chọn công thức khớp với định dạng.
- Nếu có tài liệu gốc đính kèm, outline phải phản ánh đúng cấu trúc/nội dung thật trong tài liệu đó.
- Output tiếng Việt, gọi người dùng là "bạn".`;

async function callClaude({ apiKey, userContent }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 150000);
  let resp;
  try {
    resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 3000,
        system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: userContent }],
        tools: [TOOL_TAO_Y_TUONG_TU_LOAI],
        tool_choice: { type: 'tool', name: TOOL_TAO_Y_TUONG_TU_LOAI.name },
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
  if (data.stop_reason === 'max_tokens') throw new Error('AI trả lời quá dài bị cắt giữa chừng — thử lại giúp mình.');
  const toolUse = (data.content || []).find((b) => b.type === 'tool_use');
  if (!toolUse) throw new Error('Không nhận được kết quả có cấu trúc từ AI.');
  if (!Array.isArray(toolUse.input.outline_cap_1)) throw new Error('AI trả về kết quả không đúng định dạng — thử lại giúp mình.');
  return toolUse.input;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const user = await requireUser(req);
  if (!user) { res.status(401).json({ error: 'Bạn cần đăng nhập để dùng tính năng này.' }); return; }

  const quotaError = await checkAndConsumeSpsQuota(user.id, 'san-pham-so-tao-tu-loai');
  if (quotaError) { res.status(402).json({ error: quotaError, quotaExceeded: true }); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'Server chưa được cấu hình ANTHROPIC_API_KEY.' }); return; }

  try {
    const { nganh, dinhDang, chuDe, doiTuong, materialPath } = req.body || {};
    if (!nganh || !dinhDang || !chuDe || !doiTuong) { res.status(400).json({ error: 'Thiếu ngành, loại sản phẩm, chủ đề hoặc đối tượng.' }); return; }

    const textBlock = `NGÀNH/LĨNH VỰC: ${nganh}\nLOẠI SẢN PHẨM ĐÃ CHỌN: ${dinhDang}\nCHỦ ĐỀ/TÊN SẢN PHẨM MUỐN LÀM: ${chuDe}\nĐỐI TƯỢNG CỤ THỂ: ${doiTuong}\n\nHãy dựng outline theo đúng schema.`;
    const materialUrl = await signMaterialUrl(user.id, materialPath);
    const userContent = materialUrl
      ? [{ type: 'document', source: { type: 'url', url: materialUrl } }, { type: 'text', text: `${textBlock}\n\nCó tài liệu gốc đính kèm — outline phải phản ánh đúng cấu trúc/nội dung thật trong tài liệu đó.` }]
      : textBlock;

    const result = await callClaude({ apiKey, userContent });
    res.status(200).json({ result });
  } catch (err) {
    await refundSpsQuota(user.id, 'san-pham-so-tao-tu-loai');
    res.status(500).json({ error: err.message || 'Có lỗi xảy ra khi dựng outline.' });
  }
};
