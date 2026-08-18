// Serverless function — cho phép admin xoá hẳn 1 tài khoản (dùng cho tài khoản test/rác đăng ký
// trong lúc thử nghiệm) ngay từ mục Quản trị trên web, không cần vào Supabase Dashboard chạy SQL
// tay mỗi lần. Xoá ở auth.users (không phải chỉ xoá dòng profiles) để dọn sạch luôn tài khoản đăng
// nhập — bảng profiles có "on delete cascade" nên tự mất theo, không cần xoá riêng.
//
// Bảo mật: dùng SUPABASE_SERVICE_ROLE_KEY (bỏ qua RLS) vì Admin API của Supabase yêu cầu quyền
// service role — nhưng PHẢI tự xác minh người gọi thực sự là admin trước khi xoá bất kỳ ai, vì
// service role key có toàn quyền, không thể tin endpoint này mở cho ai gọi cũng được.

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
      res.status(403).json({ error: 'Chỉ quản trị viên mới xoá được tài khoản.' });
      return;
    }

    const { user_id } = req.body || {};
    if (!user_id) { res.status(400).json({ error: 'Thiếu user_id.' }); return; }
    if (user_id === callingUser.id) {
      res.status(400).json({ error: 'Không thể tự xoá chính tài khoản admin đang đăng nhập.' });
      return;
    }

    const delResp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user_id}`, {
      method: 'DELETE',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });
    if (!delResp.ok) {
      const detail = await delResp.text();
      res.status(500).json({ error: `Xoá thất bại: ${detail}` });
      return;
    }

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Có lỗi xảy ra khi xoá tài khoản.' });
  }
};
