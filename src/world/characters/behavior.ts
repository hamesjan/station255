import * as THREE from 'three';

// A "behavior" is a character's personality expressed as a routine of animation
// clips: idle for a while, take a sip, idle, sigh… The clip names must match the
// animation clips inside the GLB (the names you give them in Blender/Mixamo).
// Two characters can share one model yet feel like different people simply by
// running different behaviors with different timing.

export interface BehaviorStep {
  clip: string; // animation clip name inside the GLB
  minSeconds?: number; // how long to hold this step (defaults to the clip length)
  maxSeconds?: number; // upper bound; a random time in [min,max] is chosen
  weight?: number; // relative likelihood in 'random' mode (default 1)
}

export interface Behavior {
  id: string;
  steps: BehaviorStep[];
  mode?: 'sequence' | 'random'; // play steps in order, or weighted-random (default 'sequence')
  crossfade?: number; // seconds to blend between clips (default 0.35)
}

// Built-in personalities. These reference clip names you should create when you
// rig in Mixamo / animate in Blender. Missing clips are skipped gracefully, so
// you can ship a model with just 'Idle' and add the rest later.
export const BEHAVIORS: Record<string, Behavior> = {
  // Stands around, occasionally checks a phone and shifts weight.
  loiterer: {
    id: 'loiterer',
    steps: [
      { clip: 'Idle', minSeconds: 5, maxSeconds: 11 },
      { clip: 'Phone', minSeconds: 4, maxSeconds: 9 },
      { clip: 'Idle', minSeconds: 4, maxSeconds: 8 },
      { clip: 'LookAround', minSeconds: 2, maxSeconds: 4 },
    ],
  },
  // Sits and nurses a soda: idle, sip, idle, sigh.
  'soda-drinker': {
    id: 'soda-drinker',
    steps: [
      { clip: 'SitIdle', minSeconds: 5, maxSeconds: 9 },
      { clip: 'Drink', minSeconds: 2, maxSeconds: 3 },
      { clip: 'SitIdle', minSeconds: 4, maxSeconds: 7 },
      { clip: 'Sigh', minSeconds: 1.5, maxSeconds: 2.5 },
    ],
  },
  // Sits on a bench playing a handheld: mostly playing, occasional glance up.
  'bench-gamer': {
    id: 'bench-gamer',
    steps: [
      { clip: 'Play', minSeconds: 6, maxSeconds: 14 },
      { clip: 'GlanceUp', minSeconds: 1, maxSeconds: 2.5 },
      { clip: 'Play', minSeconds: 5, maxSeconds: 12 },
      { clip: 'Stretch', minSeconds: 2, maxSeconds: 3 },
    ],
  },
  // Reads, turning pages now and then.
  reader: {
    id: 'reader',
    steps: [
      { clip: 'Read', minSeconds: 7, maxSeconds: 16 },
      { clip: 'TurnPage', minSeconds: 1, maxSeconds: 2 },
    ],
  },
  // Restless waiter: paces, checks the clock, taps foot — random order.
  'restless-waiter': {
    id: 'restless-waiter',
    mode: 'random',
    steps: [
      { clip: 'Idle', minSeconds: 3, maxSeconds: 6, weight: 2 },
      { clip: 'CheckClock', minSeconds: 1.5, maxSeconds: 3 },
      { clip: 'TapFoot', minSeconds: 2, maxSeconds: 4 },
      { clip: 'LookAround', minSeconds: 2, maxSeconds: 4 },
    ],
  },
};

export function resolveBehavior(b: string | Behavior | undefined): Behavior | null {
  if (!b) return null;
  if (typeof b === 'string') return BEHAVIORS[b] ?? null;
  return b;
}

export interface BehaviorDriver {
  update(dt: number): void;
}

// Drives a mixer through a behavior's steps, crossfading between clips. Each
// driver randomizes its own timing and starting point so a crowd of identical
// models never moves in lockstep. Returns null if the model has none of the
// behavior's clips (caller can then fall back to a single default clip).
export function createBehaviorDriver(
  mixer: THREE.AnimationMixer,
  clips: THREE.AnimationClip[],
  behavior: Behavior,
): BehaviorDriver | null {
  const steps = behavior.steps.filter((s) => THREE.AnimationClip.findByName(clips, s.clip));
  if (steps.length === 0) return null;

  const crossfade = behavior.crossfade ?? 0.35;
  const mode = behavior.mode ?? 'sequence';
  const totalWeight = steps.reduce((sum, s) => sum + (s.weight ?? 1), 0);

  let current: THREE.AnimationAction | null = null;
  let index = -1;
  let timeLeft = 0;

  const pickNext = (): BehaviorStep => {
    if (mode === 'random') {
      let r = Math.random() * totalWeight;
      for (const s of steps) {
        r -= s.weight ?? 1;
        if (r <= 0) return s;
      }
      return steps[steps.length - 1];
    }
    index = (index + 1) % steps.length;
    return steps[index];
  };

  const enter = (step: BehaviorStep): void => {
    const clip = THREE.AnimationClip.findByName(clips, step.clip)!;
    const next = mixer.clipAction(clip);
    next.reset();
    next.enabled = true;
    next.setEffectiveTimeScale(1);
    next.setEffectiveWeight(1);
    next.play();
    if (current && current !== next) current.crossFadeTo(next, crossfade, false);
    current = next;
    const min = step.minSeconds ?? clip.duration;
    const max = Math.max(min, step.maxSeconds ?? clip.duration);
    timeLeft = min + Math.random() * (max - min);
  };

  enter(pickNext());
  timeLeft *= Math.random(); // random head start so identical NPCs desync

  return {
    update(dt: number): void {
      timeLeft -= dt;
      if (timeLeft <= 0) enter(pickNext());
    },
  };
}
