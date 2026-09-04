// Bìa ebook (2026-09-04) — dùng lại ĐÚNG pipeline gpt-image-1 + resvg đã chạy thật cho ảnh bài
// Fanpage (xem api/_lib/image-gen.js) thay vì bảo người bán tự đi ChatGPT làm ảnh rồi tải lên. Khác
// image-gen.js ở khổ ảnh (dọc 1024x1536 kiểu bìa sách, không phải vuông 1024x1024 kiểu bài đăng) và
// cách đặt chữ (tiêu đề nằm trên khối scrim mờ gần đỉnh ảnh, không phải thanh chữ dưới đáy).
const sharp = require('sharp');
const { callOpenAiImage, rasterizeSvg, wrapText, escapeXml } = require('./image-gen');

const COVER_W = 1024;
const COVER_H = 1536;

// Mỗi mood preset gộp SẴN màu (accent/bg — áp dụng luôn cho card/box bên trong PDF, xem pdf-ebook.js)
// + mô tả không khí ảnh AI khớp đúng tông màu đó — tránh phải "dịch" 1 mã hex bất kỳ thành mô tả cho
// AI (không chính xác bằng preset tự thiết kế sẵn theo cặp màu+không khí).
const MOOD_PRESETS = {
  am_ap: {
    key: 'am_ap', label: 'Ấm áp & chiêm nghiệm', accent: '#8B6F3E', bg: '#F5F0E4',
    imagePrompt: (topic) => `Ảnh bìa sách phong cách biên tập cao cấp, khổ dọc: một hành trình hoặc con đường giữa thiên nhiên lúc bình minh, ánh sáng vàng ấm rực rỡ, sương mờ nhẹ, hoa sen hoặc cây cối, cảm giác an nhiên chiêm nghiệm, chủ đề: ${topic}. Tông màu vàng nâu ấm, nâu đất, kem sang trọng.`,
  },
  thien_nhien: {
    key: 'thien_nhien', label: 'Thiên nhiên & chữa lành', accent: '#4E7A5E', bg: '#EEF3EB',
    imagePrompt: (topic) => `Ảnh bìa sách phong cách biên tập cao cấp, khổ dọc: khu rừng hoặc khu vườn xanh mát, ánh nắng xuyên qua tán lá, cảm giác an lành chữa lành nhẹ nhàng, chủ đề: ${topic}. Tông màu xanh lá cây tươi mát, xanh sage, trắng kem.`,
  },
  sang_trong: {
    key: 'sang_trong', label: 'Sang trọng & tối giản', accent: '#C9A24B', bg: '#1A1D23',
    imagePrompt: (topic) => `Ảnh bìa sách phong cách biên tập cao cấp, khổ dọc: không gian tối giản studio ánh sáng đẹp, kết cấu vải/đá/kim loại sang trọng, ánh sáng vàng gold điểm nhấn trên nền tối, chủ đề: ${topic}. Tông màu đen/xanh navy đậm phối vàng gold.`,
  },
  nang_luong: {
    key: 'nang_luong', label: 'Năng động & nhiệt huyết', accent: '#E0632B', bg: '#FFF3EA',
    imagePrompt: (topic) => `Ảnh bìa sách phong cách biên tập cao cấp, khổ dọc: khung cảnh năng động tràn đầy năng lượng, ánh sáng rực rỡ, chuyển động mạnh mẽ, cảm giác truyền cảm hứng hành động, chủ đề: ${topic}. Tông màu cam/san hô ấm, vàng cam rực rỡ.`,
  },
  toi_gian: {
    key: 'toi_gian', label: 'Tối giản & hiện đại', accent: '#5B6B7A', bg: '#F4F5F6',
    imagePrompt: (topic) => `Ảnh bìa sách phong cách biên tập tối giản hiện đại, khổ dọc: hình khối trừu tượng mềm mại, gradient nhẹ, không gian âm nhiều, cảm giác tinh tế gọn gàng, chủ đề: ${topic}. Tông màu xám xanh trung tính, trắng, rất ít màu.`,
  },
};

function listMoodPresets() {
  return Object.values(MOOD_PRESETS).map(({ key, label, accent, bg }) => ({ key, label, accent, bg }));
}

function coverOverlaySvg(title, subtitle) {
  const lines = wrapText(title, 15, 4);
  const fontSize = 64;
  const lineHeight = 76;
  const subtitleGap = subtitle ? 56 : 0;
  const blockTop = 130;
  const textBlockHeight = lines.length * lineHeight;
  const scrimBottom = blockTop + textBlockHeight + subtitleGap + 60;
  const tspans = lines
    .map((line, i) => `<tspan x="${COVER_W / 2}" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`)
    .join('');
  return `<svg width="${COVER_W}" height="${COVER_H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="black" stop-opacity="0.6"/>
        <stop offset="70%" stop-color="black" stop-opacity="0.18"/>
        <stop offset="100%" stop-color="black" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="${COVER_W}" height="${scrimBottom}" fill="url(#scrim)" />
    <text xml:space="preserve" x="${COVER_W / 2}" y="${blockTop + fontSize}" text-anchor="middle" font-family="Playfair Display" font-size="${fontSize}" font-weight="800" fill="white">${tspans}</text>
    ${subtitle ? `<text x="${COVER_W / 2}" y="${blockTop + textBlockHeight + subtitleGap + 14}" text-anchor="middle" font-family="Be Vietnam Pro" font-size="28" fill="#F0EBD8">${escapeXml(subtitle)}</text>` : ''}
  </svg>`;
}

// generateEbookCover: sinh 1 ảnh bìa hoàn chỉnh (nền AI + chữ đè) — Buffer JPEG khổ 1024x1536.
// topic: chuỗi mô tả chủ đề sản phẩm (vd "${ten_san_pham} — ${doi_tuong}") đưa vào prompt ảnh.
async function generateEbookCover({ apiKey, moodPresetKey, topic, title, subtitle }) {
  const preset = MOOD_PRESETS[moodPresetKey] || MOOD_PRESETS.am_ap;
  const prompt = `${preset.imagePrompt(topic)} TUYỆT ĐỐI KHÔNG có chữ, không watermark, không logo, không ký tự nào trong ảnh.`;
  const bgBuffer = await callOpenAiImage(apiKey, prompt, `${COVER_W}x${COVER_H}`);
  const overlayPng = rasterizeSvg(coverOverlaySvg(title, subtitle));
  return sharp(bgBuffer)
    .resize(COVER_W, COVER_H, { fit: 'cover' })
    .composite([{ input: overlayPng, top: 0, left: 0 }])
    .jpeg({ quality: 82 })
    .toBuffer();
}

module.exports = { MOOD_PRESETS, listMoodPresets, generateEbookCover, COVER_W, COVER_H };
