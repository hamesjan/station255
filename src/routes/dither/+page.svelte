<script lang="ts">
  import { PALETTES, nearestColor } from '$lib/palettes';
  import { track } from '$lib/analytics';

  const paletteNames = Object.keys(PALETTES);

  const BAYER2 = [[0, 2], [3, 1]];
  const BAYER4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
  const BAYER8 = [
    [0, 32, 8, 40, 2, 34, 10, 42],
    [48, 16, 56, 24, 50, 18, 58, 26],
    [12, 44, 4, 36, 14, 46, 6, 38],
    [60, 28, 52, 20, 62, 30, 54, 22],
    [3, 35, 11, 43, 1, 33, 9, 41],
    [51, 19, 59, 27, 49, 17, 57, 25],
    [15, 47, 7, 39, 13, 45, 5, 37],
    [63, 31, 55, 23, 61, 29, 53, 21],
  ];

  type Algorithm = 'Bayer 2×2' | 'Bayer 4×4' | 'Bayer 8×8' | 'Floyd-Steinberg';
  const ALGORITHMS: Algorithm[] = ['Bayer 2×2', 'Bayer 4×4', 'Bayer 8×8', 'Floyd-Steinberg'];

  let algorithm = $state<Algorithm>('Floyd-Steinberg');
  let paletteName = $state('PICO-8');
  let spread = $state(1.0);
  let imgUrl = $state<string | null>(null);
  let outputUrl = $state<string | null>(null);
  let fileName = $state('');
  let processing = $state(false);
  let lastImage: HTMLImageElement | null = null;
  let prevOutputUrl: string | null = null;

  function clamp(v: number) { return Math.max(0, Math.min(255, v)); }

  function applyBayer(data: Uint8ClampedArray, w: number, h: number, matrix: number[][], n: number, palette: [number, number, number][]) {
    const max = n * n;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const t = (matrix[y % n][x % n] / max - 0.5) * 128 * spread;
        const [r, g, b] = nearestColor(clamp(data[i] + t), clamp(data[i + 1] + t), clamp(data[i + 2] + t), palette);
        data[i] = r; data[i + 1] = g; data[i + 2] = b;
      }
    }
  }

  function applyFloydSteinberg(src: Uint8ClampedArray, w: number, h: number, palette: [number, number, number][]) {
    const buf = new Float32Array(w * h * 3);
    for (let i = 0; i < w * h; i++) {
      buf[i * 3] = src[i * 4];
      buf[i * 3 + 1] = src[i * 4 + 1];
      buf[i * 3 + 2] = src[i * 4 + 2];
    }
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 3;
        const r = clamp(buf[i]), g = clamp(buf[i + 1]), b = clamp(buf[i + 2]);
        const [nr, ng, nb] = nearestColor(r, g, b, palette);
        buf[i] = nr; buf[i + 1] = ng; buf[i + 2] = nb;
        const er = r - nr, eg = g - ng, eb = b - nb;
        const push = (dx: number, dy: number, f: number) => {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || nx >= w || ny >= h) return;
          const j = (ny * w + nx) * 3;
          buf[j] += er * f; buf[j + 1] += eg * f; buf[j + 2] += eb * f;
        };
        push(1, 0, 7 / 16); push(-1, 1, 3 / 16); push(0, 1, 5 / 16); push(1, 1, 1 / 16);
      }
    }
    for (let i = 0; i < w * h; i++) {
      src[i * 4] = clamp(buf[i * 3]);
      src[i * 4 + 1] = clamp(buf[i * 3 + 1]);
      src[i * 4 + 2] = clamp(buf[i * 3 + 2]);
      src[i * 4 + 3] = 255;
    }
  }

  function process(img: HTMLImageElement) {
    processing = true;
    const palette = PALETTES[paletteName];
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0);
    const id = ctx.getImageData(0, 0, img.width, img.height);

    if (algorithm === 'Floyd-Steinberg') {
      applyFloydSteinberg(id.data, img.width, img.height, palette);
    } else {
      const [matrix, n] = algorithm === 'Bayer 2×2' ? [BAYER2, 2]
        : algorithm === 'Bayer 4×4' ? [BAYER4, 4]
        : [BAYER8, 8];
      applyBayer(id.data, img.width, img.height, matrix, n, palette);
    }

    ctx.putImageData(id, 0, 0);
    canvas.toBlob((blob) => {
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
      process(img);
      track('tool_use', { tool: 'dither', algorithm, palette: paletteName });
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
    void algorithm; void paletteName; void spread;
    if (lastImage) process(lastImage);
  });

  function download() {
    if (!outputUrl) return;
    const a = document.createElement('a');
    a.href = outputUrl;
    a.download = (fileName.replace(/\.[^.]+$/, '') || 'dither') + `-${algorithm.replace(/[^a-z0-9]/gi, '')}-${paletteName}.png`;
    a.click();
    track('export', { tool: 'dither', algorithm, palette: paletteName });
  }
</script>

<svelte:head>
  <title>Dithering Studio — Bayer & Floyd-Steinberg image dithering | Station255</title>
  <meta
    name="description"
    content="Free online image dithering tool. Apply Bayer ordered dithering or Floyd-Steinberg error diffusion to any photo. Use retro console palettes (PICO-8, NES, Game Boy). Runs in your browser."
  />
</svelte:head>

<h1>Dithering Studio</h1>
<p class="lead">Apply classic dithering algorithms to any image. Pick a retro palette. Get that authentic 8-bit look.</p>

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
    <span>Algorithm</span>
    <select bind:value={algorithm}>
      {#each ALGORITHMS as a}
        <option>{a}</option>
      {/each}
    </select>
  </label>

  <label class="ctrl">
    <span>Palette</span>
    <select bind:value={paletteName}>
      {#each paletteNames as name}
        <option>{name}</option>
      {/each}
    </select>
  </label>

  {#if algorithm !== 'Floyd-Steinberg'}
    <label class="ctrl">
      <span>Spread: <strong>{spread.toFixed(1)}</strong></span>
      <input type="range" min="0.2" max="2" step="0.1" bind:value={spread} />
    </label>
  {/if}

  {#if outputUrl}
    <button class="btn" onclick={download}>Download PNG</button>
  {/if}
</div>

{#if processing}
  <p class="status">Processing…</p>
{/if}

{#if imgUrl && outputUrl && !processing}
  <div class="compare">
    <figure>
      <figcaption>Original</figcaption>
      <img src={imgUrl} alt="original" class="preview" />
    </figure>
    <figure>
      <figcaption>{algorithm} · {paletteName}</figcaption>
      <img src={outputUrl} alt="dithered" class="preview pixelated" />
    </figure>
  </div>
{/if}

<section class="seo panel">
  <h2>About the Dithering Studio</h2>
  <p>
    <strong>Dithering</strong> is a technique that simulates more colors than a palette technically
    contains by arranging pixels in carefully calculated patterns that trick the human visual system
    into perceiving smooth gradients. It's been essential to computer graphics since the 1970s,
    appearing in everything from early Mac desktop wallpapers to NES game sprites and Game Boy
    camera photos.
  </p>
  <p>
    This studio applies two classic families of dithering algorithms to your image, combined with
    any of Station255's retro console palettes. For a related effect without dithering, try the
    <a href="/demake">Demake tool</a>, which uses direct nearest-color matching instead of error diffusion.
  </p>
  <h3>Algorithms</h3>
  <p><strong>Bayer ordered dithering (2×2, 4×4, 8×8)</strong> — uses a pre-computed threshold matrix (the Bayer matrix) to determine whether each pixel rounds up or down. The result has a geometric, cross-hatch pattern. Larger matrices produce more gradual tonal transitions. This is the algorithm used in many retro game consoles and early desktop computers for grayscale simulation.</p>
  <p><strong>Floyd-Steinberg error diffusion</strong> — processes pixels left-to-right, top-to-bottom. The quantization error at each pixel (the difference between the original color and the nearest palette color) is distributed to the four neighboring pixels (right, lower-left, below, lower-right) using coefficients 7/16, 3/16, 5/16, 1/16. The result is organic and noise-like, with excellent tonal accuracy — this is what Photoshop's "dither" export uses.</p>
  <h3>Use cases</h3>
  <p><strong>Constrained-palette pixel art</strong> — achieve smooth gradients within the hard color limits of NES, Game Boy, or PICO-8 palettes.</p>
  <p><strong>Retro game asset prep</strong> — pre-dither sprites and backgrounds before importing into a game engine that uses indexed color.</p>
  <p><strong>Artistic effect</strong> — Bayer dithering at large matrix sizes creates a distinct hatched aesthetic popular in zine art and pixel-art communities.</p>
  <p><strong>Print</strong> — convert a color image to a monochrome dithered version for inkjet or risograph printing.</p>
  <h3>FAQ</h3>
  <p><strong>Which algorithm should I use?</strong> Floyd-Steinberg for photographs and smooth gradients. Bayer for a stylized retro pattern or when you want predictable, geometric dithering.</p>
  <p><strong>What does the "spread" slider do?</strong> For Bayer algorithms, spread controls how much the threshold matrix perturbs each pixel's color before palette-matching. Lower = subtle dithering; higher = coarser, more visible pattern.</p>
  <p><strong>Is my image uploaded?</strong> No. All dithering runs locally in your browser using HTML5 Canvas and JavaScript typed arrays.</p>
  <p><strong>Can I combine dithering with upscaling?</strong> Yes — dither first, then use the <a href="/upscale">Pixel Upscaler</a> for nearest-neighbor enlargement to a crisp final size.</p>
  <div class="see-also">
    <span class="see-label">Related tools:</span>
    <a href="/demake">Demake</a>
    <a href="/palette-extractor">Palette Extractor</a>
    <a href="/upscale">Pixel Upscaler</a>
  </div>
</section>

<style>
  .lead { color: var(--muted); font-size: 1.2rem; max-width: 50ch; }
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
    align-items: center;
    gap: 1.5rem;
    flex-wrap: wrap;
    margin-bottom: 1rem;
  }
  .ctrl {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 1rem;
  }
  select {
    background: var(--bg-2);
    color: var(--ink);
    border: 2px solid var(--line);
    padding: 0.3rem 0.5rem;
    font-size: 1rem;
    cursor: pointer;
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
  .preview { max-width: 420px; max-height: 420px; border: 2px solid var(--line); display: block; }
  .pixelated { image-rendering: pixelated; }
</style>
