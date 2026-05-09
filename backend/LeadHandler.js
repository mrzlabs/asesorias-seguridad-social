function hashIP(ip) {
  const raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, ip || 'unknown');
  return raw.map(b => (b < 0 ? b + 256 : b).toString(16).padStart(2, '0')).join('').slice(0, 16);
}

function checkRateLimit(ipHash) {
  const props = PropertiesService.getScriptProperties();
  const key = 'rl_' + ipHash;
  const now = Date.now();
  const windowMs = CONFIG.RATE_LIMIT_WINDOW * 1000;
  const raw = props.getProperty(key);
  let attempts = raw ? JSON.parse(raw) : [];
  attempts = attempts.filter(t => now - t < windowMs);
  if (attempts.length >= CONFIG.RATE_LIMIT_MAX) return false;
  attempts.push(now);
  props.setProperty(key, JSON.stringify(attempts));
  return true;
}

function validateLead(data) {
  const errors = [];
  if (!data.nombre || data.nombre.trim().length < 2) errors.push('Nombre invalido');
  if (!/^3\d{9}$/.test(String(data.telefono || '').replace(/\s/g, ''))) errors.push('Telefono debe ser celular colombiano (10 digitos iniciando en 3)');
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.push('Email invalido');
  if (data.honeypot) errors.push('spam');
  return errors;
}

function sanitize(str) {
  return String(str || '').replace(/[<>]/g, '').trim().slice(0, 500);
}

function registrarLead(data) {
  try {
    const ipHash = hashIP(data._ip);
    if (!checkRateLimit(ipHash)) {
      return { ok: false, error: 'Demasiados envios. Intenta en unos minutos.' };
    }
    const errors = validateLead(data);
    if (errors.length) {
      return { ok: false, error: errors.join(', ') };
    }
    const sheet = getSS().getSheetByName(CONFIG.SHEETS.LEADS);
    sheet.appendRow([
      new Date(),
      sanitize(data.nombre),
      sanitize(data.telefono),
      sanitize(data.email),
      sanitize(data.servicio_interes),
      sanitize(data.ciudad),
      sanitize(data.mensaje),
      sanitize(data.utm_source),
      sanitize(data.utm_campaign),
      ipHash,
      sanitize(data._userAgent),
      'nuevo'
    ]);
    notifyNewLead(data);
    logEvent('INFO', 'registrarLead', 'Lead registrado: ' + data.nombre);
    return { ok: true, mensaje: 'Recibido. Te contactamos pronto.' };
  } catch (e) {
    logEvent('ERROR', 'registrarLead', e.message, e.stack);
    return { ok: false, error: 'Error interno. Intenta de nuevo.' };
  }
}

function notifyNewLead(data) {
  try {
    const cfg = getConfig();
    if (!cfg.email_contacto) return;
    const body = 'Nuevo lead:\n\nNombre: ' + data.nombre + '\nTel: ' + data.telefono + '\nEmail: ' + data.email + '\nServicio: ' + data.servicio_interes + '\nCiudad: ' + data.ciudad + '\nMensaje: ' + data.mensaje;
    MailApp.sendEmail(cfg.email_contacto, 'Nuevo lead web', body);
  } catch (e) {
    logEvent('WARN', 'notifyNewLead', e.message);
  }
}
