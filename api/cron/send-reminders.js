// Cron job (xem "crons" trong vercel.json, chạy mỗi 15 phút) — quét 3 loại lịch cần nhắc và gửi
// Web Push cho đúng người: (1) đến giờ đăng bài (calendar_entries), (2) đã đăng được 3h/6h/24h,
// nhắc vào Đẩy Bài kiểm tra view (Đẩy Bài tính theo lượt view chứ không theo giờ, nên đây là 1 lớp
// nhắc THEO THỜI GIAN mới, độc lập với mốc view thật), (3) đến giờ quay content (recording_schedule).
// Theo yêu cầu chị Quỳnh 2026-08-21.
//
// Mỗi loại dùng 1 CỬA SỔ THỜI GIAN ~25 phút (rộng hơn khoảng cách 15 phút giữa 2 lần cron 1 chút,
// chống bỏ sót nếu cron chạy trễ) để xác định "vừa tới lúc cần nhắc" — qua khỏi cửa sổ đó tự động
// hết khớp, không cần cờ "đã xử lý" riêng cho việc NÀY (chỉ cần notification_log chống gửi trùng
// nếu lỡ khớp 2 lần trong cùng cửa sổ do cron chạy dồn).
const { supabaseAdmin } = require('../_lib/supabase-admin');
const { notifyOnce, vapidConfigured } = require('../_lib/push');

const WINDOW_MINUTES = 25;
const SLOT_HOURS = { sang: 8, trua: 12, toi: 19 }; // giờ Việt Nam (UTC+7), cố định, không lệch DST
const DAYBAI_MILESTONES_H = [3, 6, 24];

function vnNowParts() {
  const vn = new Date(Date.now() + 7 * 3600 * 1000);
  return { dateStr: vn.toISOString().slice(0, 10), minutesOfDay: vn.getUTCHours() * 60 + vn.getUTCMinutes() };
}

function withinWindow(targetMinutesOfDay, nowMinutesOfDay) {
  const diff = nowMinutesOfDay - targetMinutesOfDay;
  return diff >= 0 && diff < WINDOW_MINUTES;
}

async function checkLichDangBai() {
  const { dateStr, minutesOfDay } = vnNowParts();
  const eligibleSlots = Object.entries(SLOT_HOURS)
    .filter(([, h]) => withinWindow(h * 60, minutesOfDay))
    .map(([k]) => k);
  if (!eligibleSlots.length) return 0;

  const resp = await supabaseAdmin(
    `calendar_entries?posted=eq.false&scheduled_date=eq.${dateStr}&slot=in.(${eligibleSlots.join(',')})&select=id,user_id,title`
  );
  const rows = resp.ok ? await resp.json() : [];
  let count = 0;
  for (const row of rows) {
    const result = await notifyOnce(row.user_id, `lich:${row.id}`, {
      title: 'Đến giờ đăng bài rồi',
      body: row.title ? `"${row.title}" đang chờ bạn đăng.` : 'Có bài đã lên lịch cần đăng ngay bây giờ.',
      url: '/nhan-hieu/#lich-dang',
    });
    if (result.sent) count++;
  }
  return count;
}

async function checkDayBaiCheckpoints() {
  const lookbackIso = new Date(Date.now() - 30 * 3600 * 1000).toISOString();
  const resp = await supabaseAdmin(
    `calendar_entries?posted=eq.true&posted_at=not.is.null&posted_at=gte.${encodeURIComponent(lookbackIso)}&select=id,user_id,title,posted_at`
  );
  const rows = resp.ok ? await resp.json() : [];
  let count = 0;
  for (const row of rows) {
    const elapsedH = (Date.now() - new Date(row.posted_at).getTime()) / 3600000;
    for (const milestone of DAYBAI_MILESTONES_H) {
      if (elapsedH >= milestone && elapsedH < milestone + WINDOW_MINUTES / 60) {
        const result = await notifyOnce(row.user_id, `daybai:${row.id}:${milestone}h`, {
          title: `Đã đăng được ${milestone} giờ`,
          body: row.title ? `Vào Đẩy Bài kiểm tra view bài "${row.title}" đã đạt mốc nào chưa.` : 'Vào Đẩy Bài kiểm tra view đã đạt mốc nào chưa.',
          url: '/nhan-hieu/#day-bai',
        });
        if (result.sent) count++;
      }
    }
  }
  return count;
}

async function checkRecordingSchedule() {
  const nowIso = new Date().toISOString();
  const windowStartIso = new Date(Date.now() - WINDOW_MINUTES * 60000).toISOString();
  const resp = await supabaseAdmin(
    `recording_schedule?scheduled_at=lte.${encodeURIComponent(nowIso)}&scheduled_at=gt.${encodeURIComponent(windowStartIso)}&select=id,user_id,title`
  );
  const rows = resp.ok ? await resp.json() : [];
  let count = 0;
  for (const row of rows) {
    const result = await notifyOnce(row.user_id, `quay:${row.id}`, {
      title: 'Đến giờ quay content rồi',
      body: row.title ? `Lịch quay "${row.title}" đã đến giờ.` : 'Đã đến lịch quay content bạn đặt.',
      url: '/nhan-hieu/#lich-dang',
    });
    if (result.sent) count++;
  }
  return count;
}

module.exports = async (req, res) => {
  // Vercel Cron tự thêm header này khi biến môi trường CRON_SECRET được cấu hình — chặn người
  // ngoài gọi thẳng URL này để spam thông báo.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers['authorization'] || '';
    if (auth !== `Bearer ${secret}`) { res.status(401).json({ error: 'unauthorized' }); return; }
  }
  if (!vapidConfigured()) { res.status(200).json({ ok: false, reason: 'VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY chưa được cấu hình.' }); return; }

  try {
    const [lich, daybai, quay] = await Promise.all([
      checkLichDangBai(),
      checkDayBaiCheckpoints(),
      checkRecordingSchedule(),
    ]);
    res.status(200).json({ ok: true, sent: { lich_dang_bai: lich, day_bai: daybai, quay_content: quay } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};
