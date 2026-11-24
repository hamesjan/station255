// Minimal GIF89a encoder — global 256-color palette (median cut), LZW compression,
// infinite loop. Pure, dependency-free, runs in the browser.

import { extractPalette, type RGB } from './palette';

export type GifFrame = { data: ImageData };

/** LZW-compress a stream of palette indices (8-bit min code size). */
function lzwEncode(indices: Uint8Array): Uint8Array {
  const minCodeSize = 8;
  const clear = 1 << minCodeSize;
  const eoi = clear + 1;

  const bytes: number[] = [];
  let acc = 0;
  let accBits = 0;
  let codeSize = minCodeSize + 1;
  let maxcode = (1 << codeSize) - 1;
  let nextCode = eoi + 1;
  let dict = new Map<number, number>();

  const emit = (code: number) => {
    acc |= code << accBits;
    accBits += codeSize;
    while (accBits >= 8) {
      bytes.push(acc & 0xff);
      acc >>>= 8;
      accBits -= 8;
    }
    if (nextCode > maxcode && codeSize < 12) {
      codeSize++;
      maxcode = (1 << codeSize) - 1;
    }
  };

  emit(clear);
  let prefix = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i];
    const key = (prefix << 8) | k;
    const found = dict.get(key);
    if (found !== undefined) {
      prefix = found;
      continue;
    }
    emit(prefix);
    if (nextCode < 4096) {
      dict.set(key, nextCode++);
    } else {
      emit(clear);
      dict = new Map();
      nextCode = eoi + 1;
      codeSize = minCodeSize + 1;
      maxcode = (1 << codeSize) - 1;
    }
    prefix = k;
  }
  emit(prefix);
  emit(eoi);
  if (accBits > 0) bytes.push(acc & 0xff);
  return Uint8Array.from(bytes);
}

function nearestIndex(palette: RGB[], r: number, g: number, b: number): number {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < palette.length; i++) {
    const p = palette[i];
    const d = (p.r - r) ** 2 + (p.g - g) ** 2 + (p.b - b) ** 2;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

/**
 * Encode frames (all the same dimensions) into an animated GIF.
 * `delayMs` applies to every frame; loops forever.
 */
export function encodeGif(frames: GifFrame[], delayMs: number): Uint8Array {
  if (frames.length === 0) throw new Error('no frames');
  const { width, height } = frames[0].data;

  // Build one global palette by sampling all frames into a shared pixel pool.
  const sampleW = 64;
  const sampleH = 64;
  const pool = new Uint8ClampedArray(sampleW * sampleH * frames.length * 4);
  frames.forEach((f, fi) => {
    const src = f.data.data;
    const n = sampleW * sampleH;
    for (let i = 0; i < n; i++) {
      const sx = Math.floor(((i % sampleW) / sampleW) * width);
      const sy = Math.floor((Math.floor(i / sampleW) / sampleH) * height);
      const so = (sy * width + sx) * 4;
      const po = (fi * n + i) * 4;
      pool[po] = src[so];
      pool[po + 1] = src[so + 1];
      pool[po + 2] = src[so + 2];
      pool[po + 3] = 255;
    }
  });
  const palette = extractPalette(new ImageData(pool, sampleW, sampleH * frames.length), 256);
  while (palette.length < 2) palette.push({ r: 0, g: 0, b: 0 });

  const out: number[] = [];
  const push = (...v: number[]) => out.push(...v);
  const pushU16 = (v: number) => push(v & 0xff, (v >> 8) & 0xff);
  const pushStr = (s: string) => {
    for (const ch of s) push(ch.charCodeAt(0));
  };

  // Header + logical screen descriptor (global color table, 256 entries).
  pushStr('GIF89a');
  pushU16(width);
  pushU16(height);
  push(0xf7, 0, 0);
  for (let i = 0; i < 256; i++) {
    const p = palette[i] ?? { r: 0, g: 0, b: 0 };
    push(p.r, p.g, p.b);
  }

  // NETSCAPE2.0 loop-forever extension.
  push(0x21, 0xff, 0x0b);
  pushStr('NETSCAPE2.0');
  push(0x03, 0x01);
  pushU16(0);
  push(0x00);

  const delay = Math.max(2, Math.round(delayMs / 10));
  const cache = new Map<number, number>();

  for (const frame of frames) {
    // Graphic control extension (delay, no transparency).
    push(0x21, 0xf9, 0x04, 0x04);
    pushU16(delay);
    push(0x00, 0x00);

    // Image descriptor (no local color table).
    push(0x2c);
    pushU16(0);
    pushU16(0);
    pushU16(width);
    pushU16(height);
    push(0x00);

    const src = frame.data.data;
    const indices = new Uint8Array(width * height);
    for (let i = 0; i < indices.length; i++) {
      const o = i * 4;
      const a = src[o + 3];
      // Composite semi-transparent pixels onto white.
      const r = a === 255 ? src[o] : Math.round(src[o] * (a / 255) + 255 * (1 - a / 255));
      const g = a === 255 ? src[o + 1] : Math.round(src[o + 1] * (a / 255) + 255 * (1 - a / 255));
      const b = a === 255 ? src[o + 2] : Math.round(src[o + 2] * (a / 255) + 255 * (1 - a / 255));
      const key = (r << 16) | (g << 8) | b;
      let idx = cache.get(key);
      if (idx === undefined) {
        idx = nearestIndex(palette, r, g, b);
        cache.set(key, idx);
      }
      indices[i] = idx;
    }

    push(0x08); // LZW min code size
    const compressed = lzwEncode(indices);
    for (let i = 0; i < compressed.length; i += 255) {
      const chunk = compressed.subarray(i, i + 255);
      push(chunk.length);
      for (let j = 0; j < chunk.length; j++) push(chunk[j]);
    }
    push(0x00);
  }

  push(0x3b);
  return Uint8Array.from(out);
}
