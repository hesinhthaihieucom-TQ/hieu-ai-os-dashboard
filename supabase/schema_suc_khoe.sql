-- SCHEMA — HIỂU ĐỂ KHOẺ MẠNH (suc-khoe/). Cần chạy schema_core.sql trước (bảng profiles + is_admin()).
-- Tách từ schema_full.sql (2026-08-30) — nội dung giống hệt phần "18. HIỂU ĐỂ KHOẺ MẠNH" trong file
-- cũ, không đổi gì. Đây là bản MỚI NHẤT, thay thế các file seed_sk_*/schema_suc_khoe_patch1.sql lẻ
-- trước đó — từ nay chỉ cần chạy file này cho mọi thay đổi schema của app sức khỏe.
-- An toàn chạy lại bất kỳ lúc nào. Cách dùng: Supabase → SQL Editor → New query → dán toàn bộ → Run.

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
-- Hướng dẫn sử dụng theo khung giờ trong ngày (2026-08-30, chị Quỳnh gửi file HD_ ... .pdf cho 3 bộ
-- sản phẩm: Chuyển Hoá 60N / Giảm Mỡ 30N / Thải Độc Full) — KHÁC hẳn sk_package_schedule_items (đó là
-- việc làm 1 LẦN vào 1 ngày cụ thể, còn đây là quy trình LẶP LẠI mỗi ngày, chỉ liều lượng tăng dần
-- theo mốc ngày — không hợp để tách thành nhiều dòng "day_offset" (sẽ phải tạo hàng chục dòng trùng
-- lặp mỗi ngày). Lưu nguyên khối tham khảo dạng jsonb, hiển thị tĩnh ở đầu Lịch Trình Của Bạn:
-- [{ time_label: "Buổi sáng ngay sau khi ngủ dậy", steps: [{ product, image_url, instruction }] }, ...]
alter table sk_packages add column if not exists regimen_sections jsonb not null default '[]'::jsonb;

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

-- Kiểm Tra Sức Khỏe — mô phỏng "Khảo sát sơ bộ" của hieu-de-khoe-manh.vercel.app (chị Quỳnh yêu cầu
-- làm kỹ giống bản gốc, 2026-08-30): 3 nhóm triệu chứng tick-chọn (kháng insulin / tích tụ độc tố /
-- tiêu chí hội chứng rối loạn chuyển hóa). 1 dòng hiện tại/user — tick tới đâu lưu tới đó, không có
-- bước "nộp bài" riêng, kết quả (mức độ + điểm) tính lại ở client mỗi lần tick (xem kiem-tra-suc-khoe.js).
-- Dùng CREATE TABLE tối thiểu + ALTER ADD COLUMN IF NOT EXISTS cho phần còn lại (thay vì nhét hết vào
-- CREATE TABLE) — vì bảng này đã từng được tạo với cấu trúc CŨ (flagged_issues/note) trước khi đổi
-- sang khảo sát 3 nhóm hôm nay; nếu chỉ sửa CREATE TABLE, "if not exists" sẽ bỏ qua toàn bộ khi bảng
-- đã tồn tại và cột mới KHÔNG được thêm (đúng lỗi PostgREST "Could not find the 'survey_insulin'
-- column" chị Quỳnh gặp phải lúc test 2026-08-30).
create table if not exists sk_health_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table sk_health_checkins add column if not exists survey_insulin text[] not null default '{}';
alter table sk_health_checkins add column if not exists survey_toxin text[] not null default '{}';
alter table sk_health_checkins add column if not exists survey_metabolic text[] not null default '{}';
alter table sk_health_checkins add column if not exists updated_at timestamptz not null default now();
-- Cột cũ (flagged_issues, note) không còn dùng nữa — để nguyên cho an toàn, không xoá.
do $$
begin
  delete from sk_health_checkins a using sk_health_checkins b
    where a.user_id = b.user_id and a.id < b.id; -- gom về 1 dòng/user trước khi thêm unique bên dưới
  if not exists (select 1 from pg_constraint where conname = 'sk_health_checkins_user_id_key') then
    alter table sk_health_checkins add constraint sk_health_checkins_user_id_key unique (user_id);
  end if;
end $$;

-- Theo Dõi Sức Khỏe Theo Tuần — mô phỏng "Chỉ số cơ thể" của bản gốc: 9 mốc cố định (Bắt đầu + Tuần
-- 1..8, không phải tuần lịch) x 3 nhóm chỉ số (thông số cơ thể / xét nghiệm máu / yếu tố cuộc sống
-- tự đánh giá — xem METRIC_GROUPS trong theo-doi-tuan.js). Lưu 1 dòng/user dạng
-- jsonb {metric_key: {checkpoint_index: "value"}} — ghi tới đâu lưu tới đó, không cần nút Lưu riêng.
-- Cùng lý do ALTER thay vì nhét vào CREATE TABLE như sk_health_checkins ở trên.
create table if not exists sk_weekly_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table sk_weekly_logs add column if not exists metrics jsonb not null default '{}'::jsonb;
alter table sk_weekly_logs add column if not exists updated_at timestamptz not null default now();
-- Cột cũ (week_start, weight, sleep_hours, energy_level, mood_level, note) không còn dùng nữa.
do $$
begin
  delete from sk_weekly_logs a using sk_weekly_logs b
    where a.user_id = b.user_id and a.id < b.id;
  if not exists (select 1 from pg_constraint where conname = 'sk_weekly_logs_user_id_key') then
    alter table sk_weekly_logs add constraint sk_weekly_logs_user_id_key unique (user_id);
  end if;
end $$;

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
-- Ghi chú RIÊNG cho từng sản phẩm trong related_product_ids, theo ĐÚNG mục này (2026-08-30, chị
-- Quỳnh phản hồi: "phải nói sao cho người ta hiểu sản phẩm đấy giúp cải thiện vấn đề của khách như
-- nào") — 1 sản phẩm (vd Red Clover Plus) có thể xuất hiện ở NHIỀU mục Thư Viện với LÝ DO khác nhau
-- mỗi nơi, nên lưu ở đây (theo từng dòng entry) thay vì lưu chung trên sk_products. Shape jsonb:
-- { "<product_id>": { "note": "câu giải thích ngắn theo đúng vấn đề này", "priority": true/false } }
-- priority=true đánh dấu 2-3 sản phẩm NÊN DÙNG TRƯỚC nếu khách không đủ ngân sách mua hết cả nhóm.
alter table sk_library_entries add column if not exists product_notes jsonb not null default '{}'::jsonb;

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
-- Phân nhánh sản phẩm (2026-08-30, theo Sổ tay Chăm sóc sức khoẻ chủ động chị Quỳnh gửi) — 4 nhánh cố
-- định dùng để lọc/nhóm ở trang Sản Phẩm Unicity. NULL = sản phẩm chưa xếp nhánh (vd nhóm mỹ phẩm
-- Neigene) — ALTER thay vì nhét vào CREATE TABLE vì bảng này có thể đã được tạo từ trước, cùng lý do
-- đã áp dụng cho sk_health_checkins/sk_weekly_logs ở trên.
alter table sk_products add column if not exists category text
  check (category in ('thai_doc','giam_mo','tang_de_khang','lam_dep_da'));
-- Nội dung chi tiết dạng nhiều mục (2026-08-30, chị Quỳnh phản hồi "benefits" 1 đoạn text là hời hợt,
-- cần bố cục rõ theo mục như 1 chuyên gia bán hàng trình bày, xem thêm mới hiện ra) — mảng jsonb
-- [{title, body}], mỗi phần tử là 1 mục có tiêu đề riêng (vd "Công dụng theo nhãn đăng ký", "Thành
-- phần & vai trò từng hoạt chất", "Cơ chế tác động", "Đối tượng sử dụng & Cách dùng", "Nghiên cứu
-- khoa học", "Lưu ý"). "benefits" (cột cũ) vẫn giữ làm bản tóm tắt ngắn hiện ngay khi chưa bấm "Xem
-- thêm"; detail_sections là nội dung đầy đủ.
alter table sk_products add column if not exists detail_sections jsonb not null default '[]'::jsonb;

-- Gói Combo sản phẩm (2026-08-30, chị Quỳnh yêu cầu tạo combo phù hợp dựa trên dữ liệu sản phẩm đã
-- có) — product_ids KHÔNG dùng FK cứng (giống related_product_ids ở sk_library_entries) vì phần tử
-- mảng không ràng buộc được kiểu này trong Postgres. combo_price do admin tự đặt (không tự tính giảm
-- giá) — xem Quản Trị khi có UI CRUD cho combo, hiện tại chỉnh bằng SQL.
create table if not exists sk_product_combos (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category text check (category in ('thai_doc','giam_mo','tang_de_khang','lam_dep_da')),
  product_ids uuid[] not null default '{}',
  combo_price numeric,
  created_at timestamptz not null default now()
);
alter table sk_product_combos enable row level security;
drop policy if exists "sk_product_combos_read" on sk_product_combos;
create policy "sk_product_combos_read" on sk_product_combos for select using (auth.role() = 'authenticated');
drop policy if exists "sk_product_combos_admin_write" on sk_product_combos;
create policy "sk_product_combos_admin_write" on sk_product_combos for all using (is_admin()) with check (is_admin());

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

-- Điểm PV chính thức theo bảng giá Unicity (2026-08-30, chị Quỳnh gửi bảng PV riêng cho bán lẻ) —
-- dùng để tích PV/tháng cho khách (200pv → lì xì, 500pv → quyền lợi VIP kinh doanh, xem sk_orders).
alter table sk_products add column if not exists pv numeric;

-- Đặt hàng từ app (2026-08-30, chị Quỳnh yêu cầu "cho khách bấm chọn sản phẩm... đến mục thanh toán
-- luôn") — CHỈ thu thông tin đơn hàng + địa chỉ giao, KHÔNG có thanh toán tự động (chị Quỳnh chốt:
-- admin tự liên hệ khách chốt thanh toán, giống cách sk_points_ledger đang làm tay). items chụp lại
-- tên/giá/PV tại thời điểm đặt (đổi giá sau không ảnh hưởng đơn cũ, giống digital_product_orders).
-- gift tính CỨNG lúc đặt hàng theo tổng tiền + số sản phẩm (2 sản phẩm trở lên và ≥2 triệu: tặng bình
-- lắc; ≥5 triệu: tặng thêm son Hàn) — admin xem cột này để biết cần gói kèm quà gì khi giao.
create table if not exists sk_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  items jsonb not null default '[]'::jsonb,
  total_amount numeric not null default 0,
  total_pv numeric not null default 0,
  gift text check (gift in ('binh_lac','binh_lac_son')),
  shipping_name text not null,
  shipping_phone text not null,
  shipping_address text not null,
  note text,
  status text not null default 'cho_xac_nhan' check (status in ('cho_xac_nhan','da_xac_nhan','da_giao','huy')),
  created_at timestamptz not null default now()
);
alter table sk_orders enable row level security;
drop policy if exists "sk_orders_owner_read_insert" on sk_orders;
create policy "sk_orders_owner_read_insert" on sk_orders for select using (auth.uid() = user_id);
drop policy if exists "sk_orders_owner_insert" on sk_orders;
create policy "sk_orders_owner_insert" on sk_orders for insert with check (auth.uid() = user_id);
drop policy if exists "sk_orders_admin_all" on sk_orders;
create policy "sk_orders_admin_all" on sk_orders for all using (is_admin()) with check (is_admin());
