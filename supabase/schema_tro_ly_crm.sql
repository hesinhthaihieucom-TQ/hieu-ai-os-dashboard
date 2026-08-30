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
-- tc_has_paid (Sổ Dòng Tiền) vì đây là 1 gói/hạn dùng khác hoàn toàn. Không giới hạn lượt AI/tháng
-- (chị Quỳnh chốt 2026-08-29) — chỉ khoá theo crm_access_until, không cần cột đếm lượt riêng.
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
