# Plan: VRoid / VRM character support

> Status: **not started.** Lets VRoid Studio avatars (`.vrm`) be used as
> characters within the existing `CharacterKind` system.

## Goal
Use VRoid avatars in the station with idle animation and (optionally) spring-bone
hair/cloth motion and expressions, rendered through the existing pixel pipeline.

## Background
- VRoid exports **VRM** — a glTF extension with a humanoid bone map, **MToon**
  toon materials, blendshape expressions (blink/mouth), and **spring bones**
  (jiggle).
- Today's `src/world/characters/modelCharacter.ts` uses plain `GLTFLoader`: it
  loads the mesh but ignores VRM extensions, so materials can render wrong,
  spring bones/expressions are absent, and the facing direction may be reversed.

## Two paths — do A first, add B when you want the extra life

### Path A — Convert VRM → GLB offline (fast, zero runtime deps)
1. Install the **VRM Add-on for Blender** (saturday06) → import `.vrm` → export
   `.glb`. (Alternatives: Unity + UniVRM, or a CLI converter.)
2. In Blender: fix orientation so it faces the platform, apply transforms, scale
   to ~1.8 m, put **feet at the origin**.
3. Rig + animate: upload the GLB to **Mixamo** for auto-rig + idle/sit/lean
   clips; re-export GLB with animation.
4. Drop in `assets/models/` → already works via `createModelKind` (kind =
   filename). Name a material containing **"shirt"** so `tint` works.
- **Pros:** no new deps, works today, smaller bundle, full control of the look.
- **Cons:** manual per model; loses spring bones + expressions unless baked.

### Path B — Runtime VRM via `@pixiv/three-vrm` (full VRM)
1. `npm i @pixiv/three-vrm`.
2. New kind `src/world/characters/vrmCharacter.ts` → `createVrmKind(id, url, opts)`
   mirroring `createModelKind`, but:
   - `loader.register(parser => new VRMLoaderPlugin(parser))`.
   - On load: `const vrm = gltf.userData.vrm; VRMUtils.removeUnnecessaryJoints(vrm.scene);`
   - **Orientation:** VRM0 faces **−Z**; set `vrm.scene.rotation.y = Math.PI`
     (or use VRM1) so it faces the player/tracks. Verify per export.
   - `update(dt)`: call **both** `vrm.update(dt)` (spring bones + lookAt) and
     `mixer.update(dt)`.
   - **Tint:** MToon materials — find the material whose name contains "shirt"
     and set its color (adapt `recolor`; MToon exposes color via material/uniforms).
   - Keep nearest-filter on maps for the pixel look.
3. Auto-discover: add a `vrmAssets.ts` (like `modelAssets.ts`) globbing
   `assets/models/*.vrm` and register each via `createVrmKind`.
4. Animations: retarget Mixamo clips to the VRM humanoid using the three-vrm
   `loadMixamoAnimation` recipe (maps Mixamo bone names → VRM humanoid bones),
   or author clips directly against VRM bones.

## Gotchas
- **Cloning:** a VRM isn't safely `SkeletonUtils.clone`-able with all its
  bindings. For multiple instances of one VRM, cache the fetched `ArrayBuffer`
  and `parse` per instance (heavier), or limit unique VRMs. Decide and document.
- **VRM0 vs VRM1:** different forward axis / conventions → different
  orientation. Branch on `vrm.meta.metaVersion`.
- **Performance:** `vrm.update` spring bones cost per instance — cap active VRMs
  or disable spring bones for distant/background people.
- **MToon vs the flat daylight world:** toon shading may clash; consider
  normalizing to MeshLambert/Basic for consistency, or accept MToon.

## Acceptance
- A `.vrm` in `assets/models/` shows up as a placeable kind; stands/sits at the
  right scale and facing; plays an idle; shirt is tintable; (Path B) gentle hair
  motion; renders pixelated through the existing pipeline.

## Decisions to make later
- Path A (GLB) vs Path B (runtime VRM) — or both (B for foreground "hero" NPCs,
  GLB for the crowd).
- Keep MToon toon shading or normalize to the world's flat look.
- VRM instance budget (cloning strategy + spring-bone perf).
