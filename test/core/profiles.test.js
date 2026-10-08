'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const os = require('os');
const path = require('path');
const fs = require('fs');
const { ProfileStore } = require('../../src/core/profiles');

const tmpFile = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ei-')), 'p.json');

test('seeds the default MJU profile with a cert pin', () => {
  const s = new ProfileStore(tmpFile());
  const all = s.getAll();
  assert.equal(all.length, 1);
  assert.match(all[0].pin, /^pin-sha256:/);
});

test('upsert adds and remove deletes', () => {
  const s = new ProfileStore(tmpFile());
  s.getAll();
  s.upsert({ name: 'X', url: 'https://x', pin: 'pin-sha256:zz', username: 'u', uses2fa: false });
  let all = s.getAll();
  assert.equal(all.length, 2);
  const id = all.find((p) => p.name === 'X').id;
  all = s.remove(id);
  assert.equal(all.length, 1);
});
