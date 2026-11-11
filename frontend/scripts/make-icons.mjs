// Genera los iconos PNG de la app (public/icons) sin dependencias: dibuja a
// Bola, la pelota de pádel, píxel a píxel. Ejecutar con `npm run icons` si se
// cambia el dibujo; los PNG generados se guardan en el repositorio.
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const NAVY = [34, 48, 74];
const LIME = [216, 242, 74];
const WHITE = [255, 255, 255];

/**
 * Color del icono en el punto (u, v), ambos entre 0 y 1; null es transparente.
 * `ball` es el radio de la pelota y `corner` el radio de las esquinas.
 */
function shade(u, v, { ball, corner }) {
  if (corner > 0) {
    const dx = Math.max(Math.abs(u - 0.5) - (0.5 - corner), 0);
    const dy = Math.max(Math.abs(v - 0.5) - (0.5 - corner), 0);
    if (Math.hypot(dx, dy) > corner) {
      return null;
    }
  }
  // Coordenadas relativas a la pelota: centro (0, 0) y radio 1.
  const x = (u - 0.5) / ball;
  const y = (v - 0.5) / ball;
  if (Math.hypot(x, y) > 1) {
    return NAVY;
  }
  const inEye = (cx) => ((x - cx) / 0.11) ** 2 + ((y + 0.04) / 0.16) ** 2 < 1;
  if (inEye(-0.3) || inEye(0.3)) {
    return NAVY;
  }
  const smile = Math.hypot(x, y - 0.16);
  if (Math.abs(smile - 0.3) < 0.048 && y > 0.29) {
    return NAVY;
  }
  const onSeam = (cx) => Math.abs(Math.hypot(x - cx, y) - 0.92) < 0.052;
  if (onSeam(-1.55) || onSeam(1.55)) {
    return WHITE;
  }
  return LIME;
}

/** Dibuja el icono con suavizado: cada píxel es la media de 4 x 4 muestras. */
function draw(size, options) {
  const samples = 4;
  const row = size * 4 + 1;
  const raw = Buffer.alloc(row * size);
  for (let py = 0; py < size; py++) {
    raw[py * row] = 0; // filtro PNG "none"
    for (let px = 0; px < size; px++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const color = shade((px + (sx + 0.5) / samples) / size, (py + (sy + 0.5) / samples) / size, options);
          if (color) {
            r += color[0];
            g += color[1];
            b += color[2];
            a += 1;
          }
        }
      }
      const offset = py * row + 1 + px * 4;
      raw[offset] = a ? Math.round(r / a) : 0;
      raw[offset + 1] = a ? Math.round(g / a) : 0;
      raw[offset + 2] = a ? Math.round(b / a) : 0;
      raw[offset + 3] = Math.round((a / (samples * samples)) * 255);
    }
  }
  return encodePng(size, raw);
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return c >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(size, raw) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bits por canal
  header[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const outDir = new URL('../public/icons/', import.meta.url);
mkdirSync(outDir, { recursive: true });

const icons = [
  // Iconos normales: esquinas redondeadas y transparentes.
  { file: 'icon-192.png', size: 192, ball: 0.36, corner: 0.22 },
  { file: 'icon-512.png', size: 512, ball: 0.36, corner: 0.22 },
  // "Maskable": a sangre y con la pelota dentro de la zona segura que Android no recorta.
  { file: 'icon-maskable-512.png', size: 512, ball: 0.3, corner: 0 },
  // iOS pone sus propias esquinas y no admite transparencia.
  { file: 'apple-touch-icon.png', size: 180, ball: 0.36, corner: 0 },
];

for (const { file, size, ...options } of icons) {
  writeFileSync(new URL(file, outDir), draw(size, options));
  console.log(`public/icons/${file} (${size}x${size})`);
}
