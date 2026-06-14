import * as THREE from 'three';
import { DIMS, NATURE } from '../config';
import * as tex from './textures';
import type { Box2D } from './types';

export interface Scenery {
  group: THREE.Group;
  colliders: Box2D[];
  update: (dt: number) => void;
}

const lambert = (color: string): THREE.MeshLambertMaterial => new THREE.MeshLambertMaterial({ color });

// A leafy low-poly plant: a clay planter with a clustered ball of foliage and a
// few bright blossoms. Exported so the anomaly layer can spawn a "wrong" one.
export function makePottedPlant(opts: {
  scale?: number;
  foliage?: string;
  foliageDeep?: string;
  planter?: string;
  flower?: string | null;
}): THREE.Group {
  const g = new THREE.Group();
  const s = opts.scale ?? 1;
  const planterMat = lambert(opts.planter ?? NATURE.planter);
  const soilMat = lambert(NATURE.soil);
  const leaf = lambert(opts.foliage ?? NATURE.foliage);
  const leafDeep = lambert(opts.foliageDeep ?? NATURE.foliageDeep);

  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.26 * s, 0.2 * s, 0.34 * s, 10), planterMat);
  pot.position.y = 0.17 * s;
  g.add(pot);
  const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.24 * s, 0.24 * s, 0.04 * s, 10), soilMat);
  soil.position.y = 0.34 * s;
  g.add(soil);

  // a stem and a cloud of leaf-balls
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03 * s, 0.04 * s, 0.4 * s, 6), leafDeep);
  stem.position.y = 0.5 * s;
  g.add(stem);
  const blobs: [number, number, number, number][] = [
    [0, 0.78, 0, 0.26],
    [0.18, 0.66, 0.05, 0.2],
    [-0.16, 0.68, -0.04, 0.19],
    [0.04, 0.62, 0.16, 0.17],
    [-0.05, 0.9, -0.02, 0.18],
  ];
  for (const [x, y, z, r] of blobs) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r * s, 0), Math.random() < 0.4 ? leafDeep : leaf);
    m.position.set(x * s, y * s, z * s);
    g.add(m);
  }
  if (opts.flower) {
    const flowerMat = lambert(opts.flower);
    for (let i = 0; i < 4; i++) {
      const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.045 * s, 0), flowerMat);
      const a = Math.random() * Math.PI * 2;
      f.position.set(Math.cos(a) * 0.18 * s, (0.68 + Math.random() * 0.18) * s, Math.sin(a) * 0.18 * s);
      g.add(f);
    }
  }
  return g;
}

// A single low-poly tree: tapered trunk + a stack of foliage cones/spheres.
function makeTree(rng: () => number): THREE.Group {
  const g = new THREE.Group();
  const h = 3 + rng() * 4;
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12 * h * 0.25, 0.18 * h * 0.25, h * 0.5, 6),
    lambert(rng() < 0.5 ? NATURE.trunk : NATURE.trunkDark),
  );
  trunk.position.y = h * 0.25;
  g.add(trunk);

  const leafColor = [NATURE.foliage, NATURE.foliageLight, NATURE.foliageDeep][Math.floor(rng() * 3)];
  const leafMat = lambert(leafColor);
  const rounded = rng() < 0.5;
  if (rounded) {
    for (let i = 0; i < 3; i++) {
      const r = (0.9 - i * 0.18) * (0.5 + h * 0.12);
      const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), leafMat);
      ball.position.set((rng() - 0.5) * 0.4, h * 0.5 + i * r * 0.9, (rng() - 0.5) * 0.4);
      g.add(ball);
    }
  } else {
    for (let i = 0; i < 3; i++) {
      const r = (1.0 - i * 0.22) * (0.4 + h * 0.13);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(r, r * 1.5, 7), leafMat);
      cone.position.y = h * 0.5 + i * r * 0.8;
      g.add(cone);
    }
  }
  return g;
}

// deterministic-ish small RNG so the meadow looks the same each load
function mulberry(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildScenery(): Scenery {
  const group = new THREE.Group();
  const colliders: Box2D[] = [];
  const rng = mulberry(2550);
  const groundY = DIMS.floorY - DIMS.pitDepth - 0.05;

  // --- the meadow the station sits beside (far side + wrapping past the ends) ---
  const grassTex = tex.grassTexture();
  grassTex.repeat.set(60, 36);
  // Kept in front of the back wall (z >= -2) so it never intrudes on the
  // underground concourse behind/below the platform.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(440, 212), new THREE.MeshLambertMaterial({ map: grassTex }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, groundY, 104);
  group.add(ground);

  // --- a calm body of water out past the tracks ---
  const waterTex = tex.waterTexture();
  waterTex.repeat.set(8, 6);
  const waterMat = new THREE.MeshLambertMaterial({
    map: waterTex,
    transparent: true,
    opacity: 0.92,
    emissive: NATURE.water,
    emissiveIntensity: 0.18,
  });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(58, 38), waterMat);
  water.rotation.x = -Math.PI / 2;
  const pondCenter = new THREE.Vector3(16, groundY + 0.04, 58);
  water.position.copy(pondCenter);
  group.add(water);

  // reeds around the near shore of the pond
  const reedMat = lambert(NATURE.foliageDeep);
  for (let i = 0; i < 24; i++) {
    const a = rng() * Math.PI * 2;
    const rr = 19 + rng() * 4;
    const reed = new THREE.Mesh(new THREE.ConeGeometry(0.12, 1.4 + rng(), 5), reedMat);
    reed.position.set(pondCenter.x + Math.cos(a) * rr, groundY + 0.7, pondCenter.z + Math.sin(a) * rr * 0.8);
    group.add(reed);
  }

  // --- trees in the distance, kept clear of the pond ---
  for (let i = 0; i < 60; i++) {
    const x = (rng() - 0.5) * 380;
    const z = 22 + rng() * 150;
    if (Math.hypot(x - pondCenter.x, z - pondCenter.z) < 24) continue; // not in the lake
    const tree = makeTree(rng);
    tree.position.set(x, groundY, z);
    const s = 0.8 + rng() * 0.8;
    tree.scale.setScalar(s);
    group.add(tree);
  }
  // a few trees off the platform ends for depth
  for (const ex of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      const tree = makeTree(rng);
      tree.position.set(ex * (DIMS.halfLength + 8 + rng() * 30), groundY, 4 + rng() * 26);
      group.add(tree);
    }
  }

  // --- potted plants dotted along the platform (near the back wall, solid) ---
  const plantSpots: [number, string, string | null][] = [
    [-18, NATURE.foliage, NATURE.flowerA],
    [13, NATURE.foliageLight, NATURE.flowerB],
    [45, NATURE.foliage, NATURE.flowerC],
    [-45, NATURE.foliageLight, NATURE.flowerD],
    [-2, NATURE.foliage, null],
  ];
  for (const [x, foliage, flower] of plantSpots) {
    const z = DIMS.walkMinZ + 0.7;
    const plant = makePottedPlant({ scale: 1.1, foliage, flower });
    plant.position.set(x, DIMS.floorY, z);
    group.add(plant);
    colliders.push({ minX: x - 0.3, maxX: x + 0.3, minZ: z - 0.3, maxZ: z + 0.3 });
  }

  // gentle, endless shimmer on the water
  const update = (dt: number): void => {
    waterTex.offset.x = (waterTex.offset.x + dt * 0.02) % 1;
    waterTex.offset.y = (waterTex.offset.y + dt * 0.012) % 1;
  };

  return { group, colliders, update };
}
