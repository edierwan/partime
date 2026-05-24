import test from 'node:test';
import assert from 'node:assert/strict';
import { passwordsMatch, validatePassword } from '../src/lib/password-policy';

test('requires at least eight characters', () => {
  assert.equal(validatePassword('A1short').ok, false);
});

test('requires letters and numbers', () => {
  assert.equal(validatePassword('abcdefgh').ok, false);
  assert.equal(validatePassword('12345678').ok, false);
  assert.equal(validatePassword('abc12345').ok, true);
});

test('validates confirmation match', () => {
  assert.equal(passwordsMatch('abc12345', 'abc12345').ok, true);
  assert.equal(passwordsMatch('abc12345', 'abc12346').ok, false);
});
