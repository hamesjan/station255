import * as THREE from 'three';
import { DIMS, SUBWAY } from '../../config';
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
  y?: number; // floor level (defaults to the platform); the concourse sits lower
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
    x: 5,
    z: 0.9,
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
  { kind: 'pacer', x: -22, z: -1.6, variation: { tint: '#8fc6ff', scale: 0.96, mirror: true } },
  { kind: 'pacer', x: 38, z: 3.1, variation: { tint: '#f0c27a', scale: 1.04 } },
  { kind: 'pacer', x: -40, z: -0.4, variation: { tint: '#d79ad0', mirror: true } },

  // Seated passengers on the side benches (sitter.glb), so the crowd isn't all
  // standing — facing out toward the platform.
  {
    kind: 'sitter',
    x: -30,
    z: 1.2,
    variation: { rotationY: Math.PI, tint: '#e6a05a' },
    talk: {
      name: 'the dozer',
      lines: [
        'Mn… five more minutes. The train always waits, somehow.',
        'I dreamt I missed it. Then I woke up and I was still here.',
      ],
      note: {
        id: 'npc-dozer',
        title: 'The Dozer',
        body: 'Dozes on the left bench. Dreams of missing the train; wakes still waiting for it.',
      },
    },
  },
  {
    kind: 'sitter',
    x: 30,
    z: 1.2,
    variation: { rotationY: Math.PI, tint: '#8fb3ff', mirror: true },
    talk: {
      name: 'the reader',
      lines: [
        'Good book. I’m near the end — I’ve been near the end for a while.',
        'The last page keeps moving. I don’t mind. I like these characters.',
      ],
      note: {
        id: 'npc-reader',
        title: 'The Reader',
        body: 'Reads on the right bench, perpetually one page from finishing.',
      },
    },
  },

  // --- the new cast (each its own GLB, each its own person) ---
  {
    kind: 'commuter',
    x: -13,
    z: -2.6,
    variation: { rotationY: Math.PI },
    talk: {
      name: 'the commuter',
      lines: [
        'Mm? Sorry, I’m mid-message.',
        'Funny thing — I keep typing and the reply’s already there before I send.',
        'Probably the signal here. It does strange things to a phone.',
      ],
      note: {
        id: 'npc-commuter',
        title: 'The Commuter',
        body: 'Never looks up from the phone. Swears the replies arrive before he sends anything.',
      },
    },
  },
  {
    kind: 'kid',
    x: 7,
    z: 3.5,
    variation: { rotationY: Math.PI },
    talk: {
      name: 'the kid',
      lines: [
        'Wanna see me jump the whole yellow line? Watch!',
        'Mum says the train’s coming. She’s been saying it for ages.',
        'If you count the pillars they’re always one more than last time. Try it!',
      ],
      note: {
        id: 'npc-kid',
        title: 'The Kid',
        body: 'Bouncing by the platform edge. Insists the pillars multiply when you count them.',
      },
    },
  },
  {
    kind: 'businesswoman',
    x: -34,
    z: 0.4,
    variation: { rotationY: -Math.PI / 2 },
    talk: {
      name: 'the woman in red',
      lines: [
        'I have a meeting at nine. I’ve had a meeting at nine for some time now.',
        'Every train is the right train and somehow none of them are mine.',
        'You learn to stop checking your watch. It only encourages it.',
      ],
      note: {
        id: 'npc-woman',
        title: 'The Woman in Red',
        body: 'Always nine minutes from a meeting she never quite leaves for.',
      },
    },
  },
  {
    kind: 'elder',
    x: 24,
    z: -2.3,
    variation: { rotationY: Math.PI / 2 },
    talk: {
      name: 'the old man',
      lines: [
        'Sit a while. The bench remembers everyone who waits.',
        'I came to see someone off, oh, a long while back.',
        'Or to meet them. I forget which way the trip was going.',
      ],
      note: {
        id: 'npc-elder',
        title: 'The Old Man',
        body: 'Leans on a cane by the far bench. Can’t recall if he came to leave or to arrive.',
      },
    },
  },
  {
    kind: 'tourist',
    x: 16,
    z: -2.9,
    variation: { rotationY: Math.PI / 2 },
    talk: {
      name: 'the tourist',
      lines: [
        'Beautiful light here, isn’t it? I’ve taken the same photo forty times.',
        'It comes out a little different each time. The clock says something new.',
        'My coffee’s still warm, though. It’s always still warm.',
      ],
      note: {
        id: 'npc-tourist',
        title: 'The Tourist',
        body: 'Photographs the platform on a loop. Coffee that never goes cold.',
      },
    },
  },
  {
    kind: 'traveler',
    x: -46,
    z: -0.8,
    variation: { rotationY: Math.PI },
    talk: {
      name: 'the traveler',
      lines: [
        'You feel it too, don’t you. That the station’s a touch longer today.',
        'I keep a list. Things that change when you’re not looking.',
        'When the list gets too long, I find I’ve started a fresh one.',
      ],
      note: {
        id: 'npc-traveler',
        title: 'The Traveler',
        body: 'Keeps a list of small changes in the station. Starts a new list when the old one fills.',
      },
    },
  },
  {
    kind: 'dogwalker',
    x: -20,
    z: 0.6,
    variation: { rotationY: -Math.PI / 2 },
    talk: {
      name: 'the dog walker',
      lines: [
        'Say hi, Biscuit. …He’s shy with people who only come here once.',
        'We do laps while we wait. He never tires and I never arrive.',
        'He barks at the third pillar sometimes. I’ve stopped asking why.',
      ],
      note: {
        id: 'npc-dogwalker',
        title: 'The Dog Walker',
        body: 'Walks a small dog, Biscuit, in endless laps of the platform. The dog barks at the third pillar.',
      },
    },
  },
  // --- down in the concourse ---
  {
    kind: 'busker',
    x: -3,
    z: -15,
    y: SUBWAY.botY,
    variation: { rotationY: Math.PI },
    talk: {
      name: 'the busker',
      lines: [
        '(a few warm chords drift down the tiled hall)',
        'Best acoustics in the city, down here. Nobody to tell me to move along.',
        'I play till the last train. There’s always one more last train.',
        'Toss a coin in the case if a song finds you. Some of them are looking.',
      ],
      note: {
        id: 'npc-busker',
        title: 'The Busker',
        body: 'Plays guitar in the underground concourse for trains that keep not being the last one.',
      },
    },
  },
  {
    kind: 'commuter',
    x: 9,
    z: -19,
    y: SUBWAY.botY,
    variation: { rotationY: Math.PI, tint: '#6db38a' },
    talk: {
      name: 'the waiting man',
      lines: [
        'Quieter down here. I come when the platform gets to be too much.',
        'The departures board only ever shows one time. I’ve stopped reading it.',
      ],
      note: {
        id: 'npc-waiting',
        title: 'The Waiting Man',
        body: 'Waits in the concourse by the lockers. The departures board only ever shows one time.',
      },
    },
  },
];

export function buildCharacters(): Characters {
  const group = new THREE.Group();
  const colliders: Box2D[] = [];
  const interactions: NpcSpec[] = [];
  const instances: CharacterInstance[] = [];
  let clock = 0;

  for (const p of PLACEMENTS) {
    const floorY = p.y ?? DIMS.floorY;
    const inst = getCharacterKind(p.kind).create(p.variation);
    inst.object.position.set(p.x, floorY + inst.baseY, p.z);
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
        position: new THREE.Vector3(p.x, floorY + 1.0, p.z),
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
