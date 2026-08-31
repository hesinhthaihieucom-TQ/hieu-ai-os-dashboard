// Serverless function — "Làm lại cả tuần" ở Lịch Đăng Bài (lane Fanpage), theo yêu cầu chị Quỳnh
// 2026-08-28: xoá hết bài đã lên lịch Fanpage trong 1 tuần cụ thể rồi viết lại từ đầu (áp prompt case
// study mới nhất) — thay vì phải tự bấm "Xoá" từng ô rồi đợi cron mỗi ngày lấp dần từng ngày một.
//
// Tái dùng ĐÚNG logic viết bài của cron api/cron/auto-fill-schedule.js (fillSlotsForAdmin — export
// thêm ở cuối file đó) — không viết lại prompt/luồng chọn case study/hook-content ở đây, tránh 2 nơi
// lệch nhau theo thời gian.
//
// Chỉ admin (đúng chị Quỳnh, giống toàn bộ tính năng auto-đăng Fanpage) — xác thực bằng session +
// kiểm tra role, KHÔNG dùng CRON_SECRET (đây là hành động chị tự bấm từ UI, không phải cron tự chạy).
const { requireUser } = require('./_lib/auth');
const { supabaseAdmin } = require('./_lib/supabase-admin');
const { fillSlotsForAdmin, FANPAGE_DAILY_SLOT } = require('./cron/auto-fill-schedule');

const MAX_DAYS = 14; // chặn trên hợp lý — 1 tuần là 7, cho dư ra phòng khi chị chọn khoảng dài hơn
// "bấm nút ai tự động trên lịch là ko làm đc nha, lỗi hoài. cứ phải bấm cron" (chị Quỳnh 2026-08-31)
// — ĐÚNG, bug thật: trước đây viết TUẦN TRỌN VẸN (7 ngày) trong 1 lần gọi, MỖI ngày cần ít nhất 2 lượt
// gọi AI tuần tự (CORE + EXTRAS, nhiều hơn nếu là case study) — 7 ngày dễ vượt quá 300s (maxDuration ở
// vercel.json) nên request timeout/lỗi gần như luôn luôn. Cron KHÔNG bị vì chỉ lấp tối đa
// MAX_FILL_PER_RUN=3 ô/lần, chạy lại mỗi 3 tiếng — cùng logic viết bài, chỉ khác BATCH SIZE mỗi lần
// gọi. Giờ giới hạn y hệt cron, xử lý phần còn lại nếu client tự gọi lại (xem lich-dang.js).
const MAX_REGEN_PER_CALL = 3;

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const user = await requireUser(req);
  if (!user) { res.status(401).json({ error: 'Bạn cần đăng nhập để dùng tính năng này.' }); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'Server chưa được cấu hình ANTHROPIC_API_KEY.' }); return; }

  try {
    const profResp = await supabaseAdmin(`profiles?id=eq.${user.id}&select=role`);
    const profRows = profResp.ok ? await profResp.json() : [];
    if (!profRows[0] || profRows[0].role !== 'admin') {
      res.status(403).json({ error: 'Chỉ quản trị viên mới dùng được tính năng này.' });
      return;
    }

    const { dates } = req.body || {};
    if (!Array.isArray(dates) || !dates.length || dates.length > MAX_DAYS) {
      res.status(400).json({ error: `Thiếu danh sách ngày, hoặc quá ${MAX_DAYS} ngày/lần.` });
      return;
    }
    if (!dates.every((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))) {
      res.status(400).json({ error: 'Định dạng ngày không hợp lệ.' });
      return;
    }

    // Chỉ xử lý tối đa MAX_REGEN_PER_CALL ngày/lần gọi (xem lý do ở khai báo hằng số) — phần còn lại
    // trả về remaining_dates, client tự gọi lại cho tới hết (xem regenFanpageWeek() ở lich-dang.js).
    const batch = dates.slice(0, MAX_REGEN_PER_CALL);
    const remaining = dates.slice(MAX_REGEN_PER_CALL);

    // Xoá hết bài Fanpage đã lên lịch trong đúng những ngày CỦA ĐỢT NÀY — post gốc ở bảng posts KHÔNG
    // bị xoá (chỉ gỡ khỏi lịch), vẫn còn nguyên trong Kho Content ("Bài đã viết"), không mất dữ liệu.
    await supabaseAdmin(
      `calendar_entries?user_id=eq.${user.id}&channel=eq.fanpage&scheduled_date=in.(${batch.join(',')})`,
      { method: 'DELETE', prefer: 'return=minimal' }
    );

    const slotInfos = batch.map((dateStr) => ({ dateStr, slot: FANPAGE_DAILY_SLOT }));
    const result = await fillSlotsForAdmin(user, apiKey, slotInfos);
    res.status(200).json({ ok: true, ...result, remaining_dates: remaining });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Có lỗi xảy ra khi làm lại lịch tuần.' });
  }
};
