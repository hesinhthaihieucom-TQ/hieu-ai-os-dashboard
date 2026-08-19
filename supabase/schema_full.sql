-- XÂY NHÂN HIỆU — SCHEMA ĐẦY ĐỦ, GỘP TỪ TOÀN BỘ schema.sql + schema_v2..v15 (trừ v14, đã lỗi thời).
-- Đây là bản DUY NHẤT cần chạy — thay cho việc phải chạy lần lượt từng file migration cũ.
-- An toàn để chạy TOÀN BỘ file này bất kỳ lúc nào, kể cả khi DB đã có sẵn 1 phần dữ liệu:
-- mọi lệnh đều dùng "if not exists"/"or replace" nên KHÔNG xoá bảng, KHÔNG xoá dữ liệu đã có,
-- chỉ tạo thêm những gì còn thiếu. Cách dùng: Supabase → SQL Editor → New query → dán toàn bộ → Run.

-- ============================================================
-- 1. PROFILES
-- ============================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'student' check (role in ('student', 'admin')),
  created_at timestamptz not null default now()
);
alter table profiles add column if not exists email text;
alter table profiles add column if not exists access_until timestamptz;
alter table profiles add column if not exists ref_code text;
alter table profiles add column if not exists channel_handle text;
alter table profiles add column if not exists brand_name text; -- cũ (v9), không còn dùng ở UI nhưng vẫn giữ cột, xem bảng "brands"
alter table profiles add column if not exists onboarding_seen boolean not null default false;
-- Học viên khoá Xây Nhân Hiệu được giảm 20% ở gói 6/12 tháng (lâu dài) và gói 1 tháng (chỉ tháng
-- đầu tiên — xem cột first_month_discount_used) so với giá thường.
alter table profiles add column if not exists is_student boolean not null default false;
-- Đánh dấu học viên đã dùng ưu đãi 1 tháng đầu (399.200đ) chưa — dùng rồi thì các lần mua gói 1
-- tháng sau đó về giá thường 499.000đ, không lặp lại ưu đãi này (gói 6/12 tháng không bị ảnh hưởng).
alter table profiles add column if not exists first_month_discount_used boolean not null default false;
-- Giới hạn lượt dùng AI trong thời gian DÙNG THỬ (chưa thanh toán lần nào) — xem api/_lib/trial-quota.js.
-- has_paid được đánh dấu true bởi api/sepay-webhook.js ngay khi khớp được 1 giao dịch thành công.
alter table profiles add column if not exists has_paid boolean not null default false;
alter table profiles add column if not exists trial_ai_uses integer not null default 0;

update profiles p set email = u.email from auth.users u where p.id = u.id and p.email is null;

create or replace function public.generate_ref_code()
returns text as $$
begin
  return 'XNH' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
end;
$$ language plpgsql set search_path = public, pg_temp;

update profiles set ref_code = generate_ref_code() where ref_code is null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_ref_code_unique') then
    alter table profiles add constraint profiles_ref_code_unique unique (ref_code);
  end if;
end $$;

-- Trigger tạo profile khi có user mới đăng ký: lưu email, cấp 7 ngày dùng thử, sinh ref_code,
-- và lưu luôn is_student (hỏi ngay lúc đăng ký) — dùng để quyết định hiển thị bảng giá nào ở
-- màn hình thanh toán, không hỏi lại lúc đó nữa.
-- LƯU Ý: từng rút xuống 3 ngày (2026-08-19) để giảm rủi ro chi phí AI trong lúc dùng thử, nhưng sau
-- khi thêm giới hạn lượt AI (api/_lib/trial-quota.js) thì chi phí đã được chặn bởi số LƯỢT chứ
-- không còn phụ thuộc số NGÀY nữa — trả lại 7 ngày để khách có đủ thời gian cân nhắc mua mà không
-- phát sinh thêm rủi ro chi phí (dùng hết lượt trong 1 ngày hay trải đều 7 ngày thì chi phí như nhau).
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, access_until, ref_code, is_student)
  values (
    new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), new.email, now() + interval '7 days',
    public.generate_ref_code(), coalesce((new.raw_user_meta_data->>'is_student')::boolean, false)
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

create or replace function public.is_admin()
returns boolean as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$ language sql stable security definer set search_path = public, pg_temp;

-- update_my_channel_handle: user tự sửa ĐÚNG 2 cột channel_handle + brand_name của CHÍNH mình,
-- không đụng được access_until/role dù gọi thế nào. Xoá hết các overload cũ trước khi tạo lại,
-- vì Postgres giữ song song nhiều overload cùng tên sẽ khiến PostgREST không biết gọi bản nào.
drop function if exists public.update_my_channel_handle(text);
drop function if exists public.update_my_channel_handle(text, text);
create or replace function public.update_my_channel_handle(new_handle text, new_brand text default null)
returns void as $$
begin
  update public.profiles set channel_handle = new_handle, brand_name = coalesce(new_brand, brand_name) where id = auth.uid();
end;
$$ language plpgsql security definer set search_path = public, pg_temp;
grant execute on function public.update_my_channel_handle(text, text) to authenticated;

create or replace function public.mark_onboarding_seen()
returns void as $$
begin
  update public.profiles set onboarding_seen = true where id = auth.uid();
end;
$$ language plpgsql security definer set search_path = public, pg_temp;
grant execute on function public.mark_onboarding_seen() to authenticated;

-- ============================================================
-- 2. ĐỊNH VỊ
-- ============================================================
create table if not exists positioning_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  answers jsonb,
  luot1 jsonb,
  luot2 jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists positioning_results_user_unique on positioning_results(user_id);
alter table positioning_results add column if not exists format_suggestions jsonb;
alter table positioning_results add column if not exists chosen_formats jsonb not null default '[]'::jsonb;
-- Ghi lại bài/hook nào trong Kho đang được dùng làm "giọng mẫu" hiện tại (nút "Dùng làm giọng mẫu")
-- — để hiện đúng dấu "✓ Đang là giọng mẫu" trên đúng mục đó, tránh hiểu nhầm mọi mục đều bấm được
-- như nhau trong khi thực ra chỉ 1 giọng đang áp dụng tại 1 thời điểm (chọn mới sẽ thay thế cũ).
alter table positioning_results add column if not exists voice_sample_source_table text;
alter table positioning_results add column if not exists voice_sample_source_id uuid;

-- ============================================================
-- 3. SỬA KÊNH
-- ============================================================
create table if not exists channel_audits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  input jsonb,
  result jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 4. KHO NỘI DUNG CHUNG + RIÊNG
-- ============================================================
create table if not exists content_bank_shared (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id),
  title text not null,
  content text not null,
  source_type text,
  tags text[],
  created_at timestamptz not null default now()
);
alter table content_bank_shared add column if not exists pin_order integer;

create table if not exists content_bank_personal (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text not null,
  source_type text,
  tags text[],
  created_at timestamptz not null default now()
);

-- ============================================================
-- 5. Ý TƯỞNG, BÀI VIẾT, LỊCH ĐĂNG BÀI
-- ============================================================
create table if not exists ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text,
  context text,
  idea_text text not null,
  used boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  idea_id uuid references ideas(id) on delete set null,
  title text,
  content text not null,
  structure jsonb,
  created_at timestamptz not null default now()
);
-- Trục nội dung kế thừa từ bài/hook gốc trong Kho Content khi viết lại từ đó — dùng để nhóm
-- "Bài đã viết" theo trục cho dễ tìm, giống cách Kho Content Viral đang nhóm. Bài viết từ ý
-- tưởng mới (không xuất phát từ Kho) sẽ không có tags, xếp vào nhóm "Chưa phân loại".
alter table posts add column if not exists tags text[];
-- Ghi lại bài viết này bắt nguồn từ mục nào trong Kho Content/Kho Hook (nếu có) — dùng để hiện
-- dấu "✓ Đã dùng viết bài N lần" ngay trên mục đó trong Kho, biết được hook/bài mẫu nào mình đã
-- dùng rồi. source_table là 1 trong: posts, content_bank_personal, content_bank_shared,
-- hooks_bank_personal, hooks_bank_shared — không dùng khoá ngoại thật vì trỏ tới nhiều bảng khác nhau.
alter table posts add column if not exists source_table text;
alter table posts add column if not exists source_id uuid;

create table if not exists calendar_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid references posts(id) on delete set null,
  scheduled_date date not null,
  slot text not null check (slot in ('sang', 'trua', 'toi')),
  title text,
  format text,
  cta text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 6. KHO HOOK + CHẤM ĐIỂM
-- ============================================================
create table if not exists hooks_bank_personal (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  hook_text text not null,
  category text,
  note text,
  created_at timestamptz not null default now()
);
-- Trục nội dung do người dùng tự chọn khi thêm hook vào Kho của tôi — dùng để nhóm theo trục,
-- càng lưu nhiều hook càng dễ tìm lại đúng loại cần dùng.
alter table hooks_bank_personal add column if not exists tags text[];

create table if not exists hooks_bank_shared (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id),
  hook_text text not null,
  category text,
  note text,
  created_at timestamptz not null default now()
);
alter table hooks_bank_shared add column if not exists tags text[];

create table if not exists content_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content_text text not null,
  result jsonb,
  created_at timestamptz not null default now()
);

create table if not exists hook_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  hook_text text not null,
  result jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 7. TÀI SẢN QUẢNG BÁ + THƯƠNG HIỆU
-- ============================================================
create table if not exists promo_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  url text,
  kind text, -- 'san_pham_so' | 'khoa_hoc' | 'aff_nguoi_khac' | 'aff_cua_toi' | 'cong_dong' | 'khac'
  created_at timestamptz not null default now()
);

create table if not exists brands (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 8. THANH TOÁN (SePay)
-- ============================================================
create table if not exists sepay_transactions (
  id uuid primary key default gen_random_uuid(),
  sepay_id bigint unique,
  gateway text,
  transaction_date text,
  account_number text,
  transfer_amount bigint,
  content text,
  ref_code_found text,
  matched_profile_id uuid references profiles(id) on delete set null,
  days_granted integer,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
-- Nếu bảng đã tồn tại từ trước (thiếu on delete set null), sửa lại constraint để sau này xoá
-- 1 profile (vd tài khoản test) không bị chặn bởi lịch sử giao dịch cũ — chỉ mất liên kết, vẫn
-- giữ nguyên dữ liệu giao dịch (transfer_amount, ref_code_found...) làm lịch sử đối soát.
do $$
begin
  if exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'sepay_transactions_matched_profile_id_fkey'
      and table_name = 'sepay_transactions'
  ) then
    alter table sepay_transactions drop constraint sepay_transactions_matched_profile_id_fkey;
  end if;
  alter table sepay_transactions add constraint sepay_transactions_matched_profile_id_fkey
    foreign key (matched_profile_id) references profiles(id) on delete set null;
end $$;

-- ============================================================
-- 9. ROW LEVEL SECURITY
-- ============================================================
alter table profiles enable row level security;
alter table positioning_results enable row level security;
alter table channel_audits enable row level security;
alter table content_bank_shared enable row level security;
alter table content_bank_personal enable row level security;
alter table ideas enable row level security;
alter table posts enable row level security;
alter table calendar_entries enable row level security;
alter table hooks_bank_personal enable row level security;
alter table hooks_bank_shared enable row level security;
alter table content_scores enable row level security;
alter table hook_scores enable row level security;
alter table promo_assets enable row level security;
alter table brands enable row level security;
alter table sepay_transactions enable row level security;

-- profiles: user tự xem được chính mình; KHÔNG có quyền tự update (phải qua RPC ở trên) —
-- nếu không, ai đăng nhập cũng tự set access_until/role của chính họ qua console trình duyệt.
drop policy if exists "profiles_self" on profiles;
create policy "profiles_self" on profiles for select using (auth.uid() = id);
drop policy if exists "profiles_self_update" on profiles; -- cố ý KHÔNG tạo lại — đã khoá từ v3
drop policy if exists "profiles_admin_update" on profiles;
create policy "profiles_admin_update" on profiles for update using (is_admin()) with check (is_admin());
drop policy if exists "profiles_admin_read_all" on profiles;
create policy "profiles_admin_read_all" on profiles for select using (is_admin());

-- các bảng dữ liệu cá nhân: chỉ chủ sở hữu được đọc/ghi
do $$
declare
  t text;
begin
  foreach t in array array[
    'positioning_results','channel_audits','content_bank_personal','ideas','posts','calendar_entries',
    'hooks_bank_personal','content_scores','hook_scores','promo_assets','brands'
  ]
  loop
    execute format('drop policy if exists "%1$s_owner_all" on %1$s', t);
    execute format('create policy "%1$s_owner_all" on %1$s for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end $$;

-- kho chung (content + hook): mọi user đã đăng nhập đọc được, chỉ admin được ghi
drop policy if exists "content_bank_shared_read" on content_bank_shared;
create policy "content_bank_shared_read" on content_bank_shared for select using (auth.role() = 'authenticated');
drop policy if exists "content_bank_shared_admin_write" on content_bank_shared;
create policy "content_bank_shared_admin_write" on content_bank_shared for all using (is_admin()) with check (is_admin());

drop policy if exists "hooks_bank_shared_read" on hooks_bank_shared;
create policy "hooks_bank_shared_read" on hooks_bank_shared for select using (auth.role() = 'authenticated');
drop policy if exists "hooks_bank_shared_admin_write" on hooks_bank_shared;
create policy "hooks_bank_shared_admin_write" on hooks_bank_shared for all using (is_admin()) with check (is_admin());

-- sepay_transactions: chỉ admin đọc được trong app; webhook ghi bằng service role key (bỏ qua RLS)
drop policy if exists "sepay_transactions_admin_read" on sepay_transactions;
create policy "sepay_transactions_admin_read" on sepay_transactions for select using (is_admin());

-- ============================================================
-- 10. BACKFILL DỮ LIỆU CŨ (an toàn chạy lại nhiều lần — chỉ đụng dòng còn thiếu dữ liệu)
-- ============================================================

-- Ghim 3 bài cố định lên đầu Kho Content chung
update content_bank_shared set pin_order = 1 where title = 'DẤU HIỆU MỘT GIA ĐÌNH ĐANG CÓ PHÚC KHÍ';
update content_bank_shared set pin_order = 2 where title = 'CHỈ CẦN BẠN DÁM KẾT THÚC NGHIỆT DUYÊN THÌ LẬP TỨC CÓ THỂ ĐỔI MỆNH';
update content_bank_shared set pin_order = 3 where title = 'BỐN BƯỚC TÍCH SẢN DÀNH CHO NGƯỜI ĐANG CÓ NỢ';

-- Gắn trục nội dung (tags) cho hook cũ trong Kho Hook chung chưa có tags, theo từ khoá trong hook_text
update hooks_bank_shared set tags = array['tai_chinh']
where tags is null and (
  hook_text ilike '%tiền%' or hook_text ilike '%tài chính%' or hook_text ilike '%tiết kiệm%'
  or hook_text ilike '%thu nhập%' or hook_text ilike '%nợ%' or hook_text ilike '%sao kê%' or hook_text ilike '%đầu tư%'
);
update hooks_bank_shared set tags = array['tam_linh']
where tags is null and (
  hook_text ilike '%tâm linh%' or hook_text ilike '%phong thuỷ%' or hook_text ilike '%phong thủy%'
  or hook_text ilike '%nhân quả%' or hook_text ilike '%phước%' or hook_text ilike '%phúc%' or hook_text ilike '%nghiệp%'
  or hook_text ilike '%gia tiên%' or hook_text ilike '%vận%'
);
update hooks_bank_shared set tags = array['hon_nhan_gia_dinh']
where tags is null and (
  hook_text ilike '%hôn nhân%' or hook_text ilike '%chồng%' or hook_text ilike '%vợ%'
  or hook_text ilike '%con cái%' or hook_text ilike '%gia đình%' or hook_text ilike '%cha mẹ%' or hook_text ilike '%con dâu%'
);
update hooks_bank_shared set tags = array['kinh_doanh']
where tags is null and (
  hook_text ilike '%kinh doanh%' or hook_text ilike '%bán hàng%' or hook_text ilike '%khách hàng%'
  or hook_text ilike '%doanh thu%' or hook_text ilike '%lợi nhuận%'
);
update hooks_bank_shared set tags = array['suc_khoe_lam_dep']
where tags is null and (
  hook_text ilike '%sức khoẻ%' or hook_text ilike '%sức khỏe%' or hook_text ilike '%da%'
  or hook_text ilike '%cân nặng%' or hook_text ilike '%ngủ%' or hook_text ilike '%bác sĩ%'
);
update hooks_bank_shared set tags = array['xay_kenh']
where tags is null and (
  hook_text ilike '%kênh%' or hook_text ilike '%content%' or hook_text ilike '%video%'
  or hook_text ilike '%follow%' or hook_text ilike '%đăng bài%' or hook_text ilike '%facebook%'
);
update hooks_bank_shared set tags = array['phat_trien_ban_than'] where tags is null;

-- Backfill email cho tài khoản đã tồn tại từ trước khi có cột email
update profiles p set email = u.email from auth.users u where p.id = u.id and p.email is null;

-- ============================================================
-- 9. ĐỀ XUẤT NỘI DUNG TỪ "KHO CỦA TÔI" LÊN KHO CHUNG (cần admin duyệt)
-- ============================================================
-- Người dùng thêm 1 mục vào Kho của tôi có thể chọn đề xuất đẩy lên Kho chung để mọi người cùng
-- dùng — không vào thẳng Kho chung mà phải qua duyệt của admin (mục Quản trị Kho nội dung) trước,
-- tránh nội dung kém chất lượng/spam lọt vào kho chung.
alter table content_bank_personal add column if not exists share_status text check (share_status in ('pending','approved','rejected'));
alter table content_bank_personal add column if not exists reviewed_at timestamptz;
alter table hooks_bank_personal add column if not exists share_status text check (share_status in ('pending','approved','rejected'));
alter table hooks_bank_personal add column if not exists reviewed_at timestamptz;

-- Khi thêm vào Kho của tôi, hỏi luôn đây có phải nội dung đang viral bạn sưu tầm được không (và
-- view/like nếu có) — admin cần thấy đúng số liệu này để quyết định duyệt lên Kho chung hay không.
-- Lưu view/like dạng text vì người dùng hay nhập ước lượng ("15k", "khoảng 2 triệu").
alter table content_bank_personal add column if not exists is_viral boolean;
alter table content_bank_personal add column if not exists viral_views text;
alter table content_bank_personal add column if not exists viral_likes text;
alter table hooks_bank_personal add column if not exists is_viral boolean;
alter table hooks_bank_personal add column if not exists viral_views text;
alter table hooks_bank_personal add column if not exists viral_likes text;

-- Admin cần đọc/duyệt được đề xuất của MỌI người dùng, không chỉ của chính mình — policy owner_all
-- hiện tại chỉ cho chủ sở hữu, nên thêm 2 policy riêng cho admin (RLS cộng dồn theo kiểu OR).
drop policy if exists "content_bank_personal_admin_read" on content_bank_personal;
create policy "content_bank_personal_admin_read" on content_bank_personal for select using (is_admin());
drop policy if exists "content_bank_personal_admin_update" on content_bank_personal;
create policy "content_bank_personal_admin_update" on content_bank_personal for update using (is_admin()) with check (is_admin());

drop policy if exists "hooks_bank_personal_admin_read" on hooks_bank_personal;
create policy "hooks_bank_personal_admin_read" on hooks_bank_personal for select using (is_admin());
drop policy if exists "hooks_bank_personal_admin_update" on hooks_bank_personal;
create policy "hooks_bank_personal_admin_update" on hooks_bank_personal for update using (is_admin()) with check (is_admin());
