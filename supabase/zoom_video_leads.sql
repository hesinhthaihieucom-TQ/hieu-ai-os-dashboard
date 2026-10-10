-- Đăng ký lớp Zoom "Dựng video AI" 24-25/10/2026 (trang zoom-dung-video-ai/ → api/zoom-video-dang-ky.js).
-- Chạy 1 lần trong Supabase SQL Editor. Chỉ service role ghi/đọc: bật RLS, KHÔNG tạo policy nào.
create table if not exists zoom_video_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  zalo text not null,
  email text not null,
  device text not null check (device in ('mac','windows','other')),
  chip text,
  macos text,
  channel text,
  ref_code text,
  status text not null default 'cho_thanh_toan', -- cho_thanh_toan | da_thanh_toan | danh_sach_cho | hoan_tien
  note text,
  created_at timestamptz not null default now()
);
alter table zoom_video_leads enable row level security;
create index if not exists zoom_video_leads_created_idx on zoom_video_leads (created_at desc);
