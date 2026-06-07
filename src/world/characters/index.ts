import * as THREE from 'three';
import { DIMS } from '../../config';
import type { Box2D } from '../types';
import type { CharacterInstance, CharacterVariation, NpcSpec } from './types';
import { getCharacterKind, registerCharacterKind } from './registry';
import { createModelKind } from './modelCharacter';
import { MODEL_URLS } from './modelAssets';

export interface Characters {
  group: THREE.Group;
  colliders: Box2D[];
  interactions: NpcSpec[];
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
  // If present, the player can walk up and press Space to talk; `note` (if any)
  // is recorded to the notebook the first time.
  talk?: { name: string; lines: string[]; note?: { id: string; title: string; body: string } };
}

// Who's in the station and where. `kind` is the GLB's filename without extension
// (e.g. 'pacer' for assets/models/pacer.glb). One model becomes many individuals
// via tint / scale / mirror / rotationY, and each can run a behavior routine.
const PLACEMENTS: Placement[] = [
  // The listener: sits on the middle bench with wired earphones (sitter.glb).
  // rotationY faces them out toward the platform/tracks.
  {
    kind: 'sitter',
    x: 0,
    z: 1.2,
    variation: { rotationY: Math.PI },
    talk: {
      name: 'the listener',
      lines: [
        '...',
        'Oh — sorry. I didn’t hear you over the music.',
        'I like it here. Same train, same light. It’s easier than out there.',
        'Sometimes a song lines up with the announcements and the whole station feels like it’s singing.',
        'If you ever notice something… off… write it down. You start to forget otherwise.',
      ],
      note: {
        id: 'npc-listener',
        title: 'The Listener',
        body: 'Sits on the middle bench in wired earphones, in no hurry for any train. Told me to write down anything that feels off.',
      },
    },
  },
  // Pacers (pacer.glb), each a distinct person via tint / scale / mirror.
  {
    kind: 'pacer',
    x: 6,
    z: 2.4,
    variation: {},
    talk: {
      name: 'a pacer',
      lines: [
        'Can’t sit still. Never could.',
        'Three minutes till the next one. Then three more. Then three more.',
      ],
      note: {
        id: 'npc-pacer',
        title: 'The Pacer',
        body: 'Walks the platform end to end, counting trains that all look the same.',
      },
    },
  },
  { kind: 'pacer', x: -22, z: 2.8, variation: { tint: '#8fc6ff', scale: 0.96, mirror: true } },
  { kind: 'pacer', x: 30, z: 1.9, variation: { tint: '#f0c27a', scale: 1.04 } },
  { kind: 'pacer', x: -40, z: 2.3, variation: { tint: '#d79ad0', mirror: true } },
];

export function buildCharacters(): Characters {
  const group = new THREE.Group();
  const colliders: Box2D[] = [];
  const interactions: NpcSpec[] = [];
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
    if (p.talk) {
      interactions.push({
        position: new THREE.Vector3(p.x, DIMS.floorY + 1.0, p.z),
        name: p.talk.name,
        lines: p.talk.lines,
        note: p.talk.note,
      });
    }
  }

  const update = (dt: number): void => {
    clock += dt;
    for (const inst of instances) inst.update?.(dt, clock);
  };

  return { group, colliders, interactions, update };
}
