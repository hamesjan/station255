import * as THREE from 'three';

// Render colors exactly as authored — no linear/sRGB conversion — so the flat,
// deliberate palette comes through like a hand-picked Doom PLAYPAL.
THREE.ColorManagement.enabled = false;

import { PixelRenderer } from './engine/renderer';
import { Input } from './engine/input';
import { Player } from './engine/player';
import { buildStation } from './world/station';
import { DIMS, PALETTE } from './config';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const hint = document.getElementById('hint') as HTMLElement;

const pixel = new PixelRenderer(canvas, 224);
pixel.setClearColor(PALETTE.skyBottom);

const scene = new THREE.Scene();
// Distance fades to the sky color, so the platform reads as endless — the
// quietly unsettling, never-arriving feel the whole game is built around.
scene.fog = new THREE.Fog(new THREE.Color(PALETTE.skyBottom), 34, DIMS.halfLength * 1.7);

const station = buildStation();
scene.add(station.group);

const player = new Player(-DIMS.halfLength + 8, 1.5);
const input = new Input(canvas);

function resize(): void {
  pixel.setSize(window.innerWidth, window.innerHeight);
  player.setAspect(pixel.aspect);
}
window.addEventListener('resize', resize);
resize();

let last = performance.now();
function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  station.update(dt);
  player.update(dt, input, station.collide);
  hint.classList.toggle('hidden', input.locked);

  pixel.render(scene, player.camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
