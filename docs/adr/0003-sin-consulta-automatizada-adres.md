# ADR 0003 — Sin consulta automatizada a ADRES

- **Fecha:** 2026-07-27
- **Estado:** Aceptado

## Contexto

Se requiere que el usuario pueda ver el estado de su afiliación. ADRES no expone
API pública; su consulta BDUA está protegida por CAPTCHA y la base no opera en
tiempo real (se actualiza por ciclos de varios días hábiles).

## Decisión

No se implementa scraping, consulta automatizada ni resolución de CAPTCHA contra
ADRES. Se construye un verificador asistido: validación previa del documento,
orientación sobre cómo interpretar el resultado, y enlace al portal oficial.

## Razón

Automatizar esa consulta violaría los términos del portal estatal y constituye un
riesgo legal y reputacional directo para la marca.

## Consecuencias

- El verificador capta el lead sin depender de acceso no autorizado.
- El estado real de las afiliaciones gestionadas por la empresa sí es dato propio
  y podrá exponerse en el futuro portal del cliente.
