<script lang="ts">
  import { track } from '$lib/analytics';

  const GRID = 16;
  const COLORS_PALETTE = [
    '#000000','#ffffff','#ff0000','#00ff00','#0000ff','#ffff00','#ff00ff','#00ffff',
    '#ff8800','#8800ff','#00ff88','#ff0088','#0088ff','#88ff00','#ff4444','#44ff44',
    '#4444ff','#ffaa44','#44ffaa','#aa44ff','#888888','#cccccc','#444444','#222222',
  ];

  let pixels = $state<(string | null)[]>(Array(GRID * GRID).fill(null));
  let activeColor = $state('#ff0000');
  let tool = $state<'draw' | 'erase' | 'fill'>('draw');
  let scale = $state(8);
  let painting = false;
  let paintVal: string | null = '#ff0000';

  let canvas: HTMLCanvasElement;

  function idx(x: number, y: number) { return y * GRID + x; }

  function redraw() {
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        const c = pixels[idx(x, y)];
        // checkerboard
        ctx.fillStyle = (x + y) % 2 === 0 ? '#181818' : '#222';
        ctx.fillRect(x * scale, y * scale, scale, scale);
        if (c) {
          ctx.fillStyle = c;
          ctx.fillRect(x * scale, y * scale, scale, scale);
        }
      }
    }
    // grid
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID; i++) {
      ctx.beginPath(); ctx.moveTo(i * scale, 0); ctx.lineTo(i * scale, GRID * scale); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * scale); ctx.lineTo(GRID * scale, i * scale); ctx.stroke();
    }
  }

  function getCell(e: MouseEvent): [number, number] | null {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * GRID);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * GRID);
    if (x < 0 || x >= GRID || y < 0 || y >= GRID) return null;
    return [x, y];
  }

  function floodFill(sx: number, sy: number) {
    const target = pixels[idx(sx, sy)];
    const fill = tool === 'erase' ? null : activeColor;
    if (target === fill) return;
    const arr = [...pixels];
    const queue = [[sx, sy]];
    while (queue.length) {
      const [x, y] = queue.shift()!;
      if (x < 0 || x >= GRID || y < 0 || y >= GRID) continue;
      if (arr[idx(x, y)] !== target) continue;
      arr[idx(x, y)] = fill;
      queue.push([x+1,y],[x-1,y],[x,y+1],[x,y-1]);
    }
    pixels = arr;
    redraw();
  }

  function paint(e: MouseEvent) {
    const cell = getCell(e);
    if (!cell) return;
    const [x, y] = cell;
    if (tool === 'fill') { floodFill(x, y); return; }
    const arr = [...pixels];
    arr[idx(x, y)] = tool === 'erase' ? null : activeColor;
    pixels = arr;
    redraw();
  }

  $effect(() => { pixels; scale; if (canvas) redraw(); });

  function buildCSS(): string {
    const shadows: string[] = [];
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        const c = pixels[idx(x, y)];
        if (c) shadows.push(`${x + 1}px ${y + 1}px 0 ${c}`);
      }
    }
    if (!shadows.length) return '/* no pixels drawn */';
    return `.pixel-art {\n  width: 1px;\n  height: 1px;\n  box-shadow:\n    ${shadows.join(',\n    ')};\n}`;
  }

  function copyCSS() {
    const css = buildCSS();
    navigator.clipboard.writeText(css);
    track('export', { tool: 'css-pixels', type: 'css' });
  }

  function downloadPNG() {
    const off = document.createElement('canvas');
    off.width = GRID; off.height = GRID;
    const ctx = off.getContext('2d')!;
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        if (pixels[idx(x, y)]) {
          ctx.fillStyle = pixels[idx(x, y)]!;
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
    const a = document.createElement('a');
    a.href = off.toDataURL();
    a.download = 'pixel-art.png';
    a.click();
    track('export', { tool: 'css-pixels', type: 'png' });
  }

  let cssCode = $derived(buildCSS());
  let copied = $state(false);
  function handleCopy() { copyCSS(); copied = true; setTimeout(() => copied = false, 1500); }

  track('tool_use', { tool: 'css-pixels' });
</script>

<svelte:head>
  <title>CSS Pixel Art Maker — Draw & Export box-shadow Sprites | Station255</title>
  <meta name="description" content="Draw 16×16 pixel art and export it as a pure CSS box-shadow sprite. No images needed — just a single div. Free online tool for web developers." />
</svelte:head>

<div class="tool-header">
  <h1 class="tool-title">CSS PIXEL ART</h1>
  <p class="tool-sub">Draw a 16×16 sprite, copy the <code>box-shadow</code> CSS. One <code>div</code>, no images, pure CSS pixel art.</p>
</div>

<div class="workspace">
  <div class="left-col">
    <div class="controls panel">
      <div class="ctrl-group">
        <button class="tool-btn" class:active={tool==='draw'} onclick={() => tool='draw'}>✏</button>
        <button class="tool-btn" class:active={tool==='erase'} onclick={() => tool='erase'}>◻</button>
        <button class="tool-btn" class:active={tool==='fill'} onclick={() => tool='fill'}>🪣</button>
        <input type="color" bind:value={activeColor} class="color-pick" title="Active color" />
      </div>
      <div class="swatch-grid">
        {#each COLORS_PALETTE as c}
          <button
            class="swatch"
            class:active={activeColor === c}
            style="background:{c}"
            onclick={() => { activeColor = c; tool = 'draw'; }}
            aria-label={c}
          ></button>
        {/each}
      </div>
      <div class="ctrl-group">
        <label class="ctrl-inline">
          <span class="ctrl-label">Zoom</span>
          <input type="range" min="4" max="16" step="2" bind:value={scale} class="slider" />
          <span class="ctrl-val">{scale}x</span>
        </label>
      </div>
      <div class="ctrl-group">
        <button class="btn" onclick={handleCopy}>{copied ? '✓ Copied!' : '⎘ Copy CSS'}</button>
        <button class="btn secondary" onclick={downloadPNG}>↓ PNG</button>
        <button class="btn secondary" onclick={() => { pixels = Array(GRID*GRID).fill(null); redraw(); }}>✕ Clear</button>
      </div>
    </div>

    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <canvas
      bind:this={canvas}
      width={GRID * scale}
      height={GRID * scale}
      class="pixel-canvas"
      onmousedown={(e) => { painting=true; paintVal=tool==='erase'?null:activeColor; paint(e); }}
      onmousemove={(e) => { if(painting) paint(e); }}
      onmouseup={() => painting=false}
      onmouseleave={() => painting=false}
      style="width:{GRID*scale}px;height:{GRID*scale}px;cursor:crosshair"
      role="img"
      aria-label="CSS pixel art canvas"
    ></canvas>
  </div>

  <div class="right-col">
    <div class="code-label">CSS Output</div>
    <pre class="code-box"><code>{cssCode}</code></pre>
    <div class="preview-label">Live preview (1px base)</div>
    <div class="pixel-preview">
      <div class="pixel-art" style="box-shadow:{pixels.map((c,i) => c ? `${(i%GRID)+1}px ${Math.floor(i/GRID)+1}px 0 ${c}` : '').filter(Boolean).join(',')};"></div>
    </div>
  </div>
</div>

<div class="panel about">
  <h2 class="about-title">About CSS Pixel Art</h2>
  <p>CSS <code>box-shadow</code> accepts multiple comma-separated shadows, each at an offset from a single element. By using a 1×1 pixel div with hundreds of box-shadows — each offset by 1px increments — you can draw arbitrary pixel art using only CSS and no images.</p>
  <p>This technique is great for tiny icons, loading animations, or showing off CSS skills. The downside: very large sprites create huge CSS strings. For anything bigger than 32×32, a PNG is more practical.</p>
</div>

<style>
  .tool-header { padding: 1.25rem 0 1rem; border-bottom: 2px solid var(--line); margin-bottom: 1rem; }
  .tool-title { font-family: var(--display); font-size: 1.1rem; color: var(--accent-3); text-shadow: 3px 3px 0 var(--accent); margin: 0 0 0.5rem; }
  .tool-sub { color: var(--muted); font-size: 0.95rem; margin: 0; }
  .tool-sub code { font-size: 0.85em; background: var(--panel); padding: 0 3px; }

  .workspace { display: grid; grid-template-columns: auto 1fr; gap: 1.25rem; margin-bottom: 1.5rem; align-items: start; }

  .controls { display: flex; flex-direction: column; gap: 0.6rem; margin-bottom: 0.75rem; }
  .ctrl-group { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; }
  .ctrl-label { font-family: var(--display); font-size: 0.3rem; color: var(--muted); }
  .ctrl-val { font-family: var(--display); font-size: 0.3rem; color: var(--ink); min-width: 2rem; }
  .ctrl-inline { display: flex; align-items: center; gap: 0.4rem; }
  .slider { width: 80px; accent-color: var(--accent-3); }
  .tool-btn {
    width: 30px; height: 30px; font-size: 0.9rem; background: none;
    border: 1px solid var(--line); color: var(--muted); cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: border-color 0.08s, color 0.08s;
  }
  .tool-btn:hover { color: var(--ink); }
  .tool-btn.active { border-color: var(--accent-3); color: var(--accent-3); }
  .color-pick { width: 30px; height: 30px; border: 1px solid var(--line); padding: 2px; cursor: pointer; }

  .swatch-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 2px; }
  .swatch { aspect-ratio:1; border: 2px solid transparent; cursor: pointer; transition: transform 0.05s; }
  .swatch:hover { transform: scale(1.15); }
  .swatch.active { border-color: var(--accent-3); }

  .pixel-canvas { display: block; border: 2px solid var(--line); box-shadow: 4px 4px 0 #000; image-rendering: pixelated; }

  .right-col { display: flex; flex-direction: column; gap: 0.5rem; min-width: 0; }
  .code-label, .preview-label { font-family: var(--display); font-size: 0.33rem; color: var(--muted); }
  .code-box {
    background: var(--panel); border: 1px solid var(--line); padding: 0.75rem;
    font-size: 0.72rem; overflow-x: auto; max-height: 280px; overflow-y: auto;
    color: var(--muted); white-space: pre-wrap; word-break: break-all; margin: 0;
  }

  .pixel-preview {
    background: #333; border: 1px solid var(--line);
    padding: 1rem; min-height: 60px;
    display: flex; align-items: center; justify-content: center; overflow: hidden;
  }
  .pixel-art { width: 1px; height: 1px; position: relative; }

  .about { margin-top: 1.5rem; }
  .about-title { font-family: var(--display); font-size: 0.5rem; color: var(--accent-3); margin: 0 0 0.75rem; }
  .about p { font-size: 0.9rem; color: var(--muted); line-height: 1.6; margin: 0 0 0.5rem; }
  .about code { background: var(--panel); padding: 1px 4px; }

  @media (max-width: 600px) {
    .workspace { grid-template-columns: 1fr; }
  }
</style>
