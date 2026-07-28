# Runbook: puesta en marcha del panel

Estos pasos requieren la cuenta de Cloudflare y solo puede ejecutarlos quien
tenga acceso a ella. Una vez hechos, el resto del panel se despliega con un push.

## 1. Autenticar wrangler

```bash
cd worker
npx wrangler login
```

Abre el navegador y pide autorización. Es de un solo uso por equipo.

## 2. Crear la base de datos

```bash
npx wrangler d1 create asesorias-db
```

Devuelve un bloque de configuración con un `database_id`. **Cópialo**, hace falta
en el paso siguiente.

## 3. Registrar la base en el Worker

Añadir al final de `worker/wrangler.toml`, sustituyendo el identificador por el
que devolvió el comando anterior:

```toml
[[d1_databases]]
binding = "DB"
database_name = "asesorias-db"
database_id = "AQUI-EL-ID-DEVUELTO"
```

## 4. Aplicar el esquema

```bash
npx wrangler d1 execute asesorias-db --remote --file=esquema.sql
```

Verificar que se crearon las tablas:

```bash
npx wrangler d1 execute asesorias-db --remote --command "SELECT name FROM sqlite_master WHERE type='table'"
```

Deben aparecer: `leads`, `eventos`, `servicios`, `faq`, `testimonios`,
`promociones`, `parametros`, `auditoria`.

## 5. Migrar los datos existentes

```bash
node ../scripts/migrar-a-d1.js
```

Lee la hoja de cálculo actual y genera las sentencias de inserción. **Revisa el
archivo generado antes de aplicarlo**: es la única oportunidad de detectar un
dato mal mapeado antes de que entre.

## 6. Proteger el panel

En el panel de Cloudflare: **Zero Trust → Access → Applications → Add an
application → Self-hosted**.

| Campo | Valor |
|---|---|
| Application name | Panel Asesorías |
| Session duration | 24 horas |
| Subdomain / path | `asesoriasas.com/admin` |

En **Policies**, crear una con acción *Allow* y regla *Emails* incluyendo los
correos que deben tener acceso.

**Sin este paso el panel queda público.** No se despliega el panel hasta que la
política esté activa y verificada abriendo `/admin` en una ventana privada.

## 7. Retirar Apps Script

Solo después de que el panel lleve una semana estable y se haya verificado que
todos los leads históricos están en D1.

La hoja de cálculo se conserva como respaldo exportable, no como fuente.

## Verificación

- [ ] `wrangler d1 execute` lista las ocho tablas
- [ ] El conteo de leads en D1 coincide con el de la hoja
- [ ] Abrir `/admin` en ventana privada exige autenticación
- [ ] Un lead nuevo enviado desde el sitio aparece en D1
- [ ] Un clic de WhatsApp genera una fila en `eventos`
