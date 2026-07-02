<script lang="ts">
  import { track } from '$lib/analytics';
  import { packShelves, type PackResult } from '$lib/binpack';

  type Item = { name: string; url: string; img: HTMLImageElement };
  let items = $state<Item[]>([]);
  let maxWidth = $state(1024);
  let canvas: HTMLCanvasElement;
  let copied = $state(false);

  const pack = $derived.by<PackResult>(() =>
    packShelves(items.map((i) => ({ name: i.name, w: i.img.width, h: i.img.height })), maxWidth)
  );

  const jsonText = $derived.by(() =>
    JSON.stringify(
      { frames: pack.rects, atlas: { width: pack.width, height: pack.height } },
      null,
      2
    )
  );

  function uniqueName(base: string): string {
    let name = base;
    let n = 2;
    const used = new Set(items.map((i) => i.name));
    while (used.has(name)) {
      name = `${base}_${n}`;
      n++;
    }
    return name;
  }

  async function loadFiles(files: FileList) {
    const files2 = Array.from(files).filter((f) => f.type.startsWith('image/'));
    const loaded = await Promise.all(
      files2.map(
        (f) =>
          new Promise<Item>((resolve) => {
            const url = URL.createObjectURL(f);
            const img = new Image();
            img.onload = () => {
              resolve({ name: uniqueName(f.name.replace(/\.[^.]+$/, '')), url, img });
            };
            img.src = url;
          })
      )
    );
    items = [...items, ...loaded];
    track('tool_use', { tool: 'sprite-packer', images: items.length });
  }

  function onInput(e: Event) {
    const fl = (e.target as HTMLInputElement).files;
    if (fl) loadFiles(fl);
  }
  function onDrop(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer?.files) loadFiles(e.dataTransfer.files);
  }
  function removeItem(i: number) {
    URL.revokeObjectURL(items[i].url);
    items = items.filter((_, idx) => idx !== i);
  }
  function clearAll() {
    items.forEach((i) => URL.revokeObjectURL(i.url));
    items = [];
  }

  $effect(() => {
    const p = pack;
    const list = items;
    if (!canvas) return;
    canvas.width = Math.max(1, p.width);
    canvas.height = Math.max(1, p.height);
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const byName = new Map(list.map((i) => [i.name, i.img]));
    ctx.strokeStyle = 'rgba(255, 240, 80, 0.6)';
    ctx.lineWidth = 1;
    for (const r of p.rects) {
      const img = byName.get(r.name);
      if (img) ctx.drawImage(img, r.x, r.y, r.w, r.h);
      ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
    }
  });

  function downloadPng() {
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob!);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'atlas.png';
      a.click();
      URL.revokeObjectURL(url);
    });
    track('export', { tool: 'sprite-packer', type: 'png' });
  }

  function downloadJson() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([jsonText], { type: 'application/json' }));
    a.download = 'atlas.json';
    a.click();
    track('export', { tool: 'sprite-packer', type: 'json' });
  }

  async function copyJson() {
    await navigator.clipboard.writeText(jsonText);
    copied = true;
    setTimeout(() => { copied = false; }, 1200);
  }
</script>

<svelte:head>
  <title>Sprite Sheet Packer — pack images into one atlas + JSON | Station255</title>
  <meta
    name="description"
    content="Upload multiple sprite images and pack them into a single texture atlas PNG with a JSON coordinate map. Free sprite sheet packer for game dev — runs entirely in your browser."
  />
</svelte:head>

<h1>Sprite Sheet Packer</h1>
<p class="lead">Loose sprites in. One packed atlas PNG + JSON coordinate map out.</p>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="drop" role="button" tabindex="0" ondragover={(e) => e.preventDefault()} ondrop={onDrop}>
  <label class="btn">
    Add images
    <input type="file" accept="image/*" multiple onchange={onInput} hidden />
  </label>
  <span class="hint">PNG / JPG — any sizes, packed automatically · drag &amp; drop</span>
</div>

{#if items.length > 0}
  <div class="controls panel">
    <label class="ctrl-row">
      <span>Max atlas width (px)</span>
      <input type="number" min="16" max="4096" step="16" bind:value={maxWidth} class="num-input" />
    </label>
    <p class="atlas-info">
      {items.length} image{items.length === 1 ? '' : 's'} → atlas <strong>{pack.width}×{pack.height}</strong> px
    </p>
  </div>

  <canvas bind:this={canvas} class="atlas-canvas"></canvas>

  <div class="actions">
    <button class="btn" onclick={downloadPng}>⬇ Download atlas.png</button>
    <button class="btn secondary" onclick={downloadJson}>⬇ Download atlas.json</button>
    <button class="btn secondary" onclick={copyJson}>{copied ? 'Copied!' : 'Copy JSON'}</button>
  </div>

  <p class="section-label">Images</p>
  <div class="tile-grid">
    {#each items as item, i}
      <div class="tile-thumb">
        <img src={item.url} alt={item.name} class="tile-img" />
        <span class="tile-label">{item.name}</span>
        <button class="tile-remove" onclick={() => removeItem(i)} title="Remove">✕</button>
      </div>
    {/each}
  </div>
  <button class="btn secondary" onclick={clearAll}>Clear all</button>
{/if}

<section class="seo panel">
  <h2>About Sprite Sheet Packer</h2>
  <p>
    Upload any number of separate sprite images and this tool packs them into a single texture
    atlas — a shelf/row packer sorts your sprites tallest-first and fills each row left to right,
    a good balance of speed and space efficiency for game-dev-sized batches. Download the packed
    PNG plus a JSON file mapping each sprite's name to its <code>x, y, w, h</code> position in the
    atlas.
  </p>
  <h3>Why pack sprites?</h3>
  <p>
    Loading one texture atlas instead of dozens of individual image files means fewer draw calls
    and faster load times in your game engine. This is the inverse of <a href="/sprite-slicer">Sprite Slicer</a>,
    which cuts one sheet into many tiles — use that tool if you're going the other direction.
  </p>
  <h3>FAQ</h3>
  <h3>What engines can read the JSON?</h3>
  <p>The <code>{'{name, x, y, w, h}'}</code> shape is close to Phaser/PixiJS atlas formats — hand-adapt as needed for your engine's exact loader.</p>
  <div class="see-also">
    <span class="see-label">Related:</span>
    <a href="/sprite-slicer">Sprite Slicer</a>
    <a href="/sprite-animator">Sprite Animator</a>
    <a href="/gif-frames">GIF Frame Extractor</a>
  </div>
</section>

<style>
  .lead { color: var(--muted); font-size: 1.2rem; margin: 0 0 1rem; }
  .drop { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; border: 2px dashed var(--line); padding: 1.25rem; margin-bottom: 1.25rem; }
  .hint { color: var(--muted); }

  .controls { padding: 1rem; margin-bottom: 1rem; display: flex; flex-direction: column; gap: 0.65rem; }
  .ctrl-row { display: flex; align-items: center; gap: 0.75rem; font-size: 0.9rem; color: var(--muted); }
  .num-input { width: 90px; background: var(--bg-2); border: 1px solid var(--line); color: var(--ink); padding: 0.3rem 0.5rem; font-family: inherit; font-size: 0.9rem; }
  .atlas-info { font-size: 0.9rem; color: var(--muted); margin: 0; }
  .atlas-info strong { color: var(--ink); }

  .atlas-canvas {
    display: block; max-width: 100%; image-rendering: pixelated;
    border: 3px solid var(--line); box-shadow: 6px 6px 0 #000;
    margin-bottom: 1rem; background: repeating-conic-gradient(#2a2545 0% 25%, #1e1838 0% 50%) 50% / 16px 16px;
  }

  .actions { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 1.5rem; }
  .section-label { font-family: var(--display); font-size: 0.5rem; color: var(--muted); margin: 1rem 0 0.5rem; }

  .tile-grid { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 1rem; }
  .tile-thumb {
    display: flex; flex-direction: column; align-items: center; gap: 2px;
    border: 1px solid var(--line); padding: 4px; background: var(--panel); position: relative;
  }
  .tile-img { width: 48px; height: 48px; object-fit: contain; image-rendering: pixelated; }
  .tile-label { font-size: 0.7rem; color: var(--muted); max-width: 60px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .tile-remove {
    position: absolute; top: -6px; right: -6px; width: 18px; height: 18px; border-radius: 0;
    background: var(--accent); color: #fff; border: 0; cursor: pointer; font-size: 0.7rem; line-height: 1;
  }
</style>
