import { crearPanel } from './panel-comun.js';

const { req } = crearPanel(async () => { /* el hub no carga datos */ });
const $ = (id) => document.getElementById(id);

$('publicar')?.addEventListener('click', async () => {
  const btn = $('publicar');
  btn.disabled = true;
  const aviso = $('aviso');
  aviso.hidden = false;
  aviso.textContent = 'Publicando…';
  try {
    const r = await req('/admin/publicar', { method: 'POST' });
    aviso.textContent = r.ok
      ? 'Publicado. El sitio se reconstruye en ~1–2 min.'
      : 'No se pudo publicar: ' + (r.error || r.status);
  } catch {
    aviso.textContent = 'Error al publicar.';
  } finally {
    btn.disabled = false;
  }
});
