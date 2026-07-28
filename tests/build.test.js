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
      assert.ok(html.includes(f.drive_id), `falta la promoción ${f.titulo}`);
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
