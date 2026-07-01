<script lang="ts">
  import { track } from '$lib/analytics';

  let colorA = $state('#ff2e88');
  let colorB = $state('#21e6c1');
  let steps  = $state(8);
  let mode   = $state<'hsl' | 'rgb'>('hsl');
  let copied = $state<string | null>(null);

  function hexToRgb(hex: string): [number, number, number] {
    const h = hex.replace('#', '');
    return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
  }
  function rgbToHex(r: number, g: number, b: number) {
    return '#' + [r,g,b].map(v => Math.round(Math.min(255,Math.max(0,v))).toString(16).padStart(2,'0')).join('');
  }
  function isLight(hex: string) {
    const [r,g,b] = hexToRgb(hex);
    return (r*299 + g*587 + b*114) / 1000 > 128;
  }
  function rgbToHsl(r: number, g: number, b: number): [number,number,number] {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r,g,b), min = Math.min(r,g,b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g-b)/d + (g < b ? 6 : 0)) / 6;
      else if (max === g) h = ((b-r)/d + 2) / 6;
      else h = ((r-g)/d + 4) / 6;
    }
    return [h*360, s*100, l*100];
  }
  function hslToRgb(h: number, s: number, l: number): [number,number,number] {
    h /= 360; s /= 100; l /= 100;
    const q = l < 0.5 ? l*(1+s) : l+s-l*s, p = 2*l-q;
    const hue = (t: number) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1/6) return p+(q-p)*6*t;
      if (t < 1/2) return q;
      if (t < 2/3) return p+(q-p)*(2/3-t)*6;
      return p;
    };
    return s === 0
      ? [Math.round(l*255),Math.round(l*255),Math.round(l*255)]
      : [Math.round(hue(h+1/3)*255), Math.round(hue(h)*255), Math.round(hue(h-1/3)*255)];
  }

  const ramp = $derived.by(() => {
    const [r1,g1,b1] = hexToRgb(colorA);
    const [r2,g2,b2] = hexToRgb(colorB);
    return Array.from({ length: steps }, (_, i) => {
      const t = steps === 1 ? 0 : i / (steps - 1);
      if (mode === 'rgb') return rgbToHex(r1+(r2-r1)*t, g1+(g2-g1)*t, b1+(b2-b1)*t);
      const [h1,s1,l1] = rgbToHsl(r1,g1,b1);
      const [h2,s2,l2] = rgbToHsl(r2,g2,b2);
      let dh = h2-h1; if (dh > 180) dh -= 360; if (dh < -180) dh += 360;
      const [r,g,b] = hslToRgb(h1+dh*t, s1+(s2-s1)*t, l1+(l2-l1)*t);
      return rgbToHex(r,g,b);
    });
  });

  async function copyHex(hex: string) {
    await navigator.clipboard.writeText(hex);
    copied = hex; setTimeout(() => { copied = null; }, 1200);
    track('tool_use', { tool: 'color-ramp', action: 'copy' });
  }
  async function copyAll() {
    await navigator.clipboard.writeText(ramp.join('\n'));
    copied = 'all'; setTimeout(() => { copied = null; }, 1500);
    track('export', { tool: 'color-ramp', type: 'copy_all' });
  }
  function download() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ramp.join('\n')], { type: 'text/plain' }));
    a.download = 'ramp.hex'; a.click();
    track('export', { tool: 'color-ramp', type: 'download' });
  }
</script>

<svelte:head>
  <title>Color Ramp Generator — smooth palette between two colors | Station255</title>
  <meta name="description" content="Generate a smooth color ramp between any two hex colors via RGB or HSL interpolation. Copy hex codes or download as a .hex palette file. Free, runs in your browser." />
</svelte:head>

<h1>Color Ramp</h1>
<p class="lead">Two colors in. A smooth palette between them out.</p>

<div class="controls">
  <label class="pick">
    <span>From</span>
    <input type="color" bind:value={colorA} />
    <code>{colorA}</code>
  </label>
  <label class="pick">
    <span>To</span>
    <input type="color" bind:value={colorB} />
    <code>{colorB}</code>
  </label>
  <label class="ctrl">
    <span>Steps: <strong>{steps}</strong></span>
    <input type="range" min="2" max="32" bind:value={steps} />
  </label>
  <label class="ctrl">
    <span>Mode</span>
    <select bind:value={mode}>
      <option value="hsl">HSL (perceptual)</option>
      <option value="rgb">RGB (linear)</option>
    </select>
  </label>
</div>

<div class="ramp">
  {#each ramp as hex}
    <button class="swatch" style="background:{hex}" onclick={() => copyHex(hex)} title="Click to copy {hex}">
      <span class="label" class:dark={isLight(hex)}>{copied === hex ? '✓' : hex}</span>
    </button>
  {/each}
</div>

<div class="actions">
  <button class="btn" onclick={copyAll}>{copied === 'all' ? 'Copied!' : 'Copy all hex'}</button>
  <button class="btn secondary" onclick={download}>Download .hex</button>
</div>

<section class="seo panel">
  <h2>About Color Ramp</h2>
  <p>Pick two colors and get a smooth gradient of stops between them. Useful for building palettes, designing retro UI color schemes, or generating gradients to paste into Aseprite, PICO-8, or CSS.</p>
  <h3>HSL vs RGB</h3>
  <p><strong>HSL</strong> travels through the color wheel — reds to blues pass through purple, not gray. Usually looks more natural and saturated.</p>
  <p><strong>RGB</strong> mixes raw channel values — predictable, but can produce washed-out midpoints between certain colors.</p>
  <div class="see-also">
    <span class="see-label">Related:</span>
    <a href="/gradient">Retro Gradient</a>
    <a href="/palette-extractor">Palette Extractor</a>
    <a href="/color">8-bit Color</a>
  </div>
</section>

<style>
  .lead { color: var(--muted); font-size: 1.2rem; margin: 0 0 1rem; }
  .controls { display: flex; flex-wrap: wrap; gap: 1.25rem; align-items: flex-end; margin-bottom: 1rem; }
  .pick { display: flex; flex-direction: column; gap: 0.3rem; font-size: 1rem; }
  .pick input[type=color] { width: 56px; height: 36px; border: 2px solid var(--line); background: none; cursor: pointer; padding: 2px; }
  .pick code { font-size: 0.9rem; color: var(--muted); }
  .ctrl { display: flex; flex-direction: column; gap: 0.3rem; font-size: 1rem; }
  select { background: var(--bg-2); color: var(--ink); border: 2px solid var(--line); padding: 0.3rem 0.5rem; }
  .ramp { display: flex; height: 80px; border: 2px solid var(--line); overflow: hidden; margin: 0.5rem 0 1rem; }
  .swatch { flex: 1; border: none; cursor: pointer; position: relative; padding: 0; transition: flex 0.12s; }
  .swatch:hover { flex: 2.5; }
  .label {
    position: absolute; bottom: 4px; left: 50%; transform: translateX(-50%);
    font-size: 0.7rem; font-family: monospace; color: #fff;
    background: rgba(0,0,0,0.55); padding: 0 3px; white-space: nowrap;
    pointer-events: none; opacity: 0; transition: opacity 0.1s;
  }
  .swatch:hover .label { opacity: 1; }
  .label.dark { color: #000; background: rgba(255,255,255,0.55); }
  .actions { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 1.5rem; }
</style>
