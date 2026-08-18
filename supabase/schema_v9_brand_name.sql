-- XÂY NHÂN HIỆU — migration v9: thêm "tên thương hiệu/sản phẩm" riêng, dùng khi 1 người có
-- nhiều thương hiệu/kênh khác tên kênh chính — luôn được hashtag cùng tên kênh.
-- Chạy 1 lần trong Supabase SQL Editor. An toàn để chạy lại nhiều lần.

alter table profiles add column if not exists brand_name text;

-- QUAN TRỌNG: phải xoá đúng chữ ký hàm cũ (1 tham số) trước — nếu không Postgres sẽ giữ cả
-- 2 phiên bản overload cùng tên, khiến PostgREST không biết gọi bản nào (gây lỗi "ambiguous").
drop function if exists public.update_my_channel_handle(text);

-- Thay hàm cũ bằng bản cập nhật cả 2 cột (channel_handle + brand_name) trong 1 lần gọi —
-- vẫn chỉ đụng đúng 2 cột này của CHÍNH user gọi, không đụng access_until/role.
create or replace function public.update_my_channel_handle(new_handle text, new_brand text default null)
returns void as $$
begin
  update public.profiles set channel_handle = new_handle, brand_name = coalesce(new_brand, brand_name) where id = auth.uid();
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

grant execute on function public.update_my_channel_handle(text, text) to authenticated;
