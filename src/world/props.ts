import * as THREE from 'three';
import { DIMS, PALETTE } from '../config';
import * as tex from './textures';
import type { Box2D } from './types';
import { makeTrashcan, makeLockerBank, makeWallPanel, makeHangingSign } from './furniture';

export interface Props {
  group: THREE.Group;
  colliders: Box2D[];
  update: (dt: number) => void;
}

// Furniture and fixtures laid out along the platform. Wall-mounted items sit in
// the bays between pillars; benches and the vending machine are solid.
export function buildProps(): Props {
  const group = new THREE.Group();
  const colliders: Box2D[] = [];
  const updaters: ((dt: number) => void)[] = [];

  for (const bx of [-30, 0, 30]) {
    const bench = makeBench(bx, 1.45);
    group.add(bench.group);
    colliders.push(bench.collider);
  }

  const vending = makeVending(25);
  group.add(vending.group);
  colliders.push(vending.collider);

  const clock = makeClock(-7, 3.15);
  group.add(clock.group);
  updaters.push(clock.update);

  group.add(makeWallArt(tex.routeMapTexture(), -23, 2.35, 1.9, 1.25));
  group.add(makeWallArt(tex.posterTexture(0), -39, 2.5, 1.0, 1.5));
  group.add(makeWallArt(tex.posterTexture(1), 9, 2.5, 1.0, 1.5));
  group.add(makeWallArt(tex.posterTexture(2), 41, 2.5, 1.0, 1.5));

  // --- subway dressing on the platform: lockers, bins, signage, ads ---
  const wallZ = DIMS.walkMinZ + 0.05;
  group.add(makeWallPanel(tex.nameboardTexture(), 8, 3.4, wallZ, 4.2, 0.84));
  group.add(makeWallPanel(tex.roundelTexture(), -33, 2.7, wallZ, 1.5, 1.5));
  group.add(makeWallPanel(tex.adTexture(0), 20, 2.4, wallZ, 1.2, 1.8));
  group.add(makeWallPanel(tex.adTexture(3), -52, 2.4, wallZ, 1.2, 1.8));

  const lockers = makeLockerBank(12, DIMS.walkMinZ + 0.32, DIMS.floorY, 5, 0);
  group.add(lockers.group);
  colliders.push(lockers.collider);

  for (const tx of [-12, 36]) {
    const bin = makeTrashcan(tx, DIMS.walkMinZ + 0.6, DIMS.floorY);
    group.add(bin.group);
    colliders.push(bin.collider);
  }

  // a sign hung over the platform, arrow pointing back toward the stairs down
  group.add(makeHangingSign(tex.signTexture('SUBWAY', PALETTE.signBlue, 'left'), 2, 3.2, 2.2, 2.0, 0.62));

  return {
    group,
    colliders,
    update: (dt) => {
      for (const u of updaters) u(dt);
    },
  };
}

function makeBench(x: number, z: number): { group: THREE.Group; collider: Box2D } {
  const g = new THREE.Group();
  const wood = new THREE.MeshLambertMaterial({ color: '#d9c9a6' });
  const frame = new THREE.MeshLambertMaterial({ color: '#9bbf9f' });

  const seat = new THREE.Mesh(new THREE.BoxGeometry(3, 0.12, 0.85), wood);
  seat.position.set(x, 0.5, z);
  g.add(seat);

  const back = new THREE.Mesh(new THREE.BoxGeometry(3, 0.55, 0.1), wood);
  back.position.set(x, 0.82, z - 0.37); // backrest toward the wall
  g.add(back);

  for (const sx of [x - 1.35, x + 1.35]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.85), frame);
    leg.position.set(sx, 0.25, z);
    g.add(leg);
  }

  return { group: g, collider: { minX: x - 1.5, maxX: x + 1.5, minZ: z - 0.45, maxZ: z + 0.45 } };
}

function makeVending(x: number): { group: THREE.Group; collider: Box2D } {
  const g = new THREE.Group();
  const z = DIMS.walkMinZ + 0.42;

  const frontTex = tex.vendingTexture();
  // emissiveMap makes the lit front glow a little against the daylight.
  const front = new THREE.MeshLambertMaterial({
    map: frontTex,
    emissive: '#24342c',
    emissiveMap: frontTex,
  });
  const bodyMat = new THREE.MeshLambertMaterial({ color: '#5f6f63' });
  // +Z face (index 4) is the lit front, toward the player.
  const mats = [bodyMat, bodyMat, bodyMat, bodyMat, front, bodyMat];

  const machine = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.0, 0.8), mats);
  machine.position.set(x, 1.0, z);
  g.add(machine);

  return {
    group: g,
    collider: { minX: x - 0.62, maxX: x + 0.62, minZ: DIMS.walkMinZ, maxZ: DIMS.walkMinZ + 0.85 },
  };
}

function makeClock(x: number, y: number): { group: THREE.Group; update: (dt: number) => void } {
  const g = new THREE.Group();
  const z = DIMS.walkMinZ + 0.06;

  const rim = new THREE.Mesh(new THREE.CircleGeometry(0.66, 28), new THREE.MeshLambertMaterial({ color: '#3a4a3f' }));
  rim.position.set(x, y, z - 0.01);
  g.add(rim);

  const face = new THREE.Mesh(
    new THREE.CircleGeometry(0.6, 28),
    new THREE.MeshLambertMaterial({ map: tex.clockFaceTexture(), transparent: true }),
  );
  face.position.set(x, y, z);
  g.add(face);

  const handMat = new THREE.MeshBasicMaterial({ color: '#2c3a2f' });
  const secMat = new THREE.MeshBasicMaterial({ color: '#e6736b' });

  // A hand is a thin box parented to a pivot at the clock's center; it points up
  // (12 o'clock) and we rotate the pivot around Z (the wall normal).
  const makeHand = (length: number, width: number, mat: THREE.Material, zoff: number): THREE.Group => {
    const pivot = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, length, 0.012), mat);
    mesh.position.y = length / 2 - 0.06;
    pivot.add(mesh);
    pivot.position.set(x, y, z + zoff);
    g.add(pivot);
    return pivot;
  };

  const hour = makeHand(0.34, 0.05, handMat, 0.02);
  const minute = makeHand(0.5, 0.035, handMat, 0.03);
  const second = makeHand(0.54, 0.014, secMat, 0.04);

  const cap = new THREE.Mesh(new THREE.CircleGeometry(0.04, 12), handMat);
  cap.position.set(x, y, z + 0.05);
  g.add(cap);

  const update = (): void => {
    const now = new Date();
    const s = now.getSeconds() + now.getMilliseconds() / 1000;
    const mn = now.getMinutes() + s / 60;
    const hr = (now.getHours() % 12) + mn / 60;
    hour.rotation.z = -(hr / 12) * Math.PI * 2;
    minute.rotation.z = -(mn / 60) * Math.PI * 2;
    second.rotation.z = -(s / 60) * Math.PI * 2;
  };

  return { group: g, update };
}

function makeWallArt(texture: THREE.Texture, x: number, y: number, w: number, h: number): THREE.Mesh {
  const art = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: texture }));
  art.position.set(x, y, DIMS.walkMinZ + 0.05);
  return art;
}
