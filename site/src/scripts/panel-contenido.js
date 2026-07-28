import { crearPanel, esc } from './panel-comun.js';

// Columnas editables por recurso y su clave primaria.
const RECURSOS = {
  servicios: { pk: 'slug', crear: false, campos: [
    ['nombre', 'text'], ['descripcion_corta', 'text'], ['descripcion_larga', 'area'],
    ['categoria', 'text'], ['honorario_desde', 'number'], ['orden', 'number'],
  ] },
  faq: { pk: 'id', crear: true, campos: [
    ['pregunta', 'text'], ['respuesta', 'area'], ['categoria', 'text'], ['orden', 'number'],
  ] },
  testimonios: { pk: 'id', crear: true, campos: [
    ['nombre', 'text'], ['cargo_o_ciudad', 'text'], ['testimonio', 'area'], ['calificacion', 'number'],
  ] },
  promociones: { pk: 'id', crear: true, campos: [
    ['titulo', 'text'], ['descripcion', 'area'], ['vigente_hasta', 'text'], ['orden', 'number'],
  ] },
};

let reqRef;
let actual = 'servicios';

const { req } = crearPanel(async (req) => {
  reqRef = req;
  pintarTabs();
  await cargar();
});

function pintarTabs() {
  const tabs = document.getElementById('tabs');
  tabs.innerHTML = '';
  for (const nombre of Object.keys(RECURSOS)) {
    const b = document.createElement('button');
    b.textContent = nombre;
    if (nombre === actual) b.classList.add('activo');
    b.addEventListener('click', () => { actual = nombre; pintarTabs(); cargar(); });
    tabs.appendChild(b);
  }
}

async function cargar() {
  const def = RECURSOS[actual];
  const items = await reqRef(`/admin/${actual}`);
  const lista = document.getElementById('lista');
  lista.innerHTML = '';
  if (def.crear) lista.appendChild(tarjeta(actual, def, {}, true));
  for (const it of items) lista.appendChild(tarjeta(actual, def, it, false));
}

function tarjeta(recurso, def, item, esNuevo) {
  const div = document.createElement('div');
  div.className = 'item';
  const idLabel = esNuevo ? 'Nuevo' : `${def.pk}: ${esc(item[def.pk])}`;
  const campos = def.campos.map(([c, tipo]) => {
    const v = esc(item[c]);
    const control = tipo === 'area'
      ? `<textarea data-c="${c}">${v}</textarea>`
      : `<input type="${tipo === 'number' ? 'number' : 'text'}" data-c="${c}" value="${v}" />`;
    return `<label>${c}${control}</label>`;
  }).join('');
  const activoChk = esNuevo ? '' :
    `<label style="display:flex;gap:.4rem;align-items:center"><input type="checkbox" data-c="activo" ${item.activo ? 'checked' : ''}/> activo</label>`;
  div.innerHTML = `<strong>${idLabel}</strong>${campos}
    <div class="fila-acc">${activoChk}
      <button class="guardar">${esNuevo ? 'Crear' : 'Guardar'}</button>
      ${(!esNuevo && def.pk === 'id') ? '<button class="del">Eliminar</button>' : ''}
      <span class="guardado" hidden>✓</span></div>`;

  div.querySelector('.guardar').addEventListener('click', async (e) => {
    const datos = {};
    for (const el of div.querySelectorAll('[data-c]')) {
      if (el.type === 'checkbox') datos[el.dataset.c] = el.checked ? 1 : 0;
      else if (el.value !== '') datos[el.dataset.c] = el.type === 'number' ? Number(el.value) : el.value;
    }
    e.target.disabled = true;
    try {
      if (esNuevo) {
        datos.activo = 1;
        await reqRef(`/admin/${recurso}`, { method: 'POST', body: JSON.stringify(datos) });
        await cargar();
      } else {
        await reqRef(`/admin/${recurso}/${encodeURIComponent(item[def.pk])}`, {
          method: 'PATCH', body: JSON.stringify(datos),
        });
        const ok = div.querySelector('.guardado');
        ok.hidden = false; setTimeout(() => { ok.hidden = true; }, 2000);
      }
    } catch { alert('No se pudo guardar.'); }
    finally { e.target.disabled = false; }
  });

  div.querySelector('.del')?.addEventListener('click', async () => {
    if (!confirm('¿Eliminar este elemento?')) return;
    try {
      await reqRef(`/admin/${recurso}/${encodeURIComponent(item[def.pk])}`, { method: 'DELETE' });
      await cargar();
    } catch { alert('No se pudo eliminar.'); }
  });

  return div;
}
