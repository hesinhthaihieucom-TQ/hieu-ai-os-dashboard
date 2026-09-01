// Nhánh A của "Tìm Sản Phẩm Phù Hợp" (san-pham-so/) — người dùng ĐÃ có sẵn tài liệu/kiến thức (file
// PDF upload qua api/san-pham-so-upload-material-url.js), AI đọc THẲNG nội dung tài liệu (Claude hỗ
// trợ đọc PDF qua content block "document", xem docs.claude.com/build-with-claude/pdf-support) thay
// vì suy từ 11 câu trả lời ngắn như luồng wizard gốc (api/tim-san-pham-phu-hop.js). Dùng LẠI đúng
// TOOL_TIM_SAN_PHAM (cùng schema, cùng shape kết quả) để tái dùng nguyên màn kết quả/sửa/chọn phương
// án ở san-pham-so/js/tim-san-pham.js — không cần dựng UI kết quả riêng.

const { requireUser } = require('./_lib/auth');
const { checkAndConsumeTrialQuota, refundTrialQuota } = require('./_lib/trial-quota');
const { TOOL_TIM_SAN_PHAM } = require('./_lib/tim-san-pham-schema');
const { SUPABASE_URL } = require('./_lib/supabase-admin');

const SYSTEM_PROMPT = `Bạn là chuyên gia tìm sản phẩm số phù hợp — người dùng ĐÃ có sẵn 1 tài liệu/ghi chú/kiến thức (file PDF đính kèm), nhiệm vụ của bạn là ĐỌC KỸ tài liệu đó và đề xuất 2-3 phương án sản phẩm số cụ thể dựa trên đúng nội dung tài liệu, kết hợp với thông tin bổ sung người dùng cung cấp (ngành, đối tượng, định dạng/giá mong muốn nếu có).

NGUYÊN TẮC BẮT BUỘC:
- Dựa sát vào nội dung THẬT trong tài liệu — không bịa thêm kiến thức/số liệu không có trong tài liệu.
- ĐỐI TƯỢNG trong mọi phương án phải cụ thể (tuổi/hoàn cảnh/giới tính nếu có) — ưu tiên đúng đối tượng người dùng đã nêu, tuyệt đối không viết "mọi người" hay chung chung.
- Vì đã có sẵn tài liệu (tín hiệu mạnh), chỉ đánh giá du_lieu_du_manh=false khi tài liệu quá ngắn/không đủ nội dung để rút ra sản phẩm cụ thể nào.
- Nếu người dùng đã nêu định dạng/giá mong muốn, ưu tiên bám theo — nhưng có thể đề xuất định dạng khác kèm giải thích ngắn nếu nội dung tài liệu hợp với định dạng đó hơn.
- Tên sản phẩm phải áp đúng 1 trong 4 công thức đặt tên đã định nghĩa trong schema, chọn công thức khớp với định dạng đề xuất.
- Mỗi phương án phải khác nhau THẬT SỰ (khác định dạng hoặc khác góc tiếp cận), không phải 3 cách diễn đạt của cùng 1 ý.
- Output tiếng Việt, gọi người dùng là "bạn".`;

async function callClaude({ apiKey, system, userContent, tool }) {
  const controller = new AbortController();
  // Sonnet 5 hỗ trợ tới 128.000 token output trên Messages API đồng bộ — 8000 từng bị cắt giữa
  // chừng (báo lỗi thật, Quỳnh gặp 2026-09-01), nâng lên 16000 + timeout tương ứng, không tốn thêm
  // phí nếu output không dùng hết. Vercel cho phép hàm chạy tới 300s.
  const timer = setTimeout(() => controller.abort(), 250000);
  let resp;
  try {
    resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 16000,
        system,
        messages: [{ role: 'user', content: userContent }],
        tools: [tool],
        tool_choice: { type: 'tool', name: tool.name },
      }),
      signal: controller.signal,
    });
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('AI phản hồi quá lâu (quá 250 giây) — có thể đang quá tải, thử lại giúp mình.');
    throw e;
  } finally {
    clearTimeout(timer);
  }
  if (!resp.ok) throw new Error(`Anthropic API lỗi (${resp.status}): ${await resp.text()}`);
  const data = await resp.json();
  if (data.stop_reason === 'max_tokens') throw new Error('AI trả lời quá dài bị cắt giữa chừng — thử lại giúp mình.');
  const toolUse = (data.content || []).find((b) => b.type === 'tool_use');
  if (!toolUse) throw new Error('Không nhận được kết quả có cấu trúc từ AI.');
  if (!Array.isArray(toolUse.input.phuong_an)) throw new Error('AI trả về kết quả không đúng định dạng — thử lại giúp mình.');
  return toolUse.input;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const user = await requireUser(req);
  if (!user) { res.status(401).json({ error: 'Bạn cần đăng nhập để dùng tính năng này.' }); return; }

  const quotaError = await checkAndConsumeTrialQuota(user.id, 'tim-san-pham-tu-tai-lieu');
  if (quotaError) { res.status(402).json({ error: quotaError, quotaExceeded: true }); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'Server chưa được cấu hình ANTHROPIC_API_KEY.' }); return; }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) { res.status(500).json({ error: 'Server chưa cấu hình SUPABASE_SERVICE_ROLE_KEY.' }); return; }

  try {
    const { materialPath, nganh, doiTuong, dinhDangMongMuon, giaMongMuon } = req.body || {};
    if (!materialPath || !nganh || !doiTuong) { res.status(400).json({ error: 'Thiếu tài liệu, ngành, hoặc đối tượng.' }); return; }
    // Xác nhận đúng path thuộc về chính user này (path luôn bắt đầu bằng "materials/{user.id}-") —
    // tránh 1 user dùng path tài liệu của người khác để đọc trộm nội dung qua endpoint này.
    if (!materialPath.startsWith(`materials/${user.id}-`)) { res.status(403).json({ error: 'Tài liệu không hợp lệ.' }); return; }

    const signResp = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/digital-products/${materialPath}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({ expiresIn: 600 }),
    });
    if (!signResp.ok) throw new Error('Không đọc được tài liệu đã tải lên — thử tải lại file.');
    const signData = await signResp.json();
    const materialUrl = `${SUPABASE_URL}/storage/v1${signData.signedURL}`;

    const infoLines = [
      `NGÀNH/LĨNH VỰC: ${nganh}`,
      `ĐỐI TƯỢNG CỤ THỂ: ${doiTuong}`,
      dinhDangMongMuon ? `ĐỊNH DẠNG MONG MUỐN: ${dinhDangMongMuon}` : null,
      giaMongMuon ? `GIÁ MONG MUỐN: ${giaMongMuon}` : null,
    ].filter(Boolean);
    const userContent = [
      { type: 'document', source: { type: 'url', url: materialUrl } },
      { type: 'text', text: `THÔNG TIN BỔ SUNG:\n${infoLines.join('\n')}\n\nHãy đọc kỹ tài liệu đính kèm và đề xuất kết quả theo đúng schema.` },
    ];

    const result = await callClaude({ apiKey, system: SYSTEM_PROMPT, userContent, tool: TOOL_TIM_SAN_PHAM });
    res.status(200).json({ result });
  } catch (err) {
    await refundTrialQuota(user.id, 'tim-san-pham-tu-tai-lieu');
    res.status(500).json({ error: err.message || 'Có lỗi xảy ra khi đọc tài liệu.' });
  }
};
