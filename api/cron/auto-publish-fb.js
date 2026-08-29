// Cron job (xem "crons" trong vercel.json, chạy mỗi 15 phút) — tự động đăng bài lên Fanpage của chị
// Quỳnh đúng giờ đã hẹn trong Lịch Đăng Bài (calendar_entries.auto_publish_fb=true), tự tạo 1 ảnh
// minh hoạ AI kèm theo (nếu có cấu hình OPENAI_API_KEY), rồi tự đăng comment cau_cmt_ghim + các
// comment CTA sản phẩm (cmt_cta_san_pham) ngay dưới. Theo yêu cầu chị Quỳnh 2026-08-27: "cài chế độ
// đăng bài tự động" + "tự động làm hình" + "cta cố định các sản phẩm hiện có".
//
// QUAN TRỌNG — phạm vi CHỈ 1 Fanpage của chị Quỳnh: token đăng bài (FB_PAGE_ID/FB_PAGE_ACCESS_TOKEN)
// nằm ở biến môi trường server, không lưu Supabase, không phải OAuth theo từng user — vì đây KHÔNG
// phải tính năng cho khách hàng Xây Nhân Hiệu khác dùng (đã xác nhận với chị Quỳnh). UI bật/tắt
// (checkbox "Tự động đăng lên Fanpage" ở nhan-hieu/js/lich-dang.js) vì vậy cũng chỉ hiện cho admin.
//
// Facebook Graph API KHÔNG có endpoint để GHIM comment trên bài Page — bước dưới chỉ ĐĂNG được 1
// comment thường (thường lên đầu vì mới đăng, không đảm bảo giữ vị trí đầu nếu có comment khác cùng
// lúc). Muốn ghim thật vẫn phải làm tay trên Facebook.
const { supabaseAdmin } = require('../_lib/supabase-admin');
const { notifyOnce } = require('../_lib/push');
const { generatePostImage, generateSpiritualBackground, renderPersonalTemplateImage } = require('../_lib/image-gen');

const GRAPH_API = 'https://graph.facebook.com/v19.0';
// Phải khớp tay với default ở cột profiles.slot_time_* trong schema_full.sql — cùng tầng ưu tiên
// giờ như checkLichDangBai() ở send-reminders.js: giờ riêng của bài → giờ mặc định theo slot của
// user → giờ mặc định chung.
const DEFAULT_SLOT_TIME = { sang: '08:00', trua: '12:00', toi: '19:00' };

function parseHHMM(s) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s || '');
  if (!m) return NaN;
  return Number(m[1]) * 60 + Number(m[2]);
}

function vnNowParts() {
  const vn = new Date(Date.now() + 7 * 3600 * 1000);
  return { dateStr: vn.toISOString().slice(0, 10), minutesOfDay: vn.getUTCHours() * 60 + vn.getUTCMinutes() };
}

// Trước đây chỉ đăng được trong đúng 25 phút đầu sau giờ hẹn — lỡ khung đó (vd lỗi tạm thời như
// thiếu OPENAI_API_KEY, hoặc chị bấm "Thử lại" trễ) thì coi như bỏ lỡ VĨNH VIỄN cả ngày hôm đó, dù
// scheduled_date=eq.${dateStr} đã tự giới hạn CHỈ xét đúng ngày hôm nay rồi. Bỏ luôn giới hạn trần —
// chỉ cần đã tới giờ hẹn (đăng trễ còn hơn không đăng), sửa 2026-08-29 theo phản hồi chị Quỳnh.
function withinWindow(targetMinutesOfDay, nowMinutesOfDay) {
  return nowMinutesOfDay >= targetMinutesOfDay;
}

async function fbPost(path, params) {
  const resp = await fetch(`${GRAPH_API}/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString(),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error((data.error && data.error.message) || `Facebook API lỗi (HTTP ${resp.status})`);
  return data;
}

// Đăng bài kèm ảnh — multipart/form-data qua FormData/Blob toàn cục có sẵn trên Node 18+ (runtime
// Vercel hiện tại), không cần thêm thư viện multipart riêng. /photos trả về post_id dạng
// "{page-id}_{post-id}" (khác /feed chỉ trả "id" trần) — dùng post_id để khớp đúng định dạng link
// facebook.com/{id} và endpoint {id}/comments đang dùng chung cho cả 2 nhánh đăng bài.
async function fbPostPhoto(pageId, pageToken, imageBuffer, caption) {
  const form = new FormData();
  form.append('caption', caption);
  form.append('access_token', pageToken);
  form.append('source', new Blob([imageBuffer], { type: 'image/jpeg' }), 'post.jpg');
  const resp = await fetch(`${GRAPH_API}/${pageId}/photos`, { method: 'POST', body: form });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error((data.error && data.error.message) || `Facebook API lỗi (HTTP ${resp.status})`);
  return { id: data.post_id || data.id };
}

async function markEntry(id, fields) {
  await supabaseAdmin(`calendar_entries?id=eq.${id}`, {
    method: 'PATCH', prefer: 'return=minimal',
    body: JSON.stringify(fields),
  });
}

async function publishOne(entry, pageId, pageToken, profile) {
  // Set 'pending' NGAY khi bắt đầu xử lý — chặn đăng trùng nếu lượt cron sau chạy chồng lên (khác
  // các loại nhắc push ở send-reminders.js, việc này có tác dụng phụ thật ngoài Facebook nên bắt
  // buộc phải khoá lại, không thể chỉ dựa vào cửa sổ thời gian).
  await markEntry(entry.id, { fb_publish_status: 'pending' });

  const postResp = await supabaseAdmin(`posts?id=eq.${entry.post_id}&select=content,title,structure,image_data,tags`);
  const posts = postResp.ok ? await postResp.json() : [];
  const post = posts[0];
  if (!post || !post.content) {
    await markEntry(entry.id, { fb_publish_status: 'failed', fb_publish_error: 'Không tìm thấy nội dung bài viết để đăng.' });
    return { ok: false };
  }

  try {
    // Thứ tự ưu tiên nguồn ảnh khi đăng (2026-08-29, theo yêu cầu chị Quỳnh — xem comment đầu file
    // api/_lib/image-gen.js để hiểu đầy đủ lý do từng bước):
    // (1) post.image_data có sẵn (case study đã ghép — đăng nguyên vì đã hoàn chỉnh).
    // (2) Bài trục "Tâm linh" (post.tags) → AI vẽ ảnh nền tâm linh riêng, đè 1 trong 4 mẫu Tạo Ảnh
    //     Thương Hiệu lên (renderPersonalTemplateImage) — ảnh cá nhân của chị không hợp bài tâm linh.
    // (3) Bài khác → 1 ảnh cá nhân thật ngẫu nhiên (personal_photos), cũng đè 1 trong 4 mẫu lên —
    //     KHÔNG để AI tự vẽ người lạ nữa (bug cũ: ảnh không phải chị + AI tự vẽ luôn cả chữ vào ảnh
    //     dù đã dặn "không chữ", ra font/kiểu chữ không đúng ý).
    // (4) Lưới an toàn cuối: chưa có ảnh cá nhân nào (personal_photos rỗng) → ảnh AI chung chung như
    //     luồng cũ (generatePostImage). TUYỆT ĐỐI KHÔNG đăng bài chữ trần (/feed) — theo yêu cầu chị
    //     Quỳnh 2026-08-28: "không được đăng mỗi bài chữ". Không có ảnh nào khả dụng → bỏ qua lượt
    //     đăng này, đánh dấu failed kèm lý do rõ, có thông báo — còn hơn đăng chữ không kèm ảnh.
    let result = null;
    // lastError/failedStep: trước đây gộp chung lỗi tạo ảnh VÀ lỗi đăng ảnh lên Facebook (fbPostPhoto)
    // vào 1 câu "Không tạo được ảnh" — sai lệch khi lỗi thật KHÔNG phải do ảnh mà do token Facebook hết
    // hạn (fbPostPhoto ném lỗi "Error validating access token"), khiến chị Quỳnh tưởng nhầm phải sửa
    // OpenAI trong khi cần tạo lại FB_PAGE_ACCESS_TOKEN. Tách rõ 2 bước để fb_publish_error luôn chỉ
    // đúng nguyên nhân + gọi thẳng tên bước lỗi (2026-08-29).
    let lastError = null;
    let failedStep = null;
    if (post.image_data) {
      try {
        const base64 = post.image_data.replace(/^data:image\/\w+;base64,/, '');
        result = await fbPostPhoto(pageId, pageToken, Buffer.from(base64, 'base64'), post.content);
      } catch (e) { result = null; lastError = e.message; failedStep = 'đăng ảnh lên Facebook'; }
    }
    const handle = (profile && (profile.brand_name || profile.channel_handle)) || '';
    const postTitle = post.title || post.content.slice(0, 80);
    if (!result) {
      const isSpiritual = Array.isArray(post.tags) && post.tags.includes('tam_linh');
      let templatePhoto = null;
      if (isSpiritual && process.env.OPENAI_API_KEY) {
        try { templatePhoto = await generateSpiritualBackground({ apiKey: process.env.OPENAI_API_KEY }); }
        catch (e) { lastError = e.message; failedStep = 'tạo ảnh nền tâm linh bằng AI'; }
      }
      if (!templatePhoto && !isSpiritual) {
        try {
          const photosResp = await supabaseAdmin(`personal_photos?user_id=eq.${entry.user_id}&select=image`);
          const photos = photosResp.ok ? await photosResp.json() : [];
          if (photos.length) {
            const chosen = photos[Math.floor(Math.random() * photos.length)];
            templatePhoto = Buffer.from(chosen.image.replace(/^data:image\/\w+;base64,/, ''), 'base64');
          }
        } catch (e) { /* không chặn — rơi xuống ảnh AI chung ở dưới nếu có */ }
      }
      if (templatePhoto) {
        try {
          const composed = await renderPersonalTemplateImage({ photoBuffer: templatePhoto, title: postTitle, handle });
          result = await fbPostPhoto(pageId, pageToken, composed, post.content);
        } catch (e) { result = null; lastError = e.message; failedStep = 'đăng ảnh lên Facebook'; }
      }
    }
    if (!result) {
      if (process.env.OPENAI_API_KEY) {
        let aiImage = null;
        try {
          aiImage = await generatePostImage({ apiKey: process.env.OPENAI_API_KEY, title: postTitle });
        } catch (e) { lastError = e.message; failedStep = 'tạo ảnh bằng OpenAI'; }
        if (aiImage) {
          try {
            result = await fbPostPhoto(pageId, pageToken, aiImage, post.content);
          } catch (e) { result = null; lastError = e.message; failedStep = 'đăng ảnh lên Facebook'; }
        }
      } else if (!lastError) {
        lastError = 'Chưa cấu hình OPENAI_API_KEY trên server.';
        failedStep = 'tạo ảnh dự phòng';
      }
    }
    if (!result) {
      // Token Facebook hết hạn làm hỏng MỌI bước gọi Facebook (không riêng gì ảnh) — nhận diện thẳng
      // qua câu lỗi đặc trưng của Graph API để báo đúng hướng khắc phục (tạo lại token) thay vì để
      // chị tưởng lỗi do ảnh rồi cứ bấm "Thử lại" mãi không có tác dụng.
      const isTokenError = /access token|OAuthException/i.test(lastError || '');
      const reason = isTokenError
        ? `Token Facebook đã hết hạn (${lastError}) — cần tạo lại FB_PAGE_ACCESS_TOKEN, "Thử lại" sẽ không có tác dụng cho tới khi có token mới.`
        : `Lỗi ở bước ${failedStep || 'chuẩn bị ảnh'}: ${lastError || 'không rõ lý do'} — bỏ qua đăng bài chữ trần theo yêu cầu chị Quỳnh.`;
      await markEntry(entry.id, { fb_publish_status: 'failed', fb_publish_error: reason });
      await notifyOnce(entry.user_id, `fb-publish-fail:${entry.id}`, {
        title: isTokenError ? '⚠️ Token Facebook đã hết hạn' : '⚠️ Bỏ qua đăng bài Fanpage — thiếu ảnh',
        body: reason,
        url: './#lich-dang',
      });
      return { ok: false };
    }
    await markEntry(entry.id, {
      fb_publish_status: 'published', fb_post_id: result.id, fb_publish_error: null,
      posted: true, posted_at: new Date().toISOString(),
    });

    // Đọc cau_cmt_ghim (bình luận ghim, sinh sẵn cho MỌI bài viết ở cả Viết Content lẫn Viết từ Kho
    // Content — xem posts.structure) thay vì day_bai_plan.cmt_tu_dang: field đó nằm trong
    // day_bai_plan.moc[i].cmt_tu_dang (do module Đẩy Bài tạo), không phải top-level như đọc trước
    // đây — bug khiến bước tự-comment chưa bao giờ chạy được, sửa 2026-08-27.
    const cmt = post.structure && post.structure.cau_cmt_ghim;
    if (cmt) {
      try { await fbPost(`${result.id}/comments`, { message: cmt, access_token: pageToken }); }
      catch (e) { /* comment lỗi không làm fail bài đăng chính — đã đăng thành công rồi */ }
    }
    // cmt_cta_san_pham: 1-2 câu bình luận CTA dẫn LINK THẬT về đúng sản phẩm/group chị Quỳnh đã lưu
    // sẵn ở promo_assets (xem auto-fill-schedule.js) — đăng thêm mỗi câu làm 1 comment riêng.
    const productComments = (post.structure && Array.isArray(post.structure.cmt_cta_san_pham)) ? post.structure.cmt_cta_san_pham : [];
    for (const pc of productComments) {
      if (!pc) continue;
      try { await fbPost(`${result.id}/comments`, { message: pc, access_token: pageToken }); }
      catch (e) { /* comment lỗi không làm fail bài đăng chính */ }
    }

    await notifyOnce(entry.user_id, `fb-publish:${entry.id}`, {
      title: '✅ Đã tự động đăng lên Fanpage',
      body: 'Bài đã lên lịch vừa được tự động đăng lên Fanpage.',
      url: './#lich-dang',
    });
    return { ok: true };
  } catch (e) {
    await markEntry(entry.id, { fb_publish_status: 'failed', fb_publish_error: e.message });
    await notifyOnce(entry.user_id, `fb-publish-fail:${entry.id}`, {
      title: '❌ Đăng tự động lên Fanpage thất bại',
      body: e.message,
      url: './#lich-dang',
    });
    return { ok: false };
  }
}

async function checkAutoPublishFb() {
  const pageId = process.env.FB_PAGE_ID;
  const pageToken = process.env.FB_PAGE_ACCESS_TOKEN;
  if (!pageId || !pageToken) return { skipped: 'FB_PAGE_ID/FB_PAGE_ACCESS_TOKEN chưa được cấu hình.' };

  const { dateStr, minutesOfDay } = vnNowParts();
  const entriesResp = await supabaseAdmin(
    // channel=eq.fanpage: lớp an toàn thêm — UI chỉ cho bật auto_publish_fb trong lane Fanpage rồi,
    // nhưng lọc thêm ở đây phòng hờ tuyệt đối không bao giờ đăng nhầm 1 dòng lịch cá nhân.
    `calendar_entries?auto_publish_fb=eq.true&channel=eq.fanpage&fb_publish_status=is.null&posted=eq.false&scheduled_date=eq.${dateStr}&select=id,user_id,post_id,slot,scheduled_time`
  );
  const entries = entriesResp.ok ? await entriesResp.json() : [];
  const candidates = entries.filter((e) => e.post_id);
  if (!candidates.length) return { published: 0, failed: 0 };

  const userIds = [...new Set(candidates.map((e) => e.user_id))];
  const profilesResp = await supabaseAdmin(
    `profiles?id=in.(${userIds.join(',')})&select=id,slot_time_sang,slot_time_trua,slot_time_toi,channel_handle,brand_name`
  );
  const profiles = profilesResp.ok ? await profilesResp.json() : [];
  const profileById = Object.fromEntries(profiles.map((p) => [p.id, p]));

  let published = 0, failed = 0;
  for (const entry of candidates) {
    const p = profileById[entry.user_id];
    const slotTime = entry.scheduled_time || (p && p['slot_time_' + entry.slot]) || DEFAULT_SLOT_TIME[entry.slot];
    if (!withinWindow(parseHHMM(slotTime), minutesOfDay)) continue;
    const result = await publishOne(entry, pageId, pageToken, p);
    if (result.ok) published++; else failed++;
  }
  return { published, failed };
}

module.exports = async (req, res) => {
  // Vercel Cron tự thêm header này khi biến môi trường CRON_SECRET được cấu hình — chặn người ngoài
  // gọi thẳng URL này để đăng bài giả mạo.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers['authorization'] || '';
    if (auth !== `Bearer ${secret}`) { res.status(401).json({ error: 'unauthorized' }); return; }
  }

  try {
    const result = await checkAutoPublishFb();
    res.status(200).json({ ok: true, ...result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};
