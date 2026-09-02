// Sản Phẩm Số — kiểm tra/trừ lượt AI RIÊNG, tách biệt hoàn toàn khỏi trial-quota.js (Xây Nhân Hiệu).
// Quỳnh 2026-09-01: "2 cái này không liên quan đến nhau, e vẫn thu phí người dùng là 599k cho app
// này 1 tháng" — Sản Phẩm Số bán riêng, nên lượt AI phải đếm riêng dù dùng chung 1 tài khoản đăng
// nhập. Mô phỏng đúng pattern api/_lib/crm-ai-quota.js (Trợ Lý CRM) nhưng CÓ thêm nhánh dùng thử
// (CRM không có trial, luôn bắt trả phí trước) — xem consume_sps_ai_quota/schema_san_pham_so.sql.

const SUPABASE_URL = 'https://ltcjlnvceuspnwldsbgi.supabase.co';
// 20 lượt dùng thử trọn đời + 240 lượt/tháng sau khi trả phí (599.000đ/tháng) — ĐỀ XUẤT theo đúng tỷ
// lệ giá/lượt Xây Nhân Hiệu đang áp (499k/tháng ≈ 200 lượt), Quỳnh đã xác nhận số này 2026-09-01.
const SPS_TRIAL_AI_LIMIT = 20;
const SPS_PAID_MONTHLY_AI_LIMIT = 240;
// Trọng số lượt/hành động — dùng LẠI CHÍNH XÁC AI_WEIGHTS đã có ở trial-quota.js cho các action của
// san-pham-so (không tạo bản sao dễ lệch nhau khi 1 bên đổi mà quên đổi bên kia).
const { AI_WEIGHTS } = require('./trial-quota');

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

async function logUsage(userId, actionKey, weight) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/ai_usage_log`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Prefer: 'return=minimal',
      },
      signal: controller.signal,
      body: JSON.stringify({ user_id: userId, action_key: actionKey, weight }),
    });
  } catch (e) {
  } finally {
    clearTimeout(timer);
  }
}

// Trả về null nếu được phép dùng (đã tự tăng đếm lên), hoặc 1 chuỗi thông báo nếu bị chặn. Lỗi
// đọc/ghi hạ tầng KHÔNG chặn người dùng (thà dùng thừa còn hơn chặn oan vì server sự cố).
async function checkAndConsumeSpsQuota(userId, actionKey) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const weight = AI_WEIGHTS[actionKey] || 1;
  try {
    const resp = await supabaseRpc('consume_sps_ai_quota', {
      p_user_id: userId, p_trial_limit: SPS_TRIAL_AI_LIMIT, p_paid_limit: SPS_PAID_MONTHLY_AI_LIMIT, p_weight: weight,
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (data.allowed) { await logUsage(userId, actionKey, weight); return null; }
    if (data.mode === 'expired') {
      return `Gói Sản Phẩm Số của bạn đã hết hạn — vào mục "Nâng Cấp" để tiếp tục dùng AI. Bạn vẫn xem lại được toàn bộ sản phẩm cũ đã tạo trước đó.`;
    }
    if (data.mode === 'trial') {
      return `Bạn đã dùng hết ${SPS_TRIAL_AI_LIMIT} lượt AI dùng thử của Sản Phẩm Số — vào mục "Nâng Cấp" (599.000đ/tháng) để dùng tiếp không giới hạn.`;
    }
    return `Bạn đã dùng hết ${data.effective_limit} lượt AI của Sản Phẩm Số trong tháng này — lượt sẽ tự làm mới vào đầu chu kỳ sau.`;
  } catch (e) {
    return null;
  }
}

async function refundSpsQuota(userId, actionKey) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  const weight = AI_WEIGHTS[actionKey] || 1;
  try {
    await supabaseRpc('refund_sps_ai_quota', { p_user_id: userId, p_weight: weight });
  } catch (e) {}
}

module.exports = { checkAndConsumeSpsQuota, refundSpsQuota, SPS_TRIAL_AI_LIMIT, SPS_PAID_MONTHLY_AI_LIMIT };
