// Serverless function — gợi ý cách "đẩy bài" theo TỪNG mốc lượt xem trên Facebook, sinh ĐỦ CẢ 5 MỐC
// trong 1 LẦN GỌI DUY NHẤT (2026-08-20, trước đây bắt bấm lại — tốn 1 lượt riêng cho mỗi mốc, đổi
// mốc 5 lần tốn 5 lượt — người dùng phản ánh vậy vừa tốn vừa không tiện): câu bình luận tự đăng,
// gợi ý trả lời bình luận người khác, và nên gắn tài sản quảng bá nào — phù hợp đúng giai đoạn đó.
const { requireUser } = require('./_lib/auth');
const { checkAndConsumeTrialQuota, refundTrialQuota } = require('./_lib/trial-quota');
const { ADDRESS_FORM_RULE, contextBlockOf } = require('./_lib/post-schema');

const MILESTONES = {
  m1: { label:'Trước 1.000 view đầu tiên', desc:'Giai đoạn khơi mào — mục tiêu duy nhất là kích người xem để lại bình luận đầu tiên, tuyệt đối chưa nên gắn link bán hàng vì dễ làm giảm reach.' },
  m2: { label:'Đạt 10.000 view', desc:'Bài đã có đà — có thể bắt đầu dẫn nhẹ về 1 tài sản ít cam kết (cộng đồng miễn phí, hoặc aff sản phẩm người khác) mà không phá vỡ mạch tương tác tự nhiên.' },
  m3: { label:'Đạt 100.000 view', desc:'Bài đang viral thật — đủ lượng người lạ để bắt đầu dẫn về tài sản có giá trị hơn (sản phẩm số của mình hoặc aff của mình), CTA rõ ràng hơn.' },
  m4: { label:'Đạt 1 triệu view', desc:'Bài đã viral lớn — đây là lúc tận dụng tối đa, CTA mạnh và cụ thể để chuyển đổi số đông người xem thành khách hàng/lead thật.' },
  m5: { label:'Trên 1 triệu view', desc:'Bài viral cực lớn — ưu tiên tài sản có giá trị chuyển đổi cao nhất (sản phẩm số/aff chính), đồng thời tận dụng để mở rộng cộng đồng cho các đợt sau.' },
};
const MILESTONE_ORDER = ['m1', 'm2', 'm3', 'm4', 'm5'];

const SYSTEM_PROMPT = `Bạn là chuyên gia tăng trưởng kênh mạng xã hội tại Việt Nam, chuyên "đẩy bài" theo từng mốc lượt xem để tối đa hoá tương tác rồi chuyển đổi đúng thời điểm.

${ADDRESS_FORM_RULE}

NGUYÊN TẮC BẮT BUỘC:
- Xuất ĐỦ CẢ 5 MỐC lượt xem trong 1 lần — mỗi mốc có mục tiêu khác nhau, không dùng chung 1 kiểu bình luận cho mọi mốc, và các mốc phải nối tiếp logic với nhau (không lặp lại y hệt ý của mốc trước).
- Bình luận tự đăng (cmt_tu_dang) ở mốc đầu (trước 1.000 view) phải là bình luận KÍCH THÍCH người khác trả lời/tranh luận, tuyệt đối không chèn link hay CTA bán hàng.
- Từ mốc 10.000 view trở đi, nếu bình luận có CTA và tài sản được chọn (tai_san_de_xuat) có link thật, cmt_tu_dang BẮT BUỘC phải CHÈN THẲNG link đó ngay trong bình luận — không giữ link lại chỉ chờ ai bình luận đúng từ khoá mới gửi (khác cmt đầu tiên ở mốc m1, mốc đó vẫn tuyệt đối không có link). Vẫn giữ đúng 1 từ khoá kích hoạt 2 chữ theo mẫu "Để lại bình luận chữ '...' và mình sẽ gửi bạn ..." như bình thường (để tối ưu tương tác/thuật toán) — chỉ là giờ link đã có sẵn ngay trong bình luận cho ai muốn bấm luôn, không phải đợi. Từ khoá nên KHÁC NHAU giữa các mốc (mỗi mốc mời 1 thứ khác nhau) để không lặp lại.
- BẮT BUỘC (đây là bước hay bị bỏ sót nhất — không làm là phá vỡ lời hứa với người đọc): mọi mốc có từ khoá kích hoạt PHẢI có sẵn 1 mẫu trả lời DÀNH RIÊNG cho người bình luận đúng từ khoá đó (tra_loi_tu_khoa_cta) — mẫu này PHẢI CHỨA THẲNG link thật của tài sản được chọn ở mốc đó (lấy đúng URL trong danh sách tài sản quảng bá được cung cấp, TUYỆT ĐỐI không bịa link). Đây không phải 1 trong 3 mẫu trả lời chung ở goi_y_tra_loi_cmt — mẫu trả lời chung dùng cho bình luận khen/hỏi/nghi ngờ thông thường, còn mẫu này dùng RIÊNG để hoàn thành đúng lời hứa đã đưa ra trong CTA. Mốc chưa có từ khoá/CTA (vd m1) thì để rỗng.
- Có thể có NHIỀU tài sản quảng bá được cung cấp (không chỉ 1) — hãy CHỦ ĐỘNG PHÂN BỔ tài sản phù hợp cho từng mốc theo đúng mức độ cam kết tăng dần (mốc đầu: chưa gắn gì hoặc tài sản ít cam kết nhất; mốc cuối: tài sản giá trị/chuyển đổi cao nhất) — không bắt buộc phải dùng hết tất cả tài sản, và có thể dùng lại cùng 1 tài sản ở nhiều mốc liền kề nếu hợp lý, nhưng KHÔNG được gắn tài sản nào ngoài danh sách được cung cấp.
- Nếu người dùng không chỉ định tài sản nào (danh sách rỗng), tự chọn tuỳ theo có tài sản nào trong kho hay không — nếu kho cũng rỗng, để trống và giải thích rõ vì sao chưa nên gắn gì ở mốc đó.
- Nếu tài sản được chọn có "câu CTA mẫu đã lưu" (xem danh sách tài sản), ưu tiên bám theo TINH THẦN/GIỌNG ĐIỆU câu mẫu đó khi viết cmt_tu_dang/tra_loi_tu_khoa_cta cho đúng tài sản đó — biến tấu lại câu chữ cho hợp mốc này, TUYỆT ĐỐI không copy y nguyên.
- Gợi ý trả lời bình luận (goi_y_tra_loi_cmt) phải là các mẫu câu tự nhiên, đúng giọng, dùng được cho nhiều loại bình luận khác nhau (khen, hỏi, nghi ngờ...) — riêng cho từng mốc, không lặp lại y hệt giữa các mốc.
- BÁN THẬT, KHÔNG CHỈ BẢO BẤM LINK (lỗi hay gặp nhất — đọc kỹ): mọi câu có CTA/tài sản (cmt_tu_dang, tra_loi_tu_khoa_cta) BẮT BUỘC phải có 1 vế nêu rõ người đọc ĐƯỢC GÌ hoặc GIẢI QUYẾT ĐƯỢC NỖI ĐAU/KHAO KHÁT NÀO khi dùng tài sản đó — TRƯỚC khi mời hành động, không được viết cụt lủn kiểu "Bình luận từ khoá X để nhận Y". Ưu tiên lấy đúng nỗi đau/khao khát/insight trong định vị (nếu có) để câu CTA chạm đúng người đang cần; nếu chưa có định vị, suy luận hợp lý từ tên/loại tài sản. Ví dụ SAI: "Cmt 'TIỀN' để nhận file miễn phí." Ví dụ ĐÚNG: "Nếu bạn đang loay hoay không biết tiền đi đâu hết mỗi tháng, file này chỉ mất 5 phút giúp bạn nhìn ra ngay — Cmt 'TIỀN' để nhận." Áp dụng y hệt cho tra_loi_tu_khoa_cta, không chỉ dán link trơn.
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
            cmt_tu_dang: { type: 'string', description: 'Câu bình luận tự đăng/ghim phù hợp với đúng mốc này. Từ mốc m2 trở đi, nếu có tài sản/CTA, PHẢI chèn thẳng link thật của tài sản đó vào ngay trong câu — không được để trống link chờ ai bình luận từ khoá mới gửi (riêng mốc m1 tuyệt đối không có link/CTA).' },
            tra_loi_tu_khoa_cta: { type: 'string', description: 'Mẫu trả lời DÀNH RIÊNG cho người bình luận đúng từ khoá kích hoạt trong CTA của mốc này — PHẢI chứa link thật của tài sản được chọn (xem tai_san_de_xuat), không bịa link. Chuỗi rỗng nếu mốc này chưa có từ khoá/CTA.' },
            goi_y_tra_loi_cmt: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 3, description: 'Đúng 3 mẫu câu trả lời bình luận người khác THÔNG THƯỜNG (khen/hỏi/nghi ngờ...) — KHÔNG phải trả lời cho người đã dùng từ khoá CTA (xem tra_loi_tu_khoa_cta riêng).' },
            tai_san_de_xuat: {
              type: 'object',
              properties: {
                label: { type: 'string', description: 'Tên tài sản được chọn cho mốc này — PHẢI khớp đúng 1 label trong danh sách được cung cấp, hoặc để rỗng nếu chưa nên gắn gì.' },
                ly_do: { type: 'string', description: 'Vì sao chọn (hoặc chưa chọn) tài sản này cho đúng mốc này.' },
              },
              required: ['label', 'ly_do'],
            },
          },
          required: ['moc', 'chien_luoc_moc_nay', 'cmt_tu_dang', 'tra_loi_tu_khoa_cta', 'goi_y_tra_loi_cmt', 'tai_san_de_xuat'],
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
      ? assets.map(a => `- ${a.label}${a.url ? ` (${a.url})` : ''}${a.cta_mau ? ` — câu CTA mẫu đã lưu: "${a.cta_mau}"` : ''}`).join('\n')
      : '(chưa có tài sản quảng bá nào được lưu)';

    // Trước đây chỉ gửi luot1 (giọng văn/trục) — THIẾU hẳn luot2 (nỗi đau/khao khát/insight khách
    // hàng) dù frontend đã gửi kèm sẵn — khiến AI không có gì để "bán" ngoài tên tài sản, viết CTA
    // khô khan kiểu chỉ bảo bấm link (phản hồi chị Quỳnh 2026-08-24: "không nêu bật được điểm mạnh,
    // đề cao được sản phẩm... cứ chỉ bảo người ta bấm link"). Dùng chung contextBlockOf() với
    // viet-content.js để luôn có đủ nỗi đau/khao khát làm chất liệu viết CTA thuyết phục hơn.
    const contextBlock = contextBlockOf(positioning, quick_context);

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
