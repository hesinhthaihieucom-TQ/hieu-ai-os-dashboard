// Lượt AI RIÊNG cho suc-khoe (2026-09-05, Insight Overlay "Xanh trong Đỏ") — ĐỘC LẬP với
// api/_lib/trial-quota.js (Xây Nhân Hiệu) và api/_lib/crm-ai-quota.js (Trợ Lý CRM). App này không
// có has_paid/access_until riêng nên chỉ có 1 trần THÁNG chung cho mọi user đã được gán gói, admin
// không bị chặn — xem consume_sk_ai_quota/refund_sk_ai_quota trong supabase/schema_suc_khoe.sql.
const SUPABASE_URL = 'https://ltcjlnvceuspnwldsbgi.supabase.co';

// ĐỀ XUẤT ban đầu, CHƯA xác nhận với chị Quỳnh — chi phí thật ước tính ~150-250đ/lượt (input ngắn
// + output ~100-150 từ, Sonnet 5 $3/$15 mỗi triệu token). 15/tháng vì đây là công cụ dùng khi có
// biến cố/khủng hoảng thật, không phải tiện ích dùng hàng ngày — chị xem lại nếu cần đổi.
const SK_MONTHLY_AI_LIMIT = 15;
const SK_AI_WEIGHTS = {
  'sk-insight-xanh-trong-do': 1,
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
async function checkAndConsumeSkAiQuota(userId, actionKey) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const weight = SK_AI_WEIGHTS[actionKey] || 1;
  try {
    const resp = await supabaseRpc('consume_sk_ai_quota', {
      p_user_id: userId, p_monthly_limit: SK_MONTHLY_AI_LIMIT, p_weight: weight,
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (data.allowed) return null;
    return `Bạn đã dùng hết ${data.effective_limit} lượt trong tháng này — lượt sẽ tự làm mới, quay lại sau nhé.`;
  } catch (e) {
    return null;
  }
}

async function refundSkAiQuota(userId, actionKey) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  const weight = SK_AI_WEIGHTS[actionKey] || 1;
  try {
    await supabaseRpc('refund_sk_ai_quota', { p_user_id: userId, p_weight: weight });
  } catch (e) {}
}

module.exports = { checkAndConsumeSkAiQuota, refundSkAiQuota, SK_MONTHLY_AI_LIMIT, SK_AI_WEIGHTS };
