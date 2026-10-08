'use strict';
const { ipcMain } = require('electron');
const { PRESETS } = require('../core/profiles');

// Strip secrets before sending profiles to the renderer.
const publicProfile = (p) => ({ ...p, enc: undefined, hasPass: !!p.enc });

function registerIpc({ engine, store, secrets, cfg }) {
  ipcMain.handle('profiles:get', () => store.getAll().map(publicProfile));
  ipcMain.handle('profiles:presets', () => PRESETS);

  ipcMain.handle('profiles:save', (e, p) => {
    if (p.savePass && p.password) p.enc = secrets.encrypt(p.password);
    else if (!p.savePass) p.enc = '';
    else { const old = store.get(p.id); p.enc = old ? old.enc : ''; } // keep existing saved password
    delete p.password; delete p.hasPass;
    return store.upsert(p).map(publicProfile);
  });

  ipcMain.handle('profiles:delete', (e, id) => store.remove(id).map(publicProfile));

  ipcMain.handle('vpn:needs', (e, id) => {
    const p = store.get(id);
    if (!p) return { ok: false };
    return {
      ok: true, name: p.name, username: p.username,
      needUser: !p.username,
      needPass: !(p.savePass && p.enc),
      need2fa: !!p.uses2fa,
    };
  });

  ipcMain.handle('vpn:connect', (e, { id, username, password, token, remember }) => {
    const p = store.get(id);
    if (!p) return;
    if (username && username !== p.username) { p.username = username; store.upsert(p); }
    const pw = (p.savePass && p.enc) ? secrets.decrypt(p.enc) : (password || '');
    if (remember && password) { p.savePass = true; p.enc = secrets.encrypt(password); store.upsert(p); }
    engine.connect(p, { password: pw, token });
  });

  ipcMain.handle('vpn:disconnect', () => engine.disconnect());
  ipcMain.handle('vpn:state', () => engine.state);
  ipcMain.handle('app:info', () => ({
    platform: process.platform, arch: process.arch,
    driver: cfg.driver, secure: secrets.secure,
  }));
}

module.exports = { registerIpc };
