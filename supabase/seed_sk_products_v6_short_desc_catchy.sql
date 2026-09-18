-- Cập nhật "Công dụng hiển thị ngắn gọn" (short_description) cho 26 sản phẩm (2026-09-19, chị Quỳnh
-- gửi bảng "Công Dụng Nổi Bật" theo văn phong thu hút khách hàng) — DÙNG NGUYÊN VĂN theo đúng yêu cầu
-- của chị (chị xác nhận chịu trách nhiệm về cách diễn đạt, khác với văn phong "thành phần X — vai
-- trò Y" đang dùng cho các mục benefits/detail_sections khác trong app). Chỉ sửa short_description
-- (dòng tóm tắt hiện ngay ở danh sách sản phẩm) — benefits/detail_sections giữ nguyên không đụng tới.
--
-- 2 sản phẩm trong bảng chị gửi CHƯA có trong catalog (Trà Nature's Tea, Trà Thảo Mộc Native Legend
-- Tea) — không có sẵn giá/ảnh nên chưa tạo mới ở đây, chị xác nhận thêm thì em tạo sản phẩm mới kèm
-- giá/ảnh sau. "Neigene Rich Care" và "Neigene Intense Care" chị gộp chung 1 mô tả trong bảng — áp
-- dụng cùng 1 câu cho cả 2 sản phẩm đó. An toàn chạy lại nhiều lần (update theo tên, không tạo trùng).

update sk_products set short_description = 'Thanh lọc dòng máu & Kiềm hóa cơ thể: Kiềm hóa môi trường axit, đào thải độc tố huyết tương, duy trì độ pH tối ưu và làm mát cơ thể tức thì.' where name = 'Bột Diệp Lục Super Chlorophyll Powder';
update sk_products set short_description = 'Tái tạo niêm mạc & Nhuận tràng: Nhuận tràng tự nhiên, hỗ trợ làm lành tổn thương dạ dày - đại tràng, nhuận tràng trơn tru.' where name = 'Aloe Vera';
update sk_products set short_description = 'Quét sạch ký sinh trùng & Độc tố: Đào thải vi khuẩn có hại, nấm gián tiếp và ký sinh trùng ẩn nấp trong hệ tiêu hóa và tế bào.' where name = 'Paraway Plus';
update sk_products set short_description = 'Chất xơ đại tràng & Bụng phẳng: Cung cấp ma trận chất xơ hòa tan & không hòa tan cao cấp, càn quét mỡ thừa đại tràng, giúp bụng thon gọn.' where name = 'Chất xơ Lifiber';
update sk_products set short_description = 'Giải độc gan & Thanh lọc hạch huyết: Tăng cường chức năng giải độc gan chuyên sâu, làm sạch hệ bạch huyết và huyết tương, gột rửa độc tố.' where name = 'Red Clover Plus';
update sk_products set short_description = 'Cân bằng đường huyết & Đốt mỡ tự thân: Công nghệ Bios Life độc quyền kiểm soát chỉ số GI, lập trình lại cơ chế chuyển hóa, đặc trị mỡ nội tạng lâu năm.' where name = 'Bios Life Slim';
update sk_products set short_description = 'Bảo vệ tim mạch & Cân bằng Cholesterol: Giảm hấp thu cholesterol xấu, bảo vệ thành mạch máu, ngăn ngừa nguy cơ đột quỵ và tim mạch.' where name = 'Bios Life C';
update sk_products set short_description = 'Năng lượng sạch & Đốt mỡ tự nhiên: Chiết xuất Yerba Mate quý giá giúp tinh thần tỉnh táo đỉnh cao, đập tan căng thẳng, kiểm soát thèm ăn và kích hoạt đốt mỡ.' where name = 'Unimate Lemon Ginger Flavored Mate';
update sk_products set short_description = 'Bữa ăn thông minh & Siết cơ: Cung cấp đạm sinh học tinh khiết chuẩn hóa, nuôi dưỡng khối cơ săn chắc, đảm bảo vóc dáng thon gọn không bị lỏng lẻo.' where name = 'LC – Hương Vani';
update sk_products set short_description = 'Tỉnh táo & Đốt cháy năng lượng: Kết hợp cà phê cao cấp và nấm linh chi đỏ giúp tăng tốc chuyển hóa, tỉnh táo làm việc mà không gây ép tim hay đau dạ dày.' where name = 'BioReiShi Coffee';
update sk_products set short_description = 'Thức uống cấp ẩm & Trẻ hóa làn da: Bổ sung Hyaluronic Acid và Collagen thủy phân giúp khóa ẩm sâu, làm căng bóng mướt mịn da từ bên trong.' where name = 'Unicity Oasis';
update sk_products set short_description = 'Tăng cường sức đề kháng & Trẻ hóa: Chiết xuất trái Nhàu Hawaii và thảo dược giàu chất chống oxy hóa, đẩy lùi gốc tự do và phục hồi thể trạng.' where name = 'Hawaiian Noni';
update sk_products set short_description = 'Siêu thực phẩm xanh & Đẹp da: Bổ sung vi tảo đậm đặc giàu đạm, vi chất và diệp lục giúp da hồng hào, tăng cường năng lượng tế bào.' where name = 'ChloroSpirulina';
update sk_products set short_description = 'Siêu Omega chống viêm & Sáng mắt: Hàm lượng EPA/DHA siêu tinh khiết giúp giảm viêm khớp, tăng cường trí nhớ và bảo vệ sức khỏe tim mạch.' where name = 'Omega Life-3 Resolv';
update sk_products set short_description = 'Hồi sinh vi sinh đường ruột: Bổ sung hàng tỷ lợi khuẩn sống được bọc màng vi bao chịu axit, cải thiện dứt điểm ợ chua, chướng bụng và trào ngược.' where name = 'Probionic Plus';
update sk_products set short_description = 'Khớp chắc khỏe & Hấp thu vượt trội: Canxi hữu cơ kết hợp Magiê và Vitamin D3 giúp thẩm thấu trực tiếp vào xương, không lo lắng đọng hay sỏi thận.' where name = 'Hỗn hợp Canxi - Magiê';
update sk_products set short_description = 'Phục hồi sụn khớp & Linh hoạt vận động: Bổ sung dưỡng chất chuyên sâu tái tạo sụn bôi trơn ổ khớp, giảm đau mỏi và rệu rã khớp xương.' where name = 'Joint Mobility';
update sk_products set short_description = 'Lá chắn miễn dịch tự nhiên: Bổ sung sữa non Colostrum giàu kháng thể IgG giúp tăng cường sức đề kháng mạnh mẽ chống lại bệnh tật.' where name = 'Immunizen';
update sk_products set short_description = 'Kích hoạt tế bào miễn dịch: Chiết xuất lô hội nồng độ cao hỗ trợ tăng cường hàng rào bảo vệ cơ thể trước vi khuẩn, virus.' where name = 'Bios Life Mannos';
update sk_products set short_description = 'Kem chống nắng bảo vệ tối ưu, ngăn chặn tia UV & ánh sáng xanh, không nhờn rít.' where name = 'Unicity Daily Suncare';
update sk_products set short_description = 'Sữa rửa mặt tạo bọt mịn làm sạch sâu bụi mịn mà vẫn giữ độ ẩm tự nhiên cho da.' where name = 'Neigene Evolution Foaming Cleanser';
update sk_products set short_description = 'Dầu tẩy trang cao cấp cuốn trôi lớp trang điểm dai dẳng và bụi bẩn bít tắc lỗ chân lông.' where name = 'Neigene Evolution Makeup Remover Oil';
update sk_products set short_description = 'Nước hoa hồng cân bằng pH, se khít lỗ chân lông và dẫn đường cho dưỡng chất thấm sâu.' where name = 'Neigene Evolution Toning Lotion';
update sk_products set short_description = 'Tinh chất đậm đặc nuôi dưỡng tầng sâu, giúp mờ thâm nám và tái tạo cấu trúc da.' where name = 'Neigene Evolution Expert Ampoule';
update sk_products set short_description = 'Kem dưỡng ẩm chuyên sâu phục hồi hàng rào bảo vệ da, cho làn da rạng rỡ, mịn màng.' where name in ('Neigene Evolution Rich Care', 'Neigene Evolution Intense Care');
update sk_products set short_description = 'Dầu dưỡng đa năng từ đầu đến chân, cấp ẩm sâu cho tóc, da mặt và body.' where name = 'Neigene Evolution Head To Toe Oil';
