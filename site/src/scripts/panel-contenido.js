import { req, esc, toast } from './panel-comun.js';

// Definición por recurso: etiqueta, clave primaria, título de cada tarjeta, y
// campos con su etiqueta legible y tipo de control.
const RECURSOS = {
  servicios: {
    etiqueta: 'Servicios', pk: 'slug', crear: false,
    titulo: (it) => it.nombre || it.slug,
    campos: [
      ['nombre', 'Nombre', 'text'], ['categoria', 'Categoría', 'text'],
      ['descripcion_corta', 'Descripción corta', 'text'],
      ['descripcion_larga', 'Descripción larga', 'area'],
      ['honorario_desde', 'Honorario desde ($)', 'number'], ['orden', 'Orden', 'number'],
    ],
  },
  faq: {
    etiqueta: 'Preguntas frecuentes', pk: 'id', crear: true,
    titulo: (it) => it.pregunta || 'Nueva pregunta',
    campos: [
      ['pregunta', 'Pregunta', 'text'], ['respuesta', 'Respuesta', 'area'],
      ['categoria', 'Categoría', 'text'], ['orden', 'Orden', 'number'],
    ],
  },
  testimonios: {
    etiqueta: 'Testimonios', pk: 'id', crear: true,
    titulo: (it) => it.nombre || 'Nuevo testimonio',
    campos: [
      ['nombre', 'Nombre', 'text'], ['cargo_o_ciudad', 'Cargo o ciudad', 'text'],
      ['testimonio', 'Testimonio', 'area'], ['calificacion', 'Calificación (1–5)', 'number'],
    ],
  },
  promociones: {
    etiqueta: 'Promociones', pk: 'id', crear: true,
    titulo: (it) => it.titulo || 'Nueva promoción',
    campos: [
      ['titulo', 'Título', 'text'], ['descripcion', 'Descripción', 'area'],
      ['vigente_hasta', 'Vigente hasta', 'text'], ['orden', 'Orden', 'number'],
    ],
  },
};

let actual = 'servicios';

pintarTabs();
document.getElementById('nuevo').addEventListener('click', () => {
  const lista = document.getElementById('lista');
  if (!lista.querySelector('.nuevo-card')) lista.prepend(tarjeta(RECURSOS[actual], {}, true));
});
cargar();

function pintarTabs() {
  const tabs = document.getElementById('tabs');
  tabs.innerHTML = '';
  for (const [nombre, def] of Object.entries(RECURSOS)) {
    const b = document.createElement('button');
    b.textContent = def.etiqueta;
    if (nombre === actual) b.classList.add('on');
    b.addEventListener('click', () => { actual = nombre; pintarTabs(); cargar(); });
    tabs.appendChild(b);
  }
}

async function cargar() {
  const def = RECURSOS[actual];
  document.getElementById('nuevo').hidden = !def.crear;
  const lista = document.getElementById('lista');
  lista.innerHTML = '<div class="cargando">Cargando…</div>';
  let items;
  try { items = await req(`/${actual}`); } catch { return; }
  lista.innerHTML = '';
  if (!items.length) { lista.innerHTML = '<div class="cargando">Sin elementos.</div>'; return; }
  for (const it of items) lista.appendChild(tarjeta(def, it, false));
}

function tarjeta(def, item, esNuevo) {
  const div = document.createElement('div');
  div.className = 'tarjeta item' + (esNuevo ? ' nuevo-card' : (item.activo ? '' : ' inactivo'));
  const encabezado = esNuevo
    ? `<h3>Nuevo en ${def.etiqueta.toLowerCase()}</h3>`
    : `<h3>${esc(def.titulo(item))}${item.activo ? '' : '<span class="badge-off">inactivo</span>'}</h3>
       <div class="clave-id">${def.pk}: ${esc(item[def.pk])}</div>`;

  const campos = def.campos.map(([c, et, tipo]) => {
    const v = esc(item[c]);
    const control = tipo === 'area'
      ? `<textarea data-c="${c}">${v}</textarea>`
      : `<input type="${tipo === 'number' ? 'number' : 'text'}" data-c="${c}" value="${v}" />`;
    return `<div class="campo"><label class="et">${et}</label>${control}</div>`;
  }).join('');

  const activo = esNuevo ? '' :
    `<label class="interruptor"><input type="checkbox" data-c="activo" ${item.activo ? 'checked' : ''}/> Visible en el sitio</label>`;
  const borrar = (!esNuevo && def.pk === 'id') ? '<button class="acc peligro borrar">Eliminar</button>' : '';

  div.innerHTML = `${encabezado}${campos}
    <div class="fila-acc">
      <button class="acc guardar">${esNuevo ? 'Crear' : 'Guardar'}</button>
      ${activo}${borrar}<span class="ok" style="color:var(--ok);font-weight:600" hidden>✓ Guardado</span>
    </div>`;

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
        await req(`/${actual}`, { method: 'POST', body: JSON.stringify(datos) });
        toast('✓ Creado'); await cargar();
      } else {
        await req(`/${actual}/${encodeURIComponent(item[def.pk])}`, { method: 'PATCH', body: JSON.stringify(datos) });
        const ok = div.querySelector('.ok'); ok.hidden = false; setTimeout(() => { ok.hidden = true; }, 2000);
        div.classList.toggle('inactivo', datos.activo === 0);
        toast('✓ Guardado. Publica para verlo en el sitio.');
      }
    } catch { /* banner */ }
    finally { e.target.disabled = false; }
  });

  div.querySelector('.borrar')?.addEventListener('click', async () => {
    if (!confirm('¿Eliminar definitivamente este elemento?')) return;
    try { await req(`/${actual}/${encodeURIComponent(item[def.pk])}`, { method: 'DELETE' }); toast('Eliminado'); await cargar(); }
    catch { /* banner */ }
  });

  return div;
}
