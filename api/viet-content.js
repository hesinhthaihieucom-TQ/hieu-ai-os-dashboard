// Serverless function — viết bài hoàn chỉnh từ 1 ý tưởng, theo cấu trúc Hook-Vấn đề-Giá trị-Niềm tin-CTA
// (khung 5 phần từ tài liệu "Viết Content Có Cấu Trúc"), giọng văn khớp định vị đã chốt.
const { requireUser } = require('./_lib/auth');
const { FORMAT_NAMES, FORMAT_GUIDE } = require('./_lib/formats');

const SYSTEM_PROMPT = `Bạn là trợ lý viết content cho người xây thương hiệu cá nhân tại Việt Nam, viết đúng giọng văn và định vị đã chốt của họ.

NGUYÊN TẮC BẮT BUỘC:
- Bám sát giọng điệu, bản sắc và triết lý thương hiệu trong định vị đã chốt — không lệch trục, không chung chung.
- Cấu trúc bài viết bắt buộc theo khung 5 phần: Hook (kéo đúng người đọc dừng lại) → Vấn đề (gọi tên điều người đọc đang gặp) → Giá trị (góc nhìn/cách làm/giải pháp cụ thể) → Niềm tin (chất liệu thật: câu chuyện/quan sát/case) → CTA (dẫn hành động phù hợp mục tiêu bài, không phải bài nào cũng "inbox").
- Bài viết liền mạch, tự nhiên như đang nói chuyện — không viết kiểu 1 câu 1 dòng rời rạc, không sáo rỗng, không kể lể kiểu "ngày xưa mình từng...".
- Output tiếng Việt, giữ nguyên thuật ngữ chuyên ngành (hook, CTA, content, insight...).

QUY TẮC CTA (BẮT BUỘC):
- CTA luôn phải chốt bằng 1 từ khoá kích hoạt cụ thể gồm ĐÚNG 2 CHỮ (ví dụ: "Dòng tiền", "Sổ tay", "Bí kíp", "Bắt đầu"...), theo mẫu: "Để lại bình luận chữ '<từ khoá 2 chữ>' và mình sẽ gửi bạn <thứ nhận được cụ thể>." — không dùng CTA chung chung kiểu "inbox mình nhé" hay "để lại bình luận bên dưới" mà không có từ khoá.
- Từ khoá phải khớp chủ đề bài và thứ người đọc sẽ nhận được (tài liệu, link, ưu đãi, tư vấn...).

QUY TẮC BÌNH LUẬN GHIM:
- Luôn viết 1 câu bình luận ghim (cau_cmt_ghim) — câu tác giả tự để lại ngay dưới bài, nhắc lại đúng từ khoá CTA để tăng khả năng người đọc làm theo, giọng tự nhiên như đang nói với người đọc chứ không phải thông báo cứng nhắc.

QUY TẮC CMT CTA SẢN PHẨM/GROUP:
- Nếu người dùng có cung cấp tên sản phẩm/dịch vụ và/hoặc tên group/cộng đồng, viết thêm 1-2 câu bình luận CTA (cmt_cta_san_pham) dẫn khéo về đúng sản phẩm hoặc group đó, giọng chia sẻ tự nhiên, không quảng cáo lộ liễu.
- Nếu người dùng KHÔNG cung cấp sản phẩm/group nào, trả về mảng rỗng cho cmt_cta_san_pham — không tự bịa ra sản phẩm/group.

QUY TẮC HASHTAG (BẮT BUỘC):
- Xuất ĐÚNG 5 hashtag, không hơn không kém.
- TẤT CẢ hashtag phải viết KHÔNG DẤU (bỏ hết dấu thanh và dấu chữ tiếng Việt, ví dụ "Tài Chính" → "TaiChinh"), viết liền không có khoảng trắng, không ký tự đặc biệt.
- Nếu người dùng có cung cấp tên kênh Facebook/TikTok, 1 trong 5 hashtag PHẢI là tên kênh đó (không dấu, viết liền).
- Nếu người dùng có cung cấp tên thương hiệu/sản phẩm cố định (khác tên kênh), thêm 1 hashtag riêng cho tên đó (không dấu, viết liền).
- Các hashtag còn lại bám sát chủ đề bài + trục nội dung định vị.
- Nếu không có tên kênh/thương hiệu nào được cung cấp, tự suy ra 1 hashtag đại diện thương hiệu từ bản sắc thương hiệu trong định vị.

${FORMAT_GUIDE}
(Chọn đúng 1 dạng khớp nhất với ngành + mục tiêu bài này.)`;

const TOOL_POST = {
  name: 'xuat_bai_viet',
  description: 'Xuất 1 bài viết hoàn chỉnh theo khung Hook-Vấn đề-Giá trị-Niềm tin-CTA.',
  input_schema: {
    type: 'object',
    properties: {
      tieu_de: { type: 'string', description: 'Tiêu đề ngắn gọn cho bài, ưu tiên dạng số nếu hợp.' },
      hook: { type: 'string', description: 'Câu/đoạn hook mở đầu.' },
      van_de: { type: 'string', description: 'Đoạn gọi tên vấn đề người đọc đang gặp.' },
      gia_tri: { type: 'string', description: 'Đoạn giá trị: góc nhìn, cách làm, giải pháp cụ thể.' },
      niem_tin: { type: 'string', description: 'Đoạn chất liệu thật: câu chuyện, quan sát, case cụ thể.' },
      cta: { type: 'string', description: 'Câu CTA đầy đủ, chốt bằng đúng 1 từ khoá kích hoạt 2 chữ theo mẫu "Để lại bình luận chữ \'...\' và mình sẽ gửi bạn ...".' },
      tu_khoa_cta: { type: 'string', description: 'Đúng từ khoá 2 chữ dùng trong CTA (tách riêng để hiển thị nổi bật), ví dụ "Dòng tiền".' },
      cau_cmt_ghim: { type: 'string', description: 'Câu bình luận ghim nhắc lại từ khoá CTA, giọng tự nhiên.' },
      cmt_cta_san_pham: {
        type: 'array', items: { type: 'string' }, minItems: 0, maxItems: 2,
        description: 'Câu bình luận CTA dẫn về sản phẩm/group cụ thể nếu người dùng có cung cấp; mảng rỗng nếu không có.',
      },
      bai_hoan_chinh: { type: 'string', description: 'Toàn bộ bài viết ghép liền mạch từ 5 phần trên, sẵn sàng copy đăng ngay.' },
      hashtag: { type: 'array', items: { type: 'string' }, minItems: 5, maxItems: 5, description: 'Đúng 5 hashtag theo quy tắc hashtag ở trên.' },
      goi_y_hinh_anh: { type: 'string', description: '1 ý tưởng hình ảnh/video minh hoạ cho bài này, khớp dấu ấn hình ảnh trong định vị.' },
      dinh_dang_de_xuat: {
        type: 'string',
        enum: FORMAT_NAMES,
        description: 'Chọn đúng 1 trong các dạng content phù hợp nhất với ngành và mục tiêu bài này.',
      },
      ly_do_dinh_dang: { type: 'string', description: 'Vì sao dạng content này phù hợp nhất cho bài này.' },
    },
    required: ['tieu_de','hook','van_de','gia_tri','niem_tin','cta','tu_khoa_cta','cau_cmt_ghim','cmt_cta_san_pham','bai_hoan_chinh','hashtag','goi_y_hinh_anh','dinh_dang_de_xuat','ly_do_dinh_dang'],
  },
};

function stripDiacritics(str) {
  return (str || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9]/g, '');
}

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
    const { positioning, quick_context, idea_text, channel_handle, brand_name, product_name, group_name } = req.body || {};
    const hasPositioning = !!(positioning && positioning.luot1);
    if (!hasPositioning && !(quick_context && quick_context.trim())) {
      res.status(400).json({ error: 'Cần có Định Vị hoặc mô tả nhanh ngành/đối tượng trước khi viết content.' }); return;
    }
    if (!idea_text || !idea_text.trim()) { res.status(400).json({ error: 'Thiếu ý tưởng/chủ đề để viết.' }); return; }

    const contextBlock = hasPositioning
      ? `ĐỊNH VỊ THƯƠNG HIỆU ĐÃ CHỐT:\n${JSON.stringify(positioning.luot1, null, 2)}\n${positioning.luot2 ? JSON.stringify(positioning.luot2, null, 2) : ''}`
      : `BỐI CẢNH NHANH (chưa làm Định Vị đầy đủ): ${quick_context.trim()}`;

    const userContent = `${contextBlock}

Ý TƯỞNG / CHỦ ĐỀ CẦN VIẾT:\n${idea_text}

TÊN KÊNH FACEBOOK/TIKTOK: ${channel_handle && channel_handle.trim() ? channel_handle.trim() : '(không cung cấp — tự suy ra hashtag thương hiệu từ định vị)'}
TÊN THƯƠNG HIỆU/SẢN PHẨM CỐ ĐỊNH (khác tên kênh, nếu có): ${brand_name && brand_name.trim() ? brand_name.trim() : '(không có)'}
SẢN PHẨM/DỊCH VỤ MUỐN NHẮC TRONG BÀI NÀY: ${product_name && product_name.trim() ? product_name.trim() : '(không có)'}
GROUP/CỘNG ĐỒNG MUỐN NHẮC: ${group_name && group_name.trim() ? group_name.trim() : '(không có)'}

Hãy viết 1 bài hoàn chỉnh theo đúng khung 5 phần, giọng văn khớp định vị trên, đúng quy tắc CTA/bình luận ghim/hashtag đã nêu.`;

    const result = await callClaude({ apiKey, system: SYSTEM_PROMPT, userContent, tool: TOOL_POST });
    if (Array.isArray(result.hashtag)) result.hashtag = result.hashtag.map(stripDiacritics).filter(Boolean);
    res.status(200).json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Có lỗi xảy ra khi viết content.' });
  }
};
