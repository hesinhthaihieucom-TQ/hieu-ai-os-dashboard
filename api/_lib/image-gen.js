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
// Nạp font TRỰC TIẾP từ file TTF TĨNH, MỖI FONT ĐÚNG 1 FILE DUY NHẤT (không tách latin/vietnamese
// làm 2 file như Google Fonts CDN hay .woff2 của @fontsource) — 2 bài học rút ra khi debug bug chị
// Quỳnh phát hiện "chữ không đúng 1 trong 4 mẫu":
// (1) resvg KHÔNG áp dụng font-weight/font-variation-settings cho VARIABLE font — luôn vẽ ở weight
//     mặc định của file bất kể khai báo gì trong SVG, khiến Oswald/Playfair Display (chỉ có bản
//     variable trên kho gốc google/fonts) bị đo/vẽ MỎNG hơn thật ~15-20% → xuống dòng/bố cục lệch
//     hẳn so với bản gốc tao-anh.js (Canvas 2D đo đúng weight thật).
// (2) resvg chỉ nạp được ttf/otf, không đọc được woff/woff2 — và khi thử 2 file TĨNH tách riêng
//     latin/vietnamese (từ gói npm @fontsource, convert .woff2 sang .ttf bằng fonttools) để lách bug
//     (1), lại ra bug KHÁC: 1 vài dấu tiếng Việt (đ, ằ, ờ...) bị mất hẳn (ô vuông) — nghi resvg không
//     gộp glyph qua nhiều file cùng family/weight như trình duyệt, chỉ ưu tiên 1 file.
// Cách xử lý đúng: lấy bản VARIABLE gốc (đủ glyph, 1 file duy nhất) rồi TỰ instance về đúng 1 weight
// tĩnh bằng `fonttools varLib.instancer` (Python) — vừa giữ ĐỦ GLYPH gốc, vừa ra đúng weight tĩnh
// resvg vẽ đúng. Riêng Be Vietnam Pro vốn đã có sẵn file tĩnh gốc (không phải variable) ở kho
// google/fonts nên giữ nguyên, không cần qua bước này.
const FONT_FILES = [
  path.join(FONT_DIR, 'PlayfairDisplay-800.ttf'),
  path.join(FONT_DIR, 'Oswald-700.ttf'),
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

async function callOpenAiImage(apiKey, prompt, size) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90000);
  let resp;
  try {
    resp = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'gpt-image-1', prompt, size: size || `${IMAGE_SIZE}x${IMAGE_SIZE}`, n: 1 }),
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

// Toạ độ góc trên-trái của khung case study theo lựa chọn `corner` của chị Quỳnh (chọn tay khi tải
// ảnh cá nhân lên, xem personal_photos.card_corner) — ảnh nào mặt ở đâu thì chị tự né góc đó. Không
// còn cần TITLE_RESERVE (2026-08-31) — tiêu đề không còn vẽ ở ĐÂY nữa, xem ghi chú ở
// compositeCaseStudyImage() — chỗ tránh chữ/card đè nhau giờ chuyển sang safeLayoutsForCorner().
// Dùng TEMPLATE_W/TEMPLATE_H (khai báo bên dưới) thay vì IMAGE_SIZE cũ — canvas giờ khổ dọc 4:5 khớp
// đúng hệ 4 mẫu, không còn vuông 1:1.
function cardPosition(corner, cardSize, margin) {
  const right = TEMPLATE_W - cardSize - margin;
  const bottom = TEMPLATE_H - cardSize - margin;
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
  // "1024x1536": khổ dọc gần nhất OpenAI hỗ trợ (chỉ nhận đúng 1024x1024/1024x1536/1536x1024/auto) —
  // ảnh này sẽ đi qua renderPersonalTemplateImage() rồi tự crop "cover" về đúng khổ 4:5 (1080x1350)
  // nên không cần khớp tỉ lệ tuyệt đối, chỉ cần khổ dọc để đỡ mất chi tiết khi crop.
  return callOpenAiImage(apiKey, prompt, '1024x1536');
}

// Ghép ảnh cá nhân (nền) + ảnh case study (khung nhỏ bo góc, có viền trắng + đổ bóng nhẹ) + tiêu đề
// đè lên — kiểu "quote card" theo yêu cầu chị Quỳnh 2026-08-28. `cardCorner` do chị tự chọn theo từng
// ảnh cá nhân (personal_photos.card_corner) — vị trí an toàn không che mặt tuỳ ảnh, không đoán được.
// KHÔNG còn tự vẽ tiêu đề ở đây (2026-08-31, theo yêu cầu chị Quỳnh: "sau khi ghép ảnh thì cho vào
// mục tạo ảnh có sẵn trong app để chọn lấy 1 loại trong 4 loại phù hợp xong cho xuất từ đó chứ đừng
// để ai viết chữ" — dùng LẠI đúng hệ 4 mẫu của Tạo Ảnh Thương Hiệu (renderPersonalTemplateImage) thay
// vì 1 kiểu chữ riêng applyTitleBar() cũ, để nhất quán phong cách với ảnh cá nhân thường VÀ tận dụng
// đúng engine đo/wrap chữ đã ổn định). Hàm này giờ CHỈ ghép ảnh (cá nhân + card case study), trả về
// ẢNH NỀN THÔ khổ TEMPLATE_W×TEMPLATE_H (chưa đè chữ) — nơi gọi (fillCaseStudySlot) tự đưa tiếp qua
// renderPersonalTemplateImage() để đè đúng 1 trong 4 mẫu.
async function compositeCaseStudyImage({ personalImageBuffer, caseStudyImageBuffer, cardCorner }) {
  const CARD = 380;
  const MARGIN = 40;
  const { x: cardX, y: cardY } = cardPosition(cardCorner, CARD, MARGIN);

  const base = await sharp(personalImageBuffer).resize(TEMPLATE_W, TEMPLATE_H, { fit: 'cover' }).toBuffer();
  const card = await roundedCard(caseStudyImageBuffer, CARD, 20);

  // Viền trắng + bóng mờ: 1 rect trắng hơi lớn hơn card (viền dày ~8px) + 1 rect mờ lệch xuống dưới
  // 1 chút (bóng đổ, feGaussianBlur — filter="blur()" kiểu CSS không chắc được librsvg hỗ trợ nên
  // dùng đúng cú pháp SVG filter chuẩn) — vẽ trước, card đè lên trên.
  const frameSvg = Buffer.from(`<svg width="${TEMPLATE_W}" height="${TEMPLATE_H}" xmlns="http://www.w3.org/2000/svg">
    <defs><filter id="shadow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter></defs>
    <rect x="${cardX - 6}" y="${cardY + 10}" width="${CARD + 12}" height="${CARD + 12}" rx="24" fill="black" fill-opacity="0.35" filter="url(#shadow)" />
    <rect x="${cardX - 8}" y="${cardY - 8}" width="${CARD + 16}" height="${CARD + 16}" rx="26" fill="white" />
  </svg>`);

  return sharp(base)
    .composite([
      { input: frameSvg, top: 0, left: 0 },
      { input: card, top: cardY, left: cardX },
    ])
    .png()
    .toBuffer();
}

// Loại bỏ các mẫu (trong 4 TEMPLATE_LAYOUTS) có vùng chữ (zoneTop-zoneBottom) khả năng đè lên card
// case study đặt ở góc `corner` — card nằm ở góc TRÊN thì né mẫu vẽ chữ quá gần đỉnh (top-center),
// card ở góc DƯỚI thì né mẫu vẽ chữ quá gần đáy (bottom-center/caption-bar). Không đảm bảo tuyệt đối
// 0% chồng lấn (card khá nhỏ so với vùng chữ mỗi mẫu, và quote-left trải giữa ảnh nên vẫn có thể chạm
// nhẹ) nhưng loại được các trường hợp đè nặng nhất. Luôn trả về ít nhất 1 mẫu (không bao giờ rỗng).
function safeLayoutsForCorner(corner) {
  const isTop = corner === 'top-left' || corner === 'top-right';
  const isBottom = corner === 'bottom-left' || corner === 'bottom-right';
  const safe = TEMPLATE_LAYOUTS.filter((l) => {
    if (isTop && l.zoneTop < 0.30) return false;
    if (isBottom && l.zoneBottom > 0.70) return false;
    return true;
  });
  return safe.length ? safe : TEMPLATE_LAYOUTS;
}

// ============================================================
// renderPersonalTemplateImage — bản server-side của 4 "Bố cục chữ" ở Tạo Ảnh Thương Hiệu
// ============================================================

// Giữ ĐÚNG y hệt các hằng số zoneTop/zoneBottom/baseFontSize/minFontSize/gradStart/gradEnd/padding
// từ LAYOUTS + paintDesign() ở nhan-hieu/js/tao-anh.js (copy tay từng số — file đó chạy trong trình
// duyệt bằng Canvas 2D, không import chung được). CANVAS_W ở tao-anh.js = 1080 = TEMPLATE_W ở đây
// nên scale=1, không cần nhân thêm hệ số nào — copy nguyên số là khớp.
const TEMPLATE_LAYOUTS = [
  { key: 'bottom-center', align: 'center', decor: 'gradient-bottom', textPos: 'bottom', zoneTop: 0.40, zoneBottom: 0.86, baseFontSize: 58, minFontSize: 24 },
  { key: 'top-center', align: 'center', decor: 'gradient-top', textPos: 'top', zoneTop: 0.07, zoneBottom: 0.46, baseFontSize: 54, minFontSize: 22 },
  { key: 'quote-left', align: 'left', decor: 'accent-bar', textPos: 'middle', zoneTop: 0.26, zoneBottom: 0.74, baseFontSize: 46, minFontSize: 20 },
  { key: 'caption-bar', align: 'center', decor: 'solid-bar', textPos: 'bottom', zoneTop: 0.60, zoneBottom: 0.97, baseFontSize: 44, minFontSize: 18 },
];
// family: PHẢI đúng tên thật lưu trong file font (resvg đọc theo tên gốc, không phải tên tự đặt).
const TEMPLATE_FONTS = [
  { key: 'oswald', family: 'Oswald', weight: 700 },
  { key: 'playfair', family: 'Playfair Display', weight: 800 },
  { key: 'bevietnam', family: 'Be Vietnam Pro', weight: 700 },
];
// Cố định luôn 1 màu vàng cho chữ nhấn (theo yêu cầu chị Quỳnh 2026-08-29: "chữ nổi luôn là màu
// vàng, không phải màu cam") — khớp đúng màu "Vàng cam" mặc định ở tao-anh.js, KHÔNG random qua các
// màu khác nữa (trước đây có 5 màu random, ra vài bài lỡ bị cam/hồng/xanh không đúng ý).
const TEMPLATE_ACCENT_COLOR = '#FFC93C';
// Khổ ảnh Dọc 4:5 (giống mặc định "size:'doc'" ở tao-anh.js) — KHÁC IMAGE_SIZE vuông 1:1 dùng cho
// luồng case-study/ảnh AI chung cũ (2 luồng đó không đổi, chỉ riêng bản mẫu Tạo Ảnh Thương Hiệu này
// cần đúng tỉ lệ 4:5 chị Quỳnh yêu cầu — cùng tỉ lệ 1080x1350 gốc của tao-anh.js, giữ chiều rộng 1080
// chuẩn Facebook/Instagram).
const TEMPLATE_W = 1080;
const TEMPLATE_H = 1350;

// Đo độ rộng chữ THẬT bằng chính font đã nạp (không còn ước lượng theo số ký tự nữa — bản trước ước
// lượng sai với Oswald/Playfair làm bố cục lệch hẳn so với bản gốc tao-anh.js, chị Quỳnh phát hiện ra
// "chữ nhấn/xuống dòng không đúng 4 mẫu"). Vẽ 1 SVG chỉ có đúng chữ đó rồi đọc bounding box thật qua
// resvg getBBox() — đo 1 lần ở size 100 rồi tự suy ra size khác bằng tỉ lệ thẳng (độ rộng font tỉ lệ
// thuận tuyệt đối với cỡ chữ, đã tự kiểm chứng bằng số đo thực tế trước khi viết hàm này). Cache theo
// text+family+weight vì cùng 1 tiêu đề sẽ đo lại nhiều từ giống nhau qua các bước wrap/fit.
const _measureCache = new Map();
function measureWidthAt100(text, family, weight) {
  const key = `${family}|${weight}|${text}`;
  if (_measureCache.has(key)) return _measureCache.get(key);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg"><text x="0" y="100" font-family="${family}" font-weight="${weight}" font-size="100">${escapeXml(text)}</text></svg>`;
  const bbox = new Resvg(svg, { font: { loadSystemFonts: false, fontFiles: FONT_FILES } }).getBBox();
  const w = bbox ? bbox.width : 0;
  _measureCache.set(key, w);
  return w;
}
function textWidth(text, family, weight, fontSize) {
  return measureWidthAt100(text, family, weight) * (fontSize / 100);
}

// Các cụm 2 âm tiết hay bị xuống dòng tách đôi làm sai nghĩa/khó đọc (vd "bình an" tách thành "bình"
// cuối dòng trên + "an" đầu dòng dưới — chị Quỳnh phát hiện 2026-08-29) — GHÉP LẠI thành 1 khối duy
// nhất trước khi wrap, để thuật toán không bao giờ tách rời 2 âm tiết này. Tiếng Việt viết cách âm
// tiết (khác tiếng Anh dấu cách = ranh giới từ), nên wrap thô theo khoảng trắng rất dễ cắt ngang 1 từ
// ghép — đây là danh sách các cụm THƯỜNG GẶP nhất trong nội dung (tâm linh/gia đình/kinh doanh...),
// không phải từ điển đầy đủ mọi từ ghép tiếng Việt.
const INSEPARABLE_PAIRS = new Set([
  'bình an', 'an toàn', 'an nhiên', 'an lành', 'an tâm', 'yên tâm', 'bình yên', 'bình tĩnh',
  'hạnh phúc', 'thành công', 'may mắn', 'sức khỏe', 'sức khoẻ', 'khỏe mạnh', 'khoẻ mạnh',
  'yêu thương', 'gia đình', 'tài lộc', 'phúc đức', 'phúc lành', 'tự tin', 'tự do', 'tự nhiên',
  'chân thành', 'trân trọng', 'biết ơn', 'vui vẻ', 'thịnh vượng', 'giàu có', 'ấm no', 'an vui',
].map((s) => s.toLowerCase()));

// "chữ nổi bật có màu vàng đâu?" (chị Quỳnh 2026-08-31) — ĐÚNG, thiếu thật: parseTemplateWords() chỉ
// tô vàng phần đánh dấu **...** thủ công — đúng cách Tạo Ảnh Thương Hiệu hoạt động khi CÓ NGƯỜI tự bôi
// đen chọn từ, nhưng luồng tự động (case study/auto-publish) không có ai chọn, nên tiêu đề luôn ra
// trắng trơn, không có gì nổi bật. Tự động tô vàng SỐ LIỆU/PHẦN TRĂM trong tiêu đề khi CHƯA có sẵn
// markup thủ công — y hệt logic splitHighlight() ở applyTitleBar() cũ (đã đúng, chỉ chuyển sang dùng
// ở đây), không bịa cách khác. Nếu title đã có sẵn ** (hiếm, phòng khi sau này có luồng khác tự đánh
// dấu) thì giữ nguyên, không tự động thêm chồng lên.
function autoHighlightNumbers(title) {
  const s = String(title || '');
  if (s.includes('**')) return s;
  return s.replace(/\d[\d.,]*\s?%?/g, (m) => `**${m}**`);
}

// Tách theo **...** để biết từ nào tô màu nhấn — y hệt parseWords() ở tao-anh.js, rồi ghép các cặp
// trong INSEPARABLE_PAIRS thành 1 "từ" duy nhất (đo/wrap như 1 khối, không tách được nữa).
function parseTemplateWords(text) {
  const segments = String(text || '').split('**');
  const words = [];
  segments.forEach((seg, i) => {
    const highlight = i % 2 === 1;
    seg.split(/\s+/).filter(Boolean).forEach((w) => words.push({ text: w, highlight }));
  });
  const merged = [];
  for (let i = 0; i < words.length; i++) {
    const cur = words[i];
    const next = words[i + 1];
    if (next && INSEPARABLE_PAIRS.has(`${cur.text.toLowerCase()} ${next.text.toLowerCase()}`)) {
      merged.push({ text: `${cur.text} ${next.text}`, highlight: cur.highlight });
      i++;
    } else {
      merged.push(cur);
    }
  }
  return merged;
}

// Y hệt wrapWords() ở tao-anh.js — greedy wrap dùng độ rộng chữ THẬT, không giới hạn số dòng cứng
// (khác bản cũ hay bị CẮT MẤT chữ khi quá 4 dòng — tao-anh.js không bao giờ làm mất nội dung, chỉ
// dựa vào fitTitle() thu nhỏ cỡ chữ dần để hạn chế tràn).
function wrapTemplateWords(words, maxWidthPx, family, weight, fontSize) {
  const spaceWidth = textWidth(' ', family, weight, fontSize);
  const lines = [];
  let current = [];
  let currentWidth = 0;
  words.forEach((w) => {
    const wWidth = textWidth(w.text, family, weight, fontSize);
    const addWidth = current.length ? spaceWidth + wWidth : wWidth;
    if (currentWidth + addWidth > maxWidthPx && current.length) {
      lines.push(current);
      current = [w];
      currentWidth = wWidth;
    } else { current.push(w); currentWidth += addWidth; }
  });
  if (current.length) lines.push(current);
  return lines;
}

// Y hệt fitTitle() ở tao-anh.js — thu nhỏ dần fontSize (bước 2px) tới khi khối chữ vừa maxHeight,
// hoặc chạm minFontSize thì dừng (chấp nhận tràn nhẹ còn hơn chữ nhỏ tới mức không đọc được).
function fitTemplateTitle(title, { maxWidthPx, maxHeight, baseFontSize, minFontSize, family, weight }) {
  const words = parseTemplateWords(title);
  let fontSize = baseFontSize;
  let lines, lineHeight;
  while (true) {
    lines = wrapTemplateWords(words, maxWidthPx, family, weight, fontSize);
    lineHeight = Math.round(fontSize * 1.2);
    const blockHeight = Math.max(lines.length, 1) * lineHeight;
    if (blockHeight <= maxHeight || fontSize <= minFontSize) break;
    fontSize -= 2;
  }
  return { fontSize, lineHeight, lines };
}

function templateOverlaySvg({ title, handle, layout, font }) {
  const colorHex = TEMPLATE_ACCENT_COLOR;
  const marginX = 64;
  const isAccent = layout.decor === 'accent-bar';
  const maxWidthPx = TEMPLATE_W - marginX * 2 - (isAccent ? 24 : 0);
  // handleFontSize: y hệt tao-anh.js — "Math.round((layout.decor==='solid-bar' ? 24 : 30) * scale)".
  const handleFontSize = layout.decor === 'solid-bar' ? 24 : 30;
  const handleGap = 14;
  const zoneTopPx = layout.zoneTop * TEMPLATE_H;
  const zoneBottomPx = layout.zoneBottom * TEMPLATE_H;
  const availableHeight = Math.max((zoneBottomPx - zoneTopPx) - handleFontSize - handleGap, layout.minFontSize * 1.2);

  const { fontSize, lineHeight, lines } = fitTemplateTitle(title, {
    maxWidthPx, maxHeight: availableHeight, baseFontSize: layout.baseFontSize, minFontSize: layout.minFontSize,
    family: font.family, weight: font.weight,
  });
  const blockHeight = Math.max(lines.length, 1) * lineHeight;

  let startY;
  if (layout.textPos === 'bottom') startY = (zoneBottomPx - handleFontSize - handleGap) - (lines.length - 1) * lineHeight;
  else if (layout.textPos === 'top') startY = zoneTopPx + fontSize * 0.85;
  else startY = zoneTopPx + ((zoneBottomPx - zoneTopPx) - blockHeight) / 2 + fontSize * 0.75;

  let decorSvg = '';
  if (layout.decor === 'gradient-bottom') {
    const gradStart = 0.42 * TEMPLATE_H;
    decorSvg = `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="black" stop-opacity="0"/><stop offset="1" stop-color="black" stop-opacity="0.8"/></linearGradient></defs><rect x="0" y="${gradStart}" width="${TEMPLATE_W}" height="${TEMPLATE_H - gradStart}" fill="url(#g)"/>`;
  } else if (layout.decor === 'gradient-top') {
    const gradEnd = 0.48 * TEMPLATE_H;
    decorSvg = `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="black" stop-opacity="0.65"/><stop offset="1" stop-color="black" stop-opacity="0"/></linearGradient></defs><rect x="0" y="0" width="${TEMPLATE_W}" height="${gradEnd}" fill="url(#g)"/>`;
  } else if (layout.decor === 'solid-bar') {
    const padding = 28;
    const barHeight = Math.min(Math.max(blockHeight + handleFontSize + handleGap + padding * 2, 0.16 * TEMPLATE_H), 0.40 * TEMPLATE_H);
    decorSvg = `<rect x="0" y="${TEMPLATE_H - barHeight}" width="${TEMPLATE_W}" height="${barHeight}" fill="rgba(10,12,10,0.9)"/>`;
    startY = (TEMPLATE_H - padding - handleFontSize - handleGap) - (lines.length - 1) * lineHeight;
  } else if (layout.decor === 'accent-bar') {
    const boxTop = startY - lineHeight * 0.75;
    const boxHeight = blockHeight + lineHeight * 0.35;
    decorSvg = `<rect x="${marginX - 22}" y="${boxTop}" width="${maxWidthPx + 40}" height="${boxHeight}" fill="rgba(8,10,8,0.5)"/><rect x="${marginX - 22}" y="${boxTop}" width="6" height="${boxHeight}" fill="${colorHex}"/>`;
  }

  // Chỉ đặt x/y (vị trí tuyệt đối) cho tspan ĐẦU dòng — các tspan sau trong CÙNG dòng để trống x, cho
  // renderer tự nối tiếp bằng độ rộng chữ THẬT của chính nó (không cộng dồn sai số qua từng từ như
  // cách đặt x riêng từng tspan trước đây). startX (để canh giữa) vẫn cần biết độ rộng CẢ DÒNG — giờ
  // đo thật bằng textWidth() thay vì ước lượng.
  const linesSvg = lines.map((line, i) => {
    const y = startY + i * lineHeight;
    const lineText = line.map((w) => w.text).join(' ');
    const lineWidthPx = textWidth(lineText, font.family, font.weight, fontSize);
    const startX = layout.align === 'center' ? (TEMPLATE_W - lineWidthPx) / 2 : marginX;
    return line.map((w, idx) => {
      const txt = escapeXml(w.text) + (idx < line.length - 1 ? ' ' : '');
      const fill = w.highlight ? colorHex : '#fff';
      return idx === 0
        ? `<tspan x="${startX.toFixed(1)}" y="${y.toFixed(1)}" fill="${fill}">${txt}</tspan>`
        : `<tspan fill="${fill}">${txt}</tspan>`;
    }).join('');
  }).join('');

  const handleY = startY + (lines.length - 1) * lineHeight + lineHeight * 0.62;
  const handleWidthPx = handle ? textWidth(handle, 'Be Vietnam Pro', 500, handleFontSize) : 0;
  const handleX = layout.align === 'center' ? (TEMPLATE_W - handleWidthPx) / 2 : marginX;

  return `<svg width="${TEMPLATE_W}" height="${TEMPLATE_H}" xmlns="http://www.w3.org/2000/svg">
    ${decorSvg}
    <text xml:space="preserve" font-family="${font.family}" font-weight="${font.weight}" font-size="${fontSize}" style="paint-order:stroke;stroke:rgba(0,0,0,.55);stroke-width:3px;">${linesSvg}</text>
    ${handle ? `<text x="${handleX.toFixed(1)}" y="${handleY.toFixed(1)}" font-family="Be Vietnam Pro" font-style="italic" font-weight="500" font-size="${handleFontSize}" fill="#E8E4D6">${escapeXml(handle)}</text>` : ''}
  </svg>`;
}

// photoBuffer: 1 ảnh làm nền — hoặc ảnh cá nhân thật lấy ngẫu nhiên từ personal_photos (bài thường),
// hoặc ảnh AI vẽ từ generateSpiritualBackground() (bài trục Tâm linh) — nơi gọi (auto-publish-fb.js)
// tự quyết định nguồn nào rồi truyền buffer vào đây. layout/font CHỌN NGẪU NHIÊN mỗi lần đăng, cho đa
// dạng qua từng bài như dùng tay ở Tạo Ảnh Thương Hiệu, thay vì lặp lại đúng 1 kiểu mãi — riêng màu
// nhấn CỐ ĐỊNH vàng (xem TEMPLATE_ACCENT_COLOR), khổ ảnh CỐ ĐỊNH dọc 4:5 (theo yêu cầu chị Quỳnh).
// allowedLayouts (2026-08-31, thêm cho luồng case study — xem safeLayoutsForCorner()) — mặc định
// TEMPLATE_LAYOUTS đầy đủ (hành vi cũ, ảnh cá nhân thường không có card gì để né), truyền tập con hẹp
// hơn khi ảnh nền đã có sẵn 1 phần tử khác (card case study) cần né chồng lấn.
async function renderPersonalTemplateImage({ photoBuffer, title, handle, allowedLayouts }) {
  const layout = pickRandom(allowedLayouts || TEMPLATE_LAYOUTS);
  const font = pickRandom(TEMPLATE_FONTS);
  const overlayPng = rasterizeSvg(templateOverlaySvg({ title: autoHighlightNumbers(title), handle, layout, font }));
  return sharp(photoBuffer)
    .resize(TEMPLATE_W, TEMPLATE_H, { fit: 'cover' })
    .composite([{ input: overlayPng, top: 0, left: 0 }])
    .jpeg({ quality: 88 })
    .toBuffer();
}

// Chọn nguồn ảnh + đè 1 trong 4 mẫu — cùng thứ tự ưu tiên chị Quỳnh đã chốt cho Fanpage (xem comment
// đầu file): tâm linh → ảnh cá nhân thật → ảnh AI chung. Viết riêng hàm này (2026-09-01, theo yêu cầu
// chị Quỳnh: "phần cá nhân thêm các phần y hệt như fanpage trừ cái đăng tự động") để lane Cá nhân
// (Phase 9, KHÔNG tự đăng lên Facebook) cũng có ảnh sẵn trong app cho chị tự đăng tay, thay vì chỉ
// riêng case study mới có ảnh như trước — KHÔNG sửa logic đang chạy thật trong auto-publish-fb.js (nơi
// đó còn phân biệt lỗi theo từng bước để báo đúng nguyên nhân khi đăng thất bại, gộp lại dễ vỡ luồng
// đang chạy), chấp nhận lặp lại phần logic chọn nguồn ảnh thay vì refactor chỗ nhạy cảm đó.
async function autoPickAndRenderImage({ title, handle, tags, personalPhotos }) {
  const isSpiritual = Array.isArray(tags) && tags.includes('tam_linh');
  let templatePhoto = null;
  if (isSpiritual && process.env.OPENAI_API_KEY) {
    try { templatePhoto = await generateSpiritualBackground({ apiKey: process.env.OPENAI_API_KEY }); }
    catch (e) { /* rơi xuống ảnh cá nhân/AI chung ở dưới nếu lỗi */ }
  }
  if (!templatePhoto && !isSpiritual && personalPhotos && personalPhotos.length) {
    const chosen = personalPhotos[Math.floor(Math.random() * personalPhotos.length)];
    templatePhoto = Buffer.from(chosen.image.replace(/^data:image\/\w+;base64,/, ''), 'base64');
  }
  if (templatePhoto) {
    try { return await renderPersonalTemplateImage({ photoBuffer: templatePhoto, title, handle }); }
    catch (e) { /* rơi xuống ảnh AI chung ở dưới nếu lỗi */ }
  }
  if (process.env.OPENAI_API_KEY) {
    try { return await generatePostImage({ apiKey: process.env.OPENAI_API_KEY, title }); }
    catch (e) { return null; }
  }
  return null;
}

module.exports = {
  generatePostImage, compositeCaseStudyImage, applyTitleBar, renderPersonalTemplateImage, generateSpiritualBackground,
  safeLayoutsForCorner, autoPickAndRenderImage,
};
