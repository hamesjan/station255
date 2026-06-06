import * as THREE from 'three';
import { DIMS, PALETTE } from '../config';
import * as tex from './textures';

interface Box2D {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface Station {
  group: THREE.Group;
  collide: (x: number, z: number) => { x: number; z: number };
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

  // --- back wall ---
  const wall = panel(DIMS.length, DIMS.wallHeight, tex.wallTexture(), DIMS.length / 4, DIMS.wallHeight / 3);
  wall.position.set(0, DIMS.wallHeight / 2, DIMS.walkMinZ);
  group.add(wall);

  // --- canopy roof over the platform (open on the train side, above) ---
  const canopyDepth = DIMS.canopyZFront - DIMS.canopyZBack;
  const canopy = panel(DIMS.length, canopyDepth, tex.canopyTexture(), DIMS.length / 4, canopyDepth / 4);
  canopy.rotation.x = Math.PI / 2; // face down
  canopy.position.set(0, DIMS.wallHeight, (DIMS.canopyZBack + DIMS.canopyZFront) / 2);
  group.add(canopy);

  // --- pillars against the back wall (solid: become colliders) ---
  const pillarTex = tex.pillarTexture();
  for (let x = -DIMS.halfLength + 8; x <= DIMS.halfLength - 8; x += 16) {
    const pillar = new THREE.Mesh(
      new THREE.BoxGeometry(1, DIMS.wallHeight, 0.7),
      lambert(pillarTex),
    );
    const pz = DIMS.walkMinZ + 0.5;
    pillar.position.set(x, DIMS.wallHeight / 2, pz);
    group.add(pillar);
    colliders.push({ minX: x - 0.5, maxX: x + 0.5, minZ: pz - 0.35, maxZ: pz + 0.35 });

    // a slim outer post that meets the canopy edge (decorative, out of reach)
    const post = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, DIMS.wallHeight, 0.35),
      lambert(pillarTex),
    );
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

  // --- the train: a long solid box. Non-enterable by construction (no
  //     interior) and unreachable (it sits beyond the pit). Only the
  //     platform-facing side gets the windowed texture. ---
  const sideTex = tex.trainSideTexture();
  sideTex.repeat.set(DIMS.length / 9, 1);
  const bodyTex = tex.trainBodyTexture();
  bodyTex.repeat.set(DIMS.length / 6, 1);
  const roofMat = new THREE.MeshLambertMaterial({ color: PALETTE.trainTrim });
  const bodyMat = lambert(bodyTex);
  const sideMat = lambert(sideTex);
  // BoxGeometry face order: +X, -X, +Y, -Y, +Z, -Z. The platform side is -Z.
  const trainMats = [bodyMat, bodyMat, roofMat, bodyMat, bodyMat, sideMat];
  const train = new THREE.Mesh(
    new THREE.BoxGeometry(DIMS.length, DIMS.trainHeight, DIMS.trainDepth),
    trainMats,
  );
  train.position.set(0, DIMS.floorY - DIMS.pitDepth + DIMS.trainHeight / 2, DIMS.trainZ);
  group.add(train);

  // --- sky dome (drifts slowly; unaffected by fog) ---
  const skyTex = tex.skyTexture();
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(200, 32, 16),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, depthWrite: false }),
  );
  group.add(sky);

  // --- collision: clamp to the walkable rectangle, then push out of pillars ---
  const r = DIMS.playerRadius;
  const minX = -DIMS.halfLength + 3;
  const maxX = DIMS.halfLength - 3;
  const minZ = DIMS.walkMinZ + r;
  const maxZ = DIMS.pitZStart - r; // platform edge stops you before the tracks

  const collide = (x: number, z: number): { x: number; z: number } => {
    x = Math.max(minX, Math.min(maxX, x));
    z = Math.max(minZ, Math.min(maxZ, z));
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
  };

  return { group, collide, update };
}
