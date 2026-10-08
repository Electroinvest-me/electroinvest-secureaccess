# Electroinvest SecureAccess

A small, cross-platform **OpenConnect** VPN client with a simple GUI — a free
alternative to the Ivanti Secure Access / Pulse Connect Secure client.
Install it, add a connection, click **Connect**. Drivers and the VPN engine are
set up for you.

> Supports the `pulse` (Ivanti/Pulse Connect Secure) protocol out of the box, and
> everything else OpenConnect speaks (`anyconnect`, `nc`, `gp`, `f5`, `fortinet`, `array`).

## Platforms
- **macOS** (Apple Silicon + Intel)
- **Windows x64**
- **Windows ARM64** — including a **self-built native `openconnect`**, because the
  available third-party ARM64 builds ship a broken crypto backend.

## Features
- Ivanti-like connection list, status, system-tray indicator (green/red).
- Password saved with the OS secret store (DPAPI on Windows, Keychain on macOS).
- Interactive 2FA prompt (authenticator code) at connect time.
- Cert-pinning (`--servercert pin-sha256:…`) with an org **preset** prefilled.
- Handles the tricky bits automatically: full-tunnel routing, and the Windows
  ARM64 driver/transport quirks (TAP + TLS data channel).

## Install (end users)
Download the installer for your platform from the
[Releases](https://github.com/electroinvest/secureaccess/releases) page:
- macOS: `.dmg`
- Windows: `.exe` (one installer, x64 or ARM64)

The Windows installer also installs the VPN driver (Wintun on x64; TAP-Windows6
on ARM64). On first launch it asks for admin (needed to create the tunnel).

## Usage
1. Open **Electroinvest SecureAccess**.
2. Pick the preset / edit the connection (URL, cert pin, username). For MJU the
   pin is prefilled.
3. **Connect** → enter password (optionally *Remember*) → enter 2FA code.
4. Minimizes to the tray; the dot shows status.

## Architecture
```
src/core/     pure Node, no Electron — unit-tested
  engine.js     spawn openconnect, feed creds, parse output → status/log/tun events
  routing.js    full-tunnel route fixups (win: 0.0.0.0/1 + 128.0.0.0/1 via tun)
  profiles.js   JSON profile store + org presets (MJU pin)
  secrets.js    password at rest (safeStorage injected)
  platform.js   per-OS engine/driver/arg selection
src/main/     Electron main: window, tray, elevation, IPC wiring
src/preload/  contextBridge API
src/renderer/ the GUI (HTML/CSS/JS)
engines/      per-platform openconnect payloads (produced by scripts/, not committed)
drivers/      Wintun / TAP-Windows6 + install logic (payloads not committed)
scripts/      build/fetch the engine + drivers per platform
```
The engine (OpenConnect) is a separate process; the GUI only drives it. This keeps
licensing clean and the core logic testable.

## Build from source (developers)
```sh
npm install
npm test            # unit tests for src/core
npm run icons       # generate icon assets
npm start           # run the GUI in dev (needs an engine for your platform)
```
Produce the per-platform engine before packaging:
```sh
# macOS
bash scripts/fetch-engine-macos.sh
# Windows x64 (PowerShell)
powershell -ExecutionPolicy Bypass -File scripts/fetch-engine-win-x64.ps1
powershell -ExecutionPolicy Bypass -File scripts/fetch-drivers.ps1
# Windows ARM64 (PowerShell, on an ARM64 machine) — builds openconnect from source
powershell -ExecutionPolicy Bypass -File scripts/build-engine-win-arm64.ps1
powershell -ExecutionPolicy Bypass -File scripts/fetch-drivers.ps1
```
Package:
```sh
npm run pack:mac
npm run pack:win:x64
npm run pack:win:arm64
```

## CI
`.github/workflows/build.yml` runs tests and a package matrix (macOS arm64/x64,
Windows x64, Windows ARM64). `release.yml` builds all targets on a `v*` tag and
drafts a GitHub Release with the installers. Code-signing is wired to optional
repo secrets (`CSC_LINK`, `APPLE_ID`, …); unsigned if absent.

## Security notes
- Server cert is pinned by SHA-256 (`pin-sha256:`); verify the pin with your admin.
- Passwords are encrypted at rest via the OS secret store; 2FA is never stored.
- The app requests admin only to create the tunnel/routes.

## Known limitations / TODO
- **macOS** needs root for the `utun` device; v1 relies on sudo — a privileged
  launchd helper is a TODO.
- Windows ARM64 uses TAP-Windows6 + `--no-dtls` (Wintun crashes the openconnect
  build; ESP/UDP is often NAT-blocked).
- App code-signing/notarization requires your own certificates (see CI secrets).

## Credits & License
Built on [OpenConnect](https://www.infradead.org/openconnect/) (LGPL/GPL),
GnuTLS, [Wintun](https://www.wintun.net/) (WireGuard), and
[tap-windows6](https://github.com/OpenVPN/tap-windows6) (OpenVPN). Each retains
its own license; see their projects.

This project is licensed under **GPL-3.0-or-later** — see [LICENSE](LICENSE).
