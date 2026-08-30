-- Nội dung chi tiết đầy đủ (detail_sections) cho 15 sản phẩm có trong "Sổ Tay Chăm Sóc Sức Khoẻ Chủ
-- Động Chuyên Nghiệp" — chị Quỳnh phản hồi 2026-08-30: bản trước quá sơ sài, cần lấy SÁT nội dung gốc
-- trong file (thành phần, công dụng từng hoạt chất, cơ chế tác động, đối tượng/cách dùng, nghiên cứu,
-- lưu ý), bố cục theo từng mục để hiện trong "Xem thêm" ở san-pham.js thay vì 1 đoạn text dài.
-- Cần chạy schema_full.sql (cột sk_products.detail_sections) trước.
--
-- "Công dụng (theo nhãn đăng ký)" ở mỗi sản phẩm là dòng "Công dụng:" in trên nhãn/hồ sơ công bố
-- chính thức của sản phẩm đó (Cục ATTP đã duyệt) — trích nguyên văn nên an toàn để hiện, KHÁC với việc
-- tự ý gán công dụng — các mục còn lại vẫn theo nguyên tắc "thành phần X có vai trò..." như đã thống
-- nhất.

update sk_products set detail_sections = jsonb_build_array(
  jsonb_build_object('title','Công dụng (theo nhãn đăng ký)','body',$b$Hỗ trợ nhuận tràng, hỗ trợ giảm táo bón.$b$),
  jsonb_build_object('title','Thành phần','body',$b$Mỗi viên nang cứng (639mg) chứa:
- Bột chiết xuất Lá Lô hội Aloe Ferox Mill (chiết xuất từ 36g lá tươi): 525mg
- Phụ liệu vừa đủ 1 viên: Chất chống đông vón Silicon Dioxide: 105mg
- Thành phần vỏ nang$b$),
  jsonb_build_object('title','Công dụng của thành phần Aloe Ferox Mill','body',$b$Hệ tiêu hoá — tác dụng nhuận tràng:
Nhờ chứa hàm lượng cao anthraquinone glycosides (aloin A, barbaloin, emodin), Aloe ferox được biết đến với vai trò kích thích ruột, tăng nhu động ruột, giúp giảm táo bón và hỗ trợ thải độc đường ruột. Tác dụng mạnh hơn Aloe vera thông thường nên chỉ dùng liều nhỏ, không dùng kéo dài.

Chống oxy hóa và chống viêm:
Chứa nhiều polyphenol, flavonoid và chất chống oxy hóa tự nhiên — có vai trò bảo vệ tế bào khỏi tổn thương gốc tự do, hỗ trợ giảm viêm nhẹ đến trung bình.

Kháng khuẩn và kháng nấm:
Các hợp chất anthraquinone có khả năng được nghiên cứu về việc ức chế sự phát triển của một số vi khuẩn (Staphylococcus aureus, E. coli) và nấm gây bệnh ngoài da (Candida albicans).

Hỗ trợ da:
Tuy không phổ biến như Aloe vera trong mỹ phẩm, Aloe ferox vẫn được dùng để làm dịu vết côn trùng cắn, dị ứng, mẩn ngứa và hỗ trợ tái tạo da tổn thương nhẹ. Một số sản phẩm làm đẹp của Nam Phi có dùng gel Aloe ferox làm thành phần dưỡng da.$b$),
  jsonb_build_object('title','Cơ chế tác động','body',$b$- Nhuận tràng: Anthraquinone glycosides khi vào đại tràng bị vi khuẩn chuyển hóa thành dạng aglycone, có tác dụng kích thích tiết dịch và nhu động ruột.
- Chống viêm — giảm đau: Emodin, aloenin ức chế cyclo-oxygenase, giảm tổng hợp prostaglandin.
- Kháng khuẩn, kháng nấm: Anthraquinone và các hợp chất phenolic ức chế nhiều chủng Staphylococcus, E.coli, Candida.
- Hỗ trợ liền vết thương: Polysaccharide (acemannan) kích thích đại thực bào, tăng sinh nguyên bào sợi, tổng hợp collagen.
- Miễn dịch: Acemannan kích thích tiết cytokine (IL-1, TNF-α), hoạt hóa đại thực bào.$b$),
  jsonb_build_object('title','Đối tượng sử dụng & Cách dùng','body',$b$Đối tượng: Người trưởng thành, người trưởng thành có tình trạng táo bón.
Cách dùng: 1 viên/ngày. Dùng liên tục không quá 30 ngày.$b$),
  jsonb_build_object('title','Nghiên cứu khoa học tham khảo','body',$b$- Nghiên cứu trên chuột Wistar: chiết xuất Aloe ferox cải thiện đáng kể vận động ruột, tăng khối lượng phân, phục hồi trọng lượng cơ thể ở chuột bị táo bón (nguồn: BMC Gastroenterology).
- Nghiên cứu tại Brazil (2010, 2023): Aloe ferox có hoạt tính nhuận tràng rõ rệt và không gây độc tính cấp ở liều thử nghiệm (Revista Brasileira de Farmacognosia).
- Nghiên cứu lâm sàng ngẫu nhiên, mù ba, đối chứng giả dược (công bố 2024, ScienceDirect): chế phẩm chứa Aloe cải thiện đáng kể mức độ nghiêm trọng của táo bón và độ nhất quán phân so với nhóm giả dược, không ghi nhận tác dụng phụ nghiêm trọng.$b$),
  jsonb_build_object('title','Lưu ý','body',$b$Thực phẩm này không phải là thuốc, không có tác dụng thay thế thuốc chữa bệnh. Không dùng cho đối tượng mẫn cảm với bất cứ thành phần nào của sản phẩm. Ngưng sử dụng khi có dấu hiệu mẫn cảm/dị ứng.
Không sử dụng trong các trường hợp: đang tiêu chảy/phân lỏng/đau bụng, co thắt bất thường đường tiêu hoá, tắc nghẽn ruột tiềm ẩn/hiện tại, ruột mất trương lực, viêm ruột thừa, viêm đại tràng (Crohn, viêm loét đại tràng), đau bụng không rõ nguyên nhân, chảy máu đại tràng chưa chẩn đoán, mất nước nghiêm trọng, trĩ hoặc tiêu chảy.
Người đang dùng thuốc hoặc điều trị y tế cần hỏi ý kiến chuyên gia y tế trước khi dùng. Không dùng cho phụ nữ mang thai và cho con bú. Không dùng quá 30 ngày liên tục.$b$)
) where name = 'Aloe Vera';

update sk_products set detail_sections = jsonb_build_array(
  jsonb_build_object('title','Công dụng (theo nhãn đăng ký)','body',$b$Hỗ trợ chống oxy hoá, nâng cao sức khỏe.$b$),
  jsonb_build_object('title','Thành phần','body',$b$Thành phần chính: Chất Diệp Lục 33mg/2g (chỉ tiêu chất lượng: Sodium Copper Chlorophyll ≥ 26,4mg/2g), chiết xuất từ cỏ Linh Lăng (Alfalfa).
Thành phần khác: Đường Maltodextrin.
Quy cách: Hộp 92g (-4,9%; +7,5%). Xuất xứ: Best Formulations, Hoa Kỳ — nhập khẩu & phân phối bởi Công ty TNHH Unicity Marketing Việt Nam.$b$),
  jsonb_build_object('title','Công dụng của thành phần','body',$b$Sodium Copper Chlorophyll (dẫn xuất bán tổng hợp của diệp lục tự nhiên):
- Chất tạo màu tự nhiên, bền màu hơn diệp lục tự nhiên khi tiếp xúc ánh sáng, nhiệt độ, môi trường acid.
- Chống oxy hóa: giúp giảm quá trình oxy hóa lipid.
- Bảo vệ chất dinh dưỡng nhạy cảm với oxy như vitamin C.
- Một số nghiên cứu cho thấy tiềm năng hỗ trợ thải độc cơ thể, hỗ trợ chức năng gan và tăng cường hệ miễn dịch.

Cỏ Linh Lăng (Alfalfa) — nguồn gốc của chất diệp lục trong sản phẩm:
Chứa nhiều vitamin (A, B, D, E) và khoáng chất (canxi, sắt, magie, phospho, kali...), đặc biệt giàu Silic và Mangan. Theo khảo sát của Bộ Nông nghiệp Hoa Kỳ, cỏ linh lăng chứa lượng protein cao gấp 1,5 lần lúa mì và ngô, gồm các acid amin quan trọng như arginine, lysine, threonine, tryptophan; đồng thời giàu chất xơ, beta-carotene và các sắc tố hỗ trợ tiêu hóa.$b$),
  jsonb_build_object('title','Nghiên cứu khoa học tham khảo','body',$b$- Chlorophyllin làm giảm marker DNA-aflatoxin adduct (bảo vệ gan) trên nhóm nguy cơ ung thư gan cao — công bố trên PNAS (2001, ĐH Johns Hopkins & Trung tâm Ung thư Fred Hutchinson).
- Chlorophyllin và các sản phẩm chuyển hoá có khả năng quét gốc tự do, hỗ trợ điều hoà miễn dịch (nghiên cứu Purdue University, 2015, tạp chí Food & Function).
- Chlorophyllin kích thích đại thực bào, tăng tiết cytokine (IL-2, IFN-γ), qua đó hỗ trợ tăng cường chức năng miễn dịch tự nhiên của cơ thể.
- Một số nghiên cứu ghi nhận Sodium Copper Chlorophyllin có khả năng ức chế mutagenesis và stress oxy hoá gây tổn thương tế bào.$b$),
  jsonb_build_object('title','Đối tượng sử dụng & Cách dùng','body',$b$Đối tượng: Người trưởng thành.
Cách dùng: 1 lần/ngày, mỗi lần 1 thìa cà phê pha trong 800ml-1 lít nước; trường hợp cần giải độc có thể pha đậm đặc hơn.$b$)
) where name = 'Bột Diệp Lục Super Chlorophyll Powder';

update sk_products set detail_sections = jsonb_build_array(
  jsonb_build_object('title','Công dụng (theo nhãn đăng ký)','body',$b$Bổ sung chất xơ, hỗ trợ chống táo bón.$b$),
  jsonb_build_object('title','Thành phần','body',$b$Trong 9,6g: Bột vỏ hạt Mã đề (Psyllium husk, 52,08%), Chất xơ Inulin/FOS (26,04%), Pectin từ Táo (4,17%), Bột quả Nhàu (3,13%), Bột Siro mật phong/Maple Syrup (3,13%), Citrus Pectin (2,08%), Bột hoa Dâm bụt (2,08%), Vỏ Quế (0,73%), Bột rễ Cam thảo (0,52%), hỗn hợp chất xơ thảo mộc — Lô Hội, Bột Cỏ Đại mạch, Bột Tỏi, Bột Củ Gừng, Quả Đu Đủ, Hạt Bí Ngô, Quả Mâm Xôi Đỏ, Bột Ớt (0,73%).
Thành phần khác: Hương dâu tây tự nhiên, Maltodextrin, Silic Điôxít (chống đông vón), Sucralose, Hương bạc hà.$b$),
  jsonb_build_object('title','Công dụng của từng thành phần chính','body',$b$Bột vỏ hạt Mã đề (Psyllium Husk):
- Tăng cường chất xơ tự nhiên; hỗ trợ nhu động ruột, làm mềm phân.
- Hỗ trợ tiêu hóa và phòng ngừa táo bón: hấp thu nước, tạo gel trong ruột.
- Hỗ trợ kiểm soát đường huyết: làm chậm hấp thu glucose sau ăn.
- Hỗ trợ giảm cholesterol máu: gắn kết cholesterol, hỗ trợ đào thải.
- Hỗ trợ giảm cân: tạo cảm giác no, giảm lượng thức ăn nạp vào.

Chất xơ Inulin/FOS:
- Tăng cường hệ vi sinh vật đường ruột: nuôi dưỡng lợi khuẩn, cân bằng hệ vi sinh.
- Hỗ trợ tiêu hóa: giúp nhu động ruột hoạt động trơn tru, ngừa táo bón.
- Hỗ trợ kiểm soát đường huyết: làm chậm hấp thu glucose.
- Tăng cường hấp thu khoáng chất: hỗ trợ hấp thu canxi, magie.
- Hỗ trợ giảm cân: tạo cảm giác no lâu.

Pectin từ Táo:
- Hỗ trợ tiêu hóa: làm mềm phân.
- Giảm cholesterol máu: gắn kết acid mật, hỗ trợ kiểm soát lipid.
- Điều hòa đường huyết: làm chậm hấp thu glucose.
- Tăng cường hệ miễn dịch: cung cấp môi trường cho lợi khuẩn phát triển.

Bột quả Nhàu:
- Chống oxy hóa: bảo vệ tế bào khỏi tác hại gốc tự do.
- Hỗ trợ tiêu hóa: thúc đẩy nhu động ruột, hỗ trợ cải thiện táo bón.
- Tăng cường miễn dịch: kích thích sản xuất tế bào miễn dịch.
- Kháng viêm: hỗ trợ giảm viêm đường ruột.

Bột Siro mật phong (Maple Syrup):
- Cung cấp năng lượng tự nhiên: hàm lượng đường tự nhiên cao.
- Chống oxy hóa: chứa polyphenol bảo vệ tế bào khỏi tổn thương do gốc tự do.
- Hỗ trợ tiêu hóa: các khoáng chất như mangan, kẽm hỗ trợ hệ tiêu hóa hoạt động hiệu quả.
- Tăng cường miễn dịch: nhờ các vi khoáng chất có sẵn trong siro.

Citrus Pectin — chiết xuất từ vỏ trái cây họ cam quýt, giàu polysaccharide tự nhiên:
- Hỗ trợ tiêu hóa: tăng cường nhu động ruột, giúp phòng ngừa táo bón.
- Giảm cholesterol xấu (LDL).
- Ổn định đường huyết: làm chậm quá trình hấp thu đường sau ăn, hỗ trợ kiểm soát đường huyết.
- Chống oxy hóa: cung cấp chất chống oxy hóa tự nhiên, bảo vệ tế bào.

Bột hoa Dâm bụt (Hibiscus sabdariffa):
- Tạo màu tự nhiên: màu đỏ tím nhờ anthocyanin.
- Tạo hương vị đặc trưng: vị chua thanh tự nhiên.
- Giá trị dinh dưỡng: giàu vitamin C, chất chống oxy hóa — hỗ trợ đề kháng, giảm oxy hóa.
- Hỗ trợ chức năng: hỗ trợ giảm huyết áp, hỗ trợ cholesterol, tốt cho sức khỏe tim mạch.
- Kháng khuẩn nhẹ: giúp kéo dài thời gian bảo quản thực phẩm.

Vỏ Quế trong thực phẩm:
- Tạo hương vị đặc trưng, thơm ấm, vị cay nhẹ.
- Chất bảo quản tự nhiên: chứa cinnamaldehyde và eugenol có khả năng kháng khuẩn/kháng nấm nhẹ.
- Tạo màu tự nhiên: vỏ quế xay mịn có màu nâu vàng nhạt.
- Giá trị dinh dưỡng & sức khỏe: giàu chất chống oxy hóa (polyphenol), hỗ trợ ổn định đường huyết, giảm viêm, hỗ trợ tuần hoàn máu.

Bột rễ Cam Thảo trong thực phẩm:
- Tạo vị ngọt tự nhiên: chứa glycyrrhizin, chất tạo vị ngọt mạnh gấp 30-50 lần đường sucrose.
- Tạo hương vị đặc trưng: hương ngọt dịu pha thảo mộc nhẹ.
- Giá trị sức khỏe: chứa flavonoid, glycyrrhizin, hỗ trợ giảm viêm, làm dịu họng, hỗ trợ hệ tiêu hóa.
- Bảo quản thực phẩm: có tính kháng khuẩn nhẹ.

Hỗn hợp chất xơ thảo mộc (8 loại):
- Lô Hội (Aloe vera): hỗ trợ tiêu hóa, làm dịu đường ruột, cung cấp chất xơ hòa tan, hỗ trợ thanh lọc cơ thể.
- Bột Cỏ Đại mạch (Barley Grass): giàu chất xơ, hỗ trợ giảm cholesterol, kiểm soát đường huyết.
- Bột Tỏi: tăng cường miễn dịch, giảm viêm, hỗ trợ tiêu hóa, hỗ trợ kháng khuẩn tự nhiên.
- Bột Củ Gừng: giảm buồn nôn, chống viêm, hỗ trợ tiêu hóa và tuần hoàn máu.
- Quả Đu Đủ: giàu enzyme papain, hỗ trợ phân giải protein, giúp tiêu hóa tốt.
- Hạt Bí Ngô: giàu chất xơ, kẽm và magie, hỗ trợ tiêu hóa, tăng cường miễn dịch, tốt cho tim mạch.
- Quả Mâm Xôi Đỏ: giàu chất chống oxy hóa, hỗ trợ tiêu hóa, bảo vệ tế bào.
- Bột Ớt: tăng cường trao đổi chất, kích thích tiêu hóa, hỗ trợ tuần hoàn máu.$b$),
  jsonb_build_object('title','Cơ chế tác động của chất xơ với người ăn kiêng','body',$b$1. Làm chậm quá trình hấp thu đường và chất béo: chất xơ hòa tan tạo thành gel trong dạ dày, làm chậm quá trình rỗng dạ dày và hấp thu glucose → hỗ trợ ổn định đường huyết, giảm tích tụ mỡ.
2. Tạo cảm giác no lâu: khi vào dạ dày, chất xơ nở ra chiếm thể tích lớn → giúp giảm lượng thức ăn nạp vào, hỗ trợ kiểm soát khẩu phần.
3. Giảm hấp thu cholesterol: chất xơ hòa tan (như beta-glucan, pectin) liên kết với cholesterol và acid mật trong ruột, ngăn chúng tái hấp thu, góp phần hỗ trợ giảm cholesterol máu và hỗ trợ tim mạch.
4. Hỗ trợ hệ vi sinh đường ruột: là "thức ăn" cho lợi khuẩn (prebiotic), giúp cân bằng hệ vi sinh, tăng miễn dịch, giảm viêm trong cơ thể.
5. Cải thiện nhu động ruột và phòng táo bón: chất xơ không hòa tan (như cellulose) làm tăng khối lượng phân, giúp đi tiêu đều đặn, hỗ trợ đào thải độc tố.
6. Giảm chỉ số đường huyết sau ăn (GI): bằng cách làm chậm hấp thu carbohydrate, chất xơ giúp giảm sự tăng đường huyết sau bữa ăn.$b$),
  jsonb_build_object('title','Đối tượng sử dụng & Cách dùng','body',$b$Đối tượng: Người trưởng thành.
Cách dùng: Ngày dùng 1 lần, mỗi lần 1 muỗng (9,6g) với 240-300ml nước, khuấy đều và uống ngay sau khi pha (nên dùng bình lắc để dễ hòa tan). Uống nhanh, không để lâu vì hỗn hợp sẽ tạo thành dạng gel sánh lại; pha không đủ nước có thể gây nghẹn, khó uống.$b$),
  jsonb_build_object('title','Nghiên cứu khoa học tham khảo','body',$b$- Bổ sung chất xơ, đặc biệt là psyllium (vỏ hạt mã đề), với liều lượng >10g/ngày trong ít nhất 4 tuần cho hiệu quả rõ rệt trong việc cải thiện tần suất đại tiện và giảm táo bón mãn tính (PubMed, tổng hợp phân tích nghiên cứu ngẫu nhiên có đối chứng).
- Sử dụng bổ sung chất xơ, đặc biệt là psyllium, inulin và cám lúa mì được khuyến nghị điều trị táo bón mãn tính (Bệnh viện đa khoa MEDLATEC).$b$)
) where name = 'Chất xơ Lifiber';

update sk_products set detail_sections = jsonb_build_array(
  jsonb_build_object('title','Công dụng (theo nhãn đăng ký)','body',$b$Giúp nhuận tràng, hỗ trợ tăng đào thải các chất cặn bã đường ruột.$b$),
  jsonb_build_object('title','Thành phần','body',$b$Mỗi viên nang (551,556mg) chứa 14 loại thảo mộc: Hạt bí ngô (91,8mg), Vỏ quả óc chó đen (91,8mg), Chiết xuất Hà thủ ô đỏ 12:1 (91,8mg), Tỏi (51mg), Nụ đinh hương (51mg), Lá cây xô thơm (30,6mg), Rễ cây long đởm (20,3mg), Lá cây bài hương (15,3mg), Hạt cây cỏ cà ri (15,3mg), Chiết xuất hoa cúc La Mã 4:1 (15,3mg), Hạt tiêu đen (10,2mg), Lá bạc hà (10,2mg), Cỏ xạ hương (10,2mg), Hạt cây thì là (10,2mg).
Thành phần khác: Chất làm dày (Hydroxypropyl Methyl Cellulose), Chất độn (Microcrystalline Cellulose), Chất chống đông vón (Silicon Dioxide), hỗn hợp Diệp lục và đồng Natri, Magnesium Stearate (có chứa quả óc chó đen).
Quy cách: lọ 120 viên nang.$b$),
  jsonb_build_object('title','Công dụng của các thành phần chính','body',$b$Bảng công dụng 14 thảo mộc:
- Hạt bí ngô: Tăng cường sức khỏe tim mạch, giàu kẽm và magie, hỗ trợ hệ tiêu hóa.
- Vỏ quả óc chó đen: Hỗ trợ tiêu hóa, kỹ sinh trùng, nhiễm nấm, hỗ trợ hệ tiêu hóa.
- Chiết xuất Hà thủ ô đỏ 12:1: Tăng cường sức khỏe tóc và da, hỗ trợ hệ tiêu hóa hoạt động tốt hơn.
- Tỏi (Garlic Bulb): Tăng cường sức khỏe tim mạch, hỗ trợ chống viêm.
- Nụ đinh hương: Giảm viêm, giảm đau, hỗ trợ tiêu hóa và sức khỏe khoang miệng, kháng khuẩn.
- Lá cây xô thơm: Giúp cải thiện trí nhớ, hỗ trợ tiêu hóa, sức khỏe khoang miệng, kháng khuẩn.
- Rễ cây long đởm: Hỗ trợ tiêu hóa, kích thích tiết dịch vị.
- Lá cây bài hương: Chống viêm, hỗ trợ hệ tiêu hóa, kháng khuẩn.
- Hạt cây cỏ cà ri: Hỗ trợ tiêu hóa, hỗ trợ điều hòa cholesterol.
- Chiết xuất hoa cúc La Mã 4:1: Giảm căng thẳng, giúp ngủ ngon, hỗ trợ tiêu hóa.
- Hạt tiêu đen: Tăng cường hấp thu dưỡng chất, chất chống oxy hóa, hỗ trợ tiêu hóa.
- Lá bạc hà: Giảm đầy hơi, hỗ trợ tiêu hóa, giảm buồn nôn, căng thẳng.
- Cỏ xạ hương: Chống viêm, kháng khuẩn, hỗ trợ tiêu hóa, bảo vệ sức khỏe hô hấp.
- Hạt cây thì là: Hỗ trợ tiêu hóa, giảm đầy bụng, tăng cường hệ miễn dịch.

Hà thủ ô đỏ — hoạt chất chính: Anthraquinon, Resveratrol, Tannin, Alkaloid, Steroid.
- Anthraquinon: nhóm hợp chất có tác dụng chống oxy hóa và kháng viêm. Các anthraquinon như emodin có tác dụng bảo vệ gan, giúp điều hòa hệ miễn dịch và làm giảm viêm.
- Resveratrol: flavonoid có tác dụng chống oxy hóa mạnh, giúp bảo vệ tế bào khỏi sự tổn thương của các gốc tự do, cải thiện tuần hoàn máu và chống lão hóa.
- Tannin: giúp tăng cường sức khỏe hệ tiêu hóa, đồng thời có tính chống viêm, kháng khuẩn.
- Alkaloid: nhóm hợp chất có tác dụng cân bằng hormone trong cơ thể và có tác dụng làm dịu.
- Steroid: hợp chất giúp tăng cường sức khỏe hệ miễn dịch và có tác dụng làm dịu.
Từ đó, Hà thủ ô đỏ được biết đến với vai trò: chống oxy hóa và bảo vệ tế bào (resveratrol và anthraquinon), hỗ trợ chức năng gan (thải độc gan), bồi bổ sức khỏe/tăng cường sinh lực, hỗ trợ điều hòa cholesterol, hỗ trợ làm đẹp da (một số cách chiết xuất truyền thống ghi nhận hỗ trợ làm mờ vết nám, ngăn ngừa lão hóa da).

Tỏi (Allium sativum) — hoạt chất chính: Allicin (hình thành khi tỏi được cắt hoặc nghiền nát, có đặc tính kháng khuẩn/chống viêm/chống oxy hóa), S-allyl cysteine/SAC (hợp chất lưu huỳnh hữu cơ, chống oxy hóa và bảo vệ tế bào gan), Ajoene (hợp chất lưu huỳnh khác, có khả năng kháng khuẩn và chống viêm).
- Kháng khuẩn và bảo vệ hệ tiêu hóa: Allicin có đặc tính kháng khuẩn mạnh, giúp loại bỏ vi khuẩn gây hại trong ruột, một số nghiên cứu ghi nhận khả năng ức chế vi khuẩn Helicobacter pylori.
- Giảm tình trạng đầy hơi và chướng bụng: giúp kích thích co bóp cơ ruột và hỗ trợ quá trình thải độc tố ra ngoài cơ thể.
- Hỗ trợ làm sạch ruột và cải thiện nhu động ruột.
- Chống viêm: các hợp chất lưu huỳnh trong tỏi giúp kích thích tiết dịch tiêu hóa, kháng vi khuẩn, chống viêm và cải thiện nhu động ruột hoạt động hiệu quả hơn.

Đinh hương (Syzygium aromaticum) — hoạt chất chính: Eugenol (chiếm khoảng 70-90% dầu đinh hương, hợp chất phenolic có tính kháng khuẩn, chống viêm và gây tê nhẹ):
- Kháng khuẩn và chống viêm: ức chế sự phát triển của nhiều loại vi khuẩn và nấm, giúp làm sạch vết thương và ngăn ngừa nhiễm trùng, ức chế các enzyme cyclooxygenase (COX) gây viêm.
- Giảm đau: nhờ tính gây tê nhẹ, giúp giảm cảm giác đau khi sử dụng trong các sản phẩm chăm sóc sức khỏe.
- Hỗ trợ tiêu hóa: kích thích tiêu hóa, giúp giảm tình trạng đầy hơi và chướng bụng.$b$),
  jsonb_build_object('title','Đối tượng sử dụng & Cách dùng','body',$b$Đối tượng: Người trưởng thành, người có nhu cầu nhuận tràng, người có nhu cầu đào thải chất cặn bã đường ruột.
Cách dùng: Uống 2-5 viên/ngày vào buổi sáng, trong 30 ngày liên tiếp. Không uống quá 5 viên/ngày. Mỗi đợt dùng không quá 30 ngày, cách ít nhất 3 tháng mỗi lần sử dụng.$b$)
) where name = 'Paraway Plus';

update sk_products set detail_sections = jsonb_build_array(
  jsonb_build_object('title','Công dụng (theo nhãn đăng ký)','body',$b$Hỗ trợ chức năng gan.$b$),
  jsonb_build_object('title','Thành phần','body',$b$11 chất trong mỗi viên: Chiết xuất hoa cỏ ba lá đỏ (86,333mg), Chiết xuất cây Móng quỷ (62,5mg), Chiết xuất cây Me đất chua (37mg), Chiết xuất rễ Hoàng liên gai (37mg), Bột rễ cây Cúc dại (37mg), Bột rễ Cam thảo (24,668mg), Bột rễ Thổ phục linh (12,333mg), Bột vỏ tần bì gai (12,333mg), Bột rễ cây Ngưu Bàng (12,333mg), Bột cây tảo bẹ (6,168mg), Bột lá cây Hương thảo (6,168mg).
Thành phần khác: Gelatin, Cellulose vi tinh thể.
Quy cách: 100 viên/lọ.$b$),
  jsonb_build_object('title','Công dụng của các thành phần thảo dược','body',$b$Bảng công dụng chính:
1. Chiết xuất Hoa Cỏ Ba Lá Đỏ: Hỗ trợ giải độc cơ thể, cân bằng nội tiết tố, chống oxy hóa.
2. Chiết Xuất Cây Móng Quỷ: Giảm viêm, hỗ trợ tiêu hóa, thải độc gan, giảm đau xương khớp.
3. Chiết Xuất Cây Me Đất Chua: Chống oxy hóa, hỗ trợ chức năng gan, cải thiện tiêu hóa.
4. Chiết Xuất Rễ Hoàng Liên Gai: Kháng khuẩn, chống viêm, hỗ trợ điều trị rối loạn tiêu hóa.
5. Bột Rễ Cây Cúc Dại: Tăng cường miễn dịch, chống viêm, chống oxy hóa.
6. Bột Rễ Cam Thảo: Chống viêm, hỗ trợ tiêu hóa, bảo vệ gan.
7. Bột Rễ Thổ Phục Linh: Giải độc, lợi tiểu, chống viêm.
8. Bột Vỏ Tần Bì Gai: Kháng viêm, giảm đau, hỗ trợ xương khớp.
9. Bột Rễ Cây Ngưu Bàng: Giải độc gan, hỗ trợ tiêu hóa, chống oxy hóa.
10. Bột Cây Tảo Bẹ: Bổ sung khoáng chất, hỗ trợ tiêu hóa, chống oxy hóa.
11. Bột Lá Cây Hương Thảo: Chống oxy hóa, hỗ trợ tiêu hóa, tăng cường trí nhớ.

Chiết xuất Hoa Cỏ Ba Lá Đỏ (Red Clover Extract) — chi tiết:
1. Hỗ trợ cân bằng nội tiết tố: giàu isoflavone (phytoestrogen tự nhiên), giúp điều hòa hormone estrogen, hỗ trợ phụ nữ tiền mãn kinh giảm các triệu chứng bốc hỏa, đổ mồ hôi đêm.
2. Hỗ trợ sức khỏe tim mạch: các isoflavone giúp giảm cholesterol "xấu" (LDL) và tăng cholesterol "tốt" (HDL).
3. Chống oxy hóa mạnh: bảo vệ tế bào khỏi các gốc tự do gây hại, nhờ chứa flavonoid và các hợp chất chống oxy hóa tự nhiên.
4. Hỗ trợ sức khỏe da: có thể cải thiện độ đàn hồi của da và hỗ trợ giảm các tình trạng da khô hoặc lão hóa liên quan đến thay đổi nội tiết.
5. Thải độc cơ thể: truyền thống y học phương Tây thường dùng Cỏ Ba Lá Đỏ như một loại thảo dược hỗ trợ thanh lọc máu và tăng cường chức năng gan.

Chiết Xuất Rễ Hoàng Liên Gai (Berberis vulgaris, còn gọi Mộc Hoa Vàng/Barberry):
1. Kháng khuẩn, kháng viêm mạnh: hoạt chất berberine giúp tiêu diệt vi khuẩn, nấm, ký sinh trùng.
2. Hỗ trợ hệ tiêu hóa: kích thích tiết mật, giúp tiêu hóa chất béo, hỗ trợ điều trị viêm ruột, tiêu chảy.
3. Ổn định đường huyết: cải thiện độ nhạy insulin, giảm lượng đường huyết.
4. Bảo vệ tim mạch: giảm cholesterol xấu (LDL), tăng cholesterol tốt (HDL), hỗ trợ ổn định huyết áp.
5. Chống oxy hóa, bảo vệ gan: giảm stress oxy hóa, hỗ trợ chức năng gan và bảo vệ tế bào.

Bột Rễ Cam Thảo — chi tiết:
1. Tạo vị ngọt tự nhiên: glycyrrhizin, chất tạo vị ngọt mạnh gấp 30-50 lần đường sucrose.
2. Tạo hương vị đặc trưng: hương ngọt dịu, cân bằng vị cho thực phẩm.
3. Giá trị sức khỏe: nhiều flavonoid, glycyrrhizin, hỗ trợ giảm viêm, làm dịu họng, hỗ trợ hệ tiêu hóa. Tiềm năng hỗ trợ giảm stress oxy hóa, bảo vệ gan.
4. Ứng dụng: thường thêm vào trà thảo dược, viên ngậm ho, sản phẩm tăng cường miễn dịch.
5. Bảo quản: có tính kháng khuẩn nhẹ, giúp bảo vệ thực phẩm tự nhiên khỏi sự hư hỏng do vi sinh vật.

Bột rễ cây Cúc Dại — hoạt chất chính: Alkylamides, Polysaccharides, Caffeic Acid Derivatives (echinacoside, chicoric acid), Flavonoid.
Cơ chế tác động: kích hoạt đại thực bào, tăng sản xuất cytokine, ngăn ngừa virus/vi khuẩn xâm nhập, trung hòa gốc tự do.
Công dụng: (1) Tăng cường hệ miễn dịch — kích thích hệ miễn dịch, giúp chống lại virus vi khuẩn; (2) Kháng khuẩn, chống viêm — ngăn virus, vi khuẩn bám dính; (3) Chống oxy hóa — bảo vệ tế bào khỏi tác hại của gốc tự do; (4) Hỗ trợ phục hồi sức khỏe — giảm nhanh triệu chứng cảm lạnh, cảm cúm.$b$),
  jsonb_build_object('title','Nghiên cứu khoa học tham khảo','body',$b$- Isoflavone từ Red Clover cải thiện chuyển hóa lipid và bảo vệ gan trên mô hình chuột cái bị cắt buồng trứng (Schrader C. et al., 2020, University of Hohenheim, Đức).
- Red Clover giảm đường huyết và lipid máu, hỗ trợ gan trên mô hình chuột tiểu đường (Xu M. et al., 2021, Zhejiang University, Trung Quốc).
- Bổ sung Red Clover giúp cải thiện tình trạng stress oxy hóa toàn thân ở phụ nữ mãn kinh, gián tiếp hỗ trợ gan (Lipovac M. et al., 2020, Vienna, Áo).
- Isoflavone từ Red Clover giúp cải thiện cholesterol và các chỉ số men gan (ALT, AST) ở phụ nữ sau mãn kinh (He W. et al., 2022, Trung Quốc — tổng quan hệ thống & phân tích gộp).
- Red Clover Extract giúp giảm viêm gan và tổn thương gan do rượu trong một thử nghiệm lâm sàng thí điểm (Johnson J. et al., 2023, Mỹ).$b$),
  jsonb_build_object('title','Đối tượng sử dụng & Cách dùng','body',$b$Đối tượng: Người trưởng thành.
Cách dùng: Tuần 1: ngày 1 lần x 1 viên. Tuần 2: ngày 3 lần x 1 viên. Tuần 3-4: ngày 3 lần x 2 viên. Một năm dùng 3-4 đợt. Uống trước bữa ăn.$b$)
) where name = 'Red Clover Plus';

update sk_products set detail_sections = jsonb_build_array(
  jsonb_build_object('title','Công dụng (theo nhãn đăng ký)','body',$b$Hỗ trợ giảm hấp thu chất béo.$b$),
  jsonb_build_object('title','Thành phần','body',$b$Mỗi gói 6,5g chứa: Hỗn hợp Phytosterols/Phytosterol (400mg), Citrus Pectin, Sợi Yến Mạch, Hỗn hợp Axit Ascorbic có chứa Vitamin C (45mg), Hỗn hợp Men Crôm có chứa Crôm (100mcg), Hỗn hợp Beta Carotene có chứa Vitamin A (750 IU), Beta Glucan (40mg), Hỗn hợp D-Alpha Tocopheryl Acetate có chứa Vitamin E (20 IU), Niacin (Niacinamide), Hỗn hợp Kẽm Gluconate có chứa Kẽm (2,33mg), Cây Hoa Cúc, Vitamin B6 (Pyridoxine Hydroclorid), Hỗn hợp Cyanocobalamin có chứa Vitamin B12 (35mcg), Hỗn hợp Riboflavin có chứa Vitamin B2 (2mg), Hỗn hợp chứa Axit Folic (220mcg), Hỗn hợp Thiamine Hydroclorid có chứa Vitamin B1 (2mg), Hỗn hợp chứa Biotin (20mcg).
Thành phần khác: Gôm Guar, Hương Cam, Gôm Arabic, Maltodextrin, Bột Quả Cam, Axit Citric, Canxi Carbonate, Sucralose, Policosanol (chiết xuất đường mía).
Xuất xứ: Pro-Form Laboratories, Hoa Kỳ. Quy cách: 6,5g/gói; 60 gói/hộp.$b$),
  jsonb_build_object('title','Công dụng của các thành phần chính','body',$b$Phytosterols (400mg) — hợp chất tự nhiên có cấu trúc tương tự cholesterol, có trong dầu thực vật, ngũ cốc nguyên hạt, các loại hạt và rau quả:
- Cạnh tranh hấp thu với cholesterol tại ruột non: Phytosterol cạnh tranh với cholesterol để gắn vào micelle — cấu trúc vận chuyển chất béo tạo bởi muối mật trong ruột; khi có nhiều phytosterol, ít cholesterol hơn được đưa vào micelle.
- Giảm hấp thu cholesterol nội sinh và ngoại sinh: cả cholesterol từ thức ăn (ngoại sinh) lẫn do gan tiết ra (nội sinh) đều bị ức chế hấp thu, do cơ chế cạnh tranh chiếm chỗ.
- Cơ chế giảm hấp thu chất béo: do ít cholesterol được hấp thu qua ruột, lượng cholesterol dư sẽ bị thải qua phân, giúp giảm tổng lượng cholesterol trong cơ thể.

Niacin (Vitamin B3): Niacin không làm giảm hấp thu mỡ tại ruột, mà ức chế tổng hợp và bài tiết lipid từ gan ra máu, đồng thời tăng HDL giúp loại bỏ cholesterol dư thừa. Cơ chế: ức chế enzyme hormone-sensitive lipase trong mô mỡ (giảm huy động acid béo tự do vào gan, giảm tổng hợp VLDL, giảm LDL); ức chế enzyme diacylglycerol acyltransferase-2/DGAT2 trong gan; ức chế enzyme apoA-I catabolism (kéo dài thời gian lưu hành HDL). Kết quả: Giảm LDL-C và triglyceride, Tăng HDL-C, Giảm tổng hợp triglycerid tại gan.

Vitamin C: gián tiếp giúp giảm hấp thu mỡ (đặc biệt cholesterol) qua cơ chế: (1) Ức chế quá trình hấp thu cholesterol ở ruột — ức chế enzyme HMG-CoA reductase, enzyme chính trong tổng hợp cholesterol tại gan; (2) Ảnh hưởng đến các chất vận chuyển cholesterol ở thành ruột — giảm hấp thu cholesterol từ thức ăn; (3) Tăng chuyển hóa cholesterol thành acid mật ở gan — kích thích gan sử dụng thêm cholesterol để sản xuất acid mật, gián tiếp giảm lượng cholesterol hấp thu; (4) Tác động đến nhũ hóa chất béo — có thể ảnh hưởng đến hoạt động của muối mật nhũ hóa lipid, khiến chất béo khó được hấp thu hơn; (5) Chống oxy hóa, bảo vệ thành mạch — dù không trực tiếp làm giảm hấp thu mỡ, vitamin C giúp giảm nguy cơ oxy hóa LDL, từ đó làm giảm nguy cơ xơ vữa động mạch.$b$)
) where name = 'Bios Life C';

update sk_products set detail_sections = jsonb_build_array(
  jsonb_build_object('title','Công dụng (theo nhãn đăng ký)','body',$b$Hỗ trợ giảm cân, hỗ trợ giảm hấp thu chất béo.$b$),
  jsonb_build_object('title','Thành phần','body',$b$Trong 7,25g chứa: Hỗn hợp Phytosterols, Polysaccharides tách chiết từ hỗn hợp thực vật, Xơ Yến mạch, Hỗn hợp Axit Ascorbic có chứa Vitamin C, Hỗn hợp Men Crôm, Beta Glucan, Hỗn hợp Beta Carotene có chứa Vitamin A, Hỗn hợp D-Alpha Tocopheryl Acetate có chứa Vitamin E, Hỗn hợp Niacinamide có chứa Niacin, Hỗn hợp Kẽm Gluconate có chứa Kẽm, Bột Cây Hoa Cúc, Hỗn hợp Pyridoxine Hydroclorid có chứa Vitamin B6, Policosanol (chiết xuất đường mía), Hỗn hợp Cyanocobalamin có chứa Vitamin B12, Hỗn hợp chứa Axit Folic, Hỗn hợp Thiamine Hydroclorid có chứa Vitamin B1, Hỗn hợp chứa Biotin, Hỗn hợp Riboflavin có chứa Vitamin B2.
Thành phần khác: Gôm Guar, Hương Cam, Gôm Arabic, Gôm Locust Bean, Maltodextrin, Citrus Pectin, Bột Quả Cam, Axit Citric, Canxi Carbonate, Sucralose.
Xuất xứ: Pro-Form Laboratories, Hoa Kỳ.$b$),
  jsonb_build_object('title','Công dụng của các thành phần chính (dành cho người ăn kiêng)','body',$b$Chất xơ (Gôm Guar, Beta-Glucan, Pectin, Xơ Yến mạch) — vai trò với người ăn kiêng:
1. Làm chậm quá trình hấp thu đường và chất béo: chất xơ hòa tan tạo gel trong dạ dày, giúp ổn định đường huyết, giảm cảm giác đói.
2. Tạo cảm giác no lâu: chất xơ nở ra chiếm thể tích trong dạ dày, giúp giảm lượng thức ăn nạp vào.
3. Giảm hấp thu cholesterol: chất xơ hòa tan liên kết với cholesterol và acid mật, ngăn tái hấp thu, góp phần giảm cholesterol máu, hỗ trợ tim mạch.
4. Hỗ trợ hệ vi sinh đường ruột: là "thức ăn" cho lợi khuẩn (prebiotic), giúp cân bằng hệ vi sinh, tăng miễn dịch, giảm viêm.
5. Cải thiện nhu động ruột và phòng táo bón.
6. Giảm chỉ số đường huyết sau ăn (GI): bằng cách làm chậm hấp thu carbohydrate.

Vitamin C — vai trò tăng cường sức khỏe cho người ăn kiêng qua 6 cơ chế: (1) Tăng tổng hợp carnitine — hỗ trợ đốt mỡ: Vitamin C là đồng yếu tố cần thiết cho hai enzyme hydroxyl hóa quá trình tổng hợp carnitine từ lysine và methionine; carnitine giúp vận chuyển acid béo vào ty thể để đốt năng lượng, tăng khả năng đốt mỡ. (2) Chống oxy hóa — bảo vệ tế bào: trong giai đoạn ăn kiêng, cơ thể sinh nhiều gốc tự do do quá trình phân giải mỡ và năng lượng; vitamin C là chất chống oxy hóa mạnh, giúp bảo vệ tế bào khỏi tổn thương lipid màng tế bào khỏi bị oxy hóa. (3) Tái tạo vitamin E — duy trì màng tế bào khỏe mạnh: vitamin C tái tạo dạng khử của vitamin E (tocopherol) sau khi nó đã khử gốc tự do, giúp bảo vệ màng tế bào khỏi oxy hóa lipid. (4) Hỗ trợ tổng hợp collagen — duy trì da và mô liên kết: vitamin C là đồng yếu tố cho enzyme prolyl hydroxylase và lysyl hydroxylase trong tổng hợp collagen, giúp giữ da chắc khỏe, giảm chảy xệ và rạn da khi giảm cân. (5) Tăng hấp thu sắt — nâng cao năng lượng: vitamin C chuyển sắt Fe(3+) thành Fe(2+) dễ hấp thu hơn ở ruột, ngăn thiếu máu, giúp duy trì năng lượng và hiệu suất tập luyện. (6) Tăng cường miễn dịch — giảm nguy cơ nhiễm khuẩn khi ăn kiêng: kích thích hoạt động của bạch cầu trung tính và đại thực bào, hỗ trợ miễn dịch, giúp người ăn kiêng giữ sức khỏe tốt, không bị ốm vặt ảnh hưởng tới kế hoạch tập luyện.

Vitamin E (D-alpha Tocopherol) — tăng cường sức khỏe cho người ăn kiêng: (1) Chống oxy hóa mạnh, bảo vệ tế bào; (2) Bảo vệ màng tế bào lipid khỏi gốc tự do; (3) Hỗ trợ tái tạo vitamin C, tăng khả năng chống oxy hóa; (4) Hỗ trợ chức năng nội mô mạch máu, bảo vệ tim mạch.

Phytosterols: (1) Giảm cholesterol máu — cạnh tranh với cholesterol trong thức ăn, làm giảm hấp thu cholesterol; (2) Hỗ trợ phòng ngừa bệnh tim mạch — nhờ giảm LDL, giúp giảm nguy cơ xơ vữa động mạch và bệnh tim; (3) Hỗ trợ kiểm soát cân nặng và chuyển hóa — một số nghiên cứu cho thấy có thể hỗ trợ cải thiện chỉ số lipid máu ở người thừa cân, béo phì hoặc mắc hội chứng chuyển hóa; (4) Khả năng chống viêm và chống oxy hóa (tiềm năng) — một số nghiên cứu bước đầu khám phá khả năng ức chế viêm nhẹ và chống oxy hóa, nhưng cần thêm bằng chứng lâm sàng.

Vitamin C và Vitamin E — vai trò lên hồng cầu: màng tế bào hồng cầu chứa nhiều axit béo không no, rất dễ bị oxy hóa bởi các gốc tự do (ROS). Vitamin E là chất chống oxy hóa tan trong lipid, tích hợp vào màng phospholipid của hồng cầu, giúp vô hiệu hóa gốc tự do, bảo vệ tính toàn vẹn của màng, ngăn ngừa hiện tượng tan máu (hemolysis) khi màng tế bào bị tổn thương do thiếu vitamin E (đặc biệt ở trẻ sơ sinh hoặc người kém hấp thu mỡ). Công dụng: Chống oxy hóa, Duy trì làn Da khỏe mạnh, Giúp Hồng cầu khỏe mạnh, Tăng cường Miễn dịch.

Vitamin D — công dụng: Tăng hấp thu canxi và phốt pho tại ruột (giúp xương, răng chắc khỏe; ngừa loãng xương, còi xương); Điều hòa miễn dịch (tăng hàng rào miễn dịch, giảm nguy cơ nhiễm trùng, bệnh tự miễn); Hỗ trợ chức năng cơ và thần kinh (duy trì dẫn truyền thần kinh — cơ, ngừa yếu cơ, tê ngã); Giảm nguy cơ bệnh mạn tính (liên hệ với giảm nguy cơ tiểu đường, ung thư, tim mạch); Xây dựng hệ xương răng chắc khỏe.$b$)
) where name = 'Bios Life Slim';

update sk_products set detail_sections = jsonb_build_array(
  jsonb_build_object('title','Công dụng (theo nhãn đăng ký)','body',$b$Cung cấp một số vitamin, khoáng chất và protein hỗ trợ bữa ăn kiểm soát cân nặng.$b$),
  jsonb_build_object('title','Thành phần','body',$b$Thành phần chính: Protein Phân Lập Từ Đậu Hà Lan (18,30%), Chất Xơ Inulin (15,32%), Protein Phân Lập Từ Sữa (14%), Whey Protein Cô Đặc (13,5%), Kem Sữa Không Béo (13,2%), Whey Protein Phân Lập (0,25%). Ngoài protein, công thức bổ sung thêm chất xơ, vitamin và khoáng chất thiết yếu (Vitamin B6, Vitamin B5, canxi/phốt pho tự nhiên từ sữa).$b$),
  jsonb_build_object('title','Công dụng của các thành phần chính','body',$b$Hỗn hợp Protein (đậu Hà Lan, sữa, casein, whey):
- Hỗ trợ phát triển và phục hồi cơ bắp: cung cấp protein hoàn chỉnh chứa đầy đủ 9 acid amin thiết yếu, đặc biệt BCAA.
- Kích hoạt tổng hợp protein cơ (MPS).
- Hấp thu vừa phải (chậm hơn whey, nhanh hơn casein) → thích hợp sau tập luyện hoặc dùng thay bữa phụ.
- Cung cấp cả whey và casein protein: milk protein isolate là sự kết hợp tự nhiên giữa khoảng 20% whey và 80% casein.
- Tạo cảm giác no — hỗ trợ kiểm soát cân nặng: nhờ casein tiêu hóa chậm, kéo dài cảm giác no, giảm lượng ăn vào.
- Giúp duy trì và tăng khối nạc (lean mass): phù hợp với người giảm cân, tập thể hình, người lớn tuổi cần bảo tồn khối cơ.
- Hỗ trợ sức khỏe xương: chứa canxi và phốt pho tự nhiên từ sữa, hỗ trợ mật độ xương.
- Phát triển và phục hồi cơ bắp, tổng hợp protein cơ, cung cấp cả whey và casein, tăng cảm giác no, duy trì và tăng khối lượng nạc, hỗ trợ sức khỏe xương.

Whey Protein cô đặc:
- Hỗ trợ phát triển và phục hồi cơ bắp: chứa tỷ lệ cao leucine và các acid amin chuỗi nhánh (BCAA), kích hoạt quá trình tổng hợp protein cơ (MPS), giúp phục hồi sau tập luyện.
- Tăng cường miễn dịch: cung cấp lactoferrin, immunoglobulin, các thành phần giúp bảo vệ niêm mạc ruột, điều hòa miễn dịch.
- Tăng cảm giác no, giúp kiểm soát lượng calo nạp vào — trong khi giảm cân, bổ sung whey giúp giảm mỡ nhưng vẫn bảo tồn cơ bắp.
- Tăng tốc phục hồi thể lực: dễ tiêu hóa và hấp thu nhanh → cung cấp acid amin nhanh chóng sau khi tập.
- Cải thiện chuyển hóa và kiểm soát đường huyết: tăng tiết insulin một cách tự nhiên sau bữa ăn.

Vitamin B6: Tham gia chuyển hóa protein, lipid, carbohydrate — là coenzyme trong nhiều phản ứng chuyển hóa. Hỗ trợ hệ thần kinh: góp phần tổng hợp dẫn truyền thần kinh như serotonin, GABA. Hình thành hồng cầu. Giảm triệu chứng PMS (hội chứng tiền kinh nguyệt): điều hòa hormone và dẫn truyền thần kinh.

Axit Pantothenic/Vitamin B5: Tham gia tổng hợp Coenzyme A (CoA) — rất quan trọng trong chuyển hóa năng lượng và acid béo. Hỗ trợ tái tạo da và mô: kích thích tái tạo da và niêm mạc. Góp phần vào sức khỏe da và tóc: có trong nhiều sản phẩm chăm sóc da đầu. Giảm căng thẳng và mệt mỏi: tham gia điều hòa thượng thận.$b$)
) where name = 'LC – Hương Vani';

update sk_products set detail_sections = jsonb_build_array(
  jsonb_build_object('title','Công dụng (theo nhãn đăng ký)','body',$b$Thực phẩm bổ sung — thức uống hỗ trợ tỉnh táo, tăng cường sinh lực.$b$),
  jsonb_build_object('title','Thành phần','body',$b$Bột UniMate (chiết xuất lá trà Mate, 47,559%), Chất điều vị Erythritol, chất điều chỉnh độ acid (Acid citric), chất điều vị (Natri gluconate), Hương tự nhiên (Hương chanh Meyer, Hương Bitter Blocker), Chiết xuất gừng (3,171% — riêng bản Lemon Ginger), chiết xuất cây ngọt tự nhiên, chất tạo ngọt nhân tạo (Sucralose).
Đóng gói: 6,3g/gói, 30 gói/hộp.
Xuất xứ: Công ty TNHH Unicity Labs Việt Nam.$b$),
  jsonb_build_object('title','Công dụng của Bột UniMate (chiết xuất lá trà Mate xanh)','body',$b$- Tăng năng lượng và cải thiện sự tỉnh táo tinh thần: chứa caffein tự nhiên, theobromine và các hợp chất hoạt tính sinh học → giúp tăng sự tập trung, giảm mệt mỏi và cải thiện hiệu suất trí não.
- Hỗ trợ đốt cháy mỡ và kiểm soát cân nặng: kích thích chuyển hóa lipid, tăng oxy hóa chất béo và tiêu hao năng lượng khi nghỉ ngơi.
- Ổn định đường huyết và cải thiện độ nhạy insulin: một số nghiên cứu chỉ ra chiết xuất yerba mate có thể giúp giảm glucose huyết tương sau ăn và cải thiện HbA1c ở người tiền tiểu đường hoặc tiểu đường type 2.
- Chống oxy hóa và bảo vệ tế bào: giàu polyphenol (chiorogenic acid, saponin), giúp trung hòa gốc tự do, bảo vệ tế bào tim mạch và tế bào thần kinh.
- Cải thiện tâm trạng và giảm stress nhẹ: có thể làm tăng dopamine và các chất dẫn truyền thần kinh liên quan đến cảm giác hạnh phúc và động lực.$b$),
  jsonb_build_object('title','Công dụng của Gừng (riêng bản Lemon Ginger)','body',$b$- Hỗ trợ tiêu hóa, giảm buồn nôn: gừng giúp tăng nhu động dạ dày và rút ngắn thời gian làm rỗng dạ dày, nhờ vậy giảm cảm giác đầy hơi, buồn nôn (phổ biến trong thai kỳ, say tàu xe).
- Tăng cường chuyển hóa, hỗ trợ đốt mỡ: gừng giúp kích thích sinh nhiệt (thermogenesis) và thúc đẩy oxy hóa chất béo, giúp hỗ trợ giảm cân tự nhiên.
- Hạ đường huyết nhẹ và cải thiện nhạy Insulin: gừng giúp giảm lượng đường máu lúc đói và cải thiện độ nhạy Insulin, phù hợp với người tiền tiểu đường hoặc tiểu đường type 2.
- Kháng khuẩn, chống oxy hóa và bảo vệ tế bào: gừng có tác dụng chống lại vi khuẩn Helicobacter pylori, E. coli, và Streptococcus, đồng thời trung hòa gốc tự do, bảo vệ tế bào khỏi tổn thương.
- Chống viêm và giảm đau tự nhiên: chứa các hoạt chất như gingerol, shogaol, zingerone có khả năng ức chế các enzyme gây viêm (COX, LOX), giúp giảm sưng đau, đặc biệt ở người bị viêm khớp.$b$),
  jsonb_build_object('title','Ghi chú về caffeine & khuyến cáo sử dụng','body',$b$Đối tượng sử dụng: Người trưởng thành.
Khuyến cáo: Không thích hợp cho phụ nữ mang thai, cho con bú, trẻ em, hoặc người nhạy cảm với Caffein.
Cách dùng: Pha 1 gói (6,3g) với 500-700ml nước nóng hoặc lạnh (dùng 1-2 gói mỗi ngày).
Chú thích khoa học ("Yerba mate = Metabolic support in a cup"): hỗ trợ đốt mỡ (một số nghiên cứu ghi nhận yerba mate tăng cường oxy hóa mỡ dự trữ để dùng làm nhiên liệu), hỗ trợ sản xuất GLP-1 (hỗ trợ chuyển hóa, điều tiết đường huyết và kiểm soát cảm giác thèm ăn), tăng năng lượng không cần kích thích mạnh (caffein tự nhiên + theobromine cho năng lượng sạch, bền vững hơn so với chỉ dùng caffein đơn lẻ), giàu chất chống oxy hóa (gấp khoảng 90% so với trà xanh theo một số so sánh), lề đường cơn đói và thèm ăn (hỗ trợ kiểm soát cảm giác thèm ăn).$b$)
) where name in ('Unimate Lemon Ginger Flavored Mate','Unimate Lemon Flavored Mate');

update sk_products set detail_sections = jsonb_build_array(
  jsonb_build_object('title','Công dụng (theo nhãn đăng ký)','body',$b$Hỗ trợ tăng cường sức đề kháng, cải thiện tình trạng sức khỏe.$b$),
  jsonb_build_object('title','Công dụng của thành phần chính','body',$b$Phycocyanin (sắc tố đặc trưng của tảo Spirulina): Kích thích tế bào miễn dịch, chống viêm → Tăng đề kháng, giảm viêm.
Chất chống oxy hóa (β-carotene, SOD): Trung hòa gốc tự do → Bảo vệ tế bào, làm chậm lão hóa.
Protein, B-complex, sắt: Tái tạo máu, tăng năng lượng → Chống mệt mỏi, cải thiện sinh lực.
Glycolipid & polysaccharide: Ức chế men tiêu hóa, tăng nhạy insulin → Ổn định đường huyết.
Acid gamma-linolenic (GLA): Điều hòa mỡ máu, chống viêm → Hỗ trợ tim mạch, giảm cholesterol.
Giảm cholesterol và bảo vệ tim mạch: nhiều nghiên cứu cho thấy Spirulina giúp giảm LDL (cholesterol xấu), tăng HDL (cholesterol tốt), giảm triglyceride — từ đó giảm nguy cơ xơ vữa động mạch.
Điều hòa đường huyết: Spirulina có tác dụng hỗ trợ kiểm soát đường huyết ở người tiền tiểu đường và tiểu đường type 2 nhờ 2 cơ chế tăng nhạy insulin và ức chế men tiêu hóa carbohydrate.
Cải thiện sức khỏe và giảm mệt mỏi: nhờ hàm lượng protein cao (~60-70%), vitamin nhóm B, sắt — Spirulina giúp sản sinh năng lượng, tăng sức bền, hỗ trợ phục hồi sau vận động.
Hỗ trợ giải độc: Spirulina giúp thải độc kim loại nặng (như arsen, chì, thủy ngân) ra khỏi cơ thể nhờ khả năng liên kết và bài tiết các chất này, đồng thời cải thiện chức năng gan nhờ tác dụng chống viêm.$b$),
  jsonb_build_object('title','Nghiên cứu khoa học tham khảo','body',$b$- Bổ sung chiết xuất Spirulina maxima giúp cải thiện trí nhớ ở người suy giảm nhận thức nhẹ (Choi W-Y et al., 2022, Hàn Quốc; nghiên cứu ngẫu nhiên, mù đôi, đối chứng giả dược).
- Spirulina platensis hỗ trợ huyết áp và lipid máu ở bệnh nhân tăng huyết áp (Abbasian M. và cộng sự, 2021, Iran; ngẫu nhiên, ba mù, đối chứng giả dược): sau 8 tuần, nhóm sử dụng nước sữa chứa 2g bột Spirulina hàng ngày, bệnh nhân tăng huyết áp có sự cải thiện đáng kể huyết áp tâm thu và tâm trương, cũng như mức triglyceride và cholesterol toàn phần.
- Spirulina đối với người cao tuổi khỏe mạnh (Kim S.H. và cộng sự, 2008, Hàn Quốc): bổ sung 8g Spirulina mỗi ngày trong 16 tuần giúp cải thiện hồ sơ lipid, tăng cường khả năng chống oxy hóa và miễn dịch ở người cao tuổi khỏe mạnh.
- Spirulina đối với bệnh nhân viêm loét đại tràng (Gheflati A. và cộng sự, 2021, Iran; ngẫu nhiên, mù đôi, đối chứng giả dược): sau 8 tuần bổ sung Spirulina, cải thiện đáng kể chất lượng cuộc sống liên quan đến sức khỏe, giảm mức độ chất chỉ điểm viêm.
- Spirulina đối với bệnh nhân COVID-19 nặng (Zilaee M. và cộng sự, 2023, Iran; nghiên cứu ngẫu nhiên, mù đôi): bổ sung Spirulina giúp giảm thời gian nằm ICU hoặc bệnh nhân COVID-19 nặng.$b$)
) where name = 'ChloroSpirulina';

update sk_products set detail_sections = jsonb_build_array(
  jsonb_build_object('title','Công dụng (theo nhãn đăng ký)','body',$b$Hỗ trợ tăng cường hệ miễn dịch và sức đề kháng.$b$),
  jsonb_build_object('title','Thành phần','body',$b$Thành phần chính: chiết xuất trái Nhàu (Noni), Đu đủ, Nha đam, hương tự nhiên (cam, xoài), màu tự nhiên.$b$),
  jsonb_build_object('title','Công dụng của thành phần tạo nên sản phẩm','body',$b$Chiết xuất trái Nhàu (Morinda citrifolia) — loại cây nhiệt đới, quả được ép nước sử dụng làm thực phẩm bổ sung:
- Tăng cường miễn dịch: nhờ chứa polysaccharide, vitamin C và các hợp chất chống oxy hóa.
- Chống oxy hóa: giúp trung hòa gốc tự do, làm chậm quá trình lão hóa tế bào.
- Kháng viêm tự nhiên: hỗ trợ giảm viêm khớp, viêm da và các phản ứng viêm mãn tính.
- Cải thiện tiêu hóa: hỗ trợ chức năng gan và cải thiện năng lượng.
- Một số nghiên cứu ghi nhận khả năng hỗ trợ giảm đau nhức và cải thiện năng lượng tổng thể.
Trái nhàu chứa tới 150 hoạt chất khác nhau gồm betacarotene, acid linoleic, magie, canxi, kali, protein, chất chống oxy hóa như vitamin C và các vitamin nhóm B; đặc biệt chứa prexonine — khi kết hợp với enzyme prexoronase trong dạ dày, phản ứng tạo ra serotonin.

Thành phần của Bột chiết xuất quả Đu Đủ (bảng chỉ tiêu): Độ ẩm 5-8g, Carbohydrate 70-80g (chủ yếu glucose, fructose), Chất xơ tổng 5-8g (pectin, cellulose), Protein 3-5g (chứa enzyme papain, chymopapain), Chất béo <1g, Enzyme Papain 1.000-5.000 USP units/g, Vitamin C 150-300mg, Beta-Carotene/Vitamin A 2.000-5.000mcg, Khoáng chất chính (Kali 1.000-2.000mg, Magie 100-200mg, Canxi 50-100mg).
Cơ chế & tác dụng của Đu Đủ:
- Tiêu hóa: Papain phân cắt liên kết peptid, tăng hoạt tính men tiêu hóa nội sinh, giảm bít tắc thức ăn.
- Chống viêm: Ức chế TNF-α, IL-1β và cyclooxygenase (COX-2); giảm thâm nhiễm tế bào viêm vào mô.
- Chống oxy hóa: Trung hòa gốc tự do (ROS, RNS), tăng hoạt độ enzyme nội sinh (SOD, catalase).
- Miễn dịch: Vitamin C tăng tổng hợp interferon, kích hoạt tế bào NK và bạch cầu đa nhân; Vitamin A duy trì hàng rào niêm mạc.
- Da & sắc đẹp: Papain tẩy tế bào chết lớp sừng nhẹ nhàng; kích thích tổng hợp collagen và elastin.
- Tim mạch: Ức chế LDL-ox hóa, mở rộng mạch nhờ tác dụng phản ứng viêm mạn tính giảm; hạ tăng huyết áp mạn tính trong thành mạch.

Bột quả Dâu Tằm — cùng nhóm thành phần chống oxy hóa trong công thức:
- Chống viêm: ức chế COX-2, TNF-α, IL-6.
- Tăng cường miễn dịch: kích thích hoạt động bạch cầu, kháng thể.
- Chống oxy hóa: trung hòa gốc tự do, bảo vệ tế bào.
- Bảo vệ thị lực: duy trì chức năng võng mạc, chống lão hóa.
- Hỗ trợ tiêu hóa: tăng hoạt tính men tiêu hóa, nuôi lợi khuẩn.
- Hỗ trợ tim mạch: giảm LDL, ổn định huyết áp.

Tác dụng nổi bật của Bột Lô Hội trong công thức:
- Hỗ trợ tiêu hóa & nhuận tràng: anthraquinone kích thích nhu động, làm mềm phân.
- Chống viêm: ức chế TNF-α, IL-1β và COX-2.
- Tăng cường miễn dịch: kích hoạt đại thực bào, sản xuất interferon.
- Chống oxy hóa: trung hòa gốc tự do, bảo vệ tế bào.
- Cải thiện sức khỏe da: kích thích tổng hợp collagen.
- Điều hòa đường huyết: cải thiện độ nhạy insulin.$b$)
) where name = 'Hawaiian Noni';

update sk_products set detail_sections = jsonb_build_array(
  jsonb_build_object('title','Công dụng (theo nhãn đăng ký)','body',$b$Tăng cường đề kháng, hỗ trợ hệ miễn dịch khỏe mạnh.$b$),
  jsonb_build_object('title','Thành phần','body',$b$Trong 1 viên nang chứa: Colostrum/Sữa non (IgG chiếm 15%, Bovine) (40,4040%), Arabinogalactan (30,3030%), Beta 1,3/1,6 Glucan — chiết xuất tế bào nấm men (10,1010%), Lactoferrin (từ sữa protein) (1,0101%).
Thành phần khác: Gelatin, Axit stearic, Chất chống đông vón (Silicon Dioxide). Thành phần có chứa sữa.$b$),
  jsonb_build_object('title','Công dụng của thành phần chính','body',$b$Colostrum (sữa non) — chứa Immunoglobulin G (IgG), Lactoferrin, Growth factors (IGF-1, IGF-2), Cytokines, Vitamin và khoáng chất thiết yếu:
- IgG (Immunoglobulin G): kháng thể chống lại vi khuẩn, virus, độc tố.
- Lactoferrin: chống vi khuẩn, điều hòa miễn dịch, hỗ trợ hấp thu mô.
- Growth factors (IGF-1, IGF-2): thúc đẩy phát triển và phục hồi mô.
- Cytokines: điều hòa đáp ứng miễn dịch.
- Vitamin và khoáng chất thiết yếu: nhu A, E, B12, kẽm, magie, selen.
Công dụng của Colostrum (IgG) đối với sức khỏe:
- Tăng cường miễn dịch tự nhiên: IgG giúp trung hòa vi khuẩn, virus, độc tố, tăng cường khả năng phòng bệnh, hữu ích cho người sức khỏe kém, người già, trẻ em hoặc người có hệ miễn dịch yếu.
- Hỗ trợ tiêu hóa và bảo vệ đường ruột: Lactoferrin và các yếu tố miễn dịch giúp bảo vệ chống lại vi khuẩn gây tiêu chảy, viêm ruột, như E. coli, Rotavirus — bảo vệ lớp niêm mạc ruột, hỗ trợ hội chứng rò rỉ ruột (leaky gut).
- Hồi phục cơ thể và tăng hiệu suất thể thao: IGF-1, IGF-2 hỗ trợ phục hồi cơ bắp, tái tạo mô, rất phù hợp cho vận động viên. Cải thiện hiệu suất luyện tập, tăng sức bền.
- Hỗ trợ bệnh nhân đang điều trị hoặc sau phẫu thuật: cung cấp dưỡng chất và hỗ trợ miễn dịch, giảm nguy cơ nhiễm trùng hậu phẫu.

Arabinogalactan — prebiotic tự nhiên, thuộc nhóm polysaccharide hòa tan, cấu trúc từ hai loại đường arabinose và galactose, chiết xuất từ cây Larch (Larix spp.) — thông đặc trưng vùng Bắc Mỹ và Siberia. Công dụng chính:
- Tăng cường miễn dịch: kích thích đại thực bào, tế bào NK, tăng sản xuất cytokine như IL-1, TNF-α.
- Hỗ trợ tiêu hóa: là prebiotic, nuôi vi khuẩn có lợi (như Bifidobacteria, Lactobacillus).
- Bảo vệ hô hấp: giảm nguy cơ cảm lạnh, viêm phế quản, cải thiện ứng miễn dịch hô hấp.
- Tăng hấp thu dinh dưỡng: hỗ trợ hấp thu kẽm, canxi và sắt ở ruột.
- Chống viêm, chống oxy hóa: giảm viêm hệ thống nhờ điều hòa phản ứng miễn dịch và giảm gốc tự do.
Cơ chế Arabinogalactan: Kích hoạt miễn dịch bẩm sinh (kích thích tế bào NK, đại thực bào, bạch cầu đơn nhân, giúp phát hiện và tiêu diệt tác nhân gây bệnh); Tăng tiết cytokine bảo vệ (kích thích IL-1β, IL-6, TNF-α, giúp cơ thể phản ứng nhanh với nhiễm khuẩn/virus); Tạo SCFA — butyrate, acetate (nuôi lợi khuẩn có lợi tạo ra SCFA, giúp nuôi dưỡng niêm mạc ruột và điều hòa pH đường ruột); Tăng tính thấm và hấp thu ruột (giúp hấp thu tốt hơn các chất khoáng vi lượng như kẽm, magie); Ức chế vi khuẩn có hại (cạnh tranh vị trí bám dính với vi khuẩn gây bệnh tại ruột).

Beta-1,3/1,6 Glucan — polysaccharide tự nhiên có cấu trúc đặc biệt (liên kết β-1,3 chuỗi chính và β-1,6 nhánh), nguồn gốc từ thành tế bào nấm men Saccharomyces cerevisiae. Khác với beta-glucan từ yến mạch (chủ yếu β-1,3/1,4), β-1,3/1,6-glucan có hoạt tính sinh học mạnh hơn và nổi bật trong hỗ trợ miễn dịch. Tác dụng: Tăng cường miễn dịch (kích hoạt đại thực bào, tế bào NK, tăng tiết cytokine chống lại mầm bệnh); Hỗ trợ chống ung thư (kích hoạt miễn dịch tế bào, hỗ trợ nhận diện và tiêu diệt tế bào ung thư); Chống nhiễm khuẩn & virus (tăng cường hàng rào miễn dịch chống lại vi khuẩn, virus, nấm); Giảm viêm, điều hòa miễn dịch (giúp ổn định miễn dịch, đặc biệt có lợi trong bệnh viêm mạn tính, tự miễn); Hỗ trợ phục hồi sau hóa trị/xạ trị (tăng bạch cầu, tăng sức đề kháng); Tăng cường đề kháng cho người cao tuổi, trẻ em, người suy nhược.
Cơ chế tác dụng sinh học của Beta Glucan: Gắn với thụ thể Dectin-1 và CR3 (trên màng các tế bào miễn dịch như đại thực bào, bạch cầu → kích hoạt hệ thống miễn dịch); Hoạt hóa đại thực bào & NK (tăng khả năng tiêu diệt virus, vi khuẩn và tế bào ung thư); Tăng tiết cytokine (tăng IL-2, IL-6, TNF-α, IFN-γ giúp tăng cường phản ứng miễn dịch bẩm sinh và thích nghi); Tạo bộ nhớ miễn dịch (hỗ trợ hình thành miễn dịch lâu dài với các tác nhân gây bệnh đã từng tiếp xúc); Ổn định hàng rào miễn dịch ruột (giúp tăng tiết IgA tiết niêm mạc, bảo vệ đường tiêu hóa).

Lactoferrin — glycoprotein liên kết sắt thuộc họ transferrin, tồn tại tự nhiên trong sữa (đặc biệt sữa non), nước mắt, nước bọt và dịch nhầy của cơ thể người, có vai trò như một phần của hệ miễn dịch bẩm sinh. Công dụng chính: Tăng cường miễn dịch (kích hoạt đại thực bào, tế bào NK, ức chế sự xâm nhập của vi khuẩn, virus); Kháng khuẩn, kháng virus, kháng nấm (gắn kết với sắt, làm vi khuẩn thiếu dinh dưỡng, đồng thời phá hủy màng tế bào vi sinh vật); Điều hòa vi khuẩn đường ruột (thúc đẩy lợi khuẩn như Lactobacillus, ức chế hại khuẩn như E. coli, Salmonella); Chống viêm (ức chế hoạt động của cytokine viêm và ROS); Bảo vệ tế bào (giảm stress oxy hóa, bảo vệ tế bào khỏi tổn thương).
Cơ chế tác dụng: Gắn kết & vận chuyển sắt (Fe³⁺) — vi khuẩn cần sắt để phát triển → Lactoferrin gắn sắt mạnh mẽ, vi khuẩn bị "đói" sắt và không sinh trưởng được; Tương tác trực tiếp với vi sinh vật — Lactoferrin gắn lên màng ngoài của vi khuẩn Gram-âm, làm vỡ cấu trúc → tiêu diệt vi khuẩn; Tăng hoạt tính miễn dịch — hoạt hóa tế bào NK, đại thực bào, bạch cầu → tăng khả năng tiêu diệt mầm bệnh; Điều hòa hệ vi sinh vật đường ruột — hỗ trợ sự phát triển của lợi khuẩn → cân bằng hệ vi sinh → tăng miễn dịch; Ức chế virus — ngăn virus bám và xâm nhập vào tế bào vật chủ (điển hình là virus cúm, Herpes, Rotavirus).$b$)
) where name = 'Immunizen';

update sk_products set detail_sections = jsonb_build_array(
  jsonb_build_object('title','Công dụng (theo nhãn đăng ký)','body',$b$Bổ sung Canxi và Magie cho cơ thể.$b$),
  jsonb_build_object('title','Thành phần','body',$b$Trong 7g chứa: Canxi Chelate Axit Amin (36,0633%), Magie Chelate Axit Amin (32,4343%), Boron Chelate Axit Amin (0,02%), Vitamin D3 (0,0137%), Mangan Chelate Axit Amin (0,01%).
Thành phần khác: Đường Fructose, Hương đào, Axit Malic (296), Axit Citric (330), Methylcellulose.
Quy cách: Hộp 210g (±7,5%). Xuất xứ: Best Formulations, Hoa Kỳ.$b$),
  jsonb_build_object('title','Công dụng theo từng chỉ tiêu','body',$b$Bảng công dụng chính:
- Hỗ trợ chuyển hóa xương: Boron giúp giữ canxi, magie, phospho trong xương, giảm mất xương, hỗ trợ tổng hợp osteocalcin — protein cấu trúc xương.
- Tăng cường hoạt động não bộ/nhận thức: Boron hỗ trợ hoạt động màng tế bào thần kinh, giúp duy trì trí nhớ, khả năng phản xạ và khả năng tập trung.
- Điều hòa hormone sinh dục: Boron làm tăng nồng độ testosterone tự do ở nam giới, hỗ trợ chuyển hóa estrogen ở nữ giới.
- Chống viêm, giảm đau khớp: Boron tham gia điều hòa enzyme viêm (cyclooxygenase, lipoxygenase), làm giảm đau khớp, viêm khớp nhẹ.
- Cân bằng chuyển hóa vi khoáng: giúp tối ưu hóa nồng độ canxi, magie, phospho và các enzyme liên quan.

Cơ chế và công dụng của Canxi: hỗ trợ cấu trúc xương (đồng máu, chuyển hóa tế bào, chức năng thần kinh cơ).

Cơ chế tác động của Vitamin D:
1. Cơ chế chuyển hóa: Vitamin D3 (cholecalciferol) được tạo ra khi da tiếp xúc ánh nắng mặt trời (tia UVB) → chuyển hóa qua gan thành 25(OH)D (calcidiol) → sau đó chuyển hóa tại thận thành 1,25(OH)2D (calcitriol) — dạng hoạt động của vitamin D.
2. Cơ chế tác động tại tế bào: Calcitriol (dạng hoạt động) gắn với thụ thể VDR (Vitamin D Receptor) trong nhân tế bào. Phức hợp VDR-calcitriol điều hòa biểu hiện gen: tăng tổng hợp protein vận chuyển canxi trong ruột, điều hòa gen liên quan đến miễn dịch, chu kỳ, sinh trưởng tế bào v.v.
Công dụng chính đối với sức khỏe người trưởng thành: (1) Hấp thu canxi và phospho: giúp xương chắc khỏe, ngăn ngừa loãng xương, gãy xương ở người cao tuổi; (2) Hỗ trợ chức năng cơ: ngăn suy yếu cơ bắp, cải thiện thăng bằng, giảm nguy cơ té ngã; (3) Tăng cường miễn dịch: giúp hàng rào chống nhiễm trùng, virus; (4) Hỗ trợ chức năng thần kinh và nhận thức: có liên quan đến giảm nguy cơ suy giảm trí tuệ, trầm cảm; (5) Bảo vệ tim mạch: ổn định huyết áp, có vai trò tránh nguy cơ bệnh tim; (6) Hỗ trợ chuyển hóa: ổn định đường huyết, giảm nguy cơ tiểu đường type 2, hội chứng chuyển hóa.
Liều khuyến nghị hàng ngày: Người trưởng thành (19-70 tuổi): 600-800 IU/ngày (RNI), giới hạn an toàn (UL) tối đa 4.000 IU/ngày. Trên 10.000 IU/ngày có nguy cơ nhiễm độc Vitamin D.

Cơ chế và công dụng của Mg (Magie):
- Đồng yếu tố cho enzyme: tham gia xúc tác các phản ứng chuyển hóa năng lượng, tổng hợp ATP, DNA, protein → cung cấp năng lượng, giúp phục hồi cơ thể, cải thiện trao đổi chất.
- Hòa dẫn truyền thần kinh: ức chế hoạt động quá mức của các neuron thông qua vai trò kháng calci → giảm stress, lo âu, cải thiện giấc ngủ, ngừa co giật.
- Điều hòa chức năng cơ — tim: duy trì điện thế màng tế bào cơ tim, cùng với Na+, K+, Ca2+ giữ ổn định nhịp tim, giảm loạn nhịp; ngừa chuột rút, co cơ.
- Cân bằng điện giải và huyết áp: cùng Na+, K+, Ca2+ giữ ổn định nhịp tim → góp phần hạ huyết áp.
- Hỗ trợ hình thành xương: magie tham gia vào khoáng hóa xương và chuyển hóa vitamin D → duy trì mật độ xương, giảm nguy cơ loãng xương.

Công dụng của Mn (Mangan):
- Tham gia cấu trúc enzyme: Mangan là cofactor cho hơn 20 enzyme như arginase, superoxide dismutase (Mn-SOD), pyruvate carboxylase, giúp xúc tác các phản ứng chuyển hóa carbohydrate, amino acid, cholesterol.
- Chống oxy hóa: Mangan tham gia thành phần chính của enzyme Mn-SOD trong ty thể, giúp trung hòa các gốc tự do (ROS) sinh ra trong quá trình chuyển hóa năng lượng.
- Hỗ trợ phát triển và duy trì xương: Mangan tham gia hình thành proteoglycan và collagen — cấu trúc nền của sụn, xương, kết hợp với canxi, magie và kẽm giúp tăng chất lượng xương.
- Chuyển hóa năng lượng: Mangan hỗ trợ enzyme chuyển hóa glucose, thúc đẩy năng lượng ATP trong tế bào.
- Hỗ trợ chức năng thần kinh: Mangan góp phần tạo ra các chất dẫn truyền thần kinh như dopamine, glutamate. Mức mangan cân bằng giúp duy trì sự tỉnh táo, giảm lo âu.
- Tạo máu và tổng hợp hormone: Mangan cần thiết trong tổng hợp hemoglobin, hormone sinh dục (estrogen, progesterone) và tuyến giáp (T3/T4).$b$),
  jsonb_build_object('title','Lưu ý khi dùng liều cao/kéo dài','body',$b$Vitamin D: giới hạn an toàn tối đa 4.000 IU/ngày (người trưởng thành); trên 10.000 IU/ngày có nguy cơ nhiễm độc.
Canxi quá liều kéo dài: tăng nguy cơ sỏi thận (sỏi canxi oxalat), vôi hóa mô mềm (vôi hóa mạch máu, mô tim), giảm hấp thu sắt/kẽm/magie, rối loạn tiêu hóa (buồn nôn, táo bón, chán ăn), tăng canxi máu, ảnh hưởng tác dụng một số thuốc.
Nhu cầu canxi khuyến nghị (RNI, theo Viện Dinh dưỡng Việt Nam): Nam & nữ 19-50 tuổi: 1.000mg/ngày; Nam & nữ 51 tuổi trở lên: 1.000mg/ngày; Phụ nữ có thai, cho con bú: 1.200mg/ngày. Giới hạn tối đa an toàn (UL): người dưới 50 tuổi 2.500mg/ngày, người từ 51 tuổi trở lên 2.000mg/ngày.
Magie dùng liều cao kéo dài: có thể gây tiêu chảy/rối loạn tiêu hóa (magie hút nước trong ruột, kích thích nhu động ruột), tăng magie máu (khi thận không lọc kịp lượng magie bổ sung), ảnh hưởng tim mạch (magie ảnh hưởng đến dẫn truyền thần kinh — cơ tim, dùng quá liều → rối loạn nhịp). Liều bổ sung magie nguyên tố an toàn tối đa khuyến cáo: 350mg/ngày (không kể từ thực phẩm).
Thiếu hụt Mangan: có thể gây xương yếu/dễ gãy (thiếu enzyme tạo collagen/xương), rối loạn chuyển hóa glucose (thiếu enzyme pyruvate carboxylase), tăng gốc tự do/stress oxy hóa (thiếu Mn-SOD), rối loạn kinh nguyệt/giảm sinh lý, suy giảm trí nhớ/mất cân bằng.
Ngộ độc mangan (thường gặp ở thợ hàn/công nghiệp hoặc dùng kéo dài liều cao): tích lũy ở não → hội chứng giống Parkinson (run tay, cứng cơ, suy giảm vận động); ảnh hưởng thần kinh: mất ngủ, lú lẫn, rối loạn hành vi. Chỉ nên bổ sung khi nguy cơ thiếu hoặc theo chỉ định y tế.$b$)
) where name = 'Hỗn hợp Canxi - Magiê';

update sk_products set detail_sections = jsonb_build_array(
  jsonb_build_object('title','Công dụng (theo nhãn đăng ký)','body',$b$Hỗ trợ chống oxy hóa. Hỗ trợ giảm đau nhức xương khớp.$b$),
  jsonb_build_object('title','Thành phần','body',$b$Mỗi viên nang chứa: Chiết xuất nghệ (Curcuminoid 104mg), Nhũ hương (Boswellia serrata — dương tính), Collagen Type II không biến tính/UC-II (5mg), Vitamin D3 (80-150 IU).
Thành phần khác: Cellulose vi tinh thể, Silic Dioxit (chống đông vón), Vỏ nang chay.
Quy cách: khối lượng tịnh 316mg/viên x 60 viên/lọ. Xuất xứ: CSB Nutrition Corp, Hoa Kỳ.$b$),
  jsonb_build_object('title','Công dụng của các thành phần chính','body',$b$Curcumin (104mg) — hợp chất polyphenol chiết xuất từ Nghệ (Curcuma longa), gồm Curcumin, Demethoxycurcumin và Bisdemethoxycurcumin: Hỗ trợ kháng viêm, chống oxy hóa, giảm đau khớp.
- Kháng viêm mạnh mẽ: Curcumin giúp giảm các triệu chứng viêm khớp như sưng, nóng, đỏ, đau — đặc biệt hiệu quả trong các bệnh viêm khớp dạng thấp hoặc thoái hóa khớp.
- Giảm đau hiệu quả: các nghiên cứu cho thấy Curcumin có tác dụng giảm đau tương đương với một vài thuốc NSAIDs (như ibuprofen), nhưng ít tác dụng phụ hơn trên dạ dày.
- Bảo vệ và làm chậm thoái hóa khớp: Curcumin giúp ức chế enzyme phá hủy sụn, từ đó giảm tổn thương sụn và cải thiện chức năng vận động.
- Chống oxy hóa bảo vệ tế bào sụn: Curcumin trung hòa các gốc tự do gây tổn thương mô liên kết, từ đó làm chậm tiến triển thoái hóa khớp.
Cơ chế tác động sinh học của Curcumin lên hệ xương khớp:
1. Ức chế NF-κB: Giảm biểu hiện các gene gây viêm (IL-1β, TNF-α, COX-2).
2. Ức chế enzym COX-2, LOX: Giảm tổng hợp prostaglandin và leukotriene — chất trung gian gây viêm.
3. Ức chế enzym MMPs: Giảm phân hủy collagen và proteoglycan trong mô sụn.
4. Trung hòa ROS (gốc tự do): Bảo vệ tế bào sụn khỏi stress oxy hóa.
Curcumin được sử dụng nhiều trong dân gian để điều trị các bệnh viêm mạn tính: thoái hóa khớp, viêm khớp dạng thấp... giúp giảm nhanh triệu chứng sưng, đau khớp gối, tăng khả năng gập gối và tăng khoảng cách đi bộ, giảm mức độ enzym phân hủy sụn, đạt hiệu quả cao trong chống thoái hóa khớp, cải thiện thể chất, chất lượng cuộc sống của người bệnh khớp.

Nhũ hương (Boswellia serrata) — chống viêm:
Thành phần hoạt tính chính trong Boswellia là acid boswellic, có khả năng ức chế enzyme 5-lipoxygenase — một enzyme quan trọng trong quá trình viêm. Điều này giúp giảm viêm ở khớp hiệu quả.
- Giảm đau xương khớp: các nghiên cứu cho thấy chiết xuất Boswellia giúp giảm đau khớp gối, khớp háng ở những người bị thoái hóa khớp hoặc viêm khớp.
- Cải thiện chức năng vận động khớp: khi sử dụng thường xuyên, Boswellia còn giúp tăng khả năng vận động và linh hoạt của khớp, giảm sưng cứng khớp buổi sáng.
- Giảm sưng khớp: Nhũ hương giúp ức chế sự xâm nhập của bạch cầu vào khớp, từ đó giảm sưng và thoái hóa khớp.
Cơ chế tác động lên hệ xương khớp: (1) Ức chế 5-LOX (5-lipoxygenase) — giảm sản sinh leukotriene, chất trung gian gây viêm; (2) Ức chế MMPs (enzyme phá hủy sụn) — làm chậm quá trình thoái hóa sụn khớp; (3) Ổn định màng lysosome — giảm phóng thích enzym phân giải protein tại khớp bị tổn thương; (4) Chống oxy hóa — bảo vệ sụn và mô liên kết khỏi tác hại của gốc tự do.
Nghiên cứu nhũ hương giảm viêm khớp dạng thấp (182 bệnh nhân VKDT, Tạp chí Thấp khớp học): Boswellia có thể can thiệp vào quá trình tự miễn dịch gây viêm, giảm mức độ các chất trung gian gây viêm, chống oxy hóa, bảo vệ mô xương sụn hiệu quả.

Collagen Type II (5mg) — dạng collagen chính cấu thành sụn khớp hyaline, chiếm >50% protein trong sụn khớp và ~90-95% tổng lượng collagen tại sụn, được dùng phổ biến dưới dạng không biến tính (undenatured type II collagen - UC-II) trong các sản phẩm hỗ trợ xương khớp.
Công dụng chính:
- Bảo vệ và tái tạo sụn khớp: Collagen type II là thành phần chính của sụn hyaline, chiếm đến ~60% protein trong sụn. Việc bổ sung collagen type II giúp duy trì cấu trúc và tính đàn hồi của sụn, làm chậm quá trình thoái hóa.
- Giảm viêm, giảm đau khớp: collagen type II không biến tính (UC-II) hoạt động theo cơ chế nạp dung nạp miễn dịch đường ruột, giúp phản ứng viêm tại mô sụn giảm tổn thương sụn liên kết như viêm khớp dạng thấp.
- Cải thiện chức năng vận động: giúp tăng độ linh hoạt của khớp, giảm cứng khớp buổi sáng, từ đó nâng cao chất lượng cuộc sống cho người bị thoái hóa khớp.
Cơ chế tác động: (1) Cung cấp nguyên liệu cấu trúc — bổ sung glycine, proline, hydroxyproline, acid amin chính cấu thành sụn; (2) Cơ chế dung nạp miễn dịch đường ruột (oral tolerance) — collagen không biến tính tác động đến GALT, làm giảm hoạt hóa tế bào T gây viêm; (3) Ức chế cytokine viêm (TNF-α, IL-1β) — làm giảm sưng, đau, thoái hóa khớp; (4) Kích thích tế bào sụn tổng hợp collagen mới — giúp phục hồi tổn thương sụn khớp.
Hiện tại, không có nghiên cứu lâm sàng cụ thể nào được công bố về sản phẩm "Joint Mobility" chứa các thành phần Vitamin D3, Collagen Type II, Chiết xuất nghệ và Nhũ hương. Tuy nhiên, các thành phần này đã được nghiên cứu riêng lẻ hoặc kết hợp trong nhiều nghiên cứu lâm sàng khác nhau, cho thấy hiệu quả tích cực đối với sức khỏe xương khớp.
- Nghiên cứu kết hợp UC-II (Collagen Type II không biến tính) và Nhũ hương Boswellia serrata: Đánh giá hiệu quả của việc bổ sung UC-II kết hợp với Boswellia serrata trong việc cải thiện chức năng vận động ở người có vấn đề về xương khớp. Sau 8 tuần, nhóm sử dụng UC-II kết hợp Boswellia serrata cho thấy cải thiện đáng kể về khả năng vận động và độ linh hoạt của khớp so với nhóm chỉ dùng 1 thành phần.
- Nghiên cứu về chiết xuất Boswellia serrata (Boswellin® Super) trong hỗ trợ chức năng và dược phẩm: đánh giá tác dụng của Boswellia serrata (chiết xuất chuẩn hóa từ Boswellin® Super) trong việc cải thiện chức năng khớp và giảm đau ở bệnh nhân thoái hóa khớp. Sau 90 ngày, nhóm sử dụng Boswellin® Super cho thấy cải thiện đáng kể các chỉ số đau và viêm.

Vitamin D3 là gì? Dạng tự nhiên (cholecalciferol) của vitamin D, được tổng hợp khi da tiếp xúc ánh nắng mặt trời. Có vai trò tổng hợp chuyển hóa canxi và duy trì sức khỏe toàn thân.
Công dụng chính đối với người trưởng thành: (1) Hỗ trợ hấp thu canxi và phospho: tăng hấp thu canxi tại ruột, giúp duy trì mật độ xương, ngăn ngừa loãng xương; (2) Tăng cường hệ miễn dịch: điều hòa hoạt động của tế bào miễn dịch (tế bào T, B, đại thực bào), giúp cơ thể chống nhiễm khuẩn, tự miễn; (3) Cải thiện tinh thần và sức khỏe tâm thần: có liên hệ đến mức độ serotonin trong não; giảm nguy cơ trầm cảm; (4) Hỗ trợ chức năng cơ và tim mạch: cải thiện chức năng cơ, giảm nguy cơ té ngã ở người cao tuổi; hỗ trợ huyết áp ổn định và sức khỏe tim mạch.$b$),
  jsonb_build_object('title','Cơ chế nổi bật của Collagen Type II (dung nạp miễn dịch đường ruột)','body',$b$Dung nạp miễn dịch đường ruột (Oral Tolerance): UC-II (Collagen Type II không biến tính) tác động lên các mảng Peyer trong ruột → điều hòa miễn dịch, ức chế tự miễn lên mô sụn.
Giảm viêm khớp: Làm giảm biểu hiện cytokine viêm như TNF-α, IL-1β, IL-6.
Bảo vệ và phục hồi sụn: Hạn chế phá hủy collagen nội sinh, kích thích sản sinh collagen mới, giúp duy trì tính đàn hồi và bôi trơn sụn.
Cải thiện chức năng vận động: Tăng độ linh hoạt của khớp, giảm cứng khớp buổi sáng, từ đó nâng cao chất lượng cuộc sống cho người bị thoái hóa khớp.$b$),
  jsonb_build_object('title','Đối tượng sử dụng & Cách dùng','body',$b$Đối tượng: Người trưởng thành; người trưởng thành bị đau nhức khớp.
Cách dùng: Uống 2 viên nang mỗi ngày với nước.$b$)
) where name = 'Joint Mobility';

update sk_products set detail_sections = jsonb_build_array(
  jsonb_build_object('title','Công dụng (theo nhãn đăng ký)','body',$b$Cung cấp Hyaluronic Acid, Collagen từ cá biển và Vitamin C hỗ trợ dưỡng ẩm cho da.$b$),
  jsonb_build_object('title','Thành phần','body',$b$Mỗi gói 7,2g chứa: Collagen cá (23,611%), Acid Hyaluronic/Sodium Hyaluronate (3,722%), Chiết xuất Việt quất đen (1,389%), Vitamin C/Acid Ascorbic (0,972%).
Thành phần khác: Chất làm đặc Maltodextrin, Chất tạo ngọt Erythritol, Hương liệu dâu tự nhiên, Chất bảo quản Acid citric, Hương liệu đào tự nhiên, Chất điều vị Acid malic, Chất tạo ngọt tự nhiên Rebaudioside A, Chất tạo ngọt nhân tạo Sucralose.
Quy cách: Hộp 216g (30 gói x 7,2g); 7,2g (±7,5%)/gói, 30 gói/hộp. Xuất xứ: Hàn Quốc — Unicity Global Manufacturing LLC.$b$),
  jsonb_build_object('title','Đối tượng sử dụng','body',$b$1. Người trưởng thành có nhu cầu làm đẹp da, hỗ trợ dưỡng ẩm cho da.
2. Người có làn da khô có nhu cầu cải thiện sức khỏe làn da.
Cách dùng: Pha 1 gói (7,2g) với 240-300ml nước, sữa chua hoặc trộn cùng sinh tố, dùng 1 lần mỗi ngày.$b$),
  jsonb_build_object('title','Công dụng của Collagen cá','body',$b$Collagen là loại protein dồi dào nhất trong cơ thể con người, chiếm khoảng 30% lượng protein tổng thể. Là loại protein dạng sợi được tạo ra bởi các con fibroblast có cấu trúc phức tạp. Collagen có mặt hầu hết ở da, cơ, xương, gân và dây chằng, thậm chí thấy rõ ở mạch máu, giác mạc, niêm mạc,... Collagen được tạo thành từ các axit amin, bao gồm proline, glycine, hydroxyproline... Các axit amin này liên kết lại với nhau tạo nên các sợi protein trong cấu trúc xoắn.

Công dụng chính của Collagen cá đối với làn da:
- Tăng độ đàn hồi và săn chắc da: Collagen cung cấp chuỗi glycine, proline và hydroxyproline — các acid amin thiết yếu trong cấu trúc mô liên kết của da.
- Làm mờ nếp nhăn và cải thiện độ mịn màng: Việc bổ sung collagen thủy phân giúp kích thích nguyên bào sợi (fibroblast) sản sinh collagen tự nhiên, làm mờ các rãnh nhăn.
- Dưỡng ẩm và tăng độ căng bóng tự nhiên: Collagen giúp cải thiện thủy phân acid hyaluronic nội sinh, giữ nước tốt hơn, làm da mềm mượt và căng bóng trẻ trung hơn.
- Chống oxy hóa và làm chậm lão hóa: các peptide collagen có khả năng trung hòa gốc tự do (ROS), bảo vệ mô da khỏi stress oxy hóa — nguyên nhân chính gây lão hóa da.
Cơ chế: (1) Cung cấp acid amin cấu trúc nền: Tăng cường tổng hợp collagen, elastin và proteoglycan; (2) Kích hoạt nguyên bào sợi (fibroblast): Tăng sản sinh collagen nội sinh và acid hyaluronic; (3) Giảm hoạt động enzyme MMPs (phá hủy collagen): Làm chậm sự phân hủy collagen da, duy trì cấu trúc da bền vững; (4) Trung hòa ROS: Bảo vệ tế bào da khỏi tổn thương do ánh nắng, ô nhiễm và stress.
Nghiên cứu tham khảo: bổ sung 2,5g collagen peptide/ngày trong 8 tuần giúp tăng độ đàn hồi da và giảm nếp nhăn ở mắt so với nhóm giả dược (Proksch E, Schunck M, Zague V, Segger D, Degwert J, Oesser S., 2014, Skin Pharmacology and Physiology). Bổ sung collagen peptide trong 8 tuần giúp tăng 28%, mạng lưới collagen dưới da dày hơn và mất nước qua da giảm (Asserin J, Lati E, Shioya T, Prawitt J., 2015, Journal of Cosmetic Dermatology).$b$),
  jsonb_build_object('title','Công dụng của Acid Hyaluronic','body',$b$Acid Hyaluronic là một glycosaminoglycan tự nhiên được tìm thấy trong mô liên kết của cơ thể — là thành phần chính tạo nên cấu trúc da, giúp duy trì làn da căng bóng và mịn màng.
Cơ chế hoạt động — Tác dụng:
1. Giữ nước trong mô da (ECM): Duy trì độ ẩm tối ưu cho lớp trung bì và biểu bì.
2. Hoạt hóa nguyên bào sợi (fibroblast): Kích thích sản sinh collagen và elastin.
3. Chống viêm và chống oxy hóa: Trung hòa ROS, giảm tổn thương tế bào.
4. Tham gia chữa lành vết thương: Kích hoạt yếu tố tăng trưởng (GF), hỗ trợ tái tạo biểu mô và mao mạch.$b$),
  jsonb_build_object('title','Công dụng của Chiết xuất Việt quất đen','body',$b$Việt quất đen còn có tên gọi khác là nham lê, có tên khoa học là Vaccinium myrtillus. Loại cây này chủ yếu được tìm thấy ở vùng ôn đới của Bắc bán cầu.
- Giúp cho da trắng tự nhiên: Việt quất đen có chứa nhiều axit salicylic — loại axit có tác dụng phục hồi sắc tố da, kích thích làm trắng.
- Làm chậm lão hóa da: do có hàm lượng chất chống lão hoá, nên giúp giảm sự lão hóa trên da; ngoài ra còn giúp da tránh khỏi tác nhân có hại từ bên ngoài.
Công dụng chính với làn da:
- Chống oxy hóa mạnh mẽ: giàu anthocyanin và vitamin C, việt quất đen giúp trung hòa các gốc tự do (ROS) — tác nhân gây lão hóa da, nếp nhăn và nám sạm.
- Bảo vệ da khỏi tia UV và ô nhiễm: giúp tăng cường hàng rào bảo vệ da, giảm tổn thương do ánh nắng mặt trời và môi trường đô thị.
- Tăng cường tuần hoàn máu dưới da: anthocyanin trong việt quất giúp cải thiện vi tuần hoàn mao mạch, tăng lượng oxy và dưỡng chất đến tế bào da.
- Hỗ trợ làm sáng da và đều màu da: ức chế enzyme tyrosinase giúp giảm tổng hợp melanin — nguyên nhân chính gây sạm, nám, đốm nâu.
Cơ chế: (1) Trung hòa gốc tự do (ROS): Giảm stress oxy hóa, chống lão hóa; (2) Ức chế tyrosinase: Làm sáng da, giảm đốm nâu, đều màu; (3) Bảo vệ màng tế bào khỏi tổn thương: Duy trì tính toàn vẹn của cấu trúc da; (4) Tăng sản sinh collagen tự nhiên: Kích thích nguyên bào sợi, cải thiện độ đàn hồi và kết cấu da.$b$),
  jsonb_build_object('title','Công dụng của Vitamin C với làn da','body',$b$Vitamin C đóng vai trò rất quan trọng trong cơ thể người, giúp duy trì sức khỏe của da, xương, sụn, răng và mạch máu, bảo vệ các tế bào của cơ thể khỏi bị lão hóa.
- Chống oxy hóa mạnh mẽ: Vitamin C trung hòa gốc tự do (ROS), giúp bảo vệ da khỏi lão hóa sớm do ánh nắng, ô nhiễm và stress oxy hóa.
- Kích thích tổng hợp collagen: là đồng yếu tố của enzyme prolyl và lysyl hydroxylase — giúp ổn định và liên kết chuỗi collagen, tăng độ đàn hồi, làm đầy nếp nhăn.
- Làm sáng da và đều màu da: ức chế enzyme tyrosinase, giảm sản xuất melanin — từ đó giúp giảm nám, tàn nhang và da sạm màu.
- Tăng cường hàng rào bảo vệ da: hỗ trợ phục hồi màng lipid biểu bì, giúp giảm mất nước qua da và tăng sức đề kháng cho da.
Cơ chế: (1) Trung hòa gốc tự do (ROS): Giảm tổn thương tế bào, làm chậm quá trình lão hóa; (2) Tham gia tổng hợp collagen: Kích thích nguyên bào sợi, cải thiện độ đàn hồi và cấu trúc da; (3) Ức chế tyrosinase: Làm sáng da, giảm thâm nám và đều màu da; (4) Phục hồi lớp biểu bì: Tăng tổng hợp ceramide, cải thiện hàng rào bảo vệ da.
Nghiên cứu tham khảo: bổ sung collagen cá tươi giúp cải thiện độ đàn hồi da và giảm nếp nhăn (Evans M, Lewis ED, Zakaria N, Pelipyagina T, Guthrie N., 2021, Journal of Cosmetic Dermatology — nghiên cứu ngẫu nhiên, ba mù, đối chứng giả dược, song song). Kết hợp collagen và vitamin C giúp cải thiện độ ẩm và độ đàn hồi của da (PubMed Central).$b$)
) where name = 'Unicity Oasis';
