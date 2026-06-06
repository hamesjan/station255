import * as THREE from 'three';
import { DIMS, PALETTE } from '../config';
import * as tex from './textures';

const easeOut = (k: number): number => 1 - Math.pow(1 - k, 3);
const easeIn = (k: number): number => k * k * k;
const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;

// A 4-car train that cycles every 3 minutes: glides in from one end, eases to a
// stop at the platform, dwells, then accelerates off into the fog. The track is
// empty the rest of the time.
export class Train {
  readonly group = new THREE.Group();

  private t = 172; // start late in the cycle so the first train arrives ~8s in
  private readonly period = 180; // every 3 minutes
  private readonly arrive = 7;
  private readonly dwell = 18;
  private readonly depart = 6;
  private readonly xStop = 0;
  private readonly xStart = -150;
  private readonly xEnd = 150;

  constructor() {
    const carLen = 16;
    const gap = 1;
    const cars = 4;
    const trainLen = cars * carLen + (cars - 1) * gap;

    const sideTex = tex.trainSideTexture();
    sideTex.repeat.set(2, 1);
    const bodyTex = tex.trainBodyTexture();
    bodyTex.repeat.set(2, 1);

    const side = new THREE.MeshLambertMaterial({ map: sideTex });
    const body = new THREE.MeshLambertMaterial({ map: bodyTex });
    const roof = new THREE.MeshLambertMaterial({ color: PALETTE.trainTrim });
    // BoxGeometry face order: +X, -X, +Y, -Y, +Z, -Z. The platform side is -Z.
    const mats = [body, body, roof, body, body, side];

    const y = DIMS.floorY - DIMS.pitDepth + DIMS.trainHeight / 2;
    for (let i = 0; i < cars; i++) {
      const car = new THREE.Mesh(
        new THREE.BoxGeometry(carLen, DIMS.trainHeight, DIMS.trainDepth),
        mats,
      );
      const lx = -trainLen / 2 + carLen / 2 + i * (carLen + gap);
      car.position.set(lx, y, DIMS.trainZ);
      this.group.add(car);
    }
    this.group.visible = false;
  }

  update(dt: number): void {
    this.t = (this.t + dt) % this.period;
    const a = this.arrive;
    const d = this.dwell;
    const p = this.depart;

    let x: number;
    let visible = true;
    if (this.t < a) {
      x = lerp(this.xStart, this.xStop, easeOut(this.t / a)); // decelerate in
    } else if (this.t < a + d) {
      x = this.xStop; // dwell
    } else if (this.t < a + d + p) {
      x = lerp(this.xStop, this.xEnd, easeIn((this.t - a - d) / p)); // accelerate off
    } else {
      x = this.xEnd;
      visible = false; // gone
    }

    this.group.position.x = x;
    this.group.visible = visible;
  }
}
