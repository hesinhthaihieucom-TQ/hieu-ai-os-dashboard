// Lượt AI RIÊNG cho tro-ly-crm (2026-08-30, chị Quỳnh chốt "app này nên để lượt AI như nào cho
// chuẩn?" -> "làm như Xây Nhân Hiệu — hiện bộ đếm lượt") — ĐỘC LẬP hoàn toàn với
// api/_lib/trial-quota.js (sản phẩm khác, giá khác, không có khái niệm "dùng thử" — chỉ có gói trả
// phí crm_has_paid/crm_access_until). Cùng cơ chế khoá "select ... for update" atomic qua RPC
// (consume_crm_ai_quota/refund_crm_ai_quota trong supabase/schema_full.sql) để tránh race condition
// khi nhiều request AI cùng 1 user chạy dồn dập.
const SUPABASE_URL = 'https://ltcjlnvceuspnwldsbgi.supabase.co';

// 200/tháng — khớp đúng con số quen thuộc của Xây Nhân Hiệu (PAID_MONTHLY_AI_LIMIT). Ở trọng số
// crm-tuvan=6 (xem CRM_AI_WEIGHTS), 200 lượt = ~33 cuộc tư vấn ảnh nặng nhất mỗi tháng nếu dồn hết
// vào 1 hành động — ước ~150.000đ chi phí AI thật, an toàn so với giá gói rẻ nhất 332.500đ/tháng
// (gói năm). Re-xác nhận với chị Quỳnh nếu usage thật tế cho thấy cần điều chỉnh.
const CRM_MONTHLY_AI_LIMIT = 200;

// Trọng số theo TỪNG endpoint — phản ánh đúng chi phí Anthropic thực tế (crm-tuvan đọc tối đa 10
// ảnh + phân tích đầy đủ, tốn hơn hẳn case-study-classify chỉ đọc text ngắn để phân loại).
const CRM_AI_WEIGHTS = {
  'crm-tuvan': 6,
  'crm-cap-nhat-ho-so': 3, // đọc ảnh/ghi chú cũ để cập nhật hồ sơ — không sinh câu tư vấn, rẻ hơn crm-tuvan
  'case-study-classify': 1,
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
