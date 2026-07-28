// Cliente del panel de leads. Consume la API admin del Worker con la clave
// guardada en sessionStorage (Bearer). Cloudflare Access es el candado exterior.
const API = document.getElementById('panel').dataset.api;
const $ = (id) => document.getElementById(id);
const ESTADOS = ['nuevo', 'contactado', 'cotizado', 'cerrado', 'perdido'];

const clave = () => sessionStorage.getItem('panel_token');
const setClave = (v) => sessionStorage.setItem('panel_token', v);
const limpiarClave = () => sessionStorage.removeItem('panel_token');

async function api(ruta, opciones = {}) {
  const r = await fetch(API + ruta, {
    ...opciones,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${clave()}`, ...(opciones.headers || {}) },
  });
  if (r.status === 401) { limpiarClave(); mostrarGate('Clave incorrecta o sesión expirada.'); throw new Error('401'); }
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.status === 204 ? null : r.json();
}

function mostrarGate(msg = '') {
  $('gate').hidden = false; $('app').hidden = true; $('gate-error').textContent = msg;
}
function mostrarApp() { $('gate').hidden = true; $('app').hidden = false; }

$('entrar').addEventListener('click', async () => {
  setClave($('clave').value.trim());
  try { await cargar(); mostrarApp(); } catch { /* mostrarGate ya se llamó */ }
});

function pintarEstadosSelect() {
  for (const e of ESTADOS) {
    const o = document.createElement('option'); o.value = e; o.textContent = e;
    $('f-estado').appendChild(o);
  }
}

async function cargar() {
  const params = new URLSearchParams();
  if ($('q').value) params.set('q', $('q').value);
  if ($('f-estado').value) params.set('estado', $('f-estado').value);
  const [resumen, data] = await Promise.all([
    api('/admin/resumen'),
    api('/admin/leads?' + params.toString()),
  ]);
  pintarKpis(resumen);
  pintarFilas(data.leads);
}

function pintarKpis(r) {
  const porEstado = Object.fromEntries((r.porEstado || []).map((x) => [x.estado, x.n]));
  $('kpis').textContent = `Leads del mes: ${r.delMes} · ` +
    ESTADOS.map((e) => `${e}: ${porEstado[e] || 0}`).join(' · ');
}

function pintarFilas(leads) {
  $('filas').innerHTML = '';
  for (const l of leads) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${esc(l.nombre)}</td><td>${esc(l.telefono)}</td>` +
      `<td>${esc(l.servicio_interes || '')}</td><td>${esc(l.utm_source || '')}</td>` +
      `<td>${esc(l.estado)}</td><td>${esc((l.creado || '').slice(0, 10))}</td>`;
    tr.addEventListener('click', () => verDetalle(l.id));
    $('filas').appendChild(tr);
  }
}

async function verDetalle(id) {
  const l = await api(`/admin/leads/${id}`);
  const opts = ESTADOS.map((e) => `<option value="${e}" ${e === l.estado ? 'selected' : ''}>${e}</option>`).join('');
  $('detalle').hidden = false;
  $('detalle').innerHTML = `
    <button id="d-cerrar" style="float:right;background:#777">Cerrar</button>
    <h2>${esc(l.nombre)}</h2>
    <p>${esc(l.telefono)} · ${esc(l.email || '')} · ${esc(l.ciudad || '')}</p>
    <p>Servicio: ${esc(l.servicio_interes || '—')} · Origen: ${esc(l.utm_source || '—')}</p>
    ${l.calculo_total ? `<p>Cálculo adjunto: ingreso ${esc(l.calculo_ingreso)}, IBC ${esc(l.calculo_ibc)}, total ${esc(l.calculo_total)}</p>` : ''}
    <p>${esc(l.mensaje || '')}</p>
    <label>Estado <select id="d-estado">${opts}</select></label>
    <label>Notas <textarea id="d-notas">${esc(l.notas || '')}</textarea></label>
    <button id="d-guardar">Guardar</button>
    <h3>Eventos</h3>
    <ul>${(l.eventos || []).map((e) => `<li>${esc(e.creado)} — ${esc(e.tipo)} ${esc(e.detalle || '')}</li>`).join('') || '<li>Sin eventos</li>'}</ul>`;
  $('d-cerrar').addEventListener('click', () => { $('detalle').hidden = true; });
  $('d-guardar').addEventListener('click', async () => {
    await api(`/admin/leads/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ estado: $('d-estado').value, notas: $('d-notas').value }),
    });
    $('detalle').hidden = true;
    await cargar();
  });
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

$('q').addEventListener('input', debounce(cargar, 300));
$('f-estado').addEventListener('change', cargar);
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

pintarEstadosSelect();
if (clave()) { cargar().then(mostrarApp).catch(() => {}); } else { mostrarGate(); }
