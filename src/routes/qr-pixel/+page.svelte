<script lang="ts">
  import { track } from '$lib/analytics';
  import QRCode from 'qrcode';

  type Palette = 'default' | 'gameboy' | 'amber' | 'matrix' | 'pico8' | 'nes';
  const PALETTES: { id: Palette; name: string; fg: string; bg: string }[] = [
    { id: 'default', name: 'Station',  fg: '#ff2e88', bg: '#0d0b1a' },
    { id: 'gameboy', name: 'Game Boy', fg: '#0f380f', bg: '#9bbc0f' },
    { id: 'amber',   name: 'Amber',    fg: '#ffb000', bg: '#1a0f00' },
    { id: 'matrix',  name: 'Matrix',   fg: '#00ff41', bg: '#001100' },
    { id: 'pico8',   name: 'PICO-8',   fg: '#fff1e8', bg: '#1d2b53' },
    { id: 'nes',     name: 'NES',      fg: '#fcfcfc', bg: '#3c3c3c' },
  ];

  let text = $state('https://station255.com');
  let palette = $state<Palette>('default');
  let pixelSize = $state(8);
  let canvasEl: HTMLCanvasElement;
  let error = $state('');

  function getPalette() {
    return PALETTES.find(p => p.id === palette) ?? PALETTES[0];
  }

  async function generate() {
    if (!canvasEl || !text.trim()) return;
    error = '';
    try {
      const { fg, bg } = getPalette();
      const modules = await QRCode.create(text, { errorCorrectionLevel: 'M' });
      const size = modules.modules.size;
      const data = modules.modules.data;

      const ps = pixelSize;
      const padding = ps * 2;
      const dim = size * ps + padding * 2;
      canvasEl.width = dim;
      canvasEl.height = dim;

      const ctx = canvasEl.getContext('2d')!;
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, dim, dim);
      ctx.fillStyle = fg;

      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          if (data[y * size + x]) {
            ctx.fillRect(padding + x * ps, padding + y * ps, ps, ps);
          }
        }
      }
      track('tool_use', { tool: 'qr-pixel', palette, pixelSize });
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : 'Could not generate QR code';
    }
  }

  $effect(() => {
    void text; void palette; void pixelSize;
    generate();
  });

  function download() {
    if (!canvasEl) return;
    const a = document.createElement('a');
    a.href = canvasEl.toDataURL('image/png');
    a.download = 'qr-pixel.png';
    a.click();
    track('export', { tool: 'qr-pixel', palette, pixelSize });
  }

  function copyUrl() {
    navigator.clipboard?.writeText(text);
  }
</script>

<svelte:head>
  <title>QR Pixel — retro pixel art QR code generator | Station255</title>
  <meta name="description" content="Generate QR codes with a retro pixel art look. Choose from Game Boy, Amber, Matrix, PICO-8 color palettes. Download as PNG. Free, runs in your browser." />
</svelte:head>

<h1>QR Pixel</h1>
<p class="lead">QR codes with a retro palette. Actually scannable.</p>

<div class="controls">
  <label class="ctrl wide">
    <span>URL or text</span>
    <input type="text" bind:value={text} placeholder="https://…" class="text-input" />
  </label>

  <div class="palette-row">
    {#each PALETTES as p}
      <button
        class="pal-btn"
        class:active={palette === p.id}
        style="--fg:{p.fg};--bg:{p.bg}"
        onclick={() => { palette = p.id; }}
        title={p.name}
      >
        <span class="pal-swatch"></span>
        <span>{p.name}</span>
      </button>
    {/each}
  </div>

  <label class="ctrl">
    <span>Pixel size: <strong>{pixelSize}px</strong></span>
    <input type="range" min="4" max="16" step="2" bind:value={pixelSize} />
  </label>
</div>

{#if error}
  <p class="error">{error}</p>
{/if}

<div class="qr-wrap">
  <canvas bind:this={canvasEl} class="qr-canvas"></canvas>
</div>

<div class="actions">
  <button class="btn" onclick={download}>Download PNG</button>
</div>

<section class="seo panel">
  <h2>About QR Pixel</h2>
  <p>Generates a proper QR code — scannable by any phone — styled with a pixel art aesthetic. The pixel size slider sets how many screen pixels each QR module occupies; 8px is a good balance between sharpness and retro feel. Larger values give a more pixelated look.</p>
  <p>All six palettes produce codes with enough contrast to scan reliably. The QR data is encoded at error-correction level M (≈15% recovery), so small design distortions won't break scans.</p>
  <p>The download is a PNG at the exact canvas size — no extra scaling. Import it into Figma, print it, or embed it in a design as-is.</p>
  <div class="see-also">
    <span class="see-label">Related:</span>
    <a href="/badge">Badge Maker</a>
    <a href="/pattern-tile">Pattern Tile</a>
    <a href="/pixel-text">Pixel Text</a>
  </div>
</section>

<style>
  .lead { color: var(--muted); font-size: 1.2rem; margin: 0 0 1rem; }
  .controls { display: flex; flex-wrap: wrap; gap: 1.25rem; align-items: flex-end; margin-bottom: 1.25rem; }
  .ctrl { display: flex; flex-direction: column; gap: 0.3rem; font-size: 1rem; }
  .ctrl.wide { flex: 1; min-width: 260px; }
  .text-input {
    background: var(--bg-2); border: 2px solid var(--line); color: var(--ink);
    padding: 0.4rem 0.6rem; font-size: 1rem; width: 100%; box-sizing: border-box;
    outline: none; transition: border-color 0.08s;
  }
  .text-input:focus { border-color: var(--accent-2); }
  .palette-row { display: flex; flex-wrap: wrap; gap: 0.4rem; }
  .pal-btn {
    display: flex; align-items: center; gap: 0.4rem;
    border: 2px solid var(--line); background: var(--bg-2);
    color: var(--muted); padding: 0.3rem 0.6rem; cursor: pointer;
    font-size: 0.85rem; transition: border-color 0.08s, color 0.08s;
  }
  .pal-btn:hover { border-color: var(--accent-2); color: var(--ink); }
  .pal-btn.active { border-color: var(--accent-3); color: var(--accent-3); }
  .pal-swatch {
    display: inline-block; width: 16px; height: 16px;
    background: linear-gradient(to right, var(--fg) 50%, var(--bg) 50%);
    border: 1px solid var(--line);
  }
  .error { color: #ff5555; margin-bottom: 0.75rem; }
  .qr-wrap { margin-bottom: 1rem; }
  .qr-canvas { display: block; image-rendering: pixelated; border: 2px solid var(--line); max-width: 100%; }
  .actions { margin-bottom: 1.5rem; }
</style>
