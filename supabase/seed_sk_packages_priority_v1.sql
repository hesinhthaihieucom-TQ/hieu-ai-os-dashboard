-- (2026-08-31, chị Quỳnh yêu cầu) Tô nổi bật 2-3 sản phẩm "lõi" trong mỗi bộ để khách không đủ tiền/
-- không muốn mua cả bộ biết nên ưu tiên mua sản phẩm nào trước — thêm cờ "priority":true vào đúng
-- step trong regimen_sections.steps ứng với tên sản phẩm. lich-trinh.js đã đọc cờ này để tô màu +
-- gắn nhãn "⭐ Ưu tiên mua trước".
--
-- ĐÂY LÀ ĐỀ XUẤT của Claude dựa trên tần suất xuất hiện trong khung giờ/ngày + vai trò cốt lõi (sản
-- phẩm xuất hiện nhiều lần/ngày thường là sản phẩm chính của giải pháp) — chị Quỳnh xem lại có đúng ý
-- không, nếu muốn đổi sản phẩm khác chỉ cần sửa danh sách tên trong file này rồi chạy lại (an toàn
-- chạy lại nhiều lần, tự ghi đè):
--   - Bộ Chuyển Hoá 60 Ngày: Omega Life-3 Resolv (dùng nhiều nhất), Bios Life Slim, Bột Diệp Lục
--   - Bộ Giảm Mỡ 30 Ngày: Bios Life Slim (dùng nhiều nhất), Unimate Lemon Ginger, Aloe Vera
--   - Bộ Thải Độc Full 30 Ngày: Bột Diệp Lục Super Chlorophyll Powder, Paraway Plus (cặp thải độc
--     kinh điển), Chất xơ Lifiber

update sk_packages
set regimen_sections = (
  select jsonb_agg(
    jsonb_set(
      sec,
      '{steps}',
      (
        select coalesce(jsonb_agg(
          case when (step->>'product_name') = any(array['Omega Life-3 Resolv','Bios Life Slim','Bột Diệp Lục Super Chlorophyll Powder'])
          then jsonb_set(step, '{priority}', 'true'::jsonb)
          else (step - 'priority')
          end
        ), '[]'::jsonb)
        from jsonb_array_elements(sec->'steps') as step
      )
    )
  )
  from jsonb_array_elements(regimen_sections) as sec
)
where name = 'Bộ Chuyển Hoá 60 Ngày' and regimen_sections is not null;

update sk_packages
set regimen_sections = (
  select jsonb_agg(
    jsonb_set(
      sec,
      '{steps}',
      (
        select coalesce(jsonb_agg(
          case when (step->>'product_name') = any(array['Bios Life Slim','Unimate Lemon Ginger Flavored Mate','Aloe Vera'])
          then jsonb_set(step, '{priority}', 'true'::jsonb)
          else (step - 'priority')
          end
        ), '[]'::jsonb)
        from jsonb_array_elements(sec->'steps') as step
      )
    )
  )
  from jsonb_array_elements(regimen_sections) as sec
)
where name = 'Bộ Giảm Mỡ 30 Ngày' and regimen_sections is not null;

update sk_packages
set regimen_sections = (
  select jsonb_agg(
    jsonb_set(
      sec,
      '{steps}',
      (
        select coalesce(jsonb_agg(
          case when (step->>'product_name') = any(array['Bột Diệp Lục Super Chlorophyll Powder','Paraway Plus','Chất xơ Lifiber'])
          then jsonb_set(step, '{priority}', 'true'::jsonb)
          else (step - 'priority')
          end
        ), '[]'::jsonb)
        from jsonb_array_elements(sec->'steps') as step
      )
    )
  )
  from jsonb_array_elements(regimen_sections) as sec
)
where name = 'Bộ Thải Độc Full 30 Ngày' and regimen_sections is not null;
