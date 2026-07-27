# Fase 1 — Migración a Astro y sistema de diseño: Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir el sitio de una sola URL con contenido inyectado por JavaScript en un sitio multipágina pre-renderizado, con identidad visual propia y una página indexable por cada servicio.

**Architecture:** El proyecto Astro se construye en la carpeta `site/`, **en paralelo al `frontend/` que sigue en producción**. Astro consume la API actual del Worker en tiempo de compilación y pre-renderiza todo el HTML. Solo cuando la verificación pasa se cambia la configuración de build en Cloudflare Pages y se archiva `frontend/`. Así la migración nunca deja el sitio caído.

**Tech Stack:** Astro 5, CSS con custom properties (sin framework de utilidades), fuentes autoalojadas, Cloudflare Pages, Node.js `node:test`.

**Spec de referencia:** `docs/superpowers/specs/2026-07-27-posicionamiento-y-panel-design.md` (§5, §6, §13)
**ADR relacionados:** 0001 (stack), 0005 (imágenes)

---

## Por qué en paralelo y no in situ

Hoy Cloudflare Pages publica el contenido de `frontend/` tal cual, sin build. Astro
necesita un paso de compilación y publica `site/dist/`. Son dos configuraciones
incompatibles: en el momento en que se cambie el ajuste en el panel de Cloudflare,
lo que haya en `site/dist/` pasa a ser el sitio público.

Si se migra in situ, cualquier estado intermedio roto queda publicado. Construyendo
en paralelo, producción sigue sirviendo `frontend/` intacto hasta el corte final
de la Tarea 10, que es un cambio de configuración reversible en un minuto.

---

## Estructura de archivos objetivo

```
site/
├── astro.config.mjs
├── package.json
├── public/
│   ├── robots.txt
│   └── og-image.png
└── src/
    ├── assets/
    │   ├── fuentes/                 Fuentes autoalojadas (woff2)
    │   └── imagenes/
    │       └── CREDITOS.md          Procedencia y licencia de cada imagen
    ├── componentes/
    │   ├── Cabecera.astro
    │   ├── PieDePagina.astro
    │   ├── BotonWhatsApp.astro      Encapsula la atribución de campaña
    │   ├── TarjetaServicio.astro
    │   ├── Acordeon.astro           FAQ accesible
    │   └── Figura.astro             Slot de imagen con tratamiento unificado
    ├── datos/
    │   ├── api.js                   Fetch a la API en tiempo de build
    │   └── servicios.js             Catálogo y metadatos SEO por servicio
    ├── layouts/
    │   └── Base.astro               Head, JSON-LD, cabecera y pie
    ├── estilos/
    │   ├── tokens.css               Color, tipografía, espacio, radios
    │   ├── base.css                 Reset y elementos
    │   └── utilidades.css
    └── pages/
        ├── index.astro
        ├── servicios/
        │   ├── index.astro
        │   └── [slug].astro         Una página por servicio
        └── sitemap.xml.js           Generado desde el catálogo
```

**Responsabilidad de cada pieza:**

| Archivo | Responsabilidad única |
|---|---|
| `datos/api.js` | Única puerta de acceso a la API. En Fase 2 se le cambia el origen a D1 y nada más se toca |
| `datos/servicios.js` | Catálogo con slug, título SEO y descripción por servicio. Es lo que gobierna qué páginas existen |
| `layouts/Base.astro` | Todo lo que va en `<head>`: meta únicos, canonical, JSON-LD. Ninguna página los escribe por su cuenta |
| `componentes/BotonWhatsApp.astro` | Encapsula el número correcto y el código de atribución. Ningún otro sitio construye enlaces de WhatsApp |
| `componentes/Figura.astro` | Aplica el tratamiento visual unificado del ADR 0005 |
| `estilos/tokens.css` | Fuente única de color, tipografía y espacio |

---

## Tarea 1: Andamiaje de Astro

**Files:**
- Create: `site/package.json`, `site/astro.config.mjs`, `site/.gitignore`

- [ ] **Step 1: Crear el proyecto**

```bash
mkdir -p site/src/{componentes,datos,layouts,estilos,pages,assets} site/public
```

`site/package.json`:

```json
{
  "name": "asesorias-site",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview"
  },
  "dependencies": {
    "astro": "^5.0.0"
  }
}
```

`site/astro.config.mjs`:

```javascript
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://asesoriasas.com',
  output: 'static',
  build: { format: 'directory' },
  compressHTML: true,
});
```

`site/.gitignore`:

```
dist/
.astro/
node_modules/
```

- [ ] **Step 2: Instalar y verificar**

Run: `cd site && npm install && npm run build`
Expected: build correcto. Aún sin páginas, Astro avisa que no encontró ninguna: es lo esperado.

- [ ] **Step 3: Commit**

```bash
git add site/
git commit -m "chore: andamiaje del proyecto Astro"
```

---

## Tarea 2: Tokens del sistema de diseño

Aquí es donde el sitio deja de parecer plantilla. Ver spec §6.

**Files:**
- Create: `site/src/estilos/tokens.css`, `site/src/estilos/base.css`

- [ ] **Step 1: Definir los tokens**

`site/src/estilos/tokens.css`:

```css
:root {
  /* Color: neutro cálido de base y un solo acento.
     Se abandona el azul corporativo con acento teal: es el uniforme
     visual de todo el sector y lo que hace que el sitio se lea como
     plantilla generada. */
  --tinta:        #16181C;
  --tinta-suave:  #55595F;
  --tinta-tenue:  #8A8F96;
  --papel:        #FBFAF8;
  --papel-hueso:  #F3F0EA;
  --linea:        #E4E0D8;

  --acento:       #1F5C3D;
  --acento-vivo:  #2E7D53;
  --acento-tenue: #E8F0EA;

  --alerta:       #B3452B;
  --exito:        #1F5C3D;

  /* Tipografía: dos familias, autoalojadas.
     Fraunces aporta peso institucional sin resultar corporativa;
     Inter sostiene el texto largo con densidad de lectura alta. */
  --fuente-titulo: 'Fraunces', Georgia, serif;
  --fuente-texto:  'Inter', system-ui, sans-serif;

  /* Escala tipográfica fluida */
  --t-xs:  0.8125rem;
  --t-sm:  0.9375rem;
  --t-md:  1.0625rem;
  --t-lg:  clamp(1.25rem, 1rem + 1vw, 1.5rem);
  --t-xl:  clamp(1.75rem, 1.2rem + 2.2vw, 2.5rem);
  --t-2xl: clamp(2.25rem, 1.4rem + 3.6vw, 4rem);

  /* Espacio: escala de 4px */
  --e-1: 0.25rem;  --e-2: 0.5rem;   --e-3: 0.75rem;
  --e-4: 1rem;     --e-6: 1.5rem;   --e-8: 2rem;
  --e-12: 3rem;    --e-16: 4rem;    --e-24: 6rem;

  --radio: 3px;
  --radio-lg: 6px;
  --ancho: 1140px;
}
```

El radio de 3px es deliberado: las esquinas muy redondeadas y las píldoras de
50px son parte del vocabulario visual que se está eliminando.

- [ ] **Step 2: Crear la base**

`site/src/estilos/base.css`:

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html { -webkit-text-size-adjust: 100%; }

body {
  font-family: var(--fuente-texto);
  font-size: var(--t-md);
  line-height: 1.65;
  color: var(--tinta);
  background: var(--papel);
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3 {
  font-family: var(--fuente-titulo);
  font-weight: 600;
  line-height: 1.15;
  letter-spacing: -0.02em;
  text-wrap: balance;
}

p { max-width: 68ch; }
img { max-width: 100%; height: auto; display: block; }
a { color: inherit; }

/* Foco visible en todo control: requisito WCAG que el sitio actual no cumple. */
:focus-visible {
  outline: 2px solid var(--acento);
  outline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

.contenedor {
  max-width: var(--ancho);
  margin-inline: auto;
  padding-inline: var(--e-6);
}

.salto-contenido {
  position: absolute;
  left: -9999px;
}
.salto-contenido:focus {
  left: var(--e-4);
  top: var(--e-4);
  z-index: 100;
  background: var(--acento);
  color: var(--papel);
  padding: var(--e-3) var(--e-4);
}
```

- [ ] **Step 3: Commit**

```bash
git add site/src/estilos/
git commit -m "feat: tokens del sistema de diseno"
```

---

## Tarea 3: Fuentes autoalojadas

**Files:**
- Create: `site/src/assets/fuentes/*.woff2`, `site/src/estilos/fuentes.css`

- [ ] **Step 1: Descargar los subsets latinos**

Se necesitan cuatro archivos: Fraunces 600, Inter 400, Inter 500 e Inter 600, en
formato woff2 y subset latino. Se obtienen de `gwfh.mranftl.com` seleccionando
"latin" y descargando woff2, o exportando desde Google Fonts.

Cuatro archivos es el presupuesto máximo (spec §6). El sitio actual carga tres
familias con doce pesos desde CDN externo, bloqueando el render.

- [ ] **Step 2: Declararlas**

`site/src/estilos/fuentes.css`:

```css
@font-face {
  font-family: 'Fraunces';
  src: url('/fuentes/fraunces-600.woff2') format('woff2');
  font-weight: 600;
  font-display: swap;
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+2000-206F;
}

@font-face {
  font-family: 'Inter';
  src: url('/fuentes/inter-400.woff2') format('woff2');
  font-weight: 400;
  font-display: swap;
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+2000-206F;
}

@font-face {
  font-family: 'Inter';
  src: url('/fuentes/inter-500.woff2') format('woff2');
  font-weight: 500;
  font-display: swap;
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+2000-206F;
}

@font-face {
  font-family: 'Inter';
  src: url('/fuentes/inter-600.woff2') format('woff2');
  font-weight: 600;
  font-display: swap;
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+2000-206F;
}
```

Los archivos van en `site/public/fuentes/` para que se sirvan desde la raíz.

- [ ] **Step 3: Commit**

```bash
git add site/public/fuentes/ site/src/estilos/fuentes.css
git commit -m "feat: fuentes autoalojadas con subset latino"
```

---

## Tarea 4: Capa de datos

**Files:**
- Create: `site/src/datos/api.js`, `site/src/datos/servicios.js`

- [ ] **Step 1: Crear el acceso a la API**

`site/src/datos/api.js`:

```javascript
const ORIGEN = 'https://asesorias-api-proxy.andresmartinezr2204.workers.dev/api';

let cache = null;

/**
 * Trae todo el contenido en tiempo de compilacion.
 * Es la unica puerta de acceso a los datos: en la Fase 2 se le cambia
 * el origen a D1 y ningun componente se entera.
 */
export async function obtenerContenido() {
  if (cache) return cache;

  const r = await fetch(`${ORIGEN}/getAllData`);
  if (!r.ok) {
    throw new Error(
      `La API respondio ${r.status}. El build se detiene a proposito: ` +
      `publicar el sitio sin contenido lo sacaria del indice de Google.`
    );
  }
  cache = await r.json();
  return cache;
}
```

Fallar el build es deliberado. Si la API no responde y se publicara igual, se
desplegaría un sitio vacío y Google desindexaría las páginas.

- [ ] **Step 2: Crear el catálogo de servicios**

`site/src/datos/servicios.js`:

```javascript
/**
 * Gobierna que paginas de servicio existen y su metadata SEO.
 * El slug debe coincidir con el que devuelve la API para poder cruzar
 * el contenido dinamico con el estatico.
 */
export const SERVICIOS = [
  {
    slug: 'afiliacion-eps',
    titulo: 'Afiliación a EPS',
    tituloSeo: 'Afiliación a EPS en Colombia para independientes | Asesorías SAS',
    descripcionSeo: 'Afiliamos tu EPS en 24 horas hábiles. Para independientes, contratistas y empresas en toda Colombia. Sin filas ni papeleo.',
    intencion: 'como afiliarse a eps siendo independiente',
  },
  {
    slug: 'afiliacion-arl',
    titulo: 'Afiliación a ARL',
    tituloSeo: 'Afiliación a ARL para independientes y empresas | Asesorías SAS',
    descripcionSeo: 'Afiliación a riesgos laborales según tu clase de riesgo. Gestión completa para independientes, contratistas y empresas en Colombia.',
    intencion: 'afiliacion arl independiente',
  },
  {
    slug: 'afiliacion-pension',
    titulo: 'Afiliación a pensión',
    tituloSeo: 'Afiliación a fondo de pensiones en Colombia | Asesorías SAS',
    descripcionSeo: 'Te afiliamos al fondo de pensiones que elijas y gestionamos tu planilla cada mes. Colpensiones o fondo privado.',
    intencion: 'afiliacion fondo de pensiones independiente',
  },
  {
    slug: 'caja-de-compensacion',
    titulo: 'Caja de compensación',
    tituloSeo: 'Afiliación a caja de compensación familiar | Asesorías SAS',
    descripcionSeo: 'Accede a subsidios, recreación y créditos afiliándote a una caja de compensación. Afiliación voluntaria para independientes.',
    intencion: 'afiliacion caja de compensacion independiente',
  },
  {
    slug: 'traslado-eps',
    titulo: 'Traslado de EPS',
    tituloSeo: 'Traslado de EPS: requisitos y trámite | Asesorías SAS',
    descripcionSeo: 'Cámbiate de EPS cumpliendo los doce meses de permanencia. Gestionamos el traslado y verificamos que quedes activo.',
    intencion: 'como cambiarse de eps',
  },
  {
    slug: 'afiliacion-empresas',
    titulo: 'Afiliaciones para empresas',
    tituloSeo: 'Afiliación de empleados a seguridad social | Asesorías SAS',
    descripcionSeo: 'Gestionamos la afiliación de tus empleados a EPS, ARL, pensión y caja, y la liquidación mensual de la planilla.',
    intencion: 'afiliar empleados seguridad social',
  },
];
```

Seis servicios en esta fase, no diez. Cada página necesita contenido único real;
es preferible publicar seis buenas que diez rellenadas.

- [ ] **Step 3: Commit**

```bash
git add site/src/datos/
git commit -m "feat: capa de datos y catalogo de servicios"
```

---

## Tarea 5: Layout base con SEO centralizado

**Files:**
- Create: `site/src/layouts/Base.astro`

- [ ] **Step 1: Crear el layout**

```astro
---
import '../estilos/fuentes.css';
import '../estilos/tokens.css';
import '../estilos/base.css';
import Cabecera from '../componentes/Cabecera.astro';
import PieDePagina from '../componentes/PieDePagina.astro';

const { titulo, descripcion, ruta = '/', jsonLd = null } = Astro.props;
const canonical = new URL(ruta, Astro.site).href;
const imagen = new URL('/og-image.png', Astro.site).href;
---
<!DOCTYPE html>
<html lang="es-CO">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">

  <title>{titulo}</title>
  <meta name="description" content={descripcion}>
  <link rel="canonical" href={canonical}>
  <meta name="robots" content="index, follow, max-image-preview:large">

  <meta property="og:title" content={titulo}>
  <meta property="og:description" content={descripcion}>
  <meta property="og:type" content="website">
  <meta property="og:url" content={canonical}>
  <meta property="og:image" content={imagen}>
  <meta property="og:locale" content="es_CO">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content={titulo}>
  <meta name="twitter:description" content={descripcion}>
  <meta name="twitter:image" content={imagen}>

  <link rel="preload" href="/fuentes/inter-400.woff2" as="font" type="font/woff2" crossorigin>

  {jsonLd && <script type="application/ld+json" set:html={JSON.stringify(jsonLd)} />}
</head>
<body>
  <a class="salto-contenido" href="#contenido">Saltar al contenido</a>
  <Cabecera />
  <main id="contenido">
    <slot />
  </main>
  <PieDePagina />
</body>
</html>
```

Ninguna página escribe sus propios meta: todas pasan por aquí. Es lo que impide
que reaparezcan los duplicados que se corrigieron en la Fase 0.

- [ ] **Step 2: Commit**

```bash
git add site/src/layouts/
git commit -m "feat: layout base con SEO centralizado"
```

---

## Tarea 6: Componentes de imagen y WhatsApp

**Files:**
- Create: `site/src/componentes/Figura.astro`, `site/src/componentes/BotonWhatsApp.astro`
- Create: `site/src/assets/imagenes/CREDITOS.md`

- [ ] **Step 1: Crear el componente de imagen con tratamiento unificado**

`site/src/componentes/Figura.astro`:

```astro
---
// Aplica el tratamiento visual del ADR 0005. El duotono va por CSS y no
// incrustado en el archivo: cuando lleguen las fotos propias basta con
// sustituir el archivo para que hereden el mismo tratamiento.
const { src, alt, pie = null, ancho = 800, alto = 600 } = Astro.props;
---
<figure class="figura">
  <div class="figura__marco">
    <img src={src} alt={alt} width={ancho} height={alto} loading="lazy" decoding="async">
  </div>
  {pie && <figcaption>{pie}</figcaption>}
</figure>

<style>
  .figura { margin: 0; }

  .figura__marco {
    position: relative;
    overflow: hidden;
    border-radius: var(--radio);
    background: var(--acento);
  }

  /* Duotono: desatura la imagen y la tiñe con el acento de marca.
     Diez imagenes de origenes distintos con este tratamiento se leen
     como una sola direccion de arte y no como un collage de stock. */
  .figura__marco img {
    width: 100%;
    filter: grayscale(1) contrast(1.08);
    mix-blend-mode: luminosity;
    opacity: 0.92;
  }

  figcaption {
    margin-top: var(--e-2);
    font-size: var(--t-xs);
    color: var(--tinta-tenue);
  }
</style>
```

- [ ] **Step 2: Crear el botón de WhatsApp**

`site/src/componentes/BotonWhatsApp.astro`:

```astro
---
// Unico lugar del sitio que construye enlaces de WhatsApp. Encapsula el
// enrutamiento por numero y el codigo de atribucion de campana.
const { mensaje = '', slug = '', variante = 'solido' } = Astro.props;
---
<a
  class:list={['wa', `wa--${variante}`]}
  href="#"
  data-mensaje={mensaje}
  data-slug={slug}
  rel="noopener"
>
  <slot>Escríbenos por WhatsApp</slot>
</a>

<script>
  const N313 = '573134572362';
  const N320 = '573204060607';
  const WA_313 = ['traslado-eps', 'traslado-pension', 'traslado-arl', 'afiliacion-empresas', 'soat'];

  const params = new URLSearchParams(location.search);
  const origen = params.get('utm_source') || 'directo';
  const campana = params.get('utm_campaign') || '';
  const codigo = (origen.slice(0, 3) + Date.now().toString(36).slice(-4)).toUpperCase();

  function registrar(detalle) {
    const cuerpo = JSON.stringify({
      tipo: 'clic_whatsapp', detalle,
      pagina: location.pathname,
      utm_source: origen, utm_campaign: campana, codigo,
    });
    const url = 'https://asesorias-api-proxy.andresmartinezr2204.workers.dev/api/evento';
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([cuerpo], { type: 'application/json' }));
    }
  }

  document.querySelectorAll('.wa').forEach((el) => {
    el.addEventListener('click', (ev) => {
      ev.preventDefault();
      const slug = el.dataset.slug;
      const numero = slug && WA_313.includes(slug) ? N313 : N320;
      const base = el.dataset.mensaje || 'Hola, quiero asesoría en seguridad social';
      registrar(slug || 'generico');
      window.open(
        `https://wa.me/${numero}?text=${encodeURIComponent(base + ' [' + codigo + ']')}`,
        '_blank'
      );
    });
  });
</script>
```

- [ ] **Step 3: Crear el registro de procedencia**

`site/src/assets/imagenes/CREDITOS.md`:

```markdown
# Procedencia de las imágenes

Registro exigido por el ADR 0005. Toda imagen debe estar listada antes de usarse.

| Archivo | Fuente | Autor | Licencia | Provisional |
|---|---|---|---|---|
| (pendiente) | | | | |

## Criterio de selección

Oficios reales en contexto latinoamericano: conductores, comerciantes, estilistas,
contratistas, personas gestionando trámites desde el celular.

**Prohibido:** reuniones corporativas, personas sonriendo a cámara con portátil,
apretones de manos. Es el repertorio que identifica una plantilla a simple vista y
lo que usa la competencia.

## Reemplazo por material propio

Prioridad cuando esté disponible: capturas de soportes reales con datos tapados
(certificados de afiliación, planillas, radicados). Costo cero, imposibles de
replicar por la competencia y ningún competidor las muestra.
```

- [ ] **Step 4: Commit**

```bash
git add site/src/componentes/ site/src/assets/
git commit -m "feat: componentes de imagen y WhatsApp con atribucion"
```

---

## Tarea 7: Páginas de servicio

**Files:**
- Create: `site/src/pages/servicios/[slug].astro`, `site/src/pages/servicios/index.astro`

- [ ] **Step 1: Crear la página dinámica**

`site/src/pages/servicios/[slug].astro`:

```astro
---
import Base from '../../layouts/Base.astro';
import BotonWhatsApp from '../../componentes/BotonWhatsApp.astro';
import { SERVICIOS } from '../../datos/servicios.js';
import { obtenerContenido } from '../../datos/api.js';

export async function getStaticPaths() {
  const datos = await obtenerContenido();
  return SERVICIOS.map((servicio) => ({
    params: { slug: servicio.slug },
    props: {
      servicio,
      detalle: (datos.servicios || []).find((s) => s.slug === servicio.slug) || null,
      faq: (datos.faq || []).filter((f) => f.activo),
    },
  }));
}

const { servicio, detalle, faq } = Astro.props;

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: servicio.titulo,
  description: servicio.descripcionSeo,
  areaServed: { '@type': 'Country', name: 'Colombia' },
  provider: {
    '@type': 'LocalBusiness',
    name: 'Asesorías Seguridad Social SAS',
    url: 'https://asesoriasas.com/',
  },
};
---
<Base
  titulo={servicio.tituloSeo}
  descripcion={servicio.descripcionSeo}
  ruta={`/servicios/${servicio.slug}/`}
  jsonLd={jsonLd}
>
  <article class="contenedor servicio">
    <h1>{servicio.titulo}</h1>
    {detalle?.descripcion_corta && <p class="entrada">{detalle.descripcion_corta}</p>}

    <BotonWhatsApp mensaje={`Hola, me interesa: ${servicio.titulo}`} slug={servicio.slug}>
      Cotizar por WhatsApp
    </BotonWhatsApp>

    {faq.length > 0 && (
      <section class="faq">
        <h2>Preguntas frecuentes</h2>
        {faq.map((f) => (
          <details>
            <summary>{f.pregunta}</summary>
            <p>{f.respuesta}</p>
          </details>
        ))}
      </section>
    )}
  </article>
</Base>
```

- [ ] **Step 2: Compilar y verificar que se generan las seis páginas**

Run: `cd site && npm run build && ls dist/servicios/`
Expected: seis directorios, uno por slug, cada uno con su `index.html`.

- [ ] **Step 3: Confirmar que el contenido está en el HTML, no en JavaScript**

Run: `grep -c "Preguntas frecuentes" dist/servicios/afiliacion-eps/index.html`
Expected: `1` o más. Es la prueba de que el contenido dejó de depender de JS.

- [ ] **Step 4: Commit**

```bash
git add site/src/pages/
git commit -m "feat: paginas de servicio pre-renderizadas"
```

---

## Tarea 8: Sitemap generado

**Files:**
- Create: `site/src/pages/sitemap.xml.js`, `site/public/robots.txt`

- [ ] **Step 1: Generar el sitemap desde el catálogo**

`site/src/pages/sitemap.xml.js`:

```javascript
import { SERVICIOS } from '../datos/servicios.js';

export async function GET() {
  const base = 'https://asesoriasas.com';
  const hoy = new Date().toISOString().slice(0, 10);

  const rutas = [
    { loc: `${base}/`, prioridad: '1.0' },
    { loc: `${base}/servicios/`, prioridad: '0.9' },
    ...SERVICIOS.map((s) => ({ loc: `${base}/servicios/${s.slug}/`, prioridad: '0.8' })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${rutas.map((r) => `  <url>
    <loc>${r.loc}</loc>
    <lastmod>${hoy}</lastmod>
    <priority>${r.prioridad}</priority>
  </url>`).join('\n')}
</urlset>`;

  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
}
```

Se genera solo. Añadir un servicio al catálogo lo mete en el sitemap sin tocar nada.

- [ ] **Step 2: Copiar robots.txt y og-image.png a public/**

```bash
cp frontend/robots.txt site/public/robots.txt
cp frontend/og-image.png site/public/og-image.png
```

- [ ] **Step 3: Verificar**

Run: `cd site && npm run build && cat dist/sitemap.xml`
Expected: ocho URL — home, hub de servicios y las seis páginas de servicio.

- [ ] **Step 4: Commit**

```bash
git add site/src/pages/sitemap.xml.js site/public/
git commit -m "feat: sitemap generado desde el catalogo de servicios"
```

---

## Tarea 9: Extender la suite de validación al sitio compilado

**Files:**
- Create: `tests/build.test.js`
- Modify: `package.json`

- [ ] **Step 1: Escribir los tests sobre el HTML compilado**

`tests/build.test.js`:

```javascript
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(raiz, 'site', 'dist');

async function existe(ruta) {
  try { await access(join(dist, ruta)); return true; } catch { return false; }
}

const SLUGS = [
  'afiliacion-eps', 'afiliacion-arl', 'afiliacion-pension',
  'caja-de-compensacion', 'traslado-eps', 'afiliacion-empresas',
];

describe('Sitio compilado', () => {
  test('existe una pagina por cada servicio', async () => {
    for (const slug of SLUGS) {
      assert.ok(
        await existe(`servicios/${slug}/index.html`),
        `falta la pagina de ${slug}`
      );
    }
  });

  test('cada pagina de servicio tiene un canonical unico', async () => {
    const vistos = new Set();
    for (const slug of SLUGS) {
      const html = await readFile(join(dist, 'servicios', slug, 'index.html'), 'utf8');
      const m = html.match(/<link rel="canonical" href="([^"]+)"/);
      assert.ok(m, `${slug} no tiene canonical`);
      assert.ok(!vistos.has(m[1]), `canonical duplicado: ${m[1]}`);
      vistos.add(m[1]);
    }
  });

  test('cada pagina de servicio tiene un title unico', async () => {
    const vistos = new Set();
    for (const slug of SLUGS) {
      const html = await readFile(join(dist, 'servicios', slug, 'index.html'), 'utf8');
      const t = html.match(/<title>([^<]+)<\/title>/)[1];
      assert.ok(!vistos.has(t), `title duplicado: ${t}`);
      vistos.add(t);
    }
  });

  test('el contenido esta en el HTML, no inyectado por JavaScript', async () => {
    const html = await readFile(join(dist, 'servicios', 'afiliacion-eps', 'index.html'), 'utf8');
    assert.match(html, /Preguntas frecuentes/);
  });

  test('no se cargan fuentes desde dominios externos', async () => {
    const html = await readFile(join(dist, 'index.html'), 'utf8');
    assert.doesNotMatch(html, /fonts\.googleapis\.com|fonts\.gstatic\.com/);
  });

  test('el sitemap incluye las seis paginas de servicio', async () => {
    const xml = await readFile(join(dist, 'sitemap.xml'), 'utf8');
    for (const slug of SLUGS) {
      assert.match(xml, new RegExp(`/servicios/${slug}/`));
    }
  });
});
```

- [ ] **Step 2: Ajustar el script de test**

En `package.json` de la raíz:

```json
"test": "node --test \"tests/**/*.test.js\"",
"test:build": "cd site && npm run build && cd .. && node --test \"tests/build.test.js\""
```

- [ ] **Step 3: Ejecutar**

Run: `npm run test:build`
Expected: PASS en los seis tests.

- [ ] **Step 4: Commit**

```bash
git add tests/build.test.js package.json
git commit -m "test: validacion del sitio compilado"
```

---

## Tarea 10: Corte a producción

Esta es la única tarea con riesgo de caída. Se hace cuando todo lo anterior está
verificado.

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `docs/operacion/runbook-despliegue.md`

- [ ] **Step 1: Verificar el sitio compilado en local**

Run: `cd site && npm run build && npm run preview`
Revisar en el navegador: home, hub de servicios y las seis páginas. Comprobar que
los enlaces de WhatsApp abren con el código de atribución entre corchetes.

- [ ] **Step 2: Cambiar la configuración en el panel de Cloudflare Pages**

En el proyecto de Cloudflare Pages, **Settings → Builds & deployments**:

| Ajuste | Valor anterior | Valor nuevo |
|---|---|---|
| Build command | *(vacío)* | `cd site && npm install && npm run build` |
| Build output directory | `frontend` | `site/dist` |
| Node version | *(no fijada)* | `20` |

Este es el momento del corte. Hasta aquí, producción seguía sirviendo `frontend/`.

- [ ] **Step 3: Desplegar y verificar**

```bash
git push origin main
```

Verificar que responden 200:

```bash
for u in "" "servicios/" "servicios/afiliacion-eps/" "sitemap.xml" "robots.txt" "og-image.png"; do
  printf "%-34s " "/$u"; curl -s -o /dev/null -w "%{http_code}\n" "https://asesoriasas.com/$u";
done
```

Expected: 200 en las seis rutas.

- [ ] **Step 4: Si algo falla, revertir**

En Cloudflare Pages: **Deployments** → último despliegue estable → **Rollback to
this deployment**. Restaura el sitio anterior en menos de un minuto. `frontend/`
sigue en el repositorio intacto.

- [ ] **Step 5: Actualizar CI y runbook**

En `.github/workflows/ci.yml`, añadir la validación del build:

```yaml
      - name: Compilar el sitio
        run: cd site && npm install && npm run build

      - name: Validaciones del sitio compilado
        run: node --test "tests/build.test.js"
```

En `docs/operacion/runbook-despliegue.md`, reemplazar la sección de frontend para
reflejar que ahora hay build y que el directorio de salida es `site/dist`.

- [ ] **Step 6: Archivar el frontend anterior**

Solo después de 48 horas de producción estable:

```bash
git rm -r frontend/
git commit -m "chore: retirar el frontend anterior tras la migracion a Astro"
```

- [ ] **Step 7: Commit**

```bash
git add .github/workflows/ci.yml docs/operacion/runbook-despliegue.md
git commit -m "ci: validar el sitio compilado y actualizar el runbook"
```

---

## Verificación final de la fase

- [ ] `npm test` y `npm run test:build` pasan completos
- [ ] La CI está en verde
- [ ] Las seis páginas de servicio responden 200 y tienen title y canonical únicos
- [ ] El contenido aparece en el HTML con JavaScript deshabilitado en el navegador
- [ ] No se carga ninguna fuente desde dominio externo
- [ ] El sitemap actualizado está enviado en Search Console
- [ ] Un clic de WhatsApp desde una página de servicio abre con el slug correcto
- [ ] Ninguna imagen usada está fuera del registro de `CREDITOS.md`

---

## Riesgos de esta fase

| Riesgo | Mitigación |
|---|---|
| El corte de configuración deja el sitio caído | Construcción en paralelo; rollback de un minuto en Cloudflare; `frontend/` intacto hasta 48 h después |
| La API falla durante un build y se publica un sitio vacío | `obtenerContenido` lanza error y detiene el build a propósito |
| Las URL cambian y se pierde el posicionamiento acumulado | La home mantiene su URL. Las páginas de servicio son nuevas, no reemplazan ninguna indexada |
| Las imágenes provisionales se quedan indefinidamente | `CREDITOS.md` marca cuáles son provisionales y el checklist de la fase lo verifica |
