<script lang="ts">
  import { track } from '$lib/analytics';

  let imgUrl   = $state<string | null>(null);
  let fileName  = $state('');
  let tileW    = $state(16);
  let tileH    = $state(16);
  let imgEl: HTMLImageElement | null = null;
  let gridCanvas: HTMLCanvasElement | null = null;

  type Tile = { canvas: HTMLCanvasElement; dataUrl: string; row: number; col: number };
  let tiles    = $state<Tile[]>([]);
  let rowCount = $state(0);
  let colCount = $state(0);

  function handleFile(file: File) {
    fileName = file.name.replace(/\.[^.]+$/, '');
    const fr = new FileReader();
    fr.onload = (e) => {
      imgUrl = e.target!.result as string;
      const img = new Image();
      img.onload = () => { imgEl = img; slice(); };
      img.src = imgUrl;
    };
    fr.readAsDataURL(file);
  }

  function slice() {
    if (!imgEl) return;
    const img = imgEl;
    const W = img.width, H = img.height;
    const tw = Math.max(1, tileW), th = Math.max(1, tileH);
    const cols = Math.floor(W / tw), rows = Math.floor(H / th);

    // Draw grid overlay
    if (gridCanvas) {
      gridCanvas.width = W; gridCanvas.height = H;
      const ctx = gridCanvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      ctx.strokeStyle = 'rgba(255, 240, 80, 0.75)';
      ctx.lineWidth = 1;
      for (let c = 0; c <= cols; c++) { ctx.beginPath(); ctx.moveTo(c * tw, 0); ctx.lineTo(c * tw, rows * th); ctx.stroke(); }
      for (let r = 0; r <= rows; r++) { ctx.beginPath(); ctx.moveTo(0, r * th); ctx.lineTo(cols * tw, r * th); ctx.stroke(); }
    }

    // Store counts for display
    rowCount = rows; colCount = cols;

    // Extract tiles
    const next: Tile[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const tc = document.createElement('canvas');
        tc.width = tw; tc.height = th;
        const tctx = tc.getContext('2d')!;
        tctx.drawImage(img, c * tw, r * th, tw, th, 0, 0, tw, th);
        next.push({ canvas: tc, dataUrl: tc.toDataURL(), row: r, col: c });
      }
    }
    tiles = next;
    track('tool_use', { tool: 'sprite-slicer', tiles: next.length });
  }

  function downloadTile(tile: Tile) {
    tile.canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob!);
      const a = document.createElement('a');
      a.href = url; a.download = `${fileName || 'sheet'}_r${tile.row}_c${tile.col}.png`; a.click();
      URL.revokeObjectURL(url);
    });
    track('export', { tool: 'sprite-slicer', type: 'single' });
  }

  function downloadAll() {
    tiles.forEach((tile, i) => {
      setTimeout(() => downloadTile(tile), i * 100);
    });
    track('export', { tool: 'sprite-slicer', type: 'all', count: tiles.length });
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer?.files[0];
    if (f?.type.startsWith('image/')) handleFile(f);
  }

  function onInput(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (f) handleFile(f);
  }

</script>

<svelte:head>
  <title>Sprite Sheet Slicer Online — Extract Tiles from Sprite Sheets Free | Station255</title>
  <meta name="description" content="Upload a sprite sheet, set tile width and height, and download individual frames as PNG files. Free online sprite sheet cutter — works in your browser, no upload." />
</svelte:head>

<h1 class="tool-title">Sprite Sheet Slicer</h1>
<p class="tool-sub">Upload a sprite sheet, set the tile grid, and extract individual frames. Your files stay in your browser.</p>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="drop-zone"
  class:has-image={!!imgUrl}
  ondragover={(e) => e.preventDefault()}
  ondrop={onDrop}
>
  {#if imgUrl}
    <canvas bind:this={gridCanvas} class="grid-canvas"></canvas>
  {:else}
    <p class="drop-hint">Drop a sprite sheet here</p>
    <label class="btn">
      Choose Image
      <input type="file" accept="image/*" onchange={onInput} style="display:none" />
    </label>
  {/if}
</div>

{#if imgEl}
  <div class="controls panel">
    <div class="tile-inputs">
      <div class="ctrl-row">
        <label>Tile Width (px)</label>
        <input type="number" min="1" max="512" bind:value={tileW} oninput={slice} class="num-input" />
      </div>
      <div class="ctrl-row">
        <label>Tile Height (px)</label>
        <input type="number" min="1" max="512" bind:value={tileH} oninput={slice} class="num-input" />
      </div>
    </div>
    <p class="tile-info">
      Sheet: {imgEl.width}×{imgEl.height} px → <strong>{colCount} × {rowCount}</strong> tiles ({tiles.length} total)
    </p>
    {#if tiles.length > 1}
      <button class="btn" onclick={downloadAll}>⬇ Download All ({tiles.length} PNGs)</button>
      <p class="dl-note">Your browser may ask permission for multiple downloads.</p>
    {/if}
  </div>

  {#if tiles.length > 0}
    <p class="section-label">Tiles — click any to download</p>
    <div class="tile-grid">
      {#each tiles as tile}
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <div class="tile-thumb" onclick={() => downloadTile(tile)} title={`Row ${tile.row}, Col ${tile.col} — click to download`}>
          <img src={tile.dataUrl} alt={`Tile ${tile.row},${tile.col}`} class="tile-canvas" width={tile.canvas.width} height={tile.canvas.height} />
          <span class="tile-label">{tile.row},{tile.col}</span>
        </div>
      {/each}
    </div>
  {/if}
{/if}

<div class="seo">
  <h2>Free Sprite Sheet Slicer Online</h2>
  <p>
    Station255's Sprite Sheet Slicer lets game developers and pixel artists split a packed sprite sheet
    into individual tile PNGs directly in the browser. Upload any PNG, JPEG, or WebP sprite atlas,
    set the tile width and height, and the tool draws a yellow grid overlay so you can verify alignment
    before extracting all frames. No image is ever sent to a server.
  </p>
  <h3>Workflow</h3>
  <p>
    Drop your sprite sheet, then adjust tile width and height until the yellow grid aligns with your
    sprites. The info bar shows you how many tiles the current grid produces. Click any individual
    tile in the gallery to download it, or use <em>Download All</em> to trigger all PNG downloads
    in sequence. Each file is named <code>sheet_rROW_cCOL.png</code>.
  </p>
  <h3>Use cases</h3>
  <p>
    Extract frames from sprite sheets downloaded from itch.io, OpenGameArt, or your own pixel-art
    tool exports. Works for any uniform-grid sprite atlas — characters, tiles, UI elements, effects.
  </p>
  <h3>FAQ</h3>
  <h3>What if my sprites aren't in a uniform grid?</h3>
  <p>This tool handles uniform grids only. For packed (non-uniform) atlases with a JSON layout, you'll need a dedicated atlas unpacker.</p>
  <h3>Does it support transparency?</h3>
  <p>Yes — PNG files with an alpha channel are processed and exported with transparency intact.</p>
  <h3>Why does Download All ask for permission?</h3>
  <p>Modern browsers require user permission for multiple simultaneous file downloads. Accept the prompt to allow all tiles to save.</p>
</div>

<div class="see-also">
  <span>See also:</span>
  <a href="/upscale">Pixel Upscaler</a>
  <a href="/demake">Demake</a>
  <a href="/sticker">Sticker Maker</a>
  <a href="/noise">Pixel Noise</a>
</div>

<style>
  .tool-title { font-size: 1.1rem; margin: 0 0 0.4rem; }
  .tool-sub { color: var(--muted); margin: 0 0 1rem; font-size: 0.95rem; }

  .drop-zone {
    border: 2px dashed var(--line);
    padding: 2rem;
    text-align: center;
    cursor: pointer;
    margin-bottom: 1rem;
    min-height: 120px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
  }
  .drop-zone.has-image { padding: 0.5rem; border-style: solid; }
  .drop-hint { color: var(--muted); margin: 0; }

  .grid-canvas { max-width: 100%; display: block; image-rendering: pixelated; }

  .controls { padding: 1rem; margin-bottom: 1rem; display: flex; flex-direction: column; gap: 0.65rem; }
  .tile-inputs { display: flex; gap: 1rem; flex-wrap: wrap; }
  .ctrl-row { display: flex; flex-direction: column; gap: 0.3rem; }
  .ctrl-row label { font-size: 0.85rem; color: var(--muted); }
  .num-input { width: 80px; background: var(--bg-2); border: 1px solid var(--line); color: var(--ink); padding: 0.3rem 0.5rem; font-family: inherit; font-size: 0.9rem; }
  .tile-info { font-size: 0.9rem; color: var(--muted); margin: 0; }
  .tile-info strong { color: var(--ink); }
  .dl-note { font-size: 0.8rem; color: var(--muted); margin: 0; }

  .section-label { font-family: var(--display); font-size: 0.5rem; color: var(--muted); margin: 1rem 0 0.5rem; }

  .tile-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: 2rem;
  }
  .tile-thumb {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    cursor: pointer;
    border: 1px solid var(--line);
    padding: 3px;
    background: var(--panel);
  }
  .tile-thumb:hover { border-color: var(--accent-2); }
  .tile-canvas { image-rendering: pixelated; display: block; min-width: 16px; min-height: 16px; max-width: 64px; max-height: 64px; }
  .tile-label { font-family: var(--display); font-size: 0.32rem; color: var(--muted); }
</style>
