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
// vòng thật tới tận Vercel để xác nhận lại trước khi hiện, dù file y hệt lần trước. KHÔNG PHẢI do
// gói Vercel chưa nâng cấp — thuần tuý là cấu hình cache của worker này quá chặt.
// Bước 1 (cùng ngày): cache ảnh/font/media 1 giờ. Đo lại sau khi thêm defer cho <script> ở các app
// (xem nhan-hieu/index.html) thì lộ ra vấn đề LỚN HƠN: mỗi file .js RIÊNG LẺ vẫn mất 350-750ms vì
// route qua Vercel mỗi lần (đã đo bằng fetch trực tiếp 1 file, không tính mạng congest) — vì CSS/JS
// khi đó vẫn bị loại khỏi cache hoàn toàn. Với ~30 file JS mỗi trang, đây mới là nút thắt thật sự.
// Bước 2: cho CSS/JS cache NGẮN (60 giây) thay vì 0 — đánh đổi hợp lý: trong lúc đang sửa code thử
// đi thử lại (vài giây/lần) vẫn có thể dính cache cũ tối đa 60s (bấm hard-refresh nếu cần thấy ngay),
// nhưng khách bình thường lướt nhiều trang trong 1 phiên sẽ không phải trả phí round-trip Vercel cho
// từng file JS ở mỗi trang. Ảnh/font vẫn giữ 1 giờ (đổi tên file mới khi thay, không cần lo cache cũ).
// Trang HTML vẫn giữ nguyên "no-cache, must-revalidate" — luôn tải bản mới nhất ngay lập tức.
const STATIC_ASSET_RE = /\.(png|jpe?g|gif|webp|svg|ico|woff2?|ttf|otf|mp4|webm|pdf)$/i;
const STATIC_ASSET_TTL_SECONDS = 3600;
const CODE_ASSET_RE = /\.(css|js|mjs)$/i;
const CODE_ASSET_TTL_SECONDS = 60;

async function proxyToOrigin(request, targetUrl) {
  const headers = new Headers(request.headers);
  headers.set('host', ORIGIN_HOST);

  const pathname = new URL(targetUrl).pathname;
  const isStatic = STATIC_ASSET_RE.test(pathname);
  const isCode = !isStatic && CODE_ASSET_RE.test(pathname);
  const ttl = isStatic ? STATIC_ASSET_TTL_SECONDS : isCode ? CODE_ASSET_TTL_SECONDS : 0;

  const originResp = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    redirect: 'manual',
    cf: ttl > 0 ? { cacheTtl: ttl, cacheEverything: true } : { cacheTtl: 0, cacheEverything: false },
  });

  const respHeaders = new Headers(originResp.headers);
  respHeaders.set(
    'Cache-Control',
    ttl > 0 ? `public, max-age=${ttl}` : 'no-cache, must-revalidate'
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
