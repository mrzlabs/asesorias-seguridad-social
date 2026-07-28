// Utilidades compartidas por las vistas del panel: gate de clave (sessionStorage,
// Bearer) y fetch autenticado a la API admin. Cloudflare Access es el candado
// exterior; esta clave protege la API en otro dominio.

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/**
 * Monta el gate y devuelve `req` para hablar con la API.
 * @param {(req: Function) => Promise<void>} onCargar carga inicial de datos.
 */
export function crearPanel(onCargar) {
  const API = document.body.dataset.api;
  const $ = (id) => document.getElementById(id);
  const tok = () => sessionStorage.getItem('panel_token');
  const mostrarGate = (msg = '') => {
    $('gate').hidden = false; $('app').hidden = true;
    if ($('gate-error')) $('gate-error').textContent = msg;
  };
  const mostrarApp = () => { $('gate').hidden = true; $('app').hidden = false; };

  async function req(ruta, opts = {}) {
    const r = await fetch(API + ruta, {
      ...opts,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}`, ...(opts.headers || {}) },
    });
    if (r.status === 401) {
      sessionStorage.removeItem('panel_token');
      mostrarGate('Clave incorrecta o sesión expirada.');
      throw new Error('401');
    }
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.status === 204 ? null : r.json();
  }

  $('entrar')?.addEventListener('click', async () => {
    sessionStorage.setItem('panel_token', $('clave').value.trim());
    try { await onCargar(req); mostrarApp(); } catch { /* gate ya mostrado o error */ }
  });

  if (tok()) onCargar(req).then(mostrarApp).catch(() => {}); else mostrarGate();
  return { req };
}
