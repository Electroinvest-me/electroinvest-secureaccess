'use strict';
// Password-at-rest. `safeStorage` (Electron) is injected by the main process:
// DPAPI on Windows, Keychain on macOS. Falls back to reversible base64 (clearly
// marked, NOT secure) only so `core` stays usable/testable without Electron.
function makeSecrets(safeStorage) {
  const available = () => {
    try { return !!safeStorage && safeStorage.isEncryptionAvailable(); } catch (e) { return false; }
  };
  return {
    get secure() { return available(); },
    encrypt(plain) {
      if (!plain) return '';
      if (available()) return safeStorage.encryptString(plain).toString('base64');
      return 'b64:' + Buffer.from(plain, 'utf8').toString('base64');
    },
    decrypt(enc) {
      if (!enc) return '';
      if (enc.startsWith('b64:')) return Buffer.from(enc.slice(4), 'base64').toString('utf8');
      if (available()) {
        try { return safeStorage.decryptString(Buffer.from(enc, 'base64')); } catch (e) { return ''; }
      }
      return '';
    },
  };
}

module.exports = { makeSecrets };
