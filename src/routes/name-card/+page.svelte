<script lang="ts">
  import { onMount } from 'svelte';
  import { track } from '$lib/analytics';

  let name = $state('JAMES HAN');
  let title = $state('INDIE DEVELOPER');
  let handle = $state('@jamesdev');
  let theme = $state<'dark' | 'green' | 'amber' | 'blue' | 'pink'>('dark');
  let canvas: HTMLCanvasElement;

  const THEMES = {
    dark:  { bg: '#0a0a0f', panel: '#111118', accent: '#00ff88', accent2: '#4488ff', text: '#c2c3c7', border: '#222233' },
    green: { bg: '#0f380f', panel: '#1a4a1a', accent: '#9bbc0f', accent2: '#8bac0f', text: '#e0f8d0', border: '#306230' },
    amber: { bg: '#1a0f00', panel: '#2a1800', accent: '#ff8800', accent2: '#ffaa44', text: '#ffe0aa', border: '#663300' },
    blue:  { bg: '#000820', panel: '#001030', accent: '#4488ff', accent2: '#00ccff', text: '#aaddff', border: '#002266' },
    pink:  { bg: '#1a0010', panel: '#280018', accent: '#ff44aa', accent2: '#ff88cc', text: '#ffddee', border: '#660033' },
  };

  function generate() {
    if (!canvas) return;
    const W = 400, H = 200;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    const t = THEMES[theme];

    // bg
    ctx.fillStyle = t.bg;
    ctx.fillRect(0, 0, W, H);

    // scanlines
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    for (let y = 0; y < H; y += 2) ctx.fillRect(0, y, W, 1);

    // border
    ctx.strokeStyle = t.border;
    ctx.lineWidth = 2;
    ctx.strokeRect(8, 8, W - 16, H - 16);

    // accent bars
    ctx.fillStyle = t.accent;
    ctx.fillRect(8, 8, 4, H - 16);
    ctx.fillRect(W - 12, 8, 4, H - 16);

    // pixel avatar area (left box)
    ctx.fillStyle = t.panel;
    ctx.fillRect(24, 24, 80, 80);
    ctx.strokeStyle = t.border;
    ctx.lineWidth = 1;
    ctx.strokeRect(24, 24, 80, 80);

    // draw a simple pixel face
    const face = [
      [0,0,1,1,1,1,0,0],
      [0,1,1,1,1,1,1,0],
      [1,1,0,1,1,0,1,1],
      [1,1,1,1,1,1,1,1],
      [1,1,0,1,1,0,1,1],
      [1,1,1,0,0,1,1,1],
      [0,1,1,1,1,1,1,0],
      [0,0,1,1,1,1,0,0],
    ];
    const px = 10;
    for (let fy = 0; fy < 8; fy++) {
      for (let fx = 0; fx < 8; fx++) {
        if (face[fy][fx]) {
          ctx.fillStyle = t.accent;
          ctx.fillRect(24 + fx * px, 24 + fy * px, px - 1, px - 1);
        }
      }
    }

    // name
    ctx.font = 'bold 18px "Press Start 2P", monospace';
    ctx.fillStyle = t.accent;
    ctx.textAlign = 'left';
    const nameText = name.toUpperCase().slice(0, 16);
    ctx.fillText(nameText, 120, 60);

    // title
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillStyle = t.accent2;
    ctx.fillText(title.toUpperCase().slice(0, 22), 120, 82);

    // handle
    ctx.font = '9px "Press Start 2P", monospace';
    ctx.fillStyle = t.text;
    ctx.fillText(handle.slice(0, 20), 120, 102);

    // divider
    ctx.fillStyle = t.border;
    ctx.fillRect(120, 112, 260, 1);

    // bottom stats row (decorative)
    const stats = ['HP 255/255', 'LVL MAX', 'XP ████'];
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.fillStyle = t.text;
    stats.forEach((s, i) => ctx.fillText(s, 120 + i * 90, 130));

    // corner markers
    ctx.fillStyle = t.accent;
    [[8,8],[W-12,8],[8,H-12],[W-12,H-12]].forEach(([x,y]) => ctx.fillRect(x, y, 4, 4));

    track('tool_use', { tool: 'name-card', theme });
  }

  function download() {
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `pixel-card-${name.toLowerCase().replace(/\s+/g,'-')}.png`;
    a.click();
    track('export', { tool: 'name-card', type: 'png' });
  }

  $effect(() => { name; title; handle; theme; generate(); });
  onMount(() => generate());
</script>

<svelte:head>
  <title>Pixel Name Card Maker — 8-bit Profile Card Generator | Station255</title>
  <meta name="description" content="Generate a pixel art name card or profile card. Pick a retro theme, add your name and handle, download as PNG. Perfect for Discord, GitHub, and social media." />
</svelte:head>

<div class="tool-header">
  <h1 class="tool-title">PIXEL NAME CARD</h1>
  <p class="tool-sub">Your profile as an 8-bit business card. Add your name, title, and handle — download and use it anywhere.</p>
</div>

<div class="workspace">
  <div class="controls panel">
    <label class="field">
      <span class="ctrl-label">Name</span>
      <input type="text" bind:value={name} maxlength="16" class="ctrl-input" placeholder="YOUR NAME" />
    </label>
    <label class="field">
      <span class="ctrl-label">Title</span>
      <input type="text" bind:value={title} maxlength="22" class="ctrl-input" placeholder="WHAT YOU DO" />
    </label>
    <label class="field">
      <span class="ctrl-label">Handle</span>
      <input type="text" bind:value={handle} maxlength="20" class="ctrl-input" placeholder="@yourhandle" />
    </label>
    <div class="field">
      <span class="ctrl-label">Theme</span>
      <div class="theme-row">
        {#each Object.keys(THEMES) as t}
          <button
            class="theme-btn"
            class:active={theme === t}
            style="border-color:{THEMES[t as keyof typeof THEMES].accent}"
            onclick={() => theme = t as typeof theme}
          >{t}</button>
        {/each}
      </div>
    </div>
    <button class="btn" onclick={download}>↓ Download PNG</button>
  </div>

  <div class="preview-area">
    <canvas bind:this={canvas} class="card-canvas" role="img" aria-label="Generated pixel name card"></canvas>
  </div>
</div>

<div class="panel about">
  <h2 class="about-title">About Pixel Name Cards</h2>
  <p>A 400×200 pixel card in the style of a JRPG character stat screen. The pixel avatar on the left is a generic face placeholder — unique to the style, not to you. Use the downloaded PNG as a Discord banner, a GitHub README header, or anywhere else you want to show your online identity with retro flair.</p>
</div>

<style>
  .tool-header { padding: 1.25rem 0 1rem; border-bottom: 2px solid var(--line); margin-bottom: 1.5rem; }
  .tool-title { font-family: var(--display); font-size: 1.1rem; color: var(--accent-3); text-shadow: 3px 3px 0 var(--accent); margin: 0 0 0.5rem; }
  .tool-sub { color: var(--muted); font-size: 0.95rem; margin: 0; }

  .workspace { display: grid; grid-template-columns: 280px 1fr; gap: 1.25rem; margin-bottom: 1.5rem; align-items: start; }

  .controls { display: flex; flex-direction: column; gap: 0.75rem; }
  .field { display: flex; flex-direction: column; gap: 0.3rem; }
  .ctrl-label { font-family: var(--display); font-size: 0.33rem; color: var(--muted); }
  .ctrl-input {
    font-family: var(--display); font-size: 0.38rem; letter-spacing: 0.04em;
    background: var(--bg); border: 2px solid var(--line); color: var(--ink);
    padding: 0.35rem 0.5rem; outline: none;
  }
  .ctrl-input:focus { border-color: var(--accent-3); }
  .theme-row { display: flex; flex-wrap: wrap; gap: 0.4rem; }
  .theme-btn {
    font-size: 0.78rem; background: none; border: 1px solid var(--line); color: var(--muted);
    padding: 0.25rem 0.5rem; cursor: pointer; text-transform: capitalize;
    transition: opacity 0.08s;
  }
  .theme-btn.active { opacity: 1; font-weight: bold; color: var(--ink); }
  .theme-btn:not(.active) { opacity: 0.5; }

  .preview-area { display: flex; align-items: flex-start; }
  .card-canvas { display: block; max-width: 100%; border: 2px solid var(--line); box-shadow: 4px 4px 0 #000; image-rendering: pixelated; }

  .about { margin-top: 1.5rem; }
  .about-title { font-family: var(--display); font-size: 0.5rem; color: var(--accent-3); margin: 0 0 0.75rem; }
  .about p { font-size: 0.9rem; color: var(--muted); line-height: 1.6; margin: 0 0 0.5rem; }

  @media (max-width: 600px) { .workspace { grid-template-columns: 1fr; } }
</style>
