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
