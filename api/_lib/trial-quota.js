// Giới hạn số lượt dùng AI — 2 chế độ tuỳ trạng thái tài khoản:
// - CHƯA từng thanh toán: giới hạn TRỌN ĐỜI dùng thử (trial_ai_uses, trần TRIAL_AI_LIMIT) — tránh
//   1 tài khoản dùng thử tốn quá nhiều chi phí Anthropic trước khi mang lại doanh thu.
// - ĐÃ thanh toán ít nhất 1 lần (has_paid=true, đánh dấu bởi api/sepay-webhook.js): giới hạn THEO
//   THÁNG (paid_ai_uses + paid_ai_month, trần PAID_MONTHLY_AI_LIMIT) — không giới hạn trọn đời như
//   trial vì họ đã trả tiền, chỉ chặn trường hợp dùng bất thường trong 1 tháng, tự reset mỗi tháng.
// Dùng SUPABASE_SERVICE_ROLE_KEY (bỏ qua RLS) vì cần đọc/ghi profile của user hiện tại từ phía
// server, RLS hiện tại khoá hẳn user tự update profile của chính mình.
const SUPABASE_URL = 'https://ltcjlnvceuspnwldsbgi.supabase.co';
const TRIAL_AI_LIMIT = 50;
const PAID_MONTHLY_AI_LIMIT = 150;
// Gói "Mua thêm lượt" (api/sepay-webhook.js) cộng thẳng vào paid_ai_bonus của tháng hiện tại —
// dùng cho khách dùng vượt mức bình thường (nhiều kênh, tần suất cao...), không phải để bù đắp
// mức nền — trần 150 đã đủ cho use-case bình thường kể cả khách đăng nhiều bài/ngày.
const PAID_TOPUP_PACK = { amount: 150000, luot: 100 };

function currentMonthKey() {
  return new Date().toISOString().slice(0, 7); // 'YYYY-MM'
}

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
// lượt — gọi ĐÚNG 1 LẦN cho mỗi hành động AI "chính" (viết bài, chấm điểm, tạo hook, lên lịch...),
// KHÔNG gọi cho các việc AI tự động/nhỏ (phân loại hook/trục, gợi ý hashtag sau khi đã viết bài) vì
// các việc đó rất rẻ và là 1 phần tự nhiên của thao tác chính đã tính lượt rồi.
// Lỗi đọc/ghi (sự cố hạ tầng) thì KHÔNG chặn người dùng — thà để dùng thừa 1 vài lượt còn hơn chặn
// oan người dùng thật vì server sự cố.
async function checkAndConsumeTrialQuota(userId) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  try {
    const resp = await supabaseAdmin(`profiles?id=eq.${userId}&select=has_paid,trial_ai_uses,role,paid_ai_uses,paid_ai_month,paid_ai_bonus`);
    if (!resp.ok) return null;
    const rows = await resp.json();
    const profile = rows[0];
    // Admin không bao giờ bị giới hạn — đây là tài khoản chủ dùng để quản trị/kiểm tra app.
    if (!profile || profile.role === 'admin') return null;

    if (!profile.has_paid) {
      if (profile.trial_ai_uses >= TRIAL_AI_LIMIT) {
        return `Bạn đã dùng hết ${TRIAL_AI_LIMIT} lượt AI miễn phí trong thời gian dùng thử — vào mục "Nâng cấp / Mua gói" để dùng tiếp không giới hạn.`;
      }
      await supabaseAdmin(`profiles?id=eq.${userId}`, {
        method: 'PATCH', prefer: 'return=minimal',
        body: JSON.stringify({ trial_ai_uses: profile.trial_ai_uses + 1 }),
      });
      return null;
    }

    const month = currentMonthKey();
    const sameMonth = profile.paid_ai_month === month;
    const currentUses = sameMonth ? (profile.paid_ai_uses || 0) : 0;
    const bonus = sameMonth ? (profile.paid_ai_bonus || 0) : 0;
    const effectiveLimit = PAID_MONTHLY_AI_LIMIT + bonus;
    if (currentUses >= effectiveLimit) {
      return `Bạn đã dùng hết ${effectiveLimit} lượt AI trong tháng này — lượt sẽ tự làm mới vào đầu tháng sau, hoặc vào mục "Nâng cấp / Mua gói" để mua thêm lượt dùng ngay.`;
    }
    // Sang tháng mới thì reset cả bonus (bonus chỉ có giá trị trong đúng tháng đã mua).
    const patchBody = { paid_ai_uses: currentUses + 1, paid_ai_month: month };
    if (!sameMonth) patchBody.paid_ai_bonus = 0;
    await supabaseAdmin(`profiles?id=eq.${userId}`, {
      method: 'PATCH', prefer: 'return=minimal',
      body: JSON.stringify(patchBody),
    });
    return null;
  } catch (e) {
    return null;
  }
}

// Gọi trong catch block của endpoint, SAU checkAndConsumeTrialQuota, khi bản thân lệnh gọi AI/luồng
// xử lý bị lỗi (Anthropic lỗi, thiếu dữ liệu đầu vào...) — trả lại đúng 1 lượt vừa trừ oan vì người
// dùng không thực sự nhận được kết quả. Không dùng cho lỗi 401/402 (chưa từng trừ lượt ở các case đó).
async function refundTrialQuota(userId) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  try {
    const resp = await supabaseAdmin(`profiles?id=eq.${userId}&select=has_paid,trial_ai_uses,role,paid_ai_uses,paid_ai_month`);
    if (!resp.ok) return;
    const rows = await resp.json();
    const profile = rows[0];
    if (!profile || profile.role === 'admin') return;

    if (!profile.has_paid) {
      await supabaseAdmin(`profiles?id=eq.${userId}`, {
        method: 'PATCH', prefer: 'return=minimal',
        body: JSON.stringify({ trial_ai_uses: Math.max(0, profile.trial_ai_uses - 1) }),
      });
      return;
    }

    const month = currentMonthKey();
    if (profile.paid_ai_month !== month) return; // đã sang tháng mới, không còn gì để hoàn lại
    await supabaseAdmin(`profiles?id=eq.${userId}`, {
      method: 'PATCH', prefer: 'return=minimal',
      body: JSON.stringify({ paid_ai_uses: Math.max(0, (profile.paid_ai_uses || 0) - 1) }),
    });
  } catch (e) {}
}

module.exports = { checkAndConsumeTrialQuota, refundTrialQuota, TRIAL_AI_LIMIT, PAID_MONTHLY_AI_LIMIT, PAID_TOPUP_PACK };
