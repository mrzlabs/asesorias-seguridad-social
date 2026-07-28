// SHA-256 de la IP para trazabilidad sin almacenar el dato personal crudo.

/** SHA-256 de la IP en hex. Devuelve null si no hay IP. */
export async function hashIp(ip) {
  if (!ip) return null;
  const datos = new TextEncoder().encode(ip);
  const buf = await crypto.subtle.digest('SHA-256', datos);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
