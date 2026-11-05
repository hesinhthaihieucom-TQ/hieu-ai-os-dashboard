// Cửa sổ giá ưu đãi 149k của 21 Ngày Giải Nghiệp: 24 giờ kể từ lần ĐẦU TIÊN một địa chỉ IP mở ladipage/app — chị Quỳnh chốt
// 2026-11-05: "1 địa chỉ IP chỉ có 1 lần mở được ưu đãi, mở lại sau vẫn vậy chứ không reset". Lưu ở server (không dựa
// localStorage vì khách xoá dữ liệu trình duyệt/mở tab ẩn danh là reset được). Chỉ lưu BĂM (IP, mã thiết bị), không lưu IP thô.
// Fail-open: bảng chưa tạo/lỗi mạng → trả ok:false, client tự dùng cửa sổ 24h trong localStorage (không chặn bán hàng).
const crypto = require('crypto');
const { supabaseAdmin } = require('./_lib/supabase-admin');

const WINDOW_MS = 24 * 60 * 60 * 1000;
const PROMO_PRICE = 149000, REGULAR_PRICE = 299000;

function clientIp(req) {
  // Domain chính đi qua Cloudflare Worker (copy nguyên header) → cf-connecting-ip là IP khách thật; nếu không có thì lấy
  // phần tử đầu x-forwarded-for (truy cập thẳng Vercel).
  const h = req.headers || {};
  const cf = h['cf-connecting-ip'];
  if (cf) return String(cf).trim();
  const xff = h['x-forwarded-for'];
  if (xff) return String(xff).split(',')[0].trim();
  return String(h['x-real-ip'] || (req.socket && req.socket.remoteAddress) || '').trim();
}

// Chống lách bằng cách đổi mạng (wifi↔4G, VPN): ngoài IP còn nhận diện THIẾT BỊ (mã ngẫu nhiên lưu localStorage + cookie 1 năm, client gửi ?d=).
// Mốc ưu đãi = mốc SỚM NHẤT trong các dấu vết đã biết (IP, thiết bị), rồi ghi lại mốc đó cho dấu vết còn thiếu — nên đổi IP mà vẫn cùng
// trình duyệt thì không reset, và xoá dữ liệu trình duyệt mà vẫn cùng IP cũng không reset. Chỉ lách được khi đổi CẢ HAI (vd tab ẩn danh + đổi mạng).
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const ip = clientIp(req);
  const dev = String((req.query && req.query.d) || '');
  const keys = [];
  if (ip) keys.push(crypto.createHash('sha256').update('gn21|' + ip).digest('hex'));
  if (/^[a-f0-9]{16,64}$/.test(dev)) keys.push(crypto.createHash('sha256').update('gn21dev|' + dev).digest('hex'));
  if (!keys.length) { res.status(200).json({ ok: false }); return; }

  try {
    const found = {};
    for (const k of keys) {
      const r = await supabaseAdmin(`gn_price_window?ip_hash=eq.${k}&select=first_seen`);
      if (!r.ok) { res.status(200).json({ ok: false }); return; }
      const rows = await r.json();
      if (rows[0] && rows[0].first_seen) found[k] = new Date(rows[0].first_seen).getTime();
    }
    const known = Object.values(found);
    const firstSeen = known.length ? Math.min(...known) : Date.now();
    for (const k of keys) {
      if (found[k] === undefined) {
        // ignore-duplicates: 2 request đồng thời không ghi đè mốc của nhau.
        await supabaseAdmin('gn_price_window?on_conflict=ip_hash', {
          method: 'POST',
          prefer: 'resolution=ignore-duplicates,return=minimal',
          body: JSON.stringify({ ip_hash: k, first_seen: new Date(firstSeen).toISOString() }),
        });
      }
    }
    const deadline = firstSeen + WINDOW_MS;
    const promo = Date.now() < deadline;
    res.status(200).json({ ok: true, deadline, promo, price: promo ? PROMO_PRICE : REGULAR_PRICE });
  } catch (e) {
    res.status(200).json({ ok: false });
  }
};
