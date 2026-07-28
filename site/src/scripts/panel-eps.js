import { req, esc, toast } from './panel-comun.js';

const $ = (id) => document.getElementById(id);

// --- Cambio de sección ---
document.querySelectorAll('.secc-tabs button').forEach((b) => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.secc-tabs button').forEach((x) => x.classList.toggle('on', x === b));
    for (const s of ['catalogo', 'ciudades', 'cobertura']) $('s-' + s).hidden = s !== b.dataset.s;
    if (b.dataset.s === 'catalogo') cargarCatalogo();
    if (b.dataset.s === 'ciudades') cargarCiudades();
    if (b.dataset.s === 'cobertura') prepararCobertura();
  });
});

// --- Editor de tarjetas para EPS y ciudades ---
function tarjeta(recurso, pkCampo, campos, item, esNuevo, recargar) {
  const div = document.createElement('div');
  div.className = 'tarjeta';
  const titulo = esNuevo ? `Nuevo` : esc(item.nombre || item[pkCampo]);
  const campHtml = campos.map(([c, et, tipo]) => {
    if (!esNuevo && c === pkCampo) return `<div class="campo"><label class="et">${et}</label><input type="text" value="${esc(item[c])}" disabled></div>`;
    const v = esc(item[c]);
    const control = tipo === 'area' ? `<textarea data-c="${c}">${v}</textarea>`
      : `<input type="${tipo === 'number' ? 'number' : 'text'}" data-c="${c}" value="${v}">`;
    return `<div class="campo"><label class="et">${et}</label>${control}</div>`;
  }).join('');
  const toggles = esNuevo ? '' :
    (recurso === 'ciudades'
      ? `<label class="interruptor"><input type="checkbox" data-c="publicada" ${item.publicada ? 'checked' : ''}> Publicada en el sitio</label>
         <label class="interruptor"><input type="checkbox" data-c="activo" ${item.activo ? 'checked' : ''}> Activa</label>`
      : `<label class="interruptor"><input type="checkbox" data-c="activo" ${item.activo ? 'checked' : ''}> Activa</label>`);

  div.innerHTML = `<h3 style="font-family:var(--serif);color:var(--navy);margin:0 0 .6rem">${titulo}</h3>${campHtml}
    <div class="fila-acc"><button class="acc guardar">${esNuevo ? 'Crear' : 'Guardar'}</button>${toggles}<span class="ok" style="color:var(--ok);font-weight:600" hidden>✓</span></div>`;

  div.querySelector('.guardar').addEventListener('click', async (e) => {
    const datos = {};
    for (const el of div.querySelectorAll('[data-c]')) {
      if (el.disabled) continue;
      if (el.type === 'checkbox') datos[el.dataset.c] = el.checked ? 1 : 0;
      else if (el.value !== '') datos[el.dataset.c] = el.type === 'number' ? Number(el.value) : el.value;
    }
    e.target.disabled = true;
    try {
      if (esNuevo) { datos.activo = 1; await req(`/${recurso}`, { method: 'POST', body: JSON.stringify(datos) }); toast('✓ Creado'); recargar(); }
      else {
        await req(`/${recurso}/${encodeURIComponent(item[pkCampo])}`, { method: 'PATCH', body: JSON.stringify(datos) });
        const ok = div.querySelector('.ok'); ok.hidden = false; setTimeout(() => { ok.hidden = true; }, 2000);
        toast('✓ Guardado. Publica para verlo en el sitio.');
      }
    } catch { /* banner */ } finally { e.target.disabled = false; }
  });
  return div;
}

// --- Catálogo de EPS ---
const CAMPOS_EPS = [['slug', 'Slug (id)', 'text'], ['nombre', 'Nombre', 'text'], ['nombre_corto', 'Nombre corto', 'text'],
  ['tipo', 'Tipo (contributivo/subsidiado/ambos)', 'text'], ['sitio_web', 'Sitio web', 'text'], ['telefono', 'Teléfono', 'text'], ['orden', 'Orden', 'number']];

async function cargarCatalogo() {
  const cont = $('s-catalogo');
  cont.innerHTML = '<div class="cargando">Cargando…</div>';
  let eps; try { eps = await req('/eps'); } catch { return; }
  cont.innerHTML = '';
  const nuevo = document.createElement('button'); nuevo.className = 'acc'; nuevo.textContent = '+ Nueva EPS';
  nuevo.style.marginBottom = '1rem';
  nuevo.addEventListener('click', () => { if (!cont.querySelector('.nuevo-eps')) { const t = tarjeta('eps', 'slug', CAMPOS_EPS, {}, true, cargarCatalogo); t.classList.add('nuevo-eps'); cont.insertBefore(t, cont.children[1]); } });
  cont.appendChild(nuevo);
  for (const e of eps) cont.appendChild(tarjeta('eps', 'slug', CAMPOS_EPS, e, false, cargarCatalogo));
}

// --- Ciudades ---
const CAMPOS_CIU = [['slug', 'Slug (id)', 'text'], ['nombre', 'Nombre', 'text'], ['departamento', 'Departamento', 'text'],
  ['descripcion', 'Introducción única (contenido propio para SEO, evita plantilla)', 'area']];

async function cargarCiudades() {
  const cont = $('s-ciudades');
  cont.innerHTML = '<div class="cargando">Cargando…</div>';
  let ciu; try { ciu = await req('/ciudades'); } catch { return; }
  cont.innerHTML = '';
  const nuevo = document.createElement('button'); nuevo.className = 'acc'; nuevo.textContent = '+ Nueva ciudad';
  nuevo.style.marginBottom = '1rem';
  nuevo.addEventListener('click', () => { if (!cont.querySelector('.nuevo-ciu')) { const t = tarjeta('ciudades', 'slug', CAMPOS_CIU, {}, true, cargarCiudades); t.classList.add('nuevo-ciu'); cont.insertBefore(t, cont.children[1]); } });
  cont.appendChild(nuevo);
  for (const c of ciu) cont.appendChild(tarjeta('ciudades', 'slug', CAMPOS_CIU, c, false, cargarCiudades));
}

// --- Cobertura por ciudad ---
let epsCat = [], relaciones = [];
async function prepararCobertura() {
  const sel = $('sel-ciudad');
  try {
    const [ciu, eps, rel] = await Promise.all([req('/ciudades'), req('/eps'), req('/eps_ciudad')]);
    epsCat = eps; relaciones = rel;
    sel.innerHTML = '<option value="">—</option>' + ciu.map((c) => `<option value="${esc(c.slug)}">${esc(c.nombre)}</option>`).join('');
  } catch { return; }
  sel.onchange = () => pintarCobertura(sel.value);
}

function relDe(epsSlug, ciudadSlug) {
  return relaciones.find((r) => r.eps_slug === epsSlug && r.ciudad_slug === ciudadSlug);
}

function pintarCobertura(ciudadSlug) {
  const cont = $('cobertura-lista');
  if (!ciudadSlug) { cont.innerHTML = ''; return; }
  cont.innerHTML = '<div class="tarjeta"><p class="sub">Marca qué EPS operan en esta ciudad y describe su cobertura. Guarda cada fila.</p></div>';
  const card = document.createElement('div'); card.className = 'tarjeta';
  for (const e of epsCat) {
    const r = relDe(e.slug, ciudadSlug) || {};
    const fila = document.createElement('div');
    fila.className = 'cob-eps';
    fila.innerHTML = `
      <div class="nom">${esc(e.nombre)}<br>
        <label class="interruptor"><input type="checkbox" class="disp" ${r.disponible ? 'checked' : ''}> Disponible</label><br>
        <label class="interruptor"><input type="checkbox" class="verif" ${r.verificado ? 'checked' : ''}> Verificado</label>
      </div>
      <div>
        <div class="campo"><label class="et">Red de atención</label><input type="text" class="red" value="${esc(r.red_atencion)}"></div>
        <div class="campo"><label class="et">Particularidades</label><textarea class="part">${esc(r.particularidades)}</textarea></div>
        <div class="campo"><label class="et">Fuente (URL)</label><input type="text" class="fuente" value="${esc(r.fuente)}"></div>
        <div class="fila-acc"><button class="acc sec guardar">Guardar</button><span class="ok" style="color:var(--ok)" hidden>✓</span></div>
      </div>`;
    fila.querySelector('.guardar').addEventListener('click', async (ev) => {
      const datos = {
        eps_slug: e.slug, ciudad_slug: ciudadSlug,
        disponible: fila.querySelector('.disp').checked ? 1 : 0,
        verificado: fila.querySelector('.verif').checked ? 1 : 0,
        red_atencion: fila.querySelector('.red').value,
        particularidades: fila.querySelector('.part').value,
        fuente: fila.querySelector('.fuente').value,
      };
      ev.target.disabled = true;
      try {
        const existente = relDe(e.slug, ciudadSlug);
        if (existente) await req(`/eps_ciudad/${existente.id}`, { method: 'PATCH', body: JSON.stringify(datos) });
        else await req('/eps_ciudad', { method: 'POST', body: JSON.stringify(datos) });
        relaciones = await req('/eps_ciudad');
        const ok = fila.querySelector('.ok'); ok.hidden = false; setTimeout(() => { ok.hidden = true; }, 2000);
        toast('✓ Guardado');
      } catch { /* banner */ } finally { ev.target.disabled = false; }
    });
    card.appendChild(fila);
  }
  cont.appendChild(card);
}

cargarCatalogo();
