# station255 — plans

Implementation plans for upcoming work. Each is self-contained: read it before
starting, follow the phases, and tick off the acceptance criteria.

- **[plan-notebook-anomalies.md](plan-notebook-anomalies.md)** — the core loop:
  random anomalies + a notebook to record them, look-and-press interaction, and
  the Exit-8 "always the same station" return loop. Phased 1–6.
- **[plan-vrm-support.md](plan-vrm-support.md)** — using VRoid/VRM avatars as
  characters (offline VRM→GLB now; runtime `@pixiv/three-vrm` later) within the
  existing `CharacterKind` system.
- **[guide-characters-blender.md](guide-characters-blender.md)** — the chosen
  character pipeline: model your own low-poly people in Blender (+ Mixamo), give
  each a personality routine of animated actions, drop the GLB in `assets/models/`.

## Already built
Walkable platform · non-enterable train that arrives/departs every 3 min ·
benches, vending machine, real-time wall clock, posters, subway route map ·
3D animated characters (the Blender `pacer.glb`, paced via a behavior layer) ·
looping background music · a scalable character registry (`src/world/characters/`)
that ingests `.glb` files from `assets/models/`. (The old 2D billboard people were
removed — characters are 3D GLBs from here on.)
