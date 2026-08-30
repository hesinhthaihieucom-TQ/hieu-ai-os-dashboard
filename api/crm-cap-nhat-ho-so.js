// Serverless function — "Cập nhật hồ sơ từ ảnh/ghi chú" (Khách Hàng, tro-ly-crm/js/khach-hang.js).
// 2026-08-30, chị Quỳnh hỏi: chụp ảnh DỮ LIỆU ĐÃ TỪNG GHI về 1 khách (ghi chú tay, form phân tích
// cũ...) để AI cập nhật hồ sơ — khác hẳn api/crm-tuvan.js (đọc ĐOẠN CHAT ĐANG DIỄN RA để tư vấn +
// gợi ý câu nhắn tiếp theo). Tách endpoint riêng vì 2 việc khác nhau:
// - Đã biết ĐÚNG customer_id (đang mở sẵn hồ sơ khách trong Khách Hàng) — không cần đọc tên/khớp
//   hồ sơ như crm-tuvan.js, tránh đúng vấn đề "tên phải trùng tài khoản MXH mới khớp được".
// - CHỈ cập nhật field hồ sơ, KHÔNG sinh "câu nên nhắn tiếp theo" (không có ý nghĩa ở đây vì không
//   phải đang tư vấn 1 đoạn chat thật) — output gọn hơn, rẻ hơn hẳn (xem CRM_AI_WEIGHTS).
// - CÓ ghi crm_interactions/lan_tuong_tac_cuoi (chị Quỳnh chốt 2026-08-30: "cập nhật từ file tính
//   là 1 lần tiếp xúc") — dữ liệu/ghi chú đang cập nhật phản ánh 1 lần tiếp xúc THẬT đã xảy ra với
//   khách (chỉ là ghi lại sau, không live ngay lúc tư vấn), nên vẫn tính vào "số lần tiếp xúc".
const { requireUser } = require('./_lib/auth');
const { checkAndConsumeCrmAiQuota, refundCrmAiQuota } = require('./_lib/crm-ai-quota');

const SUPABASE_URL = 'https://ltcjlnvceuspnwldsbgi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_j0ohsTIc7Df5_dz5vDiniA_nB5jPYWy';

const SYSTEM_PROMPT = `Bạn đọc ảnh/ghi chú chứa THÔNG TIN ĐÃ BIẾT về 1 khách hàng (không phải đoạn chat đang diễn ra) — có thể là ghi chú tay, form phân tích cũ, ảnh chụp màn hình thông tin... — để cập nhật lại hồ sơ CRM cho đúng và đầy đủ hơn.

QUAN TRỌNG: đây KHÔNG phải đang tư vấn khách — không suy đoán/bịa "câu nên nhắn tiếp theo", chỉ trích xuất đúng sự thật có trong ảnh/ghi chú vào các field hồ sơ. Field nào không có dữ liệu rõ ràng thì để trống, tuyệt đối không bịa. Nếu hồ sơ cũ đã có giá trị ở field nào mà ảnh/ghi chú lần này không nhắc tới, GIỮ NGUYÊN giá trị cũ (không xoá/ghi đè thành trống).`;

const TOOL_CAP_NHAT = {
  name: 'xuat_cap_nhat_ho_so',
  description: 'Xuất các field hồ sơ khách cần cập nhật — chỉ điền field có dữ liệu thật.',
  input_schema: {
    type: 'object',
    properties: {
      nhanh: { type: 'string', enum: ['A', 'D'], description: 'A=Sức khỏe, D=Kinh doanh/Đối tác — chỉ xuất nếu ảnh/ghi chú thể hiện rõ, không chắc thì bỏ trống.' },
      leader_phu_trach: { type: 'string' },
      kenh: { type: 'string' },
      link_lien_he: { type: 'string' },
      nhom_nhu_cau: { type: 'array', items: { type: 'string' }, description: 'Chỉ liệt kê nhóm nhu cầu MỚI — hệ thống tự cộng dồn với dữ liệu cũ.' },
      nhu_cau_cu_the: { type: 'string' },
      van_de_noi_dau: { type: 'string' },
      giai_doan: { type: 'string' },
      do_nong: { type: 'string', enum: ['Nóng', 'Ấm', 'Lạnh'] },
      rao_can: { type: 'array', items: { type: 'string' }, description: 'Chỉ liệt kê rào cản MỚI — hệ thống tự cộng dồn với dữ liệu cũ.' },
      giai_phap_phu_hop: { type: 'string' },
      hanh_dong_tiep_theo: { type: 'string' },
      gia_tri_du_kien: { type: 'string' },
      ket_qua: { type: 'string' },
      ghi_chu_ai: { type: 'string' },
      form_hd: {
        type: 'object',
        description: 'CHỈ xuất khi nhanh="D". Field chưa rõ ghi ĐÚNG NGUYÊN VĂN "Chưa có". Giữ nguyên field nào hồ sơ cũ đã có giá trị khác "Chưa có".',
        properties: {
          gia_dinh: { type: 'string' }, cong_viec: { type: 'string' }, so_thich_quan_he: { type: 'string' },
          money: { type: 'string' }, suc_khoe: { type: 'string' }, mong_muon: { type: 'string' },
        },
      },
    },
  },
};

async function callClaude({ apiKey, contentBlocks }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90000);
  let resp;
  try {
    resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: contentBlocks }],
        tools: [TOOL_CAP_NHAT],
        tool_choice: { type: 'tool', name: TOOL_CAP_NHAT.name },
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
  const toolUse = (data.content || []).find((b) => b.type === 'tool_use');
  if (!toolUse) throw new Error('Không nhận được kết quả có cấu trúc từ AI.');
  return toolUse.input;
}

function imageBlockFromDataUrl(dataUrl) {
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl || '');
  if (!m) return null;
  return { type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } };
}

async function supabaseAsUser(token, path, opts = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    return await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      ...opts,
      headers: {
        'content-type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
        Prefer: opts.prefer || 'return=representation',
        ...(opts.headers || {}),
      },
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
    const { customer_id, images, note } = req.body || {};
    const imgList = Array.isArray(images) ? images : (images ? [images] : []);
    if (!customer_id) { res.status(400).json({ error: 'Thiếu khách hàng cần cập nhật.' }); return; }
    if (!imgList.length && !(note && note.trim())) {
      res.status(400).json({ error: 'Cần ít nhất 1 ảnh hoặc mô tả để cập nhật.' });
      return;
    }

    const custResp = await supabaseAsUser(token, `crm_customers?id=eq.${customer_id}&user_id=eq.${user.id}&select=*`);
    const custRows = custResp.ok ? await custResp.json() : [];
    const customer = custRows[0];
    if (!customer) { res.status(404).json({ error: 'Không tìm thấy khách này.' }); return; }

    const quotaBlockMsg = await checkAndConsumeCrmAiQuota(user.id, 'crm-cap-nhat-ho-so');
    if (quotaBlockMsg) { res.status(402).json({ error: quotaBlockMsg }); return; }
    quotaConsumed = true;

    const contentBlocks = [];
    let contextText = `HỒ SƠ KHÁCH HIỆN TẠI (cập nhật thêm/giữ nguyên field nào không có tin mới):\n${JSON.stringify(customer, null, 2)}\n`;
    if (note && note.trim()) contextText += `\nGHI CHÚ THÊM TỪ NGƯỜI VẬN HÀNH: ${note.trim()}\n`;
    contentBlocks.push({ type: 'text', text: contextText });
    imgList.forEach((dataUrl) => {
      const block = imageBlockFromDataUrl(dataUrl);
      if (block) contentBlocks.push(block);
    });

    const result = await callClaude({ apiKey, contentBlocks });

    const todayIso = new Date().toISOString().slice(0, 10);
    const union = (a, b) => Array.from(new Set([...(a || []), ...(b || [])]));
    const payload = {
      ...result,
      nhom_nhu_cau: union(customer.nhom_nhu_cau, result.nhom_nhu_cau),
      rao_can: union(customer.rao_can, result.rao_can),
      nhanh: result.nhanh || customer.nhanh || null,
      form_hd: result.form_hd || customer.form_hd || null,
      lan_tuong_tac_cuoi: todayIso,
    };
    // Bỏ field undefined/rỗng để không ghi đè field cũ bằng giá trị trống khi AI không nhắc tới.
    Object.keys(payload).forEach((k) => { if (payload[k] === undefined || payload[k] === '') delete payload[k]; });

    const upd = await supabaseAsUser(token, `crm_customers?id=eq.${customer_id}&user_id=eq.${user.id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    const updRows = upd.ok ? await upd.json() : [];

    const insInt = await supabaseAsUser(token, 'crm_interactions', {
      method: 'POST',
      body: JSON.stringify({
        customer_id, user_id: user.id, thoi_gian: todayIso,
        ten_tuong_tac: 'Cập nhật hồ sơ từ ảnh/ghi chú',
        noi_dung: (note && note.trim()) || 'Số hoá lại ghi chú/dữ liệu đã có về khách.',
      }),
    });
    const intRows = insInt.ok ? await insInt.json() : [];

    res.status(200).json({ customer: updRows[0] || null, interaction: intRows[0] || null });
  } catch (err) {
    if (quotaConsumed) await refundCrmAiQuota(user.id, 'crm-cap-nhat-ho-so');
    res.status(500).json({ error: err.message || 'Có lỗi xảy ra khi cập nhật hồ sơ.' });
  }
};
