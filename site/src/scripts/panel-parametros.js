import { req, esc, toast } from './panel-comun.js';

// Etiquetas legibles y agrupación. Lo no listado cae en "Otros ajustes".
const ETIQUETAS = {
  smlmv: ['Salario mínimo (SMLMV)', 'En pesos'],
  auxilio_transporte: ['Auxilio de transporte', 'En pesos'],
  ibc_porcentaje_contratista: ['IBC contratista', 'Fracción del ingreso (0.4 = 40%)'],
  ibc_minimo_smlmv: ['IBC mínimo', 'En SMLMV'],
  ibc_maximo_smlmv: ['IBC máximo', 'En SMLMV'],
  tasa_salud: ['Tasa de salud', 'Fracción (0.125 = 12.5%)'],
  tasa_pension: ['Tasa de pensión', 'Fracción (0.16 = 16%)'],
  tasa_ccf_independiente: ['Caja compensación (independiente)', 'Fracción'],
  tasa_ccf_empleador: ['Caja compensación (empleador)', 'Fracción'],
  arl_clase_1: ['ARL clase I', 'Fracción'], arl_clase_2: ['ARL clase II', 'Fracción'],
  arl_clase_3: ['ARL clase III', 'Fracción'], arl_clase_4: ['ARL clase IV', 'Fracción'],
  arl_clase_5: ['ARL clase V', 'Fracción'], fsp_umbral_smlmv: ['Umbral FSP', 'En SMLMV'],
  empresa_nombre: ['Nombre de la empresa', ''], empresa_slogan: ['Eslogan', ''],
  whatsapp_numero: ['WhatsApp principal', ''], whatsapp_numero_2: ['WhatsApp alterno', ''],
  whatsapp_mensaje: ['Mensaje de WhatsApp', ''], email_contacto: ['Email de contacto', ''],
  telefono_fijo: ['Teléfono fijo', ''], direccion: ['Dirección', ''], horario_atencion: ['Horario', ''],
  instagram_url: ['Instagram', ''], facebook_url: ['Facebook', ''], tiktok_url: ['TikTok', ''],
  ga4_id: ['Google Analytics (GA4)', ''], meta_pixel_id: ['Meta Pixel', ''],
  recaptcha_site_key: ['reCAPTCHA site key', ''], google_site_verification: ['Verificación Google', ''],
};
const ES_CALCULO = (c) => /^(smlmv|auxilio_transporte|ibc_|tasa_|arl_|fsp_)/.test(c);

(async () => {
  let params;
  try { params = await req('/parametros'); } catch { return; }
  const calculo = params.filter((p) => ES_CALCULO(p.clave));
  const sitio = params.filter((p) => !ES_CALCULO(p.clave));
  document.getElementById('grupos').innerHTML = '';
  grupo('Parámetros de cálculo', 'Salario mínimo, tasas y topes que usa la calculadora de aportes.', calculo);
  grupo('Ajustes del sitio', 'Datos de contacto, redes y códigos de medición.', sitio);
})();

function grupo(titulo, desc, items) {
  const cont = document.getElementById('grupos');
  const div = document.createElement('div');
  div.className = 'grupo tarjeta';
  div.innerHTML = `<h2>${titulo}</h2><p class="desc">${desc}</p>`;
  for (const p of items.sort((a, b) => a.clave.localeCompare(b.clave))) {
    const [et, ayuda] = ETIQUETAS[p.clave] || [p.clave, ''];
    const fila = document.createElement('div');
    fila.className = 'param';
    fila.innerHTML = `
      <div class="nom">${esc(et)}${ayuda ? `<small>${esc(ayuda)}</small>` : ''}</div>
      <input type="text" value="${esc(p.valor)}" />
      <div><button class="acc sec">Guardar</button> <span class="ok" hidden>✓</span></div>`;
    fila.querySelector('button').addEventListener('click', async (e) => {
      e.target.disabled = true;
      try {
        await req(`/parametros/${encodeURIComponent(p.clave)}`, {
          method: 'PATCH', body: JSON.stringify({ valor: fila.querySelector('input').value }),
        });
        const ok = fila.querySelector('.ok');
        ok.hidden = false; setTimeout(() => { ok.hidden = true; }, 2000);
        toast('✓ Guardado. Recuerda Publicar para verlo en el sitio.');
      } catch { /* banner */ }
      finally { e.target.disabled = false; }
    });
    div.appendChild(fila);
  }
  cont.appendChild(div);
}
