-- XÂY NHÂN HIỆU — migration v7: lưu các "tài sản quảng bá" (link sản phẩm/aff/cộng đồng)
-- để dùng lại nhiều lần khi gợi ý đẩy bài theo mốc view.
-- Chạy 1 lần trong Supabase SQL Editor. An toàn để chạy lại nhiều lần.

create table if not exists promo_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  url text,
  kind text, -- 'san_pham_so' | 'aff_nguoi_khac' | 'aff_cua_toi' | 'cong_dong' | 'khac'
  created_at timestamptz not null default now()
);
alter table promo_assets enable row level security;
drop policy if exists "promo_assets_owner_all" on promo_assets;
create policy "promo_assets_owner_all" on promo_assets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
