-- SCHEMA — XÂY NHÂN HIỆU (nhan-hieu/). Cần chạy schema_core.sql trước (bảng profiles + is_admin()).
-- Tách từ schema_full.sql (2026-08-30) — xem ghi chú đầu schema_core.sql.
-- An toàn chạy lại bất kỳ lúc nào. Cách dùng: Supabase → SQL Editor → New query → dán toàn bộ → Run.

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


-- Auto-đăng Fanpage (2026-08-27, theo yêu cầu chị Quỳnh) — CHỈ dùng cho 1 Fanpage riêng của chị
-- Quỳnh (token cấu hình ở biến môi trường Vercel FB_PAGE_ID/FB_PAGE_ACCESS_TOKEN trên server, không
-- lưu DB, không phải OAuth theo từng user), nên không cần bảng token riêng — chỉ thêm cột lên
-- calendar_entries để cron api/cron/auto-publish-fb.js biết ô nào cần tự đăng + ghi lại kết quả.
alter table calendar_entries add column if not exists auto_publish_fb boolean not null default false;
alter table calendar_entries add column if not exists fb_publish_status text
  check (fb_publish_status in ('pending','published','failed'));
alter table calendar_entries add column if not exists fb_post_id text;
alter table calendar_entries add column if not exists fb_publish_error text;

-- Tách "Lịch Cá nhân" (kế hoạch đăng FB cá nhân, tự tay đăng — cách dùng gốc của mọi user) và "Lịch
-- Fanpage" (auto-đăng ở trên) thành 2 LANE độc lập trong cùng bảng, thay vì 1 lịch chung — theo phản
-- hồi chị Quỳnh 2026-08-27: "lịch hiện tại là đăng fb cá nhân, cho em 1 mục nữa là lịch fanpage để
-- làm riêng" (chị đã điền kín lịch cá nhân tuần này, cron auto-fill tưởng hết chỗ nên không lấp được
-- cho Fanpage). Dòng cũ mặc định 'ca_nhan' — đúng bản chất dữ liệu cũ, không cần migrate tay.
alter table calendar_entries add column if not exists channel text not null default 'ca_nhan'
  check (channel in ('ca_nhan','fanpage'));

-- Ảnh case study thật (2026-08-27) — cột này ĐÃ THAY THẾ bởi bảng case_studies riêng bên dưới (chị
-- Quỳnh phản hồi: chỉ muốn tải ẢNH thôi, không muốn gõ tiêu đề/nội dung mà form content_bank_personal
-- bắt buộc phải có). Giữ nguyên cột này không dùng nữa — KHÔNG xoá để tránh rủi ro mất dữ liệu nếu
-- đã lỡ upload gì qua bản cũ, chị Quỳnh tự xoá sau nếu chắc chắn không cần.
alter table content_bank_personal add column if not exists case_study_image text;

-- posts.image_data: ảnh THẬT được api/cron/auto-fill-schedule.js gán khi viết bài (nếu tìm được 1
-- ảnh case study cùng trục nội dung với bài đang viết — xem bảng case_studies bên dưới) — để
-- api/cron/auto-publish-fb.js lúc đăng biết đây là bài có ảnh thật, ưu tiên dùng thay vì tự tạo ảnh
-- AI. Tách cột riêng khỏi `structure` (jsonb) vì đây là dữ liệu ảnh, không phải nội dung bài viết.
alter table posts add column if not exists image_data text;

-- Kho Case Study riêng (2026-08-27, theo yêu cầu chị Quỳnh) — CHỈ ảnh, KHÔNG có tiêu đề/nội dung, AI
-- tự phân loại trục nội dung ngay khi tải lên (api/phan-loai-truc-anh.js, cùng PILLARS dùng chung ở
-- api/_lib/pillars.js). api/cron/auto-fill-schedule.js ghép ảnh vào bài đang viết theo TRỤC TRÙNG
-- nhau (không cần ảnh "thuộc về" đúng bài đó, chỉ cần đúng ngành) — xem posts.image_data ở trên.
create table if not exists case_studies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  image text not null,
  tags text[],
  created_at timestamptz not null default now()
);
alter table case_studies enable row level security;
drop policy if exists "case_studies_owner_all" on case_studies;
create policy "case_studies_owner_all" on case_studies for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Kho Ảnh cá nhân (2026-08-28, theo yêu cầu chị Quỳnh) — ghép cùng 1 ảnh case study làm ảnh đăng
-- Fanpage (ảnh cá nhân làm nền, case study làm khung nhỏ góc — xem api/_lib/image-gen.js
-- compositeCaseStudyImage). Không cần trục/phân loại gì — ảnh cá nhân dùng chung cho mọi bài.
create table if not exists personal_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  image text not null,
  created_at timestamptz not null default now()
);
alter table personal_photos enable row level security;
drop policy if exists "personal_photos_owner_all" on personal_photos;
create policy "personal_photos_owner_all" on personal_photos for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- card_corner (2026-08-28) — chị Quỳnh tự chọn góc đặt khung case study cho TỪNG ảnh cá nhân, vì vị
-- trí che mặt hay không tuỳ ảnh, không có cách nào AI tự đoán chắc chắn mà không tốn thêm 1 lượt gọi
-- AI/bài. Mặc định 'top-right' (khớp hành vi cũ trước khi có cột này).
alter table personal_photos add column if not exists card_corner text not null default 'top-right'
  check (card_corner in ('top-right','top-left','bottom-right','bottom-left'));

-- Phase 8 (2026-08-28) — chị Quỳnh chốt kiến trúc 3 lớp CTA: bài chính (không link) → cmt ghim ngay
-- (không link) → cmt kèm link thật SAU 2 TIẾNG (không phải ngay lập tức nữa) → tự trả lời + nhắn tin
-- riêng cho ai bình luận đúng từ khoá. cta_link_comment_at đánh dấu đã đăng cmt kèm link (null = chưa).
alter table calendar_entries add column if not exists cta_link_comment_at timestamptz;

-- Chống trả lời/nhắn tin trùng lặp cho cùng 1 comment nếu cron (chạy mỗi 15 phút) bắt lại đúng comment
-- đó nhiều lần trước khi Facebook xoá nó khỏi danh sách /comments.
create table if not exists fb_comment_replies (
  id uuid primary key default gen_random_uuid(),
  calendar_entry_id uuid not null references calendar_entries(id) on delete cascade,
  fb_comment_id text not null unique,
  replied_at timestamptz not null default now()
);
-- Bật RLS, KHÔNG thêm policy nào — chỉ cron (service_role, luôn bypass RLS) đụng bảng này, khoá hẳn
-- client (anon/authenticated) không đọc/ghi được gì, vì bảng này thuần phụ trợ cho cron, không hiển
-- thị ở app phía nào.
alter table fb_comment_replies enable row level security;
