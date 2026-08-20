// Xác thực nhẹ: xác nhận request đến từ 1 user Supabase đã đăng nhập,
// tránh người lạ gọi thẳng API tốn phí Claude. Không cần cài @supabase/supabase-js.

const SUPABASE_URL = 'https://ltcjlnvceuspnwldsbgi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_j0ohsTIc7Df5_dz5vDiniA_nB5jPYWy';

// fetch() này trước đây KHÔNG có giới hạn thời gian chờ — đây là lệnh gọi ĐẦU TIÊN của MỌI endpoint
// AI (chạy trước cả bước kiểm tra lượt), nên nếu nó bị kẹt (Supabase Auth chậm/quá tải), request sẽ
// treo ngay từ bước xác thực, trước khi kịp làm gì khác. Đặt trần 12s giống supabaseRpc ở
// trial-quota.js — hết giờ thì coi như chưa xác thực được (trả null), không để treo vô thời hạn.
async function requireUser(req) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const resp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
      signal: controller.signal,
    });
    if (!resp.ok) return null;
    return await resp.json();
  } catch (e) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { requireUser };
