# Changelog

## Unreleased
- Electroinvest startup splash with the company logo and animated geometric artwork.
- Branded application header, connection controls, and electroinvest.me links.
- Upgrade Electron to 44.7.2; building requires Node.js 22.12+, and macOS requires 13+.

## 0.1.0 (unreleased)
First public skeleton.
- Cross-platform OpenConnect GUI (macOS, Windows x64, Windows ARM64).
- Core/GUI separation (`src/core` is Electron-free and unit-tested).
- Native Windows ARM64 `openconnect` build (`scripts/build-engine-win-arm64.ps1`).
- Full-tunnel routing fix, TAP + `--no-dtls` on Windows ARM64.
- Cert-pinning with org preset (MJU) prefilled.
- Password stored via OS secret store; interactive 2FA prompt; tray indicator.
- GitHub Actions CI (build matrix) + release workflow.
