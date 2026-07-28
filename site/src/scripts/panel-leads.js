import { req, esc, toast } from './panel-comun.js';

const $ = (id) => document.getElementById(id);
const ESTADOS = ['nuevo', 'contactado', 'cotizado', 'cerrado', 'perdido'];

for (const e of ESTADOS) {
  const o = document.createElement('option');
  o.value = e; o.textContent = e[0].toUpperCase() + e.slice(1);
  $('f-estado').appendChild(o);
}

async function cargar() {
  const params = new URLSearchParams();
  if ($('q').value) params.set('q', $('q').value);
  if ($('f-estado').value) params.set('estado', $('f-estado').value);
  try {
    const [resumen, data] = await Promise.all([req('/resumen'), req('/leads?' + params)]);
    pintarKpis(resumen);
    pintarFilas(data.leads);
    $('conteo').textContent = `${data.total} en total`;
  } catch { /* banner ya avisó */ }
}

function pintarKpis(r) {
  const por = Object.fromEntries((r.porEstado || []).map((x) => [x.estado, x.n]));
  $('kpis').textContent = `${r.delMes || 0} este mes · ` +
    ESTADOS.map((e) => `${por[e] || 0} ${e}`).join(' · ');
}

function pintarFilas(leads) {
  const tb = $('filas');
  if (!leads.length) { tb.innerHTML = '<tr><td colspan="6" class="cargando">Sin leads todavía.</td></tr>'; return; }
  tb.innerHTML = '';
  for (const l of leads) {
    const tr = document.createElement('tr');
    tr.className = 'click';
    tr.innerHTML = `<td><strong>${esc(l.nombre)}</strong></td><td>${esc(l.telefono)}</td>` +
      `<td>${esc(l.servicio_interes || '—')}</td><td>${esc(l.utm_source || '—')}</td>` +
      `<td><span class="est-${esc(l.estado)}">${esc(l.estado)}</span></td>` +
      `<td>${esc((l.creado || '').slice(0, 10))}</td>`;
    tr.addEventListener('click', () => verDetalle(l.id));
    tb.appendChild(tr);
  }
}

function cerrarDetalle() { $('detalle').hidden = true; $('velo').hidden = true; }

async function verDetalle(id) {
  let l;
  try { l = await req(`/leads/${id}`); } catch { return; }
  const opts = ESTADOS.map((e) => `<option value="${e}" ${e === l.estado ? 'selected' : ''}>${e}</option>`).join('');
  $('velo').hidden = false;
  $('detalle').hidden = false;
  $('detalle').innerHTML = `
    <button class="acc sec cerrar" id="cerrar">Cerrar</button>
    <h2>${esc(l.nombre)}</h2>
    <p class="dato">${esc(l.telefono)}${l.email ? ' · ' + esc(l.email) : ''}${l.ciudad ? ' · ' + esc(l.ciudad) : ''}</p>
    <p class="dato">Servicio: ${esc(l.servicio_interes || '—')} · Origen: ${esc(l.utm_source || '—')}</p>
    ${l.calculo_total ? `<div class="adjunto"><strong>Cálculo adjunto</strong><br>Ingreso ${fmt(l.calculo_ingreso)} · IBC ${fmt(l.calculo_ibc)} · Total ${fmt(l.calculo_total)}</div>` : ''}
    ${l.mensaje ? `<p>${esc(l.mensaje)}</p>` : ''}
    <div class="campo"><label class="et" for="d-estado">Estado</label><select id="d-estado">${opts}</select></div>
    <div class="campo"><label class="et" for="d-notas">Notas</label><textarea id="d-notas">${esc(l.notas || '')}</textarea></div>
    <div class="fila-acc"><button class="acc" id="d-guardar">Guardar</button></div>
    <h3 style="font-family:var(--serif);margin:1.2rem 0 .3rem">Actividad</h3>
    <ul>${(l.eventos || []).map((e) => `<li>${esc((e.creado || '').slice(0, 16))} — ${esc(e.tipo)} ${esc(e.detalle || '')}</li>`).join('') || '<li>Sin eventos.</li>'}</ul>`;
  $('cerrar').addEventListener('click', cerrarDetalle);
  $('d-guardar').addEventListener('click', async () => {
    try {
      await req(`/leads/${id}`, { method: 'PATCH', body: JSON.stringify({ estado: $('d-estado').value, notas: $('d-notas').value }) });
      cerrarDetalle(); toast('✓ Lead actualizado'); cargar();
    } catch { /* banner */ }
  });
}

function fmt(n) { return n == null ? '—' : '$' + Number(n).toLocaleString('es-CO'); }
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

$('q').addEventListener('input', debounce(cargar, 300));
$('f-estado').addEventListener('change', cargar);
$('velo').addEventListener('click', cerrarDetalle);
cargar();
