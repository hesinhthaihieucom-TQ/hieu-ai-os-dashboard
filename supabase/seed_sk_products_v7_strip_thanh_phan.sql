-- (2026-08-31, chị Quỳnh yêu cầu) Bỏ mục "Thành phần" liệt kê trần trụi trong detail_sections — mọi
-- sản phẩm có mục này đều ĐÃ có riêng mục "Công dụng của [thành phần]..." nói rõ công dụng, nên mục
-- "Thành phần" chỉ trùng lặp, làm dài dòng. Lọc theo đúng title = 'Thành phần' (không đụng tới các
-- title khác như "Công dụng của thành phần", "Đối tượng sử dụng"...). An toàn chạy lại nhiều lần.
update sk_products
set detail_sections = (
  select coalesce(jsonb_agg(sec), '[]'::jsonb)
  from jsonb_array_elements(detail_sections) as sec
  where trim(sec->>'title') <> 'Thành phần'
)
where detail_sections is not null
  and detail_sections @> '[{"title":"Thành phần"}]'::jsonb;
