-- XÂY NHÂN HIỆU — migration v2: Kho Hook + Chấm điểm Content + Chấm điểm Hook.
-- Chạy SAU khi đã chạy supabase/schema.sql. Cách dùng: SQL Editor → New query → dán → Run.

-- KHO HOOK RIÊNG — mỗi học viên tự nhập hook họ thấy hay/đã dùng
create table if not exists hooks_bank_personal (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  hook_text text not null,
  category text,   -- 'noi_dau' | 'su_that_nguoc' | 'canh_bao' | 'ket_qua_mong_muon' | 'tu_khoa_kich_hoat'
  note text,
  created_at timestamptz not null default now()
);

-- KHO HOOK CHUNG — do admin quản lý, tất cả học viên đọc được
create table if not exists hooks_bank_shared (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id),
  hook_text text not null,
  category text,
  note text,
  created_at timestamptz not null default now()
);

-- CHẤM ĐIỂM CONTENT — lịch sử chấm bài
create table if not exists content_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content_text text not null,
  result jsonb,
  created_at timestamptz not null default now()
);

-- CHẤM ĐIỂM HOOK — lịch sử chấm hook
create table if not exists hook_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  hook_text text not null,
  result jsonb,
  created_at timestamptz not null default now()
);

alter table hooks_bank_personal enable row level security;
alter table hooks_bank_shared enable row level security;
alter table content_scores enable row level security;
alter table hook_scores enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['hooks_bank_personal','content_scores','hook_scores']
  loop
    execute format('drop policy if exists "%1$s_owner_all" on %1$s', t);
    execute format('create policy "%1$s_owner_all" on %1$s for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end $$;

drop policy if exists "hooks_bank_shared_read" on hooks_bank_shared;
create policy "hooks_bank_shared_read" on hooks_bank_shared for select using (auth.role() = 'authenticated');
drop policy if exists "hooks_bank_shared_admin_write" on hooks_bank_shared;
create policy "hooks_bank_shared_admin_write" on hooks_bank_shared for all using (is_admin()) with check (is_admin());
