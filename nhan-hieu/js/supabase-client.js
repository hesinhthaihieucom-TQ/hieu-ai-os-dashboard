// Kết nối Supabase — URL và Publishable (anon) key an toàn để lộ ra client-side,
// bảo mật thật sự nằm ở Row Level Security đã bật trong supabase/schema.sql.
const SUPABASE_URL = 'https://ltcjlnvceuspnwldsbgi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_j0ohsTIc7Df5_dz5vDiniA_nB5jPYWy';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
