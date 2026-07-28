import { ORIGEN } from './api.js';

/**
 * Datos del comparador de EPS. El endpoint solo devuelve ciudades publicadas,
 * así que el sitio nunca genera una ciudad sin revisar (regla anti-doorway).
 */
let cache = null;

export async function obtenerEps() {
  if (cache) return cache;
  const r = await fetch(`${ORIGEN}/eps`);
  if (!r.ok) throw new Error(`La API /eps respondió ${r.status}. El build se detiene a propósito.`);
  cache = await r.json();
  return cache;
}

/** EPS disponibles en una ciudad, cruzando coberturas con el catálogo. */
export function epsDeCiudad(datos, ciudadSlug) {
  const porSlug = Object.fromEntries((datos.eps || []).map((e) => [e.slug, e]));
  return (datos.coberturas || [])
    .filter((c) => c.ciudad_slug === ciudadSlug)
    .map((c) => ({ ...c, eps: porSlug[c.eps_slug] }))
    .filter((c) => c.eps)
    .sort((a, b) => (a.eps.orden || 0) - (b.eps.orden || 0));
}
