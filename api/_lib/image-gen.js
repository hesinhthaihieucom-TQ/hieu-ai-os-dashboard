// Tự tạo/ghép ảnh cho bài auto-đăng Fanpage (2026-08-27, theo yêu cầu chị Quỳnh) — module Tạo Ảnh
// Thương Hiệu (nhan-hieu/js/tao-anh.js) KHÔNG dùng lại được ở đây: nó chỉ vẽ chữ đè lên 1 ảnh NGƯỜI
// DÙNG TỰ TẢI LÊN, chạy hoàn toàn bằng Canvas 2D trong trình duyệt, không có AI tạo ảnh, không gọi
// API nào — cron chạy nền không có ai ngồi tải ảnh. Nên ở đây tự làm lại:
// (1) OpenAI gpt-image-1 tạo 1 ảnh nền KHÔNG chữ (chữ tiếng Việt do AI vẽ trực tiếp trong ảnh
//     thường lỗi dấu) — dùng khi KHÔNG có ảnh case study/ảnh cá nhân nào (generatePostImage).
// (2) Ghép "ảnh cá nhân làm nền + ảnh case study làm khung nhỏ góc" (2026-08-28, theo yêu cầu chị
//     Quỳnh — kiểu quote-card đang thịnh hành cho content bán hàng) — compositeCaseStudyImage.
// Cả 2 đường đều kết ở TỰ đè tiêu đề lên bằng chữ THẬT (SVG qua sharp, không phải AI vẽ) — Unicode/
// dấu tiếng Việt hiển thị đúng 100%, theo 1 style CỐ ĐỊNH đơn giản (đã chốt với chị Quỳnh: nền tối mờ
// dưới + chữ trắng đậm, không có đủ tuỳ chọn font/màu/bố cục như bản tay Tạo Ảnh Thương Hiệu).
const sharp = require('sharp');

const IMAGE_SIZE = 1024;

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
    <text x="56" y="${textTop}" font-family="sans-serif" font-size="${fontSize}" font-weight="700">${tspans}</text>
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
  const svg = Buffer.from(titleOverlaySvg(title));
  return sharp(imageBuffer)
    .resize(IMAGE_SIZE, IMAGE_SIZE, { fit: 'cover' })
    .composite([{ input: svg, top: 0, left: 0 }])
    .jpeg({ quality: 88 })
    .toBuffer();
}

// Resize ảnh về hình vuông rồi bo góc — trả PNG có nền trong suốt ngoài phần bo, dùng để ghép "khung
// nhỏ" case study lên ảnh nền cá nhân.
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

// generatePostImage: gọi OpenAI tạo ảnh nền theo chủ đề `title`, đè tiêu đề lên, trả Buffer JPEG.
// Ném lỗi nếu bất kỳ bước nào thất bại — nơi gọi (auto-publish-fb.js) tự xử lý fallback.
async function generatePostImage({ apiKey, title }) {
  const prompt = `Ảnh minh hoạ chuyên nghiệp, phong cách biên tập/tạp chí, ánh sáng đẹp, chủ đề: ${title}. `
    + 'TUYỆT ĐỐI KHÔNG có chữ, không watermark, không logo, không ký tự nào trong ảnh.';
  const bg = await callOpenAiImage(apiKey, prompt);
  return applyTitleBar(bg, title);
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

module.exports = { generatePostImage, compositeCaseStudyImage, applyTitleBar };
