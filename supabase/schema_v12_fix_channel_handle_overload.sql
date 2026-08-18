-- XÂY NHÂN HIỆU — migration v12: sửa lỗi "Could not choose the best candidate function" —
-- do cả 2 phiên bản update_my_channel_handle (1 tham số cũ và 2 tham số mới) cùng tồn tại,
-- khiến PostgREST không biết gọi bản nào. Xoá cả 2, tạo lại đúng 1 bản 2 tham số duy nhất.
-- Chạy 1 lần trong Supabase SQL Editor. An toàn để chạy lại nhiều lần.

drop function if exists public.update_my_channel_handle(text);
drop function if exists public.update_my_channel_handle(text, text);

create or replace function public.update_my_channel_handle(new_handle text, new_brand text default null)
returns void as $$
begin
  update public.profiles set channel_handle = new_handle, brand_name = coalesce(new_brand, brand_name) where id = auth.uid();
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

grant execute on function public.update_my_channel_handle(text, text) to authenticated;
