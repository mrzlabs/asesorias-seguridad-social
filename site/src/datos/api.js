export const ORIGEN = 'https://asesorias-api-proxy.andresmartinezr2204.workers.dev/api';

let cache = null;

/**
 * Trae todo el contenido en tiempo de compilacion.
 * Es la unica puerta de acceso a los datos: en la Fase 2 se le cambia el
 * origen a D1 y ningun componente se entera.
 */
export async function obtenerContenido() {
  if (cache) return cache;

  const r = await fetch(`${ORIGEN}/getAllData`);
  if (!r.ok) {
    // Fallar el build es deliberado: publicar el sitio sin contenido lo
    // sacaria del indice de Google.
    throw new Error(
      `La API respondio ${r.status}. El build se detiene a proposito.`
    );
  }
  cache = await r.json();
  return cache;
}
