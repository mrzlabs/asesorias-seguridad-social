function logEvent(nivel, funcion, mensaje, stack) {
  try {
    const sheet = getSS().getSheetByName(CONFIG.SHEETS.LOG);
    sheet.appendRow([new Date(), nivel, funcion, mensaje, stack || '']);
  } catch (e) {}
}
