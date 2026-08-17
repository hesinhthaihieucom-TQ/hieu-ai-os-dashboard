-- XÂY NHÂN HIỆU — migration v3: khoá truy cập theo hạn dùng (trả phí định kỳ theo tháng).
-- Chạy SAU khi đã chạy schema.sql. Cách dùng: SQL Editor → New query → dán → Run.
-- An toàn để chạy lại nhiều lần.

-- Thêm cột email (để admin dễ tra cứu user trong Table Editor mà không cần join auth.users)
-- và access_until (hạn dùng — null hoặc quá hạn = chưa/không còn quyền dùng app).
alter table profiles add column if not exists email text;
alter table profiles add column if not exists access_until timestamptz;

-- Backfill email cho các tài khoản đã tồn tại từ trước khi có cột này.
update profiles p set email = u.email
from auth.users u
where p.id = u.id and p.email is null;

-- Cập nhật trigger tạo profile khi có user mới đăng ký — lưu luôn email.
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), new.email);
  return new;
end;
$$ language plpgsql security definer;

-- QUAN TRỌNG: khoá lại quyền tự sửa profile của chính mình — nếu không, bất kỳ ai đăng nhập
-- cũng có thể tự mở console trình duyệt và tự set access_until/role của chính họ để bỏ qua thu phí.
-- App hiện tại chỉ ĐỌC bảng profiles ở client, không có chỗ nào cần user tự sửa, nên khoá an toàn.
drop policy if exists "profiles_self_update" on profiles;
drop policy if exists "profiles_admin_update" on profiles;
create policy "profiles_admin_update" on profiles for update using (is_admin()) with check (is_admin());

-- Học viên vẫn tự xem được đúng dòng của mình (để app hiển thị hạn dùng của họ).
-- Policy "profiles_self" (select) đã có sẵn từ schema.sql, giữ nguyên không đổi.
