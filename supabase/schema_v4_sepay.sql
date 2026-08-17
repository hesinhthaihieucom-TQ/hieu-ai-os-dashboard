-- XÂY NHÂN HIỆU — migration v4: tự động kích hoạt/gia hạn khi khách chuyển khoản qua SePay
-- (tài khoản Vietinbank riêng cho sản phẩm này).
-- Chạy SAU khi đã chạy schema_v3_billing.sql. Cách dùng: SQL Editor → New query → dán → Run.
-- An toàn để chạy lại nhiều lần.

-- Mã tham chiếu ngắn, duy nhất cho mỗi tài khoản — dùng làm nội dung chuyển khoản bắt buộc
-- để webhook tự đối chiếu đúng người mà không cần đọc email/tên (nội dung CK có giới hạn ký tự).
alter table profiles add column if not exists ref_code text;

create or replace function public.generate_ref_code()
returns text as $$
begin
  return 'XNH' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
end;
$$ language plpgsql set search_path = public, pg_temp;

update profiles set ref_code = generate_ref_code() where ref_code is null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_ref_code_unique') then
    alter table profiles add constraint profiles_ref_code_unique unique (ref_code);
  end if;
end $$;

-- Cập nhật trigger tạo profile: sinh luôn ref_code cho tài khoản mới.
-- LƯU Ý: phải gọi public.generate_ref_code() có ghi rõ schema — trigger này chạy trong ngữ
-- cảnh search_path khác lúc gọi RPC tay, gọi tên trần dễ báo "function does not exist".
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, access_until, ref_code)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), new.email, now() + interval '7 days', public.generate_ref_code());
  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

-- Nhật ký MỌI giao dịch nhận được từ webhook SePay (khớp hay không) — để đối chiếu/soát lỗi
-- thủ công khi cần, và để chống xử lý trùng nếu SePay gửi lại cùng 1 giao dịch.
create table if not exists sepay_transactions (
  id uuid primary key default gen_random_uuid(),
  sepay_id bigint unique,
  gateway text,
  transaction_date text,
  account_number text,
  transfer_amount bigint,
  content text,
  ref_code_found text,
  matched_profile_id uuid references profiles(id),
  days_granted integer,
  status text not null default 'pending', -- 'matched' | 'unmatched_code' | 'unmatched_amount' | 'ignored_out'
  created_at timestamptz not null default now()
);
alter table sepay_transactions enable row level security;
drop policy if exists "sepay_transactions_admin_read" on sepay_transactions;
create policy "sepay_transactions_admin_read" on sepay_transactions for select using (is_admin());
-- Không cấp policy insert/update cho client — webhook ghi bằng Supabase service role key
-- (bỏ qua RLS), vì đây là thao tác hệ thống, không phải hành động của 1 user đã đăng nhập.
