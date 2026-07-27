# Runbook: despliegue

## Frontend (Cloudflare Pages)

Automático al hacer push a `main`. Solo se despliega el contenido de `frontend/`.

Verificación posterior:

1. Abrir https://asesoriasas.com en ventana privada
2. Confirmar que el contenido carga sin quedarse en "Cargando..."
3. Ejecutar `npm test` en local

## Worker (proxy de API)

Manual:

```bash
cd worker && npx wrangler deploy
```

Secretos requeridos: `GAS_WEBAPP_URL`, `ALLOWED_ORIGIN`.

## Backend Apps Script

Manual, mientras siga vigente (se retira en Fase 2):

```bash
cd backend && clasp push
```

## Rollback

Cloudflare Pages conserva los despliegues anteriores. Desde el panel de Cloudflare:
**Deployments** → seleccionar el despliegue estable → **Rollback to this deployment**.
