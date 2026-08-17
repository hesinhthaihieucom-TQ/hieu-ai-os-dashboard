-- KHO CHUNG v4 — do đội ngũ tự biên soạn (không trích từ nguồn ngoài), đóng vai chuyên gia viết content
-- để phủ thêm nhiều ngành khác nhau (tài chính, kinh doanh, sức khoẻ, hôn nhân, nuôi dạy con, làm đẹp, tư duy),
-- bổ sung bên cạnh seed_kho_chung_xnhk2.sql. Chạy 1 lần trong Supabase SQL Editor, SAU KHI đã chạy schema_v2.sql.

insert into content_bank_shared (title, content, source_type, tags) values
('3 LÝ DO ĐĂNG ĐỀU MỖI NGÀY MÀ KÊNH VẪN KHÔNG LỚN',
 'Nhiều người nghĩ chỉ cần đăng đều là kênh sẽ lớn. Nhưng có người đăng mỗi ngày suốt 3 tháng, nhìn lại vẫn chỉ vài chục người quen thả tim.

Vấn đề thường không nằm ở tần suất. Nó nằm ở 3 chỗ rất dễ bỏ qua.

Thứ nhất, nội dung không có một trục rõ ràng. Hôm nay đăng chuyện gia đình, mai đăng mẹo nấu ăn, mốt đăng quan điểm sống — người xem lướt qua không kịp hiểu bạn là ai, nên không có lý do để bấm theo dõi. Thuật toán cũng bối rối không biết nên đẩy kênh bạn cho ai.

Thứ hai, mở đầu bài quá hiền. 3 giây đầu tiên của một video, hoặc câu đầu tiên của một bài viết, là thứ quyết định người ta có dừng lại hay không. Nếu mở đầu bằng lời chào hỏi hoặc giới thiệu dài dòng, phần giá trị thật sự phía sau sẽ không bao giờ có cơ hội được nhìn thấy.

Thứ ba, không có lời kêu gọi hành động rõ ràng ở cuối. Người xem thấy hay, gật gù, rồi lướt tiếp — vì không ai chỉ cho họ nên làm gì tiếp theo. Một lượt theo dõi, một bình luận, một tin nhắn — nếu không được gợi ý cụ thể, phần lớn sẽ không tự xảy ra.

Cách sửa không phức tạp. Chọn đúng 1 trục nội dung chính bạn sẽ nói xuyên suốt trong ít nhất 30 ngày. Viết lại 3 giây/3 dòng đầu tiên trước, sau đó mới viết phần thân bài. Và kết mỗi bài bằng đúng 1 hành động bạn muốn người xem làm — không phải 3-4 lựa chọn cùng lúc.

Kênh lớn không phải nhờ đăng nhiều. Nó lớn nhờ người xem nhớ được bạn đang nói về cái gì, và biết chính xác việc cần làm sau khi xem xong.

Nếu bạn đang không chắc trục nội dung của mình có đủ rõ chưa, thử trả lời câu này: nếu ai đó chỉ xem đúng 1 bài của bạn, họ có đoán được 9 bài còn lại bạn sẽ nói về gì không?',
 'chuyen_gia_viet', array['xay_kenh','content','chien_luoc']),
('CÁI BẪY ''3 TRIỆU DƯ MỖI THÁNG'' KHIẾN BẠN NGHĨ MÌNH ỔN',
 'Cuối tháng dư ra 3 triệu, nhiều người thở phào: "vậy là ổn rồi". Nhưng con số đó có thể đang che một lỗ hổng rất lớn.

Dư 3 triệu không cho biết tiền đó đến từ đâu và sẽ đi đâu tiếp. Nếu nó chỉ đang nằm im trong tài khoản thanh toán — nơi có thể bị rút ra bất cứ lúc nào cho một chuyến du lịch, một món đồ giảm giá — thì thực chất bạn chưa hề tích luỹ được gì. Bạn chỉ đang trì hoãn việc tiêu nó thêm vài tuần.

Một dấu hiệu dễ nhận hơn: nếu tháng nào cũng "dư" nhưng cuối năm nhìn lại tài sản không tăng lên bao nhiêu, thì phần dư đó gần như chắc chắn đã bị tiêu vào những khoản không kế hoạch — sinh nhật bạn bè, một chuyến đi bất chợt, một lần nâng cấp điện thoại.

Dòng tiền khoẻ mạnh không nằm ở việc "cuối tháng còn dư", mà nằm ở việc tiền dư đó có được phân vào đúng 3 chỗ hay không: một phần vào quỹ dự phòng để không phải vay khi có việc gấp, một phần vào tài sản tích luỹ dài hạn (vàng, quỹ, bất động sản nhỏ), và một phần vào việc nâng cấp chính bản thân — kỹ năng, sức khoẻ, thương hiệu cá nhân — thứ sẽ tạo ra thu nhập lớn hơn về sau.

Bạn không cần dư nhiều mới bắt đầu. Chỉ cần dư 3 triệu nhưng chia đúng 3 phần, sau một năm bạn sẽ thấy sự khác biệt rõ rệt so với việc để nguyên trong tài khoản thanh toán.

Câu hỏi để tự kiểm tra ngay hôm nay: tháng vừa rồi bạn dư bao nhiêu, và phần dư đó hiện đang nằm ở đâu?',
 'chuyen_gia_viet', array['tai_chinh','dong_tien','tiet_kiem']),
('TẠI SAO SHOP CỦA BẠN CÓ NHIỀU LƯỢT XEM NHƯNG KHÔNG CHỐT ĐƠN',
 'Video đạt hàng chục nghìn lượt xem, bình luận cũng không ít, nhưng đơn hàng thì đếm trên đầu ngón tay. Đây là tình huống khiến rất nhiều người bán hàng online nản lòng nhất.

Lượt xem cao chứng minh nội dung của bạn đủ thú vị để giữ chân người ta vài giây. Nhưng chốt đơn là một hành động khác hẳn — nó cần người xem tin rằng sản phẩm giải quyết đúng vấn đề của họ, và biết chính xác phải làm gì để mua ngay lúc đó.

Ba lỗ hổng phổ biến nhất: Một, nội dung chỉ nói về sản phẩm ("hàng đẹp, giá tốt") mà không nói về vấn đề khách đang có — người xem thấy hay nhưng không thấy liên quan đến mình nên lướt tiếp. Hai, thông tin mua hàng bị giấu quá kỹ — phải bình luận, chờ inbox, chờ trả lời, mỗi bước chờ đợi là một cơ hội để khách đổi ý. Ba, không có lý do để mua ngay hôm nay thay vì để dịp khác — không ưu đãi, không giới hạn, không gì thúc đẩy hành động tức thời.

Cách khắc phục: mỗi video bán hàng nên mở đầu bằng đúng 1 vấn đề cụ thể khách đang gặp (không phải mô tả sản phẩm), sau đó mới dẫn vào giải pháp là sản phẩm của bạn. Đường dẫn mua hàng nên rút ngắn tối đa — nếu được, để ngay trong phần mô tả hoặc ghim bình luận đầu tiên. Và luôn có một lý do cụ thể để hành động ngay: số lượng giới hạn, ưu đãi có hạn, hoặc một phần quà chỉ dành cho người đặt trong ngày.

Lượt xem là điều kiện cần. Nhưng đơn hàng chỉ đến khi người xem vừa thấy liên quan đến mình, vừa biết rõ bước tiếp theo cần làm, vừa có lý do làm điều đó ngay bây giờ.',
 'chuyen_gia_viet', array['kinh_doanh','ban_hang','content']),
('MỆT MÃN TÍNH KHÔNG PHẢI VÌ BẠN LƯỜI — MÀ VÌ CÁI NÀY',
 'Ngủ đủ 7-8 tiếng mà sáng dậy vẫn mệt như chưa ngủ. Nhiều người tự trách bản thân lười biếng, thiếu ý chí. Nhưng phần lớn trường hợp, vấn đề không nằm ở ý chí — mà nằm ở chất lượng giấc ngủ và nhịp sinh hoạt trong ngày.

Cơ thể không chỉ cần đủ số giờ ngủ. Nó cần đi qua đủ các chu kỳ ngủ sâu để thực sự phục hồi. Nếu buổi tối bạn còn nhìn màn hình điện thoại sát giờ ngủ, hoặc ăn tối quá muộn, cơ thể sẽ mất nhiều thời gian hơn để vào được giấc ngủ sâu — dù tổng số giờ nằm trên giường vẫn đủ.

Một yếu tố khác ít ai để ý: uống nước không đủ trong ngày cũng gây ra cảm giác mệt mỏi rất giống với thiếu ngủ, vì máu đặc hơn khiến tim phải làm việc nhiều hơn để bơm oxy đi khắp cơ thể.

Và ăn nhiều đường/tinh bột nhanh vào buổi sáng — như bánh ngọt, trà sữa, nước ngọt — sẽ khiến đường huyết tăng vọt rồi tụt nhanh vào giữa buổi, tạo ra cảm giác mệt lả, buồn ngủ dù mới thức dậy chưa lâu.

Ba điều có thể thử ngay trong 1 tuần: tắt màn hình điện thoại ít nhất 30 phút trước khi ngủ, uống một cốc nước ngay khi thức dậy, và thay bữa sáng nhiều đường bằng thứ có đạm (trứng, sữa chua, các loại hạt).

Mệt mỏi kéo dài không phải lúc nào cũng là bệnh lý cần thuốc. Rất nhiều trường hợp chỉ cần điều chỉnh đúng 3 thói quen nhỏ này, năng lượng đã cải thiện rõ rệt sau 1-2 tuần. Nếu đã thử mà vẫn mệt bất thường, đó là lúc nên đi kiểm tra sức khoẻ tổng quát để loại trừ nguyên nhân bệnh lý.',
 'chuyen_gia_viet', array['suc_khoe','nang_luong','loi_song']),
('IM LẶNG KHÔNG PHẢI LÀ HẾT GIẬN — ĐÓ LÀ DẤU HIỆU NGUY HIỂM HƠN',
 'Nhiều cặp vợ chồng tự hào vì "nhà mình ít cãi nhau". Nhưng đôi khi, ít cãi nhau không phải vì hai người hiểu nhau tốt — mà vì một người đã ngừng nói.

Giai đoạn đầu của một mối quan hệ, người ta tranh luận vì còn kỳ vọng đối phương sẽ thay đổi, sẽ lắng nghe. Khi những lần góp ý liên tục không được đón nhận, phản ứng tự nhiên của con người không phải là tiếp tục tranh luận — mà là rút lui trong im lặng. Không phải vì hết giận, mà vì đã hết hy vọng việc nói ra sẽ tạo ra khác biệt.

Dấu hiệu để phân biệt "bình yên thật" và "im lặng nguy hiểm" khá rõ: bình yên thật vẫn có những cuộc trò chuyện về những điều nhỏ nhặt trong ngày, vẫn có sự tò mò về đối phương. Im lặng nguy hiểm thường đi kèm với việc hai người sống cạnh nhau như hai người bạn cùng phòng — làm việc nhà, nuôi con cùng nhau, nhưng gần như không còn chia sẻ cảm xúc.

Nếu nhận ra mình hoặc bạn đời đang trong trạng thái này, điều cần làm đầu tiên không phải là "nói chuyện nghiêm túc" ngay — vì lúc đó dễ biến thành một cuộc tranh cãi mới. Cách hiệu quả hơn là bắt đầu bằng một câu hỏi nhỏ, không mang tính chất trách móc: "Dạo này anh/em thấy sao?" — và thực sự lắng nghe câu trả lời mà không phản bác ngay.

Một mối quan hệ không chết vì những trận cãi vã lớn. Nó thường chết dần trong những khoảng im lặng mà cả hai đều nghĩ "chắc không sao đâu".',
 'chuyen_gia_viet', array['hon_nhan','tinh_yeu','giao_tiep']),
('CÂU BẠN NÓI KHI CON KHÓC CÓ THỂ ĐANG DẠY CON GIẤU CẢM XÚC',
 '"Nín đi, có gì đâu mà khóc" — một câu nói quen thuộc, xuất phát từ mong muốn con nhanh vui trở lại. Nhưng nếu lặp lại đủ nhiều lần, câu này có thể vô tình dạy con một bài học không ai mong muốn: cảm xúc của con không quan trọng, và thể hiện ra là sai.

Trẻ nhỏ chưa có đủ vốn từ để gọi tên cảm xúc phức tạp. Khóc thường là cách duy nhất chúng biết để báo hiệu có điều gì đó không ổn — có thể là sợ hãi, tủi thân, thất vọng, hoặc đơn giản là quá mệt. Khi người lớn phủ nhận cảm xúc đó ngay lập tức, đứa trẻ học được rằng thay vì được giúp gọi tên cảm xúc, cách an toàn hơn là nuốt nó vào trong.

Về lâu dài, những đứa trẻ quen với việc bị yêu cầu "nín ngay" thường gặp khó khăn hơn khi trưởng thành trong việc nhận biết và diễn đạt cảm xúc thật của mình — kể cả trong công việc lẫn các mối quan hệ.

Một cách phản ứng khác, không mất nhiều công hơn nhưng hiệu quả hơn rất nhiều: gọi tên cảm xúc thay vì phủ nhận nó. Ví dụ: "Mẹ thấy con đang buồn vì bị bạn giành đồ chơi đúng không?" Câu này không kéo dài cơn khóc — ngược lại, phần lớn trẻ sẽ bình tĩnh lại nhanh hơn, vì cảm thấy mình được thấu hiểu thay vì bị gạt đi.

Không ai làm cha mẹ hoàn hảo ngay từ đầu. Nhưng chỉ cần thay một câu nói quen miệng bằng một câu gọi tên cảm xúc, khoảng cách giữa cha mẹ và con trong 10-15 năm tới có thể khác đi rất nhiều.',
 'chuyen_gia_viet', array['nuoi_day_con','tam_ly','gia_dinh']),
('DA XUỐNG CẤP KHÔNG PHẢI VÌ TUỔI TÁC — MÀ VÌ THỨ TỰ BẠN ĐANG LÀM SAI',
 'Nhiều người ngoài 30 bắt đầu lo lắng khi thấy da xỉn màu, kém đàn hồi, và mặc định đó là chuyện "tuổi tác không tránh khỏi". Nhưng quan sát kỹ, phần lớn trường hợp vấn đề nằm ở thói quen chăm sóc sai thứ tự, chứ không hẳn do tuổi.

Sai lầm phổ biến nhất: dùng quá nhiều sản phẩm "đặc trị" cùng lúc, nhưng bỏ qua bước cơ bản nhất — làm sạch đúng cách và chống nắng đều đặn. Một làn da bị bào mòn hàng ngày bởi tia UV mà không được bảo vệ, thì có đắp bao nhiêu serum đắt tiền cũng khó cải thiện, vì tổn thương mới liên tục được tạo ra nhanh hơn tốc độ phục hồi.

Sai lầm thứ hai: thay đổi sản phẩm liên tục mỗi khi thấy quảng cáo mới, khiến da không có đủ thời gian để thích nghi và phát huy hiệu quả thật sự — hầu hết hoạt chất cần ít nhất 4-6 tuần mới nhìn thấy khác biệt rõ.

Sai lầm thứ ba: bỏ qua yếu tố bên trong — ngủ không đủ, uống ít nước, ăn nhiều đồ chiên rán và đường. Da là cơ quan phản ánh khá trung thực tình trạng bên trong cơ thể; chăm sóc bên ngoài chỉ giải quyết được một phần vấn đề.

Thứ tự đúng nên bắt đầu từ những điều đơn giản nhất và duy trì đều đặn: làm sạch dịu nhẹ, dưỡng ẩm, và chống nắng mỗi ngày — kể cả khi ở trong nhà cả ngày. Sau khi nền tảng này ổn định ít nhất một tháng, mới nên thêm các bước đặc trị.

Da đẹp không đến từ việc dùng nhiều sản phẩm nhất. Nó đến từ việc làm đúng những điều cơ bản, đều đặn, đủ lâu để cơ thể có thời gian đáp lại.',
 'chuyen_gia_viet', array['lam_dep','cham_soc_da','loi_song']),
('POV: BẠN VỪA ĐĂNG BÀI THỨ 30 VÀ VẪN CHỈ CÓ NGƯỜI QUEN LIKE',
 'POV: Bạn vừa nhấn đăng bài thứ 30. Refresh lại trang. 12 lượt thích. 9 trong số đó là bạn bè ngoài đời. Không một bình luận nào từ người lạ.

Cảm giác lúc này rất quen: hoài nghi liệu mình có đang làm sai cách, hoặc tệ hơn — liệu nội dung của mình có thật sự đủ giá trị để ai đó quan tâm hay không.

Đây chính xác là giai đoạn phần lớn người xây kênh bỏ cuộc. Không phải vì thiếu năng lực, mà vì nhìn nhầm cột mốc. 30 bài đầu tiên gần như không phải để "viral" — nó là giai đoạn để thuật toán và chính bạn cùng học cách hiểu nhau: thuật toán học xem nội dung của bạn phù hợp với ai, còn bạn học cách viết mở đầu thu hút hơn, chọn đúng vấn đề người xem thật sự quan tâm hơn.

Những kênh mà bạn thấy "bỗng dưng nổi" gần như luôn có một giai đoạn 30-50 bài đầu im ắng y hệt vậy — chỉ là người xem không thấy giai đoạn đó, họ chỉ thấy kết quả sau này.

Nếu bạn đang ở bài thứ 30 với 12 lượt thích, câu hỏi không nên là "mình có nên dừng lại không". Câu hỏi nên là: trong 30 bài vừa qua, 3 bài nào có tương tác cao nhất, và điểm chung giữa chúng là gì? Đó chính là manh mối cho 30 bài tiếp theo.

Không ai nhìn thấy bài thứ 30 của bạn ngoài bạn bè. Nhưng bài thứ 80, 100 — hoàn toàn có thể khác, nếu bạn còn ở đó để viết nó.',
 'chuyen_gia_viet', array['xay_kenh','pov','dong_luc']),
('THẺ TÍN DỤNG KHÔNG LÀM BẠN NGHÈO — CÁCH BẠN DÙNG NÓ MỚI LÀM BẠN NGHÈO',
 'Nhiều lời khuyên tài chính nói thẳng: "cắt hết thẻ tín dụng đi". Nhưng vấn đề thật sự không nằm ở cái thẻ — nó nằm ở cách một người ra quyết định chi tiêu khi cầm nó trong tay.

Thẻ tín dụng bản chất là một công cụ trả sau. Với người có kỷ luật, nó giúp tối ưu dòng tiền — mua trước, trả đúng hạn trong kỳ miễn lãi, giữ tiền mặt ở lại tài khoản sinh lời lâu hơn vài tuần. Nhưng với người chưa quen theo dõi số dư, cảm giác "còn hạn mức" rất dễ bị nhầm thành cảm giác "còn tiền" — dẫn đến chi tiêu vượt khả năng trả nợ thật sự.

Dấu hiệu cho thấy thẻ tín dụng đang gây hại chứ không giúp ích: chỉ trả được số tối thiểu mỗi tháng, dùng thẻ này để trả nợ thẻ khác, hoặc không nhớ rõ tổng số dư đang nợ là bao nhiêu.

Cách dùng an toàn không phức tạp: chỉ chi tiêu số tiền mà bạn đã có sẵn trong tài khoản để trả, xem thẻ tín dụng như một công cụ dời ngày trả tiền chứ không phải nguồn tiền thêm, và luôn trả đủ 100% dư nợ trước hạn — không bao giờ trả mức tối thiểu.

Vấn đề không phải là có nên dùng thẻ tín dụng hay không. Vấn đề là bạn có đang dùng nó với kỷ luật của người kiểm soát dòng tiền, hay đang để nó âm thầm kiểm soát bạn.',
 'chuyen_gia_viet', array['tai_chinh','no','tin_dung']),
('NGƯỜI TA KHÔNG GHÉT BẠN VÌ BẠN THÀNH CÔNG — HỌ SỢ VÌ BẠN DÁM KHÁC BIỆT',
 'Khi bắt đầu thay đổi — dậy sớm hơn, tiết kiệm quyết liệt hơn, học thêm kỹ năng mới, hoặc đơn giản là bắt đầu chia sẻ công khai điều mình đang làm — không hiếm khi phản ứng đầu tiên nhận được lại là sự dè bỉu từ chính những người quen thân, chứ không phải sự ủng hộ.

Điều này thường bị hiểu nhầm là "họ ghen tị vì mình giỏi hơn". Nhưng phần lớn không phải vậy. Con người có xu hướng cảm thấy an toàn khi mọi người xung quanh giữ nguyên trạng thái như cũ. Khi một người trong nhóm bắt đầu thay đổi, điều đó vô tình đặt ra một câu hỏi khó chịu cho những người còn lại: "vậy mình có nên thay đổi không, hay mình đang chấp nhận đứng yên?" Sự khó chịu đó, thay vì hướng vào trong, lại thường bị đẩy ra ngoài dưới dạng lời châm chọc, hoài nghi, hoặc thờ ơ.

Nhận ra điều này không phải để coi thường người xung quanh, mà để không lấy phản ứng của họ làm thước đo cho việc mình có đang đi đúng hướng hay không. Rất nhiều người đã dừng lại một hành trình tốt chỉ vì không chịu nổi ánh mắt của vài người vốn dĩ cũng không đồng hành lâu dài với họ.

Một cách nhìn khác, nhẹ nhàng hơn: sự dè bỉu ban đầu thường không kéo dài. Khi kết quả bắt đầu rõ ràng, phần lớn những người từng hoài nghi sẽ lặng lẽ quan sát, và một số thậm chí quay lại hỏi bạn đã làm thế nào.

Bạn không cần sự đồng thuận của tất cả mọi người để bắt đầu. Bạn chỉ cần đủ rõ ràng với chính mình về lý do vì sao đang làm điều này.',
 'chuyen_gia_viet', array['tu_duy','phat_trien_ban_than','quan_diem']);

insert into hooks_bank_shared (hook_text, category, note) values
('Tháng nào cũng dư tiền mà cuối năm tài khoản vẫn y như cũ — đây là lý do.', 'Nghịch lý - phản trực giác', 'Ngành ví dụ: Tài chính cá nhân.'),
('Đừng xoá app ngân hàng để ''đỡ tiêu tiền'' — cách đó chỉ khiến bạn không biết mình đang nghèo đi.', 'Đập tan niềm tin sai', 'Ngành ví dụ: Tài chính cá nhân.'),
('3 dòng trong sao kê thẻ tín dụng tháng này có thể đang tiết lộ vì sao bạn không tiết kiệm được.', 'Con số cụ thể / Tự soi', 'Ngành ví dụ: Tài chính cá nhân.'),
('Tôi từng nghĩ lương tăng gấp đôi sẽ hết áp lực tiền bạc — tăng thật, áp lực vẫn y nguyên.', 'Thú nhận sai lầm cá nhân', 'Ngành ví dụ: Tài chính cá nhân.'),
('Có một con số quan trọng hơn thu nhập hàng tháng của bạn, và gần như không ai để ý tới nó.', 'Khoảng trống thông tin', 'Ngành ví dụ: Tài chính cá nhân.'),
('Nếu bạn đang trả nợ bằng thẻ tín dụng khác, dừng lại và đọc cái này trước.', 'Cảnh báo - mất mát', 'Ngành ví dụ: Tài chính cá nhân.'),
('Người giữ được tiền không phải người kiếm nhiều nhất trong nhóm bạn tôi.', 'So sánh đối lập', 'Ngành ví dụ: Tài chính cá nhân.'),
('Video 50 nghìn view, 3 đơn hàng — đây là chỗ bị rò rỉ mà không ai nói với bạn.', 'Bí mật ngành', 'Ngành ví dụ: Kinh doanh online.'),
('Bạn không cần thêm follow để bán được hàng. Bạn cần sửa đúng 1 chỗ này trước.', 'Xoá bỏ rào cản', 'Ngành ví dụ: Kinh doanh online.'),
('Khách hàng lướt qua sản phẩm của bạn trong 1.3 giây — đây là điều họ nhìn thấy đầu tiên.', 'Số liệu cụ thể', 'Ngành ví dụ: Kinh doanh online.'),
('30 bài đầu tiên không phải để viral. Đây là điều thật sự nó dùng để làm.', 'Định vị lại vấn đề', 'Ngành ví dụ: Xây kênh cá nhân.'),
('POV: bạn vừa đăng bài thứ 30 và chỉ có người quen thả tim.', 'POV / Tự soi', 'Ngành ví dụ: Xây kênh cá nhân.'),
('Tôi từng xoá kênh 3 lần vì nghĩ mình không hợp làm nội dung — lần thứ 4 mới là lần đúng.', 'Câu chuyện cá nhân bất ngờ', 'Ngành ví dụ: Xây kênh cá nhân.'),
('Đừng đăng đều mỗi ngày nếu bạn chưa trả lời được câu hỏi này.', 'Thử thách / cá cược', 'Ngành ví dụ: Xây kênh cá nhân.'),
('Ngủ đủ 8 tiếng mà vẫn mệt — đây là 3 lý do bác sĩ ít khi nói ngay từ đầu.', 'Bí mật ngành', 'Ngành ví dụ: Sức khoẻ.'),
('Tôi từng nghĩ mệt mỏi là do lười — hoá ra do thiếu đúng 1 thứ trong bữa sáng.', 'Thú nhận sai lầm cá nhân', 'Ngành ví dụ: Sức khoẻ.'),
('Nếu bạn hay tỉnh giấc lúc 2-3 giờ sáng, đây có thể là điều cơ thể đang cố nói với bạn.', 'Cảnh báo có điều kiện', 'Ngành ví dụ: Sức khoẻ.'),
('Uống đủ nước không làm bạn hết mệt — trừ khi bạn uống đúng thời điểm này.', 'Lật ngược niềm tin', 'Ngành ví dụ: Sức khoẻ.'),
('Một cốc trà sữa buổi sáng đang âm thầm khiến bạn buồn ngủ lúc 2 giờ chiều.', 'Nhân - quả bất ngờ', 'Ngành ví dụ: Sức khoẻ.'),
('Nhà tôi rất ít khi cãi nhau — mất một thời gian tôi mới hiểu vì sao đó không hẳn là tin tốt.', 'Thú nhận / tự soi', 'Ngành ví dụ: Hôn nhân - Gia đình.'),
('Im lặng sau một cuộc cãi vã không có nghĩa là đã hết giận — nó có thể là điều đáng lo hơn.', 'Đập tan niềm tin sai', 'Ngành ví dụ: Hôn nhân - Gia đình.'),
('Câu ''em/anh không sao đâu'' là câu đáng lo nhất trong một cuộc hôn nhân.', 'Nghịch lý - phản trực giác', 'Ngành ví dụ: Hôn nhân - Gia đình.'),
('3 dấu hiệu cho thấy hai người đang sống như bạn cùng phòng, không phải vợ chồng.', 'Listicle / Tự soi', 'Ngành ví dụ: Hôn nhân - Gia đình.'),
('Tôi từng nghĩ yêu thương là đủ để giữ một mối quan hệ — hoá ra còn thiếu đúng 1 điều.', 'Thú nhận sai lầm cá nhân', 'Ngành ví dụ: Hôn nhân - Gia đình.'),
('Câu bạn nói khi con khóc có thể đang dạy con giấu cảm xúc suốt đời.', 'Cảnh báo - hậu quả dài hạn', 'Ngành ví dụ: Nuôi dạy con.'),
('''Nín đi, có gì đâu mà khóc'' — câu nói tưởng vô hại nhưng lại gây hậu quả rất xa.', 'Bóc trần thói quen phổ biến', 'Ngành ví dụ: Nuôi dạy con.'),
('Con bạn không hư — con chỉ đang thiếu đúng 1 từ để gọi tên cảm xúc của mình.', 'Định vị lại vấn đề', 'Ngành ví dụ: Nuôi dạy con.'),
('Tôi từng quát con để con nín nhanh hơn — cái giá phải trả đến muộn hơn tôi tưởng.', 'Thú nhận sai lầm cá nhân', 'Ngành ví dụ: Nuôi dạy con.'),
('Da xuống cấp không phải vì tuổi — mà vì bạn đang làm sai thứ tự này.', 'Định vị lại vấn đề', 'Ngành ví dụ: Làm đẹp.'),
('Dùng 5 loại serum một lúc có thể là lý do da bạn ngày càng nhạy cảm hơn.', 'Cảnh báo phản trực giác', 'Ngành ví dụ: Làm đẹp.'),
('Bước chống nắng bạn hay bỏ qua đang âm thầm xoá sạch công sức của mọi bước còn lại.', 'Nhân - quả bất ngờ', 'Ngành ví dụ: Làm đẹp.'),
('Người ta không ghét bạn vì bạn thành công — họ sợ vì bạn dám khác biệt.', 'Định vị lại vấn đề', 'Ngành ví dụ: Phát triển bản thân.'),
('Khi bạn bắt đầu thay đổi, người phản đối đầu tiên thường không phải người lạ.', 'Sự thật phũ phàng', 'Ngành ví dụ: Phát triển bản thân.'),
('Không ai vỗ tay khi bạn bắt đầu — họ chỉ chú ý khi bạn đã đi được nửa đường.', 'Quan sát nghịch lý', 'Ngành ví dụ: Phát triển bản thân.'),
('3 tháng đầu thay đổi thói quen, tôi nhận nhiều lời hoài nghi hơn là ủng hộ.', 'Câu chuyện cá nhân', 'Ngành ví dụ: Phát triển bản thân.'),
('Bạn nghĩ mình đang ở giai đoạn nào trong 3 giai đoạn này? Để lại số ở bình luận.', 'Câu hỏi phân loại / comment-bait', 'Dùng cuối bài để kéo bình luận, áp dụng được nhiều ngành.'),
('Nếu chỉ được giữ lại 1 thói quen trong bài này, bạn chọn cái nào?', 'Câu hỏi buộc chọn lựa', 'Dùng cuối bài để kéo bình luận, áp dụng được nhiều ngành.'),
('Đây có phải điều bạn cũng đang gặp, hay chỉ mình tôi từng như vậy?', 'Câu hỏi đồng cảm', 'Dùng cuối bài để kéo bình luận, áp dụng được nhiều ngành.'),
('Comment số bạn đang ở hiện tại, để lần sau tôi biết nên viết tiếp phần nào.', 'Comment-bait định hướng nội dung', 'Dùng cuối bài để kéo bình luận, áp dụng được nhiều ngành.');
