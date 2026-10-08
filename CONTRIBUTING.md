# Contributing

Thanks for helping improve Electroinvest SecureAccess.

## Dev setup
```sh
npm install
npm test          # unit tests for src/core (no Electron needed)
npm run icons
npm start         # run the GUI (needs a platform engine in engines/)
```

## Layout
- `src/core/` — pure Node, no Electron. Put logic here and add a test in `test/core/`.
- `src/main/` — Electron glue only (window, tray, IPC, elevation).
- `src/renderer/` — the GUI.
- `scripts/` — build/fetch the OpenConnect engine + drivers per platform.

## Rules of thumb
- Keep `src/core/` free of Electron imports so it stays testable.
- No secrets in code or logs. Passwords go through `core/secrets.js` (OS secret store).
- New platform behaviour belongs in `core/platform.js` / `core/routing.js`.

## PRs
- Run `npm test` before opening a PR.
- Describe what you tested and on which OS/arch.
