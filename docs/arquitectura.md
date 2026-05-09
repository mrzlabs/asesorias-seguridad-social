# Arquitectura

## Diagrama de capas
[Usuario]
|
| HTTPS
v
[Cloudflare DNS]
|
+---> [Cloudflare Pages] frontend/index.html
|          |
|          | fetch /api/getAllData o /api/lead
|          v
+---> [Cloudflare Worker asesorias-api-proxy]
|
| GAS_WEBAPP_URL desde secret
v
[Apps Script Web App]
|
+---> [Google Sheets SS_Asesorias_DB]
|        - Config, Servicios, FAQ, etc
|        - Leads
|        - Log
|
+---> [MailApp notificacion email]

## Componentes

### Frontend
- Tecnologia: HTML5, CSS3, JavaScript vanilla
- Hosting: Cloudflare Pages, deploy automatico desde main
- Build output: frontend/
- Sin framework, sin build step

### Worker proxy
- Tecnologia: Cloudflare Workers, JavaScript ES modules
- Funciones:
  - Oculta URL real de Apps Script
  - Valida origen via header Origin
  - Cache de getAllData con max-age 300s en edge
  - Maneja CORS
  - Rate limiting heredado de Apps Script
- Endpoints:
  - GET /api/getAllData
  - POST /api/lead
- Secrets:
  - GAS_WEBAPP_URL

### Backend Apps Script
- Runtime: V8
- Zona horaria: America/Bogota (UTC-5)
- Archivos:
  - Config.js: configuracion central, getSS, getSheetId
  - Logger.js: logEvent
  - DataReaders.js: sheetToObjects, getConfig, getServicios, etc
  - LeadHandler.js: validateLead, registrarLead, notifyNewLead, hashIP, checkRateLimit
  - Router.js: doGet, doPost, include
  - Index.html: template server side (legacy, no usado por frontend actual)
  - Stylesheet.html, JavaScript.html: includes del template legacy
- Script Properties:
  - SHEET_ID

### Datos
- Google Sheets SS_Asesorias_DB
- Hojas:
  - Config (clave, valor)
  - Servicios (nombre, descripcion, precio, orden, activo)
  - Flyers (titulo, url_imagen, link, orden, activo)
  - Videos (titulo, url_video, descripcion, orden, activo)
  - Testimonios (nombre, ciudad, texto, foto_url, activo)
  - FAQ (pregunta, respuesta, orden, activo)
  - Leads (timestamp, nombre, telefono, email, servicio_interes, ciudad, mensaje, utm_source, utm_campaign, ip_hash, user_agent, estado)
  - Metricas (timestamp, evento, valor, contexto)
  - Log (timestamp, nivel, funcion, mensaje, stack)

## Flujo deploy
local
|
| git push origin main
v
GitHub mrzlabs/asesorias-seguridad-social
|
+---> Cloudflare Pages auto build (frontend/)
|
+---> manual: clasp push (backend/)
|
+---> manual: wrangler deploy (worker/)

## Seguridad

- URL Apps Script no expuesta al cliente
- Worker valida Origin
- Rate limit 3 req / 10 min por IP en Apps Script
- Sanitizacion de inputs en backend (longitud, caracteres HTML)
- Honeypot antibot en formulario
- Validacion telefono colombiano regex 3xxxxxxxxx
- Hash IP antes de persistir (sin almacenar IP cruda)

## Pendientes futuros

- HMAC entre Worker y Apps Script
- WAF rules en Cloudflare para bloqueos por pais
- Logging estructurado a R2 o BigQuery
- Health check automatizado
