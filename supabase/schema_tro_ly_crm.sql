-- SCHEMA — TRỢ LÝ AI TƯ VẤN & CRM (tro-ly-crm/). Cần chạy schema_core.sql trước (bảng profiles).
-- Tách từ schema_full.sql (2026-08-30).
-- An toàn chạy lại bất kỳ lúc nào. Cách dùng: Supabase → SQL Editor → New query → dán toàn bộ → Run.

-- ============================================================
-- TRỢ LÝ AI TƯ VẤN & CRM (tro-ly-crm/, 2026-08-29) — app RIÊNG, sản phẩm bán theo tháng/6
-- tháng/năm, thay thế luồng ChatGPT Custom GPT + Lark Base thủ công trước đây. Đăng ký/đăng nhập
-- Supabase ĐỘC LẬP (giống suc-khoe/) — dùng CHUNG project với nhan-hieu/tai-chinh/suc-khoe nên nếu
-- khách đăng nhập đúng email đã dùng ở Xây Nhân Hiệu, user_id trùng tự nhiên, đọc lại được
-- positioning_results (hồ sơ "câu chuyện") mà không cần code gì thêm để "share" tài khoản.
create table if not exists crm_customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ten_khach_hang text not null,
  leader_phu_trach text,
  kenh text,
  link_lien_he text,
  nhom_nhu_cau text[] not null default '{}',
  nhu_cau_cu_the text,
  van_de_noi_dau text,
  giai_doan text,
  do_nong text,
  rao_can text[] not null default '{}',
  giai_phap_phu_hop text,
  lan_tuong_tac_cuoi date,
  ngay_follow_tiep date,
  hanh_dong_tiep_theo text,
  gia_tri_du_kien text,
  ket_qua text,
  ghi_chu_ai text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists crm_customers_user_idx on crm_customers(user_id);
-- Không có unique constraint theo tên/link — trùng tên là bình thường (nhiều khách tên giống nhau),
-- việc phân biệt "có phải cùng 1 khách không" do AI hỏi lại người vận hành khi chưa chắc (đúng
-- nguyên tắc "không tự gộp/tạo trùng" trong prompt gốc), không suy luận cứng bằng constraint DB.

-- FORM-HD (2026-08-29, chị Quỳnh chốt khung khai thác) — riêng nhánh D (Kinh doanh/Đối tác):
-- F=Gia đình, O=Occupation/Công việc, R=Sở thích/Quan hệ, M=Money, H=Sức khỏe, D=Desire/Mong muốn.
-- nhanh lưu phân loại A/B/C/D gần nhất (AI tự set mỗi lần tư vấn, hoặc chọn tay ở Khách Hàng) —
-- form_hd chỉ có ý nghĩa khi nhanh='D', field nào chưa khai thác AI ghi "Chưa có" chứ không bịa.
alter table crm_customers add column if not exists nhanh text;
alter table crm_customers add column if not exists form_hd jsonb;
-- Tỉnh/thành khách (2026-08-30, chị Quỳnh chốt: để gom khách theo khu vực khi đi làm thị trường) —
-- text tự do (không enum), gõ tay hoặc AI điền nếu đọc được từ chat/link.
alter table crm_customers add column if not exists tinh_thanh text;

-- Theo dõi đối tác kinh doanh (2026-08-30, chị Quỳnh chốt: "follow đối tác kinh doanh sẽ khác
-- khách hàng") — khi 1 khách nhánh D đã chốt trở thành đối tác, la_doi_tac=true tách họ khỏi nhịp
-- follow-để-chốt sang nhịp huấn luyện-để-nhân bản riêng. Rút gọn từ giáo trình 8 tuần thật của chị
-- Quỳnh (Google Sheet chị gửi) thành theo dõi TUẦN + ĐIỂM + TRẠNG THÁI, không tick từng đầu việc —
-- 1 leader bảo trợ nhiều đối tác không thể tick tay ~80 dòng/người/tuần, cần biết NHANH ai chậm
-- nhịp để gọi ngay hơn là chấm điểm chi tiết (xem NHANH_GUIDES-style DOI_TAC_TUAN trong khach-hang.js).
alter table crm_customers add column if not exists la_doi_tac boolean not null default false;
alter table crm_customers add column if not exists ngay_thanh_doi_tac date;
alter table crm_customers add column if not exists doi_tac_tuan_hien_tai int;
alter table crm_customers add column if not exists doi_tac_diem_tuan numeric;
alter table crm_customers add column if not exists doi_tac_trang_thai text;
alter table crm_customers add column if not exists doi_tac_ly_do_lam text;
alter table crm_customers add column if not exists doi_tac_rao_can text;
alter table crm_customers add column if not exists doi_tac_hanh_dong_ho_tro text;
alter table crm_customers add column if not exists doi_tac_ghi_chu text;

create table if not exists crm_interactions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references crm_customers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  ten_tuong_tac text,
  thoi_gian date not null default current_date,
  kenh text,
  noi_dung text,
  thong_tin_moi text,
  nhu_cau_noi_dau text,
  phan_doi_rao_can text,
  hanh_dong_da_thuc_hien text,
  ket_qua text,
  buoc_tiep_theo text,
  ngay_follow_tiep date,
  created_at timestamptz not null default now()
);
create index if not exists crm_interactions_customer_idx on crm_interactions(customer_id, created_at desc);

-- Kho case study (2026-08-30, chị Quỳnh chốt: "thêm mục case study cho người dùng tự cập nhật lên
-- bao gồm hình và câu chuyện, kiểu kho lưu trữ") — dùng để bước "gửi case tương tự" trong sổ tay tư
-- vấn (tu-van.js) tự lấy ĐÚNG case thật đã lưu theo nhóm (giảm mỡ/sức khỏe khác) thay vì placeholder
-- chung chung. hinh_anh là mảng data URL (nén JPEG trước khi lưu, giống cách nén ảnh chat sẵn có)
-- vì app này chưa dùng Supabase Storage ở đâu khác — lưu thẳng base64 nhất quán với quy ước hiện tại.
create table if not exists crm_case_studies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nhom text, -- 'giam-mo' | 'suc-khoe-khac' | tự do, khớp với key nhóm trong NHANH_GUIDES (tu-van.js)
  tieu_de text,
  noi_dung text,
  hinh_anh jsonb,
  created_at timestamptz not null default now()
);
create index if not exists crm_case_studies_user_idx on crm_case_studies(user_id, nhom);

alter table crm_customers enable row level security;
alter table crm_interactions enable row level security;
alter table crm_case_studies enable row level security;
do $$
declare
  t text;
begin
  foreach t in array array['crm_customers','crm_interactions','crm_case_studies']
  loop
    execute format('drop policy if exists "%1$s_owner_all" on %1$s', t);
    execute format('create policy "%1$s_owner_all" on %1$s for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end $$;

-- Thanh toán RIÊNG sản phẩm này — KHÔNG dùng chung has_paid/access_until (Xây Nhân Hiệu) hay
-- tc_has_paid (Sổ Dòng Tiền) vì đây là 1 gói/hạn dùng khác hoàn toàn — chỉ khoá theo crm_access_until.
-- (2026-08-30: BAN ĐẦU không giới hạn lượt/tháng, sau đó chị Quỳnh chốt "làm như Xây Nhân Hiệu —
-- hiện bộ đếm lượt" rồi yêu cầu tính lại đúng chi phí thật — xem khối lượt AI phía dưới.)
alter table profiles add column if not exists crm_has_paid boolean not null default false;
alter table profiles add column if not exists crm_access_until timestamptz;
alter table profiles add column if not exists crm_plan_days integer;
-- Đánh dấu lần đầu vào app này (lọc đúng người ở Quản Trị > Thành viên, giống sk_first_visited_at).
alter table profiles add column if not exists crm_first_visited_at timestamptz;

create or replace function public.mark_crm_first_visit()
returns void as $$
begin
  update public.profiles set crm_first_visited_at = now() where id = auth.uid() and crm_first_visited_at is null;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;
grant execute on function public.mark_crm_first_visit() to authenticated;

-- Mã tham chiếu chuyển khoản RIÊNG (tiền tố "CRM") — KHÔNG dùng chung ref_code (đã gắn cứng tiền tố
-- "XNH" từ handle_new_user) vì chị Quỳnh chốt 2026-08-29: sản phẩm này cần tiền tố riêng để tránh
-- tình trạng phải luôn rà số tiền cho khỏi trùng giữa các sản phẩm (xem AMOUNT_TO_DAYS ở
-- api/sepay-webhook.js) — về sau thêm gói giá nào cũng an toàn vì webhook phân biệt sản phẩm qua
-- ĐÚNG tiền tố trước, chỉ dùng số tiền để tính số ngày SAU KHI đã biết chắc là sản phẩm nào.
-- Sinh LƯỜI (chỉ khi khách vào trang Nâng Cấp lần đầu) thay vì cấp sẵn cho mọi profile như ref_code,
-- vì không phải ai trong hệ thống cũng dùng sản phẩm này.
alter table profiles add column if not exists crm_ref_code text;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_crm_ref_code_unique') then
    alter table profiles add constraint profiles_crm_ref_code_unique unique (crm_ref_code);
  end if;
end $$;

create or replace function public.get_or_create_crm_ref_code()
returns text as $$
declare
  v_code text;
begin
  select crm_ref_code into v_code from public.profiles where id = auth.uid();
  if v_code is not null then
    return v_code;
  end if;
  loop
    v_code := 'CRM' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    begin
      update public.profiles set crm_ref_code = v_code where id = auth.uid();
      exit;
    exception when unique_violation then
      -- trùng cực hiếm (gen_random_uuid va chạm) — thử lại với mã khác
    end;
  end loop;
  return v_code;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;
grant execute on function public.get_or_create_crm_ref_code() to authenticated;

-- Hồ sơ "Câu Chuyện Của Bạn" RIÊNG của tro-ly-crm/ — chị Quỳnh chốt 2026-08-29: phải đúng bộ câu hỏi
-- trong trang-ban-dich-vu.html (liên hệ + 20 câu hỏi câu chuyện cá nhân), KHÔNG phải bộ câu hỏi của
-- Định Vị AI (khác mục đích — Định Vị AI phục vụ định hướng content/thương hiệu, còn hồ sơ này phục
-- vụ AI kể chuyện thật khi tư vấn bán hàng). Lưu THÔ, không qua AI xử lý — đúng như luồng gốc trên
-- landing page (chỉ thu thập rồi dùng thẳng, không có bước AI tổng hợp nào). Nếu người dùng đã có
-- positioning_results (Định Vị AI, dùng chung Supabase project) thì cau-chuyen.js vẫn cho họ CHỌN
-- dùng luôn phần cau_chuyen_ca_nhan bên đó thay vì bắt điền lại — 2 nguồn tồn tại song song, ưu tiên
-- đọc bảng này trước (xem api/crm-tuvan.js).
create table if not exists crm_story_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  ten text,
  zalo text,
  links text,
  answers jsonb not null default '{}', -- q1..q20, đúng key với QUESTION_LABELS trong tro-ly-crm/js/cau-chuyen.js
  updated_at timestamptz not null default now()
);
alter table crm_story_profiles enable row level security;
drop policy if exists "crm_story_profiles_owner_all" on crm_story_profiles;
create policy "crm_story_profiles_owner_all" on crm_story_profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Cho chọn "tự viết tự do" thay vì bắt buộc trả lời đủ 20 câu (chị Quỳnh chốt 2026-08-30) — free_story
-- có dữ liệu thì ưu tiên dùng thẳng làm câu chuyện cá nhân (xem api/crm-tuvan.js), answers vẫn giữ
-- nguyên cho chế độ trả lời từng câu — 2 chế độ không bắt buộc dùng cùng lúc.
alter table crm_story_profiles add column if not exists free_story text;

-- Lượt AI RIÊNG cho tro-ly-crm (2026-08-30, chị Quỳnh chốt "làm như Xây Nhân Hiệu — hiện bộ đếm
-- lượt" rồi yêu cầu tính lại đúng chi phí thật) — ĐỘC LẬP hoàn toàn với hệ ai_usage/consume_ai_quota
-- của Xây Nhân Hiệu. Không có khái niệm "dùng thử" — chỉ 1 trần theo tháng (300, xem
-- api/_lib/crm-ai-quota.js), không có nhánh trial/paid như hàm consume_ai_quota gốc.
alter table profiles add column if not exists crm_ai_uses int not null default 0;
alter table profiles add column if not exists crm_ai_month text;
-- "Mua thêm lượt" (Nâng Cấp) — cộng thẳng vào crm_ai_bonus của THÁNG HIỆN TẠI, giống hệt
-- paid_ai_bonus bên Xây Nhân Hiệu (xem CRM_AMOUNT_TO_TOPUP_LUOT/api/sepay-webhook.js) — dùng hết
-- trong tháng, không cộng dồn vĩnh viễn, tự về 0 khi sang tháng mới.
alter table profiles add column if not exists crm_ai_bonus int not null default 0;

drop function if exists public.consume_crm_ai_quota(uuid, int, int);
create or replace function public.consume_crm_ai_quota(p_user_id uuid, p_monthly_limit int, p_weight int default 1)
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
  if v_profile.crm_ai_month = v_month then
    v_current_uses := v_profile.crm_ai_uses;
    v_bonus := coalesce(v_profile.crm_ai_bonus, 0);
  else
    v_current_uses := 0;
    v_bonus := 0;
  end if;
  v_effective_limit := p_monthly_limit + v_bonus;
  if (not v_is_admin) and v_current_uses + p_weight > v_effective_limit then
    return jsonb_build_object('allowed', false, 'effective_limit', v_effective_limit, 'current_uses', v_current_uses);
  end if;
  if v_profile.crm_ai_month = v_month then
    update profiles set crm_ai_uses = crm_ai_uses + p_weight where id = p_user_id;
  else
    update profiles set crm_ai_uses = p_weight, crm_ai_month = v_month, crm_ai_bonus = 0 where id = p_user_id;
  end if;
  return jsonb_build_object('allowed', true, 'current_uses', v_current_uses + p_weight);
end;
$$ language plpgsql security definer set search_path = public, pg_temp;
revoke all on function public.consume_crm_ai_quota(uuid, int, int) from public, authenticated, anon;
grant execute on function public.consume_crm_ai_quota(uuid, int, int) to service_role;

drop function if exists public.refund_crm_ai_quota(uuid, int);
create or replace function public.refund_crm_ai_quota(p_user_id uuid, p_weight int default 1)
returns void as $$
declare
  v_profile profiles%rowtype;
  v_month text := to_char(now(), 'YYYY-MM');
begin
  select * into v_profile from profiles where id = p_user_id for update;
  if not found then return; end if;
  if v_profile.crm_ai_month = v_month then
    update profiles set crm_ai_uses = greatest(0, crm_ai_uses - p_weight) where id = p_user_id;
  end if;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;
revoke all on function public.refund_crm_ai_quota(uuid, int) from public, authenticated, anon;
grant execute on function public.refund_crm_ai_quota(uuid, int) to service_role;

-- Thông báo tính năng mới (2026-08-31, chị Quỳnh: "cho e mục thông báo ở quản trị để e thông báo cho
-- khách về cái hướng dẫn") — RIÊNG cho tro-ly-crm, cùng khuôn với feature_announcements của Xây Nhân
-- Hiệu (title/body/emoji/steps, admin đăng qua Quản Trị → Thông báo, mọi user đăng nhập đọc được).
-- steps: mảng {key, text, img?} — key khớp NAV.key ở app-shell.js, trỏ sáng đúng .sidebar-item khi
-- chạy qua page-tour.js (engine dùng chung mọi trang, xem announcement-popup.js).
create table if not exists crm_feature_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  emoji text not null default '🎉',
  steps jsonb not null default '[]',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table crm_feature_announcements enable row level security;
drop policy if exists "crm_feature_announcements_read_all" on crm_feature_announcements;
create policy "crm_feature_announcements_read_all" on crm_feature_announcements for select using (auth.role() = 'authenticated');
drop policy if exists "crm_feature_announcements_admin_write" on crm_feature_announcements;
create policy "crm_feature_announcements_admin_write" on crm_feature_announcements for all using (is_admin()) with check (is_admin());

-- Mốc "đã xem thông báo tới thời điểm nào" — dùng mốc THỜI GIAN (không phải 1 ID) để lọc được TOÀN
-- BỘ thông báo mới hơn mốc này, xếp hàng đợi hiện lần lượt, không bỏ sót cái nào đăng xen giữa 2 lần
-- vào app (đúng bài học từ last_seen_announcement_at của Xây Nhân Hiệu — bản ID-đơn ban đầu của họ
-- từng bị chính vấn đề này, xem lịch sử feature_announcements ở schema_full.sql cũ).
alter table profiles add column if not exists crm_last_seen_announcement_at timestamptz;

-- profiles KHÔNG cho user thường .update() thẳng (RLS khoá "profiles_self_update" từ lâu, chỉ admin
-- có "profiles_admin_update") — PHẢI qua RPC hẹp này, không được gọi .update() thẳng từ client (sẽ
-- bị RLS chặn ÂM THẦM — không báo lỗi nhưng cũng không ghi được gì — khiến popup hiện lại mãi mãi).
create or replace function public.mark_crm_announcement_seen(seen_at timestamptz)
returns void as $$
begin
  update public.profiles set crm_last_seen_announcement_at = seen_at where id = auth.uid();
end;
$$ language plpgsql security definer set search_path = public, pg_temp;
grant execute on function public.mark_crm_announcement_seen(timestamptz) to authenticated;

-- Chương trình giới thiệu tro-ly-crm (2026-09-01, chị Quỳnh: "làm tương tự như web xây nhân hiệu")
-- — dùng LẠI đúng cơ chế lượt AI của Xây Nhân Hiệu (referrals bảng, KHÔNG phải tiền mặt như
-- tc_referrals), vì tro-ly-crm đã có sẵn hệ lượt AI riêng (crm_ai_bonus). Referrer/referee vẫn dùng
-- CHUNG profiles.ref_code/referred_by_ref_code (cột ecosystem-wide ở schema_core.sql, sinh 1 lần lúc
-- đăng ký bất kể đăng ký qua app nào) — chỉ CỘT ĐÁNH DẤU ĐÃ THƯỞNG và BẢNG GHI SỔ là riêng cho từng
-- sản phẩm (giống referral_reward_given/referrals của Xây Nhân Hiệu và tc_referral_reward_given/
-- tc_referrals của Sổ Dòng Tiền), để 1 referee mua ở nhiều sản phẩm khác nhau thì referrer được
-- thưởng riêng ở TỪNG sản phẩm, không bị chặn lẫn nhau.
alter table profiles add column if not exists crm_referral_reward_given boolean not null default false;

create table if not exists crm_referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references profiles(id) on delete cascade,
  referee_id uuid not null references profiles(id) on delete cascade,
  package_amount bigint not null,
  reward_luot integer not null,
  created_at timestamptz not null default now()
);
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'crm_referrals_referee_id_unique') then
    alter table crm_referrals add constraint crm_referrals_referee_id_unique unique (referee_id);
  end if;
end $$;
create index if not exists crm_referrals_referrer_idx on crm_referrals(referrer_id);
alter table crm_referrals enable row level security;
drop policy if exists "crm_referrals_admin_read" on crm_referrals;
create policy "crm_referrals_admin_read" on crm_referrals for select using (is_admin());
drop policy if exists "crm_referrals_own_read" on crm_referrals;
create policy "crm_referrals_own_read" on crm_referrals for select using (auth.uid() = referrer_id);
