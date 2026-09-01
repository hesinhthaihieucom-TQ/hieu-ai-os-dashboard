// Sản Phẩm Số — AI lập kế hoạch ra mắt cho 1 sản phẩm cụ thể, chia theo mốc thời gian (trước/trong/
// sau ngày ra mắt). Thay mục sidebar cũ "Nghiên Cứu Thị Trường & Giá/Marketing" — phần hữu ích nhất
// của mục đó đã có ở nơi khác (nghiên cứu thị trường nhúng vào bước viết nội dung khi bật tìm web;
// giá/marketing đã có gợi ý giá + nút viết mô tả/caption ở "Sản phẩm của tôi") — đây là phần THẬT SỰ
// còn thiếu: người bán 1 mình cần biết CHÍNH XÁC nên làm gì, khi nào.

const { requireUser } = require('./_lib/auth');
const { checkAndConsumeTrialQuota, refundTrialQuota } = require('./_lib/trial-quota');

const TOOL_KE_HOACH_RA_MAT = {
  name: 'xuat_ke_hoach_ra_mat',
  description: 'Lập kế hoạch ra mắt 1 sản phẩm số cụ thể, chia theo mốc thời gian.',
  input_schema: {
    type: 'object',
    properties: {
      giai_doan: {
        type: 'array',
        minItems: 3, maxItems: 5,
        description: 'Các mốc thời gian theo đúng trình tự: trước ra mắt -> ngày ra mắt -> sau ra mắt.',
        items: {
          type: 'object',
          properties: {
            ten_giai_doan: { type: 'string', description: 'Tên mốc thời gian, VD "7 ngày trước ra mắt", "Ngày ra mắt", "1 tuần sau ra mắt".' },
            hanh_dong: {
              type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 5,
              description: 'Các việc cụ thể cần làm trong mốc này, làm được ngay không cần giải thích thêm — nếu việc đó là viết mô tả/caption quảng cáo thì nhắc dùng đúng nút có sẵn ở màn "Sản phẩm của tôi", không hướng dẫn viết tay từ đầu.',
            },
          },
          required: ['ten_giai_doan', 'hanh_dong'],
        },
      },
    },
    required: ['giai_doan'],
  },
};

const SYSTEM_PROMPT = `Bạn là chuyên gia ra mắt sản phẩm số — lập kế hoạch ra mắt cụ thể, làm được ngay, cho MỘT NGƯỜI BÁN TỰ LÀM MỘT MÌNH (không có team marketing, không có ngân sách quảng cáo).

NGUYÊN TẮC BẮT BUỘC:
- Chỉ dùng kênh cá nhân sẵn có (Zalo cá nhân/nhóm, Facebook cá nhân/nhóm, bạn bè người quen) — không đề xuất chạy ads, thuê KOL, hay bất kỳ việc cần ngân sách/team.
- Mỗi hành động phải cụ thể, làm được ngay trong ngày, không mô tả lý thuyết chung chung.
- Không bịa số liệu/kết quả kỳ vọng (VD không nói "sẽ có 100 người mua") — chỉ đề xuất hành động, không cam kết kết quả.
- Output tiếng Việt, gọi người dùng là "bạn".`;

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const user = await requireUser(req);
  if (!user) { res.status(401).json({ error: 'Bạn cần đăng nhập để dùng tính năng này.' }); return; }

  const quotaError = await checkAndConsumeTrialQuota(user.id, 'san-pham-so-ke-hoach-ra-mat');
  if (quotaError) { res.status(402).json({ error: quotaError, quotaExceeded: true }); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'Server chưa được cấu hình ANTHROPIC_API_KEY.' }); return; }

  try {
    const { title, description, price } = req.body || {};
    if (!title || !String(title).trim()) { res.status(400).json({ error: 'Thiếu tên sản phẩm.' }); return; }

    const userContent = `TÊN SẢN PHẨM: ${title}\n${description ? `MÔ TẢ: ${description}\n` : ''}${price ? `GIÁ BÁN: ${Number(price).toLocaleString('vi-VN')}đ\n` : ''}\nHãy lập kế hoạch ra mắt theo đúng schema.`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 90000);
    let resp;
    try {
      resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-5',
          max_tokens: 3000,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userContent }],
          tools: [TOOL_KE_HOACH_RA_MAT],
          tool_choice: { type: 'tool', name: TOOL_KE_HOACH_RA_MAT.name },
        }),
        signal: controller.signal,
      });
    } catch (e) {
      if (e.name === 'AbortError') throw new Error('AI phản hồi quá lâu (quá 90 giây) — thử lại giúp mình.');
      throw e;
    } finally {
      clearTimeout(timer);
    }
    if (!resp.ok) throw new Error(`Anthropic API lỗi (${resp.status}): ${await resp.text()}`);
    const data = await resp.json();
    if (data.stop_reason === 'max_tokens') throw new Error('AI trả lời quá dài bị cắt giữa chừng — thử lại giúp mình.');
    const toolUse = (data.content || []).find((b) => b.type === 'tool_use');
    if (!toolUse || !Array.isArray(toolUse.input.giai_doan)) throw new Error('Không nhận được kết quả có cấu trúc từ AI.');

    res.status(200).json({ result: toolUse.input });
  } catch (err) {
    await refundTrialQuota(user.id, 'san-pham-so-ke-hoach-ra-mat');
    res.status(500).json({ error: err.message || 'Có lỗi xảy ra khi lập kế hoạch ra mắt.' });
  }
};
