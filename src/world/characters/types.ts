import * as THREE from 'three';
import type { Behavior } from './behavior';

export type Pose = 'stand' | 'sit';

// Per-instance variation knobs. Each character kind interprets the fields it
// cares about (a sprite ignores `animation`, a model ignores `variant`, etc.).
export interface CharacterVariation {
  pose?: Pose;
  variant?: number; // palette / sub-variant index
  scale?: number; // height multiplier
  mirror?: boolean; // flip horizontally for variety
  tint?: string; // recolor (e.g. the shirt) where supported
  rotationY?: number; // facing direction, radians (people face different ways)
  animation?: string; // a single looping clip (ignored if `behavior` is set)
  behavior?: string | Behavior; // a personality routine: a preset id or inline behavior
}

// A spawned character: a scene object plus how it collides and animates. The
// object's origin sits at the feet, on the floor.
export interface CharacterInstance {
  object: THREE.Object3D;
  baseY: number; // y offset for the origin (usually 0)
  collider?: { halfX: number; halfZ: number }; // omit for non-solid characters
  update?: (dt: number, clock: number) => void;
}

// A reusable source of characters — a specific glTF model. Register one, then
// spawn many instances, each with its own CharacterVariation. This is the seam
// that makes the system scalable: new art is a new CharacterKind, and nothing
// else has to change.
export interface CharacterKind {
  readonly id: string;
  create(variation: CharacterVariation): CharacterInstance;
}

// Data describing how a placed character — or a weird anomaly — can be
// interacted with. The game layer turns this into an interactable (dialogue +
// an optional one-time notebook entry).
export interface NpcSpec {
  position: THREE.Vector3;
  name: string;
  lines: string[];
  note?: { id: string; title: string; body: string };
  // How close (in metres) you must be to trigger it. Anomalies use a tight
  // radius so they're hard to pinpoint; people use the comfortable default.
  radius?: number;
  // Anomalies read as "examine" rather than "talk to", and their notebook
  // toast says "logged" instead of "recorded".
  examine?: boolean;
}
