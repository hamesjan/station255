<script lang="ts">
  import { track } from '$lib/analytics';

  let imgUrl    = $state<string | null>(null);
  let outputUrl = $state<string | null>(null);
  let fileName   = $state('');
  let processing = $state(false);
  let lastImage: HTMLImageElement | null = null;
  let prevUrl: string | null = null;

  let thickness  = $state(4);
  let outlineColor = $state('#ffffff');
  let scale      = $state(1);

  function hexToRgb(h: string): [number, number, number] {
    const n = parseInt(h.replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function addOutline(img: HTMLImageElement): Promise<HTMLCanvasElement> {
    return new Promise((resolve) => {
      const pad = thickness;
      const sc = scale;
      const W = img.width * sc + pad * 2;
      const H = img.height * sc + pad * 2;

      // Scale original image first
      const scaledCanvas = document.createElement('canvas');
      scaledCanvas.width = img.width * sc; scaledCanvas.height = img.height * sc;
      const sctx = scaledCanvas.getContext('2d')!;
      if (sc > 1) sctx.imageSmoothingEnabled = false;
      sctx.drawImage(img, 0, 0, img.width * sc, img.height * sc);

      // Create mask: all non-transparent pixels become opaque white
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = img.width * sc; maskCanvas.height = img.height * sc;
      const mctx = maskCanvas.getContext('2d', { willReadFrequently: true })!;
      mctx.drawImage(scaledCanvas, 0, 0);
      const mid = mctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
      for (let i = 0; i < mid.data.length; i += 4) {
        if (mid.data[i+3] > 32) {
          mid.data[i] = 255; mid.data[i+1] = 255; mid.data[i+2] = 255; mid.data[i+3] = 255;
        } else { mid.data[i+3] = 0; }
      }
      mctx.putImageData(mid, 0, 0);

      // Draw mask in a disk of offsets to expand outline
      const out = document.createElement('canvas');
      out.width = W; out.height = H;
      const octx = out.getContext('2d', { willReadFrequently: true })!;
      for (let dx = -pad; dx <= pad; dx++) {
        for (let dy = -pad; dy <= pad; dy++) {
          if (dx * dx + dy * dy <= pad * pad) {
            octx.drawImage(maskCanvas, dx + pad, dy + pad);
          }
        }
      }

      // Recolor expanded area to outline color
      const oid = octx.getImageData(0, 0, W, H);
      const [r, g, b] = hexToRgb(outlineColor);
      for (let i = 0; i < oid.data.length; i += 4) {
        if (oid.data[i+3] > 0) {
          oid.data[i] = r; oid.data[i+1] = g; oid.data[i+2] = b; oid.data[i+3] = 255;
        }
      }
      octx.putImageData(oid, 0, 0);

      // Draw scaled original on top
      octx.drawImage(scaledCanvas, pad, pad);

      resolve(out);
    });
  }

  function handleFile(file: File) {
    fileName = file.name.replace(/\.[^.]+$/, '');
    const fr = new FileReader();
    fr.onload = (e) => {
      imgUrl = e.target!.result as string;
      const img = new Image();
      img.onload = () => { lastImage = img; process(img); };
      img.src = imgUrl;
    };
    fr.readAsDataURL(file);
  }

  async function process(img: HTMLImageElement) {
    processing = true;
    if (prevUrl) URL.revokeObjectURL(prevUrl);
    try {
      const c = await addOutline(img);
      c.toBlob((blob) => {
        outputUrl = URL.createObjectURL(blob!);
        prevUrl = outputUrl;
        processing = false;
        track('tool_use', { tool: 'sticker', thickness, scale });
      });
    } catch { processing = false; }
  }

  function reprocess() { if (lastImage) process(lastImage); }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer?.files[0];
    if (f?.type.startsWith('image/')) handleFile(f);
  }

  function onInput(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (f) handleFile(f);
  }

  function download() {
    if (!outputUrl) return;
    const a = document.createElement('a');
    a.href = outputUrl; a.download = `${fileName || 'sprite'}-sticker.png`; a.click();
    track('export', { tool: 'sticker', type: 'png' });
  }
</script>

<svelte:head>
  <title>Sprite Outline Generator — Add Pixel Border to Any Image Free | Station255</title>
  <meta name="description" content="Add a pixel-perfect outline border to any sprite or image PNG. Choose thickness and color — great for Discord stickers, game sprites, and stream overlays. Free, runs in browser." />
</svelte:head>

<h1 class="tool-title">Sticker Maker</h1>
<p class="tool-sub">Add a pixel-perfect outline to any sprite or image — great for Discord stickers and game assets. Works best with transparent PNGs.</p>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="drop-zone"
  class:has-image={!!imgUrl}
  ondragover={(e) => e.preventDefault()}
  ondrop={onDrop}
>
  {#if imgUrl}
    <img src={imgUrl} alt="Original" class="preview-img checker" />
  {:else}
    <p class="drop-hint">Drop a PNG with transparency here</p>
    <label class="btn">
      Choose Image
      <input type="file" accept="image/*" onchange={onInput} style="display:none" />
    </label>
  {/if}
</div>

{#if imgUrl}
  <div class="controls panel">
    <div class="ctrl-row">
      <label>Outline Thickness <span class="val">{thickness}px</span></label>
      <input type="range" min="1" max="12" step="1" bind:value={thickness} oninput={reprocess} />
    </div>
    <div class="ctrl-row">
      <label>Outline Color</label>
      <div class="color-row">
        <input type="color" bind:value={outlineColor} oninput={reprocess} class="color-pick" />
        <span class="color-hex">{outlineColor}</span>
        {#each ['#ffffff','#000000','#ff004d','#ffd700','#00e436','#29adff'] as c}
          <button class="preset-color" style="background:{c}" onclick={() => { outlineColor = c; reprocess(); }}></button>
        {/each}
      </div>
    </div>
    <div class="ctrl-row">
      <label>Scale</label>
      <div class="tab-row">
        {#each [1, 2, 4] as s}
          <button class="tab-btn" class:active={scale === s} onclick={() => { scale = s; reprocess(); }}>{s}×</button>
        {/each}
      </div>
    </div>
    <div class="btn-row">
      <button class="btn btn-primary" onclick={download} disabled={!outputUrl || processing}>
        {processing ? 'Processing…' : '⬇ Download PNG'}
      </button>
    </div>
  </div>
{/if}

{#if outputUrl}
  <div class="output-wrap">
    <p class="output-label">Output (transparent background shown as checker)</p>
    <img src={outputUrl} alt="Sticker output" class="output-img checker" />
  </div>
{/if}

<div class="seo">
  <h2>Free Sprite Outline Generator</h2>
  <p>
    Station255's Sticker Maker adds a smooth pixel-perfect circular outline to any image, producing
    the classic "sticker border" effect used in Discord stickers, Telegram emotes, game sprite
    outlines, and stream overlays. The algorithm expands the image's opaque region outward by the
    specified pixel thickness using a circular sampling kernel, then draws the original on top with
    a transparent background. No server involved — fully Canvas API.
  </p>
  <h3>How the outline algorithm works</h3>
  <p>
    The tool creates a binary mask of all non-transparent pixels, then draws that mask at every
    offset within a disk of radius = thickness pixels. All non-transparent pixels in the expanded
    mask are recolored to the chosen outline color. The original image is then composited on top,
    leaving a clean colored border around every sprite edge.
  </p>
  <h3>Use cases</h3>
  <p>
    Discord custom stickers (max 500KB PNG), Telegram sticker packs, Twitch overlay elements,
    pixel-art sprite outline for game UI, README badges, and social media avatar frames.
  </p>
  <h3>FAQ</h3>
  <h3>My image has no transparency — will it work?</h3>
  <p>Yes, but the outline will follow the image's rectangular boundary. For best results use a PNG where the sprite has a transparent background.</p>
  <h3>Can I make the outline thicker than 12px?</h3>
  <p>12px is the current maximum. Larger values make the outline loop slow — if needed, upscale your sprite first with Pixel Upscaler, then add the outline.</p>
</div>

<div class="see-also">
  <span>See also:</span>
  <a href="/upscale">Pixel Upscaler</a>
  <a href="/avatar">8-bit Avatar</a>
  <a href="/sprite-slicer">Sprite Slicer</a>
  <a href="/demake">Demake</a>
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
  .preview-img { max-width: 100%; max-height: 280px; display: block; }

  .checker {
    background-image: linear-gradient(45deg, #555 25%, transparent 25%),
      linear-gradient(-45deg, #555 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #555 75%),
      linear-gradient(-45deg, transparent 75%, #555 75%);
    background-size: 12px 12px;
    background-position: 0 0, 0 6px, 6px -6px, -6px 0px;
    background-color: #333;
  }

  .controls { padding: 1rem; margin-bottom: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
  .ctrl-row { display: flex; flex-direction: column; gap: 0.3rem; }
  .ctrl-row label { display: flex; justify-content: space-between; font-size: 0.9rem; color: var(--muted); }
  .val { color: var(--accent-3); font-family: var(--display); font-size: 0.55rem; }
  input[type=range] { width: 100%; accent-color: var(--accent); }

  .color-row { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
  .color-pick { width: 40px; height: 32px; border: 1px solid var(--line); padding: 2px; cursor: pointer; background: var(--bg-2); }
  .color-hex { font-family: 'Courier New', monospace; font-size: 0.85rem; color: var(--muted); }
  .preset-color { width: 24px; height: 24px; border: 1px solid var(--line); cursor: pointer; padding: 0; }
  .preset-color:hover { border-color: var(--accent-2); }

  .tab-row { display: flex; gap: 4px; }
  .tab-btn { background: var(--bg-2); border: 1px solid var(--line); color: var(--muted); padding: 0.3rem 0.7rem; cursor: pointer; }
  .tab-btn.active { border-color: var(--accent); color: var(--accent); }

  .btn-row { margin-top: 0.25rem; }
  .btn-primary { background: var(--accent); color: #000; }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

  .output-wrap { margin-top: 1.5rem; }
  .output-label { font-family: var(--display); font-size: 0.5rem; color: var(--muted); margin: 0 0 0.5rem; }
  .output-img { max-width: 100%; display: block; border: 2px solid var(--line); }
</style>
