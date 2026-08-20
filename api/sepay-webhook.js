// Serverless function — nhận webhook từ SePay mỗi khi có giao dịch vào tài khoản Vietinbank
// của Xây Nhân Hiệu, tự đối chiếu mã tham chiếu (ref_code) trong nội dung chuyển khoản và
// số tiền, rồi tự gia hạn access_until cho đúng tài khoản — không cần admin bấm tay.
//
// Bảo mật: xác thực bằng header "Authorization: Apikey <SEPAY_WEBHOOK_APIKEY>" (khớp đúng
// method "API Key" cấu hình trong SePay dashboard khi tạo webhook). Dùng SUPABASE_SERVICE_ROLE_KEY
// (bỏ qua RLS) vì đây là thao tác hệ thống, không gắn với 1 phiên đăng nhập user nào.

const SUPABASE_URL = 'https://ltcjlnvceuspnwldsbgi.supabase.co';

// Số tiền → số ngày được cộng thêm. Phải khớp CHÍNH XÁC 1 trong các mức giá đang bán, và
// TUYỆT ĐỐI KHÔNG được trùng số tiền giữa 2 gói khác thời hạn — hệ thống chỉ nhận diện gói
// qua đúng số tiền chuyển khoản, trùng số tiền sẽ cộng sai số ngày mà không có cách nào phát hiện.
const AMOUNT_TO_DAYS = {
  499000: 30,    // 1 tháng, giá chuẩn (cũng là giá gói 1 tháng của học viên SAU KHI đã dùng ưu đãi tháng đầu)
  2390000: 180,  // 6 tháng, giá chuẩn
  3990000: 365,  // 12 tháng, giá chuẩn
  399200: 30,    // 1 tháng, ưu đãi học viên khoá Xây Nhân Hiệu — CHỈ áp dụng ĐÚNG THÁNG ĐẦU TIÊN (xem cờ first_month_discount_used)
  1912000: 180,  // 6 tháng, giá học viên (giảm 20% so với giá chuẩn 2.390.000đ) — áp dụng lâu dài
  3192000: 365,  // 12 tháng, giá học viên (giảm 20% so với giá chuẩn 3.990.000đ) — áp dụng lâu dài
  // Ưu đãi flash-sale 19-20/8 (xem FLASH_SALE_PLANS ở nhan-hieu/js/app-shell.js) — THIẾU 2 dòng này
  // là lý do khách chuyển đúng giá ưu đãi đêm 19/8 vẫn không tự kích hoạt được dù đã fix SEVQR.
  1890000: 180,  // 6 tháng, ưu đãi flash-sale
  2790000: 365,  // 12 tháng, ưu đãi flash-sale
};
// Số tiền coi là "đã dùng ưu đãi tháng đầu" — sau lần này học viên mua gói 1 tháng sẽ trả giá thường.
const FIRST_MONTH_DISCOUNT_AMOUNT = 399200;

// "Mua thêm lượt" — dành cho khách ĐÃ TRẢ PHÍ dùng vượt trần 250 lượt/tháng (xem
// api/_lib/trial-quota.js). Số tiền này KHÔNG được trùng bất kỳ số tiền nào ở AMOUNT_TO_DAYS.
// Cộng thẳng vào paid_ai_bonus của đúng tháng hiện tại, KHÔNG đụng access_until/has_paid.
const AMOUNT_TO_TOPUP_LUOT = {
  150000: 100,
};

function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function extractRefCode(content) {
  const m = /XNH[A-Z0-9]{6}/i.exec(content || '');
  return m ? m[0].toUpperCase() : null;
}

// fetch() mặc định KHÔNG có giới hạn thời gian chờ — nếu Supabase bị kẹt, request có thể treo tới
// tận khi Vercel tự ngắt hàm (300s), khiến SePay coi webhook là timeout và gửi lại giao dịch (retry),
// có nguy cơ xử lý trùng. Đặt trần 12s giống supabaseRpc ở trial-quota.js.
async function supabaseAdmin(path, opts = {}) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    return await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      ...opts,
      headers: {
        'content-type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
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
  if (req.method !== 'POST') { res.status(405).json({ success: false }); return; }

  const expectedKey = process.env.SEPAY_WEBHOOK_APIKEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!expectedKey || !serviceKey) {
    // Chưa cấu hình xong — trả lỗi rõ ràng để dễ debug lúc setup, không âm thầm bỏ qua.
    res.status(500).json({ success: false, error: 'Server chưa cấu hình SEPAY_WEBHOOK_APIKEY hoặc SUPABASE_SERVICE_ROLE_KEY.' });
    return;
  }

  const authHeader = req.headers['authorization'] || '';
  const providedKey = authHeader.replace(/^Apikey\s+/i, '');
  if (!timingSafeEqual(providedKey, expectedKey)) {
    res.status(401).json({ success: false });
    return;
  }

  try {
    const body = req.body || {};
    const {
      id: sepayId, gateway, transactionDate, accountNumber,
      transferAmount, content, transferType,
    } = body;

    // Giao dịch tiền RA thì bỏ qua hoàn toàn, không ghi log (không liên quan đến kích hoạt).
    if (transferType !== 'in') {
      res.status(200).json({ success: true });
      return;
    }

    // Chống xử lý trùng nếu SePay gửi lại cùng 1 giao dịch (retry).
    if (sepayId) {
      const dupCheck = await supabaseAdmin(`sepay_transactions?sepay_id=eq.${sepayId}&select=id`, { prefer: 'return=minimal' });
      const dupRows = dupCheck.ok ? await dupCheck.json() : [];
      if (Array.isArray(dupRows) && dupRows.length > 0) {
        res.status(200).json({ success: true });
        return;
      }
    }

    const refCode = extractRefCode(content);
    let status = 'unmatched_code';
    let matchedProfileId = null;
    let daysGranted = null;
    let topupLuotGranted = null;

    if (refCode) {
      const profResp = await supabaseAdmin(`profiles?ref_code=eq.${refCode}&select=id,access_until,has_paid,paid_ai_uses,paid_ai_month,paid_ai_bonus`);
      const profRows = profResp.ok ? await profResp.json() : [];
      const profile = profRows[0];

      if (profile) {
        const days = AMOUNT_TO_DAYS[transferAmount];
        const topupLuot = AMOUNT_TO_TOPUP_LUOT[transferAmount];
        if (days) {
          const base = (profile.access_until && new Date(profile.access_until).getTime() > Date.now())
            ? new Date(profile.access_until) : new Date();
          const next = new Date(base.getTime() + days * 86400000);
          // has_paid=true tắt hẳn giới hạn lượt AI dùng thử (xem api/_lib/trial-quota.js) — ngay
          // khi khớp được 1 giao dịch thật, không còn giới hạn nào áp dụng nữa.
          const patchBody = { access_until: next.toISOString(), has_paid: true, last_plan_days: days };
          // Ưu đãi tháng đầu chỉ áp dụng đúng 1 lần — đánh dấu đã dùng để lần mua gói 1 tháng sau
          // đó tự động về giá thường (gói 6/12 tháng học viên không bị ảnh hưởng bởi cờ này).
          if (transferAmount === FIRST_MONTH_DISCOUNT_AMOUNT) patchBody.first_month_discount_used = true;
          const updateResp = await supabaseAdmin(`profiles?id=eq.${profile.id}`, {
            method: 'PATCH',
            body: JSON.stringify(patchBody),
          });
          if (updateResp.ok) {
            status = 'matched';
            matchedProfileId = profile.id;
            daysGranted = days;
          } else {
            status = 'unmatched_amount'; // update thất bại, giữ nguyên để admin soát lại
          }
        } else if (topupLuot) {
          // Cộng thẳng vào lượt bonus của THÁNG HIỆN TẠI — nếu profile đang ở tháng cũ (paid_ai_month
          // khác tháng nay) thì coi bonus/uses hiện có là đã hết hạn, cộng lượt mới vào tháng mới.
          const month = new Date().toISOString().slice(0, 7);
          const sameMonth = profile.paid_ai_month === month;
          const patchBody = sameMonth
            ? { paid_ai_bonus: (profile.paid_ai_bonus || 0) + topupLuot }
            : { paid_ai_month: month, paid_ai_uses: 0, paid_ai_bonus: topupLuot };
          const updateResp = await supabaseAdmin(`profiles?id=eq.${profile.id}`, {
            method: 'PATCH',
            body: JSON.stringify(patchBody),
          });
          if (updateResp.ok) {
            status = 'matched';
            matchedProfileId = profile.id;
            topupLuotGranted = topupLuot;
          } else {
            status = 'unmatched_amount';
          }
        } else {
          status = 'unmatched_amount';
        }
      } else {
        status = 'unmatched_code';
      }
    }

    await supabaseAdmin('sepay_transactions', {
      method: 'POST',
      prefer: 'return=minimal',
      body: JSON.stringify({
        sepay_id: sepayId || null,
        gateway: gateway || null,
        transaction_date: transactionDate || null,
        account_number: accountNumber || null,
        transfer_amount: transferAmount || null,
        content: content || null,
        ref_code_found: refCode,
        matched_profile_id: matchedProfileId,
        days_granted: daysGranted,
        topup_luot_granted: topupLuotGranted,
        status,
      }),
    });

    res.status(200).json({ success: true });
  } catch (err) {
    // Luôn trả success:true cho SePay để tránh spam retry — lỗi thật đã được ghi log ở trên
    // (nếu ghi log cũng lỗi thì đây là sự cố hạ tầng, cần xem log Vercel trực tiếp).
    res.status(200).json({ success: true });
  }
};
