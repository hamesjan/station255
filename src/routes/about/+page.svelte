<svelte:head>
  <title>About Station255 — the 8-bit tool arcade</title>
  <meta
    name="description"
    content="Station255 is a free arcade of pixel-art and retro web tools. Learn about what we build, how it works, and why your files never leave your browser."
  />
</svelte:head>

<h1>About</h1>

<div class="panel section">
  <h2>What is Station255?</h2>
  <p>
    Station255 is <strong>the 8-bit tool arcade</strong> — a collection of small, fast, free
    browser tools for pixel art, retro aesthetics, and 8-bit everything. Each tool is a
    self-contained page. No account, no upload limits, no watermarks.
  </p>
  <p>
    The name comes from the value <strong>255</strong> — the maximum value of an 8-bit byte.
    It literally means 8-bit.
  </p>
</div>

<div class="panel section">
  <h2>The tools</h2>
  <ul class="tool-list">
    <li><strong>Palette Extractor</strong> — pull the dominant colors out of any image using median-cut quantization.</li>
    <li><strong>Demake</strong> — pixelize a photo into authentic NES, Game Boy, PICO-8, C64, or terminal palette art.</li>
    <li><strong>CRT-ify</strong> — apply scanlines, chromatic aberration, phosphor glow, and vignette to any image.</li>
    <li><strong>Pixel Text</strong> — render text in Press Start 2P or VT323 and export as a transparent PNG.</li>
    <li><strong>Dithering Studio</strong> — Bayer ordered dithering or Floyd-Steinberg error diffusion with retro palettes.</li>
    <li><strong>Pixel Upscaler</strong> — enlarge pixel art with nearest-neighbor interpolation. No blur. Ever.</li>
    <li><strong>ASCII Art</strong> — convert any image to classic text art with adjustable density and width.</li>
    <li><strong>8-bit Avatar</strong> — generate a deterministic pixel-art identicon from any name or seed.</li>
  </ul>
  <p>More tools are added regularly. Check back or watch the sidebar.</p>
</div>

<div class="panel section">
  <h2>Privacy &amp; your files</h2>
  <p>
    <strong>Your images and text never leave your browser.</strong> Every tool runs entirely
    client-side using HTML5 Canvas and standard browser APIs. Nothing is uploaded to a server.
    The only network call is an anonymous, optional analytics beacon that counts page visits —
    see the <a href="/privacy">privacy policy</a> for full details.
  </p>
</div>

<div class="panel section">
  <h2>Built with</h2>
  <p>
    <a href="https://kit.svelte.dev" rel="noopener noreferrer" target="_blank">SvelteKit</a> with
    <code>adapter-static</code> — fully prerendered, deployed as flat HTML files behind
    <a href="https://caddyserver.com" rel="noopener noreferrer" target="_blank">Caddy</a>.
    No Node.js process running in production. Tools use only standard browser APIs —
    no heavy libraries.
  </p>
</div>

<style>
  h1 { margin-bottom: 1.25rem; }
  .section { margin-bottom: 1rem; }
  .section h2 { font-size: 0.85rem; margin-top: 0; color: var(--accent-3); }
  .section p { color: var(--muted); font-size: 1.05rem; margin: 0.5rem 0; line-height: 1.6; }
  .section p:first-of-type { margin-top: 0; }
  .tool-list {
    list-style: none;
    padding: 0;
    margin: 0 0 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .tool-list li {
    color: var(--muted);
    font-size: 1rem;
    padding-left: 1.1rem;
    position: relative;
  }
  .tool-list li::before { content: '▸'; position: absolute; left: 0; color: var(--accent); }
  .tool-list strong { color: var(--ink); }
  code { background: var(--bg); padding: 0.1rem 0.3rem; font-family: var(--pixel); }
</style>
