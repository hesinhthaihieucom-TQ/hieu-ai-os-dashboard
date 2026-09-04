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
// Nội dung mẫu ĐỦ DÀI, nhiều đoạn (2026-09-04, Quỳnh: "nội dung viết bị hơi hợt ngắn gọn quá") — mục
// đích màn này là xem BỐ CỤC/MÀU, nên mẫu phải đủ dài để mô phỏng đúng cách 1 đoạn nội dung thật (viết
// theo nguyên tắc "không giới hạn số từ, đào tới gốc rễ" ở api/xay-dung-noi-dung.js) chảy qua khối
// ví dụ/bài tập/tóm tắt — 1 câu ngắn trước đây không đủ để thấy layout thật sự trông ra sao.
const DEMO_SECTIONS = {
  1: {
    viet: {
      noi_dung: 'Đây là đoạn văn mẫu để bạn xem trước màu sắc và bố cục — nội dung thật trong sản phẩm của bạn sẽ dài và sâu hơn nhiều so với đoạn này, đây chỉ là ví dụ minh hoạ cách chữ chảy qua trang.\n\nMột đoạn nội dung thật thường bắt đầu bằng việc gọi tên đúng vấn đề người đọc đang gặp, sau đó đào sâu xuống GỐC RỄ thay vì chỉ dừng ở triệu chứng bề mặt — vì sao vấn đề này thật sự tồn tại, không phải chỉ mô tả nó. Mỗi luận điểm chính đi kèm ít nhất 1 ví dụ điển hình thật, đặt ngay tại chỗ đó chứ không dồn hết ví dụ về cuối bài.\n\nCuối cùng, nội dung thường vẽ rõ bức tranh "trước/sau" — sẽ khác thế nào nếu người đọc áp dụng đúng phần này — và chủ động trả lời trước những câu hỏi/phản bác người đọc có thể nghĩ tới khi đọc đến đây, thay vì để họ tự tìm câu trả lời.',
      vi_du: 'Đây là 1 ví dụ minh hoạ mẫu, hiện trong khối "Ví dụ" viền màu — trong sản phẩm thật, đây sẽ là 1 câu chuyện/tình huống cụ thể gắn với đúng đối tượng của bạn.',
      bai_tap: 'Đây là 1 bài tập mẫu, hiện trong khối "Bài tập" nền màu đậm — trong sản phẩm thật, đây sẽ là 1 checklist hoặc câu hỏi có chỗ trống để người đọc tự điền, làm được ngay không cần giải thích thêm.',
      tom_tat_3_y: ['Điều cần nhớ thứ nhất — tóm gọn trong 1 câu', 'Điều cần nhớ thứ hai — tóm gọn trong 1 câu', 'Điều cần nhớ thứ ba — tóm gọn trong 1 câu'],
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
