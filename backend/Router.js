function doGet(e) {
  try {
    const action = (e.parameter.action || '').toString();

    if (action === 'getAllData') {
      const data = getAllData();
      return ContentService.createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const cfg = getConfig();
    if (cfg.mantenimiento === true) {
      return HtmlService.createHtmlOutput('<h1>En mantenimiento</h1>');
    }
    const template = HtmlService.createTemplateFromFile('Index');
    template.data = getAllData();
    template.utm = {
      source: (e.parameter.utm_source || 'directo'),
      campaign: (e.parameter.utm_campaign || '')
    };
    return template.evaluate()
      .setTitle(cfg.empresa_nombre || 'Asesorias Seguridad Social')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (err) {
    logEvent('ERROR', 'doGet', err.message, err.stack);
    if ((e.parameter.action || '') === 'getAllData') {
      return ContentService.createTextOutput(JSON.stringify({ error: err.message }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    return HtmlService.createHtmlOutput('Error cargando la pagina');
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const result = registrarLead(data);
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    logEvent('ERROR', 'doPost', err.message, err.stack);
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'Error interno' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
