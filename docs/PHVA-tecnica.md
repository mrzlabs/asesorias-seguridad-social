# PHVA Tecnica. asesorias-seguridad-social

## PLANEAR

Objetivo: landing dinamica con backend Apps Script y frontend estatico, captacion de leads y CMS via Google Sheets.

Alcance:
- Frontend HTML estatico en Cloudflare Pages
- Backend Apps Script Web App expone API JSON
- Cloudflare Worker proxy oculta URL Apps Script
- Google Sheets como fuente de contenido y persistencia de leads
- Notificacion email automatica via MailApp

Requisitos:
- Cuenta Google con acceso al Sheet SS_Asesorias_DB
- Apps Script API habilitada
- clasp 2.4 o superior
- wrangler 4.x o superior
- Cuenta Cloudflare con Pages y Workers
- Dominio asesoriasas.com en Cloudflare DNS

Recursos:
- SHEET_ID en Script Properties del Apps Script
- GAS_WEBAPP_URL en secret del Worker
- Variable ALLOWED_ORIGIN hardcoded en wrangler.toml

Responsable: amtz-dev (mrzlabs).

## HACER

1. Backend Apps Script
   - Editor: https://script.google.com Project Settings > Script Properties
   - Configurar SHEET_ID con el ID del Sheet de produccion
   - Local: cd backend; clasp push
   - Deploy: editor web > Deploy > New deployment > Web app > execute as ME, access ANYONE_ANONYMOUS
   - Copiar URL del Web App

2. Worker proxy
   - cd worker
   - wrangler secret put GAS_WEBAPP_URL (pegar URL del Web App)
   - wrangler deploy
   - Anotar URL workers.dev

3. Frontend
   - frontend/index.html consume Worker en /api/getAllData y /api/lead
   - Push a main dispara build automatico en Cloudflare Pages
   - Build output: frontend/

4. Dominio
   - Pages > Custom domains > asesoriasas.com

## VERIFICAR

KPI tiempo de carga: < 3s SLA en Lighthouse mobile
KPI tasa de error frontend: < 1 percent en 30 dias (medido en Cloudflare Analytics)
KPI tasa de exito de leads: > 95 percent (leads exitosos / intentos)
KPI cobertura sincronizacion Sheet > web: < 10 min con CACHE_TTL 600s
KPI rate limit antiabuso: 3 intentos por IP por 10 min
KPI cuota Apps Script: < 80 percent del limite diario

Criterios de aceptacion:
- Network tab no expone URL script.google.com
- POST a /api/lead con datos validos retorna ok true y guarda en Sheet Leads
- POST con telefono invalido retorna error de validacion
- POST repetido 4 veces en 10 min desde misma IP retorna error rate limit
- Email notificacion llega al destinatario configurado en Sheet Config
- Cambio en Sheet Servicios se refleja en web maximo 10 min despues
- Sitio carga en menos de 3s en mobile

## ACTUAR

Iteracion 0.2: PWA con manifest y service worker para instalable mobile
Iteracion 0.3: Open Graph dinamico segun servicio compartido en redes
Iteracion 0.4: Dashboard analitico de leads en Looker Studio
Iteracion 0.5: A/B test de CTA principal
Iteracion 0.6: Integracion captura via WhatsApp Business API directa
Iteracion 0.7: HMAC en requests entre Worker y Apps Script

## Cierre

Sitio vivo. Crece con cada cliente que llega.
