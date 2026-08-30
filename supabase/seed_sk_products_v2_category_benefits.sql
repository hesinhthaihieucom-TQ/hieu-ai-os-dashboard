-- Cập nhật PHÂN NHÁNH (category) + THÀNH PHẦN NỔI BẬT (benefits) chi tiết hơn cho 15 sản phẩm có
-- trong "Sổ Tay Chăm Sóc Sức Khoẻ Chủ Động Chuyên Nghiệp" chị Quỳnh gửi (2026-08-30). Nội dung lấy
-- trực tiếp từ sổ tay (mục "Công dụng của các thành phần..." từng sản phẩm), viết lại theo đúng
-- format "thành phần X — vai trò/được biết đến với..." (không gán công dụng cho sản phẩm), theo yêu
-- cầu tuân thủ luật quảng cáo TPCN đã chốt trước đó. Không đụng tới sản phẩm nào không có trong sổ
-- tay (nhóm mỹ phẩm Neigene, BioReiShi Coffee, Bios Life Mannos, Omega Life-3, Probionic Plus, Daily
-- Suncare) — giữ nguyên benefits cũ, category để trống (null).
--
-- Chạy SAU seed_sk_products_v1.sql (update theo tên, không tạo trùng dòng). Cần cột "category" —
-- chạy schema_full.sql hoặc ALTER dưới đây trước nếu cột chưa có:
alter table sk_products add column if not exists category text
  check (category in ('thai_doc','giam_mo','tang_de_khang','lam_dep_da'));

-- ============ NHÁNH THẢI ĐỘC ============

update sk_products set category='thai_doc', benefits =
'• Bột chiết xuất lá Lô hội Aloe Ferox Mill (525mg/viên) — chứa anthraquinone glycosides (aloin A, barbaloin, emodin): được biết đến với vai trò kích thích nhu động ruột, hỗ trợ giảm táo bón và hỗ trợ đào thải cặn bã đường ruột.
• Cùng nhóm hợp chất trên — polyphenol, flavonoid tự nhiên: có vai trò chống oxy hóa, bảo vệ tế bào khỏi gốc tự do, hỗ trợ giảm viêm nhẹ đến trung bình.
• Anthraquinone trong Aloe Ferox — được nghiên cứu về khả năng ức chế một số vi khuẩn (Staphylococcus aureus, E. coli) và nấm (Candida albicans) trong môi trường phòng thí nghiệm.
• Polysaccharide (acemannan) — được biết đến với vai trò kích thích đại thực bào, hỗ trợ tăng sinh nguyên bào sợi và tổng hợp collagen, hỗ trợ làm dịu da khi kích ứng nhẹ.'
where name = 'Aloe Vera';

update sk_products set category='thai_doc', benefits =
'• Sodium Copper Chlorophyll (≥26,4mg/2g, chiết xuất từ cỏ Linh Lăng/Alfalfa) — dẫn xuất bán tổng hợp của diệp lục tự nhiên: được biết đến với vai trò chống oxy hóa (giảm oxy hóa lipid), giúp bảo vệ các dưỡng chất nhạy cảm với oxy như vitamin C.
• Một số nghiên cứu ghi nhận Sodium Copper Chlorophyll có tiềm năng hỗ trợ chức năng gan (giảm marker tổn thương DNA do độc tố) và hỗ trợ hệ miễn dịch (kích thích cytokine IL-2, IFN-γ).
• Cỏ Linh Lăng (Alfalfa) là nguồn cung cấp tự nhiên vitamin A, B, D, E cùng khoáng chất canxi, sắt, magie, kali.'
where name = 'Bột Diệp Lục Super Chlorophyll Powder';

update sk_products set category='thai_doc', benefits =
'• Bột vỏ hạt Mã đề/Psyllium husk (52%) — chất xơ hòa tan: được biết đến với vai trò tăng nhu động ruột, hấp thu nước làm mềm phân, hỗ trợ làm chậm hấp thu glucose sau ăn và hỗ trợ kiểm soát cholesterol.
• Chất xơ Inulin/FOS (26%) — prebiotic tự nhiên: nuôi dưỡng lợi khuẩn đường ruột, hỗ trợ cân bằng hệ vi sinh, hỗ trợ tiêu hóa và tăng hấp thu khoáng chất (canxi, magie).
• Pectin từ Táo (4,2%): hỗ trợ tiêu hóa, làm mềm phân, hỗ trợ kiểm soát cholesterol, làm chậm hấp thu glucose.
• Bột quả Nhàu (3,1%): giàu chất chống oxy hóa, được biết đến với vai trò hỗ trợ tiêu hóa và hỗ trợ hệ miễn dịch.
• Citrus Pectin (2,1%): hỗ trợ tiêu hóa, hỗ trợ kiểm soát cholesterol xấu (LDL) và ổn định đường huyết.
• Bột hoa Dâm bụt (2,1%) — giàu vitamin C: có vai trò chống oxy hóa, hỗ trợ tuần hoàn.
• Vỏ Quế (0,7%): có đặc tính kháng khuẩn/kháng nấm nhẹ, được dùng như chất bảo quản tự nhiên trong thực phẩm.
• Bột rễ Cam thảo (0,5%): tạo vị ngọt tự nhiên, có tiềm năng hỗ trợ tiêu hóa và giảm viêm nhẹ.
• Hỗn hợp 8 thảo mộc (Lô Hội, Cỏ Đại mạch, Tỏi, Củ Gừng, Đu Đủ, Hạt Bí Ngô, Mâm Xôi Đỏ, Bột Ớt) — mỗi loại đóng góp một vai trò riêng: hỗ trợ tiêu hóa, tăng cường miễn dịch, hỗ trợ kiểm soát cholesterol, giảm viêm, chống oxy hóa.'
where name = 'Chất xơ Lifiber';

update sk_products set category='thai_doc', benefits =
'• 14 loại thảo mộc tự nhiên, trong đó Hà Thủ Ô đỏ (chiết xuất 12:1) là thành phần chính — chứa anthraquinon, resveratrol, tannin, alkaloid, steroid: được biết đến với vai trò chống oxy hóa, hỗ trợ chức năng gan, hỗ trợ hệ miễn dịch và tuần hoàn máu.
• Tỏi (Garlic Bulb) — chứa allicin, S-allyl cysteine, ajoene: có đặc tính kháng khuẩn, chống viêm, chống oxy hóa, hỗ trợ bảo vệ tế bào gan.
• Nụ Đinh hương (Clove) — chứa eugenol: được biết đến với vai trò kháng khuẩn/kháng nấm, giảm đau, chống viêm, hỗ trợ tiêu hóa (giảm đầy hơi, chướng bụng).
• Vỏ quả Óc chó đen, Lá Xô thơm, Rễ Long đởm, Lá Bài hương, Hạt Cỏ cà ri, Chiết xuất Hoa cúc La Mã, Hạt Tiêu đen, Lá Bạc hà, Cỏ Xạ hương, Hạt Thì là: mỗi loại thảo mộc góp phần hỗ trợ tiêu hóa, kháng khuẩn nhẹ hoặc giảm co thắt/đầy hơi theo y học cổ truyền.'
where name = 'Paraway Plus';

update sk_products set category='thai_doc', benefits =
'• Chiết xuất Hoa Cỏ Ba Lá Đỏ (Red Clover, thành phần chính) — giàu isoflavone: được biết đến với vai trò hỗ trợ cân bằng nội tiết tố estrogen tự nhiên, hỗ trợ cải thiện tỷ lệ cholesterol (giảm LDL, tăng HDL) và chống oxy hóa.
• Chiết xuất cây Móng Quỷ — chứa hoạt chất harpagoside: có đặc tính chống viêm, giảm đau tự nhiên, hỗ trợ tiêu hóa và hỗ trợ chức năng gan.
• Chiết xuất rễ Hoàng Liên Gai — chứa berberine: được biết đến với vai trò kháng khuẩn/kháng viêm, hỗ trợ ổn định đường huyết, hỗ trợ tim mạch (cân bằng cholesterol) và chống oxy hóa bảo vệ gan.
• Bột rễ Cam Thảo — chứa glycyrrhizin, flavonoid: hỗ trợ giảm viêm, hỗ trợ tiêu hóa, có tính kháng khuẩn nhẹ.
• Bột rễ Thổ Phục Linh — chứa saponin, polysaccharide, flavonoid, tannin: được biết đến với vai trò thanh lọc cơ thể, hỗ trợ tiêu hóa, kháng viêm/kháng khuẩn và tăng cường miễn dịch.
• Bột rễ cây Cúc Dại — chứa alkylamide, polysaccharide, flavonoid: hỗ trợ tăng cường hệ miễn dịch, kháng khuẩn, chống viêm và chống oxy hóa.
• Bột rễ cây Ngưu Bàng, Vỏ Tần Bì Gai, Bột Cây Tảo Bẹ, Bột Lá Hương Thảo: mỗi thành phần góp phần giải độc gan, kháng viêm xương khớp, bổ sung khoáng chất và chống oxy hóa.'
where name = 'Red Clover Plus';

-- ============ NHÁNH GIẢM MỠ / CÂN BẰNG RỐI LOẠN CHUYỂN HOÁ ============

update sk_products set category='giam_mo', benefits =
'• Phytosterols (400mg) — hợp chất thực vật có cấu trúc tương tự cholesterol: được biết đến với vai trò cạnh tranh hấp thu cholesterol tại ruột, hỗ trợ giảm cholesterol nội và ngoại sinh, tăng đào thải cholesterol qua phân.
• Niacin/Vitamin B3 — có vai trò ức chế tổng hợp và bài tiết lipid từ gan, hỗ trợ tăng HDL ("cholesterol tốt") và giảm LDL/triglyceride.
• Vitamin C (45mg) — hỗ trợ chuyển hóa cholesterol thành acid mật tại gan (một cơ chế đào thải cholesterol), đồng thời có vai trò chống oxy hóa bảo vệ mạch máu.
• Chất xơ hòa tan (Gôm Guar, Citrus Pectin, Sợi Yến Mạch, Beta Glucan): tạo gel làm chậm hấp thu đường và chất béo, hỗ trợ ổn định đường huyết, hỗ trợ cảm giác no và cải thiện nhu động ruột.
• Cùng các vi chất khác: Crôm hỗ trợ chuyển hóa đường, Kẽm/Vitamin nhóm B/A/E góp phần hỗ trợ chuyển hóa năng lượng tổng thể.'
where name = 'Bios Life C';

update sk_products set category='giam_mo', benefits =
'• Chất xơ hòa tan (Guar Gum, Beta-Glucan, Pectin): tạo gel trong dạ dày làm chậm quá trình rỗng dạ dày và hấp thu glucose, được biết đến với vai trò hỗ trợ tạo cảm giác no lâu, giảm hấp thu cholesterol, nuôi dưỡng lợi khuẩn đường ruột (prebiotic) và hỗ trợ giảm chỉ số đường huyết sau ăn (GI).
• Vitamin C — hỗ trợ tăng tổng hợp carnitine (chất vận chuyển acid béo vào ty thể để đốt năng lượng), có vai trò chống oxy hóa, hỗ trợ tái tạo vitamin E, hỗ trợ tổng hợp collagen và tăng hấp thu sắt.
• Vitamin E (D-alpha Tocopherol) — chất chống oxy hóa mạnh, bảo vệ màng tế bào khỏi gốc tự do, hỗ trợ tái tạo khả năng chống oxy hóa của vitamin C, có vai trò hỗ trợ sức khỏe tim mạch.
• Phytosterols — được biết đến với vai trò hỗ trợ giảm cholesterol máu (giảm LDL), qua đó hỗ trợ phòng ngừa nguy cơ tim mạch; một số nghiên cứu bước đầu cho thấy tiềm năng hỗ trợ cải thiện chỉ số lipid ở người thừa cân.
• Policosanol (chiết xuất từ đường mía) và Crôm: góp phần hỗ trợ chuyển hóa lipid và đường trong khẩu phần ăn kiêng.'
where name = 'Bios Life Slim';

update sk_products set category='giam_mo', benefits =
'• Hỗn hợp Protein phân lập từ đậu Hà Lan, Protein sữa/Casein, Whey Protein cô đặc & phân lập: được biết đến với vai trò cung cấp acid amin thiết yếu cho phục hồi và duy trì cơ bắp, hỗ trợ tạo cảm giác no lâu (đặc biệt casein tiêu hóa chậm) — phù hợp cho khẩu phần kiểm soát năng lượng.
• Whey Protein — giàu leucine và BCAA: hỗ trợ kích hoạt tổng hợp protein cơ, đồng thời cung cấp lactoferrin/immunoglobulin hỗ trợ hệ miễn dịch.
• Chất xơ Inulin: bổ sung chất xơ cho khẩu phần, hỗ trợ hệ tiêu hóa và góp phần tạo cảm giác no.
• Vitamin B6 (Pyridoxine) — đồng yếu tố trong chuyển hóa protein, lipid, carbohydrate; có vai trò hỗ trợ dẫn truyền thần kinh (serotonin, GABA).
• Vitamin B5/Axit Pantothenic — tham gia tổng hợp Coenzyme A, cần thiết cho chuyển hóa năng lượng từ thức ăn; được biết đến với vai trò hỗ trợ sức khỏe da đầu.
• Canxi và Phốt pho tự nhiên từ sữa: hỗ trợ mật độ xương.'
where name = 'LC – Hương Vani';

update sk_products set category='giam_mo', benefits =
'• Chiết xuất lá trà Mate (Ilex Paraguariensis, ~47,5%) — chứa caffeine tự nhiên, theobromine, chlorogenic acid và saponin: được biết đến với vai trò hỗ trợ sự tỉnh táo và năng lượng bền vững (không gây bồn chồn như caffeine đơn lẻ), hỗ trợ kích thích chuyển hóa lipid (sinh nhiệt/thermogenesis), hỗ trợ ổn định đường huyết và cải thiện độ nhạy insulin, đồng thời có vai trò chống oxy hóa (polyphenol).
• Củ Gừng (trong bản hương chanh gừng) — chứa gingerol, shogaol: được biết đến với vai trò hỗ trợ tiêu hóa (tăng nhu động dạ dày, giảm cảm giác đầy hơi/buồn nôn), hỗ trợ kích thích chuyển hóa (sinh nhiệt), hỗ trợ giảm đau/viêm và có đặc tính kháng khuẩn, chống oxy hóa.
• Chlorogenic acid trong chiết xuất trà Mate — hợp chất được nhiều nghiên cứu dinh dưỡng quan tâm về vai trò hỗ trợ chuyển hóa đường và chất béo.'
where name in ('Unimate Lemon Ginger Flavored Mate','Unimate Lemon Flavored Mate');

-- ============ NHÁNH TĂNG ĐỀ KHÁNG ============

update sk_products set category='tang_de_khang', benefits =
'• Phycocyanin (sắc tố đặc trưng của tảo Spirulina): được biết đến với vai trò kích thích tế bào miễn dịch, hỗ trợ tăng đề kháng.
• Beta-carotene và SOD (superoxide dismutase) nội sinh trong tảo: có vai trò chống oxy hóa, trung hòa gốc tự do, bảo vệ tế bào.
• Protein, phức hợp vitamin nhóm B và sắt: hỗ trợ tái tạo máu, tăng cường năng lượng, hỗ trợ giảm mệt mỏi.
• Glycolipid và polysaccharide: được nghiên cứu về vai trò hỗ trợ ổn định đường huyết (ức chế enzyme tiêu hóa tinh bột, hỗ trợ tăng nhạy insulin).
• Acid Gamma-Linolenic (GLA): có vai trò hỗ trợ điều hòa mỡ máu và hỗ trợ sức khỏe tim mạch.'
where name = 'ChloroSpirulina';

update sk_products set category='tang_de_khang', benefits =
'• Chiết xuất trái Nhàu (Noni) — giàu polysaccharide, vitamin C và các hợp chất chống oxy hóa: được biết đến với vai trò hỗ trợ tăng cường hệ miễn dịch, hỗ trợ tiêu hóa, hỗ trợ giảm mệt mỏi và cải thiện năng lượng.
• Chiết xuất Đu Đủ — chứa enzyme papain/chymopapain cùng vitamin C, beta-carotene, khoáng chất (kali, magie, canxi): có vai trò hỗ trợ tiêu hóa protein, chống oxy hóa, hỗ trợ hệ miễn dịch và được biết đến với vai trò hỗ trợ sức khỏe da (kích thích tổng hợp collagen/elastin).
• Chiết xuất Nha đam: hỗ trợ tiêu hóa/nhuận tràng nhẹ, có vai trò chống viêm và chống oxy hóa.'
where name = 'Hawaiian Noni';

update sk_products set category='tang_de_khang', benefits =
'• Colostrum/Sữa non (chứa 15% IgG, ~40% thành phần) — kháng thể tự nhiên: được biết đến với vai trò tăng cường miễn dịch, hỗ trợ bảo vệ đường ruột trước vi khuẩn/virus gây hại và hỗ trợ phục hồi cơ thể (chứa yếu tố tăng trưởng IGF-1, IGF-2).
• Arabinogalactan (~30%) — prebiotic tự nhiên chiết xuất từ cây Larch: có vai trò kích hoạt đại thực bào và tế bào NK, hỗ trợ tiêu hóa, và được nghiên cứu về khả năng hỗ trợ sức khỏe đường hô hấp.
• Beta 1,3/1,6 Glucan (~10%, chiết xuất từ tế bào nấm men Saccharomyces cerevisiae): được biết đến với vai trò kích hoạt mạnh đại thực bào, tế bào NK và bạch cầu trung tính, hỗ trợ điều hòa phản ứng viêm.
• Lactoferrin (glycoprotein liên kết sắt, ~1%): có đặc tính kháng khuẩn/kháng virus (cạnh tranh sắt với vi khuẩn), hỗ trợ cân bằng hệ vi khuẩn có lợi trong đường ruột và có vai trò chống oxy hóa bảo vệ tế bào.'
where name = 'Immunizen';

-- ============ NHÁNH LÀM ĐẸP DA / TRẺ HOÁ ============

update sk_products set category='lam_dep_da', benefits =
'• Canxi và Magie dạng Chelate Axit Amin (dễ hấp thu hơn dạng vô cơ thông thường): Canxi được biết đến với vai trò cấu tạo xương/răng và hỗ trợ chức năng thần kinh-cơ; Magie là đồng yếu tố của hơn 300 enzyme trong cơ thể, có vai trò hỗ trợ dẫn truyền thần kinh, điều hòa co cơ và hỗ trợ giấc ngủ.
• Vitamin D3: được biết đến với vai trò hỗ trợ hấp thu canxi-phốt pho tại ruột, góp phần hỗ trợ hệ miễn dịch và chức năng thần kinh-cơ.
• Boron (dạng Chelate Axit Amin): có vai trò hỗ trợ chuyển hóa xương, được nghiên cứu về khả năng hỗ trợ hoạt động não bộ/nhận thức và hỗ trợ cân bằng nội tiết tố.
• Mangan (dạng Chelate Axit Amin): là đồng yếu tố của enzyme SOD (chống oxy hóa) và enzyme tạo collagen, có vai trò hỗ trợ duy trì cấu trúc xương.'
where name = 'Hỗn hợp Canxi - Magiê';

update sk_products set category='lam_dep_da', benefits =
'• Curcuminoid (104mg, chiết xuất từ Nghệ — gồm Curcumin, Demethoxycurcumin, Bisdemethoxycurcumin): được biết đến với vai trò hỗ trợ kháng viêm và chống oxy hóa cho mô sụn khớp, cơ chế được nghiên cứu qua khả năng ức chế các con đường viêm (NF-κB, COX-2/LOX) và enzyme phá hủy sụn (MMPs).
• Nhũ hương/Boswellia Serrata — chứa acid boswellic: có vai trò được nghiên cứu trong hỗ trợ giảm viêm khớp (qua ức chế enzyme 5-lipoxygenase) và hỗ trợ cải thiện khả năng vận động khớp.
• Collagen Type II không biến tính (UC-II, 5mg): là acid amin cấu trúc chính của sụn khớp (glycine, proline, hydroxyproline), được biết đến với vai trò hỗ trợ duy trì cấu trúc và độ đàn hồi của sụn.
• Vitamin D3 (80-150IU): hỗ trợ hấp thu canxi-phốt pho cho xương chắc khỏe, góp phần hỗ trợ hệ miễn dịch.'
where name = 'Joint Mobility';

update sk_products set category='lam_dep_da', benefits =
'• Collagen cá (thủy phân, 23,6%) — nguồn acid amin glycine, proline, hydroxyproline: được biết đến với vai trò kích thích nguyên bào sợi (fibroblast) tăng sinh collagen/elastin nội sinh, hỗ trợ độ đàn hồi và độ ẩm của da.
• Acid Hyaluronic/Sodium Hyaluronate (3,7%) — glycosaminoglycan tự nhiên có trong mô liên kết: có khả năng giữ nước gấp nhiều lần trọng lượng, được biết đến với vai trò duy trì độ ẩm và độ căng mọng của da, đồng thời hỗ trợ bôi trơn khớp.
• Chiết xuất Việt quất đen (1,4%) — giàu anthocyanin: được biết đến với vai trò chống oxy hóa mạnh, hỗ trợ bảo vệ da khỏi tác động của tia UV và cải thiện vi tuần hoàn máu dưới da.
• Vitamin C (0,97%): có vai trò chống oxy hóa, là đồng yếu tố cần thiết cho quá trình tổng hợp collagen của cơ thể, và được biết đến với khả năng hỗ trợ làm sáng, đều màu da (ức chế enzyme tyrosinase).'
where name = 'Unicity Oasis';
