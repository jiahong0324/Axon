const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    table[i] = c >>> 0;
  }
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodeRGBAtoPNG(width, height, rgbaBuffer) {
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const scanlines = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    scanlines[y * (width * 4 + 1)] = 0;
    rgbaBuffer.copy(scanlines, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }

  const idat = zlib.deflateSync(scanlines, { level: 9 });
  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', idat),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

function buildIco(pngList) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngList.length, 4);

  let currentOffset = 6 + pngList.length * 16;
  const entries = [];
  const imageBuffers = [];

  for (const item of pngList) {
    const entry = Buffer.alloc(16);
    entry[0] = item.width >= 256 ? 0 : item.width;
    entry[1] = item.height >= 256 ? 0 : item.height;
    entry[2] = 0;
    entry[3] = 0;
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(item.buffer.length, 8);
    entry.writeUInt32LE(currentOffset, 12);

    entries.push(entry);
    imageBuffers.push(item.buffer);
    currentOffset += item.buffer.length;
  }

  return Buffer.concat([header, ...entries, ...imageBuffers]);
}

// Read raw logo
const rootDir = path.resolve(__dirname, '..');
const srcBuf = fs.readFileSync(path.join(rootDir, 'public/icons/logo-colored.png'));
let offset = 8;
const idats = [];
let srcW, srcH;
while (offset < srcBuf.length) {
  const len = srcBuf.readUInt32BE(offset);
  const type = srcBuf.toString('ascii', offset + 4, offset + 8);
  if (type === 'IHDR') {
    srcW = srcBuf.readUInt32BE(offset + 8);
    srcH = srcBuf.readUInt32BE(offset + 12);
  } else if (type === 'IDAT') {
    idats.push(srcBuf.subarray(offset + 8, offset + 8 + len));
  }
  offset += 12 + len;
}
const srcRaw = zlib.inflateSync(Buffer.concat(idats));
const srcStride = 1 + srcW * 4;

const minX = 51, maxX = 147, minY = 36, maxY = 143;
const cropW = maxX - minX + 1;
const cropH = maxY - minY + 1;

function sampleCrop(u, v) {
  if (u < 0 || u > 1 || v < 0 || v > 1) return [0, 0, 0, 0];
  const px = minX + u * (cropW - 1);
  const py = minY + v * (cropH - 1);
  const x0 = Math.floor(px);
  const y0 = Math.floor(py);
  const x1 = Math.min(maxX, x0 + 1);
  const y1 = Math.min(maxY, y0 + 1);
  const fx = px - x0;
  const fy = py - y0;

  function getPixel(x, y) {
    const idx = y * srcStride + 1 + x * 4;
    return [srcRaw[idx], srcRaw[idx+1], srcRaw[idx+2], srcRaw[idx+3]];
  }

  const p00 = getPixel(x0, y0);
  const p10 = getPixel(x1, y0);
  const p01 = getPixel(x0, y1);
  const p11 = getPixel(x1, y1);

  const res = [0, 0, 0, 0];
  for (let c = 0; c < 4; c++) {
    const top = p00[c] * (1 - fx) + p10[c] * fx;
    const bot = p01[c] * (1 - fx) + p11[c] * fx;
    res[c] = top * (1 - fy) + bot * fy;
  }
  return res;
}

function renderFaviconBuffer(size, mode) {
  const out = Buffer.alloc(size * size * 4);
  const center = size / 2;
  const radius = size * 0.46; // circle radius (~92% diameter)
  const logoScale = mode === 'transparent' ? 0.82 : 0.68;
  const logoW = radius * 2 * logoScale * (cropW / cropH);
  const logoH = radius * 2 * logoScale;
  const logoLeft = center - logoW / 2;
  const logoTop = center - logoH / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx = x + 0.5 - center;
      const dy = y + 0.5 - center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let bgR = 0, bgG = 0, bgB = 0, bgA = 0;

      if (mode === 'google_white') {
        const edgeDist = radius - dist;
        const circleAlpha = Math.max(0, Math.min(1, edgeDist + 0.5));
        bgR = 255; bgG = 255; bgB = 255;
        bgA = circleAlpha;
      } else if (mode === 'dark_circle') {
        const edgeDist = radius - dist;
        const circleAlpha = Math.max(0, Math.min(1, edgeDist + 0.5));
        const isRim = dist > radius - 1.5 && dist <= radius;
        if (isRim) {
          bgR = 99; bgG = 102; bgB = 241; // indigo rim
        } else {
          bgR = 15; bgG = 23; bgB = 42; // slate-900
        }
        bgA = circleAlpha;
      } else if (mode === 'squircle') {
        const r = size * 0.28;
        const qx = Math.abs(x + 0.5 - center) - (center - r);
        const qy = Math.abs(y + 0.5 - center) - (center - r);
        let cornerDist = 0;
        if (qx > 0 && qy > 0) cornerDist = Math.sqrt(qx * qx + qy * qy) - r;
        else cornerDist = Math.max(qx, qy) - r;
        const squircleAlpha = Math.max(0, Math.min(1, -cornerDist + 0.5));
        bgR = 15; bgG = 23; bgB = 42;
        bgA = squircleAlpha;
      } else {
        bgA = 0;
      }

      const u = (x + 0.5 - logoLeft) / logoW;
      const v = (y + 0.5 - logoTop) / logoH;
      const [fgR, fgG, fgB, fgA_raw] = sampleCrop(u, v);
      const fgA = fgA_raw / 255;

      const finalA = fgA + bgA * (1 - fgA);
      if (finalA > 0.001) {
        const r = Math.round((fgR * fgA + bgR * bgA * (1 - fgA)) / finalA);
        const g = Math.round((fgG * fgA + bgG * bgA * (1 - fgA)) / finalA);
        const b = Math.round((fgB * fgA + bgB * bgA * (1 - fgA)) / finalA);
        out[idx] = Math.max(0, Math.min(255, r));
        out[idx + 1] = Math.max(0, Math.min(255, g));
        out[idx + 2] = Math.max(0, Math.min(255, b));
        out[idx + 3] = Math.max(0, Math.min(255, Math.round(finalA * 255)));
      } else {
        out[idx] = 0; out[idx + 1] = 0; out[idx + 2] = 0; out[idx + 3] = 0;
      }
    }
  }
  return encodeRGBAtoPNG(size, size, out);
}

function applyFaviconMode(mode) {
  console.log(`Applying favicon mode: ${mode}...`);
  const publicDir = path.join(rootDir, 'public');
  const iconsDir = path.join(publicDir, 'icons');

  const p16 = renderFaviconBuffer(16, mode);
  const p32 = renderFaviconBuffer(32, mode);
  const p48 = renderFaviconBuffer(48, mode);
  const p64 = renderFaviconBuffer(64, mode);
  const p192 = renderFaviconBuffer(192, mode);
  const p512 = renderFaviconBuffer(512, mode);

  // Write PNG icons
  fs.writeFileSync(path.join(publicDir, 'favicon-32x32.png'), p32);
  fs.writeFileSync(path.join(publicDir, 'favicon-16x16.png'), p16);
  fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), p192);
  fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), p512);
  fs.writeFileSync(path.join(iconsDir, 'logo.png'), p512); // smooth rounded logo!
  fs.writeFileSync(path.join(iconsDir, 'favicon-circle.png'), p192);

  // Write multi-resolution .ico
  const icoBuffer = buildIco([
    { width: 16, height: 16, buffer: p16 },
    { width: 32, height: 32, buffer: p32 },
    { width: 48, height: 48, buffer: p48 },
    { width: 64, height: 64, buffer: p64 }
  ]);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);

  // Write SVG favicon with perfect vector circle
  const p192Base64 = p192.toString('base64');
  let svgContent = '';
  if (mode === 'google_white') {
    svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <circle cx="64" cy="64" r="59" fill="#FFFFFF" />
  <image href="data:image/png;base64,${p192Base64}" x="0" y="0" width="128" height="128" />
</svg>`;
  } else if (mode === 'dark_circle') {
    svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <circle cx="64" cy="64" r="59" fill="#0F172A" stroke="#6366F1" stroke-width="2" />
  <image href="data:image/png;base64,${p192Base64}" x="0" y="0" width="128" height="128" />
</svg>`;
  } else {
    svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <image href="data:image/png;base64,${p192Base64}" x="0" y="0" width="128" height="128" />
</svg>`;
  }
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgContent);

  console.log('Favicon assets generated successfully!');
}

module.exports = {
  renderFaviconBuffer,
  applyFaviconMode
};

if (require.main === module) {
  const mode = process.argv[2] || 'google_white';
  applyFaviconMode(mode);
}
