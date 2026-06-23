<script lang="ts">
  import { track } from '$lib/analytics';
  import { PALETTES, type RGB } from '$lib/palettes';

  type NoiseType = 'random' | 'smooth' | 'checker' | 'stripes';

  let noiseType   = $state<NoiseType>('smooth');
  let paletteName = $state('PICO-8');
  let size        = $state(128);
  let noiseScale  = $state(4);
  let seed        = $state(1337);
  let animating   = $state(false);

  const PALETTE_NAMES = Object.keys(PALETTES);
  let animFrame: number | null = null;

  let canvas: HTMLCanvasElement;
  let outputUrl = $state<string | null>(null);
  let prevUrl: string | null = null;

  function lcg(s: number) {
    let st = s >>> 0;
    return () => { st = (Math.imul(1664525, st) + 1013904223) >>> 0; return st / 0x100000000; };
  }

  function valueNoise(x: number, y: number, s: number): number {
    const h = (n: number) => {
      let v = ((n * 1374761393) ^ (s * 6789)) | 0;
      v = ((v ^ (v >>> 16)) * 0x45d9f3b) | 0;
      v = ((v ^ (v >>> 16)) * 0x45d9f3b) | 0;
      return ((v ^ (v >>> 16)) >>> 0) / 0x100000000;
    };
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = h(xi + yi * 997), b = h(xi+1 + yi * 997);
    const c = h(xi + (yi+1) * 997), d = h(xi+1 + (yi+1) * 997);
    return a + (b-a)*u + (c-a)*v + (a-b-c+d)*u*v;
  }

  function render() {
    const N = size;
    if (canvas.width !== N || canvas.height !== N) { canvas.width = N; canvas.height = N; }
    const ctx = canvas.getContext('2d')!;
    const pal: RGB[] = PALETTES[paletteName];
    const id = ctx.createImageData(N, N);
    const rng = lcg(seed);
    const sc = Math.max(0.5, noiseScale);

    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        let t: number;
        if (noiseType === 'random') {
          t = rng();
        } else if (noiseType === 'smooth') {
          t = valueNoise(x / sc, y / sc, seed);
        } else if (noiseType === 'checker') {
          const bx = Math.floor(x / sc), by = Math.floor(y / sc);
          t = (bx + by) % 2 === 0 ? 0 : 1;
        } else {
          t = (Math.floor(y / sc) % pal.length) / (pal.length - 1);
        }
        const idx = Math.min(pal.length - 1, Math.floor(t * pal.length));
        const [r, g, b] = pal[idx];
        const i = (y * N + x) * 4;
        id.data[i] = r; id.data[i+1] = g; id.data[i+2] = b; id.data[i+3] = 255;
      }
    }
    ctx.putImageData(id, 0, 0);

    if (prevUrl) URL.revokeObjectURL(prevUrl);
    canvas.toBlob((blob) => {
      outputUrl = URL.createObjectURL(blob!);
      prevUrl = outputUrl;
      track('tool_use', { tool: 'noise', type: noiseType, palette: paletteName });
    });
  }

  function rerender() { render(); }

  function randomizeSeed() {
    seed = Math.floor(Math.random() * 99999);
    render();
  }

  function toggleAnimate() {
    animating = !animating;
    if (animating) {
      const tick = () => {
        if (!animating) return;
        seed = (seed + 1) % 99999;
        render();
        animFrame = requestAnimationFrame(tick);
      };
      animFrame = requestAnimationFrame(tick);
    } else {
      if (animFrame !== null) cancelAnimationFrame(animFrame);
    }
  }

  function download() {
    if (!outputUrl) return;
    const a = document.createElement('a');
    a.href = outputUrl; a.download = `noise-${noiseType}-${paletteName.replace(/[^a-z0-9]/gi,'-').toLowerCase()}-${size}px.png`; a.click();
    track('export', { tool: 'noise', type: 'png', noiseType });
  }

  import { onMount } from 'svelte';
  onMount(() => {
    render();
    return () => { if (animFrame !== null) cancelAnimationFrame(animFrame); };
  });
</script>

<svelte:head>
  <title>Pixel Noise Texture Generator — Free Retro Noise Pattern Maker | Station255</title>
  <meta name="description" content="Generate tileable pixel noise textures in retro console color palettes. Random, smooth value noise, checker, and stripe patterns. Download as PNG — runs in browser." />
</svelte:head>

<h1 class="tool-title">░ Pixel Noise</h1>
<p class="tool-sub">Generate tileable pixel noise textures using retro palette colors — instant game backgrounds and tile art.</p>

<div class="layout">
  <div class="controls panel">
    <div class="ctrl-group">
      <label class="ctrl-label">Noise type</label>
      <div class="tab-row wrap">
        {#each ['random','smooth','checker','stripes'] as t}
          <button class="tab-btn" class:active={noiseType === t} onclick={() => { noiseType = t as NoiseType; rerender(); }}>{t}</button>
        {/each}
      </div>
    </div>
    <div class="ctrl-group">
      <label class="ctrl-label">Palette</label>
      <div class="tab-row wrap">
        {#each PALETTE_NAMES as name}
          <button class="tab-btn" class:active={paletteName === name} onclick={() => { paletteName = name; rerender(); }}>{name}</button>
        {/each}
      </div>
    </div>
    <div class="ctrl-group">
      <label class="ctrl-label">Size</label>
      <div class="tab-row">
        {#each [64,128,256,512] as s}
          <button class="tab-btn" class:active={size === s} onclick={() => { size = s; rerender(); }}>{s}px</button>
        {/each}
      </div>
    </div>
    {#if noiseType !== 'random'}
      <div class="ctrl-group">
        <label class="ctrl-label">Scale <span class="val">{noiseScale}</span></label>
        <input type="range" min="1" max="32" step="1" bind:value={noiseScale} oninput={rerender} />
      </div>
    {/if}
    <div class="ctrl-group">
      <label class="ctrl-label">Seed <span class="val">{seed}</span></label>
      <div class="seed-row">
        <input type="number" bind:value={seed} oninput={rerender} class="seed-input" min="0" max="99999" />
        <button class="btn" onclick={randomizeSeed}>⟳</button>
      </div>
    </div>
    <div class="btn-row">
      <button class="btn" class:active-anim={animating} onclick={toggleAnimate}>
        {animating ? '⏹ Stop' : '▶ Animate'}
      </button>
      <button class="btn btn-primary" onclick={download} disabled={!outputUrl}>⬇ Download PNG</button>
    </div>
  </div>

  <div class="preview-col">
    <p class="preview-label">Preview</p>
    <canvas bind:this={canvas} width="128" height="128" class="noise-canvas"></canvas>
  </div>
</div>

<div class="seo">
  <h2>Pixel Noise Texture Generator</h2>
  <p>
    Station255's Noise tool procedurally generates pixel-art noise textures quantized to classic
    retro palettes. Four noise types cover different use cases: <strong>Random</strong> gives white
    noise (each pixel independently random), <strong>Smooth</strong> uses interpolated value noise
    for organic-looking patterns, <strong>Checker</strong> creates a hard block checkerboard, and
    <strong>Stripes</strong> produces horizontal palette bands. All types are seeded for reproducibility.
  </p>
  <h3>How value noise works</h3>
  <p>
    Smooth noise interpolates between hash values at integer grid coordinates using a smooth-step
    function. The Scale slider controls how far apart the grid points are — low values give fine
    grain, high values give large blobs. The palette index is selected by mapping the 0–1 noise
    value across the palette's color array.
  </p>
  <h3>Use cases</h3>
  <p>
    Pixel-art game backgrounds, dungeon floor tiles, scrolling parallax layers, tileable terrain
    textures, procedural world maps, and abstract pixel art.
  </p>
  <h3>FAQ</h3>
  <h3>Are the textures seamlessly tileable?</h3>
  <p>Random noise tiles perfectly by nature. Smooth noise at the current scale may or may not tile — use powers-of-2 sizes and ensure the scale divides evenly into the size for best results.</p>
  <h3>What does Animate do?</h3>
  <p>Animate increments the seed on every frame, producing a rapidly changing texture. This is for live preview only — each Download captures the current frame.</p>
</div>

<div class="see-also">
  <span>See also:</span>
  <a href="/gradient">Retro Gradient</a>
  <a href="/dither">Dithering Studio</a>
  <a href="/demake">Demake</a>
  <a href="/sprite-slicer">Sprite Slicer</a>
</div>

<style>
  .tool-title { font-size: 1.1rem; margin: 0 0 0.4rem; }
  .tool-sub { color: var(--muted); margin: 0 0 1rem; font-size: 0.95rem; }

  .layout { display: flex; gap: 1.25rem; flex-wrap: wrap; align-items: flex-start; margin-bottom: 2rem; }
  .controls { padding: 1rem; display: flex; flex-direction: column; gap: 0.85rem; flex: 1; min-width: 220px; }
  .ctrl-group { display: flex; flex-direction: column; gap: 0.3rem; }
  .ctrl-label { font-size: 0.85rem; color: var(--muted); display: flex; justify-content: space-between; }
  .val { color: var(--accent-3); font-family: var(--display); font-size: 0.5rem; }
  .tab-row { display: flex; gap: 4px; }
  .tab-row.wrap { flex-wrap: wrap; }
  .tab-btn { background: var(--bg-2); border: 1px solid var(--line); color: var(--muted); padding: 0.28rem 0.6rem; cursor: pointer; font-size: 0.82rem; white-space: nowrap; }
  .tab-btn.active { border-color: var(--accent); color: var(--accent); background: var(--panel); }
  input[type=range] { width: 100%; accent-color: var(--accent); }
  .seed-row { display: flex; gap: 0.5rem; align-items: center; }
  .seed-input { background: var(--bg-2); border: 1px solid var(--line); color: var(--ink); padding: 0.3rem 0.5rem; width: 90px; font-family: inherit; }
  .btn-row { display: flex; gap: 0.5rem; }
  .btn-primary { background: var(--accent); color: #000; }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .active-anim { background: var(--accent-2); color: #000; border-color: var(--accent-2); }

  .preview-col { display: flex; flex-direction: column; gap: 0.5rem; }
  .preview-label { font-family: var(--display); font-size: 0.5rem; color: var(--muted); margin: 0; }
  .noise-canvas { display: block; border: 2px solid var(--line); image-rendering: pixelated; max-width: 100%; }
</style>
