'use strict';
// Generate tray/app PNG icons with zero dependencies (pure zlib + hand-rolled PNG).
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; }
  return (buf) => { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = t[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
})();
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(CRC(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
function png(w, h, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
function dot(size, rgb) {
  const b = Buffer.alloc(size * size * 4);
  const c = (size - 1) / 2, rIn = size * 0.42, rOut = size * 0.5;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const d = Math.hypot(x - c, y - c);
    let a = 0; if (d <= rIn) a = 255; else if (d <= rOut) a = Math.round(255 * (rOut - d) / (rOut - rIn));
    const o = (y * size + x) * 4; b[o] = rgb[0]; b[o + 1] = rgb[1]; b[o + 2] = rgb[2]; b[o + 3] = a;
  }
  return png(size, size, b);
}
function rounded(size, rgb, rf) {
  const b = Buffer.alloc(size * size * 4); const r = size * rf;
  const corner = (x, y, cx, cy) => Math.hypot(x - cx, y - cy) <= r;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let inside = true;
    if (x < r && y < r) inside = corner(x, y, r, r);
    else if (x > size - r && y < r) inside = corner(x, y, size - r, r);
    else if (x < r && y > size - r) inside = corner(x, y, r, size - r);
    else if (x > size - r && y > size - r) inside = corner(x, y, size - r, size - r);
    const o = (y * size + x) * 4; b[o] = rgb[0]; b[o + 1] = rgb[1]; b[o + 2] = rgb[2]; b[o + 3] = inside ? 255 : 0;
  }
  return png(size, size, b);
}
const dir = path.join(__dirname, '..', 'src', 'renderer', 'assets');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'dot-green.png'), dot(16, [47, 170, 70]));
fs.writeFileSync(path.join(dir, 'dot-red.png'), dot(16, [194, 59, 59]));
fs.writeFileSync(path.join(dir, 'dot-orange.png'), dot(16, [224, 148, 34]));
fs.writeFileSync(path.join(dir, 'app.png'), rounded(256, [75, 46, 131], 0.18));
const bdir = path.join(__dirname, '..', 'build');
fs.mkdirSync(bdir, { recursive: true });
fs.writeFileSync(path.join(bdir, 'icon.png'), rounded(512, [75, 46, 131], 0.18));
console.log('icons ->', dir, '+ build/icon.png');
