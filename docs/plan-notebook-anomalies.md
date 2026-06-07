# Plan: Notebook + Anomalies (the core loop)

> Status: **Phases 1–2 built.** The notebook (state + UI + localStorage, toggle N)
> and interaction (walk up + Space → Pokémon dialogue box, records a one-time
> notebook entry) exist in `src/game/`. Remaining: the anomaly system + director
> (Phases 3–4) and the Exit-8 loop (Phase 5). Pick up any phase independently.
>
> Built so far in `src/game/`: `notebook.ts`, `notebookUI.ts`, `dialogue.ts`,
> `interaction.ts` (proximity + facing, not yet a mesh raycast), `game.ts`
> (orchestrator + HUD prompt/toast). NPCs declare a `talk` block in
> `characters/index.ts`; the station surfaces them as `NpcSpec[]`.

## Goal
Random "oddities" appear in the station; the player notices them and **records**
them in a **notebook** they can open and browse. The only verbs are walking,
interacting (look + press a key), and opening the notebook. Exit-8-inspired:
observation + collection, no fail state.

## Pillars
- **Anomaly** — a discrete, detectable difference from the baseline station
  (extra/odd person, changed poster, backwards clock, flickering light, wrong
  train, out-of-place object…).
- **Notebook** — a persistent journal/catalog of what you've recorded.
- **Interaction** — look at a thing, press **E** to record it.
- **Loop** (related, later) — traveling returns you to the *same* station with a
  fresh set of oddities; the notebook persists.

## Architecture (mirror the character registry in `src/world/characters/`)
```
src/game/
  notebook.ts        Notebook state + localStorage persistence + change events
  notebookUI.ts      DOM overlay (journal page) + open/close (N or Tab)
  interaction.ts     camera raycast -> interactable under reticle, E to record, prompt UI
  anomalies/
    types.ts         AnomalyKind, AnomalyInstance, AnomalyContext, NotebookMeta
    registry.ts      register + list kinds (same pattern as characters/registry.ts)
    director.ts      decides which anomalies are active (random over time / per loop)
    kinds/           one file per anomaly (extraPerson, changedPoster, backwardsClock, ...)
```

### Interface sketch
```ts
interface NotebookMeta { id: string; name: string; description: string; category: string; }

interface AnomalyInstance {
  object?: THREE.Object3D;            // added to the scene (additive anomalies)
  interactionTarget?: THREE.Object3D; // what the reticle must hit to record it
  meta: NotebookMeta;
  apply(ctx: AnomalyContext): void;   // mutate the baseline station
  revert(): void;                     // undo cleanly (despawn / loop re-roll)
  update?(dt: number, clock: number): void;
}

interface AnomalyKind {
  readonly id: string;
  readonly rarity: number;            // weight for the director
  create(ctx: AnomalyContext): AnomalyInstance;
}
```
- `AnomalyContext` exposes the existing world (character placements, prop meshes,
  the `Train`, the scene group) so a kind can mutate it.
- Anomalies implement the same **Interactable** shape the interaction raycaster
  looks for — future NPCs/objects can reuse it.

## Anomaly catalog
**Additive (has a raycast target — do these first):**
- Extra person who shouldn't be there (faceless / too tall / facing the wall / frozen)
- Changed poster (different art, text, upside down)
- Backwards clock (counter-clockwise / wrong time)
- Flickering light or color-shifted zone; a shadow with no caster
- Out-of-place object (briefcase, single shoe, potted plant, bird)
- Wrong train (arrives empty / never leaves / endless / silent / opposite side)

**Subtractive (no direct target — later, needs location markers):**
- Missing person who's usually there; missing bench; vending machine gone

## Interaction & detection
- Each frame: raycast from screen center. If it hits an `interactionTarget`
  within ~3.5 m, show a **reticle prompt** ("look closer" → press **E**).
- On **E**: add a `NotebookEntry` (meta + in-game time + loop #); soft chime
  (reuse the audio system); optionally the anomaly "settles" or vanishes — see
  open decisions.
- Subtractive anomalies: a faint "?" marker at the expected spot when nearby.

## Notebook (state + UI)
- `Notebook`: `Map<anomalyId, NotebookEntry>` with `add`, `has`, `count`, total
  known. Persist to **localStorage** so the catalog survives reloads.
- `notebookUI`: DOM overlay toggled with **N**. Opening **releases pointer lock**
  and shows a paper-styled journal — recorded oddities (name, description,
  when/where), plus "X of N recorded." Closing returns to play.
- Style: paper/pixel aesthetic, monospace/handwritten font, calm palette. A tiny
  toast ("recorded: backwards clock") on capture.

## The loop (Exit-8) — later phase
- Trigger: board the dwelling train, or walk into a fade zone at a platform end.
- Action: fade out → reset player to start → `director.reroll()` (revert active
  anomalies, spawn a new set) → increment loop counter → fade in. Same station,
  new oddities; notebook persists.
- Optional rule variant: "saw an anomaly → loop back; truly normal → progress"
  (classic Exit-8). Note as an alternative, not the default.

## Phasing (each shippable on its own)
1. **Notebook core** — `notebook.ts` + `notebookUI.ts` + localStorage; toggle N;
   seed with test entries. (No anomalies yet.)
2. **Interaction** — `interaction.ts` raycast + reticle prompt + E records; wire
   one hand-placed test object.
3. **First anomalies** — `anomalies/` registry + 2–3 additive kinds; `director`
   spawns 1–2 at start.
4. **Random director** — anomalies appear/disappear over time; cap active count;
   weight by rarity.
5. **Loop** — teleport/fade + reroll + loop counter; notebook persists.
6. **Breadth & polish** — more kinds, subtractive anomalies with markers,
   notebook sketches/icons, capture sound, subtle audio anomalies.

## Acceptance (per phase)
1. Press N → journal opens (pointer released), shows entries, persists across reload.
2. Look at the test object → prompt; E → added to notebook + toast.
3. On load, a couple of real anomalies exist and are recordable; revert cleanly.
4. Anomalies come and go over time without leaks; never exceed the cap.
5. Boarding/leaving re-rolls the station; counter increments; notebook intact.

## Decisions to make later
- **Detection:** manual E-to-record (planned) vs auto-notice on close look.
- **After recording:** anomaly stays / settles / vanishes?
- **Notebook pause:** does opening it pause the world?
- **Loop trigger:** train boarding vs walk-off-end vs both.
- **Tone:** strictly cozy vs a touch unsettling (faceless figures, etc.).
- **Meta goal:** endless collection vs "catalog all N" completion.
- **Persistence:** localStorage only, or an exportable journal.
