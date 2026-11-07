// Cloudflare Worker: proxy riêng cho AI Office (chạy trên GitHub Pages)
// Chỉ chuyển tiếp tới Cohere và Cloudflare API, và chỉ nhận request từ trang của Sếp.

const ALLOWED_HOSTS = ['api.cohere.com', 'api.cloudflare.com'];

// Trang được phép dùng proxy này (đổi nếu tên GitHub của Sếp khác)
const ALLOWED_ORIGINS = ['https://l2apps.github.io'];

export default {
  async fetch(request) {
    const origin = request.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      Vary: 'Origin'
    };

    if (!ALLOWED_ORIGINS.includes(origin)) {
      return new Response('Origin not allowed', { status: 403 });
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    const target = new URL(request.url).searchParams.get('url');
    if (!target) {
      return new Response('Missing ?url=', { status: 400, headers: cors });
    }

    let targetUrl;
    try {
      targetUrl = new URL(target);
    } catch {
      return new Response('Bad url', { status: 400, headers: cors });
    }

    if (targetUrl.protocol !== 'https:' || !ALLOWED_HOSTS.includes(targetUrl.hostname)) {
      return new Response('Host not allowed', { status: 403, headers: cors });
    }

    const headers = new Headers();
    for (const h of ['authorization', 'content-type']) {
      const v = request.headers.get(h);
      if (v) headers.set(h, v);
    }

    const upstream = await fetch(targetUrl.toString(), {
      method: request.method,
      headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body
    });

    const out = new Headers(upstream.headers);
    for (const [k, v] of Object.entries(cors)) out.set(k, v);
    return new Response(upstream.body, { status: upstream.status, headers: out });
  }
};
