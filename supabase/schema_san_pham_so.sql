-- SCHEMA — SẢN PHẨM SỐ (san-pham-so/). Cần chạy schema_core.sql trước (bảng profiles).
-- Tách từ schema_full.sql (2026-08-30).
-- An toàn chạy lại bất kỳ lúc nào. Cách dùng: Supabase → SQL Editor → New query → dán toàn bộ → Run.

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
-- Cho admin xem TOÀN BỘ sản phẩm (mọi người bán) — cần cho mục Quản trị (2026-09-01), trước đây
-- KHÔNG có policy nào cho admin nên Quản trị không đọc được digital_products của người khác.
drop policy if exists "digital_products_admin_read" on digital_products;
create policy "digital_products_admin_read" on digital_products for select using (is_admin());

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


-- ============================================================
-- 17. TẠO SẢN PHẨM BẰNG AI (san-pham-so/ — Giai đoạn 1 Tìm Sản Phẩm Phù Hợp/Chọn Loại + Giai đoạn 2
-- Xây Dựng Nội Dung). MỖI SẢN PHẨM 1 DÒNG (2026-09-01, đổi từ "1 dòng/user" — Quỳnh: muốn "lưu tạm"
-- 1 sản phẩm đang xây để bắt đầu sản phẩm khác, không bị mất/đè lên nhau). Quy ước: TỐI ĐA 1 dòng
-- CHƯA chọn phương án (chosen_index null, "ý tưởng đang cân nhắc") — quản lý bằng code ở
-- san-pham-so/js/util.js (loadPendingIdeaResult/saveIdeaResult), không có ràng buộc DB; có thể NHIỀU
-- dòng ĐÃ chọn (mỗi dòng 1 sản phẩm đang xây ở Giai đoạn 2).
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
-- 2026-09-01: bỏ giới hạn 1 dòng/user (đã đổi sang mỗi sản phẩm 1 dòng, xem ghi chú ở trên).
drop index if exists product_idea_results_user_unique;
create index if not exists product_idea_results_user_id_idx on product_idea_results(user_id);
alter table product_idea_results enable row level security;
drop policy if exists "product_idea_results_owner_all" on product_idea_results;
create policy "product_idea_results_owner_all" on product_idea_results for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- 17. GÓI RIÊNG SẢN PHẨM SỐ (2026-09-01) — Quỳnh: "2 cái này không liên quan đến nhau, e vẫn thu phí
-- người dùng là 599k cho app này 1 tháng". Sản Phẩm Số có gói/lượt AI HOÀN TOÀN TÁCH BIỆT khỏi Xây
-- Nhân Hiệu, dù vẫn đăng nhập chung 1 tài khoản (cùng bảng profiles/auth.users) — KHÔNG đụng tới
-- has_paid/access_until/trial_ai_uses/trial_ai_limit/paid_ai_uses/paid_ai_month/paid_ai_bonus gốc
-- (đó vẫn là của riêng Xây Nhân Hiệu). Mọi cột/hàm dưới đây tiền tố "sps_" để không bao giờ lẫn.
-- Bản sao mô phỏng ĐÚNG pattern đã có cho Trợ Lý CRM (crm_has_paid/consume_crm_ai_quota/
-- get_or_create_crm_ref_code, xem schema_tro_ly_crm.sql) — khác 1 điểm: Sản Phẩm Số CÓ dùng thử
-- (trial) trước khi trả phí (CRM thì không), nên consume_sps_ai_quota mô phỏng consume_ai_quota
-- (schema_core.sql, có nhánh trial/paid) thay vì consume_crm_ai_quota (chỉ có 1 mức trả phí).
-- 240 lượt/tháng trả phí + 20 lượt dùng thử trọn đời — ĐỀ XUẤT theo đúng tỷ lệ giá/lượt Xây Nhân
-- Hiệu đang áp (499k/tháng ≈ 200 lượt), Quỳnh đã xác nhận số này.
-- ============================================================
alter table profiles add column if not exists sps_has_paid boolean not null default false;
alter table profiles add column if not exists sps_access_until timestamptz;
alter table profiles add column if not exists sps_trial_ai_uses int not null default 0;
alter table profiles add column if not exists sps_trial_ai_limit int; -- null = dùng SPS_TRIAL_AI_LIMIT mặc định (20)
alter table profiles add column if not exists sps_paid_ai_uses int not null default 0;
alter table profiles add column if not exists sps_paid_ai_month text;
alter table profiles add column if not exists sps_paid_ai_bonus int not null default 0;
alter table profiles add column if not exists sps_ref_code text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_sps_ref_code_unique') then
    alter table profiles add constraint profiles_sps_ref_code_unique unique (sps_ref_code);
  end if;
end $$;

-- get_or_create_sps_ref_code(): sinh LAZY khi người dùng vào màn "Nâng Cấp" lần đầu (không sinh sẵn
-- lúc đăng ký như ref_code "XNH" gốc, vì không phải ai dùng Xây Nhân Hiệu cũng dùng Sản Phẩm Số) —
-- y hệt get_or_create_crm_ref_code(), chỉ đổi tiền tố "SPUP" (Sản Phẩm Số Upgrade). CỐ Ý KHÔNG dùng
-- tiền tố bắt đầu bằng "SPS" — mã đơn hàng lẻ hiện có (extractProductOrderRefCode/api/sepay-webhook.js)
-- đã khớp regex /SPS[A-Z0-9]{6,}/i, nên bất kỳ mã nào bắt đầu "SPS..." cũng bị nhánh đó "vồ" mất
-- trước khi tới nhánh gói tháng này — "SPUP" tránh hẳn việc phải sửa regex cũ, không rủi ro đụng độ.
create or replace function public.get_or_create_sps_ref_code()
returns text as $$
declare
  v_code text;
begin
  select sps_ref_code into v_code from public.profiles where id = auth.uid();
  if v_code is not null then
    return v_code;
  end if;
  loop
    v_code := 'SPUP' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    begin
      update public.profiles set sps_ref_code = v_code where id = auth.uid();
      exit;
    exception when unique_violation then
      -- trùng cực hiếm (gen_random_uuid va chạm) — thử lại với mã khác
    end;
  end loop;
  return v_code;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;
grant execute on function public.get_or_create_sps_ref_code() to authenticated;

-- consume_sps_ai_quota / refund_sps_ai_quota — bản sao logic consume_ai_quota/refund_ai_quota
-- (schema_core.sql) nhưng đọc/ghi đúng bộ cột sps_* riêng. Dùng chu kỳ 30 ngày từ profiles.created_at
-- giống hệt (KHÔNG cần cột "ngày bắt đầu dùng Sản Phẩm Số" riêng — ngày tạo tài khoản gốc là đủ).
drop function if exists public.consume_sps_ai_quota(uuid, int, int, int);
create or replace function public.consume_sps_ai_quota(p_user_id uuid, p_trial_limit int, p_paid_limit int, p_weight int default 1)
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

  v_month := floor(extract(epoch from (now() - v_profile.created_at)) / (30 * 86400))::text;
  v_is_admin := (v_profile.role = 'admin');

  if (not v_is_admin) and v_profile.sps_access_until is not null and v_profile.sps_access_until <= now() then
    return jsonb_build_object('allowed', false, 'effective_limit', 0, 'mode', 'expired');
  end if;

  if not v_profile.sps_has_paid then
    declare
      v_trial_limit int := coalesce(v_profile.sps_trial_ai_limit, p_trial_limit);
    begin
      if (not v_is_admin) and v_profile.sps_trial_ai_uses + p_weight > v_trial_limit then
        return jsonb_build_object('allowed', false, 'effective_limit', v_trial_limit, 'mode', 'trial');
      end if;
      update profiles set sps_trial_ai_uses = sps_trial_ai_uses + p_weight where id = p_user_id;
      return jsonb_build_object('allowed', true);
    end;
  end if;

  if v_profile.sps_paid_ai_month = v_month then
    v_current_uses := v_profile.sps_paid_ai_uses;
    v_bonus := coalesce(v_profile.sps_paid_ai_bonus, 0);
  else
    v_current_uses := 0;
    v_bonus := 0;
  end if;
  v_effective_limit := p_paid_limit + v_bonus;

  if (not v_is_admin) and v_current_uses + p_weight > v_effective_limit then
    return jsonb_build_object('allowed', false, 'effective_limit', v_effective_limit, 'mode', 'paid');
  end if;

  if v_profile.sps_paid_ai_month = v_month then
    update profiles set sps_paid_ai_uses = sps_paid_ai_uses + p_weight where id = p_user_id;
  else
    update profiles set sps_paid_ai_uses = p_weight, sps_paid_ai_month = v_month, sps_paid_ai_bonus = 0 where id = p_user_id;
  end if;
  return jsonb_build_object('allowed', true);
end;
$$ language plpgsql security definer set search_path = public, pg_temp;
revoke all on function public.consume_sps_ai_quota(uuid, int, int, int) from public, authenticated, anon;
grant execute on function public.consume_sps_ai_quota(uuid, int, int, int) to service_role;

drop function if exists public.refund_sps_ai_quota(uuid, int);
create or replace function public.refund_sps_ai_quota(p_user_id uuid, p_weight int default 1)
returns void as $$
declare
  v_profile profiles%rowtype;
  v_month text;
begin
  select * into v_profile from profiles where id = p_user_id for update;
  if not found then return; end if;
  v_month := floor(extract(epoch from (now() - v_profile.created_at)) / (30 * 86400))::text;
  if not v_profile.sps_has_paid then
    update profiles set sps_trial_ai_uses = greatest(0, sps_trial_ai_uses - p_weight) where id = p_user_id;
    return;
  end if;
  if v_profile.sps_paid_ai_month = v_month then
    update profiles set sps_paid_ai_uses = greatest(0, sps_paid_ai_uses - p_weight) where id = p_user_id;
  end if;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;
revoke all on function public.refund_sps_ai_quota(uuid, int) from public, authenticated, anon;
grant execute on function public.refund_sps_ai_quota(uuid, int) to service_role;

-- ============================================================
-- 18. ĐÁNH GIÁ cho Sản Phẩm Số (2026-09-01) — dùng LẠI bảng app_reviews có sẵn (chung với nhan-hieu/
-- tai-chinh), giống đúng cách tai-chinh đã mở rộng (xem schema_tai_chinh.sql). QUAN TRỌNG: cột `app`
-- có CHECK CONSTRAINT chỉ cho phép 'nhan-hieu'/'tai-chinh' — phải nới constraint này trước, nếu
-- không insert app='san-pham-so' sẽ lỗi ngay (phát hiện lúc build, chưa từng báo lỗi thật vì chưa ai
-- gửi giá trị này). sps_review_reward_given/sps_review_prompt_dismissed TÁCH RIÊNG khỏi
-- review_reward_given/review_prompt_dismissed gốc (nhan-hieu) và tc_review_prompt_dismissed
-- (tai-chinh) — 1 người có thể đã đánh giá Xây Nhân Hiệu nhưng chưa từng được hỏi đánh giá Sản Phẩm
-- Số, không dùng chung cờ được.
alter table app_reviews drop constraint if exists app_reviews_app_check;
alter table app_reviews add constraint app_reviews_app_check check (app in ('nhan-hieu', 'tai-chinh', 'san-pham-so'));

alter table profiles add column if not exists sps_review_reward_given boolean not null default false;
alter table profiles add column if not exists sps_review_prompt_dismissed boolean not null default false;

-- profiles RLS đã khoá update trực tiếp từ client cho user thường (xem ghi chú ở đầu file) — cần RPC
-- riêng để bấm "Để sau" ghi được cờ đã bỏ qua, y hệt mark_review_prompt_dismissed() bên nhan-hieu.
create or replace function public.mark_sps_review_prompt_dismissed()
returns void as $$
begin
  update public.profiles set sps_review_prompt_dismissed = true where id = auth.uid();
end;
$$ language plpgsql security definer set search_path = public, pg_temp;
grant execute on function public.mark_sps_review_prompt_dismissed() to authenticated;
