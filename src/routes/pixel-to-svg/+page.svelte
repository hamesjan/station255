<script lang="ts">
  import { track } from '$lib/analytics';

  let imgUrl = $state<string | null>(null);
  let fileName = $state('sprite');
  let dropActive = $state(false);
  let pixelSize = $state(1);
  let svgText = $state<string | null>(null);
  let rectCount = $state(0);
  let dims = $state<{ w: number; h: number } | null>(null);
  let error = $state<string | null>(null);
  let copied = $state(false);

  function loadFile(file: File) {
    if (!file.type.startsWith('image/')) return;
    error = null;
    fileName = file.name.replace(/\.[^.]+$/, '') || 'sprite';
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

  function hex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
  }

  $effect(() => {
    if (!imgUrl) {
      svgText = null;
      dims = null;
      return;
    }
    const px = pixelSize;
    const img = new Image();
    img.onload = () => {
      error = null;
      // Downsample by the declared source-pixel size, sampling block centers.
      const w = Math.max(1, Math.floor(img.naturalWidth / px));
      const h = Math.max(1, Math.floor(img.naturalHeight / px));
      if (w * h > 512 * 512) {
        error = 'Image too large — over 262,144 pixels after scaling. Increase the pixel size or use a smaller image.';
        svgText = null;
        return;
      }
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, c.width, c.height).data;

      // Merge horizontal runs of identical color into single rects.
      const rects: string[] = [];
      for (let y = 0; y < h; y++) {
        let runStart = -1;
        let runKey = '';
        const flush = (endX: number) => {
          if (runStart === -1) return;
          rects.push(`<rect x="${runStart}" y="${y}" width="${endX - runStart}" height="1" ${runKey}/>`);
          runStart = -1;
        };
        for (let x = 0; x < w; x++) {
          const sx = Math.min(c.width - 1, Math.floor((x + 0.5) * px));
          const sy = Math.min(c.height - 1, Math.floor((y + 0.5) * px));
          const o = (sy * c.width + sx) * 4;
          const a = data[o + 3];
          if (a < 8) {
            flush(x);
            continue;
          }
          const key =
            `fill="${hex(data[o], data[o + 1], data[o + 2])}"` +
            (a < 255 ? ` fill-opacity="${(a / 255).toFixed(3)}"` : '');
          if (key !== runKey) {
            flush(x);
            runStart = x;
            runKey = key;
          } else if (runStart === -1) {
            runStart = x;
          }
        }
        flush(w);
      }

      rectCount = rects.length;
      dims = { w, h };
      svgText =
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges">` +
        rects.join('') +
        `</svg>`;
      track('tool_use', { tool: 'pixel-to-svg', rects: rects.length, w, h });
    };
    img.src = imgUrl;
  });

  function download() {
    if (!svgText) return;
    const url = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.svg`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    track('export', { tool: 'pixel-to-svg', type: 'svg' });
  }

  async function copy() {
    if (!svgText) return;
    await navigator.clipboard.writeText(svgText);
    copied = true;
    setTimeout(() => (copied = false), 1500);
    track('export', { tool: 'pixel-to-svg', type: 'copy' });
  }

  function fmtSize(s: string): string {
    const n = new Blob([s]).size;
    return n > 1024 ? `${(n / 1024).toFixed(1)} KB` : `${n} B`;
  }
</script>

<svelte:head>
  <title>Pixel Art to SVG Converter — Vectorize Sprites Online Free | Station255</title>
  <meta
    name="description"
    content="Convert pixel art PNG to SVG online, free. Each pixel becomes a crisp vector rect — scale your sprite infinitely with no blur. Handles upscaled pixel art and transparency. No upload."
  />
</svelte:head>

<div class="tool-header">
  <h1 class="tool-title">PIXEL ART TO SVG</h1>
  <p class="tool-sub">Turn a sprite into a vector. Every pixel becomes an SVG rect — scale it to a billboard, still crisp.</p>
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
      <span class="drop-main">Drop pixel art here</span>
      <span class="drop-sub">or click to browse · PNG with transparency supported</span>
      <input type="file" accept="image/*" onchange={onFileInput} class="file-input" />
    </label>
  {:else}
    <div class="controls panel">
      <label class="ctrl-row">
        <span class="ctrl-label">Source pixel size</span>
        <input type="range" min="1" max="32" step="1" bind:value={pixelSize} class="slider" />
        <span class="ctrl-val">{pixelSize}px</span>
      </label>
      <p class="ctrl-note">
        If your PNG is upscaled pixel art (each art-pixel drawn as an N×N block), set this to N so
        the SVG uses one rect per art-pixel. Leave at 1 for raw 1:1 sprites.
      </p>
      <div class="ctrl-actions">
        <button class="btn" onclick={download} disabled={!svgText}>↓ Download SVG</button>
        <button class="btn" onclick={copy} disabled={!svgText}>{copied ? 'copied!' : '⧉ Copy SVG code'}</button>
        <button class="btn secondary" onclick={() => { imgUrl = null; }}>← New image</button>
      </div>
      {#if error}<p class="error">{error}</p>{/if}
    </div>

    {#if svgText && dims}
      <p class="section-label">
        {dims.w}×{dims.h} art pixels → {rectCount} rects · {fmtSize(svgText)}
      </p>
      <div class="preview-row">
        <div class="preview-box">
          <span class="preview-label">Original (raster)</span>
          <img src={imgUrl} alt="Original upload" class="preview-img" style="image-rendering:pixelated" />
        </div>
        <div class="preview-box">
          <span class="preview-label">SVG (vector)</span>
          <div class="svg-holder">{@html svgText}</div>
        </div>
      </div>
    {/if}
  {/if}
</div>

<section class="seo panel">
  <h2>About Pixel Art to SVG</h2>
  <p>
    Raster pixel art blurs or aliases when scaled by browsers, cutting machines, and print
    pipelines. Converting it to SVG makes it resolution-independent: this tool reads each pixel
    and emits vector rectangles (merging same-color horizontal runs to keep the file small), with
    <code>shape-rendering="crispEdges"</code> so edges stay razor sharp at any size.
  </p>
  <h3>What is it good for?</h3>
  <p>
    Website logos and icons that must stay crisp on any display, laser cutters and vinyl/Cricut
    workflows that want vectors, print-ready sprite art, and embedding sprites directly in HTML
    or CSS as inline SVG.
  </p>
  <h3>Does transparency work?</h3>
  <p>
    Yes — fully transparent pixels are skipped entirely (no rect at all), and semi-transparent
    pixels keep their alpha via <code>fill-opacity</code>.
  </p>
  <div class="see-also">
    <span class="see-label">Related:</span>
    <a href="/upscale">Pixel Upscaler</a>
    <a href="/css-pixels">CSS Pixel Art</a>
    <a href="/sprite-painter">Sprite Painter</a>
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

  .controls { display: flex; flex-direction: column; gap: 0.6rem; margin-bottom: 1rem; }
  .ctrl-row { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
  .ctrl-label { font-family: var(--display); font-size: 0.4rem; color: var(--accent-3); min-width: 6rem; }
  .ctrl-val { font-family: var(--display); font-size: 0.4rem; color: var(--ink); min-width: 3rem; }
  .ctrl-note { font-size: 0.82rem; color: var(--muted); margin: 0; line-height: 1.5; }
  .slider { flex: 1; min-width: 140px; accent-color: var(--accent-3); }
  .ctrl-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
  .error { color: var(--accent); margin: 0; font-size: 0.85rem; }

  .section-label { font-family: var(--display); font-size: 0.4rem; color: var(--muted); margin: 0 0 0.5rem; }
  .preview-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .preview-box { display: flex; flex-direction: column; gap: 0.4rem; min-width: 0; }
  .preview-label { font-family: var(--display); font-size: 0.35rem; color: var(--muted); }
  .preview-img { width: 100%; height: auto; display: block; border: 2px solid var(--line); }
  .svg-holder { border: 2px solid var(--line); }
  .svg-holder :global(svg) { width: 100%; height: auto; display: block; }

  @media (max-width: 580px) {
    .preview-row { grid-template-columns: 1fr; }
  }
</style>
