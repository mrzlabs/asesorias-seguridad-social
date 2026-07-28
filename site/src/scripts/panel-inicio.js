import { req } from './panel-comun.js';

const ESTADOS = ['nuevo', 'contactado', 'cotizado', 'cerrado', 'perdido'];

(async () => {
  try {
    const r = await req('/resumen');
    const por = Object.fromEntries((r.porEstado || []).map((x) => [x.estado, x.n]));
    const kpis = [
      ['Este mes', r.delMes || 0],
      ...ESTADOS.map((e) => [e[0].toUpperCase() + e.slice(1), por[e] || 0]),
    ];
    document.getElementById('kpis').innerHTML =
      '<div class="fila">' +
      kpis.map(([et, n]) => `<div class="kpi"><b>${n}</b><span>${et}</span></div>`).join('') +
      '</div>';
  } catch {
    document.getElementById('kpis').innerHTML = '<span class="cargando">No se pudo cargar el resumen.</span>';
  }
})();
