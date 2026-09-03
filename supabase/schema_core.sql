-- SCHEMA CORE — nền tảng dùng chung cho MỌI app trong hệ sinh thái (profiles, xác thực, quota AI,
-- mã giới thiệu). Đây là phần DUY NHẤT bắt buộc chạy trước tất cả các file schema_<app>.sql khác —
-- mọi app đều cần bảng `profiles` + hàm `is_admin()` tồn tại trước khi RLS của riêng nó hoạt động.
--
-- Tách ra từ schema_full.sql (bản gộp cũ, 2026-08-30) theo yêu cầu chị Quỳnh: trước đó mọi app dùng
-- chung 1 file quá lớn, dễ giẫm chân nhau khi nhiều phiên Claude sửa song song, và mỗi lần chỉ cần
-- sửa 1 app lại phải đưa nguyên 1900+ dòng. Từ nay: sửa app nào, chỉ cần chạy schema_core.sql (nếu
-- chưa chạy) + đúng schema_<app>.sql của app đó.
--
-- An toàn chạy lại bất kỳ lúc nào — mọi lệnh dùng "if not exists"/"or replace".
-- Cách dùng: Supabase → SQL Editor → New query → dán toàn bộ → Run.

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

-- Đánh dấu THỜI ĐIỂM đầu tiên user bấm thành công "AI tự viết + xếp cả tuần" (api/auto-fill-week.js)
-- — đây là "khoảnh khắc aha" rõ nhất của app (AI viết + xếp thẳng cả tuần content, không chỉ gợi ý
-- chủ đề), nên cần biết ai ĐÃ chạm tới để: (1) Quản trị hiện được hành trình dùng thử của từng khách
-- (Định Vị → tính năng này → đã đăng bài thật), (2) cron nhắc ai làm xong Định Vị nhưng chưa thử
-- tính năng này thì đẩy push nhắc (xem api/cron/send-reminders.js). NULL nghĩa là chưa từng dùng.
alter table profiles add column if not exists used_auto_fill_week_at timestamptz;

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
  v_month text;
  v_current_uses int;
  v_bonus int;
  v_effective_limit int;
  v_is_admin boolean;
begin
  select * into v_profile from profiles where id = p_user_id for update;
  if not found then
    return jsonb_build_object('allowed', true); -- không tìm thấy profile: fail open, không chặn oan
  end if;

  -- "tính theo tháng kể từ ngày người dùng đăng ký chứ không phải theo tháng trên lịch" (chị Quỳnh
  -- 2026-09-01) — chu kỳ 30 ngày RIÊNG cho từng user, tính từ created_at, không còn dồn chung về
  -- ngày 1 mỗi tháng (xem giải thích đầy đủ ở api/_lib/quota-cycle.js — công thức PHẢI khớp y hệt).
  v_month := floor(extract(epoch from (now() - v_profile.created_at)) / (30 * 86400))::text;

  v_is_admin := (v_profile.role = 'admin');

  -- 2026-08-29, theo yêu cầu chị Quỳnh "cho xem lại nội dung cũ mãi mãi sau khi hết hạn": frontend
  -- (app-shell.js hasActiveAccess()) không còn khoá TOÀN BỘ app khi access_until đã qua — vẫn cho
  -- vào xem Kho Content/Lịch Đăng Bài/lịch sử cũ, CHỈ chặn hành động AI mới. Vì vậy đây PHẢI là nơi
  -- chặn thật (trước đây hàm này chỉ so lượt, hoàn toàn không biết access_until — an toàn chỉ nhờ
  -- frontend chặn sớm hơn; giờ frontend đã mở, nếu không chặn ở đây thì người hết hạn nhưng còn dư
  -- lượt (trial) hoặc gói trả phí đã hết hạn nhưng chưa hết 200 lượt/tháng (paid) vẫn gọi AI được
  -- bình thường, xuyên thủng luôn bức tường thanh toán). Kiểm tra NGAY từ đầu, áp dụng cho CẢ 2
  -- nhánh has_paid true/false bên dưới — không đặt trong nhánh trial vì gói trả phí cũng có
  -- access_until riêng (hết hạn không gia hạn vẫn phải chặn).
  if (not v_is_admin) and v_profile.access_until is not null and v_profile.access_until <= now() then
    return jsonb_build_object('allowed', false, 'effective_limit', 0, 'mode', 'expired');
  end if;

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
  v_month text;
begin
  select * into v_profile from profiles where id = p_user_id for update;
  if not found then return; end if;
  -- Cùng công thức chu kỳ 30 ngày từ created_at như consume_ai_quota() ở trên — xem giải thích ở đó.
  v_month := floor(extract(epoch from (now() - v_profile.created_at)) / (30 * 86400))::text;
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

-- Migrate 1 lần: đổi paid_ai_month của MỌI user còn ở định dạng CŨ 'YYYY-MM' (bất kể tháng nào,
-- không chỉ đúng tháng hiện tại) sang định dạng chu kỳ mới (số chu kỳ 30 ngày từ created_at) — để
-- consume_ai_quota() ở trên (đã đổi sang so bằng định dạng mới) vẫn NHẬN RA họ đang giữa chu kỳ,
-- giữ nguyên paid_ai_uses/paid_ai_bonus hiện có thay vì hiểu nhầm "sang chu kỳ mới" và xoá sạch
-- lượt/bonus đang dùng dở (chị Quỳnh yêu cầu 2026-09-02, tránh mất lượt khách đang dùng dở khi đổi
-- công thức).
-- BUG THẬT (phát hiện 2026-09-03, chị Quỳnh báo "mất tất cả lượt người dùng đã xài từ trước, như bị
-- reset về 0"): bản đầu chỉ khớp where paid_ai_month = to_char(now(),'YYYY-MM') — nghĩa là CHỈ chuyển
-- đổi đúng ai có paid_ai_month = ĐÚNG THÁNG ĐANG CHẠY SCRIPT (tháng 9). Ai lần cuối dùng AI là tháng 8
-- trở về trước (paid_ai_month='2026-08' hoặc cũ hơn) bị BỎ SÓT hoàn toàn — giá trị cũ '2026-08' không
-- bao giờ khớp định dạng số mới ('14'...) ở consume_ai_quota(), khiến MỌI người này bị coi là "sang
-- chu kỳ mới", hiện 0 lượt đã dùng (và mất luôn paid_ai_bonus ngay lần dùng AI tiếp theo). Sửa bằng
-- cách khớp theo ĐỊNH DẠNG (còn dấu gạch ngang kiểu YYYY-MM) thay vì khớp đúng 1 giá trị tháng cụ thể.
-- AN TOÀN CHẠY LẠI: sau lần đầu, paid_ai_month không còn ở định dạng có dấu gạch ngang nữa nên điều
-- kiện where bên dưới không khớp ai nữa — chạy lại chỉ là no-op, không ảnh hưởng gì thêm.
update profiles
set paid_ai_month = floor(extract(epoch from (now() - created_at)) / (30 * 86400))::text
where paid_ai_month ~ '^\d{4}-\d{2}$';

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
-- ROW LEVEL SECURITY — PROFILES
-- ============================================================
-- Chuyển từ schema_nhan_hieu.sql về đây (2026-08-30, sửa lỗi phát hiện khi chị Quỳnh chạy thử lần
-- đầu: Supabase cảnh báo "creates a table without enabling Row Level Security" vì bảng profiles
-- được TẠO ở core nhưng RLS lại chỉ được BẬT ở file nhan-hieu — nếu ai chỉ chạy core mà chưa chạy
-- nhan-hieu, bảng profiles sẽ tồn tại mà KHÔNG có RLS, để lộ toàn bộ dữ liệu người dùng). RLS của
-- profiles phải nằm cùng file với nơi tạo bảng.
alter table profiles enable row level security;
-- user tự xem được chính mình; KHÔNG có quyền tự update (phải qua các RPC ở trên) — nếu không, ai
-- đăng nhập cũng tự set access_until/role của chính họ qua console trình duyệt.
drop policy if exists "profiles_self" on profiles;
create policy "profiles_self" on profiles for select using (auth.uid() = id);
drop policy if exists "profiles_self_update" on profiles; -- cố ý KHÔNG tạo lại — đã khoá từ v3
drop policy if exists "profiles_admin_update" on profiles;
create policy "profiles_admin_update" on profiles for update using (is_admin()) with check (is_admin());
drop policy if exists "profiles_admin_read_all" on profiles;
create policy "profiles_admin_read_all" on profiles for select using (is_admin());

