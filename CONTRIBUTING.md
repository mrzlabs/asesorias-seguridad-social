# Guía de contribución

## Convención de commits

Se usa [Conventional Commits](https://www.conventionalcommits.org/es/):

- `feat:` nueva funcionalidad
- `fix:` corrección de error
- `docs:` documentación
- `test:` pruebas
- `chore:` mantenimiento, build, dependencias
- `refactor:` cambio interno sin alterar comportamiento

El asunto va en minúscula, en presente y sin punto final.

## Antes de abrir un cambio

```bash
npm test
```

Debe pasar en verde. La CI lo ejecuta de todos modos en cada push.

## Decisiones técnicas

Toda decisión que cierre una alternativa se registra como ADR en `docs/adr/`,
numerado consecutivamente. Un ADR no se edita una vez aceptado: si cambia la
decisión, se crea uno nuevo que lo reemplaza y se marca el anterior como
"Reemplazado por ADR NNNN".

## Estructura

| Carpeta | Contenido |
|---|---|
| `frontend/` | Sitio estático desplegado en Cloudflare Pages |
| `worker/` | API en Cloudflare Workers |
| `backend/` | Apps Script (legado, se retira en Fase 2) |
| `scripts/` | Utilidades de desarrollo |
| `tests/` | Validaciones automatizadas |
| `docs/` | Especificaciones, planes, ADR y operación |
