<script lang="ts">
  import { onMount } from 'svelte';
  import { track } from '$lib/analytics';

  type GridSize = 8 | 16 | 32;
  let gridSize = $state<GridSize>(8);
  let zoom = $derived(Math.floor(320 / gridSize));
  let tool = $state<'draw' | 'erase' | 'fill'>('draw');
  let color = $state('#00ff88');

  const PRESETS: Record<string, { size: GridSize; data: number[] }> = {
    'Heart': { size: 8, data: [0,0,0,0,0,0,0,0, 0,1,1,0,1,1,0,0, 1,1,1,1,1,1,1,0, 1,1,1,1,1,1,1,0, 0,1,1,1,1,1,0,0, 0,0,1,1,1,0,0,0, 0,0,0,1,0,0,0,0, 0,0,0,0,0,0,0,0] },
    'Star': { size: 8, data: [0,0,0,1,0,0,0,0, 0,0,0,1,0,0,0,0, 0,1,1,1,1,1,0,0, 0,0,1,1,1,0,0,0, 0,1,0,1,0,1,0,0, 1,0,0,1,0,0,1,0, 0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0] },
    'Smiley': { size: 8, data: [0,1,1,1,1,1,1,0, 1,0,0,0,0,0,0,1, 1,0,1,0,0,1,0,1, 1,0,0,0,0,0,0,1, 1,0,1,0,0,1,0,1, 1,0,0,1,1,0,0,1, 1,0,0,0,0,0,0,1, 0,1,1,1,1,1,1,0] },
    'Arrow': { size: 8, data: [0,0,0,1,0,0,0,0, 0,0,1,1,0,0,0,0, 0,1,0,1,0,0,0,0, 1,1,1,1,1,1,1,0, 1,1,1,1,1,1,1,0, 0,1,0,1,0,0,0,0, 0,0,1,1,0,0,0,0, 0,0,0,1,0,0,0,0] },
    'Skull': { size: 8, data: [0,1,1,1,1,1,0,0, 1,0,0,0,0,0,1,0, 1,0,1,0,1,0,1,0, 1,0,0,0,0,0,1,0, 1,0,1,0,1,0,1,0, 1,1,0,1,0,1,1,0, 0,1,0,0,0,1,0,0, 0,1,1,1,1,1,0,0] },
  };

  let pixels = $state<Uint8Array>(new Uint8Array(8 * 8));
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let painting = false;
  let paintVal = 1;
  let history: Uint8Array[] = [];

  function idx(x: number, y: number) { return y * gridSize + x; }

  function redraw() {
    if (!ctx) return;
    const z = zoom;
    const sz = gridSize;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < sz; y++) {
      for (let x = 0; x < sz; x++) {
        if ((x + y) % 2 === 0) ctx.fillStyle = '#1a1a1a';
        else ctx.fillStyle = '#222';
        ctx.fillRect(x * z, y * z, z, z);
        if (pixels[idx(x, y)]) {
          ctx.fillStyle = color;
          ctx.fillRect(x * z + 1, y * z + 1, z - 2, z - 2);
        }
      }
    }
    // grid
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= sz; x++) {
      ctx.beginPath(); ctx.moveTo(x * z, 0); ctx.lineTo(x * z, sz * z); ctx.stroke();
    }
    for (let y = 0; y <= sz; y++) {
      ctx.beginPath(); ctx.moveTo(0, y * z); ctx.lineTo(sz * z, y * z); ctx.stroke();
    }
  }

  function getCell(e: MouseEvent | TouchEvent): [number, number] | null {
    const rect = canvas.getBoundingClientRect();
    const cx = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const cy = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = Math.floor(((cx - rect.left) / rect.width) * gridSize);
    const y = Math.floor(((cy - rect.top) / rect.height) * gridSize);
    if (x < 0 || x >= gridSize || y < 0 || y >= gridSize) return null;
    return [x, y];
  }

  function fill(sx: number, sy: number) {
    const target = pixels[idx(sx, sy)];
    const fill = paintVal;
    if (target === fill) return;
    const queue = [[sx, sy]];
    const copy = new Uint8Array(pixels);
    while (queue.length) {
      const [x, y] = queue.shift()!;
      if (x < 0 || x >= gridSize || y < 0 || y >= gridSize) continue;
      if (copy[idx(x, y)] !== target) continue;
      copy[idx(x, y)] = fill;
      queue.push([x+1,y],[x-1,y],[x,y+1],[x,y-1]);
    }
    pixels = copy;
    redraw();
  }

  function paint(e: MouseEvent | TouchEvent) {
    const cell = getCell(e);
    if (!cell) return;
    const [x, y] = cell;
    if (tool === 'fill') { fill(x, y); return; }
    pixels[idx(x, y)] = tool === 'erase' ? 0 : paintVal;
    pixels = new Uint8Array(pixels);
    redraw();
  }

  function pushHistory() { history = [...history.slice(-20), new Uint8Array(pixels)]; }
  function undo() {
    if (!history.length) return;
    pixels = history[history.length - 1];
    history = history.slice(0, -1);
    redraw();
  }

  function loadPreset(name: string) {
    const p = PRESETS[name];
    gridSize = p.size;
    pixels = new Uint8Array(p.data);
    setTimeout(redraw, 0);
  }

  function switchSize(sz: GridSize) {
    gridSize = sz;
    pixels = new Uint8Array(sz * sz);
    setTimeout(redraw, 0);
  }

  function flip(axis: 'h' | 'v') {
    const sz = gridSize;
    const copy = new Uint8Array(sz * sz);
    for (let y = 0; y < sz; y++) {
      for (let x = 0; x < sz; x++) {
        const nx = axis === 'h' ? sz - 1 - x : x;
        const ny = axis === 'v' ? sz - 1 - y : y;
        copy[ny * sz + nx] = pixels[idx(x, y)];
      }
    }
    pixels = copy;
    redraw();
  }

  function rotate() {
    const sz = gridSize;
    const copy = new Uint8Array(sz * sz);
    for (let y = 0; y < sz; y++) {
      for (let x = 0; x < sz; x++) {
        copy[x * sz + (sz - 1 - y)] = pixels[idx(x, y)];
      }
    }
    pixels = copy;
    redraw();
  }

  function downloadPNG() {
    const off = document.createElement('canvas');
    const sz = gridSize;
    off.width = sz; off.height = sz;
    const oc = off.getContext('2d')!;
    const [r, g, b] = [parseInt(color.slice(1,3),16), parseInt(color.slice(3,5),16), parseInt(color.slice(5,7),16)];
    const imgd = oc.createImageData(sz, sz);
    for (let i = 0; i < sz * sz; i++) {
      imgd.data[i*4] = r;
      imgd.data[i*4+1] = g;
      imgd.data[i*4+2] = b;
      imgd.data[i*4+3] = pixels[i] ? 255 : 0;
    }
    oc.putImageData(imgd, 0, 0);
    const a = document.createElement('a');
    a.href = off.toDataURL('image/png');
    a.download = `char-${sz}x${sz}.png`;
    a.click();
    track('export', { tool: 'char-editor', type: 'png', size: sz });
  }

  function copyCSS() {
    const sz = gridSize;
    const shadows: string[] = [];
    for (let y = 0; y < sz; y++) {
      for (let x = 0; x < sz; x++) {
        if (pixels[idx(x, y)]) shadows.push(`${x}px ${y}px ${color}`);
      }
    }
    navigator.clipboard.writeText(`box-shadow: ${shadows.join(', ')};`);
    track('export', { tool: 'char-editor', type: 'css' });
  }

  $effect(() => {
    color;
    if (ctx) redraw();
  });

  $effect(() => {
    gridSize;
    if (ctx) {
      canvas.width = gridSize * zoom;
      canvas.height = gridSize * zoom;
      redraw();
    }
  });

  onMount(() => {
    ctx = canvas.getContext('2d')!;
    canvas.width = gridSize * zoom;
    canvas.height = gridSize * zoom;
    redraw();
    track('tool_use', { tool: 'char-editor' });
  });
</script>

<svelte:head>
  <title>Pixel Character Editor — 8x8 Sprite & Icon Maker | Station255</title>
  <meta name="description" content="Draw pixel art characters and icons at 8×8, 16×16 or 32×32. Flip, rotate, fill — download as PNG or copy as CSS box-shadow. Free, in your browser." />
</svelte:head>

<div class="tool-header">
  <h1 class="tool-title">CHAR EDITOR</h1>
  <p class="tool-sub">Draw pixel characters in 8×8, 16×16 or 32×32. The classic way to make icons, sprites, and emoji. Export as PNG or CSS.</p>
</div>

<div class="controls panel">
  <div class="ctrl-group">
    <span class="ctrl-label">Size</span>
    {#each ([8,16,32] as GridSize[]) as sz}
      <button class="size-btn" class:active={gridSize === sz} onclick={() => switchSize(sz)}>{sz}×{sz}</button>
    {/each}
  </div>
  <div class="ctrl-group">
    <span class="ctrl-label">Tool</span>
    <button class="tool-btn" class:active={tool==='draw'} onclick={() => tool='draw'}>✏ Draw</button>
    <button class="tool-btn" class:active={tool==='erase'} onclick={() => tool='erase'}>◻ Erase</button>
    <button class="tool-btn" class:active={tool==='fill'} onclick={() => tool='fill'}>🪣 Fill</button>
  </div>
  <div class="ctrl-group">
    <label class="color-field">
      <span class="ctrl-label">Color</span>
      <input type="color" bind:value={color} class="color-pick" />
    </label>
  </div>
  <div class="ctrl-group">
    <span class="ctrl-label">Transform</span>
    <button class="tool-btn" onclick={() => flip('h')}>↔ Flip H</button>
    <button class="tool-btn" onclick={() => flip('v')}>↕ Flip V</button>
    <button class="tool-btn" onclick={rotate}>↻ Rotate</button>
    <button class="tool-btn" onclick={undo}>↩ Undo</button>
    <button class="tool-btn" onclick={() => { pixels = new Uint8Array(gridSize * gridSize); redraw(); }}>✕ Clear</button>
  </div>
  <div class="ctrl-group">
    <span class="ctrl-label">Presets</span>
    {#each Object.keys(PRESETS) as name}
      <button class="preset-btn" onclick={() => loadPreset(name)}>{name}</button>
    {/each}
  </div>
  <div class="ctrl-group">
    <button class="btn" onclick={downloadPNG}>↓ PNG</button>
    <button class="btn secondary" onclick={copyCSS}>⎘ CSS</button>
  </div>
</div>

<div class="editor-area">
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <canvas
    bind:this={canvas}
    class="pixel-canvas"
    onmousedown={(e) => { pushHistory(); painting = true; const c=getCell(e); if(c) { paintVal=pixels[idx(c[0],c[1])]&&tool==='draw'?0:1; paint(e); } }}
    onmousemove={(e) => { if(painting) paint(e); }}
    onmouseup={() => painting=false}
    onmouseleave={() => painting=false}
    ontouchstart={(e) => { e.preventDefault(); pushHistory(); painting=true; paint(e); }}
    ontouchmove={(e) => { e.preventDefault(); if(painting) paint(e); }}
    ontouchend={() => painting=false}
    role="img"
    aria-label="Pixel character editor canvas"
    style="touch-action:none"
  ></canvas>
</div>

<div class="panel about">
  <h2 class="about-title">About Char Editor</h2>
  <p>8×8 character grids are the building block of virtually every retro video game — they define the tile size of the NES, the character ROM of ZX Spectrum, and the bitmap font of every 1980s home computer. This tool lets you draw in that tradition, then export as a transparent PNG or as a CSS <code>box-shadow</code> string for pure CSS pixel art.</p>
</div>

<style>
  .tool-header { padding: 1.25rem 0 1rem; border-bottom: 2px solid var(--line); margin-bottom: 1rem; }
  .tool-title { font-family: var(--display); font-size: 1.1rem; color: var(--accent-3); text-shadow: 3px 3px 0 var(--accent); margin: 0 0 0.5rem; }
  .tool-sub { color: var(--muted); font-size: 0.95rem; margin: 0; }

  .controls { display: flex; flex-direction: column; gap: 0.6rem; margin-bottom: 1rem; }
  .ctrl-group { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; }
  .ctrl-label { font-family: var(--display); font-size: 0.33rem; color: var(--muted); min-width: 3.5rem; }
  .size-btn, .tool-btn, .preset-btn {
    font-family: var(--display); font-size: 0.3rem; background: none;
    border: 1px solid var(--line); color: var(--muted); padding: 0.3rem 0.55rem; cursor: pointer;
    transition: border-color 0.08s, color 0.08s;
  }
  .size-btn:hover, .tool-btn:hover, .preset-btn:hover { color: var(--ink); border-color: var(--muted); }
  .size-btn.active, .tool-btn.active { border-color: var(--accent-3); color: var(--accent-3); }
  .color-field { display: flex; align-items: center; gap: 0.4rem; }
  .color-pick { width: 36px; height: 28px; border: 1px solid var(--line); background: none; cursor: pointer; padding: 2px; }

  .editor-area { margin-bottom: 1rem; }
  .pixel-canvas { display: block; border: 2px solid var(--line); box-shadow: 4px 4px 0 #000; cursor: crosshair; image-rendering: pixelated; max-width: 100%; }

  .about { margin-top: 0.5rem; }
  .about-title { font-family: var(--display); font-size: 0.5rem; color: var(--accent-3); margin: 0 0 0.75rem; }
  .about p { font-size: 0.9rem; color: var(--muted); line-height: 1.6; margin: 0 0 0.5rem; }
  .about code { background: var(--bg); padding: 1px 4px; }
</style>
