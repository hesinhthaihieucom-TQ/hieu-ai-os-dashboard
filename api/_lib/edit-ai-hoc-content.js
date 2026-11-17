// Nội dung khoá "Làm Chủ Edit Video Bằng AI — Hướng dẫn làm" (Quỳnh 11/17: KHÔNG chia theo ngày, mà là các MODULE hướng dẫn từng bước làm).
// Nội dung nằm ở server và chỉ trả khi đã thanh toán (api/edit-ai-hoc.js), không để lộ trong mã nguồn trang.
// video: dán link YouTube (không công khai cũng được) / Vimeo / Google Drive vào chuỗi video của từng bài; để trống = app hiện "video đang cập nhật".
// Mỗi bài theo khuôn: goal (kết quả sau bài) · why (điều quan trọng) · steps (các bước làm) · check (tự kiểm tra) · note (nhớ một điều, tuỳ chọn).
// Chỉ dùng lệnh/tính năng CÓ THẬT trong bộ kit "Hiểu Kênh Edit Video AI" 1.4.0 (xem video-editor-kit/product/README.md, HUONG-DAN.md).

const MODULES = [
  { id: 'm1', title: 'Bắt đầu: cài bộ kit', desc: 'Cài một lần ~10 phút, kiểm tra máy chạy được.', lessons: [
    { id: 'm1-1', title: 'Máy bạn cần có gì', min: 5, video: '',
      goal: 'Biết máy mình đã đủ điều kiện chạy bộ kit chưa.',
      why: 'Bộ kit xử lý video ngay trên máy bạn nên cần vài phần mềm nền. Kiểm tra trước giúp khỏi dừng giữa chừng.',
      steps: ['Máy Windows 10/11 (macOS, Linux cũng chạy được), RAM từ 8 GB, trống ổ cứng ít nhất 10 GB (3 GB cho kit, phần còn lại cho video).',
              'Cài Node.js bản 18 trở lên (nodejs.org) và Python bản 3.10 trở lên (python.org).',
              'Cài ffmpeg. Nếu thiếu, kit sẽ chỉ cách cài ở bước kiểm tra.',
              'Có gói Claude dùng được Claude Code (claude.ai/code). Kit không cần thêm API key nào khác.'],
      check: ['Đã cài Node.js 18+', 'Đã cài Python 3.10+', 'Đã có tài khoản Claude dùng được Claude Code', 'Ổ cứng còn trống từ 10 GB'],
      note: 'Máy yếu (RAM 6 GB) vẫn dựng được, chỉ chậm hơn. Mục "Máy yếu" ở module 6 sẽ chỉ cách chạy ổn.' },
    { id: 'm1-2', title: 'Cài bộ kit trong 10 phút', min: 10, video: '',
      goal: 'Có bộ kit chạy được trong một thư mục trên máy.',
      why: 'Chỉ cài một lần. Từ lần sau bạn chỉ mở thư mục, gõ lệnh là làm việc.',
      steps: ['Giải nén file zip bộ kit ra một chỗ dễ nhớ, ví dụ C:\\video-editor-kit.',
              'Mở thư mục đó, gõ chữ cmd vào thanh địa chỉ rồi Enter để mở cửa sổ lệnh ngay tại đây.',
              'Chạy lần lượt hai lệnh: npm install, rồi pip install -r requirements.txt. Mỗi lệnh chạy vài phút, cứ để máy làm.',
              'Gõ claude để mở Claude Code ngay trong thư mục này.'],
      check: ['Đã giải nén kit', 'npm install chạy xong không báo lỗi đỏ', 'pip install chạy xong', 'Đã mở được Claude Code trong thư mục kit'],
      note: 'Phải mở Claude Code TRONG đúng thư mục kit, nếu mở ở chỗ khác thì lệnh /biz sẽ không hiện ra.' },
    { id: 'm1-3', title: 'Kiểm tra máy bằng /biz-help', min: 5, video: '',
      goal: 'Biết chắc kit đã cài đúng và xem được menu các lệnh.',
      why: 'Một lệnh duy nhất kiểm tra cả máy lẫn kit. Thiếu gì kit chỉ cách sửa (hoặc sửa giúp).',
      steps: ['Trong Claude Code, gõ /biz-help rồi Enter.', 'Đọc kết quả: dòng nào báo thiếu thì làm theo hướng dẫn kit đưa ra.', 'Khi thấy menu bốn lệnh là xong. Lần dựng đầu tiên kit sẽ tải mô hình nhận giọng nói khoảng 460 MB, máy không bị treo, chỉ cần chờ vài phút.'],
      check: ['Gõ /biz-help ra được kết quả', 'Không còn dòng báo lỗi bắt buộc', 'Thấy menu các lệnh'],
      note: 'Gõ /biz mà không ra gì: kiểm tra lại bạn có đang mở Claude Code ĐÚNG trong thư mục kit không.' },
    { id: 'm1-4', title: 'Bốn lệnh bạn sẽ dùng', min: 3, video: '',
      goal: 'Nhớ bốn lệnh của kit và dùng lệnh nào cho việc nào.',
      why: 'Cả khoá xoay quanh bốn lệnh này, nhớ được là làm được.',
      steps: ['/biz-help: kiểm tra máy và xem menu. Gõ đầu tiên.', '/biz-edit-video: dựng video bạn ngồi nói trước máy quay.', '/biz-broll-video: dựng video cảnh quay có chữ thu hút và nhạc nền.', '/biz-review-video: hội đồng ảo xem video vừa dựng và góp ý trước khi đăng.'],
      check: ['Phân biệt được video người nói và video b-roll', 'Biết lệnh nào dùng để soi kỹ trước khi đăng'] }
  ]},
  { id: 'm2', title: 'Chuẩn bị video thô', desc: 'Quay sao cho dựng ra đẹp, và đưa file đúng chỗ.', lessons: [
    { id: 'm2-1', title: 'Quay thế nào để AI dựng đẹp', min: 8, video: '',
      goal: 'Quay được video thô ít phải sửa nhất.',
      why: 'AI cắt và dựng giỏi, nhưng video thô tốt vẫn cho kết quả tốt hơn hẳn. Vài thói quen nhỏ tiết kiệm cả tiếng chỉnh sửa.',
      steps: ['Quay dọc (9:16), mặt rõ, đặt mặt ở khoảng giữa khung, chừa chỗ phía trên và phía dưới cho chữ.', 'Chọn nơi yên tĩnh, ánh sáng đều vào mặt. Tiếng ồn nền nhỏ thì kit cắt khoảng nghỉ chính xác hơn.', 'Nói liền mạch. Vấp thì nói lại luôn câu đó: kit giữ lần nói cuối của mỗi câu lặp.', 'Nếu muốn giữ nụ cười ở cuối video, cứ cười hết, kit sẽ giữ lại.'],
      check: ['Video quay dọc', 'Mặt rõ, đủ sáng', 'Nói vấp thì đã nói lại luôn câu đó'] },
    { id: 'm2-2', title: 'Đưa video cho kit', min: 5, video: '',
      goal: 'Dán đúng đường dẫn video vào lệnh dựng.',
      why: 'Kit làm việc trên file có thật trong máy. Biết lấy đường dẫn là bước nhỏ nhưng ai cũng cần.',
      steps: ['Chép video vào máy (video điện thoại dạng HEVC cũng được, kit tự đổi sang H.264).', 'Chuột phải vào file, chọn Copy as path để chép đường dẫn.', 'Không nhớ video nằm đâu: cứ nói "tìm video tôi quay hôm qua", kit quét máy, đưa danh sách và hiện khung hình để bạn xác nhận.'],
      check: ['Chép được đường dẫn file video', 'Biết cách nhờ kit tìm video khi quên chỗ lưu'] }
  ]},
  { id: 'm3', title: 'Dựng video người nói', desc: 'Từ video thô thành video cắt gọn, có phụ đề, chỉ bằng một lệnh.', lessons: [
    { id: 'm3-1', title: 'Lệnh dựng đầu tiên', min: 12, video: '',
      goal: 'Dựng xong video đầu tiên bằng /biz-edit-video.',
      why: 'Đây là khoảnh khắc nhìn thấy kết quả. Làm đúng một lần là bạn nắm được cả quy trình.',
      steps: ['Trong Claude Code gõ: /biz-edit-video <đường dẫn video> <gu bạn thích>. Ví dụ: /biz-edit-video C:\\Videos\\clip.mp4 tối giản trắng đen.', 'Kit báo trước thời gian chờ khoảng 7–12 phút. Trong lúc chờ nên đóng Chrome và các ứng dụng nặng.', 'Xong, kit tự mở video. Video nằm ở out\\final.mp4.'],
      check: ['Chạy được lệnh /biz-edit-video', 'Có file out\\final.mp4', 'Đã xem hết video một lượt'],
      note: 'Làm video mới thì bản cũ tự được cất vào out\\archive\\, không bao giờ mất.' },
    { id: 'm3-2', title: 'Chọn phong cách (gu) video', min: 6, video: '',
      goal: 'Chọn hoặc tự mô tả được phong cách bạn muốn.',
      why: 'Cùng một video nhưng gu khác nhau cho cảm giác rất khác. Gu đúng giúp video giống thương hiệu của bạn.',
      steps: ['Tả gu ngay trong lệnh nếu muốn: tối giản, rực rỡ bán hàng, sang trọng vàng đen, nữ tính nhẹ nhàng...', 'Không tả thì kit hỏi một câu kèm các lựa chọn dễ hiểu, bạn chọn một.', 'Kit có sẵn 7 phong cách, hoặc bạn tự mô tả bằng lời, kit tự hiểu.'],
      check: ['Biết ít nhất hai cách để chọn gu', 'Đã thử dựng một video với gu mình thích'] },
    { id: 'm3-3', title: 'Kit cắt lặp, cắt hơi thở thế nào', min: 6, video: '',
      goal: 'Hiểu kit đã cắt gì để kiểm tra đúng chỗ.',
      why: 'Biết cách kit cắt giúp bạn phát hiện nhanh chỗ cắt chưa ưng và nhờ sửa đúng.',
      steps: ['Kit cắt khoảng lặng, hơi thở và từ thừa.', 'Câu nói lặp thì kit giữ lần nói cuối cùng.', 'Nếu bản thu có tiếng ồn nền cao, kit tự đo lại các quãng nghỉ để cắt cho sát.', 'Xem lại video và để ý: có chỗ nào cắt lẹm vào chữ cuối không? Có chỗ nào còn bị chững không?'],
      check: ['Đã xem lại video để tìm chỗ cắt lẹm', 'Đã ghi lại thời điểm (giây) của chỗ cần sửa nếu có'] }
  ]},
  { id: 'm4', title: 'Chỉnh bằng lời nói', desc: 'Sửa đúng chỗ cần sửa bằng câu nói tự nhiên, không cần dựng lại từ đầu.', lessons: [
    { id: 'm4-1', title: 'Sửa chữ, bớt đồ hoạ, đổi màu', min: 10, video: '',
      goal: 'Chỉnh được video sau khi dựng bằng câu nói đời thường.',
      why: 'Đây là điểm mạnh nhất của kit: bạn nói như nói với người dựng, kit chỉ sửa đúng chỗ đó.',
      steps: ['Sửa chữ sai chính tả: nói "sửa chữ ở giây 20 thành ...".', 'Quá nhiều đồ hoạ: nói "nhiều đồ hoạ quá, bớt đi".', 'Tiêu đề che mặt: nói "đưa tiêu đề lên trên" hoặc "để giữa".', 'Đổi màu: nói "đổi màu ấm hơn". Mỗi lần sửa chờ khoảng 5–7 phút.'],
      check: ['Đã sửa được một chữ bằng lời nói', 'Đã thử bớt hoặc thêm đồ hoạ', 'Biết mỗi lần sửa mất khoảng 5–7 phút'],
      note: 'Nhận giọng tiếng Việt đôi khi nhầm dấu. Gặp thì chỉ cần nói "sửa chữ X thành Y".' },
    { id: 'm4-2', title: 'Soi kỹ bằng /biz-review-video', min: 8, video: '',
      goal: 'Nhờ "hội đồng ảo" góp ý trước khi đăng.',
      why: 'Mắt bạn đã quen với video của mình nên khó thấy lỗi. Hội đồng gồm giám đốc nghệ thuật, người dựng và khán giả, họ thấy giúp bạn.',
      steps: ['Sau khi có video, gõ /biz-review-video.', 'Đọc góp ý, chọn những điểm đáng sửa.', 'Đồng ý với đề nghị nào thì nói để kit sửa luôn.'],
      check: ['Đã chạy /biz-review-video', 'Đã chọn ít nhất một góp ý để sửa'] },
    { id: 'm4-3', title: 'Chốt bản và để kit học gu của bạn', min: 4, video: '',
      goal: 'Lưu bản ưng ý và để kit nhớ gu của bạn.',
      why: 'Mỗi lần bạn chốt, kit ghi nhớ gu. Lần sau nó hỏi ít hơn và đoán đúng hơn.',
      steps: ['Khi ưng video, nói "keep it".', 'Kit lưu một bản tên riêng trong thư mục out.', 'Gu của bạn được ghi vào hồ sơ phong cách (tệp user-style-profile.md trong thư mục .claude/skills/video-editor/memory).'],
      check: ['Đã nói "keep it" với một video', 'Thấy bản lưu riêng trong thư mục out'] }
  ]},
  { id: 'm5', title: 'Video cảnh quay + hook', desc: 'Dựng nhanh video cảnh đẹp có chữ thu hút và nhạc nền.', lessons: [
    { id: 'm5-1', title: 'Dựng video b-roll với /biz-broll-video', min: 8, video: '',
      goal: 'Dựng xong một video cảnh quay có tiêu đề hook.',
      why: 'Loại này nhanh hơn rất nhiều (khoảng 1–3 phút) và hợp để đăng đều mỗi ngày.',
      steps: ['Gõ: /biz-broll-video <đường dẫn video cảnh> chủ đề: <chủ đề của bạn>. Ví dụ: chủ đề: 3 thói quen buổi sáng.', 'Kit soạn sẵn 3 phương án chữ hoàn chỉnh, bạn chọn một.', 'Kit hỏi file nhạc nền (mp3). Chưa có thì cứ để dựng không nhạc trước.', 'Nhạc dài hơn video thì kit tự cắt kèm nhỏ dần ở cuối; nhạc ngắn hơn thì tự lặp.'],
      check: ['Đã chọn một trong 3 phương án chữ', 'Đã dựng xong một video b-roll', 'Biết cách đặt nhạc nền'] }
  ]},
  { id: 'm6', title: 'Kiểm tra trước khi đăng', desc: 'Những việc nhỏ giúp video sạch lỗi, chạy ổn cả trên máy yếu.', lessons: [
    { id: 'm6-1', title: 'Danh sách soát lỗi trước khi đăng', min: 8, video: '',
      goal: 'Có thói quen soát video theo một danh sách cố định.',
      why: 'Video lỗi chính tả hay chữ tràn lề làm người xem mất tin tưởng. Soát một lượt chỉ mất vài phút.',
      steps: ['Soát chính tả toàn bộ phụ đề, theo nghĩa của câu.', 'Phụ đề không có dấu chấm cuối dòng, mỗi dòng ngắn (tối đa khoảng 24 ký tự, câu dài tự chia hai dòng).', 'Chữ không tràn lề, không bị nút và mô tả của TikTok, Reels che.', 'Tiêu đề không che mặt người nói.', 'Xem ảnh khung trước khi render cả video: kit dựng thử vài ảnh (tiêu đề, phụ đề, thanh chữ, cuối video). Sai ở đây tiết kiệm cả tiếng render lại.'],
      check: ['Đã soát chính tả', 'Chữ không tràn lề', 'Đã xem ảnh khung trước khi render'] },
    { id: 'm6-2', title: 'Máy yếu và cách xử lý lỗi hay gặp', min: 8, video: '',
      goal: 'Dựng ổn định trên máy RAM thấp và tự xử lý lỗi thường gặp.',
      why: 'Render là việc nặng nhất. Vài thói quen đúng giúp máy 6 GB cũng chạy xong.',
      steps: ['Đóng Chrome và ứng dụng nặng trước khi render.', 'Máy RAM dưới 8 GB: dùng 2 luồng (--concurrency=2), không tăng lên 3–4.', 'Báo lỗi "delayRender" hay hết giờ: đóng ứng dụng nặng rồi chạy lại.', 'Render rất chậm: kiểm tra RAM trong Activity Monitor hoặc Task Manager.', 'Video điện thoại (HEVC) giật: kit tự đổi sang H.264 ở lần xử lý đầu.'],
      check: ['Biết cách đóng ứng dụng nặng trước khi render', 'Biết dùng 2 luồng cho máy yếu', 'Biết đọc dòng lỗi delayRender'] }
  ]},
  { id: 'm7', title: 'Làm đều mỗi ngày', desc: 'Biến quy trình thành thói quen: nhanh, ít lỗi, đăng đều.', lessons: [
    { id: 'm7-1', title: 'Quy trình mỗi video trong vài phút', min: 8, video: '',
      goal: 'Có một quy trình lặp lại cho mỗi video.',
      why: 'Làm đều quan trọng hơn làm hoàn hảo. Quy trình cố định giúp bạn ra video mỗi ngày mà không mệt.',
      steps: ['Quay video thô (ghi liền mạch, nói lại câu vấp).', 'Mở thư mục kit, gõ claude, rồi /biz-edit-video với đường dẫn video.', 'Trong lúc kit dựng, quay hoặc chuẩn bị video kế tiếp.', 'Xem, sửa bằng lời nói nếu cần, soát lỗi theo danh sách, nói "keep it".', 'Đăng lên các nền tảng bạn dùng.'],
      check: ['Có quy trình ghi ra giấy', 'Đã dựng ít nhất hai video liên tiếp bằng quy trình này'],
      note: 'Bản cũ tự cất vào out\\archive\\, nên bạn thoải mái dựng nhiều video mà không lo mất.' },
    { id: 'm7-2', title: 'Chữ ký kênh và hồ sơ phong cách', min: 5, video: '',
      goal: 'Video nào ra cũng có dấu ấn của bạn.',
      why: 'Chữ ký và gu nhất quán giúp người xem nhận ra kênh của bạn chỉ sau vài giây.',
      steps: ['Đặt tên kênh làm chữ ký: nói với Claude, hoặc mở out/edl.json rồi điền vào mục chữ ký. Chữ hiện ở cuối khung hình, kiểu viết tay.', 'Sau mỗi video ưng ý, nói "keep it" để kit học gu.', 'Dần dần kit hỏi ít đi vì đã hiểu bạn.'],
      check: ['Đã đặt chữ ký kênh', 'Chữ ký hiện đúng ở cuối video'] }
  ]}
];

module.exports = { MODULES };
