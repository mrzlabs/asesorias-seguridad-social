# CRM de leads — primer vertical slice — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Registrar cada lead y evento en Cloudflare D1 mediante doble escritura, y construir la vista `/admin/leads` para listar, filtrar, ver detalle y gestionar el estado de los leads.

**Architecture:** El Worker `asesorias-api-proxy` gana un módulo `leads.js` con la lógica de D1 (helpers puros de construcción de SQL/filtros + ejecutores finos) y un módulo `auth.js` para el Bearer token. `index.js` solo enruta, aplica CORS y auth, y hace doble escritura (D1 + reenvío a Apps Script). El panel es una página Astro estática con un `<script>` de módulo que consume la API admin con la clave guardada en `sessionStorage`.

**Tech Stack:** Cloudflare Workers, D1 (SQLite), Astro 5 (vanilla, sin framework de UI), `node --test` para las pruebas unitarias de helpers puros, `wrangler d1 execute --local` para verificación de integración.

---

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `worker/src/auth.js` (crear) | Comparación en tiempo constante del Bearer token. |
| `worker/src/hash.js` (crear) | SHA-256 de la IP → `ip_hash`. |
| `worker/src/leads.js` (crear) | Helpers puros (filtros, diff de auditoría) + ejecutores D1 (insertar/listar/obtener/actualizar/resumen). |
| `worker/src/index.js` (modificar) | Enrutado, CORS, auth, doble escritura. |
| `worker/test/leads.test.js` (crear) | Unit de los helpers puros de `leads.js`. |
| `worker/test/auth.test.js` (crear) | Unit de `auth.js`. |
| `worker/test/hash.test.js` (crear) | Unit de `hash.js`. |
| `site/src/pages/admin/leads.astro` (crear) | Shell del panel + `noindex` + `<script>` del cliente. |
| `site/src/scripts/panel-leads.js` (crear) | Lógica cliente del panel (fetch, render, filtros, detalle, estado). |
| `site/public/robots.txt` o generador (modificar) | `Disallow: /admin`. |
| `site/src/pages/sitemap.xml.js` (revisar) | Excluir `/admin` del sitemap. |

Nota: `worker/package.json` no tiene script de test. La Tarea 0 lo añade.

---

## Task 0: Preparar el runner de tests del Worker

**Files:**
- Modify: `worker/package.json`

- [ ] **Step 1: Añadir script de test**

En `worker/package.json`, dentro de `"scripts"`, añadir:

```json
"test": "node --test \"test/*.test.js\""
```

- [ ] **Step 2: Crear la carpeta de tests**

```bash
mkdir -p worker/test
```

- [ ] **Step 3: Commit**

```bash
git add worker/package.json
git commit -m "chore: script de test para el Worker"
```

---

## Task 1: Auth Bearer en tiempo constante

**Files:**
- Create: `worker/src/auth.js`
- Test: `worker/test/auth.test.js`

- [ ] **Step 1: Escribir el test que falla**

```js
// worker/test/auth.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokenValido } from '../src/auth.js';

test('acepta el token correcto', () => {
  assert.equal(tokenValido('Bearer secreto123', 'secreto123'), true);
});

test('rechaza token equivocado', () => {
  assert.equal(tokenValido('Bearer malo', 'secreto123'), false);
});

test('rechaza sin header', () => {
  assert.equal(tokenValido(null, 'secreto123'), false);
  assert.equal(tokenValido('', 'secreto123'), false);
});

test('rechaza si no hay secreto configurado', () => {
  assert.equal(tokenValido('Bearer x', ''), false);
  assert.equal(tokenValido('Bearer x', undefined), false);
});

test('rechaza esquema que no es Bearer', () => {
  assert.equal(tokenValido('Basic secreto123', 'secreto123'), false);
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `cd worker && npm test`
Expected: FAIL — `tokenValido` no existe.

- [ ] **Step 3: Implementar**

```js
// worker/src/auth.js

/**
 * Compara dos strings en tiempo constante para no filtrar el token por
 * timing. No usa crypto.subtle (sincrono, entradas cortas de bajo riesgo).
 */
function igualdadConstante(a, b) {
  if (a.length !== b.length) return false;
  let dif = 0;
  for (let i = 0; i < a.length; i++) dif |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return dif === 0;
}

/**
 * Valida el header Authorization contra el secreto ADMIN_TOKEN.
 * @param {string|null} header valor de `Authorization`
 * @param {string|undefined} secreto env.ADMIN_TOKEN
 */
export function tokenValido(header, secreto) {
  if (!secreto) return false;
  if (!header || typeof header !== 'string') return false;
  const [esquema, valor] = header.split(' ');
  if (esquema !== 'Bearer' || !valor) return false;
  return igualdadConstante(valor, secreto);
}
```

- [ ] **Step 4: Correr y ver que pasa**

Run: `cd worker && npm test`
Expected: PASS (5 tests de auth).

- [ ] **Step 5: Commit**

```bash
git add worker/src/auth.js worker/test/auth.test.js
git commit -m "feat(worker): validacion de Bearer token para la API admin"
```

---

## Task 2: Hash de IP

**Files:**
- Create: `worker/src/hash.js`
- Test: `worker/test/hash.test.js`

- [ ] **Step 1: Escribir el test que falla**

```js
// worker/test/hash.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashIp } from '../src/hash.js';

test('devuelve hex de 64 chars', async () => {
  const h = await hashIp('190.0.0.1');
  assert.match(h, /^[0-9a-f]{64}$/);
});

test('es determinista', async () => {
  assert.equal(await hashIp('190.0.0.1'), await hashIp('190.0.0.1'));
});

test('difiere por IP', async () => {
  assert.notEqual(await hashIp('190.0.0.1'), await hashIp('190.0.0.2'));
});

test('IP vacia devuelve null', async () => {
  assert.equal(await hashIp(''), null);
  assert.equal(await hashIp(null), null);
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `cd worker && npm test`
Expected: FAIL — `hashIp` no existe.

- [ ] **Step 3: Implementar**

`crypto.subtle` existe tanto en Node 20+ como en Workers.

```js
// worker/src/hash.js

/** SHA-256 de la IP en hex. Devuelve null si no hay IP. */
export async function hashIp(ip) {
  if (!ip) return null;
  const datos = new TextEncoder().encode(ip);
  const buf = await crypto.subtle.digest('SHA-256', datos);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
```

- [ ] **Step 4: Correr y ver que pasa**

Run: `cd worker && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add worker/src/hash.js worker/test/hash.test.js
git commit -m "feat(worker): hash SHA-256 de IP para trazabilidad sin dato crudo"
```

---

## Task 3: Helpers puros de leads (filtros + diff de auditoría)

**Files:**
- Create: `worker/src/leads.js`
- Test: `worker/test/leads.test.js`

- [ ] **Step 1: Escribir el test que falla**

```js
// worker/test/leads.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { construirFiltroLeads, diffAuditoria, ESTADOS } from '../src/leads.js';

test('sin filtros: WHERE vacio y sin binds', () => {
  const { where, binds } = construirFiltroLeads({});
  assert.equal(where, '');
  assert.deepEqual(binds, []);
});

test('filtra por estado valido', () => {
  const { where, binds } = construirFiltroLeads({ estado: 'nuevo' });
  assert.match(where, /estado = \?/);
  assert.deepEqual(binds, ['nuevo']);
});

test('ignora estado invalido', () => {
  const { where, binds } = construirFiltroLeads({ estado: 'inventado' });
  assert.equal(where, '');
  assert.deepEqual(binds, []);
});

test('busqueda q cubre nombre, telefono y email', () => {
  const { where, binds } = construirFiltroLeads({ q: 'ana' });
  assert.match(where, /nombre LIKE \? OR telefono LIKE \? OR email LIKE \?/);
  assert.deepEqual(binds, ['%ana%', '%ana%', '%ana%']);
});

test('combina filtros con AND', () => {
  const { where, binds } = construirFiltroLeads({ estado: 'nuevo', servicio: 'afiliacion-eps' });
  assert.match(where, /WHERE .* AND /);
  assert.deepEqual(binds, ['nuevo', 'afiliacion-eps']);
});

test('diffAuditoria solo reporta campos cambiados', () => {
  const d = diffAuditoria(
    { estado: 'nuevo', notas: 'a' },
    { estado: 'contactado', notas: 'a' }
  );
  assert.deepEqual(d, { estado: { de: 'nuevo', a: 'contactado' } });
});

test('ESTADOS coincide con el esquema', () => {
  assert.deepEqual(ESTADOS, ['nuevo', 'contactado', 'cotizado', 'cerrado', 'perdido']);
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `cd worker && npm test`
Expected: FAIL — el módulo/exports no existen.

- [ ] **Step 3: Implementar los helpers puros**

```js
// worker/src/leads.js

export const ESTADOS = ['nuevo', 'contactado', 'cotizado', 'cerrado', 'perdido'];

/**
 * Construye la clausula WHERE y los binds para listar leads.
 * Solo acepta valores conocidos; ignora en silencio lo invalido.
 */
export function construirFiltroLeads({ estado, servicio, origen, q, desde, hasta } = {}) {
  const cond = [];
  const binds = [];
  if (estado && ESTADOS.includes(estado)) { cond.push('estado = ?'); binds.push(estado); }
  if (servicio) { cond.push('servicio_interes = ?'); binds.push(servicio); }
  if (origen) { cond.push('utm_source = ?'); binds.push(origen); }
  if (q) {
    cond.push('(nombre LIKE ? OR telefono LIKE ? OR email LIKE ?)');
    binds.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (desde) { cond.push('creado >= ?'); binds.push(desde); }
  if (hasta) { cond.push('creado <= ?'); binds.push(hasta); }
  const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
  return { where, binds };
}

/** Devuelve solo los campos que cambiaron, como { campo: { de, a } }. */
export function diffAuditoria(antes, despues) {
  const d = {};
  for (const k of Object.keys(despues)) {
    if (antes[k] !== despues[k]) d[k] = { de: antes[k], a: despues[k] };
  }
  return d;
}
```

- [ ] **Step 4: Correr y ver que pasa**

Run: `cd worker && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add worker/src/leads.js worker/test/leads.test.js
git commit -m "feat(worker): helpers puros de filtro y diff de auditoria de leads"
```

---

## Task 4: Ejecutores D1 en leads.js

**Files:**
- Modify: `worker/src/leads.js`

No se automatiza con `node --test` (requieren binding D1). Se verifican contra D1 local en la Tarea 6.

- [ ] **Step 1: Añadir los ejecutores al final de `leads.js`**

```js
// --- Ejecutores D1 (verificados contra D1 local, no en node --test) ---

/** Inserta un lead. Devuelve el id nuevo. */
export async function insertarLead(db, lead) {
  const { results } = await db
    .prepare(
      `INSERT INTO leads
        (nombre, telefono, email, ciudad, servicio_interes, mensaje,
         utm_source, utm_campaign, codigo_atribucion, pagina_origen, canal,
         calculo_ingreso, calculo_ibc, calculo_total,
         autorizacion_datos, autorizacion_fecha, autorizacion_version,
         ip_hash, user_agent)
       VALUES (?,?,?,?,?,?, ?,?,?,?,?, ?,?,?, ?,?,?, ?,?)
       RETURNING id`
    )
    .bind(
      lead.nombre, lead.telefono, lead.email ?? null, lead.ciudad ?? null,
      lead.servicio_interes ?? null, lead.mensaje ?? null,
      lead.utm_source ?? 'directo', lead.utm_campaign ?? null,
      lead.codigo_atribucion ?? null, lead.pagina_origen ?? null,
      lead.canal ?? 'formulario',
      lead.calculo_ingreso ?? null, lead.calculo_ibc ?? null, lead.calculo_total ?? null,
      lead.autorizacion_datos ? 1 : 0, lead.autorizacion_fecha ?? null,
      lead.autorizacion_version ?? null,
      lead.ip_hash ?? null, lead.user_agent ?? null
    )
    .all();
  return results?.[0]?.id;
}

/** Inserta un evento medible. */
export async function insertarEvento(db, ev) {
  await db
    .prepare(
      `INSERT INTO eventos
        (tipo, detalle, pagina, utm_source, utm_campaign, codigo_atribucion, lead_id)
       VALUES (?,?,?,?,?,?,?)`
    )
    .bind(
      ev.tipo, ev.detalle ?? null, ev.pagina ?? null,
      ev.utm_source ?? null, ev.utm_campaign ?? null,
      ev.codigo_atribucion ?? null, ev.lead_id ?? null
    )
    .run();
}

/** Lista leads con filtros y paginacion. Devuelve { leads, total, pagina, tam }. */
export async function listarLeads(db, params = {}) {
  const { construirFiltroLeads } = await import('./leads.js');
  const { where, binds } = construirFiltroLeads(params);
  const pagina = Math.max(1, Number(params.pagina) || 1);
  const tam = Math.min(100, Math.max(1, Number(params.tam) || 25));
  const offset = (pagina - 1) * tam;

  const totalRow = await db.prepare(`SELECT COUNT(*) AS n FROM leads ${where}`).bind(...binds).first();
  const { results } = await db
    .prepare(`SELECT * FROM leads ${where} ORDER BY creado DESC LIMIT ? OFFSET ?`)
    .bind(...binds, tam, offset)
    .all();
  return { leads: results ?? [], total: totalRow?.n ?? 0, pagina, tam };
}

/** Lead + sus eventos, o null si no existe. */
export async function obtenerLead(db, id) {
  const lead = await db.prepare('SELECT * FROM leads WHERE id = ?').bind(id).first();
  if (!lead) return null;
  const { results } = await db
    .prepare('SELECT * FROM eventos WHERE lead_id = ? ORDER BY creado DESC')
    .bind(id)
    .all();
  return { ...lead, eventos: results ?? [] };
}

/**
 * Actualiza los campos de gestion y registra auditoria.
 * `cambios` solo puede traer: estado, notas, motivo_perdida, valor_cerrado.
 * Devuelve { ok, error }.
 */
export async function actualizarLead(db, id, cambios, usuario) {
  const permitidos = ['estado', 'notas', 'motivo_perdida', 'valor_cerrado'];
  if (cambios.estado && !ESTADOS.includes(cambios.estado)) {
    return { ok: false, error: 'estado invalido' };
  }
  const antes = await db.prepare('SELECT * FROM leads WHERE id = ?').bind(id).first();
  if (!antes) return { ok: false, error: 'no existe' };

  const sets = [];
  const binds = [];
  const despues = { ...antes };
  for (const k of permitidos) {
    if (cambios[k] !== undefined) {
      sets.push(`${k} = ?`);
      binds.push(cambios[k]);
      despues[k] = cambios[k];
    }
  }
  if (!sets.length) return { ok: true };
  sets.push(`actualizado = datetime('now')`);

  const diff = diffAuditoria(
    Object.fromEntries(permitidos.map((k) => [k, antes[k]])),
    Object.fromEntries(permitidos.map((k) => [k, despues[k]]))
  );

  await db.batch([
    db.prepare(`UPDATE leads SET ${sets.join(', ')} WHERE id = ?`).bind(...binds, id),
    db.prepare(
      `INSERT INTO auditoria (usuario, accion, entidad, entidad_id, detalle)
       VALUES (?, 'lead.update', 'leads', ?, ?)`
    ).bind(usuario ?? null, String(id), JSON.stringify(diff)),
  ]);
  return { ok: true };
}

/** KPIs: conteo por estado y leads del mes en curso. */
export async function resumenLeads(db) {
  const { results: porEstado } = await db
    .prepare('SELECT estado, COUNT(*) AS n FROM leads GROUP BY estado')
    .all();
  const delMes = await db
    .prepare(`SELECT COUNT(*) AS n FROM leads WHERE creado >= datetime('now','start of month')`)
    .first();
  return { porEstado: porEstado ?? [], delMes: delMes?.n ?? 0 };
}
```

Nota: el `import('./leads.js')` dinámico dentro de `listarLeads` evita re-declarar; en la práctica `construirFiltroLeads` ya está en el mismo módulo, así que **usarlo directamente** sin el import. Corregir a: `const { where, binds } = construirFiltroLeads(params);` (misma función del módulo). El `await import` se elimina.

- [ ] **Step 2: Verificación diferida**

Estos ejecutores se prueban en la Tarea 6 con D1 local. No hay test automatizado aquí.

- [ ] **Step 3: Commit**

```bash
git add worker/src/leads.js
git commit -m "feat(worker): ejecutores D1 de leads (insertar, listar, obtener, actualizar, resumen)"
```

---

## Task 5: Enrutado, auth y doble escritura en index.js

**Files:**
- Modify: `worker/src/index.js`

- [ ] **Step 1: Importar los módulos nuevos**

Al inicio de `worker/src/index.js`:

```js
import { tokenValido } from './auth.js';
import { hashIp } from './hash.js';
import {
  insertarLead, insertarEvento, listarLeads, obtenerLead, actualizarLead, resumenLeads,
} from './leads.js';
```

- [ ] **Step 2: Doble escritura en `POST /api/lead`**

Reemplazar el bloque actual de `/api/lead` por:

```js
if (url.pathname === '/api/lead' && request.method === 'POST') {
  const raw = await request.text();
  let lead = {};
  try { lead = JSON.parse(raw); } catch { /* GAS recibe el crudo igual */ }

  if (env.DB && lead && lead.nombre && lead.telefono) {
    try {
      lead.ip_hash = await hashIp(request.headers.get('CF-Connecting-IP'));
      lead.user_agent = request.headers.get('User-Agent') || null;
      await insertarLead(env.DB, lead);
    } catch (e) {
      console.error('D1 insert lead fallo:', e.message); // no aborta el reenvio
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
```

- [ ] **Step 3: Doble escritura en `POST /api/evento`**

Reemplazar el bloque actual de `/api/evento` por:

```js
if (url.pathname === '/api/evento' && request.method === 'POST') {
  const raw = await request.text();
  let ev = {};
  try { ev = JSON.parse(raw); } catch { /* ignora */ }

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
```

- [ ] **Step 4: Rutas admin (antes del 404 final)**

```js
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
```

Añadir `PATCH` a `Access-Control-Allow-Methods` en `corsHeaders`:
`'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',`

- [ ] **Step 5: Verificar que arranca sin errores de sintaxis**

Run: `cd worker && npx wrangler deploy --dry-run --outdir /tmp/wout 2>&1 | tail -5`
Expected: build sin errores (`Total Upload` o mensaje de dry-run exitoso).

- [ ] **Step 6: Commit**

```bash
git add worker/src/index.js
git commit -m "feat(worker): doble escritura a D1 y API admin de leads con Bearer"
```

---

## Task 6: Verificación de integración con D1 local

**Files:** ninguno (verificación).

- [ ] **Step 1: Aplicar el esquema a D1 local**

```bash
cd worker && npx wrangler d1 execute asesorias-db --local --file=esquema.sql --yes
```

- [ ] **Step 2: Levantar el Worker en local**

```bash
cd worker && npx wrangler dev --local --var ADMIN_TOKEN:pruebalocal --var GAS_WEBAPP_URL:https://example.com &
```

- [ ] **Step 3: Insertar un lead vía la API**

```bash
curl -s -X POST http://localhost:8787/api/lead -H 'Content-Type: application/json' \
  -d '{"nombre":"Ana Prueba","telefono":"3001234567","servicio_interes":"afiliacion-eps","utm_source":"google"}'
```

Expected: responde (el reenvío a example.com falla, pero el lead ya entró en D1).

- [ ] **Step 4: Confirmar en D1 local**

```bash
cd worker && npx wrangler d1 execute asesorias-db --local --command "SELECT id, nombre, estado FROM leads"
```

Expected: aparece "Ana Prueba" con estado `nuevo`.

- [ ] **Step 5: Listar por la API admin**

```bash
curl -s http://localhost:8787/api/admin/leads -H 'Authorization: Bearer pruebalocal'
```

Expected: JSON con el lead y `total: 1`. Sin el header → 401.

- [ ] **Step 6: Cambiar estado y verificar auditoría**

```bash
curl -s -X PATCH http://localhost:8787/api/admin/leads/1 -H 'Authorization: Bearer pruebalocal' \
  -H 'Content-Type: application/json' -d '{"estado":"contactado","notas":"llamada hecha"}'
cd worker && npx wrangler d1 execute asesorias-db --local --command "SELECT accion, detalle FROM auditoria"
```

Expected: PATCH `{"ok":true}`; auditoría con `lead.update` y el diff del estado. Estado inválido (`{"estado":"x"}`) → 400.

- [ ] **Step 7: Detener el Worker local**

```bash
kill %1 2>/dev/null || true
```

No hay commit (solo verificación). Si algo falla, volver a la tarea correspondiente.

---

## Task 7: Shell del panel `/admin/leads`

**Files:**
- Create: `site/src/pages/admin/leads.astro`
- Modify: `site/public/robots.txt` (o el generador; ver Step 3)
- Review: `site/src/pages/sitemap.xml.js`

- [ ] **Step 1: Crear la página con noindex y contenedor**

```astro
---
// site/src/pages/admin/leads.astro
// Panel interno. No indexable. Protegido por Cloudflare Access + Bearer token.
const API = 'https://asesorias-api-proxy.andresmartinezr2204.workers.dev/api';
---
<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, nofollow" />
    <title>Panel · Leads</title>
  </head>
  <body>
    <main id="panel" data-api={API}>
      <section id="gate" hidden>
        <h1>Panel de leads</h1>
        <label>Clave de acceso <input id="clave" type="password" autocomplete="off" /></label>
        <button id="entrar">Entrar</button>
        <p id="gate-error" role="alert"></p>
      </section>
      <section id="app" hidden>
        <header id="kpis"></header>
        <div id="filtros">
          <input id="q" placeholder="Buscar nombre, teléfono o email" />
          <select id="f-estado"><option value="">Todos los estados</option></select>
        </div>
        <table><thead><tr>
          <th>Nombre</th><th>Teléfono</th><th>Servicio</th><th>Origen</th><th>Estado</th><th>Fecha</th>
        </tr></thead><tbody id="filas"></tbody></table>
        <div id="paginacion"></div>
        <aside id="detalle" hidden></aside>
      </section>
    </main>
    <script src="../../scripts/panel-leads.js"></script>
  </body>
</html>
```

- [ ] **Step 2: Verificar que el build genera la página con noindex**

Run: `cd site && npm run build && grep -l "noindex" dist/admin/leads/index.html`
Expected: la ruta aparece (la página se construyó con la meta noindex).

- [ ] **Step 3: Bloquear /admin en robots.txt**

Ver el contenido actual: `cat site/public/robots.txt`. Añadir la línea:

```
Disallow: /admin
```

(Si `robots.txt` se genera por código en vez de `public/`, editar el generador correspondiente. Confirmar con `grep -ri "robots" site/src`.)

- [ ] **Step 4: Excluir /admin del sitemap**

Revisar `site/src/pages/sitemap.xml.js`. Asegurar que la lista de URLs excluye cualquier ruta que empiece por `/admin`. Si enumera páginas de `src/pages`, añadir un filtro `.filter((u) => !u.includes('/admin'))`. Verificar tras el build:

Run: `grep -c "/admin" site/dist/sitemap.xml`
Expected: `0`.

- [ ] **Step 5: Commit**

```bash
git add site/src/pages/admin/leads.astro site/public/robots.txt site/src/pages/sitemap.xml.js
git commit -m "feat(panel): shell de /admin/leads noindex y fuera del sitemap"
```

---

## Task 8: Lógica cliente del panel

**Files:**
- Create: `site/src/scripts/panel-leads.js`

Se verifica manualmente contra el Worker (Tarea 10). No hay test automatizado de DOM.

- [ ] **Step 1: Implementar el cliente**

```js
// site/src/scripts/panel-leads.js
const API = document.getElementById('panel').dataset.api;
const $ = (id) => document.getElementById(id);
const ESTADOS = ['nuevo', 'contactado', 'cotizado', 'cerrado', 'perdido'];

const clave = () => sessionStorage.getItem('panel_token');
const setClave = (v) => sessionStorage.setItem('panel_token', v);
const limpiarClave = () => sessionStorage.removeItem('panel_token');

async function api(ruta, opciones = {}) {
  const r = await fetch(API + ruta, {
    ...opciones,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${clave()}`, ...(opciones.headers || {}) },
  });
  if (r.status === 401) { limpiarClave(); mostrarGate('Clave incorrecta o sesión expirada.'); throw new Error('401'); }
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.status === 204 ? null : r.json();
}

function mostrarGate(msg = '') {
  $('gate').hidden = false; $('app').hidden = true; $('gate-error').textContent = msg;
}
function mostrarApp() { $('gate').hidden = true; $('app').hidden = false; }

$('entrar').addEventListener('click', async () => {
  setClave($('clave').value.trim());
  try { await cargar(); mostrarApp(); } catch { /* mostrarGate ya se llamó */ }
});

function pintarEstadosSelect() {
  for (const e of ESTADOS) {
    const o = document.createElement('option'); o.value = e; o.textContent = e;
    $('f-estado').appendChild(o);
  }
}

async function cargar() {
  const params = new URLSearchParams();
  if ($('q').value) params.set('q', $('q').value);
  if ($('f-estado').value) params.set('estado', $('f-estado').value);
  const [resumen, data] = await Promise.all([
    api('/admin/resumen'),
    api('/admin/leads?' + params.toString()),
  ]);
  pintarKpis(resumen);
  pintarFilas(data.leads);
}

function pintarKpis(r) {
  const porEstado = Object.fromEntries((r.porEstado || []).map((x) => [x.estado, x.n]));
  $('kpis').textContent = `Leads del mes: ${r.delMes} · ` +
    ESTADOS.map((e) => `${e}: ${porEstado[e] || 0}`).join(' · ');
}

function pintarFilas(leads) {
  $('filas').innerHTML = '';
  for (const l of leads) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${esc(l.nombre)}</td><td>${esc(l.telefono)}</td>` +
      `<td>${esc(l.servicio_interes || '')}</td><td>${esc(l.utm_source || '')}</td>` +
      `<td>${esc(l.estado)}</td><td>${esc((l.creado || '').slice(0, 10))}</td>`;
    tr.addEventListener('click', () => verDetalle(l.id));
    $('filas').appendChild(tr);
  }
}

async function verDetalle(id) {
  const l = await api(`/admin/leads/${id}`);
  const opts = ESTADOS.map((e) => `<option value="${e}" ${e === l.estado ? 'selected' : ''}>${e}</option>`).join('');
  $('detalle').hidden = false;
  $('detalle').innerHTML = `
    <h2>${esc(l.nombre)}</h2>
    <p>${esc(l.telefono)} · ${esc(l.email || '')} · ${esc(l.ciudad || '')}</p>
    <p>Servicio: ${esc(l.servicio_interes || '—')} · Origen: ${esc(l.utm_source || '—')}</p>
    ${l.calculo_total ? `<p>Cálculo adjunto: ingreso ${l.calculo_ingreso}, IBC ${l.calculo_ibc}, total ${l.calculo_total}</p>` : ''}
    <p>${esc(l.mensaje || '')}</p>
    <label>Estado <select id="d-estado">${opts}</select></label>
    <label>Notas <textarea id="d-notas">${esc(l.notas || '')}</textarea></label>
    <button id="d-guardar">Guardar</button>
    <h3>Eventos</h3>
    <ul>${(l.eventos || []).map((e) => `<li>${esc(e.creado)} — ${esc(e.tipo)} ${esc(e.detalle || '')}</li>`).join('')}</ul>`;
  $('d-guardar').addEventListener('click', async () => {
    await api(`/admin/leads/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ estado: $('d-estado').value, notas: $('d-notas').value }),
    });
    $('detalle').hidden = true;
    await cargar();
  });
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

$('q').addEventListener('input', debounce(cargar, 300));
$('f-estado').addEventListener('change', cargar);
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

pintarEstadosSelect();
if (clave()) { cargar().then(mostrarApp).catch(() => {}); } else { mostrarGate(); }
```

- [ ] **Step 2: Verificar que el build lo empaqueta**

Run: `cd site && npm run build 2>&1 | tail -3`
Expected: build exitoso; Astro empaqueta el script referenciado.

- [ ] **Step 3: Commit**

```bash
git add site/src/scripts/panel-leads.js
git commit -m "feat(panel): cliente de gestion de leads (lista, filtros, detalle, estado)"
```

---

## Task 9: Configurar secreto y desplegar el Worker

**Files:** ninguno (despliegue). **Acción externa: confirmar con el usuario antes de desplegar.**

- [ ] **Step 1: Fijar el ADMIN_TOKEN**

Generar un valor fuerte y ponerlo como secreto. Comando para el usuario:

```bash
cd worker && npx wrangler secret put ADMIN_TOKEN
```

Pega un valor aleatorio largo (p. ej. salida de `openssl rand -base64 24`). Guárdalo: es la clave que se escribe en el gate del panel hasta que Access esté activo.

- [ ] **Step 2: Desplegar el Worker**

```bash
cd worker && npx wrangler deploy
```

Expected: despliegue exitoso con el binding D1 `DB` listado.

- [ ] **Step 3: Humo en producción**

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  https://asesorias-api-proxy.andresmartinezr2204.workers.dev/api/admin/leads
```

Expected: `401` (sin token). Con `Authorization: Bearer <ADMIN_TOKEN>` → `200`.

Sin commit (el push del sitio dispara Pages; el Worker se despliega aparte).

---

## Task 10: Verificación end-to-end (checklist del runbook)

**Files:** ninguno.

- [ ] **Step 1: Lead real desde el sitio → D1**

Enviar el formulario en `asesoriasas.com` (o disparar `POST /api/lead`) y confirmar:

```bash
cd worker && npx wrangler d1 execute asesorias-db --remote --command \
  "SELECT id, nombre, creado FROM leads ORDER BY creado DESC LIMIT 3"
```

Expected: aparece el lead recién enviado.

- [ ] **Step 2: Clic de WhatsApp → eventos**

Hacer clic en un botón de WhatsApp del sitio y confirmar:

```bash
cd worker && npx wrangler d1 execute asesorias-db --remote --command \
  "SELECT tipo, creado FROM eventos ORDER BY creado DESC LIMIT 3"
```

Expected: fila de evento de WhatsApp. (Si el sitio aún no envía `/api/evento` en el clic de WhatsApp, es trabajo de la Fase 0/medición; anotarlo, no bloquear este slice.)

- [ ] **Step 3: `/admin/leads` exige clave**

Abrir `https://asesoriasas.com/admin/leads`: sin clave muestra el gate; con la clave correcta lista los leads. Estado inválido rechazado.

- [ ] **Step 4: Marcar el checklist del runbook** en `docs/operacion/runbook-panel.md` (Verificación) los ítems cumplidos por este slice.

---

## Self-review (cobertura del spec)

- §4.1 captura doble escritura → Task 5 (steps 2–3). ✅
- §4.2 API admin (leads/detalle/patch/resumen + auth 401/400/404) → Tasks 1, 4, 5. ✅
- §4.2 módulo `leads.js` separado de HTTP → Tasks 3–4. ✅
- §4.3 panel gate + tabla + detalle + estado + KPIs → Tasks 7–8. ✅
- §4.3 noindex + fuera de sitemap → Task 7. ✅
- ip_hash SHA-256 → Task 2, usado en Task 5. ✅
- §6 manejo de errores (D1 no aborta captura; 401/400/404) → Tasks 5. ✅
- §7 pruebas (unit de helpers + integración D1 local) → Tasks 1–3, 6. ✅
- §8 secretos ADMIN_TOKEN + binding DB → Task 9 (binding ya en wrangler.toml). ✅

Nota de corrección aplicada: en Task 4, `listarLeads` usa `construirFiltroLeads` del propio módulo (sin `await import`).
