// Serverless function — tự phân loại 1 case study (Kho Case Study, tro-ly-crm/js/case-study.js) vào
// đúng 1 nhóm khi người dùng KHÔNG tự chọn nhóm lúc lưu (chị Quỳnh chốt 2026-08-30: "case study cho
// người dùng tự thêm, AI sẽ phân loại đó là case về lĩnh vực gì nếu người dùng không tự thêm").
// Cùng gate crm_has_paid/crm_access_until như api/crm-tuvan.js. KHÔNG tính vào lượt AI có trần
// (2026-08-30, chị Quỳnh yêu cầu tính lại chi phí thật) — chi phí thật ~40đ/lượt (chỉ đọc text
// ngắn), giống các hành động "phân loại" bên Xây Nhân Hiệu (VD phan-loai-hook.js) cũng không tính
// lượt — xem api/_lib/crm-ai-quota.js.
const { requireUser } = require('./_lib/auth');

const SUPABASE_URL = 'https://ltcjlnvceuspnwldsbgi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_j0ohsTIc7Df5_dz5vDiniA_nB5jPYWy';

// PHẢI khớp đúng key trong NHOM_OPTIONS (tro-ly-crm/js/case-study.js) và caseNhom của các nhóm
// trong NHANH_GUIDES (tro-ly-crm/js/tu-van.js) — sai khớp thì bước "gửi case tương tự" không tìm
// thấy case dù đã lưu.
const NHOM_OPTIONS = {
  'giam-mo': 'Giảm cân / giảm mỡ — case về giảm cân, giảm mỡ bụng, số đo cơ thể, vóc dáng.',
  'suc-khoe-khac': 'Vấn đề sức khỏe khác — case về mất ngủ, tiêu hoá, miễn dịch, năng lượng, các vấn đề sức khỏe không liên quan cân nặng.',
  'khac': 'Khác — không rõ ràng thuộc 2 nhóm trên, hoặc về kinh doanh/thu nhập/đối tác.',
};

const SYSTEM_PROMPT = `Bạn phân loại 1 case study (câu chuyện khách hàng cũ) trong lĩnh vực chăm sóc sức khỏe & kinh doanh tại Việt Nam vào ĐÚNG 1 trong các nhóm sau:
${Object.keys(NHOM_OPTIONS).map(k => `- ${k}: ${NHOM_OPTIONS[k]}`).join('\n')}

Đọc nội dung case, chọn ĐÚNG 1 nhóm phù hợp nhất. Nếu case nhắc cả cân nặng lẫn vấn đề sức khỏe khác, ưu tiên nhóm nào được nhắc RÕ VÀ NHIỀU HƠN.`;

const TOOL_PHAN_LOAI = {
  name: 'xuat_phan_loai_case_study',
  description: 'Xuất đúng 1 nhóm phù hợp nhất cho case study.',
  input_schema: {
    type: 'object',
    properties: { nhom: { type: 'string', enum: Object.keys(NHOM_OPTIONS) } },
    required: ['nhom'],
  },
};

async function callClaude({ apiKey, noiDung }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);
  let resp;
  try {
    resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 200,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: `NỘI DUNG CASE STUDY:\n${noiDung}` }],
        tools: [TOOL_PHAN_LOAI],
        tool_choice: { type: 'tool', name: TOOL_PHAN_LOAI.name },
      }),
      signal: controller.signal,
    });
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('AI phản hồi quá lâu — thử lại giúp mình, hoặc tự chọn nhóm.');
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

  const profResp = await supabaseAsUser(token, `profiles?id=eq.${user.id}&select=crm_has_paid,crm_access_until`);
  const profRows = profResp.ok ? await profResp.json() : [];
  const profile = profRows[0];
  const isActive = profile && profile.crm_has_paid && profile.crm_access_until && new Date(profile.crm_access_until).getTime() > Date.now();
  if (!isActive) {
    res.status(402).json({ error: 'Gói của bạn chưa kích hoạt hoặc đã hết hạn — vào mục "Nâng Cấp" để tiếp tục dùng.', needsUpgrade: true });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'Server chưa được cấu hình ANTHROPIC_API_KEY.' }); return; }

  let quotaConsumed = false;
  try {
    const { noi_dung } = req.body || {};
    if (!noi_dung || !noi_dung.trim()) { res.status(400).json({ error: 'Thiếu nội dung case study để phân loại.' }); return; }

    const quotaBlockMsg = await checkAndConsumeCrmAiQuota(user.id, 'case-study-classify');
    if (quotaBlockMsg) { res.status(402).json({ error: quotaBlockMsg }); return; }
    quotaConsumed = true;

    const result = await callClaude({ apiKey, noiDung: noi_dung.trim() });
    res.status(200).json(result);
  } catch (err) {
    if (quotaConsumed) await refundCrmAiQuota(user.id, 'case-study-classify');
    res.status(500).json({ error: err.message || 'Có lỗi xảy ra khi phân loại case study.' });
  }
};
