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
  amount integer not null default 79000,
  status text not null default 'cho_thanh_toan', -- cho_thanh_toan | da_thanh_toan | hoan_tien
  note text,
  created_at timestamptz not null default now()
);
alter table xay_kenh_buoi_dang_ky enable row level security;
create index if not exists xay_kenh_buoi_dang_ky_created_idx on xay_kenh_buoi_dang_ky (created_at desc);

-- Đổi phí buổi 29/11 từ 199K xuống 99K (2026-11-26): bảng đã tạo với default cũ thì chạy dòng này.
alter table xay_kenh_buoi_dang_ky alter column amount set default 99000;

-- Quà tặng 7 ngày dùng app Xây Nhân Hiệu cho người đã chuyển khoản buổi 29/11 (2026-11-27, chị Quỳnh chốt "cách 1: tự động").
-- Cần schema_core.sql đã chạy (bảng profiles). Trần lượt AI KHÔNG đổi: tài khoản mới vẫn có trial_ai_limit 50 (xem handle_new_user).
-- Hai đường tặng: (1) đã có tài khoản app cùng email lúc chuyển khoản -> api/sepay-webhook.js cộng 7 ngày; (2) đăng ký app SAU khi
-- đã trả phí buổi -> trigger bên dưới đặt access_until = now() + 7 ngày. Cột app_bonus_granted_at chống tặng 2 lần.
alter table xay_kenh_buoi_dang_ky add column if not exists app_bonus_granted_at timestamptz;

create or replace function public.xay_kenh_grant_app_bonus()
returns trigger as $$
declare
  v_id uuid;
begin
  -- Tuyệt đối không được làm vỡ việc đăng ký tài khoản (trigger này chạy cùng giao dịch với handle_new_user):
  -- mọi lỗi đều nuốt im, tệ nhất là khách không được tặng tự động và chị Quỳnh tặng tay.
  begin
    if new.email is null then return new; end if;
    select id into v_id from public.xay_kenh_buoi_dang_ky
      where lower(email) = lower(new.email) and status = 'da_thanh_toan' and app_bonus_granted_at is null
      order by created_at limit 1;
    if v_id is not null then
      update public.profiles set access_until = now() + interval '7 days' where id = new.id;
      update public.xay_kenh_buoi_dang_ky set app_bonus_granted_at = now() where id = v_id;
    end if;
  exception when others then
    null;
  end;
  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

drop trigger if exists xay_kenh_app_bonus on public.profiles;
create trigger xay_kenh_app_bonus
  after insert on public.profiles
  for each row execute procedure public.xay_kenh_grant_app_bonus();

-- Đổi phí buổi 29/11 từ 99K xuống 79K (2026-11-27): bảng đã tạo với default cũ thì chạy dòng này.
alter table xay_kenh_buoi_dang_ky alter column amount set default 79000;
