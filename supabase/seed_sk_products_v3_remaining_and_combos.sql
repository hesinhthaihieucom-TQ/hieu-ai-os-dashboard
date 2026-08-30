-- Phần 1: 13 sản phẩm còn lại không có trong "Sổ Tay Chăm Sóc Sức Khoẻ Chủ Động" — chị Quỳnh yêu cầu
-- tự tra cứu và viết theo đúng chất lượng/định dạng như 15 sản phẩm đã có (2026-08-30). Nguồn: trang
-- sản phẩm chính thức + tra cứu thành phần hoạt chất (nấm Linh Chi, lợi khuẩn, dầu cá, chống nắng,
-- dòng mỹ phẩm Neigene Evolution — Genomceutical). Vẫn giữ nguyên tắc "thành phần X có vai trò..."
-- thay vì gán công dụng cho sản phẩm.
--
-- Phần 2: 5 gói combo sản phẩm — TỰ ĐỀ XUẤT dựa trên 4 nhánh + giá bán lẻ đã có (chị yêu cầu tự tạo
-- combo phù hợp). Mức giảm giá 10% là ĐỀ XUẤT ban đầu — đây là quyết định giá nên chị xem lại và có
-- thể đổi combo_price trực tiếp qua Supabase (chưa có UI Quản Trị riêng cho combo, sẽ làm nếu chị cần).
--
-- Cần cột category + bảng sk_product_combos — chạy schema_full.sql (hoặc riêng đoạn ALTER/CREATE TABLE
-- tương ứng) trước nếu chưa có.

-- ============ 13 SẢN PHẨM CÒN LẠI ============

update sk_products set category='tang_de_khang', benefits =
'• Chiết xuất nấm Linh Chi/Ganoderma lucidum (2%) — chứa polysaccharide (beta-glucan): được biết đến với vai trò kích hoạt tế bào miễn dịch (tế bào NK, đại thực bào), hỗ trợ tăng cường đề kháng tự nhiên.
• Triterpenoid trong nấm Linh Chi — hợp chất có cấu trúc tương tự hormone steroid: được nghiên cứu về vai trò hỗ trợ bảo vệ tế bào gan và hỗ trợ cân bằng huyết áp.
• Adenosine (hoạt chất khác trong nấm Linh Chi): được biết đến với vai trò hỗ trợ thư giãn tự nhiên, giảm căng thẳng.
• Bột cà phê (9,5%): cung cấp caffeine tự nhiên, hỗ trợ sự tỉnh táo.'
where name = 'BioReiShi Coffee';

update sk_products set category='tang_de_khang', benefits =
'• Polysaccharide mạch dài chiết xuất từ nha đam: được các nghiên cứu dinh dưỡng ghi nhận vai trò kích thích sản sinh cytokine miễn dịch, hỗ trợ hoạt hóa tế bào miễn dịch nhận diện tác nhân gây hại.
• Glycoprotein, acid salicylic, Chromone C-glucosyl (hợp chất tự nhiên có trong nha đam): được biết đến với vai trò hỗ trợ ức chế phản ứng viêm.
• Cám gạo: nguồn chất xơ và vi chất tự nhiên, hỗ trợ hệ tiêu hóa.
• Các hợp chất chống oxy hóa có trong nha đam: trung hòa gốc tự do, góp phần hỗ trợ làm chậm quá trình lão hóa tế bào.'
where name = 'Bios Life Mannos';

update sk_products set category='giam_mo', benefits =
'• Dầu cá dạng Ethyl Ester chứa EPA (1000mg) và DHA (500mg) — hai acid béo Omega-3: được biết đến rộng rãi trong dinh dưỡng với vai trò hỗ trợ sức khỏe tim mạch (hỗ trợ cân bằng triglyceride máu) và hỗ trợ chức năng não bộ, thị lực.
• Chiết xuất Hương thảo (Rosemary Extract) và hỗn hợp Tocopherol tự nhiên (Vitamin E): có vai trò chống oxy hóa, giúp bảo vệ các acid béo không bão hòa khỏi bị oxy hóa trong quá trình bảo quản và sử dụng.
• Lecithin từ đậu nành: hỗ trợ nhũ hóa, hỗ trợ hấp thu chất béo tốt hơn.'
where name = 'Omega Life-3 Resolv';

update sk_products set category='thai_doc', benefits =
'• 11 chủng lợi khuẩn (Lactobacillus acidophilus, L. rhamnosus, L. plantarum, L. gasseri, L. casei, Lactococcus lactis, Bifidobacterium longum, B. breve, B. lactis...) ở dạng vi bao (microencapsulated) để tăng khả năng sống sót qua môi trường acid dạ dày: được biết đến với vai trò hỗ trợ cân bằng hệ vi sinh đường ruột.
• Fructooligosaccharide (FOS) — chất xơ prebiotic: là nguồn "thức ăn" nuôi dưỡng lợi khuẩn, hỗ trợ lợi khuẩn phát triển và duy trì trong đường ruột.'
where name = 'Probionic Plus';

update sk_products set category='lam_dep_da', benefits =
'• Titanium Dioxide, Zinc Oxide (bộ lọc chống nắng vật lý) kết hợp Ethylhexyl Methoxycinnamate (bộ lọc hóa học), chỉ số SPF 50+ PA+++: được biết đến với vai trò phản xạ/hấp thu tia UVA-UVB, hỗ trợ bảo vệ da khỏi tác động của ánh nắng.
• Chiết xuất Lô hội, Vitamin E: có vai trò chống oxy hóa, hỗ trợ làm dịu da.
• Sodium Hyaluronate: được biết đến với vai trò giữ ẩm, hỗ trợ duy trì độ mềm mịn cho da.'
where name = 'Unicity Daily Suncare';

update sk_products set category='lam_dep_da', benefits =
'• Tảo tuyết (Snow Algae): được biết đến với vai trò cấp nước sâu, giúp da mềm mại và căng mọng hơn.
• Phù du hồng (Pink Plankton): có vai trò hỗ trợ làm đều màu da, giúp da trông sáng khỏe hơn.
• Phức hợp 17 Amino Acid: cung cấp dưỡng chất thiết yếu cho da, được biết đến với vai trò hỗ trợ quá trình tái tạo và làm dịu da.
• Chiết xuất Sea Buckthorn/Hắc mai biển (Hippophae rhamnoides) — giàu vitamin C, E và chất chống oxy hóa: có vai trò chống oxy hóa và hỗ trợ nuôi dưỡng da từ sâu bên trong.'
where name = 'Neigene Evolution Expert Ampoule';

update sk_products set category='lam_dep_da', benefits =
'• Cùng nền dưỡng chất Tảo tuyết, Phù du hồng, Phức hợp 17 Amino Acid như dòng Neigene Evolution — phối trong nền dầu dưỡng: có vai trò cấp ẩm, hỗ trợ làm mềm mượt da toàn thân và vùng mặt.
• Sea Buckthorn — giàu acid béo tự nhiên (omega-7): được biết đến với vai trò hỗ trợ nuôi dưỡng và củng cố hàng rào bảo vệ da.'
where name = 'Neigene Evolution Head To Toe Oil';

update sk_products set category='lam_dep_da', benefits =
'• Phức hợp Ceramide độc quyền: được biết đến với vai trò củng cố hàng rào bảo vệ da, hạn chế mất nước qua da.
• Chứa tới 68% nước chiết xuất từ Phù du hồng: có vai trò cấp ẩm sâu, hỗ trợ làm dịu da.
• Tảo tuyết, Phức hợp 17 Amino Acid: hỗ trợ nuôi dưỡng và làm mềm da dùng hằng ngày.'
where name = 'Neigene Evolution Intense Care';

update sk_products set category='lam_dep_da', benefits =
'• Nền dầu tẩy trang gốc thực vật kết hợp dưỡng chất Sea Buckthorn, Tảo tuyết: được biết đến với vai trò hòa tan lớp trang điểm/bụi bẩn hiệu quả, đồng thời cấp ẩm để hạn chế làm khô da so với tẩy trang gốc cồn thông thường.'
where name = 'Neigene Evolution Makeup Remover Oil';

update sk_products set category='lam_dep_da', benefits =
'• Công thức tạo bọt mịn kết hợp Phức hợp 17 Amino Acid, Phù du hồng: có vai trò làm sạch bụi bẩn và dầu thừa nhẹ nhàng, hỗ trợ duy trì độ ẩm tự nhiên của da sau khi rửa mặt.'
where name = 'Neigene Evolution Foaming Cleanser';

update sk_products set category='lam_dep_da', benefits =
'• Nồng độ dưỡng chất Tảo tuyết, Phù du hồng, Phức hợp 17 Amino Acid ở dạng đậm đặc hơn dòng ban ngày: được biết đến với vai trò cấp ẩm sâu và hỗ trợ phục hồi da trong lúc ngủ — thời điểm da tái tạo tự nhiên.
• Sea Buckthorn: có vai trò chống oxy hóa, hỗ trợ nuôi dưỡng da qua đêm.'
where name = 'Neigene Evolution Rich Care';

update sk_products set category='lam_dep_da', benefits =
'• Dạng nước cân bằng chứa Phù du hồng, Phức hợp 17 Amino Acid ở nồng độ nhẹ: được biết đến với vai trò hỗ trợ cân bằng da sau bước làm sạch và cấp nước ban đầu trước các bước dưỡng tiếp theo.'
where name = 'Neigene Evolution Toning Lotion';

-- ============ 5 GÓI COMBO SẢN PHẨM (đề xuất) ============

insert into sk_product_combos (name, description, category, product_ids, combo_price) values
('Combo Thải Độc Toàn Diện',
 'Kết hợp Aloe Vera, Chất xơ Lifiber và Bột Diệp Lục — hỗ trợ đường ruột khỏe mạnh và cơ thể nhẹ nhàng hơn từ bên trong.',
 'thai_doc',
 array(select id from sk_products where name in ('Aloe Vera','Chất xơ Lifiber','Bột Diệp Lục Super Chlorophyll Powder')),
 2480000),

('Combo Giảm Mỡ - Cân Bằng Chuyển Hoá',
 'Kết hợp Bios Life Slim, LC – Hương Vani và Unimate Lemon Ginger — bộ đôi kiểm soát khẩu phần ăn cùng thức uống hỗ trợ chuyển hóa mỗi ngày.',
 'giam_mo',
 array(select id from sk_products where name in ('Bios Life Slim','LC – Hương Vani','Unimate Lemon Ginger Flavored Mate')),
 5910000),

('Combo Tăng Đề Kháng',
 'Kết hợp Immunizen, ChloroSpirulina và Hawaiian Noni — bổ sung đa dạng dưỡng chất hỗ trợ hệ miễn dịch.',
 'tang_de_khang',
 array(select id from sk_products where name in ('Immunizen','ChloroSpirulina','Hawaiian Noni')),
 3140000),

('Combo Làm Đẹp Da - Trẻ Hoá',
 'Kết hợp Unicity Oasis, Joint Mobility và Hỗn hợp Canxi - Magiê — chăm sóc da, xương khớp cùng lúc.',
 'lam_dep_da',
 array(select id from sk_products where name in ('Unicity Oasis','Joint Mobility','Hỗn hợp Canxi - Magiê')),
 3900000),

('Combo Chăm Sóc Toàn Diện',
 'Mỗi nhánh 1 sản phẩm tiêu biểu: Aloe Vera (thải độc), Bios Life Slim (giảm mỡ), Immunizen (đề kháng), Unicity Oasis (làm đẹp da) — phù hợp người mới bắt đầu muốn chăm sóc sức khỏe đầy đủ 4 mặt.',
 null,
 array(select id from sk_products where name in ('Aloe Vera','Bios Life Slim','Immunizen','Unicity Oasis')),
 5810000);
