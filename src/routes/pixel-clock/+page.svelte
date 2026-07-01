<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { track } from '$lib/analytics';

  let canvas: HTMLCanvasElement;
  let timer: ReturnType<typeof setInterval>;
  let fgColor = $state('#ffd23f');
  let bgColor = $state('#0d0b1a');
  let showSeconds = $state(true);
  let scale = $state(6);

  // 5×7 pixel font for digits 0-9 and colon
  const GLYPHS: Record<string, number[][]> = {
    '0': [[1,1,1],[1,0,1],[1,0,1],[1,0,1],[1,1,1]],
    '1': [[0,1,0],[1,1,0],[0,1,0],[0,1,0],[1,1,1]],
    '2': [[1,1,1],[0,0,1],[1,1,1],[1,0,0],[1,1,1]],
    '3': [[1,1,1],[0,0,1],[0,1,1],[0,0,1],[1,1,1]],
    '4': [[1,0,1],[1,0,1],[1,1,1],[0,0,1],[0,0,1]],
    '5': [[1,1,1],[1,0,0],[1,1,1],[0,0,1],[1,1,1]],
    '6': [[1,1,1],[1,0,0],[1,1,1],[1,0,1],[1,1,1]],
    '7': [[1,1,1],[0,0,1],[0,1,0],[0,1,0],[0,1,0]],
    '8': [[1,1,1],[1,0,1],[1,1,1],[1,0,1],[1,1,1]],
    '9': [[1,1,1],[1,0,1],[1,1,1],[0,0,1],[1,1,1]],
    ':': [[0],[1],[0],[1],[0]],
  };

  function draw() {
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const s = scale;
    const now = new Date();
    const h = String(now.getHours()).padStart(2,'0');
    const m = String(now.getMinutes()).padStart(2,'0');
    const sec = String(now.getSeconds()).padStart(2,'0');
    const chars = showSeconds ? [...h,':', ...m,':', ...sec] : [...h,':', ...m];

    // measure total width
    const gap = 1;
    let totalW = 0;
    for (const c of chars) {
      const g = GLYPHS[c] ?? GLYPHS['0'];
      totalW += g[0].length * s + gap * s;
    }
    const totalH = 5 * s;

    canvas.width = totalW + s * 2;
    canvas.height = totalH + s * 2;

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = fgColor;

    let cx = s;
    for (const c of chars) {
      const g = GLYPHS[c] ?? GLYPHS['0'];
      for (let row = 0; row < g.length; row++) {
        for (let col = 0; col < g[row].length; col++) {
          if (g[row][col]) ctx.fillRect(cx + col*s, s + row*s, s, s);
        }
      }
      cx += g[0].length * s + gap * s;
    }
  }

  onMount(() => {
    draw();
    timer = setInterval(draw, 1000);
    track('tool_use', { tool: 'pixel-clock' });
  });
  onDestroy(() => clearInterval(timer));

  $effect(() => {
    void fgColor; void bgColor; void showSeconds; void scale;
    if (canvas) draw();
  });

  function download() {
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = 'pixel-clock.png';
    a.click();
    track('export', { tool: 'pixel-clock', type: 'png' });
  }
</script>

<svelte:head>
  <title>Pixel Art Clock — live retro pixel clock | Station255</title>
  <meta name="description" content="A live clock drawn in pixel art using a 5×7 dot-matrix font. Changes every second. Download the current time as a PNG. Free, runs in your browser." />
</svelte:head>

<h1>Pixel Clock</h1>
<p class="lead">A live clock drawn in pixel art. Updates every second.</p>

<div class="controls">
  <label class="pick">
    <span>Digits</span>
    <input type="color" bind:value={fgColor} />
  </label>
  <label class="pick">
    <span>Background</span>
    <input type="color" bind:value={bgColor} />
  </label>
  <label class="ctrl">
    <span>Scale: <strong>{scale}×</strong></span>
    <input type="range" min="2" max="16" bind:value={scale} />
  </label>
  <label class="toggle">
    <input type="checkbox" bind:checked={showSeconds} />
    <span>Show seconds</span>
  </label>
</div>

<div class="preview-wrap">
  <canvas bind:this={canvas} class="clock-canvas"></canvas>
</div>

<div class="actions">
  <button class="btn" onclick={download}>Download PNG</button>
</div>

<section class="seo panel">
  <h2>About Pixel Clock</h2>
  <p>Renders the current time using a hand-crafted 3×5 dot-matrix pixel font — the same style used in LED scoreboards and retro game HUDs. Updates live every second. Great for wallpapers, stream overlays, or desktop widgets.</p>
  <p>The PNG download captures whatever the clock shows at the moment you click — useful for retro-aesthetic graphics where you want a specific time displayed.</p>
  <div class="see-also">
    <span class="see-label">Related:</span>
    <a href="/pixel-text">Pixel Text</a>
    <a href="/bootscreen">Boot Screen</a>
    <a href="/badge">Badge Maker</a>
  </div>
</section>

<style>
  .lead { color: var(--muted); font-size: 1.2rem; margin: 0 0 1rem; }
  .controls { display: flex; flex-wrap: wrap; gap: 1.25rem; align-items: flex-end; margin-bottom: 1.25rem; }
  .pick { display: flex; flex-direction: column; gap: 0.3rem; font-size: 1rem; }
  .pick input[type=color] { width: 48px; height: 32px; border: 2px solid var(--line); background: none; cursor: pointer; padding: 2px; }
  .ctrl { display: flex; flex-direction: column; gap: 0.3rem; font-size: 1rem; }
  .toggle { display: flex; align-items: center; gap: 0.5rem; font-size: 1rem; cursor: pointer; }
  .preview-wrap { border: 2px solid var(--line); display: inline-block; margin-bottom: 1rem; }
  .clock-canvas { display: block; image-rendering: pixelated; }
  .actions { margin-bottom: 1.5rem; }
</style>
