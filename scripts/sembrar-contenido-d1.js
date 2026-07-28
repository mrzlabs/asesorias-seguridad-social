// Lee getAllData en vivo (aun desde la hoja) y emite worker/siembra-contenido.sql.
// Uso: node scripts/sembrar-contenido-d1.js
// El SQL generado se revisa a mano antes de aplicarlo a D1.
import { writeFileSync } from 'node:fs';

const API = 'https://asesorias-api-proxy.andresmartinezr2204.workers.dev/api/getAllData';
const q = (v) => (v === null || v === undefined || v === '') ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`;
// Para columnas NOT NULL (parametros.valor): nunca NULL, cadena vacia si falta.
const qv = (v) => `'${String(v ?? '').replace(/'/g, "''")}'`;
const b = (v) => (v === true || v === 1 || v === '1' || v === 'true') ? 1 : 0;
const n = (v) => (v === null || v === undefined || v === '' || Number.isNaN(Number(v))) ? 'NULL' : Number(v);

// Parametros de calculo verificados (no vienen de la hoja).
const PARAMS_CALCULO = {
  smlmv: '1750905', auxilio_transporte: '249095',
  ibc_porcentaje_contratista: '0.4', ibc_minimo_smlmv: '1', ibc_maximo_smlmv: '25',
  tasa_salud: '0.125', tasa_pension: '0.16', tasa_ccf_independiente: '0.02', tasa_ccf_empleador: '0.04',
  arl_clase_1: '0.00522', arl_clase_2: '0.01044', arl_clase_3: '0.02436', arl_clase_4: '0.0435', arl_clase_5: '0.0696',
  fsp_umbral_smlmv: '4',
};

const data = await (await fetch(API)).json();
const out = [];

const paramsCombinados = { ...data.config, ...PARAMS_CALCULO };
for (const [clave, valor] of Object.entries(paramsCombinados)) {
  const tipo = /smlmv|tasa|ibc|arl|fsp|auxilio|precio|honorario/.test(clave) ? 'numero' : 'texto';
  out.push(`INSERT OR REPLACE INTO parametros (clave, valor, tipo) VALUES (${qv(clave)}, ${qv(valor)}, ${qv(tipo)});`);
}
for (const s of data.servicios || []) {
  out.push(`INSERT OR REPLACE INTO servicios (slug,nombre,descripcion_corta,descripcion_larga,icono,categoria,honorario_desde,orden,activo) VALUES (${q(s.slug)},${q(s.nombre)},${q(s.descripcion_corta)},${q(s.descripcion_larga)},${q(s.icono)},${q(s.categoria)},${n(s.honorario_desde)},${n(s.orden) === 'NULL' ? 0 : n(s.orden)},${b(s.activo)});`);
}
for (const f of data.faq || []) {
  out.push(`INSERT INTO faq (pregunta,respuesta,categoria,orden,activo) VALUES (${q(f.pregunta)},${q(f.respuesta)},${q(f.categoria)},${n(f.orden) === 'NULL' ? 0 : n(f.orden)},${b(f.activo)});`);
}
for (const t of data.testimonios || []) {
  out.push(`INSERT INTO testimonios (nombre,cargo_o_ciudad,testimonio,calificacion,activo) VALUES (${q(t.nombre)},${q(t.cargo_o_ciudad || t.ciudad)},${q(t.testimonio)},${n(t.calificacion)},${b(t.activo)});`);
}
for (const p of data.flyers || []) {
  out.push(`INSERT INTO promociones (titulo,descripcion,vigente_hasta,orden,activo) VALUES (${q(p.titulo)},${q(p.descripcion)},${q(p.vigente_hasta)},${n(p.orden) === 'NULL' ? 0 : n(p.orden)},${b(p.activo)});`);
}

writeFileSync('worker/siembra-contenido.sql', out.join('\n') + '\n');
console.log(`Generado worker/siembra-contenido.sql con ${out.length} sentencias.`);
console.log(`  parametros: ${Object.keys(paramsCombinados).length}, servicios: ${(data.servicios || []).length}, faq: ${(data.faq || []).length}, testimonios: ${(data.testimonios || []).length}, flyers: ${(data.flyers || []).length}`);
