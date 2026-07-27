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
