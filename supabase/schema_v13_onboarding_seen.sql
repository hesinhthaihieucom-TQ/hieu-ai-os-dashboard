-- XÂY NHÂN HIỆU — migration v13: đánh dấu đã xem hướng dẫn onboarding ở cấp TÀI KHOẢN
-- (không phải cấp trình duyệt/localStorage) — để dù đổi máy/xoá cache vẫn không hiện lại.
-- Chạy 1 lần trong Supabase SQL Editor. An toàn để chạy lại nhiều lần.

alter table profiles add column if not exists onboarding_seen boolean not null default false;

create or replace function public.mark_onboarding_seen()
returns void as $$
begin
  update public.profiles set onboarding_seen = true where id = auth.uid();
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

grant execute on function public.mark_onboarding_seen() to authenticated;
