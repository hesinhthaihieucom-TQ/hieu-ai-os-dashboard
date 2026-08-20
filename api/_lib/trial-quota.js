// Giới hạn số lượt dùng AI — 2 chế độ tuỳ trạng thái tài khoản:
// - CHƯA từng thanh toán: giới hạn TRỌN ĐỜI dùng thử (trial_ai_uses, trần TRIAL_AI_LIMIT) — tránh
//   1 tài khoản dùng thử tốn quá nhiều chi phí Anthropic trước khi mang lại doanh thu.
// - ĐÃ thanh toán ít nhất 1 lần (has_paid=true, đánh dấu bởi api/sepay-webhook.js): giới hạn THEO
//   THÁNG (paid_ai_uses + paid_ai_month, trần PAID_MONTHLY_AI_LIMIT) — không giới hạn trọn đời như
//   trial vì họ đã trả tiền, chỉ chặn trường hợp dùng bất thường trong 1 tháng, tự reset mỗi tháng.
// Admin vẫn được ĐẾM lượt như bình thường (phục vụ thống kê) nhưng KHÔNG BAO GIỜ bị chặn.
//
// Việc kiểm tra + trừ lượt chạy ATOMIC trong 1 hàm Postgres (consume_ai_quota/refund_ai_quota,
// dùng "select ... for update" khoá đúng dòng profile) thay vì đọc-rồi-ghi qua 2 lệnh HTTP tách
// rời — tránh race condition khi nhiều request AI của cùng 1 user chạy dồn dập/song song có thể
// cùng "lọt qua" trần trước khi kịp cập nhật số mới cho nhau. Dùng SUPABASE_SERVICE_ROLE_KEY vì
// đây là hàm chỉ service_role được gọi (xem grant trong supabase/schema_full.sql).
const SUPABASE_URL = 'https://ltcjlnvceuspnwldsbgi.supabase.co';
const TRIAL_AI_LIMIT = 65;
const PAID_MONTHLY_AI_LIMIT = 250;
// Gói "Mua thêm lượt" (api/sepay-webhook.js) cộng thẳng vào paid_ai_bonus của tháng hiện tại —
// dùng cho khách dùng vượt mức bình thường (nhiều kênh, tần suất cao...), không phải để bù đắp
// mức nền — trần 250 đã đủ cho use-case bình thường kể cả khách đăng nhiều bài/ngày.
const PAID_TOPUP_PACK = { amount: 150000, luot: 100 };

// Trọng số lượt theo TỪNG hành động — phản ánh đúng chi phí Anthropic thực tế của hành động đó
// (hành động càng nhiều token/prompt dài thì tốn càng nhiều lượt), thay vì trước đây tính đồng giá
// 1 lượt/hành động dù chi phí thực tế lệch nhau tới ~6-7 lần giữa hành động rẻ nhất và đắt nhất.
const AI_WEIGHTS = {
  'cai-thien-hook': 1,
  'cham-diem-hook': 1,
  'goi-y-hook-theo-chu-de': 1,
  'goi-y-day-bai': 1,
  'goi-y-tu-nguon': 1,
  'cham-diem-content': 2,
  'goi-y-lich': 2,
  'viet-content': 3,
  'viet-tu-kho-goc': 3,
  'tai-che-viral': 3,
  'sua-kenh': 4,
  'dinh-vi': 8,
  'dinh-vi-parse': 6,
};

async function supabaseRpc(fn, args) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify(args),
  });
}

// Ghi 1 dòng lịch sử dùng lượt (ai_usage_log) để người dùng tự xem lại "đã dùng bao nhiêu lượt cho
// việc gì" ở mục Tài khoản — profiles chỉ lưu tổng số, không biết chi tiết theo hành động.
// Best-effort: lỗi ghi không được làm hỏng luồng chính (đã được phép dùng thì cứ để dùng).
async function logUsage(userId, actionKey, weight) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/ai_usage_log`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ user_id: userId, action_key: actionKey, weight }),
    });
  } catch (e) {}
}

// Trả về null nếu được phép dùng (đã tự tăng đếm lên 1), hoặc 1 chuỗi thông báo nếu bị chặn vì hết
// lượt — gọi ĐÚNG 1 LẦN cho mỗi hành động AI "chính" (viết bài, chấm điểm, tạo hook, lên lịch...),
// KHÔNG gọi cho các việc AI tự động/nhỏ (phân loại hook/trục, gợi ý hashtag sau khi đã viết bài) vì
// các việc đó rất rẻ và là 1 phần tự nhiên của thao tác chính đã tính lượt rồi.
// Lỗi đọc/ghi (sự cố hạ tầng) thì KHÔNG chặn người dùng — thà để dùng thừa 1 vài lượt còn hơn chặn
// oan người dùng thật vì server sự cố.
async function checkAndConsumeTrialQuota(userId, actionKey) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const weight = AI_WEIGHTS[actionKey] || 1;
  try {
    const resp = await supabaseRpc('consume_ai_quota', {
      p_user_id: userId, p_trial_limit: TRIAL_AI_LIMIT, p_paid_limit: PAID_MONTHLY_AI_LIMIT, p_weight: weight,
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (data.allowed) { await logUsage(userId, actionKey, weight); return null; }
    if (data.mode === 'trial') {
      return `Bạn đã dùng hết ${TRIAL_AI_LIMIT} lượt AI miễn phí trong thời gian dùng thử — vào mục "Nâng cấp / Mua gói" để dùng tiếp không giới hạn.`;
    }
    return `Bạn đã dùng hết ${data.effective_limit} lượt AI trong tháng này — lượt sẽ tự làm mới vào đầu tháng sau, hoặc vào mục "Nâng cấp / Mua gói" để mua thêm lượt dùng ngay.`;
  } catch (e) {
    return null;
  }
}

// Gọi trong catch block của endpoint, SAU checkAndConsumeTrialQuota, khi bản thân lệnh gọi AI/luồng
// xử lý bị lỗi (Anthropic lỗi, thiếu dữ liệu đầu vào...) — trả lại đúng 1 lượt vừa trừ oan vì người
// dùng không thực sự nhận được kết quả. Không dùng cho lỗi 401/402 (chưa từng trừ lượt ở các case đó).
async function refundTrialQuota(userId, actionKey) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  const weight = AI_WEIGHTS[actionKey] || 1;
  try {
    await supabaseRpc('refund_ai_quota', { p_user_id: userId, p_weight: weight });
  } catch (e) {}
}

module.exports = { checkAndConsumeTrialQuota, refundTrialQuota, TRIAL_AI_LIMIT, PAID_MONTHLY_AI_LIMIT, PAID_TOPUP_PACK, AI_WEIGHTS };
