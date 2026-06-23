<script lang="ts">
  import { track } from '$lib/analytics';

  const SCALES = [2, 3, 4, 6, 8] as const;
  type Scale = (typeof SCALES)[number];

  let scale = $state<Scale>(4);
  let imgUrl = $state<string | null>(null);
  let outputUrl = $state<string | null>(null);
  let fileName = $state('');
  let origW = $state(0);
  let origH = $state(0);
  let prevOutputUrl: string | null = null;

  const outW = $derived(origW * scale);
  const outH = $derived(origH * scale);
  const tooBig = $derived(outW > 6000 || outH > 6000);

  function process(img: HTMLImageElement) {
    const canvas = document.createElement('canvas');
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (prevOutputUrl) URL.revokeObjectURL(prevOutputUrl);
      prevOutputUrl = URL.createObjectURL(blob!);
      outputUrl = prevOutputUrl;
    });
  }

  let lastImage: HTMLImageElement | null = null;

  function loadFile(file: File) {
    fileName = file.name;
    const url = URL.createObjectURL(file);
    if (imgUrl) URL.revokeObjectURL(imgUrl);
    imgUrl = url;
    const img = new Image();
    img.onload = () => {
      origW = img.width;
      origH = img.height;
      lastImage = img;
      process(img);
      track('tool_use', { tool: 'upscale', scale });
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
    void scale;
    if (lastImage) process(lastImage);
  });

  function download() {
    if (!outputUrl) return;
    const a = document.createElement('a');
    a.href = outputUrl;
    a.download = (fileName.replace(/\.[^.]+$/, '') || 'upscaled') + `_${scale}x.png`;
    a.click();
    track('export', { tool: 'upscale', scale });
  }
</script>

<svelte:head>
  <title>Pixel Art Upscaler — nearest-neighbor no-blur enlargement | Station255</title>
  <meta
    name="description"
    content="Free online pixel art upscaler. Enlarge sprites and pixel art 2×, 3×, 4×, 6×, or 8× using nearest-neighbor interpolation — the correct way, with no blurring. Runs in your browser."
  />
</svelte:head>

<h1>Pixel Upscaler</h1>
<p class="lead">Enlarge pixel art the correct way. Nearest-neighbor only. No blur. Ever.</p>

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
  <div class="ctrl">
    <span>Scale</span>
    <div class="scale-btns">
      {#each SCALES as s}
        <button
          class="scale-btn"
          class:active={scale === s}
          onclick={() => { scale = s; }}
        >{s}×</button>
      {/each}
    </div>
  </div>

  {#if outputUrl}
    <button class="btn" onclick={download}>Download PNG</button>
  {/if}
</div>

{#if origW > 0}
  <p class="size-info">
    {origW} × {origH} px → <strong>{outW} × {outH} px</strong>
    {#if tooBig}<span class="warn"> ⚠ large output</span>{/if}
  </p>
{/if}

{#if imgUrl && outputUrl}
  <div class="compare">
    <figure>
      <figcaption>Original ({origW}×{origH})</figcaption>
      <img src={imgUrl} alt="original" class="preview pixelated" />
    </figure>
    <figure>
      <figcaption>Upscaled {scale}× ({outW}×{outH})</figcaption>
      <img src={outputUrl} alt="upscaled" class="preview pixelated" />
    </figure>
  </div>
{/if}

<section class="seo panel">
  <h2>About the Pixel Upscaler</h2>
  <p>
    Most image scaling algorithms — bilinear, bicubic, Lanczos — sample surrounding pixels and
    blend them together. For photographs this produces smooth results. For pixel art, it produces
    blurry, anti-aliased mush that destroys the hard edges that make pixel art look like pixel art.
  </p>
  <p>
    The Pixel Upscaler uses <strong>nearest-neighbor interpolation only</strong>: each source pixel
    becomes a perfect rectangle of N×N output pixels, with no blending whatsoever. This is the
    same rendering mode used by hardware emulators (RetroArch's integer scaling), modern pixel-art
    games, and every pixel-art editor when you zoom in. It's the correct way to enlarge pixel art.
  </p>
  <p>
    Workflow tip: <a href="/demake">Demake</a> or <a href="/dither">Dithering Studio</a> a photo
    first to make it true pixel art, then upscale here to your final output resolution.
  </p>
  <h3>When to use which scale</h3>
  <p><strong>2×</strong> — doubles resolution while keeping the file manageable. Good for sprite sheets you'll process further.</p>
  <p><strong>3×</strong> — useful for 8×8 sprites that need to be 24×24, or 16×16 → 48×48.</p>
  <p><strong>4×</strong> — the most common choice for sharing. 16×16 sprites → 64×64 px; 32×32 → 128×128 px. Clearly pixel-art at any viewport size.</p>
  <p><strong>6× or 8×</strong> — print-ready exports, large display banners, conference visuals. An 8× upscale of a 64×64 tile becomes a 512×512 px image suitable for print at 72 dpi.</p>
  <h3>Use cases</h3>
  <p><strong>Sprite export</strong> — enlarge individual sprites or tile sets to a size usable in game engines, UI kits, or asset packs.</p>
  <p><strong>Profile pictures &amp; avatars</strong> — pixel-art PFPs need to be at least 200–400px to display clearly on social platforms. Upscale a 32×32 sprite 8× for a 256px PNG that stays crisp.</p>
  <p><strong>Print &amp; merch</strong> — stickers, badges, and t-shirts need pixel art at high resolution. 4× or 8× scaling gives you a file large enough for most print-on-demand services.</p>
  <p><strong>Web display</strong> — browser scaling of small pixel art images via CSS can blur due to the rendering engine. Export a pre-scaled PNG instead for guaranteed crisp display.</p>
  <h3>FAQ</h3>
  <p><strong>Why not scale2x, hqx, or xBR?</strong> Those algorithms modify pixels to smooth diagonal edges — great for emulators that want to hide pixel art's origin, but they fundamentally alter the art. Nearest-neighbor never adds or blends pixels.</p>
  <p><strong>What's the maximum output size?</strong> The tool warns if output exceeds 6000px on either dimension. Canvas operations at that size can be slow on lower-end hardware.</p>
  <p><strong>Can I use this on photographs?</strong> You can, but nearest-neighbor on photos looks jagged and blocky. It's designed for pixel art. Use a conventional image editor for photo enlargement.</p>
  <p><strong>Is my image uploaded?</strong> No. Everything runs locally in your browser.</p>
  <div class="see-also">
    <span class="see-label">Related tools:</span>
    <a href="/demake">Demake</a>
    <a href="/dither">Dithering Studio</a>
    <a href="/avatar">8-bit Avatar</a>
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
    margin-bottom: 0.75rem;
  }
  .ctrl { display: flex; flex-direction: column; gap: 0.35rem; font-size: 1rem; }
  .scale-btns { display: flex; gap: 0.4rem; }
  .scale-btn {
    background: var(--panel);
    color: var(--muted);
    border: 2px solid var(--line);
    padding: 0.3rem 0.7rem;
    font-family: var(--display);
    font-size: 0.55rem;
    cursor: pointer;
    box-shadow: 3px 3px 0 #000;
  }
  .scale-btn.active {
    background: var(--accent-3);
    color: #000;
    border-color: var(--accent-3);
  }
  .scale-btn:hover:not(.active) { border-color: var(--accent-2); color: var(--ink); }
  .size-info { color: var(--muted); font-size: 1rem; margin: 0.25rem 0 0.75rem; }
  .warn { color: var(--accent); }
  .compare {
    display: flex;
    gap: 1.5rem;
    flex-wrap: wrap;
    align-items: flex-start;
    margin: 0.5rem 0;
  }
  figure { margin: 0; display: flex; flex-direction: column; gap: 0.4rem; }
  figcaption { font-size: 1rem; color: var(--muted); }
  .preview { max-width: 360px; max-height: 360px; border: 2px solid var(--line); display: block; }
  .pixelated { image-rendering: pixelated; }
</style>
