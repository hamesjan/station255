import * as THREE from 'three';
import { DIMS } from '../config';
import type { Input } from './input';

// Where the player may stand: position is resolved each frame by this callback,
// so the world owns collision and the player just asks "can I be here?".
export type CollideFn = (x: number, z: number) => { x: number; z: number };

// First-person walker. Stays at eye height on the platform — no jumping or
// flying — with mouselook and a gentle head-bob while moving.
export class Player {
  readonly camera: THREE.PerspectiveCamera;

  private x: number;
  private z: number;
  private yaw = Math.PI; // start facing down the platform (-X end -> +X)
  private pitch = 0;
  private bobPhase = 0;
  private readonly turnSpeed = 2.2; // yaw radians/sec from arrow keys
  private readonly pitchSpeed = 1.6; // pitch radians/sec from arrow keys

  constructor(startX: number, startZ: number) {
    this.x = startX;
    this.z = startZ;
    this.camera = new THREE.PerspectiveCamera(72, 1, 0.05, 400);
  }

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  // Keyboard-only: arrow keys look, WASD moves. `frozen` holds the player still
  // while a menu/dialogue is open.
  update(dt: number, input: Input, collide: CollideFn, frozen = false): void {
    if (frozen) {
      this.camera.position.set(this.x, DIMS.floorY + DIMS.eyeHeight, this.z);
      this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
      return;
    }

    // look — arrow keys (left/right yaw, up/down pitch)
    const turn = (input.isDown('ArrowLeft') ? 1 : 0) - (input.isDown('ArrowRight') ? 1 : 0);
    const look = (input.isDown('ArrowUp') ? 1 : 0) - (input.isDown('ArrowDown') ? 1 : 0);
    this.yaw += turn * this.turnSpeed * dt;
    this.pitch += look * this.pitchSpeed * dt;
    this.pitch = Math.max(-1.3, Math.min(1.3, this.pitch));

    const fwd = (input.isDown('KeyW') ? 1 : 0) - (input.isDown('KeyS') ? 1 : 0);
    const strafe = (input.isDown('KeyD') ? 1 : 0) - (input.isDown('KeyA') ? 1 : 0);

    if (fwd !== 0 || strafe !== 0) {
      const fwdX = -Math.sin(this.yaw);
      const fwdZ = -Math.cos(this.yaw);
      const rgtX = Math.cos(this.yaw);
      const rgtZ = -Math.sin(this.yaw);

      let vx = fwdX * fwd + rgtX * strafe;
      let vz = fwdZ * fwd + rgtZ * strafe;
      const len = Math.hypot(vx, vz) || 1;
      vx /= len;
      vz /= len;

      const dist = DIMS.moveSpeed * dt;
      const next = collide(this.x + vx * dist, this.z + vz * dist);
      this.x = next.x;
      this.z = next.z;
      this.bobPhase += dist * 2.3;
    }

    const bob = Math.sin(this.bobPhase) * 0.045;
    this.camera.position.set(this.x, DIMS.floorY + DIMS.eyeHeight + bob, this.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }
}
