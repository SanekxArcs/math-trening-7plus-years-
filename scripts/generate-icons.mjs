/**
 * Generates the PWA icon set from code, so there is no binary asset to keep in
 * sync by hand. Run with `node scripts/generate-icons.mjs`.
 *
 * Draws the four operators on the brand violet. Everything is built from
 * rectangles, discs and rotated bars, so no font or image library is needed.
 */
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public");

const BG = [0x6d, 0x28, 0xd9];
const FG = [0xff, 0xff, 0xff];

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const byte of buf) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(size, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // no filter
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Signed-distance helpers, all in 0..1 space. */
const bar = (x, y, cx, cy, w, h) => Math.abs(x - cx) <= w / 2 && Math.abs(y - cy) <= h / 2;
const disc = (x, y, cx, cy, r) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;

function rotated(x, y, cx, cy, w, h, angle) {
  const dx = x - cx;
  const dy = y - cy;
  const c = Math.cos(-angle);
  const s = Math.sin(-angle);
  return Math.abs(dx * c - dy * s) <= w / 2 && Math.abs(dx * s + dy * c) <= h / 2;
}

function glyph(op, x, y, cx, cy, s) {
  const t = s * 0.22; // stroke thickness
  switch (op) {
    case "add":
      return bar(x, y, cx, cy, s, t) || bar(x, y, cx, cy, t, s);
    case "sub":
      return bar(x, y, cx, cy, s, t);
    case "mul":
      return (
        rotated(x, y, cx, cy, s, t, Math.PI / 4) ||
        rotated(x, y, cx, cy, s, t, -Math.PI / 4)
      );
    case "div":
      return (
        bar(x, y, cx, cy, s, t) ||
        disc(x, y, cx, cy - s * 0.34, t * 0.62) ||
        disc(x, y, cx, cy + s * 0.34, t * 0.62)
      );
    default:
      return false;
  }
}

function render(size, { maskable = false, rounded = true } = {}) {
  const px = Buffer.alloc(size * size * 4);
  // Maskable icons must keep their content inside the safe circle, so the
  // glyph cluster shrinks while the background bleeds to the edges.
  const inset = maskable ? 0.3 : 0.22;
  const radius = rounded && !maskable ? size * 0.22 : 0;

  const cells = [
    ["add", 0.5 - inset / 2, 0.5 - inset / 2],
    ["mul", 0.5 + inset / 2, 0.5 - inset / 2],
    ["sub", 0.5 - inset / 2, 0.5 + inset / 2],
    ["div", 0.5 + inset / 2, 0.5 + inset / 2],
  ];
  const glyphSize = inset * 0.78;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const u = (x + 0.5) / size;
      const v = (y + 0.5) / size;

      let inside = true;
      if (radius > 0) {
        const rx = Math.min(x + 0.5, size - x - 0.5);
        const ry = Math.min(y + 0.5, size - y - 0.5);
        if (rx < radius && ry < radius) {
          inside = (radius - rx) ** 2 + (radius - ry) ** 2 <= radius * radius;
        }
      }

      if (!inside) {
        px[i + 3] = 0;
        continue;
      }

      const lit = cells.some(([op, cx, cy]) => glyph(op, u, v, cx, cy, glyphSize));
      const [r, g, b] = lit ? FG : BG;
      px[i] = r;
      px[i + 1] = g;
      px[i + 2] = b;
      px[i + 3] = 255;
    }
  }
  return encodePng(size, px);
}

mkdirSync(OUT, { recursive: true });

const files = [
  ["pwa-192.png", render(192)],
  ["pwa-512.png", render(512)],
  ["pwa-512-maskable.png", render(512, { maskable: true })],
  ["apple-touch-icon.png", render(180, { rounded: false })],
];

for (const [name, buffer] of files) {
  writeFileSync(join(OUT, name), buffer);
  console.log(`wrote public/${name} (${buffer.length} bytes)`);
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#6d28d9"/>
  <g fill="#fff">
    <rect x="12" y="19.2" width="16" height="3.6" rx="1.8"/>
    <rect x="18.2" y="13" width="3.6" height="16" rx="1.8"/>
    <rect x="36" y="41.2" width="16" height="3.6" rx="1.8"/>
    <g transform="rotate(45 44 21)">
      <rect x="36" y="19.2" width="16" height="3.6" rx="1.8"/>
      <rect x="42.2" y="13" width="3.6" height="16" rx="1.8"/>
    </g>
    <rect x="12" y="41.2" width="16" height="3.6" rx="1.8"/>
    <circle cx="20" cy="36.4" r="2.3"/>
    <circle cx="20" cy="49.6" r="2.3"/>
  </g>
</svg>
`;
writeFileSync(join(OUT, "favicon.svg"), svg);
console.log("wrote public/favicon.svg");
