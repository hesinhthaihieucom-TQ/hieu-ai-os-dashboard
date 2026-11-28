// Serverless function — cho admin tra cứu nhanh 1 tài khoản theo email (đăng nhập được chưa, email đã
// xác nhận chưa, lần đăng nhập gần nhất...) ngay từ web, khỏi phải vào Supabase Dashboard chạy SQL tay.
// Chỉ ĐỌC, không sửa/xoá gì — dùng SUPABASE_SERVICE_ROLE_KEY vì cần đọc cả auth.users (REST API thường
// không cho đọc bảng này), nhưng vẫn PHẢI tự xác minh người gọi là admin trước, như admin-delete-user.js.

const { requireUser } = require('./_lib/auth');

const SUPABASE_URL = 'https://ltcjlnvceuspnwldsbgi.supabase.co';

async function fetchWithTimeout(url, opts = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) { res.status(500).json({ error: 'Server chưa cấu hình SUPABASE_SERVICE_ROLE_KEY.' }); return; }

  const callingUser = await requireUser(req);
  if (!callingUser) { res.status(401).json({ error: 'Bạn cần đăng nhập để dùng tính năng này.' }); return; }

  const email = (req.query.email || '').trim();
  if (!email) { res.status(400).json({ error: 'Thiếu email.' }); return; }

  const authHeaders = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };

  try {
    const callerProfResp = await fetchWithTimeout(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${callingUser.id}&select=role`, { headers: authHeaders });
    const callerProfRows = callerProfResp.ok ? await callerProfResp.json() : [];
    if (!callerProfRows[0] || callerProfRows[0].role !== 'admin') {
      res.status(403).json({ error: 'Chỉ quản trị viên mới dùng được tính năng này.' });
      return;
    }

    const profResp = await fetchWithTimeout(
      `${SUPABASE_URL}/rest/v1/profiles?email=ilike.${encodeURIComponent(email)}&select=id,email,full_name,has_paid,access_until,created_at`,
      { headers: authHeaders }
    );
    const profRows = profResp.ok ? await profResp.json() : [];
    if (profRows.length === 0) {
      res.status(200).json({ found: false, message: 'Không tìm thấy tài khoản nào khớp email này trong profiles.' });
      return;
    }

    const results = [];
    for (const prof of profRows) {
      const authResp = await fetchWithTimeout(`${SUPABASE_URL}/auth/v1/admin/users/${prof.id}`, { headers: authHeaders });
      const authData = authResp.ok ? await authResp.json() : null;
      results.push({
        profile: prof,
        auth: authData ? {
          email: authData.email,
          email_confirmed_at: authData.email_confirmed_at,
          last_sign_in_at: authData.last_sign_in_at,
          created_at: authData.created_at,
          banned_until: authData.banned_until,
          app_metadata: authData.app_metadata,
        } : { error: authResp ? `HTTP ${authResp.status}` : 'Không gọi được Admin API' },
      });
    }

    res.status(200).json({ found: true, results });
  } catch (err) {
    if (err.name === 'AbortError') { res.status(504).json({ error: 'Kết nối Supabase quá lâu, thử lại giúp mình.' }); return; }
    res.status(500).json({ error: err.message || 'Có lỗi xảy ra khi tra cứu tài khoản.' });
  }
};
