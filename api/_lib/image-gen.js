// Tự tạo/ghép ảnh cho bài auto-đăng Fanpage (2026-08-27, theo yêu cầu chị Quỳnh) — module Tạo Ảnh
// Thương Hiệu (nhan-hieu/js/tao-anh.js) chạy hoàn toàn bằng Canvas 2D trong trình duyệt (đo chữ bằng
// ctx.measureText), không gọi API nào — cron chạy nền không có Canvas/DOM nên không import thẳng
// file đó được, phải viết lại bằng SVG. Thứ tự ưu tiên nguồn ảnh khi đăng (xem auto-publish-fb.js):
// (1) posts.image_data có sẵn (case study đã ghép — xem compositeCaseStudyImage).
// (2) renderPersonalTemplateImage: bài KHÔNG phải trục "Tâm linh" — dùng 1 ảnh cá nhân thật (bảng
//     personal_photos, chị tự tải lên ở Kho Content), đè 1 trong 4 "Bố cục chữ" của Tạo Ảnh Thương
//     Hiệu lên, CHỌN NGẪU NHIÊN mỗi lần đăng (2026-08-29, theo yêu cầu chị Quỳnh — không muốn AI tự vẽ
//     người lạ nữa cho bài thường).
// (3) Bài trục "Tâm linh" — generateSpiritualBackground() cho AI vẽ 1 ảnh nền tâm linh (hoa sen/ánh
//     sáng/thiền định, theo đúng tinh thần ảnh mẫu chị gửi), rồi VẪN đi qua renderPersonalTemplateImage
//     để đè chữ đúng 1 trong 4 mẫu — ảnh cá nhân của chị không hợp bài tâm linh nên tách nhánh riêng.
// (4) generatePostImage: lưới an toàn cuối cùng — AI tự vẽ 1 ảnh nền chung chung KHÔNG chữ, chỉ dùng
//     khi chị CHƯA tải ảnh cá nhân nào lên (personal_photos rỗng) và bài không phải trục Tâm linh.
//
// Chữ luôn được ĐÈ THẬT lên ảnh (không để AI tự vẽ chữ — chữ tiếng Việt AI vẽ trực tiếp thường lỗi
// dấu/sai font, đây cũng là lý do luôn dặn AI "TUYỆT ĐỐI KHÔNG có chữ" ở mọi prompt). Bug "chữ ra ô
// vuông/mất dấu" (2026-08-29) là do server không có sẵn font nào hỗ trợ tiếng Việt — sharp dùng
// librsvg để vẽ SVG, và librsvg KHÔNG hỗ trợ nhúng font qua @font-face (đã tự kiểm chứng, không phải
// suy đoán) nên không thể nhúng font kiểu web thông thường. Thay vào đó dùng @resvg/resvg-js (renderer
// SVG khác, hỗ trợ nạp thẳng file font thật qua fontFiles) để vẽ riêng lớp CHỮ ra PNG trong suốt, rồi
// mới ghép PNG đó lên ảnh nền bằng sharp như bình thường — sharp vẫn dùng cho mọi việc còn lại (resize,
// ghép ảnh, mask không chữ, encode JPEG) vì không có vấn đề font gì ở các bước đó.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { Resvg } = require('@resvg/resvg-js');

const IMAGE_SIZE = 1024;

const FONT_DIR = path.join(__dirname, 'fonts');
// Nạp font TRỰC TIẾP từ file gốc (TTF thật lấy từ kho google/fonts, không phải bản .woff2 cắt nhỏ
// theo subset của Google Fonts CDN — file gốc có ĐỦ mọi glyph, kể cả tiếng Việt, trong 1 file duy
// nhất). resvg đọc font-family theo đúng tên THẬT lưu trong file (vd "Playfair Display"), không phải
// tên tự đặt như CSS @font-face — khai báo font-family trong SVG bên dưới phải khớp đúng tên gốc.
const FONT_FILES = [
  path.join(FONT_DIR, 'PlayfairDisplay-Variable.ttf'),
  path.join(FONT_DIR, 'Oswald-Variable.ttf'),
  path.join(FONT_DIR, 'BeVietnamPro-Bold.ttf'),
  path.join(FONT_DIR, 'BeVietnamPro-MediumItalic.ttf'),
];

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Vẽ 1 chuỗi SVG (chỉ chứa chữ + hình trang trí, không có ảnh nền) ra PNG có nền trong suốt, dùng
// font thật nạp từ FONT_FILES — dùng chung cho mọi chỗ cần chữ trong file này.
function rasterizeSvg(svgString) {
  const resvg = new Resvg(svgString, { font: { loadSystemFonts: false, fontFiles: FONT_FILES } });
  return resvg.render().asPng();
}

// Word-wrap thô theo số ký tự/dòng — đủ dùng cho tiêu đề ngắn, không cần đo độ rộng chữ thật chính
// xác (muốn chính xác tuyệt đối phải đo font, không đáng công cho 1 khối text cố định kiểu này).
function wrapText(text, maxCharsPerLine, maxLines) {
  const words = String(text || '').trim().split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > maxCharsPerLine && cur) { lines.push(cur); cur = w; }
    else cur = next;
    if (lines.length >= maxLines) break;
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  return lines;
}

async function callOpenAiImage(apiKey, prompt) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90000);
  let resp;
  try {
    resp = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'gpt-image-1', prompt, size: `${IMAGE_SIZE}x${IMAGE_SIZE}`, n: 1 }),
      signal: controller.signal,
    });
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('OpenAI tạo ảnh quá lâu (quá 90 giây).');
    throw e;
  } finally {
    clearTimeout(timer);
  }
  if (!resp.ok) throw new Error(`OpenAI API lỗi (${resp.status}): ${await resp.text()}`);
  const data = await resp.json();
  const b64 = data.data && data.data[0] && data.data[0].b64_json;
  if (!b64) throw new Error('OpenAI không trả về ảnh.');
  return Buffer.from(b64, 'base64');
}

function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const ACCENT_COLOR = '#ffd60a'; // vàng nhấn số liệu/từ khoá quan trọng trong tiêu đề (theo yêu cầu chị Quỳnh 2026-08-28)

// Tách 1 dòng chữ thành các đoạn — đoạn nào chứa số (kể cả "%", "200%", "3 tháng"...) tô vàng, còn
// lại giữ trắng — số liệu/kết quả là phần chị Quỳnh muốn nhấn mạnh nhất trong tiêu đề case study.
function splitHighlight(line) {
  const re = /\d[\d.,]*\s?%?/g;
  const segments = [];
  let last = 0;
  let m;
  while ((m = re.exec(line))) {
    if (m.index > last) segments.push({ text: line.slice(last, m.index), accent: false });
    segments.push({ text: m[0], accent: true });
    last = m.index + m[0].length;
  }
  if (last < line.length) segments.push({ text: line.slice(last), accent: false });
  return segments.length ? segments : [{ text: line, accent: false }];
}

function titleOverlaySvg(title) {
  const lines = wrapText(title, 24, 4);
  const fontSize = 46;
  const lineHeight = 58;
  const paddingBottom = 56;
  const boxHeight = lines.length * lineHeight + paddingBottom;
  const textTop = IMAGE_SIZE - boxHeight + lineHeight - 14;
  const tspans = lines
    .map((line, i) => splitHighlight(line)
      .map((seg, j) => {
        const posAttrs = j === 0 ? ` x="56" dy="${i === 0 ? 0 : lineHeight}"` : '';
        return `<tspan${posAttrs} fill="${seg.accent ? ACCENT_COLOR : 'white'}">${escapeXml(seg.text)}</tspan>`;
      })
      .join(''))
    .join('');
  return `<svg width="${IMAGE_SIZE}" height="${IMAGE_SIZE}" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="${IMAGE_SIZE - boxHeight}" width="${IMAGE_SIZE}" height="${boxHeight}" fill="black" fill-opacity="0.55" />
    <text xml:space="preserve" x="56" y="${textTop}" font-family="Be Vietnam Pro" font-size="${fontSize}" font-weight="700">${tspans}</text>
  </svg>`;
}

// Vùng dành cho khối tiêu đề (tính theo mức tối đa 4 dòng của wrapText) — dùng để khung case study ở
// góc DƯỚI không bị chữ tiêu đề đè lên khi applyTitleBar() chạy sau compositeCaseStudyImage().
const TITLE_RESERVE = 4 * 58 + 56 + 20;

// Toạ độ góc trên-trái của khung case study theo lựa chọn `corner` của chị Quỳnh (chọn tay khi tải
// ảnh cá nhân lên, xem personal_photos.card_corner) — ảnh nào mặt ở đâu thì chị tự né góc đó.
function cardPosition(corner, cardSize, margin) {
  const right = IMAGE_SIZE - cardSize - margin;
  const bottom = IMAGE_SIZE - cardSize - margin - TITLE_RESERVE;
  switch (corner) {
    case 'top-left': return { x: margin, y: margin };
    case 'bottom-right': return { x: right, y: bottom };
    case 'bottom-left': return { x: margin, y: bottom };
    case 'top-right':
    default: return { x: right, y: margin };
  }
}

// Đè tiêu đề lên 1 ảnh IMAGE_SIZE x IMAGE_SIZE có sẵn — dùng chung cho cả ảnh AI thuần lẫn ảnh đã
// ghép case study, để 2 luồng không phải viết lại đoạn vẽ chữ 2 lần.
async function applyTitleBar(imageBuffer, title) {
  const overlayPng = rasterizeSvg(titleOverlaySvg(title));
  return sharp(imageBuffer)
    .resize(IMAGE_SIZE, IMAGE_SIZE, { fit: 'cover' })
    .composite([{ input: overlayPng, top: 0, left: 0 }])
    .jpeg({ quality: 88 })
    .toBuffer();
}

// Resize ảnh về hình vuông rồi bo góc — trả PNG có nền trong suốt ngoài phần bo, dùng để ghép "khung
// nhỏ" case study lên ảnh nền cá nhân. Chỉ vẽ hình (không chữ) nên dùng thẳng sharp/librsvg như cũ,
// không cần qua resvg (librsvg vẽ hình/mask bình thường, chỉ riêng CHỮ mới có vấn đề font).
async function roundedCard(imageBuffer, size, radius) {
  const maskSvg = Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" fill="white"/></svg>`
  );
  return sharp(imageBuffer)
    .resize(size, size, { fit: 'cover' })
    .composite([{ input: maskSvg, blend: 'dest-in' }])
    .png()
    .toBuffer();
}

// generatePostImage: gọi OpenAI tạo ảnh nền chung chung theo chủ đề `title`, đè tiêu đề lên, trả
// Buffer JPEG. Lưới an toàn CUỐI CÙNG khi chưa có ảnh cá nhân nào — xem đầu file. Ném lỗi nếu bất kỳ
// bước nào thất bại — nơi gọi (auto-publish-fb.js) tự xử lý fallback.
async function generatePostImage({ apiKey, title }) {
  const prompt = `Ảnh minh hoạ chuyên nghiệp, phong cách biên tập/tạp chí, ánh sáng đẹp, chủ đề: ${title}. `
    + 'TUYỆT ĐỐI KHÔNG có chữ, không watermark, không logo, không ký tự nào trong ảnh.';
  const bg = await callOpenAiImage(apiKey, prompt);
  return applyTitleBar(bg, title);
}

// generateSpiritualBackground: bài trục "Tâm linh" (xem PILLARS ở api/_lib/pillars.js) dùng ảnh cá
// nhân thật thì lệch tông hẳn — theo yêu cầu chị Quỳnh 2026-08-29 ("bài nào về tâm linh thì AI làm
// ảnh tâm linh... phù hợp nội dung bài post"), tạo riêng 1 bộ prompt đúng tinh thần 9 ảnh mẫu chị gửi
// cùng ngày (tượng Phật vàng, hoa sen, ánh sáng vàng rực/tia sáng, đền chùa/tháp cổ, sương mờ, hạt
// sáng lấp lánh, đôi khi thêm đồng tiền vàng cho ý tài lộc) — xoay vòng nhiều biến thể theo đúng từng
// mô-típ trong ảnh mẫu cho đỡ lặp lại y hệt qua từng bài. Trả về ẢNH NỀN THÔ (chưa đè chữ) — nơi gọi
// tự đưa qua renderPersonalTemplateImage() để đè đúng 1 trong 4 mẫu, y hệt cách xử lý ảnh cá nhân thường.
const SPIRITUAL_PROMPTS = [
  'Ảnh minh hoạ tâm linh phong cách biên tập cao cấp: tượng Phật ngồi thiền toả ánh sáng vàng ấm rực rỡ như hào quang phía sau, tia nắng xuyên qua, xung quanh là hoa sen nở trên mặt hồ phẳng lặng phản chiếu ánh sáng, sương mờ nhẹ, cảm giác thiêng liêng bình an, tông màu vàng nâu ấm.',
  'Ảnh minh hoạ tâm linh phong cách biên tập cao cấp: con đường đá dẫn tới cổng đền/chùa cổ giữa rừng tre xanh mướt, ánh nắng vàng xuyên qua tán lá tạo tia sáng lung linh, sương sớm mờ ảo, không khí an nhiên tĩnh lặng.',
  'Ảnh minh hoạ tâm linh phong cách biên tập cao cấp: 1 đoá hoa sen vàng/trắng phát sáng lấp lánh nổi trên mặt nước, phía xa là ngôi chùa/tháp cổ mờ ảo trong sương, các hạt sáng vàng bay lơ lửng như bụi tiên, tông màu vàng ấm hoàng hôn.',
  'Ảnh minh hoạ tâm linh phong cách biên tập cao cấp: đôi bàn tay/lòng bàn tay tượng Phật vàng toả dòng ánh sáng lấp lánh chảy xuống như thác vàng, hoa sen nở xung quanh, vài chiếc lông vũ trắng bay nhẹ, không khí huyền ảo thiêng liêng.',
  'Ảnh minh hoạ tâm linh phong cách biên tập cao cấp: hoa sen vàng phát sáng nổi trên mặt nước cùng vài đồng tiền vàng lấp lánh xung quanh (biểu tượng tài lộc/phúc khí), ánh sáng vàng ấm, cánh hoa hồng rơi trên mặt nước, tông màu vàng nâu sang trọng.',
  'Ảnh minh hoạ tâm linh phong cách biên tập cao cấp: 1 người ngồi thiền an nhiên giữa bầu trời đầy sao và mây, cột ánh sáng vàng chiếu từ trên xuống qua đỉnh đầu, hoa sen phát sáng phía trước, xa xa có đền chùa mái cong mờ ảo, cảm giác vũ trụ huyền bí.',
  'Ảnh minh hoạ tâm linh phong cách biên tập cao cấp: khung cảnh sân chùa cổ vào lúc hoàng hôn, tượng Phật lớn phía sau phủ ánh nắng vàng ấm, khói hương nhẹ bay lên, không khí trầm mặc thiêng liêng, phong cách ảnh tài liệu chân thực.',
];
async function generateSpiritualBackground({ apiKey }) {
  const prompt = `${pickRandom(SPIRITUAL_PROMPTS)} TUYỆT ĐỐI KHÔNG có chữ, không watermark, không logo, không ký tự nào trong ảnh.`;
  return callOpenAiImage(apiKey, prompt);
}

// Ghép ảnh cá nhân (nền) + ảnh case study (khung nhỏ bo góc, có viền trắng + đổ bóng nhẹ) + tiêu đề
// đè lên — kiểu "quote card" theo yêu cầu chị Quỳnh 2026-08-28. `cardCorner` do chị tự chọn theo từng
// ảnh cá nhân (personal_photos.card_corner) — vị trí an toàn không che mặt tuỳ ảnh, không đoán được.
async function compositeCaseStudyImage({ personalImageBuffer, caseStudyImageBuffer, title, cardCorner }) {
  const CARD = 360;
  const MARGIN = 40;
  const { x: cardX, y: cardY } = cardPosition(cardCorner, CARD, MARGIN);

  const base = await sharp(personalImageBuffer).resize(IMAGE_SIZE, IMAGE_SIZE, { fit: 'cover' }).toBuffer();
  const card = await roundedCard(caseStudyImageBuffer, CARD, 20);

  // Viền trắng + bóng mờ: 1 rect trắng hơi lớn hơn card (viền dày ~8px) + 1 rect mờ lệch xuống dưới
  // 1 chút (bóng đổ, feGaussianBlur — filter="blur()" kiểu CSS không chắc được librsvg hỗ trợ nên
  // dùng đúng cú pháp SVG filter chuẩn) — vẽ trước, card đè lên trên.
  const frameSvg = Buffer.from(`<svg width="${IMAGE_SIZE}" height="${IMAGE_SIZE}" xmlns="http://www.w3.org/2000/svg">
    <defs><filter id="shadow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter></defs>
    <rect x="${cardX - 6}" y="${cardY + 10}" width="${CARD + 12}" height="${CARD + 12}" rx="24" fill="black" fill-opacity="0.35" filter="url(#shadow)" />
    <rect x="${cardX - 8}" y="${cardY - 8}" width="${CARD + 16}" height="${CARD + 16}" rx="26" fill="white" />
  </svg>`);

  const composited = await sharp(base)
    .composite([
      { input: frameSvg, top: 0, left: 0 },
      { input: card, top: cardY, left: cardX },
    ])
    .toBuffer();

  return applyTitleBar(composited, title);
}

// ============================================================
// renderPersonalTemplateImage — bản server-side của 4 "Bố cục chữ" ở Tạo Ảnh Thương Hiệu
// ============================================================

// Giữ đúng key/label/decor như LAYOUTS ở nhan-hieu/js/tao-anh.js (đồng bộ tay — file đó chạy trong
// trình duyệt, không import chung được). zoneTop/zoneBottom là % chiều cao ảnh dành cho khối chữ.
const TEMPLATE_LAYOUTS = [
  { key: 'bottom-center', align: 'center', decor: 'gradient-bottom', textPos: 'bottom', zoneTop: 0.42, zoneBottom: 0.86, fontSize: 52 },
  { key: 'top-center', align: 'center', decor: 'gradient-top', textPos: 'top', zoneTop: 0.08, zoneBottom: 0.46, fontSize: 48 },
  { key: 'quote-left', align: 'left', decor: 'accent-bar', textPos: 'middle', zoneTop: 0.28, zoneBottom: 0.74, fontSize: 42 },
  { key: 'caption-bar', align: 'center', decor: 'solid-bar', textPos: 'bottom', zoneTop: 0.66, zoneBottom: 0.95, fontSize: 38 },
];
// family: PHẢI đúng tên thật lưu trong file font (resvg đọc theo tên gốc, không phải tên tự đặt).
const TEMPLATE_FONTS = [
  { key: 'oswald', family: 'Oswald', weight: 700, widthFactor: 0.56 },
  { key: 'playfair', family: 'Playfair Display', weight: 800, widthFactor: 0.62 },
  { key: 'bevietnam', family: 'Be Vietnam Pro', weight: 700, widthFactor: 0.56 },
];
const TEMPLATE_COLORS = ['#FFC93C', '#FF7FAE', '#4FC3F7', '#FF6B4A', '#8BD17C'];

// Tách theo **...** để biết từ nào tô màu nhấn — y hệt parseWords() ở tao-anh.js.
function parseTemplateWords(text) {
  const segments = String(text || '').split('**');
  const words = [];
  segments.forEach((seg, i) => {
    const highlight = i % 2 === 1;
    seg.split(/\s+/).filter(Boolean).forEach((w) => words.push({ text: w, highlight }));
  });
  return words;
}

// Wrap thô theo số ký tự (không đo chữ thật như ctx.measureText bên Canvas — chấp nhận sai số nhỏ,
// đủ dùng cho tiêu đề ngắn kiểu hook/content).
function wrapTemplateWords(words, maxCharsPerLine, maxLines) {
  const lines = [];
  let current = [];
  let currentLen = 0;
  for (const w of words) {
    const addLen = current.length ? w.text.length + 1 : w.text.length;
    if (currentLen + addLen > maxCharsPerLine && current.length) {
      lines.push(current);
      if (lines.length >= maxLines) return lines;
      current = [w]; currentLen = w.text.length;
    } else { current.push(w); currentLen += addLen; }
  }
  if (current.length && lines.length < maxLines) lines.push(current);
  return lines;
}

function templateOverlaySvg({ title, handle, layout, font, colorHex }) {
  const marginX = 56;
  const isAccent = layout.decor === 'accent-bar';
  const maxWidthPx = IMAGE_SIZE - marginX * 2 - (isAccent ? 24 : 0);

  const titleLen = String(title || '').replace(/\*\*/g, '').length;
  let fontSize = layout.fontSize;
  if (titleLen > 50) fontSize -= 8;
  if (titleLen > 90) fontSize -= 8;

  const avgCharWidth = fontSize * font.widthFactor;
  const maxCharsPerLine = Math.max(8, Math.floor(maxWidthPx / avgCharWidth));
  const lines = wrapTemplateWords(parseTemplateWords(title), maxCharsPerLine, 4);
  const lineHeight = Math.round(fontSize * 1.25);
  const blockHeight = Math.max(lines.length, 1) * lineHeight;

  const handleFontSize = 26;
  const handleGap = 14;
  const zoneTopPx = layout.zoneTop * IMAGE_SIZE;
  const zoneBottomPx = layout.zoneBottom * IMAGE_SIZE;

  let startY;
  if (layout.textPos === 'bottom') startY = (zoneBottomPx - handleFontSize - handleGap) - (lines.length - 1) * lineHeight;
  else if (layout.textPos === 'top') startY = zoneTopPx + fontSize * 0.85;
  else startY = zoneTopPx + ((zoneBottomPx - zoneTopPx) - blockHeight) / 2 + fontSize * 0.75;

  let decorSvg = '';
  if (layout.decor === 'gradient-bottom') {
    decorSvg = `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="black" stop-opacity="0"/><stop offset="1" stop-color="black" stop-opacity="0.8"/></linearGradient></defs><rect x="0" y="${0.42 * IMAGE_SIZE}" width="${IMAGE_SIZE}" height="${IMAGE_SIZE - 0.42 * IMAGE_SIZE}" fill="url(#g)"/>`;
  } else if (layout.decor === 'gradient-top') {
    decorSvg = `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="black" stop-opacity="0.65"/><stop offset="1" stop-color="black" stop-opacity="0"/></linearGradient></defs><rect x="0" y="0" width="${IMAGE_SIZE}" height="${0.48 * IMAGE_SIZE}" fill="url(#g)"/>`;
  } else if (layout.decor === 'solid-bar') {
    const padding = 26;
    const barHeight = Math.min(Math.max(blockHeight + handleFontSize + handleGap + padding * 2, 0.18 * IMAGE_SIZE), 0.42 * IMAGE_SIZE);
    decorSvg = `<rect x="0" y="${IMAGE_SIZE - barHeight}" width="${IMAGE_SIZE}" height="${barHeight}" fill="rgba(10,12,10,0.9)"/>`;
    startY = (IMAGE_SIZE - padding - handleFontSize - handleGap) - (lines.length - 1) * lineHeight;
  } else if (layout.decor === 'accent-bar') {
    const boxTop = startY - lineHeight * 0.75;
    const boxHeight = blockHeight + lineHeight * 0.35;
    decorSvg = `<rect x="${marginX - 22}" y="${boxTop}" width="${maxWidthPx + 40}" height="${boxHeight}" fill="rgba(8,10,8,0.5)"/><rect x="${marginX - 22}" y="${boxTop}" width="6" height="${boxHeight}" fill="${colorHex}"/>`;
  }

  // Chỉ đặt x/y (vị trí tuyệt đối) cho tspan ĐẦU dòng — các tspan sau trong CÙNG dòng để trống x,
  // cho renderer tự nối tiếp bằng độ rộng chữ THẬT (đo chính xác hơn avgCharWidth ước lượng nhiều) —
  // đặt x cho từng tspan theo avgCharWidth làm khoảng cách giữa các từ bị lệch/dính liền nhau (chữ
  // hoa/đậm thường rộng hơn ước lượng, cộng dồn sai số qua từng từ — đã tự kiểm chứng lúc code).
  // avgCharWidth chỉ còn dùng để ước lượng độ rộng CẢ DÒNG (canh giữa), sai số nhỏ ở đây không đáng kể.
  const linesSvg = lines.map((line, i) => {
    const y = startY + i * lineHeight;
    const totalChars = line.reduce((sum, w, idx) => sum + w.text.length + (idx > 0 ? 1 : 0), 0);
    const lineWidthPx = totalChars * avgCharWidth;
    const startX = layout.align === 'center' ? (IMAGE_SIZE - lineWidthPx) / 2 : marginX;
    return line.map((w, idx) => {
      const txt = escapeXml(w.text) + (idx < line.length - 1 ? ' ' : '');
      const fill = w.highlight ? colorHex : '#fff';
      return idx === 0
        ? `<tspan x="${startX.toFixed(1)}" y="${y.toFixed(1)}" fill="${fill}">${txt}</tspan>`
        : `<tspan fill="${fill}">${txt}</tspan>`;
    }).join('');
  }).join('');

  const handleY = startY + (lines.length - 1) * lineHeight + lineHeight * 0.62;
  const handleWidthPx = String(handle || '').length * handleFontSize * 0.5;
  const handleX = layout.align === 'center' ? (IMAGE_SIZE - handleWidthPx) / 2 : marginX;

  return `<svg width="${IMAGE_SIZE}" height="${IMAGE_SIZE}" xmlns="http://www.w3.org/2000/svg">
    ${decorSvg}
    <text xml:space="preserve" font-family="${font.family}" font-weight="${font.weight}" font-size="${fontSize}" style="paint-order:stroke;stroke:rgba(0,0,0,.55);stroke-width:3px;">${linesSvg}</text>
    ${handle ? `<text x="${handleX.toFixed(1)}" y="${handleY.toFixed(1)}" font-family="Be Vietnam Pro" font-style="italic" font-weight="500" font-size="${handleFontSize}" fill="#E8E4D6">${escapeXml(handle)}</text>` : ''}
  </svg>`;
}

// photoBuffer: 1 ảnh làm nền — hoặc ảnh cá nhân thật lấy ngẫu nhiên từ personal_photos (bài thường),
// hoặc ảnh AI vẽ từ generateSpiritualBackground() (bài trục Tâm linh) — nơi gọi (auto-publish-fb.js)
// tự quyết định nguồn nào rồi truyền buffer vào đây. layout/font/màu nhấn CHỌN NGẪU NHIÊN mỗi lần
// đăng, cho đa dạng qua từng bài như dùng tay ở Tạo Ảnh Thương Hiệu, thay vì lặp lại đúng 1 kiểu mãi.
async function renderPersonalTemplateImage({ photoBuffer, title, handle }) {
  const layout = pickRandom(TEMPLATE_LAYOUTS);
  const font = pickRandom(TEMPLATE_FONTS);
  const colorHex = pickRandom(TEMPLATE_COLORS);
  const overlayPng = rasterizeSvg(templateOverlaySvg({ title, handle, layout, font, colorHex }));
  return sharp(photoBuffer)
    .resize(IMAGE_SIZE, IMAGE_SIZE, { fit: 'cover' })
    .composite([{ input: overlayPng, top: 0, left: 0 }])
    .jpeg({ quality: 88 })
    .toBuffer();
}

module.exports = {
  generatePostImage, compositeCaseStudyImage, applyTitleBar, renderPersonalTemplateImage, generateSpiritualBackground,
};
