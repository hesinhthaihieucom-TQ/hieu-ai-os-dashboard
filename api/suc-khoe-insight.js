// Insight Overlay "Xanh trong Đỏ" (2026-09-05, xem kho-tai-lieu/triet-ly-tinh-khi-than-app-suc-khoe.md
// — chị Quỳnh: "áp dụng chung với nhau") — người dùng mô tả 1 biến cố khó khăn (Đỏ), AI phản hồi 1
// đoạn ngắn xác nhận cảm xúc + chỉ ra "năng lượng Xanh" (bài học/sự dịch chuyển) ẩn bên trong, giúp
// chuyển góc nhìn từ oán trách sang biết ơn — KHÔNG phải trị liệu tâm lý, chỉ 1 lượt phản hồi đơn,
// không lưu lịch sử hội thoại. Chỉ cho user ĐÃ được gán gói (sk_package_id, giống điều kiện nhận
// bản tin sức khỏe mỗi ngày ở api/cron/send-reminders.js) — tránh tài khoản mới đăng ký chưa mua gì
// dùng miễn phí tính năng AI.
const { requireUser } = require('./_lib/auth');
const { checkAndConsumeSkAiQuota, refundSkAiQuota } = require('./_lib/suc-khoe-ai-quota');

const SUPABASE_URL = 'https://ltcjlnvceuspnwldsbgi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_j0ohsTIc7Df5_dz5vDiniA_nB5jPYWy';

const SYSTEM_PROMPT = `Bạn là một người bạn đồng hành tâm thức, giúp người dùng nhìn thấy "năng lượng Xanh" (bài học/sự dịch chuyển tích cực) ẩn bên trong mọi "biến cố Đỏ" (khó khăn, khủng hoảng) họ đang trải qua — KHÔNG phủ nhận hay xem nhẹ nỗi đau, mà giúp họ chuyển góc nhìn từ oán trách/nạn nhân sang biết ơn bài học thực chứng.

Người dùng sẽ mô tả 1 tình huống khó khăn đang gặp. Viết đúng 1 đoạn văn liền mạch (không gạch đầu dòng, không tiêu đề), khoảng 80-120 từ, theo cấu trúc:
1. Xác nhận ngắn (1 câu) rằng cảm xúc/khó khăn của họ là thật và hợp lý — TUYỆT ĐỐI không nói kiểu "nhìn theo hướng tích cực đi" phủ nhận cảm xúc.
2. Chỉ ra 1 năng lượng Xanh CỤ THỂ, gắn sát với chính tình huống họ vừa kể — điều gì đang được giải phóng/mở ra/dịch chuyển nhờ biến cố này. Không sáo rỗng, không chung chung kiểu "mọi khó khăn đều có bài học".
3. Kết bằng 1 câu hỏi nhẹ nhàng mời họ tự chọn lại phản ứng của mình — không ra lệnh phải làm gì.

Giọng văn: ấm áp, chân thành, tiếng Việt tự nhiên đời thường. Nếu nội dung người dùng mô tả có dấu hiệu nguy hiểm tới tính mạng (tự hại, bạo lực...), thay vào đó khuyên họ tìm ngay người thân/chuyên gia hỗ trợ, không thực hiện bước 1-3 ở trên.`;

const TOOL_INSIGHT = {
  name: 'xuat_insight_xanh_trong_do',
  description: 'Xuất 1 đoạn insight "năng lượng Xanh" cho biến cố người dùng vừa mô tả.',
  input_schema: {
    type: 'object',
    properties: { insight: { type: 'string' } },
    required: ['insight'],
  },
};

async function callClaude({ apiKey, bienCo }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);
  let resp;
  try {
    resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 500,
        system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: `BIẾN CỐ NGƯỜI DÙNG ĐANG GẶP:\n${bienCo}` }],
        tools: [TOOL_INSIGHT],
        tool_choice: { type: 'tool', name: TOOL_INSIGHT.name },
      }),
      signal: controller.signal,
    });
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('AI phản hồi quá lâu — thử lại giúp mình.');
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

async function supabaseAsUser(token, path) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    return await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '') : null;

  const user = await requireUser(req);
  if (!user || !token) { res.status(401).json({ error: 'Bạn cần đăng nhập để dùng tính năng này.' }); return; }

  const profResp = await supabaseAsUser(token, `profiles?id=eq.${user.id}&select=sk_package_id,role`);
  const profRows = profResp.ok ? await profResp.json() : [];
  const profile = profRows[0];
  const isActive = profile && (profile.role === 'admin' || profile.sk_package_id);
  if (!isActive) {
    res.status(402).json({ error: 'Bạn chưa được gán gói sản phẩm/chương trình — liên hệ để được kích hoạt trước khi dùng tính năng này.' });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'Server chưa được cấu hình ANTHROPIC_API_KEY.' }); return; }

  let quotaConsumed = false;
  try {
    const { bien_co } = req.body || {};
    if (!bien_co || !bien_co.trim()) { res.status(400).json({ error: 'Hãy mô tả tình huống bạn đang gặp trước đã.' }); return; }
    if (bien_co.trim().length > 2000) { res.status(400).json({ error: 'Mô tả đang quá dài — rút gọn lại giúp mình (dưới 2000 ký tự).' }); return; }

    const quotaBlockMsg = await checkAndConsumeSkAiQuota(user.id, 'sk-insight-xanh-trong-do');
    if (quotaBlockMsg) { res.status(402).json({ error: quotaBlockMsg }); return; }
    quotaConsumed = true;

    const result = await callClaude({ apiKey, bienCo: bien_co.trim() });
    res.status(200).json(result);
  } catch (err) {
    if (quotaConsumed) await refundSkAiQuota(user.id, 'sk-insight-xanh-trong-do');
    res.status(500).json({ error: err.message || 'Có lỗi xảy ra khi tìm insight.' });
  }
};
