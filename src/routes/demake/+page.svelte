<script lang="ts">
  import { PALETTES, nearestColor } from '$lib/palettes';
  import { track } from '$lib/analytics';

  const paletteNames = Object.keys(PALETTES);

  let blockSize = $state(8);
  let paletteName = $state('PICO-8');
  let imgUrl = $state<string | null>(null);
  let outputUrl = $state<string | null>(null);
  let fileName = $state('');
  let processing = $state(false);
  let lastImage: HTMLImageElement | null = null;
  let prevOutputUrl: string | null = null;

  function process(img: HTMLImageElement) {
    processing = true;
    const palette = PALETTES[paletteName];
    const pw = Math.max(1, Math.round(img.width / blockSize));
    const ph = Math.max(1, Math.round(img.height / blockSize));

    // Downscale
    const small = document.createElement('canvas');
    small.width = pw;
    small.height = ph;
    const sc = small.getContext('2d', { willReadFrequently: true })!;
    sc.drawImage(img, 0, 0, pw, ph);

    // Quantize each pixel to nearest palette color
    const id = sc.getImageData(0, 0, pw, ph);
    for (let i = 0; i < id.data.length; i += 4) {
      const [r, g, b] = nearestColor(id.data[i], id.data[i + 1], id.data[i + 2], palette);
      id.data[i] = r; id.data[i + 1] = g; id.data[i + 2] = b;
    }
    sc.putImageData(id, 0, 0);

    // Upscale back to original size with nearest-neighbor (no smoothing)
    const out = document.createElement('canvas');
    out.width = img.width;
    out.height = img.height;
    const oc = out.getContext('2d')!;
    oc.imageSmoothingEnabled = false;
    oc.drawImage(small, 0, 0, img.width, img.height);

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
      process(img);
      track('tool_use', { tool: 'demake', palette: paletteName, blockSize });
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
    // Re-run when sliders change (reads blockSize + paletteName to track them)
    void blockSize; void paletteName;
    if (lastImage) process(lastImage);
  });

  function download() {
    if (!outputUrl) return;
    const a = document.createElement('a');
    a.href = outputUrl;
    a.download = (fileName.replace(/\.[^.]+$/, '') || 'demake') + `-${paletteName.replace(/[^a-z0-9]/gi, '')}-${blockSize}px.png`;
    a.click();
    track('export', { tool: 'demake', palette: paletteName, blockSize });
  }
</script>

<svelte:head>
  <title>Demake / Pixelizer — convert photo to pixel art online, free | Station255</title>
  <meta
    name="description"
    content="Free online pixelizer and demake tool. Upload any photo and convert it to pixel art using NES, Game Boy, PICO-8, C64, or terminal palettes. Adjustable pixel size. Runs entirely in your browser — no upload."
  />
</svelte:head>

<nav class="crumbs"><a href="/">← arcade</a></nav>

<h1>Demake</h1>
<p class="lead">Drop a photo — get pixel art. Lock it to a classic console palette. Runs entirely in your browser.</p>

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
    <span>Palette</span>
    <select bind:value={paletteName}>
      {#each paletteNames as name}
        <option>{name}</option>
      {/each}
    </select>
  </label>

  <label class="ctrl">
    <span>Pixel size: <strong>{blockSize}px</strong></span>
    <input type="range" min="2" max="24" bind:value={blockSize} />
  </label>

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
      <figcaption>{paletteName} · {blockSize}px blocks</figcaption>
      <img src={outputUrl} alt="demaked" class="preview pixelated" />
    </figure>
  </div>
{/if}

<section class="seo panel">
  <h2>About the Demake tool</h2>
  <p>
    A <strong>demake</strong> is the art of recreating something in a lower-fidelity retro style —
    as if it existed on an older console. This tool automates the visual side: it downscales your
    image to a low-resolution grid, maps every pixel to the closest color in a classic hardware
    palette using Euclidean RGB distance, then scales back up with nearest-neighbor interpolation.
    The result looks like it came off actual hardware. Everything runs in your browser; your
    image never leaves your device.
  </p>
  <p>
    Pair this with <a href="/crt">CRT-ify</a> to add scanlines and phosphor glow on top, or use
    <a href="/dither">Dithering Studio</a> for a different take on palette reduction with
    Floyd-Steinberg error diffusion.
  </p>
  <h3>Palettes</h3>
  <p><strong>PICO-8</strong> — 16 colors. The indie fantasy console palette designed by Lexaloffle. Punchy and instantly recognizable.</p>
  <p><strong>Game Boy</strong> — 4 shades of green. The original DMG-01 LCD palette. Perfect for monochrome pixel art.</p>
  <p><strong>NES</strong> — 64 colors. The full hardware palette of the Nintendo Entertainment System, as output by the 2C02 PPU.</p>
  <p><strong>C64</strong> — 16 colors. The Commodore 64's vibrant VIC-II palette. Saturated and distinctive.</p>
  <p><strong>Terminal</strong> — 12 phosphor-green shades. Evokes the monochrome CRT monitors of the 1970s and 80s.</p>
  <h3>Use cases</h3>
  <p><strong>Before/after posts</strong> — upload a modern photo and share the pixelized result. These get shared constantly on social media and retro gaming communities.</p>
  <p><strong>Game dev mockups</strong> — quickly prototype what a design or character would look like under console constraints.</p>
  <p><strong>Streaming overlays</strong> — pixelize a webcam snapshot or scene for retro-themed streams.</p>
  <p><strong>Profile pictures</strong> — convert a photo into a pixel-art avatar. Combine with <a href="/upscale">Pixel Upscaler</a> to get a crisp 512px PNG.</p>
  <h3>FAQ</h3>
  <p><strong>Is my image uploaded anywhere?</strong> No. Everything runs locally in your browser using HTML5 Canvas. Nothing is sent to a server.</p>
  <p><strong>What pixel size should I use?</strong> 4–8px for a subtle retro look; 12–24px for chunky, unmistakably arcade vibes. The slider re-processes instantly.</p>
  <p><strong>Can I use the output commercially?</strong> Yes — the processing is done locally by you. The palette colors themselves are from historical hardware.</p>
  <p><strong>What's the difference between NES and PICO-8?</strong> NES has 64 colors (the full hardware spec), while PICO-8 is a curated 16-color set designed for maximum contrast and aesthetics. PICO-8 results look more stylized; NES results look more like actual NES screenshots.</p>
  <div class="see-also">
    <span class="see-label">Related tools:</span>
    <a href="/palette-extractor">Palette Extractor</a>
    <a href="/crt">CRT-ify</a>
    <a href="/dither">Dithering Studio</a>
    <a href="/upscale">Pixel Upscaler</a>
  </div>
</section>

<style>
  .crumbs { margin: 0.5rem 0; }
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
  figure {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  figcaption { font-size: 1rem; color: var(--muted); }
  .preview {
    max-width: 420px;
    max-height: 420px;
    border: 2px solid var(--line);
    display: block;
  }
  .pixelated { image-rendering: pixelated; }
</style>
