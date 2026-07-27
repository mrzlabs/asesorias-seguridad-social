# ADR 0001 — Stack: Astro sobre Cloudflare Pages

- **Fecha:** 2026-07-27
- **Estado:** Aceptado

## Contexto

El sitio era un único `index.html` que inyectaba todo el contenido indexable por
JavaScript. Con esa base no es posible tener páginas por servicio ni por ciudad,
ni contenido que Google pueda rastrear de forma fiable.

## Decisión

Migrar el frontend a Astro, manteniendo el despliegue en Cloudflare Pages.

## Alternativas consideradas

- **Next.js sobre Vercel:** más potencia para el panel y un futuro portal de
  clientes, pero mayor complejidad operativa y costo mensual. Se descarta porque
  el portal del cliente final está fuera del alcance actual.
- **Mantener HTML plano:** más barato y rápido, pero deja el techo de
  posicionamiento donde está hoy. Se descarta.

## Consecuencias

- Todo el contenido pasa a pre-renderizarse: 100% indexable.
- Las herramientas interactivas se implementan como islas con hidratación diferida.
- Requiere un paso de build, que antes no existía.
