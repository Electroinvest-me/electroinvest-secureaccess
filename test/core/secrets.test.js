'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { makeSecrets } = require('../../src/core/secrets');

test('base64 fallback roundtrips when safeStorage is unavailable', () => {
  const s = makeSecrets(null);
  assert.equal(s.secure, false);
  const enc = s.encrypt('hunter2');
  assert.notEqual(enc, 'hunter2');
  assert.equal(s.decrypt(enc), 'hunter2');
});

test('uses injected safeStorage (DPAPI/Keychain) when available', () => {
  const fake = {
    isEncryptionAvailable: () => true,
    encryptString: (p) => Buffer.from('ENC:' + p),
    decryptString: (b) => b.toString().slice(4),
  };
  const s = makeSecrets(fake);
  assert.equal(s.secure, true);
  const enc = s.encrypt('abc');
  assert.equal(s.decrypt(enc), 'abc');
});
