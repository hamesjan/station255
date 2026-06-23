<script lang="ts">
  import { track } from '$lib/analytics';

  const RAMP_DENSE = ' .\'`^",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$';
  const RAMP_SIMPLE = ' .:-=+*#%@';
  const RAMP_BLOCKS = ' ░▒▓█';

  type CharSet = 'Simple' | 'Dense' | 'Blocks';
  const CHAR_SETS: CharSet[] = ['Simple', 'Dense', 'Blocks'];

  let charSet = $state<CharSet>('Simple');
  let charWidth = $state(80);
  let inverted = $state(false);
  let imgUrl = $state<string | null>(null);
  let asciiOutput = $state('');
  let processing = $state(false);
  let fileName = $state('');
  let copied = $state(false);

  const ramp = $derived(
    charSet === 'Dense' ? RAMP_DENSE : charSet === 'Blocks' ? RAMP_BLOCKS : RAMP_SIMPLE
  );

  function processAscii(img: HTMLImageElement) {
    processing = true;
    const w = img.width;
    const h = img.height;
    const charH = Math.max(1, Math.round(charWidth * (h / w) * 0.45));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0);

    const blockW = w / charWidth;
    const blockH = h / charH;
    const r = inverted ? [...ramp].reverse().join('') : ramp;
    let result = '';

    for (let row = 0; row < charH; row++) {
      for (let col = 0; col < charWidth; col++) {
        const x = Math.round(col * blockW);
        const y = Math.round(row * blockH);
        const bw = Math.max(1, Math.round(blockW));
        const bh = Math.max(1, Math.round(blockH));
        const data = ctx.getImageData(x, y, bw, bh).data;
        let brightness = 0;
        for (let i = 0; i < data.length; i += 4) {
          brightness += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        }
        brightness /= data.length / 4;
        const idx = Math.min(r.length - 1, Math.floor((brightness / 256) * r.length));
        result += r[idx];
      }
      result += '\n';
    }

    asciiOutput = result;
    processing = false;
  }

  let lastImage: HTMLImageElement | null = null;

  function loadFile(file: File) {
    fileName = file.name;
    const url = URL.createObjectURL(file);
    if (imgUrl) URL.revokeObjectURL(imgUrl);
    imgUrl = url;
    const img = new Image();
    img.onload = () => {
      lastImage = img;
      processAscii(img);
      track('tool_use', { tool: 'ascii', charWidth, charSet });
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
    void charWidth; void charSet; void inverted;
    if (lastImage) processAscii(lastImage);
  });

  async function copyOutput() {
    await navigator.clipboard.writeText(asciiOutput);
    copied = true;
    setTimeout(() => { copied = false; }, 1500);
    track('export', { tool: 'ascii', type: 'copy' });
  }

  function downloadTxt() {
    const blob = new Blob([asciiOutput], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (fileName.replace(/\.[^.]+$/, '') || 'ascii') + '.txt';
    a.click();
    track('export', { tool: 'ascii', type: 'download_txt' });
  }
</script>

<svelte:head>
  <title>ASCII Art Generator — convert image to text art | Station255</title>
  <meta
    name="description"
    content="Free online ASCII art generator. Convert any image or photo to ASCII text art. Choose character density, width, and style. Copy or download as .txt. Runs entirely in your browser."
  />
</svelte:head>

<h1>ASCII Art</h1>
<p class="lead">Turn any image into classic text art. Copy, paste, share.</p>

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
    <span>Character set</span>
    <select bind:value={charSet}>
      {#each CHAR_SETS as cs}
        <option>{cs}</option>
      {/each}
    </select>
  </label>

  <label class="ctrl">
    <span>Width: <strong>{charWidth} chars</strong></span>
    <input type="range" min="20" max="200" step="5" bind:value={charWidth} />
  </label>

  <label class="ctrl-row">
    <input type="checkbox" bind:checked={inverted} />
    <span>Invert</span>
  </label>

  {#if asciiOutput}
    <button class="btn secondary" onclick={copyOutput}>{copied ? 'Copied!' : 'Copy'}</button>
    <button class="btn" onclick={downloadTxt}>Download .txt</button>
  {/if}
</div>

{#if processing}
  <p class="status">Processing…</p>
{/if}

{#if asciiOutput && !processing}
  <div class="output-wrap">
    <pre class="ascii-out">{asciiOutput}</pre>
  </div>
{/if}

<section class="seo panel">
  <h2>About the ASCII Art generator</h2>
  <p>
    ASCII art maps each block of pixels to a text character based on visual density — dark areas
    become dense characters like <code>@</code>, <code>#</code>, or <code>█</code>; bright areas
    become spaces or periods. The result is an image made entirely of text that can be copied
    into any monospace context: code comments, README files, terminal output, Discord messages,
    or retro-aesthetic social posts.
  </p>
  <p>
    The technique dates to the 1960s, when operators sent images over teleprinters by choosing
    characters of varying ink density. It remains one of the most shareable retro-digital art
    forms — combine it with <a href="/crt">CRT-ify</a> treatment for a layered retro-screen look.
  </p>
  <h3>Character sets</h3>
  <p><strong>Simple</strong> — a 10-character ramp: <code> .:-=+*#%@</code>. Clean, readable in almost any monospace font. Good starting point for most images.</p>
  <p><strong>Dense</strong> — a 70-character ramp that covers far more density levels, producing smoother tonal gradients at the cost of a busier appearance. Best for photographs with subtle shading.</p>
  <p><strong>Blocks</strong> — uses Unicode block elements (<code>░▒▓█</code>) instead of ASCII characters. Produces bolder, graphic results and doesn't require a specific character encoding to render correctly.</p>
  <h3>Tips for best results</h3>
  <p><strong>High-contrast subjects</strong> with a clear silhouette (logos, faces, animals) convert better than busy scenes.</p>
  <p><strong>Width</strong> controls detail: 40–80 chars for bold/simple output; 120–200 chars for detailed portraits or complex scenes.</p>
  <p><strong>Invert</strong> flips the density mapping — useful for images with dark subjects on light backgrounds (line art, diagrams).</p>
  <p><strong>Monospace display</strong> — the <code>&lt;pre&gt;</code> preview uses Courier New. For pasting elsewhere, use a monospace font like JetBrains Mono, Fira Code, or the terminal default.</p>
  <h3>Use cases</h3>
  <p><strong>GitHub READMEs</strong> — ASCII art in a fenced code block is a distinctive, zero-dependency header image.</p>
  <p><strong>Terminal banners</strong> — paste into a shell profile (e.g. <code>~/.bashrc</code>) to show a logo on every new terminal session.</p>
  <p><strong>Social media</strong> — ASCII art posts stand out in text-heavy threads; especially popular on Mastodon and tech Twitter.</p>
  <p><strong>Game dev</strong> — generate placeholder art for prototype UIs or debug overlays.</p>
  <h3>FAQ</h3>
  <p><strong>Why does it look stretched?</strong> Monospace characters are roughly twice as tall as they are wide. The tool compensates with a ~0.45 aspect ratio (fewer rows than columns) to produce square-ish output.</p>
  <p><strong>Can I get colored ASCII art?</strong> Not in this tool — it outputs plain text. For colored terminal output, you'd need ANSI escape codes, which aren't supported in most paste targets.</p>
  <p><strong>Is my image uploaded?</strong> No. Everything runs locally in your browser.</p>
  <div class="see-also">
    <span class="see-label">Related tools:</span>
    <a href="/crt">CRT-ify</a>
    <a href="/pixel-text">Pixel Text</a>
    <a href="/demake">Demake</a>
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
  .ctrl { display: flex; flex-direction: column; gap: 0.25rem; font-size: 1rem; }
  .ctrl-row { display: flex; align-items: center; gap: 0.5rem; font-size: 1rem; cursor: pointer; }
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
  .output-wrap {
    overflow-x: auto;
    border: 2px solid var(--line);
    background: var(--bg-2);
    padding: 0.75rem;
    margin: 0.5rem 0;
    max-height: 60vh;
    overflow-y: auto;
  }
  .ascii-out {
    margin: 0;
    font-family: 'Courier New', Courier, monospace;
    font-size: clamp(4px, 0.8vw, 10px);
    line-height: 1.1;
    color: var(--ink);
    white-space: pre;
  }
  code { background: var(--panel); padding: 0.1rem 0.3rem; }
</style>
