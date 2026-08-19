// Serverless function — SOI KÊNH AI: audit hình ảnh/profile kênh thật so với định vị đã chốt.
// Chỉ còn 5 hạng mục hình ảnh (HM1-HM5) — phần nội dung/trục/hook đã tách sang các module khác.
const { requireUser } = require('./_lib/auth');
const { checkAndConsumeTrialQuota, refundTrialQuota } = require('./_lib/trial-quota');

const SYSTEM_PROMPT = `Bạn là SOI KÊNH AI — trợ lý chuyên audit HÌNH ẢNH/PROFILE kênh mạng xã hội, dựa trên định vị thương hiệu đã chốt.

NGUYÊN TẮC BẮT BUỘC:
- Chỉ audit dựa trên dữ liệu được cung cấp (định vị đã chốt + ảnh chụp màn hình kênh thật). Không tự suy đoán định vị.
- Nếu có ảnh đính kèm, hãy QUAN SÁT KỸ ảnh thật (màu sắc, bố cục, biểu cảm, nội dung chữ trên ảnh...) — không bịa chi tiết không thấy trong ảnh.
- Không khen xã giao. Chỉ ra đúng vấn đề, đúng chỗ, đúng cách sửa.
- Cụ thể đến mức đọc xong biết làm ngay — không nói chung chung.
- NGẮN GỌN LÀ ƯU TIÊN — người đọc lướt trên điện thoại. Mỗi trường text chỉ 1-2 câu ngắn, đúng trọng tâm, cắt hết phần diễn giải/ví dụ phụ không cần thiết.
- Chấm điểm theo độ lệch giữa kênh thật và định vị gốc — không cảm tính.
- THANG ĐIỂM MỖI HẠNG MỤC LÀ 0-20 (KHÔNG PHẢI 0-10) — tổng 5 hạng mục = /100. Chấm theo mốc: 17-20 = khớp định vị tốt, chỉ cần tinh chỉnh nhỏ; 11-16 = còn lệch rõ, cần sửa; 4-10 = lệch nặng, sửa gấp; 0-3 = gần như chưa có/hoàn toàn lệch định vị. Tuyệt đối không chấm như đang chấm thang 10 rồi báo cáo con số đó — phải thật sự cân nhắc và chấm đúng trên thang 20 cho từng hạng mục.
- Output tiếng Việt, giữ nguyên thuật ngữ tiếng Anh chuyên ngành (bio, CTA, profile, cover...).

CÔNG THỨC VIẾT BIO (HM4 — bắt buộc áp dụng khi viết viet_lai cho hạng mục Bio):
Người lạ phải hiểu bạn trong 5-10 giây đầu tiên. Bio phải trả lời đủ, đúng thứ tự, gộp thành 1 đoạn liền mạch tự nhiên (không liệt kê rời rạc từng gạch đầu dòng):
1. AI — vai trò/hình ảnh bạn muốn được nhớ.
2. GIÚP AI — tệp người xem chính, càng cụ thể càng dễ nhớ.
3. KẾT QUẢ GÌ — điều người xem nhận được khi theo dõi bạn.
4. BẰNG GÌ — kinh nghiệm/phương pháp/góc nhìn hoặc lợi thế của bạn.
5. HÀNH ĐỘNG — follow/comment/inbox/nhận tài liệu/đăng ký... nên làm tiếp theo.
Ví dụ đúng công thức: "Tôi giúp người mới xây kênh cá nhân có định vị rõ, content nền và dòng tiền đầu tiên bằng AI + lộ trình thực hành."
Ghi nhớ nhanh: Rõ người — rõ kết quả — rõ lý do tin — rõ bước tiếp theo.`;

const TOOL_AUDIT = {
  name: 'xuat_audit_kenh',
  description: 'Xuất kết quả audit 5 hạng mục hình ảnh/profile so với định vị đã chốt, kèm gợi ý ảnh bìa.',
  input_schema: {
    type: 'object',
    properties: {
      hang_muc: {
        type: 'array',
        description: 'Đúng 5 hạng mục: HM1 Ảnh đại diện, HM2 Ảnh bìa, HM3 Profile đầy đủ, HM4 Bio, HM5 Bài ghim.',
        minItems: 5,
        maxItems: 5,
        items: {
          type: 'object',
          properties: {
            ma: { type: 'string', description: 'Ví dụ: HM1' },
            ten: { type: 'string' },
            diem: { type: 'integer', minimum: 0, maximum: 20 },
            hien_tai: { type: 'string', description: 'Đang thể hiện thế nào, chỉ đúng chỗ — dựa trên ảnh/thông tin thật được cung cấp. TỐI ĐA 1 câu ngắn.' },
            lech_dinh_vi: { type: 'string', description: 'Lệch định vị ở điểm nào. TỐI ĐA 1 câu ngắn.' },
            can_sua: { type: 'string', description: 'Cần sửa gì, sửa như thế nào — cụ thể, dùng ngay được. TỐI ĐA 1-2 câu ngắn, không lan man.' },
            viet_lai: { type: 'string', description: 'Bản viết lại/đề xuất cụ thể (mô tả ảnh mới nên chụp thế nào...) — ngắn gọn, không lan man. Riêng hạng mục Bio (HM4): bắt buộc viết theo đúng CÔNG THỨC VIẾT BIO ở trên (Ai — Giúp ai — Kết quả gì — Bằng gì — Hành động), gộp thành 1 đoạn bio hoàn chỉnh sẵn sàng copy dùng ngay, ngắn gọn tự nhiên (không quá 2-3 câu).' },
            uu_tien: { type: 'string', enum: ['do','vang','xanh'], description: 'do=sửa ngay, vang=sửa sớm, xanh=cải thiện dần.' },
          },
          required: ['ma','ten','diem','hien_tai','lech_dinh_vi','can_sua','viet_lai','uu_tien'],
        },
      },
      tong_diem: { type: 'integer', description: 'Tổng điểm /100 — bằng tổng điểm của 5 hạng mục (mỗi hạng mục /20).' },
      top_diem_manh: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 3 },
      top_diem_nghen: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 3 },
      thu_tu_uu_tien: { type: 'array', items: { type: 'string' }, description: 'Thứ tự nên sửa trước — theo tên hạng mục.' },
      goi_y_anh_bia: {
        type: 'object',
        description: 'Gợi ý 1 ảnh bìa mới phù hợp định vị, dưới dạng 1 prompt sẵn sàng dán vào công cụ tạo ảnh AI (ChatGPT/DALL-E) để tạo trực tiếp.',
        properties: {
          prompt_anh_bia: {
            type: 'string',
            description: 'Prompt đầy đủ, chi tiết, viết bằng tiếng Anh (để tương thích tốt nhất với công cụ tạo ảnh) mô tả: chủ thể/bối cảnh, tông màu chủ đạo phù hợp bản sắc thương hiệu, phong cách hình ảnh, tỉ lệ ảnh bìa Facebook 820x312px, và có ghi chú rõ nếu cần chừa khoảng trống cho chữ tiêu đề. Sẵn sàng copy-paste dùng ngay, không cần chỉnh sửa thêm.',
          },
          ly_do: { type: 'string', description: 'Vì sao concept ảnh bìa này phù hợp định vị — viết tiếng Việt. TỐI ĐA 1 câu ngắn.' },
        },
        required: ['prompt_anh_bia','ly_do'],
      },
    },
    required: ['hang_muc','tong_diem','top_diem_manh','top_diem_nghen','thu_tu_uu_tien','goi_y_anh_bia'],
  },
};

async function callClaude({ apiKey, system, contentBlocks, tool }) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 6000,
      system,
      messages: [{ role: 'user', content: contentBlocks }],
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

function imageBlockFromDataUrl(dataUrl) {
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl || '');
  if (!m) return null;
  return { type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const user = await requireUser(req);
  if (!user) { res.status(401).json({ error: 'Bạn cần đăng nhập để dùng tính năng này.' }); return; }

  const quotaError = await checkAndConsumeTrialQuota(user.id);
  if (quotaError) { res.status(402).json({ error: quotaError, quotaExceeded: true }); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'Server chưa được cấu hình ANTHROPIC_API_KEY.' }); return; }

  try {
    const { positioning, quick_context, channel } = req.body || {};
    const hasPositioning = !!(positioning && positioning.luot1);
    if (!hasPositioning && !(quick_context && quick_context.trim())) {
      res.status(400).json({ error: 'Cần có Định Vị hoặc mô tả nhanh ngành/đối tượng trước khi Sửa Kênh.' }); return;
    }

    const ch = channel || {};
    const imageFields = [
      { key: 'anh_dai_dien', label: 'HM1 — Ảnh đại diện' },
      { key: 'anh_bia', label: 'HM2 — Ảnh bìa' },
      { key: 'profile_day_du', label: 'HM3 — Profile đầy đủ (thông tin cá nhân)' },
      { key: 'bai_ghim', label: 'HM5 — Bài ghim' },
    ];

    const contextBlock = hasPositioning
      ? `ĐỊNH VỊ THƯƠNG HIỆU ĐÃ CHỐT:\n${JSON.stringify(positioning.luot1, null, 2)}\n${positioning.luot2 ? JSON.stringify(positioning.luot2, null, 2) : ''}`
      : `BỐI CẢNH NHANH (chưa làm Định Vị đầy đủ): ${quick_context.trim()}`;

    const contentBlocks = [];
    contentBlocks.push({ type: 'text', text: `${contextBlock}\n\nNền tảng chính: ${ch.platform || '(không rõ)'}\nHM4 — Bio hiện tại: ${ch.bio || '(chưa có)'}` });

    let hasAnyImage = false;
    imageFields.forEach(({ key, label }) => {
      const raw = ch[key];
      const dataUrls = Array.isArray(raw) ? raw : (raw ? [raw] : []);
      if (dataUrls.length) {
        contentBlocks.push({ type: 'text', text: `Ảnh cho ${label}${dataUrls.length > 1 ? ` (${dataUrls.length} ảnh)` : ''}:` });
        dataUrls.forEach((dataUrl) => {
          const block = imageBlockFromDataUrl(dataUrl);
          if (block) { hasAnyImage = true; contentBlocks.push(block); }
        });
      } else {
        contentBlocks.push({ type: 'text', text: `${label}: (không có ảnh)` });
      }
    });

    if (!hasAnyImage && !ch.bio) {
      res.status(400).json({ error: 'Cần ít nhất 1 ảnh hoặc bio để audit.' });
      return;
    }

    contentBlocks.push({ type: 'text', text: 'Hãy audit đủ 5 hạng mục theo đúng khuôn, dựa trên ảnh thật ở trên (nếu có).' });

    const result = await callClaude({ apiKey, system: SYSTEM_PROMPT, contentBlocks, tool: TOOL_AUDIT });
    res.status(200).json({ result });
  } catch (err) {
    await refundTrialQuota(user.id);
    res.status(500).json({ error: err.message || 'Có lỗi xảy ra khi audit kênh.' });
  }
};
