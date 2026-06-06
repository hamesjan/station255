import * as THREE from 'three';
import * as tex from '../textures';
import type { CharacterInstance, CharacterKind, CharacterVariation } from './types';

// The built-in Doom-style billboard person, drawn procedurally. Serves as the
// reference implementation of a CharacterKind.

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
    ctx.fillRect(cx - 6, 30, 12, 5);
    ctx.fillRect(cx - 6, 35, 4, 9);
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
  const mat = new THREE.SpriteMaterial({ map: texture, alphaTest: 0.5, transparent: false });
  return new THREE.Sprite(mat);
}

export const pixelPersonKind: CharacterKind = {
  id: 'pixel-person',
  create(v: CharacterVariation): CharacterInstance {
    const sitting = v.pose === 'sit';
    const scale = v.scale ?? 1;
    const w = (sitting ? 0.78 : 0.95) * scale;
    const h = (sitting ? 1.5 : 1.9) * scale;

    const sprite = personSprite(v.variant ?? 0, sitting);
    sprite.scale.set(v.mirror ? -w : w, h, 1);
    sprite.position.y = h / 2;

    const object = new THREE.Group();
    object.add(sprite);

    const amp = sitting ? 0.008 : 0.02;
    const speed = 1.1 + Math.random() * 0.6;
    const phase = Math.random() * Math.PI * 2;

    return {
      object,
      baseY: 0,
      collider: sitting ? undefined : { halfX: 0.3, halfZ: 0.3 },
      update: (_dt, clock) => {
        sprite.position.y = h / 2 + Math.sin(clock * speed + phase) * amp;
      },
    };
  },
};
