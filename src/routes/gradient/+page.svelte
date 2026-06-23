<script lang="ts">
  import { track } from '$lib/analytics';
  import { PALETTES, nearestColor, type RGB } from '$lib/palettes';

  type GradType = 'linear' | 'radial' | 'conic';

  let gradType   = $state<GradType>('linear');
  let angle      = $state(135);
  let paletteName = $state('PICO-8');
  let quantize   = $state(true);
  let outW       = $state(256);
  let outH       = $state(256);

  const PALETTE_NAMES = Object.keys(PALETTES);

  // Selected stop colors (indices into the current palette)
  let selectedIdxs = $state([0, 5, 10, 15]);

  let canvas: HTMLCanvasElement;
  let outputUrl = $state<string | null>(null);
  let prevUrl: string | null = null;

  function palette(): RGB[] { return PALETTES[paletteName]; }

  function rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  }

  function stopColor(idx: number): string {
    const p = palette();
    const c = p[Math.min(idx, p.length - 1)];
    return rgbToHex(c[0], c[1], c[2]);
  }

  function toggleStop(idx: number) {
    if (selectedIdxs.includes(idx)) {
      if (selectedIdxs.length > 2) selectedIdxs = selectedIdxs.filter(i => i !== idx);
    } else {
      selectedIdxs = [...selectedIdxs, idx].sort((a, b) => a - b);
    }
    render();
  }

  function selectDefaultIdxs() {
    const p = palette();
    const step = Math.floor(p.length / 4);
    selectedIdxs = [0, step, step * 2, step * 3].filter(i => i < p.length);
  }

  function render() {
    const W = outW, H = outH;
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

    const stops = selectedIdxs.map((i) => stopColor(i));

    let grad: CanvasGradient;
    if (gradType === 'radial') {
      grad = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, Math.max(W, H) * 0.55);
    } else if (gradType === 'conic') {
      grad = ctx.createConicGradient((angle * Math.PI) / 180, W/2, H/2);
    } else {
      const rad = (angle * Math.PI) / 180;
      const dx = Math.abs(Math.cos(rad)), dy = Math.abs(Math.sin(rad));
      const len = W * dx + H * dy;
      const ox = (W - len * Math.cos(rad)) / 2;
      const oy = (H - len * Math.sin(rad)) / 2;
      grad = ctx.createLinearGradient(ox, oy, ox + len * Math.cos(rad), oy + len * Math.sin(rad));
    }

    stops.forEach((c, i) => grad.addColorStop(i / (stops.length - 1), c));

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    if (quantize) {
      const id = ctx.getImageData(0, 0, W, H);
      const pal = palette();
      for (let i = 0; i < id.data.length; i += 4) {
        const [r, g, b] = nearestColor(id.data[i], id.data[i+1], id.data[i+2], pal);
        id.data[i] = r; id.data[i+1] = g; id.data[i+2] = b;
      }
      ctx.putImageData(id, 0, 0);
    }

    if (prevUrl) URL.revokeObjectURL(prevUrl);
    canvas.toBlob((blob) => {
      outputUrl = URL.createObjectURL(blob!);
      prevUrl = outputUrl;
      track('tool_use', { tool: 'gradient', type: gradType, palette: paletteName });
    });
  }

  function download() {
    if (!outputUrl) return;
    const a = document.createElement('a');
    a.href = outputUrl; a.download = `gradient-${paletteName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${gradType}.png`; a.click();
    track('export', { tool: 'gradient', type: 'png' });
  }

  function changePalette(name: string) {
    paletteName = name;
    selectDefaultIdxs();
    render();
  }
</script>

<svelte:head>
  <title>Retro Gradient Generator — Palette-Quantized Gradient Maker Online | Station255</title>
  <meta name="description" content="Generate beautiful gradients snapped to retro console color palettes — PICO-8, NES, Game Boy, C64. Linear, radial, and conic modes. Download as PNG." />
</svelte:head>

<h1 class="tool-title">🌈 Retro Gradient</h1>
<p class="tool-sub">Build gradients with retro console palettes — snap pixels to authentic 8-bit colors.</p>

<div class="layout">
  <div class="controls panel">
    <div class="ctrl-group">
      <label class="ctrl-label">Type</label>
      <div class="tab-row">
        {#each ['linear','radial','conic'] as t}
          <button class="tab-btn" class:active={gradType === t} onclick={() => { gradType = t as GradType; render(); }}>{t}</button>
        {/each}
      </div>
    </div>

    {#if gradType !== 'radial'}
      <div class="ctrl-group">
        <label class="ctrl-label">Angle <span class="val">{angle}°</span></label>
        <input type="range" min="0" max="360" step="1" bind:value={angle} oninput={render} />
      </div>
    {/if}

    <div class="ctrl-group">
      <label class="ctrl-label">Palette</label>
      <div class="tab-row wrap">
        {#each PALETTE_NAMES as name}
          <button class="tab-btn" class:active={paletteName === name} onclick={() => changePalette(name)}>{name}</button>
        {/each}
      </div>
    </div>

    <div class="ctrl-group">
      <label class="ctrl-label">Gradient stops — click to toggle</label>
      <div class="palette-swatches">
        {#each palette() as c, i}
          <button
            class="swatch-dot"
            class:selected={selectedIdxs.includes(i)}
            style="background: rgb({c[0]},{c[1]},{c[2]})"
            title={`Color ${i}`}
            onclick={() => toggleStop(i)}
          ></button>
        {/each}
      </div>
      <p class="swatch-hint">Selected: {selectedIdxs.length} stops</p>
    </div>

    <div class="ctrl-group">
      <label class="ctrl-label">Quantize to palette</label>
      <label class="checkbox-row">
        <input type="checkbox" bind:checked={quantize} onchange={render} />
        <span>Snap output pixels to nearest palette color</span>
      </label>
    </div>

    <div class="ctrl-group">
      <label class="ctrl-label">Output size</label>
      <div class="size-row">
        {#each [64, 128, 256, 512] as sz}
          <button class="tab-btn" class:active={outW === sz && outH === sz} onclick={() => { outW = sz; outH = sz; render(); }}>{sz}px</button>
        {/each}
      </div>
    </div>

    <div class="btn-row">
      <button class="btn" onclick={render}>↻ Render</button>
      <button class="btn btn-primary" onclick={download} disabled={!outputUrl}>⬇ Download PNG</button>
    </div>
  </div>

  <div class="preview-col">
    <p class="preview-label">Preview</p>
    <canvas bind:this={canvas} width="256" height="256" class="grad-canvas"></canvas>
    {#if !outputUrl}
      <button class="btn render-first" onclick={render}>Generate</button>
    {/if}
  </div>
</div>

<div class="seo">
  <h2>Retro Palette Gradient Generator</h2>
  <p>
    Station255's Gradient tool builds linear, radial, and conic gradients using colors from classic
    retro palettes — PICO-8, Game Boy, NES, C64, and Terminal. Toggle the Quantize option to snap
    every output pixel to its nearest palette color, producing the banded, stepped look authentic
    to 8-bit and 16-bit era graphics. Download any gradient as a PNG at 64, 128, 256, or 512 px.
  </p>
  <h3>How quantization works</h3>
  <p>
    The tool first renders a smooth HTML5 Canvas gradient between your chosen stops. When quantize
    is enabled, it reads each pixel via <code>getImageData</code> and replaces it with the nearest
    color in the active palette using Euclidean RGB distance. The result is a hard-stepped gradient
    that respects the hardware color limit of the chosen platform.
  </p>
  <h3>Use cases</h3>
  <p>
    Pixel art backgrounds, game-jam assets, retro-styled UI backgrounds, album art, and YouTube
    thumbnail gradients with an authentic 8-bit character.
  </p>
  <h3>FAQ</h3>
  <h3>Can I pick any two colors from the palette?</h3>
  <p>Yes — click swatches to toggle them as gradient stops. You need at least two selected. The stops are ordered by palette index.</p>
  <h3>Why does the gradient look banded?</h3>
  <p>Quantization maps each pixel to the nearest palette color, creating natural color bands. This is the authentic retro look — disable quantize for a smooth gradient.</p>
</div>

<div class="see-also">
  <span>See also:</span>
  <a href="/color">8-bit Color</a>
  <a href="/dither">Dithering Studio</a>
  <a href="/noise">Pixel Noise</a>
  <a href="/palette-extractor">Palette Extractor</a>
</div>

<style>
  .tool-title { font-size: 1.1rem; margin: 0 0 0.4rem; }
  .tool-sub { color: var(--muted); margin: 0 0 1rem; font-size: 0.95rem; }

  .layout { display: flex; gap: 1.25rem; flex-wrap: wrap; align-items: flex-start; margin-bottom: 2rem; }
  .controls { padding: 1rem; display: flex; flex-direction: column; gap: 0.9rem; flex: 1; min-width: 220px; }
  .ctrl-group { display: flex; flex-direction: column; gap: 0.35rem; }
  .ctrl-label { font-size: 0.85rem; color: var(--muted); display: flex; justify-content: space-between; }
  .val { color: var(--accent-3); font-family: var(--display); font-size: 0.5rem; }
  .tab-row { display: flex; gap: 4px; flex-wrap: nowrap; }
  .tab-row.wrap { flex-wrap: wrap; }
  .tab-btn { background: var(--bg-2); border: 1px solid var(--line); color: var(--muted); padding: 0.3rem 0.65rem; cursor: pointer; font-size: 0.82rem; white-space: nowrap; }
  .tab-btn.active { border-color: var(--accent); color: var(--accent); background: var(--panel); }
  input[type=range] { width: 100%; accent-color: var(--accent); }

  .palette-swatches { display: flex; flex-wrap: wrap; gap: 3px; }
  .swatch-dot { width: 20px; height: 20px; border: 2px solid transparent; cursor: pointer; padding: 0; }
  .swatch-dot.selected { border-color: var(--accent-3); box-shadow: 0 0 0 1px var(--accent-3); }
  .swatch-hint { font-size: 0.8rem; color: var(--muted); margin: 0; }

  .checkbox-row { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: var(--muted); cursor: pointer; }
  .size-row { display: flex; gap: 4px; }

  .btn-row { display: flex; gap: 0.5rem; }
  .btn-primary { background: var(--accent); color: #000; }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

  .preview-col { display: flex; flex-direction: column; gap: 0.5rem; }
  .preview-label { font-family: var(--display); font-size: 0.5rem; color: var(--muted); margin: 0; }
  .grad-canvas { display: block; border: 2px solid var(--line); image-rendering: pixelated; max-width: 100%; }
  .render-first { margin-top: 0.5rem; }
</style>
