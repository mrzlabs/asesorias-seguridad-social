// Ruteo de la API de administracion, independiente de como se autentico la
// peticion. `sub` es la ruta despues del prefijo admin (p.ej. 'leads',
// 'leads/5', 'servicios', 'servicios/afiliacion-eps', 'resumen', 'publicar').
import { listarLeads, obtenerLead, actualizarLead, resumenLeads } from './leads.js';
import { listar, crear, editar, eliminar, publicar } from './contenido.js';
import { RECURSOS } from './recursos.js';

// Se deriva de RECURSOS para que un recurso nuevo no requiera tocar el ruteo.
const RE_RECURSO = new RegExp(`^(${Object.keys(RECURSOS).join('|')})(?:\\/(.+))?$`);

export async function manejarAdmin(sub, searchParams, request, env, usuario, json) {
  const db = env.DB;

  if (sub === 'resumen' && request.method === 'GET') {
    return json(await resumenLeads(db));
  }
  if (sub === 'publicar' && request.method === 'POST') {
    return json(await publicar(env));
  }
  if (sub === 'leads' && request.method === 'GET') {
    return json(await listarLeads(db, Object.fromEntries(searchParams)));
  }

  const mLead = sub.match(/^leads\/(\d+)$/);
  if (mLead) {
    const id = Number(mLead[1]);
    if (request.method === 'GET') {
      const lead = await obtenerLead(db, id);
      return lead ? json(lead) : json({ error: 'no existe' }, 404);
    }
    if (request.method === 'PATCH') {
      const r = await actualizarLead(db, id, await request.json(), usuario);
      if (r.ok) return json({ ok: true });
      return json({ error: r.error }, r.error === 'no existe' ? 404 : 400);
    }
  }

  const mRec = sub.match(RE_RECURSO);
  if (mRec) {
    const recurso = mRec[1];
    const pk = mRec[2] ? decodeURIComponent(mRec[2]) : null;
    if (request.method === 'GET' && !pk) return json(await listar(db, recurso));
    if (request.method === 'POST' && !pk) return json(await crear(db, recurso, await request.json(), usuario));
    if (request.method === 'PATCH' && pk) return json(await editar(db, recurso, pk, await request.json(), usuario));
    if (request.method === 'DELETE' && pk) return json(await eliminar(db, recurso, pk, usuario));
    return json({ error: 'metodo no soportado' }, 405);
  }

  return json({ error: 'ruta admin no encontrada' }, 404);
}
