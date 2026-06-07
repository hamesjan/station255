# Character models

Drop `.glb` files here and they become playable characters automatically — no
code changes needed. These are **your** models (made in Blender / Mixamo / etc.),
so every character in the station is owned and fully customizable by you. See the
full pipeline in [`docs/guide-characters-blender.md`](../../docs/guide-characters-blender.md).

## How it works

- A file named `passenger.glb` auto-registers as a character **kind** called
  `passenger` (the filename without the extension).
- To actually place one in the station, add an entry to `PLACEMENTS` in
  `src/world/characters/index.ts`:

  ```ts
  { kind: 'passenger', x: 8, z: 2.6, variation: { tint: '#8fc6ff', behavior: 'loiterer' } }
  ```

## Making each one unique (same model, many people)

The `variation` object on each placement varies an instance:

| field       | effect                                                              |
|-------------|--------------------------------------------------------------------|
| `tint`      | recolors the material whose name contains **shirt** (see below)    |
| `scale`     | height multiplier (e.g. `0.95` for a shorter person)               |
| `mirror`    | flips left/right so repeats don't look identical                   |
| `rotationY` | facing direction in radians (people face different ways)           |
| `behavior`  | a **personality routine** — sequences clips over time (see below)  |
| `animation` | a single looping clip if you don't want a routine (e.g. `Idle`)    |

For `tint` to work, name the swappable material **`shirt`** (or anything
containing that word) in your 3D tool. Identical models also get their timing
auto-desynced so a crowd doesn't move in lockstep.

## Personalities (the part that makes them feel alive)

A `behavior` makes a character cycle through different actions on their own —
this is how you get "one is drinking a soda, one is playing games on a bench."
Presets live in `src/world/characters/behavior.ts`. Each preset references
**animation clip names** that must exist in your GLB:

| behavior          | clips it looks for                          |
|-------------------|---------------------------------------------|
| `loiterer`        | `Idle`, `Phone`, `LookAround`               |
| `soda-drinker`    | `SitIdle`, `Drink`, `Sigh`                  |
| `bench-gamer`     | `Play`, `GlanceUp`, `Stretch`               |
| `reader`          | `Read`, `TurnPage`                          |
| `restless-waiter` | `Idle`, `CheckClock`, `TapFoot`, `LookAround` |

Missing clips are skipped gracefully, so a model with only `Idle` still works.
Name your Mixamo/Blender clips to match (rename them on export — see the guide),
or write your own behavior inline:

```ts
behavior: {
  id: 'window-watcher',
  steps: [
    { clip: 'Idle',     minSeconds: 6, maxSeconds: 12 },
    { clip: 'LookAround', minSeconds: 2, maxSeconds: 4 },
  ],
}
```

## Requirements for a model

- Format: **glTF binary (`.glb`)**, Y-up, **feet at the origin** (y = 0),
  roughly **1.8 units tall** (1 unit = 1 metre). Use `baseScale` in
  `createModelKind` if your export is a different size.
- Default facing is **+Z** (toward the player spawn / across the tracks). Use
  `rotationY` to turn them; rotate the mesh in Blender if every export faces wrong.
- Name the shirt material **`shirt`** for per-instance `tint`.
- Textures are nearest-filtered automatically to match the pixel look.
- Include animation clips for life (an `Idle` at minimum); static models work too.
