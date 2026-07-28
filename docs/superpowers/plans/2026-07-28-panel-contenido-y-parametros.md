# Panel de contenido + parámetros y cutover a D1 — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development o superpowers:executing-plans. Pasos con checkbox (`- [ ]`).

**Goal:** Sembrar el contenido del sitio en D1, hacer que `getAllData` lea de D1 (cutover), exponer una API admin CRUD de contenido/parámetros con botón Publicar, y las vistas de panel para editarlos.

**Architecture:** Un módulo `worker/src/contenido.js` con (a) `getAllDataDesdeD1(db)` que arma el contrato del §3 del spec, (b) un CRUD genérico dirigido por un mapa de recursos (tabla, PK, columnas), y (c) `publicar(env)`. `index.js` enruta. El sitio no cambia su capa de datos: sigue llamando `getAllData`. Panel: páginas Astro hermanas de `leads.astro`.

**Tech Stack:** Cloudflare Workers, D1, Astro estático, `node --test`, `wrangler d1 --local` + build local como gate antes del cutover en producción.

**Regla de oro:** No desplegar el cutover a producción hasta que un **build local del sitio contra el Worker local (D1 sembrada)** termine sin errores.

---

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `scripts/sembrar-contenido-d1.js` (crear) | Lee getAllData en vivo → emite `worker/siembra-contenido.sql`. |
| `worker/src/recursos.js` (crear) | Mapa de recursos admin (tabla, pk, columnas) + helpers puros de INSERT/UPDATE. |
| `worker/src/contenido.js` (crear) | `getAllDataDesdeD1`, CRUD genérico sobre D1, `publicar`. |
| `worker/src/index.js` (modificar) | getAllData desde D1; rutas admin de contenido/parámetros/publicar. |
| `worker/test/recursos.test.js` (crear) | Unit de los helpers de recursos.js. |
| `site/src/pages/admin/index.astro` (crear) | Índice del panel (enlaces + botón Publicar). |
| `site/src/pages/admin/parametros.astro` (crear) | Editor de parámetros. |
| `site/src/pages/admin/contenido.astro` (crear) | Editor de servicios/faq/testimonios/promociones. |
| `site/src/scripts/panel-contenido.js` (crear) | Cliente de las vistas de contenido/parámetros. |

---

## Task 1: Mapa de recursos y helpers puros

**Files:** Create `worker/src/recursos.js`, Test `worker/test/recursos.test.js`

Define el whitelist de recursos y construye SQL de forma segura (nunca interpolar columnas ajenas al whitelist).

- [ ] **Step 1: Test que falla**

```js
// worker/test/recursos.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RECURSOS, sqlInsert, sqlUpdate } from '../src/recursos.js';

test('recursos conocidos', () => {
  assert.deepEqual(Object.keys(RECURSOS).sort(),
    ['faq', 'parametros', 'promociones', 'servicios', 'testimonios']);
});

test('sqlInsert solo usa columnas whitelisted', () => {
  const { sql, binds } = sqlInsert('faq', { pregunta: 'p', respuesta: 'r', maligno: 'x' });
  assert.match(sql, /INSERT INTO faq \(pregunta, respuesta\) VALUES \(\?, \?\)/);
  assert.deepEqual(binds, ['p', 'r']);
});

test('sqlUpdate arma SET y WHERE por pk', () => {
  const { sql, binds } = sqlUpdate('servicios', 'afiliacion-eps', { nombre: 'X', activo: 1 });
  assert.match(sql, /UPDATE servicios SET nombre = \?, activo = \? WHERE slug = \?/);
  assert.deepEqual(binds, ['X', 1, 'afiliacion-eps']);
});

test('sqlInsert vacio lanza', () => {
  assert.throws(() => sqlInsert('faq', { maligno: 'x' }), /sin columnas/);
});
```

- [ ] **Step 2: Correr y ver fallo** — `cd worker && npm test` → FAIL.

- [ ] **Step 3: Implementar**

```js
// worker/src/recursos.js
export const RECURSOS = {
  servicios: {
    tabla: 'servicios', pk: 'slug',
    columnas: ['slug','nombre','descripcion_corta','descripcion_larga','icono','categoria','honorario_desde','orden','activo'],
  },
  faq: {
    tabla: 'faq', pk: 'id',
    columnas: ['pregunta','respuesta','categoria','orden','activo'],
  },
  testimonios: {
    tabla: 'testimonios', pk: 'id',
    columnas: ['nombre','cargo_o_ciudad','testimonio','calificacion','activo'],
  },
  promociones: {
    tabla: 'promociones', pk: 'id',
    columnas: ['titulo','descripcion','imagen','vigente_hasta','orden','activo'],
  },
  parametros: {
    tabla: 'parametros', pk: 'clave',
    columnas: ['clave','valor','tipo','descripcion'],
  },
};

function columnasValidas(recurso, datos) {
  const def = RECURSOS[recurso];
  if (!def) throw new Error('recurso desconocido');
  return def.columnas.filter((c) => datos[c] !== undefined);
}

export function sqlInsert(recurso, datos) {
  const def = RECURSOS[recurso];
  const cols = columnasValidas(recurso, datos);
  if (!cols.length) throw new Error('sin columnas');
  const sql = `INSERT INTO ${def.tabla} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`;
  return { sql, binds: cols.map((c) => datos[c]) };
}

export function sqlUpdate(recurso, pkValor, datos) {
  const def = RECURSOS[recurso];
  const cols = columnasValidas(recurso, datos).filter((c) => c !== def.pk);
  if (!cols.length) throw new Error('sin columnas');
  const sql = `UPDATE ${def.tabla} SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE ${def.pk} = ?`;
  return { sql, binds: [...cols.map((c) => datos[c]), pkValor] };
}
```

- [ ] **Step 4: Correr y ver pasar** — `cd worker && npm test` → PASS.
- [ ] **Step 5: Commit** — `git add worker/src/recursos.js worker/test/recursos.test.js && git commit -m "feat(worker): mapa de recursos admin y SQL seguro (whitelist de columnas)"`

---

## Task 2: contenido.js — getAllData desde D1, CRUD genérico y publicar

**Files:** Create `worker/src/contenido.js`

Los ejecutores D1 se verifican en la Tarea 4 (local). No hay test automatizado.

- [ ] **Step 1: Implementar**

```js
// worker/src/contenido.js
import { RECURSOS, sqlInsert, sqlUpdate } from './recursos.js';

const activos = (rows) => (rows || []).filter((r) => r.activo);

/** Arma el contrato getAllData (ver spec §3) desde D1. */
export async function getAllDataDesdeD1(db) {
  const [params, servicios, faq, testimonios, promos] = await Promise.all([
    db.prepare('SELECT clave, valor FROM parametros').all(),
    db.prepare('SELECT * FROM servicios WHERE activo = 1 ORDER BY orden').all(),
    db.prepare('SELECT * FROM faq WHERE activo = 1 ORDER BY orden').all(),
    db.prepare('SELECT * FROM testimonios WHERE activo = 1').all(),
    db.prepare('SELECT * FROM promociones WHERE activo = 1 ORDER BY orden').all(),
  ]);
  const config = {};
  for (const p of params.results || []) config[p.clave] = p.valor;
  return {
    config,
    servicios: servicios.results || [],
    faq: faq.results || [],
    testimonios: testimonios.results || [],
    flyers: promos.results || [],   // la portada consume `flyers`
  };
}

/** Lista un recurso (incluye inactivos, para gestion). */
export async function listar(db, recurso) {
  const def = RECURSOS[recurso];
  const { results } = await db.prepare(`SELECT * FROM ${def.tabla} ORDER BY ${def.pk === 'id' ? 'id DESC' : def.pk}`).all();
  return results || [];
}

export async function crear(db, recurso, datos, usuario) {
  const { sql, binds } = sqlInsert(recurso, datos);
  await db.batch([
    db.prepare(sql).bind(...binds),
    auditar(db, `${recurso}.crear`, recurso, String(datos[RECURSOS[recurso].pk] ?? ''), datos, usuario),
  ]);
  return { ok: true };
}

export async function editar(db, recurso, pkValor, datos, usuario) {
  const { sql, binds } = sqlUpdate(recurso, pkValor, datos);
  await db.batch([
    db.prepare(sql).bind(...binds),
    auditar(db, `${recurso}.editar`, recurso, String(pkValor), datos, usuario),
  ]);
  return { ok: true };
}

export async function eliminar(db, recurso, pkValor, usuario) {
  const def = RECURSOS[recurso];
  await db.batch([
    db.prepare(`DELETE FROM ${def.tabla} WHERE ${def.pk} = ?`).bind(pkValor),
    auditar(db, `${recurso}.eliminar`, recurso, String(pkValor), {}, usuario),
  ]);
  return { ok: true };
}

function auditar(db, accion, entidad, entidadId, detalle, usuario) {
  return db.prepare(
    `INSERT INTO auditoria (usuario, accion, entidad, entidad_id, detalle) VALUES (?,?,?,?,?)`
  ).bind(usuario ?? null, accion, entidad, entidadId, JSON.stringify(detalle));
}

/** Dispara el deploy hook de Pages para reconstruir el sitio. */
export async function publicar(env) {
  if (!env.DEPLOY_HOOK_URL) return { ok: false, error: 'deploy hook no configurado' };
  const r = await fetch(env.DEPLOY_HOOK_URL, { method: 'POST' });
  return { ok: r.ok, status: r.status };
}
```

- [ ] **Step 2: Commit** — `git add worker/src/contenido.js && git commit -m "feat(worker): getAllData desde D1, CRUD generico de contenido y publicar"`

---

## Task 3: Enrutado en index.js (cutover getAllData + rutas admin)

**Files:** Modify `worker/src/index.js`

- [ ] **Step 1: Import**

Añadir junto a los imports existentes:

```js
import { RECURSOS } from './recursos.js';
import { getAllDataDesdeD1, listar, crear, editar, eliminar, publicar } from './contenido.js';
```

- [ ] **Step 2: Cutover de getAllData**

Reemplazar el bloque actual `if (url.pathname === '/api/getAllData' ...)` por uno que arma desde D1 (conservando el cache de 5 min):

```js
if (url.pathname === '/api/getAllData' && request.method === 'GET') {
  const cache = caches.default;
  const cacheKey = new Request(url.toString(), request);
  const cached = await cache.match(cacheKey);
  if (cached) {
    const headers = new Headers(cached.headers);
    Object.entries(corsHeaders).forEach(([k, v]) => headers.set(k, v));
    headers.set('X-Cache', 'HIT');
    return new Response(cached.body, { status: cached.status, headers });
  }
  const data = await getAllDataDesdeD1(env.DB);
  const response = new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300', 'X-Cache': 'MISS', ...corsHeaders },
  });
  ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}
```

- [ ] **Step 3: Rutas admin de contenido/parametros/publicar**

Dentro del bloque `if (url.pathname.startsWith('/api/admin/'))`, **después** de las rutas de leads y **antes** del `return json({ error: 'ruta admin no encontrada' }, 404)`:

```js
if (url.pathname === '/api/admin/publicar' && request.method === 'POST') {
  return json(await publicar(env));
}
const rec = url.pathname.match(/^\/api\/admin\/(servicios|faq|testimonios|promociones|parametros)(?:\/(.+))?$/);
if (rec) {
  const recurso = rec[1];
  const pk = rec[2] ? decodeURIComponent(rec[2]) : null;
  const usuario = request.headers.get('Cf-Access-Authenticated-User-Email') || 'token';
  if (request.method === 'GET' && !pk) return json(await listar(env.DB, recurso));
  if (request.method === 'POST' && !pk) return json(await crear(env.DB, recurso, await request.json(), usuario));
  if (request.method === 'PATCH' && pk) return json(await editar(env.DB, recurso, pk, await request.json(), usuario));
  if (request.method === 'DELETE' && pk) return json(await eliminar(env.DB, recurso, pk, usuario));
  return json({ error: 'metodo no soportado' }, 405);
}
```

- [ ] **Step 4: Quitar dependencia de gasUrl para getAllData**

`getAllData` ya no usa Apps Script. La captura de leads/eventos **sí** sigue usando `gasUrl` (doble escritura). Dejar la comprobación `if (!gasUrl) 500` solo para las rutas que lo usan, o moverla dentro de los handlers de lead/evento. Mínimo: asegurar que getAllData y las rutas admin no dependan de `gasUrl`.

- [ ] **Step 5: Dry-run** — `cd worker && npx wrangler deploy --dry-run --outdir /tmp/wout` → sin errores.
- [ ] **Step 6: Commit** — `git add worker/src/index.js && git commit -m "feat(worker): getAllData desde D1 (cutover) y rutas admin de contenido"`

---

## Task 4: Siembra de D1 y GATE de verificación local

**Files:** Create `scripts/sembrar-contenido-d1.js`

- [ ] **Step 1: Script de siembra**

```js
// scripts/sembrar-contenido-d1.js
// Lee getAllData en vivo (aun desde la hoja) y emite worker/siembra-contenido.sql.
// Uso: node scripts/sembrar-contenido-d1.js
import { writeFileSync } from 'node:fs';

const API = 'https://asesorias-api-proxy.andresmartinezr2204.workers.dev/api/getAllData';
const q = (v) => v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`;
const b = (v) => (v === true || v === 1 || v === '1' || v === 'true') ? 1 : 0;

// Parametros de calculo verificados (no vienen de la hoja).
const PARAMS_CALCULO = {
  smlmv: '1750905', auxilio_transporte: '249095',
  ibc_porcentaje_contratista: '0.4', ibc_minimo_smlmv: '1', ibc_maximo_smlmv: '25',
  tasa_salud: '0.125', tasa_pension: '0.16', tasa_ccf_independiente: '0.02', tasa_ccf_empleador: '0.04',
  arl_clase_1: '0.00522', arl_clase_2: '0.01044', arl_clase_3: '0.02436', arl_clase_4: '0.0435', arl_clase_5: '0.0696',
  fsp_umbral_smlmv: '4',
};

const data = await (await fetch(API)).json();
const out = [];

// parametros = config de la hoja + params de calculo
const paramsCombinados = { ...data.config, ...PARAMS_CALCULO };
for (const [clave, valor] of Object.entries(paramsCombinados)) {
  const tipo = /smlmv|tasa|ibc|arl|fsp|auxilio|precio|honorario/.test(clave) ? 'numero' : 'texto';
  out.push(`INSERT OR REPLACE INTO parametros (clave, valor, tipo) VALUES (${q(clave)}, ${q(valor)}, ${q(tipo)});`);
}
for (const s of data.servicios || []) {
  out.push(`INSERT OR REPLACE INTO servicios (slug,nombre,descripcion_corta,descripcion_larga,icono,categoria,honorario_desde,orden,activo) VALUES (${q(s.slug)},${q(s.nombre)},${q(s.descripcion_corta)},${q(s.descripcion_larga)},${q(s.icono)},${q(s.categoria)},${s.honorario_desde ? Number(s.honorario_desde) : 'NULL'},${Number(s.orden) || 0},${b(s.activo)});`);
}
for (const f of data.faq || []) {
  out.push(`INSERT INTO faq (pregunta,respuesta,categoria,orden,activo) VALUES (${q(f.pregunta)},${q(f.respuesta)},${q(f.categoria)},${Number(f.orden) || 0},${b(f.activo)});`);
}
for (const t of data.testimonios || []) {
  out.push(`INSERT INTO testimonios (nombre,cargo_o_ciudad,testimonio,calificacion,activo) VALUES (${q(t.nombre)},${q(t.cargo_o_ciudad || t.ciudad)},${q(t.testimonio)},${t.calificacion ? Number(t.calificacion) : 'NULL'},${b(t.activo)});`);
}
for (const p of data.flyers || []) {
  out.push(`INSERT INTO promociones (titulo,descripcion,vigente_hasta,orden,activo) VALUES (${q(p.titulo)},${q(p.descripcion)},${q(p.vigente_hasta)},${Number(p.orden) || 0},${b(p.activo)});`);
}

writeFileSync('worker/siembra-contenido.sql', out.join('\n') + '\n');
console.log(`Generado worker/siembra-contenido.sql con ${out.length} sentencias.`);
```

- [ ] **Step 2: Generar y REVISAR el SQL**

```bash
node scripts/sembrar-contenido-d1.js
cat worker/siembra-contenido.sql
```

Revisar a ojo: nº de servicios/faq/etc. coincide con la web; sin comillas rotas; smlmv=1750905.

- [ ] **Step 3: Aplicar a D1 LOCAL y verificar contenido**

```bash
cd worker && npx wrangler d1 execute asesorias-db --local --file=siembra-contenido.sql --yes
npx wrangler d1 execute asesorias-db --local --command "SELECT (SELECT COUNT(*) FROM servicios) servicios, (SELECT COUNT(*) FROM faq) faq, (SELECT COUNT(*) FROM parametros) params, (SELECT valor FROM parametros WHERE clave='smlmv') smlmv"
```

Expected: conteos > 0, smlmv=1750905.

- [ ] **Step 4: GATE — build local del sitio contra el Worker local**

```bash
cd worker && npx wrangler dev --local --var ADMIN_TOKEN:x --var GAS_WEBAPP_URL:https://example.com --port 8787 &
# En site/, apuntar temporalmente ORIGEN al worker local y construir:
cd ../site && sed -i 's#https://asesorias-api-proxy.andresmartinezr2204.workers.dev/api#http://localhost:8787/api#' src/datos/api.js
npm run build 2>&1 | tail -5
git checkout src/datos/api.js   # revertir el cambio temporal de ORIGEN
```

Expected: **el build termina sin errores** (35+ páginas). Si falla, corregir el mapeo en `contenido.js`/siembra antes de continuar. Detener el worker local al terminar.

- [ ] **Step 5: Commit** — `git add scripts/sembrar-contenido-d1.js && git commit -m "feat: script de siembra de contenido a D1 y verificacion de build local"`

(No commitear `worker/siembra-contenido.sql`: es un artefacto de datos; añadir a `worker/.gitignore` si se desea.)

---

## Task 5: Aplicar siembra a producción y desplegar el cutover

**Files:** ninguno. **Acción externa — confirmar con el usuario.**

- [ ] **Step 1: Aplicar siembra a D1 remoto**

```bash
cd worker && npx wrangler d1 execute asesorias-db --remote --file=siembra-contenido.sql --yes
```

- [ ] **Step 2: Desplegar el Worker** — `cd worker && npx wrangler deploy`

- [ ] **Step 3: Humo** — `curl -s "$BASE/getAllData" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const d=JSON.parse(s);console.log('servicios',d.servicios.length,'faq',d.faq.length,'smlmv',d.config.smlmv)})"`

Expected: conteos correctos, smlmv=1750905, desde D1.

- [ ] **Step 4: Reconstruir el sitio** (push vacío o deploy hook) y verificar que asesoriasas.com sigue completo.

---

## Task 6: Deploy hook y botón Publicar

**Files:** ninguno de código nuevo (el endpoint ya existe en Task 2/3).

- [ ] **Step 1 (usuario):** Crear deploy hook en Pages → proyecto asesorias-seguridad-social → Settings → Builds & deployments → Deploy hooks → nombre `panel-publicar`, branch `main`. Copiar la URL.
- [ ] **Step 2:** `cd worker && npx wrangler secret put DEPLOY_HOOK_URL` (pegar la URL) y `npx wrangler deploy`.
- [ ] **Step 3:** Verificar `POST /api/admin/publicar` con Bearer dispara un build en Pages.

---

## Task 7: Vistas de panel (índice, parámetros, contenido)

**Files:** Create `site/src/pages/admin/index.astro`, `parametros.astro`, `contenido.astro`, `site/src/scripts/panel-contenido.js`

Reutilizan el gate (clave en sessionStorage) y el estilo de `leads.astro`.

- [ ] **Step 1: Índice `/admin/`** — enlaces a Leads, Contenido, Parámetros + botón Publicar (llama `/api/admin/publicar`).
- [ ] **Step 2: `/admin/parametros`** — tabla de clave/valor/tipo; editar valor por fila (`PATCH /api/admin/parametros/:clave`), avisar que hay que Publicar para reflejar.
- [ ] **Step 3: `/admin/contenido`** — selector de recurso (servicios/faq/testimonios/promociones); tabla + alta/edición/activar-desactivar contra `/api/admin/<recurso>`.
- [ ] **Step 4: `panel-contenido.js`** — cliente compartido: gate, fetch con Bearer, render de tablas y formularios, manejo de 401.
- [ ] **Step 5: Build** — `cd site && npm run build` sin errores; páginas `/admin/*` con noindex.
- [ ] **Step 6: Commit** — `git commit -m "feat(panel): vistas de contenido y parametros con Publicar"`

- [ ] **Step 7: Publicar el sitio** (push a main) → verificar `/admin/parametros` y `/admin/contenido` en producción tras pasar Access.

---

## Self-review (cobertura del spec)

- §3 contrato getAllData (config/servicios/faq/testimonios/flyers; sin videos/mantenimiento) → Task 2 `getAllDataDesdeD1`. ✅
- §4 cutover directo → Task 3 (getAllData) + Task 5 (deploy). ✅
- §5.1 siembra desde getAllData en vivo → Task 4. ✅
- §5.3 CRUD 5 recursos con auditoría → Tasks 1–3. ✅
- §5.4 publicar via deploy hook → Task 2/3 + Task 6. ✅
- §5.5 vistas panel → Task 7. ✅
- §6 gate de build local antes del cutover → Task 4 Step 4. ✅
- §7 DEPLOY_HOOK_URL secreto → Task 6. ✅
