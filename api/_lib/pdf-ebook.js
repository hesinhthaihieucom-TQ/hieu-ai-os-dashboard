// Dựng file PDF ebook từ nội dung Giai đoạn 2 (Xây Dựng Nội Dung) — trang bìa + Mở đầu + từng Phần
// + Kết. Font mặc định của pdfkit (Helvetica...) KHÔNG có dấu tiếng Việt — PHẢI nhúng font TTF thật
// (Be Vietnam Pro + Playfair Display, cùng font web đang dùng, OFL) qua doc.font(...), không dùng tên
// font chuẩn nào.
//
// 2026-09-04: viết lại từ bản chữ-trắng-đen-thuần sang hệ khối màu theo `theme` (accent/bg, xem
// product_idea_results.ebook_theme) — đối chiếu trực tiếp 1 file ebook mẫu Quỳnh gửi (card viền, box
// nhấn mạnh nền đặc, box nhạt cho phần tóm tắt). Bìa có 3 nguồn: `coverImageBuffer` đã có sẵn chữ đè
// (chế độ `ai`, do api/_lib/ebook-cover.js dựng — KHÔNG vẽ chữ đè lần 2 ở đây), `coverImageBuffer`
// chưa có chữ (chế độ `upload` — ảnh bìa sản phẩm tự tải lên, vẽ chữ đè bằng pdfkit thẳng, không cần
// qua resvg vì pdfkit tự nhúng font thật, không có rủi ro lỗi dấu tiếng Việt như khi để AI tự vẽ chữ),
// hoặc không có ảnh nào (chế độ `solid` — chỉ nền màu + chữ).
const path = require('path');
const PDFDocument = require('pdfkit');

const FONT_REGULAR = path.join(__dirname, 'fonts', 'BeVietnamPro-Regular.ttf');
const FONT_BOLD = path.join(__dirname, 'fonts', 'BeVietnamPro-Bold.ttf');
const FONT_SERIF = path.join(__dirname, 'fonts', 'PlayfairDisplay-800.ttf');

const DEFAULT_THEME = { accent: '#2F6F62', bg: '#F4F1E6' };
const INK = '#1E2420';
const INK_SOFT = '#5B5F55';

const MARGIN = 56;

function hexToRgbArr(hex) {
  const h = String(hex || '').replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [parseInt(full.slice(0, 2), 16) || 0, parseInt(full.slice(2, 4), 16) || 0, parseInt(full.slice(4, 6), 16) || 0];
}
function rgbToHex([r, g, b]) {
  return `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
}
function mix(hexA, hexB, t) {
  const a = hexToRgbArr(hexA);
  const b = hexToRgbArr(hexB);
  return rgbToHex(a.map((v, i) => v + (b[i] - v) * t));
}
// tint: nhạt dần về trắng — dùng cho nền card/box nhẹ. shade: tối dần về đen — dùng khi cần viền/chữ
// đậm hơn accent gốc (accent nhạt như vàng/cam đôi khi cần bản đậm hơn cho dễ đọc trên nền sáng).
function tint(hex, amount) { return mix(hex, '#FFFFFF', amount); }
function shade(hex, amount) { return mix(hex, '#000000', amount); }

function sectionBody(section, outlineItem) {
  if (section && section.review && section.review.ban_da_chinh) return section.review.ban_da_chinh;
  if (section && section.viet && section.viet.noi_dung) return section.viet.noi_dung;
  const bullets = (outlineItem.noi_dung_con || []).map((n) => `• ${n}`).join('\n');
  return `[Phần này chưa viết nội dung đầy đủ — mới có outline]\n\n${bullets}`;
}
function sectionBaiTap(section, outlineItem) {
  if (section && section.viet && section.viet.bai_tap) return section.viet.bai_tap;
  return outlineItem.bai_tap || null;
}
// vi_du: TRƯỚC ĐÂY field này có sẵn trong dữ liệu (san-pham-so/js/xay-dung-noi-dung.js hiện luôn ở
// "Bản nháp") nhưng chưa từng được vẽ vào PDF — sửa nhân tiện khi viết lại file này (2026-09-04).
function sectionViDu(section) {
  return (section && section.viet && section.viet.vi_du) || null;
}

function buildEbookPdf({ idea, outline2, sections, onlyIndex, lessonCover, theme, coverImageBuffer, coverHasBakedText }) {
  const th = { accent: (theme && theme.accent) || DEFAULT_THEME.accent, bg: (theme && theme.bg) || DEFAULT_THEME.bg };
  return new Promise((resolve, reject) => {
    // bufferPages:true — BẮT BUỘC để doc.bufferedPageRange().count đếm đúng TỔNG số trang đã tạo tới
    // thời điểm gọi (không có cờ này, pdfkit chỉ giữ trang hiện tại trong buffer, count() luôn trả 1,
    // khiến số trang ở footer sai — tự kiểm chứng bằng cách render thử và mở file ra xem, không phải
    // đoán). Bù lại, PDF chỉ thật sự ghi ra khi gọi doc.end(), không ảnh hưởng luồng buffer hiện có.
    const doc = new PDFDocument({ size: 'A4', margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN }, bufferPages: true });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageW = doc.page.width;
    const pageH = doc.page.height;

    const flat = [
      { kind: 'Mở đầu', item: outline2.mo_dau },
      ...(outline2.phan || []).map((p) => ({ kind: 'Phần', item: p })),
      { kind: 'Kết', item: outline2.ket },
    ];

    // ===== Trang bìa =====
    // lessonCover TÁCH RIÊNG khỏi onlyIndex (2026-09-04) — onlyIndex chỉ quyết định XUẤT MẤY TRANG
    // nội dung (dùng cả khi xem-trước-1-trang lẫn khi xuất 1 bài học mini_course), lessonCover mới là
    // cờ quyết định kiểu BÌA nào (bìa chính đầy đủ màu/ảnh, hay bìa đơn giản của riêng 1 bài học) —
    // trước đây gộp chung vào onlyIndex khiến màn xem-trước-màu vô tình hiện nhầm bìa bài học thay vì
    // bìa chính cần xem trước.
    if (lessonCover) {
      drawLessonCover(doc, th, flat[onlyIndex], idea);
    } else {
      drawMainCover(doc, th, idea, coverImageBuffer, coverHasBakedText, pageW, pageH);
    }

    // ===== Trang nội dung =====
    const entries = onlyIndex != null ? [[onlyIndex, flat[onlyIndex]]] : flat.map((e, i) => [i, e]);
    entries.forEach(([index, entry]) => {
      if (!entry || !entry.item) return;
      doc.addPage();
      let y = drawPageHeader(doc, th, idea.ten_san_pham, pageW);

      const body = sectionBody(sections[index], entry.item);
      const baiTap = sectionBaiTap(sections[index], entry.item);
      const viDu = sectionViDu(sections[index]);
      const tomTat = sections[index] && sections[index].viet && sections[index].viet.tom_tat_3_y;
      // Ảnh minh hoạ TỪNG PHẦN (2026-09-04) — người bán tự dán prompt AI gợi ý sẵn vào ChatGPT rồi tải
      // ảnh kết quả lên (xem san-pham-so/js/xay-dung-noi-dung.js illustrationBlockHtml), KHÁC bìa ebook
      // (không gọi AI vẽ ảnh ở đây, không tốn phí thật nhân theo số phần).
      const illustrationUrl = sections[index] && sections[index].viet && sections[index].viet.anh_minh_hoa_url;

      y = drawSectionHeading(doc, th, entry.kind, entry.item.tieu_de, y, pageW);
      y = drawParagraph(doc, body, y, pageW);

      if (illustrationUrl) { y = ensureSpace(doc, th, y, pageH); y = drawIllustrationImage(doc, illustrationUrl, y, pageW); }
      if (viDu) { y = ensureSpace(doc, th, y, pageH); y = drawExampleCard(doc, th, viDu, y, pageW); }
      if (baiTap) { y = ensureSpace(doc, th, y, pageH); y = drawActionBox(doc, th, baiTap, y, pageW); }
      if (tomTat && tomTat.length) { y = ensureSpace(doc, th, y, pageH); y = drawTakeawaysBox(doc, th, tomTat, y, pageW); }

      drawPageFooter(doc, doc.bufferedPageRange().count);
    });

    doc.end();
  });
}

// Chừa chỗ tối thiểu 140pt trước khi vẽ 1 khối mới — nếu không đủ, sang trang mới + vẽ lại header.
// pdfkit không tự đo trước chiều cao 1 khối phức tạp (box có viền/nền) nên dùng ngưỡng an toàn thay
// vì đo chính xác — đủ tốt cho các khối ngắn (vài dòng) trong ebook này.
function ensureSpace(doc, th, y, pageH) {
  if (y > pageH - MARGIN - 140) {
    doc.addPage();
    return drawPageHeader(doc, th, null, doc.page.width) ;
  }
  return y;
}

function drawPageHeader(doc, th, bookTitle, pageW) {
  const y = MARGIN;
  if (bookTitle) {
    doc.font(FONT_BOLD).fontSize(10).fillColor(INK_SOFT)
      .text(bookTitle.toUpperCase(), MARGIN, y, { characterSpacing: 0.5, width: pageW - MARGIN * 2, lineBreak: false });
  }
  doc.moveTo(MARGIN, y + 20).lineTo(pageW - MARGIN, y + 20).lineWidth(0.75).strokeColor(tint(th.accent, 0.5)).stroke();
  return y + 40;
}

// Vẽ số trang TRONG vùng margin dưới — pdfkit tự động sang trang mới nếu toạ độ y vượt quá
// page.maxY() (= page.height - margins.bottom), kể cả khi truyền x/y tuyệt đối (đây chính là bug thật
// gặp phải khi tự test: mỗi trang nội dung bị thừa 1 trang trắng ngay sau nó) — hạ margins.bottom
// tạm thời về 0 trong lúc vẽ, đúng cách pdfkit khuyến nghị cho header/footer nằm trong vùng margin.
function drawPageFooter(doc, pageNumber) {
  const pageW = doc.page.width;
  const pageH = doc.page.height;
  const originalBottom = doc.page.margins.bottom;
  doc.page.margins.bottom = 0;
  doc.font(FONT_REGULAR).fontSize(9).fillColor(INK_SOFT)
    .text(String(pageNumber), 0, pageH - MARGIN + 12, { width: pageW, align: 'center', lineBreak: false });
  doc.page.margins.bottom = originalBottom;
}

function drawSectionHeading(doc, th, eyebrow, title, y, pageW) {
  const w = pageW - MARGIN * 2;
  doc.font(FONT_BOLD).fontSize(10.5).fillColor(th.accent)
    .text(eyebrow.toUpperCase(), MARGIN, y, { characterSpacing: 1, width: w });
  y += 20;
  doc.font(FONT_SERIF).fontSize(22).fillColor(INK).text(title || '', MARGIN, y, { width: w });
  y += doc.heightOfString(title || '', { width: w, font: FONT_SERIF, fontSize: 22 }) + 16;
  return y;
}

function drawParagraph(doc, text, y, pageW) {
  const w = pageW - MARGIN * 2;
  doc.font(FONT_REGULAR).fontSize(12).fillColor(INK).text(text || '', MARGIN, y, { width: w, lineGap: 4 });
  return doc.y + 18;
}

// "Ví dụ": card viền trái màu accent, nền cực nhạt — giống khối trích dẫn nhấn ý trong file mẫu.
function drawExampleCard(doc, th, text, y, pageW) {
  const w = pageW - MARGIN * 2;
  const padX = 18, padTop = 14, padBottom = 16;
  const labelH = 16;
  doc.font(FONT_REGULAR).fontSize(11.5);
  const textH = doc.heightOfString(text, { width: w - padX * 2, font: FONT_REGULAR, fontSize: 11.5, lineGap: 3 });
  const boxH = padTop + labelH + 6 + textH + padBottom;
  doc.rect(MARGIN, y, w, boxH).fill(tint(th.accent, 0.93));
  doc.rect(MARGIN, y, 4, boxH).fill(th.accent);
  doc.font(FONT_BOLD).fontSize(10).fillColor(th.accent).text('VÍ DỤ', MARGIN + padX, y + padTop, { characterSpacing: 1 });
  doc.font(FONT_REGULAR).fontSize(11.5).fillColor(INK)
    .text(text, MARGIN + padX, y + padTop + labelH + 6, { width: w - padX * 2, lineGap: 3 });
  return y + boxH + 18;
}

// "Bài tập": box nền đặc màu accent, chữ trắng — giống khối "BƯỚC HÀNH ĐỘNG HÔM NAY" nhấn mạnh nhất
// trong file mẫu (đậm nhất trong cả trang, dễ nhận ra ngay khi lướt mắt qua).
function drawActionBox(doc, th, text, y, pageW) {
  const w = pageW - MARGIN * 2;
  const padX = 20, padTop = 16, padBottom = 18;
  const labelH = 16;
  const textH = doc.heightOfString(text, { width: w - padX * 2, font: FONT_BOLD, fontSize: 12.5, lineGap: 3 });
  const boxH = padTop + labelH + 6 + textH + padBottom;
  doc.roundedRect(MARGIN, y, w, boxH, 8).fill(shade(th.accent, 0.15));
  doc.font(FONT_BOLD).fontSize(10).fillColor(tint(th.accent, 0.75)).text('BÀI TẬP', MARGIN + padX, y + padTop, { characterSpacing: 1 });
  doc.font(FONT_BOLD).fontSize(12.5).fillColor('#FFFFFF')
    .text(text, MARGIN + padX, y + padTop + labelH + 6, { width: w - padX * 2, lineGap: 3 });
  return y + boxH + 18;
}

// "3 điều cần nhớ": box nền nhạt (đậm hơn ví dụ 1 chút để phân biệt 2 loại box nhạt), danh sách số.
function drawTakeawaysBox(doc, th, items, y, pageW) {
  const w = pageW - MARGIN * 2;
  const padX = 20, padTop = 16, padBottom = 16;
  const labelH = 16;
  doc.font(FONT_REGULAR).fontSize(11.5);
  let itemsH = 0;
  const heights = items.map((t) => {
    const h = doc.heightOfString(`1. ${t}`, { width: w - padX * 2 - 24, font: FONT_REGULAR, fontSize: 11.5, lineGap: 2 });
    itemsH += h + 8;
    return h;
  });
  const boxH = padTop + labelH + 6 + itemsH + padBottom;
  doc.roundedRect(MARGIN, y, w, boxH, 8).fill(tint(th.accent, 0.82));
  doc.font(FONT_BOLD).fontSize(10).fillColor(shade(th.accent, 0.2)).text('3 ĐIỀU CẦN NHỚ', MARGIN + padX, y + padTop, { characterSpacing: 1 });
  let iy = y + padTop + labelH + 6;
  items.forEach((t, i) => {
    doc.font(FONT_BOLD).fontSize(11.5).fillColor(th.accent).text(String(i + 1) + '.', MARGIN + padX, iy, { width: 20, lineBreak: false });
    doc.font(FONT_REGULAR).fontSize(11.5).fillColor(INK).text(t, MARGIN + padX + 24, iy, { width: w - padX * 2 - 24, lineGap: 2 });
    iy += heights[i] + 8;
  });
  return y + boxH + 18;
}

// Ảnh minh hoạ TỪNG PHẦN (data URL base64 người bán tự tải lên sau khi dùng prompt AI gợi ý ở ChatGPT
// — xem illustrationUrl ở buildEbookPdf). Bọc try/catch riêng — 1 ảnh lỗi/hỏng không được làm hỏng cả
// PDF, chỉ đơn giản bỏ qua khối này. openImage() đọc kích thước thật để tự tính đúng chiều cao sau khi
// scale-fit (doc.image({fit}) không trả lại kích thước đã dùng, phải tự tính để cộng dồn y).
function drawIllustrationImage(doc, dataUrl, y, pageW) {
  try {
    const base64 = String(dataUrl).split(',')[1] || '';
    const buf = Buffer.from(base64, 'base64');
    const img = doc.openImage(buf);
    const maxW = pageW - MARGIN * 2;
    const maxH = 260;
    const scale = Math.min(maxW / img.width, maxH / img.height, 1);
    const w = img.width * scale;
    const h = img.height * scale;
    doc.image(buf, MARGIN + (maxW - w) / 2, y, { width: w, height: h });
    return y + h + 16;
  } catch (e) {
    return y;
  }
}

// ===== Bìa =====

function drawMainCover(doc, th, idea, coverImageBuffer, coverHasBakedText, pageW, pageH) {
  if (coverImageBuffer) {
    try {
      doc.image(coverImageBuffer, 0, 0, { cover: [pageW, pageH], align: 'center', valign: 'center' });
    } catch (e) {
      drawSolidCoverBackground(doc, th, pageW, pageH);
      coverHasBakedText = false;
    }
    if (!coverHasBakedText) drawCoverTextOverlay(doc, th, idea, pageW, pageH, true);
    return;
  }
  drawSolidCoverBackground(doc, th, pageW, pageH);
  drawCoverTextOverlay(doc, th, idea, pageW, pageH, false);
}

// Bìa không ảnh (chế độ `solid`) — nền màu + 1 vòng tròn trang trí lớn màu accent nhạt phía sau tiêu
// đề (gợi lại vòng tròn ánh sáng phía sau tiêu đề trong file mẫu, vẽ được thuần vector không cần ảnh).
function drawSolidCoverBackground(doc, th, pageW, pageH) {
  doc.rect(0, 0, pageW, pageH).fill(th.bg);
  doc.save();
  doc.circle(pageW / 2, pageH * 0.38, pageW * 0.62).fill(tint(th.accent, 0.85));
  doc.restore();
}

function drawCoverTextOverlay(doc, th, idea, pageW, pageH, onImage) {
  const textColor = onImage ? '#FFFFFF' : INK;
  const subColor = onImage ? '#F0EBD8' : th.accent;
  if (onImage) {
    doc.save();
    doc.rect(0, pageH * 0.32, pageW, pageH * 0.36).fillOpacity(0.45).fill('#000000');
    doc.restore();
  }
  const w = pageW - MARGIN * 2 - 40;
  const title = idea.ten_san_pham || '';
  doc.font(FONT_SERIF).fontSize(38).fillColor(textColor)
    .text(title, MARGIN + 20, pageH * 0.4, { width: w, align: 'center' });
  if (idea.doi_tuong) {
    const titleH = doc.heightOfString(title, { width: w, font: FONT_SERIF, fontSize: 38 });
    doc.font(FONT_REGULAR).fontSize(13).fillColor(subColor)
      .text(`Dành cho: ${idea.doi_tuong}`, MARGIN + 20, pageH * 0.4 + titleH + 14, { width: w, align: 'center' });
  }
}

function drawLessonCover(doc, th, entry, idea) {
  const pageW = doc.page.width;
  const pageH = doc.page.height;
  doc.rect(0, 0, pageW, pageH).fill(th.bg);
  const w = pageW - MARGIN * 2 - 40;
  const title = (entry && entry.item && entry.item.tieu_de) || '';
  doc.font(FONT_SERIF).fontSize(30).fillColor(INK).text(title, MARGIN + 20, pageH * 0.42, { width: w, align: 'center' });
  const titleH = doc.heightOfString(title, { width: w, font: FONT_SERIF, fontSize: 30 });
  doc.font(FONT_REGULAR).fontSize(13).fillColor(th.accent)
    .text(`Bài học trong khoá: ${idea.ten_san_pham || ''}`, MARGIN + 20, pageH * 0.42 + titleH + 14, { width: w, align: 'center' });
}

module.exports = { buildEbookPdf };
