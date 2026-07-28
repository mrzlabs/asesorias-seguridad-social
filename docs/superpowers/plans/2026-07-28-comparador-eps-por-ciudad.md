# Comparador de EPS por ciudad — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development o executing-plans. Pasos con checkbox.

**Goal:** Comparador de EPS por ciudad para 5 ciudades, con datos investigados y sembrados sin publicar; el negocio revisa y publica desde el panel.

**Architecture:** Tres tablas D1 (eps, ciudades, eps_ciudad). El Worker expone `/api/eps` (público, solo ciudades publicadas) y CRUD admin genérico. El sitio genera `/eps/` y `/eps/[ciudad]/` (solo publicadas) en build. Panel: sección "EPS y ciudades".

**Regla de oro:** ninguna ciudad se publica (`publicada=1`) hasta revisión del negocio; el sitemap solo incluye publicadas.

---

## Task 1: Esquema D1

**Files:** Modify `worker/esquema.sql`

- [ ] **Step 1:** Añadir al final de `esquema.sql` las tablas `eps`, `ciudades`, `eps_ciudad` (ver spec §3), con índices en `eps_ciudad(ciudad_slug)` y `eps_ciudad(eps_slug)`.
- [ ] **Step 2:** Aplicar local: `cd worker && npx wrangler d1 execute asesorias-db --local --file=esquema.sql --yes` (IF NOT EXISTS lo hace idempotente).
- [ ] **Step 3:** Verificar: `... --command "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('eps','ciudades','eps_ciudad')"` → 3 filas.
- [ ] **Step 4:** Commit.

---

## Task 2: Recursos admin + endpoint público

**Files:** Modify `worker/src/recursos.js`, Create `worker/src/eps.js`, Modify `worker/src/index.js`, `worker/test/recursos.test.js`

- [ ] **Step 1:** En `recursos.js`, añadir a `RECURSOS`:
  - `eps`: pk `slug`, columnas `[slug,nombre,nombre_corto,tipo,sitio_web,telefono,logo,orden,activo]`.
  - `ciudades`: pk `slug`, columnas `[slug,nombre,departamento,descripcion,publicada,activo]`.
  - `eps_ciudad`: pk `id`, columnas `[eps_slug,ciudad_slug,disponible,red_atencion,particularidades,fuente,verificado]`.
- [ ] **Step 2:** Test en `recursos.test.js`: `RECURSOS` incluye los tres nuevos; `sqlInsert('eps_ciudad', {eps_slug:'x',ciudad_slug:'y',maligno:1})` solo usa columnas whitelisted. Correr `npm test` → falla, implementar, pasa.
- [ ] **Step 3:** `worker/src/eps.js`: `getEpsData(db)` devuelve `{ eps, ciudades, coberturas }` con `eps WHERE activo=1 ORDER BY orden`, `ciudades WHERE publicada=1`, `eps_ciudad` de esas ciudades (JOIN o WHERE ciudad_slug IN publicadas).
- [ ] **Step 4:** En `index.js`, ruta pública `GET /api/eps` (cache 5 min, como getAllData) → `getEpsData(env.DB)`. El CRUD admin ya cubre los nuevos recursos por el ruteo genérico (sin cambios).
- [ ] **Step 5:** `npm test` verde + `wrangler deploy --dry-run` sin errores. Commit.

---

## Task 3: Panel "EPS y ciudades"

**Files:** Create `site/src/pages/admin/eps.astro`, `site/src/scripts/panel-eps.js`, Modify `site/src/layouts/AdminLayout.astro`

- [ ] **Step 1:** En `AdminLayout.astro`, añadir al array `nav` `{ id:'eps', href:'/admin/eps/', etiqueta:'EPS y ciudades' }`.
- [ ] **Step 2:** `eps.astro` usa `AdminLayout` (`activo="eps"`). Tres bloques: Catálogo de EPS (tabs-estilo tarjetas como contenido), Ciudades (con toggle publicada + descripción), y "Cobertura por ciudad" (selector de ciudad + tabla de EPS con checkbox disponible + campos).
- [ ] **Step 3:** `panel-eps.js` (importa `panel-comun.js`, keyless): carga `/eps` list vía `req('/eps')`, `req('/ciudades')`, `req('/eps_ciudad')`; render y guardado por fila (POST/PATCH). Para cobertura: al elegir ciudad, mostrar cada EPS; guardar crea o actualiza la fila `eps_ciudad` (busca existente por eps_slug+ciudad_slug).
- [ ] **Step 4:** `npm run build` sin errores; `/admin/eps/` con noindex. Commit.

---

## Task 4: Páginas del sitio /eps/

**Files:** Create `site/src/datos/eps.js`, `site/src/pages/eps/index.astro`, `site/src/pages/eps/[ciudad].astro`, Modify `site/src/pages/sitemap.xml.js`

- [ ] **Step 1:** `site/src/datos/eps.js`: `obtenerEps()` hace fetch a `${ORIGEN}/eps` (reutilizar ORIGEN de api.js exportándolo o repetir constante), cachea. Devuelve `{eps,ciudades,coberturas}`.
- [ ] **Step 2:** `eps/index.astro`: hub con intro, lista de `ciudades` (enlaces a `/eps/[slug]/`), catálogo de `eps`. Usa el layout del sitio (Base.astro). Si no hay ciudades, muestra "próximamente". JSON-LD BreadcrumbList.
- [ ] **Step 3:** `eps/[ciudad].astro`: `getStaticPaths` desde `obtenerEps().ciudades` (solo publicadas, que ya filtra el endpoint). Por ciudad: intro (`descripcion`), tabla de EPS disponibles con `red_atencion`/`particularidades`, aviso de fuente, CTA WhatsApp. `canonical`, BreadcrumbList.
- [ ] **Step 4:** `sitemap.xml.js`: añadir `/eps/` (prioridad 0.6) y `...ciudades.map(c => /eps/${c.slug}/)` (0.6). Requiere importar `obtenerEps`.
- [ ] **Step 5:** `npm run build` (con 0 publicadas → solo `/eps/`, sin fallar). Commit.

---

## Task 5: Investigación y siembra

**Files:** Create `scripts/sembrar-eps.js`

- [ ] **Step 1:** Investigar (WebSearch/WebFetch) el catálogo nacional de EPS del contributivo y, por las 5 ciudades, disponibilidad/red desde fuentes públicas (ADRES, sitios EPS). Registrar `fuente` de cada dato.
- [ ] **Step 2:** `sembrar-eps.js` emite `worker/siembra-eps.sql`: `INSERT OR REPLACE` de eps (verificado), ciudades (`publicada=0`, con `descripcion` única redactada por ciudad), y eps_ciudad (`verificado=0` + `fuente`).
- [ ] **Step 3:** Revisar el SQL; aplicar local; `GET /api/eps` local devuelve eps y []ciudades (ninguna publicada aún). Aplicar remoto.
- [ ] **Step 4:** Añadir `siembra-eps.sql` a `worker/.gitignore`. Commit del script.

---

## Task 6: Verificación local del build con una ciudad publicada de prueba

- [ ] **Step 1:** En D1 local, `UPDATE ciudades SET publicada=1 WHERE slug='bogota'`.
- [ ] **Step 2:** Build local del sitio contra Worker local (misma técnica del cutover): `/eps/bogota/` se genera con contenido real; `/eps/` lista Bogotá; sitemap incluye `/eps/bogota/`.
- [ ] **Step 3:** Revertir la ciudad de prueba en local. No se publica nada en remoto.

---

## Task 7: Despliegue (estructura, sin publicar ciudades)

**Acción externa — confirmar con el usuario.**

- [ ] **Step 1:** Aplicar esquema + siembra a D1 remoto.
- [ ] **Step 2:** `wrangler deploy` (Worker con /api/eps + CRUD).
- [ ] **Step 3:** Push del sitio → `/eps/` en vivo (hub), sin páginas de ciudad (ninguna publicada).
- [ ] **Step 4:** El negocio revisa las coberturas en `/admin/eps/`, corrige, marca `verificado` y `publicada`, y pulsa Publicar. Recién ahí salen las ciudades.

---

## Self-review

- §3 tablas → Task 1. §4 /api/eps + CRUD → Task 2. §5 panel → Task 3.
- §6 páginas + sitemap gating → Task 4. §7 investigación/siembra sin publicar → Task 5.
- §8 build con 0 publicadas no falla → Tasks 4, 6. §2 anti-doorway (publicada gate) → Tasks 4, 5, 7.
