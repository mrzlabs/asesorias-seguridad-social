# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## [0.2.0] - 2026-07-27

Fase 0: fundamentos de SEO técnico y medición.

### Añadido
- Estructura de documentación auditable: ADR, runbooks y checklists de operación
- Suite de validación automatizada de SEO técnico, sin dependencias externas
- Integración continua en GitHub Actions
- Datos estructurados JSON-LD: LocalBusiness, WebSite y FAQPage con cinco preguntas
- robots.txt y sitemap.xml
- Medición de clics de WhatsApp con código de atribución por campaña
- Estado de error visible cuando la API no responde
- Cabeceras de seguridad HSTS y Permissions-Policy

### Corregido
- Meta description y Open Graph duplicados y contradictorios en el head
- Title genérico y sin keyword, que además el JavaScript sobrescribía en runtime
- Ausencia de canonical, og:image y twitter:card
- Tasa de caja de compensación en el spec: 2% para independiente (afiliación
  voluntaria) y 4% para empleador, que son parámetros distintos

### Eliminado
- Popup promocional automático a los 2.5 segundos
- Modal promocional huérfano y sus listeners

## [0.1.0] - 2026-07-27

### Añadido
- Spec de posicionamiento SEO, herramientas interactivas y panel de gestión
- Plan de implementación de la Fase 0
- Documentación de arquitectura y PHVA
- Worker proxy hacia Apps Script
- Landing inicial en Cloudflare Pages
