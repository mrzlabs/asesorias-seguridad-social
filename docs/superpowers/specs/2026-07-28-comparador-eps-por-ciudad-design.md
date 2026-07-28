# Diseño: Comparador de EPS por ciudad (Fase 4, primer slice)

- **Fecha:** 2026-07-28
- **Proyecto:** asesorias-seguridad-social (asesoriasas.com)
- **Estado:** Aprobado — pendiente de plan de implementación
- **Diseño padre:** [posicionamiento-y-panel-design](2026-07-27-posicionamiento-y-panel-design.md) §5, §7.4, §15

---

## 1. Objetivo

Publicar un comparador de EPS por ciudad — la herramienta que el análisis de
competencia (§1 del diseño padre) identificó como el hueco que ningún competidor
cubre — para las cinco ciudades de la primera ola: Bogotá, Medellín, Cali,
Barranquilla y Bucaramanga.

## 2. Restricción central: no ser *doorway pages*

Páginas ciudad × entidad generadas por plantilla rellenada hacen que Google
penalice **todo el dominio** (§15). Reglas obligatorias, no negociables:

1. Una ciudad se genera y entra al sitemap **solo si** `publicada = 1` y tiene
   introducción única real más coberturas reales suficientes.
2. Los datos se siembran con `publicada = 0` y `verificado = 0`; **nada se
   publica hasta que el negocio revise y apruebe**.
3. Cada página lleva su `canonical`. Ninguna depende de JS para su contenido.
4. No se inventan datos. Lo no verificable se marca `verificado = 0` con su
   `fuente` y no se publica.

## 3. Modelo de datos (nuevas tablas D1)

```sql
CREATE TABLE eps (
  slug TEXT PRIMARY KEY, nombre TEXT NOT NULL, nombre_corto TEXT,
  tipo TEXT DEFAULT 'contributivo' CHECK (tipo IN ('contributivo','subsidiado','ambos')),
  sitio_web TEXT, telefono TEXT, logo TEXT,
  orden INTEGER DEFAULT 0, activo INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0,1))
);
CREATE TABLE ciudades (
  slug TEXT PRIMARY KEY, nombre TEXT NOT NULL, departamento TEXT,
  descripcion TEXT,                     -- intro única, contenido diferenciador
  publicada INTEGER NOT NULL DEFAULT 0 CHECK (publicada IN (0,1)),
  activo INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0,1)),
  actualizado TEXT
);
CREATE TABLE eps_ciudad (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  eps_slug TEXT NOT NULL REFERENCES eps(slug) ON DELETE CASCADE,
  ciudad_slug TEXT NOT NULL REFERENCES ciudades(slug) ON DELETE CASCADE,
  disponible INTEGER NOT NULL DEFAULT 1 CHECK (disponible IN (0,1)),
  red_atencion TEXT, particularidades TEXT,
  fuente TEXT, verificado INTEGER NOT NULL DEFAULT 0 CHECK (verificado IN (0,1)),
  actualizado TEXT,
  UNIQUE (eps_slug, ciudad_slug)
);
```

## 4. Worker

- **`GET /api/eps`** (público, cacheado 5 min como getAllData): devuelve
  `{ eps: [activos], ciudades: [publicadas], coberturas: [de ciudades publicadas] }`.
  El build del sitio lo consume. Solo expone ciudades `publicada = 1`.
- **CRUD admin** de `eps`, `ciudades`, `eps_ciudad`: se añaden al mapa `RECURSOS`
  de `worker/src/recursos.js` (whitelist de columnas) y quedan servidos por el
  ruteo admin genérico existente. `eps_ciudad` se gestiona por `id`.
- Reutiliza la ruta keyless `/admin/api/*` (Access) y `publicar`.

## 5. Panel — sección "EPS y ciudades"

Nueva página `/admin/eps` (en la barra de navegación):
- **Catálogo de EPS:** lista + alta/edición (nombre, tipo, web, teléfono, orden, activo).
- **Ciudades:** lista + edición; toggle **Publicada** (con aviso: publicar mete la
  ciudad al sitio); campo de introducción única.
- **Cobertura por ciudad:** se elige una ciudad → tabla de todas las EPS con
  checkbox *disponible* + campos *red de atención*, *particularidades*, *fuente*,
  y toggle *verificado*. Guardado por fila (crea/actualiza `eps_ciudad`).

## 6. Sitio — páginas programáticas

- **`/eps/`** — hub: qué es el comparador, lista de ciudades publicadas (enlaces),
  catálogo de EPS. JSON-LD `BreadcrumbList`.
- **`/eps/[ciudad]/`** — el comparador de esa ciudad: `getStaticPaths` genera
  **solo** ciudades `publicada = 1`. Contenido: intro única de la ciudad, tabla
  comparativa de EPS disponibles (cobertura, red, particularidades), aviso de
  fuente/fecha, CTA a WhatsApp con atribución. `canonical`, JSON-LD
  `BreadcrumbList`. Se decide **página comparadora por ciudad** (no una por
  cada EPS×ciudad) para minimizar número de páginas y riesgo doorway.
- Nuevo módulo de datos `site/src/datos/eps.js` (fetch a `/api/eps`, cacheado).
- `sitemap.xml`: añade `/eps/` y una entrada por ciudad **publicada**.

## 7. Investigación y siembra

- Catálogo nacional de EPS del régimen contributivo (público y estable): se
  siembra verificado.
- Cobertura por ciudad (primera ola): se investiga en fuentes públicas (ADRES,
  sitios de cada EPS), se siembra con `verificado = 0`, `fuente` con la URL, y
  las cinco ciudades con `publicada = 0`. **El negocio revisa y publica.**
- Script `scripts/sembrar-eps.js` → `worker/siembra-eps.sql` (revisar antes de aplicar).

## 8. Manejo de errores y build

- Con cero ciudades publicadas, `/eps/` se construye (hub con "próximamente"
  o lista vacía manejada) y **no** se generan páginas de ciudad. El build no falla.
- `/api/eps` ante D1 vacío devuelve listas vacías, no error.

## 9. Pruebas

- Unit: helpers de armado del comparador (agrupar coberturas por ciudad) puros.
- Integración D1 local: sembrar, `GET /api/eps` devuelve solo publicadas.
- Build local: con una ciudad publicada de prueba, `/eps/[ciudad]/` se genera con
  contenido; sin publicadas, solo `/eps/` y build verde.

## 10. Fuera de alcance

Landings servicio × ciudad (`/[servicio]/[ciudad]/`), páginas por-EPS-detalle,
panel SEO (Search Console). Olas posteriores de ciudades.
