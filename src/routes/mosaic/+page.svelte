<script lang="ts">
  import { track } from '$lib/analytics';

  let imgUrl = $state<string | null>(null);
  let outputUrl = $state<string | null>(null);
  let fileName = $state('image');
  let tileSize = $state(16);
  let style = $state<'square' | 'circle' | 'diamond'>('square');
  let gap = $state(1);
  let bgColor = $state('#000000');
  let processing = $state(false);
  let dropActive = $state(false);

  function loadFile(file: File) {
    if (!file.type.startsWith('image/')) return;
    fileName = file.name.replace(/\.[^.]+$/, '');
    const reader = new FileReader();
    reader.onload = (e) => {
      imgUrl = e.target!.result as string;
      outputUrl = null;
    };
    reader.readAsDataURL(file);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault(); dropActive = false;
    const f = e.dataTransfer?.files[0];
    if (f) loadFile(f);
  }

  $effect(() => { if (imgUrl) process(); });
  $effect(() => { tileSize; style; gap; bgColor; if (imgUrl) process(); });

  function process() {
    if (!imgUrl || processing) return;
    processing = true;
    const img = new Image();
    img.onload = () => {
      const W = img.naturalWidth;
      const H = img.naturalHeight;
      const off = document.createElement('canvas');
      off.width = W;
      off.height = H;
      const ctx = off.getContext('2d')!;

      // draw original to sample
      const sample = document.createElement('canvas');
      sample.width = W; sample.height = H;
      const sc = sample.getContext('2d')!;
      sc.drawImage(img, 0, 0);

      // background
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, W, H);

      const t = tileSize + gap;
      const cols = Math.ceil(W / t);
      const rows = Math.ceil(H / t);

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = col * t;
          const y = row * t;
          // sample center pixel
          const cx = Math.min(x + tileSize / 2, W - 1);
          const cy = Math.min(y + tileSize / 2, H - 1);
          const px = sc.getImageData(Math.floor(cx), Math.floor(cy), 1, 1).data;
          const fillColor = `rgba(${px[0]},${px[1]},${px[2]},${px[3]/255})`;
          ctx.fillStyle = fillColor;

          if (style === 'square') {
            ctx.fillRect(x, y, tileSize, tileSize);
          } else if (style === 'circle') {
            ctx.beginPath();
            ctx.arc(x + tileSize / 2, y + tileSize / 2, tileSize / 2, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // diamond
            const cx2 = x + tileSize / 2, cy2 = y + tileSize / 2;
            const r = tileSize / 2;
            ctx.beginPath();
            ctx.moveTo(cx2, cy2 - r);
            ctx.lineTo(cx2 + r, cy2);
            ctx.lineTo(cx2, cy2 + r);
            ctx.lineTo(cx2 - r, cy2);
            ctx.closePath();
            ctx.fill();
          }
        }
      }

      outputUrl = off.toDataURL('image/png');
      processing = false;
      track('tool_use', { tool: 'mosaic', style, tileSize });
    };
    img.src = imgUrl;
  }

  function download() {
    if (!outputUrl) return;
    const a = document.createElement('a');
    a.href = outputUrl;
    a.download = `${fileName}-mosaic-${style}.png`;
    a.click();
    track('export', { tool: 'mosaic', type: 'png' });
  }
</script>

<svelte:head>
  <title>Pixel Mosaic Generator — Photo to Tile Mosaic Online | Station255</title>
  <meta name="description" content="Turn any photo into a pixel mosaic of squares, circles, or diamonds. Adjust tile size and gap. Download instantly. Free, no upload, runs in your browser." />
</svelte:head>

<div class="tool-header">
  <h1 class="tool-title">PIXEL MOSAIC</h1>
  <p class="tool-sub">Turn any photo into a tiled mosaic of squares, circles, or diamonds. Adjust the tile size to control how abstract it gets.</p>
</div>

<div class="workspace">
  {#if !imgUrl}
    <label
      class="drop-zone"
      class:active={dropActive}
      ondragover={(e) => { e.preventDefault(); dropActive = true; }}
      ondragleave={() => dropActive = false}
      ondrop={onDrop}
    >
      <span class="drop-icon">🖼</span>
      <span class="drop-main">Drop an image here</span>
      <span class="drop-sub">or click to browse · PNG, JPG, WebP</span>
      <input type="file" accept="image/*" onchange={(e) => { const f=(e.target as HTMLInputElement).files?.[0]; if(f) loadFile(f); }} class="file-input" />
    </label>
  {:else}
    <div class="controls panel">
      <label class="ctrl-row">
        <span class="ctrl-label">Tile size</span>
        <input type="range" min="4" max="48" step="2" bind:value={tileSize} class="slider" />
        <span class="ctrl-val">{tileSize}px</span>
      </label>
      <label class="ctrl-row">
        <span class="ctrl-label">Gap</span>
        <input type="range" min="0" max="8" step="1" bind:value={gap} class="slider" />
        <span class="ctrl-val">{gap}px</span>
      </label>
      <div class="ctrl-row">
        <span class="ctrl-label">Shape</span>
        <button class="shape-btn" class:active={style==='square'} onclick={() => style='square'}>▪ Square</button>
        <button class="shape-btn" class:active={style==='circle'} onclick={() => style='circle'}>● Circle</button>
        <button class="shape-btn" class:active={style==='diamond'} onclick={() => style='diamond'}>◆ Diamond</button>
      </div>
      <label class="ctrl-row">
        <span class="ctrl-label">Background</span>
        <input type="color" bind:value={bgColor} class="color-pick" />
      </label>
      <div class="ctrl-row">
        <button class="btn" onclick={download} disabled={!outputUrl || processing}>
          {processing ? 'processing…' : '↓ Download PNG'}
        </button>
        <button class="btn secondary" onclick={() => { imgUrl = null; outputUrl = null; }}>← New image</button>
      </div>
    </div>

    <div class="preview-row">
      <div class="preview-box">
        <span class="preview-label">Original</span>
        <img src={imgUrl} alt="Original" class="preview-img" />
      </div>
      <div class="preview-box">
        <span class="preview-label">{style} mosaic · {tileSize}px tiles</span>
        {#if outputUrl}
          <img src={outputUrl} alt="Mosaic result" class="preview-img" />
        {:else}
          <div class="preview-ph">processing…</div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<div class="panel about">
  <h2 class="about-title">About Pixel Mosaic</h2>
  <p>This tool divides your image into a grid of tiles and fills each tile with the color sampled from its center pixel. The result is a mosaic effect — like the stained glass or Roman tile mosaics of the ancient world, but made of pixels.</p>
  <p>Try square tiles at 16px for a classic pixel art look. Switch to circles at 8px for a halftone-like effect. Diamonds at large sizes create an abstract, painterly result. Add a gap and choose a dark background for definition between tiles.</p>
</div>

<style>
  .tool-header { padding: 1.25rem 0 1rem; border-bottom: 2px solid var(--line); margin-bottom: 1.5rem; }
  .tool-title { font-family: var(--display); font-size: 1.1rem; color: var(--accent-3); text-shadow: 3px 3px 0 var(--accent); margin: 0 0 0.5rem; }
  .tool-sub { color: var(--muted); font-size: 0.95rem; margin: 0; }

  .workspace { margin-bottom: 1.5rem; }
  .drop-zone {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 0.5rem; border: 2px dashed var(--line); padding: 3rem 1rem; cursor: pointer; text-align: center;
    transition: border-color 0.12s, background 0.12s;
  }
  .drop-zone:hover, .drop-zone.active { border-color: var(--accent-3); background: rgba(255,255,255,0.02); }
  .drop-icon { font-size: 2.5rem; }
  .drop-main { font-family: var(--display); font-size: 0.55rem; color: var(--ink); }
  .drop-sub { font-size: 0.85rem; color: var(--muted); }
  .file-input { display: none; }

  .controls { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1rem; }
  .ctrl-row { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
  .ctrl-label { font-family: var(--display); font-size: 0.35rem; color: var(--muted); min-width: 5rem; }
  .ctrl-val { font-family: var(--display); font-size: 0.35rem; color: var(--ink); min-width: 2.5rem; }
  .slider { flex: 1; min-width: 100px; max-width: 200px; accent-color: var(--accent-3); }
  .color-pick { width: 36px; height: 28px; border: 1px solid var(--line); cursor: pointer; padding: 2px; }
  .shape-btn {
    font-size: 0.85rem; background: none; border: 1px solid var(--line); color: var(--muted);
    padding: 0.25rem 0.6rem; cursor: pointer; transition: border-color 0.08s, color 0.08s;
  }
  .shape-btn:hover { color: var(--ink); }
  .shape-btn.active { border-color: var(--accent-3); color: var(--accent-3); }

  .preview-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .preview-box { display: flex; flex-direction: column; gap: 0.4rem; }
  .preview-label { font-family: var(--display); font-size: 0.32rem; color: var(--muted); }
  .preview-img { width: 100%; height: auto; display: block; border: 2px solid var(--line); }
  .preview-ph { border: 2px solid var(--line); padding: 2rem; text-align: center; color: var(--muted); font-size: 0.85rem; }

  .about { margin-top: 1.5rem; }
  .about-title { font-family: var(--display); font-size: 0.5rem; color: var(--accent-3); margin: 0 0 0.75rem; }
  .about p { font-size: 0.9rem; color: var(--muted); line-height: 1.6; margin: 0 0 0.5rem; }

  @media (max-width: 560px) { .preview-row { grid-template-columns: 1fr; } }
</style>
