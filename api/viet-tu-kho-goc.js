// Serverless function — viết lại 1 bài trong Kho Content (kho viral) bằng giọng và câu chuyện
// riêng của người dùng. Giữ NGUYÊN cấu trúc/trình tự bài gốc (đây là công thức đã kiểm chứng
// viral) và giữ y hệt câu hook — nhưng paraphrase lại ít nhất 70% câu chữ ở các đoạn còn lại,
// không sao chép nguyên văn như bản trước đây từng làm (giữ 80%, chỉ thay 20% — quá giống bài
// gốc, đọc như đăng lại y nguyên).
const { requireUser } = require('./_lib/auth');
const { checkAndConsumeTrialQuota, refundTrialQuota } = require('./_lib/trial-quota');
const { TOOL_POST_CORE, assemblePost, CTA_COMMENT_RULES, ANTI_AI_CLICHE_RULES, extraFieldsBlock, contextBlockOf, customInstructionsBlock, ctaReferenceBlock } = require('./_lib/post-schema');

const SYSTEM_PROMPT = `Bạn là trợ lý viết content cho người xây thương hiệu cá nhân tại Việt Nam, chuyên viết lại 1 bài trong "kho content" (bài viral có sẵn) thành bản của riêng người dùng.

NGUYÊN TẮC BẮT BUỘC — ĐÂY LÀ ĐIỂM KHÁC BIỆT QUAN TRỌNG NHẤT:
Bài gốc được cung cấp là 1 bài đã kiểm chứng viral — GIỮ NGUYÊN đúng CẤU TRÚC/TRÌNH TỰ diễn đạt của nó (mở đầu bằng gì → dẫn dắt qua ý/đoạn nào → cao trào/điểm nhấn ở đâu → chốt lại bằng gì, đi theo đúng số đoạn và đúng thứ tự đó, không bỏ đoạn, không đảo thứ tự, không thêm bớt phần lớn). Đây KHÔNG phải bài viết tự do lấy cảm hứng từ chủ đề — đây là PARAPHRASE lại từng đoạn theo đúng khung bài gốc.
- GIỮ NGUYÊN GẦN NHƯ Y HỆT: câu/đoạn hook mở đầu của bài gốc (chỉ sửa rất nhỏ nếu cần khớp ngữ pháp/tên riêng) — đây là phần đã chứng minh hiệu quả, không đánh đổi.
- Với TỪNG đoạn còn lại (thân bài, ví dụ, kết): giữ đúng VAI TRÒ/vị trí của đoạn đó trong cấu trúc bài gốc, nhưng VIẾT LẠI ÍT NHẤT 70% CÂU CHỮ — dùng từ ngữ, cách diễn đạt, ví dụ khác đi, không copy nguyên câu/đoạn nào từ thân bài gốc (trừ đúng câu hook).
- Tiêu đề (tieu_de) có thể giữ tinh thần tiêu đề gốc nhưng khuyến khích diễn đạt lại cho hợp giọng của người dùng, không bắt buộc y hệt.
- Câu chuyện/trải nghiệm riêng của người dùng phải được LỒNG XUYÊN SUỐT thân bài (không chỉ nhét vào 1 đoạn ngắn) để cả bài đọc như chính họ đang kể, không phải bài gốc có đính thêm 1 đoạn.
- Nếu người dùng KHÔNG cung cấp câu chuyện riêng, vẫn viết lại toàn bộ thân bài theo đúng giọng định vị (nếu có), không tự bịa câu chuyện thay họ, chỉ dựa trên góc nhìn/lập luận chung.
- Output tiếng Việt, giữ nguyên thuật ngữ chuyên ngành (hook, CTA, content, insight...).

QUY TẮC VỀ SẢN PHẨM/CTA CỦA BÀI GỐC (BẮT BUỘC — ĐỌC KỸ, đây là lỗi hay bị sai nhất):
Bài gốc là do tác giả KHÁC viết. Nếu CTA/bình luận ghim của bài gốc có hứa gửi/tặng 1 thứ cụ thể (tài liệu, bài test, khoá học, ưu đãi, tư vấn...) của tác giả gốc, đó là lời hứa KHÔNG THẬT với người dùng hiện tại — không được paraphrase rồi vẫn giữ nguyên NỘI DUNG lời hứa đó, dù có đổi câu chữ.
- Nếu người dùng CÓ cung cấp sản phẩm/dịch vụ và/hoặc group/cộng đồng (xem TÊN SẢN PHẨM/DỊCH VỤ, GROUP/CỘNG ĐỒNG bên dưới): CTA mới phải dẫn về ĐÚNG thứ đó, không dùng thứ trong bài gốc.
- Nếu người dùng KHÔNG cung cấp gì cả (cả 2 mục dưới đều "(không có)"): TUYỆT ĐỐI không bịa ra hay giữ lại bất kỳ lời hứa gửi tài liệu/quà/bài test nào. Thay vào đó viết CTA chung chỉ để KHƠI GỢI TƯƠNG TÁC THẬT — ví dụ: mời để lại bình luận chữ khoá kèm cảm nhận/tình huống của họ, hỏi ai đang gặp giống vậy giơ tay, mời tag 1 người bạn cần đọc bài này — vẫn theo đúng mẫu 2 chữ khoá đã nêu, nhưng KHÔNG kèm lời hứa nhận được thứ gì cụ thể, vì không có gì để gửi thật.

NGOẠI LỆ — BÀI GỐC DẠNG SỐ (ví dụ "4 bước...", "3 sai lầm...", "5 dấu hiệu..."): các mục trong bài dạng này vốn có thể hoán đổi vị trí cho nhau (không theo mạch tường thuật bắt buộc phải đúng thứ tự như hook → vấn đề → cao trào → kết). Với riêng bài dạng số, được PHÉP: đổi số lượng mục VÀ đổi phạm vi chủ đề cho khớp đúng đối tượng/câu chuyện của người dùng hiện tại (ví dụ bài gốc "4 bước tích sản MUA NHÀ khi đang nợ" có thể viết lại thành "5 bước tích sản khi đang nợ" nếu đối tượng người dùng đang nhắm tới chưa chắc có nhu cầu mua nhà cụ thể), đảo thứ tự các mục cho hợp mạch bài mới, và viết lại hẳn nội dung từng mục — miễn là vẫn giữ y hệt câu hook mở đầu. Đây là cách hợp lệ để bài viết lại không bị rập khuôn y hệt bài gốc mỗi lần dùng.

QUAN TRỌNG — TRÁNH LẶP CÂU CHỮ GIỮA CÁC LẦN VIẾT KHÁC NHAU:
Câu chuyện cá nhân được cung cấp là 1 đoạn tóm tắt CỐ ĐỊNH, dùng lại cho NHIỀU bài viết khác nhau theo thời gian — nếu chép nguyên văn mỗi lần, mọi bài của người dùng sẽ có đúng 1 đoạn giống hệt nhau, đọc vào biết ngay là "copy dán". BẮT BUỘC: chỉ lấy ĐÚNG các CHI TIẾT/SỰ KIỆN thật trong câu chuyện đó (mốc thời gian, con số, cảm xúc, kết quả...), rồi diễn đạt lại bằng câu từ, góc kể, độ dài KHÁC ĐI mỗi lần — phù hợp mạch văn và hook của bài này — tuyệt đối không copy nguyên câu/đoạn từ câu chuyện gốc.

KIỂM TRA ĐỘ CỤ THỂ CỦA CÂU CHUYỆN RIÊNG (bắt buộc):
- Nếu câu chuyện người dùng cung cấp còn CHUNG CHUNG (thiếu chi tiết cụ thể: không có mốc thời gian,
  con số, tên/tình huống cụ thể, cảm xúc/kết quả rõ ràng...) hoặc để trống, đặt cau_chuyen_qua_chung_chung
  = true và viết đúng 5 câu hỏi (cau_hoi_lam_ro) để giúp họ kể lại câu chuyện cụ thể hơn — mỗi câu hỏi
  nhắm đúng 1 chi tiết còn thiếu (ví dụ: "Chuyện này xảy ra khi nào/giai đoạn nào?", "Con số cụ thể là bao
  nhiêu?", "Lúc đó bạn cảm thấy thế nào?", "Ai/việc gì khiến bạn nhận ra điều này?", "Kết quả cuối cùng ra
  sao?") — vẫn cứ viết bài như bình thường, KHÔNG chặn kết quả, chỉ thêm gợi ý để lần sau họ kể rõ hơn.
- Nếu câu chuyện đã đủ cụ thể, đặt cau_chuyen_qua_chung_chung = false và để cau_hoi_lam_ro là mảng rỗng.

${ANTI_AI_CLICHE_RULES}
(Quy tắc này áp cho các đoạn PARAPHRASE lại — riêng câu hook vẫn phải giữ y hệt bài gốc theo đúng nguyên tắc ở trên, kể cả khi hook gốc dùng 1 trong các cụm bị cấm.)

${CTA_COMMENT_RULES}`;

// Mở rộng TOOL_POST_CORE dùng chung, thêm 2 trường riêng để kiểm tra độ cụ thể của câu chuyện
// người dùng. hashtag/gợi ý hình ảnh/dạng content/caption được hỏi riêng ở /api/viet-content-extras.
const TOOL_POST_KHO_GOC = {
  name: TOOL_POST_CORE.name,
  description: TOOL_POST_CORE.description,
  input_schema: {
    type: 'object',
    properties: {
      ...TOOL_POST_CORE.input_schema.properties,
      cau_chuyen_qua_chung_chung: { type: 'boolean', description: 'true nếu câu chuyện người dùng cung cấp còn chung chung/thiếu chi tiết cụ thể hoặc để trống.' },
      cau_hoi_lam_ro: {
        type: 'array', items: { type: 'string' }, minItems: 0, maxItems: 5,
        description: 'Đúng 5 câu hỏi giúp làm rõ câu chuyện nếu cau_chuyen_qua_chung_chung=true, mảng rỗng nếu không.',
      },
    },
    required: [...TOOL_POST_CORE.input_schema.required, 'cau_chuyen_qua_chung_chung', 'cau_hoi_lam_ro'],
  },
};

async function callClaude({ apiKey, system, userContent, tool }) {
  // fetch() mặc định KHÔNG có giới hạn thời gian chờ — nếu Anthropic bị treo/chậm bất thường,
  // request có thể "treo" tới tận khi Vercel tự ngắt hàm (300s) mới có phản hồi, thay vì báo lỗi
  // sớm để người dùng biết mà thử lại. Đặt trần 90s riêng cho lệnh gọi AI.
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

  const quotaError = await checkAndConsumeTrialQuota(user.id, 'viet-tu-kho-goc');
  if (quotaError) { res.status(402).json({ error: quotaError, quotaExceeded: true }); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'Server chưa được cấu hình ANTHROPIC_API_KEY.' }); return; }

  try {
    const { positioning, quick_context, source_text, source_title, cau_chuyen_rieng, product_name, group_name, custom_instructions, cta_reference } = req.body || {};
    const hasPositioning = !!(positioning && positioning.luot1);
    if (!hasPositioning && !(quick_context && quick_context.trim())) {
      res.status(400).json({ error: 'Cần có Định Vị hoặc mô tả nhanh ngành/đối tượng trước khi viết.' }); return;
    }
    if (!source_text || !source_text.trim()) { res.status(400).json({ error: 'Thiếu bài gốc từ Kho Content.' }); return; }

    const contextBlock = contextBlockOf(positioning, quick_context);

    const userContent = `${contextBlock}

TIÊU ĐỀ GỐC (tham khảo tinh thần, không bắt buộc giữ y hệt): ${source_title && source_title.trim() ? source_title.trim() : '(không có, tự đặt tiêu đề mới khớp hook)'}

BÀI GỐC TỪ KHO CONTENT (giữ nguyên cấu trúc/trình tự từng đoạn, chỉ giữ y hệt câu hook — các đoạn còn lại paraphrase lại câu chữ, không copy nguyên văn):
${source_text.trim()}

CÂU CHUYỆN/TRẢI NGHIỆM RIÊNG CỦA NGƯỜI DÙNG (lấy chi tiết thật, diễn đạt lại bằng câu từ khác, lồng xuyên suốt thân bài): ${cau_chuyen_rieng && cau_chuyen_rieng.trim() ? cau_chuyen_rieng.trim() : '(không cung cấp — viết lại thân bài theo giọng định vị, không tự bịa câu chuyện)'}

${extraFieldsBlock({ product_name, group_name })}
${customInstructionsBlock(custom_instructions)}
${ctaReferenceBlock(cta_reference)}
Hãy viết lại bài này theo đúng nguyên tắc đã nêu — giữ nguyên cấu trúc/trình tự và câu hook, viết lại ít nhất 70% câu chữ ở các đoạn còn lại bằng giọng và câu chuyện của người dùng.`;

    const result = await callClaude({ apiKey, system: SYSTEM_PROMPT, userContent, tool: TOOL_POST_KHO_GOC });
    result.bai_hoan_chinh = assemblePost(result);
    res.status(200).json({ result });
  } catch (err) {
    await refundTrialQuota(user.id, 'viet-tu-kho-goc');
    res.status(500).json({ error: err.message || 'Có lỗi xảy ra khi cá nhân hoá bài từ kho.' });
  }
};
