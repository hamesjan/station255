# Character models

Drop `.glb` files here and they become playable characters automatically — no
code changes needed.

## How it works

- A file named `passenger.glb` auto-registers as a character **kind** called
  `passenger` (the filename without the extension).
- To actually place one in the station, add an entry to `PLACEMENTS` in
  `src/world/characters/index.ts`:

  ```ts
  { kind: 'passenger', x: 8, z: 2.6, variation: { tint: '#8fc6ff', animation: 'Idle' } }
  ```

## Making each one unique (same model, many people)

The `variation` object on each placement varies an instance:

| field       | effect                                                            |
|-------------|-------------------------------------------------------------------|
| `tint`      | recolors the material whose name contains **shirt** (see below)   |
| `scale`     | height multiplier (e.g. `0.95` for a shorter person)              |
| `mirror`    | flips left/right so repeats don't look identical                  |
| `animation` | plays a named clip (e.g. `Idle`, `Sit`, `Phone`); random start    |

For `tint` to work, name the swappable material **`shirt`** (or anything
containing that word) in your 3D tool. Identical models also get their idle
animation auto-desynced so a crowd doesn't move in lockstep.

## Requirements for a model

- Format: **glTF binary (`.glb`)**, Y-up, **feet at the origin** (y = 0),
  roughly **1.8 units tall** (1 unit = 1 metre). Use `baseScale` in
  `createModelKind` if your export is a different size.
- Textures are nearest-filtered automatically to match the pixel look.
- Include animation clips (e.g. an `Idle`) for life; static models work too.
