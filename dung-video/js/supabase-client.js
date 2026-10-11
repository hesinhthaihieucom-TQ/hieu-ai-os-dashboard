// Kết nối Supabase — CHUNG project với mọi app khác trong repo (1 tài khoản, nhiều app); URL và
// Publishable (anon) key an toàn để lộ ra client, bảo mật thật nằm ở RLS (supabase/schema_dung_video.sql).
const SUPABASE_URL = 'https://ltcjlnvceuspnwldsbgi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_j0ohsTIc7Df5_dz5vDiniA_nB5jPYWy';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
