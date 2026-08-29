// Cloudflare Worker đứng trước hesinhthaihieu.com — proxy ngược mỗi path prefix trong ROUTES sang
// đúng thư mục con tương ứng trên Vercel (ORIGIN_HOST). Đã nối Git (2026-08-29, worker
// "xaynhanhieu-proxy") — sửa file này xong chỉ cần git push lên main, Cloudflare tự deploy, không
// cần copy/dán tay nữa (xem README.md trong thư mục này).
//
// Thêm 1 app mới = thêm đúng 1 dòng vào ROUTES + thêm 1 Cloudflare Route riêng trong Dashboard
// (Domains tab của worker này) — bước Route vẫn phải bấm tay, không đụng gì tới các route đang chạy sẵn.
export default {
  async fetch(request) {
    const ORIGIN_HOST = 'hieu-ai-os-dashboard.vercel.app';
    const ROUTES = [
      { prefix: '/webxaynhanhieu', originPath: '/nhan-hieu' },
      { prefix: '/sodongtientamthuc', originPath: '/tai-chinh' },
      { prefix: '/he-sinh-thai-hieu', originPath: '/he-sinh-thai-hieu' },
      { prefix: '/dashboard', originPath: '' }, // Bảng Điều Khiển tổng quan, nằm ở gốc "/" của Vercel nên originPath để rỗng
      { prefix: '/hieudekhoemanh', originPath: '/suc-khoe' }, // MỚI (2026-08-26) — app "Hiểu Để Khoẻ Mạnh"
      { prefix: '/trolytuvancrm', originPath: '/tro-ly-crm' }, // MỚI (2026-08-29) — "Trợ Lý AI Tư Vấn & CRM"
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

        const headers = new Headers(request.headers);
        headers.set('host', ORIGIN_HOST);

        const originResp = await fetch(targetUrl.toString(), {
          method: request.method,
          headers,
          body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
          redirect: 'manual',
          cf: { cacheTtl: 0, cacheEverything: false },
        });

        const respHeaders = new Headers(originResp.headers);
        respHeaders.set('Cache-Control', 'no-cache, must-revalidate');

        return new Response(originResp.body, {
          status: originResp.status,
          statusText: originResp.statusText,
          headers: respHeaders,
        });
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

    const headers = new Headers(request.headers);
    headers.set('host', ORIGIN_HOST);

    const originResp = await fetch(targetUrl.toString(), {
      method: request.method,
      headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
      redirect: 'manual',
      cf: { cacheTtl: 0, cacheEverything: false },
    });

    const respHeaders = new Headers(originResp.headers);
    respHeaders.set('Cache-Control', 'no-cache, must-revalidate');

    return new Response(originResp.body, {
      status: originResp.status,
      statusText: originResp.statusText,
      headers: respHeaders,
    });
  }
};
