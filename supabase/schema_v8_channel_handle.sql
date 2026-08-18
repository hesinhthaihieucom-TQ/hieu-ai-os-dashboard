-- XÂY NHÂN HIỆU — migration v8: cho phép user tự lưu "tên kênh" của mình (dùng lại ở Viết Content),
-- mà KHÔNG mở rộng quyền tự sửa access_until/role (vẫn khoá như schema_v3_billing.sql).
-- Chạy 1 lần trong Supabase SQL Editor. An toàn để chạy lại nhiều lần.

alter table profiles add column if not exists channel_handle text;

-- Hàm riêng, chỉ cho phép user tự sửa ĐÚNG cột channel_handle của CHÍNH mình — không đụng
-- được access_until/role dù có gọi hàm này thế nào, vì hàm chỉ update đúng 1 cột.
create or replace function public.update_my_channel_handle(new_handle text)
returns void as $$
begin
  update public.profiles set channel_handle = new_handle where id = auth.uid();
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

grant execute on function public.update_my_channel_handle(text) to authenticated;
