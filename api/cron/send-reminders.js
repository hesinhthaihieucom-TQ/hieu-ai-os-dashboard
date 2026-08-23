// Cron job (xem "crons" trong vercel.json, chạy mỗi 15 phút) — quét 3 loại lịch cần nhắc và gửi
// Web Push cho đúng người: (1) đến giờ đăng bài (calendar_entries), (2) đã đăng được 3h/6h/24h,
// nhắc vào Đẩy Bài kiểm tra view (Đẩy Bài tính theo lượt view chứ không theo giờ, nên đây là 1 lớp
// nhắc THEO THỜI GIAN mới, độc lập với mốc view thật), (3) đến giờ công việc content
// (recording_schedule — tên bảng vẫn giữ "recording" trong code, nhưng hiển thị cho người dùng là
// "lịch công việc content" nói chung, không riêng buổi quay, đổi 23/8 theo phản hồi chị Quỳnh).
// Theo yêu cầu chị Quỳnh 2026-08-21.
//
// Mỗi loại dùng 1 CỬA SỔ THỜI GIAN ~25 phút (rộng hơn khoảng cách 15 phút giữa 2 lần cron 1 chút,
// chống bỏ sót nếu cron chạy trễ) để xác định "vừa tới lúc cần nhắc" — qua khỏi cửa sổ đó tự động
// hết khớp, không cần cờ "đã xử lý" riêng cho việc NÀY (chỉ cần notification_log chống gửi trùng
// nếu lỡ khớp 2 lần trong cùng cửa sổ do cron chạy dồn).
const { supabaseAdmin } = require('../_lib/supabase-admin');
const { notifyOnce, vapidConfigured } = require('../_lib/push');

const WINDOW_MINUTES = 25;
// Giờ mặc định nếu user chưa từng đổi (chưa chạy migrate/tài khoản cũ) — PHẢI khớp tay với default
// ở cột profiles.slot_time_* trong schema_full.sql. Từ 2026-08-21, mỗi user TỰ CHỌN giờ riêng ở
// Tài khoản (nhan-hieu/js/tai-khoan.js) — không còn 1 giờ chung cho tất cả.
const DEFAULT_SLOT_TIME = { sang: '08:00', trua: '12:00', toi: '19:00' };
const DAYBAI_MILESTONES_H = [3, 6, 24];

// 'HH:MM' -> số phút trong ngày. Bỏ qua giá trị hỏng (không đúng dạng) bằng cách coi như NaN,
// withinWindow() với NaN luôn trả false nên không bao giờ khớp — an toàn, không throw.
function parseHHMM(s) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s || '');
  if (!m) return NaN;
  return Number(m[1]) * 60 + Number(m[2]);
}

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

  // Giờ có 3 tầng ưu tiên: giờ riêng của ĐÚNG bài đó (calendar_entries.scheduled_time, đặt trong
  // Lịch Đăng Bài) → giờ mặc định của user theo slot (profiles.slot_time_*) → giờ mặc định chung.
  // Không lọc được ngay ở query vì giờ khác nhau theo từng bài/từng user — phải lấy hết ứng viên
  // trong ngày rồi tự tính từng dòng.
  const entriesResp = await supabaseAdmin(
    `calendar_entries?posted=eq.false&scheduled_date=eq.${dateStr}&select=id,user_id,title,slot,scheduled_time`
  );
  const entries = entriesResp.ok ? await entriesResp.json() : [];
  if (!entries.length) return 0;

  const userIds = [...new Set(entries.map((e) => e.user_id))];
  const profilesResp = await supabaseAdmin(
    `profiles?id=in.(${userIds.join(',')})&select=id,slot_time_sang,slot_time_trua,slot_time_toi`
  );
  const profiles = profilesResp.ok ? await profilesResp.json() : [];
  const profileById = Object.fromEntries(profiles.map((p) => [p.id, p]));

  let count = 0;
  for (const entry of entries) {
    const p = profileById[entry.user_id];
    const slotTime = entry.scheduled_time || (p && p['slot_time_' + entry.slot]) || DEFAULT_SLOT_TIME[entry.slot];
    if (!withinWindow(parseHHMM(slotTime), minutesOfDay)) continue;
    const result = await notifyOnce(entry.user_id, `lich:${entry.id}`, {
      title: 'Đến giờ đăng bài rồi',
      body: entry.title ? `"${entry.title}" đang chờ bạn đăng.` : 'Có bài đã lên lịch cần đăng ngay bây giờ.',
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
    `recording_schedule?done=eq.false&scheduled_at=lte.${encodeURIComponent(nowIso)}&scheduled_at=gt.${encodeURIComponent(windowStartIso)}&select=id,user_id,title`
  );
  const rows = resp.ok ? await resp.json() : [];
  let count = 0;
  for (const row of rows) {
    const result = await notifyOnce(row.user_id, `quay:${row.id}`, {
      title: 'Đến giờ công việc content rồi',
      body: row.title ? `"${row.title}" đã đến giờ.` : 'Đã đến lịch công việc content bạn đặt.',
      url: '/nhan-hieu/#lich-dang',
    });
    if (result.sent) count++;
  }
  return count;
}

// Báo admin ngay khi có người đăng ký mới (2026-08-21, theo yêu cầu chị Quỳnh: "khi có ai đăng ký
// mới thì app sẽ báo cho e") — quét profiles.created_at trong cùng cửa sổ ~25 phút như các loại
// nhắc khác, gửi cho MỌI admin (role='admin') đang có đăng ký thông báo, không chỉ 1 người cố định.
async function checkNewSignups() {
  const windowStartIso = new Date(Date.now() - WINDOW_MINUTES * 60000).toISOString();
  const [signupsResp, adminsResp] = await Promise.all([
    supabaseAdmin(`profiles?role=eq.student&created_at=gte.${encodeURIComponent(windowStartIso)}&select=id,email,full_name,created_at`),
    supabaseAdmin(`profiles?role=eq.admin&select=id`),
  ]);
  const signups = signupsResp.ok ? await signupsResp.json() : [];
  const admins = adminsResp.ok ? await adminsResp.json() : [];
  if (!signups.length || !admins.length) return 0;

  let count = 0;
  for (const signup of signups) {
    const who = signup.full_name ? `${signup.full_name} (${signup.email || ''})` : (signup.email || 'Người dùng mới');
    for (const admin of admins) {
      const result = await notifyOnce(admin.id, `signup:${signup.id}:${admin.id}`, {
        title: 'Có người đăng ký mới',
        body: `${who} vừa tạo tài khoản — vào Quản trị để xem.`,
        url: '/nhan-hieu/#quan-tri-hub',
      });
      if (result.sent) count++;
    }
  }
  return count;
}

// Đẩy push cho MỌI người đã bật thông báo khi có thông báo tính năng mới (2026-08-22, theo yêu cầu
// chị Quỳnh: "trên app của khách cũng hiện thông báo") — khác checkNewSignups() ở trên (chỉ báo
// admin), cái này báo TẤT CẢ user, nên lấy thẳng danh sách user_id có trong push_subscriptions thay
// vì quét toàn bộ profiles — ai chưa từng bật thông báo thì không có bản ghi, tự động bỏ qua, không
// tốn công gọi notifyOnce cho người chắc chắn không nhận được gì.
async function checkNewAnnouncements() {
  const windowStartIso = new Date(Date.now() - WINDOW_MINUTES * 60000).toISOString();
  const [annResp, subsResp] = await Promise.all([
    supabaseAdmin(`feature_announcements?created_at=gte.${encodeURIComponent(windowStartIso)}&select=id,title,body,created_at&order=created_at.asc`),
    supabaseAdmin(`push_subscriptions?select=user_id`),
  ]);
  const announcements = annResp.ok ? await annResp.json() : [];
  if (!announcements.length) return 0;
  const subs = subsResp.ok ? await subsResp.json() : [];
  const userIds = [...new Set(subs.map((s) => s.user_id))];
  if (!userIds.length) return 0;

  let count = 0;
  for (const ann of announcements) {
    for (const userId of userIds) {
      const result = await notifyOnce(userId, `announce:${ann.id}:${userId}`, {
        title: '🎉 Tính năng mới: ' + ann.title,
        body: ann.body,
        url: '/nhan-hieu/#trang-chu',
      });
      if (result.sent) count++;
    }
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
    const [lich, daybai, quay, signups, announcements] = await Promise.all([
      checkLichDangBai(),
      checkDayBaiCheckpoints(),
      checkRecordingSchedule(),
      checkNewSignups(),
      checkNewAnnouncements(),
    ]);
    res.status(200).json({ ok: true, sent: { lich_dang_bai: lich, day_bai: daybai, quay_content: quay, new_signups: signups, announcements } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};
