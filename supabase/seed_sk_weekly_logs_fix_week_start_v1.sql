-- SỬA GẤP: "Lỗi khi lưu: null value in column 'week_start' of relation 'sk_weekly_logs' violates
-- not-null constraint" (2026-09-06, chị Quỳnh báo lỗi thật, chặn hoàn toàn việc lưu Theo Dõi Tuần).
--
-- Nguyên nhân: sk_weekly_logs TỪNG có cấu trúc cũ (week_start/weight/sleep_hours/energy_level/
-- mood_level/note, trước khi đổi sang lưu jsonb "metrics") — "create table if not exists" ở
-- schema_suc_khoe.sql KHÔNG đụng gì tới bảng đã tồn tại, nên các cột cũ + ràng buộc not null/primary
-- key cũ của chúng vẫn còn nguyên trên production dù code không còn dùng tới. Postgres luôn kiểm tra
-- NOT NULL trên dòng đề xuất chèn của "insert ... on conflict do update" NGAY CẢ KHI câu lệnh cuối
-- cùng sẽ chuyển thành UPDATE (vì đã có dòng trùng user_id) — nên mọi lần upsert từ app đều lỗi vì
-- không truyền week_start. An toàn chạy lại nhiều lần (tự bỏ qua nếu cột không tồn tại/đã nullable).

-- 1. Xoá PRIMARY KEY cũ nếu nó có week_start trong đó (không thể chỉ "drop not null" khi cột còn
--    đang là 1 phần của primary key — Postgres sẽ từ chối).
do $$
declare
  pk_name text;
begin
  select tc.constraint_name into pk_name
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
  where tc.table_name = 'sk_weekly_logs' and tc.constraint_type = 'PRIMARY KEY' and kcu.column_name = 'week_start';
  if pk_name is not null then
    execute format('alter table sk_weekly_logs drop constraint %I', pk_name);
  end if;
end $$;

-- 2. Bỏ NOT NULL trên các cột cũ không còn dùng — chỉ chạy nếu cột đó thật sự tồn tại và đang
--    not null (tránh lỗi nếu ai chạy trên DB chưa từng có các cột này).
do $$
begin
  if exists (select 1 from information_schema.columns where table_name='sk_weekly_logs' and column_name='week_start' and is_nullable='NO') then
    alter table sk_weekly_logs alter column week_start drop not null;
  end if;
  if exists (select 1 from information_schema.columns where table_name='sk_weekly_logs' and column_name='weight' and is_nullable='NO') then
    alter table sk_weekly_logs alter column weight drop not null;
  end if;
  if exists (select 1 from information_schema.columns where table_name='sk_weekly_logs' and column_name='sleep_hours' and is_nullable='NO') then
    alter table sk_weekly_logs alter column sleep_hours drop not null;
  end if;
  if exists (select 1 from information_schema.columns where table_name='sk_weekly_logs' and column_name='energy_level' and is_nullable='NO') then
    alter table sk_weekly_logs alter column energy_level drop not null;
  end if;
  if exists (select 1 from information_schema.columns where table_name='sk_weekly_logs' and column_name='mood_level' and is_nullable='NO') then
    alter table sk_weekly_logs alter column mood_level drop not null;
  end if;
end $$;
