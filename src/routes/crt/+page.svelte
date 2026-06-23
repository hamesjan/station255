<script lang="ts">
  import { track } from '$lib/analytics';

  interface Opts {
    scanlines: number;  // 0–1
    chroma: number;     // 0–8 px shift
    phosphor: number;   // 0–1
    vignette: number;   // 0–1
  }

  let scanlines = $state(0.35);
  let chroma = $state(2);
  let phosphor = $state(0.25);
  let vignette = $state(0.5);

  let imgUrl = $state<string | null>(null);
  let outputUrl = $state<string | null>(null);
  let fileName = $state('');
  let processing = $state(false);
  let lastImage: HTMLImageElement | null = null;
  let prevOutputUrl: string | null = null;

  function applyCRT(img: HTMLImageElement, opts: Opts) {
    const W = img.width;
    const H = img.height;

    // Step 1: chromatic aberration — shift R right, B left
    const src = document.createElement('canvas');
    src.width = W; src.height = H;
    const sc = src.getContext('2d', { willReadFrequently: true })!;

    if (opts.chroma > 0) {
      sc.drawImage(img, 0, 0);
      const raw = sc.getImageData(0, 0, W, H);
      const shifted = sc.createImageData(W, H);
      const shift = Math.round(opts.chroma);
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4;
          const ri = (y * W + Math.min(W - 1, x + shift)) * 4;
          const bi = (y * W + Math.max(0, x - shift)) * 4;
          shifted.data[i] = raw.data[ri];         // R shifted right
          shifted.data[i + 1] = raw.data[i + 1];  // G unchanged
          shifted.data[i + 2] = raw.data[bi + 2]; // B shifted left
          shifted.data[i + 3] = 255;
        }
      }
      sc.putImageData(shifted, 0, 0);
    } else {
      sc.drawImage(img, 0, 0);
    }

    // Step 2: composite CRT overlays onto output canvas
    const out = document.createElement('canvas');
    out.width = W; out.height = H;
    const ctx = out.getContext('2d')!;
    ctx.drawImage(src, 0, 0);

    // Scanlines
    if (opts.scanlines > 0) {
      ctx.fillStyle = `rgba(0,0,0,${opts.scanlines.toFixed(3)})`;
      for (let y = 0; y < H; y += 2) {
        ctx.fillRect(0, y, W, 1);
      }
    }

    // Phosphor RGB sub-pixel columns
    if (opts.phosphor > 0) {
      const a = (opts.phosphor * 0.22).toFixed(3);
      const ag = (opts.phosphor * 0.1).toFixed(3);
      for (let x = 0; x < W; x += 3) {
        ctx.fillStyle = `rgba(255,0,0,${a})`;
        ctx.fillRect(x, 0, 1, H);
        ctx.fillStyle = `rgba(0,255,0,${ag})`;
        ctx.fillRect(x + 1, 0, 1, H);
        ctx.fillStyle = `rgba(0,0,255,${a})`;
        ctx.fillRect(x + 2, 0, 1, H);
      }
    }

    // Vignette — dark radial gradient at edges
    if (opts.vignette > 0) {
      const cx = W / 2, cy = H / 2;
      const g = ctx.createRadialGradient(cx, cy, Math.min(W, H) * 0.2, cx, cy, Math.max(W, H) * 0.85);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, `rgba(0,0,0,${opts.vignette.toFixed(3)})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }

    out.toBlob((blob) => {
      if (prevOutputUrl) URL.revokeObjectURL(prevOutputUrl);
      const url = URL.createObjectURL(blob!);
      prevOutputUrl = url;
      outputUrl = url;
      processing = false;
    });
  }

  function loadFile(file: File) {
    fileName = file.name;
    const url = URL.createObjectURL(file);
    if (imgUrl) URL.revokeObjectURL(imgUrl);
    imgUrl = url;
    const img = new Image();
    img.onload = () => {
      lastImage = img;
      processing = true;
      applyCRT(img, { scanlines, chroma, phosphor, vignette });
      track('tool_use', { tool: 'crt-ify' });
    };
    img.src = url;
  }

  function onInput(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) loadFile(file);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file?.type.startsWith('image/')) loadFile(file);
  }

  $effect(() => {
    void scanlines; void chroma; void phosphor; void vignette;
    if (lastImage) {
      processing = true;
      applyCRT(lastImage, { scanlines, chroma, phosphor, vignette });
    }
  });

  function download() {
    if (!outputUrl) return;
    const a = document.createElement('a');
    a.href = outputUrl;
    a.download = (fileName.replace(/\.[^.]+$/, '') || 'image') + '-crt.png';
    a.click();
    track('export', { tool: 'crt-ify' });
  }
</script>

<svelte:head>
  <title>CRT-ify — add scanlines &amp; CRT effect to any image, free | Station255</title>
  <meta
    name="description"
    content="Free online CRT effect generator. Add authentic scanlines, chromatic aberration, RGB phosphor glow, and vignette to any image or screenshot. 4 adjustable sliders. No upload, runs in your browser."
  />
</svelte:head>

<nav class="crumbs"><a href="/">← arcade</a></nav>

<h1>CRT-ify</h1>
<p class="lead">Give any image the authentic CRT monitor treatment — scanlines, RGB phosphor, chromatic aberration, vignette. All in your browser.</p>

<div
  class="drop"
  role="button"
  tabindex="0"
  ondragover={(e) => e.preventDefault()}
  ondrop={onDrop}
>
  <label class="btn">
    Choose image
    <input type="file" accept="image/*" onchange={onInput} hidden />
  </label>
  <span class="hint">…or drag &amp; drop a PNG / JPG here</span>
</div>

<div class="controls">
  <label class="ctrl">
    <span>Scanlines <strong>{Math.round(scanlines * 100)}%</strong></span>
    <input type="range" min="0" max="1" step="0.01" bind:value={scanlines} />
  </label>
  <label class="ctrl">
    <span>Chroma shift <strong>{chroma}px</strong></span>
    <input type="range" min="0" max="10" step="1" bind:value={chroma} />
  </label>
  <label class="ctrl">
    <span>Phosphor <strong>{Math.round(phosphor * 100)}%</strong></span>
    <input type="range" min="0" max="1" step="0.01" bind:value={phosphor} />
  </label>
  <label class="ctrl">
    <span>Vignette <strong>{Math.round(vignette * 100)}%</strong></span>
    <input type="range" min="0" max="1" step="0.01" bind:value={vignette} />
  </label>
  {#if outputUrl}
    <button class="btn" onclick={download}>Download PNG</button>
  {/if}
</div>

{#if processing}
  <p class="status">Rendering…</p>
{/if}

{#if imgUrl && outputUrl && !processing}
  <div class="compare">
    <figure>
      <figcaption>Original</figcaption>
      <img src={imgUrl} alt="original" class="preview" />
    </figure>
    <figure>
      <figcaption>CRT</figcaption>
      <img src={outputUrl} alt="CRT effect applied" class="preview" />
    </figure>
  </div>
{/if}

<section class="seo panel">
  <h2>About CRT-ify</h2>
  <p>
    CRT-ify applies four composited effects that reproduce the visual character of cathode-ray tube
    monitors — the screens that defined gaming aesthetics from the 1970s through the late 1990s.
    The effects are applied entirely in your browser with HTML5 Canvas: no upload, no server, no account needed.
  </p>
  <p>
    Works best on pixel-art screenshots, retro game captures, and low-resolution images where the
    scanlines and phosphor grid are large enough to read. Try it after the <a href="/demake">Demake tool</a>
    for a complete retro pipeline: photo → pixelized → CRT-treated.
  </p>
  <h3>Effects explained</h3>
  <p><strong>Scanlines</strong> — alternating dark horizontal lines every 2 pixels, mimicking the electron-beam raster structure of a CRT display. Real CRTs had a visible gap between each scan line at typical viewing distances.</p>
  <p><strong>Chromatic aberration</strong> — shifts the red channel right and the blue channel left by a set number of pixels, simulating the color fringing caused by lens dispersion and aperture-grille shadow masks (as seen on Trinitron-style monitors).</p>
  <p><strong>Phosphor mask</strong> — overlays a repeating pattern of transparent RGB columns every 3 pixels, evoking the phosphor dot or slot-mask sub-pixel layout of real CRT panels.</p>
  <p><strong>Vignette</strong> — a radial gradient that darkens image edges, replicating the natural brightness falloff of curved CRT glass and electron-gun geometry.</p>
  <h3>Use cases</h3>
  <p><strong>Retro game screenshots</strong> — make modern emulator captures look like they were photographed on real hardware.</p>
  <p><strong>Streaming &amp; video thumbnails</strong> — add instant retro-gaming atmosphere to any image.</p>
  <p><strong>Social media</strong> — CRT-treated before/after comparisons get shared heavily in gaming and nostalgia communities.</p>
  <p><strong>Fan art &amp; cover art</strong> — add authenticity to pixel art by layering in the screen hardware that would have displayed it.</p>
  <h3>FAQ</h3>
  <p><strong>Is my image uploaded anywhere?</strong> No. Canvas operations are 100% local in your browser.</p>
  <p><strong>Why does chromatic aberration look subtle on small images?</strong> The channel shift is measured in absolute pixels, so it's more visible on larger images. For a small sprite, try a 2–4px shift; for a full screenshot, 4–8px.</p>
  <p><strong>What export format?</strong> PNG, lossless, at the original image resolution.</p>
  <p><strong>Can I use this on a video?</strong> Not directly — this tool processes still images. For video, you'd need a video editor with a CRT shader (e.g. RetroArch or OBS shaders).</p>
  <p><strong>What settings look most realistic?</strong> Scanlines 30–40%, chroma 2–4px, phosphor 20–30%, vignette 40–60%. Heavy scanlines (70%+) look more stylized than realistic.</p>
  <div class="see-also">
    <span class="see-label">Related tools:</span>
    <a href="/demake">Demake</a>
    <a href="/dither">Dithering Studio</a>
  </div>
</section>

<style>
  .crumbs { margin: 0.5rem 0; }
  .lead { color: var(--muted); font-size: 1.2rem; max-width: 52ch; }
  .drop {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
    border: 2px dashed var(--line);
    padding: 1.25rem;
    margin: 1rem 0;
  }
  .hint { color: var(--muted); }
  .controls {
    display: flex;
    align-items: flex-end;
    gap: 1.5rem;
    flex-wrap: wrap;
    margin-bottom: 1rem;
  }
  .ctrl {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 1rem;
    min-width: 150px;
  }
  .status { color: var(--accent-3); animation: blink 1s steps(2) infinite; }
  @keyframes blink { 50% { opacity: 0.4; } }
  .compare {
    display: flex;
    gap: 1.5rem;
    flex-wrap: wrap;
    align-items: flex-start;
    margin: 1rem 0;
  }
  figure { margin: 0; display: flex; flex-direction: column; gap: 0.4rem; }
  figcaption { font-size: 1rem; color: var(--muted); }
  .preview {
    max-width: 420px;
    max-height: 420px;
    border: 2px solid var(--line);
    display: block;
  }
</style>
