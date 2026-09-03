-- SCHEMA — SỔ DÒNG TIỀN TÂM THỨC (tai-chinh/). Cần chạy schema_core.sql trước, và schema_nhan_hieu.sql
-- trước phần cuối file này (mở rộng bảng app_reviews vốn được tạo bên nhan-hieu — 2 app dùng chung
-- bảng đánh giá, chỉ khác cột `app`). Tách từ schema_full.sql (2026-08-30).
-- An toàn chạy lại bất kỳ lúc nào. Cách dùng: Supabase → SQL Editor → New query → dán toàn bộ → Run.

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

-- Nhắc ghi chép qua Web Push (2026-09-01, chị Quỳnh phản ánh khách bấm link vào từ Facebook/Zalo
-- xong làm xong bài Chấm Điểm là thoát luôn, không quay lại ghi thu chi đều). Dùng LẠI hạ tầng
-- push_subscriptions/notification_log đã có sẵn cho cả hệ sinh thái (tạo ở schema_nhan_hieu.sql,
-- xem api/_lib/push.js + api/cron/send-reminders.js) — không tạo bảng riêng. Mỗi user tự chọn tần
-- suất ở Tài khoản: 'daily' (mặc định — nhắc mỗi tối 20:00) hoặc 'weekly' (nhắc 1 lần Chủ Nhật
-- 19:00, cho người chỉ muốn ghi bù cả tuần 1 lần — Ghi Chép Hàng Ngày đã có sẵn ô chọn ngày nên ghi
-- bù ngày cũ vẫn ra đúng dữ liệu) hoặc 'off'. Default 'daily' CHỈ áp dụng cho user đã bật thông báo
-- (cron lọc thêm theo có subscription hay không, xem send-reminders.js) nên không tự làm phiền ai
-- chưa từng bấm "Bật thông báo".
alter table profiles add column if not exists tc_reminder_frequency text not null default 'daily' check (tc_reminder_frequency in ('daily','weekly','off'));

-- Qua RPC vì user không update() thẳng profiles được (RLS đã khoá, xem mark_tc_announcement_seen ở trên).
create or replace function public.set_tc_reminder_frequency(freq text)
returns void as $$
begin
  if freq not in ('daily','weekly','off') then
    raise exception 'invalid tc_reminder_frequency: %', freq;
  end if;
  update public.profiles set tc_reminder_frequency = freq where id = auth.uid();
end;
$$ language plpgsql security definer set search_path = public, pg_temp;
grant execute on function public.set_tc_reminder_frequency(text) to authenticated;

-- "Tổng Kết Năm" (2026-08-26, góp ý Quỳnh: thêm tổng kết năm, liên kết với Chấm Điểm Nghiệp Tiền +
-- Hạt Giống Phước - Nghiệp) — chỉ lưu ĐÚNG phần không suy ra được từ bảng khác: lời cam kết cho năm
-- tới theo từng Trụ Cột (giống goal_house_reasons ở tc_monthly_reflections, nhưng quy mô năm) + 1
-- đoạn nhìn lại năm qua tự do. Số liệu tổng hợp cả năm (thu/chi/tài sản ròng/tích luỹ), điểm nghiệp
-- cuối năm, và danh sách hạt giống trong năm đều TÍNH TƯƠI từ tc_finance_entries/tc_networth_snapshots/
-- tc_karma_history/tc_core_beliefs đã có sẵn — không lưu trùng số liệu suy ra được (đúng nguyên tắc
-- "Điểm Nghiệp không lưu số cố định" đã áp dụng xuyên suốt app này), xem tong-ket-nam.js.
create table if not exists tc_yearly_reflections (
  user_id uuid not null references auth.users(id) on delete cascade,
  year integer not null,
  reflection_summary text,
  next_year_goals jsonb, -- { house_key: "lời cam kết cho năm tới" }
  updated_at timestamptz not null default now(),
  primary key (user_id, year)
);
alter table tc_yearly_reflections enable row level security;
drop policy if exists "tc_yearly_reflections_owner_all" on tc_yearly_reflections;
create policy "tc_yearly_reflections_owner_all" on tc_yearly_reflections for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Danh mục con cho "Tích Lũy" (2026-09-01, góp ý Quỳnh: "tích lũy phải có ở những phần mà chi tiêu
-- và thu nhập có chứ nhỉ") — thêm 'tich_luy' làm giá trị type thứ 3 hợp lệ ở tc_categories, để Quản
-- Lý Danh Mục quản lý được danh mục con cho Tích Lũy (VD: Tiết kiệm ngân hàng, Vàng, Cổ phiếu...)
-- giống hệt cách Chi Tiêu/Thu Nhập đã có sẵn. KHÔNG đổi tc_finance_entries.type — giao dịch Tích Lũy
-- vẫn ghi type='expense' + category_label='Tích Lũy' như cũ (giữ nguyên logic loại trừ
-- TICH_LUY_CATEGORY_LABEL đang dùng ở tong-ket-tuan.js/tong-ket-thang.js), chỉ thêm cột
-- tich_luy_category để lưu đúng danh mục con nào vừa chọn.
alter table tc_categories drop constraint if exists tc_categories_type_check;
alter table tc_categories add constraint tc_categories_type_check check (type in ('income','expense','tich_luy'));

-- CỘT CŨ, không còn ghi mới nữa (xem migration ngay dưới) — giữ lại chỉ để không mất dữ liệu nếu đã
-- lỡ ghi vài dòng trong lúc bản "danh mục con ẩn dưới Chi tiêu" còn tồn tại (rất ngắn, 1 bản build).
alter table tc_finance_entries add column if not exists tich_luy_category text;

-- NÂNG CẤP tiếp: "Tích Lũy" giờ là 1 LOẠI giao dịch riêng ngang hàng Thu nhập/Chi tiêu, không còn là
-- danh mục con ẩn dưới Chi tiêu nữa (2026-09-01, góp ý Quỳnh: "mục loại giao dịch cũng phải có mục
-- tích lũy riêng chứ" — sau khi đã thấy bản trước chưa đủ). Giao dịch Tích Lũy MỚI ghi thẳng
-- type='tich_luy' + category_label=<danh mục con, VD "Vàng"> — không dùng type='expense' +
-- category_label='Tích Lũy' + tich_luy_category nữa (bản cũ ở trên). tong-ket-tuan.js/
-- tong-ket-thang.js đã tự loại type='tich_luy' khỏi tổng thu/chi (chỉ cộng type==='income'/'expense'),
-- không cần sửa gì thêm ở đó — VẪN giữ nguyên loại trừ category_label==='Tích Lũy' để tương thích
-- ngược với vài dòng cũ (nếu có) còn mang type='expense'.
alter table tc_finance_entries drop constraint if exists tc_finance_entries_type_check;
alter table tc_finance_entries add constraint tc_finance_entries_type_check check (type in ('income','expense','tich_luy'));

-- Popup mời bật thông báo đẩy NGAY TỪ ĐẦU (2026-09-03, góp ý Quỳnh: "pop up thông báo cho ngta ngay
-- từ đầu để bảo ng ta bật thông báo... nhắc lịch còn bao nhiêu ngày là hết hạn khuyến mại") — khác
-- "Nhắc ghi chép" ở Ghi Chép Hàng Ngày (nút bấm chủ động, đã có sẵn), đây là 1 popup TỰ HIỆN 1 lần
-- (xem maybeShowTcPushPrompt() ở app-shell.js) để mời bật thông báo — chỉ hỏi 1 lần/tài khoản, dù bấm
-- "Bật thông báo" hay "Để sau" cũng đều đánh dấu đã hỏi (không hỏi lại mỗi lần vào app). Cờ RIÊNG,
-- không dùng chung tc_review_prompt_dismissed — 2 popup khác mục đích, có thể độc lập bật/tắt.
alter table profiles add column if not exists tc_push_prompt_seen boolean not null default false;
create or replace function public.mark_tc_push_prompt_seen()
returns void as $$
begin
  update public.profiles set tc_push_prompt_seen = true where id = auth.uid();
end;
$$ language plpgsql security definer set search_path = public, pg_temp;
grant execute on function public.mark_tc_push_prompt_seen() to authenticated;
