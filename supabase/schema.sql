-- XÂY NHÂN HIỆU — schema cho Supabase (Postgres).
-- Cách dùng: mở project trên supabase.com → SQL Editor → New query → dán toàn bộ file này → Run.
-- An toàn để chạy lại nhiều lần (dùng "if not exists" / "or replace" ở những chỗ hợp lý).

-- 1. PROFILES — mở rộng thông tin user (auth.users là bảng có sẵn của Supabase Auth)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'student' check (role in ('student', 'admin')),
  created_at timestamptz not null default now()
);

-- Tự động tạo 1 dòng profiles khi có user mới đăng ký
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- 2. ĐỊNH VỊ — kết quả Lượt 1 + Lượt 2, mỗi user 1 bản định vị hiện hành (ghi đè khi làm lại)
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

-- 3. SỬA KÊNH — kết quả audit kênh thật so với định vị (SOI KÊNH AI, 10 hạng mục)
create table if not exists channel_audits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  input jsonb,       -- dữ liệu kênh thật user cung cấp (bio, ảnh mô tả, 5 bài viral...)
  result jsonb,       -- kết quả audit 10 HM + điểm số
  created_at timestamptz not null default now()
);

-- 4. KHO NỘI DUNG CHUNG — do admin quản lý, tất cả học viên đọc được
create table if not exists content_bank_shared (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id),
  title text not null,
  content text not null,
  source_type text,   -- ví dụ: 'case_hoc_vien' | 'xu_huong' | 'quan_diem_nguoc_dong'...
  tags text[],
  created_at timestamptz not null default now()
);

-- 5. KHO NỘI DUNG RIÊNG — mỗi học viên tự nhập content viral/mẫu của họ
create table if not exists content_bank_personal (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text not null,
  source_type text,
  tags text[],
  created_at timestamptz not null default now()
);

-- 6. Ý TƯỞNG — ý tưởng AI sinh ra từ 5 kho nguồn, có thể đánh dấu đã dùng
create table if not exists ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text,   -- 'ca_nhan' | 'case_hoc_vien' | 'cau_hoi_kh' | 'xu_huong' | 'quan_diem_nguoc_dong'
  context text,        -- bối cảnh thêm người dùng nhập khi bấm sinh ý tưởng
  idea_text text not null,
  used boolean not null default false,
  created_at timestamptz not null default now()
);

-- 7. BÀI VIẾT — nội dung AI viết ra từ 1 ý tưởng, theo cấu trúc Hook-Vấn đề-Giá trị-Niềm tin-CTA
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  idea_id uuid references ideas(id) on delete set null,
  title text,
  content text not null,
  structure jsonb,     -- {hook, van_de, gia_tri, niem_tin, cta}
  created_at timestamptz not null default now()
);

-- 8. LỊCH ĐĂNG BÀI — gán bài viết vào ngày + khung giờ
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

-- ================= ROW LEVEL SECURITY =================
alter table profiles enable row level security;
alter table positioning_results enable row level security;
alter table channel_audits enable row level security;
alter table content_bank_shared enable row level security;
alter table content_bank_personal enable row level security;
alter table ideas enable row level security;
alter table posts enable row level security;
alter table calendar_entries enable row level security;

-- profiles: user chỉ xem/sửa được chính mình
drop policy if exists "profiles_self" on profiles;
create policy "profiles_self" on profiles for select using (auth.uid() = id);
drop policy if exists "profiles_self_update" on profiles;
create policy "profiles_self_update" on profiles for update using (auth.uid() = id);

-- helper: kiểm tra user hiện tại có phải admin không
create or replace function is_admin()
returns boolean as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$ language sql stable security definer set search_path = public, pg_temp;

-- các bảng dữ liệu cá nhân: chỉ chủ sở hữu được đọc/ghi
do $$
declare
  t text;
begin
  foreach t in array array['positioning_results','channel_audits','content_bank_personal','ideas','posts','calendar_entries']
  loop
    execute format('drop policy if exists "%1$s_owner_all" on %1$s', t);
    execute format('create policy "%1$s_owner_all" on %1$s for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end $$;

-- kho nội dung chung: mọi user đã đăng nhập đọc được, chỉ admin được ghi
drop policy if exists "content_bank_shared_read" on content_bank_shared;
create policy "content_bank_shared_read" on content_bank_shared for select using (auth.role() = 'authenticated');
drop policy if exists "content_bank_shared_admin_write" on content_bank_shared;
create policy "content_bank_shared_admin_write" on content_bank_shared for all using (is_admin()) with check (is_admin());
