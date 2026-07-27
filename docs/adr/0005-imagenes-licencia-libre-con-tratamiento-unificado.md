# ADR 0005 — Imágenes de licencia libre con tratamiento unificado

- **Fecha:** 2026-07-27
- **Estado:** Aceptado

## Contexto

El sistema de diseño necesita imágenes que generen pertenencia y sensación de
autogestión. No existe fotografía propia y no se puede producir a corto plazo.

Del análisis de competencia: ninguno de los siete competidores tiene fotografía
propia. AR Seguros no usa fotografía en absoluto (iconos y emojis). Expertos a un
Clic usa banco de imágenes genérico. El diferenciador sigue disponible.

## Decisión

Se usan imágenes de **bancos de licencia libre para uso comercial** (Unsplash,
Pexels) como material provisional, sujetas a tres reglas:

1. **Criterio de selección: oficios reales, no ejecutivos.** Conductores,
   comerciantes, estilistas, contratistas, personas gestionando trámites desde el
   celular. Contexto latinoamericano. Se prohíben reuniones corporativas, personas
   sonriendo a cámara con portátil y apretones de manos: es el repertorio que
   identifica una plantilla a simple vista.
2. **Tratamiento unificado.** Todas las imágenes reciben el mismo tratamiento
   (duotono sobre el azul de marca, mismo contraste y grano) aplicado **por CSS,
   nunca incrustado en el archivo**. Imágenes de orígenes distintos con tratamiento
   idéntico se leen como una sola dirección de arte.
3. **Encuadres de detalle sobre retratos.** Manos, documentos, un celular con la
   planilla. Envejecen mejor y se sustituyen sin tocar el maquetado.

Las imágenes se alojan en el propio dominio. No se enlaza en caliente a servidores
de terceros.

## Alternativas descartadas

- **Tomar imágenes de la web sin licencia:** infracción de derechos de autor.
  Riesgo legal y, si aparece personal de otra empresa, daño directo a la
  credibilidad en un negocio que se vende sobre confianza.
- **No usar fotografía:** viable, pero renuncia a la pertenencia que se busca.

## Consecuencias

- Las imágenes ocupan slots definidos en los componentes. Reemplazar el archivo
  basta para heredar el tratamiento: cero retrabajo cuando llegue material propio.
- Se registra la procedencia y licencia de cada imagen en `frontend/src/assets/
  imagenes/CREDITOS.md`, para poder auditar el origen más adelante.
- Material propio prioritario cuando esté disponible: capturas de soportes reales
  con datos tapados (certificados, planillas, radicados). Costo cero, imposibles
  de replicar por la competencia y ningún competidor las muestra.
