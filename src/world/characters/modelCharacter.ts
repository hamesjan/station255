import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { CharacterInstance, CharacterKind, CharacterVariation } from './types';
import { type Behavior, type BehaviorDriver, createBehaviorDriver, resolveBehavior } from './behavior';

export interface ModelKindOptions {
  baseScale?: number; // scale applied to every instance (fit the model to ~1.8m)
  colliderRadius?: number;
  recolorMaterial?: string; // material whose name contains this gets tinted per-instance
  defaultAnimation?: string; // single clip to play if a placement picks neither animation nor behavior
  defaultBehavior?: string | Behavior; // personality routine to run if a placement doesn't pick one
  pixelate?: boolean; // nearest-filter the model's textures for the Doom look (default true)
}

interface Loaded {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
}

// Builds a CharacterKind backed by a glTF/GLB file. The model loads once
// (lazily, on first spawn) and is cloned for each instance, so you can place
// many and make each unique via scale, mirror, tint, and animation clip.
// SkeletonUtils.clone is used so skinned/animated meshes clone correctly.
export function createModelKind(id: string, url: string, opts: ModelKindOptions = {}): CharacterKind {
  let loaded: Loaded | null = null;
  let loading: Promise<void> | null = null;
  const loader = new GLTFLoader();

  const ensureLoaded = (): Promise<void> => {
    if (!loading) {
      loading = new Promise<void>((resolve) => {
        loader.load(
          url,
          (gltf) => {
            loaded = { scene: gltf.scene, animations: gltf.animations };
            if (opts.pixelate !== false) pixelateTextures(loaded.scene);
            // Procedural meshes (spheres/cylinders) can have mixed winding; render
            // both sides so curved limbs never show through as holes.
            eachMaterial(loaded.scene, (m) => (m.side = THREE.DoubleSide));
            resolve();
          },
          undefined,
          (err) => {
            console.warn(`[characters] failed to load model "${url}":`, err);
            resolve(); // fail soft — this character simply won't appear
          },
        );
      });
    }
    return loading;
  };

  return {
    id,
    create(v: CharacterVariation): CharacterInstance {
      const object = new THREE.Group();
      if (v.rotationY) object.rotation.y = v.rotationY;
      let mixer: THREE.AnimationMixer | null = null;
      let driver: BehaviorDriver | null = null;

      // Async: the model pops in when the GLB finishes loading.
      void ensureLoaded().then(() => {
        if (!loaded) return;
        const model = cloneSkinned(loaded.scene);
        const scale = (opts.baseScale ?? 1) * (v.scale ?? 1);
        model.scale.setScalar(scale);
        if (v.mirror) model.scale.x *= -1;
        if (v.tint && opts.recolorMaterial) recolor(model, opts.recolorMaterial, v.tint);
        object.add(model);

        if (loaded.animations.length === 0) return;
        mixer = new THREE.AnimationMixer(model);

        // A behavior (a routine of clips) takes priority; otherwise play one clip.
        const behavior = resolveBehavior(v.behavior ?? opts.defaultBehavior);
        if (behavior) {
          driver = createBehaviorDriver(mixer, loaded.animations, behavior);
          if (driver) return; // driver picked and started its first clip
        }

        const clipName = v.animation ?? opts.defaultAnimation;
        // Use the named clip if it exists, else just play the model's first clip.
        const clip =
          (clipName && THREE.AnimationClip.findByName(loaded.animations, clipName)) ||
          loaded.animations[0];
        if (clip) {
          mixer.clipAction(clip).play();
          mixer.setTime(Math.random() * clip.duration); // desync identical models
        }
      });

      return {
        object,
        baseY: 0,
        collider: { halfX: opts.colliderRadius ?? 0.3, halfZ: opts.colliderRadius ?? 0.3 },
        update: (dt) => {
          driver?.update(dt);
          mixer?.update(dt);
        },
      };
    },
  };
}

type MaterialVisitor = (m: THREE.Material, replace: (next: THREE.Material) => void) => void;

function eachMaterial(root: THREE.Object3D, fn: MaterialVisitor): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (!mat) return;
    if (Array.isArray(mat)) {
      mat.forEach((m, i) => fn(m, (next) => ((mesh.material as THREE.Material[])[i] = next)));
    } else {
      fn(mat, (next) => (mesh.material = next));
    }
  });
}

function recolor(root: THREE.Object3D, namePart: string, color: string): void {
  const want = namePart.toLowerCase();
  eachMaterial(root, (m, replace) => {
    if (m.name && m.name.toLowerCase().includes(want)) {
      const cloned = m.clone();
      if ('color' in cloned) (cloned as THREE.MeshStandardMaterial).color = new THREE.Color(color);
      replace(cloned);
    }
  });
}

function pixelateTextures(root: THREE.Object3D): void {
  eachMaterial(root, (m) => {
    const map = (m as THREE.MeshStandardMaterial).map;
    if (map) {
      map.magFilter = THREE.NearestFilter;
      map.minFilter = THREE.NearestFilter;
      map.generateMipmaps = false;
      map.needsUpdate = true;
    }
  });
}
