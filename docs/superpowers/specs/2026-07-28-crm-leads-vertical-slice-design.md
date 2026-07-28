# Diseño: CRM de leads — primer vertical slice (Fase 2)

- **Fecha:** 2026-07-28
- **Proyecto:** asesorias-seguridad-social (asesoriasas.com)
- **Estado:** Aprobado — pendiente de plan de implementación
- **Diseño padre:** [posicionamiento-y-panel-design](2026-07-27-posicionamiento-y-panel-design.md) §8, §10
- **ADR relacionado:** [0002-datos-en-d1-no-sheets](../../adr/0002-datos-en-d1-no-sheets.md)

---

## 1. Contexto

La base D1 `asesorias-db` ya existe (`database_id e5d54c57-954c-4b06-969b-ca587ac70bdb`)
con el esquema de `worker/esquema.sql` aplicado (8 tablas). El Worker
`asesorias-api-proxy` hoy es un proxy hacia la Web App de Apps Script: `POST /api/lead`
y `POST /api/evento` reenvían a Google Sheets, y `GET /api/getAllData` cachea el
contenido.

Este slice conecta la captura de leads a D1 y construye la primera vista del panel
(gestión de leads), sin retirar todavía Apps Script.

## 2. Objetivo del slice

Que cada lead y cada evento queden registrados en D1, y que el dueño del negocio
pueda listar, filtrar, ver el detalle y cambiar el estado de los leads desde
`/admin/leads`, sin tocar Google Sheets.

**Fuera de este slice** (pasos posteriores): migración del histórico desde la hoja,
CMS de contenido, panel de SEO, dashboard de embudo completo, y el retiro de Apps
Script (runbook paso 7).

## 3. Decisiones tomadas

| Decisión | Elección | Razón |
|---|---|---|
| Transición de escritura | **Doble escritura** (D1 + reenvío a GAS) | Cero pérdida de leads durante la transición; GAS se retira después. |
| Fallo de D1 en captura | No bloquea el reenvío a GAS | La captura del lead nunca debe perderse por un error de la base nueva. |
| Auth de la API admin (interino) | **Bearer token** (`ADMIN_TOKEN`, secreto de wrangler) | Funciona antes de Cloudflare Access; Access lo reemplaza como candado exterior sin quitar código. |
| Auth de la API admin (final) | Cloudflare Access delante de `/admin` | Ya decidido en el diseño padre §10. La configura el dueño de la cuenta. |
| IP del lead | `ip_hash` = SHA-256 de la IP | El esquema pide trazabilidad sin datos personales crudos. |
| Ubicación del panel | Página Astro `/admin/leads`, isla `client:load` | Reutiliza el proyecto de Pages existente; contenido dinámico por fetch. |
| Indexación del panel | `noindex` + excluido del `sitemap.xml` | El panel no es contenido público que deba posicionar. |

## 4. Componentes

### 4.1 Worker — captura con doble escritura

Requiere el binding D1 `DB` (ya añadido a `worker/wrangler.toml`).

- **`POST /api/lead`**
  1. Parsea el cuerpo JSON del lead.
  2. Calcula `ip_hash` con SHA-256 de `CF-Connecting-IP`.
  3. `INSERT` en `leads` con nombre, teléfono, email, ciudad, servicio de interés,
     mensaje, atribución (utm_source, utm_campaign, codigo_atribucion, pagina_origen,
     canal), cálculo adjunto (calculo_ingreso, calculo_ibc, calculo_total),
     consentimiento (autorizacion_datos, autorizacion_fecha, autorizacion_version),
     user_agent e ip_hash. Envuelto en try/catch: un fallo se registra y no aborta.
  4. Reenvía a Apps Script exactamente como hoy y devuelve su respuesta.

- **`POST /api/evento`**
  1. Parsea el evento (tipo, detalle, pagina, utm_source, utm_campaign,
     codigo_atribucion, lead_id opcional).
  2. `INSERT` en `eventos` (dentro de `ctx.waitUntil`, no bloquea).
  3. Mantiene el reenvío fire-and-forget a GAS como hoy. Responde 204.

### 4.2 Worker — API de administración

Todas exigen `Authorization: Bearer <ADMIN_TOKEN>`. Sin él, o con token que no
coincide con `env.ADMIN_TOKEN`, responden **401**. Comparación en tiempo constante.

- **`GET /api/admin/leads`** — lista paginada. Query params opcionales:
  `estado`, `servicio`, `origen` (utm_source), `q` (busca en nombre/teléfono/email),
  `desde`, `hasta` (fechas), `pagina` (default 1), `tam` (default 25, máx 100).
  Devuelve `{ leads: [...], total, pagina, tam }`.
- **`GET /api/admin/leads/:id`** — detalle del lead + sus filas de `eventos`
  (`WHERE lead_id = :id`).
- **`PATCH /api/admin/leads/:id`** — actualiza los campos de gestión permitidos:
  `estado` (validado contra el CHECK del esquema), `notas`, `motivo_perdida`,
  `valor_cerrado`. Fija `actualizado = datetime('now')`. Inserta una fila en
  `auditoria` (accion `lead.update`, entidad `leads`, entidad_id, detalle con el
  diff). Rechaza estados inválidos con 400.
- **`GET /api/admin/resumen`** — KPIs mínimos: conteo por estado y total de leads
  del mes en curso. Alimenta el encabezado de la vista de leads.

Diseño de altitud: la lógica de acceso a D1 (queries de leads/eventos/auditoría)
se separa en un módulo `worker/src/leads.js`; `index.js` solo enruta y aplica
CORS/auth. El límite: `index.js` no arma SQL, `leads.js` no conoce HTTP.

### 4.3 Panel — `/admin/leads`

Página Astro estática que hidrata una isla cliente (`client:load`), marcada
`noindex` y excluida del `sitemap.xml`.

- **Gate de acceso interino:** si no hay clave en `sessionStorage`, muestra un
  campo para escribir la clave de acceso (el `ADMIN_TOKEN`). Se guarda en
  `sessionStorage` y viaja como `Authorization: Bearer` en cada fetch. Un 401
  limpia la clave y vuelve a pedirla. Cuando Cloudflare Access esté activo, este
  gate queda detrás de Access (doble candado).
- **Tabla de leads:** columnas nombre, teléfono, servicio, origen, estado, fecha.
  Filtros por estado, servicio y búsqueda de texto. Paginación.
- **Detalle:** panel lateral con todos los datos del lead, el cálculo adjunto si
  existe, y la lista de eventos. Controles para cambiar estado, añadir notas y
  (si se marca perdido/cerrado) motivo o valor.
- **Encabezado:** los KPIs de `/api/admin/resumen`.

El panel apunta al mismo origen del Worker que ya usa `site/src/datos/api.js`
(`https://asesorias-api-proxy.andresmartinezr2204.workers.dev/api`).

## 5. Flujo de datos

```
Sitio (form / WhatsApp)
   └─ POST /api/lead ──▶ Worker ──▶ D1.leads (nuevo)
                             └────▶ Apps Script ▶ Google Sheets (se conserva)

Panel /admin/leads ──(Bearer)──▶ Worker /api/admin/* ──▶ D1 (leads, eventos, auditoria)
        ▲
   Cloudflare Access (candado exterior, lo configura el dueño)
```

## 6. Manejo de errores

- Captura: fallo de D1 → se registra en el log del Worker y se continúa con GAS.
  Nunca se devuelve error al sitio por un fallo de la base nueva.
- Admin: sin token o token inválido → 401. Estado inválido en PATCH → 400. Lead
  inexistente → 404. Error de D1 → 500 con mensaje genérico (sin filtrar SQL).
- Panel: 401 limpia la clave y re-pide; otros errores muestran un aviso y permiten
  reintentar. El panel nunca deja al usuario en un estado ambiguo.

## 7. Pruebas

- Unit del módulo `leads.js`: construcción de filtros y del diff de auditoría con
  datos de ejemplo (sin red).
- Integración con D1 local (`wrangler d1 execute --local`): insertar un lead,
  listarlo con filtros, cambiar estado y verificar la fila de `auditoria`.
- Verificación manual (runbook): lead real desde el sitio aparece en D1; clic de
  WhatsApp genera fila en `eventos`; `/admin/leads` exige clave; estado inválido
  se rechaza.

## 8. Secretos y configuración

- `ADMIN_TOKEN` — secreto del Worker: `npx wrangler secret put ADMIN_TOKEN`.
- Binding D1 `DB` — ya en `worker/wrangler.toml`.
- `GAS_WEBAPP_URL`, `ALLOWED_ORIGIN` — ya existentes, sin cambios.

## 9. Riesgos

| Riesgo | Mitigación |
|---|---|
| Doble escritura duplica el lead si se cuenta en dos fuentes | Durante la transición la fuente de reportes sigue siendo GAS; D1 se valida en paralelo antes de invertir la relación. |
| `ADMIN_TOKEN` expuesto por ir en el navegador | Es interino y de bajo alcance (solo lectura/gestión de leads); Cloudflare Access es el candado real. Rotar el token al activar Access. |
| Panel público antes de Access | La API va con token; la shell sin datos no filtra información. Aun así, activar Access pronto. |
