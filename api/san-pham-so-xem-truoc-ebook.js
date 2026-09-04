// Sản Phẩm Số — xem trước MÀU/BỐ CỤC ebook (2026-09-04). KHÔNG gọi AI ảnh (khác api/san-pham-so-tao-bia-ebook.js)
// — chỉ dựng 1 file PDF nhỏ (bìa + 1 trang mẫu) bằng pdfkit thuần với nội dung demo cố định, để đổi
// màu/preset là xem lại được ngay, miễn phí, không tốn lượt AI. Nếu đã có sẵn ảnh bìa (đã tạo bằng AI
// hoặc đã tải lên), truyền kèm để xem đúng bìa thật + màu mới cùng lúc.
const { requireUser } = require('./_lib/auth');
const { buildEbookPdf } = require('./_lib/pdf-ebook');

const DEMO_OUTLINE2 = {
  mo_dau: { tieu_de: 'Mở đầu', noi_dung_con: ['Giới thiệu'] },
  phan: [{ tieu_de: 'Ví dụ minh hoạ 1 phần nội dung', noi_dung_con: ['Ý chính'] }],
  ket: { tieu_de: 'Kết', noi_dung_con: ['Tổng kết'] },
};
const DEMO_SECTIONS = {
  1: {
    viet: {
      noi_dung: 'Đây là đoạn nội dung mẫu để xem trước màu sắc và bố cục — mỗi phần thật trong sản phẩm của bạn sẽ hiện đúng theo đúng kiểu này khi xuất file.',
      vi_du: 'Đây là 1 ví dụ minh hoạ mẫu, hiện trong khối "Ví dụ" viền màu.',
      bai_tap: 'Đây là 1 bài tập mẫu, hiện trong khối "Bài tập" nền màu đậm.',
      tom_tat_3_y: ['Điều cần nhớ thứ nhất', 'Điều cần nhớ thứ hai', 'Điều cần nhớ thứ ba'],
    },
  },
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const user = await requireUser(req);
  if (!user) { res.status(401).json({ error: 'Chưa đăng nhập.' }); return; }

  try {
    const { ten_san_pham, doi_tuong, theme, coverImageDataUrl, coverHasBakedText } = req.body || {};
    let coverImageBuffer = null;
    if (coverImageDataUrl) {
      const base64 = String(coverImageDataUrl).split(',')[1] || '';
      coverImageBuffer = Buffer.from(base64, 'base64');
    }
    const idea = { ten_san_pham: ten_san_pham || 'Tên sản phẩm của bạn', doi_tuong: doi_tuong || null };
    const buf = await buildEbookPdf({
      idea, outline2: DEMO_OUTLINE2, sections: DEMO_SECTIONS, onlyIndex: 1,
      theme, coverImageBuffer, coverHasBakedText: !!coverHasBakedText,
    });
    res.status(200).json({ pdfBase64: buf.toString('base64') });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Có lỗi xảy ra khi dựng bản xem trước.' });
  }
};
