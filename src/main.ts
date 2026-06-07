import * as THREE from 'three';

// Render colors exactly as authored — no linear/sRGB conversion — so the flat,
// deliberate palette comes through like a hand-picked Doom PLAYPAL.
THREE.ColorManagement.enabled = false;

import { PixelRenderer } from './engine/renderer';
import { Input } from './engine/input';
import { Player } from './engine/player';
import { buildStation } from './world/station';
import { Music } from './engine/audio';
import { Game } from './game/game';
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
const input = new Input();

// Background music: play whatever file lives in /assets/music, looping forever.
// Browsers require a user gesture, so it starts on the first key press; M and the
// settings modal (Esc) control it.
const tracks = import.meta.glob('../assets/music/*.{mp3,ogg,wav,m4a,aac,flac}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;
const trackUrl = Object.values(tracks)[0];
const music = trackUrl ? new Music(trackUrl, 0.5) : null;
if (music) {
  const begin = (): void => music.start();
  window.addEventListener('keydown', begin, { once: true });
  window.addEventListener('pointerdown', begin, { once: true });
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyM') music.toggle();
  });
}

// Game layer: settings, notebook, dialogue, and walk-up-and-press-Space talk.
const game = new Game(music);
for (const npc of station.interactions) game.addNpc(npc);

// Fade the controls hint away once the player starts playing.
let started = false;
window.addEventListener('keydown', () => (started = true), { once: true });

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
  player.update(dt, input, station.collide, game.busy);
  game.update(dt, player.camera, input);
  hint.classList.toggle('hidden', started || game.busy);
  input.endFrame();

  pixel.render(scene, player.camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
