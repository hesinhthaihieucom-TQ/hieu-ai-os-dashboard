(function(){
// "Chấm Điểm Nghiệp Tiền" (trước gọi "Thiết Lập Nhanh") — vẫn giữ đúng 7 câu hỏi số liệu gốc từ
// "Bản Đồ Sức Khỏe Tài Chính" (bandosuckhoetaichinh.netlify.app, công cụ thu lead riêng của Quỳnh)
// để điền sẵn dữ liệu ban đầu, NHƯNG thêm 1 câu Vibe Check (tâm thức) ngay sau mỗi nhóm số liệu —
// góp ý 2026-08-22: ứng dụng tài chính thường chỉ hỏi con số vô cảm, mất kết nối cảm xúc; ở đây mỗi
// lần điền số đều bắt cặp với 1 câu hỏi cảm xúc để ra thêm "Điểm Nghiệp Tiền" (0-100, KHÔNG lưu DB —
// tính lại mỗi lần làm bài, đúng nguyên tắc "không lưu điểm suy ra được" xuyên suốt app) và chỉ ra
// đang yếu nhất ở khâu nào (Đón Nhận/Chi Dùng/Đối Diện Nợ/Đón Nhận Của Người Khác — 3/4 Nút Chặn Dòng
// Tiền của app, xem tang-thuc.js NUT_CHAN_LABELS; Nút Chặn #4 "khi thấy người khác chi tiền" hiếm gặp
// hơn hẳn 3 khâu còn lại nên chưa đưa vào bài test nhanh này). Lưu vào bảng nào ĐÃ CÓ sẵn trong app
// (Quỹ Khẩn Cấp, 1 dòng Nợ gộp, Cân Đối Tài Sản tháng này) — kể cả 4 câu số income/expense/
// passive_income/income_sources (2026-08-24, góp ý Quỳnh "cần có chỗ cho những thứ đó": trước đây
// 4 số này KHÔNG có cột nào lưu, chỉ tồn tại tạm trong module_drafts, mất theo draft) đều gộp vào
// đúng dòng tc_networth_snapshots tháng này (estimated_income/estimated_expense/passive_income/
// income_sources — xem schema_full.sql). Duy chỉ Vibe Check là KHÔNG lưu, đúng nguyên tắc "không
// lưu điểm suy ra được" — làm lại bài bất cứ lúc nào vẫn tính lại đúng từ đầu.
const SEED_DEBT_NAME = 'Tổng nợ hiện tại (ước tính ban đầu)';
// Toàn bộ ô nhập tiền trong wizard này tính bằng ĐƠN VỊ TRIỆU (khớp bandosuckhoetaichinh.netlify.app)
// nhưng các bảng tc_debts/tc_emergency_fund/tc_networth_snapshots lưu bằng ĐỒNG thật — phải nhân/chia
// cho TRIEU khi ghi/đọc, nếu không số sẽ sai 1 triệu lần so với phần còn lại của app.
const TRIEU = 1000000;

const VIBE_QUESTIONS = {
  income: {
    q: 'Khi tiền về tài khoản (lương, thu nhập...), lồng ngực bạn thường ở trạng thái nào?',
    options: [
      { k:'A', points:10, label:'🟢 Hoan hỷ, biết ơn', d:'Thấy đó là thành quả xứng đáng, chúc phúc cho dòng tiền vừa về.' },
      { k:'B', points:5, label:'🟡 Hiển nhiên, vô cảm', d:'Coi đó là chuyện đương nhiên phải có, không cảm xúc gì đặc biệt.' },
      { k:'C', points:0, label:'🔴 Lo âu, co thắt', d:'Chưa kịp vui đã nghĩ ngay tới hoá đơn, nợ nần sắp phải trả.' },
    ],
  },
  expense: {
    q: 'Mỗi lần bấm chuyển khoản trả 1 hoá đơn lớn (điện, học phí, trả nợ...), bạn thường phản ứng thế nào?',
    options: [
      { k:'A', points:10, label:'🟢 Trân trọng, chúc phúc', d:'Biết ơn giá trị mình nhận được, chuyển tiền trong sự nhẹ nhõm.' },
      { k:'B', points:5, label:'🟡 Tặc lưỡi cho xong', d:'Làm theo quán tính, không để tâm nhiều.' },
      { k:'C', points:0, label:'🔴 Ấm ức, xót xa', d:'Thở dài, tiếc nuối như vừa "mất" một khoản tiền.' },
    ],
  },
  ef: {
    q: 'Nếu ngày mai nguồn thu nhập chính của bạn đột ngột dừng hẳn, cảm xúc đầu tiên trong bạn là gì?',
    options: [
      { k:'A', points:10, label:'🟢 Bình tĩnh, chấp nhận', d:'Tin vào năng lực bản thân, sẵn sàng lên kế hoạch xoay xở.' },
      { k:'B', points:5, label:'🟡 Sốt ruột, né tránh', d:'Biết là nguy nhưng không dám nghĩ tới, tự trấn an qua loa.' },
      { k:'C', points:0, label:'🔴 Hoảng loạn, mất ngủ', d:'Muốn lao ngay vào kiếm tiền thật nhanh bằng mọi giá.' },
    ],
  },
  debt: {
    q: 'Khi nghĩ về khoản nợ và người đã cho bạn vay hiện tại, bạn thường nuôi cảm xúc gì?',
    options: [
      { k:'A', points:10, label:'🟢 Biết ơn sâu sắc', d:'Coi họ là người đã tin tưởng trao nguồn lực, cam kết trả sòng phẳng.' },
      { k:'B', points:5, label:'🟡 Né tránh, trì hoãn', d:'Ngại xem tin nhắn nhắc nợ, không dám nhìn thẳng con số thật.' },
      { k:'C', points:0, label:'🔴 Oán trách, tủi thân', d:'Thấy nhục nhã hoặc trách người đang đòi nợ mình.' },
    ],
  },
  asset: {
    q: 'Động cơ sâu nhất khiến bạn muốn tích luỹ nhiều tài sản hơn là gì?',
    options: [
      { k:'A', points:10, label:'🟢 Phụng sự, kiến tạo', d:'Để lo cho gia đình ấm êm và tạo thêm giá trị cho người khác.' },
      { k:'B', points:5, label:'🟡 Sĩ diện, công nhận', d:'Để chứng minh năng lực bản thân, để người khác nể phục.' },
      { k:'C', points:0, label:'🔴 Sợ đói khổ', d:'Tích trữ vì sợ biến cố, sợ một ngày rơi vào cảnh nghèo khó.' },
    ],
  },
  passive: {
    q: 'Khi nghĩ tới việc có dòng tiền tự động chảy về đều đặn, niềm tin nào thầm thì trong đầu bạn?',
    options: [
      { k:'A', points:10, label:'🟢 Tôi xứng đáng', d:'Xứng đáng được tự do tài chính và bình an — không cần vắt kiệt sức.' },
      { k:'B', points:5, label:'🟡 Hoài nghi', d:'Nghe xa vời quá, chắc chỉ người giỏi hoặc may mắn mới có được.' },
      { k:'C', points:0, label:'🔴 Không đủ tốt', d:'Thấy bản thân còn nhiều thiếu sót, khó mà đạt tới cột mốc đó.' },
    ],
  },
  // 2 câu thêm 2026-08-22 — 6 câu trên chỉ chạm tới Trụ 4 (Tài Chính Tâm Thức); Điểm Nghiệp ở Trang
  // chủ có 5 trụ, nếu thiếu 2 câu này thì 4 trụ còn lại mãi chỉ là con số mặc định 50 (trung tính)
  // cho tới khi làm Tổng Kết Tuần nhiều lần. Xem PILLAR_SEED_MAP bên dưới để rõ câu nào seed trụ nào.
  parents: {
    q: 'Khi nghĩ về cách bố mẹ đã dạy/truyền lại quan niệm về tiền cho bạn, bạn cảm thấy thế nào?',
    options: [
      { k:'A', points:10, label:'🟢 Biết ơn', d:'Không phải vì bài học đó đúng hay tốt, mà vì tôi chọn không để nó tiếp tục chi phối cách tôi nghĩ về tiền hôm nay.' },
      { k:'B', points:5, label:'🟡 Trung lập', d:'Không nghĩ nhiều, bố mẹ dạy sao thì biết vậy.' },
      { k:'C', points:0, label:'🔴 Oán trách', d:'Ước gì bố mẹ đã dạy mình khác đi về chuyện tiền bạc.' },
    ],
  },
  partner: {
    q: 'Khi bàn chuyện tiền bạc với bạn đời/người yêu, bạn thường cảm thấy thế nào?',
    options: [
      { k:'A', points:10, label:'🟢 Cởi mở, đồng lòng', d:'Thấy đó là chuyện chung, thoải mái chia sẻ thật lòng.' },
      { k:'B', points:5, label:'🟡 Né tránh', d:'Ngại nói ra, sợ thành chuyện to tiếng.' },
      { k:'C', points:0, label:'🔴 Căng thẳng, đối đầu', d:'Thường thành tranh cãi mỗi khi đụng tới tiền.' },
    ],
  },
  // 2 câu thêm 2026-08-24 (theo góp ý Quỳnh, muốn bài test này "tốt nhất, liên hệ với phần còn lại"):
  // - witness_receive: bài test cũ chỉ chẩn đoán được Nút Chặn #2/#3 (khi CHÍNH MÌNH nhận/chi) qua
  //   income/expense — Nút Chặn #1 (khi thấy NGƯỜI KHÁC nhận tiền) chưa bao giờ được chẩn đoán ở đây,
  //   dù đã có sẵn khái niệm này ở tang-thuc.js. Thêm câu này để weakestArea có thể trỏ tới cả #1.
  // - giving: "phước phần" đúng gốc là CHO đi, không phải giữ/tích — 6 câu trước toàn hỏi về nhận/giữ/
  //   sợ mất, chưa câu nào hỏi về hành vi cho đi (dù app đã có quỹ "🎁 Cho Đi 5%" ở Ghi Chép Hàng
  //   Ngày). Seed cùng Trụ 5 với "asset" (xem PILLAR_SEED_MAP) — tích sản mà không cho đi không phải
  //   Thuận Pháp & Nhân Quả trọn vẹn.
  witness_receive: {
    q: 'Khi thấy người khác (bạn bè, đồng nghiệp) vừa nhận tin vui về tiền — thăng chức, trúng thưởng, bán hàng đắt khách — bạn cảm thấy gì đầu tiên?',
    options: [
      { k:'A', points:10, label:'🟢 Vui mừng, chúc phúc thật lòng', d:'Bạn không thấy tiền là "cuộc chơi có tổng bằng 0" — người khác giàu lên không lấy đi phần của bạn. Đây là tần số mở, giúp khơi thông dòng tiền của chính bạn.' },
      { k:'B', points:5, label:'🟡 Vui nhưng có chút chạnh lòng', d:'Chúc mừng ngoài miệng nhưng trong lòng vẫn so sánh — nhận ra được cảm xúc này đã là một bước tiến.' },
      { k:'C', points:0, label:'🔴 Ganh tị, thấy không công bằng', d:'Đây chính là Nút Chặn Dòng Tiền #1 — thấy người khác nhận tiền lại kích hoạt phản ứng phòng vệ, âm thầm dạy tâm thức rằng thịnh vượng là khan hiếm.' },
    ],
  },
  giving: {
    q: 'Khi cho/tặng tiền cho người khác (không phải trả nợ) — mừng cưới, giúp người khó khăn, biếu cha mẹ — bạn thường cảm thấy thế nào?',
    options: [
      { k:'A', points:10, label:'🟢 Nhẹ nhõm, vui vì tạo được giá trị', d:'Cho đi trong sự đủ đầy, không toan tính — đúng gốc rễ "phước phần": cho là gieo, nhận lại là quả, không cần vội thấy ngay.' },
      { k:'B', points:5, label:'🟡 Cho vì phải cho', d:'Làm theo thói quen/nghĩa vụ xã hội, chưa thật sự kết nối cảm xúc với hành động cho đi.' },
      { k:'C', points:0, label:'🔴 Tiếc, sợ cho rồi mình sẽ thiếu', d:'Nỗi sợ khan hiếm khiến việc cho đi thành gánh nặng — chính vòng lặp "giữ chặt vì sợ thiếu" này thường lại là thứ khiến dòng tiền khó chảy vào.' },
    ],
  },
};
// Ánh xạ mỗi câu Vibe Check sang đúng cột tc_weekly_reflections mà trang-chu.js dùng để tính Điểm
// Nghiệp — sau khi làm bài, seed thẳng vào tuần hiện tại (CHỈ điền cột nào còn trống, không đè lên
// tự đánh giá thật đã có, xem submit()) để lần đầu vào Trang chủ radar có dữ liệu thật ở cả 5 trụ,
// không phải mặc định 50 cho tới khi làm Tổng Kết Tuần nhiều lần.
const PILLAR_SEED_MAP = {
  health_score: ['ef', 'passive'],           // Trụ 1 — Thân Tâm Bản Thể
  parents_connection_score: ['parents'],     // Trụ 2 — Cội Nguồn Sinh Thành
  relationship_score: ['partner'],           // Trụ 3 — Bạn Đời & Mối Quan Hệ Thân Mật
  finance_mindset_score: ['income', 'expense', 'debt', 'witness_receive'], // Trụ 4 — Tài Chính Tâm Thức
  purpose_score: ['asset', 'giving'],        // Trụ 5 — Thuận Pháp & Nhân Quả (tích sản + cho đi)
};
function pointsToRating(points){ return points>=10 ? 5 : points>=5 ? 3 : 1; }
// WEAKEST_AREA_INFO chuyển sang util.js (2026-08-25) — xem comment ở đó.

// Phân tích kết quả THEO ĐÚNG 5 Trụ Cột Năng Lượng Bản Thể (HOUSES ở util.js) — góp ý Quỳnh
// 2026-08-24: "mục phân tích cần sâu sắc hơn, đánh vào 5 trụ cột, giống cách Điểm Nghiệp ở trên
// đang phân tích". Trước đây kết quả chỉ nói tới weakestArea (1 trong 4 Nút Chặn) — giờ soi đủ cả 5
// trụ. Text theo tier (cao/trungBinh/thap) chọn dựa trên ĐÚNG điểm 0-100 ở state.karmaAxes (radar) —
// xem pillarTier() bên dưới, KHÔNG tính riêng từ vibe Check (đã bỏ, xem lịch sử sửa 2026-08-25 vì
// "điểm nghiệp bên dưới chưa khớp với cái radar bên trên").
const PILLAR_ANALYSIS = {
  than_tam_ban_the: {
    cao: 'Nội lực của bạn đang vững: nghĩ tới rủi ro mất thu nhập không khiến bạn hoảng loạn, và bạn tin mình xứng đáng có dòng tiền tự động chảy về. Một Thân Tâm bình an như vậy chính là nền để mọi quyết định tài chính khác không bị chi phối bởi sợ hãi.',
    trungBinh: 'Nội lực của bạn còn dao động — biết mình có thể xoay xở nhưng vẫn né tránh nghĩ sâu về rủi ro, hoặc còn hoài nghi liệu mình có đủ tốt để có thu nhập tự động. Niềm tin này cần thêm thời gian để bén rễ chắc hơn.',
    thap: 'Nội lực đang khá mỏng: nghĩ tới việc mất thu nhập dễ khiến bạn hoảng loạn, và bạn chưa tin mình đủ tốt để xứng đáng có dòng tiền tự động. Đây thường là gốc rễ cần được chăm sóc trước, vì một Thân Tâm bất an sẽ lan nỗi sợ sang mọi quyết định tiền bạc khác.',
  },
  coi_nguon_sinh_thanh: {
    cao: 'Bạn đã biết ơn trọn vẹn với những gì cha mẹ truyền lại về tiền bạc, dù bài học đó từng khó khăn. Cội nguồn thông suốt như vậy là mạch phước báu chảy thẳng vào dòng tiền của bạn hôm nay, không bị nghẽn bởi oán trách quá khứ.',
    trungBinh: 'Bạn chưa oán trách nhưng cũng chưa thật biết ơn quan niệm tiền bạc từ cha mẹ — nó vẫn đang ở trạng thái trung lập, chưa được nhìn lại để chuyển hoá thành nguồn lực chủ động.',
    thap: 'Bạn vẫn còn ước cha mẹ đã dạy mình khác đi về chuyện tiền — mỗi lần nhớ tới điều này là một lần mạch phước báu từ cội nguồn bị nghẽn lại. Đây thường là gốc rễ sâu nhất, rất đáng được chữa lành ở Hạt Giống Phước - Nghiệp.',
  },
  ban_doi_moi_quan_he: {
    cao: 'Bạn cởi mở, đồng lòng khi bàn chuyện tiền với người bạn đời — nền tảng hiếm có này giúp tiền bạc trở thành điểm gắn kết, không phải điểm rạn nứt trong quan hệ.',
    trungBinh: 'Bạn có né tránh nhẹ khi cần bàn tiền với người thân — chưa tới mức xung đột, nhưng cũng chưa thật cởi mở, khiến các quyết định tài chính chung dễ bị trì hoãn.',
    thap: 'Chuyện tiền bạc với người bạn đời của bạn thường thành căng thẳng, đối đầu — mối quan hệ đang phải gánh thêm áp lực từ chính những cuộc trò chuyện lẽ ra phải giúp hai người gắn kết hơn.',
  },
  tai_chinh_tam_thuc: {
    cao: 'Trong 4 khâu lặp lại hàng ngày quanh tiền — đón nhận, chi dùng, đối diện nợ, và chứng kiến người khác nhận tiền — bạn đang phản ứng bằng sự hoan hỷ, biết ơn nhiều hơn là sợ hãi. Đây là trụ "gốc" ảnh hưởng lan sang cả 4 trụ còn lại, nên khi trụ này vững, mọi quyết định tài chính khác cũng nhẹ nhàng hơn.',
    trungBinh: 'Trong 4 khâu lặp lại hàng ngày quanh tiền — đón nhận, chi dùng, đối diện nợ, và chứng kiến người khác nhận tiền — bạn đang ở trạng thái tặc lưỡi, làm theo quán tính nhiều hơn là thật sự cảm nhận. Đây là trụ "gốc" ảnh hưởng lan sang cả 4 trụ còn lại, nên một chút biết ơn thêm vào mỗi khâu sẽ giúp cả 5 trụ nhẹ nhàng hơn.',
    thap: 'Trong 4 khâu lặp lại hàng ngày quanh tiền — đón nhận, chi dùng, đối diện nợ, và chứng kiến người khác nhận tiền — nỗi sợ và sự né tránh đang chiếm phần lớn phản ứng của bạn. Đây là trụ "gốc" ảnh hưởng lan sang cả 4 trụ còn lại (đúng như Điểm Nghiệp phía trên ↑ đang bị kéo xuống theo), nên đây là nơi nên ưu tiên chữa lành trước tiên.',
  },
  thuan_phap_nhan_qua: {
    cao: 'Động cơ tích sản của bạn xuất phát từ phụng sự, và bạn cho đi trong sự đủ đầy, không toan tính — đây chính là vòng Nhân Quả thuận chiều: cho ra bao nhiêu, dòng chảy sẽ quay lại đúng lúc bấy nhiêu.',
    trungBinh: 'Bạn tích sản một phần vì muốn được công nhận, và việc cho đi nhiều khi vẫn theo thói quen/nghĩa vụ hơn là từ tâm — vòng Nhân Quả đang chảy nhưng chưa thật tự nhiên, thong dong.',
    thap: 'Nỗi sợ đói khổ đang là động cơ chính khiến bạn tích sản, và việc cho đi khiến bạn lo sẽ thiếu — chính vòng lặp "giữ chặt vì sợ thiếu" này thường lại là thứ khiến dòng chảy Nhân Quả bị nghẽn, tích mà không lưu thông được.',
  },
};
// Mức trụ tính TRỰC TIẾP từ điểm 0-100 đã hiện ở radar (state.karmaAxes) — KHÔNG tính riêng từ vibe
// Check nữa (trước đây pillarInsight() tự tính avgPoints riêng, ra tier lệch với radar phía trên,
// đúng cái Quỳnh báo "chưa khớp"). Ngưỡng 80/40 tương đương ngưỡng cũ 8/4 trên thang 0-10 (×10).
function pillarTier(score){ return score >= 80 ? 'cao' : score >= 40 ? 'trungBinh' : 'thap'; }
function tierBadgeHtml(tier){
  const info = { cao:['🟢 Đang vững','var(--accent)'], trungBinh:['🟡 Đang dao động','var(--gold)'], thap:['🔴 Cần chú ý','var(--danger)'] }[tier];
  return `<span style="font-size:11px;font-weight:600;color:${info[1]};margin-left:6px;white-space:nowrap;">${info[0]}</span>`;
}
// Cách nâng điểm — góp ý Quỳnh 2026-08-25: "Soi theo 5 Trụ Cột" cần nói rõ cách nâng điểm lên, không
// chỉ mô tả hiện trạng. 1 gợi ý/trụ, LUÔN gắn với 1 tính năng THẬT đã có trong app (không bịa hành
// động chung chung "hãy suy nghĩ tích cực hơn") để người đọc biết đúng việc cần làm tiếp theo ở đâu.
const PILLAR_IMPROVE_TIPS = {
  than_tam_ban_the: 'Xây quỹ dự phòng dần đều mỗi tháng (dù chỉ một khoản nhỏ) và ghi Vibe Check ở Ghi Chép Hàng Ngày đều đặn — nội lực vững lên từ việc THẤY mình xoay xở được nhiều lần, không phải từ có ngay một số tiền lớn.',
  coi_nguon_sinh_thanh: 'Viết ra niềm tin về tiền bạn thừa hưởng từ cha mẹ vào Hạt Giống Phước - Nghiệp, rồi tự hỏi niềm tin đó còn đúng với mình hôm nay không — nhìn thẳng vào nó là bước đầu để chuyển hoá.',
  ban_doi_moi_quan_he: 'Đặt 1 mục tiêu tài chính CHUNG ở Mục Tiêu & Cam Kết, bàn vào lúc không căng thẳng — biến chuyện tiền thành cuộc trò chuyện về tương lai chung, thay vì một cuộc đối chất.',
  tai_chinh_tam_thuc: 'Ghi Vibe Check mỗi ngày ở Ghi Chép Hàng Ngày để bắt quả tang đúng lúc cảm xúc xảy ra, và làm lại Chấm Điểm Nghiệp Tiền định kỳ để tự thấy điểm dịch chuyển theo thời gian.',
  thuan_phap_nhan_qua: 'Thực hành quỹ "🎁 Cho Đi 5%" ở Ghi Chép Hàng Ngày đều đặn — mỗi lần cho đi trong đủ đầy là một lần thực chứng lại rằng cho đi không khiến bạn thiếu hụt.',
};

// "Bản Giải Phẫu Chi Tiết" — góp ý Quỳnh 2026-08-25: mục phân tích 5 Trụ Cột ở trên (PILLAR_ANALYSIS,
// 2-3 câu/trụ) vẫn "hời hợt" so với bản phân tích 4 phần (vết thương gốc → 5 vị trí rút cạn sinh khí →
// hệ quả 5 năm → bí mật đập tan vòng nghiệp) chị đang dùng ở landing page Chấm Điểm Nghiệp của khoá
// "21 Ngày Giải Nghiệp" (xem kho-tai-lieu/ban-giai-phau-5-truc-vong-nghiep-tam-thuc-v2.md — tài liệu
// GỐC, 5 trục KHÁC với 5 Trụ Cột ở app này nên không copy nguyên văn được, chỉ mượn ĐÚNG cấu trúc +
// độ sâu). Chỉ hiện bản giải phẫu đầy đủ cho ĐÚNG 1 trụ đang thấp điểm nhất (giống hành vi tài liệu
// gốc "hiển thị khi trục X có điểm thấp nhất") — 4 trụ còn lại vẫn đủ ở khối "Soi theo 5 Trụ Cột" phía
// trên. KHÔNG dùng khái niệm "Chiếc Gương AI" của tài liệu gốc (app này không có AI, xem CLAUDE.md) —
// thay bằng đúng cơ chế thật app có: Ghi Chép Hàng Ngày (Vibe Check mỗi ngày), Hạt Giống Phước - Nghiệp,
// Mục Tiêu & Cam Kết, quỹ "Cho Đi 5%".
// NỘI DUNG DƯỚI ĐÂY tự tác giả viết (không phải input người dùng) nên render TRỰC TIẾP không qua
// esc() — cố ý dùng <b> để nhấn từ khoá quan trọng (góp ý Quỳnh 2026-08-25: "10 dòng như 1 rất khó
// đọc, cần nhấn vào các từ quan trọng"). KHÔNG áp dụng cách này cho dữ liệu người dùng nhập ở nơi khác.
const PILLAR_DEEP_ANALYSIS = {
  than_tam_ban_the: {
    wound: 'Có thể bạn đã lớn lên trong một gia đình mà mỗi lần có biến cố — mất việc, ốm đau, thiên tai — cả nhà lập tức rơi vào hoảng loạn vì không có gì để xoay xở. Đứa trẻ ngày ấy chứng kiến sự bất lực đó và âm thầm ghi vào Tàng Thức một niềm tin sinh tồn: <b>"Thế giới này nguy hiểm, mình phải luôn cảnh giác vì tai hoạ có thể ập đến bất cứ lúc nào."</b> Niềm tin ấy khiến bạn lớn lên với một hệ thần kinh <b>luôn trong trạng thái phòng thủ</b> trước tiền bạc, dù bên ngoài bạn có thể trông rất bình tĩnh.',
    drains: [
      { label:'Ví tiền của bạn', text:'Bạn tích luỹ nhưng <b>không bao giờ thấy đủ</b> — quỹ dự phòng dù đã có vẫn không mang lại cảm giác an toàn thật, vì gốc rễ nỗi sợ không nằm ở con số mà ở niềm tin bên trong.' },
      { label:'Cơ thể vật lý', text:'Sự cảnh giác thường trực khiến hệ thần kinh của bạn <b>không bao giờ được thả lỏng hoàn toàn</b> — dễ mất ngủ, dễ hồi hộp vô cớ, đặc biệt vào cuối tháng hoặc trước ngày trả nợ.' },
      { label:'Bạn đời & mối quan hệ', text:'Bạn khó chia sẻ thật lòng nỗi lo tài chính vì sợ làm người kia hoảng sợ theo, nên <b>gánh một mình trong im lặng</b> — điều này âm thầm tạo khoảng cách dù cả hai vẫn ở cạnh nhau.' },
      { label:'Sự nghiệp', text:'Nỗi sợ thiếu hụt khiến bạn <b>khó từ chối công việc, khó nghỉ ngơi đúng nghĩa</b>, vì luôn có một tiếng nói bên trong nhắc rằng dừng lại là nguy hiểm.' },
      { label:'Con cái của bạn', text:'Con cái cảm nhận được sự căng thẳng ngầm mỗi khi nhắc tới tiền, dù bạn không nói ra — và học được rằng <b>tiền bạc là một chủ đề đầy lo âu</b>, không phải trung tính.' },
    ],
    future: 'Bạn có thể có nhiều tiền hơn, nhưng <b>cảm giác an toàn thật sự vẫn sẽ lảng tránh bạn</b>, vì bạn đang cố lấp đầy một nỗi sợ tâm lý bằng một con số vật chất — hai thứ không cùng một ngôn ngữ. Thân Tâm mệt mỏi sẽ khiến mọi quyết định tài chính khác, dù đúng đến đâu, cũng bị nhuốm màu hoảng loạn.',
    secret: 'Bạn đã đọc nhiều về quản lý tài chính, đã lập quỹ dự phòng — nhưng vì sao cảm giác bất an vẫn không biến mất? Vì bạn đang cố <b>giải quyết một vết thương cảm xúc bằng công cụ lý trí</b>. Cách duy nhất để nó thật sự buông là <b>bắt quả tang chính mình NGAY LÚC nỗi sợ đang vận hành</b>, không phải nghĩ về nó sau. Đó là lý do mỗi lần Ghi Chép Hàng Ngày có ô Vibe Check: qua vài tuần nhìn lại, bạn sẽ tự thấy — "à, hoá ra cứ đầu tháng là mình lại hoảng lên như vậy, dù tháng nào cũng đủ tiền." Nhìn thấy tận mắt vòng lặp đó là bước đầu để nó không còn tự động điều khiển bạn nữa.',
  },
  coi_nguon_sinh_thanh: {
    wound: 'Có thể cha mẹ bạn từng dạy về tiền bằng chính nỗi sợ của họ — tiết kiệm cực đoan vì từng trải qua đói khổ, hoặc chi tiêu hoang phí để bù đắp tuổi thơ thiếu thốn. Dù cách nào, đứa trẻ trong bạn ngày ấy <b>không nhận được một hình mẫu bình an về tiền</b>, chỉ nhận được nỗi lo hoặc sự thiếu vắng được truyền từ thế hệ trước. Bạn lớn lên mang theo đúng khuôn mẫu đó, dù có thể bạn từng thề sẽ khác đi.',
    drains: [
      { label:'Ví tiền của bạn', text:'Bạn vô thức lặp lại đúng thói quen tiền bạc của cha mẹ — dù lý trí biết nó không còn phù hợp, <b>tay bạn vẫn làm theo đúng khuôn cũ</b> mỗi khi căng thẳng.' },
      { label:'Cơ thể vật lý', text:'Mỗi lần nhắc tới chuyện tiền của cha mẹ ngày xưa, cơ thể bạn có thể chợt nặng nề, <b>lồng ngực hơi nghẹn</b> — dấu hiệu một ký ức chưa được xử lý trọn vẹn.' },
      { label:'Bạn đời & mối quan hệ', text:'Bạn có thể vô thức mang <b>đúng kịch bản tiền bạc của cha mẹ</b> vào cuộc hôn nhân của mình — dù đã từng hứa sẽ làm khác đi.' },
      { label:'Sự nghiệp', text:'Bạn có thể đang <b>chứng minh điều gì đó với cha mẹ</b> qua sự nghiệp — kiếm tiền không hẳn vì bản thân, mà để lấp một khoảng trống công nhận từ họ.' },
      { label:'Con cái của bạn', text:'Nếu không dừng lại ở đây, đúng khuôn mẫu tiền bạc này (dù là nỗi sợ hay sự thiếu vắng) sẽ <b>tiếp tục truyền sang thế hệ con bạn</b>, như nó đã từng truyền tới bạn.' },
    ],
    future: 'Bạn có thể có tài chính ổn định hơn cha mẹ, nhưng <b>cảm xúc quanh tiền bạc vẫn sẽ mang hình dáng cũ</b> — vẫn lo âu kiểu cũ, vẫn tủi thân kiểu cũ, chỉ là ở một mức thu nhập cao hơn. Con số thay đổi nhưng gốc rễ cảm xúc thì không, cho tới khi được nhìn thẳng.',
    secret: '<b>Bạn không cần đổ lỗi cho cha mẹ</b> — họ cũng chỉ đang làm tốt nhất với những gì họ được dạy. Nhưng bạn CẦN nhìn thẳng vào bài học đó thay vì để nó vận hành trong vô thức. Đây chính là lý do Hạt Giống Phước - Nghiệp tồn tại: viết ra rõ ràng niềm tin bạn đã thừa hưởng từ cha mẹ về tiền, rồi tự hỏi <b>"niềm tin này còn đúng với tôi hôm nay không?"</b> — đó là bước đầu tiên để bạn chọn giữ lại điều tốt và buông điều không còn phù hợp, thay vì lặp lại một cách vô thức.',
  },
  ban_doi_moi_quan_he: {
    wound: 'Có thể trong gia đình bạn từng chứng kiến (hoặc trải qua) những trận cãi vã về tiền bạc — tiền trở thành vũ khí, thành lý do trách móc, thành thứ không bao giờ được nói ra thật lòng vì sợ thành xung đột. Đứa trẻ chứng kiến điều đó học được: <b>"Nói về tiền là nguy hiểm, tốt nhất nên né tránh hoặc chịu đựng trong im lặng."</b>',
    drains: [
      { label:'Ví tiền của bạn', text:'Các quyết định tài chính lớn (mua nhà, đầu tư, trả nợ) <b>bị trì hoãn</b> vì hai người ngại ngồi xuống bàn bạc thẳng thắn — mỗi người tự quyết một phần, thiếu một bức tranh chung.' },
      { label:'Cơ thể vật lý', text:'Sự căng thẳng dồn nén không được nói ra thường biểu hiện thành <b>mệt mỏi âm ỉ, khó ngủ</b> ngay trước hoặc sau những lần định bàn chuyện tiền mà rồi lại thôi.' },
      { label:'Bạn đời', text:'<b>Khoảng cách giữa hai người âm thầm lớn dần</b> — không phải vì thiếu tình cảm, mà vì thiếu một kênh an toàn để nói thật về nỗi lo tài chính.' },
      { label:'Sự nghiệp', text:'Bạn có thể <b>tự mình gánh áp lực tài chính một mình</b> vì ngại chia sẻ, dẫn đến kiệt sức trong công việc mà bạn đời không hề hay biết mức độ.' },
      { label:'Con cái của bạn', text:'Con cái lớn lên trong bầu không khí né tránh chuyện tiền, rồi cũng <b>học cách né tránh y hệt</b> khi trưởng thành và có gia đình riêng.' },
    ],
    future: 'Nếu cứ né tránh, những quyết định tài chính quan trọng của gia đình sẽ tiếp tục bị trì hoãn hoặc quyết định một chiều — và <b>khoảng cách cảm xúc quanh chủ đề tiền bạc sẽ ngày càng khó thu hẹp lại</b>, dù tình cảm hai người vẫn còn đó.',
    secret: 'Vấn đề không phải là thiếu tình yêu, mà là <b>thiếu một không gian an toàn để nói về tiền mà không thành cãi vã</b>. Mục Tiêu & Cam Kết được thiết kế chính là không gian đó — đặt mục tiêu tài chính CHUNG, bằng con số cụ thể, ngoài lúc căng thẳng, để việc bàn tiền trở thành <b>một cuộc trò chuyện về tương lai chung</b>, thay vì một cuộc đối chất về quá khứ.',
  },
  tai_chinh_tam_thuc: {
    wound: 'Trẻ con không biết tiền bạc là gì, nhưng nhạy cảm vô cùng với sự ngột ngạt của một gia đình thiếu tiền. Có thể bạn đã lớn lên trong tiếng thở dài cuối tháng, tiếng cãi vã về từng khoản chi, hoặc cảm giác tủi thân khi bị so sánh vì gia cảnh kém hơn bạn bè. Đứa trẻ ngày ấy âm thầm ghi vào Tàng Thức: <b>"Không có tiền là nguy hiểm, là bị coi thường, là có thể mất tất cả."</b> Nỗi sợ đó thúc bạn cày cuốc không ngừng nghỉ khi trưởng thành — nhưng <b>động cơ kiếm tiền bằng sợ hãi chỉ tiếp tục kiến tạo ra một đời sống đầy sợ hãi</b>.',
    drains: [
      { label:'Ví tiền của bạn', text:'Bạn kiếm được nhưng luôn thấy thiếu — mỗi lần trả hoá đơn hay trả nợ, <b>lồng ngực co thắt trong xót xa</b> thay vì bình an, và chính tần số đó khiến dòng tiền khó chảy vào thêm.' },
      { label:'Cơ thể vật lý', text:'Đêm nằm lo nghĩ về tiền, mất ngủ, cơ thể rã rời — bạn đang <b>bắt thân thể làm việc như một cách xoa dịu nỗi sợ</b>, không phải vì đam mê hay giá trị thật.' },
      { label:'Bạn đời & mối quan hệ', text:'Áp lực tài chính khiến bạn <b>né tránh sự hiện diện ấm áp</b>, hoặc trút cáu gắt lên người thân sau một ngày căng thẳng vì tiền.' },
      { label:'Sự nghiệp', text:'Nỗi sợ thiếu hụt có thể đẩy bạn vào <b>các quyết định liều lĩnh</b> — đầu tư nóng vội, vay mượn quá sức — để nhanh chóng lấp đầy khoảng trống an toàn.' },
      { label:'Con cái của bạn', text:'Con nhìn thấy một người luôn bận rộn, lo âu vì tiền, và vô tình <b>học đúng tần số túng thiếu đó</b>, dù gia đình có thể không hề thiếu thốn vật chất.' },
    ],
    future: 'Bạn có thể kiếm nhiều tiền hơn, nhưng <b>lồng ngực sẽ ngày càng rỗng và kiệt sức</b> — và số tiền cày cuốc được bằng nỗi sợ cuối cùng thường quay lại dưới dạng chi phí sức khoẻ hoặc chi phí cho những mối quan hệ đã rạn nứt.',
    secret: 'Bạn đã đọc nhiều về tài chính, hiểu rõ lý thuyết — nhưng vì sao ví tiền vẫn rò rỉ, áp lực vẫn đè nặng mỗi ngày? Vì tâm trí luôn tìm được lý do rất hợp lý để che giấu nỗi sợ bên dưới: "mình chi tiêu xót xa vì đang gánh nhiều nghĩa vụ quá" — nhưng thực chất là <b>lồng ngực đang hoảng sợ, không phải hoá đơn đang sai</b>. Nghiệp tài chính chỉ buông khi <b>bị bắt quả tang ngay lúc đang vận hành</b> — đó là lý do mỗi câu Vibe Check ở Chấm Điểm Nghiệp Tiền và mỗi lần Ghi Chép Hàng Ngày đều hỏi CẢM XÚC ngay lúc tiền vào/ra, không chỉ con số. Nhìn lại sau vài tuần, bạn sẽ tự bắt quả tang được: "à, hoá ra mình toàn xót của vào đúng những lúc chi cho việc cần thiết nhất" — và đó là khoảnh khắc vòng lặp bắt đầu lỏng ra.',
  },
  thuan_phap_nhan_qua: {
    wound: 'Có thể bạn từng chứng kiến của cải tan biến chỉ sau một biến cố, hoặc từng bị dạy rằng phải giữ chặt những gì mình có vì "cho đi là mất, là dại". Đứa trẻ ngày ấy học được: <b>"Thế giới này khan hiếm, ai giữ được nhiều hơn thì an toàn hơn."</b> Niềm tin khan hiếm đó khiến việc tích luỹ trở thành <b>một cuộc chạy trốn nỗi sợ</b>, thay vì một hành trình kiến tạo giá trị.',
    drains: [
      { label:'Ví tiền của bạn', text:'Bạn có thể tích luỹ được tài sản, nhưng <b>luôn thấy chưa đủ</b> — vì gốc rễ động cơ là nỗi sợ thiếu, mà nỗi sợ thì không bao giờ được thoả mãn bằng con số.' },
      { label:'Cơ thể vật lý', text:'Nỗi lo giữ của khiến bạn <b>khó thật sự thư giãn</b>, ngay cả khi tài chính đã ổn định — cơ thể vẫn ở trạng thái phòng thủ.' },
      { label:'Bạn đời & mối quan hệ', text:'Sự khan hiếm trong tâm trí có thể khiến bạn <b>tính toán ngay cả với người thân</b>, làm mối quan hệ nặng nề hơn cần thiết.' },
      { label:'Sự nghiệp', text:'Bạn có thể <b>bỏ lỡ những cơ hội hợp tác</b> hoặc cho đi giá trị (thời gian, kiến thức, sự giúp đỡ) vì sợ "mất phần" — trong khi chính sự cởi mở đó thường lại là thứ mở ra cơ hội mới.' },
      { label:'Con cái của bạn', text:'Con học được rằng <b>tiền bạc là thứ phải giữ chặt, phải đề phòng</b>, thay vì một dòng chảy có thể luân chuyển tự nhiên.' },
    ],
    future: 'Bạn có thể tích luỹ được nhiều tài sản hơn, nhưng <b>cảm giác đủ đầy thật sự vẫn sẽ lảng tránh</b> — vì bạn đang cố lấp một nỗi sợ khan hiếm bằng con số, trong khi gốc rễ vấn đề nằm ở niềm tin, không phải ở số dư tài khoản.',
    secret: 'Phước phần đúng gốc rễ <b>không nằm ở việc giữ được bao nhiêu, mà ở việc dòng chảy cho-nhận có được lưu thông hay không</b>. Đây là lý do quỹ "🎁 Cho Đi 5%" tồn tại trong Ghi Chép Hàng Ngày — không phải để bạn nghèo đi, mà để mỗi tháng bạn thực chứng lại một điều: <b>cho đi trong sự đủ đầy không làm bạn thiếu hụt</b>, mà thường mở ra đúng lúc một cánh cửa khác. Nhìn lại sau vài tháng thực hành, bạn sẽ tự thấy — nỗi sợ "cho rồi sẽ thiếu" hoá ra không đúng như tâm trí từng doạ bạn.',
  },
};
const DRAIN_ICONS = ['💰','🫀','💞','💼','👶'];
function deepAnalysisHtml(houseKey, houseLabel){
  const d = PILLAR_DEEP_ANALYSIS[houseKey];
  function stepHead(num, icon, title, tint){
    return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
      <span style="flex-shrink:0;width:28px;height:28px;border-radius:50%;background:${tint};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;">${num}</span>
      <span style="font-weight:700;font-size:15px;">${icon} ${esc(title)}</span>
    </div>`;
  }
  return `
    <div class="card" style="margin-top:16px;border:1px solid var(--gold);background:var(--panel);padding:0;overflow:hidden;">
      <div style="padding:18px 20px;background:var(--gold);color:#fff;">
        <div style="font-weight:700;font-size:17px;margin-bottom:4px;">🔬 Bản Giải Phẫu Chi Tiết</div>
        <div style="font-size:14px;opacity:.95;">${esc(houseLabel)} — trụ đang thấp điểm nhất của bạn hôm nay</div>
      </div>
      <div style="padding:20px;">
        <div style="font-size:12.5px;color:var(--ink-soft);margin-bottom:18px;font-style:italic;">Đọc chậm rãi — chỗ nào khiến bạn nhói lên hoặc nghẹn lại, chỗ đó chính là sự thật cần nhìn thẳng, không phải để phán xét bản thân.</div>

        <div style="margin-bottom:20px;">
          ${stepHead(1, '💔', 'Vết thương gốc bắt nguồn từ đâu?', 'var(--ink-soft)')}
          <div style="font-size:14px;line-height:1.75;padding-left:38px;">${d.wound}</div>
        </div>

        <div style="margin-bottom:20px;padding:16px;border-radius:10px;background:rgba(166,70,46,.06);border:1px solid rgba(166,70,46,.18);">
          ${stepHead(2, '🩸', '5 vị trí đang âm thầm rút cạn sinh khí của bạn', 'var(--danger)')}
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;">
            ${d.drains.map((x,i)=>`
              <div style="background:var(--panel);border-radius:8px;padding:10px 12px;">
                <div style="font-weight:700;font-size:13px;margin-bottom:3px;">${DRAIN_ICONS[i]||'▸'} ${esc(x.label)}</div>
                <div style="font-size:13px;line-height:1.55;">${x.text}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <div style="margin-bottom:20px;padding:16px;border-radius:10px;background:rgba(184,134,46,.10);border:1px solid rgba(184,134,46,.28);">
          ${stepHead(3, '⏳', 'Năm năm nữa, nếu bạn vẫn để yên như cũ?', 'var(--gold)')}
          <div style="font-size:14px;line-height:1.75;padding-left:38px;">${d.future}</div>
        </div>

        <div style="padding:16px;border-radius:10px;background:var(--accent-soft);border:1px solid var(--accent);">
          ${stepHead(4, '🔑', 'Bí mật để đập tan vòng nghiệp', 'var(--accent)')}
          <div style="font-size:14px;line-height:1.75;padding-left:38px;">${d.secret}</div>
        </div>
      </div>
    </div>
  `;
}

// Điểm Nghiệp (radar 5 Trụ Cột) — DI CHUYỂN nguyên từ trang-chu.js sang đây (2026-08-24, góp ý
// Quỳnh: "cái màn hình radar điểm nghiệp này ở luôn cái mục chấm điểm nghiệp"). Trang chủ giờ chỉ còn
// là màn chào + checklist quy trình (xem trang-chu.js, đổi hẳn sang kiểu y hệt nhan-hieu/js/home.js).
// LUÔN tính lại từ dữ liệu thô mỗi lần render (không lưu điểm tích luỹ) — xem giải thích đầy đủ ở
// comment gốc lúc mới thêm tính năng này (trước đây nằm ở trang-chu.js).
// Mặc định 0 khi CHƯA CÓ dữ liệu gì (không phải 50 trung tính như trước) — góp ý Quỳnh 2026-08-26:
// "người lần đầu làm thì radar phải là 0 tất cả, sau khi làm xong mới nhảy điểm". Đổi cả 3 hàm dưới
// đây (nguồn duy nhất mọi Trụ Cột đọc điểm) để radar KHỞI ĐIỂM luôn là 0, tăng dần đúng theo hành
// động thật của người dùng — không còn cảm giác "đã có sẵn điểm" trước khi làm gì cả.
function computeFinanceScore(entries){
  const counts = { green:0, red:0, gray:0 };
  entries.forEach(e=>{ counts[e.vibe||'gray'] = (counts[e.vibe||'gray']||0) + 1; });
  const total = counts.green + counts.red + counts.gray;
  if(total === 0) return 0;
  return Math.round(50 + ((counts.green - counts.red) / total) * 50);
}
function computeMindScore({ distinctDaysLogged, hasGoal, hasNetworthThisMonth }){
  let score = Math.min(40, distinctDaysLogged * 4);
  if(hasGoal) score += 15;
  if(hasNetworthThisMonth) score += 15;
  return Math.min(100, score);
}
function avgSelfScore(rows, field){
  const vals = rows.map(r=>r[field]).filter(v=>v!=null);
  if(vals.length === 0) return 0;
  const avg = vals.reduce((s,v)=>s+v,0) / vals.length;
  return Math.round((avg/5)*100);
}
function clampScore(v){ return Math.max(0, Math.min(100, Math.round(v))); }
function nextMonthKey(m){
  const [y, mo] = m.split('-').map(Number);
  const d = new Date(y, mo, 1);
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
}
// Khoản nợ nào có due_day trong vòng 7 ngày tới — vòng qua tháng sau nếu due_day đã qua trong tháng
// này (vd hôm nay 25/8, hạn ngày 5 -> hạn kế tiếp là 5/9, không phải 5/8 đã qua).
function computeUpcomingDebts(debts){
  const today = new Date(); today.setHours(0,0,0,0);
  return debts.filter(d=>d.due_day).map(d=>{
    let next = new Date(today.getFullYear(), today.getMonth(), d.due_day);
    if(d.due_day < today.getDate()) next = new Date(today.getFullYear(), today.getMonth()+1, d.due_day);
    const daysUntil = Math.round((next - today) / 86400000);
    return { creditor_name: d.creditor_name, daysUntil };
  }).filter(x=>x.daysUntil <= 7).sort((a,b)=>a.daysUntil-b.daysUntil);
}

function render(container, ctx){
  const month = new Date().toISOString().slice(0,7);
  const DRAFT_KEY = 'thiet-lap-nhanh';
  // Khách chưa đăng nhập vẫn làm được bài này (2026-08-26, góp ý Quỳnh — xem TC_GUEST_QUIZ_KEY ở
  // util.js) — mọi query/ghi Supabase bên dưới đều cần ctx.user.id nên phải né hết khi isGuest.
  const isGuest = !ctx.user;
  const state = {
    // Khách không có gì để tải (load() chỉ chạy khi đã đăng nhập, xem cuối file) — tắt sẵn loading
    // để form Bước 1-8 hiện luôn, không kẹt ở spinner.
    loading: !isGuest,
    form: { income:'', expense:'', ef_current:'', ef_monthly_min:'', debt_total:'', debt_monthly:'', assets_total:'', passive_income:'', income_sources:'' },
    vibe: { income:null, expense:null, ef:null, debt:null, asset:null, passive:null, parents:null, partner:null, witness_receive:null, giving:null },
    saving: false,
    result: null,
    // Điểm Nghiệp — cùng bộ state di chuyển từ trang-chu.js, xem bootDashboard() bên dưới. Khách
    // không có lịch sử gì để tính (bootDashboard() không chạy) nên tắt sẵn loading, khỏi treo spinner.
    dashboardLoading: !isGuest,
    monthIncome: 0, monthExpense: 0, netWorth: null, netWorthMonth: null, totalDebt: 0,
    upcomingDebts: [], karmaAxes: [], activeBeliefsCount: 0, selectedPillarKey: null,
    // Tab "Theo Dõi Kết Quả" — 1 TAB của trang này, KHÔNG phải route riêng (2026-08-25, góp ý Quỳnh:
    // "là 1 mục của chấm điểm nghiệp chứ không phải trang mới ẩn trong sidebar"). Load lười (chỉ query
    // khi bấm sang tab lần đầu) để không tốn query nếu người dùng không bao giờ xem lịch sử.
    activeTab: 'lam-bai', karmaHistory: [], karmaHistoryLoading: false, karmaHistoryLoaded: false,
    // Lưu kết quả vào lịch sử giờ cần BẤM NÚT, không tự lưu ngầm nữa (2026-08-26, góp ý Quỳnh: "vẫn
    // chưa có nút ấn lưu kết quả") — reset về false mỗi khi có 1 kết quả MỚI (submit lại hoặc tự
    // khôi phục từ draft) để nút "💾 Lưu kết quả" luôn xuất hiện đúng lúc cần bấm lại.
    historySaved: false, savingHistory: false, expandedHistoryId: null,
  };
  function persistDraft(){
    if(isGuest){
      try{ localStorage.setItem(TC_GUEST_QUIZ_KEY, JSON.stringify({ form: state.form, vibe: state.vibe })); }catch(e){}
      return;
    }
    saveModuleDraft(ctx, DRAFT_KEY, { form: state.form, vibe: state.vibe });
  }

  function draw(){ container.innerHTML = html(); bind(); }
  draw();

  async function bootDashboard(){
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate()-30);
    const fourteenDaysAgo = new Date(); fourteenDaysAgo.setDate(fourteenDaysAgo.getDate()-14);
    const monthStart = `${month}-01`;
    const [entriesRes, netWorthRes, debtsRes, vibeRes, recentDatesRes, monthGoalRes, monthNetworthRes, weeklyRes, activeBeliefsRes] = await Promise.all([
      ctx.supabase.from('tc_finance_entries').select('type, amount')
        .eq('user_id', ctx.user.id).gte('entry_date', monthStart).lt('entry_date', nextMonthKey(month)+'-01'),
      ctx.supabase.from('tc_networth_snapshots').select('*')
        .eq('user_id', ctx.user.id).order('snapshot_month', { ascending:false }).limit(1).maybeSingle(),
      ctx.supabase.from('tc_debts').select('creditor_name, current_balance, due_day')
        .eq('user_id', ctx.user.id).eq('is_paid_off', false),
      ctx.supabase.from('tc_finance_entries').select('vibe')
        .eq('user_id', ctx.user.id).gte('entry_date', isoDate(thirtyDaysAgo)),
      ctx.supabase.from('tc_finance_entries').select('entry_date')
        .eq('user_id', ctx.user.id).gte('entry_date', isoDate(fourteenDaysAgo)),
      ctx.supabase.from('tc_monthly_reflections').select('goal_income,goal_savings,goal_debt_reduction,goal_new_asset')
        .eq('user_id', ctx.user.id).eq('month', month).maybeSingle(),
      ctx.supabase.from('tc_networth_snapshots').select('snapshot_month')
        .eq('user_id', ctx.user.id).eq('snapshot_month', month).maybeSingle(),
      ctx.supabase.from('tc_weekly_reflections').select('relationship_score,health_score,purpose_score,parents_connection_score,finance_mindset_score')
        .eq('user_id', ctx.user.id).order('week_start', { ascending:false }).limit(4),
      ctx.supabase.from('tc_core_beliefs').select('id').eq('user_id', ctx.user.id).eq('still_active', true),
    ]);
    const entries = entriesRes.data || [];
    state.monthIncome = entries.filter(e=>e.type==='income').reduce((s,e)=>s+Number(e.amount),0);
    state.monthExpense = entries.filter(e=>e.type==='expense').reduce((s,e)=>s+Number(e.amount),0);
    if(netWorthRes.data){
      const s = netWorthRes.data;
      const assets = Number(s.asset_cash||0)+Number(s.asset_savings||0)+Number(s.asset_gold_fx||0)+Number(s.asset_stocks||0)+Number(s.asset_realestate||0)+Number(s.asset_other||0);
      const debts = Number(s.debt_credit_card||0)+Number(s.debt_installment||0)+Number(s.debt_bank_loan||0)+Number(s.debt_other||0);
      state.netWorth = assets - debts;
      state.netWorthMonth = s.snapshot_month;
    }
    const activeDebts = debtsRes.data || [];
    state.totalDebt = activeDebts.reduce((s,d)=>s+Number(d.current_balance),0);
    state.upcomingDebts = computeUpcomingDebts(activeDebts);

    const financeScore = computeFinanceScore(vibeRes.data || []);
    const distinctDaysLogged = new Set((recentDatesRes.data||[]).map(r=>r.entry_date)).size;
    const g = monthGoalRes.data;
    const hasGoal = !!(g && (Number(g.goal_income)||Number(g.goal_savings)||Number(g.goal_debt_reduction)||Number(g.goal_new_asset)));
    const mindScore = computeMindScore({ distinctDaysLogged, hasGoal, hasNetworthThisMonth: !!monthNetworthRes.data });
    const weeklyRows = weeklyRes.data || [];

    // Trụ 4 = trung bình(tỷ lệ Vibe Check, tự chấm tâm thức tiền trực tiếp) — trụ "gốc" ảnh hưởng lan
    // sang 4 trụ còn lại (tài chính bất ổn kéo theo mọi mặt khác). Niềm tin cũ ở Hạt Giống Phước -
    // Nghiệp CHƯA chuyển hoá (still_active) kéo nhẹ Trụ 4 xuống.
    state.activeBeliefsCount = (activeBeliefsRes.data || []).length;
    const beliefPenalty = Math.min(20, state.activeBeliefsCount * 5);
    const financeMindsetScore = avgSelfScore(weeklyRows, 'finance_mindset_score');
    const pillar4Raw = clampScore(Math.round((financeScore + financeMindsetScore) / 2) - beliefPenalty);
    const crossPillarModifier = (pillar4Raw - 50) * 0.2;

    const pillar1Raw = Math.round((avgSelfScore(weeklyRows, 'health_score') + mindScore) / 2);
    const pillar2Raw = avgSelfScore(weeklyRows, 'parents_connection_score');
    const pillar3Raw = avgSelfScore(weeklyRows, 'relationship_score');
    const pillar5Raw = avgSelfScore(weeklyRows, 'purpose_score');

    state.karmaAxes = [
      { key:'than_tam_ban_the', label:'Thân Tâm Bản Thể', value: clampScore(pillar1Raw + crossPillarModifier) },
      { key:'coi_nguon_sinh_thanh', label:'Cội Nguồn Sinh Thành', value: clampScore(pillar2Raw + crossPillarModifier) },
      { key:'ban_doi_moi_quan_he', label:'Mối Quan Hệ Thân Mật', value: clampScore(pillar3Raw + crossPillarModifier) },
      { key:'tai_chinh_tam_thuc', label:'Tài Chính Tâm Thức', value: clampScore(pillar4Raw) },
      { key:'thuan_phap_nhan_qua', label:'Thuận Pháp & Nhân Quả', value: clampScore(pillar5Raw + crossPillarModifier) },
    ];

    state.dashboardLoading = false;
    draw();
  }

  async function load(){
    state.loading = true; draw();
    const [efRes, debtRes, netRes] = await Promise.all([
      ctx.supabase.from('tc_emergency_fund').select('*').eq('user_id', ctx.user.id).maybeSingle(),
      ctx.supabase.from('tc_debts').select('*').eq('user_id', ctx.user.id).eq('creditor_name', SEED_DEBT_NAME).maybeSingle(),
      ctx.supabase.from('tc_networth_snapshots').select('*').eq('user_id', ctx.user.id).eq('snapshot_month', month).maybeSingle(),
    ]);
    if(efRes.data && efRes.data.current_amount) state.form.ef_current = String(efRes.data.current_amount/TRIEU);
    if(debtRes.data){
      if(debtRes.data.current_balance) state.form.debt_total = String(debtRes.data.current_balance/TRIEU);
      if(debtRes.data.minimum_payment) state.form.debt_monthly = String(debtRes.data.minimum_payment/TRIEU);
    }
    if(netRes.data){
      if(netRes.data.asset_other) state.form.assets_total = String(netRes.data.asset_other/TRIEU);
      if(netRes.data.estimated_income) state.form.income = String(netRes.data.estimated_income/TRIEU);
      if(netRes.data.estimated_expense) state.form.expense = String(netRes.data.estimated_expense/TRIEU);
      if(netRes.data.passive_income) state.form.passive_income = String(netRes.data.passive_income/TRIEU);
      if(netRes.data.income_sources) state.form.income_sources = String(netRes.data.income_sources);
    }
    // Draft (đang gõ dở, chưa bấm "Xem Kết Quả") đè lên SAU dữ liệu đã lưu — vì draft luôn là bản
    // mới hơn những gì đã submit trước đó (góp ý Quỳnh 2026-08-22: gõ dở bấm sang trang khác bị mất).
    const draft = await loadModuleDraft(ctx, DRAFT_KEY);
    if(draft){
      if(draft.form) Object.assign(state.form, draft.form);
      if(draft.vibe) Object.assign(state.vibe, draft.vibe);
    }
    // Tự động hiện lại kết quả + phân tích nếu đã từng làm bài trước đó — góp ý Quỳnh 2026-08-25:
    // "thoát trang là mất kết quả, cần lưu lại để xem sau". Form/vibe đã lưu VĨNH VIỄN trong draft
    // (không xoá sau submit, xem comment ở submit() bên dưới) nên chỉ cần TÍNH LẠI kết quả ngay khi
    // vào trang thay vì bắt bấm lại "Xem Kết Quả" — vẫn đúng nguyên tắc "không lưu điểm suy ra được"
    // (kết quả luôn tính tươi từ số liệu gốc đã lưu, không lưu thẳng con số kết quả).
    if(Object.values(state.vibe).some(v=>v!=null)){
      state.result = computeResult();
      window.TcLastWeakestArea = state.result.weakestArea ? WEAKEST_AREA_INFO[state.result.weakestArea] : null;
      window.TcLastHasDebt = Number(state.form.debt_total) > 0;
      state.historySaved = false;
    }
    state.loading = false;
    draw();
  }

  function computeResult(){
    const f = state.form;
    const income = Number(f.income)||0, expense = Number(f.expense)||0;
    const efCurrent = Number(f.ef_current)||0, efMonthlyMin = Number(f.ef_monthly_min)||0;
    const debtTotal = Number(f.debt_total)||0, debtMonthly = Number(f.debt_monthly)||0;
    const assetsTotal = Number(f.assets_total)||0;
    const passiveIncome = Number(f.passive_income)||0;

    const cashFlow = income - expense;
    const savingsRate = income>0 ? Math.round(cashFlow/income*100*10)/10 : 0;
    const efMonths = efMonthlyMin>0 ? Math.round(efCurrent/efMonthlyMin*10)/10 : null;
    const netWorth = assetsTotal - debtTotal;
    const dti = income>0 ? Math.round(debtMonthly/income*100*10)/10 : 0;
    const passivePct = income>0 ? Math.round(passiveIncome/income*100*10)/10 : 0;

    let note;
    if(dti >= 43) note = `Áp lực trả nợ đang ở mức đáng lo (${dti}% thu nhập) — ưu tiên số 1 lúc này là giảm bớt khoản trả nợ hàng tháng trước khi tính tới mục tiêu khác.`;
    else if(efMonths!=null && efMonths < 1) note = 'Quỹ dự phòng gần như chưa có — nên ưu tiên gây dựng trước khi mở rộng mục tiêu tài chính khác.';
    else if(efMonths!=null && efMonths < 3) note = 'Quỹ dự phòng còn khá mỏng — nên ưu tiên củng cố trước khi mở rộng mục tiêu tài chính khác.';
    else if(savingsRate < 0) note = 'Chi tiêu đang vượt thu nhập — đây là điểm cần nhìn thẳng vào đầu tiên, trước khi bàn tới tích luỹ hay đầu tư.';
    else if(dti >= 36) note = `Áp lực trả nợ đang ở mức cần chú ý (${dti}% thu nhập) — cân nhắc ưu tiên trả bớt trước khi vay/mua thêm.`;
    else note = 'Bức tranh hiện tại khá ổn — duy trì đều đặn và bắt đầu đặt mục tiêu cụ thể ở phần Mục Tiêu & Cam Kết.';

    // Điểm Nghiệp Tiền: trung bình điểm các câu Vibe Check ĐÃ trả lời (bỏ qua câu chưa trả lời,
    // không ép trả lời đủ hết mới xem được các chỉ số vật lý phía trên). Nút Chặn nặng nhất chỉ xét
    // trong 4 khâu Đón Nhận/Chi Dùng/Đối Diện Nợ/Đón Nhận Của Người Khác — đây là các khâu có hành
    // động/tình huống lặp lại hàng ngày/tháng, khác Quỹ Khẩn Cấp/Tài Sản/Thu Nhập Tự Động/Cho Đi vốn
    // là trạng thái hoặc hành vi không lặp lại đều mỗi ngày.
    const answered = Object.entries(state.vibe).filter(([,v])=>v!=null);
    let vibeScore = null, weakestArea = null;
    if(answered.length > 0){
      const totalPoints = answered.reduce((s,[key,ansKey])=>{
        const opt = VIBE_QUESTIONS[key].options.find(o=>o.k===ansKey);
        return s + (opt ? opt.points : 0);
      }, 0);
      vibeScore = Math.round((totalPoints / (answered.length*10)) * 100);
      const coreAreas = ['income','expense','debt','witness_receive'].filter(key=>state.vibe[key]!=null);
      if(coreAreas.length > 0){
        weakestArea = coreAreas.reduce((worst,key)=>{
          const pts = VIBE_QUESTIONS[key].options.find(o=>o.k===state.vibe[key]).points;
          const worstPts = VIBE_QUESTIONS[worst].options.find(o=>o.k===state.vibe[worst]).points;
          return pts < worstPts ? key : worst;
        }, coreAreas[0]);
      }
    }

    return { cashFlow, savingsRate, efMonths, netWorth, dti, passivePct, note, vibeScore, weakestArea };
  }

  // Seed tự đánh giá tuần hiện tại từ các câu Vibe Check — CHỈ điền cột nào còn TRỐNG (không đè lên
  // tự đánh giá thật người dùng đã tự chấm ở Tổng Kết Tuần), để Điểm Nghiệp ở Trang chủ có dữ liệu
  // thật ở cả 5 Trụ Cột ngay lần đầu, thay vì mặc định 50 cho tới khi làm Tổng Kết Tuần nhiều lần.
  async function seedWeeklyPillars(){
    const weekStartIso = isoDate(startOfWeek(new Date()));
    const { data: existing } = await ctx.supabase.from('tc_weekly_reflections')
      .select('*').eq('user_id', ctx.user.id).eq('week_start', weekStartIso).maybeSingle();
    const payload = { user_id: ctx.user.id, week_start: weekStartIso, updated_at: new Date().toISOString() };
    let hasAnySeed = false;
    Object.entries(PILLAR_SEED_MAP).forEach(([column, vibeKeys]) => {
      if(existing && existing[column] != null) return; // đã tự chấm thật rồi — không đè lên
      const answered = vibeKeys.filter(k => state.vibe[k] != null);
      if(answered.length === 0) return;
      const avgPoints = answered.reduce((s,k)=> s + VIBE_QUESTIONS[k].options.find(o=>o.k===state.vibe[k]).points, 0) / answered.length;
      payload[column] = pointsToRating(avgPoints);
      hasAnySeed = true;
    });
    if(hasAnySeed) await ctx.supabase.from('tc_weekly_reflections').upsert(payload, { onConflict:'user_id,week_start' });
  }

  async function submit(){
    state.saving = true; draw();
    // Khách chưa đăng nhập: không có user_id để ghi bất kỳ bảng nào — chỉ tính kết quả TRÊN MÁY và
    // lưu tạm câu trả lời vào localStorage (persistDraft() đã tự biết dùng localStorage khi isGuest,
    // xem TC_GUEST_QUIZ_KEY ở util.js), để tự ghi thật vào Supabase SAU khi họ đăng ký xong (xem
    // convertGuestQuizIfAny() cuối file + onAuthStateChange ở app-shell.js).
    if(isGuest){
      persistDraft();
      state.saving = false;
      state.result = computeResult();
      window.TcLastWeakestArea = state.result.weakestArea ? WEAKEST_AREA_INFO[state.result.weakestArea] : null;
      window.TcLastHasDebt = Number(state.form.debt_total) > 0;
      state.historySaved = false;
      draw();
      return;
    }
    const f = state.form;
    // Nhân TRIEU vì ô nhập ở đây tính bằng đơn vị triệu, còn các bảng lưu bằng đồng thật.
    const efCurrent = (Number(f.ef_current)||0) * TRIEU;
    const efMonthlyMin = (Number(f.ef_monthly_min)||0) * TRIEU;
    const debtTotal = (Number(f.debt_total)||0) * TRIEU;
    const debtMonthly = (Number(f.debt_monthly)||0) * TRIEU;
    const assetsTotal = (Number(f.assets_total)||0) * TRIEU;
    const estimatedIncome = (Number(f.income)||0) * TRIEU;
    const estimatedExpense = (Number(f.expense)||0) * TRIEU;
    const passiveIncomeAmt = (Number(f.passive_income)||0) * TRIEU;
    const incomeSourcesCount = Number(f.income_sources)||0; // đếm số nguồn, KHÔNG nhân TRIEU

    const existingEf = await ctx.supabase.from('tc_emergency_fund').select('target_amount').eq('user_id', ctx.user.id).maybeSingle();
    const suggestedTarget = Math.round(efMonthlyMin * 3);
    const targetAmount = (existingEf.data && Number(existingEf.data.target_amount) > 0) ? existingEf.data.target_amount : suggestedTarget;

    await Promise.all([
      ctx.supabase.from('tc_emergency_fund').upsert({
        user_id: ctx.user.id, current_amount: efCurrent, target_amount: targetAmount, updated_at: new Date().toISOString(),
      }, { onConflict:'user_id' }),
      (async () => {
        const existingDebt = await ctx.supabase.from('tc_debts').select('id').eq('user_id', ctx.user.id).eq('creditor_name', SEED_DEBT_NAME).maybeSingle();
        const payload = { creditor_name: SEED_DEBT_NAME, current_balance: debtTotal, minimum_payment: debtMonthly };
        if(existingDebt.data) await ctx.supabase.from('tc_debts').update(payload).eq('id', existingDebt.data.id);
        else if(debtTotal > 0) await ctx.supabase.from('tc_debts').insert({ ...payload, user_id: ctx.user.id, interest_rate:0 });
      })(),
      ctx.supabase.from('tc_networth_snapshots').upsert({
        user_id: ctx.user.id, snapshot_month: month, asset_other: assetsTotal,
        estimated_income: estimatedIncome, estimated_expense: estimatedExpense,
        passive_income: passiveIncomeAmt, income_sources: incomeSourcesCount,
        updated_at: new Date().toISOString(),
      }, { onConflict:'user_id,snapshot_month' }),
      seedWeeklyPillars(),
    ]);
    // Tính lại Điểm Nghiệp (radar) NGAY sau khi seedWeeklyPillars() vừa ghi dữ liệu mới — góp ý
    // Quỳnh 2026-08-25: "điểm nghiệp bên dưới chưa khớp với cái radar bên trên". Trước đây radar chỉ
    // tính 1 lần lúc mới vào trang, nên nếu vừa làm bài xong thì "Soi theo 5 Trụ Cột" + Bản Giải Phẫu
    // (đọc trực tiếp state.karmaAxes, xem bên dưới) vẫn hiện đúng số MỚI, khớp hẳn với radar phía trên.
    await bootDashboard();

    // KHÔNG xoá draft sau khi lưu (khác hầu hết module khác) — góp ý Quỳnh 2026-08-24: "không lưu
    // những gì làm dở khi bấm sang phần khác". 4 câu số (income/expense/passive_income/
    // income_sources) KHÔNG có bảng riêng nào lưu lại (xem comment đầu file) — draft chính là nơi
    // DUY NHẤT giữ lại các số này; xoá draft ngay sau khi lưu nghĩa là quay lại trang này lần sau
    // luôn thấy trống trơn, dù vừa mới làm xong. Giữ draft để rời trang rồi quay lại vẫn thấy đúng
    // số cũ, sửa lại rồi "Xem Kết Quả" lại là đủ cho nhu cầu "làm lại bài", không cần dọn sạch trước.
    state.saving = false;
    state.result = computeResult();
    // Cá nhân hoá màn nâng cấp (renderUpgradeScreen ở app-shell.js) bằng đúng khâu yếu nhất vừa đo
    // được — 2026-08-24, góp ý Quỳnh: cho làm bài chẩn đoán free rồi mời nâng cấp NGAY lúc động lực
    // cao nhất. Chỉ lưu tạm trong window (session), không lưu DB — đúng nguyên tắc "Điểm Nghiệp Tiền
    // không lưu lại".
    window.TcLastWeakestArea = state.result.weakestArea ? WEAKEST_AREA_INFO[state.result.weakestArea] : null;
    // Dùng để xếp lại thứ tự 3 khối lợi ích ở màn nâng cấp (tcBenefitsHtml() ở app-shell.js) — có
    // nợ thật thì đẩy "thanh khoản nợ" lên đầu, không nợ thì đẩy xuống cuối (2026-08-24, góp ý Quỳnh).
    window.TcLastHasDebt = Number(state.form.debt_total) > 0;
    state.historySaved = false;
    draw();
  }

  // Ghi 1 dòng SNAPSHOT vào tc_karma_history khi bấm nút "💾 Lưu kết quả này" — góp ý Quỳnh:
  // (2026-08-25) "để chị làm lại thì sau này xem lại được cả những điểm ngày trước đã từng làm theo
  // ngày"; (2026-08-26) "vẫn chưa có nút ấn lưu kết quả" — ĐỔI từ tự lưu ngầm mỗi lần "Xem Kết Quả"
  // sang phải bấm nút riêng, để người dùng chủ động chọn đúng lúc kết quả "thật" mới lưu, không lưu
  // lộn xộn mỗi lần chỉnh sửa qua lại câu trả lời. KHÁC nguyên tắc "không lưu điểm suy ra được" ở chỗ:
  // đây là bảng LỊCH SỬ theo thời gian, không phải điểm hiện tại — không cách nào tính lại được "điểm
  // ngày 20/8 là bao nhiêu" nếu không lưu lại đúng lúc đó. append-only, không upsert. Đọc điểm từ
  // state.karmaAxes (ĐÃ refresh qua bootDashboard() ở trên) — KHÔNG tính riêng từ vibe nữa, để số ghi
  // vào lịch sử luôn khớp đúng với số đang hiện ở radar/"Soi theo 5 Trụ Cột" ngay lúc lưu.
  async function saveKarmaHistory(){
    if(!state.result || state.result.vibeScore == null || state.historySaved || state.savingHistory) return;
    state.savingHistory = true; draw();
    const pillarScores = {};
    HOUSES.forEach(h=>{
      const axis = state.karmaAxes.find(a=>a.key===h.key);
      pillarScores[h.key] = axis ? axis.value : null;
    });
    const row = {
      user_id: ctx.user.id,
      vibe_score: state.result.vibeScore,
      weakest_area: state.result.weakestArea,
      than_tam_ban_the: pillarScores.than_tam_ban_the,
      coi_nguon_sinh_thanh: pillarScores.coi_nguon_sinh_thanh,
      ban_doi_moi_quan_he: pillarScores.ban_doi_moi_quan_he,
      tai_chinh_tam_thuc: pillarScores.tai_chinh_tam_thuc,
      thuan_phap_nhan_qua: pillarScores.thuan_phap_nhan_qua,
    };
    try{
      const { data } = await ctx.supabase.from('tc_karma_history').insert(row).select().maybeSingle();
      // Cập nhật luôn state nếu tab "Theo Dõi Kết Quả" đã từng load — để không cần bấm lại tab mới
      // thấy mốc vừa ghi (2026-08-25, "Theo Dõi Kết Quả" là 1 TAB của trang này, không phải trang riêng).
      if(state.karmaHistoryLoaded) state.karmaHistory.unshift(data || { ...row, taken_at: new Date().toISOString() });
      state.historySaved = true;
    } catch(e){ /* best-effort — báo lỗi nhẹ, không chặn luồng xem kết quả */ }
    state.savingHistory = false;
    draw();
  }

  async function loadKarmaHistory(){
    if(state.karmaHistoryLoaded) return;
    state.karmaHistoryLoading = true; draw();
    const { data } = await ctx.supabase.from('tc_karma_history').select('*')
      .eq('user_id', ctx.user.id).order('taken_at', { ascending:false }).limit(50);
    state.karmaHistory = data || [];
    state.karmaHistoryLoaded = true;
    state.karmaHistoryLoading = false;
    draw();
  }

  function fieldHtml(dataKey, label, hint, unit){
    return `
      <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 4px;">${esc(label)}</label>
      ${hint?`<div style="font-size:12px;color:var(--ink-soft);margin-bottom:6px;">${esc(hint)}</div>`:''}
      <div style="display:flex;align-items:center;gap:8px;">
        <input type="number" min="0" data-field="${dataKey}" value="${esc(state.form[dataKey])}" placeholder="0" style="flex:1;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-size:14px;background:#FDFCF8;color:var(--ink);">
        <span style="font-size:13px;color:var(--ink-soft);white-space:nowrap;">${esc(unit)}</span>
      </div>
    `;
  }

  function vibeQuestionHtml(key){
    const q = VIBE_QUESTIONS[key];
    const selected = state.vibe[key];
    return `
      <div style="margin-top:16px;padding-top:14px;border-top:1px dashed var(--line);">
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:8px;">${esc(q.q)}</label>
        <div class="chips" data-vibe-group="${key}">
          ${q.options.map(o=>`<div class="chip ${selected===o.k?'selected':''}" data-vibe-key="${key}" data-vibe-val="${o.k}">${esc(o.label)}</div>`).join('')}
        </div>
        ${selected ? `<div class="hint-box" style="margin-top:8px;">${esc(q.options.find(o=>o.k===selected).d)}</div>` : ''}
      </div>
    `;
  }

  function resultHtml(){
    const r = state.result;
    return `
      <div class="section">
        <h3>🧭 Bức tranh tài chính của bạn</h3>
        <div class="source-grid">
          <div class="source-card"><div class="ic" style="font-size:16px;color:${r.cashFlow>=0?'var(--accent)':'var(--danger)'};">${r.cashFlow>=0?'+':''}${r.cashFlow.toLocaleString('vi-VN')}tr</div><div class="label">Dòng tiền/tháng</div></div>
          <div class="source-card"><div class="ic" style="font-size:16px;">${r.savingsRate}%</div><div class="label">Tỷ lệ tiết kiệm</div></div>
          <div class="source-card"><div class="ic" style="font-size:16px;">${r.efMonths==null?'—':r.efMonths+' tháng'}</div><div class="label">Dự phòng</div></div>
          <div class="source-card"><div class="ic" style="font-size:16px;color:${r.netWorth>=0?'var(--accent)':'var(--danger)'};">${r.netWorth.toLocaleString('vi-VN')}tr</div><div class="label">Tài sản ròng</div></div>
          <div class="source-card"><div class="ic" style="font-size:16px;color:${r.dti>=36?'var(--danger)':'var(--ink)'};">${r.dti}%</div><div class="label">Áp lực trả nợ</div></div>
          <div class="source-card"><div class="ic" style="font-size:16px;">${r.passivePct}%</div><div class="label">Thu nhập tự động</div></div>
        </div>
        <div class="hint-box" style="margin-top:14px;">${esc(r.note)}</div>
      </div>

      ${r.vibeScore!=null ? `
        <div class="section">
          <h3>🔥 Điểm Nghiệp Tiền của bạn</h3>
          <div style="text-align:center;padding:12px 0;">
            <div style="font-family:'IBM Plex Mono',monospace;font-size:40px;font-weight:700;color:var(--accent);">${r.vibeScore}<span style="font-size:18px;color:var(--ink-soft);">/100</span></div>
          </div>
          ${r.weakestArea ? `
            <div class="hint-box">Khâu đang yếu nhất hiện tại: <b>${esc(WEAKEST_AREA_INFO[r.weakestArea].label)}</b> — ${esc(WEAKEST_AREA_INFO[r.weakestArea].explain)}</div>
            ${!isGuest ? `
              <div class="btn-row" style="justify-content:flex-start;margin-top:10px;">
                <span class="btn-ghost btn btn-sm" data-tangthuc-area="${r.weakestArea}">🌱 Lưu hạt giống này vào Hạt Giống Phước - Nghiệp →</span>
              </div>
            ` : ''}
          ` : ''}
          ${!isGuest ? `<div class="hint-box" style="margin-top:10px;">🌀 Đã dùng câu trả lời ở trên để điền sẵn 1 số tự đánh giá tuần này ở <a href="#tong-ket-tuan" style="color:var(--accent);font-weight:600;">Tổng Kết Tuần →</a> (chỗ nào bạn chưa tự chấm) — nhờ vậy Điểm Nghiệp ngay phía trên ↑ có dữ liệu thật ở cả 5 Trụ Cột ngay từ bây giờ.</div>` : ''}
        </div>

        ${isGuest ? `
          <div class="card" style="margin-bottom:20px;background:var(--accent-soft);border-color:var(--accent);">
            <div style="font-weight:700;font-size:15.5px;margin-bottom:8px;">💾 Lưu lại kết quả này</div>
            <div style="font-size:13.5px;line-height:1.6;margin-bottom:14px;">Đăng ký miễn phí (30 giây, không cần thẻ) để lưu lại đúng kết quả này, xem đủ Soi theo 5 Trụ Cột Năng Lượng + Bản Giải Phẫu Chi Tiết cho khâu yếu nhất, và theo dõi Điểm Nghiệp thay đổi theo thời gian.</div>
            <button class="btn btn-full" id="tc-guest-save-cta">Lưu kết quả — Đăng ký miễn phí →</button>
          </div>
        ` : `
        <div class="section">
          <h3>🌿 Soi theo 5 Trụ Cột Năng Lượng</h3>
          <p style="font-size:12.5px;color:var(--ink-soft);margin-bottom:12px;">Không chỉ 1 điểm số — đây là cách câu trả lời của bạn đang tác động tới TỪNG trụ trong 5 Trụ Cột Năng Lượng Bản Thể ở Điểm Nghiệp phía trên ↑.</p>
          <div style="display:flex;flex-direction:column;gap:10px;">
            ${HOUSES.map(h=>{
              // Điểm ở đây LUÔN lấy từ state.karmaAxes (đúng số đang hiện trên radar Điểm Nghiệp phía
              // trên ↑) — góp ý Quỳnh 2026-08-25: "điểm nghiệp bên dưới chưa khớp với cái radar bên
              // trên" (trước đây tự tính riêng từ avgPoints Vibe Check, ra số khác hẳn radar).
              const axis = state.karmaAxes.find(a=>a.key===h.key);
              const score = axis ? axis.value : 50;
              const tier = pillarTier(score);
              return `
                <div class="hint-box" style="text-align:left;">
                  <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:5px;">
                    <span style="font-family:'IBM Plex Mono',monospace;font-weight:700;font-size:18px;color:var(--accent);">${score}<span style="font-size:11px;font-weight:600;color:var(--ink-soft);">/100</span></span>
                    <span style="font-weight:700;font-size:13.5px;">${esc(h.label)}${tierBadgeHtml(tier)}</span>
                  </div>
                  <div style="font-size:13px;line-height:1.65;">${esc(PILLAR_ANALYSIS[h.key][tier])}</div>
                  <div style="font-size:12.5px;line-height:1.6;margin-top:8px;padding-top:8px;border-top:1px dashed var(--line);"><b>💡 Cách nâng điểm:</b> ${esc(PILLAR_IMPROVE_TIPS[h.key])}</div>
                </div>
              `;
            }).join('')}
          </div>
          ${(()=>{
            // Bản giải phẫu đầy đủ CHỈ hiện cho ĐÚNG 1 trụ thấp điểm nhất theo state.karmaAxes (cùng
            // nguồn số liệu với khối ở trên và với radar) — xem comment ở PILLAR_DEEP_ANALYSIS phía
            // trên vì sao chỉ chọn 1 trụ (khớp hành vi tài liệu gốc, tránh dàn trải 5 bài dài như nhau).
            if(state.karmaAxes.length === 0) return '';
            const weakest = state.karmaAxes.reduce((worst,cur)=> cur.value < worst.value ? cur : worst);
            const weakestHouse = HOUSES.find(h=>h.key===weakest.key);
            return deepAnalysisHtml(weakest.key, weakestHouse.label);
          })()}
        </div>

        <div class="section">
          <div class="btn-row" style="justify-content:flex-start;">
            ${state.historySaved
              ? `<span class="btn-ghost btn btn-sm" data-tc-tab="theo-doi" style="cursor:pointer;">✅ Đã lưu — xem 📈 Theo Dõi Kết Quả →</span>`
              : `<span class="btn btn-sm" data-save-karma="1">${state.savingHistory?'Đang lưu…':'💾 Lưu kết quả này'}</span>`}
          </div>
          <div class="hint-box" style="margin-top:10px;">Bấm "💾 Lưu kết quả này" để ghi lại đúng bức tranh + toàn bộ phân tích 5 Trụ Cột ở trên ↑ thành 1 mốc — xem lại theo thời gian ở tab <span data-tc-tab="theo-doi" style="color:var(--accent);font-weight:600;cursor:pointer;">📈 Theo Dõi Kết Quả →</span>.</div>
        </div>
        `}
      ` : ''}

      ${(!isGuest && !(ctx.profile && ctx.profile.tc_has_paid)) ? `
        <div class="card" style="margin-top:20px;background:var(--accent-soft);border-color:var(--accent);">
          <div style="font-weight:700;font-size:15.5px;margin-bottom:8px;">🔓 Đây chỉ là bức tranh khởi đầu</div>
          <div style="font-size:13.5px;line-height:1.6;margin-bottom:14px;">
            ${r.weakestArea
              ? `Bạn đang yếu nhất ở khâu <b>${esc(WEAKEST_AREA_INFO[r.weakestArea].label)}</b>. Mở khoá TRỌN ĐỜI Hạt Giống Phước - Nghiệp (chữa lành gốc rễ), Mục Tiêu & Cam Kết, Tổng Kết Tuần/Tháng, Quản Lý Nợ để bắt đầu chuyển hoá thật, không chỉ dừng ở việc nhìn thấy vấn đề.`
              : `Mở khoá TRỌN ĐỜI Hạt Giống Phước - Nghiệp, Mục Tiêu & Cam Kết, Tổng Kết Tuần/Tháng, Quản Lý Nợ để đi tiếp từ bức tranh này.`}
            Trả 1 lần, dùng mãi mãi.
          </div>
          ${tcPriceAnchorHtml(ctx.profile)}
          <button class="btn btn-full" style="margin-top:14px;" data-goto="nang-cap">Nâng Cấp Ngay →</button>
        </div>
      ` : ''}

      <div class="section">
        <div class="btn-row" style="justify-content:flex-start;">
          ${!isGuest ? `
            <span class="btn btn-sm" data-goto="trang-chu">Về Trang chủ →</span>
            <span class="btn-ghost btn btn-sm" data-goto="quan-ly-no">Xem Quản Lý Nợ →</span>
          ` : ''}
        </div>
      </div>
    `;
  }

  function dashboardHtml(){
    return `
      <div class="card" style="margin-bottom:20px;">
        <h3 style="font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;text-align:center;">${glossaryWrap('Điểm Nghiệp', 'karma_score')}</h3>
        ${radarChartHtml(state.karmaAxes)}
        <div class="hint-box" id="tc-pillar-explain" style="margin-top:6px;">${
          state.selectedPillarKey
            ? `<b>${esc((HOUSES.find(h=>h.key===state.selectedPillarKey)||{}).label||'')}: ${(state.karmaAxes.find(a=>a.key===state.selectedPillarKey)||{}).value ?? '—'}/100</b> — ${esc((HOUSES.find(h=>h.key===state.selectedPillarKey)||{}).desc||'')}`
            : 'Điểm từng trụ đã hiện ngay dưới tên ở trên — bấm vào tên 1 Trụ Cột để xem trụ đó là gì.'
        }</div>
        ${state.activeBeliefsCount>0 ? `<div class="hint-box" style="margin-top:6px;">🌱 Bạn còn <b>${state.activeBeliefsCount}</b> hạt giống cũ chưa chuyển hoá — đang kéo nhẹ Trụ Tài Chính Tâm Thức (và lan sang cả 4 trụ còn lại) xuống. <a href="#tang-thuc" style="color:var(--accent);font-weight:600;">Xem Hạt Giống Phước - Nghiệp →</a></div>` : ''}
      </div>

      <div class="source-grid" style="margin-bottom:20px;">
        <div class="source-card"><div class="ic" style="font-size:17px;color:var(--accent);">${state.monthIncome.toLocaleString('vi-VN')}đ</div><div class="label">Thu tháng này</div></div>
        <div class="source-card"><div class="ic" style="font-size:17px;color:var(--danger);">${state.monthExpense.toLocaleString('vi-VN')}đ</div><div class="label">Chi tháng này</div></div>
        <div class="source-card">
          <div class="ic" style="font-size:17px;${state.netWorth==null?'':`color:${state.netWorth>=0?'var(--accent)':'var(--danger)'};`}">${state.netWorth==null?'Chưa có':state.netWorth.toLocaleString('vi-VN')+'đ'}</div>
          <div class="label">Tài sản ròng${state.netWorthMonth?` (${esc(state.netWorthMonth)})`:''}</div>
        </div>
        <div class="source-card"><div class="ic" style="font-size:17px;${state.totalDebt>0?'color:var(--danger);':''}">${state.totalDebt.toLocaleString('vi-VN')}đ</div><div class="label">Tổng nợ hiện tại</div></div>
      </div>

      ${state.upcomingDebts.length>0 ? `
        <div class="card" style="margin-bottom:20px;border-color:var(--gold);">
          <h3 style="font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--gold);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px;">💛 Cơ hội thanh khoản tri ân sắp tới</h3>
          ${state.upcomingDebts.map(d=>{
            const timeLabel = d.daysUntil===0 ? 'Hôm nay' : d.daysUntil===1 ? 'Ngày mai' : `Còn ${d.daysUntil} ngày`;
            return `
            <div style="padding:6px 0;font-size:13.5px;line-height:1.6;">
              <b>${timeLabel}</b> là cơ hội để bạn thanh khoản tri ân cho <b>${esc(d.creditor_name)}</b> — hãy gửi năng lượng biết ơn đến dòng chảy tài chính đang nâng đỡ bạn nhé.
            </div>
          `;}).join('')}
        </div>
      ` : ''}
    `;
  }

  function tabsHtml(){
    return `
      <div class="chips" style="margin-bottom:18px;">
        <div class="chip ${state.activeTab==='lam-bai'?'selected':''}" data-tc-tab="lam-bai">📝 Làm Bài & Kết Quả</div>
        <div class="chip ${state.activeTab==='theo-doi'?'selected':''}" data-tc-tab="theo-doi">📈 Theo Dõi Kết Quả</div>
      </div>
    `;
  }

  // Biểu đồ Điểm Nghiệp Tiền theo tháng — góp ý Quỳnh 2026-08-26: "sẽ có cái bảng tỷ lệ theo tháng
  // như ở tổng kết tháng". Gộp theo tháng (trung bình vibe_score các lần chấm trong tháng đó), vẽ
  // cột giống networthChartHtml() ở tong-ket-thang.js (0-100 nên không cần đường mốc 0 âm/dương).
  function karmaHistoryChartHtml(rows){
    const byMonth = {};
    rows.forEach(r=>{
      if(r.vibe_score == null) return;
      const m = new Date(r.taken_at).toISOString().slice(0,7);
      (byMonth[m] = byMonth[m] || []).push(r.vibe_score);
    });
    const months = Object.keys(byMonth).sort();
    if(months.length < 2) return '';
    const buckets = months.map(m => ({ month:m, avg: Math.round(byMonth[m].reduce((s,v)=>s+v,0)/byMonth[m].length) }));
    const w = 680, h = 170, padTop = 16, padBottom = 28, padSide = 12;
    const innerW = w - padSide*2, innerH = h - padTop - padBottom;
    const n = buckets.length;
    const slot = innerW / n;
    const barW = Math.max(10, Math.min(40, slot * 0.6));
    const parts = buckets.map((b,i)=>{
      const x = padSide + slot*i + (slot-barW)/2;
      const barH = Math.max(1, innerH * (b.avg/100));
      const y = padTop + (innerH - barH);
      const [yy, mm] = b.month.split('-');
      return `<text x="${(x+barW/2).toFixed(1)}" y="${(y-4).toFixed(1)}" text-anchor="middle" font-size="9" fill="var(--ink-soft)" font-family="IBM Plex Mono, monospace">${b.avg}</text><rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${barH.toFixed(1)}" fill="var(--accent)" rx="2"/><text x="${(x+barW/2).toFixed(1)}" y="${h-8}" text-anchor="middle" font-size="9" fill="var(--ink-soft)" font-family="IBM Plex Mono, monospace">${mm}/${yy.slice(2)}</text>`;
    }).join('');
    return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:${h}px;margin-bottom:16px;">${parts}</svg>`;
  }

  // Đọc lại TOÀN BỘ phân tích của 1 lần chấm điểm CŨ — góp ý Quỳnh 2026-08-26: "phần theo dõi kết
  // quả là lưu cả cái phân tích ý, bấm vào từng ngày đọc được hết". KHÔNG lưu thêm cột text nào mới —
  // dựng lại 100% từ 5 điểm trụ cột ĐÃ lưu trong row (than_tam_ban_the...), vì PILLAR_ANALYSIS/
  // PILLAR_DEEP_ANALYSIS chỉ phụ thuộc vào điểm + trụ yếu nhất, không phụ thuộc thời điểm xem lại.
  function historyRowAnalysisHtml(row){
    const scored = HOUSES.map(h=>({ h, score: row[h.key] })).filter(x=>x.score!=null);
    if(scored.length === 0) return `<div class="hint-box">Lần này chưa có đủ điểm 5 Trụ Cột để xem lại phân tích.</div>`;
    const weakest = scored.reduce((worst,cur)=> cur.score < worst.score ? cur : worst);
    return `
      <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:14px;">
        ${scored.map(({h,score})=>{
          const tier = pillarTier(score);
          return `
            <div class="hint-box" style="text-align:left;">
              <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:5px;">
                <span style="font-family:'IBM Plex Mono',monospace;font-weight:700;font-size:16px;color:var(--accent);">${score}<span style="font-size:10px;font-weight:600;color:var(--ink-soft);">/100</span></span>
                <span style="font-weight:700;font-size:13px;">${esc(h.label)}${tierBadgeHtml(tier)}</span>
              </div>
              <div style="font-size:12.5px;line-height:1.6;">${esc(PILLAR_ANALYSIS[h.key][tier])}</div>
            </div>
          `;
        }).join('')}
      </div>
      ${deepAnalysisHtml(weakest.h.key, weakest.h.label)}
    `;
  }

  function historyTabHtml(){
    if(state.karmaHistoryLoading) return `<div class="loading"><div class="spinner"></div></div>`;
    if(state.karmaHistory.length === 0) return `<div class="hint-box">Chưa có lần chấm điểm nào được lưu — sang tab "📝 Làm Bài & Kết Quả" và bấm "Xem Kết Quả" để bắt đầu theo dõi.</div>`;
    return `
      <div class="section">
        <p style="font-size:12.5px;color:var(--ink-soft);margin-bottom:12px;">${state.karmaHistory.length>=50?'50 lần gần nhất — ':''}Mới nhất ở trên cùng. Bấm vào 1 dòng để đọc lại toàn bộ phân tích lúc đó.</p>
        ${karmaHistoryChartHtml(state.karmaHistory)}
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead><tr>
              <th style="text-align:left;padding:6px 8px;border-bottom:1px solid var(--line);font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--ink-soft);text-transform:uppercase;">Ngày</th>
              <th style="text-align:right;padding:6px 8px;border-bottom:1px solid var(--line);font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--ink-soft);text-transform:uppercase;">Điểm Nghiệp Tiền</th>
              <th style="text-align:left;padding:6px 8px;border-bottom:1px solid var(--line);font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--ink-soft);text-transform:uppercase;">Khâu yếu nhất</th>
              <th style="text-align:left;padding:6px 8px;border-bottom:1px solid var(--line);font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--ink-soft);text-transform:uppercase;">5 Trụ Cột</th>
            </tr></thead>
            <tbody>
              ${state.karmaHistory.map(row=>`
                <tr data-history-row="${row.id}" style="cursor:pointer;">
                  <td style="padding:8px;border-bottom:1px solid var(--line-soft);white-space:nowrap;vertical-align:top;">${esc(new Date(row.taken_at).toLocaleDateString('vi-VN'))} ${state.expandedHistoryId===row.id?'▲':'▼'}</td>
                  <td style="text-align:right;padding:8px;border-bottom:1px solid var(--line-soft);font-family:'IBM Plex Mono',monospace;font-weight:700;color:var(--accent);vertical-align:top;">${row.vibe_score==null?'—':row.vibe_score+'/100'}</td>
                  <td style="padding:8px;border-bottom:1px solid var(--line-soft);vertical-align:top;">${row.weakest_area && WEAKEST_AREA_INFO[row.weakest_area] ? esc(WEAKEST_AREA_INFO[row.weakest_area].label) : '—'}</td>
                  <td style="padding:8px;border-bottom:1px solid var(--line-soft);font-size:11.5px;color:var(--ink-soft);vertical-align:top;">
                    ${HOUSES.map(h=>`${esc(h.label.replace(/^\S+\s/,''))}: <b>${row[h.key]==null?'—':row[h.key]}</b>`).join(' · ')}
                  </td>
                </tr>
                ${state.expandedHistoryId===row.id ? `
                  <tr><td colspan="4" style="padding:12px 4px;border-bottom:1px solid var(--line-soft);background:var(--bg);">
                    ${historyRowAnalysisHtml(row)}
                  </td></tr>
                ` : ''}
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function html(){
    return `
      <div class="page-head">
        <h1>Chấm Điểm Nghiệp Tiền</h1>
        ${isGuest ? `
          <p>Làm bài <b>miễn phí, không cần đăng ký</b> — chỉ khi muốn lưu lại kết quả mới cần tạo tài khoản (30 giây).</p>
        ` : `
          <p><b>Điểm Nghiệp theo 5 Trụ Cột</b> + số liệu tháng này ngay dưới đây — tự cập nhật mỗi khi bạn ghi chép/tổng kết.</p>
        `}
        <p><b>7 câu hỏi số liệu + 10 câu Vibe Check</b> bên dưới vừa điền sẵn Quỹ Khẩn Cấp, Nợ, Cân Đối Tài Sản ban đầu, vừa soi ra <b>khâu nào đang bị tâm thức sợ hãi chi phối</b> — kể cả khi thấy người khác nhận tiền, không chỉ riêng chuyện tiền của bạn. Làm lại bất cứ lúc nào để cập nhật.</p>
      </div>

      ${!isGuest ? tabsHtml() : ''}

      ${(!isGuest && state.activeTab === 'theo-doi') ? historyTabHtml() : `

      ${(!isGuest && state.dashboardLoading) ? `<div class="loading"><div class="spinner"></div></div>` : ''}
      ${!isGuest ? dashboardHtml() : ''}

      ${state.loading ? `<div class="loading"><div class="spinner"></div></div>` : `
        <div class="section">
          <h3>Bước 1 · Thu nhập</h3>
          ${fieldHtml('income', 'Thu nhập trung bình/tháng', 'Trung bình 3 tháng gần nhất, tổng thu nhập thực nhận.', 'triệu đ')}
          ${vibeQuestionHtml('income')}
        </div>

        <div class="section">
          <h3>Bước 2 · Chi tiêu</h3>
          ${fieldHtml('expense', 'Chi tiêu trung bình/tháng', 'Tính hết mọi khoản: sinh hoạt, nợ, mua sắm, giải trí...', 'triệu đ')}
          ${vibeQuestionHtml('expense')}
        </div>

        <div class="section">
          <h3>Bước 3 · Quỹ Khẩn Cấp</h3>
          ${fieldHtml('ef_current', 'Tiền dự phòng có thể dùng nhanh', 'Nếu ngày mai thu nhập chính dừng lại, bạn có bao nhiêu để xoay xở ngay?', 'triệu đ')}
          ${fieldHtml('ef_monthly_min', 'Chi phí tối thiểu cần mỗi tháng', 'Để duy trì cuộc sống cơ bản.', 'triệu đ')}
          ${vibeQuestionHtml('ef')}
        </div>

        <div class="section">
          <h3>Bước 4 · Nợ</h3>
          ${fieldHtml('debt_total', 'Tổng dư nợ hiện tại', 'Không có nợ thì để 0.', 'triệu đ')}
          ${fieldHtml('debt_monthly', 'Số tiền trả nợ mỗi tháng', '', 'triệu đ')}
          <div class="hint-box" style="margin-top:10px;">Đây là số gộp để có điểm khởi đầu nhanh. Sang <a href="#quan-ly-no" style="color:var(--accent);font-weight:600;">Quản Lý Nợ →</a> để khai chi tiết từng khoản (lãi suất, hạn trả) khi có thời gian.</div>
          ${vibeQuestionHtml('debt')}
        </div>

        <div class="section">
          <h3>Bước 5 · Tài sản</h3>
          ${fieldHtml('assets_total', 'Tổng tài sản hiện có', 'Tiền mặt, tiết kiệm, vàng, chứng khoán, bất động sản, xe... — ước tính tổng.', 'triệu đ')}
          ${vibeQuestionHtml('asset')}
        </div>

        <div class="section">
          <h3>Bước 6-7 · Thu nhập tự động & Số nguồn thu</h3>
          <p style="font-size:12.5px;color:var(--ink-soft);margin-bottom:0;">2 câu số này chỉ để tham khảo trong kết quả, chưa có chỗ lưu theo thời gian trong app.</p>
          ${fieldHtml('passive_income', 'Thu nhập tự động/tháng', 'Tiền đến từ tài sản/hệ thống, không cần trực tiếp làm việc trong tháng đó.', 'triệu đ')}
          ${fieldHtml('income_sources', 'Số nguồn thu đang hoạt động', 'VD: lương + bán hàng online + cho thuê nhà = 3 nguồn.', 'nguồn')}
          ${vibeQuestionHtml('passive')}
        </div>

        <div class="section">
          <h3>Bước 8 · Cội Nguồn, Mối Quan Hệ & Cho Đi</h3>
          <p style="font-size:12.5px;color:var(--ink-soft);margin-bottom:6px;">4 câu này không liên quan số liệu.</p>
          <p style="font-size:12.5px;color:var(--ink-soft);margin-bottom:6px;"><b>2 câu đầu</b> giúp Điểm Nghiệp có dữ liệu thật ngay từ đầu ở cả 5 Trụ Cột.</p>
          <p style="font-size:12.5px;color:var(--ink-soft);margin-bottom:0;"><b>2 câu sau</b> giúp chẩn đoán đủ hơn khâu đang yếu nhất (kể cả khi thấy người khác nhận tiền), và soi thêm phần <b>"cho đi"</b> — gốc rễ thật của phước phần, không chỉ riêng chuyện tích luỹ.</p>
          ${vibeQuestionHtml('parents')}
          ${vibeQuestionHtml('partner')}
          ${vibeQuestionHtml('witness_receive')}
          ${vibeQuestionHtml('giving')}

          <button class="btn btn-full" style="margin-top:18px;" id="setup-submit" ${state.saving?'disabled':''}>${state.saving?'Đang lưu…':'Xem Kết Quả →'}</button>
        </div>

        ${state.result ? resultHtml() : ''}
      `}
      `}
    `;
  }

  function bind(){
    container.querySelectorAll('[data-tc-tab]').forEach(el=>{
      el.onclick = ()=>{
        state.activeTab = el.getAttribute('data-tc-tab');
        if(state.activeTab === 'theo-doi') loadKarmaHistory();
        draw();
      };
    });
    const saveKarmaBtn = container.querySelector('[data-save-karma]');
    if(saveKarmaBtn) saveKarmaBtn.onclick = saveKarmaHistory;
    // Khách bấm "Lưu kết quả" → mở popup đăng ký (KHÔNG có nút này nếu isGuest false, xem
    // resultHtml()) — câu trả lời đã có sẵn trong localStorage từ persistDraft() lúc submit(), tự
    // được đọc lại + lưu thật ngay khi đăng ký xong (window.startTcAuthModal ở app-shell.js).
    const guestSaveCta = container.querySelector('#tc-guest-save-cta');
    if(guestSaveCta) guestSaveCta.onclick = ()=>{ if(window.startTcAuthModal) window.startTcAuthModal('signup'); };
    container.querySelectorAll('[data-history-row]').forEach(el=>{
      el.onclick = ()=>{
        const id = el.getAttribute('data-history-row');
        state.expandedHistoryId = state.expandedHistoryId === id ? null : id;
        draw();
      };
    });
    container.querySelectorAll('[data-axis-key]').forEach(el=>{
      el.onclick = ()=>{ state.selectedPillarKey = el.getAttribute('data-axis-key'); draw(); };
    });
    container.querySelectorAll('[data-field]').forEach(el=>{
      el.oninput = ()=>{ state.form[el.getAttribute('data-field')] = el.value; persistDraft(); };
    });
    container.querySelectorAll('[data-vibe-key]').forEach(el=>{
      el.onclick = ()=>{
        const key = el.getAttribute('data-vibe-key'), val = el.getAttribute('data-vibe-val');
        state.vibe[key] = state.vibe[key]===val ? null : val;
        draw();
        persistDraft();
      };
    });
    const submitBtn = container.querySelector('#setup-submit');
    if(submitBtn) submitBtn.onclick = submit;
    container.querySelectorAll('[data-goto]').forEach(el=>{
      el.onclick = ()=>{ location.hash = el.getAttribute('data-goto'); };
    });
    container.querySelectorAll('[data-tangthuc-area]').forEach(el=>{
      el.onclick = async ()=>{
        const area = el.getAttribute('data-tangthuc-area');
        const info = WEAKEST_AREA_INFO[area];
        el.textContent = 'Đang lưu…';
        // Bấm nút này phải THỰC SỰ lưu 1 dòng vào Hạt Giống Phước - Nghiệp ngay (không chỉ điều
        // hướng kèm gợi ý rồi bắt gõ lại từ đầu) — góp ý 2026-08-22 sau khi bấm xong không thấy gì
        // được lưu. Câu khởi tạo (seedBelief) chỉ là điểm bắt đầu, người dùng sửa lại theo đúng cảm
        // nhận thật của mình khi sang trang, không bắt buộc giữ nguyên.
        await ctx.supabase.from('tc_core_beliefs').insert({
          user_id: ctx.user.id,
          belief_text: info.seedBelief,
          origin_note: 'Tự động ghi từ bài Chấm Điểm Nghiệp Tiền',
          linked_nut_chan: info.nutChan,
        });
        // Truyền ngữ cảnh sang Hạt Giống Phước - Nghiệp qua window.Pending* — đúng quy ước đã dùng ở
        // nhan-hieu/ (vd window.PendingHookText) để 1 module đưa dữ liệu tạm sang module khác qua
        // điều hướng.
        window.PendingTangThucContext = { areaLabel: info.label, nutChan: info.nutChan, justSaved: true };
        location.hash = 'tang-thuc';
      };
    });
  }

  // Vừa đăng ký/đăng nhập xong SAU KHI làm bài lúc còn là khách (TC_GUEST_QUIZ_KEY còn trong
  // localStorage) — khôi phục lại đúng câu trả lời đã gõ rồi lưu THẬT vào Supabase ngay (gọi submit()
  // với ctx.user giờ đã có), không bắt làm lại bài từ đầu. Chỉ chạy khi KHÔNG còn là khách nữa.
  async function convertGuestQuizIfAny(){
    if(isGuest) return false;
    let saved = null;
    try{ const raw = localStorage.getItem(TC_GUEST_QUIZ_KEY); if(raw) saved = JSON.parse(raw); }catch(e){}
    if(!saved) return false;
    try{ localStorage.removeItem(TC_GUEST_QUIZ_KEY); }catch(e){}
    if(saved.form) Object.assign(state.form, saved.form);
    if(saved.vibe) Object.assign(state.vibe, saved.vibe);
    await submit();
    return true;
  }

  if(isGuest){
    // Khôi phục câu trả lời đang gõ dở nếu khách lỡ tải lại trang giữa chừng (persistDraft() đã ghi
    // liên tục vào localStorage, xem trên) — và tự tính lại kết quả luôn nếu đã có đủ câu trả lời.
    try{
      const raw = localStorage.getItem(TC_GUEST_QUIZ_KEY);
      if(raw){
        const saved = JSON.parse(raw);
        if(saved.form) Object.assign(state.form, saved.form);
        if(saved.vibe) Object.assign(state.vibe, saved.vibe);
        if(Object.values(state.vibe).some(v=>v!=null)) state.result = computeResult();
      }
    }catch(e){}
    draw();
  } else {
    convertGuestQuizIfAny().then(()=>{ load(); bootDashboard(); });
  }
}

window.Modules = window.Modules || {};
window.Modules['thiet-lap-nhanh'] = { title:'Chấm Điểm Nghiệp Tiền', render };
})();
