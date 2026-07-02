<script lang="ts">
  import { track } from '$lib/analytics';

  let tilesetImg = $state<HTMLImageElement | null>(null);
  let tileSize = $state(16);
  let mapCols = $state(16);
  let mapRows = $state(10);
  let map = $state<number[][]>([]);
  let selectedTile = $state(0);
  let tool = $state<'paint' | 'erase'>('paint');
  let isPainting = false;

  const MAX_MAP = 64;
  const DISPLAY_BUDGET = 640;

  let paletteCanvas: HTMLCanvasElement;
  let mapCanvas: HTMLCanvasElement;

  const paletteCols = $derived(tilesetImg ? Math.max(1, Math.floor(tilesetImg.width / tileSize)) : 0);
  const paletteRows = $derived(tilesetImg ? Math.max(1, Math.floor(tilesetImg.height / tileSize)) : 0);
  const tileCount = $derived(tilesetImg ? paletteCols * paletteRows : 0);
  const displayTileSize = $derived(
    Math.max(6, Math.min(32, Math.floor(DISPLAY_BUDGET / Math.max(mapCols, mapRows, 1))))
  );

  function initMap() {
    map = Array.from({ length: mapRows }, () => Array.from({ length: mapCols }, () => -1));
  }

  function handleFile(file: File) {
    const fr = new FileReader();
    fr.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        tilesetImg = img;
        selectedTile = 0;
        initMap();
        track('tool_use', { tool: 'tilemap-editor', tiles: paletteCols * paletteRows });
      };
      img.src = e.target!.result as string;
    };
    fr.readAsDataURL(file);
  }

  function onInput(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (f) handleFile(f);
  }
  function onDrop(e: DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer?.files[0];
    if (f?.type.startsWith('image/')) handleFile(f);
  }

  function onMapSizeChange() {
    mapCols = Math.max(1, Math.min(MAX_MAP, mapCols || 1));
    mapRows = Math.max(1, Math.min(MAX_MAP, mapRows || 1));
    initMap();
  }
  function onTileSizeChange() {
    tileSize = Math.max(1, tileSize || 1);
    selectedTile = 0;
    if (tilesetImg) initMap();
  }

  function drawPalette() {
    if (!paletteCanvas || !tilesetImg) return;
    paletteCanvas.width = tilesetImg.width;
    paletteCanvas.height = tilesetImg.height;
    const ctx = paletteCanvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, paletteCanvas.width, paletteCanvas.height);
    ctx.drawImage(tilesetImg, 0, 0);
    ctx.strokeStyle = 'rgba(255, 240, 80, 0.5)';
    ctx.lineWidth = 1;
    for (let c = 0; c <= paletteCols; c++) {
      ctx.beginPath(); ctx.moveTo(c * tileSize, 0); ctx.lineTo(c * tileSize, paletteRows * tileSize); ctx.stroke();
    }
    for (let r = 0; r <= paletteRows; r++) {
      ctx.beginPath(); ctx.moveTo(0, r * tileSize); ctx.lineTo(paletteCols * tileSize, r * tileSize); ctx.stroke();
    }
    const sc = selectedTile % paletteCols;
    const sr = Math.floor(selectedTile / paletteCols);
    ctx.strokeStyle = '#ff2e88';
    ctx.lineWidth = 2;
    ctx.strokeRect(sc * tileSize + 1, sr * tileSize + 1, tileSize - 2, tileSize - 2);
  }

  function drawMap() {
    if (!mapCanvas) return;
    const w = mapCols * displayTileSize;
    const h = mapRows * displayTileSize;
    mapCanvas.width = w;
    mapCanvas.height = h;
    const ctx = mapCanvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#151030';
    ctx.fillRect(0, 0, w, h);
    if (tilesetImg) {
      for (let r = 0; r < mapRows; r++) {
        for (let c = 0; c < mapCols; c++) {
          const idx = map[r]?.[c] ?? -1;
          if (idx < 0) continue;
          const sc = idx % paletteCols;
          const sr = Math.floor(idx / paletteCols);
          ctx.drawImage(
            tilesetImg,
            sc * tileSize, sr * tileSize, tileSize, tileSize,
            c * displayTileSize, r * displayTileSize, displayTileSize, displayTileSize
          );
        }
      }
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    for (let c = 0; c <= mapCols; c++) {
      ctx.beginPath(); ctx.moveTo(c * displayTileSize, 0); ctx.lineTo(c * displayTileSize, h); ctx.stroke();
    }
    for (let r = 0; r <= mapRows; r++) {
      ctx.beginPath(); ctx.moveTo(0, r * displayTileSize); ctx.lineTo(w, r * displayTileSize); ctx.stroke();
    }
  }

  $effect(() => { void tilesetImg; void tileSize; void selectedTile; void paletteCols; void paletteRows; drawPalette(); });
  $effect(() => { void map; void mapCols; void mapRows; void displayTileSize; void tilesetImg; drawMap(); });

  function paletteClick(e: MouseEvent) {
    if (!tilesetImg) return;
    const rect = paletteCanvas.getBoundingClientRect();
    const scale = paletteCanvas.width / rect.width;
    const px = (e.clientX - rect.left) * scale;
    const py = (e.clientY - rect.top) * scale;
    const col = Math.floor(px / tileSize);
    const row = Math.floor(py / tileSize);
    const idx = row * paletteCols + col;
    if (idx >= 0 && idx < tileCount) selectedTile = idx;
  }

  function cellAt(e: MouseEvent): { row: number; col: number } | null {
    const rect = mapCanvas.getBoundingClientRect();
    const scale = mapCanvas.width / rect.width;
    const px = (e.clientX - rect.left) * scale;
    const py = (e.clientY - rect.top) * scale;
    const col = Math.floor(px / displayTileSize);
    const row = Math.floor(py / displayTileSize);
    if (row < 0 || row >= mapRows || col < 0 || col >= mapCols) return null;
    return { row, col };
  }

  function paintAt(e: MouseEvent, erase: boolean) {
    const cell = cellAt(e);
    if (!cell || !tilesetImg) return;
    map[cell.row][cell.col] = erase ? -1 : selectedTile;
  }

  function onMapMouseDown(e: MouseEvent) {
    if (!tilesetImg) return;
    isPainting = true;
    paintAt(e, tool === 'erase');
  }
  function onMapMouseMove(e: MouseEvent) {
    if (!isPainting) return;
    paintAt(e, tool === 'erase');
  }
  function stopPainting() { isPainting = false; }
  function onMapContextMenu(e: MouseEvent) {
    e.preventDefault();
    paintAt(e, true);
  }

  function exportPng() {
    if (!tilesetImg) return;
    const c = document.createElement('canvas');
    c.width = mapCols * tileSize;
    c.height = mapRows * tileSize;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    for (let r = 0; r < mapRows; r++) {
      for (let col = 0; col < mapCols; col++) {
        const idx = map[r]?.[col] ?? -1;
        if (idx < 0) continue;
        const sc = idx % paletteCols;
        const sr = Math.floor(idx / paletteCols);
        ctx.drawImage(tilesetImg, sc * tileSize, sr * tileSize, tileSize, tileSize, col * tileSize, r * tileSize, tileSize, tileSize);
      }
    }
    c.toBlob((blob) => {
      const url = URL.createObjectURL(blob!);
      const a = document.createElement('a');
      a.href = url; a.download = 'tilemap.png'; a.click();
      URL.revokeObjectURL(url);
    });
    track('export', { tool: 'tilemap-editor', type: 'png' });
  }

  function exportJson() {
    const data = { tileSize, cols: mapCols, rows: mapRows, tiles: map };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
    a.download = 'tilemap.json';
    a.click();
    track('export', { tool: 'tilemap-editor', type: 'json' });
  }

  async function copyJson() {
    const data = { tileSize, cols: mapCols, rows: mapRows, tiles: map };
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
  }
</script>

<svelte:head>
  <title>Tilemap Editor — paint tile maps from a tileset, export JSON | Station255</title>
  <meta
    name="description"
    content="Upload a tileset image, paint a tile map by clicking, and export a composited PNG plus a JSON tile-index map. A free Tiled-lite tilemap editor that runs entirely in your browser."
  />
</svelte:head>

<h1>Tilemap Editor</h1>
<p class="lead">Upload a tileset. Paint a map. Export the PNG and the JSON.</p>

{#if !tilesetImg}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="drop" role="button" tabindex="0" ondragover={(e) => e.preventDefault()} ondrop={onDrop}>
    <label class="btn">
      Choose tileset image
      <input type="file" accept="image/*" onchange={onInput} hidden />
    </label>
    <span class="hint">A grid-aligned tileset PNG — set tile size below once loaded</span>
  </div>
{:else}
  <div class="controls panel">
    <label class="ctrl-row">
      <span>Tile size (px)</span>
      <input type="number" min="1" max="256" bind:value={tileSize} onchange={onTileSizeChange} class="num-input" />
    </label>
    <label class="ctrl-row">
      <span>Map cols</span>
      <input type="number" min="1" max={MAX_MAP} bind:value={mapCols} onchange={onMapSizeChange} class="num-input" />
    </label>
    <label class="ctrl-row">
      <span>Map rows</span>
      <input type="number" min="1" max={MAX_MAP} bind:value={mapRows} onchange={onMapSizeChange} class="num-input" />
    </label>
    <span class="tile-count">{tileCount} tiles in tileset</span>
    <label class="btn secondary">
      New tileset
      <input type="file" accept="image/*" onchange={onInput} hidden />
    </label>
  </div>

  <div class="editor-grid">
    <div class="palette-col">
      <p class="section-label">▶ TILES — click to select</p>
      <div class="palette-scroll">
        <canvas
          bind:this={paletteCanvas}
          class="palette-canvas"
          onclick={paletteClick}
        ></canvas>
      </div>
      <div class="tool-buttons">
        <button class="btn" class:active={tool === 'paint'} onclick={() => (tool = 'paint')}>🖌 Paint</button>
        <button class="btn" class:active={tool === 'erase'} onclick={() => (tool = 'erase')}>🧽 Erase</button>
      </div>
      <p class="hint small">Left-click/drag to paint. Right-click to erase.</p>
    </div>

    <div class="map-col">
      <p class="section-label">▶ MAP</p>
      <canvas
        bind:this={mapCanvas}
        class="map-canvas"
        onmousedown={onMapMouseDown}
        onmousemove={onMapMouseMove}
        onmouseup={stopPainting}
        onmouseleave={stopPainting}
        oncontextmenu={onMapContextMenu}
      ></canvas>
    </div>
  </div>

  <div class="actions">
    <button class="btn" onclick={exportPng}>⬇ Download map.png</button>
    <button class="btn secondary" onclick={exportJson}>⬇ Download map.json</button>
    <button class="btn secondary" onclick={copyJson}>Copy JSON</button>
  </div>
{/if}

<section class="seo panel">
  <h2>About Tilemap Editor</h2>
  <p>
    A lightweight "Tiled-lite" tile map editor. Upload any grid-aligned tileset image, set the
    tile size, and click tiles from the palette to paint them onto the map grid. Export a
    pixel-perfect composited PNG of the finished map, or a JSON file describing the tile-index
    grid for use in your own game code.
  </p>
  <h3>JSON format</h3>
  <p>
    <code>{'{ tileSize, cols, rows, tiles: number[][] }'}</code> — <code>tiles</code> is a 2D array
    of tile indices into your tileset (row-major, left-to-right within the tileset), with
    <code>-1</code> marking an empty cell.
  </p>
  <h3>FAQ</h3>
  <h3>Can I pan around a huge map?</h3>
  <p>Not in v1 — maps are capped at 64×64 tiles and shrink to fit on screen. For huge maps, export the JSON and continue in a full editor like <a href="https://www.mapeditor.org/" target="_blank" rel="noopener noreferrer">Tiled</a>.</p>
  <div class="see-also">
    <span class="see-label">Related:</span>
    <a href="/sprite-slicer">Sprite Slicer</a>
    <a href="/pattern-tile">Pattern Tile</a>
    <a href="/sprite-packer">Sprite Packer</a>
  </div>
</section>

<style>
  .lead { color: var(--muted); font-size: 1.2rem; margin: 0 0 1rem; }
  .drop { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; border: 2px dashed var(--line); padding: 1.25rem; margin-bottom: 1.25rem; }
  .hint { color: var(--muted); }
  .hint.small { font-size: 0.8rem; margin: 0.4rem 0 0; }

  .controls { padding: 1rem; margin-bottom: 1rem; display: flex; align-items: center; gap: 1.25rem; flex-wrap: wrap; }
  .ctrl-row { display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; color: var(--muted); }
  .num-input { width: 70px; background: var(--bg-2); border: 1px solid var(--line); color: var(--ink); padding: 0.3rem 0.5rem; font-family: inherit; font-size: 0.9rem; }
  .tile-count { font-size: 0.9rem; color: var(--muted); }

  .editor-grid { display: flex; gap: 1.5rem; flex-wrap: wrap; margin-bottom: 1rem; }
  .palette-col { display: flex; flex-direction: column; gap: 0.5rem; }
  .palette-scroll { max-width: 320px; max-height: 320px; overflow: auto; border: 2px solid var(--line); }
  .palette-canvas { display: block; image-rendering: pixelated; cursor: crosshair; }
  .tool-buttons { display: flex; gap: 0.5rem; }
  .tool-buttons .btn { font-size: 0.7rem; opacity: 0.6; }
  .tool-buttons .btn.active { opacity: 1; }

  .map-col { display: flex; flex-direction: column; gap: 0.5rem; }
  .map-canvas {
    display: block; image-rendering: pixelated; cursor: crosshair;
    border: 3px solid var(--line); box-shadow: 6px 6px 0 #000; max-width: 100%;
  }

  .section-label { font-family: var(--display); font-size: 0.5rem; color: var(--muted); margin: 0; }
  .actions { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 1.5rem; }
</style>
