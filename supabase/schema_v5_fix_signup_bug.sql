-- XÂY NHÂN HIỆU — fix khẩn: đăng ký tài khoản mới báo "Database error saving new user".
-- Nguyên nhân: handle_new_user() gọi generate_ref_code() không ghi rõ schema, nên khi Postgres
-- chạy trigger lúc tạo user mới (ngữ cảnh search_path khác lúc gọi RPC tay) không tìm thấy hàm.
-- Chạy SAU khi đã chạy schema_v4_sepay.sql. An toàn để chạy lại nhiều lần.

create or replace function public.generate_ref_code()
returns text as $$
begin
  return 'XNH' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
end;
$$ language plpgsql set search_path = public, pg_temp;

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, access_until, ref_code)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), new.email, now() + interval '7 days', public.generate_ref_code());
  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

create or replace function public.is_admin()
returns boolean as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$ language sql stable security definer set search_path = public, pg_temp;
