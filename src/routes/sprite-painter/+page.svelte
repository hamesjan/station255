<script lang="ts">
  import { onMount } from 'svelte';
  import { track } from '$lib/analytics';

  type Tool = 'pencil' | 'eraser' | 'fill' | 'eyedropper';

  let canvasEl: HTMLCanvasElement;
  let gridSize = $state(16);
  let pixelSize = $derived(Math.floor(512 / gridSize));
  let currentColor = $state('#ff2e88');
  let currentTool = $state<Tool>('pencil');
  let palette = $state([
    '#0d0b1a','#ffffff','#ff2e88','#21e6c1','#ffd23f','#5599ff','#55cc55','#ff9900',
    '#ff5555','#b0abd0','#3d3466','#1e1838','#cc44ff','#ffaacc','#aaffaa','#44ccff',
  ]);
  let pixels = $state<string[][]>([]);
  let isDrawing = false;

  function makeGrid(size: number, fill = '') {
    return Array.from({ length: size }, () => Array(size).fill(fill));
  }

  function initGrid() {
    pixels = makeGrid(gridSize);
  }

  function drawCanvas() {
    if (!canvasEl) return;
    const ctx = canvasEl.getContext('2d')!;
    const ps = pixelSize;
    const size = gridSize;
    canvasEl.width = size * ps;
    canvasEl.height = size * ps;
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

    // Checkerboard background
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const isLight = (x + y) % 2 === 0;
        ctx.fillStyle = isLight ? '#2a2745' : '#1e1838';
        ctx.fillRect(x * ps, y * ps, ps, ps);
        if (pixels[y][x]) {
          ctx.fillStyle = pixels[y][x];
          ctx.fillRect(x * ps, y * ps, ps, ps);
        }
      }
    }

    // Grid lines
    if (ps >= 8) {
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= size; i++) {
        ctx.beginPath(); ctx.moveTo(i * ps, 0); ctx.lineTo(i * ps, size * ps); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i * ps); ctx.lineTo(size * ps, i * ps); ctx.stroke();
      }
    }
  }

  $effect(() => {
    void pixels; void gridSize; void pixelSize;
    drawCanvas();
  });

  onMount(() => {
    initGrid();
    track('tool_use', { tool: 'sprite-painter' });
  });

  function getCellFromEvent(e: MouseEvent | TouchEvent): [number, number] {
    const rect = canvasEl.getBoundingClientRect();
    let cx: number, cy: number;
    if ('touches' in e) {
      cx = e.touches[0].clientX - rect.left;
      cy = e.touches[0].clientY - rect.top;
    } else {
      cx = e.clientX - rect.left;
      cy = e.clientY - rect.top;
    }
    const scaleX = canvasEl.width / rect.width;
    const scaleY = canvasEl.height / rect.height;
    const x = Math.floor(cx * scaleX / pixelSize);
    const y = Math.floor(cy * scaleY / pixelSize);
    return [Math.max(0, Math.min(gridSize - 1, x)), Math.max(0, Math.min(gridSize - 1, y))];
  }

  function paintCell(x: number, y: number) {
    if (currentTool === 'eraser') {
      pixels[y][x] = '';
      pixels = [...pixels];
    } else if (currentTool === 'pencil') {
      pixels[y][x] = currentColor;
      pixels = [...pixels];
    } else if (currentTool === 'eyedropper') {
      if (pixels[y][x]) currentColor = pixels[y][x];
      currentTool = 'pencil';
    } else if (currentTool === 'fill') {
      floodFill(x, y, pixels[y][x], currentColor);
      pixels = pixels.map(r => [...r]);
    }
  }

  function floodFill(x: number, y: number, target: string, fill: string) {
    if (target === fill) return;
    if (x < 0 || x >= gridSize || y < 0 || y >= gridSize) return;
    if (pixels[y][x] !== target) return;
    const stack = [[x, y]];
    while (stack.length) {
      const [cx, cy] = stack.pop()!;
      if (cx < 0 || cx >= gridSize || cy < 0 || cy >= gridSize) continue;
      if (pixels[cy][cx] !== target) continue;
      pixels[cy][cx] = fill;
      stack.push([cx+1,cy],[cx-1,cy],[cx,cy+1],[cx,cy-1]);
    }
  }

  function onMouseDown(e: MouseEvent) {
    isDrawing = true;
    const [x, y] = getCellFromEvent(e);
    paintCell(x, y);
  }
  function onMouseMove(e: MouseEvent) {
    if (!isDrawing || currentTool === 'fill' || currentTool === 'eyedropper') return;
    const [x, y] = getCellFromEvent(e);
    paintCell(x, y);
  }
  function onMouseUp() { isDrawing = false; }

  function onTouchStart(e: TouchEvent) {
    e.preventDefault(); isDrawing = true;
    const [x, y] = getCellFromEvent(e); paintCell(x, y);
  }
  function onTouchMove(e: TouchEvent) {
    e.preventDefault();
    if (!isDrawing || currentTool === 'fill' || currentTool === 'eyedropper') return;
    const [x, y] = getCellFromEvent(e); paintCell(x, y);
  }
  function onTouchEnd() { isDrawing = false; }

  function changeGridSize(newSize: number) {
    const old = pixels;
    gridSize = newSize;
    const g = makeGrid(newSize);
    for (let y = 0; y < Math.min(newSize, old.length); y++)
      for (let x = 0; x < Math.min(newSize, (old[y] || []).length); x++)
        g[y][x] = old[y][x];
    pixels = g;
  }

  function clearCanvas() { pixels = makeGrid(gridSize); }

  function addColor() {
    const input = document.createElement('input');
    input.type = 'color'; input.value = currentColor;
    input.onchange = () => {
      if (!palette.includes(input.value)) palette = [...palette, input.value];
      currentColor = input.value;
    };
    input.click();
  }

  function download() {
    const out = document.createElement('canvas');
    out.width = gridSize; out.height = gridSize;
    const ctx = out.getContext('2d')!;
    for (let y = 0; y < gridSize; y++)
      for (let x = 0; x < gridSize; x++)
        if (pixels[y][x]) { ctx.fillStyle = pixels[y][x]; ctx.fillRect(x, y, 1, 1); }
    const a = document.createElement('a');
    a.href = out.toDataURL('image/png');
    a.download = `sprite-${gridSize}x${gridSize}.png`;
    a.click();
    track('export', { tool: 'sprite-painter', size: gridSize });
  }
</script>

<svelte:head>
  <title>Sprite Painter — pixel art editor in your browser | Station255</title>
  <meta name="description" content="Draw pixel art sprites directly in your browser. Pencil, eraser, fill bucket, eyedropper. 16×16, 32×32, or 64×64 canvas. Download as PNG. Free, no signup." />
</svelte:head>

<h1>Sprite Painter</h1>
<p class="lead">Draw pixel sprites in the browser. Pencil, fill, eraser, eyedropper.</p>

<div class="workspace">
  <div class="left-col">
    <div class="toolbar">
      {#each (['pencil','eraser','fill','eyedropper'] as Tool[]) as t}
        <button class="tool-btn" class:active={currentTool === t} onclick={() => { currentTool = t; }}
          title={t} aria-label={t}>
          {t === 'pencil' ? '✏' : t === 'eraser' ? '◻' : t === 'fill' ? '▼' : '◈'}
        </button>
      {/each}
    </div>

    <div class="palette">
      {#each palette as c}
        <button
          class="swatch" class:active={currentColor === c && currentTool === 'pencil'}
          style="background:{c}"
          onclick={() => { currentColor = c; currentTool = 'pencil'; }}
          title={c}
        ></button>
      {/each}
      <button class="swatch add-swatch" onclick={addColor} title="Add color">+</button>
    </div>

    <div class="current-color">
      <span class="color-dot" style="background:{currentColor}"></span>
      <span class="color-hex">{currentColor}</span>
    </div>

    <div class="size-btns">
      {#each [16, 32, 64] as s}
        <button class="size-btn" class:active={gridSize === s} onclick={() => changeGridSize(s)}>{s}×{s}</button>
      {/each}
    </div>
  </div>

  <canvas
    bind:this={canvasEl}
    class="sprite-canvas"
    onmousedown={onMouseDown}
    onmousemove={onMouseMove}
    onmouseup={onMouseUp}
    onmouseleave={onMouseUp}
    ontouchstart={onTouchStart}
    ontouchmove={onTouchMove}
    ontouchend={onTouchEnd}
  ></canvas>
</div>

<div class="actions">
  <button class="btn" onclick={download}>Download PNG</button>
  <button class="btn secondary" onclick={clearCanvas}>Clear</button>
</div>

<section class="seo panel">
  <h2>About Sprite Painter</h2>
  <p>A lightweight pixel art editor that runs entirely in your browser. Draw on 16×16, 32×32, or 64×64 grids — the same sizes used in retro game engines. The download is a raw pixel-for-pixel PNG with no extra padding, ready to import into Godot, Unity, Aseprite, or any sprite sheet tool.</p>
  <p>Use the <strong>fill bucket</strong> to flood-fill regions, the <strong>eyedropper</strong> to pick colors from the canvas, and the palette to build your own color set. Changing grid size preserves your existing pixels where they fit.</p>
  <div class="see-also">
    <span class="see-label">Related:</span>
    <a href="/sprite-animator">Sprite Animator</a>
    <a href="/upscale">Pixel Upscaler</a>
    <a href="/palette-extractor">Palette Extractor</a>
  </div>
</section>

<style>
  .lead { color: var(--muted); font-size: 1.2rem; margin: 0 0 1rem; }
  .workspace { display: flex; gap: 1.25rem; flex-wrap: wrap; margin-bottom: 1rem; align-items: flex-start; }
  .left-col { display: flex; flex-direction: column; gap: 0.75rem; }
  .toolbar { display: flex; gap: 0.3rem; }
  .tool-btn {
    width: 38px; height: 38px; border: 2px solid var(--line); background: var(--bg-2);
    color: var(--muted); cursor: pointer; font-size: 1.1rem; display: flex; align-items: center; justify-content: center;
    transition: border-color 0.08s, color 0.08s;
  }
  .tool-btn:hover { border-color: var(--accent-2); color: var(--ink); }
  .tool-btn.active { border-color: var(--accent-3); color: var(--accent-3); }
  .palette { display: grid; grid-template-columns: repeat(4, 1fr); gap: 3px; width: 132px; }
  .swatch { width: 30px; height: 30px; border: 2px solid var(--line); cursor: pointer; transition: transform 0.08s; }
  .swatch:hover { transform: scale(1.15); border-color: #fff; }
  .swatch.active { border-color: #fff; transform: scale(1.1); }
  .add-swatch { background: var(--bg-2); color: var(--muted); font-size: 1.1rem; display: flex; align-items: center; justify-content: center; }
  .current-color { display: flex; align-items: center; gap: 0.5rem; }
  .color-dot { width: 20px; height: 20px; border: 2px solid var(--line); }
  .color-hex { font-size: 0.9rem; color: var(--muted); font-family: monospace; }
  .size-btns { display: flex; gap: 0.3rem; }
  .size-btn { background: var(--bg-2); border: 2px solid var(--line); color: var(--muted); padding: 0.25rem 0.5rem; cursor: pointer; font-size: 0.85rem; transition: border-color 0.08s, color 0.08s; }
  .size-btn:hover { border-color: var(--accent-2); color: var(--ink); }
  .size-btn.active { border-color: var(--accent-3); color: var(--accent-3); }
  .sprite-canvas { border: 2px solid var(--line); cursor: crosshair; image-rendering: pixelated; max-width: min(512px, 100%); touch-action: none; }
  .actions { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 1.5rem; }
</style>
