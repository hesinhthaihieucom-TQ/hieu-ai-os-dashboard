// Dựng file PDF ebook từ nội dung Giai đoạn 2 (Xây Dựng Nội Dung) — trang bìa + Mở đầu + từng Phần
// + Kết. Font mặc định của pdfkit (Helvetica...) KHÔNG có dấu tiếng Việt — PHẢI nhúng font TTF thật
// (Be Vietnam Pro, cùng font web đang dùng, OFL) qua doc.font(...), không dùng tên font chuẩn nào.
const path = require('path');
const PDFDocument = require('pdfkit');

const FONT_REGULAR = path.join(__dirname, 'fonts', 'BeVietnamPro-Regular.ttf');
const FONT_BOLD = path.join(__dirname, 'fonts', 'BeVietnamPro-Bold.ttf');

// Nội dung 1 phần: ưu tiên bản đã review+chỉnh (chất lượng cao nhất), sau đó bản nháp đã viết, cuối
// cùng nếu phần đó CHƯA viết gì thì hiện outline thô (không để trống hẳn, vẫn xuất được file ngay
// cả khi chưa viết xong hết — đúng tinh thần không chặn người dùng).
function sectionBody(section, outlineItem) {
  if (section && section.review && section.review.ban_da_chinh) return section.review.ban_da_chinh;
  if (section && section.viet && section.viet.noi_dung) return section.viet.noi_dung;
  const bullets = (outlineItem.noi_dung_con || []).map((n) => `• ${n}`).join('\n');
  return `[Phần này chưa viết nội dung đầy đủ — mới có outline]\n\n${bullets}`;
}

// Bài tập THẬT đã viết (section.viet.bai_tap — đúng bài tập hiện trong hộp "Bài tập" trên web, có
// thể đã được AI viết chi tiết hơn bản gợi ý) — chỉ rơi về bài tập GỢI Ý ở outline (outlineItem.bai_tap)
// khi phần đó CHƯA viết gì. Lỗi cũ: PDF luôn lấy bài tập gợi ý ở outline dù phần đã viết xong, khiến
// bản xuất ra khác với những gì người dùng thấy/sửa trên web (Quỳnh hỏi 2026-09-01).
function sectionBaiTap(section, outlineItem) {
  if (section && section.viet && section.viet.bai_tap) return section.viet.bai_tap;
  return outlineItem.bai_tap || null;
}

function addSectionPage(doc, titleLabel, item, body, baiTap, section) {
  doc.addPage();
  doc.font(FONT_BOLD).fontSize(11).fillColor('#5B5F55').text(titleLabel.toUpperCase(), { characterSpacing: 0.5 });
  doc.moveDown(0.3);
  doc.font(FONT_BOLD).fontSize(20).fillColor('#1E2420').text(item.tieu_de || '');
  doc.moveDown(1);
  doc.font(FONT_REGULAR).fontSize(12).fillColor('#1E2420').text(body, { lineGap: 4 });
  if (baiTap) {
    doc.moveDown(1.2);
    doc.font(FONT_BOLD).fontSize(12).fillColor('#2F6F62').text('Bài tập:');
    doc.font(FONT_REGULAR).fontSize(12).fillColor('#1E2420').text(baiTap, { lineGap: 4 });
  }
  // tom_tat_3_y chỉ có ở các phần đã viết bằng AI SAU khi field này ra đời (2026-09-01) — phần cũ
  // hoặc phần chưa viết (chỉ có outline) sẽ không có, bỏ qua khối này, không lỗi.
  const tomTat = section && section.viet && section.viet.tom_tat_3_y;
  if (tomTat && tomTat.length) {
    doc.moveDown(1.2);
    doc.font(FONT_BOLD).fontSize(12).fillColor('#2F6F62').text('3 điều cần nhớ:');
    doc.font(FONT_REGULAR).fontSize(12).fillColor('#1E2420').text(tomTat.map((t, i) => `${i + 1}. ${t}`).join('\n'), { lineGap: 4 });
  }
}

// idea: {ten_san_pham, doi_tuong, dinh_dang, do_dai_uoc_luong}
// outline2: {mo_dau, phan:[...], ket} (kết quả bước outline cấp 2)
// sections: {[index]: {nghien_cuu, viet, review, status}} — index khớp ĐÚNG vị trí trong mảng PHẲNG
// [mo_dau, ...phan, ket] (0 = mo_dau, 1..n = phan, cuối cùng = ket) — Mở đầu/Kết CŨNG đi qua đúng
// luồng nghiên cứu→viết→review như mọi phần khác trong san-pham-so/js/xay-dung-noi-dung.js
// (flattenSections()), không phải chỉ có outline suông — phải dùng chung 1 cách đánh index.
//
// onlyIndex (tuỳ chọn): chỉ dựng PDF cho ĐÚNG 1 phần (dùng cho xuất từng bài học của mini_course,
// xem api/san-pham-so-xuat-bai-hoc.js) — trang bìa đổi thành tiêu đề của riêng phần đó thay vì tên
// cả sản phẩm.
function buildEbookPdf({ idea, outline2, sections, onlyIndex }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margins: { top: 70, bottom: 70, left: 60, right: 60 } });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const flat = [
      { kind: 'Mở đầu', item: outline2.mo_dau },
      ...(outline2.phan || []).map((p) => ({ kind: 'Phần', item: p })),
      { kind: 'Kết', item: outline2.ket },
    ];

    // Trang bìa
    if (onlyIndex != null && flat[onlyIndex] && flat[onlyIndex].item) {
      doc.font(FONT_BOLD).fontSize(26).fillColor('#1E2420').text(flat[onlyIndex].item.tieu_de || '', { align: 'center' });
      doc.moveDown(0.8);
      doc.font(FONT_REGULAR).fontSize(13).fillColor('#5B5F55').text(`Bài học trong khoá: ${idea.ten_san_pham || ''}`, { align: 'center' });
    } else {
      doc.font(FONT_BOLD).fontSize(30).fillColor('#1E2420').text(idea.ten_san_pham || '', { align: 'center' });
      doc.moveDown(1);
      if (idea.doi_tuong) {
        doc.font(FONT_REGULAR).fontSize(13).fillColor('#5B5F55').text(`Dành cho: ${idea.doi_tuong}`, { align: 'center' });
      }
    }

    const entries = onlyIndex != null ? [[onlyIndex, flat[onlyIndex]]] : flat.map((e, i) => [i, e]);
    entries.forEach(([index, entry]) => {
      if (!entry || !entry.item) return;
      const body = sectionBody(sections[index], entry.item);
      const baiTap = sectionBaiTap(sections[index], entry.item);
      addSectionPage(doc, entry.kind, entry.item, body, baiTap, sections[index]);
    });

    doc.end();
  });
}

module.exports = { buildEbookPdf };
