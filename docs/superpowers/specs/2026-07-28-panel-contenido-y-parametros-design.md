# Diseño: Panel de contenido + parámetros y cutover de lectura a D1 (Fase 2, segundo slice)

- **Fecha:** 2026-07-28
- **Proyecto:** asesorias-seguridad-social (asesoriasas.com)
- **Estado:** Aprobado — pendiente de plan de implementación
- **Diseño padre:** [posicionamiento-y-panel-design](2026-07-27-posicionamiento-y-panel-design.md) §8, §10
- **Slice previo:** [crm-leads-vertical-slice](2026-07-28-crm-leads-vertical-slice-design.md)

---

## 1. Contexto

El slice de leads dejó el Worker escribiendo en D1 y un panel en `/admin/leads`.
Ahora el contenido del sitio (servicios, FAQ, testimonios, promociones) y los
parámetros de cálculo siguen viviendo en Google Sheets: el Worker proxea
`getAllData` hacia Apps Script y el **build estático** de Astro hornea ese
contenido. Editar en un panel no sirve de nada si el sitio no lee de D1.

**Hecho verificado:** todo el contenido y los parámetros se consumen en el
frontmatter de los `.astro` (build time), incluida la calculadora
(`calculadora-aportes.astro:9`). Un cambio en D1 **solo se refleja tras
reconstruir el sitio**.

## 2. Objetivo

Que el dueño edite contenido y parámetros desde el panel, que esos datos vivan
en D1, que el sitio los lea de D1, y que un botón "Publicar" reconstruya el sitio.
Resuelve de raíz el problema del SMLMV: se cambia en el panel, se publica, y el
sitio se reconstruye sin tocar código.

## 3. Forma exacta de `getAllData` (contrato con el sitio)

El sitio consume (verificado en `site/src/datos/` y componentes):

```jsonc
{
  "config":      { "<clave>": "<valor>", ... },   // ajustes del sitio + params de calculo
  "servicios":   [ { slug, nombre, descripcion_corta, descripcion_larga, icono,
                     categoria, honorario_desde, orden, activo }, ... ],
  "flyers":      [ { titulo, descripcion, vigente_hasta, orden, activo }, ... ], // ← tabla promociones
  "testimonios": [ { nombre, cargo_o_ciudad, testimonio, calificacion, activo }, ... ],
  "faq":         [ { pregunta, respuesta, categoria, orden, activo }, ... ]
}
```

Notas de contrato:
- `flyers` lo pinta la portada (`index.astro:13`, componente `Promociones.astro`,
  usa `f.titulo` y `f.activo`). **La tabla D1 `promociones` alimenta la clave
  `flyers`.**
- `videos` y `config.mantenimiento` **no los usa el sitio** → se omiten.
- `config` se arma desde la tabla `parametros` (clave/valor). Incluye ajustes del
  sitio (empresa_nombre, whatsapp_numero, email_contacto, …) y los parámetros de
  cálculo (smlmv, tasa_salud, …). La calculadora ya lee sus params desde
  `config[clave]` vía `obtenerParametros`, así que basta con que `parametros`
  contenga `smlmv` y las tasas.
- `activo` en D1 es INTEGER 0/1; el sitio filtra por verdad (`s.activo`), así que
  1/0 funciona. Los ejecutores devuelven solo filas con `activo = 1`.

## 4. Decisiones tomadas

| Decisión | Elección | Razón |
|---|---|---|
| Cutover de lectura | **Directo a D1** | El usuario lo eligió. `getAllData` lee solo de D1 tras sembrar y verificar. Se retira Apps Script como lectura. |
| Almacén de config+params | Tabla `parametros` (clave/valor/tipo) | Ya existe; unifica ajustes del sitio y params de cálculo, igual que la hoja Config hoy. |
| Promociones → sitio | Tabla `promociones` alimenta la clave `flyers` | Es lo que la portada consume. |
| Reflejar cambios | Botón "Publicar" → **deploy hook de Pages** | El sitio es estático; hay que reconstruir. El hook lo crea el dueño (como Access). |
| Siembra | Desde el `getAllData` **actual** (hoja) vía la API en vivo | El contenido real ya está expuesto; no hay export manual. Genera SQL para revisar antes de aplicar. |
| Tipos en `parametros` | `valor` TEXT; el sitio castea donde hace falta | whatsapp/emails se usan como string; la calculadora hace `Number(valor)`. |

## 5. Componentes

### 5.1 Siembra de D1 (`scripts/sembrar-contenido-d1.js`)
Lee `GET /api/getAllData` (aún desde la hoja), transforma y **emite
`worker/siembra-contenido.sql`** con INSERTs para `servicios`, `faq`,
`testimonios`, `promociones` y `parametros` (una fila por clave de `config` +
las claves de cálculo con sus valores por defecto verificados: smlmv 1750905,
tasas, topes, auxilio_transporte). El SQL se **revisa** y luego se aplica con
`wrangler d1 execute --remote --file`.

### 5.2 Worker — `getAllData` desde D1 (`worker/src/contenido.js` + `index.js`)
`contenido.js` expone `getAllDataDesdeD1(db)` que arma el objeto del §3 con
consultas a D1. `index.js` reemplaza el proxy: `GET /api/getAllData` llama a
`getAllDataDesdeD1`, cachea 5 min como hoy, y devuelve el JSON. Ante error o
contenido vacío, responde 500 (el build del sitio debe fallar antes que publicar
un sitio vacío — comportamiento deliberado ya existente).

### 5.3 Worker — API admin de contenido y parámetros (`worker/src/contenido.js`)
Con el mismo Bearer token y auditoría del slice de leads. Recursos:
`servicios`, `faq`, `testimonios`, `promociones`, `parametros`. Por recurso:
- `GET /api/admin/<recurso>` — lista (incluye inactivos, para gestión).
- `POST /api/admin/<recurso>` — crea.
- `PATCH /api/admin/<recurso>/:id` — edita (o `:clave` para parametros).
- `DELETE /api/admin/<recurso>/:id` — elimina (o marca inactivo en servicios).
Cada mutación escribe una fila en `auditoria`.

### 5.4 Worker — publicar (`POST /api/admin/publicar`)
Con Bearer token, dispara el deploy hook: `fetch(env.DEPLOY_HOOK_URL, {method:'POST'})`.
Devuelve el resultado. `DEPLOY_HOOK_URL` es secreto de wrangler.

### 5.5 Panel — vistas de gestión (`site/src/pages/admin/`)
Nuevas páginas hermanas de `leads.astro`, reutilizando el gate y el estilo:
- `/admin/contenido` — pestañas o secciones para servicios, FAQ, testimonios,
  promociones: tabla + formulario de alta/edición + activar/desactivar.
- `/admin/parametros` — tabla editable de clave/valor (SMLMV, tasas, topes,
  ajustes del sitio) con `tipo` visible.
- Barra común con botón **Publicar** que llama a `/api/admin/publicar` y avisa
  que la reconstrucción tarda ~1–2 min.
- Un índice `/admin/` con enlaces a Leads, Contenido y Parámetros.

## 6. Orden de ejecución y gate de seguridad

El cutover es la única pieza que puede romper el sitio, así que:

1. Sembrar D1 (revisar SQL, aplicar) y **verificar** que las tablas tienen el
   contenido esperado.
2. Implementar `getAllDataDesdeD1` y verificar **localmente** (D1 local + Worker
   local) que su JSON iguala en forma al `getAllData` actual, y que **un build
   local del sitio apuntado al Worker local termina sin errores**.
3. Solo entonces desplegar el Worker con el cutover.
4. Confirmar en producción que `getAllData` responde desde D1 y que el sitio se
   reconstruye bien (deploy hook).

## 7. Configuración

- `DEPLOY_HOOK_URL` — secreto del Worker (lo crea el dueño en Pages → Settings →
  Builds & deployments → Deploy hooks, y me pasa la URL).
- Binding `DB`, `ADMIN_TOKEN` — ya existen.

## 8. Riesgos

| Riesgo | Mitigación |
|---|---|
| Cutover con siembra incompleta rompe el build | Gate §6: verificar build local antes de desplegar. Pages conserva el último despliegue bueno si el nuevo build falla. |
| Tipos (número vs string) cambian comportamiento | `config` se usa en contextos string; la calculadora castea. Sembrar valores tal como los devuelve la hoja. |
| Deploy hook expuesto | Se llama solo desde `/api/admin/publicar` con Bearer token; nunca va al cliente. |
| Edición concurrenta | Fuera de alcance de este slice (un solo operador). |

## 9. Fuera de alcance

Ciudades y EPS (comparador, Fase 4), panel de SEO/Search Console, dashboard de
embudo, y el retiro definitivo de Apps Script como **escritura** de leads
(sigue la doble escritura hasta validar una semana).
