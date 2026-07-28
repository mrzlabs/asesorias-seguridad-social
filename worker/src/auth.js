// Validacion del Bearer token para la API de administracion.
// Es el candado interino mientras se activa Cloudflare Access.

/**
 * Compara dos strings en tiempo constante para no filtrar el token por
 * timing. Entradas cortas de bajo riesgo: no se usa crypto.subtle.
 */
function igualdadConstante(a, b) {
  if (a.length !== b.length) return false;
  let dif = 0;
  for (let i = 0; i < a.length; i++) dif |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return dif === 0;
}

/**
 * Valida el header Authorization contra el secreto ADMIN_TOKEN.
 * @param {string|null} header valor de `Authorization`
 * @param {string|undefined} secreto env.ADMIN_TOKEN
 */
export function tokenValido(header, secreto) {
  if (!secreto) return false;
  if (!header || typeof header !== 'string') return false;
  const [esquema, valor] = header.split(' ');
  if (esquema !== 'Bearer' || !valor) return false;
  return igualdadConstante(valor, secreto);
}
