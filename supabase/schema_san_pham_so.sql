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

-- external_link: đưa về ĐÚNG file này (trước đây bị thêm nhầm ở schema_full.sql, vi phạm quy ước
-- schema-per-app từ 2026-08-30 — tiện sửa luôn lúc thêm các cột giao hàng theo loại bên dưới, xem
-- CLAUDE.md/memory "Known pre-existing schema-file drift"). Đã live ở production từ trước rồi, chỉ
-- là dòng khai báo bị sai chỗ, KHÔNG phải cột mới.
alter table digital_products add column if not exists external_link text;

-- Giao hàng ĐÚNG THEO LOẠI sản phẩm (2026-09-01, Quỳnh: "cơ chế giao hàng theo từng loại"). dinh_dang
-- khớp đúng enum ở TOOL_TIM_SAN_PHAM/DINH_DANG_OPTIONS (api/_lib/tim-san-pham-schema.js,
-- san-pham-so/js/util.js) — KHÔNG bắt buộc (null = sản phẩm cũ trước khi có tính năng này, coi như
-- ebook/checklist, vẫn dùng file_storage_path/external_link như trước, không phá dữ liệu cũ).
-- Cơ chế giao hàng theo loại (xem api/san-pham-so-check-order.js):
--   ebook/checklist_workbook -> file_storage_path (file tải về) — ĐÃ có sẵn, không đổi.
--   template_file_mau/coaching_1_1/cong_dong_tra_phi/webinar -> external_link (1 link duy nhất,
--     nhãn khác nhau theo loại ở UI: link template / link đặt lịch / link mời nhóm / link Zoom-Meet)
--     — ĐÃ có sẵn cột, chỉ thêm dinh_dang để UI hiện đúng nhãn/hướng dẫn theo loại.
--   mini_course -> mini_course_lessons (nhiều bài, mỗi bài 1 tên + 1 link riêng, không phải 1 link
--     chung) — CẦN cột mới vì external_link không đủ (chỉ chứa được 1 link).
--   webinar -> THÊM webinar_datetime (ngày giờ diễn ra) cạnh external_link (link Zoom/Meet).
alter table digital_products add column if not exists dinh_dang text;
alter table digital_products add column if not exists mini_course_lessons jsonb;
alter table digital_products add column if not exists webinar_datetime timestamptz;

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

-- dinh_dang/webinar_datetime lộ CÔNG KHAI (cần để trang mua hiện đúng "bạn sẽ nhận được gì"/ngày giờ
-- TRƯỚC khi mua) — nhưng external_link/mini_course_lessons/file_storage_path (nội dung giao hàng
-- thật) TUYỆT ĐỐI không lộ ở đây, chỉ trả về SAU khi xác nhận đã thanh toán qua
-- api/san-pham-so-check-order.js.
-- drop+create (không phải "or replace") vì Postgres không cho "or replace" đổi vị trí/số lượng cột
-- của 1 view đã tồn tại — mỗi bản dưới đây thêm cột mới nên PHẢI drop trước, tránh lỗi 42P16.
drop view if exists digital_products_public;
create view digital_products_public as
  select id, slug, title, description, cover_image_url, price, dinh_dang, webinar_datetime
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

-- ============================================================
-- 19. TẠO LANDING PAGE (2026-09-01) — AI viết nội dung landing page đầy đủ hơn (hook/vấn đề/lợi
-- ích/FAQ/CTA...) cho 1 sản phẩm, LƯU LẠI thành JSON thay vì tạo lại mỗi lần khách xem trang (đỡ tốn
-- lượt AI, và người bán có thể tự sửa tay sau khi AI viết). null = chưa tạo, trang mua công khai vẫn
-- dùng bản đơn giản hiện tại (title/description/price) như trước — không phá sản phẩm cũ.
-- KHÔNG chứa gì nhạy cảm (chỉ là nội dung quảng cáo) nên an toàn lộ công khai qua
-- digital_products_public, khác hẳn external_link/mini_course_lessons/file_storage_path.
-- ============================================================
alter table digital_products add column if not exists landing_page_content jsonb;
-- landing_page_template (2026-09-02): NỘI DUNG do AI viết luôn theo đúng 1 công thức đã chốt với
-- Quỳnh — mẫu chỉ đổi GIAO DIỆN (màu/bố cục/typography) hiển thị nội dung đó, không đổi số câu hỏi
-- AI hay các trường dữ liệu. 'classic' = mặc định (giao diện card hiện có, không đổi gì cho sản phẩm
-- cũ chưa từng chọn mẫu).
alter table digital_products add column if not exists landing_page_template text default 'classic';

drop view if exists digital_products_public;
create view digital_products_public as
  select id, slug, title, description, cover_image_url, price, dinh_dang, webinar_datetime, landing_page_content, landing_page_template
  from digital_products where status = 'published';
grant select on digital_products_public to anon, authenticated;

-- ============================================================
-- 20. LANDING PAGE TỰ ĐỘNG — ẢNH CÁ NHÂN + CASE STUDY THẬT + ĐƠN HÀNG CỦA TÔI (2026-09-02)
-- Quỳnh: "làm cho họ 90% luôn, 10% chỉ là người dùng tải thông tin của họ lên thôi" — người bán chỉ
-- tải ảnh cá nhân (dùng chung mọi sản phẩm) + ảnh case study THẬT (khách/học viên thật của HỌ, ảnh do
-- CHÍNH NGƯỜI BÁN tải lên — giải quyết đúng nguyên tắc "AI không được bịa testimonial" vì đây là ảnh
-- thật, không phải chữ AI tự nghĩ ra), chọn mẫu giao diện, còn lại AI viết hết + tự động thu tiền/giao
-- hàng như cũ (dòng tiền KHÔNG đổi trong batch này — vẫn về tài khoản Quỳnh, xem project memory về
-- phương án "mỗi người dùng tự kết nối ngân hàng riêng qua SePay Bank Hub", để dự án riêng sau).
-- ============================================================

-- sps_seller_photo_url: ảnh cá nhân/thương hiệu, DÙNG CHUNG cho MỌI sản phẩm của 1 người bán (khác
-- case_study_images — ảnh riêng theo TỪNG sản phẩm) — lưu base64 trong cột text, đúng quy ước ảnh nhỏ
-- toàn repo (xem CLAUDE.md), không cần bucket Storage mới.
alter table profiles add column if not exists sps_seller_photo_url text;

-- profiles RLS đã KHOÁ profiles_self_update từ v3 (user thường không tự UPDATE thẳng profiles của
-- mình được) — như mọi cột user tự ghi khác trong file này, phải qua 1 RPC security definer riêng,
-- không đi qua .update() thẳng từ client (xem util.js/tao-landing-page.js).
create or replace function public.update_sps_seller_photo(p_photo_url text)
returns void as $$
begin
  update public.profiles set sps_seller_photo_url = p_photo_url where id = auth.uid();
end;
$$ language plpgsql security definer set search_path = public, pg_temp;
grant execute on function public.update_sps_seller_photo(text) to authenticated;

-- case_study_images: mảng jsonb [{url, caption}], ảnh THẬT + chú thích do người bán tự viết, RIÊNG
-- theo từng sản phẩm — hiện công khai TRƯỚC khi mua (là nội dung bán hàng, không phải deliverable),
-- khác hẳn file_storage_path/external_link/mini_course_lessons.
alter table digital_products add column if not exists case_study_images jsonb;

-- View cuối cùng cho trang mua công khai — thêm case_study_images + JOIN lấy ảnh cá nhân người bán
-- (chỉ lộ đúng 1 cột ảnh, không lộ thêm gì khác từ profiles).
drop view if exists digital_products_public;
create view digital_products_public as
  select dp.id, dp.slug, dp.title, dp.description, dp.cover_image_url, dp.price, dp.dinh_dang, dp.webinar_datetime,
         dp.landing_page_content, dp.landing_page_template, dp.case_study_images,
         p.sps_seller_photo_url as seller_photo_url
  from digital_products dp
  left join profiles p on p.id = dp.owner_id
  where dp.status = 'published';
grant select on digital_products_public to anon, authenticated;

-- "Đơn hàng của tôi" (san-pham-so/js/don-hang.js) — người bán tự xem đơn của MÌNH. digital_product_orders
-- vẫn KHÔNG có policy nào cho anon/authenticated (xem mục 17 phía trên) — đọc qua api/san-pham-so-my-orders.js
-- (service role, tự lọc product_id thuộc đúng owner_id = user.id trước khi query orders), không cần
-- policy DB mới.

-- ============================================================
-- 21. LANDING PAGE — LÀM SÂU HƠN + ƯU ĐÃI TẶNG KÈM (2026-09-02, sau khi Quỳnh so với landing page
-- thật 30ngaytamlinhtaichinh.netlify.app: bản trước "hời hợt" — thiếu lộ trình/chương trình chia
-- từng chặng, vấn đề chưa được đặt tên riêng, chưa có ưu đãi tặng kèm). bonus_items: NGƯỜI BÁN TỰ
-- VIẾT (không phải AI) — bonus là 1 CAM KẾT thật của người bán, AI không được tự bịa ra ưu đãi thay
-- họ (khác hẳn landing_page_content, do AI viết). AI_WEIGHTS/schema công thức xem
-- api/_lib/landing-page-schema.js (van_de → van_de_intro+van_de_chi_tiet, noi_dung_gioi_thieu →
-- chuong_trinh, thêm loi_nhan_nguoi_ban) — sản phẩm cũ có landing_page_content theo schema cũ vẫn
-- hiển thị được ở trang mua (các field cũ không khớp field mới chỉ đơn giản không render phần đó,
-- không lỗi) nhưng nên "Viết lại bằng AI" để có bản đầy đủ theo schema mới.
-- ============================================================
alter table digital_products add column if not exists bonus_items jsonb;

-- CỘT MỚI (bonus_items) PHẢI đứng SAU cùng, giữ nguyên đúng thứ tự các cột đã có trước đó — Postgres
-- không cho "create or replace view" đổi vị trí cột đã tồn tại, dù tên/kiểu dữ liệu giữ nguyên (lỗi
-- 42P16 "cannot drop columns from view" Quỳnh gặp 2026-09-02 khi bonus_items bị chèn giữa
-- case_study_images và seller_photo_url — chỉ được PHÉP thêm cột mới vào cuối danh sách).
drop view if exists digital_products_public;
create view digital_products_public as
  select dp.id, dp.slug, dp.title, dp.description, dp.cover_image_url, dp.price, dp.dinh_dang, dp.webinar_datetime,
         dp.landing_page_content, dp.landing_page_template, dp.case_study_images,
         p.sps_seller_photo_url as seller_photo_url, dp.bonus_items
  from digital_products dp
  left join profiles p on p.id = dp.owner_id
  where dp.status = 'published';
grant select on digital_products_public to anon, authenticated;

-- ============================================================
-- 22. RÀ SOÁT ĐỘ HIỆU QUẢ LANDING PAGE (2026-09-03, Quỳnh: "check lại bố cục... thừa thiếu gì để tạo
-- ra 1 landing page hiệu quả"). 3 chỗ sửa + 1 tuỳ chọn mới, tất cả đều là DỮ LIỆU THẬT do người bán tự
-- quyết/tự nhập hoặc đếm thật từ đơn hàng — không phải AI viết thêm:
-- - guarantee_text: cam kết hoàn tiền TRƯỚC ĐÂY hardcode cho MỌI sản phẩm dù người bán có đồng ý hay
--   không (rủi ro hứa hộ) — giờ null = KHÔNG hiện gì, có giá trị = hiện đúng nội dung người bán tự viết.
-- - reference_price: "giá trị tham khảo" hiện gạch ngang cạnh giá bán thật (kiểu mẫu tham khảo của
--   Quỳnh có "giá trị thực tế 9tr" vs "giá bán 3.99tr") — người bán tự nhập, không phải AI suy đoán.
-- - paid_count (không phải cột, tính trực tiếp trong view qua subquery): số đơn ĐÃ THANH TOÁN thật của
--   ĐÚNG sản phẩm đó — khác hẳn kiểu "68 người đăng ký" ở mẫu tham khảo (số đó không kiểm chứng được).
-- Thanh mua dính đáy khi cuộn (sticky CTA bar) là thay đổi UI/CSS thuần, không cần cột DB.
-- ============================================================
alter table digital_products add column if not exists guarantee_text text;
alter table digital_products add column if not exists reference_price bigint;

drop view if exists digital_products_public;
create view digital_products_public as
  select dp.id, dp.slug, dp.title, dp.description, dp.cover_image_url, dp.price, dp.dinh_dang, dp.webinar_datetime,
         dp.landing_page_content, dp.landing_page_template, dp.case_study_images,
         p.sps_seller_photo_url as seller_photo_url, dp.bonus_items, dp.guarantee_text, dp.reference_price,
         (select count(*)::int from digital_product_orders o where o.product_id = dp.id and o.status = 'paid') as paid_count
  from digital_products dp
  left join profiles p on p.id = dp.owner_id
  where dp.status = 'published';
grant select on digital_products_public to anon, authenticated;

-- ============================================================
-- 23. "ĐỘI NGŨ ĐỨNG SAU" + THỐNG KÊ THẬT (2026-09-03, Quỳnh: "link landing page em gửi có phần nào thì
-- mẫu có phần đó... link aichuyengia có đội ngũ đứng sau khoá học thì mẫu cũng phải có" — ví dụ cụ thể
-- của 1 phần đang thiếu hẳn, không có cách nào tái dùng dữ liệu cũ để dựng). Cả 2 đều do NGƯỜI BÁN TỰ
-- NHẬP (không phải AI viết) — team_members: tên/vai trò/tiểu sử/ảnh THẬT của người đồng hành cùng
-- khoá học (không phải chỉ 1 người bán như trước). stat_items: số liệu THẬT người bán tự cung cấp
-- (kiểu "5 năm kinh nghiệm"/"200 học viên") — giải quyết đúng nhu cầu "thanh số liệu" ở nhiều trang
-- tham khảo mà KHÔNG cần bịa, vì số này do chính người bán gõ vào, không phải hệ thống suy đoán.
-- ============================================================
alter table digital_products add column if not exists team_members jsonb;
alter table digital_products add column if not exists stat_items jsonb;

drop view if exists digital_products_public;
create view digital_products_public as
  select dp.id, dp.slug, dp.title, dp.description, dp.cover_image_url, dp.price, dp.dinh_dang, dp.webinar_datetime,
         dp.landing_page_content, dp.landing_page_template, dp.case_study_images,
         p.sps_seller_photo_url as seller_photo_url, dp.bonus_items, dp.guarantee_text, dp.reference_price,
         (select count(*)::int from digital_product_orders o where o.product_id = dp.id and o.status = 'paid') as paid_count,
         dp.team_members, dp.stat_items
  from digital_products dp
  left join profiles p on p.id = dp.owner_id
  where dp.status = 'published';
grant select on digital_products_public to anon, authenticated;
