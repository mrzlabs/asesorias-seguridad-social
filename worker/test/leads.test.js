import { test } from 'node:test';
import assert from 'node:assert/strict';
import { construirFiltroLeads, diffAuditoria, ESTADOS } from '../src/leads.js';

test('sin filtros: WHERE vacio y sin binds', () => {
  const { where, binds } = construirFiltroLeads({});
  assert.equal(where, '');
  assert.deepEqual(binds, []);
});

test('filtra por estado valido', () => {
  const { where, binds } = construirFiltroLeads({ estado: 'nuevo' });
  assert.match(where, /estado = \?/);
  assert.deepEqual(binds, ['nuevo']);
});

test('ignora estado invalido', () => {
  const { where, binds } = construirFiltroLeads({ estado: 'inventado' });
  assert.equal(where, '');
  assert.deepEqual(binds, []);
});

test('busqueda q cubre nombre, telefono y email', () => {
  const { where, binds } = construirFiltroLeads({ q: 'ana' });
  assert.match(where, /nombre LIKE \? OR telefono LIKE \? OR email LIKE \?/);
  assert.deepEqual(binds, ['%ana%', '%ana%', '%ana%']);
});

test('combina filtros con AND', () => {
  const { where, binds } = construirFiltroLeads({ estado: 'nuevo', servicio: 'afiliacion-eps' });
  assert.match(where, /WHERE .* AND /);
  assert.deepEqual(binds, ['nuevo', 'afiliacion-eps']);
});

test('diffAuditoria solo reporta campos cambiados', () => {
  const d = diffAuditoria(
    { estado: 'nuevo', notas: 'a' },
    { estado: 'contactado', notas: 'a' }
  );
  assert.deepEqual(d, { estado: { de: 'nuevo', a: 'contactado' } });
});

test('ESTADOS coincide con el esquema', () => {
  assert.deepEqual(ESTADOS, ['nuevo', 'contactado', 'cotizado', 'cerrado', 'perdido']);
});
