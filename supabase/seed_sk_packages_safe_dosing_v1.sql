-- Liều "an toàn theo nhãn" cho khách Kiểm Tra Sức Khỏe ở mức "Cao" (2026-09-05, chị Quỳnh chốt sau
-- khi Claude đối chiếu phác đồ combo với nhãn công bố chính thức trong Sổ Tay và phát hiện 3 chỗ
-- lệch liều: "người bình thường thì theo phác đồ của em, người có vấn đề sức khỏe nặng theo nhãn").
-- Thêm field "safe_instruction" vào ĐÚNG 3 sản phẩm bị lệch (Bios Life Slim, Aloe Vera, Red Clover
-- Plus) trong regimen_sections — lich-trinh.js tự hiện safe_instruction thay vì instruction khi
-- khách có kết quả Kiểm Tra Sức Khỏe mức "Cao" (skComputeHealthLevel trong util.js). Các sản phẩm
-- khác (Diệp lục/Paraway/Lifiber/Probionic/Omega/Unimate/LC) đã đối chiếu khớp nhãn, không cần sửa.
--
-- Ghi CHÈN ĐÈ TOÀN BỘ regimen_sections (giống cách seed_sk_packages_regimen_v1.sql/
-- seed_sk_packages_priority_v1.sql đã làm) thay vì patch từng phần tử jsonb, vì Bios Life Slim xuất
-- hiện 2 LẦN riêng biệt (bữa trưa/bữa tối) với safe_instruction KHÁC NHAU (nhãn chỉ cho 1 lần/ngày —
-- bữa còn lại phải ghi rõ "không uống thêm" chứ không phải lặp lại cùng 1 câu), match theo product_name
-- không phân biệt được 2 vị trí này. An toàn chạy lại nhiều lần.

update sk_packages set regimen_sections = $j$[
  {"time_label":"Buổi sáng ngay sau khi ngủ dậy","steps":[
    {"product_name":"Bột Diệp Lục Super Chlorophyll Powder","instruction":"Pha nửa thìa với 100ml nước ấm, uống ngay sau khi thức dậy. Diệp lục pha uống thay nước trong ngày — mỗi ngày uống số lít nước = số cân nặng chia 2. Cứ 1 thìa diệp lục pha với 500ml nước, rắc lên bề mặt nước xong lắc lên sẽ tan."},
    {"product_name":"Paraway Plus","instruction":"10 ngày đầu: mỗi ngày 2 viên. 20 ngày sau: mỗi ngày 5 viên. Uống cùng diệp lục."},
    {"product_name":"Red Clover Plus","instruction":"5 ngày đầu: 1 viên/ngày. 5 ngày tiếp: 2 viên/ngày. 5 ngày tiếp: 3 viên/ngày. 5 ngày tiếp: 4 viên/ngày. 10 ngày cuối: 5 viên/ngày.","safe_instruction":"Theo nhãn: Tuần 1: 1 viên/lần x1 lần/ngày. Tuần 2: 1 viên/lần x3 lần/ngày. Tuần 3-4: 2 viên/lần x3 lần/ngày. Uống trước bữa ăn."}
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
    {"product_name":"Bios Life Slim","instruction":"Pha 1 gói với 250ml nước, lắc thật nhanh và mạnh 5 cái cho tan ra xong uống NGAY LẬP TỨC — để lâu sẽ nở và khó uống hơn. Sau khi uống bấm đồng hồ 10-12 phút rồi ăn trưa.","safe_instruction":"Theo nhãn: uống 1 lần/ngày, trước bữa ăn chính khoảng 10-15 phút. Pha 1 gói với 240-300ml nước/sữa/nước trái cây, lắc đều, uống ngay."},
    {"product_name":null,"instruction":"Bữa trưa: ăn bình thường, chú ý ăn theo quy tắc nắm bàn tay (xem mục Ăn Uống)."},
    {"product_name":"Omega Life-3 Resolv","instruction":"Uống 2 viên sau ăn."}
  ]},
  {"time_label":"Ăn tối: Bữa cứng 2 (cách bữa trưa ít nhất 4 tiếng)","steps":[
    {"product_name":"Bios Life Slim","instruction":"Pha 1 gói với 250ml nước, lắc thật nhanh và mạnh 5 cái cho tan ra xong uống NGAY LẬP TỨC. Sau khi uống bấm đồng hồ 10-12 phút rồi ăn tối.","safe_instruction":"Theo nhãn, Bios Life Slim chỉ dùng 1 lần/ngày — bạn đã dùng vào buổi trưa nên bữa tối này KHÔNG uống thêm."},
    {"product_name":null,"instruction":"Bữa tối: ăn bình thường, chú ý ăn theo quy tắc nắm bàn tay (xem mục Ăn Uống)."},
    {"product_name":"Omega Life-3 Resolv","instruction":"Uống 2 viên sau ăn."}
  ]},
  {"time_label":"Buổi tối trước khi ngủ (tốt nhất trước 23:00 hằng ngày)","steps":[
    {"product_name":"Aloe Vera","instruction":"Thải độc ruột — uống 1 viên trong 10 ngày đầu với 200ml nước, 20 ngày sau mỗi ngày 2 viên.","safe_instruction":"Theo nhãn: uống 1 viên/ngày với 200ml nước, dùng liên tục không quá 30 ngày — không tăng lên 2 viên/ngày."}
  ]}
]$j$::jsonb
where name = 'Bộ Chuyển Hoá 60 Ngày';

update sk_packages set regimen_sections = $j$[
  {"time_label":"Buổi sáng","note":"Nhịn ăn sáng nếu áp dụng nhịp 16:8. Nếu áp dụng nhịp 4-4-12 thì ăn sáng nhiều chất xơ và đạm, hạn chế tinh bột.","steps":[]},
  {"time_label":"Giữa buổi sáng","steps":[
    {"product_name":"Unimate Lemon Ginger Flavored Mate","instruction":"Pha 1 gói với 500-700ml nước tuỳ sở thích uống đậm nhạt — nước lạnh hoặc ấm tuỳ nhu cầu."}
  ]},
  {"time_label":"Ăn trưa: Bữa cứng 1 (cách bữa sáng ít nhất 4 tiếng)","steps":[
    {"product_name":"Bios Life Slim","instruction":"Pha 1 gói với 250ml nước, lắc thật nhanh và mạnh 5 cái cho tan ra xong uống NGAY LẬP TỨC. Sau khi uống bấm đồng hồ 10-12 phút rồi ăn trưa.","safe_instruction":"Theo nhãn: uống 1 lần/ngày, trước bữa ăn chính khoảng 10-15 phút. Pha 1 gói với 240-300ml nước/sữa/nước trái cây, lắc đều, uống ngay."},
    {"product_name":null,"instruction":"Bữa trưa: ăn bình thường theo quy tắc nắm bàn tay (xem mục Ăn Uống)."}
  ]},
  {"time_label":"Ăn tối: Bữa cứng 2 (cách bữa trưa ít nhất 4 tiếng)","steps":[
    {"product_name":"Bios Life Slim","instruction":"Pha 1 gói với 250ml nước, lắc thật nhanh và mạnh 5 cái cho tan ra xong uống NGAY LẬP TỨC. Sau khi uống bấm đồng hồ 10-12 phút rồi ăn tối.","safe_instruction":"Theo nhãn, Bios Life Slim chỉ dùng 1 lần/ngày — bạn đã dùng vào buổi trưa nên bữa tối này KHÔNG uống thêm."},
    {"product_name":null,"instruction":"Bữa tối: ăn bình thường theo quy tắc nắm bàn tay (xem mục Ăn Uống)."}
  ]},
  {"time_label":"Buổi tối trước khi ngủ (tốt nhất trước 23:00 hằng ngày)","steps":[
    {"product_name":"Aloe Vera","instruction":"Uống 1 viên trong 10 ngày đầu với 200ml nước, 20 ngày sau mỗi ngày 2 viên.","safe_instruction":"Theo nhãn: uống 1 viên/ngày với 200ml nước, dùng liên tục không quá 30 ngày — không tăng lên 2 viên/ngày."}
  ]}
]$j$::jsonb
where name = 'Bộ Giảm Mỡ 30 Ngày';

update sk_packages set regimen_sections = $j$[
  {"time_label":"Buổi sáng ngay sau khi ngủ dậy","steps":[
    {"product_name":"Bột Diệp Lục Super Chlorophyll Powder","instruction":"Pha nửa thìa với 100ml nước ấm, uống ngay sau khi thức dậy. Diệp lục pha uống thay nước trong ngày."},
    {"product_name":"Paraway Plus","instruction":"10 ngày đầu: mỗi ngày 2 viên. 20 ngày sau: mỗi ngày 5 viên."},
    {"product_name":"Red Clover Plus","instruction":"5 ngày đầu: 1 viên/ngày, cứ 5 ngày tăng thêm 1 viên, tới 5 viên/ngày ở 10 ngày cuối.","safe_instruction":"Theo nhãn: Tuần 1: 1 viên/lần x1 lần/ngày. Tuần 2: 1 viên/lần x3 lần/ngày. Tuần 3-4: 2 viên/lần x3 lần/ngày. Uống trước bữa ăn."}
  ]},
  {"time_label":"Ăn sáng bằng sản phẩm: Bữa lỏng (cách bữa tối hôm trước ít nhất 12 tiếng)","steps":[
    {"product_name":"Chất xơ Lifiber","instruction":"Pha 1 thìa với 200ml nước hoặc sữa hạt, lắc đều cho tan hết thành hỗn hợp lỏng, ăn thay bữa sáng."},
    {"product_name":"Probionic Plus","instruction":"Ngậm 1 gói trong miệng cho tới khi tan ra — không nhai vì sẽ phá vỡ lớp bảo vệ."}
  ]},
  {"time_label":"Buổi tối trước khi ngủ (tốt nhất trước 23:00 hằng ngày)","steps":[
    {"product_name":"Aloe Vera","instruction":"Uống 1 viên trong 10 ngày đầu với 200ml nước, 20 ngày sau mỗi ngày 2 viên.","safe_instruction":"Theo nhãn: uống 1 viên/ngày với 200ml nước, dùng liên tục không quá 30 ngày — không tăng lên 2 viên/ngày."}
  ]}
]$j$::jsonb
where name = 'Bộ Thải Độc Full 30 Ngày';
