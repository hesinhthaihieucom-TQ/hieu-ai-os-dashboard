-- CHỈ sửa 2 bảng của app Hiểu Để Khoẻ Mạnh (suc-khoe/) — không đụng schema app nào khác.
-- Lỗi gặp phải: "Could not find the 'survey_insulin' column of 'sk_health_checkins'" — do bảng này đã
-- được tạo từ trước (cấu trúc cũ: flagged_issues/note), nên lần chạy trước bỏ qua không thêm cột mới.
-- File này dùng ALTER ADD COLUMN IF NOT EXISTS nên an toàn chạy lại nhiều lần, kể cả trên bảng đã có
-- dữ liệu. Chạy 1 lần: Supabase → SQL Editor → New query → dán toàn bộ → Run.

create table if not exists sk_health_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table sk_health_checkins add column if not exists survey_insulin text[] not null default '{}';
alter table sk_health_checkins add column if not exists survey_toxin text[] not null default '{}';
alter table sk_health_checkins add column if not exists survey_metabolic text[] not null default '{}';
alter table sk_health_checkins add column if not exists updated_at timestamptz not null default now();
alter table sk_health_checkins enable row level security;
drop policy if exists "sk_health_checkins_owner_all" on sk_health_checkins;
create policy "sk_health_checkins_owner_all" on sk_health_checkins for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
do $$
begin
  delete from sk_health_checkins a using sk_health_checkins b
    where a.user_id = b.user_id and a.id < b.id; -- gom về 1 dòng/user trước khi thêm unique bên dưới
  if not exists (select 1 from pg_constraint where conname = 'sk_health_checkins_user_id_key') then
    alter table sk_health_checkins add constraint sk_health_checkins_user_id_key unique (user_id);
  end if;
end $$;

create table if not exists sk_weekly_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table sk_weekly_logs add column if not exists metrics jsonb not null default '{}'::jsonb;
alter table sk_weekly_logs add column if not exists updated_at timestamptz not null default now();
alter table sk_weekly_logs enable row level security;
drop policy if exists "sk_weekly_logs_owner_all" on sk_weekly_logs;
create policy "sk_weekly_logs_owner_all" on sk_weekly_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
do $$
begin
  delete from sk_weekly_logs a using sk_weekly_logs b
    where a.user_id = b.user_id and a.id < b.id;
  if not exists (select 1 from pg_constraint where conname = 'sk_weekly_logs_user_id_key') then
    alter table sk_weekly_logs add constraint sk_weekly_logs_user_id_key unique (user_id);
  end if;
end $$;
