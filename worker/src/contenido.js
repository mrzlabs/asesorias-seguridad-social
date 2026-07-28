// Lectura del contenido desde D1 (contrato getAllData) y CRUD generico admin.
import { RECURSOS, sqlInsert, sqlUpdate } from './recursos.js';

/** Arma el contrato getAllData (ver spec §3) desde D1. */
export async function getAllDataDesdeD1(db) {
  const [params, servicios, faq, testimonios, promos] = await Promise.all([
    db.prepare('SELECT clave, valor FROM parametros').all(),
    db.prepare('SELECT * FROM servicios WHERE activo = 1 ORDER BY orden').all(),
    db.prepare('SELECT * FROM faq WHERE activo = 1 ORDER BY orden').all(),
    db.prepare('SELECT * FROM testimonios WHERE activo = 1').all(),
    db.prepare('SELECT * FROM promociones WHERE activo = 1 ORDER BY orden').all(),
  ]);
  const config = {};
  for (const p of params.results || []) config[p.clave] = p.valor;
  return {
    config,
    servicios: servicios.results || [],
    faq: faq.results || [],
    testimonios: testimonios.results || [],
    flyers: promos.results || [], // la portada consume la clave `flyers`
  };
}

/** Lista un recurso completo (incluye inactivos, para gestion en el panel). */
export async function listar(db, recurso) {
  const def = RECURSOS[recurso];
  const orden = def.pk === 'id' ? 'id DESC' : def.pk;
  const { results } = await db.prepare(`SELECT * FROM ${def.tabla} ORDER BY ${orden}`).all();
  return results || [];
}

export async function crear(db, recurso, datos, usuario) {
  const { sql, binds } = sqlInsert(recurso, datos);
  await db.batch([
    db.prepare(sql).bind(...binds),
    auditar(db, `${recurso}.crear`, recurso, String(datos[RECURSOS[recurso].pk] ?? ''), datos, usuario),
  ]);
  return { ok: true };
}

export async function editar(db, recurso, pkValor, datos, usuario) {
  const { sql, binds } = sqlUpdate(recurso, pkValor, datos);
  await db.batch([
    db.prepare(sql).bind(...binds),
    auditar(db, `${recurso}.editar`, recurso, String(pkValor), datos, usuario),
  ]);
  return { ok: true };
}

export async function eliminar(db, recurso, pkValor, usuario) {
  const def = RECURSOS[recurso];
  await db.batch([
    db.prepare(`DELETE FROM ${def.tabla} WHERE ${def.pk} = ?`).bind(pkValor),
    auditar(db, `${recurso}.eliminar`, recurso, String(pkValor), {}, usuario),
  ]);
  return { ok: true };
}

function auditar(db, accion, entidad, entidadId, detalle, usuario) {
  return db
    .prepare(`INSERT INTO auditoria (usuario, accion, entidad, entidad_id, detalle) VALUES (?,?,?,?,?)`)
    .bind(usuario ?? null, accion, entidad, entidadId, JSON.stringify(detalle));
}

/** Dispara el deploy hook de Pages para reconstruir el sitio estatico. */
export async function publicar(env) {
  if (!env.DEPLOY_HOOK_URL) return { ok: false, error: 'deploy hook no configurado' };
  const r = await fetch(env.DEPLOY_HOOK_URL, { method: 'POST' });
  return { ok: r.ok, status: r.status };
}
