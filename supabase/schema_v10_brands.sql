-- XÂY NHÂN HIỆU — migration v10: 1 người có thể có NHIỀU thương hiệu/tên sản phẩm khác nhau
-- (ví dụ: Hiểu Hạnh, Hiểu Mạnh, Hiểu Kênh tuỳ content) — thay cho cột brand_name đơn lẻ ở v9.
-- Chạy 1 lần trong Supabase SQL Editor. An toàn để chạy lại nhiều lần.
-- Cột profiles.brand_name (từ schema_v9) không còn được dùng nữa nhưng vẫn giữ nguyên, không xoá.

create table if not exists brands (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
alter table brands enable row level security;
drop policy if exists "brands_owner_all" on brands;
create policy "brands_owner_all" on brands for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
