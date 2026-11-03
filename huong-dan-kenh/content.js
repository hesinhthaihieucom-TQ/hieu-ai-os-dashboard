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
    lead: 'Mỗi ngày đăng đúng 3 video theo một công thức. Lặp lại trong 28 ngày.',
    blocks: [
      { t: 'svg', k: 'daily3', cap: 'Công thức mỗi ngày: 1 video Cho đi (tối) + 2 video Đẩy (giờ linh hoạt)' },
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
    id: 's3-1', grp: 'g3', n: '3.1', title: 'Quay dư video để không đứt lịch',
    lead: 'Phải quay đủ video đăng trong 3 ngày trước khi bắt đầu. Mỗi ngày quay sẵn ít nhất cho 1–2 ngày sắp tới.',
    blocks: [
      { t: 'svg', k: 'stock', cap: 'Luôn giữ kho video dự trữ' },
      { t: 'ul', items: [
        'Tối thiểu trước ngày đầu tiên đăng: 9 video (3 ngày × 3 video).',
        'Sau đó mỗi ngày quay thêm 3–6 video để luôn dư ít nhất 1–2 ngày.'
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
        'Trong 30 phút đầu: trả lời mọi comment.'
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
      { t: 'ck', items: ['Kiểm tra video hôm nay đã lên lịch đủ 3 chưa', 'Đăng video sáng, ghim comment', 'Trả lời comment và tin nhắn'] },
      { t: 'h', x: 'Trưa/chiều (30 phút)' },
      { t: 'ck', items: ['Đăng video thứ 2', 'Seeding comment theo bảng phân công', 'Gửi tài liệu cho người comment từ khóa'] },
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
