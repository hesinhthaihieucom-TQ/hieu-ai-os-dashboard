-- XÂY NHÂN HIỆU — migration v14: lưu "câu chuyện/trải nghiệm riêng" của user 1 lần ở Định Vị,
-- dùng lại khi viết content giữ nguyên cấu trúc từ Kho Content — không phải nhập lại mỗi lần viết.
-- Chạy 1 lần trong Supabase SQL Editor. An toàn để chạy lại nhiều lần.

alter table profiles add column if not exists cau_chuyen_rieng text;

drop function if exists public.update_my_story(text);

create or replace function public.update_my_story(new_story text)
returns void as $$
begin
  update public.profiles set cau_chuyen_rieng = new_story where id = auth.uid();
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

grant execute on function public.update_my_story(text) to authenticated;
