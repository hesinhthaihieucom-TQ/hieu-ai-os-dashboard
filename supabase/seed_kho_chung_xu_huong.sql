-- KHO CHUNG — dữ liệu tham khảo về xu hướng content (tổng hợp từ case study/phân tích thứ cấp trên web,
-- KHÔNG PHẢI bài gốc thật trên nền tảng). Dùng bổ trợ cho AI sinh ý tưởng, không thay được kho bài viral
-- thật do đội ngũ tự chọn. Chạy 1 lần trong Supabase SQL Editor (chạy trong SQL Editor bỏ qua RLS nên
-- không cần tài khoản admin).

insert into content_bank_shared (title, content, source_type, tags) values
('Công thức HOOK 4 phần: Hút - Kết quả - Rào cản - Từ khoá',
 'Hook mạnh gồm 4 phần: Hút sự chú ý ngay giây đầu, hứa hẹn kết quả người xem sẽ nhận được, nêu rào cản đang cản họ đạt kết quả đó, và chốt bằng từ khoá đúng chủ đề. Áp dụng theo thứ tự: hút, hứa kết quả, nêu rào cản, từ khoá đúng chủ đề.',
 'xu_huong', array['hook','cong-thuc']),

('Sự thật ngược giữ chân người xem lâu hơn khoảng 30%',
 'Mở đầu bằng một nghịch lý hoặc sự thật ngược với suy nghĩ thông thường khiến não bộ khó bỏ qua vì cảm giác căng thẳng chưa được giải quyết. Nghiên cứu cho thấy tiêu đề dạng mâu thuẫn, ngược đời giữ chân người xem lâu hơn khoảng 30% so với tiêu đề thông thường.',
 'xu_huong', array['hook','tam-ly']),

('3 giây đầu quyết định tất cả — Visual Hook',
 'Nếu 3 giây đầu video không đủ hấp dẫn thì mọi công sức sản xuất phía sau gần như lãng phí. Visual hook là yếu tố hình ảnh được thiết kế có chủ đích ngay đầu video để tạo tò mò tức thì, trước cả khi lời thoại hay chữ hook xuất hiện.',
 'xu_huong', array['hook','video','3-giay-dau']),

('2026: nội dung theo series thắng thế hơn video đơn lẻ',
 'Xu hướng 2026 dịch chuyển từ đăng video đơn lẻ sang xây series nhiều tập có mạch nội dung xuyên suốt, giữ người xem quay lại nhiều lần. Thuật toán ưu tiên phân phối các series có mức độ gắn kết sâu hơn là chỉ đếm lượt xem từng video rời rạc.',
 'xu_huong', array['xu-huong','series','2026']),

('Thuật toán TikTok 2026 ưu tiên giá trị thật hơn số lượng',
 'TikTok năm 2026 không còn ưu tiên đăng nhiều hay viral nhất thời. Hệ thống đánh giá cao nội dung tạo ra tương tác có chủ đích thật như bình luận thật, xem lại, chia sẻ có ý nghĩa, và mang giá trị cho cộng đồng, thay vì chỉ chạy theo số lượng bài đăng hay bình luận rác.',
 'xu_huong', array['thuat-toan','tiktok','2026']),

('Case study vừa viral vừa xây niềm tin',
 'Case study, tức câu chuyện khách hàng hoặc học viên thật có trước sau rõ ràng, là một trong những dạng content vừa dễ viral vừa xây niềm tin mạnh nhất. Nó cho người xem thấy rõ xuất phát điểm ra sao, yếu tố nào tạo ra kết quả, và bài học rút ra là gì. Khác feedback ở chỗ case study có phân tích nguyên nhân, không chỉ chứng thực kết quả.',
 'xu_huong', array['case-study','niem-tin']),

('Kết hợp trending sound + nội dung giá trị = công thức viral',
 'Video dùng âm thanh đang thịnh hành nhận lượt xem cao hơn đáng kể trong 48 giờ đầu so với không dùng. Tuy nhiên trend sound chỉ là công cụ khuếch đại, phải đi kèm nội dung có giá trị thật thì mới giữ được người xem ở lại và chuyển đổi, không chỉ lướt qua rồi quên.',
 'xu_huong', array['tiktok','trending-sound','xu-huong']),

('Storytelling gắn kết nhiều kênh tạo hiệu ứng cộng hưởng',
 'Thương hiệu cá nhân lan toả mạnh hơn khi đầu tư kể chuyện nhất quán và gắn kết nhiều kênh nền tảng lại với nhau, ví dụ dẫn từ TikTok về bài dài Facebook, từ Facebook về cộng đồng riêng, thay vì mỗi kênh làm nội dung rời rạc không liên kết.',
 'xu_huong', array['thuong-hieu-ca-nhan','da-kenh']);

insert into hooks_bank_shared (hook_text, category, note) values
('Vì sao [điều tưởng chừng đúng] lại đang khiến bạn [hậu quả xấu]?', 'su_that_nguoc',
 'Khung câu hỏi lật ngược niềm tin phổ biến — dạng này giữ chân người xem lâu hơn khoảng 30% theo các phân tích về tâm lý tiêu đề.'),
('3 giây đầu: [hành động/hình ảnh gây tò mò ngay, chưa cần nói gì]', 'tu_khoa_kich_hoat',
 'Visual hook — gây chú ý bằng hình ảnh trước khi hook bằng chữ/lời nói xuất hiện, quan trọng vì 3 giây đầu quyết định người xem có ở lại không.'),
('Đây là điều không ai nói với bạn về [chủ đề].', 'tu_khoa_kich_hoat',
 'Từ khoá kích hoạt kiểu "điều ít ai nói" — tạo cảm giác được tiết lộ thông tin nội bộ, hiếm gặp.');
