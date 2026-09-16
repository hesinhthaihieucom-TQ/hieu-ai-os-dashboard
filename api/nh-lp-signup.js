// Tạo tài khoản Xây Nhân Hiệu THẲNG từ Landing Page bán hàng (nhan-hieu/lp/) — cùng mục đích và
// đúng pattern đã dùng cho api/tc-lp-signup.js (chị Quỳnh yêu cầu 2026-09-16 cho tai-chinh, áp dụng
// tương tự cho nhan-hieu): gõ thông tin xong ra ngay mã QR thanh toán, không cần chuyển qua màn hình
// app trước. Landing page là trang tĩnh KHÔNG có phiên đăng nhập, nên không dùng
// supabaseClient.auth.signUp() bình thường của app được (client cần đọc lại profiles.ref_code ngay
// sau đó qua RLS mà RLS yêu cầu đã có session) — thay vào đó tạo qua Admin API (service role, bỏ qua
// RLS) NGAY TẠI SERVER, đọc luôn ref_code trả về cho client dựng mã QR. email_confirm:true để kích
// hoạt được ngay (không bắt khách xác nhận email mới thanh toán được).
const { supabaseAdmin, SUPABASE_URL } = require('./_lib/supabase-admin');

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { full_name, email, password, ref } = req.body || {};
  if (!full_name || !String(full_name).trim()) { res.status(400).json({ error: 'Vui lòng nhập họ tên.' }); return; }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { res.status(400).json({ error: 'Email không hợp lệ.' }); return; }
  if (!password || password.length < 6) { res.status(400).json({ error: 'Mật khẩu cần ít nhất 6 ký tự.' }); return; }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) { res.status(500).json({ error: 'Server chưa cấu hình — báo Quỳnh giúp mình.' }); return; }

  let createResp, createData;
  try {
    createResp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({
        email, password, email_confirm: true,
        user_metadata: { full_name: String(full_name).trim(), referred_by_ref_code: ref || null },
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
      ? 'Email này đã có tài khoản Xây Nhân Hiệu rồi — vào app và đăng nhập để lấy mã thanh toán.'
      : (rawMsg || 'Không tạo được tài khoản — thử lại giúp mình.');
    res.status(400).json({ error: msg });
    return;
  }

  const userId = createData.id;
  // Trigger handle_new_user() tạo dòng profiles (kèm ref_code) trong CÙNG transaction lúc tạo user
  // nên gần như có ngay — vẫn thử lại vài lần phòng khi REST API đọc từ replica bị trễ 1 nhịp, tránh
  // báo lỗi oan trong khi tài khoản đã tạo thành công thật.
  let refCode = null;
  for (let i = 0; i < 5 && !refCode; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, 400));
    const profResp = await supabaseAdmin(`profiles?id=eq.${userId}&select=ref_code`);
    const rows = profResp.ok ? await profResp.json() : [];
    if (rows[0] && rows[0].ref_code) refCode = rows[0].ref_code;
  }
  if (!refCode) {
    res.status(200).json({ ok: true, ref_code: null, warn: 'Tài khoản đã tạo nhưng chưa lấy được mã thanh toán ngay — vào app đăng nhập lại để lấy mã QR giúp mình.' });
    return;
  }

  res.status(200).json({ ok: true, ref_code: refCode });
};
