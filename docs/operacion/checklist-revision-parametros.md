# Checklist: revisión anual de parámetros

**Frecuencia:** cada enero, al publicarse el nuevo SMLMV.
**Responsable:** operación (no desarrollo).

Los parámetros viven en la tabla `parametros` y se editan desde el panel. Ninguno
está escrito en el código.

- [ ] Actualizar `smlmv` al valor vigente del año
- [ ] Verificar `tasa_salud` (12.5%) contra normativa vigente
- [ ] Verificar `tasa_pension` (16%) contra normativa vigente
- [ ] Verificar `tasa_ccf_independiente` (2%, afiliación voluntaria)
- [ ] Verificar `tasa_ccf_empleador` (4%, sobre nómina)
- [ ] Verificar tarifas `arl_clase_1` a `arl_clase_5`
- [ ] Verificar umbral y escala del Fondo de Solidaridad Pensional
- [ ] Verificar `ibc_porcentaje_contratista` (40%) y topes (1 a 25 SMLMV)
- [ ] Recalcular un caso conocido a mano y comparar con la calculadora
- [ ] Revisar que los honorarios "desde" sigan cumpliendo la regla del ADR 0004

**Riesgo si se omite:** la calculadora entrega valores falsos a los usuarios
durante todo el año.
