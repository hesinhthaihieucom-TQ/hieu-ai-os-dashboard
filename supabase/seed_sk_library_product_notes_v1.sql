-- Ghi chú riêng cho từng sản phẩm gợi ý ở Kiểm Tra Sức Khỏe (2026-08-30) — giải thích NGẮN vì sao
-- sản phẩm đó liên quan đúng vấn đề của khách (không nói sản phẩm "chữa" vấn đề, chỉ nêu vai trò
-- thành phần), priority=true đánh dấu 2-3 sản phẩm nên dùng trước nếu khách không đủ ngân sách mua
-- hết. Cần cột sk_library_entries.product_notes (chạy schema_suc_khoe.sql trước).

update sk_library_entries e set product_notes = (
  select jsonb_object_agg(p.id::text, jsonb_build_object('note', v.note, 'priority', v.priority))
  from (values
    ('Bios Life C', 'Chứa chất xơ hòa tan và phytosterol — được biết đến với vai trò hỗ trợ ổn định đường huyết, đúng nhóm dấu hiệu kháng insulin bạn đang gặp.', true),
    ('Bios Life Slim', 'Cùng nhóm chất xơ hòa tan hỗ trợ kiểm soát đường huyết sau ăn, đồng thời hỗ trợ kiểm soát khẩu phần nếu bạn có thêm dấu hiệu tăng cân.', true),
    ('Unimate Lemon Ginger Flavored Mate', 'Thành phần trà Mate được biết đến với vai trò hỗ trợ cải thiện độ nhạy insulin và ổn định đường huyết.', true),
    ('ChloroSpirulina', 'Glycolipid và polysaccharide trong tảo Spirulina được nghiên cứu về vai trò hỗ trợ ổn định đường huyết.', false)
  ) as v(product_name, note, priority)
  join sk_products p on p.name = v.product_name
)
where e.issue_name = 'Rối loạn chuyển hóa đường huyết (kháng Insulin, tiền tiểu đường, Đái tháo đường)';

update sk_library_entries e set product_notes = (
  select jsonb_object_agg(p.id::text, jsonb_build_object('note', v.note, 'priority', v.priority))
  from (values
    ('Bios Life C', 'Phytosterol hỗ trợ giảm cholesterol xấu (LDL), Niacin hỗ trợ tăng cholesterol tốt (HDL) — đúng nhóm tiêu chí rối loạn mỡ máu bạn đang có.', true),
    ('Omega Life-3 Resolv', 'EPA/DHA trong dầu cá được biết đến rộng rãi với vai trò hỗ trợ cân bằng triglyceride máu.', true),
    ('Red Clover Plus', 'Isoflavone trong cỏ ba lá đỏ được nghiên cứu về vai trò hỗ trợ cải thiện tỷ lệ cholesterol.', false)
  ) as v(product_name, note, priority)
  join sk_products p on p.name = v.product_name
)
where e.issue_name = 'Rối loạn chuyển hóa Lipid (mỡ máu)';

update sk_library_entries e set product_notes = (
  select jsonb_object_agg(p.id::text, jsonb_build_object('note', v.note, 'priority', v.priority))
  from (values
    ('Aloe Vera', 'Anthraquinone trong nha đam hỗ trợ nhu động ruột — đúng nhóm dấu hiệu táo bón, tích tụ độc tố đường ruột bạn đang gặp.', true),
    ('Paraway Plus', '14 loại thảo mộc được biết đến với vai trò hỗ trợ hệ tiêu hóa và đào thải cặn bã đường ruột.', true),
    ('Bột Diệp Lục Super Chlorophyll Powder', 'Chlorophyll được biết đến với vai trò chống oxy hóa, hỗ trợ gan — cơ quan chính xử lý độc tố trong cơ thể.', false),
    ('Red Clover Plus', 'Isoflavone và các thảo dược trong Red Clover được biết đến với vai trò hỗ trợ chức năng gan, hỗ trợ quá trình thanh lọc tự nhiên.', false)
  ) as v(product_name, note, priority)
  join sk_products p on p.name = v.product_name
)
where e.issue_name = 'Tích tụ độc tố trong cơ thể';
