import { tokenValido } from './auth.js';
import { verificarAccess } from './access.js';
import { hashIp } from './hash.js';
import { insertarLead, insertarEvento } from './leads.js';
import { getAllDataDesdeD1 } from './contenido.js';
import { getEpsData } from './eps.js';
import { manejarAdmin } from './admin.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const allowed = env.ALLOWED_ORIGIN;

    const corsHeaders = {
      'Access-Control-Allow-Origin': origin === allowed ? origin : allowed,
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
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

    // GAS solo se usa para la doble escritura de leads/eventos (transicion).
    // getAllData y la API admin leen/escriben en D1 y no dependen de el.
    const gasUrl = env.GAS_WEBAPP_URL;

    try {
      if (url.pathname === '/api/getAllData' && request.method === 'GET') {
        // Sin caché: se lee en el build del sitio. Una caché (por colo) provoca
        // que un build tome datos viejos y publique contenido desactualizado.
        const data = await getAllDataDesdeD1(env.DB);
        return new Response(JSON.stringify(data), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...corsHeaders },
        });
      }

      if (url.pathname === '/api/eps' && request.method === 'GET') {
        // Sin caché (misma razón que getAllData): evita que el build genere
        // paginas de ciudades ya despublicadas por leer una respuesta vieja.
        const data = await getEpsData(env.DB);
        return new Response(JSON.stringify(data), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...corsHeaders },
        });
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

      const json = (obj, status = 200) =>
        new Response(JSON.stringify(obj), {
          status, headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });

      // API admin via Cloudflare Access (sin clave): la ruta asesoriasas.com/admin/api/*
      // pasa por Access, que inyecta el JWT. Se verifica y no se pide clave.
      if (url.pathname.startsWith('/admin/api/')) {
        const ident = await verificarAccess(
          request.headers.get('Cf-Access-Jwt-Assertion'),
          env.ACCESS_TEAM_DOMAIN || 'asesoriasas.cloudflareaccess.com'
        );
        if (!ident) return json({ error: 'no autorizado' }, 401);
        const sub = url.pathname.slice('/admin/api/'.length);
        return manejarAdmin(sub, url.searchParams, request, env, ident.email || 'access', json);
      }

      // API admin via Bearer token (respaldo temporal mientras se completa Access).
      if (url.pathname.startsWith('/api/admin/')) {
        if (!tokenValido(request.headers.get('Authorization'), env.ADMIN_TOKEN)) {
          return json({ error: 'no autorizado' }, 401);
        }
        const sub = url.pathname.slice('/api/admin/'.length);
        const usuario = request.headers.get('Cf-Access-Authenticated-User-Email') || 'token';
        return manejarAdmin(sub, url.searchParams, request, env, usuario, json);
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
