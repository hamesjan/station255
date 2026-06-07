# Guide: making your own characters (Blender + Mixamo)

> Pipeline chosen for station255: **low-poly 3D**. You model each character once,
> give it several animated actions, and the game's pixel render pass makes it read
> as "8-bit." Every asset ends up **owned by you and fully customizable** — no
> generated or licensed art is required (Mixamo's motions are free to use, and you
> can always replace them with your own keyframes).

## The big idea

- **Model once, animate many.** A single GLB can carry many actions (`Idle`,
  `Drink`, `Play`, `Sigh`…). The engine sequences them into a personality via a
  **behavior** (`src/world/characters/behavior.ts`).
- **One model → many individuals.** Tint, scale, mirror, facing, and behavior are
  set per-placement, so the same `passenger.glb` becomes a whole crowd of
  distinct people without re-modelling.
- **8-bit feel comes from the engine, not the model.** Keep models low-poly with
  small, chunky textures; the low-res render pass + nearest-filter does the rest.
  Don't fight for smoothness — embrace blocky.

## Tools (all free, all yours)

| tool | role | cost |
|------|------|------|
| **Blender** | model, UV, texture, retarget, export GLB | free |
| **Mixamo** (adobe) | auto-rig a humanoid + a big library of motions | free |
| **Blender VRM/CC add-ons** | optional, for stylized base meshes | free |
| (optional) **MagicaVoxel** | build blocky voxel bodies, export to Blender | free |

If you'd rather not model from scratch, MagicaVoxel → export `.obj` → import to
Blender is the fastest way to a chunky "8-bit in 3D" body you fully own.

## Per-character workflow

### 1. Model the body (Blender)
- Low-poly. Aim for a clear silhouette — personality reads at a distance from the
  shape (hat, bag, posture), not fine detail.
- **Y-up, feet at the world origin (0,0,0)**, facing **+Z**. Apply all transforms
  (`Ctrl+A → All Transforms`). Scale so the character is ~**1.8 m** tall.
- Keep it to a few materials. **Name the shirt/torso material `shirt`** so the
  game can recolor it per instance (`tint`). Small textures (e.g. 64–256 px) keep
  the pixel look and the bundle small.

### 2. Rig + base motions (Mixamo)
- Export the body as FBX (or use Mixamo's uploader). On mixamo.com: upload →
  place the rig markers → it auto-rigs a humanoid.
- Download the motions you want **with skin** the first time, then **without
  skin** for the rest (smaller). Grab actions that match your behaviors, e.g.
  for `soda-drinker`: a sitting idle, a drinking motion, a sigh/shrug.
- Settings: 30 fps, "In Place" for stationary NPCs so they don't drift.

### 3. Combine actions into one GLB (Blender)
- Import the rigged mesh, then import each motion FBX. In the **Nonlinear
  Animation (NLA)** editor / Action editor you'll have several actions.
- **Rename each action to the clip name the behavior expects** (this is the key
  step). For a bench gamer: rename to `Play`, `GlanceUp`, `Stretch`. See the
  clip-name table in `assets/models/README.md`.
- Push each action down as an NLA strip so all clips export.

### 4. Export
- `File → Export → glTF 2.0 (.glb)`:
  - Format **glTF Binary (.glb)**.
  - Include **Animations** (and "Group by NLA Track" / all actions).
  - +Y up. Apply modifiers. Export selected or the armature+mesh.
- Save as `assets/models/<name>.glb`. The filename becomes the **kind id**.

### 5. Place them in the station
Edit `PLACEMENTS` in `src/world/characters/index.ts`. Reuse one model as many
people:

```ts
{ kind: 'passenger', x: 8,  z: 2.6, variation: { tint: '#8fc6ff', rotationY: -1.2, behavior: 'loiterer' } },
{ kind: 'passenger', x: 0,  z: 1.7, variation: { tint: '#f0a0a0', scale: 0.97,     behavior: 'soda-drinker' } },
{ kind: 'passenger', x: -30,z: 1.7, variation: { tint: '#f0e2a0', mirror: true,     behavior: 'bench-gamer' } },
```

Run `npm run dev` and walk over to them.

## Making each person feel like a *person*

Personality lives in two places — split deliberately:

1. **The art** (Blender): silhouette, palette, props (a hat, a guitar case, a
   shopping bag), posture, the specific actions you animate.
2. **The behavior** (code, `behavior.ts`): *which* actions, *how often*, *what
   order*, and the timing. The `restless-waiter` and the `reader` can share a
   model and still feel like opposite temperaments because their routines differ.

To add a new personality, add an entry to `BEHAVIORS` in `behavior.ts` listing
the clip names and how long to hold each, then reference its id from a placement.
Use `mode: 'random'` for fidgety, unpredictable characters and the default
`sequence` for characters with a clear loop.

## Tips & gotchas

- **Clip names are the contract.** If a behavior looks alive on one model and
  dead on another, the second model is probably missing those clip names — check
  the names in Blender's Action editor match the behavior exactly.
- **Facing:** default forward is +Z. If a model exports facing the wrong way,
  either rotate the mesh 180° in Blender (and apply) or set `rotationY: Math.PI`.
- **Seated characters:** model/animate them seated and place them at the bench's
  seat height/position; there's no physics, you place them by hand (x, z) and the
  origin sits on the floor — bake the "sitting up off the floor" into the clip or
  raise via a small future `baseY`/offset if needed.
- **Performance:** each animated model runs a mixer; dozens are fine. If you ever
  add a big crowd, give distant background people a single `Idle` instead of a
  full behavior.
- **Keep it owned:** if you use a Mixamo motion you're happy with, that's fine to
  ship; if you want 100% hand-authored, key the actions yourself in Blender — the
  pipeline is identical from step 3 on.

## What the engine already does for you
- Auto-registers every `.glb` here as a kind (filename = id).
- Clones the model per placement (skinned-safe) and recolors the `shirt`.
- Nearest-filters textures for the pixel look.
- Runs behaviors with crossfades and per-instance desynced timing.
