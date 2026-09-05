// Cron job (xem "crons" trong vercel.json, chạy mỗi 15 phút) — quét 3 loại lịch cần nhắc và gửi
// Web Push cho đúng người: (1) đến giờ đăng bài (calendar_entries), (2) đã đăng được 3h/6h/24h,
// nhắc vào Đẩy Bài kiểm tra view (Đẩy Bài tính theo lượt view chứ không theo giờ, nên đây là 1 lớp
// nhắc THEO THỜI GIAN mới, độc lập với mốc view thật), (3) đến giờ công việc content
// (recording_schedule — tên bảng vẫn giữ "recording" trong code, nhưng hiển thị cho người dùng là
// "lịch công việc content" nói chung, không riêng buổi quay, đổi 23/8 theo phản hồi chị Quỳnh),
// (4) dùng thử sắp hết hạn (24h trước) hoặc vừa hết hạn (checkTrialEnding, thêm 23/8), (5) đã xong
// Định Vị 12h mà chưa thử "AI tự viết + xếp cả tuần" (checkAutoFillNudge, thêm 29/8 — tối ưu chuyển
// đổi dùng thử → mua gói), (6) khách CRM (Trợ Lý AI Tư Vấn & CRM) đến hạn/quá hạn follow hôm nay
// (checkCrmFollowReminders, thêm 29/8 — "AI có tự đặt lịch thông báo đến ngày follow khách được
// không", theo yêu cầu chị Quỳnh), (7) bản tin sức khỏe mỗi ngày cho khách app Hiểu Để Khoẻ Mạnh đã
// được gán gói (checkSucKhoeDailyTip, thêm 31/8 theo yêu cầu chị Quỳnh), (8) nhắc ghi thu chi cho
// khách Sổ Dòng Tiền Tâm Thức, tuỳ tần suất họ tự chọn — hằng ngày 20h hoặc hằng tuần Chủ Nhật 19h
// (checkTaiChinhLogReminder, thêm 1/9 — chị Quỳnh phản ánh khách vào từ link Facebook làm xong bài
// test rồi thoát, không quay lại ghi chép đều).
// Theo yêu cầu chị Quỳnh 2026-08-21.
//
// Mỗi loại dùng 1 CỬA SỔ THỜI GIAN ~25 phút (rộng hơn khoảng cách 15 phút giữa 2 lần cron 1 chút,
// chống bỏ sót nếu cron chạy trễ) để xác định "vừa tới lúc cần nhắc" — qua khỏi cửa sổ đó tự động
// hết khớp, không cần cờ "đã xử lý" riêng cho việc NÀY (chỉ cần notification_log chống gửi trùng
// nếu lỡ khớp 2 lần trong cùng cửa sổ do cron chạy dồn).
//
// QUAN TRỌNG: mọi `url` gửi kèm push PHẢI là đường dẫn TƯƠNG ĐỐI (bắt đầu bằng "./"), KHÔNG được
// viết cứng "/nhan-hieu/..." — app còn chạy qua domain riêng hesinhthaihieu.com/webxaynhanhieu/
// (proxy qua Cloudflare Worker, xem cloudflare-worker/worker.js), route đó KHÔNG proxy "/nhan-hieu/"
// nên bấm vào thông báo trên domain đó sẽ ra 404 nếu dùng đường dẫn tuyệt đối (bug thật đã xảy ra,
// phát hiện 2026-08-27 khi chị Quỳnh báo "bấm vào thông báo trên iPhone bị lỗi 404"). Đường dẫn
// tương đối tự resolve theo đúng scope của sw.js (nơi nó đang thực sự chạy), đúng cho CẢ 2 domain.
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
      url: './#lich-dang',
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
          url: './#day-bai',
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
      url: './#lich-dang',
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
        url: './#quan-tri-hub',
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
        url: './#trang-chu',
      });
      if (result.sent) count++;
    }
  }
  return count;
}

// Nhắc dùng thử sắp/vừa hết hạn (2026-08-23, theo yêu cầu chị Quỳnh: "làm thông báo nhắc hết hạn
// dùng thử tự động") — 2 mốc: còn ~24h nữa hết hạn (nhắc sớm để kịp quyết định/xem ưu đãi), và vừa
// hết hạn (kéo họ quay lại app xem màn hình nâng cấp). Chỉ nhắc has_paid=false — người đã trả phí
// access_until là hạn GÓI, không phải dùng thử, không liên quan nhắc này.
async function checkTrialEnding() {
  const now = Date.now();
  let count = 0;

  const soonStartIso = new Date(now + 24 * 3600000).toISOString();
  const soonEndIso = new Date(now + 24 * 3600000 + WINDOW_MINUTES * 60000).toISOString();
  const soonResp = await supabaseAdmin(
    `profiles?has_paid=eq.false&role=eq.student&access_until=gte.${encodeURIComponent(soonStartIso)}&access_until=lt.${encodeURIComponent(soonEndIso)}&select=id`
  );
  const soonRows = soonResp.ok ? await soonResp.json() : [];
  for (const row of soonRows) {
    const result = await notifyOnce(row.id, 'trial-ending-24h', {
      title: 'Dùng thử sắp hết hạn',
      body: 'Còn khoảng 24 giờ nữa là hết hạn dùng thử — nâng cấp ngay để không bị gián đoạn.',
      url: './#nang-cap',
    });
    if (result.sent) count++;
  }

  const expiredStartIso = new Date(now - WINDOW_MINUTES * 60000).toISOString();
  const expiredEndIso = new Date(now).toISOString();
  const expiredResp = await supabaseAdmin(
    `profiles?has_paid=eq.false&role=eq.student&access_until=gte.${encodeURIComponent(expiredStartIso)}&access_until=lt.${encodeURIComponent(expiredEndIso)}&select=id`
  );
  const expiredRows = expiredResp.ok ? await expiredResp.json() : [];
  for (const row of expiredRows) {
    const result = await notifyOnce(row.id, 'trial-expired', {
      title: 'Dùng thử đã kết thúc',
      body: '7 ngày dùng thử đã hết — nâng cấp ngay để tiếp tục dùng app.',
      url: './#nang-cap',
    });
    if (result.sent) count++;
  }

  return count;
}

// Nhắc dùng thử ĐÃ làm xong Định Vị nhưng CHƯA thử "AI tự viết + xếp cả tuần" (api/auto-fill-week.js)
// — đây là khoảnh khắc "aha" rõ nhất của app (thấy AI viết + xếp thẳng cả tuần content, không chỉ
// gợi ý chủ đề), nhưng không có gì tự đưa khách tới đó nếu họ thoát ra giữa chừng sau Định Vị. Nhắc
// sau 12h kể từ lúc xong Định Vị (đủ thời gian để họ tự quay lại, nhưng vẫn còn kịp trong hạn dùng
// thử hiện chỉ 3 ngày) — CHỈ 1 LẦN/user (dedupe key không kèm id biến thiên theo thời gian như các
// loại nhắc khác). Theo yêu cầu chị Quỳnh 2026-08-29: tối ưu để dùng thử dễ chuyển đổi thành mua gói.
async function checkAutoFillNudge() {
  const NUDGE_AFTER_H = 12;
  const startIso = new Date(Date.now() - (NUDGE_AFTER_H * 60 + WINDOW_MINUTES) * 60000).toISOString();
  const endIso = new Date(Date.now() - NUDGE_AFTER_H * 3600000).toISOString();
  const posResp = await supabaseAdmin(
    `positioning_results?luot1=not.is.null&updated_at=gte.${encodeURIComponent(startIso)}&updated_at=lt.${encodeURIComponent(endIso)}&select=user_id`
  );
  const posRows = posResp.ok ? await posResp.json() : [];
  if (!posRows.length) return 0;
  const userIds = [...new Set(posRows.map((r) => r.user_id))];

  const nowIso = new Date().toISOString();
  const profResp = await supabaseAdmin(
    `profiles?id=in.(${userIds.join(',')})&has_paid=eq.false&role=eq.student&used_auto_fill_week_at=is.null&access_until=gt.${encodeURIComponent(nowIso)}&select=id`
  );
  const rows = profResp.ok ? await profResp.json() : [];
  let count = 0;
  for (const row of rows) {
    const result = await notifyOnce(row.id, 'auto-fill-nudge', {
      title: 'Thử để AI viết luôn cả tuần content cho bạn',
      body: 'Bạn đã làm xong Định Vị — vào Lịch Đăng Bài bấm "AI tự viết + xếp cả tuần" để AI viết bài hoàn chỉnh, xếp thẳng vào lịch.',
      url: './#lich-dang',
    });
    if (result.sent) count++;
  }
  return count;
}

// Nhắc lịch follow khách CRM (Trợ Lý AI Tư Vấn & CRM, tro-ly-crm/, 2026-08-29) — ngay_follow_tiep
// chỉ là NGÀY (không có giờ riêng như calendar_entries/recording_schedule), nên chỉ cần quét 1 LẦN/
// NGÀY vào đúng 1 mốc giờ cố định (không dùng WINDOW_MINUTES theo kiểu "vừa tới giờ X" như các loại
// nhắc khác — ở đây "vừa tới hôm nay" là đủ điều kiện rồi). Gửi GỘP 1 thông báo/ngày/user (không
// phải 1 thông báo/khách) để tránh dồn dập nếu nhiều khách cùng đến hạn 1 ngày — event_key theo
// (user_id, ngày hôm nay) nên notifyOnce tự chặn gửi lại nếu cron chạy nhiều lần trong cùng cửa sổ.
const CRM_FOLLOW_REMINDER_TIME = '08:15';
async function checkCrmFollowReminders() {
  const { dateStr, minutesOfDay } = vnNowParts();
  if (!withinWindow(parseHHMM(CRM_FOLLOW_REMINDER_TIME), minutesOfDay)) return 0;

  const dueResp = await supabaseAdmin(`crm_customers?ngay_follow_tiep=lte.${dateStr}&select=user_id`);
  const dueRows = dueResp.ok ? await dueResp.json() : [];
  if (!dueRows.length) return 0;
  const countByUser = {};
  for (const row of dueRows) countByUser[row.user_id] = (countByUser[row.user_id] || 0) + 1;

  let count = 0;
  for (const [userId, n] of Object.entries(countByUser)) {
    const result = await notifyOnce(userId, `crm-follow:${dateStr}`, {
      title: n > 1 ? `Có ${n} khách cần follow hôm nay` : 'Có 1 khách cần follow hôm nay',
      body: 'Vào Trợ Lý AI Tư Vấn & CRM để xem và follow đúng lúc.',
      url: './#trang-chu',
    });
    if (result.sent) count++;
  }
  return count;
}

// Bản tin sức khỏe mỗi ngày (Hiểu Để Khoẻ Mạnh, suc-khoe/, 2026-08-31 — chị Quỳnh: "làm cái bản tin
// về sức khỏe mỗi ngày gửi thông báo cho người dùng mỗi ngày") — mỗi ngày lấy 1 mục trong
// sk_library_entries làm nội dung, XOAY VÒNG theo số ngày (không ngẫu nhiên — ngẫu nhiên thật dễ lặp
// liên tiếp gây nhàm, xoay vòng đảm bảo dàn đều hết nội dung thư viện), dẫn thẳng vào Thư Viện Sức
// Khỏe — vừa cho kiến thức vừa kéo khách quay lại xem sản phẩm liên quan, đúng tinh thần liên kết
// Kiểm Tra/Thư Viện/Sản Phẩm chị Quỳnh đã yêu cầu trước đó. CHỈ gửi cho khách ĐÃ được gán gói/sản
// phẩm (profiles.sk_package_id HOẶC có dòng trong sk_customer_products — 2026-09-05, chị Quỳnh: "gán
// gói ở đây là gán sản phẩm khách đang dùng á, chứ k phải mỗi combo", xem lich-trinh.js) — đây là App
// RIÊNG (suc-khoe/) nhưng push_subscriptions dùng chung 1 bảng cho cả hệ sinh thái (không có cột phân
// biệt theo app), nên PHẢI lọc đúng đối tượng suc-khoe trước khi gọi notifyOnce, không thì user app
// khác cũng nhận nhầm bản tin sức khỏe.
const SK_DAILY_TIP_TIME = '08:00';
async function checkSucKhoeDailyTip() {
  const { dateStr, minutesOfDay } = vnNowParts();
  if (!withinWindow(parseHHMM(SK_DAILY_TIP_TIME), minutesOfDay)) return 0;

  const [packageUsersResp, customerProductUsersResp] = await Promise.all([
    supabaseAdmin(`profiles?sk_package_id=not.is.null&select=id`),
    supabaseAdmin(`sk_customer_products?select=user_id`),
  ]);
  const packageUsers = packageUsersResp.ok ? await packageUsersResp.json() : [];
  const customerProductUsers = customerProductUsersResp.ok ? await customerProductUsersResp.json() : [];
  const userIds = new Set([...packageUsers.map((u) => u.id), ...customerProductUsers.map((r) => r.user_id)]);
  const users = [...userIds].map((id) => ({ id }));
  if (!users.length) return 0;

  const entriesResp = await supabaseAdmin(`sk_library_entries?select=id,issue_name,symptoms,remedies&order=issue_name.asc`);
  const entries = entriesResp.ok ? await entriesResp.json() : [];
  if (!entries.length) return 0;

  const dayIndex = Math.floor(new Date(dateStr + 'T00:00:00Z').getTime() / 86400000);
  const entry = entries[dayIndex % entries.length];
  const teaserSource = entry.remedies || entry.symptoms || '';
  const teaser = teaserSource.split('\n').map((s) => s.trim().replace(/^[•-]\s*/, '')).filter(Boolean)[0] || '';

  let count = 0;
  for (const u of users) {
    const result = await notifyOnce(u.id, `sk-daily-tip:${dateStr}`, {
      title: '🌿 Bản tin sức khỏe hôm nay: ' + entry.issue_name,
      body: teaser || 'Xem ngay trong Thư Viện Sức Khỏe.',
      url: './#thu-vien-suc-khoe',
    });
    if (result.sent) count++;
  }
  return count;
}

// Chỉ gửi cho user ĐÃ bật thông báo (có ít nhất 1 push_subscriptions) — join qua 2 bước vì
// push_subscriptions dùng chung cho cả hệ sinh thái, không lọc được thẳng bằng 1 câu query profiles.
// 'daily' nhắc mỗi tối, 'weekly' chỉ nhắc đúng tối Chủ Nhật (dayOfWeek=0, giờ VN) — cho người chỉ
// muốn ghi bù cả tuần 1 lần, Ghi Chép Hàng Ngày đã có ô chọn ngày nên ghi bù vẫn ra đúng dữ liệu.
const TC_DAILY_REMINDER_TIME = '20:00';
const TC_WEEKLY_REMINDER_TIME = '19:00';
async function checkTaiChinhLogReminder() {
  const { dateStr, minutesOfDay } = vnNowParts();
  const dayOfWeek = new Date(Date.now() + 7 * 3600 * 1000).getUTCDay();

  const wantDaily = withinWindow(parseHHMM(TC_DAILY_REMINDER_TIME), minutesOfDay);
  const wantWeekly = dayOfWeek === 0 && withinWindow(parseHHMM(TC_WEEKLY_REMINDER_TIME), minutesOfDay);
  if (!wantDaily && !wantWeekly) return 0;

  let count = 0;
  if (wantDaily) {
    const usersResp = await supabaseAdmin(`profiles?tc_reminder_frequency=eq.daily&select=id`);
    const users = usersResp.ok ? await usersResp.json() : [];
    for (const u of users) {
      const result = await notifyOnce(u.id, `tc-daily-reminder:${dateStr}`, {
        title: '📒 Ghi thu chi hôm nay chưa?',
        body: 'Chỉ mất 30 giây — dòng tiền hôm nay là dữ liệu cho Điểm Nghiệp tuần này.',
        url: './#ghi-chep',
      });
      if (result.sent) count++;
    }
  }
  if (wantWeekly) {
    const usersResp = await supabaseAdmin(`profiles?tc_reminder_frequency=eq.weekly&select=id`);
    const users = usersResp.ok ? await usersResp.json() : [];
    for (const u of users) {
      const result = await notifyOnce(u.id, `tc-weekly-reminder:${dateStr}`, {
        title: '📒 Ghi thu chi cả tuần này',
        body: 'Ghi bù từng ngày cũng được — chọn lại ngày ở mỗi dòng khi ghi.',
        url: './#ghi-chep',
      });
      if (result.sent) count++;
    }
  }
  return count;
}

// Nhắc TRƯỚC khi mốc giá Sổ Dòng Tiền Tâm Thức tăng (299k ngày 0-15 → 599k ngày 15-30 → 999k sau đó
// — xem TC_PRICE_TIER_1/2/3 ở tai-chinh/js/app-shell.js, SỬA CẢ 2 NƠI nếu đổi mốc ngày/giá). 2026-09-03,
// góp ý Quỳnh: "nhấn mạnh thật rõ" giá tăng theo thời gian — riêng hiện rõ trên màn hình (tcPriceAnchorHtml)
// vẫn có thể bị lướt qua nếu người dùng không quay lại app, nên cần thêm đúng 1 thông báo đẩy TRƯỚC mỗi
// mốc tăng giá. Chỉ người CHƯA trả phí mới cần biết (đã mua thì giá không còn ý nghĩa gì với họ nữa).
// Quét theo tc_trial_started_at (mốc ngày CỦA RIÊNG từng người, không phải lịch chung) — cửa sổ trượt
// giống mọi loại nhắc "theo mốc thời gian tương đối" khác trong file này (vd checkAutoFillNudge).
const TC_PRICE_DEADLINE_REMIND_DAYS_BEFORE = 3;
const TC_PRICE_TIER_DEADLINES = [
  { atDay: 15, eventKey: 'tc-price-tier1-ending', nextPrice: 599000 },
  { atDay: 30, eventKey: 'tc-price-tier2-ending', nextPrice: 999000 },
];
async function checkTcPriceTierDeadline() {
  let count = 0;
  for (const tier of TC_PRICE_TIER_DEADLINES) {
    const reminderAtDays = tier.atDay - TC_PRICE_DEADLINE_REMIND_DAYS_BEFORE;
    const upperTs = Date.now() - reminderAtDays * 86400000;
    const lowerTs = upperTs - WINDOW_MINUTES * 60000;
    const resp = await supabaseAdmin(
      `profiles?tc_has_paid=eq.false&role=neq.admin&tc_trial_started_at=gte.${encodeURIComponent(new Date(lowerTs).toISOString())}&tc_trial_started_at=lt.${encodeURIComponent(new Date(upperTs).toISOString())}&select=id`
    );
    const rows = resp.ok ? await resp.json() : [];
    for (const row of rows) {
      const result = await notifyOnce(row.id, tier.eventKey, {
        title: `⏰ Còn ${TC_PRICE_DEADLINE_REMIND_DAYS_BEFORE} ngày là hết giá ưu đãi`,
        body: `Giá Sổ Dòng Tiền Tâm Thức sẽ tự động tăng lên ${tier.nextPrice.toLocaleString('vi-VN')}đ — mở khoá TRỌN ĐỜI ngay để giữ giá đang có.`,
        url: './#nang-cap',
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
    const [lich, daybai, quay, signups, announcements, trialEnding, autoFillNudge, crmFollow, skDailyTip, tcLogReminder, tcPriceTierDeadline] = await Promise.all([
      checkLichDangBai(),
      checkDayBaiCheckpoints(),
      checkRecordingSchedule(),
      checkNewSignups(),
      checkNewAnnouncements(),
      checkTrialEnding(),
      checkAutoFillNudge(),
      checkCrmFollowReminders(),
      checkSucKhoeDailyTip(),
      checkTaiChinhLogReminder(),
      checkTcPriceTierDeadline(),
    ]);
    res.status(200).json({ ok: true, sent: { lich_dang_bai: lich, day_bai: daybai, quay_content: quay, new_signups: signups, announcements, trial_ending: trialEnding, auto_fill_nudge: autoFillNudge, crm_follow: crmFollow, sk_daily_tip: skDailyTip, tc_log_reminder: tcLogReminder, tc_price_tier_deadline: tcPriceTierDeadline } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};
