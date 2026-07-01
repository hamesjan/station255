<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { track } from '$lib/analytics';

  const CHAR_W = 5, CHAR_H = 7, SCALE = 3;
  const FONT: Record<string, number[][]> = {
    'A':[[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],
    'B':[[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,0]],
    'C':[[0,1,1,1,1],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[0,1,1,1,1]],
    'D':[[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,0]],
    'E':[[1,1,1,1,1],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,0],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,1]],
    'F':[[1,1,1,1,1],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0]],
    'G':[[0,1,1,1,1],[1,0,0,0,0],[1,0,0,0,0],[1,0,1,1,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,1]],
    'H':[[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],
    'I':[[1,1,1,1,1],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[1,1,1,1,1]],
    'J':[[0,0,0,0,1],[0,0,0,0,1],[0,0,0,0,1],[0,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
    'K':[[1,0,0,1,0],[1,0,1,0,0],[1,1,0,0,0],[1,0,0,0,0],[1,1,0,0,0],[1,0,1,0,0],[1,0,0,1,0]],
    'L':[[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,1]],
    'M':[[1,0,0,0,1],[1,1,0,1,1],[1,0,1,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],
    'N':[[1,0,0,0,1],[1,1,0,0,1],[1,0,1,0,1],[1,0,0,1,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],
    'O':[[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
    'P':[[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0]],
    'Q':[[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,1,0,1],[1,0,0,1,0],[0,1,1,0,1]],
    'R':[[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,0],[1,0,1,0,0],[1,0,0,1,0],[1,0,0,0,1]],
    'S':[[0,1,1,1,1],[1,0,0,0,0],[1,0,0,0,0],[0,1,1,1,0],[0,0,0,0,1],[0,0,0,0,1],[1,1,1,1,0]],
    'T':[[1,1,1,1,1],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],
    'U':[[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
    'V':[[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,0,1,0],[0,0,1,0,0]],
    'W':[[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,1,0,1],[1,0,1,0,1],[1,1,0,1,1],[1,0,0,0,1]],
    'X':[[1,0,0,0,1],[0,1,0,1,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,1,0,1,0],[1,0,0,0,1]],
    'Y':[[1,0,0,0,1],[1,0,0,0,1],[0,1,0,1,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],
    'Z':[[1,1,1,1,1],[0,0,0,0,1],[0,0,0,1,0],[0,0,1,0,0],[0,1,0,0,0],[1,0,0,0,0],[1,1,1,1,1]],
    '0':[[0,1,1,1,0],[1,0,0,0,1],[1,0,0,1,1],[1,0,1,0,1],[1,1,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
    '1':[[0,0,1,0,0],[0,1,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[1,1,1,1,1]],
    '2':[[0,1,1,1,0],[1,0,0,0,1],[0,0,0,0,1],[0,0,0,1,0],[0,0,1,0,0],[0,1,0,0,0],[1,1,1,1,1]],
    '3':[[1,1,1,1,0],[0,0,0,0,1],[0,0,0,0,1],[0,0,1,1,0],[0,0,0,0,1],[0,0,0,0,1],[1,1,1,1,0]],
    '4':[[0,0,0,1,0],[0,0,1,1,0],[0,1,0,1,0],[1,0,0,1,0],[1,1,1,1,1],[0,0,0,1,0],[0,0,0,1,0]],
    '5':[[1,1,1,1,1],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,0],[0,0,0,0,1],[0,0,0,0,1],[1,1,1,1,0]],
    '6':[[0,1,1,1,1],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
    '7':[[1,1,1,1,1],[0,0,0,0,1],[0,0,0,1,0],[0,0,1,0,0],[0,1,0,0,0],[0,1,0,0,0],[0,1,0,0,0]],
    '8':[[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
    '9':[[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,1],[0,0,0,0,1],[0,0,0,0,1],[0,1,1,1,0]],
    '!':[[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,0,0,0],[0,0,1,0,0]],
    '?':[[0,1,1,1,0],[1,0,0,0,1],[0,0,0,0,1],[0,0,0,1,0],[0,0,1,0,0],[0,0,0,0,0],[0,0,1,0,0]],
    ' ':[[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]],
    '.':[[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,1,0,0]],
    '-':[[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[1,1,1,1,1],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]],
    ':':[[0,0,0,0,0],[0,0,1,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,1,0,0],[0,0,0,0,0]],
  };

  const H_PX = CHAR_H * SCALE;
  const BANNER_H = H_PX + SCALE * 2;

  let text = $state('STATION 255');
  let fgColor = $state('#00ff88');
  let bgColor = $state('#000000');
  let scrolling = $state(true);
  let speed = $state(2);
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let raf = 0;
  let offset = 0;
  let bannerWidth = 0;
  let DISPLAY_W = 400;

  function buildBitmap(): number[][] {
    const upper = text.toUpperCase();
    const cols: number[][] = [];
    // gap before
    for (let i = 0; i < 4; i++) cols.push(Array(CHAR_H).fill(0));
    for (const ch of upper) {
      const g = FONT[ch] ?? FONT[' '];
      for (let x = 0; x < CHAR_W; x++) {
        cols.push(g.map(row => row[x]));
      }
      // kerning gap
      cols.push(Array(CHAR_H).fill(0));
    }
    // trailing gap
    for (let i = 0; i < DISPLAY_W / SCALE; i++) cols.push(Array(CHAR_H).fill(0));
    return cols;
  }

  let bitmap: number[][] = [];

  function render() {
    if (!ctx) return;
    const cols = bitmap;
    bannerWidth = cols.length * SCALE;
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, DISPLAY_W, BANNER_H);

    const start = scrolling ? Math.floor(offset) : 0;
    for (let ci = 0; ci < Math.ceil(DISPLAY_W / SCALE) + 1; ci++) {
      const col = (start + ci);
      if (col < 0 || col >= cols.length) continue;
      const colData = cols[col];
      for (let row = 0; row < CHAR_H; row++) {
        if (colData[row]) {
          ctx.fillStyle = fgColor;
          ctx.fillRect(ci * SCALE, SCALE + row * SCALE, SCALE, SCALE);
        }
      }
    }
  }

  function loop() {
    if (scrolling) {
      offset = (offset + speed * 0.5) % (bitmap.length);
    }
    render();
    raf = requestAnimationFrame(loop);
  }

  $effect(() => {
    text; fgColor; bgColor;
    bitmap = buildBitmap();
    if (ctx) render();
  });

  onMount(() => {
    ctx = canvas.getContext('2d')!;
    bitmap = buildBitmap();
    raf = requestAnimationFrame(loop);
    track('tool_use', { tool: 'pixel-banner' });
  });

  onDestroy(() => { if (typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(raf); });

  function download() {
    // render static version
    const off = document.createElement('canvas');
    off.width = bitmap.length * SCALE;
    off.height = BANNER_H;
    const oc = off.getContext('2d')!;
    oc.fillStyle = bgColor;
    oc.fillRect(0, 0, off.width, off.height);
    for (let ci = 0; ci < bitmap.length; ci++) {
      for (let row = 0; row < CHAR_H; row++) {
        if (bitmap[ci][row]) {
          oc.fillStyle = fgColor;
          oc.fillRect(ci * SCALE, SCALE + row * SCALE, SCALE, SCALE);
        }
      }
    }
    const a = document.createElement('a');
    a.href = off.toDataURL('image/png');
    a.download = `pixel-banner-${text.slice(0,12).replace(/\s+/g,'-')}.png`;
    a.click();
    track('export', { tool: 'pixel-banner', type: 'png' });
  }
</script>

<svelte:head>
  <title>Pixel Text Banner Maker — Scrolling 8-bit Text Generator | Station255</title>
  <meta name="description" content="Make a scrolling pixel text banner online. Type anything, pick colors, download as PNG. Perfect for gaming profiles, retro websites, and Discord." />
</svelte:head>

<div class="tool-header">
  <h1 class="tool-title">PIXEL BANNER</h1>
  <p class="tool-sub">Type anything. Watch it scroll in pixel font. Download the static PNG for your profile, README, or website.</p>
</div>

<div class="controls panel">
  <div class="ctrl-row">
    <label class="field">
      <span class="ctrl-label">Text</span>
      <input type="text" bind:value={text} maxlength="40" class="text-input" placeholder="YOUR TEXT HERE" />
    </label>
  </div>
  <div class="ctrl-row">
    <label class="color-field">
      <span class="ctrl-label">Text color</span>
      <input type="color" bind:value={fgColor} class="color-pick" />
    </label>
    <label class="color-field">
      <span class="ctrl-label">Background</span>
      <input type="color" bind:value={bgColor} class="color-pick" />
    </label>
    <label class="ctrl-row">
      <span class="ctrl-label">Speed</span>
      <input type="range" min="1" max="8" step="1" bind:value={speed} class="slider" />
      <span class="ctrl-val">{speed}</span>
    </label>
    <label class="toggle-row">
      <input type="checkbox" bind:checked={scrolling} />
      <span class="ctrl-label">Scroll</span>
    </label>
  </div>
  <button class="btn" onclick={download}>↓ Download PNG</button>
</div>

<div class="banner-wrap">
  <canvas bind:this={canvas} width={400} height={BANNER_H} class="banner-canvas"></canvas>
</div>

<div class="panel about">
  <h2 class="about-title">About Pixel Banner</h2>
  <p>This tool renders your text in a hand-crafted 5×7 pixel font and animates it as a scrolling marquee — just like the LED signs outside your local arcade. Download it as a static PNG and use it as a banner in your GitHub README, Twitter header, or Discord server.</p>
  <p>Supported characters: A–Z, 0–9, and a handful of punctuation marks. All uppercase.</p>
</div>

<style>
  .tool-header { padding: 1.25rem 0 1rem; border-bottom: 2px solid var(--line); margin-bottom: 1.5rem; }
  .tool-title { font-family: var(--display); font-size: 1.1rem; color: var(--accent-3); text-shadow: 3px 3px 0 var(--accent); margin: 0 0 0.5rem; }
  .tool-sub { color: var(--muted); font-size: 0.95rem; margin: 0; }

  .controls { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1rem; }
  .ctrl-row { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
  .field { display: flex; flex-direction: column; gap: 0.3rem; flex: 1; min-width: 200px; }
  .ctrl-label { font-family: var(--display); font-size: 0.33rem; color: var(--muted); }
  .text-input {
    font-family: var(--display); font-size: 0.4rem;
    background: var(--bg); border: 2px solid var(--line); color: var(--ink);
    padding: 0.4rem 0.6rem; outline: none; letter-spacing: 0.05em;
  }
  .text-input:focus { border-color: var(--accent-3); }
  .color-field { display: flex; align-items: center; gap: 0.4rem; }
  .color-pick { width: 36px; height: 28px; border: 1px solid var(--line); background: none; cursor: pointer; padding: 2px; }
  .slider { width: 80px; accent-color: var(--accent-3); }
  .ctrl-val { font-family: var(--display); font-size: 0.33rem; color: var(--ink); min-width: 1.5rem; }
  .toggle-row { display: flex; align-items: center; gap: 0.3rem; cursor: pointer; }

  .banner-wrap { margin-bottom: 1rem; overflow: hidden; }
  .banner-canvas { display: block; width: 100%; image-rendering: pixelated; border: 2px solid var(--line); box-shadow: 4px 4px 0 #000; }

  .about { margin-top: 1.5rem; }
  .about-title { font-family: var(--display); font-size: 0.5rem; color: var(--accent-3); margin: 0 0 0.75rem; }
  .about p { font-size: 0.9rem; color: var(--muted); line-height: 1.6; margin: 0 0 0.5rem; }
</style>
