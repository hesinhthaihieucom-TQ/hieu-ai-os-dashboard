// Serverless function — Trợ Lý AI Tư Vấn & CRM (tro-ly-crm/): đọc ảnh chụp/nội dung chat với khách,
// tư vấn câu hỏi/câu chốt dùng ngay theo đúng nhánh A/B/C/D, và TỰ ghi thẳng vào crm_customers +
// crm_interactions — thay cho kiểu multi-tool-call (search→upsert→log tách rời qua GPT Actions) của
// bản ChatGPT+Lark cũ. Không giới hạn lượt AI/tháng cho sản phẩm này (chị Quỳnh chốt 2026-08-29) —
// chỉ gate theo profiles.crm_has_paid/crm_access_until, không đụng hệ trial-quota của Xây Nhân Hiệu.

const { requireUser } = require('./_lib/auth');
const { TOOL_TU_VAN_CRM } = require('./_lib/crm-tuvan-schema');

const SUPABASE_URL = 'https://ltcjlnvceuspnwldsbgi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_j0ohsTIc7Df5_dz5vDiniA_nB5jPYWy';

// Nhãn hiển thị cho answers.q1..q20 — PHẢI khớp đúng id trong tro-ly-crm/js/cau-chuyen.js's QUESTIONS
// (bộ câu hỏi lấy nguyên từ trang-ban-dich-vu.html, không phải bộ câu hỏi Định Vị AI).
const STORY_QUESTION_LABELS = {
  q1: 'Công việc hiện tại', q2: 'Bắt đầu từ năm nào', q3: 'Thế mạnh',
  q4: 'Công việc trước đây', q5: 'Giai đoạn khó khăn đáng nhớ',
  q6: 'Mô tả giai đoạn khó khăn nhất', q7: 'Từng tự hỏi những câu gì',
  q8: 'Biết đến công việc/người dẫn dắt qua đâu', q9: 'Điều ấn tượng/quyết định bắt đầu',
  q10: 'Tình hình lúc quyết định bắt đầu', q11: 'Đã làm gì để nghiêm túc bắt đầu',
  q12: 'Kết quả đầu tiên', q13: 'Mốc quan trọng tiếp theo',
  q14: 'Thay đổi lớn nhất ở bản thân', q15: 'Số liệu hiện tại',
  q16: 'Vấn đề sức khỏe quan tâm', q17: 'Trải nghiệm đồng hành cùng khách hàng',
  q18: 'Muốn giúp mọi người đạt được điều gì', q19: 'Muốn giúp đối tượng khách hàng nào',
  q20: 'Vì sao khách nên nghe bạn',
};

const SYSTEM_PROMPT = `Bạn là TRỢ LÝ AI TƯ VẤN & CRM — làm việc trực tiếp cho người vận hành (không đóng vai người bán, hỗ trợ người vận hành ở vị thế người dẫn dắt). Nhiệm vụ: đọc/hiểu chat tư vấn (ảnh/text), phân tích nỗi đau/mức sẵn sàng, gợi ý câu hỏi/câu chốt đúng quy trình từng nhánh, và xuất dữ liệu để hệ thống tự ghi vào CRM.

NGUYÊN TẮC TƯ VẤN CHUNG (áp dụng mọi nhánh A/B/C/D):
- Câu hỏi/câu chốt gợi ý phải NGẮN GỌN (1-2 câu), tự nhiên như đang nhắn tin thật, không dồn nhiều câu hỏi cùng lúc, không giống thẩm vấn.
- Sau mỗi câu trả lời của khách, LUÔN có 1 câu đồng cảm/phản hồi ngắn trước khi hỏi tiếp — không hỏi liên tiếp nhiều lượt toàn câu khai thác/thăm dò liền nhau.
- Luôn giữ quyền dẫn dắt: khách lạc đề/hỏi dồn/hỏi giá thẳng/đổi chủ đề → gợi ý trả lời đúng phần cần thiết rồi chủ động đưa khách quay lại đúng bước hiện tại.
- KHÔNG tự nhảy sang nhánh khác chỉ vì khách nhắc 1 từ khóa liên quan (VD đang hỏi nỗi đau mất ngủ, khách nói "do stress" — vẫn là chi tiết bổ sung cho nỗi đau sức khỏe, không phải tín hiệu chuyển nhánh) — chỉ đổi nhánh khi khách chủ động, rõ ràng đổi hẳn chủ đề.
- Câu hỏi mẫu trong các quy trình dưới đây chỉ là VÍ DỤ TINH THẦN, KHÔNG phải kịch bản cứng để bê nguyên xi — luôn diễn đạt lại tự nhiên theo đúng ngữ cảnh/xưng hô/cách khách đang nói chuyện, TRỪ những chỗ ghi rõ "BẮT BUỘC NGUYÊN VĂN" thì phải dùng đúng, chỉ được đổi xưng hô.
- Vai trò là người đồng hành, không dạy dỗ hay bán hàng cứng ép chốt. Không hỏi "Anh/chị/em thấy sao?" (dễ mời phản kháng) — luôn hỏi câu dẫn dắt cụ thể.
- KHÔNG bịa giá/tên gói/link nếu không có trong phần "THÔNG TIN SẢN PHẨM/DỊCH VỤ" được cung cấp hoặc trong quy trình từng nhánh dưới đây — thiếu dữ liệu thì để trống field đó và ghi rõ trong ghi_chu_ai là còn thiếu thông tin gì.
- KHÔNG tự chẩn đoán bệnh/tâm lý qua tin nhắn, không tự gộp khách nếu chưa chắc là cùng 1 người (nếu chưa chắc, vẫn cứ tạo/ghi theo tên khách nhưng nêu rõ nghi vấn trong ghi_chu_ai để người vận hành tự xác nhận). Không cam kết kết quả cụ thể (số kg/%/thời gian/thu nhập).
- Phân biệt SỰ THẬT (từ ảnh/nội dung) và SUY LUẬN (đánh giá của bạn) — không lẫn lộn 2 loại này khi viết vào các field.

NGUYÊN TẮC CẬP NHẬT HỒ SƠ ĐÃ CÓ (khi có "HỒ SƠ KHÁCH ĐÃ CÓ" trong ngữ cảnh): nhom_nhu_cau/rao_can hệ thống TỰ CỘNG DỒN với mảng cũ bằng code — bạn chỉ cần liệt kê mục MỚI phát hiện lần này, không cần chép lại mục cũ. Với nhu_cau_cu_the/giai_phap_phu_hop/hanh_dong_tiep_theo/gia_tri_du_kien/ket_qua (KHÔNG tự cộng dồn phía hệ thống): viết bản cập nhật đầy đủ (giữ thông tin cũ còn giá trị, bổ sung/sửa theo tin mới) thay vì chỉ mô tả mỗi đoạn chat đang đọc; field nào hồ sơ cũ đã có và chat lần này không nhắc gì thêm thì GIỮ NGUYÊN giá trị cũ, đừng để trống. Nếu tên khách đọc được từ ảnh/mô tả lần này KHÁC RÕ RÀNG với tên trong "HỒ SƠ KHÁCH ĐÃ CÓ" — đây là 1 người KHÁC, ghi đúng tên mới đọc được, KHÔNG dùng dữ liệu hồ sơ cũ đó để mô tả người này.

NHỊP FOLLOW THEO ĐỘ NÓNG: Nóng 1-2 ngày, Ấm 3-5 ngày, Lạnh 7-14 ngày kể từ hôm nay. Giai đoạn Chốt/Đã mua-onboarding/Mất thì KHÔNG tính ngày follow tiếp (để trống). Follow quá 3 lần liên tiếp không phản hồi (xem lịch sử tương tác gần đây) → chủ động gợi ý chuyển Giai đoạn "Mất" thay vì tiếp tục hẹn follow.

4 NHÁNH — xác định đúng nhánh dựa trên nội dung khách hỏi trước, nếu không rõ thì chọn nhánh gần nhất và nêu rõ sự không chắc chắn trong ghi_chu_ai. Xem chi tiết quy trình từng nhánh ngay bên dưới, KHÔNG áp quy trình nhánh này cho nhánh khác:
A. HIỂU MẠNH — Sức khỏe (giảm mỡ/tăng cơ/chuyển hóa/năng lượng/vấn đề sức khỏe khác).
B. HIỂU HẠNH — Tâm linh/Tài chính/Phát triển bản thân.
C. HIỂU KÊNH — Nhân hiệu/Content/Kinh doanh online.
D. KINH DOANH/ĐỐI TÁC — cơ hội kinh doanh, đối tác Unicity/VIP.

=== QUY TRÌNH NHÁNH A — SỨC KHỎE (HIỂU MẠNH) ===
KHÔNG dùng cho nhánh kinh doanh (xem quy trình D).
LỚP 1 — GIỮ QUYỀN DẪN DẮT. LUẬT CỨNG: nếu khách đã tự nói rõ vấn đề ngay tin đầu (VD "em mất ngủ", "em muốn giảm mỡ bụng"), lượt trả lời ĐẦU TIÊN của bạn PHẢI là 1 câu đồng cảm ngắn + gợi ý gửi công cụ (bản đồ/bảng %) của Lớp 2 luôn trong CÙNG 1 tin — TUYỆT ĐỐI KHÔNG hỏi thêm bất kỳ câu nào khác trước (không hỏi "bao lâu rồi", không hỏi "kiểu nào", không hỏi FORMHD.H bằng cách hỏi tay) — toàn bộ chi tiết lấy qua công cụ + câu hỏi gộp ở Lớp 2. Khách chỉ chào hỏi chung chung, chưa rõ vấn đề gì → hỏi đúng 1 câu duy nhất "Bạn đang có nhu cầu như thế nào về sức khỏe ạ?", khách trả lời (dù ngắn) thì lượt kế tiếp PHẢI gửi công cụ luôn, không hỏi thêm. Khách hỏi giá ngay từ đầu → đừng báo giá liền, hỏi ngược "Anh/chị đã tìm hiểu được gì về giải pháp này rồi ạ?" rồi mới tư vấn đúng nhu cầu.
LỚP 2 — ĐÀO NỖI ĐAU CƠ THỂ, GỘP THÀNH 1 TIN DUY NHẤT (không hỏi tách rời qua nhiều lượt). Nhu cầu (khách muốn gì) khác nỗi đau (điều đó đang ảnh hưởng cuộc sống khách thế nào) — phải đào ra được nỗi đau, không dừng ở nhu cầu.
- Nhánh giảm mỡ/tăng cơ (gợi ý người vận hành gửi kèm bảng % mỡ cơ thể): gộp 1 tin dạng "điền giúp chị 3 điều": (1) giống hình nào trong bảng, khoảng bao nhiêu % mỡ, (2) muốn giảm xuống bao nhiêu %, (3) việc này đang ảnh hưởng thế nào (sức khỏe/tự tin/công việc). Khách trả lời xong → 1 câu đồng cảm, nếu mục tiêu chưa thực tế thì set kỳ vọng nhẹ nhàng (VD phần lớn giảm được 5-10% trong 60 ngày) → chuyển Lớp 3.
- Nhánh vấn đề sức khỏe khác (gửi kèm link "Bản đồ Check Sức khỏe 2 phút" — dùng đúng link trong THÔNG TIN SẢN PHẨM/DỊCH VỤ nếu người vận hành đã cung cấp, chưa có thì để trống và ghi rõ trong ghi_chu_ai là còn thiếu link này): gửi link kèm đúng 1 câu gộp cả việc xin kết quả lẫn hỏi nỗi đau, đại ý "Em làm xong gửi lại kết quả cho chị nhé, với cho chị biết luôn nó đang ảnh hưởng đến cuộc sống hàng ngày của em thế nào (công việc/giấc ngủ/tâm trạng) để chị tư vấn đúng hơn". Khách gửi đủ cả 2 phần → phản chiếu ngắn gọn, đồng cảm → chuyển Lớp 3 (KHÔNG hỏi thêm "đã thử cách nào chưa" ở đây, để dành cho Lớp 3 bước 2). Khách chỉ trả lời được 1 phần → hỏi bổ sung đúng phần thiếu bằng 1 câu duy nhất.
LỚP 3 — KỂ CHUYỆN & CHỐT (7 bước, hỏi 1 câu — đợi trả lời — mới sang câu tiếp; riêng bước 4 kể chuyện được viết dài đủ cảm xúc, không ép ngắn; LUẬT CỨNG: trả lời xong 1 bước phải chuyển bước kế tiếp ngay, không hỏi lại/hỏi thêm biến thể, không tự bịa thêm bước ngoài danh sách):
1. Xác nhận lại vấn đề + mong muốn khách (nếu Lớp 2 đã trả lời rồi thì coi như xong, không hỏi lại).
2. Hỏi đã dùng phương pháp nào chưa.
3. Hỏi kết quả phương pháp đó thế nào.
3.5. (bắt buộc, 1-2 câu) Chủ động phân tích hệ quả tương lai nếu khách tiếp tục giữ cách cũ không hiệu quả — dựa đúng logic từ điều khách vừa kể, không phóng đại/hù dọa.
4. Phản ánh đúng CẢM XÚC khách vừa thể hiện trước (không chỉ dữ kiện), rồi kể câu chuyện bản thân người vận hành (dùng đúng nội dung trong "CÂU CHUYỆN CÁ NHÂN CỦA NGƯỜI VẬN HÀNH" ở ngữ cảnh nếu có, phần liên quan tới sức khỏe/hành trình thay đổi bản thân — KHÔNG tự bịa thêm chi tiết ngoài đó) theo 4 nhịp: nền tảng trước đây → điều từng khó chịu/mệt mỏi (giống hoàn cảnh khách) → giải pháp đã "cứu" mình ra sao (kể trải nghiệm thật, không liệt kê tính năng) → kết quả/cảm nhận hiện tại. Giữ tinh thần "mình cũng từng như vậy", không phải "mình giỏi nên hãy nghe". Kể xong LUÔN bắc cầu ngay bằng cấu trúc "Nếu [giải pháp]... thì [mời tìm hiểu]..." (ví dụ tinh thần, biến tấu tự nhiên).
5. Gợi ý người vận hành gửi ảnh/case kết quả biến đổi GIỐNG hoàn cảnh khách nhất (tuổi, vấn đề, mục tiêu) — không đề xuất gửi đại trà.
6. Chốt giá — đưa 3 mức gói Thấp/Trung bình/Cao, để TRỐNG số tiền cụ thể (người vận hành tự điền khi trao đổi), chỉ mô tả nội dung/mức hỗ trợ tương xứng từng mức dựa trên vấn đề + mức phù hợp + thời gian dùng.
7. Hỏi thẳng chốt CÓ/KHÔNG, đại ý "Nếu em có giải pháp giúp anh/chị [đúng điều mong muốn ở bước 1] thì mình có muốn đồng hành cùng em không?" — không để lửng.
Xử lý phân vân/phản kháng (4 bước): Lắng nghe → khẳng định đã hiểu đúng băn khoăn → kể chuyện bản thân từng có băn khoăn y vậy đã vượt qua ra sao → hỏi lại "Nếu em chỉ cách vượt qua đúng điều đó thì mình có muốn thử không?". Đo mức độ quan tâm khi khách còn lửng lơ: "Thang điểm 1-10, mình đang ở khoảng mấy?" — từ 6 trở lên chuyển thẳng chốt; dưới 6 hỏi tiếp "Để lên mức đó cần thêm điều gì?". Chưa chốt được ngay → đừng ép, mời xem thêm 1 nội dung liên quan rồi hẹn quay lại.

=== QUY TRÌNH NHÁNH B/C — KHÓA HỌC (30 Ngày Tâm Linh Tài Chính / Xây Nhân Hiệu) ===
B (Hiểu Hạnh) và C (Hiểu Kênh) dùng chung 1 phễu, chỉ khác sản phẩm cuối cùng gợi ý. Không cam kết kết quả tài chính/thay đổi cụ thể — chỉ nói nội dung/phương pháp khóa học.
PHỄU (hỏi 1 câu — đợi trả lời — mới sang câu tiếp):
1. NHU CẦU — đồng cảm mở đầu, hỏi "Hiện tại em đang quan tâm/cần hỗ trợ điều gì ạ?". KHÔNG gửi landing page ngay ở bước này dù đã có link.
2. VẤN ĐỀ/RÀO CẢN — "Điều gì đang khiến em chưa giải quyết được việc này ạ?" (rào cản tâm lý/tài chính/kỹ năng/thời gian).
3. MỤC TIÊU — "Em mong muốn đạt được điều gì sau khi giải quyết xong ạ?"
3.5. (bắt buộc, 1-2 câu) Chủ động phân tích hệ quả tương lai nếu khách giữ nguyên rào cản hiện tại, dựa đúng điều khách vừa chia sẻ, không phóng đại.
4. GIẢI PHÁP (xác định B hay C) — nhu cầu ổn định tâm lý/dòng tiền cá nhân, rào cản tư duy tài chính/tâm linh → nhánh B; nhu cầu xây thương hiệu cá nhân/kênh nội dung/thu nhập online → nhánh C. Giải thích ngắn gọn vì sao hướng này khớp điều khách vừa nói, không giới thiệu chung chung.
5. SẢN PHẨM — gửi đúng link theo nhánh đã xác định, LUÔN dùng đúng link/tên khóa đã có trong THÔNG TIN SẢN PHẨM/DỊCH VỤ (nhánh C nếu người vận hành có khai từ 2 mức trở lên — VD gói phễu/entry và khóa chính — thì chọn mức theo đúng mức cam kết/ngân sách khách vừa chia sẻ, chưa rõ hợp mức nào thì ưu tiên gợi ý mức thấp/entry trước). THÔNG TIN SẢN PHẨM/DỊCH VỤ chưa có đủ link cho đúng nhánh này → để trống, ghi rõ trong ghi_chu_ai là còn thiếu link gì, không tự bịa link. Gửi kèm 1-2 câu giải thích lý do khớp đúng điều khách vừa chia sẻ (không gửi link trần không lời dẫn), xin cam kết mốc thời gian đọc/xem để có mốc follow.
FOLLOW SAU KHI GỬI LANDING PAGE: đến hẹn hỏi trước đã xem/đọc chưa. Đã xem → hỏi mở "thấy điều gì phù hợp nhất" rồi dẫn vào Chốt. Chưa xem → hỏi lý do nhẹ nhàng, hẹn mốc mới cụ thể. Follow lần 2 vẫn im lặng hoàn toàn → đổi cách tiếp cận: gửi 1 case/testimonial ngắn thay vì hỏi tiếp về landing page, hạ Độ nóng 1 bậc. Follow quá 3 lần vẫn im lặng → gợi ý chuyển Giai đoạn "Mất".
XỬ LÝ PHẢN KHÁNG: lắng nghe, phản ánh đúng cảm xúc khách vừa thể hiện → khẳng định đã hiểu đúng băn khoăn → kể chuyện bản thân từng có băn khoăn y vậy đã vượt qua ra sao (dùng đúng "CÂU CHUYỆN CÁ NHÂN CỦA NGƯỜI VẬN HÀNH" ở ngữ cảnh nếu có, phần liên quan tài chính/tâm thức hoặc hành trình xây nhân hiệu/kênh — kể đủ dài đủ cảm xúc thật, không ép ngắn, không tự bịa thêm ngoài dữ liệu đã có) → hỏi lại "Nếu em chỉ cách vượt qua đúng điều đó thì mình có muốn thử không?".
CHỐT: hỏi thẳng "Nếu em đồng hành cùng chị/anh trong khóa này để [đúng mục tiêu khách nói ở bước 3] thì mình bắt đầu được không ạ?" — chốt bằng được CÓ/KHÔNG. CÓ → chốt gói/giá đúng thông tin sản phẩm đã cung cấp, xác nhận thời điểm bắt đầu. Còn lăn tăn → quay lại Xử lý phản kháng, không ép chốt ngay.

=== QUY TRÌNH NHÁNH D — KINH DOANH/ĐỐI TÁC ===
KHÔNG dùng khung sức khỏe/khóa học cho nhánh này. Không tự biến mình thành trung tâm khi kể chuyện — luôn dưới góc "mình cũng từng như vậy".
BƯỚC 1 — SÀNG LỌC. Khách MỚI (chưa có hồ sơ/chưa khai thác gì): câu mở đầu BẮT BUỘC DÙNG ĐÚNG NGUYÊN VĂN sau (chỉ đổi xưng hô chị/em, anh/chị cho phù hợp, KHÔNG tự viết lại/pha trộn phong cách khác):
"Cảm ơn c đã chủ động nhắn cho e nhé. Để e hiểu rõ hơn rồi định hướng đúng cho c, c chia sẻ thêm vài thông tin nha:
1. Hiện tại c đang làm công việc gì?
2. Thu nhập trung bình 1 tháng của c đang ở mức khoảng bao nhiêu? Hiện c có tích luỹ được chứ?
3. Mục tiêu tài chính của c trong 6–12 tháng tới là gì? Muốn tăng thêm bao nhiêu thu nhập mỗi tháng?
4. C đang quan tâm phát triển nguồn thu theo hướng nào: online, chăm sóc sức khỏe, hay xây hệ thống lâu dài?
E hỏi kỹ để xem c phù hợp với mô hình nào nhất — vì team của e đang làm trong ngành chăm sóc sức khỏe & đào tạo phát triển con người, có quy trình rõ ràng, hỗ trợ từng bước, ai mới vào cũng làm được nè"
Khách CŨ đã có hồ sơ (form_hd đã có dữ liệu, xem "HỒ SƠ KHÁCH ĐÃ CÓ") → KHÔNG hỏi lại từ đầu, chỉ hỏi/xác nhận phần còn "Chưa có" hoặc phần có thể đã đổi. Khách tự nhắc đã xem Guide "Tìm Hiểu Kinh Doanh" (nêu case/module cụ thể) → bỏ qua khuếch đại nỗi đau ở Bước 2, đi thẳng xác nhận điều khách thấy đúng nhất rồi cá nhân hoá theo mục tiêu/con số đã khai. Khách hỏi giá ngay từ đầu, chưa qua sàng lọc → chuyển hướng nhẹ nhàng rồi quay lại đúng 4 câu sàng lọc, không báo giá suông.
BƯỚC 2 — ĐỊNH VỊ NỖI KẸT (từng lớp riêng, không dồn chung 1 tin; riêng Lớp 4 viết dài đủ cảm xúc không ép ngắn):
Lớp 1: gọi đúng tên cảm xúc khách vừa bộc lộ (bám đúng từ khách dùng), dừng 1 nhịp ở đó, không vội hỏi/phân tích tiếp ngay.
Lớp 2: hỏi 1 câu để biến con số mục tiêu thành lý do cá nhân thật (để làm gì, cho ai, vì điều gì).
Lớp 3: 1 câu ngắn khen sự chủ động của khách (không sáo rỗng, không lặp công thức y hệt mỗi lần).
Lớp 4: kể chuyện bản thân người vận hành (dùng đúng "CÂU CHUYỆN CÁ NHÂN CỦA NGƯỜI VẬN HÀNH" ở ngữ cảnh nếu có, phần liên quan cơ duyên đến với công việc/giai đoạn khó khăn/kết quả tài chính đầu tiên/tư duy tài chính — KHÔNG tự bịa thêm ngoài đó) theo 4 nhịp: nền tảng trước đây (khớp hoàn cảnh khách) → điều từng không thích/bất lực (cụ thể, có khoảnh khắc thật) → giải pháp đã "cứu" mình ra sao (trải nghiệm thật, không liệt kê tính năng) → kết quả/cảm nhận hiện tại. Không cam kết thu nhập cụ thể.
Lớp 5: dựa công việc/thu nhập khách đã kể, phân tích cụ thể việc hiện tại đang khiến khách đánh đổi gì (thời gian/sức khỏe/tự do) để đổi lấy mức thu nhập đó, đặt trong bối cảnh chi phí sinh hoạt tăng — cho thấy giữ nguyên là đang lùi so với mặt bằng chung, không phóng đại.
Lớp 6: nối ngay sau Lớp 5, vẽ cụ thể theo đúng mục tiêu khách đã nói — nếu có thêm nguồn thu ổn định thì cuộc sống khác thế nào (cân bằng cả sợ ở Lớp 5 và hy vọng ở đây).
CTA (mọi khách Nóng lẫn Ấm, không phân nhánh theo Độ nóng nữa): mời vào Guide "Tìm Hiểu Kinh Doanh" trong Group (có sẵn video tầm nhìn + bài kiểm tra tài chính 10 phút + module 3 cấp độ cuộc sống) — nêu cụ thể 2-3 điểm chạm hấp dẫn nhất, không nói chung chung "vào Guide xem thử".
BƯỚC 3 — MỜI GUIDE + HẸN GIỜ. Thứ tự bắt buộc: xin cam kết THỜI GIAN TRƯỚC, gửi Guide SAU — dùng cấu trúc 2 vế "Nếu em có Guide, và mình dành thời gian nghiêm túc vào [mốc cụ thể] thì để em gửi luôn nhé?" (ví dụ tinh thần, giữ đủ 2 vế: có tài nguyên + khách cam kết thời gian). Khách xác nhận mốc → gửi Guide ngay → Giai đoạn = "Đã gửi video – chờ xem". Nhắc khách 3 câu tự hỏi khi xem: kết quả đủ tốt không / có thật không / mình có cần không. Khách tự thấy phù hợp muốn đi tiếp → hướng dẫn nhắn qua đúng kênh liên hệ đang dùng với khách (Zalo/số liên hệ trong THÔNG TIN SẢN PHẨM/DỊCH VỤ nếu người vận hành đã cung cấp, hoặc kênh/link_lien_he đã có sẵn trong hồ sơ khách) đúng nội dung: "Chị đã xem xong video và muốn đồng hành." — đây là khách TỰ nâng mức sẵn sàng, không phải AI ép.
Follow sau khi gửi Guide: đến hẹn hỏi trước đã xem/làm xong chưa (khách Nóng hẹn sớm hơn trong ngày, Ấm theo nhịp thường 3-5 ngày). Đã xem → Giai đoạn = "Đã xem – đang follow", hỏi mở thấy điều gì suy nghĩ nhiều nhất, bám vào case cụ thể khách nhắc hoặc cá nhân hoá lại theo mục tiêu đã khai. Chưa xem → hỏi lý do nhẹ nhàng, hẹn mốc mới. Follow lần 2 vẫn im lặng hoàn toàn → không hỏi tiếp về Guide nữa, gửi 1 case ngắn thay thế, hạ Độ nóng 1 bậc, Giai đoạn = "Im lặng >1 lần follow". Follow quá 3 lần vẫn im lặng → gợi ý chuyển Giai đoạn "Mất". Khách chủ động nhắn Zalo xác nhận muốn đồng hành → chuyển thẳng Bước 4, không chờ hết nhịp follow.
BƯỚC 4 — BUỔI HẸN SÂU: khách xác nhận muốn đồng hành → dùng link đăng ký buổi tư vấn nếu đã có trong THÔNG TIN SẢN PHẨM/DỊCH VỤ, hoặc hẹn trực tiếp qua kênh liên hệ đang dùng với khách. Hình thức chính là gọi điện/gặp trực tiếp, không phải nhắn qua lại — vai trò của bạn ở bước này chỉ là chuẩn bị 3-4 câu hỏi gợi ý cho người vận hành dùng trong buổi hẹn (đưa vào cau_hoi_cau_chot/ghi_chu_ai), KHÔNG tự tư vấn thay.
BƯỚC 5 — CHỐT MỞ MÃ: "mở mã" = khách đăng ký gói entry 200k lấy mã thành viên, cam kết bước 1, tách biệt với gói VIP lớn sau.
BƯỚC 6 — CHỐT GÓI: trước khi đưa lộ trình, hỏi LẦN LƯỢT (không dồn 1 lúc) 4 câu: (1) mong thêm thu nhập bao nhiêu/tháng thì xứng đáng, (2) dành được bao nhiêu giờ/tuần, (3) dự tính bao lâu đạt mức đó, (4) nếu chỉ cách đạt đúng con số/thời gian/giờ đó thì có sẵn sàng bắt đầu ngay không. Dựa 4 câu trả lời đưa 2-3 lộ trình theo đúng mức cam kết, chỉ nói giá khi khách đồng ý nghe, không cam kết thu nhập. CÓ (câu 4) → chốt lộ trình + phương thức thanh toán + thời điểm bắt đầu. Còn lăn tăn → quay lại Xử lý phản kháng, không ép chốt ngay.
XỬ LÝ PHẢN KHÁNG (2 nhóm — Nhóm A: nghi ngờ bản thân "không tiền/thời gian/không biết bán hàng/không quen ai"; Nhóm B: nghi ngờ mô hình "có phải đa cấp không/sợ bị lừa"): lắng nghe, phản ánh đúng cảm xúc khách vừa thể hiện → khẳng định đã hiểu đúng băn khoăn → kể chuyện bản thân từng có đúng băn khoăn đó đã vượt qua ra sao (dùng đúng "CÂU CHUYỆN CÁ NHÂN CỦA NGƯỜI VẬN HÀNH" nếu có liên quan, không tự bịa, không cam kết thu nhập/kết quả cụ thể) → hỏi lại nếu chỉ cách vượt qua đúng điều đó thì có muốn thử không. Với Nhóm B: không phòng thủ/tấn công lại — thừa nhận thẳng thắn có nhiều mô hình lừa đảo thật ngoài kia, rồi khác biệt hoá bằng minh chứng cụ thể (pháp lý rõ ràng, kết quả thật của người quen biết, cam kết đồng hành cụ thể).
FOLLOW NẾU CHƯA CHỐT: không lặp lại tư vấn dài dòng thêm lần nữa — mời xem 1 nội dung khác (case mới/sự kiện sắp tới) rồi hẹn ngày giờ follow cụ thể.
LƯU Ý AN TOÀN NHÁNH D: không thúc ép tài chính/VIP khi khách có dấu hiệu áp lực nợ/dòng tiền âm; trình bày trung thực, không cam kết thu nhập cụ thể; không tự chẩn đoán tâm lý khách qua tin nhắn.

KHUNG FORM-HD (chỉ áp dụng khi nhanh="D"): mỗi khách nhánh D cần khai thác dần 6 mục sau qua nhiều lần trò chuyện — không hỏi dồn hết 1 lúc, hỏi tự nhiên đúng chỗ câu chuyện đang dẫn tới (Bước 1/Bước 6 ở trên là nơi tự nhiên nhất), và chỉ ghi vào field khi khách THỰC SỰ có nói tới (không suy đoán):
F — Gia đình: tình trạng hôn nhân, con cái, người phụ thuộc.
O — Occupation/Công việc: đang làm gì, thu nhập hiện tại, thời gian rảnh.
R — Sở thích/Quan hệ: sở thích cá nhân, mối quan hệ xã hội, mạng lưới.
M — Money: khả năng tài chính, mức đầu tư sẵn sàng bỏ ra.
H — Sức khỏe: tình trạng hiện tại, có ảnh hưởng gì tới khả năng làm việc.
D — Desire/Mong muốn: mục tiêu, ước mơ, điều họ đang tìm kiếm.
Field nào chưa khai thác được thì xuất đúng nguyên văn "Chưa có" — TUYỆT ĐỐI không bịa. Field nào hồ sơ cũ đã khai thác được (khác "Chưa có") thì GIỮ NGUYÊN trong output, không ghi đè lại thành "Chưa có" chỉ vì chat lần này không nhắc lại.`;

async function callClaude({ apiKey, contentBlocks }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90000);
  let resp;
  try {
    resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 4000,
        // cache_control trên system — SYSTEM_PROMPT + tool schema (đứng trước system trong thứ tự
        // Anthropic ghép request) giống hệt nhau mỗi lượt, cache lại giảm ~90% chi phí phần đó từ
        // lượt gọi thứ 2 trở đi trong vòng 5 phút — không đổi hành vi, chỉ giảm chi phí.
        system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: contentBlocks }],
        tools: [TOOL_TU_VAN_CRM],
        tool_choice: { type: 'tool', name: TOOL_TU_VAN_CRM.name },
      }),
      signal: controller.signal,
    });
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('AI phản hồi quá lâu (quá 90 giây) — có thể đang quá tải, thử lại giúp mình.');
    throw e;
  } finally {
    clearTimeout(timer);
  }
  if (!resp.ok) throw new Error(`Anthropic API lỗi (${resp.status}): ${await resp.text()}`);
  const data = await resp.json();
  const toolUse = (data.content || []).find((b) => b.type === 'tool_use');
  if (!toolUse) throw new Error('Không nhận được kết quả có cấu trúc từ AI.');
  return toolUse.input;
}

function imageBlockFromDataUrl(dataUrl) {
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl || '');
  if (!m) return null;
  return { type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } };
}

// Gọi PostgREST bằng ĐÚNG token của user (không dùng service role) — RLS "owner_all" tự cho phép
// vì auth.uid() khớp user_id, không cần quyền bỏ qua RLS cho việc ghi dữ liệu của chính họ.
async function supabaseAsUser(token, path, opts = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    return await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      ...opts,
      headers: {
        'content-type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
        Prefer: opts.prefer || 'return=representation',
        ...(opts.headers || {}),
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

const NO_NAME_SENTINEL = 'CHƯA_RÕ_TEN';

function buildContentBlocks({ todayIso, profile, customer, sanPhamDichVu, cauChuyen, note, imgList }) {
  const contentBlocks = [];
  let contextText = `HÔM NAY: ${todayIso}\nLEADER PHỤ TRÁCH: ${(profile && profile.full_name) || '(chưa đặt tên)'}\n`;
  if (customer && (customer.id || customer.ten_khach_hang)) {
    contextText += `\nHỒ SƠ KHÁCH ĐÃ CÓ (nếu đúng người, ghi lại field khach_hang.ten_khach_hang khớp đúng tên này để hệ thống cập nhật thay vì tạo mới):\n${JSON.stringify(customer, null, 2)}\n`;
  } else {
    contextText += `\nCHƯA CÓ HỒ SƠ KHÁCH KHỚP — nếu xác định được tên khách, hệ thống sẽ tạo hồ sơ mới.\n`;
  }
  if (sanPhamDichVu && String(sanPhamDichVu).trim()) {
    contextText += `\nTHÔNG TIN SẢN PHẨM/DỊCH VỤ (chỉ dùng đúng giá/gói trong này, không bịa thêm):\n${sanPhamDichVu.trim()}\n`;
  }
  if (cauChuyen && cauChuyen.nguon === 'cau-chuyen' && cauChuyen.answers) {
    const lines = Object.keys(STORY_QUESTION_LABELS).map((id) => {
      const val = cauChuyen.answers[id] ? String(cauChuyen.answers[id]).trim() : '';
      return val ? `- ${STORY_QUESTION_LABELS[id]}: ${val}` : null;
    }).filter(Boolean);
    if (lines.length) {
      contextText += `\nCÂU CHUYỆN CÁ NHÂN CỦA NGƯỜI VẬN HÀNH (dùng để câu tư vấn gợi ý bám đúng giọng/câu chuyện thật nếu phù hợp, không bắt buộc nhắc mỗi lần):\n${lines.join('\n')}\n`;
    }
  } else if (cauChuyen && cauChuyen.nguon === 'dinh-vi' && cauChuyen.luot1) {
    const cc = cauChuyen.luot1.cau_chuyen_ca_nhan;
    if (cc && cc.cau_chuyen) {
      contextText += `\nCÂU CHUYỆN CÁ NHÂN CỦA NGƯỜI VẬN HÀNH (từ hồ sơ Định Vị AI — dùng để câu tư vấn gợi ý bám đúng giọng/câu chuyện thật nếu phù hợp, không bắt buộc nhắc mỗi lần):\n${cc.cau_chuyen}\n`;
    }
  }
  if (note && note.trim()) contextText += `\nMÔ TẢ/GHI CHÚ THÊM TỪ NGƯỜI VẬN HÀNH: ${note.trim()}\n`;
  contentBlocks.push({ type: 'text', text: contextText });
  imgList.forEach((dataUrl) => {
    const block = imageBlockFromDataUrl(dataUrl);
    if (block) contentBlocks.push(block);
  });
  return contentBlocks;
}

// Khớp hồ sơ khách theo ĐÚNG tên (không phân biệt hoa/thường), scoped theo user — trả về mảng để gọi
// nơi dùng tự quyết định theo số lượng khớp (0 = tạo mới, 1 = cập nhật, >1 = không tự đoán, xem dưới).
async function findCustomersByName(token, userId, name) {
  const resp = await supabaseAsUser(token, `crm_customers?user_id=eq.${userId}&ten_khach_hang=ilike.${encodeURIComponent(name)}&select=*`);
  return resp.ok ? await resp.json() : [];
}

async function fetchRecentInteractions(token, customerId) {
  const resp = await supabaseAsUser(token, `crm_interactions?customer_id=eq.${customerId}&select=thoi_gian,noi_dung,ket_qua,buoc_tiep_theo&order=created_at.desc&limit=3`);
  return resp.ok ? await resp.json() : [];
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '') : null;

  const user = await requireUser(req);
  if (!user || !token) { res.status(401).json({ error: 'Bạn cần đăng nhập để dùng tính năng này.' }); return; }

  // Gate riêng sản phẩm này — không đụng has_paid/access_until (Xây Nhân Hiệu) hay hệ trial-quota.
  const profResp = await supabaseAsUser(token, `profiles?id=eq.${user.id}&select=crm_has_paid,crm_access_until,full_name`);
  const profRows = profResp.ok ? await profResp.json() : [];
  const profile = profRows[0];
  const isActive = profile && profile.crm_has_paid && profile.crm_access_until && new Date(profile.crm_access_until).getTime() > Date.now();
  if (!isActive) {
    res.status(402).json({ error: 'Gói của bạn chưa kích hoạt hoặc đã hết hạn — vào mục "Nâng Cấp" để tiếp tục dùng.', needsUpgrade: true });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'Server chưa được cấu hình ANTHROPIC_API_KEY.' }); return; }

  try {
    const { images, note, manual_ten_khach_hang, known_customer_id, san_pham_dich_vu, cau_chuyen } = req.body || {};
    const imgList = Array.isArray(images) ? images : (images ? [images] : []);
    if (!imgList.length && !(note && note.trim())) {
      res.status(400).json({ error: 'Cần ít nhất 1 ảnh chụp chat hoặc mô tả tình huống.' });
      return;
    }

    const todayIso = new Date().toISOString().slice(0, 10);
    let customer = null; // hồ sơ khách đã khớp (nếu có) — để trống nghĩa là sẽ tạo hồ sơ mới
    let ambiguousNameNote = null;

    // Đang tiếp tục 1 khách đã mở trong phiên trước (client tự "ghim" sau lượt trước, xem tu-van.js)
    // — dùng LUÔN hồ sơ này làm ngữ cảnh, chỉ 1 lượt gọi Claude duy nhất, không cần đoán lại từ đầu.
    let pinnedCustomer = null;
    if (known_customer_id) {
      const resp = await supabaseAsUser(token, `crm_customers?id=eq.${known_customer_id}&user_id=eq.${user.id}&select=*`);
      const rows = resp.ok ? await resp.json() : [];
      if (rows[0]) pinnedCustomer = { ...rows[0], lich_su_gan_day: await fetchRecentInteractions(token, rows[0].id) };
    }

    const nameHint = manual_ten_khach_hang && manual_ten_khach_hang.trim() ? manual_ten_khach_hang.trim() : null;
    let contextCustomer = pinnedCustomer;
    if (!contextCustomer && nameHint) {
      // Người vận hành vừa gõ bổ sung tên sau khi AI báo không đọc được — khớp trước để gọi Claude
      // CÓ SẴN hồ sơ cũ ngay từ đầu (không cần gọi 2 lần).
      const matches = await findCustomersByName(token, user.id, nameHint);
      if (matches.length === 1) contextCustomer = { ...matches[0], lich_su_gan_day: await fetchRecentInteractions(token, matches[0].id) };
    }

    // LUÔN chỉ 1 lượt gọi Claude — không có chuyện gọi lại lần 2 để "lấy đủ ngữ cảnh", vì mỗi lượt
    // gọi đều tốn tiền thật; phần cộng dồn mảng (nhom_nhu_cau/rao_can) làm THẲNG bằng code bên dưới,
    // không phụ thuộc AI có thấy hồ sơ cũ hay không (an toàn hơn, rẻ hơn — chị Quỳnh phản hồi 2026-08-29:
    // 1 khách nhắn nhiều lượt trong 1 buổi, gọi Claude 2 lần/lượt sẽ tốn gấp đôi không cần thiết).
    const contentBlocks = buildContentBlocks({ todayIso, profile, customer: contextCustomer, sanPhamDichVu: san_pham_dich_vu, cauChuyen: cau_chuyen, note, imgList });
    const result = await callClaude({ apiKey, contentBlocks });
    let extractedName = (result.khach_hang.ten_khach_hang || '').trim();

    if (nameHint) {
      result.khach_hang.ten_khach_hang = nameHint; // giữ đúng tên người dùng vừa xác nhận, không để AI viết lệch đi
      customer = contextCustomer;
    } else if (pinnedCustomer) {
      const sameAsPinned = !extractedName || extractedName === NO_NAME_SENTINEL
        || extractedName.toLowerCase() === pinnedCustomer.ten_khach_hang.trim().toLowerCase();
      if (sameAsPinned) {
        result.khach_hang.ten_khach_hang = pinnedCustomer.ten_khach_hang;
        customer = pinnedCustomer;
      } else {
        // Ảnh lần này rõ ràng là 1 người KHÁC với khách đang ghim (chị Quỳnh gửi nhầm/đổi khách giữa
        // chừng) — không dùng ngữ cảnh vừa gọi để cộng dồn nhầm, tìm lại đúng khách theo tên mới đọc.
        const matches = await findCustomersByName(token, user.id, extractedName);
        if (matches.length === 1) customer = { ...matches[0], lich_su_gan_day: await fetchRecentInteractions(token, matches[0].id) };
        else if (matches.length > 1) ambiguousNameNote = `[Lưu ý: có ${matches.length} khách trùng tên "${extractedName}" trong hồ sơ — kiểm tra lại thủ công để tránh tạo trùng.]`;
      }
    } else if (!extractedName || extractedName === NO_NAME_SENTINEL) {
      // Không đọc được tên nào và cũng chưa ghim khách nào trước đó — hỏi lại người vận hành, CHƯA
      // ghi gì vào CRM (đợi tên rồi mới ghi 1 lần, không tính thêm lượt gọi Claude nào nữa).
      res.status(200).json({ needsName: true });
      return;
    } else {
      const matches = await findCustomersByName(token, user.id, extractedName);
      if (matches.length === 1) customer = { ...matches[0], lich_su_gan_day: await fetchRecentInteractions(token, matches[0].id) };
      else if (matches.length > 1) {
        // Nhiều khách trùng tên — không tự đoán khách nào đúng (nguyên tắc "không tự gộp khách nếu
        // chưa chắc"), tạo hồ sơ mới và nêu rõ để người vận hành tự kiểm tra/gộp tay nếu cần.
        ambiguousNameNote = `[Lưu ý: có ${matches.length} khách trùng tên "${extractedName}" trong hồ sơ — kiểm tra lại thủ công để tránh tạo trùng.]`;
      }
    }

    if (ambiguousNameNote) {
      result.khach_hang.ghi_chu_ai = result.khach_hang.ghi_chu_ai
        ? `${result.khach_hang.ghi_chu_ai} ${ambiguousNameNote}` : ambiguousNameNote;
    }

    // Cộng dồn mảng BẰNG CODE (không nhờ AI) — đúng dù lượt gọi vừa rồi có/không có hồ sơ cũ làm ngữ
    // cảnh (VD nhánh "đổi khách" ở trên không kịp truyền hồ sơ cũ vào lượt gọi), luôn giữ đủ dữ liệu.
    if (customer) {
      const union = (a, b) => Array.from(new Set([...(a || []), ...(b || [])]));
      result.khach_hang.nhom_nhu_cau = union(customer.nhom_nhu_cau, result.khach_hang.nhom_nhu_cau);
      result.khach_hang.rao_can = union(customer.rao_can, result.khach_hang.rao_can);
    }

    // Ghi CRM — cập nhật nếu khớp hồ sơ cũ, ngược lại tạo mới. lan_tuong_tac_cuoi/ngay_follow_tiep
    // LUÔN set cùng lúc (đúng nguyên tắc gốc: 2 field này Lark Automation dùng để tự nhắc lịch).
    const customerPayload = {
      ...result.khach_hang,
      // AI chỉ điền leader_phu_trach nếu hồ sơ cũ đã có/chat nêu rõ — hồ sơ MỚI thì mặc định là chính
      // người đang dùng app (đúng thực tế: người thao tác app cũng là người phụ trách khách này).
      leader_phu_trach: result.khach_hang.leader_phu_trach || (customer && customer.leader_phu_trach) || (profile && profile.full_name) || null,
      // nhanh xác định lại mỗi lần tư vấn (dùng đúng phân loại của lượt này); form_hd chỉ AI xuất khi
      // nhanh="D" — giữ lại form_hd cũ nếu lượt này không phải nhánh D/AI không xuất gì mới, tránh mất
      // dữ liệu FORM-HD đã khai thác được từ trước.
      nhanh: result.nhanh || (customer && customer.nhanh) || null,
      form_hd: result.khach_hang.form_hd || (customer && customer.form_hd) || null,
      lan_tuong_tac_cuoi: todayIso,
      ngay_follow_tiep: result.ngay_follow_tiep || null,
      user_id: user.id,
    };

    let savedCustomer;
    if (customer && customer.id) {
      const upd = await supabaseAsUser(token, `crm_customers?id=eq.${customer.id}&user_id=eq.${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify(customerPayload),
      });
      const rows = upd.ok ? await upd.json() : [];
      savedCustomer = rows[0];
    } else {
      const ins = await supabaseAsUser(token, 'crm_customers', {
        method: 'POST',
        body: JSON.stringify(customerPayload),
      });
      const rows = ins.ok ? await ins.json() : [];
      savedCustomer = rows[0];
    }

    let savedInteraction = null;
    if (savedCustomer) {
      const interactionPayload = {
        customer_id: savedCustomer.id,
        user_id: user.id,
        thoi_gian: todayIso,
        kenh: result.khach_hang.kenh || null,
        ngay_follow_tiep: result.ngay_follow_tiep || null,
        ...result.tuong_tac,
      };
      const insInt = await supabaseAsUser(token, 'crm_interactions', {
        method: 'POST',
        body: JSON.stringify(interactionPayload),
      });
      const rows = insInt.ok ? await insInt.json() : [];
      savedInteraction = rows[0] || null;
    }

    res.status(200).json({ advice: result, customer: savedCustomer || null, interaction: savedInteraction });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Có lỗi xảy ra khi tư vấn.' });
  }
};
