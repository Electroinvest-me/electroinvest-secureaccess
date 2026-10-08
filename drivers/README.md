# drivers/

Windows VPN drivers staged for the installer. Payloads are **not committed**
(vendor-signed binaries); fetch them with `scripts/fetch-drivers.ps1`:

```
drivers/
  wintun/arm64/wintun.dll   wintun/amd64/wintun.dll   (WireGuard, signed)
  openvpn/OpenVPN-arm64.msi  openvpn/OpenVPN-amd64.msi (tap-windows6 + tapctl, signed)
  install-win.ps1           run post-install (elevated) by the NSIS installer
  uninstall-win.ps1
```

- **Windows x64** uses Wintun (installs its own kernel driver on first use).
- **Windows ARM64** uses TAP-Windows6 (Wintun crashes the openconnect build there),
  installed from the bundled OpenVPN MSI; a `SecureAccess TAP` adapter is created.

Wintun is © WireGuard LLC; tap-windows6 is © OpenVPN Inc. Redistribution per their
licenses — see those projects.
