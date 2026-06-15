<script lang="ts">
  import { extractPalette, toHex, luminance, type RGB } from '$lib/palette';

  let count = $state(8);
  let palette = $state<RGB[]>([]);
  let imgUrl = $state<string | null>(null);
  let fileName = $state('');
  let copied = $state<string | null>(null);
  let lastImage: HTMLImageElement | null = null;

  function run(img: HTMLImageElement) {
    // Downscale onto a working canvas for fast, consistent sampling.
    const max = 400;
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, w, h);
    palette = extractPalette(ctx.getImageData(0, 0, w, h), count);
  }

  function loadFile(file: File) {
    fileName = file.name;
    const url = URL.createObjectURL(file);
    if (imgUrl) URL.revokeObjectURL(imgUrl);
    imgUrl = url;
    const img = new Image();
    img.onload = () => {
      lastImage = img;
      run(img);
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
    if (file && file.type.startsWith('image/')) loadFile(file);
  }

  // Re-run when the color count changes and we already have an image.
  $effect(() => {
    count;
    if (lastImage) run(lastImage);
  });

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      copied = text;
      setTimeout(() => (copied = null), 1200);
    } catch {
      /* clipboard blocked — ignore */
    }
  }

  function copyAll() {
    copy(palette.map(toHex).join('\n'));
  }

  function downloadHex() {
    const blob = new Blob([palette.map(toHex).join('\n')], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (fileName.replace(/\.[^.]+$/, '') || 'palette') + '.hex';
    a.click();
    URL.revokeObjectURL(a.href);
  }
</script>

<svelte:head>
  <title>Palette Extractor — pull a color palette from any image | Station255</title>
  <meta
    name="description"
    content="Free online palette extractor. Upload any image and instantly get its dominant colors as hex swatches you can copy or download. Runs entirely in your browser — no upload, no sign-up."
  />
</svelte:head>

<nav class="crumbs"><a href="/">← arcade</a></nav>

<h1>Palette Extractor</h1>
<p class="lead">Upload an image and pull out its dominant colors. Everything runs in your browser — your image never leaves your device.</p>

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
  <label>
    Colors: <strong>{count}</strong>
    <input type="range" min="2" max="32" bind:value={count} />
  </label>
  {#if palette.length}
    <button class="btn secondary" onclick={copyAll}>Copy all hex</button>
    <button class="btn secondary" onclick={downloadHex}>Download .hex</button>
  {/if}
</div>

{#if imgUrl}
  <div class="result">
    <img class="preview" src={imgUrl} alt="uploaded preview" />
    <div class="swatches">
      {#each palette as c}
        {@const hex = toHex(c)}
        <button
          class="swatch"
          style="background:{hex}; color:{luminance(c) > 140 ? '#000' : '#fff'}"
          onclick={() => copy(hex)}
          title="Click to copy {hex}"
        >
          {copied === hex ? 'copied!' : hex}
        </button>
      {/each}
    </div>
  </div>
{/if}

<section class="seo panel">
  <h2>About this tool</h2>
  <p>
    This palette extractor uses <strong>median-cut color quantization</strong> to find the most
    representative colors in your image and shows them as hex codes. Click any swatch to copy it,
    grab them all at once, or download a <code>.hex</code> list you can import into Aseprite,
    Photoshop, or other pixel-art editors.
  </p>
  <h3>FAQ</h3>
  <p><strong>Is my image uploaded anywhere?</strong> No. All processing happens locally in your browser.</p>
  <p><strong>What formats work?</strong> Anything your browser can open — PNG, JPG, WebP, GIF.</p>
  <p><strong>How many colors can I extract?</strong> Between 2 and 32. Drag the slider to re-extract.</p>
</section>

<style>
  .crumbs {
    margin: 0.5rem 0 0.5rem;
  }
  .lead {
    color: var(--muted);
    font-size: 1.2rem;
    max-width: 50ch;
  }
  .drop {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
    border: 2px dashed var(--line);
    padding: 1.25rem;
    margin: 1rem 0;
  }
  .hint {
    color: var(--muted);
  }
  .controls {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
    margin-bottom: 1rem;
  }
  .controls input[type='range'] {
    vertical-align: middle;
  }
  .result {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    align-items: flex-start;
  }
  .preview {
    max-width: 320px;
    max-height: 320px;
    border: 2px solid var(--line);
    image-rendering: auto;
  }
  .swatches {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    align-content: flex-start;
    flex: 1;
    min-width: 220px;
  }
  .swatch {
    width: 92px;
    height: 56px;
    border: 2px solid #000;
    cursor: pointer;
    font-family: var(--pixel);
    font-size: 1rem;
  }
  .seo {
    margin-top: 2.5rem;
  }
  .seo h2 {
    font-size: 0.9rem;
    margin-top: 0;
  }
  .seo h3 {
    font-size: 0.8rem;
  }
  code {
    background: var(--bg-2);
    padding: 0 0.25rem;
  }
</style>
