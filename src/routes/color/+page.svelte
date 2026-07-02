<script lang="ts">
  import { track } from '$lib/analytics';
  import { PALETTES, nearestColor } from '$lib/palettes';

  let hex = $state('#ff004d');
  let hexInput = $state('#ff004d');
  let copied = $state('');

  function hexToRgb(h: string): [number, number, number] {
    const n = parseInt(h.replace('#', '').padEnd(6, '0'), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  }

  function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
  }

  function complementary(h: string): string {
    const [r, g, b] = hexToRgb(h);
    return rgbToHex(255 - r, 255 - g, 255 - b);
  }

  function luminance(r: number, g: number, b: number): number {
    return Math.round((0.299 * r + 0.587 * g + 0.114 * b) / 255 * 100);
  }

  const rgb   = $derived(hexToRgb(hex));
  const hsl   = $derived(rgbToHsl(...rgb));
  const lum   = $derived(luminance(...rgb));
  const comp  = $derived(complementary(hex));
  const textColor = $derived(lum > 50 ? '#000' : '#fff');

  const paletteMatches = $derived(
    Object.entries(PALETTES).map(([name, palette]) => {
      const [nr, ng, nb] = nearestColor(rgb[0], rgb[1], rgb[2], palette);
      return { name, hex: rgbToHex(nr, ng, nb), r: nr, g: ng, b: nb };
    })
  );

  function applyHex(value: string) {
    const clean = value.startsWith('#') ? value : '#' + value;
    if (/^#[0-9a-fA-F]{6}$/.test(clean)) {
      hex = clean;
      hexInput = clean;
      track('tool_use', { tool: 'color' });
    }
  }

  function copyText(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() => {
      copied = label;
      setTimeout(() => { copied = ''; }, 1200);
    });
  }

  function onHexInput(e: Event) {
    hexInput = (e.target as HTMLInputElement).value;
    applyHex(hexInput);
  }

  function onPickerInput(e: Event) {
    const v = (e.target as HTMLInputElement).value;
    hex = v; hexInput = v;
    track('tool_use', { tool: 'color' });
  }
</script>

<svelte:head>
  <title>8-bit Color Tool — Hex RGB HSL Converter with Retro Palette Lookup | Station255</title>
  <meta name="description" content="Convert colors between hex, RGB, and HSL. See the nearest color in PICO-8, NES, Game Boy, C64, and Terminal palettes. Free online color converter with retro palette support." />
</svelte:head>

<h1 class="tool-title">8-bit Color</h1>
<p class="tool-sub">Explore any color: convert hex ↔ RGB ↔ HSL and find the nearest retro console color.</p>

<div class="color-layout">
  <div class="swatch-col">
    <div class="big-swatch" style="background:{hex}; color:{textColor}">
      <span class="swatch-hex">{hex}</span>
    </div>
    <div class="comp-swatch" style="background:{comp};">
      <span class="swatch-sublabel" style="color:{luminance(...hexToRgb(comp)) > 50 ? '#000' : '#fff'}">complement</span>
    </div>
    <input type="color" bind:value={hex} oninput={onPickerInput} class="color-picker" />
  </div>

  <div class="values-col">
    <div class="value-row">
      <span class="value-label">Hex</span>
      <div class="value-group">
        <input class="hex-input" type="text" bind:value={hexInput} oninput={onHexInput} maxlength="7" spellcheck="false" />
        <button class="copy-btn" onclick={() => copyText(hex, 'hex')}>{copied === 'hex' ? '✓' : 'Copy'}</button>
      </div>
    </div>
    <div class="value-row">
      <span class="value-label">RGB</span>
      <div class="value-group">
        <span class="value-text">rgb({rgb[0]}, {rgb[1]}, {rgb[2]})</span>
        <button class="copy-btn" onclick={() => copyText(`rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`, 'rgb')}>{copied === 'rgb' ? '✓' : 'Copy'}</button>
      </div>
    </div>
    <div class="value-row">
      <span class="value-label">R / G / B</span>
      <span class="value-text rgb-bars">
        <span class="channel r">{rgb[0]}</span>
        <span class="channel g">{rgb[1]}</span>
        <span class="channel b">{rgb[2]}</span>
      </span>
    </div>
    <div class="value-row">
      <span class="value-label">HSL</span>
      <div class="value-group">
        <span class="value-text">hsl({hsl[0]}, {hsl[1]}%, {hsl[2]}%)</span>
        <button class="copy-btn" onclick={() => copyText(`hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)`, 'hsl')}>{copied === 'hsl' ? '✓' : 'Copy'}</button>
      </div>
    </div>
    <div class="value-row">
      <span class="value-label">Luminance</span>
      <span class="value-text">{lum}% — {lum > 65 ? 'light' : lum > 35 ? 'mid' : 'dark'}</span>
    </div>
    <div class="value-row">
      <span class="value-label">CSS var</span>
      <div class="value-group">
        <span class="value-text">--color: {hex};</span>
        <button class="copy-btn" onclick={() => copyText(`--color: ${hex};`, 'cssvar')}>{copied === 'cssvar' ? '✓' : 'Copy'}</button>
      </div>
    </div>
  </div>
</div>

<p class="section-label">Nearest color in retro palettes</p>
<div class="palette-matches">
  {#each paletteMatches as m}
    <div class="palette-row" onclick={() => { hex = m.hex; hexInput = m.hex; }} title="Click to select this color">
      <div class="match-swatch" style="background:{m.hex};"></div>
      <div class="match-info">
        <span class="match-palette">{m.name}</span>
        <span class="match-hex">{m.hex}</span>
        <span class="match-rgb">rgb({m.r},{m.g},{m.b})</span>
      </div>
      <button class="copy-btn sm" onclick={(e) => { e.stopPropagation(); copyText(m.hex, m.name); }}>{copied === m.name ? '✓' : 'Copy'}</button>
    </div>
  {/each}
</div>

<div class="seo">
  <h2>8-bit Color Converter with Retro Palette Lookup</h2>
  <p>
    Station255's Color tool converts any hex color to RGB and HSL, shows the complementary color,
    calculates perceptual luminance, and instantly finds the nearest matching color in five classic
    retro palettes: PICO-8, Game Boy, NES, C64, and Terminal. All calculations run in your browser
    using pure JavaScript — no server, no API.
  </p>
  <h3>How nearest-palette matching works</h3>
  <p>
    The tool computes Euclidean distance in RGB color space between your input color and every
    color in each palette, then returns the closest match. For better perceptual accuracy, results
    weight luminance more heavily than chrominance.
  </p>
  <h3>Use cases</h3>
  <p>
    Game developers restricting their palette to authentic hardware limits, pixel artists picking
    complementary colors, front-end developers converting design tokens, and retro graphics
    enthusiasts exploring what any modern color looks like on classic hardware.
  </p>
  <h3>FAQ</h3>
  <h3>Can I type RGB values directly?</h3>
  <p>Currently the tool accepts hex input. RGB-to-hex conversion is built in — you can enter a hex code by converting RGB values manually or using the color picker.</p>
  <h3>What does clicking a palette match do?</h3>
  <p>It loads that exact retro color into the tool so you can explore its values and find further matches.</p>
</div>

<div class="see-also">
  <span>See also:</span>
  <a href="/palette-extractor">Palette Extractor</a>
  <a href="/gradient">Retro Gradient</a>
  <a href="/demake">Demake</a>
  <a href="/dither">Dithering Studio</a>
</div>

<style>
  .tool-title { font-size: 1.1rem; margin: 0 0 0.4rem; }
  .tool-sub { color: var(--muted); margin: 0 0 1.25rem; font-size: 0.95rem; }

  .color-layout { display: flex; gap: 1.5rem; flex-wrap: wrap; align-items: flex-start; margin-bottom: 1.5rem; }

  .swatch-col { display: flex; flex-direction: column; gap: 0.5rem; flex-shrink: 0; }
  .big-swatch {
    width: 160px; height: 100px;
    display: flex; align-items: flex-end; justify-content: flex-start;
    padding: 0.5rem;
    border: 2px solid var(--line);
  }
  .swatch-hex { font-family: var(--display); font-size: 0.55rem; }
  .comp-swatch { width: 160px; height: 40px; border: 2px solid var(--line); display: flex; align-items: center; padding: 0.4rem; }
  .swatch-sublabel { font-size: 0.75rem; opacity: 0.8; }
  .color-picker { width: 160px; height: 36px; border: 2px solid var(--line); padding: 2px; cursor: pointer; background: var(--bg-2); }

  .values-col { display: flex; flex-direction: column; gap: 0.55rem; flex: 1; min-width: 200px; }
  .value-row { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
  .value-label { font-family: var(--display); font-size: 0.45rem; color: var(--muted); min-width: 64px; flex-shrink: 0; }
  .value-text { font-family: 'Courier New', monospace; font-size: 0.88rem; color: var(--ink); }
  .value-group { display: flex; align-items: center; gap: 0.5rem; }

  .hex-input { background: var(--bg-2); border: 1px solid var(--line); color: var(--ink); padding: 0.3rem 0.5rem; font-family: 'Courier New', monospace; font-size: 0.9rem; width: 90px; }
  .copy-btn { background: var(--panel); border: 1px solid var(--line); color: var(--muted); padding: 0.25rem 0.5rem; cursor: pointer; font-size: 0.8rem; white-space: nowrap; }
  .copy-btn:hover { color: var(--ink); border-color: var(--accent-2); }
  .copy-btn.sm { padding: 0.2rem 0.4rem; font-size: 0.75rem; }

  .rgb-bars { display: flex; gap: 0.6rem; }
  .channel { font-family: var(--display); font-size: 0.5rem; padding: 0.2rem 0.4rem; }
  .channel.r { background: #3a0a0a; color: #ff7070; }
  .channel.g { background: #0a2a0a; color: #70ff70; }
  .channel.b { background: #0a0a3a; color: #7070ff; }

  .section-label { font-family: var(--display); font-size: 0.5rem; color: var(--muted); margin: 0.5rem 0 0.75rem; }
  .palette-matches { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 2rem; }
  .palette-row {
    display: flex; align-items: center; gap: 0.75rem;
    background: var(--panel); border: 1px solid var(--line);
    padding: 0.5rem 0.75rem; cursor: pointer;
  }
  .palette-row:hover { border-color: var(--accent-2); }
  .match-swatch { width: 36px; height: 36px; border: 1px solid #0004; flex-shrink: 0; }
  .match-info { display: flex; flex-direction: column; gap: 0.2rem; flex: 1; }
  .match-palette { font-family: var(--display); font-size: 0.48rem; color: var(--ink); }
  .match-hex, .match-rgb { font-family: 'Courier New', monospace; font-size: 0.8rem; color: var(--muted); }
</style>
