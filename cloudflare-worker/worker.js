// Cloudflare Worker đứng trước hesinhthaihieu.com — proxy ngược mỗi path prefix trong ROUTES sang
// đúng thư mục con tương ứng trên Vercel (ORIGIN_HOST). Đã nối Git (2026-08-29, worker
// "xaynhanhieu-proxy") — sửa file này xong chỉ cần git push lên main, Cloudflare tự deploy, không
// cần copy/dán tay nữa (xem README.md trong thư mục này).
//
// Thêm 1 app mới = thêm đúng 1 dòng vào ROUTES + thêm 1 Cloudflare Route riêng trong Dashboard
// (Domains tab của worker này) — bước Route vẫn phải bấm tay, không đụng gì tới các route đang chạy sẵn.

const ORIGIN_HOST = 'hieu-ai-os-dashboard.vercel.app';

// 2026-09-21 — chị Quỳnh báo "app load chậm": TRƯỚC ĐÂY mọi request (kể cả ảnh/CSS/JS/font tĩnh,
// nội dung không đổi giữa các lần) đều bị ép cacheTtl:0 + "no-cache, must-revalidate" — nghĩa là
// installer/browser/CDN Cloudflare KHÔNG BAO GIỜ được phép dùng thẳng bản đã lưu, luôn phải đi 1
// vòng thật tới tận Vercel để xác nhận lại trước khi hiện, dù file y hệt lần trước. Đo thử thấy mỗi
// vòng đó tốn ~80-200ms — cộng dồn hàng chục ảnh/CSS/JS trên 1 trang là chậm thấy rõ. KHÔNG PHẢI do
// gói Vercel chưa nâng cấp — thuần tuý là cấu hình cache của worker này quá chặt.
// Sửa: CHỈ ảnh/font/media (nội dung không đổi trong file cũ, đổi ảnh mới luôn đặt tên file mới —
// đúng quy ước đang dùng, xem nhan-hieu/assets/ladipage/) được cache 1 giờ ở CDN Cloudflare + trình
// duyệt — đủ để những lần tải lại/chuyển trang trong lúc đang xem không phải đi vòng qua Vercel nữa.
// CỐ TÌNH KHÔNG cache .css/.js — 2 loại này bị sửa & deploy liên tục trong quy trình làm việc thật
// (nhiều lần mỗi buổi), tên file không đổi giữa các lần sửa, nên cache dài dễ khiến khách vẫn thấy
// code cũ/lỗi ngay sau khi vừa sửa xong — coi như thà chấp nhận chậm hơn 1 chút để luôn đúng bản mới
// nhất. Trang HTML vẫn giữ nguyên "no-cache, must-revalidate" như cũ — luôn tải bản mới nhất, để sửa
// nội dung xong là thấy ngay không cần đợi cache hết hạn.
const STATIC_ASSET_RE = /\.(png|jpe?g|gif|webp|svg|ico|woff2?|ttf|otf|mp4|webm|pdf)$/i;
const STATIC_ASSET_TTL_SECONDS = 3600;

async function proxyToOrigin(request, targetUrl) {
  const headers = new Headers(request.headers);
  headers.set('host', ORIGIN_HOST);

  const isStatic = STATIC_ASSET_RE.test(new URL(targetUrl).pathname);

  const originResp = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    redirect: 'manual',
    cf: isStatic
      ? { cacheTtl: STATIC_ASSET_TTL_SECONDS, cacheEverything: true }
      : { cacheTtl: 0, cacheEverything: false },
  });

  const respHeaders = new Headers(originResp.headers);
  respHeaders.set(
    'Cache-Control',
    isStatic ? `public, max-age=${STATIC_ASSET_TTL_SECONDS}` : 'no-cache, must-revalidate'
  );

  return new Response(originResp.body, {
    status: originResp.status,
    statusText: originResp.statusText,
    headers: respHeaders,
  });
}

export default {
  async fetch(request) {
    const ROUTES = [
      { prefix: '/webxaynhanhieu', originPath: '/nhan-hieu' },
      { prefix: '/sodongtientamthuc', originPath: '/tai-chinh' },
      { prefix: '/he-sinh-thai-hieu', originPath: '/he-sinh-thai-hieu' },
      { prefix: '/dashboard', originPath: '' }, // Bảng Điều Khiển tổng quan, nằm ở gốc "/" của Vercel nên originPath để rỗng
      { prefix: '/hieudekhoemanh', originPath: '/suc-khoe' }, // MỚI (2026-08-26) — app "Hiểu Để Khoẻ Mạnh"
      { prefix: '/trolytuvancrm', originPath: '/tro-ly-crm' }, // MỚI (2026-08-29) — "Trợ Lý AI Tư Vấn & CRM"
      { prefix: '/apptaosanphamso', originPath: '/san-pham-so' }, // MỚI — app "Sản Phẩm Số", cần thêm Route riêng trong Dashboard (xem README.md) mới chạy được
    ];

    const url = new URL(request.url);
    const route = ROUTES.find(r => url.pathname === r.prefix || url.pathname.startsWith(r.prefix + '/'));

    if (!route) {
      if (url.pathname === '/') {
        const targetUrl = new URL(request.url);
        targetUrl.protocol = 'https:';
        targetUrl.hostname = ORIGIN_HOST;
        targetUrl.port = '';
        targetUrl.pathname = '/he-sinh-thai-hieu/';
        return proxyToOrigin(request, targetUrl.toString());
      }
      return fetch(request);
    }

    if (url.pathname === route.prefix) {
      url.pathname = route.prefix + '/';
      return Response.redirect(url.toString(), 301);
    }

    const targetUrl = new URL(request.url);
    targetUrl.protocol = 'https:';
    targetUrl.hostname = ORIGIN_HOST;
    targetUrl.port = '';
    targetUrl.pathname = route.originPath + url.pathname.slice(route.prefix.length);

    return proxyToOrigin(request, targetUrl.toString());
  }
};
