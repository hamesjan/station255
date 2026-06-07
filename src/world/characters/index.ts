import * as THREE from 'three';
import { DIMS } from '../../config';
import type { Box2D } from '../types';
import type { CharacterInstance, CharacterVariation } from './types';
import { getCharacterKind, registerCharacterKind } from './registry';
import { createModelKind } from './modelCharacter';
import { MODEL_URLS } from './modelAssets';

export interface Characters {
  group: THREE.Group;
  colliders: Box2D[];
  update: (dt: number) => void;
}

// --- register character kinds ---
// Characters are 3D models (GLB). Drop a .glb in /assets/models and it
// auto-registers as a kind named after the file; place it below.
// Convention for per-instance tinting: name the swappable material "shirt" (or
// anything containing that word) in your modelling tool.
for (const [name, url] of Object.entries(MODEL_URLS)) {
  registerCharacterKind(
    createModelKind(name, url, {
      recolorMaterial: 'shirt',
      defaultAnimation: 'Idle',
      colliderRadius: 0.32,
    }),
  );
}

interface Placement {
  kind: string;
  x: number;
  z: number;
  variation: CharacterVariation;
}

// Who's in the station and where. `kind` is the GLB's filename without extension
// (e.g. 'pacer' for assets/models/pacer.glb). One model becomes many individuals
// via tint / scale / mirror / rotationY, and each can run a behavior routine.
const PLACEMENTS: Placement[] = [
  // The Blender pacer, reused as several distinct people pacing the platform.
  { kind: 'pacer', x: 6, z: 2.4, variation: {} },
  { kind: 'pacer', x: -22, z: 2.8, variation: { tint: '#8fc6ff', scale: 0.96, mirror: true } },
  { kind: 'pacer', x: 30, z: 1.9, variation: { tint: '#f0c27a', scale: 1.04 } },
  { kind: 'pacer', x: -40, z: 2.3, variation: { tint: '#d79ad0', mirror: true } },
];

export function buildCharacters(): Characters {
  const group = new THREE.Group();
  const colliders: Box2D[] = [];
  const instances: CharacterInstance[] = [];
  let clock = 0;

  for (const p of PLACEMENTS) {
    const inst = getCharacterKind(p.kind).create(p.variation);
    inst.object.position.set(p.x, DIMS.floorY + inst.baseY, p.z);
    group.add(inst.object);
    instances.push(inst);
    if (inst.collider) {
      colliders.push({
        minX: p.x - inst.collider.halfX,
        maxX: p.x + inst.collider.halfX,
        minZ: p.z - inst.collider.halfZ,
        maxZ: p.z + inst.collider.halfZ,
      });
    }
  }

  const update = (dt: number): void => {
    clock += dt;
    for (const inst of instances) inst.update?.(dt, clock);
  };

  return { group, colliders, update };
}
