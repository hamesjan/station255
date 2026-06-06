import * as THREE from 'three';
import { DIMS } from '../../config';
import type { Box2D } from '../types';
import type { CharacterInstance, CharacterVariation } from './types';
import { getCharacterKind, registerCharacterKind } from './registry';
import { pixelPersonKind } from './pixelPerson';
import { createModelKind } from './modelCharacter';
import { MODEL_URLS } from './modelAssets';

export interface Characters {
  group: THREE.Group;
  colliders: Box2D[];
  update: (dt: number) => void;
}

// --- register character kinds ---
registerCharacterKind(pixelPersonKind);

// Every .glb in /assets/models auto-registers as a kind named after the file.
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

// Who's in the station and where. Add model placements by referencing the GLB's
// filename (e.g. kind: 'passenger' for assets/models/passenger.glb).
const PLACEMENTS: Placement[] = [
  { kind: 'pixel-person', x: 0, z: 1.62, variation: { pose: 'sit', variant: 0 } },
  { kind: 'pixel-person', x: -30, z: 1.62, variation: { pose: 'sit', variant: 3 } },
  { kind: 'pixel-person', x: -18, z: 2.8, variation: { pose: 'stand', variant: 1 } },
  { kind: 'pixel-person', x: 14, z: -2.3, variation: { pose: 'stand', variant: 2 } },
  { kind: 'pixel-person', x: 36, z: 2.4, variation: { pose: 'stand', variant: 4 } },
  { kind: 'pixel-person', x: -41, z: 2.1, variation: { pose: 'stand', variant: 5 } },
  // Once you add e.g. assets/models/passenger.glb, place 3D people like this —
  // same model, each made unique by tint / scale / mirror / animation:
  // { kind: 'passenger', x: 8,  z: 2.6, variation: { tint: '#8fc6ff', animation: 'Idle' } },
  // { kind: 'passenger', x: -8, z: 2.2, variation: { tint: '#f0e2a0', scale: 0.96, mirror: true } },
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
