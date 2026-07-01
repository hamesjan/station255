<script lang="ts">
  import { onMount } from 'svelte';
  import { track } from '$lib/analytics';

  type Pattern = 'checker' | 'stripes-h' | 'stripes-v' | 'diamonds' | 'crosshatch' | 'dots' | 'zigzag' | 'bricks';
  const PATTERNS: Pattern[] = ['checker', 'stripes-h', 'stripes-v', 'diamonds', 'crosshatch', 'dots', 'zigzag', 'bricks'];

  let pattern = $state<Pattern>('checker');
  let colorA  = $state('#ff2e88');
  let colorB  = $state('#0d0b1a');
  let scale   = $state(8);
  let canvas: HTMLCanvasElement;
  let previewSize = 320;

  function draw() {
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const s = scale;
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = colorB;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = colorA;

    switch (pattern) {
      case 'checker':
        for (let y = 0; y < H; y += s) for (let x = 0; x < W; x += s)
          if (((x/s + y/s) & 1) === 0) ctx.fillRect(x, y, s, s);
        break;
      case 'stripes-h':
        for (let y = 0; y < H; y += s*2) ctx.fillRect(0, y, W, s);
        break;
      case 'stripes-v':
        for (let x = 0; x < W; x += s*2) ctx.fillRect(x, 0, s, H);
        break;
      case 'diamonds':
        for (let y = -s; y < H + s; y += s) for (let x = -s; x < W + s; x += s*2) {
          const ox = (Math.floor(y/s) & 1) * s;
          ctx.fillRect(x + ox, y, s, s);
        }
        break;
      case 'crosshatch':
        for (let y = 0; y < H; y += s) ctx.fillRect(0, y, W, 1);
        for (let x = 0; x < W; x += s) ctx.fillRect(x, 0, 1, H);
        break;
      case 'dots':
        for (let y = s; y < H; y += s*2) for (let x = s; x < W; x += s*2) {
          ctx.beginPath();
          ctx.arc(x, y, s*0.35, 0, Math.PI*2);
          ctx.fill();
        }
        break;
      case 'zigzag': {
        const h2 = s / 2;
        for (let y = 0; y < H + s; y += s) {
          ctx.beginPath();
          for (let x = 0; x < W + s; x += s) {
            const px = x, py = (Math.floor(x/s) & 1) ? y : y - h2;
            x === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
          }
          ctx.lineWidth = Math.max(1, s * 0.25);
          ctx.strokeStyle = colorA;
          ctx.stroke();
        }
        break;
      }
      case 'bricks':
        for (let row = 0; row < Math.ceil(H/s); row++) {
          const y = row * s;
          const ox = (row & 1) * (s * 1.5);
          for (let x = -s*2 + ox; x < W + s; x += s*3) {
            ctx.strokeStyle = colorA;
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 1, y + 1, s*3 - 2, s - 2);
          }
        }
        break;
    }
    track('tool_use', { tool: 'pattern-tile', pattern, scale });
  }

  $effect(() => {
    void pattern; void colorA; void colorB; void scale;
    if (canvas) draw();
  });

  onMount(() => draw());

  function download() {
    const big = document.createElement('canvas');
    big.width = 512; big.height = 512;
    const ctx = big.getContext('2d')!;
    const tile = canvas.toDataURL();
    const img = new Image();
    img.onload = () => {
      const pat = ctx.createPattern(img, 'repeat');
      if (pat) { ctx.fillStyle = pat; ctx.fillRect(0, 0, 512, 512); }
      const a = document.createElement('a');
      a.href = big.toDataURL('image/png');
      a.download = `pattern-${pattern}.png`;
      a.click();
    };
    img.src = tile;
    track('export', { tool: 'pattern-tile', pattern });
  }
</script>

<svelte:head>
  <title>Pixel Pattern Tile Generator — seamless retro patterns | Station255</title>
  <meta name="description" content="Generate seamless tileable pixel patterns: checkerboard, stripes, diamonds, dots, zigzag, bricks and more. Download as PNG. Free, runs in your browser." />
</svelte:head>

<h1>Pattern Tile</h1>
<p class="lead">Seamless pixel patterns for backgrounds and textures.</p>

<div class="controls">
  <div class="pattern-grid">
    {#each PATTERNS as p}
      <button class="pat-btn" class:active={pattern === p} onclick={() => { pattern = p; }}>
        {p.replace('-', ' ')}
      </button>
    {/each}
  </div>

  <div class="sliders">
    <label class="pick">
      <span>Color A</span>
      <input type="color" bind:value={colorA} />
    </label>
    <label class="pick">
      <span>Color B</span>
      <input type="color" bind:value={colorB} />
    </label>
    <label class="ctrl">
      <span>Scale: <strong>{scale}px</strong></span>
      <input type="range" min="4" max="64" step="2" bind:value={scale} />
    </label>
  </div>
</div>

<canvas bind:this={canvas} width={previewSize} height={previewSize} class="preview"></canvas>

<div class="actions">
  <button class="btn" onclick={download}>Download 512×512 PNG</button>
</div>

<section class="seo panel">
  <h2>About Pattern Tile</h2>
  <p>Generates seamless tileable patterns using pixel-perfect geometry. Eight pattern types with configurable scale and two colors. The download produces a 512×512 PNG that tiles seamlessly in any direction — drop it into a CSS <code>background-image</code> or into your game's texture atlas.</p>
  <div class="see-also">
    <span class="see-label">Related:</span>
    <a href="/noise">Pixel Noise</a>
    <a href="/gradient">Retro Gradient</a>
    <a href="/sticker">Sticker Maker</a>
  </div>
</section>

<style>
  .lead { color: var(--muted); font-size: 1.2rem; margin: 0 0 1rem; }
  .controls { display: flex; flex-wrap: wrap; gap: 1.5rem; margin-bottom: 1rem; }
  .pattern-grid { display: flex; flex-wrap: wrap; gap: 0.4rem; align-content: flex-start; }
  .pat-btn {
    background: var(--panel); border: 2px solid var(--line);
    color: var(--muted); padding: 0.3rem 0.6rem; cursor: pointer;
    font-size: 0.9rem; transition: border-color 0.08s, color 0.08s;
  }
  .pat-btn:hover { border-color: var(--accent-2); color: var(--ink); }
  .pat-btn.active { border-color: var(--accent-3); color: var(--accent-3); }
  .sliders { display: flex; flex-wrap: wrap; gap: 1rem; align-items: flex-end; }
  .pick { display: flex; flex-direction: column; gap: 0.3rem; font-size: 1rem; }
  .pick input[type=color] { width: 48px; height: 32px; border: 2px solid var(--line); background: none; cursor: pointer; padding: 2px; }
  .ctrl { display: flex; flex-direction: column; gap: 0.3rem; font-size: 1rem; }
  .preview { display: block; border: 2px solid var(--line); image-rendering: pixelated; max-width: 100%; }
  .actions { margin: 1rem 0 1.5rem; }
</style>
