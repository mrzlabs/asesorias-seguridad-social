import { obtenerServicios } from '../datos/servicios.js';
import { obtenerEps } from '../datos/eps.js';
import { getCollection } from 'astro:content';

export async function GET() {
  const SERVICIOS = await obtenerServicios();
  const ARTICULOS = (await getCollection('blog')).filter((a) => !a.data.borrador);
  // El endpoint solo devuelve ciudades publicadas: el sitemap nunca lista una
  // ciudad sin revisar (regla anti-doorway).
  const CIUDADES_EPS = (await obtenerEps()).ciudades || [];
  const base = 'https://asesoriasas.com';
  const hoy = new Date().toISOString().slice(0, 10);

  const rutas = [
    { loc: `${base}/`, prioridad: '1.0' },
    { loc: `${base}/servicios/`, prioridad: '0.9' },
    ...SERVICIOS.map((s) => ({ loc: `${base}/servicios/${s.slug}/`, prioridad: '0.8' })),
    { loc: `${base}/herramientas/calculadora-aportes/`, prioridad: '0.9' },
    { loc: `${base}/eps/`, prioridad: '0.7' },
    ...CIUDADES_EPS.map((c) => ({ loc: `${base}/eps/${c.slug}/`, prioridad: '0.6' })),
    { loc: `${base}/blog/`, prioridad: '0.7' },
    ...ARTICULOS.map((a) => ({ loc: `${base}/blog/${a.id}/`, prioridad: '0.7' })),
    { loc: `${base}/legal/politica-de-datos/`, prioridad: '0.3' },
    { loc: `${base}/legal/terminos/`, prioridad: '0.3' },
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${rutas
  .map(
    (r) => `  <url>
    <loc>${r.loc}</loc>
    <lastmod>${hoy}</lastmod>
    <priority>${r.prioridad}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
}
