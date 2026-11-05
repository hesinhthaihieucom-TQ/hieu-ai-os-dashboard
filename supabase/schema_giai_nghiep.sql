-- 21 Ngày Giải Nghiệp (giai-nghiep/) — schema riêng của app này, chạy SAU supabase/schema_core.sql.
-- Additive/idempotent, chạy lại bao nhiêu lần cũng an toàn. Cột gn_* RIÊNG hoàn toàn với
-- has_paid/access_until (nhan-hieu) và tc_has_paid (tai-chinh) — 1 user có thể trả phí bên này mà chưa
-- trả bên kia. gn_has_paid CHỈ ghi bởi api/sepay-webhook.js (service_role); user không .update() thẳng
-- profiles được (RLS đã khoá, xem schema_core.sql) nên không tự bật cho mình được.
alter table profiles add column if not exists gn_has_paid boolean not null default false;
alter table profiles add column if not exists gn_paid_at timestamptz;

-- Tiến độ + câu trả lời từng ngày. answers: { ex:[3 chuỗi bài tập], jr:[3 chuỗi nhật ký], wk:[4 chuỗi tổng kết tuần] }
-- checklist: mảng boolean theo thứ tự checklist của ngày đó. done_at: lúc ký cam kết (= hoàn thành ngày).
create table if not exists public.gn_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  day int not null check (day between 1 and 21),
  answers jsonb not null default '{}'::jsonb,
  checklist jsonb not null default '[]'::jsonb,
  done_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);
alter table public.gn_progress enable row level security;

drop policy if exists "gn_progress_select_own" on public.gn_progress;
create policy "gn_progress_select_own" on public.gn_progress for select using (auth.uid() = user_id);
drop policy if exists "gn_progress_insert_own" on public.gn_progress;
create policy "gn_progress_insert_own" on public.gn_progress for insert with check (auth.uid() = user_id);
drop policy if exists "gn_progress_update_own" on public.gn_progress;
create policy "gn_progress_update_own" on public.gn_progress for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Admin xem được để hỗ trợ khách (is_admin() từ schema_core.sql).
drop policy if exists "gn_progress_admin_select" on public.gn_progress;
create policy "gn_progress_admin_select" on public.gn_progress for select using (public.is_admin());

-- Đổi tên hiển thị (dùng chung với suc-khoe, create or replace nên chạy lại vô hại).
create or replace function public.update_my_full_name(new_name text)
returns void as $$
begin
  update public.profiles set full_name = new_name where id = auth.uid();
end;
$$ language plpgsql security definer set search_path = public, pg_temp;
grant execute on function public.update_my_full_name(text) to authenticated;
