import { obtenerContenido } from './api.js';

/**
 * NO hay catalogo de servicios escrito en el codigo.
 *
 * La hoja de calculo es la fuente de verdad (ver ADR 0002). Un catalogo
 * duplicado aqui se desincroniza: los slugs dejan de cruzar con el
 * contenido real y las paginas salen incompletas sin que nadie se entere.
 */

/** Etiqueta legible y familia visual de cada categoria de servicio. */
export const CATEGORIAS = {
  salud:     { etiqueta: 'Salud',              orden: 1 },
  riesgos:   { etiqueta: 'Riesgos laborales',  orden: 2 },
  pension:   { etiqueta: 'Pensión',            orden: 3 },
  bienestar: { etiqueta: 'Bienestar',          orden: 4 },
  operativo: { etiqueta: 'Gestión mensual',    orden: 5 },
  seguros:   { etiqueta: 'Seguros',            orden: 6 },
  tramites:  { etiqueta: 'Trámites',           orden: 7 },
  empresas:  { etiqueta: 'Empresas',           orden: 8 },
  asesoria:  { etiqueta: 'Asesoría',           orden: 9 },
};

export function etiquetaCategoria(clave) {
  return CATEGORIAS[clave]?.etiqueta || clave;
}

/** Servicios activos, ordenados como en la hoja. */
export async function obtenerServicios() {
  const datos = await obtenerContenido();
  return (datos.servicios || [])
    .filter((s) => s.activo && s.slug)
    .sort((a, b) => (a.orden || 0) - (b.orden || 0));
}

/** Servicios agrupados por categoria, en el orden definido arriba. */
export async function serviciosPorCategoria() {
  const servicios = await obtenerServicios();
  const grupos = new Map();

  for (const s of servicios) {
    const clave = s.categoria || 'asesoria';
    if (!grupos.has(clave)) {
      grupos.set(clave, { clave, etiqueta: etiquetaCategoria(clave), servicios: [] });
    }
    grupos.get(clave).servicios.push(s);
  }

  return [...grupos.values()].sort(
    (a, b) => (CATEGORIAS[a.clave]?.orden || 99) - (CATEGORIAS[b.clave]?.orden || 99)
  );
}

/**
 * Deriva la metadata SEO del nombre real del servicio.
 * Se recorta a los limites que Google muestra sin truncar.
 */
export function metaDeServicio(servicio) {
  const nombre = servicio.nombre || '';
  const base = `${nombre} en Colombia`;
  const titulo =
    base.length <= 46 ? `${base} | Asesorías SAS` : `${nombre} | Asesorías SAS`;

  const corta = (servicio.descripcion_corta || '').trim();
  const larga = (servicio.descripcion_larga || '').trim();
  let descripcion = corta && larga ? `${corta}. ${larga}` : corta || larga;

  if (descripcion.length > 158) {
    descripcion = descripcion.slice(0, 155).trimEnd() + '...';
  }
  if (!descripcion) {
    descripcion = `${nombre} para independientes y empresas en toda Colombia. Gestión 100% online.`;
  }

  return { titulo, descripcion };
}

/** Numeros de WhatsApp que se enrutan a la linea alterna. */
export const SLUGS_LINEA_ALTERNA = [
  'traslado-eps',
  'traslado-pension',
  'afiliacion-empresas',
  'soat',
];
