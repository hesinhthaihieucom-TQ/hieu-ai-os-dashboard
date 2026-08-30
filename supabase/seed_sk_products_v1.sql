-- Sản Phẩm Unicity (sk_products) — dữ liệu lấy từ trang chính thức unicity.com/vnm/vi/tat-ca-san-pham
-- (tên, hình, giá bán lẻ niêm yết). Phần "thành phần nổi bật" được biên soạn dựa trên tra cứu thành phần
-- công bố của từng sản phẩm trên các nguồn liên quan đến Unicity — CỐ Ý viết theo hướng "thành phần X có
-- vai trò/được biết đến với..." thay vì "sản phẩm có công dụng...", theo đúng yêu cầu tuân thủ luật quảng
-- cáo TPCN của chị Quỳnh (không được gán công dụng trực tiếp cho sản phẩm, không dùng từ ngữ kiểu
-- "chữa/trị/khỏi bệnh/thải độc/diệt ký sinh trùng"...). Chạy 1 lần trong Supabase SQL Editor.
--
-- Nếu chạy lại (re-run) sau khi đã sửa tay dữ liệu trong Quản Trị, thao tác insert dưới đây sẽ tạo
-- bản ghi TRÙNG (bảng không có unique constraint theo tên) — nên chỉ chạy 1 lần trên môi trường sạch,
-- hoặc xoá các dòng cũ trong Quản Trị trước khi chạy lại.

insert into sk_products (name, short_description, benefits, retail_price, image_url) values

('Aloe Vera',
 'Viên uống chiết xuất từ lá nha đam (Aloe Ferox Mill), dạng viên nang tiện dùng hằng ngày.',
 'Thành phần chính là bột chiết xuất lá nha đam Aloe Ferox Mill, chứa polysaccharide (trong đó có acemannan) — các hợp chất được biết đến trong dinh dưỡng với vai trò hỗ trợ hệ tiêu hóa, cùng vitamin A, C, E, nhóm B, kẽm, magie, canxi có sẵn trong nha đam.',
 810000,
 'https://cdn.builder.io/api/v1/image/assets%2F75d1550ccc71414e99b49b063f57488b%2F49c939fb53ce496ba0733b656d535377'),

('Bios Life C',
 'Thức uống bổ sung chất xơ và vi chất, pha nước dùng hằng ngày.',
 'Chứa hỗn hợp chất xơ hòa tan (Citrus Pectin, Oat Fiber, Beta Glucan), phytosterol từ thực vật, cùng vitamin C, nhóm B, E, kẽm và crôm — các thành phần được biết đến với vai trò hỗ trợ chuyển hóa và bổ sung vi chất cho khẩu phần ăn.',
 2754000,
 'https://cdn.builder.io/api/v1/image/assets%2F75d1550ccc71414e99b49b063f57488b%2F5479eec41c2b45cd970a30293e974dba'),

('Bios Life Mannos',
 'Viên uống bổ sung polysaccharide từ nha đam và cám gạo.',
 'Chứa polysaccharide chiết xuất từ nha đam kết hợp cám gạo — các hợp chất này được các nghiên cứu dinh dưỡng ghi nhận có vai trò hỗ trợ hoạt động của hệ miễn dịch tự nhiên.',
 810000,
 'https://cdn.builder.io/api/v1/image/assets%2F75d1550ccc71414e99b49b063f57488b%2F44612ab8c0ad42919f1c9207a92ad5de'),

('Bios Life Slim',
 'Thức uống bổ sung chất xơ hòa tan, pha nước dùng hỗ trợ kiểm soát khẩu phần ăn.',
 'Chứa hỗn hợp chất xơ hòa tan (Guar Gum, Beta-Glucan, Pectin), phytosterol chiết xuất từ đậu nành, policosanol, vitamin nhóm B và crôm — các thành phần dinh dưỡng được biết đến với vai trò hỗ trợ tạo cảm giác no lâu và hỗ trợ chuyển hóa chất béo.',
 2808000,
 'https://cdn.builder.io/api/v1/image/assets%2F75d1550ccc71414e99b49b063f57488b%2Fc4e894d3869a46c988b341e4be978d07'),

('BioReiShi Coffee',
 'Cà phê hòa tan bổ sung bột chiết xuất nấm linh chi đỏ.',
 'Thành phần gồm bột cà phê và bột chiết xuất nấm linh chi đỏ (Reishi) — nấm linh chi là dược liệu được biết đến trong y học cổ truyền và dinh dưỡng hiện đại với vai trò hỗ trợ đề kháng tự nhiên của cơ thể.',
 291600,
 'https://cdn.builder.io/api/v1/image/assets%2F75d1550ccc71414e99b49b063f57488b%2F48869a59d07f403aa81c98cc7a8bf9fb'),

('Bột Diệp Lục Super Chlorophyll Powder',
 'Bột uống bổ sung diệp lục và vi chất từ cỏ linh lăng.',
 'Thành phần chính là cỏ linh lăng (Alfalfa) và Sodium Copper Chlorophyll (diệp lục đồng natri) — cỏ linh lăng chứa vitamin A, B, D, E cùng khoáng chất (canxi, sắt, magie, kali) được biết đến với vai trò bổ sung vi chất tự nhiên cho cơ thể.',
 702000,
 'https://cdn.builder.io/api/v1/image/assets%2F75d1550ccc71414e99b49b063f57488b%2F014aaa9d1cc34baebcb9a3c3949ad599'),

('Hỗn hợp Canxi - Magiê',
 'Bột uống bổ sung canxi, magie và vitamin D3, pha nước dùng hằng ngày.',
 'Chứa canxi và magie ở dạng amino acid chelate cùng vitamin D3 — vitamin D3 được biết đến trong dinh dưỡng với vai trò hỗ trợ hấp thu canxi, góp phần cho hệ xương chắc khỏe.',
 874800,
 'https://cdn.builder.io/api/v1/image/assets%2F75d1550ccc71414e99b49b063f57488b%2Ffb6fab4a28734878831b3a031f54101e'),

('Chất xơ Lifiber',
 'Bột bổ sung chất xơ tự nhiên, pha nước dùng hằng ngày.',
 'Thành phần chính là bột vỏ hạt mã đề (Psyllium husk), chất xơ Inulin/FOS và pectin táo — đây là các loại chất xơ hòa tan được biết đến với vai trò hỗ trợ nhu động ruột và duy trì hệ tiêu hóa khỏe mạnh.',
 1242000,
 'https://cdn.builder.io/api/v1/image/assets%2F75d1550ccc71414e99b49b063f57488b%2Ffab2672e68a7436fbed5c17359fab39f'),

('ChloroSpirulina',
 'Viên uống bổ sung tảo Spirulina.',
 'Thành phần chính là tảo Spirulina — loại tảo giàu protein, sắt, kali và khoáng vi lượng, được biết đến trong dinh dưỡng với vai trò bổ sung dưỡng chất tự nhiên cho cơ thể.',
 831600,
 'https://cdn.builder.io/api/v1/image/assets%2F75d1550ccc71414e99b49b063f57488b%2F0ec8c089d32e48a48b065c8b82e107ee'),

('Hawaiian Noni',
 'Bột uống bổ sung chiết xuất trái nhàu, đu đủ và nha đam.',
 'Chứa chiết xuất trái nhàu (Noni), đu đủ và nha đam — trái nhàu là loại quả giàu vitamin C, beta-carotene và chất chống oxy hóa, được biết đến với vai trò bổ sung dưỡng chất hỗ trợ đề kháng tự nhiên.',
 1706400,
 'https://cdn.builder.io/api/v1/image/assets%2F75d1550ccc71414e99b49b063f57488b%2F686a2d68a97346eb86acc8823a589128'),

('Immunizen',
 'Viên uống bổ sung Beta Glucan, sữa non và Lactoferrin.',
 'Chứa Beta 1,3/1,6 Glucan chiết xuất từ tế bào nấm men, Colostrum (sữa non), Arabinogalactan và Lactoferrin — các hoạt chất này được các nghiên cứu dinh dưỡng ghi nhận có vai trò hỗ trợ hoạt động của hệ miễn dịch và khả năng chống oxy hóa của tế bào.',
 950400,
 'https://cdn.builder.io/api/v1/image/assets%2F75d1550ccc71414e99b49b063f57488b%2F493c6a9144e5433e89156506abf7535c'),

('Joint Mobility',
 'Viên uống bổ sung vitamin D3 và tinh chất nghệ.',
 'Chứa vitamin D3 và tinh chất nghệ (turmeric) — vitamin D3 được biết đến với vai trò hỗ trợ sức khỏe xương, còn nghệ chứa curcumin là hoạt chất được nhiều nghiên cứu dinh dưỡng quan tâm về đặc tính chống oxy hóa.',
 1571400,
 'https://cdn.builder.io/api/v1/image/assets%2F75d1550ccc71414e99b49b063f57488b%2F5f261cb0953846348915c8512ca6222a'),

('LC – Hương Vani',
 'Thức uống dinh dưỡng thay thế bữa ăn, hương vani.',
 'Thành phần chính là protein phân lập từ đậu Hà Lan, protein sữa, whey protein cô đặc/phân lập cùng chất xơ Inulin — protein và chất xơ là các dưỡng chất được biết đến với vai trò tạo cảm giác no và bổ sung dinh dưỡng cho bữa ăn kiểm soát năng lượng.',
 1620000,
 'https://cdn.builder.io/api/v1/image/assets%2F75d1550ccc71414e99b49b063f57488b%2F70638808174d44f8a849013871b9b858'),

('Neigene Evolution Expert Ampoule',
 'Tinh chất dưỡng da dạng ampoule, thẩm thấu nhanh.',
 'Thành phần chính gồm chiết xuất tảo tuyết, phù du hồng và phức hợp 17 amino acid — các dưỡng chất này được biết đến trong mỹ phẩm với vai trò cấp nước, làm mềm mịn và nuôi dưỡng da.',
 1771200,
 'https://cdn.builder.io/api/v1/image/assets%2F75d1550ccc71414e99b49b063f57488b%2Fb1b12e88039f40c0b8e3b545a435d021'),

('Neigene Evolution Head To Toe Oil',
 'Dầu dưỡng toàn thân, dùng cho da mặt và cơ thể.',
 'Nền dầu dưỡng kết hợp dưỡng chất của dòng Neigene Evolution (tảo tuyết, phù du hồng, phức hợp amino acid) — có vai trò cấp ẩm và làm mềm mượt da.',
 745200,
 'https://cdn.builder.io/api/v1/image/assets%2F75d1550ccc71414e99b49b063f57488b%2Fbf20be0a7a0b4cc18e7ad5f7e3ddbf81'),

('Neigene Evolution Intense Care',
 'Sữa dưỡng da dùng ban ngày.',
 'Chứa các dưỡng chất nền tảng của dòng Neigene Evolution (tảo tuyết, phù du hồng, amino acid) — được biết đến với vai trò cấp ẩm và làm dịu da hằng ngày.',
 1512000,
 'https://cdn.builder.io/api/v1/image/assets%2F75d1550ccc71414e99b49b063f57488b%2F44125579b8db422089e797aa23b88b5f'),

('Neigene Evolution Makeup Remover Oil',
 'Dầu tẩy trang, làm sạch lớp trang điểm và bụi bẩn.',
 'Nền dầu tẩy trang kết hợp dưỡng chất dòng Neigene Evolution — có vai trò hòa tan lớp trang điểm và bụi bẩn trên da, hạn chế gây khô da khi làm sạch.',
 734400,
 'https://cdn.builder.io/api/v1/image/assets%2F75d1550ccc71414e99b49b063f57488b%2Fecc9e753a435403e97d11876d28de926'),

('Neigene Evolution Foaming Cleanser',
 'Sữa rửa mặt tạo bọt, làm sạch da.',
 'Công thức tạo bọt dịu nhẹ kết hợp dưỡng chất dòng Neigene Evolution — có vai trò làm sạch bụi bẩn, dầu thừa trên da mà không gây khô căng.',
 680400,
 'https://cdn.builder.io/api/v1/image/assets%2F75d1550ccc71414e99b49b063f57488b%2F0af134fe71c244e1b7cfa98087458791'),

('Neigene Evolution Rich Care',
 'Kem dưỡng da dùng ban đêm.',
 'Chứa nền dưỡng chất đậm đặc của dòng Neigene Evolution (tảo tuyết, phù du hồng, amino acid) — được biết đến với vai trò cấp ẩm sâu và nuôi dưỡng da trong lúc ngủ.',
 1512000,
 'https://cdn.builder.io/api/v1/image/assets%2F75d1550ccc71414e99b49b063f57488b%2Fa6ccf118c44a4251b5f2ac41c9c76b91'),

('Neigene Evolution Toning Lotion',
 'Nước cân bằng da (toner).',
 'Thành phần dưỡng chất dòng Neigene Evolution ở dạng lỏng nhẹ — có vai trò hỗ trợ cân bằng da và cấp nước sau bước làm sạch.',
 1123200,
 'https://cdn.builder.io/api/v1/image/assets%2F75d1550ccc71414e99b49b063f57488b%2F39eac14aba564ee6a2925636ae6bc775'),

('Omega Life-3 Resolv',
 'Viên uống dầu cá bổ sung Omega-3.',
 'Mỗi viên chứa dầu cá dạng Ethyl Ester với EPA và DHA — hai acid béo Omega-3 được biết đến trong dinh dưỡng với vai trò hỗ trợ sức khỏe tim mạch và thị lực.',
 1274400,
 'https://cdn.builder.io/api/v1/image/assets%2F75d1550ccc71414e99b49b063f57488b%2F611b31d8921f4337950b1f6f601aaa78'),

('Paraway Plus',
 'Viên uống bổ sung thảo dược tự nhiên.',
 'Thành phần từ các thảo dược tự nhiên gồm hạt bí ngô, vỏ óc chó đen, tỏi, đinh hương và nhiều loại thảo mộc khác — các thảo dược này được biết đến trong dinh dưỡng truyền thống với vai trò hỗ trợ hệ tiêu hóa.',
 907200,
 'https://cdn.builder.io/api/v1/image/assets%2F75d1550ccc71414e99b49b063f57488b%2F0562690879ef49b7b8c073bc53b95012'),

('Probionic Plus',
 'Bột bổ sung lợi khuẩn đường ruột.',
 'Chứa 11 chủng lợi khuẩn (Lactobacillus, Bifidobacterium...) cùng chất xơ prebiotic FOS — lợi khuẩn và prebiotic là các thành phần được biết đến với vai trò hỗ trợ cân bằng hệ vi sinh đường ruột.',
 1188000,
 'https://cdn.builder.io/api/v1/image/assets%2F75d1550ccc71414e99b49b063f57488b%2Fa0495a3b50834a3f9bf198d010c3a326'),

('Red Clover Plus',
 'Viên uống bổ sung chiết xuất cỏ ba lá đỏ.',
 'Thành phần chính là cỏ ba lá đỏ (Red Clover) giàu isoflavone, kết hợp cùng các thảo dược khác — isoflavone là hợp chất thực vật được các nghiên cứu dinh dưỡng ghi nhận về đặc tính chống oxy hóa.',
 590760,
 'https://cdn.builder.io/api/v1/image/assets%2F75d1550ccc71414e99b49b063f57488b%2F845c9b85a2074492aac028a2b25ca0d5'),

('Unimate Lemon Ginger Flavored Mate',
 'Thức uống hòa tan hương chanh gừng từ lá trà Mate.',
 'Thành phần chính là chiết xuất lá trà Mate (Ilex Paraguariensis) hương chanh gừng, chứa caffeine và chlorogenic acid tự nhiên — các hoạt chất này được biết đến với vai trò hỗ trợ sự tỉnh táo và tập trung tinh thần.',
 2138400,
 'https://cdn.builder.io/api/v1/image/assets%2F75d1550ccc71414e99b49b063f57488b%2Fda1f0083e7ad499b8da89fe357e66e9f'),

('Unicity Oasis',
 'Bột uống bổ sung khoáng vi lượng và collagen.',
 'Thành phần gồm các khoáng vi lượng (canxi, kali, kẽm, magie, đồng...), collagen cá phân tử thấp và hyaluronic acid — các dưỡng chất này được biết đến với vai trò cấp ẩm và hỗ trợ độ đàn hồi tự nhiên của da.',
 1890000,
 'https://cdn.builder.io/api/v1/image/assets%2F75d1550ccc71414e99b49b063f57488b%2F775f77971c69498c81f77dc7755ab268'),

('Unicity Daily Suncare',
 'Kem chống nắng SPF 50+ PA+++, dùng hằng ngày.',
 'Chứa Titanium Dioxide, Zinc Oxide kết hợp Ethylhexyl Methoxycinnamate, cùng chiết xuất lô hội và vitamin E — các thành phần chống nắng vật lý và hóa học này được biết đến với vai trò bảo vệ da khỏi tia UVA/UVB.',
 637200,
 'https://cdn.builder.io/api/v1/image/assets%2F75d1550ccc71414e99b49b063f57488b%2Fb03652fef4c4495586c224725b9f626f'),

('Unimate Lemon Flavored Mate',
 'Thức uống hòa tan hương chanh từ lá trà Mate.',
 'Thành phần chính là chiết xuất lá trà Mate (Ilex Paraguariensis) hương chanh, chứa caffeine và chlorogenic acid tự nhiên — các hoạt chất này được biết đến với vai trò hỗ trợ sự tỉnh táo và tập trung tinh thần.',
 2138400,
 'https://cdn.builder.io/api/v1/image/assets%2F75d1550ccc71414e99b49b063f57488b%2Fa9cb71b4a4ee400394daf0f9e2941df1');
