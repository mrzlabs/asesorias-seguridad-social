import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RECURSOS, sqlInsert, sqlUpdate } from '../src/recursos.js';

test('recursos conocidos', () => {
  assert.deepEqual(Object.keys(RECURSOS).sort(),
    ['faq', 'parametros', 'promociones', 'servicios', 'testimonios']);
});

test('sqlInsert solo usa columnas whitelisted', () => {
  const { sql, binds } = sqlInsert('faq', { pregunta: 'p', respuesta: 'r', maligno: 'x' });
  assert.match(sql, /INSERT INTO faq \(pregunta, respuesta\) VALUES \(\?, \?\)/);
  assert.deepEqual(binds, ['p', 'r']);
});

test('sqlUpdate arma SET y WHERE por pk', () => {
  const { sql, binds } = sqlUpdate('servicios', 'afiliacion-eps', { nombre: 'X', activo: 1 });
  assert.match(sql, /UPDATE servicios SET nombre = \?, activo = \? WHERE slug = \?/);
  assert.deepEqual(binds, ['X', 1, 'afiliacion-eps']);
});

test('sqlUpdate no permite cambiar la pk', () => {
  const { sql, binds } = sqlUpdate('parametros', 'smlmv', { clave: 'otra', valor: '9' });
  assert.match(sql, /UPDATE parametros SET valor = \? WHERE clave = \?/);
  assert.deepEqual(binds, ['9', 'smlmv']);
});

test('sqlInsert vacio lanza', () => {
  assert.throws(() => sqlInsert('faq', { maligno: 'x' }), /sin columnas/);
});
