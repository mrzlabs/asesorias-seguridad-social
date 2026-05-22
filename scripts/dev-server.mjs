import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const root = join(process.cwd(), 'frontend');
const port = Number(process.env.PORT || 4322);
const api = process.env.API_PROXY || 'https://asesorias-api-proxy.andresmartinezr2204.workers.dev/api';

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

function secPath(urlPath) {
  if (urlPath === '/') return join(root, 'index.html');
  const clean = normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, '');
  return join(root, clean);
}

async function proxy(req, res) {
  const target = api + req.url.replace(/^\/api/, '');
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const upstream = await fetch(target, {
    method: req.method,
    headers: { 'Content-Type': req.headers['content-type'] || 'application/json' },
    body: req.method === 'GET' || req.method === 'HEAD' ? undefined : Buffer.concat(chunks),
  });
  res.writeHead(upstream.status, {
    'Content-Type': upstream.headers.get('content-type') || 'application/json',
    'Cache-Control': 'no-store',
  });
  res.end(Buffer.from(await upstream.arrayBuffer()));
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://localhost:${port}`);
    if (url.pathname.startsWith('/api/')) return proxy(req, res);
    const file = secPath(url.pathname);
    const body = await readFile(file);
    res.writeHead(200, {
      'Content-Type': types[extname(file)] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`Dev server http://127.0.0.1:${port}`);
});
