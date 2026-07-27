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

describe('Meta tags únicos', () => {
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
  test('hay al menos un bloque JSON-LD y todos son JSON válido', async () => {
    const bloques = bloquesJsonLd(await leerIndex());
    assert.ok(bloques.length > 0, 'no hay ningún bloque JSON-LD');
  });

  test('existe un nodo LocalBusiness u Organization', async () => {
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

describe('Medición', () => {
  test('los clics de WhatsApp registran un evento', async () => {
    const html = await leerIndex();
    assert.match(html, /function\s+registrarEvento/);
    assert.match(html, /clic_whatsapp/);
  });

  test('el mensaje de WhatsApp propaga el origen de campaña', async () => {
    const html = await leerIndex();
    assert.match(html, /codigoAtribucion/);
  });
});

describe('Experiencia de usuario', () => {
  test('no hay popup promocional automático por temporizador', async () => {
    const html = await leerIndex();
    assert.doesNotMatch(html, /promoPop[\s\S]{0,200}classList\.add\(['"]act['"]\)/);
  });

  test('existe un estado de error si la API falla', async () => {
    const html = await leerIndex();
    assert.match(html, /mostrarErrorCarga/);
  });
});
