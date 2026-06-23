<script lang="ts">
  import { track } from '$lib/analytics';

  const FONTS = ['Press Start 2P', 'VT323'] as const;
  type FontName = (typeof FONTS)[number];

  let text = $state('STATION\n255');
  let fontFamily = $state<FontName>('Press Start 2P');
  let fontSize = $state(24);
  let textColor = $state('#e7e3ff');
  let bgColor = $state('#0d0b1a');
  let transparentBg = $state(false);

  let outputUrl = $state<string | null>(null);
  let processing = $state(false);
  let prevOutputUrl: string | null = null;

  const maxSize = $derived(fontFamily === 'VT323' ? 120 : 56);

  async function render() {
    const trimmed = text;
    if (!trimmed.trim()) { outputUrl = null; return; }
    processing = true;

    try {
      await document.fonts.load(`${fontSize}px "${fontFamily}"`);

      const lines = trimmed.split('\n');
      const padding = Math.max(8, Math.round(fontSize * 0.4));
      const lineHeight = fontFamily === 'VT323' ? fontSize * 1.2 : fontSize * 1.6;

      const tmp = document.createElement('canvas');
      const tc = tmp.getContext('2d')!;
      tc.font = `${fontSize}px "${fontFamily}"`;
      const maxW = Math.max(...lines.map((l) => tc.measureText(l).width));

      const w = Math.ceil(maxW) + padding * 2;
      const h = Math.ceil(lines.length * lineHeight - (lineHeight - fontSize)) + padding * 2;

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(w, 1);
      canvas.height = Math.max(h, 1);
      const ctx = canvas.getContext('2d')!;

      if (!transparentBg) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.font = `${fontSize}px "${fontFamily}"`;
      ctx.fillStyle = textColor;
      ctx.textBaseline = 'top';
      lines.forEach((line, i) => {
        ctx.fillText(line, padding, padding + i * lineHeight);
      });

      canvas.toBlob((blob) => {
        if (!blob) { processing = false; return; }
        if (prevOutputUrl) URL.revokeObjectURL(prevOutputUrl);
        prevOutputUrl = URL.createObjectURL(blob);
        outputUrl = prevOutputUrl;
        processing = false;
      });
    } catch {
      processing = false;
    }
  }

  $effect(() => {
    void text; void fontFamily; void fontSize; void textColor; void bgColor; void transparentBg;
    if (typeof document !== 'undefined') render();
  });

  function download() {
    if (!outputUrl) return;
    const a = document.createElement('a');
    a.href = outputUrl;
    a.download = 'pixel-text.png';
    a.click();
    track('export', { tool: 'pixel-text', font: fontFamily, size: fontSize });
  }
</script>

<svelte:head>
  <title>Pixel Text Generator — arcade font PNG maker | Station255</title>
  <meta
    name="description"
    content="Free online pixel font text generator. Type any text and render it in Press Start 2P or VT323 — the classic arcade and terminal fonts. Download as transparent PNG. Runs in your browser."
  />
</svelte:head>

<h1>Pixel Text</h1>
<p class="lead">Type words. Get a pixel-font PNG. No Photoshop needed.</p>

<div class="controls">
  <label class="ctrl">
    <span>Font</span>
    <select bind:value={fontFamily}>
      {#each FONTS as f}
        <option value={f}>{f}</option>
      {/each}
    </select>
  </label>

  <label class="ctrl">
    <span>Size: <strong>{fontSize}px</strong></span>
    <input type="range" min="8" max={maxSize} step="2" bind:value={fontSize} />
  </label>

  <label class="ctrl">
    <span>Text color</span>
    <input type="color" bind:value={textColor} class="color-input" />
  </label>

  <label class="ctrl" class:dimmed={transparentBg}>
    <span>Background</span>
    <input type="color" bind:value={bgColor} class="color-input" disabled={transparentBg} />
  </label>

  <label class="ctrl-row">
    <input type="checkbox" bind:checked={transparentBg} />
    <span>Transparent background</span>
  </label>
</div>

<div class="text-area-wrap">
  <textarea
    class="text-input"
    placeholder="Type your text here…"
    bind:value={text}
    rows="3"
  ></textarea>
</div>

{#if processing}
  <p class="status">Rendering…</p>
{/if}

{#if outputUrl && !processing}
  <div class="preview-wrap">
    <img src={outputUrl} alt="pixel text preview" class="preview" class:transparent-preview={transparentBg} />
  </div>
  <button class="btn" onclick={download}>Download PNG</button>
{/if}

<section class="seo panel">
  <h2>About the Pixel Text generator</h2>
  <p>
    Pixel Text renders your words using retro arcade fonts directly on an HTML5 Canvas — entirely
    in your browser. Type any text, choose a font and size, set colors, and download a lossless
    PNG. Transparent background is supported, so you can layer the text onto other images in any
    graphics editor or paste it directly into a game engine.
  </p>
  <p>
    For pairing ideas: use a Game Boy or PICO-8 palette from the <a href="/palette-extractor">Palette Extractor</a>
    to pick colors that match a retro screenshot, or combine your text with an <a href="/avatar">8-bit Avatar</a>
    for a full pixel-art identity kit.
  </p>
  <h3>Fonts</h3>
  <p><strong>Press Start 2P</strong> — designed by CodeMan38, based on the glyph shapes from 1980s Namco arcade hardware. The character grid is 8×8 pixels with a 1-pixel border — use multiples of 8px for the crispest output. This is the font used in thousands of indie game titles, jam entries, and chiptune cover art.</p>
  <p><strong>VT323</strong> — inspired by the character ROM of the DEC VT100 terminal (1978). It's a monospace pixel font that scales cleanly to much larger sizes than Press Start 2P. Great for long banners, countdown timers, or anything that needs retro terminal energy.</p>
  <h3>Use cases</h3>
  <p><strong>Game titles &amp; logos</strong> — quickly prototype a title card without opening a graphics editor.</p>
  <p><strong>YouTube &amp; Twitch thumbnails</strong> — press Start 2P text reads instantly in a thumbnail grid.</p>
  <p><strong>README banners</strong> — pixel-font PNGs in GitHub READMEs are immediately distinctive.</p>
  <p><strong>Stream overlays</strong> — transparent-background PNGs drop straight into OBS as image sources.</p>
  <p><strong>Itch.io &amp; game jam covers</strong> — standard retro-game aesthetic, generated in seconds.</p>
  <h3>FAQ</h3>
  <p><strong>Can I use the output commercially?</strong> Yes — both fonts are released under the SIL Open Font License (OFL), and the rendering is done locally by you.</p>
  <p><strong>Why does Press Start 2P look blurry at certain sizes?</strong> It's a bitmap font designed on an 8px grid. Use multiples of 8 (8, 16, 24, 32…) for pixel-perfect output. Odd sizes cause sub-pixel aliasing.</p>
  <p><strong>Can I have multiple lines?</strong> Yes — press Enter in the text area. Each line is rendered separately with consistent line spacing.</p>
  <p><strong>Is my text sent anywhere?</strong> No. The canvas renders entirely in your browser. The fonts load from Google Fonts on first use, then are cached locally.</p>
  <div class="see-also">
    <span class="see-label">Related tools:</span>
    <a href="/avatar">8-bit Avatar</a>
    <a href="/demake">Demake</a>
    <a href="/ascii">ASCII Art</a>
  </div>
</section>

<style>
  .lead { color: var(--muted); font-size: 1.2rem; max-width: 50ch; margin-bottom: 1rem; }
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
  }
  .ctrl-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1rem;
    cursor: pointer;
  }
  .dimmed { opacity: 0.45; }
  select {
    background: var(--bg-2);
    color: var(--ink);
    border: 2px solid var(--line);
    padding: 0.3rem 0.5rem;
    font-size: 1rem;
    cursor: pointer;
  }
  .color-input {
    width: 48px;
    height: 36px;
    border: 2px solid var(--line);
    background: none;
    padding: 2px;
    cursor: pointer;
  }
  .text-area-wrap { margin-bottom: 1rem; }
  .text-input {
    width: 100%;
    max-width: 480px;
    background: var(--bg-2);
    color: var(--ink);
    border: 2px solid var(--line);
    padding: 0.5rem 0.75rem;
    font-family: var(--pixel);
    font-size: 1.1rem;
    resize: vertical;
    line-height: 1.6;
  }
  .text-input:focus { outline: none; border-color: var(--accent-2); }
  .status { color: var(--accent-3); animation: blink 1s steps(2) infinite; }
  @keyframes blink { 50% { opacity: 0.4; } }
  .preview-wrap {
    display: inline-block;
    margin: 0.75rem 0;
    border: 2px solid var(--line);
    background: repeating-conic-gradient(#444 0% 25%, #222 0% 50%) 0 0 / 12px 12px;
  }
  .preview {
    display: block;
    max-width: 100%;
    image-rendering: pixelated;
  }
  .preview:not(.transparent-preview) { background: none; }
</style>
