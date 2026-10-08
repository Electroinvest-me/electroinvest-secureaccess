'use strict';
const { app, BrowserWindow, Tray, Menu, nativeImage, safeStorage } = require('electron');
const path = require('path');
const { execFile, execFileSync, spawn } = require('child_process');
const { engineConfig } = require('../core/platform');
const { Engine } = require('../core/engine');
const { ProfileStore } = require('../core/profiles');
const { makeSecrets } = require('../core/secrets');
const { applyRouting } = require('../core/routing');
const { registerIpc } = require('./ipc');

const RES = app.isPackaged
  ? path.join(process.resourcesPath, 'engines')
  : path.join(__dirname, '..', '..', 'engines');

const cfg = engineConfig(RES);
const store = new ProfileStore(path.join(app.getPath('userData'), 'profiles.json'));
const secrets = makeSecrets(safeStorage);
const engine = new Engine({ exe: cfg.exe, script: cfg.script, extraArgs: cfg.extraArgs });

let win = null;
let tray = null;
let icons = {};

// ---------- elevation (Windows needs admin for tun + routes) ----------
function isAdmin() {
  if (process.platform !== 'win32') return true;
  try { execFileSync('net', ['session'], { stdio: 'ignore' }); return true; } catch (e) { return false; }
}
function relaunchElevated() {
  try {
    spawn('powershell.exe', ['-NoProfile', '-Command',
      `Start-Process -FilePath '${process.execPath}' -Verb RunAs`], { detached: true, stdio: 'ignore' }).unref();
  } catch (e) {}
  app.quit();
}

// ---------- icons / tray ----------
function loadIcons() {
  const dir = path.join(__dirname, '..', 'renderer', 'assets');
  const mk = (f) => { const i = nativeImage.createFromPath(path.join(dir, f)); return i.isEmpty() ? nativeImage.createEmpty() : i; };
  icons = { green: mk('dot-green.png'), red: mk('dot-red.png'), orange: mk('dot-orange.png'), app: mk('app.png') };
}
const trayIcon = (s) => (s === 'connected' ? icons.green : s === 'connecting' ? icons.orange : icons.red);
const statusLabel = (s) => (s === 'connected' ? 'Povezan' : s === 'connecting' ? 'Povezivanje…' : s === 'error' ? 'Greška' : 'Nije povezano');
const send = (ch, data) => { if (win && !win.isDestroyed()) win.webContents.send(ch, data); };

function buildTrayMenu(st) {
  if (!tray) return;
  const on = st.status === 'connected' || st.status === 'connecting';
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'SecureAccess — ' + statusLabel(st.status), enabled: false },
    { type: 'separator' },
    { label: 'Prikaži', click: () => { if (win) { win.show(); win.focus(); } } },
    { label: 'Prekini vezu', enabled: on, click: () => engine.disconnect() },
    { type: 'separator' },
    { label: 'Izlaz', click: () => { engine.disconnect(); app.isQuitting = true; app.exit(0); } },
  ]));
}
function updateTray(st) {
  if (!tray) return;
  tray.setImage(trayIcon(st.status));
  tray.setToolTip('Electroinvest SecureAccess — ' + statusLabel(st.status) + (st.ip ? ' (' + st.ip + ')' : ''));
  buildTrayMenu(st);
}

// ---------- engine events ----------
engine.on('log', (l) => send('log', l));
engine.on('status', (st) => { send('state', st); updateTray(st); });
engine.on('tun', (ifIndex) => applyRouting({ ifIndex, run: execFile, log: (l) => send('log', l) }));
engine.on('sessionLimit', () => send('log', '[server] Postojeća sesija je prekinuta (nalog dozvoljava 1 sesiju).'));

function createWindow() {
  win = new BrowserWindow({
    width: 440, height: 600, minWidth: 380, minHeight: 500,
    title: 'Electroinvest SecureAccess', autoHideMenuBar: true,
    icon: icons.app && !icons.app.isEmpty() ? icons.app : undefined,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  win.on('close', (e) => { if (!app.isQuitting) { e.preventDefault(); win.hide(); } });
  win.webContents.on('did-finish-load', () => send('state', engine.state));
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => { if (win) { win.show(); win.focus(); } });
  app.whenReady().then(() => {
    if (process.platform === 'win32' && !isAdmin()) { relaunchElevated(); return; }
    loadIcons();
    tray = new Tray(trayIcon('disconnected'));
    tray.on('double-click', () => { if (win) { win.show(); win.focus(); } });
    createWindow();
    buildTrayMenu(engine.state);
    registerIpc({ engine, store, secrets, cfg, getWin: () => win });
  });
  app.on('before-quit', () => { app.isQuitting = true; engine.disconnect(); });
  app.on('window-all-closed', () => { /* keep running in tray */ });
}
