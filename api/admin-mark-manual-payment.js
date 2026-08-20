// Serverless function — cho phép admin ghi nhận 1 khoản chuyển khoản đã kích hoạt TAY (vd webhook
// SePay lỗi/chưa khớp được) vào bảng sepay_transactions với status='matched', để nó được TÍNH VÀO
// doanh thu hiển thị ở Quản trị — trước đây kích hoạt tay qua "Gia hạn"/"Đánh dấu đã trả phí" không
// tạo dòng nào ở sepay_transactions cả, nên doanh thu tổng/tháng luôn thiếu các khoản này.
//
// Bảo mật: dùng SUPABASE_SERVICE_ROLE_KEY vì sepay_transactions chỉ cho phép service_role ghi (xem
// RLS trong supabase/schema_full.sql) — nhưng PHẢI tự xác minh người gọi thực sự là admin trước.

const { requireUser } = require('./_lib/auth');

const SUPABASE_URL = 'https://ltcjlnvceuspnwldsbgi.supabase.co';

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    res.status(500).json({ error: 'Server chưa cấu hình SUPABASE_SERVICE_ROLE_KEY.' });
    return;
  }

  const callingUser = await requireUser(req);
  if (!callingUser) { res.status(401).json({ error: 'Bạn cần đăng nhập để dùng tính năng này.' }); return; }

  try {
    const profResp = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${callingUser.id}&select=role`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });
    const profRows = profResp.ok ? await profResp.json() : [];
    if (!profRows[0] || profRows[0].role !== 'admin') {
      res.status(403).json({ error: 'Chỉ quản trị viên mới ghi nhận được doanh thu.' });
      return;
    }

    const { user_id, amount, days } = req.body || {};
    if (!user_id) { res.status(400).json({ error: 'Thiếu user_id.' }); return; }
    const transferAmount = Number(amount);
    if (!transferAmount || transferAmount <= 0) { res.status(400).json({ error: 'Số tiền không hợp lệ.' }); return; }

    const insertResp = await fetch(`${SUPABASE_URL}/rest/v1/sepay_transactions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        gateway: 'manual',
        transaction_date: new Date().toISOString(),
        transfer_amount: transferAmount,
        content: 'Kích hoạt tay bởi admin',
        matched_profile_id: user_id,
        days_granted: days ? Number(days) : null,
        status: 'matched',
      }),
    });
    if (!insertResp.ok) {
      const detail = await insertResp.text();
      res.status(500).json({ error: `Ghi nhận thất bại: ${detail}` });
      return;
    }

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Có lỗi xảy ra khi ghi nhận doanh thu.' });
  }
};
