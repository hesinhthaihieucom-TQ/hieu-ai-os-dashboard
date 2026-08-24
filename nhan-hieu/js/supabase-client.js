// Kết nối Supabase — URL và Publishable (anon) key an toàn để lộ ra client-side,
// bảo mật thật sự nằm ở Row Level Security đã bật trong supabase/schema_full.sql.
const SUPABASE_URL = 'https://ltcjlnvceuspnwldsbgi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_j0ohsTIc7Df5_dz5vDiniA_nB5jPYWy';

// fetch() bên trong supabase-js mặc định KHÔNG có giới hạn thời gian chờ — mạng chập chờn trên di
// động hoặc Supabase bị chậm/quá tải (thực tế gặp 2026-08-24, xem status.supabase.com) khiến MỌI
// truy vấn ở BẤT KỲ module nào có thể treo VÔ THỜI HẠN, không riêng gì mấy chỗ đã vá timeout tay
// (app-shell.js, lich-dang.js) — đúng hiện tượng "quay quay không vào được" vẫn tái diễn ở module
// khác dù đã vá vài chỗ. Sửa TẬN GỐC 1 LẦN ở đây bằng cách tiêm 1 fetch tuỳ biến có timeout vào
// TOÀN BỘ client Supabase — mọi truy vấn (select/insert/update/delete/auth) từ MỌI module đều tự
// động được bảo vệ, không cần sửa tay từng chỗ gọi ctx.supabase.
//
// QUAN TRỌNG: khi timeout, KHÔNG được để fetch() ném lỗi (reject) thẳng ra — supabase-js sẽ coi đó
// là lỗi mạng và NÉM LỖI tiếp lên trên, trong khi hầu hết code trong app đang gọi kiểu
// `const {data,error} = await ctx.supabase...` KHÔNG bọc try/catch (mặc định supabase-js không throw,
// chỉ trả {error}) — nếu để throw thật sẽ làm nhiều chỗ crash thay vì xử lý lỗi êm như bình thường.
// Nên khi hết giờ, trả về 1 Response giả dạng lỗi (như server trả lỗi bình thường) thay vì để fetch
// tự reject — supabase-js parse y hệt mọi lỗi API khác, giữ đúng hành vi "không throw" toàn app.
function supabaseFetchWithTimeout(url, options){
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  return fetch(url, { ...options, signal: controller.signal })
    .catch(() => new Response(
      JSON.stringify({ message: 'Kết nối mạng chậm/không ổn định, thử lại giúp mình.', error: 'timeout', error_description: 'Kết nối mạng chậm/không ổn định, thử lại giúp mình.' }),
      { status: 504, headers: { 'content-type': 'application/json' } }
    ))
    .finally(() => clearTimeout(timer));
}

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: { fetch: supabaseFetchWithTimeout },
});
