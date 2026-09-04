// Sản Phẩm Số — "🎨 Tạo bìa bằng AI" (2026-09-04). Sinh 1 ảnh bìa ebook chuyên nghiệp qua gpt-image-1
// (xem api/_lib/ebook-cover.js — dùng lại đúng pipeline đang chạy thật cho ảnh bài Fanpage bên
// nhan-hieu). TÁCH RIÊNG khỏi api/san-pham-so-xuat-ebook.js có chủ đích — sinh 1 lần, người dùng tự
// lưu lại kết quả (client gọi saveIdeaResult ngay sau khi nhận response), chỉ sinh lại khi bấm "Tạo
// lại" (tốn phí thật gpt-image-1 mỗi lần gọi, không tự động sinh lại mỗi lần mở trang/xuất ebook).
const sharp = require('sharp');
const { requireUser } = require('./_lib/auth');
const { checkAndConsumeSpsQuota, refundSpsQuota } = require('./_lib/sps-ai-quota');
const { generateEbookCover } = require('./_lib/ebook-cover');

const ACTION_KEY = 'san-pham-so-tao-bia-ebook';
// Nén lại sau khi sinh — khổ gốc 1024x1536 dư thừa cho A4 (~826x1169px @144dpi), giảm còn ~800x1200
// đủ nét khi in vào PDF mà lưu base64 trong jsonb đỡ nặng hơn (đúng tinh thần "ảnh nhỏ base64" đã
// dùng khắp app này, xem san-pham-so/js/util.js compressImageToDataUrl — chỉ khác đây là nén phía
// server vì ảnh sinh phía server, không phải người dùng tự upload).
const STORE_W = 800, STORE_H = 1200;

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const user = await requireUser(req);
  if (!user) { res.status(401).json({ error: 'Chưa đăng nhập.' }); return; }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'Server chưa cấu hình OPENAI_API_KEY.' }); return; }

  const { ten_san_pham, doi_tuong, moodPreset } = req.body || {};
  if (!ten_san_pham) { res.status(400).json({ error: 'Thiếu tên sản phẩm.' }); return; }

  const quotaError = await checkAndConsumeSpsQuota(user.id, ACTION_KEY);
  if (quotaError) { res.status(402).json({ error: quotaError, quotaExceeded: true }); return; }

  try {
    const topic = doi_tuong ? `${ten_san_pham} — dành cho ${doi_tuong}` : ten_san_pham;
    const coverBuffer = await generateEbookCover({
      apiKey, moodPresetKey: moodPreset, topic, title: ten_san_pham, subtitle: doi_tuong || null,
    });
    const stored = await sharp(coverBuffer).resize(STORE_W, STORE_H, { fit: 'cover' }).jpeg({ quality: 78 }).toBuffer();
    const coverImageDataUrl = `data:image/jpeg;base64,${stored.toString('base64')}`;
    res.status(200).json({ coverImageDataUrl });
  } catch (err) {
    await refundSpsQuota(user.id, ACTION_KEY);
    res.status(500).json({ error: err.message || 'Có lỗi xảy ra khi tạo bìa.' });
  }
};
