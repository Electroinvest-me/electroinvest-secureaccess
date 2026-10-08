#!/usr/bin/env bash
# Assembles the macOS engine (engines/darwin-<arch>/) from Homebrew's openconnect,
# bundling + relocating its dylibs to @loader_path so the app is self-contained.
# Usage: scripts/fetch-engine-macos.sh [arm64|x86_64]   (defaults to host arch)
set -eo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ARCH="${1:-$(uname -m)}"
case "$ARCH" in
  arm64)  OUT="$ROOT/engines/darwin-arm64" ;;
  x86_64|x64) OUT="$ROOT/engines/darwin-x64" ;;
  *) echo "unknown arch: $ARCH" >&2; exit 1 ;;
esac
mkdir -p "$OUT"

brew install openconnect vpnc-scripts >/dev/null
PREFIX="$(brew --prefix)"
cp "$PREFIX/bin/openconnect" "$OUT/openconnect"
# vpnc-script (route/dns setup on mac)
if [ -f "$PREFIX/etc/vpnc/vpnc-script" ]; then cp "$PREFIX/etc/vpnc/vpnc-script" "$OUT/vpnc-script"; fi
chmod +x "$OUT/openconnect" "$OUT/vpnc-script" 2>/dev/null || true

# Bundle + relocate non-system dylibs recursively.
relocate() {
  local f="$1"
  otool -L "$f" | awk 'NR>1{print $1}' | while read -r dep; do
    case "$dep" in
      /usr/lib/*|/System/*) continue ;;
    esac
    local base; base="$(basename "$dep")"
    if [ ! -f "$OUT/$base" ] && [ -f "$dep" ]; then
      cp "$dep" "$OUT/$base"; chmod u+w "$OUT/$base"
      install_name_tool -id "@loader_path/$base" "$OUT/$base" 2>/dev/null || true
      relocate "$OUT/$base"
    fi
    install_name_tool -change "$dep" "@loader_path/$base" "$f" 2>/dev/null || true
  done
}
relocate "$OUT/openconnect"
echo "Engine -> $OUT"
ls -la "$OUT"
echo "NOTE: macOS still needs root for the utun device — v1 uses sudo; a privileged"
echo "      launchd helper is a TODO (see README)."
