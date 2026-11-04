/* Nội dung các bước. Kiểu khối: p, h, ul, ck (ô tick), tbl, tip, warn, note, copy, svg, more */
window.GROUPS = [
  { id: 'g1', title: 'Bước 1 · Chọn thị trường & nội dung' },
  { id: 'g2', title: 'Bước 2 · Xây fanpage FB + TikTok' },
  { id: 'g3', title: 'Bước 3 · Lên sóng' },
  { id: 'g4', title: 'Dành cho người quản lý' }
];

window.STEPS = [
  {
    id: 's1-1', grp: 'g1', n: '1.1', title: 'Hiểu đối tác & chọn ngách',
    lead: 'Trước khi làm kênh, phải biết đối tác bán gì và bán cho ai. Mục tiêu: có 1 phiếu 8 câu và 1 câu định vị.',
    blocks: [
      { t: 'svg', k: 'niche', cap: 'Chấm điểm 3 nhóm khách, chọn nhóm điểm cao nhất' },
      { t: 'h', x: 'Làm thế nào' },
      { t: 'p', x: 'Hỏi đối tác đúng 8 câu dưới đây và ghi lại câu trả lời vào một file hoặc sổ tay.' },
      { t: 'ck', items: [
        'Anh/chị đang bán sản phẩm hoặc dịch vụ gì?',
        'Khách hàng tốt nhất là ai (tuổi, giới tính, nghề, nơi ở)?',
        'Khách đó đang gặp vấn đề gì làm họ khó chịu nhất?',
        'Giá bán và các gói hiện có?',
        'Có công dụng nào hoặc điều gì KHÔNG được phép nói (theo nhãn, quy định)?',
        'Hiện đã có kênh nào chưa, kết quả ra sao?',
        'Ai sẽ xuất hiện trong video (đối tác, người nhà, nhân viên)?',
        'Muốn khách làm gì sau khi xem video (nhắn tin, vào Zalo, vào Zoom, mua)?'
      ] },
      { t: 'h', x: 'Chọn thị trường (ngách)' },
      { t: 'ck', items: [
        'Viết ra 3 nhóm khách có thể phục vụ.',
        'Chấm mỗi nhóm từ 1–5 cho 3 tiêu chí: có nỗi đau rõ, có tiền để trả, mình hiểu về họ.',
        'Chọn nhóm có tổng điểm cao nhất. Không chọn "ai cũng được".',
        'Viết 1 câu định vị bên dưới.'
      ] },
      { t: 'copy', title: 'Mẫu câu định vị', x: 'Mình giúp [nhóm khách] giải quyết [vấn đề] bằng [cách].\n\nVí dụ: Mình giúp phụ nữ U40 giảm mỡ bụng bằng cách ăn uống và nhịp sống phù hợp.' },
      { t: 'tip', x: 'Xong bước này khi bạn có phiếu 8 câu đã điền và 1 câu định vị.' }
    ]
  },
  {
    id: 's1-2', grp: 'g1', n: '1.2', title: 'Chọn gói nội dung kịch bản',
    lead: 'Gói kịch bản là bộ video đã viết sẵn để người mới chỉ việc quay theo.',
    blocks: [
      { t: 'svg', k: 'package', cap: 'Gói 28 ngày gồm 84 kịch bản' },
      { t: 'tbl', head: ['Nội dung trong gói', 'Số lượng'], rows: [
        ['Kịch bản "Cho đi" (kiến thức, không bán)', '28'],
        ['Kịch bản "Đẩy" (kéo người xem về comment, Zalo, Zoom)', '56'],
        ['Bài ảnh sản phẩm + caption (1 bài/ngày)', '28'],
        ['Mẫu story (4–6 story/ngày)', '6 loại mẫu, dùng lặp lại'],
        ['Caption + hashtag cho mỗi video', '84'],
        ['Mẫu comment ghim', '84'],
        ['Tin nhắn chào, tin nhắn mời Zoom/Zalo', '5–8 mẫu']
      ] },
      { t: 'h', x: 'Cách chọn gói' },
      { t: 'ck', items: [
        'Đối chiếu gói với phiếu đối tác ở bước 1.1 (đúng khách, đúng sản phẩm, đúng điều được/không được nói).',
        'Đọc lướt 5 kịch bản đầu và tự hỏi: người mới đọc có hiểu và nói được không?',
        'Mỗi kịch bản có đủ: câu mở 3 giây đầu, các ý theo thứ tự, câu chốt, từ khóa comment.',
        'Kịch bản sức khỏe không hứa chữa bệnh, không hứa số cân.'
      ] },
      { t: 'tip', x: 'Xong bước này khi đã chốt gói và có ít nhất 21 kịch bản của tuần đầu (đủ 84 thì tốt hơn).' }
    ]
  },

  {
    id: 's2-1', grp: 'g2', n: '2.1', title: 'Tạo tài khoản Facebook & TikTok',
    lead: 'Tạo trang Facebook và tài khoản TikTok có cùng tên, cùng ảnh, cùng lời hứa.',
    blocks: [
      { t: 'note', x: 'Giao diện Facebook/TikTok hay đổi. Nếu không thấy đúng tên nút, tìm nút có ý nghĩa tương tự.' },
      { t: 'h', x: 'A. Chuẩn bị trước khi tạo' },
      { t: 'ck', items: [
        'Tên kênh đã chốt (xem mục B).',
        'Ảnh đại diện.',
        'Ảnh bìa.',
        'Một email mới dùng riêng cho kênh.',
        'Một số điện thoại nhận mã xác nhận.',
        'Mật khẩu mạnh, ghi vào sổ riêng (không gửi qua tin nhắn).'
      ] },
      { t: 'h', x: 'B. Đặt tên kênh' },
      { t: 'ul', items: [
        'Đặt theo vấn đề cần giải quyết: ví dụ "Giảm mỡ bụng U40". Người lạ nhìn là hiểu kênh nói gì.',
        'Đặt theo người thật: ví dụ "Hạnh – Sống khỏe U40". Tạo cảm giác tin cậy, dễ nhớ.',
        'Gợi ý: tên người thật + vấn đề, gọn 2–5 từ.'
      ] },
      { t: 'ck', items: [
        'Dễ đọc, dễ nhớ, không có gạch dưới hay số lạ.',
        'Không dùng từ hứa hẹn (ví dụ "chữa khỏi", "cam kết giảm").',
        'Giống nhau trên Facebook và TikTok.',
        'Đã tìm thử tên trên cả hai nền tảng để tránh trùng kênh có sẵn.'
      ] },
      { t: 'svg', k: 'fbpage', cap: 'Một trang Facebook gọn gàng gồm 4 thứ: ảnh bìa, ảnh đại diện, giới thiệu, nút hành động' },
      { t: 'h', x: 'C. Tạo fanpage Facebook' },
      { t: 'ck', items: [
        'Đăng nhập Facebook cá nhân của người quản lý.',
        'Bấm menu (biểu tượng chín chấm) → Trang → Tạo Trang mới.',
        'Nhập tên trang, chọn hạng mục (ví dụ "Sức khỏe/Sắc đẹp" hoặc "Người sáng tạo nội dung số").',
        'Viết giới thiệu 2–3 dòng: dành cho ai, giúp được gì, liên hệ ở đâu.',
        'Thêm ảnh đại diện và ảnh bìa.',
        'Thêm nút hành động (ví dụ "Nhắn tin").',
        'Điền thông tin liên hệ (Zalo, email).',
        'Bật Meta Business Suite để xem số liệu và lên lịch đăng.'
      ] },
      { t: 'h', x: 'D. Tạo tài khoản TikTok' },
      { t: 'ck', items: [
        'Tải ứng dụng TikTok, đăng ký bằng email hoặc số điện thoại.',
        'Đặt tên người dùng (ID) và tên hiển thị giống Facebook.',
        'Cập nhật ảnh đại diện.',
        'Viết giới thiệu (bio) 1–2 dòng, thêm link Zalo nếu có thể.',
        'Chuyển sang tài khoản Doanh nghiệp / Người sáng tạo để xem số liệu (trong Cài đặt → Tài khoản).'
      ] },
      { t: 'svg', k: 'sizes', cap: 'Ảnh đại diện vuông, ảnh bìa ngang với chữ quan trọng nằm giữa' },
      { t: 'h', x: 'E. Ảnh đại diện và ảnh bìa' },
      { t: 'ul', items: [
        'Ảnh đại diện: mặt người thật, nhìn thẳng, sáng rõ, không filter nặng, nền đơn giản. Ảnh vuông tối thiểu 720×720 px. Dùng cùng một ảnh cho Facebook và TikTok.',
        'Ảnh bìa: ảnh ngang, nội dung quan trọng đặt ở giữa vì khung hiển thị trên điện thoại và máy tính khác nhau. Kích thước tham khảo khoảng 1640×624 px.',
        'Nội dung ảnh bìa: 1 câu lời hứa (câu định vị ở bước 1.1) và cách liên hệ.',
        'Làm trên Canva với mẫu "Facebook Cover" để đúng khung.'
      ] },
      { t: 'tip', x: 'Xong bước này khi cả hai tài khoản đã có tên, ảnh đại diện, giới thiệu, thông tin liên hệ, và xem được số liệu.' }
    ]
  },
  {
    id: 's2-2', grp: 'g2', n: '2.2', title: 'Học CapCut từ con số 0',
    lead: 'Viết cho người chưa từng dùng CapCut. Làm đúng thứ tự, mỗi bước có việc cụ thể.',
    blocks: [
      { t: 'h', x: 'A. Mua gói CapCut Pro và cài đặt' },
      { t: 'ck', items: [
        'Mua gói đăng ký trực tiếp trong ứng dụng CapCut hoặc trang chính thức.',
        'Mỗi người dùng một tài khoản riêng, đăng nhập 1–2 thiết bị.',
        'Tải CapCut từ App Store / Google Play (điện thoại) hoặc trang chính thức (máy tính).',
        'Đăng nhập bằng email dùng riêng cho kênh.'
      ] },
      { t: 'warn', x: '<b class="l">Đừng mua tài khoản chia sẻ rẻ trôi nổi</b>Dễ bị khóa tài khoản, mất video đang làm.' },
      { t: 'svg', k: 'capcut', cap: 'Giao diện chính: xem trước ở trên, dòng thời gian (chữ, video, nhạc) ở dưới. Vạch đỏ là chỗ bạn cắt' },
      { t: 'svg', k: 'edit10', cap: '10 bước dựng 1 video, làm đúng thứ tự' },
      { t: 'h', x: 'B. Quy trình dựng 1 video' },
      { t: 'tbl', head: ['Bước', 'Việc làm', 'Cách làm'], rows: [
        ['1', 'Nhập video', 'Dự án mới → chọn clip đã quay → Thêm'],
        ['2', 'Chỉnh tỉ lệ', 'Chọn 9:16 (video dọc)'],
        ['3', 'Cắt đầu cuối', 'Kéo vạch trắng đến vị trí cần cắt → Chia tách → chọn đoạn thừa → Xóa'],
        ['4', 'Bỏ khoảng lặng, ậm ừ', 'Làm như bước 3. Mục tiêu: không có khoảng lặng quá 0,5 giây'],
        ['5', 'Phụ đề tự động', 'Văn bản → Phụ đề tự động → chọn Tiếng Việt → đọc lại, sửa lỗi chính tả'],
        ['6', 'Tiêu đề lớn', 'Văn bản → Thêm văn bản → gõ tiêu đề → chữ vàng viền đen, cỡ lớn'],
        ['7', 'Nhạc nền', 'Âm thanh → chọn nhạc → kéo âm lượng nhỏ hơn giọng nói'],
        ['8', 'Hình minh họa', 'Lớp phủ (Overlay) → thêm ảnh/clip → kéo cho vừa đoạn đang nói'],
        ['9', 'Kiểm tra', 'Xem lại từ đầu đến cuối, bật tiếng. Chữ có bị che không? Có đọc kịp không?'],
        ['10', 'Xuất video', 'Xuất → 1080p, 30 khung hình/giây → Lưu']
      ] },
      { t: 'h', x: 'Quy tắc chữ trên video' },
      { t: 'ul', items: [
        'Mỗi dòng ngắn, đọc được trong 2–3 giây.',
        'Tiêu đề lớn, vàng viền đen, nằm vùng giữa màn hình (sát mép dễ bị giao diện TikTok/Facebook che).',
        'Không quá 8 dòng một lúc.'
      ] },
      { t: 'svg', k: 'shoot', cap: 'Bố trí khi quay: ánh sáng từ phía trước, điện thoại trên chân đỡ ngang mắt' },
      { t: 'h', x: 'C. Cách quay' },
      { t: 'ck', items: [
        'Quay dọc, giữ điện thoại ngang tầm mắt.',
        'Dùng chân đỡ (tripod) hoặc dựa điện thoại vào vật vững. Không cầm tay run.',
        'Ánh sáng: đứng đối diện cửa sổ hoặc đèn, không để nguồn sáng sau lưng.',
        'Âm thanh: quay nơi yên tĩnh. Nếu có thể, dùng micro cài áo.',
        'Lau ống kính trước khi quay.',
        'Nói vấp thì quay lại câu đó, bỏ bản vấp khi dựng.',
        'Nhìn thẳng vào ống kính khi nói.'
      ] },
      { t: 'h', x: 'D. 5 bài tập để quen CapCut (mỗi bài 30–45 phút)' },
      { t: 'ck', items: [
        'Bài 1: cắt 1 clip 20 giây, xóa khoảng lặng, xuất.',
        'Bài 2: thêm phụ đề tự động và sửa lại cho đúng.',
        'Bài 3: thêm tiêu đề lớn vàng viền đen và 5 dòng chữ hiện lần lượt.',
        'Bài 4: thêm nhạc nền, chỉnh nhỏ hơn giọng nói.',
        'Bài 5: dựng trọn 1 video theo kịch bản số 1, xuất 1080p.'
      ] },
      { t: 'tip', x: 'Xong bước này khi bạn dựng được 1 video hoàn chỉnh trong dưới 60 phút mà không cần hỏi ai.' }
    ]
  },
  {
    id: 's2-3', grp: 'g2', n: '2.3', title: 'Lịch truyền thông cố định 28 ngày',
    lead: 'Mỗi ngày: 3 video, 1 bài ảnh sản phẩm và 4–6 story. Lặp lại trong 28 ngày.',
    blocks: [
      { t: 'svg', k: 'daily3', cap: 'Công thức mỗi ngày: 1 video Cho đi (tối) + 2 video Đẩy (giờ linh hoạt)' },
      { t: 'note', x: 'Ngoài 3 video, mỗi ngày còn 1 bài ảnh (ưu tiên ảnh sản phẩm, đây là chỗ đẩy sản phẩm) và 4–6 story. Cách làm chi tiết ở bước 2.4.' },
      { t: 'tbl', head: ['', 'Cho đi', 'Đẩy'], rows: [
        ['Nội dung', 'Kiến thức, mẹo, dấu hiệu', 'Lời mời hành động: nhận tài liệu, vào nhóm, tham gia Zoom'],
        ['Có nhắc sản phẩm?', 'Không', 'Không bán thẳng, chỉ mời nhận giá trị'],
        ['Câu cuối', '"Bạn thuộc nhóm nào? Comment nhé."', '"Comment [TỪ KHÓA] để nhận [tài liệu]." / "Vào Zoom [ngày giờ]."']
      ] },
      { t: 'p', x: '<b>Giờ đăng linh hoạt</b> nghĩa là: tuần đầu thử các khung 6:30–8:00, 11:30–13:00, 15:00–17:00, sau đó giữ khung có lượt xem cao nhất.' },
      { t: 'svg', k: 'cal28', cap: '4 tuần × 7 ngày × 3 video = 84 video' },
      { t: 'h', x: 'Tuần mẫu (lặp lại 4 lần, đổi chủ đề)' },
      { t: 'tbl', head: ['Thứ', 'Sáng/trưa (Đẩy)', 'Chiều (Đẩy)', 'Tối (Cho đi)'], rows: [
        ['2', 'Nhận tài liệu', 'Câu hỏi cho khách', 'Danh sách'],
        ['3', 'Mời nhóm Zalo', 'Nhận tài liệu', 'Nỗi đau'],
        ['4', 'Nhận tài liệu', 'Mời Zoom', 'Danh sách'],
        ['5', 'Câu hỏi cho khách', 'Mời nhóm Zalo', 'Mẹo nhỏ'],
        ['6', 'Nhận tài liệu', 'Mời Zoom', 'Danh sách'],
        ['7', 'Mời nhóm Zalo', 'Nhận tài liệu', 'Câu chuyện thật'],
        ['CN', 'Nhắc từ khóa cả tuần', 'Mời Zoom tuần sau', 'Tổng kết tuần']
      ] },
      { t: 'more', title: 'Xem 28 chủ đề video "Cho đi" (mỗi ngày 1 video)', blocks: [
        { t: 'note', x: 'Đây là chủ đề cho ngách phụ nữ U40 giảm mỡ bụng. Đổi theo ngách của đối tác nếu cần.' },
        { t: 'h', x: 'Tuần 1 – Hiểu cơ thể' },
        { t: 'ul', items: ['7 dấu hiệu bụng to có thể liên quan kháng insulin', 'Vì sao U40 dễ lên khó xuống', '6 sai lầm khiến mỡ bụng không xuống', 'Mỡ bụng và mỡ khắp người khác nhau thế nào', 'Cách đo vòng eo đúng', 'Xét nghiệm nào cần làm để hiểu mình', 'Tổng kết tuần 1'] },
        { t: 'h', x: 'Tuần 2 – Ăn uống' },
        { t: 'ul', items: ['Áp dụng 16:8: ăn gì và không ăn gì', 'Thứ tự ăn rau, đạm, tinh bột', '8 món nên có trong bữa ăn giảm mỡ bụng', '6 đồ uống có đường hay bị quên', 'Cách đọc nhãn dinh dưỡng trong 30 giây', 'Bữa sáng cho người dễ đói giữa buổi', 'Tổng kết tuần 2'] },
        { t: 'h', x: 'Tuần 3 – Thói quen' },
        { t: 'ul', items: ['5 thói quen buổi tối làm bụng to', 'Ngủ ít ảnh hưởng thế nào đến cân nặng', 'Đi bộ sau bữa ăn: làm sao cho đúng', 'Stress và mỡ bụng', '7 món ăn vặt đỡ làm bụng to', 'Bữa tối nhẹ cho người nghi kháng insulin', 'Tổng kết tuần 3'] },
        { t: 'h', x: 'Tuần 4 – Duy trì' },
        { t: 'ul', items: ['Vì sao nhiều người bỏ cuộc giữa chừng', 'Cách đặt mục tiêu nhỏ mỗi tuần', 'Một ngày ăn của mình (đời thường)', 'Những dấu hiệu cần đi khám sớm', 'Hỏi đáp: 5 câu hay gặp', 'Câu chuyện của một chị đã thay đổi thói quen (có sự đồng ý của người thật)', 'Tổng kết 28 ngày'] }
      ] },
      { t: 'p', x: '<b>56 video "Đẩy"</b> xoay vòng 5 kiểu: nhận tài liệu bằng từ khóa, câu hỏi cho khách, mời nhóm Zalo, mời Zoom, nhắc từ khóa cả tuần.' },
      { t: 'tip', x: 'Xong bước này khi bạn có bảng 28 ngày × 3 video, mỗi ô có tên kịch bản và giờ đăng dự kiến.' }
    ]
  },

  {
    id: 's2-4', grp: 'g2', n: '2.4', title: 'Story hằng ngày & bài ảnh sản phẩm',
    lead: 'Mỗi ngày đăng thêm 4–6 story và 1 bài ảnh (ưu tiên ảnh sản phẩm). Story làm một lượt vào buổi sáng, đăng liền nhau cho đỡ việc. Bài ảnh là chỗ giới thiệu sản phẩm.',
    blocks: [
      { t: 'svg', k: 'daytime', cap: 'Một ngày đăng: video và ảnh ở hàng trên, cả cụm story đăng một lượt lúc 7h' },
      { t: 'tbl', head: ['Món', 'Số lượng / ngày', 'Vai trò'], rows: [
        ['Video', '3 (1 Cho đi + 2 Đẩy)', 'Kéo người xem, tạo niềm tin'],
        ['Bài ảnh', '1, ưu tiên ảnh sản phẩm', 'Giới thiệu và đẩy sản phẩm'],
        ['Story', '4–6', 'Nhắc, tương tác, giữ người xem quay lại']
      ] },

      { t: 'h', x: 'A. 4–6 story mỗi ngày, đăng một lượt' },
      { t: 'note', x: 'Quay hoặc chụp tất cả story trong một lần (khoảng 15 phút), rồi đăng liền nhau lúc 7:00 sáng. Story tồn tại 24 giờ nên người xem cả ngày vẫn thấy hết. Không cần canh giờ đăng từng cái.' },
      { t: 'tbl', head: ['Story', 'Thứ tự đăng', 'Loại', 'Nội dung'], rows: [
        ['1', 'Đầu tiên', 'Chào buổi sáng', 'Một câu hỏi hoặc mẹo ngắn, có thanh bình chọn'],
        ['2', 'Thứ 2', 'Hậu trường', 'Cảnh đang chuẩn bị bữa ăn hoặc đang quay video tối nay'],
        ['3', 'Thứ 3', 'Sản phẩm', 'Ảnh hoặc clip ngắn sản phẩm + 1 ý theo nhãn + mời nhắn tin'],
        ['4', 'Thứ 4', 'Tương tác', 'Bình chọn hoặc hộp câu hỏi để khách trả lời'],
        ['5', 'Thứ 5', 'Nhắc video tối', 'Nhắc "Tối nay lúc 20:00 có video: [tên]"'],
        ['6', 'Cuối (tùy chọn)', 'Mời nhận tài liệu', 'Nhắc từ khóa comment để nhận tài liệu']
      ] },
      { t: 'p', x: 'Mỗi ngày làm 5 story, thứ tự như bảng. Có thời gian thì thêm story 6. Làm tối thiểu 4 story thì giữ story 1, 3, 4, 5.' },
      { t: 'ck', items: [
        'Quay hoặc chụp theo chiều dọc 9:16.',
        'Chữ nằm vùng giữa màn hình, không sát mép trên và dưới.',
        'Mỗi story ngắn 5–15 giây, một ý duy nhất.',
        'Mỗi ngày có ít nhất 1 story dùng thanh bình chọn hoặc hộp câu hỏi.',
        'Không quá 2 story sản phẩm mỗi ngày.',
        'Trả lời mọi người bình chọn hoặc nhắn tin sau story trong ngày.'
      ] },
      { t: 'h', x: 'Cách đăng story' },
      { t: 'ul', items: [
        'Facebook: vào trang của bạn → Tạo tin (Create story) → chọn ảnh hoặc video → thêm chữ, hình dán, thanh bình chọn → Chia sẻ lên tin.',
        'TikTok: bấm nút + → chọn Story → quay hoặc chọn ảnh → thêm chữ → Đăng.',
        'Tên nút có thể khác theo phiên bản. Story tự biến mất sau 24 giờ.'
      ] },
      { t: 'copy', title: 'Mẫu story 1: chào buổi sáng (có bình chọn)', x: 'Sáng nay chị ăn gì đầu tiên?\n[ Trứng / rau ]   [ Bún, phở, xôi ]   [ Chưa ăn gì ]' },
      { t: 'copy', title: 'Mẫu story 3: sản phẩm', x: '[Tên sản phẩm]\nDùng như thế nào: [1 dòng theo nhãn]\nChị muốn biết thêm, nhắn mình nhé 💛' },
      { t: 'copy', title: 'Mẫu story 4: hộp câu hỏi', x: 'Chị muốn mình làm video về chủ đề nào tuần này?\nGhi câu hỏi vào đây, mình sẽ trả lời.' },
      { t: 'copy', title: 'Mẫu story 5: nhắc video tối', x: 'Tối nay lúc [giờ] có video: [tên video].\nChị nhớ xem nhé!' },

      { t: 'h', x: 'B. Bài ảnh mỗi ngày (ưu tiên ảnh sản phẩm)' },
      { t: 'svg', k: 'productphoto', cap: 'Một bài ảnh sản phẩm gồm ảnh sạch, chữ ngắn và caption có lời mời' },
      { t: 'p', x: 'Mỗi ngày đăng 1 bài ảnh, tốt nhất vào buổi trưa. Mỗi ngày một kiểu ảnh để người xem không thấy lặp lại.' },
      { t: 'tbl', head: ['Thứ', 'Kiểu ảnh', 'Ý chính của bài'], rows: [
        ['2', 'Ảnh sản phẩm chính, nền sáng', 'Sản phẩm là gì, dùng cho ai (theo nhãn)'],
        ['3', 'Ảnh bộ sản phẩm (set)', 'Set 15–30 ngày gồm những gì'],
        ['4', 'Ảnh cách dùng', 'Dùng từng bước như thế nào'],
        ['5', 'Ảnh mở hộp', 'Nhận hàng sẽ có gì bên trong'],
        ['6', 'Ảnh khách nhận hàng', 'Chỉ dùng khi khách đồng ý, ảnh thật'],
        ['7', 'Ảnh hỏi đáp', '1 câu hay gặp và câu trả lời ngắn'],
        ['CN', 'Ảnh ưu đãi cuối tuần', 'Ưu đãi (nếu có) và cách đặt']
      ] },
      { t: 'h', x: 'Cách chụp ảnh sản phẩm' },
      { t: 'ck', items: [
        'Chụp gần cửa sổ, ánh sáng ban ngày, không dùng đèn flash.',
        'Nền trơn, sáng, gọn, không đồ lộn xộn xung quanh.',
        'Một sản phẩm chính nằm ở giữa, nhìn rõ nhãn.',
        'Chụp 3 góc: chính diện, nghiêng, cận cảnh.',
        'Lau sạch sản phẩm và ống kính trước khi chụp.',
        'Ảnh dọc tỉ lệ 4:5 hoặc vuông 1:1, không filter nặng.',
        'Chữ trên ảnh tối đa 6 từ, dễ đọc.',
        'Chụp một buổi cho 7 ngày liền, đặt tên file theo thứ tự ngày đăng.'
      ] },
      { t: 'copy', title: 'Mẫu caption bài ảnh sản phẩm', x: '[Câu hỏi về vấn đề của khách, 1 câu]\n\n[Sản phẩm là gì, dùng thế nào, theo đúng nhãn, 2–3 dòng]\n\nChị đang dùng thuốc hoặc có bệnh nền thì hỏi bác sĩ trước khi dùng nhé.\n\n👉 Nhắn mình hoặc comment [TỪ KHÓA] để được tư vấn.' },
      { t: 'warn', x: '<b class="l">Quy tắc khi đẩy sản phẩm sức khỏe</b>Chỉ nói công dụng được ghi trên nhãn. Không hứa giảm bao nhiêu cân, không nói chữa hay thay thế thuốc. Ảnh khách hàng phải thật và có sự đồng ý của họ, không chỉnh sửa. Mỗi ngày chỉ 1 bài ảnh và tối đa 2 story sản phẩm, còn lại là nội dung có ích.' },
      { t: 'tip', x: 'Xong bước này khi bạn có kế hoạch 28 ngày × (1 bài ảnh + 4–6 story) và đã chụp xong ảnh sản phẩm cho 7 ngày đầu.' }
    ]
  },

  {
    id: 's2-5', grp: 'g2', n: '2.5', title: '10 dạng nội dung lặp lại (theo kênh tham khảo)',
    lead: 'Kênh tham khảo không nghĩ chủ đề mới mỗi ngày. Họ lặp lại khoảng 10 dạng video, chỉ đổi chủ đề bên trong. Bạn làm giống vậy: chọn dạng, thay nội dung, quay.',
    blocks: [
      { t: 'tbl', head: ['#', 'Dạng', 'Nhóm', 'Từ khóa gợi ý'], rows: [
        ['1', 'Danh sách thực phẩm no lâu', 'Cho đi', 'ĐĨA'],
        ['2', 'Danh sách 16:8 ăn gì, không ăn gì', 'Cho đi', '16:8'],
        ['3', 'Danh sách dấu hiệu cơ thể', 'Cho đi', 'INSULIN'],
        ['4', 'Danh sách lý do bỏ bữa sáng vẫn béo', 'Cho đi', 'SÁNG'],
        ['5', 'Nỗi đau: bụng to, nghi kháng insulin', 'Cho đi / Đẩy', 'INSULIN'],
        ['6', 'Chị em U40 muốn g.o.n, ph.ã.ng tự tin', 'Đẩy', 'GỌN'],
        ['7', 'Mở hộp set 15–30 ngày', 'Đẩy', 'SET'],
        ['8', 'Gói trải nghiệm mỗi sáng', 'Đẩy', 'TRẢI NGHIỆM'],
        ['9', 'Mốc 30–60 ngày', 'Đẩy', 'LỘ TRÌNH'],
        ['10', 'Nói thẳng vào camera', 'Đẩy', 'TƯ VẤN']
      ] },
      { t: 'note', x: '<b class="l">Cách viết chữ có dấu chấm</b>Kênh tham khảo viết "g.o.n", "x.e.p", "ph.ã.ng" có dấu chấm xen giữa để tránh bộ lọc từ khóa của Facebook. Mình giữ nguyên cách viết này ở tiêu đề và chữ trên khung hình. Chỉ viết vậy cho vài từ nhạy cảm (gọn, xẹp, phẳng), còn lại viết bình thường để người xem dễ đọc. Cách này không đảm bảo tránh được hạn chế, nên đừng dựa vào nó mà viết lời hứa kết quả.' },
      { t: 'warn', x: '<b class="l">Khác với kênh tham khảo</b>Kênh tham khảo có tiêu đề như "sát thủ của chất béo" hay "mỡ xấu ăn mòn cơ thể", nói chưa chính xác. Mình giữ cấu trúc danh sách đánh số, nhưng viết lại cho đúng và dùng "gợi ý, có thể, tuỳ cơ địa". Không hứa số cân, không nói chữa bệnh.' },

      { t: 'h', x: 'Dạng 1 · Danh sách thực phẩm no lâu' },
      { t: 'ul', items: ['5 thực phẩm no lâu cho U40 muốn g.o.n bụng', '5 món bữa sáng nhiều đạm, đỡ đói lả giữa buổi', 'Đĩa ăn của chị em U40 nên có những gì?'] },
      { t: 'copy', title: 'Chữ trên khung hình (dạng 1)', x: '5 THỰC PHẨM NO LÂU\nCHO U40 MUỐN G.O.N BỤNG\n\n1. Trứng: nhiều đạm, giúp no lâu hơn bữa toàn tinh bột\n2. Thịt bò nạc hoặc ức gà: đạm, ít béo\n3. Cá, tôm: đạm dễ ăn, chế biến nhanh\n4. Rau xanh: nhiều chất xơ, ăn trước cơm\n5. Đậu hũ, đậu các loại: đạm thực vật\n\nTuỳ cơ địa mỗi người. Có bệnh nền thì hỏi bác sĩ.' },
      { t: 'copy', title: 'Caption + từ khóa (dạng 1)', x: 'Chị em U40 hay đói giữa buổi vì bữa ăn thiếu đạm và rau. Chị đang thiếu món nào trong 5 món này?\n\nComment "ĐĨA" mình gửi mẫu chia đĩa ăn miễn phí.' },

      { t: 'h', x: 'Dạng 2 · 16:8 ăn gì, không ăn gì' },
      { t: 'ul', items: ['Áp dụng 16:8: ăn gì và không ăn gì?', '16:8 uống gì thì không bị phá nhịn?', '7 điều nên biết trước khi thử 16:8'] },
      { t: 'copy', title: 'Chữ trên khung hình (dạng 2)', x: 'ÁP DỤNG 16:8\nĂN GÌ VÀ KHÔNG ĂN GÌ?\n\n1. Trong giờ nhịn: được uống nước lọc đều hàng ngày\n2. Được cà phê đen và trà không đường\n3. Không uống nước ngọt có gas\n4. Phá nhịn: cà phê sữa, sữa, nước ép (có đường, có calo)\n5. Trong giờ ăn: rau và đạm trước, tinh bột sau\n6. Không nhịn xong rồi ăn bù thật nhiều\n\nKhông phù hợp: phụ nữ mang thai, người dùng thuốc tiểu đường, người có rối loạn ăn uống. Hỏi bác sĩ trước.' },
      { t: 'copy', title: 'Caption + từ khóa (dạng 2)', x: 'Nhiều chị thử 16:8 nhưng làm sai chỗ uống gì trong giờ nhịn. Chị đã thử chưa?\n\nComment "16:8" mình gửi lịch ăn 7 ngày cho người mới.' },

      { t: 'h', x: 'Dạng 3 · Danh sách dấu hiệu cơ thể' },
      { t: 'ul', items: ['7 dấu hiệu bụng to có thể liên quan kháng insulin', 'Sau 35 tuổi, thấy 6 dấu hiệu này thì đừng chủ quan', 'Cơ thể báo gì khi đường huyết lên xuống thất thường?'] },
      { t: 'copy', title: 'Chữ trên khung hình (dạng 3)', x: '7 DẤU HIỆU\nCÓ THỂ LIÊN QUAN KHÁNG INSULIN\n\n1. Mỡ tập trung ở bụng\n2. Thèm đồ ngọt, tinh bột\n3. Buồn ngủ sau bữa ăn\n4. Mệt mỏi dù ngủ đủ\n5. Da sạm ở cổ, nách\n6. Đói nhanh sau khi ăn\n7. Cân nặng tăng dù ăn không nhiều\n\nĐây chỉ là gợi ý. Muốn biết chắc cần xét nghiệm và hỏi bác sĩ.' },
      { t: 'copy', title: 'Caption + từ khóa (dạng 3)', x: 'Chị gặp mấy dấu hiệu trong 7 cái này? Comment số cho mình biết nhé.\n\nComment "INSULIN" mình gửi bảng tự kiểm tra và câu hỏi nên hỏi bác sĩ.' },

      { t: 'h', x: 'Dạng 4 · Lý do bỏ bữa sáng vẫn béo' },
      { t: 'ul', items: ['7 lý do bỏ bữa sáng mà vẫn không g.o.n', 'Bỏ bữa sáng nhưng vẫn khó xuống? Có thể do 7 điều này', 'Vì sao chị ăn ít mà bụng vẫn không x.e.p?'] },
      { t: 'copy', title: 'Chữ trên khung hình (dạng 4)', x: '7 LÝ DO BỎ BỮA SÁNG\nVẪN KHÔNG G.O.N\n\n1. Sáng chỉ uống cà phê sữa, coi như một bữa\n2. Trưa và tối ăn bù cho bữa đã bỏ\n3. Khoảng 10 giờ sáng ăn lặt vặt\n4. Chiều ăn thêm bữa phụ\n5. Bữa tối ăn nhiều vì đói cả ngày\n6. Bữa nào cũng thiếu đạm\n7. Ít vận động\n\nTuỳ cơ địa, chỉnh cho hợp với bạn.' },
      { t: 'copy', title: 'Caption + từ khóa (dạng 4)', x: 'Bỏ một bữa chưa chắc đã ăn ít đi. Chị đang dính mấy lý do?\n\nComment "SÁNG" mình gửi gợi ý bữa sáng đơn giản.' },

      { t: 'h', x: 'Dạng 5 · Nỗi đau: bụng to, nghi kháng insulin' },
      { t: 'ul', items: ['Thêm 1 chị U40 bụng to như trống, nghi kháng insulin', 'Chị em U40: ăn ít mà bụng vẫn to, đã thử gì chưa?', 'U40 bụng to chai lì, vì sao khó xuống?'] },
      { t: 'copy', title: 'Kịch bản nói (dạng 5, 30–40 giây)', x: 'Mở: Chị em U40 mà bụng to, ăn ít vẫn không xuống, chị nào cũng nghe câu này rồi.\n\nThân: Sau 35 tuổi, cơ thể thay đổi: ngủ ít hơn, stress nhiều hơn, vận động ít đi. Có người còn nghi mình kháng insulin, nhưng chỉ xét nghiệm mới biết chắc.\n\nGợi ý: ăn đủ đạm và rau, ngủ đủ, đi bộ sau bữa ăn. Làm từ từ, đừng nhịn đói quá mức.\n\nKết: Chị nào đang bị vậy, comment "INSULIN", mình gửi bảng tự kiểm tra miễn phí.' },
      { t: 'note', x: 'Dạng 5 chỉ dùng giọng của chính bạn. Không dựng nhân vật "khách hàng" giả, không đăng lại ảnh người khác.' },

      { t: 'h', x: 'Dạng 6 · Chị em U40 muốn g.o.n, ph.ã.ng tự tin' },
      { t: 'ul', items: ['Chị em U40 V2 g.o.n ph.ã.ng tự tin', 'U40 muốn g.o.n thì bắt đầu từ đâu?', 'Tuần đầu của chị em U40 muốn x.e.p bụng'] },
      { t: 'copy', title: 'Kịch bản nói (dạng 6, 30 giây)', x: 'Chị em U40 muốn g.o.n lại nhưng không biết bắt đầu từ đâu? Mình chia sẻ 3 việc làm tuần đầu: ăn đủ đạm và rau, uống đủ nước, đi bộ 15 phút sau bữa tối. Chỉ vậy thôi, không cần nhịn đói.\n\nChị muốn có kế hoạch 7 ngày chi tiết, comment "GỌN" mình gửi.' },

      { t: 'h', x: 'Dạng 7 · Mở hộp set 15–30 ngày' },
      { t: 'ul', items: ['Set 15–30 ngày U40 muốn V2 g.o.n', '15 ngày trải nghiệm U40 muốn V2 g.o.n', 'Mở hộp set của mình: bên trong có gì?'] },
      { t: 'copy', title: 'Kịch bản quay (dạng 7, 20–30 giây, không cần nói nhiều)', x: 'Cảnh 1: Hộp đóng kín trên bàn, chữ "SET 15–30 NGÀY" (2 giây)\nCảnh 2: Mở hộp, quay cận cảnh từng món bên trong (8 giây)\nCảnh 3: Cầm từng món lên, chữ ghi tên (8 giây)\nCảnh 4: Cách dùng 1 dòng theo nhãn: [ghi đúng như nhãn] (5 giây)\nCảnh 5: Chữ "Nhắn [SET] để được tư vấn" (3 giây)' },
      { t: 'copy', title: 'Caption (dạng 7)', x: 'Mở hộp set [tên sản phẩm]: bên trong có gì, dùng thế nào theo nhãn.\n\nChị đang dùng thuốc hoặc có bệnh nền thì hỏi bác sĩ trước khi dùng nhé.\n\nComment "SET" để được tư vấn.' },

      { t: 'h', x: 'Dạng 8 · Gói trải nghiệm mỗi sáng' },
      { t: 'ul', items: ['10 gói trải nghiệm cho U40 nhẹ bụng mỗi sáng', '10 gói mẫu mời U40 thử mỗi sáng', 'Mình mời chị em U40 trải nghiệm 10 gói đầu tiên'] },
      { t: 'copy', title: 'Kịch bản nói (dạng 8, 25 giây)', x: 'Mình có bộ 10 gói trải nghiệm cho chị em U40 muốn thử mỗi sáng. Gói này là [tên sản phẩm], dùng theo đúng hướng dẫn trên nhãn: [1 dòng]. Ai chưa biết có hợp không thì thử bộ nhỏ trước.\n\nChị đang dùng thuốc hoặc có bệnh nền thì hỏi bác sĩ trước.\n\nComment "TRẢI NGHIỆM", mình nhắn chi tiết.' },

      { t: 'h', x: 'Dạng 9 · Mốc 30–60 ngày' },
      { t: 'ul', items: ['30–60 ngày U40 muốn V2 g.o.n đón Tết', '30 ngày đầu của chị em U40 muốn g.o.n', 'Lộ trình 60 ngày cho người mới bắt đầu'] },
      { t: 'copy', title: 'Kịch bản nói (dạng 9, 30 giây)', x: 'Chị muốn g.o.n đón Tết thì bắt đầu từ bây giờ. Mình chia 60 ngày thành 2 giai đoạn: 30 ngày đầu tập thói quen ăn đủ đạm, rau, ngủ đủ; 30 ngày sau giữ nhịp và theo dõi số đo. Mỗi người mỗi cơ địa, kết quả khác nhau.\n\nComment "LỘ TRÌNH" mình gửi lộ trình chi tiết.' },
      { t: 'warn', x: 'Không ghi số cân sẽ giảm trong 30–60 ngày. Chỉ nói về thói quen và việc theo dõi số đo.' },

      { t: 'h', x: 'Dạng 10 · Nói thẳng vào camera' },
      { t: 'ul', items: ['U40 bụng to khó xuống, nhẹ V2 mỗi sáng', 'U40 khó xuống, x.e.p nhẹ V2 mỗi sáng', 'Chị em U40 nào đang bị khó xuống bụng?'] },
      { t: 'copy', title: 'Kịch bản nói (dạng 10, 30–40 giây)', x: 'Chị em U40 nào bụng to, khó xuống mà đã thử nhiều cách? Mình hiểu cảm giác đó. Mỗi sáng mình giữ một thói quen đơn giản: uống nước, ăn đủ đạm, đi bộ nhẹ. Ai muốn mình hướng dẫn thêm, mình có nhóm Zalo chia sẻ miễn phí.\n\nComment "TƯ VẤN", mình nhắn chi tiết.' },

      { t: 'note', x: 'Lịch đăng bài cả tuần (giờ nào đăng dạng nào) nằm ở bước 2.6. Nhạc nền cho từng dạng nằm ở bước 2.7.' },
      { t: 'tip', x: 'Xong bước này khi bạn đã chọn từ khóa cho 10 dạng và quay thử được ít nhất 1 video mỗi dạng.' }
    ]
  },

  {
    id: 's2-6', grp: 'g2', n: '2.6', title: 'Lịch đăng bài 1 tuần',
    lead: 'Bảng tổng cho cả tuần: giờ nào đăng video nào, ảnh nào, story nào. In ra hoặc để mở sẵn, mỗi ngày làm theo bảng.',
    blocks: [
      { t: 'p', x: 'Mỗi ô là 1 việc cần đăng. "Dạng 2" nghĩa là làm video theo dạng 2 ở bước 2.5. Kéo bảng sang ngang để xem đủ 7 ngày.' },
      { t: 'tbl', wide: true, head: ['Giờ', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'], rows: [
        ['7:00', '📱 Đăng cả 5 story một lượt', '📱 Đăng cả 5 story một lượt', '📱 Đăng cả 5 story một lượt', '📱 Đăng cả 5 story một lượt', '📱 Đăng cả 5 story một lượt', '📱 Đăng cả 5 story một lượt', '📱 Đăng cả 5 story một lượt'],
        ['8:00', '🎬 Video: Dạng 2 (16:8)', '🎬 Video: Dạng 3 (dấu hiệu)', '🎬 Video: Dạng 4 (bỏ bữa sáng)', '🎬 Video: Dạng 2 (16:8)', '🎬 Video: Dạng 1 (no lâu)', '🎬 Video: Dạng 4 (bỏ bữa sáng)', '🎬 Video: Dạng 3 (dấu hiệu)'],
        ['12:00', '🖼 Ảnh: sản phẩm chính', '🖼 Ảnh: bộ set', '🖼 Ảnh: cách dùng', '🖼 Ảnh: mở hộp', '🖼 Ảnh: khách nhận hàng', '🖼 Ảnh: hỏi đáp', '🖼 Ảnh: ưu đãi cuối tuần'],
        ['15:00', '🎬 Video: Dạng 6 (U40 g.o.n)', '🎬 Video: Dạng 8 (gói trải nghiệm)', '🎬 Video: Dạng 7 (mở hộp)', '🎬 Video: Dạng 10 (nói với camera)', '🎬 Video: Dạng 9 (30–60 ngày)', '🎬 Video: Dạng 6 (U40 g.o.n)', '🎬 Video: Dạng 10 (nói với camera)'],
        ['20:00', '🎬 Video: Dạng 1 (no lâu)', '🎬 Video: Dạng 5 (nỗi đau)', '🎬 Video: Dạng 1 (no lâu)', '🎬 Video: Dạng 3 (dấu hiệu)', '🎬 Video: Dạng 5 (nỗi đau)', '🎬 Video: Dạng 2 (16:8)', '🎬 Video: Dạng 4 (bỏ bữa sáng)'],
      ] },
      { t: 'ck', items: [
        'Cuối mỗi ngày: trả lời hết comment và tin nhắn.',
        'Mỗi ngày tổng cộng 3 video + 1 ảnh + 5 story.',
        'Story: quay một lần, đăng liền nhau lúc 7:00 (thứ tự: chào sáng, hậu trường, sản phẩm, tương tác, nhắc video tối). Story 6 mời nhận tài liệu thêm khi còn thời gian.',
        'Sau 2–3 tuần, xem Insights, giữ 3 giờ đăng video có view cao nhất.'
      ] },
      { t: 'p', x: 'Dạng 1–5 là video có giá trị, đều kết thúc bằng lời mời comment từ khóa để nhận tài liệu, nên vừa là video "Cho đi" vừa là video "Đẩy" ở bước 2.3. Dạng 6–10 là video đẩy sản phẩm, mỗi ngày tối đa 1 video. Giờ đăng vẫn theo lịch ở bước 2.3.' },
      { t: 'tip', x: 'Xong bước này khi bạn có bảng lịch tuần này và đã đặt lịch đăng (hoặc nhắc giờ) cho 3 video, 1 ảnh và cụm story của ngày mai.' }
    ]
  },

  {
    id: 's2-7', grp: 'g2', n: '2.7', title: 'Nhạc nền (sound) & cách chèn vào video',
    lead: 'Kênh tham khảo chỉ dùng 4 bản nhạc piano nhẹ, lặp đi lặp lại. Bạn dùng đúng kiểu đó: chọn nhạc trong thư viện, hạ nhỏ âm lượng, để giọng nói là chính.',
    blocks: [
      { t: 'svg', k: 'soundmix', cap: 'Giọng nói to, nhạc nền chỉ nhỏ phía sau' },
      { t: 'h', x: 'A. 4 bản nhạc kênh tham khảo dùng' },
      { t: 'tbl', head: ['Sound (tên hiển thị)', 'Video dùng', 'Dùng cho dạng'], rows: [
        ['Adrián Berenguer · Little Things (Piano Version)', '13/25 video', 'Dạng 5–10: nỗi đau, mở hộp, gói trải nghiệm, nói với camera'],
        ['Dhruv Goel · The Simple Life', '5/25 video', 'Dạng 1, 3: danh sách thực phẩm, danh sách dấu hiệu'],
        ['Chillout · Extraordinary Moment', '2/25 video', 'Dạng 2, 4: 16:8, lý do bỏ bữa sáng'],
        ['Penguin Piano · Love Story (Indila)', '1/25 video', 'Thay đổi cho đỡ lặp'],
        ['Original audio (giọng nói gốc, không nhạc)', '4/25 video', 'Dạng 10: nói thẳng vào camera']
      ] },
      { t: 'note', x: '<b class="l">Quy tắc chọn nhạc</b>Nhạc piano hoặc nhạc nhẹ chậm, không lời. Mỗi dạng nội dung gắn một bài cố định để kênh có "chất" riêng. Chọn nhạc trong thư viện của Facebook hoặc TikTok, không tải file về.' },

      { t: 'h', x: 'B. Nghe thử các bản nhạc' },
      { t: 'p', x: 'Các link dưới đây chỉ để <b>nghe thử</b> xem bài nghe thế nào, giúp bạn tìm đúng tên bài trong thư viện.' },
      { t: 'p', x: '🎵 <b>Little Things (Piano Version) · Adrián Berenguer</b><br><a href="https://www.youtube.com/results?search_query=Little%20Things%20%28Piano%20Version%29%20Adri%C3%A1n%20Berenguer" target="_blank" rel="noopener">▶ Nghe thử trên YouTube</a> · <a href="https://open.spotify.com/search/Little%20Things%20%28Piano%20Version%29%20Adri%C3%A1n%20Berenguer" target="_blank" rel="noopener">▶ Nghe thử trên Spotify</a>' },
      { t: 'p', x: '🎵 <b>The Simple Life · Dhruv Goel</b><br><a href="https://www.youtube.com/results?search_query=The%20Simple%20Life%20Dhruv%20Goel" target="_blank" rel="noopener">▶ Nghe thử trên YouTube</a> · <a href="https://open.spotify.com/search/The%20Simple%20Life%20Dhruv%20Goel" target="_blank" rel="noopener">▶ Nghe thử trên Spotify</a>' },
      { t: 'p', x: '🎵 <b>Extraordinary Moment · Chillout</b><br><a href="https://www.youtube.com/results?search_query=Extraordinary%20Moment%20Chillout" target="_blank" rel="noopener">▶ Nghe thử trên YouTube</a> · <a href="https://open.spotify.com/search/Extraordinary%20Moment%20Chillout" target="_blank" rel="noopener">▶ Nghe thử trên Spotify</a>' },
      { t: 'p', x: '🎵 <b>Love Story (Piano) · Penguin Piano</b><br><a href="https://www.youtube.com/results?search_query=Love%20Story%20%28Piano%29%20Penguin%20Piano" target="_blank" rel="noopener">▶ Nghe thử trên YouTube</a> · <a href="https://open.spotify.com/search/Love%20Story%20%28Piano%29%20Penguin%20Piano" target="_blank" rel="noopener">▶ Nghe thử trên Spotify</a>' },
      { t: 'warn', x: '<b class="l">Không có link tải file nhạc</b>Mình không đưa link tải mp3 vì nhạc có bản quyền. Tải về rồi gắn vào video dễ bị gỡ video hoặc tắt tiếng. Cách đúng là chọn bài ngay trong thư viện nhạc của Facebook, TikTok (hoặc CapCut). Nhạc trong thư viện được cấp phép cho nền tảng đó. Nếu tài khoản của bạn là fanpage mà không thấy bài nào, chọn nhạc piano nhẹ khác trong mục "Bộ sưu tập âm thanh" của Facebook.' },

      { t: 'h', x: 'C. Chèn nhạc ngay khi đăng Reels trên Facebook (khuyên dùng)' },
      { t: 'p', x: 'Cách này dùng được đúng các bài kênh tham khảo dùng, vì chúng nằm trong thư viện của Facebook. Video chỉ có giọng nói, nhạc gắn lúc đăng.' },
      { t: 'ck', items: [
        'Mở Facebook, vào trang của bạn, bấm "Reels" rồi "Tạo thước phim" (hoặc dấu + rồi Reels).',
        'Chọn video đã dựng xong (chỉ có giọng nói, chưa có nhạc).',
        'Bấm biểu tượng nốt nhạc 🎵 "Âm thanh".',
        'Gõ tên bài vào ô tìm kiếm, ví dụ "Little Things".',
        'Bấm vào bài đúng tên và tên nghệ sĩ, bấm "Nghe thử" nếu muốn nghe.',
        'Kéo thanh để chọn đoạn nhạc bắt đầu từ chỗ nào, rồi bấm "Xong".',
        'Bấm "Âm lượng": kéo âm thanh gốc (giọng nói) lên 100%, kéo nhạc xuống 10–15%.',
        'Xem lại video một lần: nghe rõ giọng nói, nhạc nhỏ phía sau thì bấm "Tiếp" để đăng.'
      ] },
      { t: 'h', x: 'D. Chèn nhạc ngay khi đăng video TikTok' },
      { t: 'ck', items: [
        'Bấm nút + rồi "Tải lên" và chọn video của bạn.',
        'Bấm "Tiếp", rồi bấm "Âm thanh" ở phía trên màn hình.',
        'Gõ tên bài vào ô tìm kiếm rồi chọn bài có tên giống kênh tham khảo.',
        'Bấm "Âm lượng": âm thanh gốc 100%, nhạc 10–15%.',
        'Bấm dấu ✓ rồi đăng như bình thường.'
      ] },
      { t: 'h', x: 'E. Chèn nhạc trong CapCut (nếu muốn làm sẵn khi dựng)' },
      { t: 'ck', items: [
        'Mở dự án video trong CapCut, kéo thanh thời gian về đầu video.',
        'Bấm "Âm thanh" ở thanh công cụ dưới cùng, rồi "Âm thanh" một lần nữa.',
        'Gõ tên bài vào ô tìm kiếm, bấm vào bài và bấm dấu + để thêm vào video.',
        'Nhạc xuất hiện thành một thanh riêng. Kéo đuôi thanh nhạc cho vừa bằng độ dài video.',
        'Bấm vào thanh nhạc, chọn "Âm lượng" rồi kéo xuống 10–15%.',
        'Bấm vào thanh giọng nói của video, kiểm tra âm lượng ở mức 100%.',
        'Bấm vào thanh nhạc, chọn "Mờ dần" (Fade) và đặt mờ cuối 2 giây để nhạc nhỏ dần khi hết video.',
        'Bấm xuất video. Nếu đã chèn nhạc trong CapCut thì khi đăng không chèn thêm nhạc lần nữa, tránh bị 2 lớp nhạc.'
      ] },
      { t: 'note', x: 'Tên nút trong Facebook, TikTok và CapCut có thể khác chút theo phiên bản. Nếu không thấy, tìm biểu tượng nốt nhạc 🎵 hoặc chữ "Âm thanh".' },
      { t: 'tip', x: 'Xong bước này khi bạn chèn được nhạc vào 1 video, nghe rõ giọng nói và nhạc nhỏ phía sau (âm lượng nhạc 10–15%).' }
    ]
  },

  {
    id: 's3-1', grp: 'g3', n: '3.1', title: 'Quay dư video để không đứt lịch',
    lead: 'Phải quay đủ video đăng trong 3 ngày trước khi bắt đầu. Mỗi ngày quay sẵn ít nhất cho 1–2 ngày sắp tới.',
    blocks: [
      { t: 'svg', k: 'stock', cap: 'Luôn giữ kho video dự trữ' },
      { t: 'ul', items: [
        'Tối thiểu trước ngày đầu tiên đăng: 9 video (3 ngày × 3 video).',
        'Sau đó mỗi ngày quay thêm 3–6 video để luôn dư ít nhất 1–2 ngày.',
        'Chuẩn bị thêm ảnh sản phẩm cho 7 ngày đầu và nội dung story cho 3 ngày đầu (xem bước 2.4).'
      ] },
      { t: 'h', x: 'Một buổi quay (khoảng 2–3 giờ cho 9 video)' },
      { t: 'ck', items: [
        'In hoặc mở sẵn 9 kịch bản.',
        'Chuẩn bị chân đỡ, ánh sáng, micro, ly nước, 2–3 bộ trang phục.',
        'Quay lần lượt từng video, mỗi video 2 lần.',
        'Đặt tên file theo mẫu bên dưới.',
        'Sao lưu lên Google Drive hoặc ổ ngoài ngay sau khi quay.',
        'Dựng theo thứ tự ngày đăng (xem bước 2.2).'
      ] },
      { t: 'copy', title: 'Mẫu đặt tên file', x: 'N01-20h-ChoDi-7DauHieu\nN01-08h-Day-NhanTaiLieu' },
      { t: 'tbl', head: ['Ngày đăng', 'Video', 'Đã quay', 'Đã dựng', 'Đã lên lịch'], rows: [
        ['N01', 'Cho đi: 7 dấu hiệu', '☐', '☐', '☐'],
        ['N01', 'Đẩy: nhận tài liệu', '☐', '☐', '☐'],
        ['N01', 'Đẩy: mời nhóm Zalo', '☐', '☐', '☐']
      ] },
      { t: 'tip', x: 'Xong bước này khi bạn có 9 video đã quay, dựng và lên lịch.' }
    ]
  },
  {
    id: 's3-2', grp: 'g3', n: '3.2', title: 'Bám sát kịch bản, không tự sáng tạo thêm',
    lead: 'Người mới càng bám sát kịch bản và lịch thì càng ít sai. Sáng tạo để dành khi đã có kinh nghiệm.',
    blocks: [
      { t: 'tbl', head: ['Được làm', 'Không được làm'], rows: [
        ['Nói đúng ý, đúng thứ tự trong kịch bản', 'Thêm lời hứa kết quả, thêm công dụng'],
        ['Đổi cách nói cho tự nhiên (giữ nguyên ý và con số)', 'Đổi từ khóa comment'],
        ['Sửa lỗi chính tả và lời nói vấp', 'Đổi thứ tự lịch đăng'],
        ['Ghi câu hỏi vào sổ rồi hỏi người phụ trách', 'Đăng thêm video ngoài lịch']
      ] },
      { t: 'tip', x: 'Thấy kịch bản sai thông tin hoặc khó nói thì ghi vào sổ "câu hỏi" và hỏi người phụ trách. Đừng tự sửa nội dung.' },
      { t: 'h', x: 'Kiểm tra trước khi đăng (60 giây)' },
      { t: 'ck', items: [
        'Đúng kịch bản, đúng ngày?',
        'Chữ không bị che, không sai chính tả?',
        'Có câu cảnh báo (nếu video nói về dấu hiệu bệnh)?',
        'Có từ khóa comment đúng?'
      ] }
    ]
  },
  {
    id: 's3-3', grp: 'g3', n: '3.3', title: 'Đăng video, seeding comment, đẩy về Zoom/Zalo',
    lead: 'Đăng đúng giờ, có vài comment thật ngay từ đầu, rồi dẫn người xem về nhóm và buổi Zoom.',
    blocks: [
      { t: 'svg', k: 'postflow', cap: 'Các mốc sau khi bấm đăng' },
      { t: 'h', x: 'A. Quy trình đăng 1 video' },
      { t: 'ck', items: [
        'Mở Facebook (Meta Business Suite) hoặc TikTok.',
        'Chọn video đã dựng, viết caption theo mẫu trong kịch bản (có câu hỏi và từ khóa).',
        'Thêm 4–6 hashtag.',
        'Chọn giờ đăng theo lịch ở bước 2.3.',
        'Đăng hoặc lên lịch.',
        'Trong 5 phút đầu: ghim comment đã soạn sẵn (có từ khóa).',
        'Trong 30 phút đầu: trả lời mọi comment.',
        'Đăng bài ảnh sản phẩm lúc trưa và đăng cả cụm story một lượt buổi sáng (bước 2.4).'
      ] },
      { t: 'h', x: 'B. Seeding comment' },
      { t: 'p', x: '<b>Seeding comment</b> là có vài comment thật ngay khi video lên, để người đến sau thấy đã có người quan tâm và dễ để lại comment hơn.' },
      { t: 'svg', k: 'seeding', cap: 'Seeding đúng cách và sai cách' },
      { t: 'ul', items: [
        'Bộ công cụ gồm: kho 30–50 câu comment mẫu theo chủ đề, danh sách tài khoản thật của team, bảng phân công ai comment video nào giờ nào, bảng theo dõi.',
        'Ngay sau khi đăng, 2–3 người trong team vào xem video và comment theo kho mẫu.',
        'Comment ở các thời điểm khác nhau, không dồn cùng một phút.',
        'Mỗi người viết lại bằng lời của mình, không copy y nhau.',
        'Trả lời lại comment của người xem thật.'
      ] },
      { t: 'copy', title: 'Ví dụ câu comment seeding (viết lại bằng lời mình)', x: 'Em cũng bị tình trạng này, ăn xong là buồn ngủ luôn.\nChị ơi cho em xin tài liệu ạ.\nMình áp dụng thử thứ tự rau trước cơm sau, thấy đỡ đói hơn.' },
      { t: 'warn', x: '<b class="l">Giới hạn cần nhớ</b>Chỉ dùng tài khoản thật của người thật, họ đồng ý tham gia. Không mua tài khoản ảo, không dùng phần mềm tự động comment hàng loạt: Facebook và TikTok coi đó là hành vi giả mạo, có thể giảm tiếp cận hoặc khóa kênh. Comment không được hứa kết quả hay giả làm "khách đã khỏi bệnh".' },
      { t: 'h', x: 'C. Đẩy khách về Zalo/Zoom' },
      { t: 'svg', k: 'funnel', cap: 'Dòng chảy từ người xem đến khách' },
      { t: 'ck', items: [
        'Khách comment từ khóa: trả lời công khai "Mình gửi bạn qua tin nhắn rồi nhé 💛".',
        'Nhắn riêng tin 1 (tặng tài liệu, hỏi nhu cầu).',
        'Sau khi khách trả lời, nhắn tin 2 mời vào nhóm Zalo.',
        'Khi có buổi Zoom, nhắn tin 3 mời Zoom.',
        'Ghi mọi khách vào bảng: tên, từ khóa, ngày, đã vào Zalo chưa, đã dự Zoom chưa.'
      ] },
      { t: 'copy', title: 'Tin nhắn 1: tặng tài liệu', x: 'Chào chị, đây là tài liệu mình hứa gửi chị: [tài liệu].\nCho mình hỏi nhanh: chị bao nhiêu tuổi và đang gặp khó khăn nhất ở điểm nào ạ?' },
      { t: 'copy', title: 'Tin nhắn 2: mời vào nhóm Zalo', x: 'Cảm ơn chị đã chia sẻ. Mình có nhóm Zalo chia sẻ mỗi tuần 1 thói quen nhỏ, miễn phí. Chị muốn vào không ạ?' },
      { t: 'copy', title: 'Tin nhắn 3: mời Zoom', x: 'Tối [thứ/ngày], lúc [giờ] mình có buổi Zoom chia sẻ [chủ đề] cho chị em, miễn phí. Chị muốn mình giữ chỗ không ạ?' },
      { t: 'svg', k: 'zoom', cap: 'Khung một buổi Zoom 60 phút cho người mới' },
      { t: 'tip', x: 'Trong 10 phút lời mời (phút 40–50), nói rõ đây là lời mời, không ép.' }
    ]
  },
  {
    id: 's3-4', grp: 'g3', n: '3.4', title: 'Lập cộng đồng cá nhân (Facebook/Zalo)',
    lead: 'Nhóm là nơi khách ở lại lâu dài, không phụ thuộc thuật toán của video.',
    blocks: [
      { t: 'svg', k: 'community', cap: 'Nhóm Zalo có nội quy ghim và lịch hoạt động cố định' },
      { t: 'h', x: 'Tạo nhóm Zalo' },
      { t: 'ck', items: [
        'Zalo → Tạo nhóm, đặt tên theo định vị (ví dụ "Chị em U40 sống khỏe").',
        'Ảnh nhóm: dùng ảnh đại diện của kênh.',
        'Viết nội quy và ghim đầu nhóm: tôn trọng nhau, không quảng cáo, không spam, không chia sẻ thông tin cá nhân người khác.',
        'Viết bài chào và ghim: nhóm dành cho ai, mỗi tuần có gì.',
        'Chỉ định 1–2 người quản trị, bật chế độ duyệt thành viên.'
      ] },
      { t: 'h', x: 'Tạo nhóm Facebook' },
      { t: 'ck', items: [
        'Facebook → Nhóm → Tạo nhóm mới, chọn Riêng tư.',
        'Bật duyệt thành viên, thêm 3 câu hỏi vào nhóm (tuổi, vấn đề đang gặp, đã xem kênh chưa).',
        'Đăng nội quy và bài chào, ghim lên đầu nhóm.'
      ] },
      { t: 'tbl', head: ['Thứ', 'Nội dung nhóm'], rows: [
        ['2', 'Mẹo nhỏ trong tuần (1 thói quen)'],
        ['4', 'Câu hỏi cho thành viên trả lời'],
        ['6', 'Chia sẻ tài liệu mới'],
        ['CN', 'Tổng kết tuần + thông báo Zoom']
      ] },
      { t: 'ul', items: [
        'Trả lời mọi tin nhắn và câu hỏi trong ngày.',
        'Tỉ lệ nội dung: 4 bài có ích : 1 bài giới thiệu sản phẩm.',
        'Không đưa lời khuyên y tế cho từng người. Gặp người có triệu chứng nặng, khuyên đi khám.'
      ] }
    ]
  },

  {
    id: 'daily', grp: 'g4', n: '', title: 'Checklist hằng ngày & lỗi hay gặp',
    lead: 'Dùng làm việc mỗi ngày cho người mới.',
    blocks: [
      { t: 'h', x: 'Sáng (30 phút)' },
      { t: 'ck', items: ['Kiểm tra video hôm nay đã lên lịch đủ 3 chưa', 'Đăng cả cụm 4–6 story một lượt (chào sáng, hậu trường, sản phẩm, tương tác, nhắc video tối)', 'Đăng video sáng, ghim comment', 'Trả lời comment và tin nhắn'] },
      { t: 'h', x: 'Trưa/chiều (30 phút)' },
      { t: 'ck', items: ['Đăng bài ảnh sản phẩm', 'Đăng video thứ 2', 'Seeding comment theo bảng phân công', 'Gửi tài liệu cho người comment từ khóa'] },
      { t: 'h', x: 'Tối (45 phút)' },
      { t: 'ck', items: ['Đăng video "Cho đi" lúc tối', 'Trả lời comment trong 30 phút', 'Cập nhật bảng theo dõi khách', 'Quay thêm cho 1–2 ngày sắp tới'] },
      { t: 'h', x: '6 lỗi người mới hay mắc' },
      { t: 'ul', items: [
        'Quay từng ngày rồi bị đứt lịch. Luôn giữ video dự trữ.',
        'Tự thêm ý vào kịch bản. Chỉ nói đúng ý.',
        'Đăng xong không trả comment. Phải trả trong 30 phút đầu.',
        'Bán ngay trong tin nhắn đầu. Tặng giá trị trước.',
        'Dùng tài khoản ảo seeding. Dễ bị khóa kênh.',
        'Hứa kết quả sức khỏe. Chỉ nói "gợi ý", "có thể", "tuỳ cơ địa".'
      ] }
    ]
  },
  {
    id: 'confirm', grp: 'g4', n: '', title: 'Những chỗ cần xác nhận',
    lead: 'Trang này dành cho người quản lý. Đây là các chỗ trong ghi chú tay mà người soạn tài liệu chưa chắc.',
    blocks: [
      { t: 'ul', items: [
        'Mục 1.1: câu "Tư vấn cho đối tác từ đầu vào SK QC1 của họ" đọc chưa chắc từng chữ.',
        'Mục 1.1 và 1.2: câu "Đi cùng các cam kết bảo vệ tài sản chung" nghĩa cụ thể là gì (tài liệu chưa tự thêm nội dung cho phần này).',
        'Mục 2.1: ghi chú có "Vđề xử lý" và "Tên Vân" ở phần tên đặt kênh. Tài liệu hiểu là 2 hướng đặt tên (theo vấn đề, theo người).',
        'Mục 2.3: "Σ 21 video" hiểu là mỗi tuần, nên 28 ngày là 84 video.',
        'Mục 3.3: "Đẩy Zoom TF/Zalo", "TF" nghĩa là gì.'
      ] },
      { t: 'note', x: 'Hình minh họa trong app là sơ đồ tự vẽ, không phải ảnh chụp màn hình thật. Muốn thay bằng ảnh thật, chụp màn hình và gửi lại để gắn vào đúng bước.' },
      { t: 'note', x: 'Nội dung sức khỏe trong các kịch bản và tài liệu quà nên được bác sĩ hoặc chuyên gia dinh dưỡng đọc lại trước khi đăng.' }
    ]
  }
];
