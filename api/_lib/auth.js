// Xác thực nhẹ: xác nhận request đến từ 1 user Supabase đã đăng nhập,
// tránh người lạ gọi thẳng API tốn phí Claude. Không cần cài @supabase/supabase-js.

const SUPABASE_URL = 'https://ltcjlnvceuspnwldsbgi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_j0ohsTIc7Df5_dz5vDiniA_nB5jPYWy';

async function requireUser(req) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return null;

  const resp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
  });
  if (!resp.ok) return null;
  return resp.json();
}

module.exports = { requireUser };
