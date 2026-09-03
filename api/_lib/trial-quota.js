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
// CHỈ còn là giá trị DỰ PHÒNG truyền vào consume_ai_quota (dùng khi profiles.trial_ai_limit là null,
// tức tài khoản có từ trước 2026-08-24) — trần dùng thử THẬT chốt riêng từng người lúc đăng ký
// (cột trial_ai_limit, xem handle_new_user() ở schema_full.sql), không còn đồng giá cho mọi người
// nữa (theo yêu cầu chị Quỳnh: người đăng ký trước giữ mức cũ 100, người đăng ký từ 24/8 chỉ 50, để
// nhóm đăng ký trước luôn là nhóm được ưu đãi nhất).
const TRIAL_AI_LIMIT = 100;
// 200/tháng — chưa từng nâng lên 250 dù có 1 lần bị hiểu nhầm là đã nâng (2026-08-20, chị Quỳnh xác
// nhận lại: trả phí luôn là 200/tháng, chỉ có TRIAL_AI_LIMIT ở trên là mới nâng lên 100).
const PAID_MONTHLY_AI_LIMIT = 200;
// Gói "Mua thêm lượt" (api/sepay-webhook.js) cộng thẳng vào paid_ai_bonus của tháng hiện tại —
// dùng cho khách dùng vượt mức bình thường (nhiều kênh, tần suất cao...), không phải để bù đắp
// mức nền — trần 200 đã đủ cho use-case bình thường kể cả khách đăng nhiều bài/ngày. 3 mức, mua
// càng nhiều giá/lượt càng rẻ (2026-08-21) — khớp đúng AMOUNT_TO_TOPUP_LUOT ở api/sepay-webhook.js
// và PAID_TOPUP_PACKS ở nhan-hieu/js/app-shell.js.
const PAID_TOPUP_PACKS = [
  { amount: 150000, luot: 100 },
  { amount: 420000, luot: 300 },
  { amount: 780000, luot: 600 },
];

// Trọng số lượt theo TỪNG hành động — phản ánh đúng chi phí Anthropic thực tế của hành động đó
// (hành động càng nhiều token/prompt dài thì tốn càng nhiều lượt), thay vì trước đây tính đồng giá
// 1 lượt/hành động dù chi phí thực tế lệch nhau tới ~6-7 lần giữa hành động rẻ nhất và đắt nhất.
const AI_WEIGHTS = {
  'cai-thien-hook': 1,
  'cham-diem-hook': 1,
  'goi-y-hook-theo-chu-de': 1,
  // 2026-08-20: nâng 1 -> 2 vì đổi sang sinh ĐỦ 5 MỐC trong 1 lần gọi (trước đây 1 lượt/1 mốc,
  // đổi mốc 5 lần tốn 5 lượt) — output giờ lớn hơn hẳn (max_tokens 2000 -> 5000), ngang mức
  // cham-diem-content/goi-y-lich (cũng ra nhiều mục cùng lúc trong 1 lần gọi).
  'goi-y-day-bai': 2,
  'goi-y-tu-nguon': 1,
  'hoi-dap': 1,
  // Cập nhật CHỈ câu chuyện cá nhân (không đụng phần còn lại của định vị) — rẻ hơn hẳn chạy lại
  // toàn bộ Lượt 1 (8 lượt), đúng tinh thần "sửa đúng đúng phần bị thiếu, không bắt làm lại từ đầu".
  'dinh-vi-cap-nhat-cau-chuyen': 1,
  'cham-diem-content': 2,
  // 2026-09-03, chị Quỳnh chốt tăng 2 -> 3 (đồng thời làm rõ đơn vị trong UI: "3 lượt/TUẦN" —
  // khác hẳn "AI viết luôn" tính "lượt/BÀI", dễ gây hiểu lầm nếu chỉ ghi số suông).
  'goi-y-lich': 3,
  'viet-content': 3,
  'viet-tu-kho-goc': 3,
  'tai-che-viral': 3,
  'sua-kenh': 4,
  'dinh-vi': 8,
  'dinh-vi-parse': 6,
  // Tạo Sản Phẩm Bằng AI (san-pham-so/) — Giai đoạn 1 chốt 8 lượt (bằng dinh-vi, theo Quỳnh 2026-08-25).
  // 4 mức Giai đoạn 2 là ĐỀ XUẤT ban đầu, CHƯA xác nhận với Quỳnh — cần hỏi lại khi tính năng chạy
  // thử ổn để chốt số cuối cùng (xem plan atomic-wiggling-rabbit.md).
  'tim-san-pham-phu-hop': 8,
  'xay-dung-noi-dung-outline2': 3,
  'xay-dung-noi-dung-nghien-cuu': 2,
  'xay-dung-noi-dung-viet': 3,
  'xay-dung-noi-dung-review': 1,
  // Duyệt tổng thể sản phẩm sau khi viết xong hết (2026-09-01) — đọc lại toàn bộ nội dung đã viết,
  // ngang mức nghien-cuu — ĐỀ XUẤT, chưa xác nhận với Quỳnh.
  'xay-dung-noi-dung-tong-duyet': 2,
  // Tìm kiến thức từ web (tùy chọn, 2026-09-01) — thay quy trình thủ công cũ của Quỳnh (từ khóa +
  // NotebookLM). Tách thành 2 lệnh gọi (tìm web + tổng hợp) + phí tìm kiếm thật của Anthropic
  // ($10/1.000 lượt tìm ~250đ/lượt, tối đa 4 lượt/lần) — ĐỀ XUẤT, CHƯA xác nhận với Quỳnh, cần theo
  // dõi chi phí thật sau khi dùng thử để chốt số cuối.
  'xay-dung-noi-dung-nghien-cuu-web': 4,
  // Kế Hoạch Ra Mắt (2026-09-01) — 1 lệnh gọi duy nhất, output tương đương mức viet-mo-ta/caption
  // nhưng dài hơn (3-5 mốc thời gian) — ĐỀ XUẤT, chưa xác nhận với Quỳnh.
  'san-pham-so-ke-hoach-ra-mat': 2,
  // Chọn Loại Sản Phẩm Số (2026-09-01) — chỉ dựng 1 outline theo lựa chọn đã rõ, không đánh giá
  // Ikigai/độ khả thi như tim-san-pham-phu-hop (8 lượt) — ĐỀ XUẤT, chưa xác nhận với Quỳnh.
  'san-pham-so-tao-tu-loai': 5,
  // Bước "AI gợi ý định dạng" đứng TRƯỚC san-pham-so-tao-tu-loai ở trên — output rất nhỏ (1-2 định
  // dạng + lý do ngắn, không có outline) nên rẻ hơn hẳn — ĐỀ XUẤT, chưa xác nhận với Quỳnh.
  'san-pham-so-goi-y-dinh-dang': 1,
  // Nhánh "đã có sẵn tài liệu" (mục A, 2026-09-01) — đọc thẳng 1 file PDF qua Claude thay vì suy từ
  // 12 câu trả lời ngắn, ngang mức tim-san-pham-phu-hop vì cùng vai trò (ra 2-3 phương án + outline).
  'tim-san-pham-tu-tai-lieu': 8,
  // Viết mô tả bán hàng / caption quảng cáo (mục D, H) — 1 lượt gọi ngắn, rẻ, không phải bước chính
  // của luồng tạo sản phẩm mà chỉ là tiện ích phụ trợ.
  'san-pham-so-viet-mo-ta': 1,
  'san-pham-so-viet-caption': 1,
  // Tạo Landing Page (2026-09-01) — viết 1 lần cả 9 phần (hook/vấn đề/lợi ích/FAQ/CTA...), output lớn
  // hơn hẳn mô tả/caption đơn — ngang mức san-pham-so-tao-tu-loai (cũng ra nhiều nội dung có cấu
  // trúc trong 1 lần gọi) — ĐỀ XUẤT, chưa xác nhận với Quỳnh.
  'san-pham-so-tao-landing-page': 4,
};

// Trước đây fetch() này KHÔNG có giới hạn thời gian chờ — nếu RPC bị kẹt (vd khoá dòng "for
// update" bị giữ lâu bởi 1 request khác chưa xong), lệnh gọi có thể treo tới tận khi Vercel tự
// ngắt hàm (300s), khiến MỌI hành động AI (không riêng gì 1 luồng cụ thể) đều bị "treo" ở bước
// kiểm tra lượt, trước khi kịp gọi tới Anthropic. Đặt trần 12s riêng cho lệnh gọi RPC này — lỗi ở
// đây vốn đã được coi là "để dùng thừa còn hơn chặn oan" (xem checkAndConsumeTrialQuota), nên hết
// giờ vẫn xử lý an toàn y như mọi lỗi khác, không chặn người dùng.
async function supabaseRpc(fn, args) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    return await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify(args),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

// Ghi 1 dòng lịch sử dùng lượt (ai_usage_log) để người dùng tự xem lại "đã dùng bao nhiêu lượt cho
// việc gì" ở mục Tài khoản — profiles chỉ lưu tổng số, không biết chi tiết theo hành động.
// Best-effort: lỗi ghi không được làm hỏng luồng chính (đã được phép dùng thì cứ để dùng).
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
    // 2026-08-29: hết hạn dùng thử/gói trả phí — KHÁC hẳn "hết lượt" (vẫn còn lượt nhưng đã qua
    // access_until). Frontend vẫn cho xem lại nội dung cũ, chỉ chặn đúng hành động AI này.
    if (data.mode === 'expired') {
      return `Thời gian dùng đã kết thúc — vào mục "Nâng cấp / Mua gói" để tiếp tục dùng AI. Bạn vẫn xem lại được toàn bộ nội dung cũ đã tạo trước đó.`;
    }
    if (data.mode === 'trial') {
      return `Bạn đã dùng hết ${TRIAL_AI_LIMIT} lượt AI miễn phí trong thời gian dùng thử — vào mục "Nâng cấp / Mua gói" để dùng tiếp không giới hạn.`;
    }
    return `Bạn đã dùng hết ${data.effective_limit} lượt AI trong tháng này — lượt sẽ tự làm mới vào đầu tháng sau, hoặc vào mục "Nâng cấp / Mua gói" để mua thêm lượt dùng ngay.`;
  } catch (e) {
    return null;
  }
}

// "Hỏi & Trợ Giúp": câu hỏi ĐẦU TIÊN trong ngày (giờ Việt Nam) được MIỄN PHÍ, không trừ lượt — theo
// yêu cầu chị Quỳnh 22/8, để người dùng đỡ phải hỏi trực tiếp trong group. Từ câu thứ 2 trong cùng
// ngày trở đi tính lượt bình thường (tránh bị hỏi tràn lan). Dựa vào ai_usage_log đã ghi sẵn cho
// mỗi lần dùng (xem logUsage) — không cần thêm cột/bảng riêng.
async function hasUsedFreeQuestionToday(userId) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return true; // hạ tầng lỗi — coi như ĐÃ dùng free, để rơi về nhánh trừ lượt bình thường (an toàn hơn là phát free vô hạn khi lỗi).
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const vnNow = new Date(Date.now() + 7 * 3600 * 1000);
  const vnDateStr = vnNow.toISOString().slice(0, 10);
  const vnTodayStartIso = new Date(new Date(`${vnDateStr}T00:00:00.000Z`).getTime() - 7 * 3600 * 1000).toISOString();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/ai_usage_log?user_id=eq.${userId}&action_key=eq.hoi-dap&created_at=gte.${encodeURIComponent(vnTodayStartIso)}&select=id&limit=1`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }, signal: controller.signal }
    );
    if (!resp.ok) return true;
    const rows = await resp.json();
    return rows.length > 0;
  } catch (e) {
    return true;
  } finally {
    clearTimeout(timer);
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

module.exports = { checkAndConsumeTrialQuota, refundTrialQuota, hasUsedFreeQuestionToday, TRIAL_AI_LIMIT, PAID_MONTHLY_AI_LIMIT, PAID_TOPUP_PACKS, AI_WEIGHTS };
