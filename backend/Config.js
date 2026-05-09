const CONFIG = {
  CACHE_TTL: 600,
  RATE_LIMIT_MAX: 3,
  RATE_LIMIT_WINDOW: 600,
  SHEETS: {
    CONFIG: 'Config',
    SERVICIOS: 'Servicios',
    FLYERS: 'Flyers',
    VIDEOS: 'Videos',
    TESTIMONIOS: 'Testimonios',
    FAQ: 'FAQ',
    LEADS: 'Leads',
    METRICAS: 'Metricas',
    LOG: 'Log'
  }
};

function getSheetId() {
  const id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  if (!id) throw new Error('SHEET_ID no configurado en Script Properties');
  return id;
}

function getSS() {
  return SpreadsheetApp.openById(getSheetId());
}
