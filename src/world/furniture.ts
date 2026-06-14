import * as THREE from 'three';
import { PALETTE } from '../config';
import * as tex from './textures';
import type { Box2D } from './types';

// Reusable station furniture, shared by the open platform and the underground
// concourse. Each maker returns a group already positioned in world space, plus
// (where solid) a Box2D collider.

const lambert = (color: string): THREE.MeshLambertMaterial => new THREE.MeshLambertMaterial({ color });

export interface Solid {
  group: THREE.Group;
  collider: Box2D;
}

// A cylindrical waste bin with a domed lid and a dark slot.
export function makeTrashcan(x: number, z: number, y = 0, color = PALETTE.trash): Solid {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.72, 14), lambert(color));
  body.position.set(x, y + 0.36, z);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.24, 0.1, 14), lambert(PALETTE.trashLid));
  lid.position.set(x, y + 0.77, z);
  const slot = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.1, 0.02), lambert('#10201a'));
  slot.position.set(x, y + 0.66, z + 0.26);
  g.add(body, lid, slot);
  return { group: g, collider: { minX: x - 0.26, maxX: x + 0.26, minZ: z - 0.26, maxZ: z + 0.26 } };
}

// A bank of lockers. `rotationY` orients the doored face; 0 faces +Z.
export function makeLockerBank(x: number, z: number, y = 0, units = 4, rotationY = 0): Solid {
  const g = new THREE.Group();
  const W = units * 0.4;
  const D = 0.42;
  const H = 1.85;

  const doorTex = tex.lockerTexture();
  doorTex.repeat.set(units, 1);
  const door = new THREE.MeshLambertMaterial({ map: doorTex });
  const side = lambert(PALETTE.lockerTrim);
  // box faces: +x,-x,+y,-y,+z,-z  → door on +Z
  const mats = [side, side, side, side, door, side];
  const box = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), mats);
  box.position.y = H / 2;
  g.add(box);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(W + 0.06, 0.08, D + 0.06), lambert(PALETTE.lockerTrim));
  cap.position.y = H + 0.02;
  g.add(cap);

  g.position.set(x, y, z);
  g.rotation.y = rotationY;

  // collider footprint, accounting for a quarter-turn
  const turned = Math.abs(Math.sin(rotationY)) > 0.5;
  const hx = (turned ? D : W) / 2;
  const hz = (turned ? W : D) / 2;
  return { group: g, collider: { minX: x - hx, maxX: x + hx, minZ: z - hz, maxZ: z + hz } };
}

// A simple metal waiting bench (for the concourse).
export function makeMetalBench(x: number, z: number, y = 0, rotationY = 0): Solid {
  const g = new THREE.Group();
  const metal = lambert('#8794a0');
  const seat = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 0.7), metal);
  seat.position.y = 0.46;
  const back = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.5, 0.08), metal);
  back.position.set(0, 0.72, -0.31);
  g.add(seat, back);
  for (const sx of [-1.05, 1.05]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.46, 0.6), lambert('#5a6670'));
    leg.position.set(sx, 0.23, 0);
    g.add(leg);
  }
  g.position.set(x, y, z);
  g.rotation.y = rotationY;
  const turned = Math.abs(Math.sin(rotationY)) > 0.5;
  const hx = (turned ? 0.7 : 2.4) / 2;
  const hz = (turned ? 2.4 : 0.7) / 2;
  return { group: g, collider: { minX: x - hx, maxX: x + hx, minZ: z - hz, maxZ: z + hz } };
}

// A framed wall advertisement / poster on a flat surface.
export function makeWallPanel(
  texture: THREE.Texture,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  rotationY = 0,
): THREE.Group {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.12, h + 0.12), lambert('#2b3a30'));
  const art = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: texture }));
  art.position.z = 0.01;
  g.add(frame, art);
  g.position.set(x, y, z);
  g.rotation.y = rotationY;
  return g;
}

// A double-sided hanging sign with a small mount bar above it.
export function makeHangingSign(texture: THREE.Texture, x: number, y: number, z: number, w: number, h: number): THREE.Group {
  const g = new THREE.Group();
  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshLambertMaterial({ map: texture, side: THREE.DoubleSide }),
  );
  const back = panel.clone();
  back.rotation.y = Math.PI;
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.04), lambert('#3a4a3f'));
  bar.position.y = h / 2 + 0.09;
  g.add(panel, back, bar);
  g.position.set(x, y, z);
  return g;
}
