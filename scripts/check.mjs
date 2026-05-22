import { readFile } from 'node:fs/promises';

const html = await readFile('frontend/index.html', 'utf8');
const required = [
  '<meta name="viewport"',
  'const PROD_API=',
  'id="leadForm"',
  'id="ruta"',
  'honeypot',
  'fetch(API+',
];

const missing = required.filter((item) => !html.includes(item));
if (missing.length) {
  console.error('Missing required markers:', missing.join(', '));
  process.exit(1);
}

console.log('Static checks passed');
