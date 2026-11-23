// Ladipage "Khoá Huấn Luyện 1:1" (huan-luyen-1-1/lp/) — tạo tài khoản Xây Nhân Hiệu THẲNG từ landing
// page, giống hệt pattern api/nh-lp-signup.js (ladipage tĩnh không có session, tạo qua Admin API rồi
// đọc luôn ref_code trả về cho client dựng mã QR). Khác nh-lp-signup.js ở chỗ: tài khoản tạo ra ở đây
// KHÔNG trả phí app ngay — chỉ kích hoạt free 1 tháng SAU KHI xác nhận đã đóng học phí khoá 1:1 (xem
// api/hl11-status.js), vì học phí khoá 1:1 không phải tiền mua app, "free 1 tháng app" chỉ là quà tặng
// kèm theo khoá học.
const { supabaseAdmin, SUPABASE_URL } = require('./_lib/supabase-admin');

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { full_name, email, password, phone } = req.body || {};
  if (!full_name || !String(full_name).trim()) { res.status(400).json({ error: 'Vui lòng nhập họ tên.' }); return; }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { res.status(400).json({ error: 'Email không hợp lệ.' }); return; }
  if (!password || password.length < 6) { res.status(400).json({ error: 'Mật khẩu cần ít nhất 6 ký tự.' }); return; }
  if (!phone || !/^0\d{9}$/.test(String(phone).replace(/[\s.\-]/g, ''))) { res.status(400).json({ error: 'Số điện thoại Zalo cần đủ 10 số, bắt đầu bằng 0.' }); return; }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) { res.status(500).json({ error: 'Server chưa cấu hình — báo Quỳnh giúp mình.' }); return; }

  let createResp, createData;
  try {
    createResp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({
        email, password, email_confirm: true,
        user_metadata: { full_name: String(full_name).trim(), hl11_phone: String(phone).replace(/[\s.\-]/g, '') },
      }),
    });
    createData = await createResp.json();
  } catch (e) {
    res.status(500).json({ error: 'Không kết nối được server — thử lại giúp mình.' });
    return;
  }

  if (!createResp.ok) {
    const rawMsg = createData.msg || createData.message || createData.error_description || '';
    const msg = /already.*registered|already.*exists|duplicate/i.test(rawMsg)
      ? 'Email này đã có tài khoản Xây Nhân Hiệu rồi — nhắn Zalo trợ lý để được kích hoạt quà tặng thủ công.'
      : (rawMsg || 'Không tạo được tài khoản — thử lại giúp mình.');
    res.status(400).json({ error: msg });
    return;
  }

  const userId = createData.id;
  // Trigger handle_new_user() tạo dòng profiles (kèm ref_code) gần như ngay — vẫn thử lại vài lần
  // phòng khi REST API đọc từ replica bị trễ 1 nhịp (y hệt nh-lp-signup.js).
  let refCode = null;
  for (let i = 0; i < 5 && !refCode; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, 400));
    const profResp = await supabaseAdmin(`profiles?id=eq.${userId}&select=ref_code`);
    const rows = profResp.ok ? await profResp.json() : [];
    if (rows[0] && rows[0].ref_code) refCode = rows[0].ref_code;
  }
  if (!refCode) {
    res.status(200).json({ ok: true, ref_code: null, warn: 'Tài khoản đã tạo nhưng chưa lấy được mã thanh toán ngay — nhắn Zalo trợ lý giúp mình.' });
    return;
  }

  res.status(200).json({ ok: true, ref_code: refCode });
};
