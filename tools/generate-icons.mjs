/*!
 * generate-icons.mjs - draws the built-in default logo, with no dependencies.
 *
 *   node tools/generate-icons.mjs            keeps any artwork already there
 *   node tools/generate-icons.mjs --force    overwrites it
 *
 * The app only ever references icons/icon-48.png and icons/icon-96.png, so a
 * deployment can drop its own artwork over those two names and be done. Since
 * those two files ARE the brand, this script refuses to overwrite them unless
 * --force is given: a rebranded deployment must not lose its mark to a stray
 * build step.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, '..', 'icons');

/* -------------------------------------------------------------- PNG writer */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;                       // filter type 0 (None)
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;    // bit depth
  ihdr[9] = 6;    // colour type RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

/* ------------------------------------------------------------- the artwork */

const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];

const BG_TOP = hex('#206e4c');
const BG_BOTTOM = hex('#0e3a29');
const FACE = hex('#f8f4eb');
const ROOK = hex('#123f2c');
const BEZEL = hex('#f8f4eb');
const BEZEL_ALPHA = 0.45;

const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

function insideRoundRect(x, y, cx, cy, hw, hh, r) {
  const dx = Math.abs(x - cx) - (hw - r);
  const dy = Math.abs(y - cy) - (hh - r);
  if (dx <= 0 && dy <= 0) return true;
  const ax = Math.max(dx, 0);
  const ay = Math.max(dy, 0);
  return ax * ax + ay * ay <= r * r;
}

function insideCircle(x, y, cx, cy, r) {
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

function insideRect(x, y, x0, y0, x1, y1) {
  return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}

/* A castle, described the way a chess player sees it: three merlons, a collar,
   a tapering body and a two step foot. */
const ROOK_PARTS = [
  [0.320, 0.270, 0.405, 0.355],   // left merlon
  [0.455, 0.270, 0.545, 0.355],   // centre merlon
  [0.595, 0.270, 0.680, 0.355],   // right merlon
  [0.320, 0.355, 0.680, 0.430],   // collar band
  [0.405, 0.430, 0.595, 0.470],   // neck
  [0.375, 0.470, 0.625, 0.665],   // body
  [0.335, 0.665, 0.665, 0.715],   // base
  [0.310, 0.715, 0.690, 0.775]    // foot
];

/** Colour of the artwork at one sub-pixel sample, or null for transparent. */
function sample(x, y) {
  if (!insideRoundRect(x, y, 0.5, 0.5, 0.5, 0.5, 0.225)) return null;
  let colour = mix(BG_TOP, BG_BOTTOM, y);
  if (insideCircle(x, y, 0.5, 0.525, 0.352)) colour = mix(colour, BEZEL, BEZEL_ALPHA);
  if (insideCircle(x, y, 0.5, 0.525, 0.322)) colour = FACE;
  for (const [x0, y0, x1, y1] of ROOK_PARTS) {
    if (insideRect(x, y, x0, y0, x1, y1)) { colour = ROOK; break; }
  }
  return colour;
}

function render(size, ss = 4) {
  const rgba = Buffer.alloc(size * size * 4);
  const step = 1 / (size * ss);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, cover = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const x = (px * ss + sx + 0.5) * step;
          const y = (py * ss + sy + 0.5) * step;
          const c = sample(x, y);
          if (c) { r += c[0]; g += c[1]; b += c[2]; cover++; }
        }
      }
      const total = ss * ss;
      const i = (py * size + px) * 4;
      if (cover === 0) continue;
      // Premultiplied average keeps edge pixels from fringing with black.
      rgba[i] = Math.round(r / cover);
      rgba[i + 1] = Math.round(g / cover);
      rgba[i + 2] = Math.round(b / cover);
      rgba[i + 3] = Math.round((cover / total) * 255);
    }
  }
  return encodePng(size, size, rgba);
}

const FORCE = process.argv.includes('--force');

fs.mkdirSync(OUT, { recursive: true });
for (const size of [48, 96]) {
  const file = path.join(OUT, 'icon-' + size + '.png');
  const label = path.relative(path.resolve(HERE, '..'), file) + '  (' + size + 'x' + size + ')';
  if (fs.existsSync(file) && !FORCE) {
    console.log('kept  ' + label + '  - already exists, pass --force to overwrite');
    continue;
  }
  fs.writeFileSync(file, render(size, size <= 48 ? 6 : 4));
  console.log('wrote ' + label);
}
