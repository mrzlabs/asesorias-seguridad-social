# Diseño: Posicionamiento SEO, herramientas interactivas y panel de gestión

- **Fecha:** 2026-07-27
- **Proyecto:** asesorias-seguridad-social (asesoriasas.com)
- **Estado:** Aprobado — pendiente de plan de implementación

---

## 1. Contexto y estado actual

El sitio en producción es un único archivo `frontend/index.html` (209 líneas, CSS y JS embebidos)
servido por Cloudflare Pages, que consume datos de un Worker proxy hacia una Web App de Apps
Script respaldada por Google Sheets.

### Diagnóstico verificado sobre el código en producción

**Bloqueadores de indexación**

- Servicios, FAQ, testimonios, flyers y videos se inyectan por JavaScript en tiempo de ejecución
  (`render()` en `frontend/index.html`). El HTML inicial entrega esas secciones vacías.
- Dos etiquetas `<meta name="description">` con contenidos distintos y dos pares
  `og:title` / `og:description` contradictorios en el `<head>`.
- El `<title>` estático es genérico ("Seguridad Social SAS") y además el JS lo sobrescribe en
  runtime con `c.empresa_nombre`, anulando cualquier optimización.
- No existen `canonical`, `og:image`, `twitter:card`, `robots.txt`, `sitemap.xml` ni JSON-LD.
- Una sola URL compite por más de 12 servicios distintos.

**Medición**

- Solo está el beacon de Cloudflare Insights. Sin GA4, sin Search Console, sin eventos propios.
- Los clics de WhatsApp — el canal principal de conversión — no se registran en ningún sistema.
- Los parámetros UTM se capturan para el formulario pero no se propagan al mensaje de WhatsApp,
  por lo que las conversaciones no son atribuibles a campaña.

**Rendimiento y UX**

- Tres familias tipográficas con doce pesos cargadas desde CDN externo, bloqueando el render.
- Popup promocional automático a los 2.5 segundos: patrón intrusivo penalizado en móvil.
- Si el Worker falla, la página queda indefinidamente en "Cargando..." sin estado de error.
- Iconos como entidades HTML sin etiquetas accesibles; enlaces `href="#"` con `preventDefault`.

**Percepción de marca**

El tratamiento visual (gradiente azul→teal a 135°, glassmorphism en tarjetas, badge con punto
pulsante, trío de métricas "500+ / 100% / 24h", emojis como iconografía, combinación tipográfica
Outfit + DM Sans) corresponde al patrón reconocible de plantilla generada automáticamente.

### Competencia

Se revisaron siete competidores del nicho (afiliamoseps.com.co, expertosaunclic.com,
afiliacionesap.com, arsegurosyasesorias.com, empresarialglobalcolombia.co, fundagov.co,
serviestrategico). Hallazgos:

- Todos operan como embudo directo a WhatsApp.
- Ninguno publica precios.
- Casi ninguno mantiene blog o contenido informativo.
- **Ninguno ofrece herramientas interactivas.**
- La única ventaja estructural detectada (afiliamoseps) es tener páginas separadas por servicio.

El hueco competitivo está en contenido informativo y herramientas de cálculo, que es donde se
concentra el volumen de búsqueda del nicho.

---

## 2. Objetivos

1. Que el sitio pueda posicionar orgánicamente en las búsquedas transaccionales e informativas
   del nicho de seguridad social en Colombia.
2. Que existan herramientas interactivas que atraigan tráfico informativo y lo conviertan en
   leads cualificados.
3. Que el dueño del negocio pueda ver el comportamiento del sitio y gestionar leads y contenido
   desde un panel propio, sin tocar Google Sheets.
4. Que la identidad visual deje de leerse como plantilla generada.

### Criterios de éxito

| Métrica | Línea base | Objetivo a 6 meses |
|---|---|---|
| Páginas indexadas | 1 | > 60 |
| Keywords en top 10 | 0 medidas | > 15 |
| Clics de WhatsApp atribuidos | 0 (no se miden) | 100% trazables |
| Leads/mes registrados con origen | Parcial (solo formulario) | 100% con origen y campaña |
| LCP móvil | Sin medir | < 2.5 s |
| Contenido indexable en HTML inicial | ~30% | 100% |

---

## 3. Alcance

**Incluido**

- Migración del frontend a Astro sobre Cloudflare Pages.
- Sistema de diseño nuevo y rediseño completo de la interfaz.
- Arquitectura de información multipágina con landings programáticas.
- Cuatro herramientas interactivas.
- Migración de datos de Google Sheets a Cloudflare D1.
- Panel de administración con CRM, CMS, métricas SEO y embudo.
- Instrumentación completa de medición.

**Excluido**

- Portal de autogestión para clientes finales (proyecto separado y posterior).
- Integración con operadores PILA o entidades agrupadoras (proyecto separado).
- Facturación, pagos en línea o pasarela.
- Aplicación móvil.
- Cualquier consulta automatizada contra ADRES (ver restricción legal en §12).

---

## 4. Decisiones tomadas

| Decisión | Elección | Razón |
|---|---|---|
| Stack frontend | Astro + Cloudflare Pages | HTML pre-renderizado real, islas interactivas, sin costo mensual adicional |
| Base de datos | Cloudflare D1 | Misma plataforma, sin servidor que administrar, SQL real |
| Autenticación del panel | Cloudflare Access | Cero código de auth propio que mantener y auditar |
| Backend | Cloudflare Worker (API sobre D1) | Se retira Apps Script |
| Estrategia de precios | Aporte de ley público + honorario "desde" | Ver §11 |
| Consulta ADRES | Verificador asistido con deep link | Ver §12 |

---

## 5. Arquitectura de información

```
/                                    Home
/servicios/                          Hub de servicios
/servicios/[servicio]/               ~10 páginas de servicio
/[servicio]/[ciudad]/                Landings programáticas servicio × ciudad
/herramientas/                       Hub de herramientas
/herramientas/calculadora-aportes/   Calculadora + cotizador (dos tiempos)
/herramientas/consultar-eps/         Verificador asistido
/eps/                                Hub del comparador
/eps/[eps]/[ciudad]/                 Comparador programático
/blog/                               Índice
/blog/[slug]/                        Artículos
/nosotros/
/contacto/
/politica-de-privacidad/
/terminos-y-condiciones/
```

### Servicios iniciales

`afiliacion-eps`, `afiliacion-arl`, `afiliacion-pension`, `caja-de-compensacion`, `traslado-eps`,
`traslado-pension`, `afiliacion-empresas`, `polizas-y-seguros`, `medicina-prepagada-y-pac`, `soat`.

### Regla de las landings programáticas

Diez servicios por quince ciudades produce 150 páginas. Generadas como plantilla con la ciudad
sustituida, Google las clasifica como *doorway pages* y penaliza el dominio completo. Reglas
obligatorias:

1. Solo se publican ciudades con dato diferenciador real: EPS efectivamente disponibles en esa
   ciudad, sedes de atención, tiempos de radicación locales, particularidades del régimen.
2. Mínimo 400 palabras de contenido único por página, no plantilla rellenada.
3. Lanzamiento por olas: cinco ciudades primero, medir tres semanas en Search Console, expandir
   solo si el rendimiento lo justifica.
4. Cada landing lleva `canonical` propio y entra al `sitemap.xml` solo tras cumplir 1 y 2.

Ciudades de la primera ola: Bogotá, Medellín, Cali, Barranquilla, Bucaramanga.

---

## 6. Sistema de diseño

### Se elimina

Gradiente azul→teal a 135°; glassmorphism en tarjetas; badge con punto pulsante; trío de métricas
redondas "500+ / 100% / 24h"; emojis y entidades HTML como iconografía; popup automático a los
2.5 segundos; la secuencia de bloques hero → 3 tarjetas → 4 pasos → testimonios → FAQ → formulario.

### Se construye

**Tipografía.** Dos familias como máximo, alojadas en el propio dominio, con subset latino y
`font-display: swap`. Una display de peso institucional para titulares y una sans neutra de alta
legibilidad para texto corrido. Presupuesto: máximo cuatro archivos de fuente en total.

**Color.** Paleta construida sobre un neutro cálido de base más un único acento saturado. Se
abandona el azul corporativo con acento teal por ser el uniforme visual de todo el sector.
Contraste mínimo AA (4.5:1) para texto y 3:1 para elementos de interfaz.

**Iconografía.** Set SVG único y consistente, grosor de trazo uniforme, con `aria-hidden` cuando
son decorativos y `aria-label` cuando son el único contenido de un control.

**Fotografía.** Fotografía propia del equipo, la oficina y el proceso real de trabajo. Es el
diferenciador anti-plantilla de mayor impacto y ningún competidor del nicho lo tiene. Sin banco
de imágenes genérico.

**Layout.** Retícula asimétrica, con jerarquía construida por escala y espacio en lugar de por
tarjetas uniformes. Densidad de información real: tablas de aportes, cifras concretas, plazos.

**Movimiento.** Solo transiciones de estado funcionales. Ninguna animación decorativa. Se respeta
`prefers-reduced-motion`.

### Accesibilidad

Nivel objetivo WCAG 2.1 AA. Foco visible en todos los controles, navegación completa por teclado,
formularios con etiquetas asociadas y errores anunciados, jerarquía de encabezados correcta.

---

## 7. Herramientas interactivas

Las cuatro se implementan como islas Astro con hidratación diferida (`client:visible`).

### 7.1 Calculadora de aportes / IBC — con cotizador integrado

Es una sola herramienta en dos tiempos, no dos herramientas.

**Tiempo 1 — abierto, sin pedir datos de contacto.**

Entradas: tipo de vinculación (independiente por cuenta propia / contratista por prestación de
servicios / empleador), ingreso mensual bruto, clase de riesgo ARL (I a V), inclusión voluntaria
de caja de compensación.

Salidas: IBC calculado, aporte a salud, aporte a pensión, aporte a ARL, aporte a CCF, fondo de
solidaridad pensional cuando aplique, y total mensual. Desglosado línea por línea.

**Todos los parámetros de cálculo viven en la tabla `parametros` de la base de datos y son
editables desde el panel. Ninguno se escribe en el código.** Los valores cambian cada enero con el
SMLMV y con reformas normativas; hardcodearlos garantiza que la herramienta mienta al año
siguiente. Valores iniciales a cargar y verificar contra normativa vigente antes de publicar:

| Parámetro | Valor inicial |
|---|---|
| `smlmv` | Valor vigente del año en curso |
| `ibc_porcentaje_contratista` | 40% de ingresos brutos |
| `ibc_minimo_smlmv` | 1 |
| `ibc_maximo_smlmv` | 25 |
| `tasa_salud` | 12.5% |
| `tasa_pension` | 16% |
| `tasa_ccf` | 4% |
| `arl_clase_1` … `arl_clase_5` | Tarifas por clase de riesgo vigentes |
| `fsp_umbral_smlmv` / `fsp_tasas` | Umbral y escala del Fondo de Solidaridad Pensional |

Cada resultado se acompaña de aviso de estimación: el cálculo es orientativo y el valor definitivo
depende de la validación de cada entidad.

**Tiempo 2 — el corte natural hacia la cotización.**

El resultado termina en las preguntas que el cálculo no puede responder por sí solo: qué EPS
conviene según el perfil, qué ocurre ante mora, y cuánto cuesta que la empresa gestione el trámite
y qué incluye. Ahí se solicita el contacto a cambio de cotización personalizada.

El intercambio es legítimo porque el usuario ya recibió valor completo y verificable antes de que
se le pida nada. No hay muro sobre el Tiempo 1.

El lead resultante llega al panel **con el cálculo adjunto**: ingresos declarados, tipo de
vinculación, servicios de interés, ciudad y total estimado. Es un lead cualificado.

### 7.2 Verificador de afiliación asistido

Tres pasos:

1. Validación de formato del documento (tipo y número) del lado del cliente.
2. Captura de contacto.
3. Instrucciones de cómo leer el resultado (regímenes, estados posibles, qué significa cada uno) y
   botón que abre el portal oficial de ADRES en pestaña nueva.

No consulta ADRES de forma automatizada. Ver restricción en §12.

Objetivo SEO: capturar la búsqueda "consultar EPS por cédula" y variantes, que tienen volumen alto
y hoy están servidas por sitios agregadores de baja calidad.

### 7.3 Cotizador

Integrado como Tiempo 2 de la calculadora (§7.1). Wizard de tres pasos que arma el paquete de
servicios, muestra el honorario "desde" aplicable y precarga el resumen completo en el mensaje de
WhatsApp o en el envío del formulario.

### 7.4 Comparador de EPS por ciudad

Datos en tablas `eps` y `eps_ciudad`, editables desde el panel. Genera páginas estáticas en tiempo
de build. Compara cobertura, red de atención y particularidades por ciudad y régimen.

Requiere mantenimiento periódico de datos; se define revisión trimestral como parte de la
operación, no como tarea de desarrollo.

---

## 8. Modelo de datos

Cloudflare D1 (SQLite). Tablas:

| Tabla | Propósito |
|---|---|
| `leads` | Datos de contacto, origen, campaña, servicio de interés, ciudad, estado, notas |
| `lead_events` | Eventos por lead: clic WhatsApp, uso de herramienta, envío de formulario, cambio de estado |
| `servicios` | Nombre, slug, descripción, contenido, honorario "desde", orden, activo |
| `ciudades` | Nombre, slug, departamento, datos diferenciadores, publicada |
| `eps` | Catálogo de EPS |
| `eps_ciudad` | Relación EPS × ciudad con cobertura y red de atención |
| `faq` | Pregunta, respuesta, servicio asociado, orden, activo |
| `testimonios` | Nombre, ciudad, texto, calificación, activo |
| `promos` | Título, imagen, descripción, vigencia, activo |
| `parametros` | Clave/valor tipado para SMLMV, tasas, topes, honorarios "desde" |
| `usuarios` | Identidad y rol (autenticación delegada a Cloudflare Access) |

### Migración

Script de importación de un solo uso que lee las hojas actuales (Config, Servicios, Flyers, Videos,
Testimonios, FAQ, Leads) y las carga en D1. Google Sheets queda como respaldo exportable, no como
fuente de verdad. Apps Script se retira una vez validada la migración.

El Worker deja de ser proxy y pasa a exponer la API real sobre D1.

---

## 9. Medición

Es la pieza que hoy no existe y sin la cual el panel no tiene qué mostrar.

**Clics de WhatsApp.** Cada clic genera un registro en `lead_events` con servicio, página de
origen, UTM completo y un código corto que se inserta en el mensaje precargado, de modo que la
conversación entrante sea atribuible al canal que la originó. Hoy este canal —el principal— es
completamente ciego.

**Eventos propios.** Se registran en D1 desde el Worker, no solo en GA4. Los bloqueadores de
anuncios eliminan una fracción significativa del tráfico móvil de las herramientas de terceros; el
dato propio no depende de eso.

**GA4.** Se instala para análisis de audiencia y comportamiento, como complemento y no como fuente
única.

**Search Console.** Se conecta vía API para alimentar el panel con impresiones, clics, CTR y
posición por keyword y por página.

**Embudo completo:** visita → herramienta usada → clic WhatsApp o envío de formulario → estado en
CRM → cerrado. Segmentable por servicio, ciudad y campaña.

---

## 10. Panel de administración

Ruta `/admin`, protegida con Cloudflare Access. No se implementa autenticación propia.

| Vista | Contenido |
|---|---|
| Dashboard | Embudo completo, KPIs del mes, comparativa contra mes anterior, separando orgánico de pago |
| Leads | Tabla filtrable, detalle, estados (nuevo / contactado / cotizado / cerrado / perdido), notas, origen y cálculo adjunto |
| Contenido | Servicios, honorarios "desde", FAQ, testimonios, promociones, ciudades, EPS |
| SEO | Keywords, posiciones, evolución, páginas top, impresiones y clics desde Search Console |
| Parámetros | SMLMV, tasas, topes y demás valores de la calculadora |

Publicar contenido dispara el rebuild del sitio mediante deploy hook de Cloudflare Pages.

La separación entre resultados orgánicos y de pago en el dashboard es un requisito explícito: el
SEO orgánico en este nicho madura entre tres y seis meses, y mezclarlo con el tráfico pagado hace
parecer que no funciona cuando apenas está arrancando.

---

## 11. Estrategia de precios

Se publican **dos números distintos con tratamiento distinto**.

**El aporte de ley es público y completo.** Los porcentajes y bases de cotización son información
normativa, no el precio de la empresa. Publicarlos de forma transparente y calculable no expone
nada comercialmente y es exactamente lo que la gente busca en Google. Este es el contenido que
posiciona.

**El honorario de gestión se publica como "desde $X".** La tabla comercial completa permanece
privada.

El efecto de anclaje favorece esta estructura: junto a un aporte de ley de varios cientos de miles
de pesos mensuales, un honorario "desde" de decenas de miles se percibe pequeño. Publicado de forma
aislada, el mismo número se percibiría caro.

**Regla de honestidad, obligatoria:** el valor "desde" debe corresponder a un precio que al menos
una quinta parte de los clientes efectivamente paga. Un "desde" inalcanzable genera reclamos y
reseñas negativas, que sí afectan el posicionamiento local de forma directa y duradera.

Marcado estructurado: `Offer` con `priceSpecification` y `minPrice`, que habilita la aparición del
rango en resultados enriquecidos.

---

## 12. Restricción legal: ADRES

**ADRES no expone API pública.** La consulta de afiliación (BDUA) en el portal oficial está
protegida por CAPTCHA, y la base no opera en tiempo real: se actualiza por ciclos de reporte de
varios días hábiles.

En consecuencia, este diseño **no contempla consulta automatizada, scraping ni resolución de
CAPTCHA contra ADRES**. Hacerlo violaría los términos del portal estatal y constituiría un riesgo
legal y reputacional directo para la marca.

El verificador asistido (§7.2) resuelve la necesidad del usuario por la vía legítima: validación
previa, orientación sobre cómo interpretar el resultado, y deep link al portal oficial. Captura el
lead sin depender de acceso no autorizado.

El estado real de las afiliaciones **gestionadas por la empresa** sí es dato propio y podrá
exponerse en el futuro portal del cliente, que queda fuera del alcance de este proyecto.

---

## 13. SEO técnico

- Todo el contenido indexable se pre-renderiza en HTML. Ninguna sección depende de JS para existir.
- Un solo `<title>` y una sola `<meta name="description">` por página, únicos y con keyword.
  El JS no vuelve a sobrescribir el título.
- `canonical`, `og:image`, `twitter:card` en todas las páginas.
- JSON-LD: `Organization` y `LocalBusiness` en home, `Service` con `Offer` en páginas de servicio,
  `FAQPage` donde haya FAQ, `BreadcrumbList` en toda página interna, `Article` en blog.
- `sitemap.xml` y `robots.txt` generados en build.
- Fuentes propias, sin CDN externo bloqueante. Objetivo LCP móvil por debajo de 2.5 s.
- Cabeceras de seguridad y caché en `frontend/_headers`: se añaden CSP y HSTS, y caché inmutable
  para assets con hash.
- Google Business Profile configurado y verificado como parte de la Fase 0.

---

## 14. Fases

| Fase | Contenido | Duración |
|---|---|---|
| **0** | Correcciones sobre el sitio actual: meta tags duplicados, canonical, JSON-LD, sitemap, robots, GA4, eventos de WhatsApp, Search Console, Google Business Profile | Semana 1 |
| **1** | Migración a Astro, sistema de diseño, páginas por servicio | Semanas 2–4 |
| **2** | D1, migración de datos, panel (CRM + CMS) | Semanas 4–6 |
| **3** | Calculadora con cotizador, verificador asistido | Semanas 6–8 |
| **4** | Landings por ciudad (primera ola), comparador de EPS, blog | Semanas 8–10 |

La Fase 0 se ejecuta sobre el sitio actual sin esperar a la migración. Es la que produce resultado
visible en semanas: Google Business Profile bien configurado puede generar llamadas en quince días,
y corregir los meta tags duplicados es trabajo de horas. Además empieza a acumular datos de
medición mientras se construye el resto.

---

## 15. Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Landings programáticas leídas como doorway pages | Penalización de todo el dominio | Reglas de §5: dato único real, mínimo de contenido, lanzamiento por olas |
| Parámetros de cálculo desactualizados | La calculadora entrega valores falsos | Todos en `parametros`, editables desde el panel, revisión obligatoria cada enero |
| Datos de EPS por ciudad desactualizados | Pérdida de credibilidad | Revisión trimestral asignada a operación |
| "Desde" percibido como engañoso | Reseñas negativas, daño a SEO local | Regla de honestidad de §11 |
| Expectativa de resultados inmediatos en orgánico | Percepción de fracaso | Separación explícita orgánico/pago en el dashboard |
| Pérdida de datos en la migración desde Sheets | Pérdida de histórico de leads | Sheets se conserva como respaldo; migración validada antes de retirar Apps Script |

---

## 16. Fuera de alcance, para proyectos posteriores

1. **Portal del cliente final**: consulta del estado de sus afiliaciones gestionadas, descarga de
   soportes, radicados.
2. **Integraciones con entidades**: operadores PILA, agrupadoras autorizadas.
3. **Automatización de contenido**: generación asistida de artículos de blog desde el panel.
4. **WhatsApp Business API**: conversaciones dentro del CRM en lugar de la app.
