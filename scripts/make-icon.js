// Generates resources/icon.png (256x256) and resources/icon.ico without any dependencies.
//   node scripts/make-icon.js
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const SIZE = 256;
const px = Buffer.alloc(SIZE * SIZE * 4);

function crcTable() {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
}
const CRC = crcTable();
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

// Signed distance to a rounded rectangle centred at (cx, cy)
function roundedRect(x, y, cx, cy, hw, hh, r) {
  const dx = Math.abs(x - cx) - (hw - r), dy = Math.abs(y - cy) - (hh - r);
  return Math.min(Math.max(dx, dy), 0) + Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) - r;
}
const cover = d => Math.max(0, Math.min(1, 0.5 - d)); // 1px anti-aliasing

for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const bg = cover(roundedRect(x + 0.5, y + 0.5, 128, 128, 120, 120, 52));
    // White medical cross
    const cross = Math.max(
      cover(roundedRect(x + 0.5, y + 0.5, 128, 128, 30, 82, 12)),
      cover(roundedRect(x + 0.5, y + 0.5, 128, 128, 82, 30, 12))
    );
    const t = y / SIZE; // vertical teal gradient #0891b2 -> #0e7490
    const base = [8 + (14 - 8) * t, 145 + (116 - 145) * t, 178 + (144 - 178) * t];
    const i = (y * SIZE + x) * 4;
    px[i] = Math.round(base[0] + (255 - base[0]) * cross);
    px[i + 1] = Math.round(base[1] + (255 - base[1]) * cross);
    px[i + 2] = Math.round(base[2] + (255 - base[2]) * cross);
    px[i + 3] = Math.round(255 * bg);
  }
}

const raw = Buffer.alloc((SIZE * 4 + 1) * SIZE);
for (let y = 0; y < SIZE; y++) {
  raw[y * (SIZE * 4 + 1)] = 0;
  px.copy(raw, y * (SIZE * 4 + 1) + 1, y * SIZE * 4, (y + 1) * SIZE * 4);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0); ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
]);

// ICO container holding the PNG (supported since Windows Vista)
const ico = Buffer.alloc(22);
ico.writeUInt16LE(0, 0); ico.writeUInt16LE(1, 2); ico.writeUInt16LE(1, 4);
ico[6] = 0; ico[7] = 0; // 0 means 256
ico.writeUInt16LE(1, 10); ico.writeUInt16LE(32, 12);
ico.writeUInt32LE(png.length, 14); ico.writeUInt32LE(22, 18);

const dir = path.join(__dirname, '..', 'resources');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'icon.png'), png);
fs.writeFileSync(path.join(dir, 'icon.ico'), Buffer.concat([ico, png]));
console.log(`Wrote ${path.join(dir, 'icon.png')} and icon.ico`);
