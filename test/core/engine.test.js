'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { parseLine } = require('../../src/core/engine');

test('detects assigned IP + connected', () => {
  const p = parseLine('Configured as 10.205.106.65, with SSL connected and ESP in progress');
  assert.equal(p.ip, '10.205.106.65');
  assert.equal(p.status, 'connected');
});

test('detects tun index (TAP and Wintun)', () => {
  assert.equal(parseLine("Using TAP-Windows device 'OpenVPN TAP-Windows6', index 26").tunIndex, '26');
  assert.equal(parseLine("Using Wintun device '185.132.160.160', index 25").tunIndex, '25');
});

test('detects session limit', () => {
  assert.equal(parseLine('Session limit reached. Choose session to kill:').sessionLimit, true);
});

test('detects auth failure', () => {
  assert.equal(parseLine('Failed to complete authentication').status, 'error');
});

test('neutral line yields nothing', () => {
  assert.deepEqual(parseLine('Send ESP probes'), {});
});
