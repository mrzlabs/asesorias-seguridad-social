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

/** Cuenta cuántas etiquetas meta hay con un name o property dado. */
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
