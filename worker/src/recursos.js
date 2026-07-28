// Whitelist de recursos administrables y construccion segura de SQL.
// Nunca se interpola una columna fuera de `columnas`: evita inyeccion por clave.

export const RECURSOS = {
  servicios: {
    tabla: 'servicios', pk: 'slug',
    columnas: ['slug', 'nombre', 'descripcion_corta', 'descripcion_larga', 'icono', 'categoria', 'honorario_desde', 'orden', 'activo'],
  },
  faq: {
    tabla: 'faq', pk: 'id',
    columnas: ['pregunta', 'respuesta', 'categoria', 'orden', 'activo'],
  },
  testimonios: {
    tabla: 'testimonios', pk: 'id',
    columnas: ['nombre', 'cargo_o_ciudad', 'testimonio', 'calificacion', 'activo'],
  },
  promociones: {
    tabla: 'promociones', pk: 'id',
    columnas: ['titulo', 'descripcion', 'imagen', 'vigente_hasta', 'orden', 'activo'],
  },
  parametros: {
    tabla: 'parametros', pk: 'clave',
    columnas: ['clave', 'valor', 'tipo', 'descripcion'],
  },
};

function columnasValidas(recurso, datos) {
  const def = RECURSOS[recurso];
  if (!def) throw new Error('recurso desconocido');
  return def.columnas.filter((c) => datos[c] !== undefined);
}

export function sqlInsert(recurso, datos) {
  const def = RECURSOS[recurso];
  const cols = columnasValidas(recurso, datos);
  if (!cols.length) throw new Error('sin columnas');
  const sql = `INSERT INTO ${def.tabla} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`;
  return { sql, binds: cols.map((c) => datos[c]) };
}

export function sqlUpdate(recurso, pkValor, datos) {
  const def = RECURSOS[recurso];
  const cols = columnasValidas(recurso, datos).filter((c) => c !== def.pk);
  if (!cols.length) throw new Error('sin columnas');
  const sql = `UPDATE ${def.tabla} SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE ${def.pk} = ?`;
  return { sql, binds: [...cols.map((c) => datos[c]), pkValor] };
}
