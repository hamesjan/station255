import * as THREE from 'three';

// Something the player can walk up to and trigger with Space.
export interface Interactable {
  position: THREE.Vector3;
  radius: number;
  prompt: string;
  interact(): void;
}

// A talkable person/thing described by the world (data only). The Game turns
// each of these into an Interactable wired to the dialogue box + notebook.
export interface NpcInteraction {
  position: THREE.Vector3;
  name: string;
  lines: string[];
  note?: { id: string; title: string; body: string };
}

// Each frame, finds the interactable the player is closest to *and* roughly
// facing — so you talk to the person you're looking at, not one behind you.
export class Interactions {
  active: Interactable | null = null;

  private readonly items: Interactable[] = [];
  private readonly toTarget = new THREE.Vector3();
  private readonly fwd = new THREE.Vector3();

  add(item: Interactable): void {
    this.items.push(item);
  }

  update(camera: THREE.Camera): void {
    camera.getWorldDirection(this.fwd);
    this.fwd.y = 0;
    this.fwd.normalize();

    let best: Interactable | null = null;
    let bestDist = Infinity;
    for (const it of this.items) {
      this.toTarget.copy(it.position).sub(camera.position);
      this.toTarget.y = 0;
      const dist = this.toTarget.length();
      if (dist > it.radius || dist < 1e-3) continue;
      this.toTarget.normalize();
      if (this.toTarget.dot(this.fwd) < 0.5) continue; // must be looking toward it
      if (dist < bestDist) {
        bestDist = dist;
        best = it;
      }
    }
    this.active = best;
  }
}
