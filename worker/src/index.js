export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const allowed = env.ALLOWED_ORIGIN;

    const corsHeaders = {
      'Access-Control-Allow-Origin': origin === allowed ? origin : allowed,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (origin && origin !== allowed) {
      return new Response(JSON.stringify({ error: 'origin not allowed' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const gasUrl = env.GAS_WEBAPP_URL;
    if (!gasUrl) {
      return new Response(JSON.stringify({ error: 'GAS_WEBAPP_URL not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    try {
      if (url.pathname === '/api/getAllData' && request.method === 'GET') {
        const cache = caches.default;
        const cacheKey = new Request(url.toString(), request);
        let cached = await cache.match(cacheKey);
        if (cached) {
          const headers = new Headers(cached.headers);
          Object.entries(corsHeaders).forEach(([k, v]) => headers.set(k, v));
          headers.set('X-Cache', 'HIT');
          return new Response(cached.body, { status: cached.status, headers });
        }

        const target = gasUrl + '?action=getAllData';
        const upstream = await fetch(target);
        const body = await upstream.text();

        const response = new Response(body, {
          status: upstream.status,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=300',
            'X-Cache': 'MISS',
            ...corsHeaders,
          },
        });
        ctx.waitUntil(cache.put(cacheKey, response.clone()));
        return response;
      }

      if (url.pathname === '/api/lead' && request.method === 'POST') {
        const body = await request.text();
        const upstream = await fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        });
        const respBody = await upstream.text();
        return new Response(respBody, {
          status: upstream.status,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      return new Response(JSON.stringify({ error: 'route not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'proxy error', detail: err.message }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
  },
};
