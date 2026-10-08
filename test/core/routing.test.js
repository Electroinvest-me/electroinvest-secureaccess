'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { winFullTunnelCommands, applyRouting } = require('../../src/core/routing');

test('builds /1 split routes via the tun ifIndex', () => {
  const c = winFullTunnelCommands(26);
  assert.equal(c.length, 3);
  assert.ok(c.some(([, a]) => a.includes('0.0.0.0/1')));
  assert.ok(c.some(([, a]) => a.includes('128.0.0.0/1')));
  assert.ok(c.every(([e]) => e === 'netsh'));
});

test('applyRouting is a no-op off Windows', () => {
  let n = 0;
  applyRouting({ platform: 'darwin', ifIndex: 5, run: () => { n++; } });
  assert.equal(n, 0);
});

test('applyRouting runs three commands on win32', () => {
  let n = 0;
  applyRouting({ platform: 'win32', ifIndex: 7, run: (e, a, cb) => { n++; if (cb) cb(null); } });
  assert.equal(n, 3);
});
