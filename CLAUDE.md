# Station255 — project context for Claude

**Station255 is "the 8-bit tool arcade": a hub of small, fast, free pixel-art / retro web tools.**
"255" = the max value of an 8-bit byte → it literally means *8-bit*. Each tool is a self-contained,
100% client-side page. Revenue model is ads + affiliate (see `IDEAS.md`). Traffic = SEO + shareability.

> **Read `IDEAS.md` for the full tool catalog, roadmap, and monetization plan.** This file is the
> technical/infra context: how it's built, how it deploys, and how to add a tool without breaking things.

## Stack

- **SvelteKit (Svelte 5 runes)** + **`@sveltejs/adapter-static`** → a fully static, prerendered site.
- **TypeScript**, strict. No backend, no database, no server runtime.
- Build output goes to **`dist/`** (configured in `svelte.config.js`).
- Tools use plain browser APIs only — `<canvas>`, `FileReader`, `WebAudio`, etc. **No network calls
  at runtime except the analytics beacon.** A user's image/audio must never leave their browser; say so
  in each tool's copy.

## Commands

```bash
npm install        # first time / after dependency changes
npm run dev        # local dev server (localhost:5173)
npm run build      # prerender everything into dist/  <-- what gets deployed
npm run check      # svelte-check + tsc; must be 0 errors before committing
npm run preview    # serve the built dist/ locally to sanity-check
```

## Infrastructure & deploy (DO NOT BREAK THIS)

- This repo is served by **Caddy** as a static site. See `Caddyfile.site`.
- On the server the site lives at **`/root/station255/dist`** and Caddy `file_server` serves it for
  `station255.com` / `www.station255.com`.
- **Deploy flow (static, no server process):**
  1. `git pull` on the server
  2. `npm install` (if deps changed)
  3. `npm run build`  → regenerates `dist/`
  4. Caddy serves the new `dist/` immediately (no restart needed for content changes; reload Caddy
     only if `Caddyfile.site` itself changed: `make caddy-reload` from `/root/jamesdroplet`).
- **Routing detail that matters for SEO:** adapter-static prerenders each route to `<route>.html`
  (e.g. `/palette-extractor` → `dist/palette-extractor.html`). `Caddyfile.site` uses
  `try_files {path} {path}.html {path}/index.html /index.html` so deep links serve the *correct*
  prerendered page (with its own `<title>`/meta), not the homepage. Keep that `{path}.html` rule.
- `dist/` and `node_modules/` and `.svelte-kit/` are git-ignored — they're build artifacts, rebuilt
  on the server. Only source is committed.

## Analytics (important — don't remove)

The site fires a lightweight analytics beacon to the local analytics server (see `/root/analytics/`).

- **Client lib:** `src/lib/analytics.ts` — exports `track(event, data?)`.
  Sends `navigator.sendBeacon('/collect', ...)` with JSON payload. Silent on failure.
- **Session ID:** stored in `localStorage` under key `s255_sid`. Auto-generated UUID.
- **Pageview tracking:** `+layout.svelte` calls `track('pageview')` inside `afterNavigate` — fires
  on initial page load (type `'enter'`) and on every SPA navigation.
- **Tool event tracking:** individual tool pages call `track('tool_use', { tool, ...params })` on
  use and `track('export', { tool, type })` on download/copy.
- **Caddy proxy:** `Caddyfile.site` has a `handle /collect { reverse_proxy localhost:4000 }` block
  so the beacon hits the same origin — no CORS needed.
- **Analytics server** must be running (`systemctl status analytics`) for beacons to land.
  Missing beacons are silently dropped; the tool still works fine.

## Repo layout

```
src/
  app.html                 # HTML shell (loads Press Start 2P + VT323 webfonts, favicon)
  app.css                  # arcade theme: CSS vars (--bg, --accent, ...), .btn, .panel, scanlines
  app.d.ts
  lib/
    tools.ts               # THE TOOL REGISTRY — drives the homepage grid
    palette.ts             # median-cut color quantization (used by palette-extractor)
    palettes.ts            # retro palette data (PICO-8, Game Boy, NES, C64, Terminal) + nearestColor()
    analytics.ts           # track() beacon client — imported by layout + tool pages
  routes/
    +layout.ts             # export const prerender = true  (whole site is static)
    +layout.svelte         # header / footer / brand chrome + pageview tracking
    +page.svelte           # homepage = arcade cabinet grid (reads lib/tools.ts)
    palette-extractor/
      +page.svelte         # upload image → extract dominant palette (median-cut)
    demake/
      +page.svelte         # upload image → pixelize to retro console palette
    crt/
      +page.svelte         # upload image → scanlines + chroma + phosphor + vignette
static/                    # favicon.png, robots.txt (copied verbatim into dist/)
Caddyfile.site             # production Caddy config (handles /collect proxy + static files)
IDEAS.md                   # product roadmap + tool catalog + monetization
CLAUDE.md                  # this file
```

## Live tools

| Slug | Status | Description |
|---|---|---|
| `/palette-extractor` | ✅ live | Upload image → extract dominant palette (median-cut, 2–32 colors) |
| `/demake` | ✅ live | Pixelize photo to PICO-8 / Game Boy / NES / C64 / Terminal palette |
| `/crt` | ✅ live | CRT effect: scanlines, chromatic aberration, phosphor mask, vignette |
| `/pixel-text` | 🔜 soon | Pixel-font text/logo generator (not yet built) |

## How to add a new tool (the repeatable pattern)

1. Add an entry to **`src/lib/tools.ts`** (`slug`, `name`, `tagline`, `icon`, `live`). Set
   `live: false` to show a "SOON" badge, `true` once the page exists.
2. Create **`src/routes/<slug>/+page.svelte`** with:
   - The tool UI (Svelte 5 runes: `$state`, `$derived`, `$effect`).
   - A `<svelte:head>` with a **keyword-rich `<title>` and meta description** — this is the SEO surface.
   - A short "About / FAQ" `.panel` section under the tool (most search traffic lands on this text).
   - 100% client-side logic; mobile-friendly; reuse theme classes/vars from `app.css`.
   - Call `track('tool_use', { tool: '<slug>' })` when the tool runs and `track('export', ...)` on download.
3. Run `npm run check` (0 errors) and `npm run build` (must prerender the new route).
4. Commit. Deploy via the flow above.

Reuse before rebuilding:
- Image tools: share the upload + `<canvas>` + `getImageData` plumbing. See demake/crt pages.
- Palette data: import from `src/lib/palettes.ts` (`PALETTES`, `nearestColor`).
- Analytics: import `track` from `src/lib/analytics.ts`.

## Conventions

- Keep dependencies minimal — prefer a few lines of vanilla JS over a library.
- Theme everything with the CSS variables in `app.css` (don't hardcode colors).
- Each tool stands alone and works offline (except the analytics beacon, which is fire-and-forget).
- Don't introduce a server, API routes, or anything that breaks `adapter-static` / the Caddy static deploy.
- Svelte 5 runes only: `$state`, `$derived`, `$effect`, `$props`. No Svelte 4 `$:` syntax.

## History note

This repo was previously a Three.js liminal train-station walking-sim. That game is preserved on the
local branch **`archive/train-station-game`** — do not resurrect it into `main`.
