// Giai đoạn 2 của "Tạo Sản Phẩm Bằng AI" (san-pham-so/) — nhận thẳng phương án đã chọn ở Giai đoạn 1
// (không cần copy-paste tay), gộp 5 bước vào 1 file theo `step` (giống cách api/dinh-vi.js gộp
// luot 1/2): 'outline2' (mở rộng outline cấp 2), 'nghien-cuu' + 'viet' (viết 1 phần, dùng kiến thức
// sẵn có của Claude — KHÔNG tích hợp web-search, theo quyết định của Quỳnh 2026-08-25: tính năng đó
// chưa từng dùng trong repo này, để tránh rủi ro kỹ thuật chưa kiểm chứng), 'review' (chấm chất
// lượng), 'tong-duyet' (đọc lại TOÀN BỘ sau khi viết xong hết, kiểm tra mạch lạc/trùng lặp — thêm
// 2026-09-01). 'outline2' và 'viet' có thể nhận kèm `materialPath` — tài liệu PDF người dùng đã tải
// lên ở nhánh A của Giai đoạn 1 (xem api/tim-san-pham-tu-tai-lieu.js) — để nội dung viết ra BÁM SÁT
// tài liệu gốc thay vì chỉ dùng 1 lần ở bước tìm ý tưởng rồi bỏ; 'nghien-cuu' CỐ Ý không nhận tài
// liệu vì đó là bước tổng hợp kiến thức nền CHUNG, không phải nội dung riêng của user.

const { requireUser } = require('./_lib/auth');
const { checkAndConsumeTrialQuota, refundTrialQuota } = require('./_lib/trial-quota');
const { TOOL_OUTLINE2, TOOL_NGHIEN_CUU, TOOL_VIET, TOOL_REVIEW, TOOL_TONG_DUYET } = require('./_lib/xay-dung-noi-dung-schema');
const { signMaterialUrl } = require('./_lib/material-storage');

const SYSTEM_PROMPT = `Bạn là chuyên gia thiết kế nội dung sản phẩm số — giúp người dùng xây nội dung chất lượng cho sản phẩm số họ đã chọn, từng bước một, luôn dựa sát vào đối tượng/định dạng/outline đã có.

NGUYÊN TẮC BẮT BUỘC:
- Không chung chung, không sáo rỗng — mỗi phần phải đủ cụ thể để người đọc áp dụng được ngay.
- Luôn có ít nhất 1 ví dụ thật hoặc hướng ví dụ hợp lý — KHÔNG bịa số liệu/tên riêng cụ thể làm như đã kiểm chứng khi không có căn cứ.
- Mỗi phần phải có 1 bài tập/checklist làm được NGAY, không cần giải thích thêm — DẠNG checklist để tick hoặc câu hỏi có chỗ trống để người đọc TỰ VIẾT RA câu trả lời bằng chữ của họ, không phải đoạn mô tả lý thuyết nên làm gì (tự viết ra thì mới nhớ lâu, mới áp dụng thật, hơn là chỉ đọc-hiểu thụ động).
- Mỗi phần chỉ nên xoay quanh 1 THÔNG ĐIỆP CHÍNH — không nhồi nhiều ý khiến người đọc ngợp, không nhớ được gì.
- Nếu được cung cấp tiêu đề/kết quả của phần TRƯỚC và phần SAU, hãy mở đầu bằng 1 câu nối tiếp mạch từ phần trước, và kết bằng 1 câu dẫn dắt sang phần sau — để đọc liền mạch như 1 cuốn sách, không như từng phần rời rạc.
- Nếu chủ đề liên quan đến thay đổi thói quen/hành vi, chủ động lường trước 1-2 rào cản tâm lý phổ biến khiến người đọc dễ trì hoãn/bỏ cuộc (không đủ thời gian, đã từng thử mà thất bại...) và trả lời/trấn an ngay trong nội dung, không đợi người đọc tự vượt qua.
- Giọng văn tự nhiên, như người thật đang nói chuyện, không như văn bản AI.
- Khi xây outline cấp 2 (bước outline2): phần đầu tiên NGAY SAU Mở đầu phải cho người đọc 1 kết quả nhỏ làm được NGAY (early win) — không dồn hết giá trị về các phần cuối, để người đọc thấy hiệu quả sớm và có động lực đi tiếp.
- Output tiếng Việt, gọi người dùng là "bạn".`;

async function callClaude({ apiKey, system, userContent, tool, maxTokens }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90000);
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
  if (data.stop_reason === 'max_tokens') throw new Error('AI trả lời quá dài bị cắt giữa chừng — thử lại giúp mình.');
  const toolUse = (data.content || []).find((b) => b.type === 'tool_use');
  if (!toolUse) throw new Error('Không nhận được kết quả có cấu trúc từ AI.');
  return toolUse.input;
}

function ideaBlock(idea) {
  return `SẢN PHẨM: ${idea.ten_san_pham}\nĐỐI TƯỢNG: ${idea.doi_tuong}\nĐỊNH DẠNG: ${idea.dinh_dang}\nĐỘ DÀI: ${idea.do_dai_uoc_luong}`;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const user = await requireUser(req);
  if (!user) { res.status(401).json({ error: 'Bạn cần đăng nhập để dùng tính năng này.' }); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'Server chưa được cấu hình ANTHROPIC_API_KEY.' }); return; }

  const { step, idea, outlineCap1, taiLieuKinhNghiem, outlineCap2, phan, nghienCuu, giongVan, noiDungDaViet, materialPath, phanTruoc, phanSau, noiDungTheoPhan } = req.body || {};
  const actionKey = `xay-dung-noi-dung-${step}`;

  const quotaError = await checkAndConsumeTrialQuota(user.id, actionKey);
  if (quotaError) { res.status(402).json({ error: quotaError, quotaExceeded: true }); return; }

  try {
    if (step === 'outline2') {
      if (!idea || !Array.isArray(outlineCap1)) { res.status(400).json({ error: 'Thiếu thông tin sản phẩm/outline cấp 1.' }); return; }
      const outlineText = `${ideaBlock(idea)}\n\nOUTLINE CẤP 1 (mở rộng đúng theo thứ tự này):\n${outlineCap1.map((p, i) => `${i + 1}. ${p}`).join('\n')}\n\n${taiLieuKinhNghiem ? `TÀI LIỆU/KINH NGHIỆM ĐÃ CÓ:\n${taiLieuKinhNghiem}\n\n` : 'Người dùng CHƯA có tài liệu/kinh nghiệm trực tiếp đã làm sẵn cho chủ đề này.\n\n'}Hãy mở rộng thành outline cấp 2 theo đúng schema.`;
      const materialUrl = await signMaterialUrl(user.id, materialPath);
      const userContent = materialUrl
        ? [{ type: 'document', source: { type: 'url', url: materialUrl } }, { type: 'text', text: `${outlineText}\n\nCó tài liệu gốc đính kèm — outline cấp 2 phải phản ánh đúng cấu trúc/nội dung thật trong tài liệu đó, không bịa thêm ngoài phạm vi tài liệu + thông tin đã cho.` }]
        : outlineText;
      const result = await callClaude({ apiKey, system: SYSTEM_PROMPT, userContent, tool: TOOL_OUTLINE2 });
      res.status(200).json({ result });
      return;
    }

    if (step === 'nghien-cuu') {
      if (!idea || !phan) { res.status(400).json({ error: 'Thiếu thông tin phần cần nghiên cứu.' }); return; }
      const userContent = `${ideaBlock(idea)}\n\nPHẦN CẦN NGHIÊN CỨU NỀN TẢNG: ${phan.tieu_de}\nKẾT QUẢ CỤ THỂ CẦN ĐẠT: ${phan.ket_qua_cu_the}\nNỘI DUNG CON: ${(phan.noi_dung_con || []).join('; ')}\n\nHãy tổng hợp kiến thức nền cho đúng phần này.`;
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
      const vietText = `${ideaBlock(idea)}\nGIỌNG VĂN MONG MUỐN: ${giongVan || '(chưa nêu rõ — chọn giọng gần gũi, thẳng thắn, phù hợp đối tượng)'}\n${contextLines ? `${contextLines}\n` : ''}\nPHẦN CẦN VIẾT: ${phan.tieu_de}\nKẾT QUẢ CỤ THỂ CẦN ĐẠT: ${phan.ket_qua_cu_the}\nNỘI DUNG CON: ${(phan.noi_dung_con || []).join('; ')}\nBÀI TẬP GỢI Ý: ${phan.bai_tap || ''}\n\nNGUYÊN LIỆU NGHIÊN CỨU NỀN TẢNG:\nKiến thức nền: ${(nghienCuu.kien_thuc_nen || []).join(' | ')}\nSai lầm phổ biến: ${(nghienCuu.sai_lam_pho_bien || []).join(' | ')}\nHướng ví dụ: ${(nghienCuu.huong_vi_du || []).join(' | ')}\nRào cản tâm lý: ${(nghienCuu.rao_can_tam_ly || []).join(' | ')}\n\nHãy viết nội dung đầy đủ cho phần này.`;
      const materialUrl = await signMaterialUrl(user.id, materialPath);
      const userContent = materialUrl
        ? [{ type: 'document', source: { type: 'url', url: materialUrl } }, { type: 'text', text: `${vietText}\n\nCó tài liệu gốc đính kèm — ưu tiên bám sát nội dung/quan điểm/ví dụ THẬT trong tài liệu đó khi viết phần này, không viết chung chung như thể chưa có tài liệu.` }]
        : vietText;
      const result = await callClaude({ apiKey, system: SYSTEM_PROMPT, userContent, tool: TOOL_VIET, maxTokens: 6000 });
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
    await refundTrialQuota(user.id, actionKey);
    res.status(500).json({ error: err.message || 'Có lỗi xảy ra khi xây dựng nội dung.' });
  }
};
