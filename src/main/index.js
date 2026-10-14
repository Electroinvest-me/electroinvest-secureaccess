'use strict';
const { app, BrowserWindow, Tray, Menu, nativeImage, safeStorage, ipcMain } = require('electron');
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
let splash = null;
let tray = null;
let icons = {};
let splashShownAt = 0;
let revealTimer = null;
let startupFallback = null;

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

function revealMainWindow() {
  if (!win || win.isDestroyed() || revealTimer) return;
  clearTimeout(startupFallback);
  const remaining = splash ? Math.max(0, 1400 - (Date.now() - splashShownAt)) : 0;
  revealTimer = setTimeout(() => {
    revealTimer = null;
    if (!win || win.isDestroyed()) return;
    win.show();
    win.focus();
    if (splash && !splash.isDestroyed()) splash.destroy();
    splash = null;
  }, remaining);
}

function createSplashWindow() {
  splashShownAt = Date.now();
  splash = new BrowserWindow({
    width: 760, height: 460, useContentSize: true,
    title: 'Electroinvest SecureAccess',
    frame: false, show: false, resizable: false,
    maximizable: false, minimizable: false, fullscreenable: false,
    skipTaskbar: true, backgroundColor: '#f7f6f2',
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  splash.once('ready-to-show', () => {
    if (!splash || splash.isDestroyed()) return;
    splashShownAt = Date.now();
    splash.show();
  });
  splash.on('closed', () => { splash = null; });
  splash.loadFile(path.join(__dirname, '..', 'renderer', 'splash.html'), {
    query: { version: app.getVersion() },
  }).catch(() => {
    if (splash && !splash.isDestroyed()) splash.destroy();
    revealMainWindow();
  });
}

function createWindow() {
  win = new BrowserWindow({
    width: 480, height: 660, minWidth: 420, minHeight: 540,
    useContentSize: true, show: false, backgroundColor: '#f5f5f3',
    title: 'Electroinvest SecureAccess', autoHideMenuBar: true,
    icon: icons.app && !icons.app.isEmpty() ? icons.app : undefined,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.on('close', (e) => { if (!app.isQuitting) { e.preventDefault(); win.hide(); } });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('did-finish-load', () => send('state', engine.state));
  // A renderer failure must not leave the app stuck behind the splash.
  startupFallback = setTimeout(revealMainWindow, 10000);
  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html')).catch(revealMainWindow);
}

ipcMain.on('app:ready', (event) => {
  if (win && event.sender === win.webContents) revealMainWindow();
});

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
    buildTrayMenu(engine.state);
    registerIpc({ engine, store, secrets, cfg, getWin: () => win });
    createSplashWindow();
    createWindow();
  });
  app.on('activate', () => { if (win) { win.show(); win.focus(); } });
  app.on('before-quit', () => {
    app.isQuitting = true;
    clearTimeout(revealTimer);
    clearTimeout(startupFallback);
    engine.disconnect();
  });
  app.on('window-all-closed', () => { /* keep running in tray */ });
}
