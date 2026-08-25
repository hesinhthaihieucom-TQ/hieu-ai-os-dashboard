(function(){
// Chiến lược marketing theo giai đoạn cho Xây Nhân Hiệu (2026-08-26, theo yêu cầu chị Quỳnh: có
// FB cá nhân + 3 cộng đồng "Tâm Thức Thịnh Vượng" (ít nhất 1 trên FB) + 1 cộng đồng "app Xây Nhân
// Hiệu" trên Zalo, chưa biết nên đẩy app này thế nào cho hiệu quả nhất theo từng giai đoạn).
//
// Logic chọn thứ tự giai đoạn: đẩy vào kênh ĐÃ SẴN NIỀM TIN + ĐÚNG ĐỐI TƯỢNG trước (cộng đồng Zalo
// đã lập riêng cho app + cộng đồng Tâm Thức Thịnh Vượng cùng ngách) để có review/case thật SỚM —
// review thật (mục "Đánh giá app" mới làm) là thứ thuyết phục nhất khi đẩy ra kênh lạnh/rộng hơn
// (FB cá nhân) ở giai đoạn sau. Nội dung TĨNH (không lưu tiến độ) — chỉ là tài liệu tham khảo, chị
// Quỳnh tự đọc và làm theo, không cần theo dõi hoàn thành như checklist Trang chủ.
const PHASES = [
  {
    title: 'Giai đoạn 1 — Gieo hạt ở kênh đã sẵn niềm tin',
    when: 'Tuần 1-2',
    channels: ['Cộng đồng Zalo "app Xây Nhân Hiệu"', 'Cộng đồng Tâm Thức Thịnh Vượng trên Facebook'],
    goal: 'Có người dùng thật đầu tiên + review thật đầu tiên (mục "Đánh giá app" mới làm) — chưa cần đông, cần ĐÚNG người và ĐÚNG feedback để tinh chỉnh trước khi đẩy rộng.',
    actions: [
      'Đăng bài kể câu chuyện vì sao làm app này (vấn đề gì đang giải quyết cho người xây kênh) — không chào bán ngay, mục tiêu là gây tò mò.',
      'Mở 1 buổi Zoom/Livestream hướng dẫn dùng app trực tiếp trong 2 cộng đồng này — đã có kinh nghiệm làm buổi 24-26/8, lặp lại đều đặn.',
      'Chủ động nhắn riêng 5-10 người tích cực nhất trong cộng đồng, mời dùng thử + xin phản hồi thật (không chỉ chờ họ tự vào).',
      'Sau khi có 3-5 người dùng thật, chủ động xin họ viết đánh giá (mục Đánh giá app đã có popup tự động + tặng 20 lượt AI để khuyến khích).',
    ],
  },
  {
    title: 'Giai đoạn 2 — Mở rộng trong hệ sinh thái Tâm Thức Thịnh Vượng',
    when: 'Tuần 3-4',
    channels: ['2 cộng đồng Tâm Thức Thịnh Vượng còn lại'],
    goal: 'Dùng review/case thật từ Giai đoạn 1 làm bằng chứng — cộng đồng cùng ngách nên tin tưởng nhanh hơn kênh lạ.',
    actions: [
      'Đăng lại các đánh giá thật đã có (chụp màn hình mục Đánh giá app hoặc trích dẫn trực tiếp) — bằng chứng xã hội quan trọng hơn mọi lời quảng cáo.',
      'Nhắc lại chương trình giới thiệu (15% cho người mới + lượt AI cho người giới thiệu) — khuyến khích người đã dùng ở Giai đoạn 1 chủ động mời bạn trong các cộng đồng này.',
      'Lặp lại Zoom hướng dẫn, mời cả người cũ (đã dùng) tham gia chia sẻ trải nghiệm thật ngay trong buổi — thuyết phục hơn chính chị Quỳnh nói.',
    ],
  },
  {
    title: 'Giai đoạn 3 — Ra kênh rộng (Facebook cá nhân)',
    when: 'Tuần 5 trở đi',
    channels: ['Trang Facebook cá nhân'],
    goal: 'Kênh lạnh hơn, đối tượng đa dạng hơn — CẦN bằng chứng mạnh (review, số liệu) trước khi đẩy, không mở màn bằng bán hàng trực tiếp.',
    actions: [
      'Đăng content GIÁ TRỊ trước (mẹo xây kênh, ví dụ thật từ chính app tạo ra) — dẫn về app một cách tự nhiên ở cuối bài, không phải bài quảng cáo trần trụi.',
      'Dùng lại các đánh giá/case thật đã tích luỹ được — làm 1-2 bài dạng "trước và sau" nếu có người dùng đồng ý chia sẻ.',
      'Thử nghiệm dùng thử 3 ngày miễn phí + ưu đãi mua sớm (mua 6 tháng tặng 1, mua 12 tháng tặng 2 nếu mua trong 3 ngày đầu) làm lời mời hành động rõ ràng, có hạn — tạo cảm giác cần quyết định sớm.',
    ],
  },
  {
    title: 'Giai đoạn 4 — Duy trì & để referral tự chạy',
    when: 'Liên tục sau đó',
    channels: ['Cả 5 kênh'],
    goal: 'Khi đã có 1 lượng người dùng thật ổn định, chương trình giới thiệu (đặc biệt mốc Partner từ 5 người trở lên = hoa hồng tiền mặt) nên trở thành nguồn tăng trưởng CHÍNH, tốn ít công sức đăng bài hơn.',
    actions: [
      'Định kỳ (2-4 tuần/lần) nhắc lại chương trình giới thiệu ở mọi kênh — người dùng dễ quên nếu chỉ nói 1 lần.',
      'Công khai vinh danh (xin phép trước) ai đạt mốc Partner — vừa cảm ơn, vừa làm mẫu cho người khác thấy khả thi.',
      'Theo dõi mục Tài chính ở Quản trị để biết kênh/thời điểm nào ra doanh thu tốt nhất — dồn công sức đúng chỗ đang hiệu quả thay vì đều tay cho cả 5 kênh.',
    ],
  },
];

function render(container, ctx){
  if(!ctx.profile || ctx.profile.role !== 'admin'){
    container.innerHTML = `<div class="page-head"><h1>Không có quyền truy cập</h1><p>Mục này chỉ dành cho quản trị viên.</p></div>`;
    return;
  }
  container.innerHTML = `
    <div class="page-head"><h1>Marketing &amp; Tăng trưởng</h1><p>Chiến lược đẩy app theo từng giai đoạn, dựa trên các kênh hiện có — làm theo thứ tự để tận dụng bằng chứng thật (review/case) tích luỹ được từ giai đoạn trước cho giai đoạn sau.</p></div>

    <div class="hint-box" style="margin-bottom:20px;">
      <b>5 kênh hiện có:</b> Facebook cá nhân · 3 cộng đồng Tâm Thức Thịnh Vượng (ít nhất 1 trên Facebook) · Cộng đồng "app Xây Nhân Hiệu" trên Zalo.<br><br>
      <b>Nguyên tắc chung:</b> đẩy vào kênh ĐÃ SẴN NIỀM TIN trước để có bằng chứng thật (review, case) — rồi mới dùng bằng chứng đó thuyết phục kênh rộng/lạ hơn. Đừng ra Facebook cá nhân (kênh lạnh nhất) trước khi có ít nhất vài đánh giá thật.
    </div>

    ${PHASES.map((ph,i)=>`
      <div class="section">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:6px;">
          <h3 style="margin:0;">${esc(ph.title)}</h3>
          <span style="font-family:'IBM Plex Mono',monospace;font-size:11px;padding:3px 10px;border-radius:999px;background:var(--accent-soft);color:var(--accent);white-space:nowrap;">${esc(ph.when)}</span>
        </div>
        <div style="font-size:12.5px;color:var(--ink-soft);margin-bottom:10px;"><b>Kênh:</b> ${ph.channels.map(esc).join(' · ')}</div>
        <div class="body" style="margin-bottom:12px;"><b>Mục tiêu:</b> ${esc(ph.goal)}</div>
        <div style="font-size:10.5px;font-weight:700;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px;">Việc cần làm</div>
        <ul style="margin:0;padding-left:20px;display:flex;flex-direction:column;gap:6px;">
          ${ph.actions.map(a=>`<li style="font-size:13.5px;line-height:1.6;">${esc(a)}</li>`).join('')}
        </ul>
      </div>
    `).join('')}
  `;
}
window.Modules = window.Modules || {};
window.Modules['quan-tri-marketing'] = { title:'Marketing', render };
})();
