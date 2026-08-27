// Tự tạo ảnh cho bài auto-đăng Fanpage (2026-08-27, theo yêu cầu chị Quỳnh) — module Tạo Ảnh Thương
// Hiệu (nhan-hieu/js/tao-anh.js) KHÔNG dùng lại được ở đây: nó chỉ vẽ chữ đè lên 1 ảnh NGƯỜI DÙNG TỰ
// TẢI LÊN, chạy hoàn toàn bằng Canvas 2D trong trình duyệt, không có AI tạo ảnh, không gọi API nào —
// cron chạy nền không có ai ngồi tải ảnh. Nên ở đây tự làm lại 2 bước: (1) OpenAI gpt-image-1 tạo 1
// ảnh nền KHÔNG chữ (chữ tiếng Việt do AI vẽ trực tiếp trong ảnh thường lỗi dấu), (2) TỰ đè tiêu đề
// lên bằng chữ THẬT (SVG qua sharp, không phải AI vẽ) — Unicode/dấu tiếng Việt hiển thị đúng, theo 1
// style CỐ ĐỊNH đơn giản (đã chốt với chị Quỳnh: nền tối mờ dưới + chữ trắng đậm, không có đủ tuỳ
// chọn font/màu/bố cục như bản tay Tạo Ảnh Thương Hiệu).
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

function titleOverlaySvg(title) {
  const lines = wrapText(title, 24, 4);
  const fontSize = 46;
  const lineHeight = 58;
  const paddingBottom = 56;
  const boxHeight = lines.length * lineHeight + paddingBottom;
  const textTop = IMAGE_SIZE - boxHeight + lineHeight - 14;
  const tspans = lines
    .map((line, i) => `<tspan x="56" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`)
    .join('');
  return `<svg width="${IMAGE_SIZE}" height="${IMAGE_SIZE}" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="${IMAGE_SIZE - boxHeight}" width="${IMAGE_SIZE}" height="${boxHeight}" fill="black" fill-opacity="0.55" />
    <text x="56" y="${textTop}" font-family="sans-serif" font-size="${fontSize}" font-weight="700" fill="white">${tspans}</text>
  </svg>`;
}

// generatePostImage: gọi OpenAI tạo ảnh nền theo chủ đề `title`, đè tiêu đề lên, trả Buffer JPEG.
// Ném lỗi nếu bất kỳ bước nào thất bại — nơi gọi (auto-publish-fb.js) tự rơi về đăng bài chữ thường,
// không để lỗi ảnh chặn việc đăng bài chính.
async function generatePostImage({ apiKey, title }) {
  const prompt = `Ảnh minh hoạ chuyên nghiệp, phong cách biên tập/tạp chí, ánh sáng đẹp, chủ đề: ${title}. `
    + 'TUYỆT ĐỐI KHÔNG có chữ, không watermark, không logo, không ký tự nào trong ảnh.';
  const bg = await callOpenAiImage(apiKey, prompt);
  const svg = Buffer.from(titleOverlaySvg(title));
  return sharp(bg)
    .resize(IMAGE_SIZE, IMAGE_SIZE, { fit: 'cover' })
    .composite([{ input: svg, top: 0, left: 0 }])
    .jpeg({ quality: 88 })
    .toBuffer();
}

module.exports = { generatePostImage };
