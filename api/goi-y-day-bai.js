// Serverless function — gợi ý cách "đẩy bài" theo TỪNG mốc lượt xem trên Facebook, sinh ĐỦ CẢ 5 MỐC
// trong 1 LẦN GỌI DUY NHẤT (2026-08-20, trước đây bắt bấm lại — tốn 1 lượt riêng cho mỗi mốc, đổi
// mốc 5 lần tốn 5 lượt — người dùng phản ánh vậy vừa tốn vừa không tiện): câu bình luận tự đăng,
// gợi ý trả lời bình luận người khác, và nên gắn tài sản quảng bá nào — phù hợp đúng giai đoạn đó.
const { requireUser } = require('./_lib/auth');
const { checkAndConsumeTrialQuota, refundTrialQuota } = require('./_lib/trial-quota');

const MILESTONES = {
  m1: { label:'Trước 1.000 view đầu tiên', desc:'Giai đoạn khơi mào — mục tiêu duy nhất là kích người xem để lại bình luận đầu tiên, tuyệt đối chưa nên gắn link bán hàng vì dễ làm giảm reach.' },
  m2: { label:'Đạt 10.000 view', desc:'Bài đã có đà — có thể bắt đầu dẫn nhẹ về 1 tài sản ít cam kết (cộng đồng miễn phí, hoặc aff sản phẩm người khác) mà không phá vỡ mạch tương tác tự nhiên.' },
  m3: { label:'Đạt 100.000 view', desc:'Bài đang viral thật — đủ lượng người lạ để bắt đầu dẫn về tài sản có giá trị hơn (sản phẩm số của mình hoặc aff của mình), CTA rõ ràng hơn.' },
  m4: { label:'Đạt 1 triệu view', desc:'Bài đã viral lớn — đây là lúc tận dụng tối đa, CTA mạnh và cụ thể để chuyển đổi số đông người xem thành khách hàng/lead thật.' },
  m5: { label:'Trên 1 triệu view', desc:'Bài viral cực lớn — ưu tiên tài sản có giá trị chuyển đổi cao nhất (sản phẩm số/aff chính), đồng thời tận dụng để mở rộng cộng đồng cho các đợt sau.' },
};
const MILESTONE_ORDER = ['m1', 'm2', 'm3', 'm4', 'm5'];

const SYSTEM_PROMPT = `Bạn là chuyên gia tăng trưởng kênh mạng xã hội tại Việt Nam, chuyên "đẩy bài" theo từng mốc lượt xem để tối đa hoá tương tác rồi chuyển đổi đúng thời điểm.

NGUYÊN TẮC BẮT BUỘC:
- Xuất ĐỦ CẢ 5 MỐC lượt xem trong 1 lần — mỗi mốc có mục tiêu khác nhau, không dùng chung 1 kiểu bình luận cho mọi mốc, và các mốc phải nối tiếp logic với nhau (không lặp lại y hệt ý của mốc trước).
- Bình luận tự đăng (cmt_tu_dang) ở mốc đầu (trước 1.000 view) phải là bình luận KÍCH THÍCH người khác trả lời/tranh luận, tuyệt đối không chèn link hay CTA bán hàng.
- Từ mốc 10.000 view trở đi, nếu bình luận có CTA, luôn chốt bằng đúng 1 từ khoá kích hoạt 2 chữ theo mẫu "Để lại bình luận chữ '...' và mình sẽ gửi bạn ...", giống quy tắc CTA dùng trong Viết Content — và từ khoá nên KHÁC NHAU giữa các mốc (mỗi mốc mời 1 thứ khác nhau) để không lặp lại.
- Có thể có NHIỀU tài sản quảng bá được cung cấp (không chỉ 1) — hãy CHỦ ĐỘNG PHÂN BỔ tài sản phù hợp cho từng mốc theo đúng mức độ cam kết tăng dần (mốc đầu: chưa gắn gì hoặc tài sản ít cam kết nhất; mốc cuối: tài sản giá trị/chuyển đổi cao nhất) — không bắt buộc phải dùng hết tất cả tài sản, và có thể dùng lại cùng 1 tài sản ở nhiều mốc liền kề nếu hợp lý, nhưng KHÔNG được gắn tài sản nào ngoài danh sách được cung cấp.
- Nếu người dùng không chỉ định tài sản nào (danh sách rỗng), tự chọn tuỳ theo có tài sản nào trong kho hay không — nếu kho cũng rỗng, để trống và giải thích rõ vì sao chưa nên gắn gì ở mốc đó.
- Gợi ý trả lời bình luận (goi_y_tra_loi_cmt) phải là các mẫu câu tự nhiên, đúng giọng, dùng được cho nhiều loại bình luận khác nhau (khen, hỏi, nghi ngờ...) — riêng cho từng mốc, không lặp lại y hệt giữa các mốc.
- Output tiếng Việt.`;

const TOOL_DAY_BAI_ALL = {
  name: 'xuat_goi_y_day_bai_du_5_moc',
  description: 'Xuất gợi ý đẩy bài cho ĐỦ CẢ 5 mốc lượt xem trong 1 lần.',
  input_schema: {
    type: 'object',
    properties: {
      moc: {
        type: 'array',
        minItems: 5,
        maxItems: 5,
        description: 'Đúng 5 mục, đúng thứ tự m1, m2, m3, m4, m5.',
        items: {
          type: 'object',
          properties: {
            moc: { type: 'string', enum: MILESTONE_ORDER, description: 'Mã mốc — phải khớp đúng thứ tự m1→m5.' },
            chien_luoc_moc_nay: { type: 'string', description: 'Mục tiêu chính cần tập trung ở mốc này, 1-2 câu.' },
            cmt_tu_dang: { type: 'string', description: 'Câu bình luận tự đăng/ghim phù hợp với đúng mốc này.' },
            goi_y_tra_loi_cmt: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 3, description: 'Đúng 3 mẫu câu trả lời bình luận người khác, dùng được cho nhiều tình huống.' },
            tai_san_de_xuat: {
              type: 'object',
              properties: {
                label: { type: 'string', description: 'Tên tài sản được chọn cho mốc này — PHẢI khớp đúng 1 label trong danh sách được cung cấp, hoặc để rỗng nếu chưa nên gắn gì.' },
                ly_do: { type: 'string', description: 'Vì sao chọn (hoặc chưa chọn) tài sản này cho đúng mốc này.' },
              },
              required: ['label', 'ly_do'],
            },
          },
          required: ['moc', 'chien_luoc_moc_nay', 'cmt_tu_dang', 'goi_y_tra_loi_cmt', 'tai_san_de_xuat'],
        },
      },
    },
    required: ['moc'],
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
        // 5 mốc x schema đầy đủ (chiến lược + cmt + 3 gợi ý trả lời + tài sản) trong 1 lần — cần
        // nhiều hơn hẳn max_tokens=2000 cũ của bản 1-mốc/lần.
        max_tokens: 5000,
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
  if (data.stop_reason === 'max_tokens') {
    throw new Error('AI sinh kết quả dài quá giới hạn cho phép — thử lại giúp mình.');
  }
  const toolUse = (data.content || []).find((b) => b.type === 'tool_use');
  if (!toolUse) throw new Error('Không nhận được kết quả có cấu trúc từ AI.');
  return toolUse.input;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const user = await requireUser(req);
  if (!user) { res.status(401).json({ error: 'Bạn cần đăng nhập để dùng tính năng này.' }); return; }

  const quotaError = await checkAndConsumeTrialQuota(user.id, 'goi-y-day-bai');
  if (quotaError) { res.status(402).json({ error: quotaError, quotaExceeded: true }); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'Server chưa được cấu hình ANTHROPIC_API_KEY.' }); return; }

  try {
    const { topic, assets, preferred_assets, positioning, quick_context } = req.body || {};
    if (!topic || !topic.trim()) { res.status(400).json({ error: 'Thiếu nội dung/chủ đề bài đang đẩy.' }); return; }

    const assetsList = Array.isArray(assets) && assets.length
      ? assets.map(a => `- ${a.label}${a.url ? ` (${a.url})` : ''}`).join('\n')
      : '(chưa có tài sản quảng bá nào được lưu)';

    const contextBlock = positioning && positioning.luot1
      ? `ĐỊNH VỊ THƯƠNG HIỆU ĐÃ CHỐT:\n${JSON.stringify(positioning.luot1, null, 2)}`
      : (quick_context && quick_context.trim()
        ? `BỐI CẢNH NHANH (chưa làm Định Vị đầy đủ): ${quick_context.trim()}`
        : 'BỐI CẢNH: (không cung cấp — viết tự nhiên, phổ quát)');

    // Cho phép chọn NHIỀU tài sản (2026-08-20) — có nhiều mốc thì cần nhiều tài sản khác nhau để
    // phân bổ theo mức độ cam kết tăng dần, không còn giới hạn đúng 1 tài sản như bản cũ.
    const preferredList = Array.isArray(preferred_assets) ? preferred_assets.filter(Boolean) : [];
    const preferredLine = preferredList.length
      ? `\n\nTÀI SẢN NGƯỜI DÙNG MUỐN ƯU TIÊN DÙNG CHO BÀI NÀY (chọn ra ${preferredList.length} tài sản, hãy phân bổ hợp lý qua các mốc, không bắt buộc dùng hết):\n${preferredList.map(l => `- ${l}`).join('\n')}`
      : '\n\n(Người dùng không chỉ định tài sản ưu tiên — tự chọn từ danh sách tài sản có sẵn ở trên cho hợp từng mốc.)';

    const milestonesBlock = MILESTONE_ORDER.map(k => `${k}: ${MILESTONES[k].label} — ${MILESTONES[k].desc}`).join('\n');

    const userContent = `BÀI ĐANG ĐẨY (chủ đề/nội dung):\n${topic}\n\nDANH SÁCH TÀI SẢN QUẢNG BÁ CÓ SẴN:\n${assetsList}${preferredLine}\n\n${contextBlock}\n\n5 MỐC LƯỢT XEM CẦN GỢI Ý (đúng thứ tự, xuất đủ cả 5):\n${milestonesBlock}\n\nHãy gợi ý đẩy bài cho đúng cả 5 mốc trên.`;

    const result = await callClaude({ apiKey, system: SYSTEM_PROMPT, userContent, tool: TOOL_DAY_BAI_ALL });
    res.status(200).json({ result });
  } catch (err) {
    await refundTrialQuota(user.id, 'goi-y-day-bai');
    res.status(500).json({ error: err.message || 'Có lỗi xảy ra khi gợi ý đẩy bài.' });
  }
};
