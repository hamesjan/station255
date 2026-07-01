<script lang="ts">
  import { onMount } from 'svelte';
  import { track } from '$lib/analytics';

  let hue = $state(180);
  let saturation = $state(80);
  let lightness = $state(50);
  let harmony = $state<'complementary' | 'triadic' | 'analogous' | 'split' | 'tetradic'>('complementary');
  let palette = $state<string[]>([]);
  let copied = $state<string | null>(null);

  function hslToHex(h: number, s: number, l: number): string {
    s /= 100; l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
    };
    return `#${[f(0),f(8),f(4)].map(v => v.toString(16).padStart(2,'0')).join('')}`;
  }

  function hexToHSL(hex: string): [number, number, number] {
    const r = parseInt(hex.slice(1,3),16)/255;
    const g = parseInt(hex.slice(3,5),16)/255;
    const b = parseInt(hex.slice(5,7),16)/255;
    const max = Math.max(r,g,b), min = Math.min(r,g,b);
    let h = 0, s = 0, l = (max+min)/2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d/(2-max-min) : d/(max+min);
      if (max===r) h = ((g-b)/d + (g<b?6:0))/6;
      else if (max===g) h = ((b-r)/d+2)/6;
      else h = ((r-g)/d+4)/6;
    }
    return [Math.round(h*360), Math.round(s*100), Math.round(l*100)];
  }

  function buildPalette() {
    const h = hue, s = saturation, l = lightness;
    const base = hslToHex(h, s, l);
    let colors: string[];
    if (harmony === 'complementary') {
      colors = [base, hslToHex((h+180)%360, s, l)];
    } else if (harmony === 'triadic') {
      colors = [base, hslToHex((h+120)%360, s, l), hslToHex((h+240)%360, s, l)];
    } else if (harmony === 'analogous') {
      colors = [hslToHex((h-30+360)%360, s, l), base, hslToHex((h+30)%360, s, l), hslToHex((h+60)%360, s, l)];
    } else if (harmony === 'split') {
      colors = [base, hslToHex((h+150)%360, s, l), hslToHex((h+210)%360, s, l)];
    } else {
      colors = [base, hslToHex((h+90)%360, s, l), hslToHex((h+180)%360, s, l), hslToHex((h+270)%360, s, l)];
    }
    // add shades of base
    const shades = [20,35,50,65,80].map(li => hslToHex(h, s, li));
    palette = [...colors, ...shades];
    track('tool_use', { tool: 'color-wheel', harmony });
  }

  $effect(() => { hue; saturation; lightness; harmony; buildPalette(); });
  onMount(buildPalette);

  async function copyHex(hex: string) {
    await navigator.clipboard.writeText(hex);
    copied = hex;
    setTimeout(() => { if (copied === hex) copied = null; }, 1200);
  }

  async function copyAll() {
    await navigator.clipboard.writeText(palette.join('\n'));
    copied = 'all';
    setTimeout(() => { copied = null; }, 1200);
    track('export', { tool: 'color-wheel', type: 'copy' });
  }

  function onBaseInput(e: Event) {
    const hex = (e.target as HTMLInputElement).value;
    const [h, s, l] = hexToHSL(hex);
    hue = h; saturation = s; lightness = l;
  }
</script>

<svelte:head>
  <title>Retro Color Harmony Tool — Complementary, Triadic & More | Station255</title>
  <meta name="description" content="Build color palettes using classic harmony rules — complementary, triadic, analogous, split, tetradic. Copy hex codes instantly. Free online color wheel tool." />
</svelte:head>

<div class="tool-header">
  <h1 class="tool-title">COLOR HARMONY</h1>
  <p class="tool-sub">Pick a base color, choose a harmony rule, get a matching palette. The math behind color relationships that always look right.</p>
</div>

<div class="controls panel">
  <div class="ctrl-row">
    <label class="ctrl-field">
      <span class="ctrl-label">Base color</span>
      <input type="color" value={hslToHex(hue, saturation, lightness)} oninput={onBaseInput} class="color-pick-lg" />
    </label>
    <div class="hsl-row">
      <label class="ctrl-inline">
        <span class="ctrl-label">H</span>
        <input type="range" min="0" max="359" bind:value={hue} class="slider hue-slider" />
        <span class="ctrl-val">{hue}°</span>
      </label>
      <label class="ctrl-inline">
        <span class="ctrl-label">S</span>
        <input type="range" min="0" max="100" bind:value={saturation} class="slider" />
        <span class="ctrl-val">{saturation}%</span>
      </label>
      <label class="ctrl-inline">
        <span class="ctrl-label">L</span>
        <input type="range" min="5" max="95" bind:value={lightness} class="slider" />
        <span class="ctrl-val">{lightness}%</span>
      </label>
    </div>
  </div>
  <div class="ctrl-row">
    <span class="ctrl-label">Harmony</span>
    {#each (['complementary','triadic','analogous','split','tetradic'] as const) as h}
      <button class="harmony-btn" class:active={harmony===h} onclick={() => harmony=h}>{h}</button>
    {/each}
  </div>
</div>

<div class="palette-section">
  <div class="section-head">
    <h2 class="section-title">Harmony colors</h2>
    <button class="copy-all-btn" onclick={copyAll}>{copied==='all' ? '✓ Copied' : '⎘ Copy all'}</button>
  </div>
  <div class="color-strip">
    {#each palette.slice(0, palette.length - 5) as c}
      <button class="big-swatch" style="background:{c}" onclick={() => copyHex(c)} title={c}>
        <span class="swatch-hex" class:light={parseInt(c.slice(1,3),16)*0.299+parseInt(c.slice(3,5),16)*0.587+parseInt(c.slice(5,7),16)*0.114 > 128}>{copied===c ? '✓' : c}</span>
      </button>
    {/each}
  </div>

  <h2 class="section-title shade-title">Shades</h2>
  <div class="color-strip">
    {#each palette.slice(-5) as c}
      <button class="big-swatch" style="background:{c}" onclick={() => copyHex(c)} title={c}>
        <span class="swatch-hex" class:light={parseInt(c.slice(1,3),16)*0.299+parseInt(c.slice(3,5),16)*0.587+parseInt(c.slice(5,7),16)*0.114 > 128}>{copied===c ? '✓' : c}</span>
      </button>
    {/each}
  </div>
</div>

<div class="panel preview-section">
  <h2 class="section-title">Preview</h2>
  <div class="mock-ui" style="background:{palette[0]};color:{palette[1]}">
    <div class="mock-bar" style="background:{palette[1]}">
      <span style="color:{palette[0]}">▚ STATION255</span>
    </div>
    <div class="mock-body">
      <div class="mock-card" style="background:{palette.at(-3)};border-color:{palette[1]}">
        <div class="mock-title" style="color:{palette[1]}">Pixel Tool</div>
        <div class="mock-text" style="color:{palette[2] || palette[0]}">Your palette in action</div>
        <div class="mock-btn" style="background:{palette[1]};color:{palette[0]}">PLAY →</div>
      </div>
    </div>
  </div>
</div>

<div class="panel about">
  <h2 class="about-title">About Color Harmony</h2>
  <p><strong>Complementary</strong> — colors opposite on the wheel. Maximum contrast, classic and bold.</p>
  <p><strong>Triadic</strong> — three colors evenly spaced 120° apart. Vibrant, balanced.</p>
  <p><strong>Analogous</strong> — colors next to each other on the wheel. Harmonious, natural-looking.</p>
  <p><strong>Split-complementary</strong> — the complement and its two neighbors. High contrast with more nuance than pure complementary.</p>
  <p><strong>Tetradic</strong> — four colors forming a rectangle on the wheel. Rich, complex — needs one dominant color to avoid clashing.</p>
</div>

<style>
  .tool-header { padding: 1.25rem 0 1rem; border-bottom: 2px solid var(--line); margin-bottom: 1rem; }
  .tool-title { font-family: var(--display); font-size: 1.1rem; color: var(--accent-3); text-shadow: 3px 3px 0 var(--accent); margin: 0 0 0.5rem; }
  .tool-sub { color: var(--muted); font-size: 0.95rem; margin: 0; }

  .controls { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1rem; }
  .ctrl-row { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
  .ctrl-field { display: flex; flex-direction: column; gap: 0.3rem; }
  .ctrl-label { font-family: var(--display); font-size: 0.33rem; color: var(--muted); }
  .ctrl-val { font-family: var(--display); font-size: 0.33rem; color: var(--ink); min-width: 2.5rem; }
  .ctrl-inline { display: flex; align-items: center; gap: 0.4rem; }
  .hsl-row { display: flex; flex-direction: column; gap: 0.4rem; }
  .color-pick-lg { width: 56px; height: 40px; border: 2px solid var(--line); cursor: pointer; padding: 2px; }
  .slider { width: 120px; accent-color: var(--accent-3); }
  .hue-slider { accent-color: hsl(var(--hue, 180), 80%, 50%); }
  .harmony-btn {
    font-size: 0.78rem; background: none; border: 1px solid var(--line); color: var(--muted);
    padding: 0.25rem 0.55rem; cursor: pointer; text-transform: capitalize; transition: border-color 0.08s, color 0.08s;
  }
  .harmony-btn:hover { color: var(--ink); }
  .harmony-btn.active { border-color: var(--accent-3); color: var(--accent-3); }

  .palette-section { margin-bottom: 1rem; }
  .section-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
  .section-title { font-family: var(--display); font-size: 0.4rem; color: var(--muted); margin: 0; }
  .shade-title { margin-top: 0.75rem; margin-bottom: 0.5rem; }
  .copy-all-btn {
    font-family: var(--display); font-size: 0.3rem; background: none; border: 1px solid var(--line);
    color: var(--muted); padding: 0.25rem 0.5rem; cursor: pointer;
  }
  .copy-all-btn:hover { border-color: var(--accent-3); color: var(--accent-3); }

  .color-strip { display: flex; gap: 4px; flex-wrap: wrap; }
  .big-swatch {
    flex: 1; min-width: 80px; height: 80px; border: none; cursor: pointer;
    display: flex; align-items: flex-end; justify-content: flex-start;
    padding: 4px 6px; transition: transform 0.05s;
  }
  .big-swatch:hover { transform: scaleY(1.05); transform-origin: bottom; }
  .swatch-hex { font-size: 0.65rem; font-family: monospace; color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,0.8); }
  .swatch-hex.light { color: #000; text-shadow: 0 1px 3px rgba(255,255,255,0.5); }

  .preview-section { margin-bottom: 1rem; }
  .mock-ui { border: 2px solid var(--line); overflow: hidden; }
  .mock-bar { padding: 8px 12px; font-family: var(--display); font-size: 0.4rem; }
  .mock-body { padding: 16px; display: flex; gap: 12px; }
  .mock-card { border: 2px solid; padding: 12px; display: flex; flex-direction: column; gap: 6px; max-width: 200px; }
  .mock-title { font-family: var(--display); font-size: 0.4rem; }
  .mock-text { font-size: 0.8rem; }
  .mock-btn { font-family: var(--display); font-size: 0.3rem; padding: 4px 8px; align-self: flex-start; }

  .about { margin-top: 1rem; }
  .about-title { font-family: var(--display); font-size: 0.5rem; color: var(--accent-3); margin: 0 0 0.75rem; }
  .about p { font-size: 0.9rem; color: var(--muted); line-height: 1.6; margin: 0 0 0.4rem; }
  .about strong { color: var(--ink); }
</style>
