<script lang="ts">
  import { PALETTES } from '$lib/palettes';
  import type { RGB } from '$lib/palettes';
  import { track } from '$lib/analytics';

  const paletteNames = Object.keys(PALETTES);
  const SCALES = [64, 256, 512] as const;
  type OutputScale = (typeof SCALES)[number];

  let seed = $state('Station255');
  let paletteName = $state('PICO-8');
  let outputScale = $state<OutputScale>(256);
  let outputUrl = $state<string | null>(null);
  let prevOutputUrl: string | null = null;

  function djb2(s: string): number {
    let h = 5381;
    for (let i = 0; i < s.length; i++) {
      h = Math.imul(h, 33) ^ s.charCodeAt(i);
    }
    return h >>> 0;
  }

  function lcg(seed: number) {
    let s = seed;
    return () => {
      s = (Math.imul(1664525, s) + 1013904223) >>> 0;
      return s / 0xffffffff;
    };
  }

  function generate(input: string, palette: RGB[], px: number) {
    const s = djb2(input || 'station255');
    const rand = lcg(s);

    const fgIdx = Math.floor(rand() * palette.length);
    let bgIdx = Math.floor(rand() * palette.length);
    if (bgIdx === fgIdx) bgIdx = (bgIdx + 1) % palette.length;
    const fg = palette[fgIdx];
    const bg = palette[bgIdx];

    const grid: boolean[][] = Array.from({ length: 8 }, () => new Array(8).fill(false));
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 4; c++) {
        grid[r][c] = rand() > 0.42;
        grid[r][7 - c] = grid[r][c];
      }
    }

    const cellSize = Math.floor(px / 8);
    const canvas = document.createElement('canvas');
    canvas.width = px;
    canvas.height = px;
    const ctx = canvas.getContext('2d')!;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const color = grid[r][c] ? fg : bg;
        ctx.fillStyle = `rgb(${color[0]},${color[1]},${color[2]})`;
        ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
      }
    }

    canvas.toBlob((blob) => {
      if (prevOutputUrl) URL.revokeObjectURL(prevOutputUrl);
      prevOutputUrl = URL.createObjectURL(blob!);
      outputUrl = prevOutputUrl;
    });
  }

  $effect(() => {
    void seed; void paletteName; void outputScale;
    if (typeof document !== 'undefined') {
      generate(seed, PALETTES[paletteName], outputScale);
    }
  });

  function download() {
    if (!outputUrl) return;
    const a = document.createElement('a');
    a.href = outputUrl;
    a.download = `avatar-${seed.replace(/[^a-z0-9]/gi, '-') || 'station255'}-${outputScale}px.png`;
    a.click();
    track('export', { tool: 'avatar', palette: paletteName, scale: outputScale });
  }

  let tracked = false;
  $effect(() => {
    void seed; void paletteName;
    if (!tracked && seed.trim()) {
      tracked = true;
      track('tool_use', { tool: 'avatar', palette: paletteName });
    }
  });
</script>

<svelte:head>
  <title>8-bit Avatar Generator — pixel art identicon maker | Station255</title>
  <meta
    name="description"
    content="Free online 8-bit avatar and identicon generator. Type any name or seed and get a unique, symmetric pixel-art avatar. Choose retro palettes. Download as PNG. No account needed."
  />
</svelte:head>

<h1>8-bit Avatar</h1>
<p class="lead">Type any name or seed. Get a unique pixel-art identicon. Deterministic — same input, same avatar, every time.</p>

<div class="controls">
  <label class="ctrl full">
    <span>Seed (name, username, anything)</span>
    <input
      type="text"
      class="seed-input"
      bind:value={seed}
      placeholder="Type something…"
      maxlength="128"
    />
  </label>

  <label class="ctrl">
    <span>Palette</span>
    <select bind:value={paletteName}>
      {#each paletteNames as name}
        <option>{name}</option>
      {/each}
    </select>
  </label>

  <div class="ctrl">
    <span>Output size</span>
    <div class="scale-btns">
      {#each SCALES as s}
        <button class="scale-btn" class:active={outputScale === s} onclick={() => { outputScale = s; }}>
          {s}px
        </button>
      {/each}
    </div>
  </div>
</div>

{#if outputUrl}
  <div class="preview-area">
    <img src={outputUrl} alt="8-bit avatar" class="avatar-preview pixelated" width="256" height="256" />
  </div>
  <button class="btn" onclick={download}>Download PNG</button>
{/if}

<section class="seo panel">
  <h2>About the 8-bit Avatar generator</h2>
  <p>
    An <strong>identicon</strong> is a visual hash — a unique image generated deterministically from
    a piece of text (typically a username or email). GitHub popularized the concept with their
    retro-blocky default avatars. This tool takes that idea and runs it through an 8-bit retro
    filter: the same djb2 hash algorithm, but the output is a symmetric 8×8 pixel grid with colors
    drawn from classic game console palettes.
  </p>
  <p>
    Type anything — a username, an email, a project name, a word — and get an avatar that is
    unique to that input and always reproducible. Use the <a href="/palette-extractor">Palette Extractor</a>
    to grab colors from your project's art, then match them here. Pair with
    <a href="/pixel-text">Pixel Text</a> to build a complete retro brand kit.
  </p>
  <h3>How it works</h3>
  <p>Your input string is hashed with the <strong>djb2</strong> algorithm (a fast, classic non-cryptographic hash) to produce a 32-bit integer seed. That seed initializes a <strong>linear congruential generator</strong> (LCG) — the same family of PRNG used in early game consoles and C's <code>rand()</code>. The LCG draws two colors from the palette (foreground and background) then fills the left 4 columns of an 8×8 grid with random foreground/background cells, mirroring them to the right half to produce symmetric designs that read as faces or shields.</p>
  <h3>Use cases</h3>
  <p><strong>Profile pictures</strong> — pixel-art PFPs are immediately distinctive. Download at 512px for a crisp avatar on any platform.</p>
  <p><strong>GitHub READMEs</strong> — embed a project-name avatar as a visual identity marker for your repository.</p>
  <p><strong>Placeholder assets</strong> — generate a unique avatar for every user in a prototype or demo app, with no real profile photos needed.</p>
  <p><strong>Game dev</strong> — seed with a player name to auto-generate consistent NPC portraits, faction icons, or player tokens.</p>
  <p><strong>Discord &amp; community servers</strong> — give each member role or sub-group a unique visual identity derived from its name.</p>
  <h3>FAQ</h3>
  <p><strong>Will the same text always give the same avatar?</strong> Yes — the hash and PRNG are fully deterministic. Same input, same seed, same avatar every time, in any browser.</p>
  <p><strong>Is it truly unique?</strong> Two different strings could theoretically hash to the same seed (hash collision), but djb2 collisions are extremely rare in practice for short strings like names.</p>
  <p><strong>Can I use the avatar commercially?</strong> Yes — it's generated by you, in your browser, using open-source algorithms and palette data.</p>
  <p><strong>Is my input sent anywhere?</strong> No. The hash and rendering happen entirely in your browser.</p>
  <p><strong>Why 8×8?</strong> That's the native sprite resolution of the NES, Game Boy, and most 8-bit consoles. It produces recognizable patterns at the smallest possible scale, and scales up cleanly to 64×512px with zero blur.</p>
  <div class="see-also">
    <span class="see-label">Related tools:</span>
    <a href="/palette-extractor">Palette Extractor</a>
    <a href="/pixel-text">Pixel Text</a>
    <a href="/upscale">Pixel Upscaler</a>
  </div>
</section>

<style>
  .lead { color: var(--muted); font-size: 1.2rem; max-width: 54ch; }
  .controls {
    display: flex;
    align-items: flex-end;
    gap: 1.5rem;
    flex-wrap: wrap;
    margin: 1rem 0;
  }
  .ctrl { display: flex; flex-direction: column; gap: 0.3rem; font-size: 1rem; }
  .ctrl.full { flex: 1; min-width: 220px; }
  .seed-input {
    background: var(--bg-2);
    color: var(--ink);
    border: 2px solid var(--line);
    padding: 0.4rem 0.6rem;
    font-family: var(--pixel);
    font-size: 1.1rem;
    width: 100%;
  }
  .seed-input:focus { outline: none; border-color: var(--accent-2); }
  select {
    background: var(--bg-2);
    color: var(--ink);
    border: 2px solid var(--line);
    padding: 0.3rem 0.5rem;
    font-size: 1rem;
    cursor: pointer;
  }
  .scale-btns { display: flex; gap: 0.4rem; }
  .scale-btn {
    background: var(--panel);
    color: var(--muted);
    border: 2px solid var(--line);
    padding: 0.3rem 0.7rem;
    font-family: var(--display);
    font-size: 0.5rem;
    cursor: pointer;
    box-shadow: 3px 3px 0 #000;
  }
  .scale-btn.active { background: var(--accent-3); color: #000; border-color: var(--accent-3); }
  .scale-btn:hover:not(.active) { border-color: var(--accent-2); color: var(--ink); }
  .preview-area { margin: 1rem 0 0.75rem; }
  .avatar-preview {
    display: block;
    border: 4px solid var(--line);
    box-shadow: 6px 6px 0 #000;
    width: 256px;
    height: 256px;
  }
  .pixelated { image-rendering: pixelated; }
</style>
