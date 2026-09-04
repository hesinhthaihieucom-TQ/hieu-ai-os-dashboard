// Sản Phẩm Số — xuất TỪNG BÀI HỌC riêng cho sản phẩm dinh_dang='mini_course' (mỗi phần trong outline
// cấp 2 → 1 file PDF, 1 link tải riêng — khớp đúng mini_course_lessons[].link mà "Sản phẩm của tôi"
// và trang mua đã hỗ trợ sẵn từ trước, xem san-pham-so/js/danh-sach-san-pham.js).
//
// KHÔNG dùng Heyzine ở đây (khác với api/san-pham-so-xuat-ebook.js) — tài khoản Heyzine free của
// Quỳnh chỉ có ĐÚNG 5 flipbook cho CẢ APP (xem api/_lib/heyzine.js), 1 khoá học 5-7 bài sẽ nuốt gần
// hết quota đó chỉ trong 1 sản phẩm. Thay vào đó ký link Storage với hạn RẤT DÀI (10 năm) để đóng vai
// trò link "vĩnh viễn" — cùng mức độ bảo mật với link Heyzine hiện tại (đường dẫn ngẫu nhiên khó đoán,
// công khai một khi đã biết link, không có kiểm soát truy cập theo từng người mua — đúng model đã
// chấp nhận sẵn cho mọi link giao hàng dạng "link ngoài" trong app này).
const crypto = require('crypto');
const { requireUser } = require('./_lib/auth');
const { SUPABASE_URL } = require('./_lib/supabase-admin');
const { buildEbookPdf } = require('./_lib/pdf-ebook');

const LONG_EXPIRY_SECONDS = 315360000; // 10 năm — trong giới hạn an toàn của epoch số nguyên 32-bit

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const user = await requireUser(req);
  if (!user) { res.status(401).json({ error: 'Chưa đăng nhập.' }); return; }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) { res.status(500).json({ error: 'Server chưa cấu hình SUPABASE_SERVICE_ROLE_KEY.' }); return; }

  try {
    const { idea, outline2, sections, index, theme } = req.body || {};
    if (!idea || !outline2 || index == null) { res.status(400).json({ error: 'Thiếu thông tin bài học.' }); return; }

    const pdfBuffer = await buildEbookPdf({ idea, outline2, sections: sections || {}, onlyIndex: index, lessonCover: true, theme });

    const path = `mini-course-lessons/${user.id}-${index}-${crypto.randomBytes(6).toString('hex')}.pdf`;
    const uploadResp = await fetch(`${SUPABASE_URL}/storage/v1/object/digital-products/${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/pdf', apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      body: pdfBuffer,
    });
    if (!uploadResp.ok) { res.status(500).json({ error: 'Không tải PDF lên được — thử lại giúp mình.' }); return; }

    const signResp = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/digital-products/${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({ expiresIn: LONG_EXPIRY_SECONDS }),
    });
    if (!signResp.ok) { res.status(500).json({ error: 'Không tạo được link cho bài học — thử lại giúp mình.' }); return; }
    const signData = await signResp.json();
    const fileLabel = `${(idea.ten_san_pham || 'bai-hoc')}.pdf`;
    const link = `${SUPABASE_URL}/storage/v1${signData.signedURL}&download=${encodeURIComponent(fileLabel)}`;

    res.status(200).json({ index, link, storagePath: path });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Có lỗi xảy ra khi xuất bài học.' });
  }
};
