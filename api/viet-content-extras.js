// Serverless function — gợi ý bổ sung (hashtag/gợi ý hình ảnh/dạng content phù hợp/caption) cho 1
// bài viết ĐÃ VIẾT XONG (từ /api/viet-content hoặc /api/viet-tu-kho-goc). Tách riêng khỏi bước viết
// bài chính để bài viết hiện ra ngay, không phải chờ AI sinh thêm phần bổ sung mới thấy được nội
// dung cần dùng ngay — dùng chung cho cả 2 nguồn (viết mới / viết từ Kho Content).
const { requireUser } = require('./_lib/auth');
const { FORMAT_GUIDE } = require('./_lib/formats');
const { TOOL_POST_EXTRAS, stripDiacritics, HASHTAG_CAPTION_RULES, extraFieldsBlock, contextBlockOf } = require('./_lib/post-schema');

const SYSTEM_PROMPT = `Bạn là trợ lý content cho người xây thương hiệu cá nhân tại Việt Nam. Nhiệm vụ: dựa trên 1 bài viết ĐÃ HOÀN CHỈNH, gợi ý hashtag, ý tưởng hình ảnh/video minh hoạ, dạng content phù hợp nhất và caption gợi ý — không viết lại nội dung bài.

${HASHTAG_CAPTION_RULES}

${FORMAT_GUIDE}
(Chọn đúng 1 dạng khớp nhất với ngành + mục tiêu bài này.)`;

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

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'Server chưa được cấu hình ANTHROPIC_API_KEY.' }); return; }

  try {
    const { positioning, quick_context, post_text, channel_handle, brand_name, product_name, product_url, product_cta_mau, group_name, group_url, group_cta_mau } = req.body || {};
    if (!post_text || !post_text.trim()) { res.status(400).json({ error: 'Thiếu nội dung bài viết để gợi ý bổ sung.' }); return; }

    const contextBlock = contextBlockOf(positioning, quick_context);

    const userContent = `${contextBlock}

BÀI VIẾT ĐÃ HOÀN CHỈNH:\n${post_text.trim()}

${extraFieldsBlock({ channel_handle, brand_name, product_name, product_url, product_cta_mau, group_name, group_url, group_cta_mau })}

Hãy xuất hashtag, gợi ý hình ảnh, dạng content phù hợp và caption gợi ý cho đúng bài này.`;

    const result = await callClaude({ apiKey, system: SYSTEM_PROMPT, userContent, tool: TOOL_POST_EXTRAS });
    if (Array.isArray(result.hashtag)) result.hashtag = result.hashtag.map(stripDiacritics).filter(Boolean);
    res.status(200).json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Có lỗi xảy ra khi gợi ý bổ sung.' });
  }
};
