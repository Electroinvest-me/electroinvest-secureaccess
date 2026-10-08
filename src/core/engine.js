'use strict';
// OpenConnect engine wrapper. Pure Node (no Electron) so it is unit-testable.
const { EventEmitter } = require('events');
const { spawn, execFile } = require('child_process');

const RE_IP = /Configured as ([0-9A-Fa-f.:]+)/;
const RE_TUN = /Using (?:TAP-Windows|Wintun) device.*index (\d+)/i;
const RE_UP = /ESP session established|DTLS connected|Connected as |Configured as |Session authentication will expire/;
const RE_ERR = /Login failed|AUTHENTICATION FAILED|Authentication failed|Failed to complete authentication|Cookie was rejected|rejected by|Permission denied|SSL connection failure|Failed to connect to/;
const RE_SESSION_LIMIT = /Session limit reached/i;

/** Pure parser: classify a single openconnect output line. */
function parseLine(line) {
  const out = {};
  let m;
  if ((m = line.match(RE_IP))) out.ip = m[1];
  if ((m = line.match(RE_TUN))) out.tunIndex = m[1];
  if (RE_SESSION_LIMIT.test(line)) out.sessionLimit = true;
  if (RE_UP.test(line)) out.status = 'connected';
  else if (RE_ERR.test(line)) out.status = 'error';
  return out;
}

class Engine extends EventEmitter {
  constructor({ exe, script, extraArgs = [], spawnFn = spawn, execFileFn = execFile } = {}) {
    super();
    this.exe = exe;
    this.script = script;
    this.extraArgs = extraArgs;
    this._spawn = spawnFn;
    this._execFile = execFileFn;
    this.child = null;
    this.state = { status: 'disconnected', ip: '', tunIndex: '', since: 0 };
  }

  isConnected() { return !!this.child; }

  connect(profile, { password = '', token = '' } = {}) {
    if (this.child) { this.emit('log', '[already connected — disconnect first]'); return; }
    this.state = { status: 'connecting', ip: '', tunIndex: '', since: 0 };
    this.emit('status', this.state);

    const args = [
      '-v', ...this.extraArgs,
      '--protocol=' + (profile.protocol || 'pulse'),
      '--servercert', profile.pin,
      '--script', this.script,
      '--user=' + profile.username,
      profile.url,
    ];
    this.emit('log', '[run] openconnect ' + args.join(' '));

    const child = this._spawn(this.exe, args, { windowsHide: true });
    this.child = child;

    let buf = '';
    const onData = (d) => {
      buf += d.toString('utf8');
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).replace(/\r$/, '');
        buf = buf.slice(i + 1);
        this._onLine(line);
      }
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);

    // Pulse auth: password line, then (if 2FA) the token line.
    try {
      child.stdin.write(password + '\n');
      if (profile.uses2fa) child.stdin.write((token || '') + '\n');
    } catch (e) { /* stdin may already be closed on fast failures */ }

    child.on('exit', (code) => {
      this.emit('log', '[openconnect exited code=' + code + ']');
      this.child = null;
      if (this.state.status !== 'error') this._setStatus('disconnected');
    });
    child.on('error', (e) => {
      this.emit('log', '[spawn error] ' + e.message);
      this.child = null;
      this._setStatus('error');
    });
  }

  _onLine(line) {
    this.emit('log', line);
    const p = parseLine(line);
    if (p.ip) this.state.ip = p.ip;
    if (p.tunIndex) { this.state.tunIndex = p.tunIndex; this.emit('tun', p.tunIndex); }
    if (p.sessionLimit) this.emit('sessionLimit');
    if (p.status === 'connected') this._setStatus('connected');
    else if (p.status === 'error' && this.state.status !== 'connected') this._setStatus('error');
  }

  _setStatus(s) {
    if (s === 'connected' && this.state.status !== 'connected') this.state.since = Date.now();
    if (s === 'disconnected' || s === 'error') { this.state.since = 0; this.state.ip = ''; }
    this.state.status = s;
    this.emit('status', this.state);
  }

  disconnect() {
    const c = this.child;
    if (c && c.pid) {
      if (process.platform === 'win32') {
        try { this._execFile('taskkill', ['/PID', String(c.pid), '/T', '/F']); } catch (e) {}
      }
      try { c.kill(); } catch (e) {}
    }
    this.child = null;
    this._setStatus('disconnected');
  }
}

module.exports = { Engine, parseLine };
