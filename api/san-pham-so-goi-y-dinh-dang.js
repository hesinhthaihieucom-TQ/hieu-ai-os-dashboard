// Mục "Chọn Loại Sản Phẩm Số", bước "AI gợi ý định dạng" — người dùng đã có chủ đề/đối tượng rõ
// nhưng chưa chắc nên làm ebook/mini-course/template..., AI chỉ đề xuất 1-2 định dạng phù hợp kèm
// lý do (KHÔNG dựng outline — outline là bước sau, chạy bởi api/san-pham-so-tao-tu-loai.js khi định
// dạng đã chốt). Output nhỏ nên max_tokens/lượt AI thấp hơn hẳn bước dựng outline.

const { requireUser } = require('./_lib/auth');
const { checkAndConsumeSpsQuota, refundSpsQuota } = require('./_lib/sps-ai-quota');
const { TOOL_GOI_Y_DINH_DANG } = require('./_lib/tim-san-pham-schema');

const SYSTEM_PROMPT = `Bạn là chuyên gia tư vấn sản phẩm số — người dùng đã có chủ đề/đối tượng rõ ràng, chỉ cần bạn đề xuất 1-2 định dạng phù hợp nhất, kèm lý do ngắn gọn nối trực tiếp với đặc điểm của chủ đề/đối tượng đó. Output tiếng Việt, gọi người dùng là "bạn".`;

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
        max_tokens: 800,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userContent }],
        tools: [TOOL_GOI_Y_DINH_DANG],
        tool_choice: { type: 'tool', name: TOOL_GOI_Y_DINH_DANG.name },
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
  if (!Array.isArray(toolUse.input.goi_y) || !toolUse.input.goi_y.length) throw new Error('AI trả về kết quả không đúng định dạng — thử lại giúp mình.');
  return toolUse.input;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const user = await requireUser(req);
  if (!user) { res.status(401).json({ error: 'Bạn cần đăng nhập để dùng tính năng này.' }); return; }

  const quotaError = await checkAndConsumeSpsQuota(user.id, 'san-pham-so-goi-y-dinh-dang');
  if (quotaError) { res.status(402).json({ error: quotaError, quotaExceeded: true }); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'Server chưa được cấu hình ANTHROPIC_API_KEY.' }); return; }

  try {
    const { nganh, chuDe, doiTuong } = req.body || {};
    if (!nganh || !chuDe || !doiTuong) { res.status(400).json({ error: 'Thiếu ngành, chủ đề hoặc đối tượng.' }); return; }

    const userContent = `NGÀNH/LĨNH VỰC: ${nganh}\nCHỦ ĐỀ/TÊN SẢN PHẨM MUỐN LÀM: ${chuDe}\nĐỐI TƯỢNG CỤ THỂ: ${doiTuong}\n\nHãy đề xuất định dạng theo đúng schema.`;

    const result = await callClaude({ apiKey, userContent });
    res.status(200).json({ result });
  } catch (err) {
    await refundSpsQuota(user.id, 'san-pham-so-goi-y-dinh-dang');
    res.status(500).json({ error: err.message || 'Có lỗi xảy ra khi gợi ý định dạng.' });
  }
};
