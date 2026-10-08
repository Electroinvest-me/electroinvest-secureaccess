# engines/

Per-platform OpenConnect runtime payloads, one folder per `process.platform-process.arch`:

```
engines/
  darwin-arm64/   openconnect + dylibs + vpnc-script
  darwin-x64/     openconnect + dylibs + vpnc-script
  win32-x64/      openconnect.exe + DLLs + wintun.dll + vpnc-script-win.js
  win32-arm64/    openconnect.exe + DLLs + libopenconnect-5.dll + libwinpthread-1.dll + vpnc-script-win.js
```

These are **not committed** (large and/or vendor-licensed). Produce them with:

- `scripts/fetch-engine-macos.sh [arm64|x86_64]`
- `scripts/fetch-engine-win-x64.ps1`
- `scripts/build-engine-win-arm64.ps1`  (builds openconnect from source via MSYS2 CLANGARM64)

`electron-builder` bundles the matching folder as `resources/engines/<platform>-<arch>`
at package time; `src/core/platform.js` resolves it at runtime.
