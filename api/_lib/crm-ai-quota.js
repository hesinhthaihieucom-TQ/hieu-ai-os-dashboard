// Lượt AI RIÊNG cho tro-ly-crm (2026-08-30, chị Quỳnh chốt "app này nên để lượt AI như nào cho
// chuẩn?" -> "làm như Xây Nhân Hiệu — hiện bộ đếm lượt") — ĐỘC LẬP hoàn toàn với
// api/_lib/trial-quota.js (sản phẩm khác, giá khác, không có khái niệm "dùng thử" — chỉ có gói trả
// phí crm_has_paid/crm_access_until). Cùng cơ chế khoá "select ... for update" atomic qua RPC
// (consume_crm_ai_quota/refund_crm_ai_quota trong supabase/schema_full.sql) để tránh race condition
// khi nhiều request AI cùng 1 user chạy dồn dập.
const SUPABASE_URL = 'https://ltcjlnvceuspnwldsbgi.supabase.co';

// 2026-08-30, chị Quỳnh yêu cầu tính lại đúng chi phí thật (Sonnet 5, giá $3/$15 mỗi triệu token)
// thay vì áng chừng theo Xây Nhân Hiệu:
// - crm-tuvan (Tư Vấn AI, tối đa 10 ảnh + system prompt ~15.9k ký tự có cache): ~1.200–2.500đ/lượt.
// - crm-cap-nhat-ho-so (tối đa 6 ảnh, prompt ngắn hơn nhiều, không sinh câu tư vấn): ~600–1.100đ/lượt.
// - case-study-classify (chỉ đọc text ngắn để phân loại): ~40đ/lượt — gần như miễn phí, giống các
//   hành động "phân loại" bên Xây Nhân Hiệu (VD phan-loai-hook.js) KHÔNG tính lượt luôn — xem
//   api/case-study-classify.js, cố tình KHÔNG gọi checkAndConsumeCrmAiQuota.
// Tỉ lệ chi phí thật crm-tuvan:crm-cap-nhat-ho-so ~ 3:1 — trọng số bên dưới khớp đúng tỉ lệ này.
// 300/tháng: nếu 1 người dồn hết vào crm-tuvan (weight 3) = 100 lượt gọi/tháng (~3,3/ngày) ~
// 180.000đ chi phí AI thật — ~54% doanh thu gói rẻ nhất (332.500đ/tháng, gói năm), đủ rộng cho
// dùng thật hàng ngày (đây là công cụ CRM dùng liên tục, không phải tiện ích phụ) nhưng vẫn có
// trần. Re-xác nhận với chị Quỳnh nếu usage thật tế cho thấy cần điều chỉnh.
const CRM_MONTHLY_AI_LIMIT = 300;

const CRM_AI_WEIGHTS = {
  'crm-tuvan': 3,
  'crm-cap-nhat-ho-so': 1,
};

async function supabaseRpc(fn, args) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    return await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify(args),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

// Trả về null nếu được phép dùng (đã tự tăng đếm lên), hoặc 1 chuỗi thông báo nếu bị chặn vì hết
// lượt tháng này. Lỗi đọc/ghi hạ tầng KHÔNG chặn người dùng (thà dùng thừa còn hơn chặn oan).
async function checkAndConsumeCrmAiQuota(userId, actionKey) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const weight = CRM_AI_WEIGHTS[actionKey] || 1;
  try {
    const resp = await supabaseRpc('consume_crm_ai_quota', {
      p_user_id: userId, p_monthly_limit: CRM_MONTHLY_AI_LIMIT, p_weight: weight,
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (data.allowed) return null;
    return `Bạn đã dùng hết ${data.effective_limit} lượt AI trong tháng này — lượt sẽ tự làm mới vào đầu tháng sau.`;
  } catch (e) {
    return null;
  }
}

// Gọi trong catch block của endpoint khi lệnh gọi AI/luồng xử lý bị lỗi sau khi đã trừ lượt — trả
// lại đúng số lượt vừa trừ oan vì người dùng không thực sự nhận được kết quả.
async function refundCrmAiQuota(userId, actionKey) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  const weight = CRM_AI_WEIGHTS[actionKey] || 1;
  try {
    await supabaseRpc('refund_crm_ai_quota', { p_user_id: userId, p_weight: weight });
  } catch (e) {}
}

module.exports = { checkAndConsumeCrmAiQuota, refundCrmAiQuota, CRM_MONTHLY_AI_LIMIT, CRM_AI_WEIGHTS };
