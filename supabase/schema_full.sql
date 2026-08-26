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

-- Chính sách CTV toàn hệ sinh thái (2026-08-27, chị Quỳnh chốt) — 2 trục ĐỘC LẬP nhau:
-- 1) "Hiểu Partner": đủ >=5 giới thiệu thành công CỘNG DỒN cả referrals (nhan-hieu) lẫn tc_referrals
--    (tai-chinh) — KHÔNG lưu tổng ở đây, tính trực tiếp bằng count() mỗi lần cần (đúng nguyên tắc
--    "không lưu tổng suy ra được" đã áp dụng xuyên suốt tai-chinh, xem comment ở tc_referrals bên dưới
--    — tránh lệch nếu 1 dòng referrals/tc_referrals bị sửa/xoá tay mà quên cập nhật số đếm ở chỗ khác).
-- 2) "VIP Partner": mua gói riêng 55.000.000đ (Unicity Cân Bằng Chuyển Hoá 2 tháng + coaching 1:1
--    hàng tuần 2 tháng + dùng mọi chương trình đào tạo/sản phẩm số 1 năm) — set boolean này thẳng qua
--    api/sepay-webhook.js khi khớp đúng số tiền, VĨNH VIỄN (không hết hạn theo năm dùng sản phẩm đi
--    kèm). Cộng thêm +10 điểm % hoa hồng trên MỌI sản phẩm có cơ chế giới thiệu ở hệ thống này (xem
--    REFERRAL_REWARD_PERCENT/TC_REFERRAL_REWARD_PERCENT + VIP_PARTNER_BONUS_PERCENT ở sepay-webhook.js)
--    TRỪ Unicity — hoa hồng Unicity nằm ngoài hệ thống này, xử lý riêng theo đúng chính sách Unicity.
alter table profiles add column if not exists is_vip_partner boolean not null default false;

-- Trần lượt dùng thử RIÊNG TỪNG NGƯỜI (2026-08-24, theo yêu cầu chị Quỳnh: "muốn những người đầu
-- tiên là những người được ưu đãi nhất để họ không cảm thấy bị thiệt") — trước đây TRIAL_AI_LIMIT
-- (api/_lib/trial-quota.js) là 1 số CỐ ĐỊNH áp dụng chung cho mọi tài khoản chưa trả phí, đổi số đó
-- sẽ vô tình đổi luôn trần của những người đã đăng ký từ trước (ép họ về mức thấp hơn, đúng ngược
-- lại điều chị muốn tránh). Cột này CHỐT NGAY LÚC ĐĂNG KÝ (handle_new_user), không đổi theo sau —
-- ai đã đăng ký trước giữ nguyên mức cũ, chỉ người đăng ký MỚI TỪ NAY mới theo mức mới. NULL (tài
-- khoản có từ trước migration này) coi như dùng mức cũ 100 — backfill 1 lần ngay dưới đây.
alter table profiles add column if not exists trial_ai_limit integer;
update profiles set trial_ai_limit = 100 where trial_ai_limit is null;

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

-- Trigger tạo profile khi có user mới đăng ký: lưu email, cấp hạn dùng thử, sinh ref_code,
-- và lưu luôn is_student (hỏi ngay lúc đăng ký) — dùng để quyết định hiển thị bảng giá nào ở
-- màn hình thanh toán, không hỏi lại lúc đó nữa.
-- LƯU Ý: từng rút xuống 3 ngày (2026-08-19) để giảm rủi ro chi phí AI trong lúc dùng thử, sau đó trả
-- lại 7 ngày khi đã có giới hạn lượt AI chặn rủi ro chi phí rồi. Rút lại 3 ngày + 50 lượt lần nữa
-- (2026-08-24, chiến dịch Zoom tối nay) — lần này KHÔNG phải vì rủi ro chi phí mà vì chị Quỳnh muốn
-- người đăng ký TRƯỚC đó (7 ngày/100 lượt) vẫn là nhóm được ưu đãi nhất, không bị người đăng ký sau
-- có mức ngang hoặc hơn. Chỉ áp dụng cho người đăng ký MỚI TỪ NAY — trial_ai_limit chốt ngay lúc
-- đăng ký (xem cột ở trên), không đụng tới ai đã có tài khoản.
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
  insert into public.profiles (id, full_name, email, access_until, ref_code, is_student, referred_by_ref_code, trial_ai_limit)
  values (
    new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), new.email, now() + interval '3 days',
    public.generate_ref_code(), coalesce((new.raw_user_meta_data->>'is_student')::boolean, false), v_ref_valid, 50
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

  -- Trần dùng thử ĐÚNG CỦA NGƯỜI NÀY (chốt lúc đăng ký, xem profiles.trial_ai_limit) — p_trial_limit
  -- chỉ còn là giá trị DỰ PHÒNG cho các dòng cũ hiếm hoi lỡ chưa được backfill (coalesce null).
  if not v_profile.has_paid then
    declare
      v_trial_limit int := coalesce(v_profile.trial_ai_limit, p_trial_limit);
    begin
      if (not v_is_admin) and v_profile.trial_ai_uses + p_weight > v_trial_limit then
        return jsonb_build_object('allowed', false, 'effective_limit', v_trial_limit, 'mode', 'trial');
      end if;
      update profiles set trial_ai_uses = trial_ai_uses + p_weight where id = p_user_id;
      return jsonb_build_object('allowed', true);
    end;
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
-- 11. SỔ DÒNG TIỀN (tai-chinh/ — sản phẩm cá nhân riêng, dùng chung Supabase project với Xây Nhân
-- Hiệu để tận dụng auth.users/profiles có sẵn, nhưng KHÔNG đọc/ghi has_paid/access_until của
-- profiles — giai đoạn 1 (beta) mọi tài khoản đã đăng nhập đều dùng free, chưa gắn thanh
-- toán/quota. Đặt tiền tố tc_ cho mọi bảng để không lẫn với bảng của Xây Nhân Hiệu.
-- ============================================================

-- Sổ giao dịch hàng ngày (Phần 2 cuốn sổ giấy) — gộp cả thu nhập lẫn chi tiêu 1 bảng, phân biệt
-- bằng cột type. Quỹ 10%/5%/85% của thu nhập tính hiển thị ở phía JS (tai-chinh/js/ghi-chep.js),
-- không lưu cứng ở đây để khỏi lệch dữ liệu nếu tỉ lệ này đổi sau này.
create table if not exists tc_finance_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  type text not null check (type in ('income','expense')),
  amount numeric not null check (amount >= 0),
  description text,
  category text check (category in ('tai_san','tieu_san','cp_co_dinh','cp_bien_doi')),
  created_at timestamptz not null default now()
);
create index if not exists tc_finance_entries_user_date_idx on tc_finance_entries (user_id, entry_date);

-- Nhận xét tổng kết tuần (Phần 3.C) — khoá theo tuần bắt đầu thứ Hai, giống pattern weekly_ai_drafts.
create table if not exists tc_weekly_reflections (
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  regret_expense text,
  unexpected_expense text,
  spending_feeling text,
  went_well text,
  to_change text,
  updated_at timestamptz not null default now(),
  primary key (user_id, week_start)
);

-- Bảng cân đối tài sản/tiêu sản tháng (Phần 4.B) — Tài Sản Ròng = tổng asset_* − tổng debt_* tính
-- ở JS lúc render (tai-chinh/js/tong-ket-thang.js), không lưu cột tổng để tránh lệch dữ liệu.
create table if not exists tc_networth_snapshots (
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot_month text not null, -- 'YYYY-MM'
  asset_cash numeric not null default 0,
  asset_savings numeric not null default 0,
  asset_gold_fx numeric not null default 0,
  asset_stocks numeric not null default 0,
  asset_realestate numeric not null default 0,
  asset_other numeric not null default 0,
  debt_credit_card numeric not null default 0,
  debt_installment numeric not null default 0,
  debt_bank_loan numeric not null default 0,
  debt_other numeric not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, snapshot_month)
);

-- Bài học & mục tiêu tháng tiếp theo (Phần 5).
create table if not exists tc_monthly_reflections (
  user_id uuid not null references auth.users(id) on delete cascade,
  month text not null, -- 'YYYY-MM'
  reflection_regret text,
  reflection_worth text,
  reflection_blocker text,
  reflection_good_habit text,
  reflection_bad_habit text,
  goal_income numeric,
  goal_savings numeric,
  goal_debt_reduction numeric,
  goal_new_asset numeric,
  goal_new_asset_type text,
  updated_at timestamptz not null default now(),
  primary key (user_id, month)
);

alter table tc_finance_entries enable row level security;
alter table tc_weekly_reflections enable row level security;
alter table tc_networth_snapshots enable row level security;
alter table tc_monthly_reflections enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['tc_finance_entries','tc_weekly_reflections','tc_networth_snapshots','tc_monthly_reflections']
  loop
    execute format('drop policy if exists "%1$s_owner_all" on %1$s', t);
    execute format('create policy "%1$s_owner_all" on %1$s for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end $$;

-- ============================================================
-- 12. SỔ DÒNG TIỀN — Quản Lý Nợ, Quỹ Khẩn Cấp, Ngân Sách (nâng cấp theo góp ý chuyên gia tài chính
-- cá nhân 2026-08-21: app trước đó gộp nợ thành 4 số trong tc_networth_snapshots, không đủ để
-- người đang nợ quyết định trả khoản nào trước — cần biết lãi suất/hạn trả TỪNG khoản).
-- ============================================================

-- Danh mục CHI TIẾT cho cả thu & chi (khác cột category hiện có trên tc_finance_entries — category
-- chỉ phân loại kế toán thô Tài sản/Tiêu sản/CP cố định/CP biến đổi, chỉ áp dụng cho chi tiêu).
-- Text TỰ DO (không enum/check) — người dùng tự gõ, app chỉ GỢI Ý qua datalist (xem
-- SUGGESTED_EXPENSE_CATEGORIES/SUGGESTED_INCOME_CATEGORIES trong tai-chinh/js/util.js) + học lại
-- các danh mục người dùng từng gõ trước đó, không ép vào danh sách cứng (góp ý Quỳnh 2026-08-21).
alter table tc_finance_entries add column if not exists category_label text;

-- Từng khoản nợ riêng biệt (thay vì 4 số gộp) — current_balance do người dùng tự cập nhật trực
-- tiếp (giống số dư thẻ thật, có thể TĂNG nếu quẹt thêm), không suy ra từ lịch sử thanh toán.
create table if not exists tc_debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  creditor_name text not null,
  current_balance numeric not null default 0,
  interest_rate numeric not null default 0, -- %/năm
  minimum_payment numeric not null default 0,
  due_day integer check (due_day between 1 and 31),
  is_paid_off boolean not null default false,
  created_at timestamptz not null default now()
);

-- Lịch sử thanh toán từng khoản nợ — dùng để biết "tháng này đã trả bao nhiêu" và tự động chảy
-- 1 dòng tương ứng vào tc_finance_entries (spending_category='tra_no') lúc ghi nhận, xem
-- tai-chinh/js/quan-ly-no.js.
create table if not exists tc_debt_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  debt_id uuid not null references tc_debts(id) on delete cascade,
  payment_date date not null,
  amount numeric not null check (amount >= 0),
  created_at timestamptz not null default now()
);

-- Quỹ khẩn cấp — 1 dòng/user (không theo tháng, là quỹ liên tục). Theo đúng thứ tự Dave Ramsey:
-- có quỹ khẩn cấp nhỏ TRƯỚC khi dồn lực trả nợ, tránh việc 1 sự cố bất ngờ lại đẻ ra nợ mới.
create table if not exists tc_emergency_fund (
  user_id uuid primary key references auth.users(id) on delete cascade,
  target_amount numeric not null default 0,
  current_amount numeric not null default 0,
  updated_at timestamptz not null default now()
);

-- Hạn mức chi tiêu theo tháng + theo category_label (ngân sách chủ động, thay vì chỉ nhìn lại
-- quá khứ như tc_weekly_reflections/tc_monthly_reflections).
create table if not exists tc_budgets (
  user_id uuid not null references auth.users(id) on delete cascade,
  month text not null, -- 'YYYY-MM'
  category_label text not null,
  limit_amount numeric not null default 0,
  primary key (user_id, month, category_label)
);

alter table tc_debts enable row level security;
alter table tc_debt_payments enable row level security;
alter table tc_emergency_fund enable row level security;
alter table tc_budgets enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['tc_debts','tc_debt_payments','tc_emergency_fund','tc_budgets']
  loop
    execute format('drop policy if exists "%1$s_owner_all" on %1$s', t);
    execute format('create policy "%1$s_owner_all" on %1$s for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end $$;

-- ============================================================
-- 13. LỚP TÂM THỨC (Sổ Dòng Tiền Tâm Thức / KarmaFlow — Tầng 1, 2026-08-21): Vibe Check,
-- danh xưng tri ân cho khoản nợ, gắn mục tiêu tháng vào 1 trong 5 Ngôi Nhà. Số liệu thật (lãi
-- suất, hạn trả, DTI...) KHÔNG đổi — lớp này chỉ bọc thêm ngôn ngữ/cảm xúc bên ngoài, không
-- được che số liệu thật đi.
-- ============================================================

-- Vibe Check: trạng thái cảm xúc lúc nhập giao dịch — KHÔNG bắt buộc chọn (mặc định 'gray' nếu
-- bỏ qua, tránh tạo thêm ma sát khiến người dùng bỏ ghi chép — xem tai-chinh/js/ghi-chep.js).
alter table tc_finance_entries add column if not exists vibe text
  check (vibe in ('green','red','gray')) default 'gray';

-- Lý do đằng sau cảm xúc Vibe Check (không bắt buộc, nhưng viết ra giúp người dùng tự nhận diện
-- gốc rễ tâm thức rõ hơn — hiện lại ngay dưới giao dịch trong Ghi Chép Hàng Ngày).
alter table tc_finance_entries add column if not exists vibe_reason text;

-- Lời tri ân ngầm gửi tới "Ân Nhân Hỗ Trợ Vốn" — lưu thật để học viên quay lại đọc được lời mình
-- từng viết, không phải hiệu ứng UI thoáng qua.
alter table tc_debts add column if not exists gratitude_note text;

-- Phân loại Nợ Kiến Tạo / Nợ Hoảng Loạn (2026-08-26, góp ý Quỳnh: "cũng cần biết nguồn đó có đảm
-- bảo 3 yếu tố... để đến đoạn chiến lược trả nợ cho hiệu quả" — khái niệm này ĐÃ có sẵn ở
-- GLOSSARY.no_xanh/no_do trong util.js, giờ mới thật sự gắn vào từng khoản nợ). Đủ cả 3 = Nợ Kiến
-- Tạo, thiếu 1 trong 3 = Nợ Hoảng Loạn — dùng trong quan-ly-no.js để ưu tiên xử lý Nợ Hoảng Loạn
-- trước, không chỉ sắp theo lãi suất/số dư như 2 chiến lược cũ.
alter table tc_debts add column if not exists crit_legit_source boolean not null default false; -- vay từ nguồn chính thống
alter table tc_debts add column if not exists crit_real_value boolean not null default false; -- dùng để tạo giá trị/tài sản tăng trưởng thật
alter table tc_debts add column if not exists crit_clear_plan boolean not null default false; -- có kế hoạch trả rõ ràng, trong khả năng

-- Không phải khoản nợ nào cũng tính lãi theo %/năm — thẻ tín dụng trả góp/đáo hạn thường tính phí
-- CỐ ĐỊNH (2026-08-26, góp ý Quỳnh: "lãi % thì có thể là phí trả góp hay đáo thẻ... không cố định
-- ghi lãi % mà tuỳ chứ nhỉ"). cost_type quyết định UI hiện ô nào; interest_rate/flat_fee_amount chỉ
-- có ý nghĩa khi đúng cost_type tương ứng (không xoá cột cũ, giữ tương thích ngược).
alter table tc_debts add column if not exists cost_type text not null default 'percent' check (cost_type in ('percent','flat_fee'));
alter table tc_debts add column if not exists flat_fee_amount numeric;

-- Mục tiêu tháng tiếp theo neo vào đúng 1 trong 5 Trụ Cột Năng Lượng Bản Thể (khoá học riêng "21
-- Ngày Giải Nghiệp" của Quỳnh — ĐÃ THAY cho "5 Ngôi Nhà" theo góp ý 2026-08-21, vì "5 Ngôi Nhà" là
-- khung của Thầy Bùi Quốc Tuấn, không phải của Quỳnh). Cột tên `goal_house` giữ nguyên (đỡ phải
-- đổi tên khắp code), chỉ đổi tập giá trị hợp lệ.
alter table tc_monthly_reflections add column if not exists goal_house text
  check (goal_house in ('than_tam_ban_the','coi_nguon_sinh_thanh','ban_doi_moi_quan_he','tai_chinh_tam_thuc','thuan_phap_nhan_qua'));

-- Cho chọn NHIỀU trụ thay vì đúng 1 (2026-08-26, góp ý Quỳnh: "chỉ cho chọn 1 trụ cho mục tiêu thì
-- ko đúng lắm") — cột MỚI goal_houses (jsonb array các house_key), thay cho goal_house ở trên.
-- KHÔNG xoá goal_house (giữ lại làm dữ liệu cũ/lịch sử, code không viết vào cột này nữa) — tránh
-- vỡ constraint/mất dữ liệu cũ; app đọc goal_house làm fallback khi goal_houses chưa có (seed từ
-- giá trị cũ), xem load() ở muc-tieu-cam-ket.js.
alter table tc_monthly_reflections add column if not exists goal_houses jsonb;

-- Lý do CHO TỪNG trụ, không chỉ 1 trụ chính (goal_house/goal_houses ở trên) — 2026-08-26, góp ý
-- Quỳnh: "phải cho tự ghi ra lý do tại sao ở mỗi trục... để người dùng gia tăng cảm xúc". Không bắt
-- buộc, chỉ khuyến khích — {house_key: "lý do tự viết"}, thiếu key nào nghĩa là chưa viết cho trụ đó.
alter table tc_monthly_reflections add column if not exists goal_house_reasons jsonb;

-- ============================================================
-- 14. LỚP TÂM THỨC — Tầng 2 (Mục Tiêu & Cam Kết, Nhật Ký Rắc Rối, Karma Score 5 trục, Soi Nút
-- Thắt, 2026-08-21). LƯU Ý: KHÔNG dùng "A'"/"Lệnh Ấn Định"/"Khoá Van Tiền" làm tên trong code hay
-- UI — đó là thuật ngữ độc quyền của bên dạy (Thầy Bùi Quốc Tuấn), Quỳnh chỉ giữ lại Ý TƯỞNG dưới
-- tên gọi khác: "Tiếng Lòng", "Lời Cam Kết", "Nút Thắt Dòng Tiền". Karma Score KHÔNG lưu điểm tích
-- luỹ ở đây — luôn tính lại từ dữ liệu thô mỗi lần render (xem tai-chinh/js/trang-chu.js), tránh
-- lệch dữ liệu khi người dùng sửa/xoá giao dịch cũ.
-- ============================================================

-- "Tiếng Lòng": phản ứng cảm xúc thật ngay lúc vừa viết xong mục tiêu tháng (tc_monthly_reflections
-- đã có sẵn các cột goal_* — cột này chỉ bổ sung, không tạo bảng riêng).
alter table tc_monthly_reflections add column if not exists goal_first_reaction text;

-- Nhật Ký Rắc Rối: ghi lại biến cố cản trở trong lúc theo đuổi mục tiêu — app phản chiếu lại ngay
-- (client-side, không phải AI) rằng đây là bài kiểm tra, không phải dấu hiệu thất bại.
create table if not exists tc_obstacle_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  description text not null,
  created_at timestamptz not null default now()
);
alter table tc_obstacle_log enable row level security;
drop policy if exists "tc_obstacle_log_owner_all" on tc_obstacle_log;
create policy "tc_obstacle_log_owner_all" on tc_obstacle_log for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Tự đánh giá nhẹ nhàng hàng tuần (1-5) cho 3 trục vốn mang tính chủ quan của Karma Score (Mối
-- Quan Hệ/Sức Khỏe/Mục Đích Sống — không thể suy ra đáng tin cậy từ category_label tự do), cộng
-- câu hỏi "Soi Nút Thắt" (thái độ khi thấy người khác nhận tin vui về tiền).
alter table tc_weekly_reflections add column if not exists relationship_score integer check (relationship_score between 1 and 5);
alter table tc_weekly_reflections add column if not exists health_score integer check (health_score between 1 and 5);
alter table tc_weekly_reflections add column if not exists purpose_score integer check (purpose_score between 1 and 5);
alter table tc_weekly_reflections add column if not exists reaction_to_others_success text;

-- Tầng 3 (2026-08-21): thêm 2 tự đánh giá cho đúng 5 Trụ Cột Năng Lượng Bản Thể (Cội Nguồn Sinh
-- Thành + Tài Chính Tâm Thức) — trước đó Karma Score dùng 5 trục chung chung (Tài Chính/Mối Quan
-- Hệ/Sức Khỏe/Mục Đích Sống/Tâm Thức) không khớp khung 5 Trụ riêng của Quỳnh. finance_mindset_score
-- là câu hỏi CHECK TRỰC TIẾP về tâm thức tiền (Quỳnh yêu cầu — Karma Score trước đó chỉ suy luận
-- gián tiếp từ Vibe Check, chưa có câu hỏi check riêng).
alter table tc_weekly_reflections add column if not exists parents_connection_score integer check (parents_connection_score between 1 and 5);
alter table tc_weekly_reflections add column if not exists finance_mindset_score integer check (finance_mindset_score between 1 and 5);

-- Tầng 4 (2026-08-22): "Tàng Thức" — tầng gốc rễ sâu nhất (niềm tin cũ về tiền hình thành từ ký ức/
-- tuổi thơ, nuôi các Nút Chặn Dòng Tiền lặp lại ở tầng Tâm Thức phía trên). Module riêng
-- tang-thuc.js, không dùng AI — người dùng tự viết niềm tin cũ + tự viết niềm tin mới thay thế
-- (đúng tinh thần "tự nhận diện" xuyên suốt app, không có bước nào do AI phán thay).
create table if not exists tc_core_beliefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  belief_text text not null,
  origin_note text,
  linked_nut_chan integer check (linked_nut_chan between 1 and 4),
  new_belief text,
  still_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table tc_core_beliefs enable row level security;
drop policy if exists "tc_core_beliefs_owner_all" on tc_core_beliefs;
create policy "tc_core_beliefs_owner_all" on tc_core_beliefs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

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

-- Sửa lại theo phản hồi chị Quỳnh: giờ đăng bài phải đặt được RIÊNG cho TỪNG bài đã xếp lịch, ngay
-- trong Lịch Đăng Bài — không chỉ 1 giờ mặc định chung theo slot ở Tài khoản. Cột profiles.slot_time_*
-- ở trên vẫn giữ lại làm giờ GỢI Ý MẶC ĐỊNH lúc tạo mới (đỡ phải gõ tay mỗi lần), còn giờ THẬT của
-- từng bài nằm ở đây — null nghĩa là "chưa tự chỉnh, dùng theo mặc định" (áp cho bài tạo trước khi
-- có tính năng này).
alter table calendar_entries add column if not exists scheduled_time text;

-- Trước đây "Lịch quay content" tự BIẾN MẤT khỏi danh sách ngay khi qua giờ (lọc theo scheduled_at
-- >= now trong query) — sai theo phản hồi chị Quỳnh 22/8: "nó phải có mục tích đã làm để mình tích
-- xong mới mất chứ", không phải cứ qua giờ là coi như xong. Thêm cờ done, người dùng tự tích xác
-- nhận (giống pattern calendar_entries.posted) — lịch chỉ biến mất khi THẬT SỰ đã tích.
alter table recording_schedule add column if not exists done boolean not null default false;

-- Thông báo tính năng mới trong app (2026-08-22, theo yêu cầu chị Quỳnh: "mỗi khi mình cập nhật tính
-- năng gì mới thì trên app của khách cũng hiện thông báo và hướng dẫn sử dụng cái tính năng đó") —
-- admin đăng 1 dòng ở đây (qua Quản trị → Thông báo), MỌI user đăng nhập đọc được để hiện banner
-- (RLS đọc mở cho authenticated, ghi/xoá chỉ admin — giống pattern content_bank_shared). Banner tự
-- ẩn khi user đã đọc — xem profiles.last_seen_announcement_at bên dưới (2026-08-24, thay cho cách so
-- 1 ID mới nhất ban đầu, để không bỏ sót thông báo đăng xen giữa 2 lần khách mở app).
create table if not exists feature_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table feature_announcements enable row level security;
drop policy if exists "feature_announcements_read_all" on feature_announcements;
create policy "feature_announcements_read_all" on feature_announcements for select using (auth.role() = 'authenticated');
drop policy if exists "feature_announcements_admin_write" on feature_announcements;
create policy "feature_announcements_admin_write" on feature_announcements for all using (is_admin()) with check (is_admin());

alter table profiles add column if not exists last_seen_announcement_id uuid;

-- Mốc "đã xem thông báo tới thời điểm nào" (2026-08-24, theo yêu cầu chị Quỳnh: "có rất nhiều tính
-- năng mng chưa biết", muốn khách xem ĐỦ mọi thông báo, không chỉ mỗi cái mới nhất) — thay cho
-- last_seen_announcement_id ở trên (so 1 ID mới nhất sẽ làm KHÁCH BỎ LỠ mọi thông báo đăng xen giữa
-- 2 lần khách mở app, vì xem xong 1 cái là nhảy thẳng mốc "đã xem" lên tới ID mới nhất luôn). Dùng
-- mốc thời gian thay vì 1 ID để app-shell.js lọc được TOÀN BỘ thông báo mới hơn mốc này, xếp thành
-- hàng đợi hiện lần lượt — mỗi thông báo xem xong tự đẩy mốc lên đúng created_at của nó rồi hiện
-- tiếp cái kế, không bỏ sót cái nào. Cột last_seen_announcement_id ở trên không xoá (tránh đổi
-- schema có thể ảnh hưởng dữ liệu cũ) nhưng không còn dùng nữa.
alter table profiles add column if not exists last_seen_announcement_at timestamptz;

-- Nâng cấp thông báo tính năng mới thành popup giữa màn hình + hướng dẫn từng bước có thể bấm "Có"
-- xem (2026-08-22, theo phản hồi chị Quỳnh: "làm y hệt như hướng dẫn lúc đầu vô app") — mỗi thông
-- báo có thể kèm 1 danh sách bước, mỗi bước trỏ sáng 1 mục trong sidebar (key khớp NAV ở
-- app-shell.js) kèm lời giải thích, y hệt cơ chế onboarding-tour.js. Mảng rỗng nghĩa là thông báo
-- không có hướng dẫn kèm theo — popup chỉ hiện nội dung, không có nút "Xem hướng dẫn".
alter table feature_announcements add column if not exists steps jsonb not null default '[]';

-- Chọn được sticker/emoji riêng cho từng thông báo (2026-08-22, theo yêu cầu chị Quỳnh) — mặc định
-- 🎉 cho thông báo cũ đã đăng trước khi có cột này.
alter table feature_announcements add column if not exists emoji text not null default '🎉';

-- Áp dụng quy tắc thông báo tính năng mới (feature_announcements ở trên) cho Sổ Dòng Tiền Tâm Thức
-- (2026-08-23, theo yêu cầu chị Quỳnh "áp dụng tất cả quy tắc bên Xây Nhân Hiệu cho web này") — bảng
-- RIÊNG (tc_feature_announcements), KHÔNG dùng chung feature_announcements của nhan-hieu, vì 2 app
-- có tính năng/nội dung hoàn toàn khác nhau — 1 thông báo về Kho Content không có nghĩa gì với người
-- dùng Sổ Dòng Tiền. Cột đánh dấu đã đọc cũng tách riêng (tc_last_seen_announcement_id) trên cùng
-- bảng profiles dùng chung, để không lẫn giữa "đã đọc thông báo nhân hiệu" và "đã đọc thông báo tài
-- chính" của cùng 1 tài khoản.
create table if not exists tc_feature_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  emoji text not null default '🎉',
  steps jsonb not null default '[]',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table tc_feature_announcements enable row level security;
drop policy if exists "tc_feature_announcements_read_all" on tc_feature_announcements;
create policy "tc_feature_announcements_read_all" on tc_feature_announcements for select using (auth.role() = 'authenticated');
drop policy if exists "tc_feature_announcements_admin_write" on tc_feature_announcements;
create policy "tc_feature_announcements_admin_write" on tc_feature_announcements for all using (is_admin()) with check (is_admin());

alter table profiles add column if not exists tc_last_seen_announcement_id uuid;

-- RLS trên profiles đã khoá update tự do của user thường từ trước ("profiles_self_update... cố ý
-- KHÔNG tạo lại — đã khoá từ v3", xem trên) — user CHỈ update được qua RPC hẹp (kiểu
-- update_my_channel_handle/mark_onboarding_seen ở trên). "Đánh dấu đã đọc thông báo" cũng cần đi
-- qua RPC riêng này, không được gọi .update() thẳng từ client (sẽ bị RLS chặn âm thầm, popup sẽ
-- hiện lại mãi vì cột không bao giờ được ghi).
create or replace function public.mark_tc_announcement_seen(ann_id uuid)
returns void as $$
begin
  update public.profiles set tc_last_seen_announcement_id = ann_id where id = auth.uid();
end;
$$ language plpgsql security definer set search_path = public, pg_temp;
grant execute on function public.mark_tc_announcement_seen(uuid) to authenticated;

-- Thu phí Sổ Dòng Tiền Tâm Thức (2026-08-23, theo yêu cầu chị Quỳnh) — mô hình freemium: Ghi Chép
-- Hàng Ngày + Kiến Thức Nền Tảng luôn FREE (giữ thói quen ghi chép + marketing tự nhiên), 6 module
-- còn lại (Chấm Điểm Nghiệp Tiền, Hạt Giống Phước - Nghiệp, Mục Tiêu & Cam Kết, Tổng Kết Tuần/Tháng,
-- Quản Lý Nợ) khoá sau 14 ngày dùng thử trừ khi đã trả phí TRỌN ĐỜI 1 lần (299.000đ — không theo
-- tháng, vì (a) app không tốn AI/API nên không có chi phí vận hành tăng dần cần "theo tháng" mới bù
-- được, (b) hệ SePay/VietinBank hiện tại là chuyển khoản tay 1 lần, không tự động gia hạn định kỳ,
-- thu trọn đời khớp đúng hạ tầng đang có hơn). Cột RIÊNG hoàn toàn với access_until/has_paid của
-- nhan-hieu (sản phẩm khác, giá khác, không được lẫn — 1 user có thể trả phí bên này mà chưa trả
-- phí bên kia hoặc ngược lại). tc_trial_started_at set LƯỜI (lazy) ở lần đầu vào app tai-chinh, xem
-- tai-chinh/js/app-shell.js — KHÔNG dùng chung on_auth_user_created vì trigger đó chạy cho MỌI
-- signup (kể cả từ nhan-hieu), không biết được user có định dùng tai-chinh hay không.
alter table profiles add column if not exists tc_trial_started_at timestamptz;
alter table profiles add column if not exists tc_has_paid boolean not null default false;
alter table profiles add column if not exists tc_paid_at timestamptz;

-- Set mốc bắt đầu dùng thử 14 ngày CHO CHÍNH MÌNH, chỉ khi CHƯA từng set (idempotent — gọi lại
-- nhiều lần vô hại, không reset lại đồng hồ đếm ngược). Qua RPC vì user không update() thẳng
-- profiles được (RLS đã khoá, xem mark_tc_announcement_seen ở trên).
create or replace function public.start_tc_trial()
returns void as $$
begin
  update public.profiles set tc_trial_started_at = now() where id = auth.uid() and tc_trial_started_at is null;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;
grant execute on function public.start_tc_trial() to authenticated;

-- Hướng dẫn lần đầu (onboarding tour) cho Sổ Dòng Tiền Tâm Thức (2026-08-23, áp dụng quy tắc đã có
-- bên nhan-hieu/js/onboarding-tour.js) — cột RIÊNG tc_onboarding_seen, không dùng chung
-- onboarding_seen của nhan-hieu (1 user có thể đã xem tour bên kia nhưng chưa xem bên này).
alter table profiles add column if not exists tc_onboarding_seen boolean not null default false;
create or replace function public.mark_tc_onboarding_seen()
returns void as $$
begin
  update public.profiles set tc_onboarding_seen = true where id = auth.uid();
end;
$$ language plpgsql security definer set search_path = public, pg_temp;
grant execute on function public.mark_tc_onboarding_seen() to authenticated;

-- Kết quả thật (view/like/cmt/share) cho từng bài đã đăng — TỰ NGUYỆN điền, không bắt buộc (2026-08-23,
-- theo đề xuất chị Quỳnh: "ai điền thì có lợi cho lịch tuần tiếp theo, ai ko điền thì thôi"). Trước
-- đây "AI gợi ý lịch tuần" chỉ dựa quy tắc chung (trục/định dạng/CTA tĩnh), không biết bài NÀO của
-- CHÍNH người đó thật sự hiệu quả — giờ nếu người dùng chịu khó điền sau khi đăng, goi-y-lich.js sẽ
-- ưu tiên lặp lại đúng công thức (trục/dạng/CTA) đang hiệu quả thật cho riêng họ. Để NULL nếu chưa
-- điền, không có giá trị mặc định 0 (0 thật khác với "chưa biết").
alter table calendar_entries add column if not exists views integer;
alter table calendar_entries add column if not exists likes integer;
alter table calendar_entries add column if not exists comments integer;
alter table calendar_entries add column if not exists shares integer;

-- Chương trình giới thiệu cho Sổ Dòng Tiền Tâm Thức (2026-08-23, theo yêu cầu chị Quỳnh: "20% cho
-- người giới thiệu") — MỘT CHIỀU (referee vẫn trả nguyên 299.000đ, khác nhan-hieu giảm 15% cho
-- referee), vì chị chốt giữ đúng 1 mức giá duy nhất cho mọi người. Thưởng = 20% × 299.000đ =
-- 59.800đ, trả cho referrer bằng TIỀN THẬT (không phải lượt AI như nhan-hieu, vì tai-chinh không có
-- hệ lượt) — không có API chuyển khoản tự động nào ở đây, nên phải có sổ ghi nợ để chị tự chuyển
-- khoản tay rồi đánh dấu đã trả, không thì không cách nào nhớ nổi ai đang được nợ bao nhiêu.
--
-- TÁI SỬ DỤNG profiles.referred_by_ref_code đã có sẵn (do handle_new_user() ghi lúc đăng ký, dùng
-- CHUNG cho cả 2 app vì đây là "ai đã mời người này vào hệ sinh thái", không phải riêng theo app) —
-- CHỈ thêm cờ RIÊNG tc_referral_reward_given (khác hẳn referral_reward_given của nhan-hieu) để 2 app
-- thưởng ĐỘC LẬP nhau khi referee mua SẢN PHẨM CỦA RIÊNG APP ĐÓ, không đụng nhau, không thưởng trùng.
alter table profiles add column if not exists tc_referral_reward_given boolean not null default false;

-- Sổ hoa hồng — 1 dòng/lần giới thiệu thành công. KHÔNG lưu "số dư" trên profiles (tính lại bằng
-- sum(reward_amount) where paid=false mỗi lần cần, đúng nguyên tắc "không lưu tổng suy ra được"
-- xuyên suốt app tai-chinh — tránh lệch nếu admin sửa paid tay mà quên cập nhật số dư ở chỗ khác).
create table if not exists tc_referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references auth.users(id) on delete cascade,
  referee_id uuid not null references auth.users(id) on delete cascade,
  reward_amount integer not null,
  paid boolean not null default false,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
alter table tc_referrals enable row level security;
drop policy if exists "tc_referrals_referrer_read" on tc_referrals;
create policy "tc_referrals_referrer_read" on tc_referrals for select using (auth.uid() = referrer_id);
drop policy if exists "tc_referrals_admin_all" on tc_referrals;
create policy "tc_referrals_admin_all" on tc_referrals for all using (is_admin()) with check (is_admin());

-- 4 câu số ở Chấm Điểm Nghiệp Tiền (thu nhập/chi tiêu ước tính, thu nhập tự động, số nguồn thu) vốn
-- KHÔNG có chỗ lưu nào (chỉ nằm tạm ở module_drafts, xem tai-chinh/js/thiet-lap-nhanh.js) — góp ý
-- Quỳnh 2026-08-24 "cần có chỗ cho những thứ đó". Gắn vào ĐÚNG tc_networth_snapshots (đã có sẵn,
-- theo tháng, cùng chỗ asset_other/debt_* đang lưu) thay vì tạo bảng riêng, vì cùng bản chất "số ước
-- tính của tháng đó". estimated_income/estimated_expense là số TỰ ƯỚC TÍNH nhanh ở bài test này —
-- KHÁC hẳn thu/chi THẬT tính từ tc_finance_entries (Ghi Chép Hàng Ngày) mà Tổng Kết Tuần/Tháng đang
-- dùng, nên đặt tên "estimated_" để không ai nhầm 2 nguồn số này là một.
alter table tc_networth_snapshots add column if not exists estimated_income numeric;
alter table tc_networth_snapshots add column if not exists estimated_expense numeric;
alter table tc_networth_snapshots add column if not exists passive_income numeric;
alter table tc_networth_snapshots add column if not exists income_sources integer;

-- Danh mục thu/chi — TRƯỚC ĐÂY danh mục chỉ "học" dần từ tc_finance_entries.category_label đã ghi
-- (xem ghi-chep.js loadLearnedCategories, hàm này giữ nguyên để đọc/hiển thị lại lịch sử cũ, không
-- xoá) — góp ý Quỳnh 2026-08-24: "muốn nó là thiết lập ban đầu, không phải chọn lúc ghi" + "để làm
-- ngân sách thì theo đúng cái của người ta luôn". Giờ có bảng riêng để: (1) Ngân sách (đã chuyển
-- sang muc-tieu-cam-ket.js) hiện ĐỦ danh mục ngay từ đầu, không phải chờ có chi tiêu mới "lộ" ra;
-- (2) mỗi danh mục CHI TIÊU gắn sẵn 1 default_classification (CP cố định/CP biến đổi — CHỈ 2 lựa
-- chọn này theo đúng góp ý, không ép Tài sản/Tiêu sản vì bản chất đó thường khác nhau TỪNG LẦN chi,
-- không cố định theo tên danh mục) để tự điền sẵn lúc Ghi Chép, đỡ phải chọn lại "Phân loại (kế
-- toán)" mỗi lần cho cùng 1 danh mục.
create table if not exists tc_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('income','expense')),
  label text not null,
  default_classification text check (default_classification in ('tai_san','tieu_san','cp_co_dinh','cp_bien_doi')),
  created_at timestamptz not null default now(),
  unique(user_id, type, label)
);
alter table tc_categories enable row level security;
drop policy if exists "tc_categories_owner_all" on tc_categories;
create policy "tc_categories_owner_all" on tc_categories for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Lịch sử các lần làm bài Chấm Điểm Nghiệp Tiền — góp ý Quỳnh 2026-08-25: "để chị làm lại thì sau
-- này xem lại được cả những điểm ngày trước đã từng làm theo ngày". KHÁC với vibeScore hiển thị ngay
-- lúc làm bài (tính tươi từ tc_finance_entries/tc_weekly_reflections, không lưu — xem comment gốc ở
-- thiet-lap-nhanh.js): bảng này CỐ Ý lưu lại 1 dòng SNAPSHOT mỗi lần bấm "Xem Kết Quả", để có được
-- đúng lịch sử "điểm ngày X là bao nhiêu" mà không cách nào tính lại được sau này (dữ liệu Vibe Check
-- gốc không lưu theo ngày). append-only — KHÔNG upsert, mỗi lần làm bài là 1 dòng mới.
create table if not exists tc_karma_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  taken_at timestamptz not null default now(),
  vibe_score integer,
  weakest_area text,
  than_tam_ban_the integer,
  coi_nguon_sinh_thanh integer,
  ban_doi_moi_quan_he integer,
  tai_chinh_tam_thuc integer,
  thuan_phap_nhan_qua integer
);
alter table tc_karma_history enable row level security;
drop policy if exists "tc_karma_history_owner_all" on tc_karma_history;
create policy "tc_karma_history_owner_all" on tc_karma_history for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- 16. SẢN PHẨM SỐ (san-pham-so/ — landing page builder bán file tải về, ebook...)
-- ============================================================
-- Sản phẩm số của 1 người bán — dùng chung tài khoản/đăng nhập với Xây Nhân Hiệu (owner_id ->
-- profiles). file_storage_path trỏ vào bucket Storage 'digital-products' (tạo ở cuối mục này) —
-- KHÔNG BAO GIỜ lộ cột này ra client công khai (RLS chỉ chặn được THEO HÀNG, không theo CỘT), khách
-- xem trang công khai phải đọc qua view digital_products_public bên dưới, không đọc bảng gốc.
create table if not exists digital_products (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  slug text not null unique,
  title text not null,
  description text,
  cover_image_url text,
  price bigint not null check (price > 0),
  file_storage_path text,
  file_name text,
  status text not null default 'draft' check (status in ('draft','published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Bật tính năng bán sản phẩm số theo TỪNG tài khoản (MVP giới hạn allowlist trước khi mở cho toàn bộ
-- user Xây Nhân Hiệu — chị Quỳnh tự bật cho ai qua Quản trị hoặc SQL trực tiếp).
alter table profiles add column if not exists can_sell_products boolean not null default false;

-- Mỗi lượt khách mua 1 sản phẩm. Khách KHÔNG có tài khoản/đăng nhập — ref_code (sinh ngẫu nhiên lúc
-- tạo đơn ở api/san-pham-so-create-order.js, tiền tố "SPS" để phân biệt với ref_code "XNH" của
-- Xây Nhân Hiệu trong CÙNG 1 webhook, xem api/sepay-webhook.js) là credential DUY NHẤT của họ để
-- tra cứu/tải lại. amount là giá CHỤP LẠI lúc tạo đơn (không đọc lại digital_products.price sau
-- này) — người bán đổi giá sau không ảnh hưởng đơn đã tạo trước đó.
create table if not exists digital_product_orders (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references digital_products(id) on delete cascade,
  ref_code text not null unique,
  buyer_email text,
  amount bigint not null,
  status text not null default 'pending' check (status in ('pending','paid')),
  paid_at timestamptz,
  download_token uuid,
  created_at timestamptz not null default now()
);

-- Ghi lại đơn sản phẩm số nào vừa được webhook khớp thành công (bên cạnh matched_profile_id đã có
-- sẵn cho nhan-hieu/tai-chinh) — phục vụ đối soát, không dùng để cấp quyền (webhook luôn PATCH thẳng
-- digital_product_orders, không đi qua cột này).
alter table sepay_transactions add column if not exists matched_product_order_id uuid references digital_product_orders(id) on delete set null;

alter table digital_products enable row level security;
drop policy if exists "digital_products_owner_all" on digital_products;
create policy "digital_products_owner_all" on digital_products for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

alter table digital_product_orders enable row level security;
-- KHÔNG có policy nào cho anon/authenticated trên BẢNG GỐC — đơn hàng chỉ được tạo/đọc/sửa qua
-- api/ (service_role, bỏ qua RLS: tạo đơn, webhook đối soát, cấp link tải). Khách công khai tra
-- cứu trạng thái đơn CỦA CHÍNH MÌNH qua view digital_product_order_status bên dưới.

create or replace view digital_products_public as
  select id, slug, title, description, cover_image_url, price
  from digital_products where status = 'published';
grant select on digital_products_public to anon, authenticated;

-- Không có buyer_email/amount trong view này (không cần thiết để tra cứu, tránh lộ thêm dữ liệu).
-- ref_code là chuỗi ngẫu nhiên không đoán được (không tuần tự) nên việc ai có ĐÚNG ref_code tra được
-- trạng thái đơn đó là chấp nhận được — đây chính là "mã tra cứu" hệ thống cấp cho họ sau khi mua.
create or replace view digital_product_order_status as
  select ref_code, status, download_token from digital_product_orders;
grant select on digital_product_order_status to anon, authenticated;

-- Bucket Storage cho file sản phẩm số — LẦN ĐẦU TIÊN dùng Supabase Storage trong repo này (mọi ảnh
-- trước giờ lưu base64 trong cột text, xem CLAUDE.md). public=false và KHÔNG tạo policy nào trên
-- storage.objects cho bucket này -> mặc định deny hết, chỉ service_role (dùng trong api/) đọc/ghi
-- được — đúng ý không dùng link public vĩnh viễn, chỉ phát signed URL có hạn cho từng lượt tải.
insert into storage.buckets (id, name, public)
values ('digital-products', 'digital-products', false)
on conflict (id) do nothing;

-- Đánh giá app (Xây Nhân Hiệu, 2026-08-24, theo yêu cầu chị Quỳnh) — popup xin cảm nhận (không chấm
-- sao, chỉ viết) sau khi người dùng đã có kết quả thật (xem điều kiện trigger ở app-shell.js), + 1
-- mục riêng ở Trang chủ hiện các đánh giá đã duyệt. Cần DUYỆT TRƯỚC khi hiện công khai (giống Kho
-- Content Viral/Kho Hook Viral) — tránh review linh tinh/tiêu cực hiện ngay không kiểm soát được.
create table if not exists app_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  comment text not null,
  -- Lưu THẲNG tên hiển thị lúc gửi (không JOIN profiles lúc hiển thị) — RLS profiles chỉ cho đọc
  -- đúng hàng của mình (profiles_self) + admin, người dùng thường KHÔNG đọc được full_name của
  -- người khác để hiện tên tác giả từng đánh giá công khai.
  display_name text,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);
alter table app_reviews enable row level security;
drop policy if exists "app_reviews_insert_own" on app_reviews;
create policy "app_reviews_insert_own" on app_reviews for insert with check (auth.uid() = user_id);
drop policy if exists "app_reviews_read" on app_reviews;
-- Đọc được: đúng bài của mình (kể cả chưa duyệt, để tự xem lại) HOẶC bài đã duyệt (công khai cho
-- mọi người) — không cho đọc bài CHƯA duyệt của người khác.
create policy "app_reviews_read" on app_reviews for select using (auth.uid() = user_id or approved = true);
drop policy if exists "app_reviews_admin_all" on app_reviews;
create policy "app_reviews_admin_all" on app_reviews for all using (is_admin()) with check (is_admin());

-- review_prompt_dismissed: true sau khi bấm "Để sau" HOẶC sau khi đã gửi 1 đánh giá — cả 2 trường
-- hợp đều không hỏi lại nữa (xem maybeShowReviewPrompt() ở app-shell.js). Đặt qua RPC riêng (không
-- qua update trực tiếp) vì RLS đã khoá tự update bảng profiles từ v3, giống pattern
-- mark_onboarding_seen()/mark_tc_onboarding_seen() đã có.
alter table profiles add column if not exists review_prompt_dismissed boolean not null default false;
-- review_reward_given: chặn thưởng 2 LẦN nếu người dùng gửi nhiều đánh giá đủ điều kiện — chỉ set
-- true trong api/submit-review.js (service role), không có RPC/policy client nào ghi được cột này.
alter table profiles add column if not exists review_reward_given boolean not null default false;

create or replace function public.mark_review_prompt_dismissed()
returns void as $$
begin
  update public.profiles set review_prompt_dismissed = true where id = auth.uid();
end;
$$ language plpgsql security definer set search_path = public, pg_temp;
grant execute on function public.mark_review_prompt_dismissed() to authenticated;

-- Đánh giá app CHUNG cho mọi sản phẩm (2026-08-26, góp ý Quỳnh: "từ giờ làm app nào cũng có phần
-- review, auto" — áp dụng cho tai-chinh trước, dùng LẠI bảng app_reviews có sẵn thay vì tạo bảng
-- riêng, chỉ thêm cột phân biệt sản phẩm). api/submit-review.js đọc `app` từ request body (mặc định
-- 'nhan-hieu' để KHÔNG phá code nhan-hieu cũ chưa từng gửi field này). MỌI truy vấn đọc app_reviews
-- ở cả 2 app PHẢI lọc theo đúng cột `app` này — không thì review sẽ lẫn qua app khác.
alter table app_reviews add column if not exists app text not null default 'nhan-hieu' check (app in ('nhan-hieu','tai-chinh'));

-- Cờ "đã hỏi/đã gửi đánh giá" RIÊNG cho tai-chinh — KHÔNG dùng chung review_prompt_dismissed của
-- nhan-hieu ở trên (1 người có thể đã trả lời popup bên nhan-hieu nhưng chưa bên tai-chinh, và
-- ngược lại), cùng lý do với tc_onboarding_seen tách riêng onboarding_seen phía trên.
alter table profiles add column if not exists tc_review_prompt_dismissed boolean not null default false;
create or replace function public.mark_tc_review_prompt_dismissed()
returns void as $$
begin
  update public.profiles set tc_review_prompt_dismissed = true where id = auth.uid();
end;
$$ language plpgsql security definer set search_path = public, pg_temp;
grant execute on function public.mark_tc_review_prompt_dismissed() to authenticated;

-- ============================================================
-- 17. TẠO SẢN PHẨM BẰNG AI (san-pham-so/ — Giai đoạn 1 Tìm Sản Phẩm Phù Hợp + Giai đoạn 2 Xây Dựng
-- Nội Dung). 1 dòng/user (giống positioning_results của Định Vị) — giả định 1 người làm 1 pipeline
-- ý tưởng→nội dung tại 1 thời điểm.
-- ============================================================
create table if not exists product_idea_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nganh text,
  answers jsonb,          -- 12 câu trả lời Giai đoạn 1
  result jsonb,            -- {du_lieu_du_manh, canh_bao, phuong_an:[...]}
  chosen_index int,        -- phương án đã chọn trong result.phuong_an
  outline_cap_2 jsonb,     -- Giai đoạn 2 bước 1 (mo_dau/phan/ket)
  sections jsonb,          -- {[section_index]: {nghien_cuu, viet, review, status}} — từng phần đã viết
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists product_idea_results_user_unique on product_idea_results(user_id);
alter table product_idea_results enable row level security;
drop policy if exists "product_idea_results_owner_all" on product_idea_results;
create policy "product_idea_results_owner_all" on product_idea_results for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Kết quả thật (view/like/cmt/share) lưu THÊM ở posts (2026-08-26, theo yêu cầu chị Quỳnh: "mục
-- view khi điền ở lịch thì cũng auto cập nhật ở kho luôn, sau này muốn sửa view cũng sửa được, mục
-- đích để theo dõi hiệu quả bài đăng" — chuẩn bị cho mục phân tích hiệu quả bài đăng sắp tới). Trước
-- đây 4 cột này CHỈ có ở calendar_entries (gắn với 1 LẦN xếp lịch cụ thể) — nay đồng bộ 2 chiều với
-- posts (gắn với BÀI, ổn định lâu dài hơn, không mất khi ô lịch bị xoá) — xem lich-dang.js (sync khi
-- điền ở Lịch Đăng Bài) và kho-content.js (sửa trực tiếp tại Kho Content, đồng bộ ngược lại
-- calendar_entries). NULL nghĩa "chưa điền", khác 0 thật.
alter table posts add column if not exists views integer;
alter table posts add column if not exists likes integer;
alter table posts add column if not exists comments integer;
alter table posts add column if not exists shares integer;

-- ============================================================
-- 18. HIỂU ĐỂ KHOẺ MẠNH (suc-khoe/ — app MỚI, khung ban đầu 2026-08-26 theo yêu cầu chị Quỳnh: khách
-- mua sản phẩm/chương trình sức khỏe được cấp tài khoản, kiểm tra + theo dõi sức khỏe theo tuần,
-- lịch trình theo gói đã mua, thư viện tra cứu vấn đề sức khỏe kèm sản phẩm Unicity liên quan, giới
-- thiệu sản phẩm kèm giá bán lẻ, tích điểm/hoa hồng theo tháng, trang tuyển đối tác kinh doanh).
-- Dùng CHUNG Supabase/profiles với nhan-hieu/tai-chinh/san-pham-so (1 tài khoản, nhiều app) — cột
-- riêng của app này đặt tiền tố sk_ (giống tc_ bên tai-chinh) để không đụng cột app khác. Đây CHỈ là
-- bộ khung: gán gói/nhập điểm-hoa hồng đều admin làm TAY qua Quản Trị, CHƯA có thanh toán tự động
-- hay chấm điểm bằng AI — chị Quỳnh sẽ hoàn thiện dần từng phần sau.
-- ============================================================

-- Đánh dấu lần đầu 1 user vào app suc-khoe (để Quản Trị > Thành viên lọc đúng người liên quan tới
-- app này, không lẫn người chỉ dùng app khác — cùng lý do tc_trial_started_at bên tai-chinh). Gói
-- đang dùng do ADMIN gán tay (không có luồng tự đăng ký mua gói ở bản khung này) — cố ý KHÔNG thêm
-- foreign key cứng vào sk_packages (giữ đúng quy tắc "mọi thay đổi ở file này chạy lại vô hại" —
-- thêm constraint chưa có sẵn guard "if not exists" cho add constraint sẽ vỡ nếu chạy lại lần 2).
alter table profiles add column if not exists sk_first_visited_at timestamptz;
alter table profiles add column if not exists sk_package_id uuid;
alter table profiles add column if not exists sk_package_started_at timestamptz;

create or replace function public.mark_sk_first_visit()
returns void as $$
begin
  update public.profiles set sk_first_visited_at = now() where id = auth.uid() and sk_first_visited_at is null;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;
grant execute on function public.mark_sk_first_visit() to authenticated;

-- profiles không cho user thường .update() thẳng (RLS đã khoá từ v3, xem "profiles_self_update" ở
-- trên) — full_name lại là cột DÙNG CHUNG cho mọi app, chưa có RPC nào ghi được cột này (chỉ mới có
-- update_my_channel_handle cho channel_handle/brand_name riêng nhan-hieu). Thêm RPC chung ở đây để
-- trang Tài khoản của app này lưu tên thật sự hoạt động (không âm thầm không lưu được gì).
create or replace function public.update_my_full_name(new_name text)
returns void as $$
begin
  update public.profiles set full_name = new_name where id = auth.uid();
end;
$$ language plpgsql security definer set search_path = public, pg_temp;
grant execute on function public.update_my_full_name(text) to authenticated;

-- Danh mục gói sản phẩm/chương trình sức khỏe (vd "Detox 30 ngày", "Kiểm soát cân nặng"...) — admin
-- tạo/sửa qua Quản Trị > Gói & Lịch Trình.
create table if not exists sk_packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

-- Lịch trình MẪU theo từng gói — day_offset tính từ profiles.sk_package_started_at của user (vd
-- day_offset=0 là ngày bắt đầu, day_offset=7 là đúng 1 tuần sau). 1 gói có nhiều dòng lịch trình,
-- dùng chung cho mọi người mua cùng gói (không phải lịch trình riêng từng người).
create table if not exists sk_package_schedule_items (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references sk_packages(id) on delete cascade,
  day_offset integer not null default 0,
  title text not null,
  description text,
  created_at timestamptz not null default now()
);

-- Đánh dấu đã hoàn thành TỪNG mục lịch trình — riêng theo user (lịch trình mẫu ở trên dùng chung
-- cho cả gói, nhưng tiến độ hoàn thành là của riêng từng người).
create table if not exists sk_schedule_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  schedule_item_id uuid not null references sk_package_schedule_items(id) on delete cascade,
  done_at timestamptz not null default now(),
  primary key (user_id, schedule_item_id)
);

-- Kiểm Tra Sức Khỏe — 1 lần đánh giá nhanh (không cố định theo tuần, khác Theo Dõi Tuần bên dưới),
-- lưu lại toàn bộ lựa chọn để xem lại lịch sử các lần kiểm tra trước + đối chiếu ngược sang Thư Viện.
create table if not exists sk_health_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  flagged_issues text[] not null default '{}',
  note text,
  created_at timestamptz not null default now()
);

-- Theo Dõi Sức Khỏe Theo Tuần — 1 dòng/tuần/user, các chỉ số cơ bản + ghi chú tự do.
create table if not exists sk_weekly_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  weight numeric,
  sleep_hours numeric,
  energy_level integer check (energy_level between 1 and 5),
  mood_level integer check (mood_level between 1 and 5),
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);

-- Thư Viện Sức Khỏe — tra cứu vấn đề: nguyên nhân/biểu hiện/cách xử lý + sản phẩm Unicity liên quan
-- (mảng id trỏ sang sk_products, không FK cứng vì phần tử mảng không ràng buộc được kiểu này trong
-- Postgres). Admin tạo/sửa qua Quản Trị, mọi user đã đăng nhập đọc được (không cần đã mua gói).
create table if not exists sk_library_entries (
  id uuid primary key default gen_random_uuid(),
  issue_name text not null,
  causes text,
  symptoms text,
  remedies text,
  related_product_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

-- Sản phẩm Unicity — giới thiệu công dụng + giá bán lẻ dễ hiểu. Admin tạo/sửa qua Quản Trị, mọi
-- user đã đăng nhập đọc được.
create table if not exists sk_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_description text,
  benefits text,
  retail_price numeric,
  image_url text,
  created_at timestamptz not null default now()
);

-- Tích Điểm & Hoa Hồng theo tháng — admin nhập TAY từng dòng khi khách mua hàng (chưa có luồng tự
-- động đối soát ở bản khung này, khác cơ chế SePay webhook của nhan-hieu/tai-chinh).
create table if not exists sk_points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month text not null, -- 'YYYY-MM'
  points integer not null default 0,
  purchase_amount numeric not null default 0,
  commission numeric not null default 0,
  note text,
  created_at timestamptz not null default now()
);

alter table sk_schedule_progress enable row level security;
alter table sk_health_checkins enable row level security;
alter table sk_weekly_logs enable row level security;
alter table sk_points_ledger enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['sk_schedule_progress','sk_health_checkins','sk_weekly_logs','sk_points_ledger']
  loop
    execute format('drop policy if exists "%1$s_owner_all" on %1$s', t);
    execute format('create policy "%1$s_owner_all" on %1$s for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end $$;

-- sk_packages/sk_package_schedule_items/sk_library_entries/sk_products: đọc mở cho mọi user đã đăng
-- nhập (giống pattern content_bank_shared), chỉ admin ghi được — xem is_admin() ở trên.
alter table sk_packages enable row level security;
alter table sk_package_schedule_items enable row level security;
alter table sk_library_entries enable row level security;
alter table sk_products enable row level security;

drop policy if exists "sk_packages_read" on sk_packages;
create policy "sk_packages_read" on sk_packages for select using (auth.role() = 'authenticated');
drop policy if exists "sk_packages_admin_write" on sk_packages;
create policy "sk_packages_admin_write" on sk_packages for all using (is_admin()) with check (is_admin());

drop policy if exists "sk_package_schedule_items_read" on sk_package_schedule_items;
create policy "sk_package_schedule_items_read" on sk_package_schedule_items for select using (auth.role() = 'authenticated');
drop policy if exists "sk_package_schedule_items_admin_write" on sk_package_schedule_items;
create policy "sk_package_schedule_items_admin_write" on sk_package_schedule_items for all using (is_admin()) with check (is_admin());

drop policy if exists "sk_library_entries_read" on sk_library_entries;
create policy "sk_library_entries_read" on sk_library_entries for select using (auth.role() = 'authenticated');
drop policy if exists "sk_library_entries_admin_write" on sk_library_entries;
create policy "sk_library_entries_admin_write" on sk_library_entries for all using (is_admin()) with check (is_admin());

drop policy if exists "sk_products_read" on sk_products;
create policy "sk_products_read" on sk_products for select using (auth.role() = 'authenticated');
drop policy if exists "sk_products_admin_write" on sk_products;
create policy "sk_products_admin_write" on sk_products for all using (is_admin()) with check (is_admin());
