import * as THREE from 'three';

export type Pose = 'stand' | 'sit';

// Per-instance variation knobs. Each character kind interprets the fields it
// cares about (a sprite ignores `animation`, a model ignores `variant`, etc.).
export interface CharacterVariation {
  pose?: Pose;
  variant?: number; // palette / sub-variant index
  scale?: number; // height multiplier
  mirror?: boolean; // flip horizontally for variety
  tint?: string; // recolor (e.g. the shirt) where supported
  animation?: string; // animation clip name for animated models
}

// A spawned character: a scene object plus how it collides and animates. The
// object's origin sits at the feet, on the floor.
export interface CharacterInstance {
  object: THREE.Object3D;
  baseY: number; // y offset for the origin (usually 0)
  collider?: { halfX: number; halfZ: number }; // omit for non-solid characters
  update?: (dt: number, clock: number) => void;
}

// A reusable source of characters — the procedural pixel people, or a specific
// glTF model. Register one, then spawn many instances, each with its own
// CharacterVariation. This is the seam that makes the system scalable: new art
// is a new CharacterKind, and nothing else has to change.
export interface CharacterKind {
  readonly id: string;
  create(variation: CharacterVariation): CharacterInstance;
}
