-- SCHEMA — DỰNG VIDEO AI (dung-video/, khung ban đầu 2026-10-11). Cần chạy schema_core.sql trước
-- (bảng profiles + is_admin()) và schema_nhan_hieu.sql (bảng module_drafts, dùng chung).
-- Mô hình giống Calita Cut: khách gửi video lên web, "Máy dựng" (chương trình chạy trên máy tính của
-- khách hoặc server của mình) hỏi việc mới bằng token riêng, dựng xong tải kết quả lên, khách chỉ
-- việc xem rồi tải. Máy dựng KHÔNG đăng nhập Supabase Auth — nó đi qua api/dung-video-may.js dùng
-- service_role, nên các bảng này chủ yếu cho khách ĐỌC (RLS owner) + admin đọc tất cả.
-- An toàn chạy lại bất kỳ lúc nào. Cách dùng: Supabase → SQL Editor → New query → dán toàn bộ → Run.

alter table profiles add column if not exists dv_first_visited_at timestamptz;
alter table profiles add column if not exists dv_brand_name text;   -- "Thương hiệu trên bìa"
alter table profiles add column if not exists dv_signature text;    -- chữ ký dưới video, vd "Hiểu để Hạnh Phúc"
alter table profiles add column if not exists dv_channel text;      -- phat_trien | suc_khoe | khac (chọn bộ quy tắc dựng)

create or replace function public.mark_dv_first_visit()
returns void as $$
begin
  update public.profiles set dv_first_visited_at = now() where id = auth.uid() and dv_first_visited_at is null;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;
grant execute on function public.mark_dv_first_visit() to authenticated;

-- profiles không cho user .update() thẳng (RLS khoá) → ghi 3 cột cài đặt riêng của app này qua RPC.
create or replace function public.update_my_dv_settings(p_brand text, p_signature text, p_channel text)
returns void as $$
begin
  update public.profiles set
    dv_brand_name = left(coalesce(p_brand,''), 60),
    dv_signature = left(coalesce(p_signature,''), 60),
    dv_channel = case when p_channel in ('phat_trien','suc_khoe','khac') then p_channel else 'khac' end
  where id = auth.uid();
end;
$$ language plpgsql security definer set search_path = public, pg_temp;
grant execute on function public.update_my_dv_settings(text,text,text) to authenticated;

-- Máy dựng đã ghép nối. Chỉ lưu BĂM của token (sha256) — token gốc hiện đúng 1 lần lúc tạo.
create table if not exists dv_machines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Máy dựng',
  token_hash text not null unique,
  last_seen_at timestamptz,
  info jsonb not null default '{}'::jsonb,   -- máy tự báo: hệ điều hành, ffmpeg, whisper... (doctor)
  created_at timestamptz not null default now()
);
create index if not exists dv_machines_user_idx on dv_machines(user_id);

-- Mỗi video khách gửi = 1 việc.
-- status: uploading → queued → building → review (Chờ bạn xem) → done (Đã nhận) | failed
-- steps: [{key,label,state: pending|active|done|error}] do Máy dựng cập nhật, giao diện chỉ hiển thị.
create table if not exists dv_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'video_noi',   -- video_noi | video_noi_tu_lieu | giong_doc_kho | giong_doc_tu_lieu | anh_nhac
  title text,
  status text not null default 'uploading',
  steps jsonb not null default '[]'::jsonb,
  source_path text,
  source_name text,
  source_size bigint,
  extra_paths jsonb not null default '[]'::jsonb,   -- ảnh/clip/nhạc đi kèm (các kiểu có tư liệu riêng)
  plan jsonb,                                       -- plan AI soạn (xem APP_EDIT_AI/PROMPT_SOAN_PLAN.md)
  result_video_path text,
  result_cover_path text,
  caption text,
  error text,
  machine_id uuid references dv_machines(id) on delete set null,
  created_at timestamptz not null default now(),
  queued_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  seen_at timestamptz
);
-- source_path phải nằm dưới thư mục mang user_id của chính chủ — chặn khách ghi path file người khác
-- vào việc của mình rồi để Máy dựng tải về.
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'dv_jobs_source_own_folder') then
    alter table dv_jobs add constraint dv_jobs_source_own_folder check (source_path is null or source_path like user_id::text || '/%');
  end if;
end $$;
create index if not exists dv_jobs_user_idx on dv_jobs(user_id, created_at desc);
create index if not exists dv_jobs_queue_idx on dv_jobs(status, queued_at) where status = 'queued';

-- Kho hình của khách: ảnh/clip/nhạc riêng, Máy dựng tìm B-roll ở đây trước (bậc 1 = tư liệu thật).
create table if not exists dv_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'image',   -- image | video | audio
  path text not null,
  name text,
  tags text[] not null default '{}',    -- AI vision gắn nhãn sau (kho_tim.py)
  created_at timestamptz not null default now()
);
create index if not exists dv_assets_user_idx on dv_assets(user_id, created_at desc);

alter table dv_machines enable row level security;
alter table dv_jobs enable row level security;
alter table dv_assets enable row level security;

drop policy if exists dv_machines_select on dv_machines;
create policy dv_machines_select on dv_machines for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists dv_machines_delete on dv_machines;
create policy dv_machines_delete on dv_machines for delete using (user_id = auth.uid());
-- Cố ý KHÔNG có policy insert/update cho dv_machines: chỉ api/dung-video-pair.js (service_role) tạo
-- và cập nhật, để khách không tự gán token băm của người khác hay giả last_seen.

drop policy if exists dv_jobs_select on dv_jobs;
create policy dv_jobs_select on dv_jobs for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists dv_jobs_insert on dv_jobs;
create policy dv_jobs_insert on dv_jobs for insert with check (user_id = auth.uid() and status = 'uploading' and extra_paths = '[]'::jsonb and result_video_path is null and result_cover_path is null);
drop policy if exists dv_jobs_delete on dv_jobs;
create policy dv_jobs_delete on dv_jobs for delete using (user_id = auth.uid());
-- Khách đổi trạng thái việc của mình qua RPC bên dưới (không .update() thẳng), tránh tự đặt status
-- = 'done'/'queued' bừa hay sửa result_*.

create or replace function public.dv_queue_job(p_job_id uuid)
returns void as $$
begin
  -- Chỉ chuyển việc đang 'uploading' của CHÍNH mình sang hàng đợi, và phải có file nguồn.
  update public.dv_jobs set status = 'queued', queued_at = now(),
    steps = '[{"key":"nhan","label":"Nhận video","state":"done"},{"key":"dung","label":"Cắt, phụ đề, hình minh hoạ","state":"pending"},{"key":"kiem","label":"Kiểm chất lượng","state":"pending"},{"key":"luu","label":"Lưu kết quả","state":"pending"}]'::jsonb
  where id = p_job_id and user_id = auth.uid() and status = 'uploading' and source_path is not null;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;
grant execute on function public.dv_queue_job(uuid) to authenticated;

create or replace function public.dv_mark_job_seen(p_job_id uuid, p_done boolean default false)
returns void as $$
begin
  update public.dv_jobs set seen_at = coalesce(seen_at, now()),
    status = case when p_done and status = 'review' then 'done' else status end
  where id = p_job_id and user_id = auth.uid();
end;
$$ language plpgsql security definer set search_path = public, pg_temp;
grant execute on function public.dv_mark_job_seen(uuid, boolean) to authenticated;

-- Việc dựng thất bại cho khách gửi lại: đưa về hàng đợi, xoá lỗi.
create or replace function public.dv_retry_job(p_job_id uuid)
returns void as $$
begin
  update public.dv_jobs set status = 'queued', queued_at = now(), error = null, machine_id = null,
    started_at = null, finished_at = null,
    steps = '[{"key":"nhan","label":"Nhận video","state":"done"},{"key":"dung","label":"Cắt, phụ đề, hình minh hoạ","state":"pending"},{"key":"kiem","label":"Kiểm chất lượng","state":"pending"},{"key":"luu","label":"Lưu kết quả","state":"pending"}]'::jsonb
  where id = p_job_id and user_id = auth.uid() and status = 'failed' and source_path is not null;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;
grant execute on function public.dv_retry_job(uuid) to authenticated;

drop policy if exists dv_assets_all on dv_assets;
create policy dv_assets_all on dv_assets for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists dv_assets_admin_select on dv_assets;
create policy dv_assets_admin_select on dv_assets for select using (public.is_admin());

-- Bucket riêng, không public — mọi truy cập file đi qua link ký tên do api/dung-video-*.js cấp
-- (storage.objects không policy cho client → chỉ service_role đọc/ghi, giống digital-products).
insert into storage.buckets (id, name, public) values ('dung-video', 'dung-video', false)
on conflict (id) do nothing;
