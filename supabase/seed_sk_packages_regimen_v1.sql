-- 3 gói sản phẩm + hướng dẫn sử dụng theo khung giờ (regimen_sections), lấy đúng nội dung từ file
-- HD_ chị Quỳnh gửi (2026-08-30): Bộ Chuyển Hoá 60 Ngày / Bộ Giảm Mỡ 30 Ngày / Bộ Thải Độc Full 30
-- Ngày. product_name khớp CHÍNH XÁC tên trong sk_products — lich-trinh.js tự nối sang để lấy
-- ảnh/giá/link mua, không lưu trùng lặp ảnh vào đây. Cần cột sk_products.regimen_sections (chạy
-- schema_suc_khoe.sql trước). An toàn chạy lại — update theo tên nếu gói đã có, insert nếu chưa.

update sk_packages set regimen_sections = $j$[
  {"time_label":"Buổi sáng ngay sau khi ngủ dậy","steps":[
    {"product_name":"Bột Diệp Lục Super Chlorophyll Powder","instruction":"Pha nửa thìa với 100ml nước ấm, uống ngay sau khi thức dậy. Diệp lục pha uống thay nước trong ngày — mỗi ngày uống số lít nước = số cân nặng chia 2. Cứ 1 thìa diệp lục pha với 500ml nước, rắc lên bề mặt nước xong lắc lên sẽ tan."},
    {"product_name":"Paraway Plus","instruction":"10 ngày đầu: mỗi ngày 2 viên. 20 ngày sau: mỗi ngày 5 viên. Uống cùng diệp lục."},
    {"product_name":"Red Clover Plus","instruction":"5 ngày đầu: 1 viên/ngày. 5 ngày tiếp: 2 viên/ngày. 5 ngày tiếp: 3 viên/ngày. 5 ngày tiếp: 4 viên/ngày. 10 ngày cuối: 5 viên/ngày."}
  ]},
  {"time_label":"Ăn sáng bằng sản phẩm: Bữa lỏng (cách bữa tối hôm trước ít nhất 12 tiếng)","steps":[
    {"product_name":"LC – Hương Vani","instruction":"Pha 1 gói LC + 1 thìa Lifiber với 300-500ml nước hoặc sữa hạt, lắc đều cho tan hết thành hỗn hợp lỏng, ăn thay bữa sáng."},
    {"product_name":"Chất xơ Lifiber","instruction":"Pha cùng 1 gói LC ở trên — xem hướng dẫn LC."},
    {"product_name":"Probionic Plus","instruction":"Ngậm 1 gói trong miệng cho tới khi tan ra — không nhai vì sẽ phá vỡ lớp bảo vệ."},
    {"product_name":"Omega Life-3 Resolv","instruction":"Uống 2 viên cùng hỗn hợp lỏng bên trên."}
  ]},
  {"time_label":"Giữa buổi sáng","steps":[
    {"product_name":"Unimate Lemon Ginger Flavored Mate","instruction":"Pha 1 gói với 500-700ml nước tuỳ sở thích uống đậm nhạt — nước lạnh hoặc ấm tuỳ nhu cầu. Uống hết hoặc nhâm nhi, cung cấp năng lượng, giúp tỉnh táo, thư giãn, tăng hưng phấn."}
  ]},
  {"time_label":"Ăn trưa: Bữa cứng 1 (cách bữa sáng ít nhất 4 tiếng)","steps":[
    {"product_name":"Bios Life Slim","instruction":"Pha 1 gói với 250ml nước, lắc thật nhanh và mạnh 5 cái cho tan ra xong uống NGAY LẬP TỨC — để lâu sẽ nở và khó uống hơn. Sau khi uống bấm đồng hồ 10-12 phút rồi ăn trưa."},
    {"product_name":null,"instruction":"Bữa trưa: ăn bình thường, chú ý ăn theo quy tắc nắm bàn tay (xem mục Ăn Uống)."},
    {"product_name":"Omega Life-3 Resolv","instruction":"Uống 2 viên sau ăn."}
  ]},
  {"time_label":"Ăn tối: Bữa cứng 2 (cách bữa trưa ít nhất 4 tiếng)","steps":[
    {"product_name":"Bios Life Slim","instruction":"Pha 1 gói với 250ml nước, lắc thật nhanh và mạnh 5 cái cho tan ra xong uống NGAY LẬP TỨC. Sau khi uống bấm đồng hồ 10-12 phút rồi ăn tối."},
    {"product_name":null,"instruction":"Bữa tối: ăn bình thường, chú ý ăn theo quy tắc nắm bàn tay (xem mục Ăn Uống)."},
    {"product_name":"Omega Life-3 Resolv","instruction":"Uống 2 viên sau ăn."}
  ]},
  {"time_label":"Buổi tối trước khi ngủ (tốt nhất trước 23:00 hằng ngày)","steps":[
    {"product_name":"Aloe Vera","instruction":"Thải độc ruột — uống 1 viên trong 10 ngày đầu với 200ml nước, 20 ngày sau mỗi ngày 2 viên."}
  ]}
]$j$::jsonb
where name = 'Bộ Chuyển Hoá 60 Ngày';

insert into sk_packages (name, description, regimen_sections)
select 'Bộ Chuyển Hoá 60 Ngày', 'Quy trình 60 ngày cân bằng chuyển hoá, kết hợp diệp lục, thải độc và bữa ăn thay thế.', $j$[
  {"time_label":"Buổi sáng ngay sau khi ngủ dậy","steps":[
    {"product_name":"Bột Diệp Lục Super Chlorophyll Powder","instruction":"Pha nửa thìa với 100ml nước ấm, uống ngay sau khi thức dậy. Diệp lục pha uống thay nước trong ngày — mỗi ngày uống số lít nước = số cân nặng chia 2."},
    {"product_name":"Paraway Plus","instruction":"10 ngày đầu: mỗi ngày 2 viên. 20 ngày sau: mỗi ngày 5 viên. Uống cùng diệp lục."},
    {"product_name":"Red Clover Plus","instruction":"5 ngày đầu: 1 viên/ngày. 5 ngày tiếp: 2 viên/ngày. 5 ngày tiếp: 3 viên/ngày. 5 ngày tiếp: 4 viên/ngày. 10 ngày cuối: 5 viên/ngày."}
  ]},
  {"time_label":"Ăn sáng bằng sản phẩm: Bữa lỏng (cách bữa tối hôm trước ít nhất 12 tiếng)","steps":[
    {"product_name":"LC – Hương Vani","instruction":"Pha 1 gói LC + 1 thìa Lifiber với 300-500ml nước hoặc sữa hạt, lắc đều cho tan hết thành hỗn hợp lỏng, ăn thay bữa sáng."},
    {"product_name":"Chất xơ Lifiber","instruction":"Pha cùng 1 gói LC ở trên — xem hướng dẫn LC."},
    {"product_name":"Probionic Plus","instruction":"Ngậm 1 gói trong miệng cho tới khi tan ra — không nhai vì sẽ phá vỡ lớp bảo vệ."},
    {"product_name":"Omega Life-3 Resolv","instruction":"Uống 2 viên cùng hỗn hợp lỏng bên trên."}
  ]},
  {"time_label":"Giữa buổi sáng","steps":[
    {"product_name":"Unimate Lemon Ginger Flavored Mate","instruction":"Pha 1 gói với 500-700ml nước tuỳ sở thích uống đậm nhạt — nước lạnh hoặc ấm tuỳ nhu cầu."}
  ]},
  {"time_label":"Ăn trưa: Bữa cứng 1 (cách bữa sáng ít nhất 4 tiếng)","steps":[
    {"product_name":"Bios Life Slim","instruction":"Pha 1 gói với 250ml nước, lắc thật nhanh và mạnh 5 cái cho tan ra xong uống NGAY LẬP TỨC. Sau khi uống bấm đồng hồ 10-12 phút rồi ăn trưa."},
    {"product_name":null,"instruction":"Bữa trưa: ăn bình thường, chú ý ăn theo quy tắc nắm bàn tay (xem mục Ăn Uống)."},
    {"product_name":"Omega Life-3 Resolv","instruction":"Uống 2 viên sau ăn."}
  ]},
  {"time_label":"Ăn tối: Bữa cứng 2 (cách bữa trưa ít nhất 4 tiếng)","steps":[
    {"product_name":"Bios Life Slim","instruction":"Pha 1 gói với 250ml nước, lắc thật nhanh và mạnh 5 cái cho tan ra xong uống NGAY LẬP TỨC. Sau khi uống bấm đồng hồ 10-12 phút rồi ăn tối."},
    {"product_name":null,"instruction":"Bữa tối: ăn bình thường, chú ý ăn theo quy tắc nắm bàn tay (xem mục Ăn Uống)."},
    {"product_name":"Omega Life-3 Resolv","instruction":"Uống 2 viên sau ăn."}
  ]},
  {"time_label":"Buổi tối trước khi ngủ (tốt nhất trước 23:00 hằng ngày)","steps":[
    {"product_name":"Aloe Vera","instruction":"Thải độc ruột — uống 1 viên trong 10 ngày đầu với 200ml nước, 20 ngày sau mỗi ngày 2 viên."}
  ]}
]$j$::jsonb
where not exists (select 1 from sk_packages where name = 'Bộ Chuyển Hoá 60 Ngày');

update sk_packages set regimen_sections = $j$[
  {"time_label":"Buổi sáng","note":"Nhịn ăn sáng nếu áp dụng nhịp 16:8. Nếu áp dụng nhịp 4-4-12 thì ăn sáng nhiều chất xơ và đạm, hạn chế tinh bột.","steps":[]},
  {"time_label":"Giữa buổi sáng","steps":[
    {"product_name":"Unimate Lemon Ginger Flavored Mate","instruction":"Pha 1 gói với 500-700ml nước tuỳ sở thích uống đậm nhạt — nước lạnh hoặc ấm tuỳ nhu cầu."}
  ]},
  {"time_label":"Ăn trưa: Bữa cứng 1 (cách bữa sáng ít nhất 4 tiếng)","steps":[
    {"product_name":"Bios Life Slim","instruction":"Pha 1 gói với 250ml nước, lắc thật nhanh và mạnh 5 cái cho tan ra xong uống NGAY LẬP TỨC. Sau khi uống bấm đồng hồ 10-12 phút rồi ăn trưa."},
    {"product_name":null,"instruction":"Bữa trưa: ăn bình thường theo quy tắc nắm bàn tay (xem mục Ăn Uống)."}
  ]},
  {"time_label":"Ăn tối: Bữa cứng 2 (cách bữa trưa ít nhất 4 tiếng)","steps":[
    {"product_name":"Bios Life Slim","instruction":"Pha 1 gói với 250ml nước, lắc thật nhanh và mạnh 5 cái cho tan ra xong uống NGAY LẬP TỨC. Sau khi uống bấm đồng hồ 10-12 phút rồi ăn tối."},
    {"product_name":null,"instruction":"Bữa tối: ăn bình thường theo quy tắc nắm bàn tay (xem mục Ăn Uống)."}
  ]},
  {"time_label":"Buổi tối trước khi ngủ (tốt nhất trước 23:00 hằng ngày)","steps":[
    {"product_name":"Aloe Vera","instruction":"Uống 1 viên trong 10 ngày đầu với 200ml nước, 20 ngày sau mỗi ngày 2 viên."}
  ]}
]$j$::jsonb
where name = 'Bộ Giảm Mỡ 30 Ngày';

insert into sk_packages (name, description, regimen_sections)
select 'Bộ Giảm Mỡ 30 Ngày', 'Quy trình 30 ngày giảm mỡ, kết hợp nhịp ăn 4-4-12/16:8 với bữa thay thế Bios Life Slim.', $j$[
  {"time_label":"Buổi sáng","note":"Nhịn ăn sáng nếu áp dụng nhịp 16:8. Nếu áp dụng nhịp 4-4-12 thì ăn sáng nhiều chất xơ và đạm, hạn chế tinh bột.","steps":[]},
  {"time_label":"Giữa buổi sáng","steps":[
    {"product_name":"Unimate Lemon Ginger Flavored Mate","instruction":"Pha 1 gói với 500-700ml nước tuỳ sở thích uống đậm nhạt."}
  ]},
  {"time_label":"Ăn trưa: Bữa cứng 1 (cách bữa sáng ít nhất 4 tiếng)","steps":[
    {"product_name":"Bios Life Slim","instruction":"Pha 1 gói với 250ml nước, lắc thật nhanh và mạnh 5 cái cho tan ra xong uống NGAY LẬP TỨC. Sau khi uống bấm đồng hồ 10-12 phút rồi ăn trưa."},
    {"product_name":null,"instruction":"Bữa trưa: ăn bình thường theo quy tắc nắm bàn tay."}
  ]},
  {"time_label":"Ăn tối: Bữa cứng 2 (cách bữa trưa ít nhất 4 tiếng)","steps":[
    {"product_name":"Bios Life Slim","instruction":"Pha 1 gói với 250ml nước, lắc thật nhanh và mạnh 5 cái cho tan ra xong uống NGAY LẬP TỨC. Sau khi uống bấm đồng hồ 10-12 phút rồi ăn tối."},
    {"product_name":null,"instruction":"Bữa tối: ăn bình thường theo quy tắc nắm bàn tay."}
  ]},
  {"time_label":"Buổi tối trước khi ngủ (tốt nhất trước 23:00 hằng ngày)","steps":[
    {"product_name":"Aloe Vera","instruction":"Uống 1 viên trong 10 ngày đầu với 200ml nước, 20 ngày sau mỗi ngày 2 viên."}
  ]}
]$j$::jsonb
where not exists (select 1 from sk_packages where name = 'Bộ Giảm Mỡ 30 Ngày');

update sk_packages set regimen_sections = $j$[
  {"time_label":"Buổi sáng ngay sau khi ngủ dậy","steps":[
    {"product_name":"Bột Diệp Lục Super Chlorophyll Powder","instruction":"Pha nửa thìa với 100ml nước ấm, uống ngay sau khi thức dậy. Diệp lục pha uống thay nước trong ngày."},
    {"product_name":"Paraway Plus","instruction":"10 ngày đầu: mỗi ngày 2 viên. 20 ngày sau: mỗi ngày 5 viên."},
    {"product_name":"Red Clover Plus","instruction":"5 ngày đầu: 1 viên/ngày, cứ 5 ngày tăng thêm 1 viên, tới 5 viên/ngày ở 10 ngày cuối."}
  ]},
  {"time_label":"Ăn sáng bằng sản phẩm: Bữa lỏng (cách bữa tối hôm trước ít nhất 12 tiếng)","steps":[
    {"product_name":"Chất xơ Lifiber","instruction":"Pha 1 thìa với 200ml nước hoặc sữa hạt, lắc đều cho tan hết thành hỗn hợp lỏng, ăn thay bữa sáng."},
    {"product_name":"Probionic Plus","instruction":"Ngậm 1 gói trong miệng cho tới khi tan ra — không nhai vì sẽ phá vỡ lớp bảo vệ."}
  ]},
  {"time_label":"Buổi tối trước khi ngủ (tốt nhất trước 23:00 hằng ngày)","steps":[
    {"product_name":"Aloe Vera","instruction":"Uống 1 viên trong 10 ngày đầu với 200ml nước, 20 ngày sau mỗi ngày 2 viên."}
  ]}
]$j$::jsonb
where name = 'Bộ Thải Độc Full 30 Ngày';

insert into sk_packages (name, description, regimen_sections)
select 'Bộ Thải Độc Full 30 Ngày', 'Quy trình 30 ngày thải độc toàn diện — diệp lục, thảo dược và bữa sáng chất xơ.', $j$[
  {"time_label":"Buổi sáng ngay sau khi ngủ dậy","steps":[
    {"product_name":"Bột Diệp Lục Super Chlorophyll Powder","instruction":"Pha nửa thìa với 100ml nước ấm, uống ngay sau khi thức dậy. Diệp lục pha uống thay nước trong ngày."},
    {"product_name":"Paraway Plus","instruction":"10 ngày đầu: mỗi ngày 2 viên. 20 ngày sau: mỗi ngày 5 viên."},
    {"product_name":"Red Clover Plus","instruction":"5 ngày đầu: 1 viên/ngày, cứ 5 ngày tăng thêm 1 viên, tới 5 viên/ngày ở 10 ngày cuối."}
  ]},
  {"time_label":"Ăn sáng bằng sản phẩm: Bữa lỏng (cách bữa tối hôm trước ít nhất 12 tiếng)","steps":[
    {"product_name":"Chất xơ Lifiber","instruction":"Pha 1 thìa với 200ml nước hoặc sữa hạt, lắc đều cho tan hết thành hỗn hợp lỏng, ăn thay bữa sáng."},
    {"product_name":"Probionic Plus","instruction":"Ngậm 1 gói trong miệng cho tới khi tan ra — không nhai vì sẽ phá vỡ lớp bảo vệ."}
  ]},
  {"time_label":"Buổi tối trước khi ngủ (tốt nhất trước 23:00 hằng ngày)","steps":[
    {"product_name":"Aloe Vera","instruction":"Uống 1 viên trong 10 ngày đầu với 200ml nước, 20 ngày sau mỗi ngày 2 viên."}
  ]}
]$j$::jsonb
where not exists (select 1 from sk_packages where name = 'Bộ Thải Độc Full 30 Ngày');
