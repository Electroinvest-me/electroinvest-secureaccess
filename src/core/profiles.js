'use strict';
// Profile persistence (JSON). Pure Node. Passwords are stored encrypted in
// `enc` by the caller (see core/secrets.js); this module never handles plaintext.
const fs = require('fs');
const path = require('path');

const DEFAULT_PROFILES = [
  {
    id: 'mju',
    name: 'MJU VPN (tourism)',
    url: 'https://185.132.160.160/tourism',
    protocol: 'pulse',
    pin: 'pin-sha256:JVeFBpdoSeXZEp3b1qFSMLVee6jNEqPc8P73SQOkTYU=',
    username: '',
    uses2fa: true,
    savePass: false,
    enc: '',
  },
];

// Presets to prefill the "Add connection" dialog so it works out of the box.
const PRESETS = {
  'Ministarstvo (MJU)': {
    url: 'https://185.132.160.160/tourism',
    protocol: 'pulse',
    pin: 'pin-sha256:JVeFBpdoSeXZEp3b1qFSMLVee6jNEqPc8P73SQOkTYU=',
    uses2fa: true,
  },
};

class ProfileStore {
  constructor(file) { this.file = file; }

  load() {
    try { return JSON.parse(fs.readFileSync(this.file, 'utf8')); } catch (e) { return null; }
  }

  save(list) {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify(list, null, 2), 'utf8');
  }

  getAll() {
    let list = this.load();
    if (!Array.isArray(list)) { list = DEFAULT_PROFILES.map((p) => ({ ...p })); this.save(list); }
    return list;
  }

  get(id) { return this.getAll().find((x) => x.id === id) || null; }

  upsert(p) {
    const list = this.getAll();
    if (!p.id) p.id = 'p' + Date.now();
    const i = list.findIndex((x) => x.id === p.id);
    if (i >= 0) list[i] = p; else list.push(p);
    this.save(list);
    return list;
  }

  remove(id) {
    const list = this.getAll().filter((x) => x.id !== id);
    this.save(list);
    return list;
  }
}

module.exports = { ProfileStore, DEFAULT_PROFILES, PRESETS };
