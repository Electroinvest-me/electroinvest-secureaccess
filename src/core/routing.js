'use strict';
// Post-connect routing fixups. `run` (execFile-like) is injected for testability.
//
// Windows full-tunnel: openconnect/vpnc-script add a 0.0.0.0/0 default via the
// tun, but it can lose to the physical default on metric. We add MORE-SPECIFIC
// 0.0.0.0/1 + 128.0.0.0/1 on-link routes via the tun ifIndex (these beat any
// /0 regardless of metric) and lower the tun interface metric.

function winFullTunnelCommands(ifIndex) {
  const i = String(ifIndex);
  return [
    ['netsh', ['interface', 'ipv4', 'set', 'interface', i, 'metric=1']],
    ['netsh', ['interface', 'ipv4', 'add', 'route', '0.0.0.0/1', 'interface=' + i, 'metric=1', 'store=active']],
    ['netsh', ['interface', 'ipv4', 'add', 'route', '128.0.0.0/1', 'interface=' + i, 'metric=1', 'store=active']],
  ];
}

function applyRouting({ platform = process.platform, ifIndex, run, log = () => {} }) {
  if (platform !== 'win32' || !ifIndex) return;
  for (const [exe, args] of winFullTunnelCommands(ifIndex)) {
    try {
      run(exe, args, (e) => log('[route] ' + args.join(' ') + (e ? ' ERR ' + e.message : ' ok')));
    } catch (e) {
      log('[route] ' + e.message);
    }
  }
}

module.exports = { applyRouting, winFullTunnelCommands };
