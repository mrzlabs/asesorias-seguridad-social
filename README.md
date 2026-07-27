# Asesorías Seguridad Social SAS

Sitio y plataforma de gestión de [asesoriasas.com](https://asesoriasas.com).
Afiliaciones a EPS, ARL, pensión y caja de compensación en Colombia.

## Estado

En migración. El sitio en producción es HTML estático; se está migrando a Astro
con base de datos propia y panel de gestión.
Ver [el spec de diseño](docs/superpowers/specs/2026-07-27-posicionamiento-y-panel-design.md).

## Arquitectura

```
Usuario -> Cloudflare Pages (frontend/)
                |
                v
        Cloudflare Worker (worker/)
                |
                v
        Apps Script -> Google Sheets   [legado, se retira en Fase 2]
```

Detalle en [docs/arquitectura.md](docs/arquitectura.md).

## Estructura

| Carpeta | Contenido |
|---|---|
| `frontend/` | Sitio estático desplegado en Cloudflare Pages |
| `worker/` | API en Cloudflare Workers |
| `backend/` | Apps Script (legado) |
| `scripts/` | Utilidades de desarrollo |
| `tests/` | Validaciones automatizadas |
| `docs/adr/` | Decisiones técnicas y por qué se tomaron |
| `docs/operacion/` | Runbooks y checklists del negocio |
| `docs/superpowers/` | Especificaciones y planes de implementación |

## Desarrollo

Requiere Node.js 20 o superior.

```bash
npm test      # Validaciones de SEO técnico
npm run mock  # Servidor de datos simulado en localhost:3001
```

Con el mock corriendo, abrir `frontend/index.html` desde `localhost` para que use
la API local en vez de la de producción.

## Despliegue

`frontend/` se despliega solo al hacer push a `main`. El Worker y Apps Script son
manuales. Procedimiento completo y rollback en
[docs/operacion/runbook-despliegue.md](docs/operacion/runbook-despliegue.md).

## Documentación

| Documento | Contenido |
|---|---|
| [Arquitectura](docs/arquitectura.md) | Capas, componentes y flujo de despliegue |
| [Esquema de Sheets](docs/sheets-schema.md) | Hojas de cálculo (legado) |
| [PHVA técnica](docs/PHVA-tecnica.md) | Ciclo de mejora técnica |
| [PHVA negocio](docs/PHVA-doomies.md) | Ciclo de mejora en lenguaje de negocio |
| [CONTRIBUTING](CONTRIBUTING.md) | Convenciones de commit y de ADR |
| [CHANGELOG](CHANGELOG.md) | Historial de cambios |

## Licencia

MIT
