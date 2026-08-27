// Cloudflare Worker đứng trước hesinhthaihieu.com — proxy ngược mỗi path prefix trong ROUTES sang
// đúng thư mục con tương ứng trên Vercel (ORIGIN_HOST). KHÔNG tự deploy theo git push như phần còn
// lại của repo này — sửa file này xong phải copy nội dung lên Cloudflare Dashboard > Workers & Pages
// > Worker này > Edit Code, dán đè rồi bấm Deploy (hoặc dùng `wrangler deploy` nếu đã cấu hình, xem
// README.md trong thư mục này).
//
// Thêm 1 app mới = thêm đúng 1 dòng vào ROUTES, không đụng gì tới các route đang chạy sẵn.
export default {
  async fetch(request) {
    const ORIGIN_HOST = 'hieu-ai-os-dashboard.vercel.app';
    const ROUTES = [
      { prefix: '/webxaynhanhieu', originPath: '/nhan-hieu' },
      { prefix: '/sodongtientamthuc', originPath: '/tai-chinh' },
      { prefix: '/he-sinh-thai-hieu', originPath: '/he-sinh-thai-hieu' },
      { prefix: '/dashboard', originPath: '' }, // Bảng Điều Khiển tổng quan, nằm ở gốc "/" của Vercel nên originPath để rỗng
      { prefix: '/hieudekhoemanh', originPath: '/suc-khoe' }, // MỚI (2026-08-26) — app "Hiểu Để Khoẻ Mạnh"
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
