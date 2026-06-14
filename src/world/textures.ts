import * as THREE from 'three';
import { PALETTE, NATURE } from '../config';

// Every texture in the game is painted procedurally onto a small 2D canvas and
// sampled with NearestFilter. Small source + nearest sampling is what gives the
// chunky, unfiltered Doom look while keeping everything self-contained.

type Painter = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

function makeTexture(w: number, h: number, paint: Painter): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  paint(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function fill(ctx: CanvasRenderingContext2D, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
}

// A faint per-pixel grain keeps big flat surfaces from looking dead.
function grain(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number): void {
  const img = ctx.getImageData(0, 0, w, h);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() * 2 - 1) * amount;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

function softCloud(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = PALETTE.cloud;
  for (let i = 0; i < 7; i++) {
    const ox = (Math.random() * 2 - 1) * 20;
    const oy = (Math.random() * 2 - 1) * 7;
    const r = 6 + Math.random() * 9;
    ctx.beginPath();
    ctx.arc(x + ox, y + oy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export const floorTexture = (): THREE.CanvasTexture =>
  makeTexture(64, 64, (ctx, w, h) => {
    fill(ctx, w, h, PALETTE.floorTile);
    ctx.strokeStyle = PALETTE.floorGrout;
    ctx.lineWidth = 2;
    for (let i = 0; i <= 2; i++) {
      const p = Math.round((i * w) / 2) + 0.5;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(w, p);
      ctx.stroke();
    }
    grain(ctx, w, h, 6);
  });

export const wallTexture = (): THREE.CanvasTexture =>
  makeTexture(64, 64, (ctx, w, h) => {
    fill(ctx, w, h, PALETTE.wallPanel);
    ctx.fillStyle = PALETTE.wallLine;
    for (let x = 0; x < w; x += 16) ctx.fillRect(x, 0, 2, h); // vertical seams
    ctx.fillRect(0, Math.round(h * 0.68), w, 2); // a horizontal trim band
    grain(ctx, w, h, 5);
  });

export const canopyTexture = (): THREE.CanvasTexture =>
  makeTexture(64, 64, (ctx, w, h) => {
    fill(ctx, w, h, PALETTE.canopy);
    ctx.fillStyle = PALETTE.wallLine;
    for (let y = 0; y < h; y += 16) ctx.fillRect(0, y, w, 2); // beams
    grain(ctx, w, h, 4);
  });

export const pillarTexture = (): THREE.CanvasTexture =>
  makeTexture(32, 64, (ctx, w, h) => {
    fill(ctx, w, h, PALETTE.pillar);
    ctx.fillStyle = PALETTE.wallLine;
    ctx.fillRect(0, 0, 2, h);
    ctx.fillRect(w - 2, 0, 2, h);
    grain(ctx, w, h, 4);
  });

export const platformSideTexture = (): THREE.CanvasTexture =>
  makeTexture(32, 32, (ctx, w, h) => {
    fill(ctx, w, h, PALETTE.platformSide);
    ctx.fillStyle = PALETTE.wallLine;
    for (let y = 0; y < h; y += 10) ctx.fillRect(0, y, w, 1);
    grain(ctx, w, h, 5);
  });

export const pitTexture = (): THREE.CanvasTexture =>
  makeTexture(32, 32, (ctx, w, h) => {
    fill(ctx, w, h, PALETTE.pitFloor);
    grain(ctx, w, h, 8);
  });

export const edgeStripTexture = (): THREE.CanvasTexture =>
  makeTexture(32, 8, (ctx, w, h) => {
    fill(ctx, w, h, PALETTE.edgeStrip);
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    for (let x = 0; x < w; x += 6) ctx.fillRect(x, 0, 3, h); // tactile dashes
  });

// The platform-facing side of the train: trim bands and a row of windows with a
// door interrupting the pattern. Repeats along the train's length.
export const trainSideTexture = (): THREE.CanvasTexture =>
  makeTexture(128, 64, (ctx, w, h) => {
    fill(ctx, w, h, PALETTE.trainBody);
    ctx.fillStyle = PALETTE.trainTrim;
    ctx.fillRect(0, 5, w, 4);
    ctx.fillRect(0, h - 9, w, 4);

    const winY = 18;
    const winH = 22;
    ctx.fillStyle = PALETTE.trainSill;
    ctx.fillRect(0, winY - 3, w, winH + 6);

    const cols = 4;
    const gap = 6;
    const ww = (w - gap * (cols + 1)) / cols;
    for (let i = 0; i < cols; i++) {
      const x = gap + i * (ww + gap);
      if (i === 2) {
        // a door: body-colored panel with a small window and a seam
        ctx.fillStyle = PALETTE.trainBody;
        ctx.fillRect(x, 10, ww, h - 19);
        ctx.fillStyle = PALETTE.trainTrim;
        ctx.fillRect(x + ww / 2 - 1, 10, 2, h - 19);
        ctx.fillStyle = PALETTE.trainWindow;
        ctx.fillRect(x + 3, winY, ww - 6, winH - 6);
      } else {
        ctx.fillStyle = PALETTE.trainWindow;
        ctx.fillRect(x, winY, ww, winH);
      }
    }
  });

export const trainBodyTexture = (): THREE.CanvasTexture =>
  makeTexture(32, 32, (ctx, w, h) => {
    fill(ctx, w, h, PALETTE.trainBody);
    ctx.fillStyle = PALETTE.trainTrim;
    ctx.fillRect(0, 5, w, 3);
    ctx.fillRect(0, h - 8, w, 3);
    grain(ctx, w, h, 4);
  });

// A vertical sky gradient with a few soft clouds. Mapped onto the inside of a
// big dome; we drift it horizontally over time for a calm sense of motion.
export const skyTexture = (): THREE.CanvasTexture => {
  const tex = makeTexture(256, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, PALETTE.skyTop);
    g.addColorStop(0.55, PALETTE.skyBottom);
    g.addColorStop(1, PALETTE.skyBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 5; i++) {
      softCloud(ctx, Math.random() * w, 24 + Math.random() * 64);
    }
  });
  tex.wrapT = THREE.ClampToEdgeWrapping; // only drift horizontally
  return tex;
};

// ---------------------------------------------------------------------------
// Nature: ground, water
// ---------------------------------------------------------------------------

// Grassy ground beyond the platform: a mottled green with scattered blades and
// the odd wildflower fleck, so the distance reads as a real meadow.
export const grassTexture = (): THREE.CanvasTexture =>
  makeTexture(64, 64, (ctx, w, h) => {
    fill(ctx, w, h, NATURE.grass);
    for (let i = 0; i < 240; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      ctx.fillStyle = Math.random() < 0.5 ? NATURE.grassDark : NATURE.grassLight;
      ctx.fillRect(x, y, 1, 1 + Math.round(Math.random() * 2));
    }
    const flowers = [NATURE.flowerA, NATURE.flowerB, NATURE.flowerC, NATURE.flowerD];
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = flowers[i % flowers.length];
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
    grain(ctx, w, h, 5);
  });

// Calm water: layered blue with a few foam glints. Scrolled slowly in the world
// update so the surface shimmers.
export const waterTexture = (): THREE.CanvasTexture =>
  makeTexture(64, 64, (ctx, w, h) => {
    fill(ctx, w, h, NATURE.water);
    ctx.fillStyle = NATURE.waterDeep;
    for (let i = 0; i < 60; i++) {
      ctx.fillRect(Math.random() * w, Math.random() * h, 3 + Math.random() * 6, 1);
    }
    ctx.fillStyle = NATURE.waterFoam;
    for (let i = 0; i < 26; i++) {
      ctx.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 1);
    }
    grain(ctx, w, h, 4);
  });

// ---------------------------------------------------------------------------
// Subway: tiled walls, concrete, lockers
// ---------------------------------------------------------------------------

// Glossy metro wall tiles: offset "brick" courses with grout, the odd accent
// tile of color so the corridors don't read as a single flat slab.
export const subwayTileTexture = (): THREE.CanvasTexture =>
  makeTexture(64, 64, (ctx, w, h) => {
    fill(ctx, w, h, PALETTE.tileGrout);
    const tw = 16;
    const th = 8;
    for (let row = 0; row * th < h; row++) {
      const offset = row % 2 ? tw / 2 : 0;
      for (let col = -1; col * tw < w; col++) {
        const x = col * tw + offset + 1;
        const y = row * th + 1;
        ctx.fillStyle = Math.random() < 0.06 ? PALETTE.tileAccent : PALETTE.tileWall;
        ctx.fillRect(x, y, tw - 2, th - 2);
        // a soft highlight along the top edge = "glossy"
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(x, y, tw - 2, 1);
      }
    }
    grain(ctx, w, h, 4);
  });

export const concreteTexture = (): THREE.CanvasTexture =>
  makeTexture(64, 64, (ctx, w, h) => {
    fill(ctx, w, h, PALETTE.concrete);
    ctx.strokeStyle = PALETTE.concreteDark;
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * w, Math.random() * h);
      ctx.lineTo(Math.random() * w, Math.random() * h);
      ctx.stroke();
    }
    // expansion-joint lines
    ctx.fillStyle = PALETTE.concreteDark;
    ctx.fillRect(0, Math.round(h / 2), w, 1);
    ctx.fillRect(Math.round(w / 2), 0, 1, h);
    grain(ctx, w, h, 9);
  });

// One locker door; repeated across a bank. Vents, a handle, and a number plate.
export const lockerTexture = (): THREE.CanvasTexture =>
  makeTexture(32, 64, (ctx, w, h) => {
    fill(ctx, w, h, PALETTE.locker);
    ctx.fillStyle = PALETTE.lockerTrim;
    ctx.fillRect(0, 0, 2, h);
    ctx.fillRect(w - 2, 0, 2, h);
    ctx.fillRect(0, 0, w, 2);
    ctx.fillRect(0, h - 2, w, 2);
    // vents near the top
    ctx.fillStyle = PALETTE.lockerTrim;
    for (let i = 0; i < 3; i++) ctx.fillRect(6, 6 + i * 3, w - 12, 1);
    // handle
    ctx.fillStyle = PALETTE.lockerHandle;
    ctx.fillRect(w - 9, h * 0.5, 4, 10);
    // number plate
    ctx.fillStyle = '#e9eef2';
    ctx.fillRect(7, 16, 10, 6);
    ctx.fillStyle = PALETTE.lockerTrim;
    ctx.fillRect(9, 18, 2, 2);
    ctx.fillRect(13, 18, 2, 2);
  });

// Concentric rings for the anomalous indoor puddle that ripples on its own.
export const rippleTexture = (): THREE.CanvasTexture =>
  spriteTexture(64, 64, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h / 2;
    ctx.fillStyle = '#bfe9ff';
    ctx.beginPath();
    ctx.arc(cx, cy, w / 2 - 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    for (let r = 6; r < w / 2; r += 8) {
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  });

// ---------------------------------------------------------------------------
// Sprites & wall art
// ---------------------------------------------------------------------------

// Like makeTexture but clamped instead of repeated — for billboard cutouts and
// framed wall art that should not tile.
export function spriteTexture(w: number, h: number, paint: Painter): THREE.CanvasTexture {
  const t = makeTexture(w, h, paint);
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

const FRAME = '#3a4a3f';

export const posterTexture = (variant: number): THREE.CanvasTexture =>
  spriteTexture(64, 96, (ctx, w, h) => {
    fill(ctx, w, h, FRAME); // frame
    const m = 4;
    const iw = w - m * 2;
    const ih = h - m * 2;
    ctx.save();
    ctx.translate(m, m);
    if (variant % 3 === 0) {
      fill(ctx, iw, ih, '#fbf6e7');
      const cx = iw / 2;
      const cy = ih * 0.62;
      const rings = ['#f4c98a', '#9ed8a8', '#8fc6ff'];
      for (let i = 3; i >= 1; i--) {
        ctx.fillStyle = rings[i - 1];
        ctx.beginPath();
        ctx.arc(cx, cy, i * 11, Math.PI, 0);
        ctx.fill();
      }
      ctx.fillStyle = '#f0e2a0';
      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      ctx.fill();
    } else if (variant % 3 === 1) {
      const g = ctx.createLinearGradient(0, 0, 0, ih);
      g.addColorStop(0, '#bfe6ff');
      g.addColorStop(1, '#e7f3ec');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, iw, ih);
      ctx.fillStyle = '#6cae79';
      ctx.beginPath();
      ctx.moveTo(0, ih);
      ctx.lineTo(iw * 0.35, ih * 0.35);
      ctx.lineTo(iw * 0.7, ih);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#9ed8a8';
      ctx.beginPath();
      ctx.moveTo(iw * 0.4, ih);
      ctx.lineTo(iw * 0.75, ih * 0.5);
      ctx.lineTo(iw, ih);
      ctx.closePath();
      ctx.fill();
    } else {
      fill(ctx, iw, ih, '#f4f7f2');
      const blocks = ['#9ed8a8', '#8fc6ff', '#f0e2a0', '#e6a6a0'];
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = blocks[i];
        ctx.fillRect(((i % 2) * iw) / 2 + 3, Math.floor(i / 2) * (ih / 2) + 3, iw / 2 - 6, ih / 2 - 6);
      }
    }
    ctx.restore();
  });

export const vendingTexture = (): THREE.CanvasTexture =>
  spriteTexture(64, 96, (ctx, w, h) => {
    fill(ctx, w, h, '#cfe0d4');
    // glass display with rows of bottles
    const gx = 4;
    const gy = 6;
    ctx.fillStyle = '#1c2a26';
    ctx.fillRect(gx, gy, 38, 66);
    const drinks = ['#e6736b', '#6fb47a', '#5b8fd6', '#e6c24f', '#d98ec0'];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        ctx.fillStyle = drinks[(r * 4 + c) % drinks.length];
        ctx.fillRect(gx + 3 + c * 9, gy + 4 + r * 16, 6, 12);
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(gx + 3 + c * 9, gy + 4 + r * 16, 2, 12);
      }
    }
    // button panel
    ctx.fillStyle = '#9bbf9f';
    ctx.fillRect(46, 6, 14, 46);
    ctx.fillStyle = '#2c3a2f';
    for (let r = 0; r < 5; r++) for (let c = 0; c < 2; c++) ctx.fillRect(48 + c * 7, 9 + r * 8, 5, 5);
    // dispense slot + tray
    ctx.fillStyle = '#1c2a26';
    ctx.fillRect(46, 58, 14, 10);
    ctx.fillRect(4, 76, 56, 14);
  });

export const clockFaceTexture = (): THREE.CanvasTexture =>
  spriteTexture(64, 64, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h / 2;
    const r = w / 2 - 2;
    ctx.fillStyle = '#f7faf5';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = FRAME;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = FRAME;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const rr = r - 4;
      const x = cx + Math.sin(a) * rr;
      const y = cy - Math.cos(a) * rr;
      const s = i % 3 === 0 ? 3 : 1.5;
      ctx.fillRect(x - s / 2, y - s / 2, s, s);
    }
  });

export const routeMapTexture = (): THREE.CanvasTexture =>
  spriteTexture(96, 64, (ctx, w, h) => {
    fill(ctx, w, h, FRAME);
    const m = 3;
    ctx.save();
    ctx.translate(m, m);
    const iw = w - 2 * m;
    const ih = h - 2 * m;
    fill(ctx, iw, ih, '#f4f7f2');
    const lines: { c: string; pts: [number, number][] }[] = [
      { c: '#6fb47a', pts: [[6, 14], [30, 14], [44, 28], [80, 28]] },
      { c: '#5b8fd6', pts: [[14, 52], [14, 30], [44, 28], [60, 12], [86, 12]] },
      { c: '#e6a05a', pts: [[6, 42], [40, 42], [58, 50], [88, 50]] },
    ];
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const ln of lines) {
      ctx.strokeStyle = ln.c;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ln.pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
      ctx.stroke();
      for (const p of ln.pts) {
        ctx.fillStyle = '#f4f7f2';
        ctx.beginPath();
        ctx.arc(p[0], p[1], 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = ln.c;
        ctx.stroke();
      }
    }
    // "you are here"
    ctx.fillStyle = '#e6736b';
    ctx.beginPath();
    ctx.arc(44, 28, 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

// ---------------------------------------------------------------------------
// Subway signage & ads (sprites)
// ---------------------------------------------------------------------------

// A tiny 3x5 pixel font, just enough to spell out the station number and a few
// short words on signs.
const GLYPHS: Record<string, string[]> = {
  '0': ['111', '101', '101', '101', '111'],
  '1': ['010', '110', '010', '010', '111'],
  '2': ['111', '001', '111', '100', '111'],
  '3': ['111', '001', '111', '001', '111'],
  '4': ['101', '101', '111', '001', '001'],
  '5': ['111', '100', '111', '001', '111'],
  '6': ['111', '100', '111', '101', '111'],
  '7': ['111', '001', '010', '010', '010'],
  '8': ['111', '101', '111', '101', '111'],
  '9': ['111', '101', '111', '001', '111'],
  A: ['111', '101', '111', '101', '101'],
  E: ['111', '100', '110', '100', '111'],
  N: ['101', '111', '111', '111', '101'],
  O: ['111', '101', '101', '101', '111'],
  T: ['111', '010', '010', '010', '010'],
  U: ['101', '101', '101', '101', '111'],
  W: ['101', '101', '111', '111', '101'],
  Y: ['101', '101', '010', '010', '010'],
  ' ': ['000', '000', '000', '000', '000'],
};

function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, px: number, color: string): void {
  ctx.fillStyle = color;
  let cx = x;
  for (const ch of text.toUpperCase()) {
    const g = GLYPHS[ch];
    if (g) {
      for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (g[r][c] === '1') ctx.fillRect(cx + c * px, y + r * px, px, px);
    }
    cx += 4 * px;
  }
}

// Bright wall advertisements — bold flat-color compositions so the corridors
// feel busy and colourful.
export const adTexture = (variant: number): THREE.CanvasTexture =>
  spriteTexture(64, 96, (ctx, w, h) => {
    const sets = [
      ['#ff5d8f', '#ffd23d', '#2a5ec0'],
      ['#1f8a4c', '#5fe0ff', '#f4c400'],
      ['#8a5cff', '#ff8a4c', '#ffffff'],
      ['#ff3b6b', '#1fc0c0', '#fff3b0'],
    ];
    const c = sets[variant % sets.length];
    fill(ctx, w, h, c[0]);
    ctx.fillStyle = c[2];
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.38, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c[1];
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.38, 12, 0, Math.PI * 2);
    ctx.fill();
    // headline + footer bars
    ctx.fillStyle = c[2];
    ctx.fillRect(8, h * 0.66, w - 16, 12);
    ctx.fillRect(8, h * 0.66, w - 16, 12);
    drawText(ctx, 'RIDE', 14, h * 0.66 + 3, 3, c[0]);
    ctx.fillStyle = c[1];
    ctx.fillRect(8, h - 18, w - 16, 8);
    // thin frame
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, w - 4, h - 4);
  });

// Transit roundel with the station number.
export const roundelTexture = (): THREE.CanvasTexture =>
  spriteTexture(96, 96, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h / 2;
    ctx.fillStyle = PALETTE.signBlue;
    ctx.beginPath();
    ctx.arc(cx, cy, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f6faff';
    ctx.beginPath();
    ctx.arc(cx, cy, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.signRed;
    ctx.fillRect(6, cy - 9, w - 12, 18);
    drawText(ctx, '255', cx - 16, cy - 8, 4, '#ffffff');
  });

// Directional sign: a coloured panel with a short word and a white arrow.
export const signTexture = (label: string, color: string, dir: 'left' | 'right'): THREE.CanvasTexture =>
  spriteTexture(96, 32, (ctx, w, h) => {
    fill(ctx, w, h, color);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(1, 1, w - 2, h - 2);
    drawText(ctx, label, dir === 'left' ? 20 : 6, 9, 3, '#ffffff');
    ctx.fillStyle = '#ffffff';
    const ax = dir === 'left' ? 8 : w - 8;
    const s = dir === 'left' ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(ax, h / 2);
    ctx.lineTo(ax + s * 9, h / 2 - 7);
    ctx.lineTo(ax + s * 9, h / 2 - 3);
    ctx.lineTo(ax + s * 16, h / 2 - 3);
    ctx.lineTo(ax + s * 16, h / 2 + 3);
    ctx.lineTo(ax + s * 9, h / 2 + 3);
    ctx.lineTo(ax + s * 9, h / 2 + 7);
    ctx.closePath();
    ctx.fill();
  });

// Big platform nameboard: "STATION 255" on the transit blue.
export const nameboardTexture = (): THREE.CanvasTexture =>
  spriteTexture(160, 32, (ctx, w, h) => {
    fill(ctx, w, h, '#f6faff');
    ctx.fillStyle = PALETTE.signBlue;
    ctx.fillRect(0, 0, w, 4);
    ctx.fillRect(0, h - 4, w, 4);
    drawText(ctx, 'STATION 255', 8, 12, 3, PALETTE.signBlue);
  });
