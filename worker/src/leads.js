// Acceso a D1 para leads, eventos y auditoria.
// Los helpers puros (construirFiltroLeads, diffAuditoria) no tocan la base y
// se prueban con node --test. Los ejecutores reciben el binding D1 `db`.

export const ESTADOS = ['nuevo', 'contactado', 'cotizado', 'cerrado', 'perdido'];

/**
 * Construye la clausula WHERE y los binds para listar leads.
 * Solo acepta valores conocidos; ignora en silencio lo invalido.
 */
export function construirFiltroLeads({ estado, servicio, origen, q, desde, hasta } = {}) {
  const cond = [];
  const binds = [];
  if (estado && ESTADOS.includes(estado)) { cond.push('estado = ?'); binds.push(estado); }
  if (servicio) { cond.push('servicio_interes = ?'); binds.push(servicio); }
  if (origen) { cond.push('utm_source = ?'); binds.push(origen); }
  if (q) {
    cond.push('(nombre LIKE ? OR telefono LIKE ? OR email LIKE ?)');
    binds.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (desde) { cond.push('creado >= ?'); binds.push(desde); }
  if (hasta) { cond.push('creado <= ?'); binds.push(hasta); }
  const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
  return { where, binds };
}

/** Devuelve solo los campos que cambiaron, como { campo: { de, a } }. */
export function diffAuditoria(antes, despues) {
  const d = {};
  for (const k of Object.keys(despues)) {
    if (antes[k] !== despues[k]) d[k] = { de: antes[k], a: despues[k] };
  }
  return d;
}

// --- Ejecutores D1 (verificados contra D1 local, no en node --test) ---

/** Inserta un lead. Devuelve el id nuevo. */
export async function insertarLead(db, lead) {
  const { results } = await db
    .prepare(
      `INSERT INTO leads
        (nombre, telefono, email, ciudad, servicio_interes, mensaje,
         utm_source, utm_campaign, codigo_atribucion, pagina_origen, canal,
         calculo_ingreso, calculo_ibc, calculo_total,
         autorizacion_datos, autorizacion_fecha, autorizacion_version,
         ip_hash, user_agent)
       VALUES (?,?,?,?,?,?, ?,?,?,?,?, ?,?,?, ?,?,?, ?,?)
       RETURNING id`
    )
    .bind(
      lead.nombre, lead.telefono, lead.email ?? null, lead.ciudad ?? null,
      lead.servicio_interes ?? null, lead.mensaje ?? null,
      lead.utm_source ?? 'directo', lead.utm_campaign ?? null,
      lead.codigo_atribucion ?? null, lead.pagina_origen ?? null,
      lead.canal ?? 'formulario',
      lead.calculo_ingreso ?? null, lead.calculo_ibc ?? null, lead.calculo_total ?? null,
      lead.autorizacion_datos ? 1 : 0, lead.autorizacion_fecha ?? null,
      lead.autorizacion_version ?? null,
      lead.ip_hash ?? null, lead.user_agent ?? null
    )
    .all();
  return results?.[0]?.id;
}

/** Inserta un evento medible. */
export async function insertarEvento(db, ev) {
  await db
    .prepare(
      `INSERT INTO eventos
        (tipo, detalle, pagina, utm_source, utm_campaign, codigo_atribucion, lead_id)
       VALUES (?,?,?,?,?,?,?)`
    )
    .bind(
      ev.tipo, ev.detalle ?? null, ev.pagina ?? null,
      ev.utm_source ?? null, ev.utm_campaign ?? null,
      ev.codigo_atribucion ?? null, ev.lead_id ?? null
    )
    .run();
}

/** Lista leads con filtros y paginacion. Devuelve { leads, total, pagina, tam }. */
export async function listarLeads(db, params = {}) {
  const { where, binds } = construirFiltroLeads(params);
  const pagina = Math.max(1, Number(params.pagina) || 1);
  const tam = Math.min(100, Math.max(1, Number(params.tam) || 25));
  const offset = (pagina - 1) * tam;

  const totalRow = await db.prepare(`SELECT COUNT(*) AS n FROM leads ${where}`).bind(...binds).first();
  const { results } = await db
    .prepare(`SELECT * FROM leads ${where} ORDER BY creado DESC LIMIT ? OFFSET ?`)
    .bind(...binds, tam, offset)
    .all();
  return { leads: results ?? [], total: totalRow?.n ?? 0, pagina, tam };
}

/** Lead + sus eventos, o null si no existe. */
export async function obtenerLead(db, id) {
  const lead = await db.prepare('SELECT * FROM leads WHERE id = ?').bind(id).first();
  if (!lead) return null;
  const { results } = await db
    .prepare('SELECT * FROM eventos WHERE lead_id = ? ORDER BY creado DESC')
    .bind(id)
    .all();
  return { ...lead, eventos: results ?? [] };
}

/**
 * Actualiza los campos de gestion y registra auditoria.
 * `cambios` solo puede traer: estado, notas, motivo_perdida, valor_cerrado.
 * Devuelve { ok, error }.
 */
export async function actualizarLead(db, id, cambios, usuario) {
  const permitidos = ['estado', 'notas', 'motivo_perdida', 'valor_cerrado'];
  if (cambios.estado && !ESTADOS.includes(cambios.estado)) {
    return { ok: false, error: 'estado invalido' };
  }
  const antes = await db.prepare('SELECT * FROM leads WHERE id = ?').bind(id).first();
  if (!antes) return { ok: false, error: 'no existe' };

  const sets = [];
  const binds = [];
  const despues = { ...antes };
  for (const k of permitidos) {
    if (cambios[k] !== undefined) {
      sets.push(`${k} = ?`);
      binds.push(cambios[k]);
      despues[k] = cambios[k];
    }
  }
  if (!sets.length) return { ok: true };
  sets.push(`actualizado = datetime('now')`);

  const diff = diffAuditoria(
    Object.fromEntries(permitidos.map((k) => [k, antes[k]])),
    Object.fromEntries(permitidos.map((k) => [k, despues[k]]))
  );

  await db.batch([
    db.prepare(`UPDATE leads SET ${sets.join(', ')} WHERE id = ?`).bind(...binds, id),
    db.prepare(
      `INSERT INTO auditoria (usuario, accion, entidad, entidad_id, detalle)
       VALUES (?, 'lead.update', 'leads', ?, ?)`
    ).bind(usuario ?? null, String(id), JSON.stringify(diff)),
  ]);
  return { ok: true };
}

/** KPIs: conteo por estado y leads del mes en curso. */
export async function resumenLeads(db) {
  const { results: porEstado } = await db
    .prepare('SELECT estado, COUNT(*) AS n FROM leads GROUP BY estado')
    .all();
  const delMes = await db
    .prepare(`SELECT COUNT(*) AS n FROM leads WHERE creado >= datetime('now','start of month')`)
    .first();
  return { porEstado: porEstado ?? [], delMes: delMes?.n ?? 0 };
}
