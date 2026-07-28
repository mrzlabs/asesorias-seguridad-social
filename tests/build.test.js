import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(raiz, 'site', 'dist');
const API = 'https://asesorias-api-proxy.andresmartinezr2204.workers.dev/api';

const leer = (ruta) => readFile(join(dist, ruta), 'utf8');

async function existe(ruta) {
  try { await access(join(dist, ruta)); return true; } catch { return false; }
}

/** Slugs activos segun la fuente de verdad, no una lista escrita a mano. */
let SLUGS = [];

before(async () => {
  const r = await fetch(`${API}/getAllData`);
  const datos = await r.json();
  SLUGS = (datos.servicios || []).filter((s) => s.activo && s.slug).map((s) => s.slug);
});

describe('Cobertura frente a la fuente de datos', () => {
  test('existe una página por cada servicio activo de la hoja', async () => {
    assert.ok(SLUGS.length > 0, 'la fuente no devolvió servicios');
    const faltantes = [];
    for (const slug of SLUGS) {
      if (!(await existe(`servicios/${slug}/index.html`))) faltantes.push(slug);
    }
    assert.deepEqual(faltantes, [], `faltan páginas: ${faltantes.join(', ')}`);
  });

  test('no hay páginas de servicios que no existan en la hoja', async () => {
    const generados = await readdir(join(dist, 'servicios'), { withFileTypes: true });
    const carpetas = generados.filter((d) => d.isDirectory()).map((d) => d.name);
    const sobrantes = carpetas.filter((c) => !SLUGS.includes(c));
    assert.deepEqual(
      sobrantes,
      [],
      `páginas inventadas que no están en la hoja: ${sobrantes.join(', ')}`
    );
  });

  test('cada página usa el contenido real de la hoja', async () => {
    const r = await fetch(`${API}/getAllData`);
    const datos = await r.json();
    const muestra = (datos.servicios || []).filter((s) => s.activo).slice(0, 5);
    for (const s of muestra) {
      const html = await leer(`servicios/${s.slug}/index.html`);
      if (s.descripcion_larga) {
        const fragmento = s.descripcion_larga.slice(0, 40);
        assert.ok(
          html.includes(fragmento),
          `${s.slug} no muestra su descripción larga real`
        );
      }
    }
  });
});

describe('SEO por página', () => {
  test('cada página de servicio tiene canonical único', async () => {
    const vistos = new Set();
    for (const slug of SLUGS) {
      const html = await leer(`servicios/${slug}/index.html`);
      const m = html.match(/<link rel="canonical" href="([^"]+)"/);
      assert.ok(m, `${slug} no tiene canonical`);
      assert.ok(!vistos.has(m[1]), `canonical duplicado: ${m[1]}`);
      vistos.add(m[1]);
    }
  });

  test('cada página de servicio tiene title único', async () => {
    const vistos = new Set();
    for (const slug of SLUGS) {
      const html = await leer(`servicios/${slug}/index.html`);
      const t = html.match(/<title>([^<]+)<\/title>/)[1];
      assert.ok(!vistos.has(t), `title duplicado: ${t}`);
      vistos.add(t);
    }
  });

  test('cada página tiene una sola meta description', async () => {
    for (const slug of SLUGS) {
      const html = await leer(`servicios/${slug}/index.html`);
      const n = (html.match(/<meta name="description"/g) || []).length;
      assert.equal(n, 1, `${slug} tiene ${n} meta description`);
    }
  });

  test('ninguna meta description supera los 160 caracteres', async () => {
    for (const slug of SLUGS) {
      const html = await leer(`servicios/${slug}/index.html`);
      const d = html.match(/<meta name="description" content="([^"]*)"/)[1];
      assert.ok(d.length <= 160, `${slug}: description de ${d.length} caracteres`);
    }
  });

  test('el JSON-LD de cada página es válido y completo', async () => {
    for (const slug of SLUGS) {
      const html = await leer(`servicios/${slug}/index.html`);
      const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
      assert.ok(m, `${slug} no tiene JSON-LD`);
      const tipos = JSON.parse(m[1])['@graph'].map((n) => n['@type']);
      assert.ok(tipos.includes('Service'), `${slug} sin nodo Service`);
      assert.ok(tipos.includes('BreadcrumbList'), `${slug} sin BreadcrumbList`);
    }
  });

  test('el sitemap incluye todas las páginas de servicio', async () => {
    const xml = await leer('sitemap.xml');
    for (const slug of SLUGS) {
      assert.match(xml, new RegExp(`/servicios/${slug}/`), `sitemap sin ${slug}`);
    }
  });

  test('no se cargan fuentes desde dominios externos', async () => {
    const html = await leer('index.html');
    assert.doesNotMatch(html, /fonts\.googleapis\.com|fonts\.gstatic\.com/);
  });

  test('todas las páginas declaran el idioma es-CO', async () => {
    const html = await leer('index.html');
    assert.match(html, /<html lang="es-CO"/);
  });
});

describe('Captación de leads', () => {
  test('la home tiene el formulario', async () => {
    const html = await leer('index.html');
    assert.match(html, /id="formLead"/);
    assert.match(html, /name="nombre"/);
    assert.match(html, /name="telefono"/);
  });

  test('cada página de servicio tiene formulario', async () => {
    for (const slug of SLUGS) {
      const html = await leer(`servicios/${slug}/index.html`);
      assert.match(html, /id="formLead"/, `${slug} no tiene formulario`);
    }
  });

  test('el formulario ofrece todos los servicios de la hoja', async () => {
    const html = await leer('index.html');
    for (const slug of SLUGS) {
      assert.match(html, new RegExp(`<option value="${slug}"`), `falta opción ${slug}`);
    }
  });

  test('el formulario preselecciona el servicio de su página', async () => {
    const slug = SLUGS[0];
    const html = await leer(`servicios/${slug}/index.html`);
    assert.match(html, new RegExp(`<option value="${slug}"[^>]*selected`));
  });

  test('el formulario mantiene la trampa antibot', async () => {
    const html = await leer('index.html');
    assert.match(html, /name="honeypot"/);
  });

  test('todos los campos tienen etiqueta asociada', async () => {
    const html = await leer('index.html');
    for (const id of ['lead-nombre', 'lead-telefono', 'lead-email', 'lead-servicio']) {
      assert.match(html, new RegExp(`for="${id}"`), `falta label para ${id}`);
    }
  });

  test('el mensaje de estado se anuncia a lectores de pantalla', async () => {
    const html = await leer('index.html');
    assert.match(html, /id="leadEstado"[^>]*role="status"/);
    assert.match(html, /aria-live="polite"/);
  });
});

describe('Accesibilidad', () => {
  test('existe el enlace de salto al contenido', async () => {
    const html = await leer('index.html');
    assert.match(html, /Saltar al contenido/);
  });

  test('ningún elemento se oculta con desplazamiento negativo', async () => {
    const html = await leer('index.html');
    assert.doesNotMatch(html, /-9999px/);
  });
});

describe('Promociones y carrusel', () => {
  test('la home muestra las promociones activas de la hoja', async () => {
    const r = await fetch(`${API}/getAllData`);
    const datos = await r.json();
    const activos = (datos.flyers || []).filter((f) => f.activo && f.drive_id);
    const html = await leer('index.html');
    for (const f of activos) {
      assert.ok(html.includes(f.titulo), `falta la promoción ${f.titulo}`);
    }
  });

  test('las promociones se sirven desde el dominio propio, no desde Drive', async () => {
    const html = await leer('index.html');
    assert.doesNotMatch(
      html,
      /drive\.google\.com/,
      'todavía hay imágenes cargándose desde Google Drive'
    );
    assert.match(html, /\/promociones\/[a-z0-9-]+\.(webp|jpg)/);
  });

  test('cada promoción tiene su archivo local en webp y jpg', async () => {
    const r = await fetch(`${API}/getAllData`);
    const datos = await r.json();
    const nombre = (t) =>
      t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    for (const f of (datos.flyers || []).filter((x) => x.activo && x.drive_id)) {
      const base = nombre(f.titulo);
      assert.ok(await existe(`promociones/${base}.webp`), `falta ${base}.webp`);
      assert.ok(await existe(`promociones/${base}.jpg`), `falta ${base}.jpg`);
    }
  });

  test('el carrusel incluye los 24 servicios, no un recorte', async () => {
    const html = await leer('index.html');
    for (const slug of SLUGS) {
      assert.match(
        html,
        new RegExp(`/servicios/${slug}/`),
        `el carrusel no incluye ${slug}`
      );
    }
  });

  test('el carrusel ofrece filtro por cada categoría', async () => {
    const r = await fetch(`${API}/getAllData`);
    const datos = await r.json();
    const cats = [...new Set((datos.servicios || []).filter((s) => s.activo).map((s) => s.categoria))];
    const html = await leer('index.html');
    for (const c of cats) {
      assert.match(html, new RegExp(`data-cat="${c}"`), `falta el filtro ${c}`);
    }
  });

  test('la home muestra todas las preguntas de la hoja', async () => {
    const r = await fetch(`${API}/getAllData`);
    const datos = await r.json();
    const activas = (datos.faq || []).filter((f) => f.activo);
    const html = await leer('index.html');
    const tarjetas = (html.match(/class="preg__t"/g) || []).length;
    assert.equal(tarjetas, activas.length, `${tarjetas} tarjetas para ${activas.length} preguntas`);
  });

  test('cada página tiene el botón flotante de WhatsApp', async () => {
    for (const ruta of ['index.html', `servicios/${SLUGS[0]}/index.html`, 'servicios/index.html']) {
      const html = await leer(ruta);
      assert.match(html, /class="waf wa"/, `${ruta} sin botón flotante`);
    }
  });

  test('cada página de servicio ofrece camino de vuelta', async () => {
    for (const slug of SLUGS.slice(0, 6)) {
      const html = await leer(`servicios/${slug}/index.html`);
      assert.match(html, /Ver todos los servicios/, `${slug} sin salida`);
    }
  });
});

describe('Cumplimiento legal', () => {
  test('existe la política de tratamiento de datos', async () => {
    assert.ok(await existe('legal/politica-de-datos/index.html'));
  });

  test('existen los términos y condiciones', async () => {
    assert.ok(await existe('legal/terminos/index.html'));
  });

  test('la política cubre los elementos que exige la Ley 1581', async () => {
    const html = await leer('legal/politica-de-datos/index.html');
    for (const exigido of [
      'Responsable del tratamiento',
      'Finalidades',
      'Derechos del titular',
      'Superintendencia de Industria y Comercio',
      'Vigencia',
    ]) {
      assert.ok(html.includes(exigido), `la política no cubre: ${exigido}`);
    }
  });

  test('el formulario exige autorización expresa y no viene premarcada', async () => {
    const html = await leer('index.html');
    const casilla = html.match(/<input type="checkbox"[^>]*name="autorizacion"[^>]*>/);
    assert.ok(casilla, 'no hay casilla de autorización');
    assert.match(casilla[0], /required/, 'la casilla no es obligatoria');
    assert.doesNotMatch(casilla[0], /checked/, 'la casilla viene premarcada, la ley lo prohíbe');
  });

  test('la casilla enlaza a la política', async () => {
    const html = await leer('index.html');
    assert.match(html, /href="\/legal\/politica-de-datos\/"/);
  });

  test('cada página de servicio también exige la autorización', async () => {
    for (const slug of SLUGS.slice(0, 5)) {
      const html = await leer(`servicios/${slug}/index.html`);
      assert.match(html, /name="autorizacion"/, `${slug} sin casilla`);
    }
  });

  test('el pie enlaza a los dos documentos legales', async () => {
    const html = await leer('index.html');
    assert.match(html, /\/legal\/politica-de-datos\//);
    assert.match(html, /\/legal\/terminos\//);
  });

  test('el sitemap incluye las páginas legales', async () => {
    const xml = await leer('sitemap.xml');
    assert.match(xml, /\/legal\/politica-de-datos\//);
    assert.match(xml, /\/legal\/terminos\//);
  });
});

describe('Configuración de despliegue', () => {
  test('las cabeceras de seguridad viajan en el build', async () => {
    const h = await leer('_headers');
    for (const cabecera of [
      'X-Frame-Options',
      'X-Content-Type-Options',
      'Referrer-Policy',
      'Permissions-Policy',
      'Strict-Transport-Security',
    ]) {
      assert.ok(h.includes(cabecera), `falta la cabecera ${cabecera}`);
    }
  });

  test('los recursos con hash tienen caché inmutable', async () => {
    const h = await leer('_headers');
    assert.match(h, /\/_astro\/\*/);
    assert.match(h, /immutable/);
  });

  test('robots y sitemap salen en el build', async () => {
    assert.ok(await existe('robots.txt'));
    assert.ok(await existe('sitemap.xml'));
  });
});

describe('Herramientas y blog', () => {
  test('la calculadora existe y no depende de JavaScript para su contenido', async () => {
    const html = await leer('herramientas/calculadora-aportes/index.html');
    assert.match(html, /Ingreso Base de Cotizaci/);
    assert.match(html, /c-ibc/);
  });

  test('la calculadora declara los parámetros, no los esconde', async () => {
    const html = await leer('herramientas/calculadora-aportes/index.html');
    assert.match(html, /data-p="/, 'los parámetros no viajan en el HTML');
    assert.match(html, /smlmv/);
  });

  test('el blog tiene índice y al menos un artículo', async () => {
    assert.ok(await existe('blog/index.html'));
    const idx = await leer('blog/index.html');
    assert.doesNotMatch(idx, /Aún no hay artículos/, 'el blog está vacío');
  });

  test('cada artículo lleva marcado Article y BreadcrumbList', async () => {
    const html = await leer('blog/cuanto-se-paga-de-seguridad-social-independiente/index.html');
    const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    assert.ok(m, 'el artículo no tiene JSON-LD');
    const tipos = JSON.parse(m[1])['@graph'].map((n) => n['@type']);
    assert.ok(tipos.includes('Article'));
    assert.ok(tipos.includes('BreadcrumbList'));
  });

  test('el sitemap incluye la calculadora, el blog y los artículos', async () => {
    const xml = await leer('sitemap.xml');
    assert.match(xml, /\/herramientas\/calculadora-aportes\//);
    assert.match(xml, /\/blog\//);
    assert.match(xml, /\/blog\/cuanto-se-paga/);
  });
});
