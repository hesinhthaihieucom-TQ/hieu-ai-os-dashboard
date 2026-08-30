-- Thư Viện Sức Khỏe — 11 mục lấy từ đúng phần kiến thức chung trong "Sổ Tay Chăm Sóc Sức Khoẻ Chủ
-- Động Chuyên Nghiệp" chị Quỳnh gửi (2026-08-30): bệnh mãn tính không lây, thiếu hụt vi chất (vitamin/
-- khoáng chất/chất chống oxy hoá/chất xơ), tích tụ độc tố, táo bón, rối loạn chuyển hoá (đường/lipid/
-- protein), suy giảm miễn dịch, lão hoá sớm. "Cách xử lý" chỉ nêu thay đổi lối sống + gợi ý nhóm dưỡng
-- chất theo đúng sổ tay — sản phẩm liên quan gắn qua related_product_ids (không nói sản phẩm "chữa"
-- vấn đề). Chạy sau khi đã có sk_products (seed_sk_products_v1/v2/v3).

insert into sk_library_entries (issue_name, causes, symptoms, remedies, related_product_ids) values

('Bệnh mãn tính không lây (NCDs)',
$c$Lối sống không lành mạnh: hút thuốc, uống rượu, ăn nhiều chất béo/đường/muối, ít ăn rau quả, ít vận động — gây béo phì, cao huyết áp, cao cholesterol, cao đường máu.
Môi trường ô nhiễm: không khí, nước, đất, tiếng ồn.
Dị ứng: phấn hoa, bụi, thức ăn, thuốc.
Di truyền: đột biến gen, tiền sử gia đình.
Tuổi tác: nguy cơ tăng rõ sau 60 tuổi.$c$,
$c$Đau (ngực, đầu, khớp, bụng), mệt mỏi, sốt, khó thở/suyễn, tăng huyết áp (đau đầu, chóng mặt), tăng đường máu (khát, đói, tiểu nhiều).
Theo WHO, nhóm bệnh không lây (tim mạch, xương khớp, ung thư, rối loạn chuyển hoá) gây khoảng 41 triệu ca tử vong/năm, chiếm 71% tổng số tử vong toàn cầu.$c$,
$c$- Thay đổi lối sống: bỏ thuốc, giảm rượu, ăn uống cân bằng, tăng rau quả, giảm chất béo/đường/muối, tập thể dục thường xuyên.
- Tránh môi trường ô nhiễm.
- Kiểm tra sức khỏe định kỳ: huyết áp, đường máu, cholesterol, cận lâm sàng, siêu âm — phát hiện sớm và điều trị kịp thời.
- Dùng thuốc/TPCN theo đúng hướng dẫn để hỗ trợ kiểm soát triệu chứng, ngăn biến chứng.$c$,
'{}'),

('Thiếu hụt Vitamin',
$c$Vitamin trong cây trồng/sản phẩm động vật ngày càng nghèo đi do phương pháp canh tác, chăn nuôi hiện đại.
Vitamin dễ bị phá hủy bởi ánh sáng, nhiệt độ, oxy, pH, hóa chất; vitamin tan trong nước dễ hao hụt khi chế biến, rửa, đun nấu.
Ăn ít thực vật tươi, dùng nhiều thực phẩm công nghiệp/chế biến sẵn/bảo quản lâu.
Lạm dụng kháng sinh làm rối loạn vi khuẩn đường ruột, hạn chế tổng hợp một số vitamin (như vitamin K).
Ngại ra nắng/mặc kín — nguy cơ thiếu vitamin D cao.$c$,
$c$Cơ thể không tự tổng hợp và dự trữ được vitamin (trừ số ít trường hợp) nên phải bổ sung qua ăn uống hằng ngày — biểu hiện thiếu hụt tùy loại vitamin, ảnh hưởng tới chuyển hóa, hệ miễn dịch và cấu trúc mô/cơ quan.$c$,
$c$- Ưu tiên đa dạng thực phẩm tươi, hạn chế đồ chế biến sẵn/bảo quản lâu.
- Tăng thời gian tiếp xúc ánh nắng hợp lý để hỗ trợ tổng hợp vitamin D.
- Cân nhắc bổ sung TPCN khi chế độ ăn không đáp ứng đủ nhu cầu vitamin, đặc biệt với nhóm đặc biệt (người cao tuổi, phụ nữ mang thai, người ăn kiêng hạn chế).$c$,
'{}'),

('Thiếu hụt Khoáng chất',
$c$Kỹ thuật canh tác hiện đại làm giảm khoáng chất trong đất/thực phẩm.
Sử dụng nhiều thực phẩm công nghiệp, chế biến, bảo quản lâu; quá trình chế biến làm hao hụt khoáng chất.
Chuỗi cung ứng thực phẩm kéo dài, sử dụng phụ gia thực phẩm gia tăng.
Một số nhóm dễ thiếu hụt hơn: phụ nữ mang thai/cho con bú/tiền mãn kinh-mãn kinh, người già, trẻ em.
Sử dụng thực phẩm, nước uống không hợp lý.$c$,
$c$Khoáng chất gồm nhóm vi lượng (Cu, Fe, Co, Zn, Mn, I ốt...) và nhóm đa lượng (Mg, P, Ca, Na, K, Cl...) — mỗi nhóm đảm nhiệm vai trò riêng trong cơ thể; thiếu hụt kéo dài ảnh hưởng đến nhiều chức năng khác nhau tùy loại khoáng chất.$c$,
$c$- Ưu tiên thực phẩm tươi, đa dạng nguồn động-thực vật, hạn chế thực phẩm chế biến sẵn.
- Nhóm nguy cơ cao (phụ nữ mang thai/cho con bú, người già, trẻ em) nên chú ý bổ sung đủ khoáng chất qua khẩu phần ăn hoặc TPCN khi cần.$c$,
array(select id from sk_products where name = 'Hỗn hợp Canxi - Magiê')),

('Thiếu hụt Chất chống oxy hóa',
$c$Khẩu phần ăn hằng ngày thiếu vitamin, khoáng chất, hoạt chất sinh học.
Thói quen dùng thực phẩm công nghiệp, chế biến sẵn, bảo quản lâu ngày.
Thói quen gọt bỏ vỏ khi ăn củ, quả — nơi tập trung nhiều chất chống oxy hóa.
Ăn ít rau - củ - quả tươi mỗi ngày.
Kỹ thuật canh tác làm giảm hàm lượng vitamin/khoáng chất/hoạt chất sinh học trong cây trồng.$c$,
$c$Chất chống oxy hóa có vai trò phân hủy/trung hòa gốc tự do. Sự chênh lệch giữa chất chống oxy hóa (AO) và gốc tự do (FR) quyết định tốc độ lão hóa: AO chiếm ưu thế → trẻ lâu, sống lâu, ít bệnh tật; FR chiếm ưu thế → già nhanh, dễ xuất hiện nhiều bệnh tật mạn tính.$c$,
$c$- Ăn nhiều rau - củ - quả tươi mỗi ngày, hạn chế gọt bỏ vỏ khi có thể ăn được.
- Giảm thực phẩm công nghiệp, chế biến sẵn, bảo quản lâu.
- Cân nhắc bổ sung thực phẩm/TPCN giàu chất chống oxy hóa khi khẩu phần ăn chưa đủ.$c$,
array(select id from sk_products where name in ('Bột Diệp Lục Super Chlorophyll Powder','ChloroSpirulina'))),

('Thiếu hụt Chất xơ',
$c$Chế độ ăn hằng ngày ít rau - củ - quả tươi.
Thói quen sử dụng thực phẩm công nghiệp, chế biến sẵn, ăn liền, bảo quản lâu ngày.
Thói quen gọt bỏ vỏ, xay, ép củ quả khi ăn — mất phần chất xơ trong vỏ/bã.$c$,
$c$Chất xơ hòa tan: tan trong nước, tạo lớp nhớt láng bề mặt ruột, giảm hấp thu đường/mỡ/cholesterol, làm khối phân dễ di chuyển hơn — chống táo bón. Có nhiều trong đậu, yến mạch, trái cây, rau xanh.
Chất xơ không hòa tan: không tan trong nước, làm chậm thủy phân tinh bột, làm chậm hấp thu đường vào máu, tăng nhu động ruột, tăng khối phân (giữ nước) chống táo bón, tăng đào thải mật giảm cholesterol. Có nhiều trong thân/vỏ rau quả, bột mì, cám gạo, ngũ cốc nguyên cám.$c$,
$c$- Tăng rau - củ - quả tươi, ăn cả vỏ khi có thể, hạn chế xay/ép mất bã.
- Giảm thực phẩm chế biến sẵn, ăn liền.
- Cân nhắc bổ sung chất xơ hòa tan/không hòa tan qua TPCN nếu khẩu phần ăn chưa đủ.$c$,
array(select id from sk_products where name in ('Chất xơ Lifiber','Bios Life C','Bios Life Slim'))),

('Tích tụ độc tố trong cơ thể',
$c$Ngoại độc tố (từ môi trường): khói xe, độc tố sinh ra khi nấu nướng, dư lượng thuốc bảo vệ thực vật, chất bảo quản/tạo màu/chống ẩm trong thực phẩm, nấm mốc, kim loại nặng (asen, thủy ngân), chì trong mỹ phẩm, vi nhựa, hại khuẩn trong thức ăn không đảm bảo vệ sinh, nguồn nước/không khí ô nhiễm.
Nội độc tố (do cơ thể sinh ra): gốc tự do từ quá trình chuyển hóa, độc tố do vi khuẩn đường ruột phân hủy thức ăn, độc tố/chất thải từ vi khuẩn-virus-ký sinh trùng.
Độc tố xâm nhập qua hô hấp, da, ăn uống, niêm mạc — tích tụ nhiều nhất ở tế bào/mô mỡ (lý do người béo phì dễ mắc bệnh mạn tính hơn), lưu cữu ở máu, ruột (có thể >10kg chất dư thừa/cặn bám thành ruột ở người trưởng thành), ký sinh trùng, hại khuẩn xâm lấn (khi tỉ lệ lợi khuẩn/hại khuẩn trong 100 nghìn tỷ vi khuẩn đường ruột bị lệch) và gan (gan lọc toàn bộ máu cơ thể mỗi 2 phút).$c$,
$c$Táo bón dù không bị bệnh đường ruột, hơi thở hôi; đau cơ; rụng tóc; móng tay chân giòn/xỉn màu/dễ gãy; mất ngủ; da xấu/sạm/khô/mụn nhọt; mệt mỏi dù ngủ đủ giờ, chất lượng giấc ngủ kém; tăng cân bất thường; đau đầu không rõ nguyên nhân; thay đổi tâm trạng liên tục.
Về lâu dài có thể liên quan tới: viêm mạn tính (gan, da, ruột), suy giảm chức năng gan/thận, tăng nguy cơ tiểu đường/béo phì, lão hóa sớm, hệ miễn dịch yếu đi.$c$,
$c$- Uống đủ nước, ăn nhiều rau củ/chất xơ, tập luyện đều đặn, hạn chế đồ ăn nhanh/rượu bia/chất kích thích, ngủ đủ giấc và giảm stress — cơ thể có cơ chế đào thải tự nhiên, lối sống lành mạnh giúp giảm gánh nặng độc tố.
- Chỉ nên thải độc/thanh lọc khi đủ sức khỏe cơ bản, tinh thần ổn định, KHÔNG tập thể dục quá sức trong lúc thải độc. KHÔNG áp dụng cho phụ nữ mang thai/cho con bú, trẻ em, người lớn tuổi, người đang điều trị bệnh theo phác đồ y tế.
- Lợi ích khi thanh lọc đúng cách: hỗ trợ kiểm soát cân nặng, tăng năng lượng, giúp cơ quan nội tạng có thời gian nghỉ ngơi, hỗ trợ hệ miễn dịch, cải thiện làn da, cải thiện tinh thần.
- Lưu ý: có thể gặp mất nước, thiếu hụt dưỡng chất tạm thời khi thải độc — cần theo dõi cơ thể.$c$,
array(select id from sk_products where name in ('Aloe Vera','Paraway Plus','Bột Diệp Lục Super Chlorophyll Powder','Red Clover Plus'))),

('Táo bón',
$c$Táo bón chức năng: chậm vận chuyển (nhu động đại tràng giảm, phân lưu lại lâu), tắc nghẽn ống hậu môn-trực tràng (rối loạn phối hợp cơ sàn chậu), hoặc hỗn hợp cả hai.
Táo bón thứ phát: do bệnh lý toàn thân (suy giáp, đái tháo đường, suy thận), do thuốc (opioid, kháng cholinergic, sắt, canxi), do tổn thương thần kinh (Parkinson, đột quỵ, tủy sống).
Táo bón cấp tính: tắc ruột (xoắn ruột, thoát vị, dính ruột, nút phân), liệt ruột, viêm phúc mạc, chấn thương sọ não/cột sống, nằm lâu ngày, hoặc mới bắt đầu dùng một số thuốc.
Táo bón mạn tính: u đại tràng, rối loạn chuyển hóa (đái tháo đường, suy giáp, rối loạn canxi máu, mang thai), rối loạn thần kinh trung ương/ngoại biên, rối loạn hệ thống, yếu tố dinh dưỡng (ăn ít chất xơ, lạm dụng thuốc nhuận tràng), rối loạn hậu môn-trực tràng chức năng.
Nguyên nhân thường gặp: chế độ ăn thiếu chất xơ, uống ít nước, ít vận động, rối loạn thần kinh/cơ sàn chậu ruột.$c$,
$c$Đi đại tiện ít hơn 3 lần/tuần; phân cứng, khó đẩy ra ngoài; phân đường kính lớn; đau khi đi đại tiện; đau bụng; có thể thấy máu trên bề mặt phân cứng.$c$,
$c$- Tăng chất xơ (hòa tan và không hòa tan) trong khẩu phần ăn, uống đủ nước.
- Tăng vận động thể chất để kích thích nhu động ruột.
- Nếu táo bón kéo dài, có máu trong phân, đau bụng nhiều hoặc nghi ngờ liên quan bệnh lý nền/thuốc đang dùng — nên đi khám để xác định nguyên nhân, không tự ý dùng thuốc nhuận tràng kéo dài.$c$,
array(select id from sk_products where name in ('Aloe Vera','Chất xơ Lifiber','Bios Life Mannos'))),

('Rối loạn chuyển hóa đường huyết (kháng Insulin, tiền tiểu đường, Đái tháo đường)',
$c$Đái tháo đường type 1: tự miễn, tuyến tụy không tiết insulin. Type 2: kháng insulin, liên quan béo phì và lối sống. Thai kỳ (GDM): xuất hiện trong thai kỳ.
Cơ chế kháng insulin: ăn vặt/đồ ngọt/tinh bột liên tục giữa các bữa khiến insulin luôn ở mức cao, mất dần độ linh hoạt → cơ thể rơi vào trạng thái chỉ tích mỡ, khó huy động mỡ dự trữ để đốt năng lượng.
Yếu tố nguy cơ: chủng tộc, tuổi tác (tăng sau 45), hút thuốc, béo phì (đặc biệt mỡ bụng), lối sống tĩnh tại, chế độ ăn nhiều carbohydrate, gan nhiễm mỡ không do rượu, buồng trứng đa nang, tiểu đường thai kỳ, tiền sử gia đình, rối loạn nội tiết, một số thuốc (steroid, chống loạn thần), nhiễm trùng kéo dài, ngưng thở khi ngủ.$c$,
$c$Tình trạng "tiền tiểu đường": đường huyết tăng nhưng chưa đủ mức chẩn đoán tiểu đường — vẫn có thể gây hại, làm tăng triglyceride máu, ảnh hưởng thận, tăng huyết áp.
Biến chứng cấp tính: hôn mê nhiễm toan ceton, hôn mê tăng glucose máu, hạ glucose máu, nhiễm trùng cấp.
Biến chứng mạn tính: bệnh mạch vành, tai biến mạch máu não, bệnh mạch máu ngoại biên, bệnh võng mạc, bệnh thận, bệnh thần kinh, loét bàn chân/cẳng chân, biến chứng da/xương khớp/nhiễm khuẩn.$c$,
$c$- Tăng cường vận động thể lực (kết hợp dinh dưỡng khoa học giúp giảm HbA1c hiệu quả) — lưu ý không tập khi glucose huyết >14,0mmol/L hoặc <5,5mmol/L và khi đói/mệt.
- Chế độ ăn: giảm calo, hạn chế đồ ngọt/thức ăn nhanh/nhiều dầu mỡ/nội tạng động vật, tăng rau và trái cây.
- Kiểm soát cân nặng, giảm mỡ thừa từng bước, không giảm đột ngột.
- Theo dõi đường huyết tại nhà theo hướng dẫn bác sĩ, dùng thuốc đúng chỉ định.
- Phòng ngừa: duy trì cân nặng hợp lý, ăn uống lành mạnh, vận động ≥150 phút/tuần, tầm soát đường huyết định kỳ (đặc biệt nhóm nguy cơ cao), ngủ đủ 7-8 giờ/đêm, không hút thuốc, hạn chế rượu bia.$c$,
array(select id from sk_products where name in ('Bios Life C','Bios Life Slim','Unimate Lemon Ginger Flavored Mate','ChloroSpirulina'))),

('Rối loạn chuyển hóa Lipid (mỡ máu)',
$c$Nguyên phát (di truyền): tăng cholesterol máu gia đình, tăng triglyceride máu di truyền.
Thứ phát: chế độ ăn dư năng lượng/nhiều chất béo bão hòa, béo phì, ít vận động; bệnh lý nền (tiểu đường, suy giáp, hội chứng thận hư, bệnh gan); tác dụng phụ của thuốc (corticoid, thuốc ngừa thai, thuốc lợi tiểu).
Cơ chế: mất cân bằng giữa tổng hợp, vận chuyển và thoái giáng lipid — LDL-C tăng lắng đọng thành mạch gây xơ vữa động mạch; HDL-C giảm làm giảm khả năng loại bỏ cholesterol; triglyceride tăng làm tăng nguy cơ viêm tụy cấp.$c$,
$c$Tình trạng bất thường nồng độ mỡ trong máu: cholesterol toàn phần >200mg/dL, tăng LDL-C ("xấu"), giảm HDL-C ("tốt"), tăng triglyceride. Thường KHÔNG có triệu chứng lâm sàng rõ ràng — chỉ phát hiện qua xét nghiệm máu.$c$,
$c$- Ăn ít chất béo bão hòa, tránh đồ chiên rán/nội tạng động vật; tăng rau xanh, trái cây, ngũ cốc nguyên hạt.
- Tập thể dục 150 phút/tuần, giảm cân nếu thừa cân, ngủ đủ giấc, tránh stress.
- Xét nghiệm lipid máu định kỳ 6-12 tháng/lần (nhất là khi có yếu tố nguy cơ), điều trị theo chỉ định bác sĩ khi cần, kiểm soát bệnh đi kèm (đái tháo đường, cao huyết áp).$c$,
array(select id from sk_products where name in ('Bios Life C','Omega Life-3 Resolv','Red Clover Plus'))),

('Suy giảm hệ miễn dịch',
$c$Thiếu hụt vi chất dinh dưỡng thiết yếu cho miễn dịch: vitamin A/C/D/E, kẽm, sắt, selen, omega-3, acid amin đặc biệt (glutamine, arginine), probiotic/prebiotic, chất chống oxy hóa (polyphenol, flavonoid).
Thiếu vitamin D đặc biệt ảnh hưởng: giảm sản xuất peptide kháng khuẩn, suy giảm chức năng miễn dịch, tăng phản ứng viêm — qua đó làm tăng nguy cơ nhiễm khuẩn đường hô hấp.$c$,
$c$Dễ ốm vặt, vết thương lâu lành, sức chống chịu kém với các yếu tố gây bệnh; ở mức độ sinh học: giảm sản xuất peptide kháng khuẩn (cathelicidin, defensin), suy giảm chức năng đại thực bào/bạch cầu, phản ứng viêm không được kiểm soát tốt, suy yếu hàng rào biểu mô hô hấp.$c$,
$c$- Đảm bảo đủ vi chất then chốt cho miễn dịch qua chế độ ăn đa dạng: Vitamin C (chống oxy hóa, tăng đại thực bào), Vitamin D (điều hòa miễn dịch, chống viêm), Vitamin A (duy trì niêm mạc), Kẽm & Sắt (hỗ trợ tế bào miễn dịch), Selen (chống oxy hóa, chống viêm), Omega-3/DHA-EPA (điều hòa phản ứng viêm), Acid amin Arginine/Glutamine (hỗ trợ tái tạo tế bào miễn dịch).
- Tăng thời gian ra nắng hợp lý để hỗ trợ tổng hợp vitamin D tự nhiên.
- Cân nhắc bổ sung TPCN hỗ trợ đề kháng khi chế độ ăn chưa đáp ứng đủ.$c$,
array(select id from sk_products where name in ('Immunizen','ChloroSpirulina','Hawaiian Noni'))),

('Lão hóa sớm',
$c$Nội sinh (bên trong): di truyền quy định tốc độ lão hóa đặc thù; mất cân bằng nội tiết (hormone sinh dục, hormone giảm stress); quá trình oxy hóa sinh gốc tự do phá hủy protein/DNA/màng tế bào; rút ngắn telomere (giới hạn số lần tế bào phân chia).
Ngoại sinh (môi trường): tia UV, ánh sáng xanh (phá hủy da, DNA); ô nhiễm không khí, hóa chất, khói thuốc; thiếu dinh dưỡng/chất chống oxy hóa (vitamin C, E...); căng thẳng, stress mãn tính; thiếu vận động, mất ngủ, sống thiếu điều độ.
Cơ chế lão hóa: rút ngắn telomere → tế bào ngừng phân chia; tổn thương DNA và sai sót sao chép gen; rối loạn chức năng ty thể (nhà máy năng lượng tế bào) sinh nhiều gốc tự do hơn; tích tụ protein lỗi/chất thải trong tế bào ("rác tế bào", liên quan bệnh Alzheimer); mất cân bằng nội tiết (hormone tăng trưởng, estrogen/testosterone, insulin-like growth factor giảm dần); lão hóa hệ miễn dịch (viêm mạn tính âm ỉ, "inflamm-aging").$c$,
$c$Suy giảm chức năng cơ thể: tim mạch (thành mạch máu mất đàn hồi, nguy cơ cao huyết áp/xơ vữa động mạch/nhồi máu cơ tim), hô hấp (dung tích phổi giảm, khó thở khi gắng sức), tiêu hóa (giảm tiết enzyme, nhu động ruột chậm lại → táo bón, kém hấp thu), cơ xương khớp (loãng xương, thoái hóa khớp, yếu cơ → dễ té ngã/gãy xương), thần kinh (giảm trí nhớ, tăng nguy cơ sa sút trí tuệ).
Suy giảm hệ miễn dịch: dễ mắc bệnh nhiễm khuẩn, thời gian hồi phục kéo dài, dễ mắc bệnh mạn tính (tiểu đường, ung thư, bệnh tim).
Suy giảm giác quan: thị giác mờ đục thủy tinh thể/thoái hóa điểm vàng, thính giác giảm, khứu giác/vị giác giảm.
Thay đổi tâm lý-tinh thần: dễ lo âu/cô đơn, mất ý nghĩa sống, rối loạn giấc ngủ.
Thay đổi ngoại hình: da nhăn, khô, mất độ đàn hồi; tóc bạc, rụng nhiều.$c$,
$c$- Dinh dưỡng hợp lý: ăn nhiều rau xanh, trái cây tươi, cá béo, ngũ cốc nguyên hạt; hạn chế đường, chất béo bão hòa, thực phẩm chế biến sẵn; bổ sung thực phẩm giàu chất chống oxy hóa (vitamin C, E, polyphenol).
- Vận động thể chất thường xuyên: ít nhất 30 phút mỗi ngày (đi bộ, bơi lội, yoga, khí công) — cải thiện tuần hoàn máu, tăng cơ, giảm tốc độ lão hóa tế bào.
- Duy trì tâm lý tích cực: giữ tinh thần lạc quan, giao tiếp xã hội, sống yêu thương, giảm stress qua thiền/âm nhạc/viết nhật ký.
- Khám sức khỏe định kỳ: phát hiện sớm bệnh mạn tính (cao huyết áp, tiểu đường, loãng xương), tiêm phòng đầy đủ.
- Ngủ đủ giấc, tránh chất kích thích: ngủ đủ 7-8 tiếng/đêm, hạn chế rượu, thuốc lá, cà phê quá mức.
- Lão hóa là quá trình không thể tránh khỏi, nhưng hoàn toàn có thể làm chậm lại quá trình này nếu duy trì lối sống lành mạnh.$c$,
array(select id from sk_products where name in ('Unicity Oasis','Joint Mobility','Hỗn hợp Canxi - Magiê')));
