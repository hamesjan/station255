import * as THREE from 'three';
import { PALETTE } from '../config';

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
