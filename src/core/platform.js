'use strict';
// Per-platform engine/driver configuration. Pure Node (no Electron).
const path = require('path');

/**
 * Resolve engine configuration for the current platform+arch.
 * @param {string} resourcesDir  Directory that contains the per-platform `engines/` payloads.
 *   In dev this is <repo>/engines ; in a packaged app it is process.resourcesPath/engines.
 * @param {object} [over]  Overrides: { platform, arch } (for tests).
 */
function engineConfig(resourcesDir, over = {}) {
  const platform = over.platform || process.platform;
  const arch = over.arch || process.arch;
  const key = `${platform}-${arch}`;
  const base = path.join(resourcesDir, key);

  // defaults
  let cfg = {
    key,
    platform,
    arch,
    dir: base,
    exe: path.join(base, platform === 'win32' ? 'openconnect.exe' : 'openconnect'),
    script: path.join(base, platform === 'win32' ? 'vpnc-script-win.js' : 'vpnc-script'),
    driver: 'utun',        // tun kind: 'utun' (mac/linux) | 'wintun' | 'tap'
    extraArgs: [],         // platform-specific openconnect args
    needsRoot: platform !== 'win32', // mac/linux need root/helper for tun
  };

  if (platform === 'win32') {
    cfg.needsRoot = false; // handled via UAC elevation of the whole app
    if (arch === 'arm64') {
      // Wintun crashes openconnect on Win ARM64 builds; TAP-Windows6 is stable.
      // ESP/UDP is often blocked (e.g. behind NAT) → force TLS data channel.
      cfg.driver = 'tap';
      cfg.extraArgs = ['--no-dtls'];
    } else {
      cfg.driver = 'wintun';
      cfg.extraArgs = [];
    }
  }
  return cfg;
}

module.exports = { engineConfig };
