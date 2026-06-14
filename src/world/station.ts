import * as THREE from 'three';
import { DIMS, PALETTE, SUBWAY } from '../config';
import * as tex from './textures';
import type { Box2D } from './types';
import { buildProps } from './props';
import { buildCharacters } from './characters';
import { buildScenery } from './scenery';
import { buildAnomalies } from './anomalies';
import { buildSubway, subwayFloorAt } from './subway';
import type { NpcSpec } from './characters/types';
import { Train } from './train';

export interface Station {
  group: THREE.Group;
  collide: (x: number, z: number) => { x: number; z: number };
  floorAt: (x: number, z: number) => number;
  interactions: NpcSpec[];
  update: (dt: number) => void;
}

const lambert = (texture: THREE.Texture): THREE.MeshLambertMaterial =>
  new THREE.MeshLambertMaterial({ map: texture });

// A flat surface (floor/ceiling/wall) sized w x h, with its texture tiled at
// roughly `tilesPerW` x `tilesPerH` so pixels stay a consistent size everywhere.
function panel(
  w: number,
  h: number,
  texture: THREE.CanvasTexture,
  tilesPerW: number,
  tilesPerH: number,
): THREE.Mesh {
  texture.repeat.set(tilesPerW, tilesPerH);
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), lambert(texture));
}

export function buildStation(): Station {
  const group = new THREE.Group();
  const colliders: Box2D[] = [];
  const walkW = DIMS.walkMaxZ - DIMS.walkMinZ;

  // --- lights: a bright, soft daylight so colors read as authored ---
  group.add(new THREE.HemisphereLight(PALETTE.skyTop, PALETTE.floorTile, 1.05));
  group.add(new THREE.AmbientLight(0xffffff, 0.25));
  const sun = new THREE.DirectionalLight(0xffffff, 0.4);
  sun.position.set(0.4, 1, 0.35);
  group.add(sun);

  // --- platform floor ---
  const floor = panel(DIMS.length, walkW, tex.floorTexture(), DIMS.length / 2, walkW / 2);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, DIMS.floorY, (DIMS.walkMinZ + DIMS.walkMaxZ) / 2);
  group.add(floor);

  // --- back wall, with a doorway cut for the stairs down to the concourse ---
  {
    const doorL = SUBWAY.stairCx - SUBWAY.stairHalfW;
    const doorR = SUBWAY.stairCx + SUBWAY.stairHalfW;
    const x0 = -DIMS.halfLength;
    const x1 = DIMS.halfLength;
    const leftW = doorL - x0;
    const rightW = x1 - doorR;
    const left = panel(leftW, DIMS.wallHeight, tex.wallTexture(), leftW / 4, DIMS.wallHeight / 3);
    left.position.set((x0 + doorL) / 2, DIMS.wallHeight / 2, DIMS.walkMinZ);
    group.add(left);
    const right = panel(rightW, DIMS.wallHeight, tex.wallTexture(), rightW / 4, DIMS.wallHeight / 3);
    right.position.set((doorR + x1) / 2, DIMS.wallHeight / 2, DIMS.walkMinZ);
    group.add(right);
    // lintel above the opening
    const lintelH = DIMS.wallHeight - SUBWAY.openTopY;
    const lintel = panel(doorR - doorL, lintelH, tex.wallTexture(), (doorR - doorL) / 4, lintelH / 3);
    lintel.position.set(SUBWAY.stairCx, SUBWAY.openTopY + lintelH / 2, DIMS.walkMinZ);
    group.add(lintel);
  }

  // --- canopy roof over the platform (open on the train side, above) ---
  const canopyDepth = DIMS.canopyZFront - DIMS.canopyZBack;
  const canopy = panel(DIMS.length, canopyDepth, tex.canopyTexture(), DIMS.length / 4, canopyDepth / 4);
  canopy.rotation.x = Math.PI / 2; // face down
  canopy.position.set(0, DIMS.wallHeight, (DIMS.canopyZBack + DIMS.canopyZFront) / 2);
  group.add(canopy);

  // --- pillars against the back wall (solid: become colliders) ---
  const pillarTex = tex.pillarTexture();
  for (let x = -DIMS.halfLength + 8; x <= DIMS.halfLength - 8; x += 16) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(1, DIMS.wallHeight, 0.7), lambert(pillarTex));
    const pz = DIMS.walkMinZ + 0.5;
    pillar.position.set(x, DIMS.wallHeight / 2, pz);
    group.add(pillar);
    colliders.push({ minX: x - 0.5, maxX: x + 0.5, minZ: pz - 0.35, maxZ: pz + 0.35 });

    // a slim outer post that meets the canopy edge (decorative, out of reach)
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.35, DIMS.wallHeight, 0.35), lambert(pillarTex));
    post.position.set(x, DIMS.wallHeight / 2, DIMS.canopyZFront - 0.25);
    group.add(post);
  }

  // --- tactile safety strip near the platform edge ---
  const stripTex = tex.edgeStripTexture();
  stripTex.repeat.set(DIMS.length, 1);
  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(DIMS.length, 0.04, 0.5),
    new THREE.MeshLambertMaterial({ map: stripTex }),
  );
  strip.position.set(0, DIMS.floorY + 0.02, DIMS.pitZStart - 0.4);
  group.add(strip);

  // --- vertical face of the platform dropping into the pit ---
  const side = panel(DIMS.length, DIMS.pitDepth, tex.platformSideTexture(), DIMS.length / 4, 1);
  side.position.set(0, DIMS.floorY - DIMS.pitDepth / 2, DIMS.pitZStart);
  group.add(side);

  // --- pit floor + rails (you can see the tracks, but never reach them) ---
  const pitW = DIMS.pitZEnd - DIMS.pitZStart;
  const pit = panel(DIMS.length, pitW, tex.pitTexture(), DIMS.length / 4, pitW / 4);
  pit.rotation.x = -Math.PI / 2;
  pit.position.set(0, DIMS.floorY - DIMS.pitDepth, (DIMS.pitZStart + DIMS.pitZEnd) / 2);
  group.add(pit);

  const railMat = new THREE.MeshLambertMaterial({ color: PALETTE.rail });
  for (const rz of [DIMS.pitZStart + 1.3, DIMS.pitZEnd - 1.3]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(DIMS.length, 0.12, 0.16), railMat);
    rail.position.set(0, DIMS.floorY - DIMS.pitDepth + 0.06, rz);
    group.add(rail);
  }

  // --- sky dome (drifts slowly; unaffected by fog) ---
  const skyTex = tex.skyTexture();
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(200, 32, 16),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, depthWrite: false }),
  );
  group.add(sky);

  // --- the world beyond the platform: meadow, pond, trees, potted plants ---
  const scenery = buildScenery();
  group.add(scenery.group);
  colliders.push(...scenery.colliders);

  // --- furniture, fixtures, and the people chilling around ---
  const props = buildProps();
  group.add(props.group);
  colliders.push(...props.colliders);

  const characters = buildCharacters();
  group.add(characters.group);
  colliders.push(...characters.colliders);

  // --- the quietly-wrong things you can catch if you look closely ---
  const anomalies = buildAnomalies();
  group.add(anomalies.group);
  colliders.push(...anomalies.colliders);

  const interactions: NpcSpec[] = [...characters.interactions, ...anomalies.interactions];

  // --- the stairwell + underground subway concourse ---
  const subway = buildSubway();
  group.add(subway.group);
  colliders.push(...subway.colliders);

  // --- the train: arrives, dwells, speeds off, every 3 minutes ---
  const train = new Train();
  group.add(train.group);

  // --- collision: stay inside the union of walkable zones, then push out of
  // solids. Zones overlap at their seams (platform↔stairs↔hall) so you can walk
  // continuously between levels. ---
  const r = DIMS.playerRadius;
  const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
  // [minX, maxX, minZ, maxZ]
  const zones: [number, number, number, number][] = [
    [-DIMS.halfLength + 3, DIMS.halfLength - 3, DIMS.walkMinZ + r, DIMS.pitZStart - r], // platform
    [SUBWAY.stairCx - SUBWAY.stairHalfW + r, SUBWAY.stairCx + SUBWAY.stairHalfW - r, SUBWAY.stairMinZ, SUBWAY.stairMaxZ], // stairwell
    [SUBWAY.hallMinX + r, SUBWAY.hallMaxX - r, SUBWAY.hallMinZ + r, SUBWAY.hallMaxZ], // concourse
  ];
  const inside = (zn: [number, number, number, number], x: number, z: number): boolean =>
    x >= zn[0] && x <= zn[1] && z >= zn[2] && z <= zn[3];

  const collide = (x: number, z: number): { x: number; z: number } => {
    // keep the point inside the union: if it left every zone, snap to the
    // nearest one's edge (zones overlap, so transitions stay smooth)
    if (!zones.some((zn) => inside(zn, x, z))) {
      let best = Infinity;
      let bx = x;
      let bz = z;
      for (const zn of zones) {
        const qx = clamp(x, zn[0], zn[1]);
        const qz = clamp(z, zn[2], zn[3]);
        const d = (qx - x) ** 2 + (qz - z) ** 2;
        if (d < best) {
          best = d;
          bx = qx;
          bz = qz;
        }
      }
      x = bx;
      z = bz;
    }
    for (const b of colliders) {
      const ex0 = b.minX - r;
      const ex1 = b.maxX + r;
      const ez0 = b.minZ - r;
      const ez1 = b.maxZ + r;
      if (x > ex0 && x < ex1 && z > ez0 && z < ez1) {
        const dl = x - ex0;
        const dr = ex1 - x;
        const dn = z - ez0;
        const df = ez1 - z;
        const m = Math.min(dl, dr, dn, df);
        if (m === dl) x = ex0;
        else if (m === dr) x = ex1;
        else if (m === dn) z = ez0;
        else z = ez1;
      }
    }
    return { x, z };
  };

  const update = (dt: number): void => {
    skyTex.offset.x = (skyTex.offset.x + dt * 0.004) % 1;
    scenery.update(dt);
    props.update(dt);
    characters.update(dt);
    anomalies.update(dt);
    subway.update(dt);
    train.update(dt);
  };

  return { group, collide, floorAt: subwayFloorAt, interactions, update };
}
