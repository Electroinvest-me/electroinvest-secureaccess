# Electroinvest SecureAccess

**EN —** A free, open-source **Ivanti Secure Access / Pulse Connect Secure
replacement** with a simple GUI. It connects to the **same corporate/government
VPN** that the official Ivanti client uses (e.g. the one used by the **Montenegro
Ministry of Public Administration / MJU**), and it runs where the official client
falls short — including **macOS (Apple Silicon)** and **Windows on ARM64**.
Install it, add a connection, click **Connect** — the VPN engine and drivers are
set up for you.

**ME —** Besplatna, open-source **zamjena za Ivanti Secure Access / Pulse Connect
Secure** klijent, sa jednostavnim GUI-jem. Povezuje se na **isti državni/korporativni
VPN** koji koristi zvanični Ivanti klijent (npr. onaj koji koristi **Ministarstvo
javne uprave Crne Gore / MJU**), i radi tamo gdje zvanični klijent ne pokriva —
uključujući **macOS (Apple Silicon)** i **Windows ARM64**. Instaliraš,
dodaš konekciju, klikneš **Connect** — VPN engine i drajveri se sami podese.

> Keywords: Ivanti Secure Access, Pulse Connect Secure, OpenConnect GUI, VPN klijent
> Crna Gora / Montenegro, MJU, macOS VPN (Apple Silicon), Windows ARM64 VPN,
> `pulse` protocol, cert pinning, 2FA.

---

## Zašto / Why
**ME —** Zvanični Ivanti/Pulse klijent ne radi dobro (ili uopšte) na nekim
platformama — posebno **macOS** i **Windows ARM64**. Ovaj projekat to rješava:
isti VPN, ali klijent koji radi na svemu, sa čistim GUI-jem i automatskim
podešavanjem drajvera.

**EN —** The official Ivanti/Pulse client is missing or unreliable on some
platforms — notably **macOS** and **Windows ARM64**. This project fixes that:
same VPN, a client that runs everywhere, a clean GUI, and automatic driver setup.

## Platforms
- **macOS** — Apple Silicon (arm64)
- **Windows x64**
- **Windows ARM64** — with a **self-built native `openconnect`** (third-party ARM64
  builds ship a broken crypto backend; this repo builds a working one)

## Features
- Ivanti-like connection list, live status, system-tray indicator.
- `pulse` (Ivanti/Pulse Connect Secure) protocol out of the box; also `anyconnect`,
  `nc`, `gp`, `f5`, `fortinet`, `array`.
- Certificate pinning (`pin-sha256:…`) with an organization **preset** prefilled (MJU).
- Interactive **2FA** (authenticator) prompt; password saved via the OS secret store
  (DPAPI on Windows, Keychain on macOS).
- Automatic full-tunnel routing; handles the Windows ARM64 driver/transport quirks.

## Download
Get the installer for your platform from
**[Releases](https://github.com/Electroinvest-me/electroinvest-secureaccess/releases)**:
- macOS: `.dmg` · Windows: `.exe` (x64 or ARM64) · Windows ARM64 portable: `.zip`

The Windows installer also installs the VPN driver (Wintun on x64; TAP-Windows6 on
ARM64). First launch asks for admin (needed to create the tunnel).

## Usage
1. Open **Electroinvest SecureAccess**.
2. Pick the preset / edit the connection (URL, cert pin, username). For MJU the pin
   is prefilled.
3. **Connect** → password (optionally *Remember*) → 2FA code.
4. Minimizes to the tray; the dot shows status.

## Architecture
```
src/core/     pure Node, no Electron — unit-tested
  engine.js     spawn openconnect, feed creds, parse output → status/log/tun events
  routing.js    full-tunnel route fixups (win: 0.0.0.0/1 + 128.0.0.0/1 via tun)
  profiles.js   JSON profile store + org presets (MJU pin)
  secrets.js    password at rest (OS secret store)
  platform.js   per-OS engine/driver/arg selection
src/main/     Electron main: window, tray, elevation, IPC
src/preload/  contextBridge API
src/renderer/ the GUI
engines/      per-platform openconnect payloads (produced by scripts/, not committed)
drivers/      Wintun / TAP-Windows6 + install logic
scripts/      build/fetch the engine + drivers per platform
```

## Build from source
```sh
npm install
npm test            # unit tests for src/core
npm run icons
npm start           # dev run (needs a platform engine in engines/)
# engines:
bash   scripts/fetch-engine-macos.sh
pwsh   scripts/fetch-engine-win-x64.ps1 ; pwsh scripts/fetch-drivers.ps1
pwsh   scripts/build-engine-win-arm64.ps1   # builds openconnect on an ARM64 machine
# package:
npm run pack:mac ; npm run pack:win:x64 ; npm run pack:win:arm64
```
CI (`.github/workflows`) builds the matrix (macOS arm64/x64, Windows x64/ARM64) and
drafts a GitHub Release on a `v*` tag.

## Security
Server cert is pinned by SHA-256 — verify the pin with your admin. Passwords are
encrypted at rest via the OS secret store; 2FA is never stored. Admin is requested
only to create the tunnel/routes.

## Credits & License
Built on [OpenConnect](https://www.infradead.org/openconnect/), GnuTLS,
[Wintun](https://www.wintun.net/), and [tap-windows6](https://github.com/OpenVPN/tap-windows6)
(each under its own license). This project: **GPL-3.0-or-later** — see [LICENSE](LICENSE).

## Author / Kontakt
**Armin Kardović** — **Electroinvest** (Montenegro / Crna Gora)
- GitHub: https://github.com/Electroinvest-me · https://github.com/arminkardovic
- Web: https://electroinvest.me · e-mail: info@electroinvest.me

*ME — Za podršku, prilagođavanje ili uvođenje u vašoj organizaciji, kontaktirajte
Armina / Electroinvest. · EN — For support, customization or rollout in your
organization, contact Armin / Electroinvest.*
