-- KHO CHUNG — thêm nội dung tài chính chọn lọc từ bản xuất Google Keep của Quỳnh (Google Takeout).
-- Nguồn: các nhãn có nhiều ghi chú chứa từ "tiền" nhất, ưu tiên theo mức độ khả năng có nội dung
-- tài chính thật: CAP TƯ DUY (1018 ghi chú, 194 chứa "tiền"), MIND SET (110/31), KẾ HOẠCH VÀ MỤC TIÊU
-- (19/7), QUY TRÌNH KINH DOANH (18/9). Mục "(Không nhãn)" đã làm ở bản v11, không lặp lại.
-- Đã đọc thêm CAP TUYỂN KD (49/34) và TUYỂN KD (9/8) dù tên nhãn ("tuyển KD" = tuyển kinh doanh/đa
-- cấp) cho thấy khả năng cao là nội dung tuyển dụng — chỉ giữ lại nếu sau khi cắt bỏ phần kêu gọi
-- tuyển người, phần còn lại vẫn là kiến thức tài chính độc lập, không còn dấu vết mời chào.
-- QUY TRÌNH KINH DOANH và TUYỂN KD hoá ra hoàn toàn là tài liệu đào tạo/kịch bản tuyển dụng nội bộ
-- hệ thống kinh doanh đa cấp của Quỳnh (module, leader, trục A/B/C, kịch bản dẫn dắt) — không có mục
-- nào tách được thành nội dung tài chính độc lập, nên 2 nhãn này bị loại 100%.
-- Đã lọc bỏ (giống tiêu chí v11): ghi chú cá nhân/riêng tư (câu chuyện nợ/thu nhập/mua nhà cụ thể
-- của Quỳnh, ví dụ "Mua nhà Sài Gòn", "2 Quy Tắc Tích Sản... Đến Có Nhà Ở SG"), quảng cáo tuyển
-- dụng kinh doanh đa cấp có CTA "nhắn tin/comment để mình gửi", tài liệu đào tạo nội bộ hệ thống
-- (module, GLIC, B10, Prowellness, CSĐQLC, Stewart Huges...), câu nói/trích dẫn chung chung không
-- có kiến thức thực chất (kể cả khi bọc trong ngôn ngữ tâm linh như "Tiền Xanh", "hòm phước"), cam
-- kết làm giàu/đầu tư không có căn cứ (ví dụ dự đoán "chu kỳ làm giàu 2025-2028"), nội dung hẹn hò/
-- hôn nhân chỉ nhắc tới tiền cho vui, và các mục trùng lặp với nhau hoặc với bản v11.
-- Một vài mục được biên tập nhẹ: bỏ đoạn CTA kêu gọi bình luận/nhắn tin ở cuối, chuẩn hoá lại vài
-- từ viết tắt ("m", "đc", "bnhiu", "ko") thành chữ đầy đủ để phù hợp làm nội dung đăng lại — không
-- thay đổi ý hay cấu trúc của ghi chú gốc.
-- Chạy 1 lần trong Supabase SQL Editor. An toàn để chạy lại (chỉ insert thêm, không xoá dữ liệu cũ).

insert into content_bank_shared (title, content, source_type, tags) values
('Tại sao mãi không dứt được nợ', 'Tại sao chúng ta luôn gặp phải các vấn đề về tiền bạc và tài chính?

Có bao giờ bạn tự hỏi:
- Tại sao mình kiếm được nhiều tiền nhưng lại không để ra được đồng nào?
- Tại sao loay hoay nhảy việc mãi cũng chỉ đủ chi phí?
- Làm sao để tích lũy được nhiều tiền?
- Tại sao bao nhiêu năm có lúc kiếm được rất nhiều tiền nhưng trải qua bao nhiêu thăng trầm để rồi đến cuối cùng vẫn trắng tay?

Tiền không phải là vấn đề. Vấn đề là: mình đã có "cái đầu" chứa được nhiều tiền chưa? Đã biết quản lý tài chính chưa? Đã biết tạo ra nhiều dòng tiền chưa? Đã hiểu đâu là tài sản và tiêu sản chưa?

Tiền bạc không được dạy trong nhà trường mà được dạy từ gia đình, bạn bè, môi trường, những người xung quanh — vô tình tạo nên tâm lý, tinh thần, cảm xúc không đúng về tiền bạc ngay từ đầu. Và gần như không ai dạy chúng ta cách quản lý tài chính và xây dựng dòng tiền một cách bài bản.

Chúng ta sẽ không bao giờ giải quyết được một vấn đề bằng chính tư duy đã tạo ra vấn đề đó — nghĩa là bạn sẽ không thể nào giải quyết được nợ bằng chính tư duy đã tạo ra món nợ, cho tới khi bạn quyết định thay đổi tâm thức tài chính của mình.

Vì thế mà người giàu ngày càng giàu, người trung lưu ngày càng nhiều nợ, người nghèo ngày càng nhiều chi phí.', 'kien_thuc_nganh', array['tai_chinh','no','dong_tien']),

('Hiểu bản chất nền kinh tế để biết khi nào giữ tiền, khi nào giữ tài sản', 'Để hiểu đúng bản chất, cách vận hành của nền kinh tế để rồi có thể giữ và kiếm được tiền, cần nắm được những điều sau.

Tiền chính là nợ. Bạn cầm 100 đô la trong tay nghĩa là bạn, hoặc một ai đó, đang nợ ngân hàng 100 đô la đó.

Lãi suất cũng là nợ. Vì không hề có khái niệm tiền sinh ra tiền, mà chính xác là nợ sinh ra nợ, nợ mới chồng lên nợ cũ.

Nền kinh tế hồi xưa vận hành theo kiểu "làm trước ăn sau", "làm bao nhiêu ăn bấy nhiêu" nên gần như không có khủng hoảng hay vỡ nợ. Còn nền kinh tế hiện nay vận hành theo kiểu "ăn trước, mắc nợ trước, còn sau đó có làm để trả nợ hay không thì hên xui" — nên vỡ nợ, khủng hoảng là điều gần như tất yếu theo chu kỳ.

Chu kỳ của nền kinh tế là những vòng lặp, mà lãi suất chính là công cụ có tác dụng bơm tiền, hút vàng và tài sản của người dân:

Lãi suất giảm: vàng thường giảm, bất động sản/chứng khoán/tài sản rủi ro thường tăng — dòng tiền đổ mạnh vào đầu tư.
Lãi suất tăng: vàng thường tăng trở lại — nên đây là lúc nên rút bớt vốn, giảm thiểu nợ, thận trọng hơn với đòn bẩy.

Không cần phải là dân kinh tế hay chuyên gia gì cả. Chỉ cần nắm được những điều trên, bạn sẽ biết cách giữ và kiếm được tiền trong bất kỳ hoàn cảnh nào của thị trường.', 'kien_thuc_nganh', array['tai_chinh','dong_tien','tich_san']),

('Bài kiểm tra chỉ số IQ tài chính: 9 câu hỏi để biết bạn đang ở đâu', 'Đây là bài kiểm tra để tự đánh giá chỉ số IQ tài chính của bạn. Hãy trả lời thật trung thực từng câu hỏi dưới đây để biết IQ tài chính của mình đang ở mức nào, và học cách thay đổi để nâng "nhiệt kế tài chính" của mình lên.

1. Bạn có thường xuyên thanh toán trễ hoá đơn/nợ không?
2. Có bao giờ bạn phải giấu các hoá đơn ngay cả với người bạn đời của mình không?
3. Có từng bị từ chối vay không?
4. Gần đây bạn có mua những thứ mình không thực sự cần đến không?
5. Có bao giờ bạn phải mặc kệ chiếc xe hư vì không đủ tiền sửa chưa?
6. Có đang chi tiêu nhiều hơn mức mình có thể kiếm ra không?
7. Có chơi đầu cơ với hy vọng đổi đời không?
8. Có bao giờ phải tạm ngưng dành dụm tiền không?
9. Tổng nợ hiện tại của bạn là bao nhiêu, và với mức chênh lệch giữa chi tiêu và năng lực kiếm tiền hiện tại thì phải mất bao nhiêu năm mới trả hết?

Càng trả lời "có" nhiều câu, tình trạng tài chính càng đáng báo động:

Gần như không có câu nào đúng với mình: bạn thật tuyệt vời.
Đúng với vài câu: cần học cách giảm thiểu nợ, tăng thu, giảm chi, tăng tích luỹ.
Đúng với phần lớn các câu: cẩn thận, vì đang ở gần bờ vực của một cú sốc tài chính — lúc này cần ngay lập tức tìm cách quản lý tài chính và tích sản, ngay cả khi đang chưa có tiền hoặc đang nợ. Đừng tìm lý do, hãy tìm giải pháp.

"Điên rồ là cứ giữ nguyên mọi thứ nhưng lại muốn mọi thứ thay đổi."', 'kien_thuc_nganh', array['tai_chinh','no','tin_dung']),

('Dùng tiền để cho mọi người thấy bạn giàu là cách nhanh nhất để mất tiền', 'Có một nghịch lý rất thật trong đời sống tài chính: người cần chứng minh mình giàu thường là người chưa thực sự giàu. Người thực sự có tiền lại rất ít khi dùng tiền để kể câu chuyện đó với ai.

1. Tiền không "bốc hơi" vì tiêu xài — tiền rò rỉ vì động cơ sai

Rất nhiều trường hợp: thu nhập tăng thì chi tiêu tăng theo, có thêm tiền thì đổi xe, đổi đồ, đổi hình ảnh. Mọi quyết định tài chính đều có một mục tiêu ngầm: "để người khác thấy mình đang ổn." Vấn đề không nằm ở chiếc xe, món đồ hay chuyến đi — vấn đề nằm ở động cơ phía sau. Khi tiền được dùng để nuôi hình ảnh, nó không còn làm nhiệm vụ sinh sôi nữa, nó chỉ làm nhiệm vụ làm dịu cái tôi.

2. Người giàu thật không cần tiền làm loa phóng thanh

Người giàu bền: không cần ai công nhận, không cần ai nể, không cần ai biết mình đang có bao nhiêu. Vì với họ, tiền là công cụ tạo tự do, không phải công cụ tạo địa vị. Còn người đang trong pha "hao tiền" thường có chung một điểm: tiền đi trước nền tảng, hình ảnh chạy nhanh hơn nội lực, chi tiêu nhanh hơn dòng tiền quay về. Tiền đi ra rất oai, nhưng đường quay về thì không có cửa.

3. Dấu hiệu của một người đang trên hành trình... mất tiền

Tự soi: có hay tiêu tiền khi tâm trạng không ổn? Có mua thứ mình chưa thật sự cần chỉ vì "ngại thua kém"? Có cảm giác phải giữ hình ảnh để không bị đánh giá? Nếu có, thì không phải bạn đang tiêu sai — bạn đang dùng tiền để vá cảm xúc. Mà tiền thì không sinh ra để chữa tổn thương, tiền chỉ nở hoa khi người cầm nó đủ tỉnh.

Giàu không nằm ở việc bạn cho bao nhiêu người thấy. Giàu nằm ở việc tiền có ở lại và sinh thêm hay không.', 'kien_thuc_nganh', array['tai_chinh','dong_tien','tiet_kiem']),

('5 thói quen tài chính sẽ thay đổi cuộc đời bạn trong 3 năm tới', 'Mỗi lần đăng về thói quen tài chính, luôn có người bình luận kiểu: "Dễ nói thật, tiền đâu mà tiết kiệm" hay "Nghèo là do số phận, làm gì được." Những người nói vậy thường có điểm chung: tiêu trước, để dành sau nếu còn; không biết mình đang tiêu tiền vào đâu; nghĩ đầu tư là "dành cho người giàu"; xấu hổ khi nói về tiền với người thân; tin rằng thu nhập cao hơn sẽ giải quyết tất cả. Và họ đang trả giá bằng đúng những gì rất nhiều người từng trải qua: tháng nào cũng hết tiền trước ngày 25, mỗi khi có việc lớn là không xoay được, tài khoản ngân hàng luôn nhìn thấy đáy.

Sự thật đơn giản hơn nhiều: tiền không đi theo người thông minh nhất, tiền đi theo người có hệ thống nhất.

5 THÓI QUEN GIỮ BẠN NGHÈO

1. Tiêu rồi mới để dành — đây không phải lỗi đạo đức, đây là lỗi hệ thống. Não người không tự nhiên ưu tiên tương lai.
2. Không theo dõi dòng tiền — bạn không thể quản lý thứ bạn không nhìn thấy.
3. Dùng thẻ tín dụng như tiền thật — thẻ tín dụng là công cụ tuyệt vời nếu dùng đúng, nhưng hầu hết đang dùng sai.
4. Không có quỹ khẩn cấp — một sự cố nhỏ có thể làm vỡ kế hoạch cả năm.
5. Học về tiền từ người cũng đang vật lộn với tiền — lời khuyên tài chính từ người không có kết quả tài chính là một bản đồ sai. Đừng học cách giữ tiền từ người không giữ được tiền, đừng học cách đầu tư từ người chưa từng xây tài sản.

5 THÓI QUEN SẼ THAY ĐỔI CUỘC ĐỜI

1. Tự trả lương cho mình đầu tiên — mọi tháng, không ngoại lệ, ít nhất 10%. Đừng đợi dư mới để dành, vì thường thì sẽ không bao giờ dư.
2. Xây 3 tài khoản riêng biệt: chi tiêu / tiết kiệm / đầu tư. Tiền không được phân vai thì rất dễ bị tiêu nhầm.
3. Học một kỹ năng tài chính mới mỗi quý. Không ai tự nhiên giỏi tiền — tiền cũng là một kỹ năng cần học, cần luyện và cần thực hành đều đặn.
4. Ghi thu chi của mình mỗi tuần — không sợ, chỉ quan sát. Càng né, tiền càng rối; càng nhìn rõ, bạn càng có quyền chỉnh lại.
5. Tìm một người đã đi trước mình nhiều năm về tài chính, và học cách họ suy nghĩ — không chỉ học họ mua gì, mà học cách họ nhìn tiền, giữ tiền, dùng tiền và tạo ra tài sản.

Ba năm tới không phân chia người giàu và người nghèo theo thu nhập, mà theo hệ thống. Thị trường tiền bạc không tàn nhẫn, nó chỉ đang chọn lại ai xứng đáng giữ tiền lâu hơn. Và hệ thống đó không bắt đầu từ việc kiếm thật nhiều tiền — nó bắt đầu từ việc bạn dám nhìn thẳng vào dòng tiền của chính mình.

Người thắng không phải là người nói nhiều về tiền, mà là người bắt đầu xây hệ thống tiền của mình từ hôm nay.', 'kien_thuc_nganh', array['tai_chinh','tiet_kiem','dong_tien']);
