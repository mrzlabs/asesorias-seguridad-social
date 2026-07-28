import { req, toast } from './panel-comun.js';

const btn = document.getElementById('publicar');
btn?.addEventListener('click', async () => {
  if (!confirm('¿Publicar los cambios ahora? El sitio se reconstruye en ~1–2 minutos.')) return;
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Publicando…';
  try {
    const r = await req('/publicar', { method: 'POST' });
    toast(r && r.ok ? '✓ Publicado. El sitio se actualiza en ~1–2 min.' : 'No se pudo publicar.');
  } catch {
    /* el banner ya avisó si fue por sesión */
  } finally {
    btn.disabled = false;
    btn.textContent = original;
  }
});
