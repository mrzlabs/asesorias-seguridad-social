import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokenValido } from '../src/auth.js';

test('acepta el token correcto', () => {
  assert.equal(tokenValido('Bearer secreto123', 'secreto123'), true);
});

test('rechaza token equivocado', () => {
  assert.equal(tokenValido('Bearer malo', 'secreto123'), false);
});

test('rechaza sin header', () => {
  assert.equal(tokenValido(null, 'secreto123'), false);
  assert.equal(tokenValido('', 'secreto123'), false);
});

test('rechaza si no hay secreto configurado', () => {
  assert.equal(tokenValido('Bearer x', ''), false);
  assert.equal(tokenValido('Bearer x', undefined), false);
});

test('rechaza esquema que no es Bearer', () => {
  assert.equal(tokenValido('Basic secreto123', 'secreto123'), false);
});
