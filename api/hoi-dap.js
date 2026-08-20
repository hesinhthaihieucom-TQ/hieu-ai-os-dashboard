// Serverless function — ô hỏi tự do ở mục "Hỏi & Trợ Giúp": người dùng gõ câu hỏi bất kỳ về cách
// dùng app, AI trả lời dựa trên kiến thức về app nhúng thẳng trong system prompt (không cần tra
// cứu gì thêm). Tính lượt (weight 1, rẻ nhất) — chủ yếu để tránh bị hỏi tràn lan/spam vô tội vạ vì
// đây là ô nhập tự do, không có gì chặn tự nhiên như các hành động khác cần dữ liệu đầu vào cụ thể.
const { requireUser } = require('./_lib/auth');
const { checkAndConsumeTrialQuota, refundTrialQuota } = require('./_lib/trial-quota');

const SYSTEM_PROMPT = `Bạn là trợ lý hỗ trợ người dùng app "Xây Nhân Hiệu" — công cụ AI giúp xây dựng thương hiệu cá nhân tại Việt Nam. Trả lời câu hỏi của người dùng về CÁCH DÙNG APP, ngắn gọn, rõ ràng, tiếng Việt.

CÁC MỤC TRONG APP (theo đúng thứ tự nên làm):
1. Định Vị — trả lời 18 câu hỏi để AI chốt định vị thương hiệu (giọng văn, đối tượng, câu chuyện cá nhân). BẮT BUỘC làm trước, mọi bước sau đều dựa vào kết quả này. Có thể dán kết quả định vị đã làm ở nơi khác thay vì trả lời lại từ đầu.
2. Sửa Kênh — chụp ảnh đại diện/bìa/profile/bio/bài ghim thật để AI audit có khớp định vị không, gợi ý sửa (kể cả gợi ý ảnh bìa mới dùng chính ảnh thật của người dùng).
3. Dạng Content — AI gợi ý 2-3 dạng content phù hợp nhất với trục nội dung đã định vị.
4. Kho Content — lưu bài viết mẫu (của mình và kho chung/viral do đội ngũ chọn) để tham khảo cấu trúc khi viết bài mới.
5. Kho Hook — lưu câu hook mở đầu hay, có thể tự tạo hook mới theo chủ đề, dùng làm tiêu đề ảnh thumbnail.
6. Viết Content — AI viết bài hoàn chỉnh theo giọng văn đã định vị, từ 1 ý tưởng hoặc từ 1 bài trong Kho Content (giữ nguyên hook/cấu trúc, đổi câu từ).
7. Tái Chế Content Viral — dán 1 bài đang viral, AI phân tích lý do viral rồi áp dụng cấu trúc đó cho chủ đề riêng.
8. Chấm Điểm Content / Chấm Điểm Hook — AI chấm bài viết hoặc câu hook theo khung chuẩn, chỉ ra chỗ yếu.
9. Lịch Đăng Bài — AI gợi ý lịch đăng cho cả tuần theo đúng trục nội dung.
10. Đẩy Bài & CTA Comment — gợi ý bình luận/CTA theo mốc lượt xem bài đang lên.
11. Tạo Ảnh Thương Hiệu — công cụ ghép tiêu đề lên ảnh nền, không dùng AI nên không tốn lượt.
12. Tài khoản (bấm ảnh đại diện/tên ở cuối sidebar) — đổi mật khẩu, tên hiển thị, ảnh đại diện, và bảng tự lên kế hoạch dùng lượt AI trong tháng.
13. Nâng cấp / Mua gói — xem bảng giá, quét mã QR chuyển khoản, hệ thống tự kích hoạt trong vài phút.

VỀ LƯỢT AI: mỗi hành động tốn số lượt khác nhau tuỳ độ phức tạp (rẻ nhất 1 lượt như cải thiện hook, đắt nhất Định Vị 8 lượt) — không đồng giá. Người mới đăng ký được dùng thử 100 lượt trọn đời miễn phí; khách đã trả phí có 250 lượt/tháng, hết lượt trong tháng có thể mua thêm ở mục Nâng cấp. Xem chi tiết và tự lên kế hoạch ở mục Tài khoản.

VỀ DỮ LIỆU: dữ liệu mỗi người chỉ mình họ xem được, trừ "Kho chung"/"Kho Hook Viral" là nội dung dùng chung do đội ngũ quản lý. Tiến trình đang làm dở (câu trả lời, bài đang viết, ảnh đã tải lên) tự động lưu lại khi chuyển sang trang khác, không bị mất.

Nếu câu hỏi không liên quan gì đến cách dùng app (hỏi kiến thức chung, chuyện ngoài lề...), lịch sự từ chối và nhắc đây là trợ lý chỉ hỗ trợ về app Xây Nhân Hiệu. Trả lời ngắn gọn (2-5 câu), không lan man.`;

const TOOL_ANSWER = {
  name: 'tra_loi_cau_hoi',
  description: 'Trả lời câu hỏi của người dùng về cách dùng app.',
  input_schema: {
    type: 'object',
    properties: {
      tra_loi: { type: 'string', minLength: 1, description: 'Câu trả lời, ngắn gọn, tiếng Việt.' },
    },
    required: ['tra_loi'],
  },
};

async function callClaude({ apiKey, question }) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: question }],
      tools: [TOOL_ANSWER],
      tool_choice: { type: 'tool', name: TOOL_ANSWER.name },
    }),
  });
  if (!resp.ok) throw new Error(`Anthropic API lỗi (${resp.status}): ${await resp.text()}`);
  const data = await resp.json();
  const toolUse = (data.content || []).find((b) => b.type === 'tool_use');
  if (!toolUse) throw new Error('Không nhận được câu trả lời có cấu trúc từ AI.');
  return toolUse.input;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const user = await requireUser(req);
  if (!user) { res.status(401).json({ error: 'Bạn cần đăng nhập để dùng tính năng này.' }); return; }

  const quotaError = await checkAndConsumeTrialQuota(user.id, 'hoi-dap');
  if (quotaError) { res.status(402).json({ error: quotaError, quotaExceeded: true }); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'Server chưa được cấu hình ANTHROPIC_API_KEY.' }); return; }

  try {
    const { question } = req.body || {};
    if (!question || !question.trim()) { res.status(400).json({ error: 'Thiếu câu hỏi.' }); return; }
    if (question.length > 500) { res.status(400).json({ error: 'Câu hỏi quá dài, rút gọn lại giúp mình.' }); return; }

    const result = await callClaude({ apiKey, question: question.trim() });
    res.status(200).json({ result });
  } catch (err) {
    await refundTrialQuota(user.id, 'hoi-dap');
    res.status(500).json({ error: err.message || 'Có lỗi xảy ra khi trả lời câu hỏi.' });
  }
};
