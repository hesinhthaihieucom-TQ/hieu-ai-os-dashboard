// Ước tính kcal từ ẢNH BỮA ĂN (Hiểu để Khỏe, Lịch Trình > Nhật ký, 2026-10-05 — chị Quỳnh: "mục ăn
// chia đĩa cũng cho ngta chụp ảnh gửi lên sẽ ra đc lượng kcal ngta đang tiêu thụ là bn"). Ảnh chỉ đi qua
// server để gọi Claude rồi bỏ, KHÔNG lưu ảnh ở đâu cả (không cần bucket lưu trữ, cũng không giữ ảnh đồ
// ăn của khách) — client chỉ lưu kết quả (món + kcal) vào sk_daily_logs.meal_log. Kết quả chỉ là ƯỚC
// TÍNH (sai số thường ±20-30% vì không cân được khối lượng), prompt buộc AI nói rõ điều đó qua do_tin_cay.
// Chỉ cho user ĐÃ được gán gói/sản phẩm (cùng điều kiện api/suc-khoe-insight.js), có trừ lượt AI riêng
// của suc-khoe (api/_lib/suc-khoe-ai-quota.js).
const { requireUser } = require('./_lib/auth');
const { checkAndConsumeSkAiQuota, refundSkAiQuota } = require('./_lib/suc-khoe-ai-quota');

const SUPABASE_URL = 'https://ltcjlnvceuspnwldsbgi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_j0ohsTIc7Df5_dz5vDiniA_nB5jPYWy';
const ACTION_KEY = 'sk-phan-tich-dia-an';
// Client đã thu nhỏ ảnh xuống ~1024px JPEG (~100-250KB); chặn ảnh quá lớn gửi thẳng lên.
const MAX_DATAURL_LEN = 3_000_000;

const SYSTEM_PROMPT = `Bạn là chuyên gia dinh dưỡng giúp người Việt ước tính lượng calo của một bữa ăn từ ảnh chụp.

Nhìn ảnh, liệt kê từng món/thành phần thấy được, ước tính khối lượng (gram) theo kích cỡ đĩa/bát/tô và tỉ lệ so với vật quanh đó, rồi tính kcal từng món theo bảng thành phần thực phẩm phổ biến (ưu tiên số liệu món Việt: cơm trắng ~130 kcal/100g, cơm gạo lứt ~110, thịt heo nạc nướng ~200, trứng luộc ~155, bông cải xanh ~35...). Cộng tổng kcal, protein, carb, fat.

Quy tắc:
- Nếu ảnh KHÔNG phải đồ ăn/đồ uống thì đặt khong_phai_do_an=true, các số để 0.
- Món ăn có dầu mỡ, nước sốt, đường chưa nhìn thấy rõ thì cộng thêm hợp lý và nói trong nhan_xet, không bỏ sót.
- do_tin_cay: "cao" nếu ảnh rõ, ít món lẫn; "trung_binh" nếu khó ước lượng khối lượng; "thap" nếu ảnh mờ/món bị che/nhiều món trộn.
- nhan_xet: đúng 1-2 câu ngắn, tiếng Việt thân thiện, nhận xét đĩa ăn so với nguyên tắc chia đĩa 4-3-2-1 (rau xanh nhiều nhất — đạm — tinh bột — chất béo) và gợi ý điều chỉnh cụ thể nếu cần. KHÔNG chẩn đoán bệnh, KHÔNG khuyên ăn kiêng cực đoan.
- Làm tròn kcal từng món đến 5. Mọi số là ƯỚC TÍNH, không khẳng định chính xác tuyệt đối.`;

const TOOL = {
  name: 'xuat_uoc_tinh_bua_an',
  description: 'Xuất ước tính dinh dưỡng của bữa ăn trong ảnh.',
  input_schema: {
    type: 'object',
    properties: {
      khong_phai_do_an: { type: 'boolean' },
      mon_an: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            ten: { type: 'string' },
            khoi_luong_g: { type: 'number' },
            kcal: { type: 'number' },
          },
          required: ['ten', 'khoi_luong_g', 'kcal'],
        },
      },
      tong_kcal: { type: 'number' },
      protein_g: { type: 'number' },
      carb_g: { type: 'number' },
      fat_g: { type: 'number' },
      do_tin_cay: { type: 'string', enum: ['cao', 'trung_binh', 'thap'] },
      nhan_xet: { type: 'string' },
    },
    required: ['khong_phai_do_an', 'mon_an', 'tong_kcal', 'protein_g', 'carb_g', 'fat_g', 'do_tin_cay', 'nhan_xet'],
  },
};

function imageBlockFromDataUrl(dataUrl) {
  const m = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl || '');
  if (!m) return null;
  return { type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } };
}

async function callClaude({ apiKey, imageBlock, ghiChu }) {
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
        system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        messages: [{
          role: 'user',
          content: [
            imageBlock,
            { type: 'text', text: ghiChu ? `Ước tính calo bữa ăn trong ảnh. Người dùng ghi chú thêm: ${ghiChu}` : 'Ước tính calo bữa ăn trong ảnh.' },
          ],
        }],
        tools: [TOOL],
        tool_choice: { type: 'tool', name: TOOL.name },
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

  const [profResp, customerProductsResp] = await Promise.all([
    supabaseAsUser(token, `profiles?id=eq.${user.id}&select=sk_package_id,role`),
    supabaseAsUser(token, `sk_customer_products?user_id=eq.${user.id}&select=id&limit=1`),
  ]);
  const profRows = profResp.ok ? await profResp.json() : [];
  const profile = profRows[0];
  const hasCustomerProducts = customerProductsResp.ok ? (await customerProductsResp.json()).length > 0 : false;
  const isActive = profile && (profile.role === 'admin' || profile.sk_package_id || hasCustomerProducts);
  if (!isActive) {
    res.status(402).json({ error: 'Bạn chưa được gán gói sản phẩm/chương trình — liên hệ để được kích hoạt trước khi dùng tính năng này.' });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'Server chưa được cấu hình ANTHROPIC_API_KEY.' }); return; }

  let quotaConsumed = false;
  try {
    const { image, ghi_chu } = req.body || {};
    if (!image || image.length > MAX_DATAURL_LEN) { res.status(400).json({ error: 'Ảnh quá lớn hoặc thiếu — chụp/chọn lại ảnh nhỏ hơn giúp mình.' }); return; }
    const imageBlock = imageBlockFromDataUrl(image);
    if (!imageBlock) { res.status(400).json({ error: 'Định dạng ảnh không hợp lệ — dùng ảnh JPG/PNG.' }); return; }
    const ghiChu = typeof ghi_chu === 'string' ? ghi_chu.trim().slice(0, 300) : '';

    const quotaBlockMsg = await checkAndConsumeSkAiQuota(user.id, ACTION_KEY);
    if (quotaBlockMsg) { res.status(402).json({ error: quotaBlockMsg }); return; }
    quotaConsumed = true;

    const result = await callClaude({ apiKey, imageBlock, ghiChu });
    res.status(200).json(result);
  } catch (err) {
    if (quotaConsumed) await refundSkAiQuota(user.id, ACTION_KEY);
    res.status(500).json({ error: err.message || 'Có lỗi xảy ra khi phân tích ảnh bữa ăn.' });
  }
};
