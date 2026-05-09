# asesorias-seguridad-social

Landing dinamica con backend en Apps Script y frontend estatico en Cloudflare Pages.

## Arquitectura

- Frontend: HTML estatico desplegado en Cloudflare Pages
- Backend: Apps Script Web App como API (modo getAllData)
- Datos: Google Sheets como fuente de contenido y leads
- Deploy backend: clasp push manual o GitHub Actions
- Deploy frontend: push a main, Cloudflare Pages auto deploy

## Estructura

- backend/ codigo Apps Script
- frontend/ HTML estatico Cloudflare Pages
- docs/ documentacion PHVA dual y schema de Sheets

## Setup

1. Backend: cp backend/.clasp.json.example backend/.clasp.json
2. Editar scriptId en backend/.clasp.json
3. cd backend; clasp push
4. Configurar Script Properties: SHEET_ID
5. Frontend: editar URL de Web App en frontend/index.html
6. Push a main, deploy automatico

## Documentacion

- docs/PHVA-doomies.md
- docs/PHVA-tecnica.md
- docs/arquitectura.md
- docs/sheets-schema.md

## Licencia

MIT
