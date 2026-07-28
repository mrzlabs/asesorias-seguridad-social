// Verificacion del JWT que Cloudflare Access inyecta (Cf-Access-Jwt-Assertion).
// Permite proteger la API admin sin clave propia: si el JWT es valido, la
// peticion paso por Access con un correo autorizado.

let jwksCache = { keys: null, exp: 0 };

async function getJwks(teamDomain) {
  const now = Date.now();
  if (jwksCache.keys && now < jwksCache.exp) return jwksCache.keys;
  const r = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`);
  const { keys } = await r.json();
  jwksCache = { keys, exp: now + 3600_000 }; // 1 h
  return keys;
}

function b64urlToUint8(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4 ? 4 - (s.length % 4) : 0;
  s += '='.repeat(pad);
  const bin = atob(s);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

const decode = (seg) => JSON.parse(new TextDecoder().decode(b64urlToUint8(seg)));

/**
 * Devuelve { email } si el JWT de Access es valido, o null.
 * @param {string|null} jwt valor de Cf-Access-Jwt-Assertion
 * @param {string} teamDomain p.ej. asesoriasas.cloudflareaccess.com
 */
export async function verificarAccess(jwt, teamDomain) {
  if (!jwt) return null;
  const parts = jwt.split('.');
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;

  let head, payload;
  try { head = decode(h); payload = decode(p); } catch { return null; }

  if (payload.exp && Date.now() / 1000 > payload.exp) return null;
  if (payload.iss && payload.iss !== `https://${teamDomain}`) return null;

  const keys = await getJwks(teamDomain);
  const jwk = keys.find((k) => k.kid === head.kid);
  if (!jwk) return null;

  try {
    const key = await crypto.subtle.importKey(
      'jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']
    );
    const ok = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5', key, b64urlToUint8(s), new TextEncoder().encode(`${h}.${p}`)
    );
    if (!ok) return null;
  } catch { return null; }

  return { email: payload.email || payload.identity || null };
}
