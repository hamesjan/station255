import * as THREE from 'three';
import { PALETTE, SUBWAY } from '../config';
import * as tex from './textures';
import type { Box2D } from './types';
import {
  makeTrashcan,
  makeLockerBank,
  makeMetalBench,
  makeWallPanel,
  makeHangingSign,
} from './furniture';

export interface Subway {
  group: THREE.Group;
  colliders: Box2D[];
  update: (dt: number) => void;
}

const lambert = (color: string): THREE.MeshLambertMaterial => new THREE.MeshLambertMaterial({ color });

function tiledMaterial(repX: number, repY: number): THREE.MeshLambertMaterial {
  const t = tex.subwayTileTexture();
  t.repeat.set(repX, repY);
  return new THREE.MeshLambertMaterial({ map: t });
}

// One flat surface (wall/floor/ceiling) with a tiled material.
function surface(w: number, h: number, mat: THREE.Material, pos: THREE.Vector3, rotX = 0, rotY = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.position.copy(pos);
  m.rotation.set(rotX, rotY, 0);
  return m;
}

// Builds the stairwell descending from the back-wall opening and the enclosed
// tiled concourse below it, then dresses the concourse like a real subway.
export function buildSubway(): Subway {
  const group = new THREE.Group();
  const colliders: Box2D[] = [];
  const add = (s: { group: THREE.Group; collider: Box2D }): void => {
    group.add(s.group);
    colliders.push(s.collider);
  };

  const { stairCx, stairHalfW, botY, topY, rampTopZ, rampBotZ, openTopY, hallMinX, hallMaxX, hallMinZ, hallMaxZ, ceilY } =
    SUBWAY;
  const hallW = hallMaxX - hallMinX;
  const hallD = hallMaxZ - hallMinZ;
  const hallH = ceilY - botY;
  const concreteFloorTex = tex.concreteTexture();

  // ---------------- stairwell shaft ----------------
  const steps = 12;
  const dz = (rampBotZ - rampTopZ) / steps; // negative
  const dy = (botY - topY) / steps; // negative
  const treadMat = lambert(PALETTE.concrete);
  const riserMat = lambert(PALETTE.concreteDark);
  const noseMat = lambert(PALETTE.signYellow);
  for (let i = 1; i <= steps; i++) {
    const y = topY + dy * i;
    const zc = rampTopZ + dz * i - dz / 2;
    const tread = new THREE.Mesh(new THREE.BoxGeometry(stairHalfW * 2, 0.1, Math.abs(dz) + 0.04), treadMat);
    tread.position.set(stairCx, y + 0.05, zc);
    group.add(tread);
    const riser = new THREE.Mesh(new THREE.BoxGeometry(stairHalfW * 2, Math.abs(dy), 0.05), riserMat);
    riser.position.set(stairCx, y + 0.05 + Math.abs(dy) / 2, zc + dz / 2);
    group.add(riser);
    const nose = new THREE.Mesh(new THREE.BoxGeometry(stairHalfW * 2, 0.03, 0.06), noseMat);
    nose.position.set(stairCx, y + 0.11, zc + dz / 2 + 0.02);
    group.add(nose);
  }

  // shaft side walls (tall: from hall floor up past the doorway) + roof cap
  const shaftZc = (rampTopZ + rampBotZ) / 2;
  const shaftLen = Math.abs(rampBotZ - rampTopZ);
  const shaftH = openTopY - botY;
  const shaftWallMat = tiledMaterial(Math.ceil(shaftLen), Math.ceil(shaftH));
  for (const sx of [stairCx - stairHalfW, stairCx + stairHalfW]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.16, shaftH, shaftLen), shaftWallMat);
    wall.position.set(sx, botY + shaftH / 2, shaftZc);
    group.add(wall);
  }
  const roof = new THREE.Mesh(new THREE.BoxGeometry(stairHalfW * 2 + 0.3, 0.2, shaftLen + 0.2), lambert(PALETTE.concreteDark));
  roof.position.set(stairCx, openTopY, shaftZc);
  group.add(roof);

  // ---------------- concourse shell ----------------
  const cx = (hallMinX + hallMaxX) / 2;
  const cz = (hallMinZ + hallMaxZ) / 2;
  const midY = botY + hallH / 2;

  const floor = surface(hallW, hallD, new THREE.MeshLambertMaterial({ map: concreteFloorTex }), new THREE.Vector3(cx, botY, cz), -Math.PI / 2);
  concreteFloorTex.repeat.set(hallW / 3, hallD / 3);
  group.add(floor);

  const ceilTex = tex.concreteTexture();
  ceilTex.repeat.set(hallW / 4, hallD / 4);
  const ceiling = surface(hallW, hallD, new THREE.MeshLambertMaterial({ map: ceilTex }), new THREE.Vector3(cx, ceilY, cz), Math.PI / 2);
  group.add(ceiling);

  // back wall (z = hallMinZ, faces +Z)
  group.add(surface(hallW, hallH, tiledMaterial(hallW / 2, hallH / 2), new THREE.Vector3(cx, midY, hallMinZ)));
  // side walls
  group.add(surface(hallD, hallH, tiledMaterial(hallD / 2, hallH / 2), new THREE.Vector3(hallMinX, midY, cz), 0, Math.PI / 2));
  group.add(surface(hallD, hallH, tiledMaterial(hallD / 2, hallH / 2), new THREE.Vector3(hallMaxX, midY, cz), 0, -Math.PI / 2));
  // front wall (z = hallMaxZ, faces -Z) in two segments, leaving the stair doorway
  const doorL = stairCx - stairHalfW;
  const doorR = stairCx + stairHalfW;
  const segLW = doorL - hallMinX;
  const segRW = hallMaxX - doorR;
  group.add(surface(segLW, hallH, tiledMaterial(segLW / 2, hallH / 2), new THREE.Vector3((hallMinX + doorL) / 2, midY, hallMaxZ), 0, Math.PI));
  group.add(surface(segRW, hallH, tiledMaterial(segRW / 2, hallH / 2), new THREE.Vector3((doorR + hallMaxX) / 2, midY, hallMaxZ), 0, Math.PI));

  // ---------------- lighting & glowing panels ----------------
  const panels: THREE.Mesh[] = [];
  for (const lz of [-13, -17, -21]) {
    const light = new THREE.PointLight(0xfff3da, 0.9, 26, 1.6);
    light.position.set(0, ceilY - 0.4, lz);
    group.add(light);
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 0.06, 0.7),
      new THREE.MeshBasicMaterial({ color: '#fff6e2' }),
    );
    panel.position.set(0, ceilY - 0.05, lz);
    group.add(panel);
    panels.push(panel);
  }
  // a cool neon accent strip running the length of one wall
  const neon = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.12, hallD - 1),
    new THREE.MeshBasicMaterial({ color: PALETTE.neon }),
  );
  neon.position.set(hallMinX + 0.12, ceilY - 0.6, cz);
  group.add(neon);

  // ---------------- furniture & signage ----------------
  // lockers along the back wall
  add(makeLockerBank(-12, hallMinZ + 0.24, botY, 6, 0));
  add(makeLockerBank(10, hallMinZ + 0.24, botY, 5, 0));
  // a roundel between them
  group.add(makeWallPanel(tex.roundelTexture(), 0, midY + 0.3, hallMinZ + 0.05, 1.6, 1.6));
  // route map on the back wall
  group.add(makeWallPanel(tex.routeMapTexture(), -2, botY + 1.2, hallMinZ + 0.05, 2.4, 1.6));

  // benches against the side walls
  add(makeMetalBench(hallMinX + 0.5, -15, botY, -Math.PI / 2));
  add(makeMetalBench(hallMaxX - 0.5, -19, botY, Math.PI / 2));

  // bins in the corners
  add(makeTrashcan(hallMinX + 1.0, hallMinZ + 1.0, botY));
  add(makeTrashcan(hallMaxX - 1.0, hallMaxZ - 1.6, botY));

  // colourful ads down the side walls
  const adZ = [-13.5, -17.5, -21.5];
  adZ.forEach((z, i) => {
    group.add(makeWallPanel(tex.adTexture(i), hallMinX + 0.06, botY + 1.7, z, 1.2, 1.8, Math.PI / 2));
    group.add(makeWallPanel(tex.adTexture(i + 2), hallMaxX - 0.06, botY + 1.7, z, 1.2, 1.8, -Math.PI / 2));
  });

  // hanging signs: a nameboard deeper in, and a WAY OUT arrow pointing back up
  group.add(makeHangingSign(tex.nameboardTexture(), 0, ceilY - 0.7, hallMinZ + 4, 3.2, 0.64));
  group.add(makeHangingSign(tex.signTexture('WAY OUT', PALETTE.signGreen, 'right'), 6, ceilY - 0.7, hallMaxZ - 2, 1.9, 0.6));

  // a subtle fluorescent flicker on one panel for atmosphere
  let t = 0;
  const flickerMat = panels[1].material as THREE.MeshBasicMaterial;
  const update = (dt: number): void => {
    t += dt;
    const f = Math.sin(t * 13) * Math.sin(t * 7.3);
    flickerMat.color.setScalar(0.92 + (f > 0.85 ? -0.5 : 0) + Math.random() * 0.02);
  };

  return { group, colliders, update };
}

// The walkable floor height at (x,z): platform level on the platform, a smooth
// ramp down the stairwell, hallway level in the concourse. Shared by the player
// (camera height) and used to keep movement glued to the right surface.
export function subwayFloorAt(x: number, z: number): number {
  const { stairCx, stairHalfW, botY, topY, rampTopZ, rampBotZ, hallMinX, hallMaxX, hallMinZ, hallMaxZ } = SUBWAY;
  // hall: flat
  if (z <= rampBotZ && x >= hallMinX && x <= hallMaxX && z >= hallMinZ && z <= hallMaxZ) return botY;
  // stairwell ramp
  if (x >= stairCx - stairHalfW && x <= stairCx + stairHalfW && z < rampTopZ) {
    if (z <= rampBotZ) return botY;
    const t = (rampTopZ - z) / (rampTopZ - rampBotZ); // 0 at top, 1 at bottom
    return topY + (botY - topY) * t;
  }
  return topY; // platform
}
