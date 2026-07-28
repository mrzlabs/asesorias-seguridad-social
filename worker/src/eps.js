// Datos del comparador de EPS para el sitio publico.
// Solo expone ciudades publicadas: una ciudad sin `publicada=1` no existe para
// el sitio (regla anti-doorway: nada se publica sin revision del negocio).

export async function getEpsData(db) {
  const [eps, ciudades] = await Promise.all([
    db.prepare('SELECT * FROM eps WHERE activo = 1 ORDER BY orden, nombre').all(),
    db.prepare('SELECT * FROM ciudades WHERE publicada = 1 AND activo = 1 ORDER BY nombre').all(),
  ]);
  const publicadas = (ciudades.results || []).map((c) => c.slug);
  let coberturas = [];
  if (publicadas.length) {
    const marcas = publicadas.map(() => '?').join(',');
    const { results } = await db
      .prepare(`SELECT * FROM eps_ciudad WHERE disponible = 1 AND ciudad_slug IN (${marcas})`)
      .bind(...publicadas)
      .all();
    coberturas = results || [];
  }
  return { eps: eps.results || [], ciudades: ciudades.results || [], coberturas };
}
