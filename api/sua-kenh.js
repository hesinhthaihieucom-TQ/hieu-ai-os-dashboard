// Serverless function — SOI KÊNH AI: audit kênh thật so với định vị đã chốt.
const { requireUser } = require('./_lib/auth');

const SYSTEM_PROMPT = `Bạn là SOI KÊNH AI — trợ lý chuyên audit profile và kênh mạng xã hội, dựa trên định vị thương hiệu đã chốt.

NGUYÊN TẮC BẮT BUỘC:
- Chỉ audit dựa trên dữ liệu được cung cấp (định vị đã chốt + dữ liệu kênh thật). Không tự suy đoán định vị.
- Không khen xã giao. Chỉ ra đúng vấn đề, đúng chỗ, đúng cách sửa.
- Cụ thể đến mức đọc xong biết làm ngay — không nói chung chung.
- Chấm điểm theo độ lệch giữa kênh thật và định vị gốc — không cảm tính.
- Dữ liệu kênh ở đây là mô tả bằng chữ (không phải ảnh chụp thật), audit sẽ kém chính xác hơn so với gửi ảnh — vẫn audit hết sức, nhưng phần "hien_tai" nên bám sát đúng những gì người dùng mô tả, không bịa thêm chi tiết không có.
- Output tiếng Việt, giữ nguyên thuật ngữ tiếng Anh chuyên ngành (bio, CTA, hook, content, format...).`;

function buildUserBlock({ positioning, channel }) {
  return `ĐỊNH VỊ THƯƠNG HIỆU ĐÃ CHỐT (Lượt 1${channel && positioning.luot2 ? ' + Lượt 2' : ''}):\n${JSON.stringify(positioning.luot1, null, 2)}\n${positioning.luot2 ? `\n${JSON.stringify(positioning.luot2, null, 2)}\n` : ''}

DỮ LIỆU KÊNH THẬT NGƯỜI DÙNG CUNG CẤP:
- Nền tảng chính: ${channel.platform || '(không rõ)'}
- Bio hiện tại: ${channel.bio || '(chưa có)'}
- Mô tả ảnh đại diện: ${channel.anh_dai_dien || '(chưa mô tả)'}
- Mô tả ảnh bìa: ${channel.anh_bia || '(chưa mô tả)'}
- Profile đầy đủ (nghề nghiệp/link/highlight...): ${channel.profile_day_du || '(chưa mô tả)'}
- Mô tả 6-10 bài gần nhất (chủ đề, format, tương tác): ${channel.bai_gan_nhat || '(chưa mô tả)'}
- Nội dung/mô tả 5 bài có tương tác cao nhất: ${channel.bai_vien_top || '(chưa cung cấp)'}
- Mô tả bài ghim: ${channel.bai_ghim || '(chưa có)'}`;
}

const TOOL_AUDIT = {
  name: 'xuat_audit_kenh',
  description: 'Xuất kết quả audit 10 hạng mục kênh so với định vị đã chốt.',
  input_schema: {
    type: 'object',
    properties: {
      hang_muc: {
        type: 'array',
        description: 'Đúng 10 hạng mục: HM1 Ảnh đại diện, HM2 Ảnh bìa, HM3 Profile đầy đủ, HM4 Bio, HM5 Bài ghim, HM6 Kiểu thể hiện & dấu ấn, HM7 Trục nội dung, HM8 Hook & mở đầu, HM9 Giọng điệu & ngôn ngữ, HM10 CTA & chuyển đổi.',
        minItems: 10,
        maxItems: 10,
        items: {
          type: 'object',
          properties: {
            ma: { type: 'string', description: 'Ví dụ: HM1' },
            ten: { type: 'string' },
            diem: { type: 'integer', minimum: 0, maximum: 10 },
            hien_tai: { type: 'string', description: 'Đang thể hiện thế nào, chỉ đúng chỗ.' },
            lech_dinh_vi: { type: 'string', description: 'Lệch định vị ở điểm nào.' },
            can_sua: { type: 'string', description: 'Cần sửa gì, sửa như thế nào — cụ thể, dùng ngay được.' },
            viet_lai: { type: 'string', description: 'Bản viết lại/đề xuất cụ thể (bio mẫu, mô tả ảnh mới, hook mẫu... tuỳ hạng mục).' },
            uu_tien: { type: 'string', enum: ['do','vang','xanh'], description: 'do=sửa ngay, vang=sửa sớm, xanh=cải thiện dần.' },
          },
          required: ['ma','ten','diem','hien_tai','lech_dinh_vi','can_sua','viet_lai','uu_tien'],
        },
      },
      tong_diem: { type: 'integer', description: 'Tổng điểm /100.' },
      top_diem_manh: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 3 },
      top_diem_nghen: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 3 },
      thu_tu_uu_tien: { type: 'array', items: { type: 'string' }, description: 'Thứ tự nên sửa trước — theo tên hạng mục.' },
    },
    required: ['hang_muc','tong_diem','top_diem_manh','top_diem_nghen','thu_tu_uu_tien'],
  },
};

async function callClaude({ apiKey, system, userContent, tool }) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 8000,
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
    const { positioning, channel } = req.body || {};
    if (!positioning || !positioning.luot1) { res.status(400).json({ error: 'Cần có kết quả Định Vị trước khi Sửa Kênh.' }); return; }
    const userContent = `${buildUserBlock({ positioning, channel: channel || {} })}\n\nHãy audit đủ 10 hạng mục theo đúng khuôn.`;
    const result = await callClaude({ apiKey, system: SYSTEM_PROMPT, userContent, tool: TOOL_AUDIT });
    res.status(200).json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Có lỗi xảy ra khi audit kênh.' });
  }
};
