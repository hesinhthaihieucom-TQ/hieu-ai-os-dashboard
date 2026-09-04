// Giai đoạn 2 của "Tạo Sản Phẩm Bằng AI" (san-pham-so/) — nhận thẳng phương án đã chọn ở Giai đoạn 1
// (không cần copy-paste tay), gộp 5 bước vào 1 file theo `step` (giống cách api/dinh-vi.js gộp
// luot 1/2): 'outline2' (mở rộng outline cấp 2), 'nghien-cuu' + 'viet' (viết 1 phần, dùng kiến thức
// sẵn có của Claude — KHÔNG tích hợp web-search, theo quyết định của Quỳnh 2026-08-25: tính năng đó
// chưa từng dùng trong repo này, để tránh rủi ro kỹ thuật chưa kiểm chứng), 'review' (chấm chất
// lượng), 'tong-duyet' (đọc lại TOÀN BỘ sau khi viết xong hết, kiểm tra mạch lạc/trùng lặp — thêm
// 2026-09-01). 'outline2' và 'viet' có thể nhận kèm `materialPath` — tài liệu PDF người dùng đã tải
// lên ở nhánh A của Giai đoạn 1 (xem api/tim-san-pham-tu-tai-lieu.js) — để nội dung viết ra BÁM SÁT
// tài liệu gốc thay vì chỉ dùng 1 lần ở bước tìm ý tưởng rồi bỏ; 'nghien-cuu' CỐ Ý không nhận tài
// liệu vì đó là bước tổng hợp kiến thức nền CHUNG, không phải nội dung riêng của user. 'nghien-cuu'
// có thể nhận `useWebSearch: true` (tùy chọn, thêm 2026-09-01) — thay quy trình thủ công cũ của
// Quỳnh (tự nghĩ từ khóa -> tìm nguồn -> NotebookLM tổng hợp) bằng công cụ web_search của Anthropic,
// xem researchViaWebSearch() bên dưới.

const { requireUser } = require('./_lib/auth');
const { checkAndConsumeSpsQuota, refundSpsQuota } = require('./_lib/sps-ai-quota');
const { TOOL_OUTLINE2, TOOL_NGHIEN_CUU, TOOL_VIET, TOOL_REVIEW, TOOL_TONG_DUYET } = require('./_lib/xay-dung-noi-dung-schema');
const { signMaterialUrl } = require('./_lib/material-storage');

const SYSTEM_PROMPT = `Bạn là chuyên gia thiết kế nội dung sản phẩm số — giúp người dùng xây nội dung chất lượng cho sản phẩm số họ đã chọn, từng bước một, luôn dựa sát vào đối tượng/định dạng/outline đã có.

NGUYÊN TẮC BẮT BUỘC:
- Khi viết nội dung đầy đủ 1 phần (bước viết, KHÔNG áp dụng cho bước xây outline — outline vẫn phải ngắn gọn dạng khung sườn): đây là sản phẩm số người đọc TRẢ TIỀN mua, nội dung phải đủ SÂU để xứng đáng với số tiền bỏ ra. KHÔNG giới hạn theo số từ — viết tới khi thật sự hết ý, đào tới GỐC RỄ vấn đề (không dừng ở triệu chứng bề mặt), chạm đúng điểm đau thật của người đọc, luôn có ví dụ điển hình gắn với đời sống thật của họ (chi tiết đầy đủ ở schema field noi_dung).
- Không chung chung, không sáo rỗng — mỗi phần phải đủ cụ thể để người đọc áp dụng được ngay.
- Luôn có ít nhất 1 ví dụ thật hoặc hướng ví dụ hợp lý — KHÔNG bịa số liệu/tên riêng cụ thể làm như đã kiểm chứng khi không có căn cứ. Được phép và khuyến khích dùng câu chuyện có thật của danh nhân/doanh nhân/người nổi tiếng NẾU đó là sự kiện/chi tiết đã được biết rộng rãi, chắc chắn đúng — nếu không chắc chắn về 1 chi tiết cụ thể (câu nói, số liệu, mốc thời gian...) thì KHÔNG được đoán/bịa cho khớp, phải chuyển sang ví dụ tình huống điển hình KHÔNG nêu tên người thật cụ thể thay vì liều gán sai cho ai đó.
- Mỗi phần phải có 1 bài tập/checklist làm được NGAY, không cần giải thích thêm — DẠNG checklist để tick hoặc câu hỏi có chỗ trống để người đọc TỰ VIẾT RA câu trả lời bằng chữ của họ, không phải đoạn mô tả lý thuyết nên làm gì (tự viết ra thì mới nhớ lâu, mới áp dụng thật, hơn là chỉ đọc-hiểu thụ động).
- Mỗi phần chỉ nên xoay quanh 1 THÔNG ĐIỆP CHÍNH — không nhồi nhiều ý khiến người đọc ngợp, không nhớ được gì.
- Nếu được cung cấp tiêu đề/kết quả của phần TRƯỚC và phần SAU, hãy mở đầu bằng 1 câu nối tiếp mạch từ phần trước, và kết bằng 1 câu dẫn dắt sang phần sau — để đọc liền mạch như 1 cuốn sách, không như từng phần rời rạc.
- Nếu chủ đề liên quan đến thay đổi thói quen/hành vi, chủ động lường trước 1-2 rào cản tâm lý phổ biến khiến người đọc dễ trì hoãn/bỏ cuộc (không đủ thời gian, đã từng thử mà thất bại...) và trả lời/trấn an ngay trong nội dung, không đợi người đọc tự vượt qua.
- Giọng văn tự nhiên, như người thật đang nói chuyện, không như văn bản AI.
- Khi xây outline cấp 2 (bước outline2): phần đầu tiên NGAY SAU Mở đầu phải cho người đọc 1 kết quả nhỏ làm được NGAY (early win) — không dồn hết giá trị về các phần cuối, để người đọc thấy hiệu quả sớm và có động lực đi tiếp.
- Output tiếng Việt, gọi người dùng là "bạn".`;

// 90s từng là mặc định cho MỌI bước (nghien-cuu/viet/review/tong-duyet), không chỉ outline2 — lỗi
// timeout thật Quỳnh gặp lại 2026-09-01 xảy ra đúng lúc "bắt đầu viết 1 phần" (bước nghien-cuu/viet),
// không phải outline2 (đã sửa riêng trước đó). System prompt đã dày lên nhiều qua các đợt (bắc cầu,
// rào cản tâm lý, tom_tat_3_y, khoang_trong_thi_truong...) khiến MỌI bước có thể mất lâu hơn 90s cũ,
// không riêng gì bước có max_tokens cao. Nâng mặc định chung lên 150s — không có downside cho request
// chạy nhanh (chỉ ảnh hưởng khi thật sự bị kẹt), Vercel vẫn còn dư địa lớn tới trần 300s.
const DEFAULT_TIMEOUT_MS = 150000;

async function callClaude({ apiKey, system, userContent, tool, maxTokens, timeoutMs }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs || DEFAULT_TIMEOUT_MS);
  let resp;
  try {
    resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        // 6000 mặc định (không phải 4000) — outline cấp 2 đầy đủ (mở đầu + nhiều phần + kết, mỗi
        // phần 3-5 nội dung con) từng có nguy cơ bị cắt giữa chừng ở mức thấp hơn, xem lưu ý tương
        // tự ở api/tim-san-pham-phu-hop.js.
        max_tokens: maxTokens || 6000,
        system: (typeof system === 'string' ? [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }] : system),
        messages: [{ role: 'user', content: userContent }],
        tools: [tool],
        tool_choice: { type: 'tool', name: tool.name },
      }),
      signal: controller.signal,
    });
  } catch (e) {
    if (e.name === 'AbortError') throw new Error(`AI phản hồi quá lâu (quá ${Math.round((timeoutMs || DEFAULT_TIMEOUT_MS) / 1000)} giây) — có thể đang quá tải, thử lại giúp mình.`);
    throw e;
  } finally {
    clearTimeout(timer);
  }
  if (!resp.ok) throw new Error(`Anthropic API lỗi (${resp.status}): ${await resp.text()}`);
  const data = await resp.json();
  if (data.stop_reason === 'max_tokens') throw new Error('AI trả lời quá dài bị cắt giữa chừng — thử lại giúp mình.');
  const toolUse = (data.content || []).find((b) => b.type === 'tool_use');
  if (!toolUse) throw new Error('Không nhận được kết quả có cấu trúc từ AI.');
  return toolUse.input;
}

function ideaBlock(idea) {
  return `SẢN PHẨM: ${idea.ten_san_pham}\nĐỐI TƯỢNG: ${idea.doi_tuong}\nĐỊNH DẠNG: ${idea.dinh_dang}\nĐỘ DÀI: ${idea.do_dai_uoc_luong}`;
}

// Thay quy trình thủ công cũ của Quỳnh (tự nghĩ từ khóa -> tìm nguồn -> đưa vào NotebookLM tổng
// hợp) — người dùng app không tự nghĩ từ khóa, để Claude tự làm hết qua công cụ web_search có sẵn
// của Anthropic (docs.claude.com/agents-and-tools/tool-use/web-search-tool, $10/1.000 lượt tìm).
// KHÔNG ép tool_choice ở lệnh này (khác mọi lệnh gọi khác trong file) — bắt buộc 1 tool cụ thể sẽ
// chặn Claude tự quyết định tìm web trước, nên đây PHẢI là 1 lệnh gọi riêng, kết quả text của nó
// mới được đưa làm ngữ liệu cho lệnh TOOL_NGHIEN_CUU ép-tool bình thường ở dưới. Lỗi bất kỳ -> trả
// về '' (không throw) — tìm web là phần BỔ SUNG, lỗi thì rơi về nghiên cứu bằng kiến thức sẵn có
// của AI, không được chặn luồng viết chính.
async function researchViaWebSearch({ apiKey, idea, phan }) {
  // 4 góc tìm kiếm khớp đúng quy trình thủ công cũ của Quỳnh (4 câu lệnh Gemini riêng: kiến thức
  // nền, sai lầm phổ biến, case study thật, nghiên cứu thị trường) — gộp cả 4 vào ĐÚNG 1 lệnh gọi
  // này (Claude tự tìm nhiều lượt trong 1 lần gọi), không cần thêm lệnh gọi/chi phí nào so với thiết
  // kế web-search ban đầu.
  const prompt = `Hãy tìm kiếm trên web thông tin thực tế, cập nhật, liên quan tới chủ đề "${phan.tieu_de}" trong bối cảnh sản phẩm số "${idea.ten_san_pham}" (đối tượng: ${idea.doi_tuong}). Tự chọn từ khóa tìm kiếm phù hợp, không cần hỏi lại. Tìm và tổng hợp đủ 4 góc sau (bỏ qua góc nào không tìm được, không suy đoán):
1. Kiến thức nền quan trọng nhất, từ cơ bản đến nâng cao.
2. Sai lầm phổ biến người mới hay mắc về chủ đề này.
3. Case study/câu chuyện thành công hoặc thất bại THẬT có số liệu/tình huống cụ thể liên quan tới chủ đề.
4. Có sản phẩm số/khoá học/sách nào đang bán tốt về chủ đề gần giống không — người mua đánh giá cao điểm gì, hay phàn nàn thiếu gì.
Tổng hợp lại thành các đoạn ngắn gọn theo từng góc (khoảng 300-500 từ tổng cộng), ghi rõ nguồn (tên trang + link) cho từng ý quan trọng.`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);
  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 4 }],
      }),
      signal: controller.signal,
    });
    if (!resp.ok) return '';
    const data = await resp.json();
    const content = data.content || [];
    // Lấy các block text xuất hiện SAU block web_search_tool_result CUỐI CÙNG — đó là câu trả lời
    // tổng hợp sau khi đã tìm xong (có thể tìm nhiều lượt), không lẫn câu narrate "tôi sẽ tìm..."
    // xuất hiện trước khi tìm. Nếu Claude không tìm gì cả (hiếm), lastIdx=-1 -> lấy hết text có sẵn.
    let lastIdx = -1;
    content.forEach((b, i) => { if (b.type === 'web_search_tool_result') lastIdx = i; });
    return content.slice(lastIdx + 1).filter((b) => b.type === 'text').map((b) => b.text).join('\n\n');
  } catch (e) {
    return '';
  } finally {
    clearTimeout(timer);
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const user = await requireUser(req);
  if (!user) { res.status(401).json({ error: 'Bạn cần đăng nhập để dùng tính năng này.' }); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'Server chưa được cấu hình ANTHROPIC_API_KEY.' }); return; }

  const { step, idea, outlineCap1, taiLieuKinhNghiem, outlineCap2, phan, nghienCuu, giongVan, noiDungDaViet, materialPath, phanTruoc, phanSau, noiDungTheoPhan, useWebSearch } = req.body || {};
  // Tìm web tốn thêm 1 lệnh gọi + phí tìm kiếm thật — tính actionKey riêng để KHÔNG tính phí cao lây
  // sang người không bật tìm web (xem AI_WEIGHTS['xay-dung-noi-dung-nghien-cuu-web'] trong trial-quota.js).
  const actionKey = (step === 'nghien-cuu' && useWebSearch) ? 'xay-dung-noi-dung-nghien-cuu-web' : `xay-dung-noi-dung-${step}`;

  const quotaError = await checkAndConsumeSpsQuota(user.id, actionKey);
  if (quotaError) { res.status(402).json({ error: quotaError, quotaExceeded: true }); return; }

  try {
    if (step === 'outline2') {
      if (!idea || !Array.isArray(outlineCap1)) { res.status(400).json({ error: 'Thiếu thông tin sản phẩm/outline cấp 1.' }); return; }
      const outlineText = `${ideaBlock(idea)}\n\nOUTLINE CẤP 1 (mở rộng đúng theo thứ tự này):\n${outlineCap1.map((p, i) => `${i + 1}. ${p}`).join('\n')}\n\n${taiLieuKinhNghiem ? `TÀI LIỆU/KINH NGHIỆM ĐÃ CÓ:\n${taiLieuKinhNghiem}\n\n` : 'Người dùng CHƯA có tài liệu/kinh nghiệm trực tiếp đã làm sẵn cho chủ đề này.\n\n'}Hãy mở rộng thành outline cấp 2 theo đúng schema.`;
      const materialUrl = await signMaterialUrl(user.id, materialPath);
      const userContent = materialUrl
        ? [{ type: 'document', source: { type: 'url', url: materialUrl } }, { type: 'text', text: `${outlineText}\n\nCó tài liệu gốc đính kèm — outline cấp 2 phải phản ánh đúng cấu trúc/nội dung thật trong tài liệu đó, không bịa thêm ngoài phạm vi tài liệu + thông tin đã cho.` }]
        : outlineText;
      // outline_cap_1 có thể tới 7 phần, mỗi phần nhiều mục con (tieu_de/ket_qua_cu_the/noi_dung_con/
      // bai_tap/vi_du_goi_y) + mo_dau/ket — 6000 rồi 8000 đều từng bị cắt giữa chừng với outline
      // nhiều phần/nhiều nội dung con (báo lỗi thật, Quỳnh gặp liên tiếp 2026-09-01). Sonnet 5 hỗ trợ
      // tới 128.000 token output trên Messages API đồng bộ (docs.claude.com/models/overview) — 8000
      // không hề gần chạm trần thật, chỉ là ước lượng ban đầu quá thấp. Nâng hẳn lên 16000 để dư địa
      // rộng, không tốn thêm phí nếu output không dùng hết (chỉ tính phí đúng số token đã sinh ra).
      const result = await callClaude({ apiKey, system: SYSTEM_PROMPT, userContent, tool: TOOL_OUTLINE2, maxTokens: 16000, timeoutMs: 250000 });
      res.status(200).json({ result });
      return;
    }

    if (step === 'nghien-cuu') {
      if (!idea || !phan) { res.status(400).json({ error: 'Thiếu thông tin phần cần nghiên cứu.' }); return; }
      let webBlock = '';
      if (useWebSearch) {
        const webText = await researchViaWebSearch({ apiKey, idea, phan });
        if (webText) webBlock = `\nTHÔNG TIN TỪ WEB (đã tìm kiếm, có trích dẫn nguồn — ưu tiên dùng làm căn cứ thay vì tự bịa, nhớ điền nguon_tham_khao và khoang_trong_thi_truong nếu có dữ liệu phù hợp):\n${webText}\n`;
      }
      const userText = taiLieuKinhNghiem ? `TÀI LIỆU/GHI CHÚ CỦA NGƯỜI DÙNG:\n${taiLieuKinhNghiem}` : '';
      const userContent = `${ideaBlock(idea)}\n\nPHẦN CẦN NGHIÊN CỨU NỀN TẢNG: ${phan.tieu_de}\nKẾT QUẢ CỤ THỂ CẦN ĐẠT: ${phan.ket_qua_cu_the}\nNỘI DUNG CON: ${(phan.noi_dung_con || []).join('; ')}\n${webBlock}${userText ? `\n${userText}\n` : ''}\nHãy tổng hợp kiến thức nền cho đúng phần này.`;
      const result = await callClaude({ apiKey, system: SYSTEM_PROMPT, userContent, tool: TOOL_NGHIEN_CUU });
      res.status(200).json({ result });
      return;
    }

    if (step === 'viet') {
      if (!idea || !phan || !nghienCuu) { res.status(400).json({ error: 'Thiếu thông tin để viết nội dung.' }); return; }
      const contextLines = [
        phanTruoc ? `PHẦN TRƯỚC ĐÓ: ${phanTruoc.tieu_de} (đã đạt: ${phanTruoc.ket_qua_cu_the})` : null,
        phanSau ? `PHẦN TIẾP THEO: ${phanSau.tieu_de}` : null,
      ].filter(Boolean).join('\n');
      const userMaterialLines = taiLieuKinhNghiem ? `TÀI LIỆU/GHI CHÚ CỦA NGƯỜI DÙNG:\n${taiLieuKinhNghiem}` : '';
      const vietText =`${ideaBlock(idea)}\nGIỌNG VĂN MONG MUỐN: ${giongVan || '(chưa nêu rõ — chọn giọng gần gũi, thẳng thắn, phù hợp đối tượng)'}\n${contextLines ? `${contextLines}\n` : ''}\nPHẦN CẦN VIẾT: ${phan.tieu_de}\nKẾT QUẢ CỤ THỂ CẦN ĐẠT: ${phan.ket_qua_cu_the}\nNỘI DUNG CON: ${(phan.noi_dung_con || []).join('; ')}\nBÀI TẬP GỢI Ý: ${phan.bai_tap || ''}\n\nNGUYÊN LIỆU NGHIÊN CỨU NỀN TẢNG:\nKiến thức nền: ${(nghienCuu.kien_thuc_nen || []).join(' | ')}\nSai lầm phổ biến: ${(nghienCuu.sai_lam_pho_bien || []).join(' | ')}\nHướng ví dụ: ${(nghienCuu.huong_vi_du || []).join(' | ')}\nRào cản tâm lý: ${(nghienCuu.rao_can_tam_ly || []).join(' | ')}\nKhoảng trống thị trường: ${(nghienCuu.khoang_trong_thi_truong || []).join(' | ')}\n${userMaterialLines ? `\n${userMaterialLines}\n` : ''}\nHãy viết nội dung đầy đủ cho phần này.`;
      const materialUrl = await signMaterialUrl(user.id, materialPath);
      const userContent = materialUrl
        ? [{ type: 'document', source: { type: 'url', url: materialUrl } }, { type: 'text', text: `${vietText}\n\nCó tài liệu gốc đính kèm — ưu tiên bám sát nội dung/quan điểm/ví dụ THẬT trong tài liệu đó khi viết phần này, không viết chung chung như thể chưa có tài liệu.` }]
        : vietText;
      // Đã bỏ giới hạn số từ cứng (2026-09-01, theo yêu cầu Quỳnh — để AI tự quyết định độ dài cần
      // thiết thay vì ép khung), nội dung có thể dài hơn hẳn mức cũ khi chủ đề thật sự cần đào sâu —
      // nâng max_tokens theo đúng bài học đã lặp lại nhiều lần trong ngày (đừng để cắt giữa chừng).
      // 12000 vẫn không đủ khi nội dung thật sự cần dài (8 nguyên tắc chiều sâu mới, không giới hạn
      // số từ) — nâng tiếp lên 16000 (khớp mức đã dùng cho outline2, cũng từng bị cắt ở mức thấp
      // hơn), timeout tương ứng.
      const result = await callClaude({ apiKey, system: SYSTEM_PROMPT, userContent, tool: TOOL_VIET, maxTokens: 16000, timeoutMs: 250000 });
      res.status(200).json({ result });
      return;
    }

    if (step === 'review') {
      if (!noiDungDaViet) { res.status(400).json({ error: 'Thiếu nội dung cần review.' }); return; }
      const userContent = `BẢN NHÁP CẦN REVIEW:\n${noiDungDaViet}\n\nKiểm tra đúng 5 tiêu chí trong schema và trả kết quả.`;
      const result = await callClaude({ apiKey, system: SYSTEM_PROMPT, userContent, tool: TOOL_REVIEW });
      res.status(200).json({ result });
      return;
    }

    if (step === 'tong-duyet') {
      if (!idea || !outlineCap2 || !noiDungTheoPhan) { res.status(400).json({ error: 'Thiếu nội dung để duyệt tổng thể.' }); return; }
      const flat = [
        { kind: 'Mở đầu', item: outlineCap2.mo_dau },
        ...(outlineCap2.phan || []).map((p) => ({ kind: 'Phần', item: p })),
        { kind: 'Kết', item: outlineCap2.ket },
      ];
      const body = flat.map((entry, i) => `--- ${entry.kind}: ${entry.item.tieu_de} ---\n${noiDungTheoPhan[i] || '(chưa viết nội dung phần này)'}`).join('\n\n');
      const userContent = `${ideaBlock(idea)}\n\nTOÀN BỘ NỘI DUNG ĐÃ VIẾT (theo đúng thứ tự outline):\n${body}\n\nHãy đọc kỹ và đánh giá theo đúng schema.`;
      const result = await callClaude({ apiKey, system: SYSTEM_PROMPT, userContent, tool: TOOL_TONG_DUYET, maxTokens: 3000 });
      res.status(200).json({ result });
      return;
    }

    res.status(400).json({ error: 'Thiếu step hợp lệ.' });
  } catch (err) {
    await refundSpsQuota(user.id, actionKey);
    res.status(500).json({ error: err.message || 'Có lỗi xảy ra khi xây dựng nội dung.' });
  }
};
