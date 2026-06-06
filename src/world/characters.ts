import * as THREE from 'three';
import { DIMS } from '../config';
import * as tex from './textures';
import type { Box2D } from './types';

export interface Characters {
  group: THREE.Group;
  colliders: Box2D[];
  update: (dt: number) => void;
}

const SKIN = ['#e8b890', '#c98a5e', '#f0c1a0', '#a76b43'];
const HAIR = ['#3a2a1a', '#1c1c1c', '#6b4a2a', '#8a8a8a', '#c9a24a'];
const SHIRT = ['#9ed8a8', '#8fc6ff', '#f0e2a0', '#e6a6a0', '#cdbce8', '#f4f7f2'];
const PANTS = ['#5a6b62', '#3a4a5a', '#6b5a4a', '#414a44', '#5b6e7a'];

interface Look {
  skin: string;
  hair: string;
  shirt: string;
  pants: string;
  sitting: boolean;
}

// Blocky pixel person painted on a 24x48 canvas, standing or seated.
function drawPerson(ctx: CanvasRenderingContext2D, w: number, h: number, o: Look): void {
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2;

  if (!o.sitting) {
    ctx.fillStyle = o.pants;
    ctx.fillRect(cx - 5, 30, 4, 16);
    ctx.fillRect(cx + 1, 30, 4, 16);
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(cx - 6, 44, 5, 3);
    ctx.fillRect(cx + 1, 44, 5, 3);
    ctx.fillStyle = o.shirt;
    ctx.fillRect(cx - 6, 16, 12, 16);
    ctx.fillRect(cx - 8, 16, 3, 13);
    ctx.fillRect(cx + 5, 16, 3, 13);
    ctx.fillStyle = o.skin;
    ctx.fillRect(cx - 8, 27, 3, 3);
    ctx.fillRect(cx + 5, 27, 3, 3);
    ctx.fillRect(cx - 4, 6, 8, 9);
    ctx.fillStyle = o.hair;
    ctx.fillRect(cx - 5, 4, 10, 4);
    ctx.fillRect(cx - 5, 4, 2, 7);
    ctx.fillRect(cx + 3, 4, 2, 7);
  } else {
    ctx.fillStyle = o.pants;
    ctx.fillRect(cx - 6, 30, 12, 5); // thighs
    ctx.fillRect(cx - 6, 35, 4, 9); // shins
    ctx.fillRect(cx + 2, 35, 4, 9);
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(cx - 7, 43, 5, 3);
    ctx.fillRect(cx + 2, 43, 5, 3);
    ctx.fillStyle = o.shirt;
    ctx.fillRect(cx - 6, 18, 12, 14);
    ctx.fillRect(cx - 8, 18, 3, 12);
    ctx.fillRect(cx + 5, 18, 3, 12);
    ctx.fillStyle = o.skin;
    ctx.fillRect(cx - 4, 8, 8, 9);
    ctx.fillStyle = o.hair;
    ctx.fillRect(cx - 5, 6, 10, 4);
    ctx.fillRect(cx - 5, 6, 2, 7);
    ctx.fillRect(cx + 3, 6, 2, 7);
  }
}

function personSprite(variant: number, sitting: boolean): THREE.Sprite {
  const look: Look = {
    skin: SKIN[variant % SKIN.length],
    hair: HAIR[(variant * 2) % HAIR.length],
    shirt: SHIRT[variant % SHIRT.length],
    pants: PANTS[(variant + 1) % PANTS.length],
    sitting,
  };
  const texture = tex.spriteTexture(24, 48, (ctx, w, h) => drawPerson(ctx, w, h, look));
  // alphaTest (not blending) keeps crisp pixel cutouts and correct depth/fog.
  const mat = new THREE.SpriteMaterial({ map: texture, alphaTest: 0.5, transparent: false });
  return new THREE.Sprite(mat);
}

interface Spec {
  x: number;
  z: number;
  sitting: boolean;
  variant: number;
}

// People scattered along the platform, just chilling.
const SPECS: Spec[] = [
  { x: 0, z: 1.62, sitting: true, variant: 0 },
  { x: -30, z: 1.62, sitting: true, variant: 3 },
  { x: -18, z: 2.8, sitting: false, variant: 1 },
  { x: 14, z: -2.3, sitting: false, variant: 2 },
  { x: 36, z: 2.4, sitting: false, variant: 4 },
  { x: -41, z: 2.1, sitting: false, variant: 5 },
];

export function buildCharacters(): Characters {
  const group = new THREE.Group();
  const colliders: Box2D[] = [];
  const idle: { sprite: THREE.Sprite; baseY: number; amp: number; speed: number; phase: number }[] = [];
  let clock = 0;

  for (const s of SPECS) {
    const sprite = personSprite(s.variant, s.sitting);
    const w = s.sitting ? 0.78 : 0.95;
    const h = s.sitting ? 1.5 : 1.9;
    sprite.scale.set(w, h, 1);
    const baseY = s.sitting ? 0.78 : DIMS.floorY + h / 2;
    sprite.position.set(s.x, baseY, s.z);
    group.add(sprite);

    idle.push({
      sprite,
      baseY,
      amp: s.sitting ? 0.008 : 0.02,
      speed: 1.1 + Math.random() * 0.6,
      phase: Math.random() * Math.PI * 2,
    });

    // Standing people are solid; seated ones share their bench's collider.
    if (!s.sitting) {
      colliders.push({ minX: s.x - 0.3, maxX: s.x + 0.3, minZ: s.z - 0.3, maxZ: s.z + 0.3 });
    }
  }

  const update = (dt: number): void => {
    clock += dt;
    for (const c of idle) {
      c.sprite.position.y = c.baseY + Math.sin(clock * c.speed + c.phase) * c.amp;
    }
  };

  return { group, colliders, update };
}
