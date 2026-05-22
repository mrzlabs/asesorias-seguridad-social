# Estandar base de proyectos

## Separacion

- Landing comercial: conversión, claridad, confianza y captura de leads
- Portafolio MRZLabs: capacidades técnicas, React, Angular, SQL, Shell, contenedores, LLMs y arquitectura corporativa
- Backend Apps Script: lógica de negocio, persistencia en Sheets, validación y notificación
- Worker: seguridad perimetral, CORS, cache y proxy

## Frontend

- Responsive desde mobile-first
- HTML semántico
- CSS con variables
- JavaScript sin dependencias cuando el alcance no exige framework
- React o Angular solo cuando exista estado complejo, dashboard, CRM, autenticación o panel administrativo
- Componentes interactivos con degradación segura
- Formularios con validación cliente y validación servidor

## Backend

- Apps Script con funciones pequeñas
- `try/catch` en operaciones externas
- Script Properties para secretos
- Google Sheets como base operativa controlada
- Cache en lecturas repetidas
- Checkpoints en procesos largos

## Seguridad

- No exponer URL directa de Apps Script
- Worker obligatorio para API pública
- Validar origen
- Sanitizar inputs
- Honeypot antibot
- Rate limit
- Headers de seguridad
- Separar producción y prueba por branch o variable de entorno

## Staging

- Branch recomendado: `staging`
- Cloudflare Pages Preview conectado a branch
- Worker staging con `GAS_WEBAPP_URL` de prueba
- Sheet de prueba separada para evitar contaminar datos reales

## Portafolio

- Mostrar capacidades técnicas en `web-mrz-portfolio`
- Incluir demos pequeñas por stack
- React: panel CRM o componente de estado complejo
- Angular: módulo administrativo con formularios tipados
- SQL: modelo relacional y consultas KPI
- Shell: scripts de deploy y auditoría
- Contenedores: Docker Compose para entorno reproducible
- LLMs: asistente de clasificación o resumen con trazabilidad
