import { obtenerContenido } from './api.js';

/**
 * Parametros de cotizacion.
 *
 * Cambian cada enero con el salario minimo y con cada reforma. Si se
 * escriben en el codigo, la calculadora miente al ano siguiente sin que
 * nadie se entere.
 *
 * Se leen de la hoja de configuracion: basta anadir la clave alli para
 * sobreescribir el valor por defecto. Cuando exista el panel (fase 2)
 * pasaran a la tabla `parametros` sin tocar los componentes.
 */

const PREDETERMINADOS = {
  // Salario minimo mensual legal vigente. VERIFICAR CADA ENERO.
  smlmv: 1623500,
  // Auxilio de transporte, informativo.
  ibc_porcentaje_contratista: 0.4,
  ibc_minimo_smlmv: 1,
  ibc_maximo_smlmv: 25,
  tasa_salud: 0.125,
  tasa_pension: 0.16,
  tasa_ccf_independiente: 0.02,
  tasa_ccf_empleador: 0.04,
  // Tarifas de ARL por clase de riesgo (Decreto 1772 de 1994).
  arl_clase_1: 0.00522,
  arl_clase_2: 0.01044,
  arl_clase_3: 0.02436,
  arl_clase_4: 0.0435,
  arl_clase_5: 0.0696,
  // Fondo de Solidaridad Pensional: aplica desde 4 SMLMV.
  fsp_umbral_smlmv: 4,
};

/** Escala del Fondo de Solidaridad Pensional, en SMLMV. */
const ESCALA_FSP = [
  { desde: 4, hasta: 16, tasa: 0.01 },
  { desde: 16, hasta: 17, tasa: 0.012 },
  { desde: 17, hasta: 18, tasa: 0.014 },
  { desde: 18, hasta: 19, tasa: 0.016 },
  { desde: 19, hasta: 20, tasa: 0.018 },
  { desde: 20, hasta: Infinity, tasa: 0.02 },
];

export async function obtenerParametros() {
  const cfg = (await obtenerContenido()).config || {};
  const p = { ...PREDETERMINADOS };

  // Cualquier clave presente en la hoja sobreescribe el valor por defecto.
  for (const clave of Object.keys(PREDETERMINADOS)) {
    const valor = cfg[clave];
    if (valor !== undefined && valor !== '' && !Number.isNaN(Number(valor))) {
      p[clave] = Number(valor);
    }
  }

  return { ...p, escalaFsp: ESCALA_FSP };
}

/** Indica si el SMLMV proviene de la hoja o del valor por defecto. */
export async function smlmvEsDeLaHoja() {
  const cfg = (await obtenerContenido()).config || {};
  return cfg.smlmv !== undefined && cfg.smlmv !== '';
}
