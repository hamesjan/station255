// Median-cut color quantization — extracts a representative palette from pixels.
// Pure, dependency-free, runs in the browser.

export type RGB = { r: number; g: number; b: number };

type Box = { pixels: RGB[] };

function channelRange(pixels: RGB[], ch: keyof RGB): number {
  let min = 255;
  let max = 0;
  for (const p of pixels) {
    const v = p[ch];
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return max - min;
}

function widestChannel(pixels: RGB[]): keyof RGB {
  const r = channelRange(pixels, 'r');
  const g = channelRange(pixels, 'g');
  const b = channelRange(pixels, 'b');
  if (r >= g && r >= b) return 'r';
  if (g >= r && g >= b) return 'g';
  return 'b';
}

function average(pixels: RGB[]): RGB {
  let r = 0,
    g = 0,
    b = 0;
  for (const p of pixels) {
    r += p.r;
    g += p.g;
    b += p.b;
  }
  const n = pixels.length || 1;
  return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) };
}

/**
 * Extract up to `count` colors from ImageData using median cut.
 * Samples at most ~20k pixels for speed.
 */
export function extractPalette(data: ImageData, count: number): RGB[] {
  const { data: buf, width, height } = data;
  const total = width * height;
  const step = Math.max(1, Math.floor(total / 20000));

  const pixels: RGB[] = [];
  for (let i = 0; i < total; i += step) {
    const o = i * 4;
    if (buf[o + 3] < 128) continue; // skip mostly-transparent
    pixels.push({ r: buf[o], g: buf[o + 1], b: buf[o + 2] });
  }
  if (pixels.length === 0) return [];

  let boxes: Box[] = [{ pixels }];

  while (boxes.length < count) {
    // Split the box with the most pixels (that can still be split).
    let target = -1;
    let best = 1;
    for (let i = 0; i < boxes.length; i++) {
      if (boxes[i].pixels.length > best) {
        best = boxes[i].pixels.length;
        target = i;
      }
    }
    if (target === -1) break;

    const box = boxes[target];
    const ch = widestChannel(box.pixels);
    box.pixels.sort((a, b) => a[ch] - b[ch]);
    const mid = box.pixels.length >> 1;
    const a: Box = { pixels: box.pixels.slice(0, mid) };
    const b: Box = { pixels: box.pixels.slice(mid) };
    boxes.splice(target, 1, a, b);
  }

  return boxes
    .filter((box) => box.pixels.length > 0)
    .map((box) => average(box.pixels));
}

export function toHex({ r, g, b }: RGB): string {
  const h = (n: number) => n.toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

/** Perceived luminance 0–255, for choosing readable label color. */
export function luminance({ r, g, b }: RGB): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}
