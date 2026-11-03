/* Hình minh họa dạng sơ đồ (SVG tự vẽ). Không phải ảnh chụp màn hình thật,
   vì giao diện Facebook/TikTok/CapCut hay đổi vị trí nút. */
(function () {
  const W = 640;
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const R = (x, y, w, h, c, rx = 10) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" class="${c}"/>`;
  const T = (x, y, s, c = 's-tx', sz = 16, a = 'start', wt = 500) =>
    `<text x="${x}" y="${y}" class="${c}" font-size="${sz}" text-anchor="${a}" font-weight="${wt}">${esc(s)}</text>`;
  const C = (x, y, r, c) => `<circle cx="${x}" cy="${y}" r="${r}" class="${c}"/>`;
  const A = (x1, y1, x2, y2) => `<path d="M${x1} ${y1} L${x2} ${y2}" class="s-arrow"/>`;
  const svg = (h, body) => `<svg viewBox="0 0 ${W} ${h}" role="img" xmlns="http://www.w3.org/2000/svg">
    <defs><marker id="ah" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="M1 1 L8 4.5 L1 8" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--muted)"/></marker></defs>${body}</svg>`;

  const I = {};

  // Lộ trình 3 bước
  I.roadmap = () => svg(170,
    [['1', 'Chọn thị trường', 'và nội dung kênh', 20], ['2', 'Xây fanpage', 'Facebook + TikTok', 235], ['3', 'Lên sóng', 'đăng và đẩy khách', 450]]
      .map(([n, a, b, x]) => R(x, 30, 170, 110, 's-fill', 16) + C(x + 30, 58, 16, 's-ac') + T(x + 30, 64, n, 's-wh', 17, 'middle', 700) +
        T(x + 54, 64, a, 's-tx', 15, 'start', 650) + T(x + 14, 92, b, 's-mu', 13.5) +
        T(x + 14, 122, n === '1' ? '2 mục' : n === '2' ? '3 mục' : '4 mục', 's-mu', 14)).join('') +
    A(192, 85, 232, 85) + A(407, 85, 447, 85));

  // 1.1 chọn ngách: 3 nhóm khách, chấm điểm
  I.niche = () => svg(230,
    T(20, 30, 'Chấm mỗi nhóm khách từ 1–5 điểm, chọn nhóm cao nhất', 's-tx', 16, 'start', 650) +
    [['Nhóm A', '4', '3', '5', 20], ['Nhóm B', '5', '4', '3', 225], ['Nhóm C', '2', '3', '2', 430]].map(([n, a, b, c, x], i) => {
      const tot = +a + +b + +c;
      return R(x, 48, 190, 160, i === 1 ? 's-acs' : 's-fill', 14) + T(x + 14, 76, n, 's-tx', 17, 'start', 700) +
        T(x + 14, 102, 'Nỗi đau rõ: ' + a, 's-mu', 14.5) + T(x + 14, 124, 'Có tiền trả: ' + b, 's-mu', 14.5) +
        T(x + 14, 146, 'Mình hiểu họ: ' + c, 's-mu', 14.5) + T(x + 14, 190, 'Tổng: ' + tot + (i === 1 ? '  ✓ chọn' : ''), i === 1 ? 's-tx' : 's-mu', 17, 'start', 700);
    }).join(''));

  // 1.2 gói kịch bản
  I.package = () => svg(200,
    R(20, 30, 600, 40, 's-fill', 10) + T(320, 56, 'GÓI 28 NGÀY = 84 KỊCH BẢN', 's-tx', 17, 'middle', 700) +
    R(20, 86, 200, 90, 's-acs', 14) + T(120, 120, '28', 's-tx', 34, 'middle', 700) + T(120, 148, 'Cho đi (kiến thức)', 's-tx', 15, 'middle') +
    R(240, 86, 380, 90, 's-gos', 14) + T(430, 120, '56', 's-tx', 34, 'middle', 700) + T(430, 148, 'Đẩy (kéo người xem hành động)', 's-tx', 15, 'middle') +
    T(120, 192, '1 video/ngày', 's-mu', 13.5, 'middle') + T(430, 192, '2 video/ngày', 's-mu', 13.5, 'middle'));

  // 2.1 mô hình fanpage Facebook
  I.fbpage = () => svg(380,
    R(120, 14, 400, 352, 's-fill', 18) +
    R(134, 28, 372, 100, 's-acs', 10) + T(320, 72, 'ẢNH BÌA', 's-tx', 16, 'middle', 700) + T(320, 96, '1 câu lời hứa + cách liên hệ', 's-mu', 13.5, 'middle') +
    C(190, 138, 42, 's-go') + T(190, 134, 'ẢNH', 's-tx', 13, 'middle', 700) + T(190, 150, 'ĐẠI DIỆN', 's-tx', 13, 'middle', 700) +
    T(246, 170, 'Tên kênh (2–5 từ)', 's-tx', 17, 'start', 700) +
    T(150, 214, 'Giới thiệu: dành cho ai – giúp được gì –', 's-tx', 14.5) + T(150, 234, 'liên hệ ở đâu (2–3 dòng)', 's-tx', 14.5) +
    R(150, 256, 150, 40, 's-ac', 10) + T(225, 282, 'Nhắn tin', 's-wh', 15, 'middle') +
    R(312, 256, 150, 40, 's-fill', 10) + T(387, 282, 'Theo dõi', 's-tx', 15, 'middle') +
    T(150, 328, 'Thông tin liên hệ: Zalo, email', 's-mu', 14) +
    T(20, 100, '① Ảnh bìa', 's-mu', 14) + T(20, 150, '② Ảnh đại diện', 's-mu', 14) + T(20, 175, '    (mặt thật)', 's-mu', 14) +
    T(20, 282, '③ Nút hành động', 's-mu', 14) + T(540, 214, '④ Giới thiệu', 's-mu', 14));

  // 2.1 avatar + bìa quy chuẩn
  I.sizes = () => svg(200,
    R(20, 30, 150, 150, 's-acs', 75) + T(95, 100, 'Avatar', 's-tx', 17, 'middle', 700) + T(95, 124, 'vuông, ≥720px', 's-mu', 13.5, 'middle') + T(95, 144, 'mặt thật, sáng rõ', 's-mu', 13.5, 'middle') +
    R(200, 40, 420, 128, 's-gos', 12) + R(300, 40, 220, 128, 's-fill', 6) +
    T(410, 96, 'Ảnh bìa (ngang)', 's-tx', 17, 'middle', 700) + T(410, 120, 'chữ quan trọng nằm ở GIỮA', 's-tx', 14, 'middle') +
    T(410, 190, '~1640×624px · tránh sát mép', 's-mu', 13.5, 'middle'));

  // 2.2 CapCut timeline
  I.capcut = () => svg(300,
    R(20, 14, 600, 150, 's-fill', 14) +
    R(250, 26, 90, 126, 's-bg', 8) + R(250, 26, 90, 126, 's-ln', 8) + T(295, 80, '9:16', 's-tx', 20, 'middle', 700) + T(295, 104, 'video dọc', 's-mu', 13, 'middle') +
    T(110, 80, 'Xem trước', 's-mu', 14, 'middle') + T(520, 80, 'Công cụ:', 's-mu', 14, 'middle') +
    T(520, 102, 'Chia tách · Xóa', 's-mu', 13, 'middle') +
    R(20, 178, 600, 108, 's-fill', 14) +
    T(32, 200, 'Chữ', 's-mu', 13) + R(70, 186, 170, 20, 's-go', 6) + R(250, 186, 120, 20, 's-go', 6) + R(380, 186, 200, 20, 's-go', 6) +
    T(32, 228, 'Video', 's-mu', 13) + R(70, 214, 120, 24, 's-ac', 6) + R(194, 214, 90, 24, 's-ac', 6) + R(288, 214, 160, 24, 's-ac', 6) + R(452, 214, 128, 24, 's-ac', 6) +
    T(32, 256, 'Nhạc', 's-mu', 13) + R(70, 244, 510, 20, 's-acs', 6) +
    '<path d="M194 180 V270" stroke="#B8432F" stroke-width="3"/>' + T(194, 294, '↑ cắt ở đây (Chia tách)', 's-mu', 13, 'middle'));

  // 2.2 các bước dựng 10 bước
  I.edit10 = () => {
    const s = ['Nhập clip', 'Chọn 9:16', 'Cắt đầu cuối', 'Bỏ khoảng lặng', 'Phụ đề tự động', 'Tiêu đề lớn', 'Nhạc nền', 'Hình minh họa', 'Xem lại', 'Xuất 1080p'];
    return svg(200, s.map((t, i) => {
      const x = 20 + (i % 5) * 120, y = i < 5 ? 24 : 108;
      return R(x, y, 108, 68, i === 9 ? 's-acs' : 's-fill', 12) + C(x + 20, y + 22, 13, 's-ac') + T(x + 20, y + 27, i + 1, 's-wh', 14, 'middle', 700) + T(x + 54, y + 52, t, 's-tx', 12.5, 'middle', 600);
    }).join(''));
  };

  // 2.2 cách quay
  I.shoot = () => svg(260,
    R(20, 20, 600, 220, 's-fill', 16) +
    R(70, 90, 60, 100, 's-gos', 10) + T(100, 205, 'Cửa sổ / đèn', 's-mu', 13, 'middle') + T(100, 82, 'ÁNH SÁNG', 's-tx', 13, 'middle', 700) +
    C(300, 120, 28, 's-go') + R(272, 148, 56, 60, 's-acs', 10) + T(300, 232, 'Người nói', 's-mu', 13, 'middle') +
    R(480, 92, 36, 60, 's-ac', 6) + T(498, 124, '▮', 's-wh', 14, 'middle') + '<path d="M498 152 L478 205 M498 152 L498 205 M498 152 L518 205" stroke="var(--muted)" stroke-width="3" fill="none"/>' +
    T(498, 82, 'ĐIỆN THOẠI', 's-tx', 13, 'middle', 700) + T(498, 224, 'Tripod, ngang mắt', 's-mu', 13, 'middle') +
    A(135, 125, 262, 125) + A(470, 122, 340, 122) + T(300, 52, 'Quay dọc · nhìn thẳng ống kính · nơi yên tĩnh', 's-tx', 14.5, 'middle', 600));

  // 2.3 công thức 3 video/ngày
  I.daily3 = () => svg(220,
    [['Video 1', 'CHO ĐI', 'Kiến thức, không bán', 'Giờ: TỐI 19:30–21:00', 's-acs'], ['Video 2', 'ĐẨY', 'Kéo người xem hành động', 'Giờ: linh hoạt (sáng/trưa)', 's-gos'], ['Video 3', 'ĐẨY', 'Chủ đề khác', 'Giờ: linh hoạt (chiều)', 's-gos']]
      .map(([a, b, c, d, cl], i) => { const x = 20 + i * 205; return R(x, 20, 190, 180, cl, 16) + T(x + 95, 52, a, 's-mu', 15, 'middle') + T(x + 95, 90, b, 's-tx', 28, 'middle', 700) + T(x + 95, 124, c, 's-tx', 14, 'middle') + T(x + 95, 160, d, 's-mu', 13.5, 'middle'); }).join(''));

  // 2.3 lịch 28 ngày
  I.cal28 = () => {
    let b = '';
    const ox = 60;
    ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].forEach((d, i) => b += T(ox + 42 + i * 78, 24, d, 's-mu', 14, 'middle', 650));
    for (let w = 0; w < 4; w++) {
      b += T(10, 64 + w * 54, 'Tuần ' + (w + 1), 's-mu', 12.5, 'start');
      for (let d = 0; d < 7; d++) b += R(ox + 8 + d * 78, 36 + w * 54, 68, 46, 's-fill', 8) + C(ox + 22 + d * 78, 59 + w * 54, 6, 's-ac') + C(ox + 42 + d * 78, 59 + w * 54, 6, 's-go') + C(ox + 62 + d * 78, 59 + w * 54, 6, 's-go');
    }
    return svg(270, b + C(150, 258, 6, 's-ac') + T(162, 263, 'Cho đi (tối)', 's-mu', 13) + C(290, 258, 6, 's-go') + T(302, 263, 'Đẩy (linh hoạt)', 's-mu', 13) + T(480, 263, '28 ngày × 3 = 84 video', 's-tx', 13.5, 'start', 650));
  };

  // 3.1 kho dự trữ
  I.stock = () => svg(200,
    R(20, 30, 600, 70, 's-fill', 14) + T(36, 58, 'Hôm nay', 's-tx', 15, 'start', 650) +
    [0, 1, 2].map(i => R(150 + i * 150, 42, 138, 46, i === 0 ? 's-acs' : 's-gos', 10) + T(219 + i * 150, 70, ['Đăng hôm nay', 'Ngày mai', 'Ngày kia'][i], 's-tx', 14, 'middle', 600)).join('') +
    T(36, 124, 'Tối thiểu 9 video (3 ngày × 3) trước khi đăng video đầu tiên', 's-mu', 13.5) +
    T(36, 154, 'Mỗi ngày quay thêm 3–6 video', 's-tx', 16, 'start', 650) +
    A(300, 164, 300, 184) + T(318, 182, 'luôn dư ít nhất 1–2 ngày để không đứt lịch', 's-mu', 14));

  // 3.3 sau khi đăng
  I.postflow = () => svg(190,
    '<path d="M50 90 H590" stroke="var(--line)" stroke-width="4"/>' +
    [['0', 'Bấm đăng', 50], ['5 phút', 'Ghim comment', 190], ['30 phút', 'Trả lời mọi comment', 360], ['Trong ngày', 'Gửi quà / tin nhắn', 540]]
      .map(([a, b, x], i) => C(x, 90, 15, i < 2 ? 's-ac' : 's-go') + T(x, 60, a, 's-tx', 15, 'middle', 700) + T(x, 132, b, 's-mu', 13.5, 'middle')).join(''));

  // 3.3 seeding đúng cách
  I.seeding = () => svg(230,
    R(20, 20, 280, 190, 's-acs', 16) + T(160, 48, 'NÊN', 's-tx', 17, 'middle', 700) +
    T(36, 78, '• Tài khoản thật của team', 's-tx', 14.5) + T(36, 102, '• Người thật đồng ý tham gia', 's-tx', 14.5) +
    T(36, 126, '• Viết bằng lời của mình', 's-tx', 14.5) + T(36, 150, '• Comment cách nhau vài phút', 's-tx', 14.5) + T(36, 174, '• Trả lời người xem thật', 's-tx', 14.5) +
    R(340, 20, 280, 190, 's-wa', 16) + T(480, 48, 'KHÔNG', 's-tx', 17, 'middle', 700) +
    T(356, 78, '• Mua tài khoản ảo', 's-tx', 14.5) + T(356, 102, '• Phần mềm comment tự động', 's-tx', 14.5) +
    T(356, 126, '• Copy y nguyên 1 câu', 's-tx', 14.5) + T(356, 150, '• Giả làm "khách đã khỏi bệnh"', 's-tx', 14.5) + T(356, 174, '• Hứa kết quả trong comment', 's-tx', 14.5));

  // Phễu
  I.funnel = () => svg(300,
    [['Xem video', 560, 's-fill'], ['Comment từ khóa', 480, 's-gos'], ['Nhận tài liệu qua tin nhắn', 400, 's-gos'], ['Vào nhóm Zalo', 320, 's-acs'], ['Dự Zoom / nhận tư vấn', 240, 's-acs']]
      .map(([t, w, c], i) => R(320 - w / 2, 14 + i * 56, w, 46, c, 12) + T(320, 43 + i * 56, t, 's-tx', 16, 'middle', 650)).join(''));

  // Zoom 60 phút
  I.zoom = () => {
    const seg = [['0–5', 'Chào', 40, 's-fill'], ['5–30', 'Chia sẻ 1 chủ đề', 250, 's-acs'], ['30–40', 'Hỏi đáp', 100, 's-gos'], ['40–50', 'Lời mời', 100, 's-fill'], ['50–60', 'Chốt', 100, 's-fill']];
    let x = 20, b = T(20, 30, 'Một buổi Zoom 60 phút', 's-tx', 16, 'start', 650);
    seg.forEach(([a, t, w, c]) => { b += R(x, 50, w - 4, 70, c, 8) + T(x + (w - 4) / 2, 82, t, 's-tx', w < 60 ? 11 : 13.5, 'middle', 600) + T(x + (w - 4) / 2, 140, a + "'", 's-mu', 12.5, 'middle'); x += w + 0; });
    return svg(170, b.replace(/s-fill/g, 's-fill'));
  };

  // Cộng đồng Zalo
  I.community = () => svg(260,
    R(200, 12, 240, 236, 's-fill', 22) + R(200, 12, 240, 44, 's-ac', 22) + T(320, 40, 'Chị em U40 sống khỏe', 's-wh', 15, 'middle') +
    R(214, 66, 200, 54, 's-gos', 10) + T(224, 86, '📌 Nội quy nhóm', 's-tx', 13.5, 'start', 650) + T(224, 106, 'Tôn trọng · không spam', 's-mu', 12.5) +
    R(226, 130, 200, 40, 's-bg', 10) + R(226, 130, 200, 40, 's-ln', 10) + T(236, 155, 'Mẹo nhỏ trong tuần', 's-tx', 13.5) +
    R(214, 180, 190, 40, 's-acs', 10) + T(224, 205, 'Câu hỏi cho thành viên', 's-tx', 13.5) +
    T(20, 60, 'T2: mẹo nhỏ', 's-mu', 14) + T(20, 100, 'T4: câu hỏi', 's-mu', 14) + T(20, 140, 'T6: tài liệu mới', 's-mu', 14) + T(20, 180, 'CN: tổng kết + Zoom', 's-mu', 14) +
    T(470, 120, '4 bài có ích', 's-tx', 14, 'start', 650) + T(470, 142, ': 1 bài giới thiệu', 's-tx', 14));

  window.ILLUS = I;
})();
