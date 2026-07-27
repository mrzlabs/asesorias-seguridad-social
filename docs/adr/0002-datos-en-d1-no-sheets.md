# ADR 0002 — Datos en Cloudflare D1, no en Google Sheets

- **Fecha:** 2026-07-27
- **Estado:** Aceptado

## Contexto

Google Sheets es la fuente de verdad de contenido y leads, leída vía Apps Script.
Sheets no soporta consultas relacionales, no escala para un CRM y no permite
construir un panel con embudo de conversión.

## Decisión

Migrar a Cloudflare D1 (SQLite). El Worker deja de ser proxy y pasa a exponer la
API sobre D1. Apps Script se retira tras validar la migración.

## Consecuencias

- Sheets queda como respaldo exportable, no como fuente de verdad.
- Se habilitan el CRM, el embudo de conversión y el comparador de EPS por ciudad.
- La migración de leads históricos debe validarse antes de retirar Apps Script.
