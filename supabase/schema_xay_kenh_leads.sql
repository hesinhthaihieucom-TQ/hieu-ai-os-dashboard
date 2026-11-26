-- Phễu "Checklist lưu ý khi xây kênh" (trang xay-kenh/ → api/xay-kenh-lead.js).
-- Chạy 1 lần trong Supabase SQL Editor. Chỉ service role ghi/đọc: bật RLS, KHÔNG tạo policy nào.
-- File riêng (không nhét vào schema_full.sql) để khỏi đụng các phiên làm app khác.
create table if not exists xay_kenh_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  zalo text not null,
  email text,
  platform text,            -- tiktok | facebook | youtube | chua_chon
  stage text,               -- chua_co | moi_lam | co_nguoi_xem
  pain text,                -- video | noi_dung | ban_hang | tat_ca
  support text,             -- tu_lam | cam_tay
  recommended text,         -- edit_video | app_nhan_hieu | huan_luyen_1_1
  status text not null default 'moi', -- moi | da_nhan_zalo | da_mua | khong_phu_hop
  note text,
  created_at timestamptz not null default now()
);
alter table xay_kenh_leads enable row level security;
create index if not exists xay_kenh_leads_created_idx on xay_kenh_leads (created_at desc);
create index if not exists xay_kenh_leads_recommended_idx on xay_kenh_leads (recommended);

-- Đăng ký buổi chia sẻ 29/11 (phí cam kết năng lượng 99K) — api/xay-kenh-buoi-dang-ky.js.
-- ref là mã trong nội dung CK "SEVQR BUOI29 <ref>"; cố ý KHÔNG bắt đầu bằng XNH/SPS/CRM/SPUP để webhook SePay
-- không nhận nhầm sang app nào (tiền tố lạ) — giao dịch này rơi vào
-- sepay_transactions với status unmatched_code, Quỳnh đối chiếu tay theo ref.
create table if not exists xay_kenh_buoi_dang_ky (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  zalo text not null,
  email text,
  ref text not null unique,
  amount integer not null default 99000,
  status text not null default 'cho_thanh_toan', -- cho_thanh_toan | da_thanh_toan | hoan_tien
  note text,
  created_at timestamptz not null default now()
);
alter table xay_kenh_buoi_dang_ky enable row level security;
create index if not exists xay_kenh_buoi_dang_ky_created_idx on xay_kenh_buoi_dang_ky (created_at desc);

-- Đổi phí buổi 29/11 từ 199K xuống 99K (2026-11-26): bảng đã tạo với default cũ thì chạy dòng này.
alter table xay_kenh_buoi_dang_ky alter column amount set default 99000;
