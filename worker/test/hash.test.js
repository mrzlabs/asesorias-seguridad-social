import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashIp } from '../src/hash.js';

test('devuelve hex de 64 chars', async () => {
  const h = await hashIp('190.0.0.1');
  assert.match(h, /^[0-9a-f]{64}$/);
});

test('es determinista', async () => {
  assert.equal(await hashIp('190.0.0.1'), await hashIp('190.0.0.1'));
});

test('difiere por IP', async () => {
  assert.notEqual(await hashIp('190.0.0.1'), await hashIp('190.0.0.2'));
});

test('IP vacia devuelve null', async () => {
  assert.equal(await hashIp(''), null);
  assert.equal(await hashIp(null), null);
});
