// Màn hình chính: dán ảnh chụp chat với khách + mô tả ngắn → AI tư vấn câu hỏi/câu chốt dùng ngay,
// đồng thời TỰ ghi vào crm_customers/crm_interactions (xem api/crm-tuvan.js) — không cần qua Lark.
(function(){
const DRAFT_KEY = 'tu-van';
const CONTEXT_DRAFT_KEY = 'tu-van-san-pham'; // riêng, KHÔNG bị xoá sau mỗi lần tư vấn (bối cảnh lâu dài)
// Tăng từ 5 lên 10 (chị Quỳnh yêu cầu 2026-08-29) — gộp nhiều tin nhắn/ảnh rồi gửi 1 lần thay vì
// mỗi tin 1 lần bấm giúp giảm chi phí thật (phần đắt nhất mỗi lượt là AI soạn kết quả, không phải
// đọc ảnh — gộp 10 ảnh vào 1 lượt chỉ soạn kết quả 1 lần thay vì 10 lần).
const MAX_IMAGES = 10;

// Sổ tay tư vấn theo từng nhánh (chị Quỳnh chốt 2026-08-30: mỗi bước cần có sẵn CÂU VÍ DỤ CỤ THỂ để
// copy gửi thẳng, không chỉ tóm tắt ý — bấm vào từng bước mới xoè ra câu ví dụ, gọn khi chưa cần).
// KHÔNG gọi AI cho các câu này — nội dung tĩnh, tự soạn 1 lần dùng lại nhiều lần, AI chỉ bắt đầu tính
// lượt từ khi khách đã trả lời và có ảnh/nội dung thật để phân tích.
// Bản 3 (2026-08-30, chị Quỳnh chốt: "mở đầu và kể chuyện & chốt nằm TRONG mục giảm mỡ/sức khỏe
// khác luôn, chỉ chia 2 trường hợp thôi, mỗi trường hợp cần cụ thể ra") — nhánh A chỉ còn ĐÚNG 2
// nhóm, mỗi nhóm là 1 QUY TRÌNH ĐẦY ĐỦ từ mở đầu → chẩn đoán → kể chuyện → chốt, viết riêng theo
// đúng ngữ cảnh case đó (không dùng chung 1 bước mở đầu/chốt trừu tượng cho cả 2 case nữa).
// dynamic:'story' → câu chuyện thật của người vận hành (storyStepContent); dynamic:'case' → case
// study đã lưu ở Kho Case Study lọc đúng nhóm (caseStepContent); dynamic:'gia' → đọc thẳng mục
// "Thông tin sản phẩm/dịch vụ" đã dán ở trên thay vì mẫu giá chung chung (giaStepContent).
const NHANH_GUIDES = {
  A: { label:'A — Sức khỏe', groups: [
    { key:'giam-mo', label:'Giảm cân / giảm mỡ', caseNhom:'giam-mo', steps:[
      { title:'1. Mở đầu — khách nói muốn giảm cân/giảm mỡ', example:'Dạ em hiểu cảm giác đó ạ, để em hỏi thêm vài thông tin để tư vấn đúng cho mình nhé.',
        tip:'Luôn xác nhận đã nghe trước khi hỏi tiếp — khách cảm thấy được lắng nghe sẽ trả lời chi tiết hơn ở các bước sau.' },
      { title:'2. Nếu khách hỏi giá ngay (chưa nói số đo/mục tiêu)', example:'Dạ để tư vấn đúng gói phù hợp, chị cho em hỏi thêm chút được không ạ — chị hiện đang cao mét bao nhiêu, nặng bao nhiêu ký, và muốn giảm về khoảng bao nhiêu ạ?',
        tip:'QUAN TRỌNG: không báo giá khi chưa biết số đo/mục tiêu — luôn quay lại hỏi đủ các câu chẩn đoán bên dưới trước, giá chỉ chốt ở bước cuối cùng của quy trình này.' },
      { title:'3. Chiều cao/cân nặng', example:'Chị hiện đang cao mét bao nhiêu và nặng bao nhiêu ký ạ?',
        tip:'Chờ khách trả lời xong mới hỏi tiếp — không dồn nhiều câu 1 lúc.' },
      { title:'4. % mỡ hiện tại/mục tiêu (gửi kèm bảng % mỡ)', example:'Chị xem giúp em mình đang giống hình nào trong bảng này, khoảng bao nhiêu % mỡ ạ? Và chị muốn giảm về còn khoảng bao nhiêu % ạ?',
        tip:'Nhớ gửi kèm ảnh bảng % mỡ tham chiếu trước khi hỏi — khách nhìn hình dễ trả lời chính xác hơn là tự ước lượng bằng lời.' },
      { title:'5. Đã dùng phương pháp gì', example:'Chị đã từng dùng phương pháp nào để giảm chưa ạ? Hiệu quả như nào ạ?',
        tip:'Câu trả lời ở đây chính là "rào cản"/"giải pháp cũ thất bại" — dùng lại đúng nguyên văn khi phân tích hệ quả ở bước sau.' },
      { title:'6. Ảnh hưởng thế nào', example:'Việc này đang ảnh hưởng thế nào đến sức khỏe/sự tự tin/công việc của chị ạ?',
        tip:'Đây là câu quan trọng nhất để tìm "nỗi đau" thật — nếu khách trả lời hời hợt, hỏi thêm 1 câu cụ thể hơn dựa đúng ý khách vừa nói, đừng chuyển bước vội.' },
      { title:'7. Xác nhận lại vấn đề + mong muốn', example:'Vậy là chị đang muốn giảm về khoảng [% mỡ/cân nặng mục tiêu chị vừa nói] để [đúng mong muốn chị vừa nói ở bước ảnh hưởng], đúng không ạ?',
        tip:'Dùng đúng từ ngữ/con số khách đã cho (không diễn giải lại theo ý mình) — khách sẽ thấy được hiểu đúng, dễ đồng ý tiếp.' },
      { title:'8. Phân tích hệ quả nếu giữ cách cũ', example:'Nếu chị vẫn tiếp tục theo cách cũ mà mình vừa chia sẻ là chưa hiệu quả, thì mỡ/cân nặng khó tự giảm, để lâu có khi còn ảnh hưởng thêm đến [đúng điều chị đã nói ở bước ảnh hưởng] đó ạ.',
        tip:'Chỉ dựa đúng điều khách vừa kể — không phóng đại/doạ dẫm, giữ giọng quan tâm thật lòng.' },
      { title:'9. Kể chuyện bản thân', dynamic:'story',
        fallback:'(Kể chuyện thật của mình: trước đây thế nào → từng khó chịu/mệt mỏi gì giống chị → giải pháp đã giúp mình ra sao → kết quả hiện tại — rồi bắc cầu "Nếu [giải pháp]... thì mình có muốn tìm hiểu cùng em không?")' },
      { title:'10. Gửi case tương tự', dynamic:'case',
        fallback:'Chị xem giúp em case của [tên khách cũ] này — cũng từng [đúng vấn đề giống chị] và đã cải thiện được sau [thời gian] ạ.',
        tip:'Chọn case có số đo/mục tiêu GẦN GIỐNG khách nhất — càng giống càng thuyết phục.' },
      { title:'11. Chốt giá', dynamic:'gia' },
      { title:'12. Hỏi thẳng chốt', example:'Nếu em có giải pháp giúp chị giảm về đúng mức chị mong muốn thì chị có muốn đồng hành cùng em không ạ?' },
    ] },
    { key:'suc-khoe-khac', label:'Vấn đề sức khỏe khác', caseNhom:'suc-khoe-khac', steps:[
      { title:'1. Mở đầu — khách đã nói rõ vấn đề (VD "em mất ngủ")', example:'Dạ em hiểu cảm giác đó ạ, để em hỏi thêm vài thông tin để tư vấn đúng cho mình nhé.',
        tip:'Luôn xác nhận đã nghe trước khi hỏi tiếp — khách cảm thấy được lắng nghe sẽ trả lời chi tiết hơn ở các bước sau.' },
      { title:'1b. Hoặc khách chỉ chào hỏi chung chung, chưa rõ vấn đề gì', example:'Dạ chào chị/anh, không biết mình đang quan tâm về giảm cân, cải thiện sức khỏe hay vấn đề gì cụ thể để em tư vấn đúng ạ?',
        tip:'Hỏi mở nhưng có gợi ý sẵn 2 hướng để khách dễ trả lời hơn là hỏi trống "có nhu cầu gì" — nếu khách chọn hướng giảm cân/mỡ thì chuyển sang nhóm "Giảm cân / giảm mỡ".' },
      { title:'2. Nếu khách hỏi giá ngay (chưa nói vấn đề gì)', example:'Dạ để tư vấn đúng giải pháp phù hợp, chị cho em hỏi thêm chút được không ạ — chị đang gặp vấn đề gì về sức khỏe cần cải thiện ạ?',
        tip:'QUAN TRỌNG: không báo giá khi chưa biết vấn đề gì — luôn quay lại hỏi đủ các câu chẩn đoán bên dưới trước, giá chỉ chốt ở bước cuối cùng của quy trình này.' },
      { title:'3. Vấn đề gì', example:'Chị đang gặp vấn đề gì về sức khỏe cần em hỗ trợ ạ?' },
      { title:'4. Bao lâu rồi', example:'Tình trạng đó diễn ra bao lâu rồi ạ?',
        tip:'Càng lâu càng cho thấy khách đã "chịu đựng" nhiều — dùng chi tiết này khi phân tích hệ quả ở bước sau.' },
      { title:'5. Ảnh hưởng cuộc sống', example:'Ảnh hưởng như nào đến cuộc sống của chị ạ (công việc/giấc ngủ/tâm trạng...)?' },
      { title:'6. Đã dùng phương pháp gì', example:'Chị đã dùng phương pháp nào để cải thiện tình trạng này chưa ạ?' },
      { title:'7. Hiệu quả sao', example:'Nếu có thì chị thấy hiệu quả như nào ạ?',
        tip:'Nếu khách nói "chưa hiệu quả" hoặc "chưa thử gì" — đây chính là chỗ mở đường tự nhiên để giới thiệu giải pháp ở bước sau.' },
      { title:'8. Xác nhận lại vấn đề + mong muốn', example:'Vậy là chị đang muốn [đúng mục tiêu chị vừa nói] để [đúng mong muốn chị vừa nói], đúng không ạ?',
        tip:'Dùng đúng từ ngữ khách đã dùng (không diễn giải lại theo ý mình) — khách sẽ thấy được hiểu đúng, dễ đồng ý tiếp.' },
      { title:'9. Phân tích hệ quả nếu giữ cách cũ', example:'Nếu chị vẫn tiếp tục theo cách cũ mà mình vừa chia sẻ là chưa hiệu quả, thì tình trạng này khó tự cải thiện, để lâu có khi còn ảnh hưởng thêm đến [đúng điều chị đã nói ở bước ảnh hưởng cuộc sống] đó ạ.',
        tip:'Chỉ dựa đúng điều khách vừa kể — không phóng đại/doạ dẫm, giữ giọng quan tâm thật lòng.' },
      { title:'10. Kể chuyện bản thân', dynamic:'story',
        fallback:'(Kể chuyện thật của mình: trước đây thế nào → từng khó chịu/mệt mỏi gì giống chị → giải pháp đã giúp mình ra sao → kết quả hiện tại — rồi bắc cầu "Nếu [giải pháp]... thì mình có muốn tìm hiểu cùng em không?")' },
      { title:'11. Gửi case tương tự', dynamic:'case',
        fallback:'Chị xem giúp em case của [tên khách cũ] này — cũng từng [đúng vấn đề giống chị] và đã cải thiện được sau [thời gian] ạ.',
        tip:'Chọn case có vấn đề/hoàn cảnh GẦN GIỐNG khách nhất — càng giống càng thuyết phục.' },
      { title:'12. Chốt giá', dynamic:'gia' },
      { title:'13. Hỏi thẳng chốt', example:'Nếu em có giải pháp giúp chị [đúng điều chị mong muốn ở bước xác nhận] thì chị có muốn đồng hành cùng em không ạ?' },
    ] },
  ] },
  D: { label:'D — Kinh doanh/Đối tác', groups: [
    { key:'sang-loc', label:'Sàng lọc & mở đầu', steps:[
      { title:'Bước 1 — Sàng lọc khách MỚI (bắt buộc nguyên văn, chỉ đổi xưng hô)',
        example:'Cảm ơn c đã chủ động nhắn cho e nhé. Để e hiểu rõ hơn rồi định hướng đúng cho c, c chia sẻ thêm vài thông tin nha:\n1. Hiện tại c đang làm công việc gì?\n2. Thu nhập trung bình 1 tháng của c đang ở mức khoảng bao nhiêu? Hiện c có tích luỹ được chứ?\n3. Mục tiêu tài chính của c trong 6–12 tháng tới là gì? Muốn tăng thêm bao nhiêu thu nhập mỗi tháng?\n4. C đang quan tâm phát triển nguồn thu theo hướng nào: online, chăm sóc sức khỏe, hay xây hệ thống lâu dài?\nE hỏi kỹ để xem c phù hợp với mô hình nào nhất — vì team của e đang làm trong ngành chăm sóc sức khỏe & đào tạo phát triển con người, có quy trình rõ ràng, hỗ trợ từng bước, ai mới vào cũng làm được nè',
        tip:'Gửi NGUYÊN VĂN 4 câu hỏi cùng lúc trong 1 tin — đây là bộ câu hỏi sàng lọc chuẩn, không rút gọn. Chờ khách trả lời đủ rồi mới sang nhóm "Khai thác nỗi đau".' },
    ] },
    { key:'khai-thac', label:'Khai thác nỗi đau (6 lớp)', steps:[
      { title:'Lớp 1 — Nghe cảm xúc', example:'Nghe c nói vậy em hiểu c đang khá [đúng cảm xúc chị vừa thể hiện, VD "lo lắng"/"mệt mỏi"] về chuyện này ạ.',
        tip:'Gọi đúng tên cảm xúc khách đang thể hiện (qua lời văn/emoji) — không đoán bừa, không dùng cảm xúc chung chung như "vất vả".' },
      { title:'Lớp 2 — Đào lý do đằng sau con số', example:'C muốn có thêm khoản đó để làm gì ạ, cho gia đình hay cho riêng c vậy ạ?',
        tip:'Mục tiêu là tìm ra ĐỘNG LỰC THẬT đằng sau con số thu nhập (VD: lo cho con, tự do tài chính, trả nợ) — đây sẽ là "lý do làm" (WHY) dùng lại xuyên suốt quá trình huấn luyện nếu c trở thành đối tác.' },
      { title:'Lớp 3 — Khen sự chủ động', example:'Em thấy c chịu ngồi lại nhìn thẳng vào vấn đề như này là rất chủ động rồi đó ạ.',
        tip:'Câu ngắn, thật lòng — không sáo rỗng, đặt ngay sau khi khách vừa chia sẻ điều riêng tư ở Lớp 2.' },
      { title:'Lớp 4 — Kể chuyện bản thân (viết dài đủ cảm xúc)', dynamic:'story',
        fallback:'(Kể đủ dài: nền tảng trước đây → điều từng bất lực/khó chịu giống c → giải pháp đã "cứu" mình ra sao → kết quả/cảm nhận hiện tại — giữ tinh thần "mình cũng từng như vậy")' },
      { title:'Lớp 5 — Vẽ nỗi đau', example:'Với công việc/thu nhập hiện tại như c vừa kể, mỗi tháng c đang phải đánh đổi khá nhiều thời gian mà vẫn chưa đạt được [đúng mục tiêu c vừa nói ở Lớp 2] đúng không ạ? Nếu cứ tiếp tục vậy thì [thời gian/sức khỏe/tự do] của c sẽ còn bị ảnh hưởng thêm đó.',
        tip:'Dựa ĐÚNG công việc/thu nhập/mục tiêu khách vừa kể ở Bước 1 và Lớp 2 — không dùng câu chung chung, càng cụ thể càng chạm đúng nỗi đau.' },
      { title:'Lớp 6 — Vẽ viễn cảnh', example:'Nhưng nếu c có thêm 1 nguồn thu nhập ổn định song song, không ảnh hưởng công việc hiện tại, thì c nghĩ cuộc sống của c và gia đình sẽ khác đi thế nào ạ?',
        tip:'Nối ngay sau Lớp 5, đảo từ "nỗi đau" sang "viễn cảnh tốt đẹp" — để khách tự hình dung và tự trả lời, không thay khách trả lời.' },
      { title:'CTA — Mời Guide', example:'Em có 1 Guide "Tìm Hiểu Kinh Doanh" có bài test tài chính 10 phút với cả video tầm nhìn của bên em nữa, c xem thử không ạ?',
        tip:'Chỉ mời Guide SAU KHI đã đi hết Lớp 1-6 — mời quá sớm khi chưa đủ cảm xúc thường bị từ chối hoặc xem cho có.' },
    ] },
    { key:'guide-follow', label:'Gửi Guide & follow', steps:[
      { title:'Xin hẹn giờ TRƯỚC khi gửi Guide', example:'Nếu em gửi Guide, c dành thời gian nghiêm túc vào [tối nay/mai] xem được không ạ?',
        tip:'Luôn xin cam kết thời gian cụ thể trước khi gửi — tăng tỷ lệ khách thực sự xem thay vì để đó quên mất.' },
      { title:'Follow sau khi gửi Guide', example:'C xem/làm xong Guide em gửi chưa ạ?',
        tip:'Follow đúng đúng thời điểm c đã hẹn ở bước trên — quá sớm thì c chưa xem, quá muộn thì c quên mất cảm xúc lúc mời.' },
      { title:'Nếu c chưa xem/quên', example:'Dạ không sao ạ, c tranh thủ xem giúp em vào [thời điểm mới] nha, xem xong có gì thắc mắc c cứ hỏi em liền ạ.',
        tip:'Nhắc nhẹ nhàng, không tạo áp lực — hẹn lại đúng 1 mốc thời gian mới, tránh để trôi không hẹn lại.' },
    ] },
    { key:'chot-goi', label:'Chốt gói', steps:[
      { title:'Câu hỏi 1/4 — mức thu nhập mong muốn', example:'Nếu bắt đầu, c mong có thêm thu nhập khoảng bao nhiêu/tháng thì xứng đáng với thời gian mình bỏ ra ạ?' },
      { title:'Câu hỏi 2/4 — thời gian có thể dành ra', example:'C có thể dành ra bao nhiêu giờ mỗi tuần cho việc này ạ?' },
      { title:'Câu hỏi 3/4 — thời hạn mong muốn đạt được', example:'C dự tính làm trong khoảng bao lâu để đạt được mức đó ạ?' },
      { title:'Câu hỏi 4/4 — chốt thẳng', example:'Nếu em chỉ cho c cách đạt đúng con số đó, trong đúng khoảng thời gian đó, với đúng số giờ đó mỗi tuần — c có sẵn sàng bắt đầu ngay không ạ?',
        tip:'Dùng ĐÚNG 3 con số c vừa trả lời ở câu 1-3 ghép vào câu hỏi này — càng khớp đúng lời c nói càng khó từ chối vì đó chính là điều c vừa tự xác nhận.' },
    ] },
  ] },
};

// Bước kể chuyện cần DÙNG THẬT câu chuyện của người vận hành thay vì placeholder chung chung (chị
// Quỳnh yêu cầu 2026-08-30) — ưu tiên free_story (tự viết) > trích các câu trả lời wizard liên quan
// nhất (q1/q6/q20) > nếu chưa có gì thì trả về null để UI hiện lời mời đi điền "Câu Chuyện Của Bạn".
function storyStepContent(cauChuyen){
  if(!cauChuyen || cauChuyen.nguon !== 'cau-chuyen') return null;
  if(cauChuyen.free_story && cauChuyen.free_story.trim()) return cauChuyen.free_story.trim();
  const a = cauChuyen.answers || {};
  const parts = [a.q1, a.q6, a.q20].map(v => (v||'').trim()).filter(Boolean);
  return parts.length ? parts.join('\n\n') : null;
}

// Bước "gửi case tương tự" lấy ĐÚNG case đã lưu ở Kho Case Study (js/case-study.js), lọc theo đúng
// nhóm của group đang xem (giam-mo/suc-khoe-khac) — lấy case MỚI lưu nhất nếu có nhiều case cùng
// nhóm. Trả về null nếu chưa có case nào thuộc nhóm này để UI mời đi thêm case.
function caseStepContent(caseStudies, nhom){
  const matches = (caseStudies || []).filter(c => c.nhom === nhom);
  if(!matches.length) return null;
  const c = matches[0];
  return { text: `Chị xem giúp em case của ${c.tieu_de || 'một khách cũ'} này ạ:\n${c.noi_dung}`, images: c.hinh_anh || [] };
}

// Bước "chốt giá" đọc thẳng mục "Thông tin sản phẩm/dịch vụ" đã dán ở trên (chị Quỳnh chốt
// 2026-08-30: "phần chốt giá dựa vào mục thông tin sản phẩm dịch vụ") thay vì mẫu 3 mức chung chung.
function giaStepContent(sanPhamText){
  if(!sanPhamText || !sanPhamText.trim()) return null;
  return `Dựa theo nhu cầu của chị, bên em có các lựa chọn sau ạ:\n${sanPhamText.trim()}\nChị xem mức nào phù hợp với mình ạ?`;
}

// Hướng dẫn spotlight (2026-08-30, chị Quỳnh chốt "kiểu hướng dẫn như web xây nhân hiệu á") — bấm
// "❓ Hướng dẫn" ở đầu trang trỏ lần lượt từng phần tử thật trên trang này (xem js/page-tour.js).
// Chỉ trỏ tới phần tử LUÔN CÓ SẴN lúc mới vào trang (chưa chọn nhánh/chưa có khách ghim) để tour
// không bị "gãy" giữa chừng vì phần tử điều kiện chưa render.
const TOUR_STEPS = [
  { selector: '[data-toggle-sanpham]', title: 'Thông tin sản phẩm/dịch vụ', text: 'Bấm vào đây dán tên gói/giá/link trước khi tư vấn — AI chỉ dùng đúng thông tin ở đây khi chốt giá, không tự bịa số.' },
  { selector: '[data-pick-guide-nhanh]', title: 'Sổ tay tư vấn', text: 'Khách mới nhắn tới — chọn nhánh A (Sức khỏe) hoặc D (Kinh doanh) rồi chọn đúng tình huống để xem từng bước tư vấn kèm câu ví dụ, copy gửi thẳng cho khách. Việc này KHÔNG tốn lượt AI.' },
  { selector: '#tv-file-label', title: 'Ảnh chụp đoạn chat', text: 'Sau khi nhắn qua lại đủ theo sổ tay, chụp gộp cả đoạn chat (tối đa 10 ảnh) rồi gửi 1 lần — đỡ tốn lượt hơn hẳn gửi từng ảnh.' },
  { selector: '#tv-note', title: 'Mô tả/ghi chú thêm', text: 'Không có ảnh cũng được — gõ mô tả nhanh tình huống, AI vẫn đọc và tư vấn được.' },
  { selector: '#tv-submit', title: 'Tư vấn ngay', text: 'AI đọc ảnh/mô tả, tự lưu vào hồ sơ khách trong Khách Hàng (tạo mới hoặc cập nhật) và gợi ý câu nên nhắn tiếp theo.' },
];

function render(container, ctx){
  const state = {
    images: [], note: '',
    sanPhamText: '', showSanPham: false, cauChuyen: null, caseStudies: [], submitting: false, result: null, error: '',
    // AI tự đọc tên khách từ ảnh/mô tả rồi server tự khớp/tạo hồ sơ — không cần gõ/tìm tay nữa
    // (chị Quỳnh yêu cầu 2026-08-29: 1 khách nhắn nhiều lượt, mỗi lượt lại chụp ảnh gửi, gõ tên mỗi
    // lần quá mất công). needsName chỉ bật khi AI THẬT SỰ không đọc được tên nào (xem api/crm-tuvan.js).
    needsName: false, manualName: '',
    // "Ghim" khách đang tiếp tục trong phiên này — gửi known_customer_id ở lượt sau để server chỉ cần
    // GỌI CLAUDE ĐÚNG 1 LẦN có sẵn ngữ cảnh, thay vì phải tự đoán lại từ đầu mỗi ảnh (đỡ tốn gấp đôi
    // lượt AI khi nhắn nhiều tin liên tiếp cho cùng 1 khách — chị Quỳnh phản hồi 2026-08-29).
    activeCustomer: null,
    // Sổ tay tư vấn (2026-08-30): chọn nhánh → chọn nhóm con (VD "Giảm mỡ") → xem danh sách bước →
    // bấm 1 bước mới xoè ra câu ví dụ để copy, không hiện tràn hết cùng lúc. expandedSteps là Set
    // các INDEX bước đang mở (đổi nhóm thì reset về rỗng, tránh giữ index của nhóm cũ không khớp).
    guideNhanh: null, guideGroup: null, expandedSteps: new Set(),
  };

  function draw(){ container.innerHTML = html(); bind(); }

  function currentGuideGroup(){
    const guide = NHANH_GUIDES[state.guideNhanh];
    return guide && guide.groups.find(g => g.key === state.guideGroup);
  }

  function stepExampleText(step, group){
    if(step.dynamic === 'story') return storyStepContent(state.cauChuyen) || step.fallback;
    if(step.dynamic === 'case'){
      const found = caseStepContent(state.caseStudies, group && group.caseNhom);
      return found ? found.text : step.fallback;
    }
    if(step.dynamic === 'gia') return giaStepContent(state.sanPhamText);
    return step.example;
  }

  function copyGuideStep(idx){
    const group = currentGuideGroup();
    const step = group && group.steps[idx];
    if(!step) return;
    navigator.clipboard.writeText(stepExampleText(step, group)).catch(()=>{});
  }

  function persistDraft(){
    saveModuleDraft(ctx, DRAFT_KEY, { images: state.images, note: state.note, activeCustomer: state.activeCustomer });
  }

  function startNewCustomer(){
    state.activeCustomer = null;
    draw();
    persistDraft();
  }

  async function boot(){
    // Ưu tiên hồ sơ "Câu Chuyện Của Bạn" riêng của app này (đúng bộ câu hỏi trên landing page) —
    // chỉ dùng lùi về Định Vị AI (positioning_results, dùng chung Xây Nhân Hiệu) nếu chưa điền hồ sơ
    // riêng (xem cau-chuyen.js — 2 nguồn không bắt buộc cùng lúc).
    const [draft, sanPhamDraft, { data: story }, { data: positioning }, { data: caseStudies }] = await Promise.all([
      loadModuleDraft(ctx, DRAFT_KEY),
      loadModuleDraft(ctx, CONTEXT_DRAFT_KEY),
      ctx.supabase.from('crm_story_profiles').select('*').eq('user_id', ctx.user.id).maybeSingle(),
      ctx.supabase.from('positioning_results').select('luot1').eq('user_id', ctx.user.id).maybeSingle(),
      ctx.supabase.from('crm_case_studies').select('*').eq('user_id', ctx.user.id).order('created_at', { ascending: false }),
    ]);
    if(draft){
      state.images = draft.images || [];
      state.note = draft.note || '';
      state.activeCustomer = draft.activeCustomer || null;
    }
    if(sanPhamDraft && sanPhamDraft.text) state.sanPhamText = sanPhamDraft.text;
    state.caseStudies = caseStudies || [];
    const hasFreeStory = story && story.free_story && String(story.free_story).trim();
    const hasWizardStory = story && story.answers && Object.values(story.answers).some(v=>String(v||'').trim());
    if(hasFreeStory || hasWizardStory) state.cauChuyen = { nguon:'cau-chuyen', ten: story.ten, zalo: story.zalo, links: story.links, answers: story.answers, free_story: story.free_story || '' };
    else if(positioning && positioning.luot1) state.cauChuyen = { nguon:'dinh-vi', luot1: positioning.luot1 };
    else state.cauChuyen = null;
    draw();
  }

  function handleFiles(files){
    Array.from(files).slice(0, MAX_IMAGES - state.images.length).forEach((file)=>{
      const reader = new FileReader();
      reader.onload = ()=>{
        const img = new Image();
        img.onload = ()=>{
          const maxW = 1000;
          const scale = Math.min(1, maxW / img.width);
          const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
          const c = document.createElement('canvas');
          c.width = w; c.height = h;
          c.getContext('2d').drawImage(img, 0, 0, w, h);
          state.images = [...state.images, c.toDataURL('image/jpeg', 0.82)].slice(0, MAX_IMAGES);
          draw();
          persistDraft();
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function removeImage(idx){
    state.images = state.images.filter((_,i)=>i!==idx);
    draw();
    persistDraft();
  }

  async function submit(){
    if(!state.images.length && !state.note.trim()){ return; }
    if(state.needsName && !state.manualName.trim()){ state.error = 'Nhập giúp tên khách hàng.'; draw(); return; }
    state.submitting = true; state.error = ''; state.result = null; draw();
    const stopProgress = animateProgressButton(container.querySelector('#tv-submit'), 14, 'Đang phân tích');
    try{
      const data = await callApi('/api/crm-tuvan', {
        images: state.images,
        note: state.note,
        // KHÔNG còn chọn/tìm khách tay — server tự đọc tên khách hàng từ ảnh/mô tả rồi tự khớp hồ sơ
        // cũ hoặc tạo mới (xem api/crm-tuvan.js). manual_ten_khach_hang chỉ gửi khi AI đã báo không
        // đọc được tên ở lượt trước và người dùng vừa gõ bổ sung.
        manual_ten_khach_hang: state.needsName ? state.manualName.trim() : undefined,
        // Gửi lại đúng khách đang ghim (nếu có) để server chỉ cần 1 lượt gọi Claude, không tốn thêm
        // lượt "đoán lại từ đầu" cho mỗi ảnh trong cùng 1 buổi nhắn với 1 khách.
        known_customer_id: state.activeCustomer ? state.activeCustomer.id : undefined,
        san_pham_dich_vu: state.sanPhamText,
        cau_chuyen: state.cauChuyen,
      }, 110000);
      if(data.needsName){
        state.needsName = true;
        state.error = '';
        return;
      }
      state.result = data;
      state.needsName = false; state.manualName = '';
      state.images = []; state.note = '';
      state.activeCustomer = data.customer ? { id: data.customer.id, ten_khach_hang: data.customer.ten_khach_hang } : null;
      persistDraft();
    } catch(e){
      state.error = e.message;
    } finally {
      stopProgress();
      state.submitting = false;
      draw();
    }
  }

  function copyCauChot(){
    if(!state.result) return;
    navigator.clipboard.writeText(state.result.advice.cau_hoi_cau_chot).catch(()=>{});
  }

  function html(){
    return `
      <span class="tour-trigger" id="tv-start-tour">❓ Hướng dẫn</span>
      <div class="page-head">
        <h1>Tư Vấn AI</h1>
        <p>Dán ảnh chụp đoạn chat với khách (hoặc mô tả nhanh) — AI đọc, tư vấn câu nên nhắn tiếp theo, và tự lưu vào hồ sơ khách.</p>
      </div>

      <div class="section" style="cursor:pointer;" data-toggle-sanpham="1">
        <h3>Thông tin sản phẩm/dịch vụ đang tư vấn ${state.showSanPham?'▾':'▸'}</h3>
        ${!state.showSanPham ? `<div class="body" style="color:var(--ink-soft);font-size:13px;">${state.sanPhamText ? 'Đã có thông tin — bấm để xem/sửa.' : 'Chưa có — bấm để dán tên gói/giá/link (AI chỉ dùng đúng thông tin ở đây, không tự bịa giá).'}</div>` : ''}
      </div>
      ${state.showSanPham ? `
        <div class="card" style="margin-top:-10px;margin-bottom:20px;">
          <textarea id="tv-sanpham" placeholder="VD: Gói Cân Bằng Chuyển Hóa 1 tháng — 20.000.000đ, link: ...&#10;Gói Xây Nhân Hiệu Zoom 6 buổi — 1.990.000đ, link: ...">${esc(state.sanPhamText)}</textarea>
        </div>
      ` : ''}

      ${state.activeCustomer ? `
        <div class="hint-box" style="margin-top:0;margin-bottom:20px;">
          Đang tiếp tục hồ sơ: <b>${esc(state.activeCustomer.ten_khach_hang)}</b>
          <span style="float:right;cursor:pointer;text-decoration:underline;" id="tv-new-customer">Khách mới</span>
        </div>
      ` : `
        <div class="card" style="margin-bottom:20px;">
          <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:10px;">Khách mới nhắn tới — chọn nhánh để xem sổ tay từng bước (không tốn lượt AI)</label>
          <div class="chips" style="margin-top:0;">
            ${Object.keys(NHANH_GUIDES).map(k=>`<div class="chip ${state.guideNhanh===k?'selected':''}" data-pick-guide-nhanh="${k}">${esc(NHANH_GUIDES[k].label)}</div>`).join('')}
          </div>
          ${state.guideNhanh ? `
            <div style="margin-top:14px;">
              <label style="display:block;font-size:12px;font-weight:600;color:var(--ink-soft);margin-bottom:8px;">Chọn đúng tình huống của khách này</label>
              <div class="chips" style="margin-top:0;">
                ${NHANH_GUIDES[state.guideNhanh].groups.map(g=>`<div class="chip ${state.guideGroup===g.key?'selected':''}" data-pick-guide-group="${g.key}">${esc(g.label)}</div>`).join('')}
              </div>
            </div>
          ` : ''}
          ${state.guideNhanh && currentGuideGroup() ? `
            <div style="margin-top:16px;">
              ${currentGuideGroup().steps.map((s,i)=>{
                const group = currentGuideGroup();
                const exampleText = stepExampleText(s, group);
                const isStoryEmpty = s.dynamic === 'story' && !storyStepContent(state.cauChuyen);
                const isCaseEmpty = s.dynamic === 'case' && !caseStepContent(state.caseStudies, group.caseNhom);
                const isGiaEmpty = s.dynamic === 'gia' && !exampleText;
                const caseImages = (s.dynamic === 'case' && !isCaseEmpty) ? caseStepContent(state.caseStudies, group.caseNhom).images : [];
                return `
                <div style="border:1px solid var(--line);border-radius:10px;margin-bottom:8px;overflow:hidden;">
                  <div data-toggle-guide-step="${i}" style="padding:12px 14px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:10px;font-size:13.5px;font-weight:600;color:var(--ink);">
                    <span>${esc(s.title)}</span>
                    <span style="color:var(--ink-soft);flex-shrink:0;">${state.expandedSteps.has(i)?'▾':'▸'}</span>
                  </div>
                  ${state.expandedSteps.has(i) ? `
                    <div style="padding:0 14px 14px;">
                      ${isStoryEmpty ? `
                        <div class="hint-box" style="margin-top:0;">Chưa có dữ liệu câu chuyện của bạn — <a href="#cau-chuyen">vào "Câu Chuyện Của Bạn" điền trước</a> để bước này tự lấy đúng câu chuyện thật khi kể cho khách, đỡ phải nhớ/gõ lại mỗi lần.</div>
                      ` : isCaseEmpty ? `
                        <div class="hint-box" style="margin-top:0;">Chưa có case nào ở nhóm này trong Kho Case Study — <a href="#case-study">vào "Kho Case Study" thêm case</a> (hình + câu chuyện) để bước này tự lấy đúng case thật khi gửi khách.</div>
                      ` : isGiaEmpty ? `
                        <div class="hint-box" style="margin-top:0;">Chưa có "Thông tin sản phẩm/dịch vụ" — cuộn lên đầu trang bấm vào mục đó dán tên gói/giá, bước này sẽ tự lấy đúng giá đó khi chốt, không tự bịa số.</div>
                      ` : `
                        <div class="hint-box" style="white-space:pre-line;margin-top:0;">${esc(exampleText)}</div>
                        ${caseImages.length ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">${caseImages.map(src=>`<img src="${src}" style="width:70px;height:70px;object-fit:cover;border-radius:8px;border:1px solid var(--line);">`).join('')}</div>` : ''}
                        <div class="btn-row" style="justify-content:flex-start;margin-top:8px;">
                          <span class="btn-ghost btn btn-sm" data-copy-guide-step="${i}">Sao chép</span>
                        </div>
                      `}
                      ${s.tip ? `<div style="font-size:12px;color:var(--ink-soft);margin-top:8px;line-height:1.5;">💡 ${esc(s.tip)}</div>` : ''}
                    </div>
                  ` : ''}
                </div>
              `;}).join('')}
              <div style="font-size:11.5px;color:var(--ink-soft);margin-top:10px;">Nhắn qua lại trực tiếp với khách theo đúng các bước trên trước — xong rồi mới chụp gộp cả đoạn (tối đa ${MAX_IMAGES} ảnh) gửi 1 lần cho AI phân tích, không cần gọi AI sau mỗi câu hỏi.</div>
            </div>
          ` : ''}
        </div>
      `}

      <div class="card" style="margin-bottom:20px;">
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:10px;">Ảnh chụp đoạn chat (tối đa ${MAX_IMAGES} ảnh) — gộp nhiều tin lại rồi gửi 1 lần cho đỡ tốn lượt</label>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px;">
          ${state.images.map((src,i)=>`
            <div style="position:relative;width:90px;height:90px;">
              <img src="${src}" data-zoom-img="${i}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;cursor:zoom-in;border:1px solid var(--line);">
              <span data-remove-img="${i}" style="position:absolute;top:-6px;right:-6px;background:var(--danger);color:#fff;width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;cursor:pointer;">✕</span>
            </div>
          `).join('')}
          ${state.images.length<MAX_IMAGES ? `<label id="tv-file-label" style="width:90px;height:90px;border:1px dashed var(--line);border-radius:10px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--ink-soft);font-size:24px;">+<input type="file" accept="image/*" multiple id="tv-file" style="display:none;"></label>` : ''}
        </div>
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:6px;">Mô tả/ghi chú thêm ${state.images.length?'(không bắt buộc nếu đã có ảnh)':''}</label>
        <textarea id="tv-note" placeholder="VD: khách hỏi giá gói 1 tháng, có vẻ đang phân vân...">${esc(state.note)}</textarea>
      </div>

      ${state.needsName ? `
        <div class="card" style="margin-bottom:20px;">
          <div class="hint-box" style="margin-top:0;">AI không đọc được tên khách trong ảnh/mô tả — nhập giúp tên khách hàng để lưu đúng hồ sơ.</div>
          <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 6px;">Tên khách hàng</label>
          <input type="text" id="tv-manual-name" placeholder="VD: Chị Lan" value="${esc(state.manualName)}">
          <div style="font-size:11.5px;color:var(--ink-soft);margin-top:4px;">Mẹo: đặt trùng đúng tên tài khoản Facebook/Zalo khách đang dùng — lần sau gửi ảnh chat, AI sẽ tự khớp thẳng vào hồ sơ này.</div>
        </div>
      ` : ''}

      ${state.error ? `<div class="error-box">${esc(state.error)}</div>` : ''}

      <div class="btn-row" style="justify-content:flex-start;">
        <button class="btn" id="tv-submit" ${state.submitting?'disabled':''}>${state.submitting?'Đang phân tích…':(state.needsName?'Xác nhận tên & tư vấn':'Tư vấn ngay')}</button>
      </div>

      ${state.result ? resultHtml() : ''}
    `;
  }

  function resultHtml(){
    const a = state.result.advice;
    const c = state.result.customer;
    return `
      <div class="page-divider" style="margin:32px 0 20px;"></div>
      <div class="section highlight">
        <h3>Câu nên nhắn ngay</h3>
        <div class="body" style="font-size:16px;font-weight:600;">${esc(a.cau_hoi_cau_chot)}</div>
        <div class="btn-row" style="justify-content:flex-start;margin-top:14px;">
          <span class="btn-ghost btn btn-sm" id="tv-copy">Sao chép</span>
        </div>
      </div>
      <div class="section">
        <h3>Phân tích</h3>
        <div class="body">
          <b>${esc(a.tom_tat)}</b><br><br>
          Nhánh: ${esc(a.nhanh)} — ${esc(a.buoc_hien_tai)}<br>
          Nỗi đau: ${esc(a.phan_tich.noi_dau)}<br>
          Mức sẵn sàng: ${esc(a.phan_tich.san_sang)}<br>
          Giai đoạn: ${esc(a.phan_tich.giai_doan)} — Độ nóng: ${esc(a.phan_tich.do_nong)}
        </div>
      </div>
      ${c ? `<div class="hint-box">✓ Đã lưu vào hồ sơ <b>${esc(c.ten_khach_hang)}</b>${c.ngay_follow_tiep ? ` — hẹn follow ngày ${esc(c.ngay_follow_tiep)}` : ''}. <a href="#khach-hang">Xem trong Khách Hàng →</a></div>` : ''}
    `;
  }

  function bind(){
    const tourBtn = container.querySelector('#tv-start-tour');
    if(tourBtn) tourBtn.onclick = ()=>window.startPageTour(TOUR_STEPS);

    const toggleSanPham = container.querySelector('[data-toggle-sanpham]');
    if(toggleSanPham) toggleSanPham.onclick = ()=>{ state.showSanPham = !state.showSanPham; draw(); };
    const sanPhamEl = container.querySelector('#tv-sanpham');
    if(sanPhamEl) sanPhamEl.oninput = (e)=>{ state.sanPhamText = e.target.value; saveModuleDraft(ctx, CONTEXT_DRAFT_KEY, { text: state.sanPhamText }); };

    const manualNameEl = container.querySelector('#tv-manual-name');
    if(manualNameEl) manualNameEl.oninput = (e)=>{ state.manualName = e.target.value; };

    const newCustomerBtn = container.querySelector('#tv-new-customer');
    if(newCustomerBtn) newCustomerBtn.onclick = startNewCustomer;

    container.querySelectorAll('[data-pick-guide-nhanh]').forEach(el=>{
      el.onclick = ()=>{
        const k = el.getAttribute('data-pick-guide-nhanh');
        state.guideNhanh = state.guideNhanh===k ? null : k;
        state.guideGroup = null; // đổi nhánh reset luôn nhóm con + bước đang mở, tránh lệch index
        state.expandedSteps = new Set();
        draw();
      };
    });
    container.querySelectorAll('[data-pick-guide-group]').forEach(el=>{
      el.onclick = ()=>{
        const k = el.getAttribute('data-pick-guide-group');
        state.guideGroup = state.guideGroup===k ? null : k;
        state.expandedSteps = new Set(); // đổi nhóm reset bước đang mở, tránh lệch index
        draw();
      };
    });
    container.querySelectorAll('[data-toggle-guide-step]').forEach(el=>{
      el.onclick = ()=>{
        const i = Number(el.getAttribute('data-toggle-guide-step'));
        if(state.expandedSteps.has(i)) state.expandedSteps.delete(i); else state.expandedSteps.add(i);
        draw();
      };
    });
    container.querySelectorAll('[data-copy-guide-step]').forEach(el=>{
      el.onclick = (e)=>{ e.stopPropagation(); copyGuideStep(Number(el.getAttribute('data-copy-guide-step'))); };
    });

    const fileEl = container.querySelector('#tv-file');
    if(fileEl) fileEl.onchange = ()=>{ if(fileEl.files.length) handleFiles(fileEl.files); };
    container.querySelectorAll('[data-remove-img]').forEach(el=>{
      el.onclick = ()=>removeImage(Number(el.getAttribute('data-remove-img')));
    });
    container.querySelectorAll('[data-zoom-img]').forEach(el=>{
      el.onclick = ()=>openImageLightbox(state.images[Number(el.getAttribute('data-zoom-img'))]);
    });

    const noteEl = container.querySelector('#tv-note');
    if(noteEl) noteEl.oninput = (e)=>{ state.note = e.target.value; persistDraft(); };

    const submitBtn = container.querySelector('#tv-submit');
    if(submitBtn) submitBtn.onclick = submit;

    const copyBtn = container.querySelector('#tv-copy');
    if(copyBtn) copyBtn.onclick = copyCauChot;
  }

  draw();
  boot();
}

window.Modules = window.Modules || {};
window.Modules['tu-van'] = { title:'Tư Vấn AI', render };
})();
