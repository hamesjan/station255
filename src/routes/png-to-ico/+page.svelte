<script lang="ts">
  import { track } from '$lib/analytics';

  const ALL_SIZES = [16, 32, 48, 64, 128, 256];

  let imgUrl = $state<string | null>(null);
  let fileName = $state('favicon');
  let dropActive = $state(false);
  let pixelArt = $state(false);
  let selected = $state<Record<number, boolean>>({ 16: true, 32: true, 48: true, 64: false, 128: false, 256: false });
  let previews = $state<{ size: number; url: string }[]>([]);
  let busy = $state(false);
  let error = $state<string | null>(null);

  function loadFile(file: File) {
    if (!file.type.startsWith('image/')) return;
    error = null;
    fileName = file.name.replace(/\.[^.]+$/, '') || 'favicon';
    const reader = new FileReader();
    reader.onload = (e) => {
      imgUrl = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    dropActive = false;
    const f = e.dataTransfer?.files[0];
    if (f) loadFile(f);
  }
  function onFileInput(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (f) loadFile(f);
  }

  function renderSize(img: HTMLImageElement, size: number): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = !pixelArt;
    // Fit the source into a square, centered, preserving aspect ratio.
    const s = Math.min(size / img.naturalWidth, size / img.naturalHeight);
    const w = img.naturalWidth * s;
    const h = img.naturalHeight * s;
    ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
    return c;
  }

  $effect(() => {
    if (!imgUrl) {
      previews = [];
      return;
    }
    pixelArt; // reactive trigger
    const img = new Image();
    img.onload = () => {
      previews = ALL_SIZES.map((size) => ({ size, url: renderSize(img, size).toDataURL() }));
    };
    img.src = imgUrl;
  });

  async function download() {
    if (!imgUrl) return;
    const sizes = ALL_SIZES.filter((s) => selected[s]);
    if (sizes.length === 0) {
      error = 'Pick at least one size.';
      return;
    }
    error = null;
    busy = true;
    try {
      const img = new Image();
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = () => rej(new Error('load failed'));
        img.src = imgUrl!;
      });

      // Render each size as a PNG blob; a modern .ico is a container of PNGs.
      const pngs: Uint8Array[] = [];
      for (const size of sizes) {
        const canvas = renderSize(img, size);
        const blob = await new Promise<Blob>((res, rej) =>
          canvas.toBlob((b) => (b ? res(b) : rej(new Error('encode failed'))), 'image/png')
        );
        pngs.push(new Uint8Array(await blob.arrayBuffer()));
      }

      const headerSize = 6 + 16 * sizes.length;
      const total = headerSize + pngs.reduce((a, p) => a + p.length, 0);
      const ico = new Uint8Array(total);
      const view = new DataView(ico.buffer);
      view.setUint16(0, 0, true); // reserved
      view.setUint16(2, 1, true); // type: icon
      view.setUint16(4, sizes.length, true);

      let offset = headerSize;
      sizes.forEach((size, i) => {
        const entry = 6 + i * 16;
        ico[entry] = size === 256 ? 0 : size; // 0 means 256
        ico[entry + 1] = size === 256 ? 0 : size;
        ico[entry + 2] = 0; // palette colors
        ico[entry + 3] = 0; // reserved
        view.setUint16(entry + 4, 1, true); // color planes
        view.setUint16(entry + 6, 32, true); // bits per pixel
        view.setUint32(entry + 8, pngs[i].length, true);
        view.setUint32(entry + 12, offset, true);
        ico.set(pngs[i], offset);
        offset += pngs[i].length;
      });

      const url = URL.createObjectURL(new Blob([ico.buffer as ArrayBuffer], { type: 'image/x-icon' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.ico`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      track('tool_use', { tool: 'png-to-ico', sizes: sizes.join(',') });
      track('export', { tool: 'png-to-ico', type: 'ico' });
    } catch {
      error = 'Could not convert this image. Try a different PNG.';
    } finally {
      busy = false;
    }
  }
</script>

<svelte:head>
  <title>PNG to ICO Converter — Free Favicon.ico Generator | Station255</title>
  <meta
    name="description"
    content="Convert PNG to ICO online for free. Pick your sizes (16x16 to 256x256), get a proper multi-size favicon.ico in one click. No upload — your image never leaves your browser."
  />
</svelte:head>

<div class="tool-header">
  <h1 class="tool-title">PNG TO ICO</h1>
  <p class="tool-sub">Drop a PNG, get a real multi-size favicon.ico back. All sizes packed into one file.</p>
</div>

<div class="workspace">
  {#if !imgUrl}
    <label
      class="drop-zone"
      class:active={dropActive}
      ondragover={(e) => { e.preventDefault(); dropActive = true; }}
      ondragleave={() => { dropActive = false; }}
      ondrop={onDrop}
    >
      <span class="drop-main">Drop an image here</span>
      <span class="drop-sub">or click to browse · PNG works best (transparency kept)</span>
      <input type="file" accept="image/*" onchange={onFileInput} class="file-input" />
    </label>
  {:else}
    <div class="controls panel">
      <div class="ctrl-row">
        <span class="ctrl-label">Sizes</span>
        <div class="size-picks">
          {#each ALL_SIZES as size}
            <label class="size-pick" class:on={selected[size]}>
              <input type="checkbox" bind:checked={selected[size]} hidden />
              {size}
            </label>
          {/each}
        </div>
      </div>
      <label class="ctrl-row">
        <input type="checkbox" bind:checked={pixelArt} />
        <span class="ctrl-note">Pixel art mode (nearest-neighbor, keeps edges sharp)</span>
      </label>
      <div class="ctrl-actions">
        <button class="btn" onclick={download} disabled={busy}>{busy ? 'packing…' : '↓ Download .ico'}</button>
        <button class="btn secondary" onclick={() => { imgUrl = null; }}>← New image</button>
      </div>
      {#if error}<p class="error">{error}</p>{/if}
    </div>

    <div class="preview-strip">
      {#each previews as p}
        <div class="preview-cell" class:dim={!selected[p.size]}>
          <img src={p.url} alt="{p.size}px preview" style="width:{Math.min(p.size, 64)}px;height:{Math.min(p.size, 64)}px" class:crisp={pixelArt} />
          <span class="preview-size">{p.size}</span>
        </div>
      {/each}
    </div>
  {/if}
</div>

<section class="seo panel">
  <h2>About PNG to ICO</h2>
  <p>
    An <code>.ico</code> file isn't a single image — it's a container holding the same icon at
    several sizes, so browsers and Windows can pick the sharpest one for tabs, bookmarks,
    shortcuts, and taskbars. This tool renders your PNG at each size you pick and packs them all
    into one standards-compliant <code>favicon.ico</code>, entirely in your browser.
  </p>
  <h3>Which sizes do I need?</h3>
  <p>
    <strong>16, 32, and 48</strong> cover browser tabs, bookmarks, and desktop shortcuts — that's
    the default here and enough for almost every website. Add 64–256 if you also want crisp
    high-DPI and Windows tile icons.
  </p>
  <h3>Does my image get uploaded?</h3>
  <p>
    No. The conversion happens 100% client-side with the canvas API — your image never leaves
    your machine.
  </p>
  <h3>What about transparency?</h3>
  <p>PNG alpha is preserved. Each size is stored as a PNG inside the ICO, which every modern browser and Windows Vista+ supports.</p>
  <div class="see-also">
    <span class="see-label">Related:</span>
    <a href="/favicon">Favicon Maker</a>
    <a href="/pixelate">Pixelate</a>
    <a href="/emote">Emote Resizer</a>
  </div>
</section>

<style>
  .tool-header { padding: 1.25rem 0 1rem; border-bottom: 2px solid var(--line); margin-bottom: 1.5rem; }
  .tool-title { font-family: var(--display); font-size: 1.1rem; color: var(--accent-3); text-shadow: 3px 3px 0 var(--accent); margin: 0 0 0.5rem; }
  .tool-sub { color: var(--muted); font-size: 0.95rem; margin: 0; }

  .drop-zone {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 0.5rem; border: 2px dashed var(--line); padding: 3rem 1rem; cursor: pointer;
    text-align: center; transition: border-color 0.12s, background 0.12s;
  }
  .drop-zone:hover, .drop-zone.active { border-color: var(--accent-3); background: rgba(255,255,255,0.03); }
  .drop-main { font-family: var(--display); font-size: 0.6rem; color: var(--ink); }
  .drop-sub { font-size: 0.85rem; color: var(--muted); }
  .file-input { display: none; }

  .controls { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1rem; }
  .ctrl-row { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
  .ctrl-label { font-family: var(--display); font-size: 0.4rem; color: var(--accent-3); min-width: 4rem; }
  .ctrl-note { font-size: 0.85rem; color: var(--muted); }
  .ctrl-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
  .error { color: var(--accent); margin: 0; font-size: 0.85rem; }

  .size-picks { display: flex; gap: 0.4rem; flex-wrap: wrap; }
  .size-pick {
    font-family: var(--display); font-size: 0.4rem; padding: 0.5rem 0.6rem; cursor: pointer;
    border: 2px solid var(--line); color: var(--muted); user-select: none;
  }
  .size-pick.on { border-color: var(--accent-3); color: var(--accent-3); }

  .preview-strip { display: flex; gap: 1rem; flex-wrap: wrap; align-items: flex-end; }
  .preview-cell { display: flex; flex-direction: column; align-items: center; gap: 0.3rem; border: 1px solid var(--line); padding: 0.6rem; background: var(--panel); }
  .preview-cell.dim { opacity: 0.35; }
  .preview-cell img.crisp { image-rendering: pixelated; }
  .preview-size { font-size: 0.7rem; color: var(--muted); }
</style>
