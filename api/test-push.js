// Serverless function — gửi 1 thông báo TEST ngay lập tức cho chính người dùng đang gọi, để tự kiểm
// tra thông báo đẩy có thật sự hoạt động không mà không cần chờ đúng lúc có sự kiện thật (đến giờ
// đăng bài, đến giờ công việc content...). Trả về LÝ DO CỤ THỂ khi thất bại (chưa cấu hình VAPID ở
// server, hay chưa có thiết bị nào đăng ký) thay vì chỉ báo "lỗi" chung chung — theo yêu cầu chị
// Quỳnh 2026-08-23: "sao e vẫn chưa thấy cái mục thông báo nó hoạt động nhỉ", không có cách nào chị
// tự biết đang vướng ở khâu nào (server chưa cấu hình, hay máy chị chưa cấp quyền).
const { requireUser } = require('./_lib/auth');
const { sendPushToUser, vapidConfigured } = require('./_lib/push');
const { supabaseAdmin } = require('./_lib/supabase-admin');

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const user = await requireUser(req);
  if (!user) { res.status(401).json({ error: 'Bạn cần đăng nhập để dùng tính năng này.' }); return; }

  if (!vapidConfigured()) {
    res.status(200).json({ ok: false, reason: 'vapid_not_configured', message: 'Server chưa cấu hình VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY — vào Vercel Settings → Environment Variables kiểm tra lại, thêm xong nhớ Redeploy.' });
    return;
  }

  const subsResp = await supabaseAdmin(`push_subscriptions?user_id=eq.${user.id}&select=id`);
  const subs = subsResp.ok ? await subsResp.json() : [];
  if (!subs.length) {
    res.status(200).json({ ok: false, reason: 'no_subscription', message: 'Tài khoản này chưa có thiết bị nào đăng ký nhận thông báo — vào Lịch Đăng Bài → tab "Thông báo & giờ đăng" → bấm "Bật thông báo" và cho phép quyền trên trình duyệt.' });
    return;
  }

  const result = await sendPushToUser(user.id, {
    title: '🔔 Thông báo test',
    body: 'Nếu bạn thấy được thông báo này, hệ thống đang hoạt động bình thường!',
    url: '/nhan-hieu/#lich-dang',
  });

  if (result.sent > 0) {
    res.status(200).json({ ok: true, message: `Đã gửi thành công tới ${result.sent}/${result.total} thiết bị đã đăng ký.` });
  } else {
    res.status(200).json({ ok: false, reason: 'send_failed', message: `Có ${result.total} thiết bị đăng ký nhưng gửi thất bại cả — có thể trình duyệt đã thu hồi quyền, hoặc lâu ngày chưa mở app. Thử tắt rồi bật lại thông báo.` });
  }
};
