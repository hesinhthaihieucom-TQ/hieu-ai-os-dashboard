// Serverless function — cập nhật LẠI CHỈ MỤC cau_chuyen_ca_nhan trong kết quả Định Vị đã chốt, khi
// AI đánh giá câu chuyện gốc "qua sơ sài" và người dùng vừa trả lời thêm mấy câu làm rõ. Tách riêng
// khỏi việc chạy lại toàn bộ Lượt 1 (api/dinh-vi.js, 8 lượt, bắt đi lại cả 18 câu hỏi) — người dùng
// chỉ cần bổ sung đúng phần câu chuyện bị thiếu, không cần đụng vào phần còn lại của định vị đã chốt
// (trục nội dung, giọng điệu, dấu ấn hình ảnh...), tốn ít lượt hơn hẳn (2026-08-20, theo phản hồi
// chị Quỳnh: "cho người ta làm lại đúng cái câu chuyện của người ta thôi").
const { requireUser } = require('./_lib/auth');
const { checkAndConsumeTrialQuota, refundTrialQuota } = require('./_lib/trial-quota');

const SYSTEM_PROMPT = `Bạn là ĐỊNH VỊ AI — chuyên tổng hợp câu chuyện cá nhân thật cho định vị thương hiệu cá nhân tại Việt Nam.

NGUYÊN TẮC BẮT BUỘC:
- Tổng hợp 1 câu chuyện/trải nghiệm cá nhân THẬT của người dùng, DỰA HOÀN TOÀN vào dữ liệu họ cung cấp (câu trả lời gốc + câu trả lời bổ sung vừa làm rõ) — TUYỆT ĐỐI không tự bịa chi tiết không có trong dữ liệu, thà để câu chuyện ngắn còn hơn thêm chi tiết không ai xác nhận.
- Ưu tiên đưa vào đúng các chi tiết cụ thể vừa được bổ sung (mốc thời gian, con số, cảm xúc, người/sự kiện liên quan, kết quả) — đây là lý do người dùng vừa trả lời thêm.
- Giọng văn: quan sát → phân tích → định vị → dẫn đường. Không dạy đời, không than thở, không kể lể sáo rỗng, không mở đầu bằng các cụm sáo rỗng kiểu "Có một giai đoạn...", "Ngày trước mình...", "Mình từng...".
- Câu chuyện viết liền mạch như đang kể chuyện thật, TỐI ĐA 2-3 ý cốt lõi — mỗi ý 1 câu ngắn rồi xuống dòng thật sang ý tiếp theo (giống đang gõ Enter), không dồn thành khối văn dài dính liền. Bọc 1-2 cụm từ khoá quan trọng nhất trong dấu **...**.
- Nếu bổ sung xong dữ liệu VẪN còn quá mỏng để tổng hợp câu chuyện cụ thể, đặt qua_so_sai=true và đưa ra tiếp 5 câu hỏi làm rõ MỚI (không lặp lại y hệt câu đã hỏi lần trước) — vẫn cứ tổng hợp 1 bản nháp từ những gì có, không để trống hoàn toàn. Nếu đã đủ cụ thể, đặt qua_so_sai=false và để cau_hoi_lam_ro là mảng rỗng.
- Output tiếng Việt.`;

const TOOL_CAU_CHUYEN = {
  name: 'cap_nhat_cau_chuyen_ca_nhan',
  description: 'Cập nhật lại câu chuyện cá nhân dựa trên dữ liệu bổ sung.',
  input_schema: {
    type: 'object',
    properties: {
      cau_chuyen: { type: 'string', description: 'Câu chuyện tổng hợp, viết liền mạch như đang kể chuyện thật, dùng đúng chi tiết đã cho (kể cả phần vừa bổ sung).' },
      qua_so_sai: { type: 'boolean', description: 'true nếu dữ liệu (kể cả sau khi bổ sung) vẫn còn quá mỏng/chung chung để tổng hợp thành 1 câu chuyện cụ thể, có chi tiết thật.' },
      cau_hoi_lam_ro: {
        type: 'array', items: { type: 'string' }, minItems: 0, maxItems: 5,
        description: 'Đúng 5 câu hỏi MỚI giúp làm rõ thêm nếu qua_so_sai=true (không lặp lại câu đã hỏi lần trước), mảng rỗng nếu qua_so_sai=false.',
      },
    },
    required: ['cau_chuyen', 'qua_so_sai', 'cau_hoi_lam_ro'],
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
        max_tokens: 1200,
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

  const quotaError = await checkAndConsumeTrialQuota(user.id, 'dinh-vi-cap-nhat-cau-chuyen');
  if (quotaError) { res.status(402).json({ error: quotaError, quotaExceeded: true }); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'Server chưa được cấu hình ANTHROPIC_API_KEY.' }); return; }

  try {
    const { cau_chuyen_hien_tai, cau_hoi_lam_ro, bo_sung } = req.body || {};
    const answersList = Array.isArray(bo_sung) ? bo_sung.filter(a => a && a.tra_loi && a.tra_loi.trim()) : [];
    if (!answersList.length) { res.status(400).json({ error: 'Chưa có câu trả lời bổ sung nào.' }); return; }

    const qaBlock = answersList.map((a, i) => `${i + 1}. ${a.cau_hoi || (cau_hoi_lam_ro || [])[i] || ''}\nTrả lời: ${a.tra_loi.trim()}`).join('\n\n');

    const userContent = `CÂU CHUYỆN ĐÃ TỔNG HỢP TRƯỚC ĐÓ (đang bị đánh giá quá sơ sài, cần bổ sung):\n${cau_chuyen_hien_tai || '(chưa có)'}\n\nCÂU TRẢ LỜI BỔ SUNG CHO CÁC CÂU HỎI LÀM RÕ:\n${qaBlock}\n\nHãy tổng hợp lại câu chuyện cá nhân, dùng thêm đúng các chi tiết vừa bổ sung ở trên.`;

    const result = await callClaude({ apiKey, system: SYSTEM_PROMPT, userContent, tool: TOOL_CAU_CHUYEN });
    res.status(200).json({ result });
  } catch (err) {
    await refundTrialQuota(user.id, 'dinh-vi-cap-nhat-cau-chuyen');
    res.status(500).json({ error: err.message || 'Có lỗi xảy ra khi cập nhật câu chuyện.' });
  }
};
