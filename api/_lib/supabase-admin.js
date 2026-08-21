// Gọi thẳng Supabase REST bằng SUPABASE_SERVICE_ROLE_KEY (bỏ qua RLS) — dùng cho các tác vụ hệ
// thống không gắn với 1 phiên đăng nhập cụ thể (cron, webhook). Cùng pattern với supabaseAdmin() ở
// api/sepay-webhook.js, tách riêng ra đây để dùng chung cho các file server mới (cron gửi thông
// báo) mà không phải copy lại — không sửa sepay-webhook.js vì nó đã hoạt động ổn định, tách file
// khác đỡ rủi ro hơn refactor lại chỗ đang chạy thật.
const SUPABASE_URL = 'https://ltcjlnvceuspnwldsbgi.supabase.co';

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

module.exports = { supabaseAdmin, SUPABASE_URL };
