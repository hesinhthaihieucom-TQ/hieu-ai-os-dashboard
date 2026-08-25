(function(){
// Nội dung tĩnh (không cần Supabase) — LƯU Ý: không dùng "Khoá Van Tiền"/"A'"/"Lệnh Ấn Định" làm
// tên gọi trong UI (thuật ngữ độc quyền của bên dạy, Thầy Bùi Quốc Tuấn) — chỉ giữ lại Ý TƯỞNG,
// đặt tên khác: "Nút Chặn Dòng Tiền", "Tiếng Lòng", "Lời Cam Kết". Toàn bộ nội dung đã được viết
// lại/condense theo giọng văn ứng dụng, không sao chép nguyên văn tài liệu gốc.

const NUT_CHAN = [
  {
    title:'Nút Chặn #1 — Khi thấy NGƯỜI KHÁC nhận được tiền',
    levels:[
      ['😣 Ganh tị, khó chịu', 'So sánh "sao họ có mà mình không" — tự tay khoá chặt tâm thức tiền của chính mình.'],
      ['😐 Thờ ơ', '"Tiền của họ, chẳng liên quan tới mình" — vô tình từ chối luôn cơ hội đón nhận đang ở ngay trước mắt.'],
      ['🙂 Vui giả', 'Miệng chúc mừng rộn ràng nhưng lòng chạnh lòng, tủi thân — tâm thức chỉ ghi nhận phần chạnh lòng bên dưới.'],
      ['😊 Vui thật', 'Hân hoan trọn vẹn như thể khoản tiền đó là của chính mình, không gợn chút so sánh — đây là trạng thái mở thông dòng tiền.'],
    ],
    practice:'Sự thật: món tiền vật chất nằm trong túi họ, nhưng "cơ hội thịnh vượng" mà bạn vừa được chứng kiến là dành cho chính bạn — vũ trụ không ngẫu nhiên cho bạn thấy khoảnh khắc đó. Vui thật lòng cho họ chính là cách bạn đón nhận phần thịnh vượng của riêng mình.',
  },
  {
    title:'Nút Chặn #2 — Khi chính MÌNH nhận được tiền',
    levels:[
      ['😣 Khó chịu, bất an', 'Tiền vừa về đã lo "chưa kịp ấm chỗ đã hết" hoặc chê ít — tâm thức nghèo khó ngay cả khi đang cầm tiền.'],
      ['😐 Thờ ơ', '"Đó là trao đổi sòng phẳng, hiển nhiên" — không một chút biết ơn, khiến dòng tiền mãi chỉ dừng ở mức đủ sống.'],
      ['🙂 Vui giả', 'Sung sướng khoe khoang bề ngoài nhưng bên trong kích hoạt tham lam hoặc mua sắm để che lấp trống rỗng.'],
      ['😊 Vui thật', 'Biết ơn sâu sắc, khiêm nhường đón nhận — xem mình là "trạm trung chuyển" chứ không phải nơi giữ tiền.'],
    ],
    practice:'Mỗi khoản tiền về là một phước lành, không phải điều hiển nhiên. Thái độ lúc tiền VỀ (không phải số tiền) mới là thứ quyết định nó ở lại nuôi dưỡng bạn hay lặng lẽ ra đi qua rắc rối/ốm đau phát sinh.',
  },
  {
    title:'Nút Chặn #3 — Khi chính MÌNH chi tiền ra',
    levels:[
      ['😣 Bủn xỉn, khó chịu', 'Tính toán chi li, trịch thượng với người phục vụ — khoá chặt lòng trắc ẩn và dòng chảy phước lành.'],
      ['😐 Thờ ơ', '"Tiền trao cháo múc" — chi tiền vô cảm, bỏ lỡ cơ hội rèn sự biết ơn.'],
      ['🙂 Hào phóng giả', 'Cho đi để thỏa mãn cái tôi hoặc vì thương hại — vô tình khiến người nhận ỷ lại, mất kết nối với công việc/tổ chức của họ.'],
      ['😊 Hào phóng thật', 'Chi tiền vô tư, trân trọng người nhận như người lao động chân chính — không phải ban phát.'],
    ],
    practice:'Tiền chi ra không biến mất — nó đang bắt đầu hành trình nuôi dưỡng người khác. Xót ruột khi trả tiền/trả nợ chính là tín hiệu tự đóng van thu nhập của chính mình; biết ơn khi chi tiền mới là chìa khoá mở van.',
  },
  {
    title:'Nút Chặn #4 — Khi thấy NGƯỜI KHÁC chi tiền',
    levels:[
      ['😣 Phán xét', '"Bày đặt khoe khoang", "phung phí quá" — phán xét cách người khác tiêu tiền cũng chặn đứng dòng tiền của chính mình.'],
      ['😐 Thờ ơ', '"Tiền của họ, mặc họ" — dửng dưng, tự cắt kết nối với cơ hội thịnh vượng đang bày ra trước mắt.'],
      ['🙂 Khen giả', 'Miệng khen "đẳng cấp quá" nhưng trong lòng tủi thân, so sánh với ví tiền của mình.'],
      ['😊 Vui thật', 'Thấy được dòng tiền đang nuôi sống bao nhiêu người khác (người bán hàng, người lao động...) — hân hoan với sự lưu thông của cả nền kinh tế.'],
    ],
    practice:'Dù chứng kiến ai NHẬN hay CHI tiền, chỉ cần bạn thật lòng vui vì hiểu rõ dòng tiền luôn luân chuyển để nuôi dưỡng nhiều người — bạn đã tự động trở thành "nam châm" hút thêm Dòng Tiền Bình An về phía mình.',
  },
];

function detailsSection(title, bodyHtml){
  return `<details class="kt-section" style="margin-bottom:12px;">
    <summary class="kt-summary">${esc(title)}</summary>
    <div style="margin-top:12px;line-height:1.7;font-size:14.5px;">${bodyHtml}</div>
  </details>`;
}

function html(){
  return `
    <div class="page-head">
      <h1>Kiến Thức Nền Tảng</h1>
      <p>Hiểu gốc rễ trước khi thực hành — mỗi phần dưới đây bấm vào để mở, đọc chậm rãi 1 lần trước khi bắt đầu ghi chép.</p>
    </div>

    <div class="section">
      ${detailsSection('💚😰 Dòng Tiền Bình An & Sợ Hãi là gì?', `
        <p><b>Dòng Tiền Bình An</b>: tiền kiếm được hoặc chi ra trong sự biết ơn, hoan hỷ, tạo giá trị thật — mang năng lượng sinh sôi.</p>
        <p><b>Dòng Tiền Sợ Hãi</b>: tiền kiếm được hoặc chi ra trong sự sợ hãi, lo âu, xót xa, oán trách — mang năng lượng huỷ hoại, tự tay tạo thêm Nút Chặn Dòng Tiền cho chính mình.</p>
        <p>Tiền tự nó trung tính — nó chỉ phản chiếu đúng tần số cảm xúc của bạn lúc dòng tiền đi qua. Đây là lý do Ghi Chép Hàng Ngày luôn hỏi bạn "đang cảm nhận gì" mỗi khi nhập giao dịch.</p>
      `)}
      ${detailsSection('🧘 5 Trụ Cột Năng Lượng Bản Thể là gì?', `
        <p>Mọi dòng tiền đi qua bạn đều ảnh hưởng tới 5 trụ cột đời sống (khoá "21 Ngày Giải Nghiệp"). Xem ngay 5 trụ này của bạn đang ở mức nào tại <a href="#thiet-lap-nhanh" style="color:var(--accent);font-weight:600;">Điểm Nghiệp ở Chấm Điểm Nghiệp Tiền →</a>:</p>
        <p>${HOUSES.map(h=>`${esc(h.label)} — ${esc(h.desc)}`).join('<br>')}</p>
        <p>Gắn mục tiêu tài chính vào 1 trụ cụ thể giúp mục tiêu có ý nghĩa cảm xúc thật, không chỉ là con số khô khan — đây là lý do Mục Tiêu & Cam Kết luôn hỏi bạn chọn 1 Trụ, và vì sao Điểm Nghiệp tính theo đúng 5 trụ này.</p>
      `)}
      ${detailsSection('🎯 Neo mục tiêu thanh khoản nợ vào 5 Trụ Cột', `
        ${HOUSES.map(h=>`<p><b>${esc(h.label)}</b> — ${esc(HOUSE_GOAL_ANCHOR[h.key])}</p>`).join('')}
      `)}
      ${detailsSection('☢️ Nhân Quả Của Khoản Nợ', `
        <p>Không phải khoản nợ nào cũng "xấu" — cùng là đi vay, nhưng bản chất năng lượng phía sau mỗi khoản nợ có thể rất khác nhau. App chia nợ thành 2 loại đối nghịch: <b>${esc(GLOSSARY.no_xanh.term)}</b> và <b>${esc(GLOSSARY.no_do.term)}</b>.</p>
        <p><b>🔴 ${esc(GLOSSARY.no_do.term)}</b> — ${esc(GLOSSARY.no_do.explain)}</p>
        <div class="hint-box" style="margin:8px 0;">
          <p style="margin-bottom:6px;"><b>Nhân — vì sao khoản nợ này hình thành:</b></p>
          <p style="margin-bottom:2px;">• Vay vì nôn nóng làm giàu nhanh: lướt sóng, tiền ảo, đa cấp rủi ro, sàn không rõ nguồn gốc.</p>
          <p style="margin-bottom:2px;">• Vay vì sĩ diện: cố mua sắm cho hào nhoáng, sợ bị người khác coi thường.</p>
          <p style="margin-bottom:2px;">• Vay từ nguồn cũng đang bất ổn: tín dụng đen, vay nóng lãi cao, người thân đang túng thiếu.</p>
          <p style="margin-bottom:8px;">• Dùng thẻ tín dụng/vay trả góp quá khả năng mà không có kế hoạch trả — dễ chịu 30 ngày đầu, sau đó thành áp lực thật.</p>
          <p style="margin-bottom:6px;"><b>Quả — hậu quả thường gặp:</b></p>
          <p style="margin-bottom:2px;">• Mất ngủ, lo âu, cơ thể mệt mỏi vì gánh nặng tâm lý kéo dài.</p>
          <p style="margin-bottom:2px;">• Né tránh: sợ mở app ngân hàng, né tin nhắn nhắc nợ, oán trách chủ nợ hoặc tự trách mình.</p>
          <p>• Vay chỗ này đắp chỗ kia — nợ chồng nợ, phình to dần ngoài kiểm soát.</p>
        </div>
        <p><b>🟢 ${esc(GLOSSARY.no_xanh.term)}</b> — ${esc(GLOSSARY.no_xanh.explain)}</p>
        <div class="hint-box" style="margin:8px 0;">
          <p style="margin-bottom:6px;"><b>Nhân — vì sao khoản nợ này khác hẳn:</b></p>
          <p style="margin-bottom:2px;">• Nhìn nhận khoản nợ như 1 bàn đạp để làm được điều lớn hơn khả năng hiện tại (mua nhà, đầu tư có tính toán, học nâng cao kỹ năng) — không sợ hãi, không oán thán.</p>
          <p style="margin-bottom:2px;">• Vay từ nguồn sạch, hợp pháp: ngân hàng, tổ chức tín dụng chính thống, lãi suất hợp lý — nếu vay chung, có sự đồng thuận rõ ràng của cả 2 bên (vd vợ chồng).</p>
          <p style="margin-bottom:8px;">• Có kế hoạch trả rõ ràng, nằm trong khả năng chi trả thật — không vay trong lúc hoảng loạn hay vì bị thúc ép.</p>
          <p style="margin-bottom:6px;"><b>Quả — điều thường thấy khi xử lý đúng cách:</b></p>
          <p style="margin-bottom:2px;">• Tâm lý bình an hơn hẳn — vì biết chính xác mình đang vay để làm gì và trả bằng cách nào.</p>
          <p style="margin-bottom:2px;">• Mỗi lần trả là 1 lần thực hành biết ơn (người/tổ chức đã tin tưởng cho mình vay đúng lúc cần), không phải gánh nặng phải né tránh.</p>
          <p>• Vì đối diện đúng cách ngay từ đầu, khoản nợ được xử lý đúng tiến độ, không rơi vào vòng xoáy nợ chồng nợ.</p>
        </div>
        <p>Một khoản nợ được tính là ${esc(GLOSSARY.no_xanh.term)} khi đủ CẢ 3 điều sau — thiếu 1 điều là rơi về ${esc(GLOSSARY.no_do.term)}:</p>
        <p>
          1. Vay từ nguồn chính thống (ngân hàng, tổ chức tín dụng hợp pháp) — không phải vay nóng/tín dụng đen.<br>
          2. Dùng để tạo giá trị/tài sản tăng trưởng thật (mua nhà, học tập, kinh doanh) — không phải tiêu xài mất giá ngay.<br>
          3. Có kế hoạch trả rõ ràng, nằm trong khả năng chi trả — không vay trong lúc hoảng loạn.
        </p>
        <div class="hint-box" style="margin-top:10px;">Vì sao cần phân biệt? Vì cách xử lý nên khác nhau: ${esc(GLOSSARY.no_do.term)} nên được dồn lực xử lý TRƯỚC TIÊN, bất kể lãi suất cao hay thấp — vì nó đang rút cạn bạn theo cách khác (rủi ro pháp lý, vòng xoáy nợ chồng nợ), không chỉ chuyện lãi suất. Sang <a href="#quan-ly-no" style="color:var(--accent);font-weight:600;">Quản Lý Nợ →</a> để tự đánh giá từng khoản nợ của bạn theo đúng 3 tiêu chí này.</div>
      `)}
      ${NUT_CHAN.map(n => detailsSection(n.title, `
        ${n.levels.map(([label,d])=>`<p><b>${esc(label)}</b> — ${esc(d)}</p>`).join('')}
        <div class="hint-box" style="margin-top:10px;">${esc(n.practice)}</div>
      `)).join('')}
      <div class="hint-box" style="margin:4px 0 12px;">Có 1 Nút Chặn nào ở trên cứ lặp đi lặp lại mãi dù bạn đã biết? Rất có thể đang có 1 niềm tin gốc từ nhỏ nuôi nó ở tầng sâu hơn — xem <a href="#tang-thuc" style="color:var(--accent);font-weight:600;">Hạt Giống Phước - Nghiệp →</a></div>
      ${detailsSection('🌪️ Vì sao mục tiêu hay bị chính mình phá hỏng?', `
        <p>Ngay sau khi viết ra 1 mục tiêu lớn (vd "tháng này tất toán 100 triệu"), phần lớn chúng ta đều có 1 phản ứng cảm xúc gần như ngay lập tức — đây gọi là <b>Tiếng Lòng</b>. Vấn đề là: nếu Tiếng Lòng toàn sự hoài nghi/sợ hãi, nó thường mạnh hơn chính mục tiêu, khiến ta dễ bỏ cuộc trước khi thử. 4 dạng Tiếng Lòng thường gặp nhất:</p>
        ${RESISTANCE_PATTERNS.map(p=>`<p><b>${esc(p.t)}</b> — ${esc(p.d)}</p>`).join('')}
        <div class="hint-box" style="margin-top:10px;">Nhận diện được Tiếng Lòng của mình KHÔNG có nghĩa mục tiêu sẽ thất bại — ngược lại, đó là bước đầu tiên để không bị nó điều khiển trong im lặng. Đây là lý do Mục Tiêu & Cam Kết luôn hỏi Tiếng Lòng ngay sau khi bạn đặt mục tiêu.</div>
        <p style="margin-top:10px;">Khi có rắc rối xảy đến ngay sau lúc đặt mục tiêu (xe hỏng, khách bùng kèo...) — đừng vội nghĩ "chắc mình không làm được". Đó thường chỉ là một bài kiểm tra xem quyết tâm của bạn có đủ vững không, không phải lời tiên tri về thất bại. Ghi lại nó ở Nhật Ký Rắc Rối thay vì để nó âm thầm làm bạn bỏ cuộc.</p>
      `)}
    </div>
  `;
}

function render(container, ctx){
  container.innerHTML = html();
}

window.Modules = window.Modules || {};
window.Modules['kien-thuc'] = { title:'Kiến Thức Nền Tảng', render };
})();
