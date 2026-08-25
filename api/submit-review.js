// Serverless function — nhận đánh giá app (chỉ viết cảm nhận, không chấm sao) từ popup xin đánh
// giá (xem maybeShowReviewPrompt() ở app-shell.js) hoặc từ ô viết đánh giá ở Trang chủ. Luôn lưu lại
// đánh giá (chờ admin duyệt mới hiện công khai, xem quan-tri-danhgia.js), NHƯNG chỉ tặng thưởng
// lượt AI nếu đánh giá đủ dài (chống viết 1-2 chữ cho có để lấy thưởng) — theo yêu cầu chị Quỳnh
// 2026-08-24: "viết cảm nhận thôi + cho họ 20 lượt AI free khi đánh giá trên [X] từ".
//
// DÙNG CHUNG cho CẢ nhan-hieu VÀ tai-chinh (2026-08-26, "từ giờ làm app nào cũng có phần review,
// auto") — client gửi kèm `app` ('nhan-hieu'|'tai-chinh', mặc định 'nhan-hieu' để KHÔNG phá code
// nhan-hieu cũ chưa từng gửi field này). Thưởng lượt AI CHỈ áp dụng cho nhan-hieu (app đó mới có hệ
// lượt AI) — tai-chinh chỉ lưu + đánh dấu đã hỏi, không có gì để thưởng.
//
// Bảo mật: profiles.trial_ai_limit/paid_ai_bonus/review_reward_given không có policy client nào ghi
// được (RLS đã khoá tự update profiles từ v3) — CHỈ sửa được qua đây bằng SUPABASE_SERVICE_ROLE_KEY,
// sau khi đã tự xác thực người gọi qua requireUser(). Không cho client tự khai reward.
const { requireUser } = require('./_lib/auth');
const { TRIAL_AI_LIMIT } = require('./_lib/trial-quota');
const { supabaseAdmin } = require('./_lib/supabase-admin');
const { sendPushToUser } = require('./_lib/push');

const MIN_WORDS_FOR_REWARD = 50;
const REWARD_LUOT = 20;

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// Báo ngay cho quản trị viên khi có đánh giá mới (2026-08-26, theo yêu cầu chị Quỳnh: "mỗi khi có
// ai đánh giá mới thì phải popup thông báo cho quản trị viên là em biết") — dùng lại hạ tầng Web
// Push đã có (api/_lib/push.js), không qua notifyOnce() vì đây là sự kiện MỚI mỗi lần, không phải
// nhắc lặp lại cần chống gửi trùng. Best-effort — lỗi ở đây không được làm hỏng việc lưu đánh giá.
async function notifyAdminsOfNewReview(targetApp, comment) {
  try {
    const resp = await supabaseAdmin('profiles?role=eq.admin&select=id');
    const admins = resp.ok ? await resp.json() : [];
    const appLabel = targetApp === 'tai-chinh' ? 'Sổ Dòng Tiền Tâm Thức' : 'Xây Nhân Hiệu';
    const preview = comment.length > 100 ? comment.slice(0, 100) + '…' : comment;
    await Promise.all(admins.map(a => sendPushToUser(a.id, {
      title: `⭐ Đánh giá mới — ${appLabel}`,
      body: preview,
      url: './#quan-tri-hub',
    })));
  } catch (e) { /* best-effort */ }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) { res.status(500).json({ error: 'Server chưa cấu hình SUPABASE_SERVICE_ROLE_KEY.' }); return; }

  const user = await requireUser(req);
  if (!user) { res.status(401).json({ error: 'Bạn cần đăng nhập để dùng tính năng này.' }); return; }

  try {
    const { comment, app } = req.body || {};
    const targetApp = app === 'tai-chinh' ? 'tai-chinh' : 'nhan-hieu';
    if (!comment || !comment.trim()) { res.status(400).json({ error: 'Chưa nhập cảm nhận.' }); return; }
    const trimmed = comment.trim();
    if (trimmed.length > 3000) { res.status(400).json({ error: 'Cảm nhận quá dài, rút gọn lại giúp mình.' }); return; }

    const profResp = await supabaseAdmin(`profiles?id=eq.${user.id}&select=full_name,has_paid,paid_ai_month,paid_ai_bonus,trial_ai_limit,review_reward_given`);
    const profRows = profResp.ok ? await profResp.json() : [];
    const profile = profRows[0];

    const insertResp = await supabaseAdmin('app_reviews', {
      method: 'POST',
      body: JSON.stringify({ user_id: user.id, comment: trimmed, display_name: (profile && profile.full_name) || null, app: targetApp }),
    });
    if (!insertResp.ok) { res.status(500).json({ error: 'Không lưu được đánh giá, thử lại giúp mình.' }); return; }

    // PHẢI await — đây là serverless function, không đảm bảo code chạy tiếp sau khi đã res.json()
    // trả lời xong (không giống 1 server thường chạy nền được), không await thì có rủi ro hàm bị
    // huỷ giữa chừng trước khi kịp gửi push, khiến chị Quỳnh không nhận được thông báo mà không rõ vì sao.
    await notifyAdminsOfNewReview(targetApp, trimmed);

    // tai-chinh không có hệ lượt AI để thưởng — chỉ lưu + đánh dấu đã gửi, không tính thưởng gì cả.
    if (targetApp === 'tai-chinh') {
      await supabaseAdmin(`profiles?id=eq.${user.id}`, {
        method: 'PATCH', prefer: 'return=minimal', body: JSON.stringify({ tc_review_prompt_dismissed: true }),
      });
      res.status(200).json({ rewarded: false });
      return;
    }

    const wordCount = countWords(trimmed);
    let rewarded = false;

    if (wordCount >= MIN_WORDS_FOR_REWARD) {
      if (profile && !profile.review_reward_given) {
        const patch = { review_reward_given: true, review_prompt_dismissed: true };
        if (profile.has_paid) {
          const month = new Date().toISOString().slice(0, 7);
          if (profile.paid_ai_month === month) {
            patch.paid_ai_bonus = (profile.paid_ai_bonus || 0) + REWARD_LUOT;
          } else {
            // Chưa dùng lượt AI nào tháng này — mô phỏng đúng bước "reset sang tháng mới" mà
            // consume_ai_quota() tự làm khi có lượt dùng thật đầu tiên trong tháng, tránh để
            // paid_ai_month nhảy sang tháng mới nhưng paid_ai_uses vẫn còn số cũ của tháng trước.
            patch.paid_ai_month = month;
            patch.paid_ai_uses = 0;
            patch.paid_ai_bonus = REWARD_LUOT;
          }
        } else {
          patch.trial_ai_limit = (profile.trial_ai_limit || TRIAL_AI_LIMIT) + REWARD_LUOT;
        }
        const patchResp = await supabaseAdmin(`profiles?id=eq.${user.id}`, {
          method: 'PATCH', prefer: 'return=minimal', body: JSON.stringify(patch),
        });
        rewarded = patchResp.ok;
      }
    } else {
      // Không đủ dài để thưởng, nhưng vẫn coi là "đã đánh giá" — không hỏi lại popup nữa.
      await supabaseAdmin(`profiles?id=eq.${user.id}`, {
        method: 'PATCH', prefer: 'return=minimal', body: JSON.stringify({ review_prompt_dismissed: true }),
      });
    }

    res.status(200).json({ rewarded, wordCount, minWords: MIN_WORDS_FOR_REWARD, rewardLuot: REWARD_LUOT });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Có lỗi xảy ra khi gửi đánh giá.' });
  }
};
