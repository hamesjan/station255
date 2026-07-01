<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { track } from '$lib/analytics';

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let raf = 0;
  let running = $state(true);

  let fgColor = $state('#00ff44');
  let bgColor = $state('#000000');
  let fontSize = $state(14);
  let speed = $state(40);
  let density = $state(1.0);
  let charset = $state('matrix');

  const CHARSETS: Record<string, string> = {
    matrix: 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ﾊﾋｼｱｳｴｵﾔﾖｻﾊﾟﾗﾛﾜﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜ',
    ascii: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*',
    binary: '01010101010101010101',
    hex: '0123456789ABCDEF',
    braille: '⠋⠌⠍⠎⠏⠐⠑⠒⠓⠔⠕⠖⠗⠘⠙⠚⠛⠜⠝⠞⠟⠠⠡⠢⠣⠤⠥⠦⠧⠨⠩⠪⠫⠬⠭⠮⠯',
  };

  let drops: number[] = [];
  let cols = 0;

  function init() {
    cols = Math.floor(canvas.width / fontSize);
    drops = Array.from({ length: cols }, () => Math.random() * -50);
  }

  function hexToRgb(hex: string) {
    const r = parseInt(hex.slice(1,3), 16);
    const g = parseInt(hex.slice(3,5), 16);
    const b = parseInt(hex.slice(5,7), 16);
    return `${r},${g},${b}`;
  }

  let lastFrame = 0;
  function draw(ts: number) {
    if (ts - lastFrame < 1000 / speed) {
      raf = requestAnimationFrame(draw);
      return;
    }
    lastFrame = ts;

    const chars = CHARSETS[charset] || CHARSETS.matrix;

    ctx.fillStyle = `rgba(${hexToRgb(bgColor)},0.05)`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = `${fontSize}px monospace`;
    ctx.textAlign = 'left';

    for (let i = 0; i < drops.length; i++) {
      if (Math.random() > density * 0.02) continue;
      const ch = chars[Math.floor(Math.random() * chars.length)];
      // bright head
      ctx.fillStyle = `rgba(255,255,255,0.95)`;
      ctx.fillText(ch, i * fontSize, drops[i] * fontSize);

      ctx.fillStyle = fgColor;
      ctx.fillText(chars[Math.floor(Math.random() * chars.length)], i * fontSize, (drops[i] - 1) * fontSize);

      if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
        drops[i] = 0;
      }
      drops[i] += 0.5;
    }

    raf = requestAnimationFrame(draw);
  }

  onMount(() => {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    ctx = canvas.getContext('2d')!;
    init();
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    raf = requestAnimationFrame(draw);
    track('tool_use', { tool: 'matrix' });
  });

  onDestroy(() => { if (typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(raf); });

  $effect(() => {
    fgColor; bgColor; fontSize; charset;
    if (ctx) {
      init();
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  });

  function download() {
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = 'matrix-rain.png';
    a.click();
    track('export', { tool: 'matrix', type: 'png' });
  }
</script>

<svelte:head>
  <title>Matrix Rain Effect — Online Matrix Code Generator | Station255</title>
  <meta name="description" content="Generate the Matrix digital rain effect in your browser. Customize colors, font size, speed and character set. Download as PNG. Free, no install." />
</svelte:head>

<div class="tool-header">
  <h1 class="tool-title">MATRIX RAIN</h1>
  <p class="tool-sub">The digital rain. Customize the colors and characters, then capture a screenshot.</p>
</div>

<div class="controls panel">
  <div class="ctrl-row">
    <label class="color-field">
      <span class="ctrl-label">Rain color</span>
      <input type="color" bind:value={fgColor} class="color-pick" />
    </label>
    <label class="color-field">
      <span class="ctrl-label">Background</span>
      <input type="color" bind:value={bgColor} class="color-pick" />
    </label>
  </div>
  <div class="ctrl-row">
    <label class="ctrl-row">
      <span class="ctrl-label">Font size</span>
      <input type="range" min="8" max="28" step="2" bind:value={fontSize} class="slider" />
      <span class="ctrl-val">{fontSize}px</span>
    </label>
    <label class="ctrl-row">
      <span class="ctrl-label">Speed</span>
      <input type="range" min="5" max="60" step="5" bind:value={speed} class="slider" />
      <span class="ctrl-val">{speed}</span>
    </label>
  </div>
  <div class="ctrl-row">
    <span class="ctrl-label">Characters</span>
    {#each Object.keys(CHARSETS) as c}
      <button class="preset-btn" class:active={charset === c} onclick={() => charset = c}>{c}</button>
    {/each}
  </div>
  <button class="btn" onclick={download}>↓ Download PNG</button>
</div>

<canvas bind:this={canvas} class="matrix-canvas" role="img" aria-label="Matrix rain animation"></canvas>

<div class="panel about">
  <h2 class="about-title">About Matrix Rain</h2>
  <p>The "digital rain" effect from The Matrix (1999) uses columns of cascading Japanese katakana characters mixed with Latin letters and digits. Art director Simon Whiteley said the effect came from scanning his wife's sushi cookbook. The green color represents the phosphor glow of early monochrome CRT monitors.</p>
  <p>Switch to binary, hex, or braille for different aesthetics. The white character at the head of each column is intentionally brighter to suggest the "falling" motion.</p>
</div>

<style>
  .tool-header { padding: 1.25rem 0 1rem; border-bottom: 2px solid var(--line); margin-bottom: 1rem; }
  .tool-title { font-family: var(--display); font-size: 1.1rem; color: var(--accent-3); text-shadow: 3px 3px 0 var(--accent); margin: 0 0 0.5rem; }
  .tool-sub { color: var(--muted); font-size: 0.95rem; margin: 0; }

  .controls { display: flex; flex-direction: column; gap: 0.6rem; margin-bottom: 1rem; }
  .ctrl-row { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
  .ctrl-label { font-family: var(--display); font-size: 0.33rem; color: var(--muted); }
  .ctrl-val { font-family: var(--display); font-size: 0.33rem; color: var(--ink); min-width: 2.5rem; }
  .slider { width: 100px; accent-color: var(--accent-3); }
  .color-field { display: flex; align-items: center; gap: 0.4rem; }
  .color-pick { width: 36px; height: 28px; border: 1px solid var(--line); background: none; cursor: pointer; padding: 2px; }
  .preset-btn {
    font-size: 0.8rem; background: none; border: 1px solid var(--line);
    color: var(--muted); padding: 3px 8px; cursor: pointer; transition: border-color 0.08s, color 0.08s;
  }
  .preset-btn:hover { color: var(--ink); }
  .preset-btn.active { border-color: var(--accent-3); color: var(--accent-3); }

  .matrix-canvas {
    display: block; width: 100%; height: 400px;
    border: 2px solid var(--line); box-shadow: 4px 4px 0 #000;
    margin-bottom: 1rem;
  }

  .about { margin-top: 0.5rem; }
  .about-title { font-family: var(--display); font-size: 0.5rem; color: var(--accent-3); margin: 0 0 0.75rem; }
  .about p { font-size: 0.9rem; color: var(--muted); line-height: 1.6; margin: 0 0 0.5rem; }
</style>
