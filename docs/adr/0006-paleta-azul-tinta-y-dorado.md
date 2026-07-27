# ADR 0006 — Paleta: azul tinta y dorado sello

- **Fecha:** 2026-07-27
- **Estado:** Aceptado

## Contexto

La paleta anterior (azul medio `#0F4C81` con acento verde-agua `#00B894`, gradiente
a 135° y botones en píldora) es la combinación que repiten los siete competidores
analizados. Mientras se conserve, la marca se lee como una más del sector y como
plantilla generada.

Existe preferencia del negocio por mantener el azul, y hay material impreso que
conviene no invalidar.

## Decisión

Se conserva el azul, pero se desplaza a **azul tinta profundo**, y se sustituye el
acento frío por un **dorado sello** cálido sobre fondo **papel hueso**.

| Rol | Valor |
|---|---|
| Fondo oscuro / marca | `#0B2545` azul tinta |
| Azul intermedio | `#1B3B6F` |
| Acento | `#C9A227` dorado sello |
| Acento sobre oscuro | `#D9B449` |
| Fondo claro | `#F5F1E8` papel hueso |
| Texto principal | `#16181C` tinta |
| Texto secundario | `#55595F` |

## Razón

- El azul tinta lee como más institucional y serio que el azul medio brillante, lo
  que favorece a un negocio que se vende sobre confianza.
- El dorado tiene asociación con sello, timbre y respaldo oficial: coherente con
  la gestión de trámites. Ningún competidor del sector lo usa.
- Se descartó el ámbar naranja por decisión del negocio y porque además era el
  candidato de **peor contraste** (4.2:1 frente a 5.8:1 del dorado).
- Se descartaron el azul cielo (poco memorable) y el verde salvia (devuelve al
  territorio cromático de la competencia).

## Contraste verificado

| Combinación | Ratio | Nivel |
|---|---|---|
| Tinta sobre papel hueso | 16.2:1 | AAA |
| Papel hueso sobre azul tinta | 12.7:1 | AAA |
| Dorado sobre azul tinta | 5.8:1 | AA |

## Consecuencias

- El material impreso existente en azul convive razonablemente: sigue siendo azul,
  solo más profundo.
- Se elimina el gradiente a 135° y las esquinas en píldora (radio 50px pasa a 3px):
  forman parte del mismo vocabulario visual que se está retirando.
- Reemplaza los tokens de color propuestos en el plan de la Fase 1.
