// Cliente compartido del panel. Acceso keyless: la API se llama same-origin a
// /admin/api/*, protegida por Cloudflare Access (la cookie viaja sola). No hay
// clave. Si la sesión de Access caduca, se avisa y se pide recargar.

export const API = '/admin/api';

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function toast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('ver');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('ver'), 2600);
}

export function bannerError(msg) {
  const b = document.getElementById('banner');
  if (b) { b.className = 'err'; b.textContent = msg; }
}

export async function req(ruta, opts = {}) {
  let r;
  try {
    r = await fetch(API + ruta, {
      redirect: 'manual',
      ...opts,
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    });
  } catch (e) {
    bannerError('No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.');
    throw e;
  }
  // Access redirige al login si la sesión caducó → respuesta opaca.
  if (r.type === 'opaqueredirect' || r.status === 0 || r.status === 401 || r.status === 403) {
    bannerError('Tu sesión de acceso expiró. Recarga la página para volver a iniciar sesión.');
    throw new Error('auth');
  }
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.status === 204 ? null : r.json();
}
