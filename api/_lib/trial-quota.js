// Giới hạn số lượt dùng AI trong thời gian DÙNG THỬ (chưa từng thanh toán) — tránh 1 tài khoản dùng
// thử tốn quá nhiều chi phí Anthropic trước khi mang lại doanh thu. Tài khoản đã thanh toán ít nhất
// 1 lần (has_paid=true, đánh dấu bởi api/sepay-webhook.js) thì KHÔNG bị giới hạn bởi module này.
// Dùng SUPABASE_SERVICE_ROLE_KEY (bỏ qua RLS) vì cần đọc/ghi profile của user hiện tại từ phía
// server, RLS hiện tại khoá hẳn user tự update profile của chính mình.
const SUPABASE_URL = 'https://ltcjlnvceuspnwldsbgi.supabase.co';
const TRIAL_AI_LIMIT = 50;

async function supabaseAdmin(path, opts = {}) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      'content-type': 'application/json',
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Prefer: opts.prefer || 'return=representation',
      ...(opts.headers || {}),
    },
  });
}

// Trả về null nếu được phép dùng (đã tự tăng đếm lên 1), hoặc 1 chuỗi thông báo nếu bị chặn vì hết
// lượt dùng thử — gọi ĐÚNG 1 LẦN cho mỗi hành động AI "chính" (viết bài, chấm điểm, tạo hook, lên
// lịch...), KHÔNG gọi cho các việc AI tự động/nhỏ (phân loại hook/trục, gợi ý hashtag sau khi đã
// viết bài) vì các việc đó rất rẻ và là 1 phần tự nhiên của thao tác chính đã tính lượt rồi.
// Lỗi đọc/ghi (sự cố hạ tầng) thì KHÔNG chặn người dùng — thà để dùng thừa 1 vài lượt còn hơn chặn
// oan người dùng thật vì server sự cố.
async function checkAndConsumeTrialQuota(userId) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  try {
    const resp = await supabaseAdmin(`profiles?id=eq.${userId}&select=has_paid,trial_ai_uses,role`);
    if (!resp.ok) return null;
    const rows = await resp.json();
    const profile = rows[0];
    // Admin (kể cả chưa từng "thanh toán" thật) không bao giờ bị giới hạn — đây là tài khoản chủ
    // dùng để quản trị/kiểm tra app, không phải khách dùng thử.
    if (!profile || profile.has_paid || profile.role === 'admin') return null;

    if (profile.trial_ai_uses >= TRIAL_AI_LIMIT) {
      return `Bạn đã dùng hết ${TRIAL_AI_LIMIT} lượt AI miễn phí trong thời gian dùng thử — vào mục "Nâng cấp / Mua gói" để dùng tiếp không giới hạn.`;
    }

    await supabaseAdmin(`profiles?id=eq.${userId}`, {
      method: 'PATCH', prefer: 'return=minimal',
      body: JSON.stringify({ trial_ai_uses: profile.trial_ai_uses + 1 }),
    });
    return null;
  } catch (e) {
    return null;
  }
}

module.exports = { checkAndConsumeTrialQuota, TRIAL_AI_LIMIT };
