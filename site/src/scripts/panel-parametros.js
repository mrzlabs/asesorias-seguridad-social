import { crearPanel, esc } from './panel-comun.js';

let reqRef;

const { req } = crearPanel(async (req) => {
  reqRef = req;
  await pintar(await req('/admin/parametros'));
});

function pintar(params) {
  const filas = document.getElementById('filas');
  filas.innerHTML = '';
  for (const p of params.sort((a, b) => a.clave.localeCompare(b.clave))) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><code>${esc(p.clave)}</code></td>
      <td><input class="valor" value="${esc(p.valor)}" data-clave="${esc(p.clave)}" /></td>
      <td>${esc(p.tipo || '')}</td>
      <td><button data-clave="${esc(p.clave)}">Guardar</button> <span class="guardado" hidden>✓</span></td>`;
    tr.querySelector('button').addEventListener('click', async (e) => {
      const clave = e.target.dataset.clave;
      const valor = tr.querySelector('input.valor').value;
      e.target.disabled = true;
      try {
        await reqRef(`/admin/parametros/${encodeURIComponent(clave)}`, {
          method: 'PATCH',
          body: JSON.stringify({ valor }),
        });
        const ok = tr.querySelector('.guardado');
        ok.hidden = false;
        setTimeout(() => { ok.hidden = true; }, 2000);
      } catch { alert('No se pudo guardar ' + clave); }
      finally { e.target.disabled = false; }
    });
    filas.appendChild(tr);
  }
}
