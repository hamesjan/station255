<script lang="ts">
  import { extractPalette, toHex, luminance, type RGB } from '$lib/palette';
  import { track } from '$lib/analytics';

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
    track('tool_use', { tool: 'palette-extractor', colors: count });
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
    track('export', { tool: 'palette-extractor', type: 'copy_all' });
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
  <title>Palette Extractor — pull colors from any image, free | Station255</title>
  <meta
    name="description"
    content="Free online color palette extractor. Upload any photo or sprite and instantly get 2–32 dominant hex colors. One-click copy, Aseprite-compatible .hex download. No upload, runs in your browser."
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
  <h2>About the Palette Extractor</h2>
  <p>
    This tool uses <strong>median-cut color quantization</strong> — the same algorithm used by
    classic image editors — to divide the color space of your image into buckets and pick the most
    representative color from each. The result is a compact, balanced palette that captures the
    visual identity of your image: useful for fan art, game assets, mood boards, or matching
    a brand's photo palette in CSS.
  </p>
  <p>
    Click any swatch to copy its hex code to clipboard. Use <strong>Copy all hex</strong> to grab
    every color at once as newline-separated hex values, or download a <code>.hex</code> file that
    Aseprite, Photoshop, and most pixel-art editors can import directly.
  </p>
  <h3>Use cases</h3>
  <p><strong>Pixel-art sprites</strong> — extract the palette from a reference image, then use it in Aseprite or Libresprite to keep your art on-brand.</p>
  <p><strong>Web &amp; UI design</strong> — pull dominant colors from a photo and use them as CSS variables or a design-token palette.</p>
  <p><strong>Game dev</strong> — get a palette from concept art and feed it into the <a href="/demake">Demake tool</a> to pixelise photos in the same colors.</p>
  <p><strong>Retro palettes</strong> — load a screenshot from an old console game and extract its exact color palette for recreation or study.</p>
  <h3>FAQ</h3>
  <p><strong>Is my image uploaded anywhere?</strong> No. All processing happens locally in your browser using the HTML5 Canvas API. Nothing leaves your device.</p>
  <p><strong>What image formats work?</strong> Anything your browser can decode — PNG, JPG, WebP, GIF, AVIF. The file picker accepts <code>image/*</code>.</p>
  <p><strong>How many colors can I extract?</strong> Between 2 and 32. Drag the slider and the palette re-extracts instantly. For most artwork, 8–16 colors gives the best balance.</p>
  <p><strong>What is a .hex file?</strong> A plain text file with one hex color per line (<code>#ff2e88</code>). Aseprite, Photoshop, and GIMP can all import this format as a color palette.</p>
  <p><strong>Can I extract a palette from a GIF or animated image?</strong> The tool reads the first frame only. For animated GIFs, consider exporting a representative frame first.</p>
  <div class="see-also">
    <span class="see-label">Related tools:</span>
    <a href="/demake">Demake</a>
    <a href="/dither">Dithering Studio</a>
    <a href="/avatar">8-bit Avatar</a>
  </div>
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
  code {
    background: var(--bg-2);
    padding: 0 0.25rem;
  }
</style>
