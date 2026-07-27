# Fase 0 — Fundamentos SEO y medición: Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar el sitio actual técnicamente indexable y completamente medible, y el repositorio con estructura auditable, sin esperar a la migración a Astro.

**Architecture:** Se trabaja sobre el `frontend/index.html` existente (HTML plano en Cloudflare Pages). Se corrigen los bloqueadores de indexación, se añade marcado estructurado, se instrumenta la medición de conversiones —incluidos los clics de WhatsApp, hoy invisibles— y se cubre todo con una suite de validación automatizada que corre en CI. El repositorio se reorganiza con documentación de decisiones (ADR), changelog y scripts.

**Tech Stack:** HTML5 + JavaScript vanilla, Cloudflare Pages, Cloudflare Workers, Node.js `node:test` (sin dependencias externas), GitHub Actions.

**Spec de referencia:** `docs/superpowers/specs/2026-07-27-posicionamiento-y-panel-design.md` (§9, §13, §14 Fase 0)

---

## Estructura de archivos objetivo

```
.
├── .github/workflows/ci.yml        Validación automática en cada push
├── docs/
│   ├── adr/                        Architecture Decision Records
│   │   ├── 0001-stack-astro-cloudflare.md
│   │   ├── 0002-datos-en-d1-no-sheets.md
│   │   ├── 0003-sin-consulta-automatizada-adres.md
│   │   └── 0004-precios-en-dos-capas.md
│   ├── operacion/
│   │   ├── runbook-despliegue.md
│   │   └── checklist-revision-parametros.md
│   ├── superpowers/{specs,plans}/  Especificaciones y planes
│   ├── arquitectura.md             (existente)
│   ├── sheets-schema.md            (existente)
│   └── PHVA-*.md                   (existentes)
├── frontend/
│   ├── index.html                  Se modifica
│   ├── robots.txt                  Nuevo
│   ├── sitemap.xml                 Nuevo
│   ├── _headers                    Se modifica
│   └── _redirects                  (existente, vacío)
├── scripts/
│   └── mock-server.js              Movido desde la raíz
├── tests/
│   ├── seo.test.js                 Validación de meta tags y JSON-LD
│   └── helpers/html.js             Utilidades de extracción
├── worker/                         (existente)
├── backend/                        (existente, se retira en Fase 2)
├── CHANGELOG.md                    Nuevo
├── CONTRIBUTING.md                 Nuevo
├── package.json                    Nuevo (raíz, solo scripts de test)
├── README.md                       Se reescribe
└── LICENSE                         (existente)
```

**Responsabilidad de cada pieza nueva:**

| Archivo | Responsabilidad única |
|---|---|
| `docs/adr/*` | Registrar por qué se tomó cada decisión técnica y qué se descartó. Es el núcleo de la auditabilidad: dentro de un año explica el porqué, no solo el qué |
| `docs/operacion/*` | Procedimientos repetibles que ejecuta el negocio, no el desarrollo |
| `tests/seo.test.js` | Impedir que una regresión rompa la indexabilidad sin que nadie se entere |
| `tests/helpers/html.js` | Extracción de fragmentos del HTML, sin lógica de aserción |
| `.github/workflows/ci.yml` | Ejecutar la validación en cada push |
| `CHANGELOG.md` | Historial legible de cambios por versión |
| `package.json` | Punto de entrada de los tests. Cero dependencias de producción |

---

## Tarea 1: Reestructurar el repositorio

**Files:**
- Create: `package.json`, `CHANGELOG.md`, `CONTRIBUTING.md`
- Create: `docs/adr/0001-stack-astro-cloudflare.md` … `0004-precios-en-dos-capas.md`
- Create: `docs/operacion/runbook-despliegue.md`, `docs/operacion/checklist-revision-parametros.md`
- Move: `mock-server.js` → `scripts/mock-server.js`
- Modify: `README.md` (reescritura completa)

- [ ] **Step 1: Crear `package.json` en la raíz**

```json
{
  "name": "asesorias-seguridad-social",
  "version": "0.1.0",
  "description": "Sitio y plataforma de Asesorias Seguridad Social SAS",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test tests/",
    "mock": "node scripts/mock-server.js"
  },
  "engines": {
    "node": ">=20"
  },
  "license": "MIT"
}
```

- [ ] **Step 2: Mover el mock server**

```bash
mkdir -p scripts
git mv mock-server.js scripts/mock-server.js 2>/dev/null || mv mock-server.js scripts/mock-server.js
```

Nota: `mock-server.js` no estaba trackeado, por lo que `git mv` fallará y aplicará el `mv` normal. Es correcto.

- [ ] **Step 3: Crear los cuatro ADR**

`docs/adr/0001-stack-astro-cloudflare.md`:

```markdown
# ADR 0001 — Stack: Astro sobre Cloudflare Pages

- **Fecha:** 2026-07-27
- **Estado:** Aceptado

## Contexto

El sitio era un unico `index.html` que inyectaba todo el contenido indexable por
JavaScript. Con esa base no es posible tener paginas por servicio ni por ciudad,
ni contenido que Google pueda rastrear de forma fiable.

## Decision

Migrar el frontend a Astro, manteniendo el despliegue en Cloudflare Pages.

## Alternativas consideradas

- **Next.js sobre Vercel:** mas potencia para el panel y un futuro portal de
  clientes, pero mayor complejidad operativa y costo mensual. Se descarta porque
  el portal del cliente final esta fuera del alcance actual.
- **Mantener HTML plano:** mas barato y rapido, pero deja el techo de
  posicionamiento donde esta hoy. Se descarta.

## Consecuencias

- Todo el contenido pasa a pre-renderizarse: 100% indexable.
- Las herramientas interactivas se implementan como islas con hidratacion diferida.
- Requiere un paso de build, que antes no existia.
```

`docs/adr/0002-datos-en-d1-no-sheets.md`:

```markdown
# ADR 0002 — Datos en Cloudflare D1, no en Google Sheets

- **Fecha:** 2026-07-27
- **Estado:** Aceptado

## Contexto

Google Sheets es la fuente de verdad de contenido y leads, leida via Apps Script.
Sheets no soporta consultas relacionales, no escala para un CRM y no permite
construir un panel con embudo de conversion.

## Decision

Migrar a Cloudflare D1 (SQLite). El Worker deja de ser proxy y pasa a exponer la
API sobre D1. Apps Script se retira tras validar la migracion.

## Consecuencias

- Sheets queda como respaldo exportable, no como fuente de verdad.
- Se habilitan el CRM, el embudo y el comparador de EPS por ciudad.
- La migracion de leads historicos debe validarse antes de retirar Apps Script.
```

`docs/adr/0003-sin-consulta-automatizada-adres.md`:

```markdown
# ADR 0003 — Sin consulta automatizada a ADRES

- **Fecha:** 2026-07-27
- **Estado:** Aceptado

## Contexto

Se requiere que el usuario pueda ver el estado de su afiliacion. ADRES no expone
API publica; su consulta BDUA esta protegida por CAPTCHA y la base no opera en
tiempo real (se actualiza por ciclos de varios dias habiles).

## Decision

No se implementa scraping, consulta automatizada ni resolucion de CAPTCHA contra
ADRES. Se construye un verificador asistido: validacion previa del documento,
orientacion sobre como interpretar el resultado, y enlace al portal oficial.

## Razon

Automatizar esa consulta violaria los terminos del portal estatal y constituye un
riesgo legal y reputacional directo para la marca.

## Consecuencias

- El verificador capta el lead sin depender de acceso no autorizado.
- El estado real de las afiliaciones gestionadas por la empresa si es dato propio
  y podra exponerse en el futuro portal del cliente.
```

`docs/adr/0004-precios-en-dos-capas.md`:

```markdown
# ADR 0004 — Precios en dos capas

- **Fecha:** 2026-07-27
- **Estado:** Aceptado

## Contexto

Ningun competidor del nicho publica precios. Publicar la tabla comercial completa
expone el margen; no publicar nada deja sin responder la busqueda "cuanto cuesta",
que es la de mayor intencion de compra.

## Decision

Se publican dos numeros con tratamiento distinto:

1. **Aporte de ley** (porcentajes y bases de cotizacion): publico y completo. Es
   informacion normativa, no el precio de la empresa. Es el contenido que posiciona.
2. **Honorario de gestion:** se publica como "desde $X". La tabla comercial
   completa permanece privada.

## Razon

El anclaje favorece la estructura: junto a un aporte de ley de varios cientos de
miles de pesos, un honorario "desde" de decenas de miles se percibe pequeno.

## Regla vinculante

El valor "desde" debe corresponder a un precio que al menos una quinta parte de
los clientes efectivamente paga. Un "desde" inalcanzable genera resenas negativas,
que danan el posicionamiento local de forma directa y duradera.
```

- [ ] **Step 4: Crear `docs/operacion/checklist-revision-parametros.md`**

```markdown
# Checklist: revision anual de parametros

**Frecuencia:** cada enero, al publicarse el nuevo SMLMV.
**Responsable:** operacion (no desarrollo).

Los parametros viven en la tabla `parametros` y se editan desde el panel. Ninguno
esta escrito en el codigo.

- [ ] Actualizar `smlmv` al valor vigente del ano
- [ ] Verificar `tasa_salud` (12.5%) contra normativa vigente
- [ ] Verificar `tasa_pension` (16%) contra normativa vigente
- [ ] Verificar `tasa_ccf` (4%)
- [ ] Verificar tarifas `arl_clase_1` a `arl_clase_5`
- [ ] Verificar umbral y escala del Fondo de Solidaridad Pensional
- [ ] Verificar `ibc_porcentaje_contratista` (40%) y topes (1 a 25 SMLMV)
- [ ] Recalcular un caso conocido a mano y comparar con la calculadora
- [ ] Revisar que los honorarios "desde" sigan cumpliendo la regla del ADR 0004

**Riesgo si se omite:** la calculadora entrega valores falsos a los usuarios
durante todo el ano.
```

- [ ] **Step 5: Crear `docs/operacion/runbook-despliegue.md`**

```markdown
# Runbook: despliegue

## Frontend (Cloudflare Pages)

Automatico al hacer push a `main`. Solo se despliega el contenido de `frontend/`.

Verificacion posterior:
1. Abrir https://asesoriasas.com en ventana privada
2. Confirmar que el contenido carga sin quedarse en "Cargando..."
3. Ejecutar `npm test` en local contra el HTML desplegado

## Worker (proxy de API)

Manual:

    cd worker
    npx wrangler deploy

Secretos requeridos: `GAS_WEBAPP_URL`, `ALLOWED_ORIGIN`.

## Backend Apps Script

Manual, mientras siga vigente (se retira en Fase 2):

    cd backend
    clasp push

## Rollback

Cloudflare Pages conserva los despliegues anteriores. Desde el panel de Cloudflare:
Deployments > seleccionar el despliegue estable > "Rollback to this deployment".
```

- [ ] **Step 6: Crear `CHANGELOG.md`**

```markdown
# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## [No publicado]

### Anadido
- Estructura de documentacion auditable: ADR, runbooks y checklists de operacion
- Suite de validacion automatizada de SEO tecnico
- Integracion continua en GitHub Actions

## [0.1.0] - 2026-07-27

### Anadido
- Spec de posicionamiento SEO, herramientas interactivas y panel de gestion
- Documentacion de arquitectura y PHVA
- Worker proxy hacia Apps Script
- Landing inicial en Cloudflare Pages
```

- [ ] **Step 7: Crear `CONTRIBUTING.md`**

```markdown
# Guia de contribucion

## Convencion de commits

Se usa [Conventional Commits](https://www.conventionalcommits.org/es/):

- `feat:` nueva funcionalidad
- `fix:` correccion de error
- `docs:` documentacion
- `test:` pruebas
- `chore:` mantenimiento, build, dependencias
- `refactor:` cambio interno sin alterar comportamiento

El asunto va en minuscula, en presente y sin punto final.

## Antes de abrir un cambio

    npm test

Debe pasar en verde. La CI lo ejecuta de todos modos en cada push.

## Decisiones tecnicas

Toda decision que cierre una alternativa se registra como ADR en `docs/adr/`,
numerado consecutivamente. Un ADR no se edita una vez aceptado: si cambia la
decision, se crea uno nuevo que lo reemplaza y se marca el anterior como
"Reemplazado por ADR NNNN".

## Estructura

    frontend/   Sitio estatico desplegado en Cloudflare Pages
    worker/     API en Cloudflare Workers
    backend/    Apps Script (legado, se retira en Fase 2)
    scripts/    Utilidades de desarrollo
    tests/      Validaciones automatizadas
    docs/       Especificaciones, planes, ADR y operacion
```

- [ ] **Step 8: Reescribir `README.md`**

```markdown
# Asesorias Seguridad Social SAS

Sitio y plataforma de gestion de [asesoriasas.com](https://asesoriasas.com).
Afiliaciones a EPS, ARL, pension y caja de compensacion en Colombia.

## Estado

En migracion. El sitio en produccion es HTML estatico; se esta migrando a Astro
con base de datos propia y panel de gestion. Ver
`docs/superpowers/specs/2026-07-27-posicionamiento-y-panel-design.md`.

## Arquitectura

    Usuario -> Cloudflare Pages (frontend/)
                    |
                    v
            Cloudflare Worker (worker/)
                    |
                    v
            Apps Script -> Google Sheets   [legado, se retira en Fase 2]

Detalle en `docs/arquitectura.md`.

## Estructura

| Carpeta | Contenido |
|---|---|
| `frontend/` | Sitio estatico desplegado en Cloudflare Pages |
| `worker/` | API en Cloudflare Workers |
| `backend/` | Apps Script (legado) |
| `scripts/` | Utilidades de desarrollo |
| `tests/` | Validaciones automatizadas |
| `docs/adr/` | Decisiones tecnicas y por que se tomaron |
| `docs/operacion/` | Runbooks y checklists del negocio |
| `docs/superpowers/` | Especificaciones y planes de implementacion |

## Desarrollo

Requiere Node.js 20 o superior.

    npm test      # Validaciones de SEO tecnico
    npm run mock  # Servidor de datos simulado en localhost:3001

Con el mock corriendo, abrir `frontend/index.html` desde `localhost` para que use
la API local en vez de la de produccion.

## Despliegue

`frontend/` se despliega solo al hacer push a `main`. El Worker y Apps Script son
manuales. Procedimiento completo y rollback en `docs/operacion/runbook-despliegue.md`.

## Documentacion

| Documento | Contenido |
|---|---|
| `docs/arquitectura.md` | Capas, componentes y flujo de despliegue |
| `docs/sheets-schema.md` | Esquema de las hojas de calculo (legado) |
| `docs/PHVA-tecnica.md` | Ciclo de mejora tecnica |
| `docs/PHVA-doomies.md` | Ciclo de mejora en lenguaje de negocio |
| `CONTRIBUTING.md` | Convenciones de commit y de ADR |
| `CHANGELOG.md` | Historial de cambios |

## Licencia

MIT
```

- [ ] **Step 9: Verificar que la estructura quedó completa**

Run: `ls docs/adr docs/operacion scripts && cat package.json`
Expected: cuatro ADR, dos documentos de operación, `scripts/mock-server.js`, y el `package.json` con los scripts `test` y `mock`.

- [ ] **Step 10: Commit**

```bash
git add package.json CHANGELOG.md CONTRIBUTING.md README.md docs/adr docs/operacion scripts/
git commit -m "chore: estructura de repositorio auditable con ADR y runbooks"
```

---

## Tarea 2: Suite de validación de SEO técnico

Esta tarea va **antes** de las correcciones: los tests deben fallar primero contra
el HTML actual, demostrando que los defectos existen.

**Files:**
- Create: `tests/helpers/html.js`
- Create: `tests/seo.test.js`

- [ ] **Step 1: Crear el helper de extracción**

`tests/helpers/html.js`:

```javascript
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export async function leerIndex() {
  return readFile(join(raiz, 'frontend', 'index.html'), 'utf8');
}

export async function leerArchivoFrontend(nombre) {
  return readFile(join(raiz, 'frontend', nombre), 'utf8');
}

/** Devuelve el <head> completo, sin el resto del documento. */
export function extraerHead(html) {
  const m = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  return m ? m[1] : '';
}

/** Cuenta cuantas etiquetas meta hay con un name o property dado. */
export function contarMeta(head, atributo, valor) {
  const re = new RegExp(`<meta[^>]*${atributo}=["']${valor}["'][^>]*>`, 'gi');
  return (head.match(re) || []).length;
}

/** Extrae el contenido del atributo content de la primera meta que coincida. */
export function contenidoMeta(head, atributo, valor) {
  const re = new RegExp(
    `<meta[^>]*${atributo}=["']${valor}["'][^>]*content=["']([^"']*)["']`,
    'i'
  );
  const m = head.match(re);
  return m ? m[1] : null;
}

/** Devuelve todos los bloques JSON-LD ya parseados. */
export function bloquesJsonLd(html) {
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const bloques = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    bloques.push(JSON.parse(m[1]));
  }
  return bloques;
}
```

- [ ] **Step 2: Escribir los tests que deben fallar**

`tests/seo.test.js`:

```javascript
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  leerIndex,
  leerArchivoFrontend,
  extraerHead,
  contarMeta,
  contenidoMeta,
  bloquesJsonLd,
} from './helpers/html.js';

describe('Meta tags unicos', () => {
  test('hay exactamente una meta description', async () => {
    const head = extraerHead(await leerIndex());
    assert.equal(contarMeta(head, 'name', 'description'), 1);
  });

  test('hay exactamente un og:title', async () => {
    const head = extraerHead(await leerIndex());
    assert.equal(contarMeta(head, 'property', 'og:title'), 1);
  });

  test('hay exactamente un og:description', async () => {
    const head = extraerHead(await leerIndex());
    assert.equal(contarMeta(head, 'property', 'og:description'), 1);
  });

  test('hay exactamente un og:type', async () => {
    const head = extraerHead(await leerIndex());
    assert.equal(contarMeta(head, 'property', 'og:type'), 1);
  });
});

describe('Etiquetas obligatorias', () => {
  test('existe canonical', async () => {
    const head = extraerHead(await leerIndex());
    assert.match(head, /<link[^>]*rel=["']canonical["'][^>]*>/i);
  });

  test('existe og:image', async () => {
    const head = extraerHead(await leerIndex());
    assert.equal(contarMeta(head, 'property', 'og:image'), 1);
  });

  test('existe twitter:card', async () => {
    const head = extraerHead(await leerIndex());
    assert.equal(contarMeta(head, 'name', 'twitter:card'), 1);
  });
});

describe('Title', () => {
  test('el title contiene una keyword del nicho', async () => {
    const html = await leerIndex();
    const m = html.match(/<title>([^<]*)<\/title>/i);
    assert.ok(m, 'no hay etiqueta title');
    assert.match(m[1], /afiliaci|seguridad social|eps/i);
  });

  test('el title mide entre 30 y 65 caracteres', async () => {
    const html = await leerIndex();
    const titulo = html.match(/<title>([^<]*)<\/title>/i)[1];
    assert.ok(
      titulo.length >= 30 && titulo.length <= 65,
      `el title mide ${titulo.length} caracteres`
    );
  });

  test('el JavaScript no sobrescribe document.title', async () => {
    const html = await leerIndex();
    assert.doesNotMatch(html, /document\.title\s*=/);
  });
});

describe('Meta description', () => {
  test('mide entre 70 y 160 caracteres', async () => {
    const head = extraerHead(await leerIndex());
    const desc = contenidoMeta(head, 'name', 'description');
    assert.ok(desc, 'no hay meta description');
    assert.ok(
      desc.length >= 70 && desc.length <= 160,
      `la description mide ${desc.length} caracteres`
    );
  });
});

describe('Datos estructurados', () => {
  test('hay al menos un bloque JSON-LD y todos son JSON valido', async () => {
    const bloques = bloquesJsonLd(await leerIndex());
    assert.ok(bloques.length > 0, 'no hay ningun bloque JSON-LD');
  });

  test('existe un nodo LocalBusiness o Organization', async () => {
    const bloques = bloquesJsonLd(await leerIndex());
    const tipos = bloques.flatMap((b) => (b['@graph'] || [b]).map((n) => n['@type']));
    assert.ok(
      tipos.some((t) => t === 'LocalBusiness' || t === 'Organization'),
      `tipos encontrados: ${tipos.join(', ')}`
    );
  });

  test('existe un nodo FAQPage', async () => {
    const bloques = bloquesJsonLd(await leerIndex());
    const tipos = bloques.flatMap((b) => (b['@graph'] || [b]).map((n) => n['@type']));
    assert.ok(tipos.includes('FAQPage'), `tipos encontrados: ${tipos.join(', ')}`);
  });

  test('el FAQPage tiene al menos tres preguntas', async () => {
    const bloques = bloquesJsonLd(await leerIndex());
    const nodos = bloques.flatMap((b) => b['@graph'] || [b]);
    const faq = nodos.find((n) => n['@type'] === 'FAQPage');
    assert.ok(faq, 'no hay nodo FAQPage');
    assert.ok(
      faq.mainEntity.length >= 3,
      `solo hay ${faq.mainEntity.length} preguntas`
    );
  });
});

describe('Archivos de rastreo', () => {
  test('existe robots.txt y apunta al sitemap', async () => {
    const robots = await leerArchivoFrontend('robots.txt');
    assert.match(robots, /Sitemap:\s*https:\/\/asesoriasas\.com\/sitemap\.xml/i);
  });

  test('existe sitemap.xml con al menos una url', async () => {
    const sitemap = await leerArchivoFrontend('sitemap.xml');
    assert.match(sitemap, /<urlset[^>]*>/i);
    assert.match(sitemap, /<loc>https:\/\/asesoriasas\.com\/?<\/loc>/i);
  });
});

describe('Medicion', () => {
  test('los clics de WhatsApp registran un evento', async () => {
    const html = await leerIndex();
    assert.match(html, /function\s+registrarEvento/);
    assert.match(html, /clic_whatsapp/);
  });

  test('el mensaje de WhatsApp propaga el origen de campana', async () => {
    const html = await leerIndex();
    assert.match(html, /codigoAtribucion/);
  });
});

describe('Experiencia de usuario', () => {
  test('no hay popup promocional automatico por temporizador', async () => {
    const html = await leerIndex();
    assert.doesNotMatch(html, /promoPop[\s\S]{0,200}classList\.add\(['"]act['"]\)/);
  });

  test('existe un estado de error si la API falla', async () => {
    const html = await leerIndex();
    assert.match(html, /mostrarErrorCarga/);
  });
});
```

- [ ] **Step 3: Ejecutar los tests y confirmar que fallan**

Run: `npm test`
Expected: FALLA. Deben fallar como mínimo los tests de meta description duplicada,
og:title duplicado, canonical ausente, og:image ausente, twitter:card ausente,
`document.title` sobrescrito, JSON-LD ausente, robots.txt y sitemap.xml
inexistentes, medición ausente y popup automático presente.

Este resultado es la evidencia documentada de los defectos del sitio actual.

- [ ] **Step 4: Commit**

```bash
git add package.json tests/
git commit -m "test: suite de validacion de SEO tecnico"
```

---

## Tarea 3: Corregir el `<head>`

**Files:**
- Modify: `frontend/index.html` (bloque `<head>`, líneas 4–22 del archivo actual)

- [ ] **Step 1: Reemplazar el bloque de meta tags duplicados**

Eliminar las líneas actuales que van desde `<meta property="og:title" ...>` (la
primera) hasta el segundo `<meta property="og:type" content="website">`, es decir
todo el bloque de metadatos duplicados, y dejar en su lugar exactamente esto:

```html
<title>Afiliación EPS, ARL y Pensión en Colombia | Asesorías SAS</title>
<meta name="description" content="Afiliación a EPS, ARL, pensión y caja de compensación para independientes y empresas en toda Colombia. Gestión 100% online en 24 horas.">
<link rel="canonical" href="https://asesoriasas.com/">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta property="og:title" content="Afiliación EPS, ARL y Pensión en Colombia | Asesorías SAS">
<meta property="og:description" content="Afiliación a EPS, ARL, pensión y caja de compensación para independientes y empresas en toda Colombia. Gestión 100% online en 24 horas.">
<meta property="og:type" content="website">
<meta property="og:url" content="https://asesoriasas.com/">
<meta property="og:image" content="https://asesoriasas.com/og-image.png">
<meta property="og:locale" content="es_CO">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Afiliación EPS, ARL y Pensión en Colombia | Asesorías SAS">
<meta name="twitter:description" content="Afiliación a EPS, ARL, pensión y caja de compensación para independientes y empresas en toda Colombia.">
<meta name="twitter:image" content="https://asesoriasas.com/og-image.png">
```

- [ ] **Step 2: Impedir que el JavaScript sobrescriba el título**

En la función `render()`, localizar y **eliminar** esta línea:

```javascript
document.title=c.empresa_nombre||'Seguridad Social';
```

El título optimizado del HTML debe sobrevivir. El nombre de la empresa sigue
mostrándose en la barra de navegación mediante `nav-emp`, que no se toca.

- [ ] **Step 3: Ejecutar los tests de `<head>`**

Run: `npm test`
Expected: pasan todos los tests de los bloques "Meta tags unicos", "Etiquetas
obligatorias", "Title" y "Meta description". Los demás siguen fallando.

- [ ] **Step 4: Commit**

```bash
git add frontend/index.html
git commit -m "fix: meta tags unicos, canonical y title optimizado"
```

---

## Tarea 4: Datos estructurados JSON-LD

**Files:**
- Modify: `frontend/index.html` (añadir antes de `</head>`)

- [ ] **Step 1: Añadir el bloque JSON-LD**

Insertar justo antes de `</head>`:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "LocalBusiness",
      "@id": "https://asesoriasas.com/#organizacion",
      "name": "Asesorías Seguridad Social SAS",
      "url": "https://asesoriasas.com/",
      "description": "Afiliación a EPS, ARL, pensión y caja de compensación para independientes y empresas en Colombia.",
      "telephone": "+573204060607",
      "areaServed": { "@type": "Country", "name": "Colombia" },
      "address": {
        "@type": "PostalAddress",
        "addressCountry": "CO"
      },
      "sameAs": ["https://www.facebook.com/Colombiasesorias"]
    },
    {
      "@type": "WebSite",
      "@id": "https://asesoriasas.com/#sitio",
      "url": "https://asesoriasas.com/",
      "name": "Asesorías Seguridad Social SAS",
      "inLanguage": "es-CO",
      "publisher": { "@id": "https://asesoriasas.com/#organizacion" }
    },
    {
      "@type": "FAQPage",
      "@id": "https://asesoriasas.com/#faq",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "¿Cómo me afilio a EPS siendo independiente?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Como independiente debes afiliarte de forma directa aportando sobre un IBC equivalente al 40% de tus ingresos brutos, con un mínimo de un salario mínimo. Nosotros gestionamos la afiliación ante la EPS que elijas y te entregamos los soportes."
          }
        },
        {
          "@type": "Question",
          "name": "¿Cuánto se paga de seguridad social como independiente?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Sobre el IBC se aporta 12.5% a salud, 16% a pensión y la tarifa de ARL según la clase de riesgo de la actividad. La caja de compensación es opcional y equivale al 4%."
          }
        },
        {
          "@type": "Question",
          "name": "¿Cuánto tarda una afiliación a EPS?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "La radicación se realiza en menos de 24 horas hábiles. La activación de la cobertura depende de los tiempos de cada entidad y del ciclo de reporte a la base de datos de ADRES."
          }
        },
        {
          "@type": "Question",
          "name": "¿Puedo trasladarme de EPS?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Sí. El traslado procede cuando llevas al menos doce meses continuos en tu EPS actual. Gestionamos el trámite y verificamos que quedes activo en la nueva entidad."
          }
        }
      ]
    }
  ]
}
</script>
```

Las respuestas de este bloque deben coincidir con las FAQ reales que se muestran
en la página. Si difieren, Google lo considera contenido inconsistente.

- [ ] **Step 2: Ejecutar los tests de datos estructurados**

Run: `npm test`
Expected: pasan los cuatro tests del bloque "Datos estructurados".

- [ ] **Step 3: Commit**

```bash
git add frontend/index.html
git commit -m "feat: datos estructurados LocalBusiness, WebSite y FAQPage"
```

---

## Tarea 5: `robots.txt` y `sitemap.xml`

**Files:**
- Create: `frontend/robots.txt`
- Create: `frontend/sitemap.xml`

- [ ] **Step 1: Crear `frontend/robots.txt`**

```
User-agent: *
Allow: /

Sitemap: https://asesoriasas.com/sitemap.xml
```

- [ ] **Step 2: Crear `frontend/sitemap.xml`**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://asesoriasas.com/</loc>
    <lastmod>2026-07-27</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
```

Una sola URL porque hoy el sitio tiene una sola página. En la Fase 1 pasa a
generarse automáticamente en el build.

- [ ] **Step 3: Ejecutar los tests de rastreo**

Run: `npm test`
Expected: pasan los dos tests del bloque "Archivos de rastreo".

- [ ] **Step 4: Commit**

```bash
git add frontend/robots.txt frontend/sitemap.xml
git commit -m "feat: robots.txt y sitemap.xml"
```

---

## Tarea 6: Medición de conversiones

Esta es la tarea de mayor valor de la fase: hoy el canal principal de conversión
es completamente ciego.

**Files:**
- Modify: `frontend/index.html` (bloque `<script>`)
- Modify: `worker/src/index.js` (nuevo endpoint)

- [ ] **Step 1: Añadir el registro de eventos en el frontend**

En el bloque `<script>`, justo después de la definición de `UTM`, insertar:

```javascript
// Codigo corto de atribucion: permite ligar una conversacion de WhatsApp
// entrante con la campana que la origino.
const codigoAtribucion = (UTM.source.slice(0, 3) + Date.now().toString(36).slice(-4)).toUpperCase();

function registrarEvento(tipo, detalle) {
  const cuerpo = JSON.stringify({
    tipo: tipo,
    detalle: detalle || '',
    pagina: location.pathname,
    utm_source: UTM.source,
    utm_campaign: UTM.campaign,
    codigo: codigoAtribucion,
  });
  // sendBeacon sobrevive a la navegacion; fetch es el respaldo.
  if (navigator.sendBeacon) {
    navigator.sendBeacon(API + '/evento', new Blob([cuerpo], { type: 'application/json' }));
  } else {
    fetch(API + '/evento', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: cuerpo,
      keepalive: true,
    }).catch(function () {});
  }
}
```

- [ ] **Step 2: Instrumentar los clics de WhatsApp y propagar la atribución**

Reemplazar la función `gW` y el registro de listeners por:

```javascript
function gW(msg, slug) {
  const n = (slug && WA_313.includes(slug)) ? N313 : N320;
  const base = msg || 'Hola, quiero asesoría en seguridad social';
  const texto = base + ' [' + codigoAtribucion + ']';
  return 'https://wa.me/' + n + '?text=' + encodeURIComponent(texto);
}
```

Y sustituir el bloque que registra los listeners genéricos por:

```javascript
['hero-wa', 'ct-wa', 'wa-fl', 'f-wa'].forEach(function (id) {
  document.getElementById(id).addEventListener('click', function (ev) {
    ev.preventDefault();
    registrarEvento('clic_whatsapp', id);
    window.open(gW(), '_blank');
  });
});
```

El código entre corchetes viaja dentro del mensaje. Cuando llegue la conversación,
ese código permite saber de qué campaña y de qué página salió.

- [ ] **Step 3: Añadir el endpoint en el Worker**

En `worker/src/index.js`, antes del `return` de ruta no encontrada, insertar:

```javascript
      if (url.pathname === '/api/evento' && request.method === 'POST') {
        const body = await request.text();
        // Se reenvia a Apps Script sin bloquear la respuesta al navegador.
        ctx.waitUntil(
          fetch(gasUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'evento', payload: body }),
          }).catch(() => {})
        );
        return new Response(null, { status: 204, headers: corsHeaders });
      }
```

- [ ] **Step 4: Ejecutar los tests de medición**

Run: `npm test`
Expected: pasan los dos tests del bloque "Medicion".

- [ ] **Step 5: Commit**

```bash
git add frontend/index.html worker/src/index.js
git commit -m "feat: medicion de clics de WhatsApp con codigo de atribucion"
```

---

## Tarea 7: Corregir la experiencia de usuario

**Files:**
- Modify: `frontend/index.html`

- [ ] **Step 1: Eliminar el popup promocional automático**

En el bloque de flyers de `render()`, eliminar por completo el `setTimeout` que
abre `promoPop` a los 2.5 segundos, incluida la escritura en `sessionStorage`.

El popup interrumpe antes de que la persona haya leído nada, castiga la métrica
INP y Google lo penaliza en móvil. Las promociones siguen accesibles: la sección
de flyers permanece y cada flyer abre su modal al tocarlo.

- [ ] **Step 2: Añadir estado de error de carga**

Reemplazar la función `loadData` por:

```javascript
function mostrarErrorCarga() {
  const faq = document.getElementById('faqList');
  if (faq) {
    faq.innerHTML =
      '<p style="text-align:center;color:var(--tx2);font-size:.9rem">' +
      'No pudimos cargar el contenido en este momento. ' +
      'Escríbenos por WhatsApp y te atendemos de inmediato.</p>';
  }
  const nav = document.getElementById('nav-emp');
  if (nav) nav.textContent = 'Asesorías Seguridad Social';
}

async function loadData() {
  try {
    const r = await fetch(API + '/getAllData');
    if (!r.ok) throw new Error('respuesta ' + r.status);
    render(await r.json());
  } catch (e) {
    console.error(e);
    mostrarErrorCarga();
  }
}
```

Hoy, si el Worker cae, la página se queda indefinidamente mostrando "Cargando..."
y con secciones vacías, sin ninguna vía de contacto visible.

- [ ] **Step 3: Ejecutar los tests de experiencia de usuario**

Run: `npm test`
Expected: pasan los dos tests del bloque "Experiencia de usuario", y toda la suite
queda en verde.

- [ ] **Step 4: Commit**

```bash
git add frontend/index.html
git commit -m "fix: eliminar popup automatico y anadir estado de error de carga"
```

---

## Tarea 8: Cabeceras de seguridad y caché

**Files:**
- Modify: `frontend/_headers`

- [ ] **Step 1: Reescribir `frontend/_headers`**

```
/*
  X-Frame-Options: SAMEORIGIN
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()
  Strict-Transport-Security: max-age=31536000; includeSubDomains

/sitemap.xml
  Cache-Control: public, max-age=3600

/robots.txt
  Cache-Control: public, max-age=3600
```

No se añade `Content-Security-Policy` en esta fase: el HTML actual usa estilos y
scripts en línea, y una CSP correcta exige refactorizarlos o firmarlos con hashes.
Se implementa en la Fase 1, cuando Astro genere los assets con hash.

- [ ] **Step 2: Verificar que la suite sigue en verde**

Run: `npm test`
Expected: PASS en todos los tests.

- [ ] **Step 3: Commit**

```bash
git add frontend/_headers
git commit -m "chore: cabeceras de seguridad y cache"
```

---

## Tarea 9: Integración continua

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Crear el workflow**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  validar:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Validaciones de SEO tecnico
        run: npm test
```

Sin `npm ci` porque no hay dependencias: la suite usa solo módulos nativos de Node.

- [ ] **Step 2: Verificar la sintaxis del workflow en local**

Run: `node -e "import('node:fs').then(fs=>console.log(fs.readFileSync('.github/workflows/ci.yml','utf8').includes('npm test')))"`
Expected: `true`

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: validacion automatica de SEO tecnico en cada push"
```

---

## Tarea 10: Actualizar el changelog y cerrar la fase

**Files:**
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Registrar los cambios**

Reemplazar la sección `[No publicado]` por:

```markdown
## [0.2.0] - 2026-07-27

### Anadido
- Estructura de documentacion auditable: ADR, runbooks y checklists de operacion
- Suite de validacion automatizada de SEO tecnico (cero dependencias)
- Integracion continua en GitHub Actions
- Datos estructurados JSON-LD: LocalBusiness, WebSite y FAQPage
- robots.txt y sitemap.xml
- Medicion de clics de WhatsApp con codigo de atribucion por campana
- Estado de error visible cuando la API no responde
- Cabeceras de seguridad HSTS y Permissions-Policy

### Corregido
- Meta description y Open Graph duplicados y contradictorios en el head
- Title generico y sin keyword, que ademas el JavaScript sobrescribia en runtime
- Ausencia de canonical, og:image y twitter:card

### Eliminado
- Popup promocional automatico a los 2.5 segundos
```

- [ ] **Step 2: Ejecutar la suite completa una ultima vez**

Run: `npm test`
Expected: PASS en la totalidad de los tests.

- [ ] **Step 3: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: changelog de la fase 0"
```

---

## Tareas manuales del negocio (no son código)

Estas quedan fuera del repositorio porque requieren credenciales y acciones en
consolas externas. Se listan aquí para que la fase se considere cerrada.

- [ ] Crear y verificar el perfil en **Google Business Profile**: categoría
      "Asesoría en seguros", zona de servicio nacional, horario, teléfonos,
      enlace a asesoriasas.com. Es la acción que más rápido produce llamadas.
- [ ] Dar de alta el dominio en **Google Search Console**, verificar por registro
      DNS en Cloudflare y enviar `https://asesoriasas.com/sitemap.xml`.
- [ ] Crear la propiedad de **GA4** e instalar la etiqueta.
- [ ] Diseñar y subir `frontend/og-image.png` a 1200×630 px. Hasta que exista, las
      etiquetas `og:image` y `twitter:image` apuntan a un archivo inexistente y
      las vistas previas en redes se verán rotas.
- [ ] Solicitar las primeras reseñas en Google a clientes ya atendidos.

---

## Verificación final de la fase

- [ ] `npm test` pasa completo
- [ ] La CI está en verde en GitHub
- [ ] `https://asesoriasas.com/robots.txt` responde 200
- [ ] `https://asesoriasas.com/sitemap.xml` responde 200
- [ ] La prueba de resultados enriquecidos de Google reconoce el FAQPage
- [ ] Un clic en WhatsApp genera un registro con su código de atribución
- [ ] Con el Worker apagado, la página muestra el mensaje de error y no "Cargando..."
