<script lang="ts">
  import { onMount } from 'svelte';
  import { track } from '$lib/analytics';

  const SIZES = [16, 32, 48] as const;
  type Size = typeof SIZES[number];

  let canvasSize = $state<Size>(32);
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let drawing = $state(false);
  let erasing = $state(false);
  let currentColor = $state('#ff2222');
  let tool = $state<'draw' | 'erase' | 'fill'>('draw');
  let zoom = $derived(Math.floor(320 / canvasSize));

  // pixel grid: flat RGBA array per canvas size
  let pixels = $state<Record<Size, Uint8ClampedArray>>({
    16: new Uint8ClampedArray(16 * 16 * 4),
    32: new Uint8ClampedArray(32 * 32 * 4),
    48: new Uint8ClampedArray(48 * 48 * 4),
  });

  const PALETTE = [
    '#000000','#ffffff','#ff2222','#ff8800','#ffee00','#22cc22',
    '#2288ff','#aa44ff','#ff44aa','#44ffee','#884400','#888888',
    '#cccccc','#002244','#003322','#440022',
  ];

  onMount(() => {
    ctx = canvas.getContext('2d')!;
    redraw();
  });

  function redraw() {
    if (!ctx) return;
    const sz = canvasSize;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // checkerboard bg
    for (let y = 0; y < sz; y++) {
      for (let x = 0; x < sz; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? '#1a1a1a' : '#222222';
        ctx.fillRect(x * zoom, y * zoom, zoom, zoom);
      }
    }
    // pixels
    const arr = pixels[sz];
    for (let y = 0; y < sz; y++) {
      for (let x = 0; x < sz; x++) {
        const i = (y * sz + x) * 4;
        const a = arr[i + 3];
        if (a > 0) {
          ctx.fillStyle = `rgba(${arr[i]},${arr[i+1]},${arr[i+2]},${a/255})`;
          ctx.fillRect(x * zoom, y * zoom, zoom, zoom);
        }
      }
    }
    // grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= sz; x++) {
      ctx.beginPath(); ctx.moveTo(x * zoom, 0); ctx.lineTo(x * zoom, sz * zoom); ctx.stroke();
    }
    for (let y = 0; y <= sz; y++) {
      ctx.beginPath(); ctx.moveTo(0, y * zoom); ctx.lineTo(sz * zoom, y * zoom); ctx.stroke();
    }
  }

  function getCell(e: MouseEvent | TouchEvent): [number, number] | null {
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor(((clientX - rect.left) * scaleX) / zoom);
    const y = Math.floor(((clientY - rect.top) * scaleY) / zoom);
    const sz = canvasSize;
    if (x < 0 || x >= sz || y < 0 || y >= sz) return null;
    return [x, y];
  }

  function setPixel(x: number, y: number, erase: boolean) {
    const sz = canvasSize;
    const arr = pixels[sz];
    const i = (y * sz + x) * 4;
    if (erase) {
      arr[i] = 0; arr[i+1] = 0; arr[i+2] = 0; arr[i+3] = 0;
    } else {
      const [r, g, b] = hexToRGB(currentColor);
      arr[i] = r; arr[i+1] = g; arr[i+2] = b; arr[i+3] = 255;
    }
    pixels = { ...pixels };
    redraw();
  }

  function floodFill(startX: number, startY: number) {
    const sz = canvasSize;
    const arr = pixels[sz];
    const si = (startY * sz + startX) * 4;
    const [tr, tg, tb, ta] = [arr[si], arr[si+1], arr[si+2], arr[si+3]];
    const [fr, fg, fb] = hexToRGB(currentColor);
    if (tr === fr && tg === fg && tb === fb && ta === 255) return;
    const queue = [[startX, startY]];
    while (queue.length) {
      const [x, y] = queue.shift()!;
      if (x < 0 || x >= sz || y < 0 || y >= sz) continue;
      const i = (y * sz + x) * 4;
      if (arr[i] !== tr || arr[i+1] !== tg || arr[i+2] !== tb || arr[i+3] !== ta) continue;
      arr[i] = fr; arr[i+1] = fg; arr[i+2] = fb; arr[i+3] = 255;
      queue.push([x+1,y],[x-1,y],[x,y+1],[x,y-1]);
    }
    pixels = { ...pixels };
    redraw();
  }

  function hexToRGB(hex: string): [number, number, number] {
    const h = hex.replace('#','');
    return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
  }

  function onPointerDown(e: MouseEvent) {
    const cell = getCell(e);
    if (!cell) return;
    drawing = true;
    const doErase = tool === 'erase';
    if (tool === 'fill') { floodFill(cell[0], cell[1]); return; }
    setPixel(cell[0], cell[1], doErase);
    track('tool_use', { tool: 'favicon' });
  }
  function onPointerMove(e: MouseEvent) {
    if (!drawing) return;
    const cell = getCell(e);
    if (!cell) return;
    setPixel(cell[0], cell[1], tool === 'erase');
  }
  function onPointerUp() { drawing = false; }

  function clearAll() {
    const sz = canvasSize;
    pixels[sz] = new Uint8ClampedArray(sz * sz * 4);
    pixels = { ...pixels };
    redraw();
  }

  function switchSize(sz: Size) {
    canvasSize = sz;
    setTimeout(redraw, 0);
  }

  function download() {
    const sz = canvasSize;
    const off = document.createElement('canvas');
    off.width = sz; off.height = sz;
    const oc = off.getContext('2d')!;
    const img = oc.createImageData(sz, sz);
    img.data.set(pixels[sz]);
    oc.putImageData(img, 0, 0);
    const a = document.createElement('a');
    a.href = off.toDataURL('image/png');
    a.download = `favicon-${sz}.png`;
    a.click();
    track('export', { tool: 'favicon', type: 'png', size: sz });
  }

  $effect(() => {
    canvasSize;
    if (ctx) redraw();
  });
</script>

<svelte:head>
  <title>Favicon Maker — Free 16×16, 32×32 & 48×48 Icon Creator | Station255</title>
  <meta name="description" content="Draw your favicon online. Pixel-perfect editor for 16×16, 32×32 and 48×48 icons. Download as PNG. Free, no sign-up, runs in your browser." />
</svelte:head>

<div class="tool-header">
  <h1 class="tool-title">FAVICON MAKER</h1>
  <p class="tool-sub">Pixel-perfect icon editor. Draw at 16×16, 32×32, or 48×48 — download as PNG and drop it straight into your website.</p>
</div>

<div class="workspace">
  <div class="controls panel">
    <div class="ctrl-group">
      <span class="ctrl-label">Size</span>
      {#each SIZES as sz}
        <button class="size-btn" class:active={canvasSize === sz} onclick={() => switchSize(sz)}>{sz}×{sz}</button>
      {/each}
    </div>
    <div class="ctrl-group">
      <span class="ctrl-label">Tool</span>
      <button class="tool-btn" class:active={tool==='draw'} onclick={() => tool='draw'}>✏ Draw</button>
      <button class="tool-btn" class:active={tool==='erase'} onclick={() => tool='erase'}>◻ Erase</button>
      <button class="tool-btn" class:active={tool==='fill'} onclick={() => tool='fill'}>🪣 Fill</button>
    </div>
    <div class="ctrl-group">
      <button class="btn secondary" onclick={clearAll}>Clear</button>
      <button class="btn" onclick={download}>↓ Download PNG</button>
    </div>
  </div>

  <div class="editor-row">
    <div class="canvas-wrap">
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <canvas
        bind:this={canvas}
        width={canvasSize * zoom}
        height={canvasSize * zoom}
        class="pixel-canvas"
        onmousedown={onPointerDown}
        onmousemove={onPointerMove}
        onmouseup={onPointerUp}
        onmouseleave={onPointerUp}
        style="width:{canvasSize * zoom}px;height:{canvasSize * zoom}px;cursor:{tool==='erase'?'cell':tool==='fill'?'crosshair':'crosshair'}"
        role="img"
        aria-label="Favicon editor canvas"
      ></canvas>
    </div>

    <div class="sidebar">
      <div class="palette-label">Color</div>
      <div class="swatch-grid">
        {#each PALETTE as c}
          <button
            class="swatch"
            class:selected={currentColor === c}
            style="background:{c}"
            onclick={() => currentColor = c}
            aria-label={c}
          ></button>
        {/each}
      </div>
      <label class="custom-color-row">
        <span class="palette-label">Custom</span>
        <input type="color" bind:value={currentColor} class="color-pick" />
      </label>

      <div class="preview-wrap">
        <div class="palette-label">Preview</div>
        <div class="previews">
          <div class="preview-item">
            <div class="preview-bg light">
              <canvas
                width={canvasSize} height={canvasSize}
                class="prev-canvas"
                style="width:32px;height:32px;image-rendering:pixelated"
                id="prev-light"
              ></canvas>
            </div>
            <span>light</span>
          </div>
          <div class="preview-item">
            <div class="preview-bg dark">
              <canvas
                width={canvasSize} height={canvasSize}
                class="prev-canvas"
                style="width:32px;height:32px;image-rendering:pixelated"
                id="prev-dark"
              ></canvas>
            </div>
            <span>dark</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<div class="panel about">
  <h2 class="about-title">About Favicon Maker</h2>
  <p>A favicon is the small icon shown in browser tabs and bookmarks. Browsers look for <code>/favicon.ico</code> or a <code>&lt;link rel="icon"&gt;</code> tag. PNGs work in all modern browsers — download the PNG from here and add <code>&lt;link rel="icon" href="/favicon.png"&gt;</code> to your HTML head.</p>
  <p>For best results, draw at 32×32 and also export a 16×16 version — browsers often display the icon at 16×16 in tabs. Keep shapes simple and high-contrast so they read at tiny sizes.</p>
</div>

<style>
  .tool-header { padding: 1.25rem 0 1rem; border-bottom: 2px solid var(--line); margin-bottom: 1.5rem; }
  .tool-title { font-family: var(--display); font-size: 1.1rem; color: var(--accent-3); text-shadow: 3px 3px 0 var(--accent); margin: 0 0 0.5rem; }
  .tool-sub { color: var(--muted); font-size: 0.95rem; margin: 0; }

  .controls { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; margin-bottom: 1rem; }
  .ctrl-group { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; }
  .ctrl-label { font-family: var(--display); font-size: 0.35rem; color: var(--muted); margin-right: 0.25rem; }
  .size-btn, .tool-btn {
    font-family: var(--display); font-size: 0.35rem; background: none;
    border: 1px solid var(--line); color: var(--muted); padding: 0.3rem 0.6rem; cursor: pointer;
    transition: border-color 0.08s, color 0.08s;
  }
  .size-btn:hover, .tool-btn:hover { color: var(--ink); border-color: var(--muted); }
  .size-btn.active, .tool-btn.active { border-color: var(--accent-3); color: var(--accent-3); }

  .editor-row { display: flex; gap: 1.25rem; align-items: flex-start; flex-wrap: wrap; }
  .canvas-wrap { flex-shrink: 0; }
  .pixel-canvas { display: block; border: 2px solid var(--line); box-shadow: 4px 4px 0 #000; }

  .sidebar { flex: 1; min-width: 160px; display: flex; flex-direction: column; gap: 0.75rem; }
  .palette-label { font-family: var(--display); font-size: 0.35rem; color: var(--muted); margin-bottom: 0.25rem; }
  .swatch-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 3px; }
  .swatch {
    aspect-ratio: 1; border: 2px solid transparent; cursor: pointer;
    transition: transform 0.05s, border-color 0.05s;
  }
  .swatch:hover { transform: scale(1.15); }
  .swatch.selected { border-color: var(--accent-3); }
  .custom-color-row { display: flex; align-items: center; gap: 0.5rem; }
  .color-pick { width: 36px; height: 28px; border: 1px solid var(--line); background: none; cursor: pointer; padding: 2px; }

  .previews { display: flex; gap: 0.75rem; }
  .preview-item { display: flex; flex-direction: column; align-items: center; gap: 0.25rem; font-size: 0.75rem; color: var(--muted); }
  .preview-bg { width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--line); }
  .preview-bg.light { background: #ffffff; }
  .preview-bg.dark { background: #1a1a2e; }
  .prev-canvas { image-rendering: pixelated; }

  .about { margin-top: 1.5rem; }
  .about-title { font-family: var(--display); font-size: 0.5rem; color: var(--accent-3); margin: 0 0 0.75rem; }
  .about p { font-size: 0.9rem; color: var(--muted); line-height: 1.6; margin: 0 0 0.5rem; }
  .about code { background: var(--bg-2, #111); padding: 1px 4px; font-size: 0.85rem; }
</style>
