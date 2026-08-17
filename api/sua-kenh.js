// Serverless function — SOI KÊNH AI: audit hình ảnh/profile kênh thật so với định vị đã chốt.
// Chỉ còn 5 hạng mục hình ảnh (HM1-HM5) — phần nội dung/trục/hook đã tách sang các module khác.
const { requireUser } = require('./_lib/auth');

const SYSTEM_PROMPT = `Bạn là SOI KÊNH AI — trợ lý chuyên audit HÌNH ẢNH/PROFILE kênh mạng xã hội, dựa trên định vị thương hiệu đã chốt.

NGUYÊN TẮC BẮT BUỘC:
- Chỉ audit dựa trên dữ liệu được cung cấp (định vị đã chốt + ảnh chụp màn hình kênh thật). Không tự suy đoán định vị.
- Nếu có ảnh đính kèm, hãy QUAN SÁT KỸ ảnh thật (màu sắc, bố cục, biểu cảm, nội dung chữ trên ảnh...) — không bịa chi tiết không thấy trong ảnh.
- Không khen xã giao. Chỉ ra đúng vấn đề, đúng chỗ, đúng cách sửa.
- Cụ thể đến mức đọc xong biết làm ngay — không nói chung chung.
- Chấm điểm theo độ lệch giữa kênh thật và định vị gốc — không cảm tính.
- Output tiếng Việt, giữ nguyên thuật ngữ tiếng Anh chuyên ngành (bio, CTA, profile, cover...).`;

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
            diem: { type: 'integer', minimum: 0, maximum: 10 },
            hien_tai: { type: 'string', description: 'Đang thể hiện thế nào, chỉ đúng chỗ — dựa trên ảnh/thông tin thật được cung cấp.' },
            lech_dinh_vi: { type: 'string', description: 'Lệch định vị ở điểm nào.' },
            can_sua: { type: 'string', description: 'Cần sửa gì, sửa như thế nào — cụ thể, dùng ngay được.' },
            viet_lai: { type: 'string', description: 'Bản viết lại/đề xuất cụ thể (bio mẫu, mô tả ảnh mới nên chụp thế nào...).' },
            uu_tien: { type: 'string', enum: ['do','vang','xanh'], description: 'do=sửa ngay, vang=sửa sớm, xanh=cải thiện dần.' },
          },
          required: ['ma','ten','diem','hien_tai','lech_dinh_vi','can_sua','viet_lai','uu_tien'],
        },
      },
      tong_diem: { type: 'integer', description: 'Tổng điểm /50.' },
      top_diem_manh: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 3 },
      top_diem_nghen: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 3 },
      thu_tu_uu_tien: { type: 'array', items: { type: 'string' }, description: 'Thứ tự nên sửa trước — theo tên hạng mục.' },
      goi_y_anh_bia: {
        type: 'object',
        description: 'Gợi ý 1 ảnh bìa mới phù hợp định vị, dùng để tạo trực tiếp bằng công cụ Tạo Ảnh Thương Hiệu.',
        properties: {
          tieu_de: { type: 'string', description: 'Câu tiêu đề ngắn cho ảnh bìa, bọc 1-2 từ khoá muốn nhấn trong dấu **...**.' },
          mau_nhan: { type: 'string', enum: ['yellow','pink','blue','orange','green'], description: 'Màu nhấn phù hợp bản sắc thương hiệu.' },
          ly_do: { type: 'string', description: 'Vì sao tiêu đề và màu này phù hợp định vị.' },
        },
        required: ['tieu_de','mau_nhan','ly_do'],
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
      const dataUrl = ch[key];
      if (dataUrl) {
        const block = imageBlockFromDataUrl(dataUrl);
        if (block) {
          hasAnyImage = true;
          contentBlocks.push({ type: 'text', text: `Ảnh cho ${label}:` });
          contentBlocks.push(block);
        }
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
    res.status(500).json({ error: err.message || 'Có lỗi xảy ra khi audit kênh.' });
  }
};
