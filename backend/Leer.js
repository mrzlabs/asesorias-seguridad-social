function sheetToObjects(sheetName) {
  const sheet = getSS().getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0].map(h => String(h).trim());
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function getConfig() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('config');
  if (cached) return JSON.parse(cached);
  const rows = sheetToObjects(CONFIG.SHEETS.CONFIG);
  const config = {};
  rows.forEach(r => { if (r.clave) config[r.clave] = r.valor; });
  cache.put('config', JSON.stringify(config), CONFIG.CACHE_TTL);
  return config;
}

function getServicios() {
  return sheetToObjects(CONFIG.SHEETS.SERVICIOS)
    .filter(s => s.activo === true)
    .sort((a, b) => (a.orden || 0) - (b.orden || 0));
}

function getFlyers() {
  return sheetToObjects(CONFIG.SHEETS.FLYERS)
    .filter(f => f.activo === true)
    .sort((a, b) => (a.orden || 0) - (b.orden || 0));
}

function getVideos() {
  return sheetToObjects(CONFIG.SHEETS.VIDEOS)
    .filter(v => v.activo === true)
    .sort((a, b) => (a.orden || 0) - (b.orden || 0));
}

function getTestimonios() {
  return sheetToObjects(CONFIG.SHEETS.TESTIMONIOS).filter(t => t.activo === true);
}

function getFAQ() {
  return sheetToObjects(CONFIG.SHEETS.FAQ)
    .filter(f => f.activo === true)
    .sort((a, b) => (a.orden || 0) - (b.orden || 0));
}

function getAllData() {
  return {
    config: getConfig(),
    servicios: getServicios(),
    flyers: getFlyers(),
    videos: getVideos(),
    testimonios: getTestimonios(),
    faq: getFAQ()
  };
}
