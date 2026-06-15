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
  at runtime.** A user's image/audio must never leave their browser; say so in each tool's copy.

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
     only if `Caddyfile.site` itself changed: `caddy reload` / your Caddy service reload).
- **Routing detail that matters for SEO:** adapter-static prerenders each route to `<route>.html`
  (e.g. `/palette-extractor` → `dist/palette-extractor.html`). `Caddyfile.site` uses
  `try_files {path} {path}.html {path}/index.html /index.html` so deep links serve the *correct*
  prerendered page (with its own `<title>`/meta), not the homepage. Keep that `{path}.html` rule.
- `dist/` and `node_modules/` and `.svelte-kit/` are git-ignored — they're build artifacts, rebuilt
  on the server. Only source is committed.

## Repo layout
```
src/
  app.html                 # HTML shell (loads Press Start 2P + VT323 webfonts, favicon)
  app.css                  # arcade theme: CSS vars (--bg, --accent, ...), .btn, .panel, scanlines
  app.d.ts
  lib/
    tools.ts               # THE TOOL REGISTRY — drives the homepage grid
    palette.ts             # median-cut color quantization (used by palette-extractor)
  routes/
    +layout.ts             # export const prerender = true  (whole site is static)
    +layout.svelte         # header / footer / brand chrome
    +page.svelte           # homepage = arcade cabinet grid (reads lib/tools.ts)
    palette-extractor/
      +page.svelte         # first live tool
static/                    # favicon.png, robots.txt (copied verbatim into dist/)
Caddyfile.site             # production Caddy config (infra)
IDEAS.md                   # product roadmap + tool catalog + monetization
CLAUDE.md                  # this file
```

## How to add a new tool (the repeatable pattern)
1. Add an entry to **`src/lib/tools.ts`** (`slug`, `name`, `tagline`, `icon`, `live`). Set
   `live: false` to show a "SOON" badge, `true` once the page exists.
2. Create **`src/routes/<slug>/+page.svelte`** with:
   - The tool UI (Svelte 5 runes: `$state`, `$derived`, `$effect`).
   - A `<svelte:head>` with a **keyword-rich `<title>` and meta description** — this is the SEO surface.
   - A short "About / FAQ" `.panel` section under the tool (most search traffic lands on this text).
   - 100% client-side logic; mobile-friendly; reuse theme classes/vars from `app.css`.
3. Run `npm run check` (0 errors) and `npm run build` (must prerender the new route).
4. Commit. Deploy via the flow above.

Reuse before rebuilding: image tools share the upload + `<canvas>` + `getImageData` plumbing in
`palette-extractor/+page.svelte` and the helpers in `lib/palette.ts`. Demake and CRT-ify should build
on that. Keep shared logic in `src/lib/`.

## Conventions
- Keep dependencies minimal — prefer a few lines of vanilla JS over a library.
- Theme everything with the CSS variables in `app.css` (don't hardcode colors).
- Each tool stands alone and works offline.
- Don't introduce a server, API routes, or anything that breaks `adapter-static` / the Caddy static deploy.

## History note
This repo was previously a Three.js liminal train-station walking-sim. That game is preserved on the
local branch **`archive/train-station-game`** (and in `main`'s git history) — do not resurrect it into
`main`; the project is now the pixel-art tool arcade described above.
