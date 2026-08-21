-- XÂY NHÂN HIỆU — SCHEMA ĐẦY ĐỦ, GỘP TỪ TOÀN BỘ schema.sql + schema_v2..v15 (trừ v14, đã lỗi thời).
-- Đây là bản DUY NHẤT cần chạy — thay cho việc phải chạy lần lượt từng file migration cũ.
-- An toàn để chạy TOÀN BỘ file này bất kỳ lúc nào, kể cả khi DB đã có sẵn 1 phần dữ liệu:
-- mọi lệnh đều dùng "if not exists"/"or replace" nên KHÔNG xoá bảng, KHÔNG xoá dữ liệu đã có,
-- chỉ tạo thêm những gì còn thiếu. Cách dùng: Supabase → SQL Editor → New query → dán toàn bộ → Run.

-- ============================================================
-- 1. PROFILES
-- ============================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'student' check (role in ('student', 'admin')),
  created_at timestamptz not null default now()
);
alter table profiles add column if not exists email text;
alter table profiles add column if not exists access_until timestamptz;
alter table profiles add column if not exists ref_code text;
alter table profiles add column if not exists channel_handle text;
alter table profiles add column if not exists brand_name text; -- cũ (v9), không còn dùng ở UI nhưng vẫn giữ cột, xem bảng "brands"
alter table profiles add column if not exists onboarding_seen boolean not null default false;
-- Ảnh đại diện hiện ở cuối sidebar — lưu thẳng dạng data URL đã nén nhỏ (giống cách channel_audits
-- lưu ảnh chụp màn hình kênh) thay vì dùng Supabase Storage riêng, cho đơn giản.
alter table profiles add column if not exists avatar_url text;
-- Học viên khoá Xây Nhân Hiệu được giảm 20% ở gói 6/12 tháng (lâu dài) và gói 1 tháng (chỉ tháng
-- đầu tiên — xem cột first_month_discount_used) so với giá thường.
alter table profiles add column if not exists is_student boolean not null default false;
-- Đánh dấu học viên đã dùng ưu đãi 1 tháng đầu (399.200đ) chưa — dùng rồi thì các lần mua gói 1
-- tháng sau đó về giá thường 499.000đ, không lặp lại ưu đãi này (gói 6/12 tháng không bị ảnh hưởng).
alter table profiles add column if not exists first_month_discount_used boolean not null default false;
-- Số ngày của gói gần nhất đã kích hoạt (30/180/365) — set bởi webhook SePay khi khớp tự động, hoặc
-- bởi admin lúc bấm "Gia hạn" thủ công (xem quan-tri.js) — dùng để lọc/đếm khách theo loại gói ở
-- Quản trị ("bao nhiêu người đang ở gói 1 tháng/6 tháng/12 tháng"), không suy luận ngược từ
-- access_until vì cột đó cộng dồn qua nhiều lần gia hạn, không phản ánh đúng gói gần nhất.
alter table profiles add column if not exists last_plan_days integer;
-- Giới hạn lượt dùng AI trong thời gian DÙNG THỬ (chưa thanh toán lần nào) — xem api/_lib/trial-quota.js.
-- has_paid được đánh dấu true bởi api/sepay-webhook.js ngay khi khớp được 1 giao dịch thành công.
alter table profiles add column if not exists has_paid boolean not null default false;
alter table profiles add column if not exists trial_ai_uses integer not null default 0;
-- Giới hạn lượt dùng AI theo THÁNG cho khách ĐÃ TRẢ PHÍ (has_paid=true) — khác trial_ai_uses (đếm
-- trọn đời, chỉ áp dụng lúc chưa trả phí). paid_ai_month lưu 'YYYY-MM' của tháng đang tính, tự
-- reset về 0 khi sang tháng mới (so khác paid_ai_month hiện tại) — xem api/_lib/trial-quota.js.
alter table profiles add column if not exists paid_ai_uses integer not null default 0;
alter table profiles add column if not exists paid_ai_month text;
-- Lượt cộng thêm khi mua gói "Mua thêm lượt" (api/sepay-webhook.js, nhóm số tiền riêng ngoài
-- AMOUNT_TO_DAYS) — cộng vào trần PAID_MONTHLY_AI_LIMIT của paid_ai_month hiện tại, tự về 0 khi
-- sang tháng mới (reset cùng lúc với paid_ai_uses, xem api/_lib/trial-quota.js).
alter table profiles add column if not exists paid_ai_bonus integer not null default 0;
-- Chương trình giới thiệu (2026-08-20): người GIỚI THIỆU (referrer) được tặng lượt AI, người ĐƯỢC
-- giới thiệu (referee) được giảm giá tiền thật ngay lúc mua (xem REFERRAL_REGULAR_PLANS ở
-- app-shell.js + AMOUNT_TO_DAYS ở sepay-webhook.js) — chỉ áp dụng gói giá thường, KHÔNG áp dụng
-- gói học viên/flash-sale (đã giảm giá sẵn, không cộng dồn thêm ưu đãi giới thiệu).
-- referred_by_ref_code: ref_code của người đã giới thiệu, ghi 1 LẦN lúc đăng ký (xem handle_new_user),
-- không đổi được sau đó — tự suy ra ai là người giới thiệu qua ref_code này.
alter table profiles add column if not exists referred_by_ref_code text;
-- Chỉ thưởng cho người giới thiệu ĐÚNG 1 LẦN — vào lần đầu người được giới thiệu thanh toán thành
-- công 1 gói giá thường (không tính gói ưu đãi). Các lần mua/gia hạn sau đó của cùng người này
-- không thưởng lại nữa (cờ này chặn double-reward).
alter table profiles add column if not exists referral_reward_given boolean not null default false;

update profiles p set email = u.email from auth.users u where p.id = u.id and p.email is null;

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

-- Trigger tạo profile khi có user mới đăng ký: lưu email, cấp 7 ngày dùng thử, sinh ref_code,
-- và lưu luôn is_student (hỏi ngay lúc đăng ký) — dùng để quyết định hiển thị bảng giá nào ở
-- màn hình thanh toán, không hỏi lại lúc đó nữa.
-- LƯU Ý: từng rút xuống 3 ngày (2026-08-19) để giảm rủi ro chi phí AI trong lúc dùng thử, nhưng sau
-- khi thêm giới hạn lượt AI (api/_lib/trial-quota.js) thì chi phí đã được chặn bởi số LƯỢT chứ
-- không còn phụ thuộc số NGÀY nữa — trả lại 7 ngày để khách có đủ thời gian cân nhắc mua mà không
-- phát sinh thêm rủi ro chi phí (dùng hết lượt trong 1 ngày hay trải đều 7 ngày thì chi phí như nhau).
create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_ref_input text := new.raw_user_meta_data->>'referred_by_ref_code';
  v_ref_valid text;
begin
  -- Chỉ ghi referred_by_ref_code nếu mã đó THẬT SỰ khớp 1 tài khoản đang tồn tại — tránh lưu rác
  -- (mã gõ sai/bịa, hay link giới thiệu cũ của tài khoản đã bị xoá) khiến sau này báo cáo/thưởng
  -- referral tra cứu ra rỗng mà không rõ lý do.
  if v_ref_input is not null and v_ref_input <> '' then
    select ref_code into v_ref_valid from public.profiles where ref_code = v_ref_input;
  end if;
  insert into public.profiles (id, full_name, email, access_until, ref_code, is_student, referred_by_ref_code)
  values (
    new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), new.email, now() + interval '7 days',
    public.generate_ref_code(), coalesce((new.raw_user_meta_data->>'is_student')::boolean, false), v_ref_valid
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- consume_ai_quota / refund_ai_quota: kiểm tra + trừ lượt AI ATOMIC bằng "select ... for update"
-- (khoá đúng dòng profile của user đó trong lúc xử lý) — trước đây api/_lib/trial-quota.js làm
-- riêng 2 bước (đọc số hiện tại rồi ghi số mới) qua 2 lệnh HTTP tách rời, nên nếu người dùng bấm
-- rất nhiều request AI CÙNG LÚC (kể cả vô tình bấm dồn dập hay cố tình script để lách giới hạn),
-- nhiều request có thể cùng đọc được số cũ trước khi request nào kịp ghi lại, khiến tất cả cùng
-- "thấy" còn dưới trần và đều được duyệt — vượt quá giới hạn thật sự cho phép. Khoá "for update"
-- buộc các request cùng 1 user phải xếp hàng xử lý lần lượt, không thể lách qua khe hở đó.
-- p_weight: số "lượt" thực trừ cho 1 lần gọi — hành động càng tốn chi phí AI thật (token/max_tokens
-- càng cao) thì trọng số càng lớn, thay vì mọi hành động đều trừ đều 1 lượt như nhau dù chi phí
-- thật chênh nhau tới 6-7 lần giữa hành động rẻ nhất và đắt nhất (xem AI_WEIGHTS ở
-- api/_lib/trial-quota.js) — nhờ vậy trần lượt/tháng phản ánh đúng trần CHI PHÍ hơn là trần SỐ
-- LẦN BẤM, công bằng hơn cho khách chỉ dùng các mục rẻ.
-- CHỈ cấp quyền gọi cho service_role (server dùng SUPABASE_SERVICE_ROLE_KEY) — không cấp cho
-- authenticated/anon vì hàm nhận thẳng p_user_id, nếu lộ ra người dùng có thể tự sửa lượt người khác.
drop function if exists public.consume_ai_quota(uuid, int, int);
create or replace function public.consume_ai_quota(p_user_id uuid, p_trial_limit int, p_paid_limit int, p_weight int default 1)
returns jsonb as $$
declare
  v_profile profiles%rowtype;
  v_month text := to_char(now(), 'YYYY-MM');
  v_current_uses int;
  v_bonus int;
  v_effective_limit int;
  v_is_admin boolean;
begin
  select * into v_profile from profiles where id = p_user_id for update;
  if not found then
    return jsonb_build_object('allowed', true); -- không tìm thấy profile: fail open, không chặn oan
  end if;

  v_is_admin := (v_profile.role = 'admin');

  if not v_profile.has_paid then
    if (not v_is_admin) and v_profile.trial_ai_uses + p_weight > p_trial_limit then
      return jsonb_build_object('allowed', false, 'effective_limit', p_trial_limit, 'mode', 'trial');
    end if;
    update profiles set trial_ai_uses = trial_ai_uses + p_weight where id = p_user_id;
    return jsonb_build_object('allowed', true);
  end if;

  if v_profile.paid_ai_month = v_month then
    v_current_uses := v_profile.paid_ai_uses;
    v_bonus := coalesce(v_profile.paid_ai_bonus, 0);
  else
    v_current_uses := 0;
    v_bonus := 0;
  end if;
  v_effective_limit := p_paid_limit + v_bonus;

  if (not v_is_admin) and v_current_uses + p_weight > v_effective_limit then
    return jsonb_build_object('allowed', false, 'effective_limit', v_effective_limit, 'mode', 'paid');
  end if;

  if v_profile.paid_ai_month = v_month then
    update profiles set paid_ai_uses = paid_ai_uses + p_weight where id = p_user_id;
  else
    update profiles set paid_ai_uses = p_weight, paid_ai_month = v_month, paid_ai_bonus = 0 where id = p_user_id;
  end if;
  return jsonb_build_object('allowed', true);
end;
$$ language plpgsql security definer set search_path = public, pg_temp;
revoke all on function public.consume_ai_quota(uuid, int, int, int) from public, authenticated, anon;
grant execute on function public.consume_ai_quota(uuid, int, int, int) to service_role;

drop function if exists public.refund_ai_quota(uuid);
create or replace function public.refund_ai_quota(p_user_id uuid, p_weight int default 1)
returns void as $$
declare
  v_profile profiles%rowtype;
  v_month text := to_char(now(), 'YYYY-MM');
begin
  select * into v_profile from profiles where id = p_user_id for update;
  if not found then return; end if;
  if not v_profile.has_paid then
    update profiles set trial_ai_uses = greatest(0, trial_ai_uses - p_weight) where id = p_user_id;
    return;
  end if;
  if v_profile.paid_ai_month = v_month then
    update profiles set paid_ai_uses = greatest(0, paid_ai_uses - p_weight) where id = p_user_id;
  end if;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;
revoke all on function public.refund_ai_quota(uuid, int) from public, authenticated, anon;
grant execute on function public.refund_ai_quota(uuid, int) to service_role;

create or replace function public.is_admin()
returns boolean as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$ language sql stable security definer set search_path = public, pg_temp;

-- update_my_channel_handle: user tự sửa ĐÚNG 2 cột channel_handle + brand_name của CHÍNH mình,
-- không đụng được access_until/role dù gọi thế nào. Xoá hết các overload cũ trước khi tạo lại,
-- vì Postgres giữ song song nhiều overload cùng tên sẽ khiến PostgREST không biết gọi bản nào.
drop function if exists public.update_my_channel_handle(text);
drop function if exists public.update_my_channel_handle(text, text);
create or replace function public.update_my_channel_handle(new_handle text, new_brand text default null)
returns void as $$
begin
  update public.profiles set channel_handle = new_handle, brand_name = coalesce(new_brand, brand_name) where id = auth.uid();
end;
$$ language plpgsql security definer set search_path = public, pg_temp;
grant execute on function public.update_my_channel_handle(text, text) to authenticated;

create or replace function public.mark_onboarding_seen()
returns void as $$
begin
  update public.profiles set onboarding_seen = true where id = auth.uid();
end;
$$ language plpgsql security definer set search_path = public, pg_temp;
grant execute on function public.mark_onboarding_seen() to authenticated;

-- ============================================================
-- 2. ĐỊNH VỊ
-- ============================================================
create table if not exists positioning_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  answers jsonb,
  luot1 jsonb,
  luot2 jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists positioning_results_user_unique on positioning_results(user_id);
alter table positioning_results add column if not exists format_suggestions jsonb;
alter table positioning_results add column if not exists chosen_formats jsonb not null default '[]'::jsonb;
-- Ghi lại bài/hook nào trong Kho đang được dùng làm "giọng mẫu" hiện tại (nút "Dùng làm giọng mẫu")
-- — để hiện đúng dấu "✓ Đang là giọng mẫu" trên đúng mục đó, tránh hiểu nhầm mọi mục đều bấm được
-- như nhau trong khi thực ra chỉ 1 giọng đang áp dụng tại 1 thời điểm (chọn mới sẽ thay thế cũ).
alter table positioning_results add column if not exists voice_sample_source_table text;
alter table positioning_results add column if not exists voice_sample_source_id uuid;

-- ============================================================
-- 3. SỬA KÊNH
-- ============================================================
create table if not exists channel_audits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  input jsonb,
  result jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 4. KHO NỘI DUNG CHUNG + RIÊNG
-- ============================================================
create table if not exists content_bank_shared (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id),
  title text not null,
  content text not null,
  source_type text,
  tags text[],
  created_at timestamptz not null default now()
);
alter table content_bank_shared add column if not exists pin_order integer;

create table if not exists content_bank_personal (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text not null,
  source_type text,
  tags text[],
  created_at timestamptz not null default now()
);

-- ============================================================
-- 5. Ý TƯỞNG, BÀI VIẾT, LỊCH ĐĂNG BÀI
-- ============================================================
create table if not exists ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text,
  context text,
  idea_text text not null,
  used boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  idea_id uuid references ideas(id) on delete set null,
  title text,
  content text not null,
  structure jsonb,
  created_at timestamptz not null default now()
);
-- Trục nội dung kế thừa từ bài/hook gốc trong Kho Content khi viết lại từ đó — dùng để nhóm
-- "Bài đã viết" theo trục cho dễ tìm, giống cách Kho Content Viral đang nhóm. Bài viết từ ý
-- tưởng mới (không xuất phát từ Kho) sẽ không có tags, xếp vào nhóm "Chưa phân loại".
alter table posts add column if not exists tags text[];
-- Ghi lại bài viết này bắt nguồn từ mục nào trong Kho Content/Kho Hook (nếu có) — dùng để hiện
-- dấu "✓ Đã dùng viết bài N lần" ngay trên mục đó trong Kho, biết được hook/bài mẫu nào mình đã
-- dùng rồi. source_table là 1 trong: posts, content_bank_personal, content_bank_shared,
-- hooks_bank_personal, hooks_bank_shared — không dùng khoá ngoại thật vì trỏ tới nhiều bảng khác nhau.
alter table posts add column if not exists source_table text;
alter table posts add column if not exists source_id uuid;
-- Kế hoạch "Đẩy Bài" (2026-08-20, theo yêu cầu chị Quỳnh) — gợi ý bình luận/tài sản cho ĐỦ 5 mốc
-- lượt xem, sinh ra 1 LẦN DUY NHẤT (thay vì trước đây phải bấm lại tốn lượt cho từng mốc riêng) rồi
-- lưu thẳng vào đúng bài này để mở lại xem/copy ở Kho Content bất cứ lúc nào, không cần chạy AI lại.
-- Shape: { generated_at, assets_used: [{id,label}], moc: [{ moc, chien_luoc_moc_nay, cmt_tu_dang,
-- goi_y_tra_loi_cmt: [...], tai_san_de_xuat: {label, ly_do} }, ...] } — xem TOOL_DAY_BAI_ALL ở
-- api/goi-y-day-bai.js.
alter table posts add column if not exists day_bai_plan jsonb;
-- Đồng bộ trạng thái "đã đăng" ngược từ Lịch Đăng Bài (2026-08-20, theo yêu cầu chị Quỳnh) — khi
-- tích "đã đăng thật" ở 1 ô lịch có gắn post_id, cột này trên đúng bài đó cũng tự bật theo (xem
-- data-toggle-posted ở nhan-hieu/js/lich-dang.js) để: (1) Kho Content chia được đã đăng/chưa đăng,
-- (2) picker chọn bài để xếp lịch tự loại bài đã đăng rồi, đỡ chọn nhầm/chọn trùng.
alter table posts add column if not exists posted boolean not null default false;

create table if not exists calendar_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid references posts(id) on delete set null,
  scheduled_date date not null,
  slot text not null check (slot in ('sang', 'trua', 'toi')),
  title text,
  format text,
  cta text,
  created_at timestamptz not null default now()
);
-- Trước đây tự suy "đã đăng" chỉ bằng cách so ngày xếp lịch với hôm nay (qua ngày là coi như đã
-- đăng) — sai vì xếp lịch không có nghĩa là đã thực sự đăng. Giờ người dùng phải tự tích xác nhận.
alter table calendar_entries add column if not exists posted boolean not null default false;

-- Gợi ý AI + mục tiêu tuần ở Lịch Đăng Bài — trước đây lưu localStorage (chỉ máy nào tạo mới thấy),
-- khách tạo lịch trên điện thoại xong mở web lại không thấy gì. Lưu ở đây để đồng bộ mọi thiết bị.
create table if not exists weekly_ai_drafts (
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  ai_suggestions jsonb,
  weekly_goal text,
  quick_context text,
  posts_per_day integer,
  updated_at timestamptz not null default now(),
  primary key (user_id, week_start)
);

-- Lưu trạng thái/kết quả đang làm dở ở CÁC MODULE tốn lượt AI (Viết Content, Tái Chế Viral,
-- Chấm Điểm Content/Hook, Đẩy Bài...) — trước đây mất sạch ngay khi rời trang vì mỗi module tự
-- dựng lại state từ đầu lúc mount, kể cả khi vừa tốn lượt AI để có được kết quả đó. 1 bảng dùng
-- chung cho mọi module (khoá theo user_id + module_key), mỗi module tự quyết định lưu field nào
-- vào "data" (jsonb tự do) — chỉ mất khi module tự xoá draft (bấm Reset/"viết bài khác"...).
create table if not exists module_drafts (
  user_id uuid not null references auth.users(id) on delete cascade,
  module_key text not null,
  data jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, module_key)
);

-- ============================================================
-- 6. KHO HOOK + CHẤM ĐIỂM
-- ============================================================
create table if not exists hooks_bank_personal (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  hook_text text not null,
  category text,
  note text,
  created_at timestamptz not null default now()
);
-- Trục nội dung do người dùng tự chọn khi thêm hook vào Kho của tôi — dùng để nhóm theo trục,
-- càng lưu nhiều hook càng dễ tìm lại đúng loại cần dùng.
alter table hooks_bank_personal add column if not exists tags text[];

create table if not exists hooks_bank_shared (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id),
  hook_text text not null,
  category text,
  note text,
  created_at timestamptz not null default now()
);
alter table hooks_bank_shared add column if not exists tags text[];

create table if not exists content_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content_text text not null,
  result jsonb,
  created_at timestamptz not null default now()
);

create table if not exists hook_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  hook_text text not null,
  result jsonb,
  created_at timestamptz not null default now()
);

-- Kho CTA & Bình luận ghim (2026-08-20, RÚT LẠI cùng ngày) — từng là nơi lưu câu CTA/bình luận ghim
-- CHUNG (không gắn 1 sản phẩm/group cụ thể nào) làm mẫu tham khảo cho AI viết bài. Theo phản hồi chị
-- Quỳnh: CTA nên gắn liền với TỪNG tài sản cụ thể (xem promo_assets.cta_mau bên dưới) chứ không phải
-- 1 kho chung tách rời — đã bỏ UI (kho-cta.js, mục sidebar, cta_reference ở api/viet-content.js).
-- GIỮ LẠI bảng này (không xoá) chỉ để không mất dữ liệu người dùng đã lỡ lưu trước đó — không còn
-- được đọc/ghi ở bất kỳ đâu trong app nữa.
create table if not exists cta_bank_personal (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  kind text not null default 'cta' check (kind in ('cta', 'binh_luan_ghim')),
  note text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 7. TÀI SẢN QUẢNG BÁ + THƯƠNG HIỆU
-- ============================================================
create table if not exists promo_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  url text,
  kind text, -- 'san_pham_so' | 'khoa_hoc' | 'aff_nguoi_khac' | 'aff_cua_toi' | 'cong_dong' | 'khac'
  created_at timestamptz not null default now()
);
-- Câu CTA mẫu RIÊNG cho đúng tài sản này (tuỳ chọn) — thay cho Kho CTA chung cũ (xem ghi chú ở
-- cta_bank_personal phía trên). Khi Viết Content/Đẩy Bài chọn đúng tài sản này, AI ưu tiên bám theo
-- tinh thần/giọng điệu câu mẫu đây (biến tấu lại, không copy y nguyên) thay vì tự nghĩ từ đầu.
alter table promo_assets add column if not exists cta_mau text;

create table if not exists brands (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 8. THANH TOÁN (SePay)
-- ============================================================
create table if not exists sepay_transactions (
  id uuid primary key default gen_random_uuid(),
  sepay_id bigint unique,
  gateway text,
  transaction_date text,
  account_number text,
  transfer_amount bigint,
  content text,
  ref_code_found text,
  matched_profile_id uuid references profiles(id) on delete set null,
  days_granted integer,
  topup_luot_granted integer,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
alter table sepay_transactions add column if not exists topup_luot_granted integer;
-- Nếu bảng đã tồn tại từ trước (thiếu on delete set null), sửa lại constraint để sau này xoá
-- 1 profile (vd tài khoản test) không bị chặn bởi lịch sử giao dịch cũ — chỉ mất liên kết, vẫn
-- giữ nguyên dữ liệu giao dịch (transfer_amount, ref_code_found...) làm lịch sử đối soát.
do $$
begin
  if exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'sepay_transactions_matched_profile_id_fkey'
      and table_name = 'sepay_transactions'
  ) then
    alter table sepay_transactions drop constraint sepay_transactions_matched_profile_id_fkey;
  end if;
  alter table sepay_transactions add constraint sepay_transactions_matched_profile_id_fkey
    foreign key (matched_profile_id) references profiles(id) on delete set null;
end $$;

-- Lịch sử từng lượt giới thiệu THÀNH CÔNG (referee đã trả tiền, referrer đã được thưởng) — ghi bởi
-- api/sepay-webhook.js bằng service role. referee_id unique vì mỗi người chỉ thưởng cho referrer
-- ĐÚNG 1 LẦN (xem profiles.referral_reward_given). Dùng để đếm "ai đã giới thiệu >= 5 người" cho
-- diện "partner" trả hoa hồng tiền mặt thủ công (xem quan-tri.js) — trả tay, KHÔNG tự động chuyển
-- tiền (SePay chỉ nhận tiền vào, không có API chuyển tiền ra).
create table if not exists referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references profiles(id) on delete cascade,
  referee_id uuid not null references profiles(id) on delete cascade,
  package_amount bigint not null,
  reward_luot integer not null,
  created_at timestamptz not null default now()
);
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'referrals_referee_id_unique') then
    alter table referrals add constraint referrals_referee_id_unique unique (referee_id);
  end if;
end $$;
create index if not exists referrals_referrer_idx on referrals(referrer_id);

-- Ghi lại TỪNG lần dùng AI theo đúng hành động (action_key/weight) — profiles chỉ lưu TỔNG số lượt
-- (trial_ai_uses/paid_ai_uses), không biết đã dùng vào việc gì. Bảng này cho phép người dùng tự
-- xem "tôi đã dùng bao nhiêu lượt cho Viết Content/Chấm điểm/..." ở mục Tài khoản. Ghi bởi
-- checkAndConsumeTrialQuota() (api/_lib/trial-quota.js) — best-effort, lỗi ghi không chặn người dùng.
create table if not exists ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  action_key text not null,
  weight int not null,
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_log_user_created_idx on ai_usage_log(user_id, created_at);

-- ============================================================
-- 9. ROW LEVEL SECURITY
-- ============================================================
alter table profiles enable row level security;
alter table positioning_results enable row level security;
alter table channel_audits enable row level security;
alter table content_bank_shared enable row level security;
alter table content_bank_personal enable row level security;
alter table ideas enable row level security;
alter table posts enable row level security;
alter table calendar_entries enable row level security;
alter table hooks_bank_personal enable row level security;
alter table hooks_bank_shared enable row level security;
alter table content_scores enable row level security;
alter table hook_scores enable row level security;
alter table cta_bank_personal enable row level security;
alter table promo_assets enable row level security;
alter table brands enable row level security;
alter table sepay_transactions enable row level security;
alter table referrals enable row level security;
alter table ai_usage_log enable row level security;
-- Người dùng tự xem lịch sử dùng lượt của CHÍNH MÌNH (mục Tài khoản) — chỉ service_role được ghi
-- (xem checkAndConsumeTrialQuota), không cấp insert cho authenticated/anon để tránh tự khai khống.
drop policy if exists "ai_usage_log_own_read" on ai_usage_log;
create policy "ai_usage_log_own_read" on ai_usage_log for select using (auth.uid() = user_id);
alter table weekly_ai_drafts enable row level security;
alter table module_drafts enable row level security;

-- profiles: user tự xem được chính mình; KHÔNG có quyền tự update (phải qua RPC ở trên) —
-- nếu không, ai đăng nhập cũng tự set access_until/role của chính họ qua console trình duyệt.
drop policy if exists "profiles_self" on profiles;
create policy "profiles_self" on profiles for select using (auth.uid() = id);
drop policy if exists "profiles_self_update" on profiles; -- cố ý KHÔNG tạo lại — đã khoá từ v3
drop policy if exists "profiles_admin_update" on profiles;
create policy "profiles_admin_update" on profiles for update using (is_admin()) with check (is_admin());
drop policy if exists "profiles_admin_read_all" on profiles;
create policy "profiles_admin_read_all" on profiles for select using (is_admin());

-- các bảng dữ liệu cá nhân: chỉ chủ sở hữu được đọc/ghi
do $$
declare
  t text;
begin
  foreach t in array array[
    'positioning_results','channel_audits','content_bank_personal','ideas','posts','calendar_entries',
    'hooks_bank_personal','content_scores','hook_scores','promo_assets','brands','weekly_ai_drafts','module_drafts','cta_bank_personal'
  ]
  loop
    execute format('drop policy if exists "%1$s_owner_all" on %1$s', t);
    execute format('create policy "%1$s_owner_all" on %1$s for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end $$;

-- kho chung (content + hook): mọi user đã đăng nhập đọc được, chỉ admin được ghi
drop policy if exists "content_bank_shared_read" on content_bank_shared;
create policy "content_bank_shared_read" on content_bank_shared for select using (auth.role() = 'authenticated');
drop policy if exists "content_bank_shared_admin_write" on content_bank_shared;
create policy "content_bank_shared_admin_write" on content_bank_shared for all using (is_admin()) with check (is_admin());

drop policy if exists "hooks_bank_shared_read" on hooks_bank_shared;
create policy "hooks_bank_shared_read" on hooks_bank_shared for select using (auth.role() = 'authenticated');
drop policy if exists "hooks_bank_shared_admin_write" on hooks_bank_shared;
create policy "hooks_bank_shared_admin_write" on hooks_bank_shared for all using (is_admin()) with check (is_admin());

-- sepay_transactions: chỉ admin đọc được trong app; webhook ghi bằng service role key (bỏ qua RLS)
drop policy if exists "sepay_transactions_admin_read" on sepay_transactions;
create policy "sepay_transactions_admin_read" on sepay_transactions for select using (is_admin());

-- referrals: admin đọc toàn bộ (đếm "partner" >= 5 người ở quan-tri.js); người giới thiệu tự xem
-- được lịch sử của CHÍNH MÌNH (mục Tài khoản, đếm "bạn đã giới thiệu bao nhiêu người") — webhook
-- ghi bằng service role key (bỏ qua RLS), không cấp insert cho authenticated/anon.
drop policy if exists "referrals_admin_read" on referrals;
create policy "referrals_admin_read" on referrals for select using (is_admin());
drop policy if exists "referrals_own_read" on referrals;
create policy "referrals_own_read" on referrals for select using (auth.uid() = referrer_id);

-- ============================================================
-- 10. BACKFILL DỮ LIỆU CŨ (an toàn chạy lại nhiều lần — chỉ đụng dòng còn thiếu dữ liệu)
-- ============================================================

-- Ghim 3 bài cố định lên đầu Kho Content chung
update content_bank_shared set pin_order = 1 where title = 'DẤU HIỆU MỘT GIA ĐÌNH ĐANG CÓ PHÚC KHÍ';
update content_bank_shared set pin_order = 2 where title = 'CHỈ CẦN BẠN DÁM KẾT THÚC NGHIỆT DUYÊN THÌ LẬP TỨC CÓ THỂ ĐỔI MỆNH';
update content_bank_shared set pin_order = 3 where title = 'BỐN BƯỚC TÍCH SẢN DÀNH CHO NGƯỜI ĐANG CÓ NỢ';

-- Gắn trục nội dung (tags) cho hook cũ trong Kho Hook chung chưa có tags, theo từ khoá trong hook_text
update hooks_bank_shared set tags = array['tai_chinh']
where tags is null and (
  hook_text ilike '%tiền%' or hook_text ilike '%tài chính%' or hook_text ilike '%tiết kiệm%'
  or hook_text ilike '%thu nhập%' or hook_text ilike '%nợ%' or hook_text ilike '%sao kê%' or hook_text ilike '%đầu tư%'
);
update hooks_bank_shared set tags = array['tam_linh']
where tags is null and (
  hook_text ilike '%tâm linh%' or hook_text ilike '%phong thuỷ%' or hook_text ilike '%phong thủy%'
  or hook_text ilike '%nhân quả%' or hook_text ilike '%phước%' or hook_text ilike '%phúc%' or hook_text ilike '%nghiệp%'
  or hook_text ilike '%gia tiên%' or hook_text ilike '%vận%'
);
update hooks_bank_shared set tags = array['hon_nhan_gia_dinh']
where tags is null and (
  hook_text ilike '%hôn nhân%' or hook_text ilike '%chồng%' or hook_text ilike '%vợ%'
  or hook_text ilike '%con cái%' or hook_text ilike '%gia đình%' or hook_text ilike '%cha mẹ%' or hook_text ilike '%con dâu%'
);
update hooks_bank_shared set tags = array['kinh_doanh']
where tags is null and (
  hook_text ilike '%kinh doanh%' or hook_text ilike '%bán hàng%' or hook_text ilike '%khách hàng%'
  or hook_text ilike '%doanh thu%' or hook_text ilike '%lợi nhuận%'
);
update hooks_bank_shared set tags = array['suc_khoe_lam_dep']
where tags is null and (
  hook_text ilike '%sức khoẻ%' or hook_text ilike '%sức khỏe%' or hook_text ilike '%da%'
  or hook_text ilike '%cân nặng%' or hook_text ilike '%ngủ%' or hook_text ilike '%bác sĩ%'
);
update hooks_bank_shared set tags = array['xay_kenh']
where tags is null and (
  hook_text ilike '%kênh%' or hook_text ilike '%content%' or hook_text ilike '%video%'
  or hook_text ilike '%follow%' or hook_text ilike '%đăng bài%' or hook_text ilike '%facebook%'
);
update hooks_bank_shared set tags = array['phat_trien_ban_than'] where tags is null;

-- Backfill email cho tài khoản đã tồn tại từ trước khi có cột email
update profiles p set email = u.email from auth.users u where p.id = u.id and p.email is null;

-- ============================================================
-- 9. ĐỀ XUẤT NỘI DUNG TỪ "KHO CỦA TÔI" LÊN KHO CHUNG (cần admin duyệt)
-- ============================================================
-- Người dùng thêm 1 mục vào Kho của tôi có thể chọn đề xuất đẩy lên Kho chung để mọi người cùng
-- dùng — không vào thẳng Kho chung mà phải qua duyệt của admin (mục Quản trị Kho nội dung) trước,
-- tránh nội dung kém chất lượng/spam lọt vào kho chung.
alter table content_bank_personal add column if not exists share_status text check (share_status in ('pending','approved','rejected'));
alter table content_bank_personal add column if not exists reviewed_at timestamptz;
alter table hooks_bank_personal add column if not exists share_status text check (share_status in ('pending','approved','rejected'));
alter table hooks_bank_personal add column if not exists reviewed_at timestamptz;

-- Khi thêm vào Kho của tôi, hỏi luôn đây có phải nội dung đang viral bạn sưu tầm được không (và
-- view/like nếu có) — admin cần thấy đúng số liệu này để quyết định duyệt lên Kho chung hay không.
-- Lưu view/like dạng text vì người dùng hay nhập ước lượng ("15k", "khoảng 2 triệu").
alter table content_bank_personal add column if not exists is_viral boolean;
alter table content_bank_personal add column if not exists viral_views text;
alter table content_bank_personal add column if not exists viral_likes text;
-- Ảnh chụp màn hình chứng minh view/like thật (2026-08-21, theo phản hồi chị Quỳnh) — lưu thẳng
-- base64 data URL trong cột text thay vì Supabase Storage (app chưa dùng Storage ở đâu khác), ảnh
-- đã được nén/resize nhỏ ở client (canvas, JPEG ~80%, max chiều rộng 1000px) trước khi lưu nên
-- không phình DB nhiều — chỉ dành cho admin xem lúc duyệt, KHÔNG copy sang content_bank_shared.
alter table content_bank_personal add column if not exists viral_screenshot text;
alter table hooks_bank_personal add column if not exists is_viral boolean;
alter table hooks_bank_personal add column if not exists viral_views text;
alter table hooks_bank_personal add column if not exists viral_likes text;

-- Admin cần đọc/duyệt được đề xuất của MỌI người dùng, không chỉ của chính mình — policy owner_all
-- hiện tại chỉ cho chủ sở hữu, nên thêm 2 policy riêng cho admin (RLS cộng dồn theo kiểu OR).
drop policy if exists "content_bank_personal_admin_read" on content_bank_personal;
create policy "content_bank_personal_admin_read" on content_bank_personal for select using (is_admin());
drop policy if exists "content_bank_personal_admin_update" on content_bank_personal;
create policy "content_bank_personal_admin_update" on content_bank_personal for update using (is_admin()) with check (is_admin());

drop policy if exists "hooks_bank_personal_admin_read" on hooks_bank_personal;
create policy "hooks_bank_personal_admin_read" on hooks_bank_personal for select using (is_admin());
drop policy if exists "hooks_bank_personal_admin_update" on hooks_bank_personal;
create policy "hooks_bank_personal_admin_update" on hooks_bank_personal for update using (is_admin()) with check (is_admin());

-- ============================================================
-- 16. THÔNG BÁO ĐẨY (Web Push) — nhắc lịch đăng bài, nhắc kiểm tra view sau khi đăng (Đẩy Bài),
-- nhắc lịch quay content (2026-08-21, theo yêu cầu chị Quỳnh). Gửi qua chuẩn Web Push (VAPID) —
-- hoạt động kể cả khi đã tắt app/trình duyệt, MIỄN LÀ đã cài app lên máy (PWA, xem
-- nhan-hieu/manifest.json + nhan-hieu/sw.js) và đã cấp quyền thông báo. Trên iPhone: CHỈ hoạt động
-- nếu đã "Thêm vào Màn hình chính" trước (Safari không hỗ trợ Web Push cho tab trình duyệt thường,
-- chỉ hỗ trợ PWA đã cài, từ iOS 16.4+). Xem api/_lib/push.js, api/cron/send-reminders.js.
-- ============================================================

-- Đăng ký nhận thông báo — 1 user có thể có NHIỀU dòng (nhiều thiết bị/trình duyệt đã cài app).
-- endpoint là URL duy nhất do trình duyệt cấp lúc subscribe, dùng làm khoá tự nhiên để upsert.
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz not null default now()
);
alter table push_subscriptions enable row level security;
drop policy if exists "push_subscriptions_owner_all" on push_subscriptions;
create policy "push_subscriptions_owner_all" on push_subscriptions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Đánh dấu đã gửi thông báo cho đúng 1 sự kiện cụ thể (vd "lich:<entry_id>" hoặc
-- "daybai:<entry_id>:3h") — cron chạy mỗi 15 phút nên PHẢI chống gửi trùng, unique (user_id,
-- event_key) là cách chống trùng đơn giản nhất, không cần lock/queue phức tạp. Chỉ service_role
-- (cron) mới ghi bảng này nên không cần policy insert cho user thường.
create table if not exists notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_key text not null,
  sent_at timestamptz not null default now(),
  unique (user_id, event_key)
);
alter table notification_log enable row level security;
drop policy if exists "notification_log_owner_read" on notification_log;
create policy "notification_log_owner_read" on notification_log for select using (auth.uid() = user_id);

-- Thời điểm THỰC SỰ bấm "Đã đăng" (khác scheduled_date/slot chỉ là dự định) — dùng làm mốc 0h để
-- tính các mốc nhắc kiểm tra view 3h/6h/24h sau khi đăng thật (Đẩy Bài), vì người dùng có thể đăng
-- trễ/sớm hơn dự định ban đầu.
alter table calendar_entries add column if not exists posted_at timestamptz;

-- Lịch quay content — tách khỏi calendar_entries (lịch ĐĂNG) vì đây là hoạt động CHUẨN BỊ trước
-- khi có bài, không gắn với 1 slot sáng/trưa/tối cố định mà là 1 thời điểm cụ thể do người dùng
-- tự chọn (ngày + giờ).
create table if not exists recording_schedule (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  scheduled_at timestamptz not null,
  created_at timestamptz not null default now()
);
alter table recording_schedule enable row level security;
drop policy if exists "recording_schedule_owner_all" on recording_schedule;
create policy "recording_schedule_owner_all" on recording_schedule for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Giờ đăng bài theo TỪNG NGƯỜI DÙNG tự chọn (2026-08-21, theo phản hồi chị Quỳnh: "giờ đăng bài là
-- cho người ta tự chọn") — trước đó hardcode chung 8:00/12:00/19:00 cho mọi người. Lưu dạng text
-- 'HH:MM' (24h, giờ Việt Nam) cho đơn giản, không cần kiểu time riêng. Có default nên user cũ tự
-- động có giờ mặc định, không cần chạy migrate dữ liệu.
alter table profiles add column if not exists slot_time_sang text not null default '08:00';
alter table profiles add column if not exists slot_time_trua text not null default '12:00';
alter table profiles add column if not exists slot_time_toi text not null default '19:00';
