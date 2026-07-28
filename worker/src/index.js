import { tokenValido } from './auth.js';
import { hashIp } from './hash.js';
import {
  insertarLead, insertarEvento, listarLeads, obtenerLead, actualizarLead, resumenLeads,
} from './leads.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const allowed = env.ALLOWED_ORIGIN;

    const corsHeaders = {
      'Access-Control-Allow-Origin': origin === allowed ? origin : allowed,
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
        const raw = await request.text();
        let lead = {};
        try { lead = JSON.parse(raw); } catch { /* GAS recibe el crudo igual */ }

        // Doble escritura: D1 primero, pero su fallo nunca aborta el reenvio a GAS.
        if (env.DB && lead && lead.nombre && lead.telefono) {
          try {
            lead.ip_hash = await hashIp(request.headers.get('CF-Connecting-IP'));
            lead.user_agent = request.headers.get('User-Agent') || null;
            await insertarLead(env.DB, lead);
          } catch (e) {
            console.error('D1 insert lead fallo:', e.message);
          }
        }

        const upstream = await fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: raw,
        });
        const respBody = await upstream.text();
        return new Response(respBody, {
          status: upstream.status,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      if (url.pathname === '/api/evento' && request.method === 'POST') {
        const raw = await request.text();
        let ev = {};
        try { ev = JSON.parse(raw); } catch { /* ignora */ }

        // Se registra sin bloquear la respuesta: la medicion nunca debe
        // retrasar la navegacion del usuario.
        if (env.DB && ev && ev.tipo) {
          ctx.waitUntil(insertarEvento(env.DB, ev).catch((e) => console.error('D1 evento:', e.message)));
        }
        ctx.waitUntil(
          fetch(gasUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'evento', payload: raw }),
          }).catch(() => {})
        );
        return new Response(null, { status: 204, headers: corsHeaders });
      }

      // --- API de administracion (Bearer ADMIN_TOKEN; Cloudflare Access es el candado final) ---
      if (url.pathname.startsWith('/api/admin/')) {
        if (!tokenValido(request.headers.get('Authorization'), env.ADMIN_TOKEN)) {
          return new Response(JSON.stringify({ error: 'no autorizado' }), {
            status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders },
          });
        }
        const json = (obj, status = 200) =>
          new Response(JSON.stringify(obj), {
            status, headers: { 'Content-Type': 'application/json', ...corsHeaders },
          });

        if (url.pathname === '/api/admin/resumen' && request.method === 'GET') {
          return json(await resumenLeads(env.DB));
        }
        if (url.pathname === '/api/admin/leads' && request.method === 'GET') {
          const p = Object.fromEntries(url.searchParams);
          return json(await listarLeads(env.DB, p));
        }
        const m = url.pathname.match(/^\/api\/admin\/leads\/(\d+)$/);
        if (m) {
          const id = Number(m[1]);
          if (request.method === 'GET') {
            const lead = await obtenerLead(env.DB, id);
            return lead ? json(lead) : json({ error: 'no existe' }, 404);
          }
          if (request.method === 'PATCH') {
            const cambios = JSON.parse(await request.text());
            const usuario = request.headers.get('Cf-Access-Authenticated-User-Email') || 'token';
            const r = await actualizarLead(env.DB, id, cambios, usuario);
            if (r.ok) return json({ ok: true });
            return json({ error: r.error }, r.error === 'no existe' ? 404 : 400);
          }
        }
        return json({ error: 'ruta admin no encontrada' }, 404);
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
