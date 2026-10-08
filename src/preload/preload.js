'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('vpn', {
  getProfiles: () => ipcRenderer.invoke('profiles:get'),
  presets: () => ipcRenderer.invoke('profiles:presets'),
  saveProfile: (p) => ipcRenderer.invoke('profiles:save', p),
  deleteProfile: (id) => ipcRenderer.invoke('profiles:delete', id),
  needs: (id) => ipcRenderer.invoke('vpn:needs', id),
  connect: (payload) => ipcRenderer.invoke('vpn:connect', payload),
  disconnect: () => ipcRenderer.invoke('vpn:disconnect'),
  getState: () => ipcRenderer.invoke('vpn:state'),
  info: () => ipcRenderer.invoke('app:info'),
  onState: (cb) => ipcRenderer.on('state', (e, s) => cb(s)),
  onLog: (cb) => ipcRenderer.on('log', (e, l) => cb(l)),
});
