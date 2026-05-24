import test from 'node:test';
import assert from 'node:assert/strict';
import { GENERIC_LOGIN_ERROR, GENERIC_PASSWORD_RESET_MESSAGE, normalizeEmailIdentity, normalizeLoginIdentifier, normalizePhoneIdentity } from '../src/lib/auth-identifiers';

test('normalizes email identifiers lowercase', () => {
  assert.equal(normalizeEmailIdentity('  Owner@Example.COM  '), 'owner@example.com');
  assert.equal(normalizeLoginIdentifier('Admin@Partime.test')?.type, 'EMAIL');
  assert.equal(normalizeLoginIdentifier('Admin@Partime.test')?.valueNormalized, 'admin@partime.test');
});

test('normalizes Malaysia mobile phone identifiers to E.164', () => {
  assert.equal(normalizePhoneIdentity('012-345 6789'), '+60123456789');
  assert.deepEqual(normalizeLoginIdentifier('+60 12-345 6789'), {
    type: 'PHONE',
    valueNormalized: '+60123456789',
    valueDisplay: '+60123456789',
  });
});

test('rejects invalid identifiers and keeps generic auth messages', () => {
  assert.equal(normalizeLoginIdentifier('not-an-email'), null);
  assert.equal(GENERIC_LOGIN_ERROR, 'Email/nombor telefon atau kata laluan tidak sah.');
  assert.equal(GENERIC_PASSWORD_RESET_MESSAGE, 'Jika akaun wujud, arahan reset kata laluan telah dihantar.');
});
