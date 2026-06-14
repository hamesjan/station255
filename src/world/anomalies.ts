import * as THREE from 'three';
import { DIMS, PALETTE } from '../config';
import * as tex from './textures';
import type { Box2D } from './types';
import type { NpcSpec } from './characters/types';
import { makePottedPlant } from './scenery';

export interface Anomalies {
  group: THREE.Group;
  colliders: Box2D[];
  interactions: NpcSpec[];
  update: (dt: number) => void;
}

const lambert = (color: string): THREE.MeshLambertMaterial => new THREE.MeshLambertMaterial({ color });

// The quietly-wrong things scattered through the station. Each looks almost
// ordinary; the catch is in the detail. Their interaction radius is tight on
// purpose — you have to line them up to notice.
export function buildAnomalies(): Anomalies {
  const group = new THREE.Group();
  const colliders: Box2D[] = [];
  const interactions: NpcSpec[] = [];
  const updaters: ((dt: number) => void)[] = [];
  let clock = 0;

  const anomaly = (
    x: number,
    z: number,
    y: number,
    name: string,
    lines: string[],
    note: { id: string; title: string; body: string },
    radius = 1.0,
  ): void => {
    interactions.push({ position: new THREE.Vector3(x, DIMS.floorY + y, z), name, lines, note, radius, examine: true });
  };

  // 1) A soda can hovering a hand's width above the left bench, slowly turning.
  {
    const bx = -30;
    const bz = 1.45;
    const can = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.18, 12), lambert('#e6736b'));
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 12), lambert('#c9c9cf'));
    top.position.y = 0.1;
    can.add(body, top);
    can.position.set(bx, DIMS.floorY + 0.78, bz);
    group.add(can);
    updaters.push((dt) => {
      can.rotation.y += dt * 0.6;
      can.position.y = DIMS.floorY + 0.78 + Math.sin(clock * 1.4) * 0.03;
    });
    anomaly(bx, bz, 0.9, 'the floating can', [
      'A soda can, upright in the air above the bench.',
      'It turns, very slowly, like it’s on a shelf you can’t see.',
      'No string. No hand. It just… won’t come down.',
    ], { id: 'anom-can', title: 'The Can That Won’t Land', body: 'A soda can hovering a hand’s width over the left bench, turning on nothing.' });
  }

  // 2) A potted plant identical to the others — but drained of all colour.
  {
    const x = 30;
    const z = DIMS.walkMinZ + 0.7;
    const grey = makePottedPlant({ scale: 1.1, foliage: '#9aa19b', foliageDeep: '#7d847e', planter: '#9b9b9b', flower: '#c4c4c4' });
    grey.position.set(x, DIMS.floorY, z);
    group.add(grey);
    colliders.push({ minX: x - 0.3, maxX: x + 0.3, minZ: z - 0.3, maxZ: z + 0.3 });
    anomaly(x, z, 0.8, 'the colorless fern', [
      'The same potted fern as the others down the platform.',
      'Except every part of it is grey. Leaves, soil, the little flowers.',
      'Like someone pulled the color out of this one square of the world.',
    ], { id: 'anom-fern', title: 'The Colorless Fern', body: 'One potted plant, identical to its neighbours, completely drained of color.' });
  }

  // 3) A puddle on the dry platform floor that ripples with nothing dripping.
  {
    const px = 8;
    const pz = 2.2;
    const puddle = new THREE.Group();
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(0.7, 24),
      new THREE.MeshBasicMaterial({ map: tex.rippleTexture(), transparent: true, opacity: 0.5 }),
    );
    disc.rotation.x = -Math.PI / 2;
    puddle.add(disc);
    const rings: THREE.Mesh[] = [];
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.5, 0.6, 24),
        new THREE.MeshBasicMaterial({ color: '#d6f1ff', transparent: true, opacity: 0.5, side: THREE.DoubleSide }),
      );
      ring.rotation.x = -Math.PI / 2;
      puddle.add(ring);
      rings.push(ring);
    }
    puddle.position.set(px, DIMS.floorY + 0.02, pz);
    group.add(puddle);
    updaters.push(() => {
      rings.forEach((ring, i) => {
        const t = (clock * 0.45 + i / rings.length) % 1; // 0..1 expanding cycle
        const s = 0.15 + t * 0.95;
        ring.scale.setScalar(s);
        (ring.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.55;
      });
    });
    anomaly(px, pz, 0.6, 'the indoor puddle', [
      'A puddle, here, under the dry canopy.',
      'Rings spread across it, over and over — but nothing is dripping.',
      'You look up. The ceiling is bone dry.',
    ], { id: 'anom-puddle', title: 'The Indoor Puddle', body: 'A puddle on the dry platform, rippling steadily with no water falling into it.' }, 1.1);
  }

  // 4) A second wall clock whose hands run backward.
  {
    const cx = 20;
    const cy = 3.0;
    const cz = DIMS.walkMinZ + 0.06;
    const g = new THREE.Group();
    const rim = new THREE.Mesh(new THREE.CircleGeometry(0.5, 24), lambert('#3a4a3f'));
    rim.position.set(cx, cy, cz - 0.01);
    const face = new THREE.Mesh(
      new THREE.CircleGeometry(0.46, 24),
      new THREE.MeshLambertMaterial({ map: tex.clockFaceTexture(), transparent: true }),
    );
    face.position.set(cx, cy, cz);
    g.add(rim, face);
    const mkHand = (len: number, wid: number, zoff: number): THREE.Group => {
      const pivot = new THREE.Group();
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(wid, len, 0.01), new THREE.MeshBasicMaterial({ color: '#2c3a2f' }));
      mesh.position.y = len / 2 - 0.04;
      pivot.add(mesh);
      pivot.position.set(cx, cy, cz + zoff);
      g.add(pivot);
      return pivot;
    };
    const minute = mkHand(0.4, 0.03, 0.02);
    const second = mkHand(0.42, 0.012, 0.03);
    group.add(g);
    updaters.push(() => {
      const now = new Date();
      const s = now.getSeconds() + now.getMilliseconds() / 1000;
      const mn = now.getMinutes() + s / 60;
      // note the +: time winds the wrong way
      minute.rotation.z = +(mn / 60) * Math.PI * 2;
      second.rotation.z = +(s / 60) * Math.PI * 2;
    });
    anomaly(cx, DIMS.walkMinZ + 0.7, cy - 1.2, 'the backward clock', [
      'Another station clock, same as the big one.',
      'You watch the second hand. It’s sweeping… counter-clockwise.',
      'Tick. Tick. Tick — away from now.',
    ], { id: 'anom-clock', title: 'The Backward Clock', body: 'A second wall clock identical to the real one, its hands turning counter-clockwise.' }, 1.2);
  }

  // 5) A door set into the back wall where there has never been a door.
  {
    const dx = -12;
    const dy = 1.4;
    const dz = DIMS.walkMinZ + 0.04;
    const g = new THREE.Group();
    const frameMat = lambert('#cdb892');
    const frame = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 2.5), frameMat);
    frame.position.set(dx, dy, dz);
    const gapMat = new THREE.MeshBasicMaterial({ color: '#05080a' });
    const gap = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 2.3), gapMat);
    gap.position.set(dx, dy, dz + 0.005);
    // a faint glow line down the seam, to make it "breathe"
    const seamMat = new THREE.MeshBasicMaterial({ color: '#9fe3ff', transparent: true, opacity: 0.35 });
    const seam = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 2.3), seamMat);
    seam.position.set(dx + 0.2, dy, dz + 0.01);
    g.add(frame, gap, seam);
    group.add(g);
    updaters.push(() => {
      seamMat.opacity = 0.18 + (Math.sin(clock * 1.1) * 0.5 + 0.5) * 0.4; // slow breathing
    });
    anomaly(dx, DIMS.walkMinZ + 0.7, dy, 'the new door', [
      'A door. Standing slightly open in the wall.',
      'You walk this platform every day. There was never a door here.',
      'Cold air leaks from the gap. It is very dark inside.',
    ], { id: 'anom-door', title: 'The Door That Wasn’t There', body: 'A door ajar in the back wall, where the wall has always been blank. Cold air, total dark beyond.' }, 1.3);
  }

  // 6) A support pillar that hovers a few centimetres above the floor.
  {
    const px = -40;
    const pz = DIMS.walkMinZ + 0.5;
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(1, DIMS.wallHeight - 0.4, 0.7), lambert(PALETTE.pillar));
    const base = DIMS.floorY + 0.34;
    pillar.position.set(px, base + (DIMS.wallHeight - 0.4) / 2, pz);
    group.add(pillar);
    updaters.push(() => {
      pillar.position.y = base + (DIMS.wallHeight - 0.4) / 2 + Math.sin(clock * 0.8) * 0.015;
    });
    anomaly(px, pz + 0.6, 1.2, 'the hovering pillar', [
      'A concrete pillar, holding up the canopy like all the rest.',
      'You crouch. There’s a clean gap of air beneath it — it touches nothing.',
      'It bears the weight of the roof on nothing at all.',
    ], { id: 'anom-pillar', title: 'The Hovering Pillar', body: 'A load-bearing pillar floating a few centimetres clear of the floor, holding up the roof on empty air.' }, 1.1);
  }

  const update = (dt: number): void => {
    clock += dt;
    for (const u of updaters) u(dt);
  };

  return { group, colliders, interactions, update };
}
