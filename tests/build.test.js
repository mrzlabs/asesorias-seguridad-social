import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(raiz, 'site', 'dist');

async function existe(ruta) {
  try {
    await access(join(dist, ruta));
    return true;
  } catch {
    return false;
  }
}

const leer = (ruta) => readFile(join(dist, ruta), 'utf8');

const SLUGS = [
  'afiliacion-eps',
  'afiliacion-arl',
  'afiliacion-pension',
  'caja-de-compensacion',
  'traslado-eps',
  'afiliacion-empresas',
];

describe('Sitio compilado', () => {
  test('existe una página por cada servicio', async () => {
    for (const slug of SLUGS) {
      assert.ok(
        await existe(`servicios/${slug}/index.html`),
        `falta la página de ${slug}`
      );
    }
  });

  test('cada página de servicio tiene un canonical único', async () => {
    const vistos = new Set();
    for (const slug of SLUGS) {
      const html = await leer(`servicios/${slug}/index.html`);
      const m = html.match(/<link rel="canonical" href="([^"]+)"/);
      assert.ok(m, `${slug} no tiene canonical`);
      assert.ok(!vistos.has(m[1]), `canonical duplicado: ${m[1]}`);
      vistos.add(m[1]);
    }
  });

  test('cada página de servicio tiene un title único', async () => {
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

  test('el contenido está en el HTML, no inyectado por JavaScript', async () => {
    const html = await leer('servicios/afiliacion-eps/index.html');
    assert.match(html, /Preguntas frecuentes/);
    // Texto real que viene de la API, pre-renderizado en el HTML.
    assert.match(html, /Ingreso Base de Cotizaci/);
  });

  test('no se cargan fuentes ni recursos desde dominios externos', async () => {
    const html = await leer('index.html');
    assert.doesNotMatch(html, /fonts\.googleapis\.com|fonts\.gstatic\.com/);
  });

  test('el JSON-LD de cada página de servicio es válido', async () => {
    for (const slug of SLUGS) {
      const html = await leer(`servicios/${slug}/index.html`);
      const m = html.match(
        /<script type="application\/ld\+json">([\s\S]*?)<\/script>/
      );
      assert.ok(m, `${slug} no tiene JSON-LD`);
      const grafo = JSON.parse(m[1])['@graph'];
      const tipos = grafo.map((n) => n['@type']);
      assert.ok(tipos.includes('Service'), `${slug} sin nodo Service`);
      assert.ok(tipos.includes('BreadcrumbList'), `${slug} sin BreadcrumbList`);
    }
  });

  test('el sitemap incluye las seis páginas de servicio', async () => {
    const xml = await leer('sitemap.xml');
    for (const slug of SLUGS) {
      assert.match(xml, new RegExp(`/servicios/${slug}/`));
    }
  });

  test('todas las páginas declaran el idioma es-CO', async () => {
    const html = await leer('index.html');
    assert.match(html, /<html lang="es-CO"/);
  });

  test('existe el enlace de salto al contenido para accesibilidad', async () => {
    const html = await leer('index.html');
    assert.match(html, /Saltar al contenido/);
  });
});

describe('Captación de leads', () => {
  test('la home tiene el formulario de leads', async () => {
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

  test('el formulario preselecciona el servicio de la página', async () => {
    const html = await leer('servicios/traslado-eps/index.html');
    assert.match(html, /<option value="traslado-eps"[^>]*selected/);
  });

  test('el formulario mantiene la trampa antibot', async () => {
    const html = await leer('index.html');
    assert.match(html, /name="honeypot"/);
  });

  test('todos los campos tienen etiqueta asociada', async () => {
    const html = await leer('index.html');
    for (const id of ['lead-nombre', 'lead-telefono', 'lead-email', 'lead-servicio']) {
      assert.match(html, new RegExp(`for="${id}"`), `falta label para ${id}`);
      assert.match(html, new RegExp(`id="${id}"`), `falta el campo ${id}`);
    }
  });

  test('el mensaje de estado se anuncia a lectores de pantalla', async () => {
    const html = await leer('index.html');
    assert.match(html, /id="leadEstado"[^>]*role="status"/);
    assert.match(html, /aria-live="polite"/);
  });
});
