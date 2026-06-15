# Station255 — Pixel Art Tool Hub

> **The pitch:** Station255 is an arcade of small, fast, free **pixel-art / retro / 8-bit** web tools.
> "255" = the max value of an 8-bit byte → it literally means *8-bit*. The brand is the era.
> Each tool is a self-contained, client-side page. Free + ad-supported. SEO + shareability drive traffic.

## Why this works as passive revenue
- **Zero backend cost** — every tool is client-side (canvas/JS). Static site on Caddy `file_server`.
- **Two traffic engines:** evergreen SEO (people search "extract palette from image" forever) + viral shareability (before/after demake images get posted everywhere).
- **Audience overlap** — indie game devs, pixel artists, chiptune musicians, retro/emulation fans, streamers.
- **Monetization ladder:** display ads (AdSense → Ezoic at scale) → affiliate (Aseprite, asset packs, Anbernic handhelds, mech keyboards) → optional $4 "Insert Coin" Pro tier (no ads, bigger exports, more palettes).

## Branding / aesthetic
- Homepage = an **arcade cabinet / game-select screen**. Each tool is a "cabinet" or "cartridge."
- Pixel fonts, scanline/CRT-glow background, chunky 8-bit UI. The skin alone earns shares.
- One-line identity: **"Station255 — the 8-bit tool arcade."**

---

## Tool catalog

### Tier 1 — Launch anchors (max shareability × real search traffic)
- [ ] **Palette extractor** — upload any image → dominant palette as swatches + hex/RGB. *Evergreen, easiest, on-brand.* ← **START HERE**
- [ ] **Demake / pixelizer** — upload photo → downscale + lock to NES / Game Boy / C64 / PICO-8 palettes. *The viral hook (before/after).* 
- [ ] **CRT-ify** — add scanlines, bloom, curvature, RGB phosphor to any image/screenshot. *Endlessly shared, dead simple.*
- [ ] **Pixel-font text / logo generator** — type words → arcade/console-font PNG (logos, banners, headers). *High-intent, monetizable.*

### Pixel-art tools
- [ ] Sprite-sheet slicer / packer — drop sheet, set grid → individual frames or packed atlas + JSON coords
- [ ] Sprite → animated GIF/APNG previewer — paste frames, scrub, export
- [ ] Dithering studio — Bayer / Floyd–Steinberg dithering with retro palettes
- [ ] Pixel-art upscaler — nearest-neighbor + scale2x/hqx (the *correct* non-blurry enlargement)
- [ ] NES/SNES tile (CHR) viewer — romhacking community has nothing good in-browser

### Color tools (where "255" sings)
- [ ] 8-bit / 16-bit palette generator — constrain to NES, Game Boy (4 greens), C64, CGA, PICO-8
- [ ] RGB ↔ hex ↔ "retro" converter — byte values (0–255) front and center
- [ ] Gradient → indexed palette reducer ("this gradient in 8 colors")
- [ ] Palette browser/maker (Lospec-style) — create, name, share palettes
- [ ] CRT/scanline color-shift previewer

### Chiptune / retro audio (passionate, underserved)
- [ ] Chiptune tracker-lite — beep a melody, export WAV
- [ ] WAV → 8-bit bitcrusher — downsample/quantize to NES/SNES fidelity
- [ ] NSF/SID metadata viewer / chiptune player
- [ ] Arpeggio / "0xy effect" generator for trackers

### Arcade / CRT aesthetic (broad, fun, shareable)
- [ ] VHS / glitch / datamosh image effect
- [ ] Boot-screen / BIOS-style text-screen maker (DOS/Amiga)
- [ ] Retro "marquee" / arcade-cabinet sign maker

### Game-dev utility (retro-flavored)
- [ ] Tilemap editor / exporter (Tiled-lite → JSON)
- [ ] Hitbox / collision-box visualizer over a sprite
- [ ] Frame-data / animation-timing calculator (fighting-game crowd)
- [ ] Seeded RNG / loot-table simulator
- [ ] Game Boy / GBA screen-size mockup framer

### Wildcards (cool factor / launch buzz)
- [ ] "What palette is this game?" — upload retro screenshot → identify console + palette
- [ ] Pixel-art avatar / identicon generator (8-bit PFPs go viral)
- [ ] ASCII / ANSI art converter — image → text art
- [ ] QR codes styled as pixel art (functional + decorative)
- [ ] Retro achievement / "trophy" badge maker (streamers, READMEs)

---

## Tech stack (foolproof + minimal)
- **SvelteKit** + **`@sveltejs/adapter-static`** → fully static output, no server, drops onto Caddy `file_server`.
- Build output → `dist/` (matches existing `Caddyfile.site`).
- Each tool = a route: `station255.com/palette-extractor`, `/demake`, `/crt`, etc. (keyword-rich paths do the SEO; brand homepage does memorability + cross-sell).
- Pure browser APIs for tools: `<canvas>`, `FileReader`, `WebAudio`. No deps unless a tool truly needs one.
- TypeScript, strict. Prettier. That's it.

## Build sequencing (easiest → hardest)
1. Scaffold SvelteKit static + arcade-skinned homepage shell.
2. **Palette extractor** (simplest real tool — proves the pattern end-to-end).
3. Demake/pixelizer + CRT-ify (share the same image-upload + canvas plumbing → reuse).
4. Pixel-font generator.
5. Wire ads once a couple of tools have traffic.
6. Then fan out across the catalog (this is where the agent loop takes over).

## Per-tool checklist (the reusable pattern the agent follows)
- [ ] Route `/tool-name/+page.svelte` with the tool UI
- [ ] Keyword-rich `<title>` + meta description + OpenGraph image
- [ ] Short SEO blurb + FAQ under the tool (most search traffic lands here)
- [ ] Add a "cabinet" card to the homepage grid
- [ ] 100% client-side, works offline, no network calls
- [ ] Mobile-friendly

## Monetization notes
- Hold ads until ~3+ tools + some organic traffic (AdSense approval likes real content).
- Affiliate fits the theme: Aseprite, itch.io asset packs, retro handhelds, mech keyboards.
- "Insert Coin" Pro ($4 one-time): no ads, larger exports, extra palettes, batch mode.
