<script lang="ts">
  import { track } from '$lib/analytics';

  type Frame = 'gameboy' | 'gba' | 'nes' | 'snes';
  const FRAMES: { id: Frame; name: string }[] = [
    { id: 'gameboy', name: 'Game Boy' },
    { id: 'gba',     name: 'GBA' },
    { id: 'nes',     name: 'NES' },
    { id: 'snes',    name: 'SNES' },
  ];

  let frame    = $state<Frame>('gameboy');
  let imgUrl   = $state<string | null>(null);
  let outputUrl = $state<string | null>(null);
  let fileName  = $state('');
  let lastImage: HTMLImageElement | null = null;

  function buildGameBoy(img: HTMLImageElement): HTMLCanvasElement {
    const SW = 160, SH = 144; // screen ratio
    const PAD = 24, TOP = 60, BOT = 100, SIDE = 28;
    const W = SW + SIDE*2, H = SH + TOP + BOT;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d')!;
    // Body
    ctx.fillStyle = '#c8c8c8';
    ctx.beginPath(); ctx.roundRect(0, 0, W, H - 20, [8,8,0,0]); ctx.fill();
    ctx.fillStyle = '#c8c8c8';
    ctx.beginPath(); ctx.roundRect(8, H - 20, W - 16, 20, [0,0,12,12]); ctx.fill();
    // Screen bezel
    ctx.fillStyle = '#444';
    ctx.fillRect(SIDE - 6, TOP - 10, SW + 12, SH + 20);
    // Screen
    const sx = SIDE, sy = TOP;
    ctx.save(); ctx.beginPath(); ctx.rect(sx, sy, SW, SH); ctx.clip();
    const scale = Math.max(SW / img.width, SH / img.height);
    const dw = img.width * scale, dh = img.height * scale;
    ctx.drawImage(img, sx + (SW-dw)/2, sy + (SH-dh)/2, dw, dh);
    ctx.restore();
    // Nintendo text
    ctx.fillStyle = '#888'; ctx.font = '7px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('NINTENDO', W/2, TOP - 16);
    // Buttons
    ctx.fillStyle = '#990033';
    ctx.beginPath(); ctx.arc(W - 30, TOP + SH + 30, 8, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(W - 48, TOP + SH + 22, 8, 0, Math.PI*2); ctx.fill();
    // D-pad
    ctx.fillStyle = '#555';
    ctx.fillRect(28, TOP + SH + 22, 12, 36); ctx.fillRect(20, TOP + SH + 30, 28, 12);
    // Start/Select
    ctx.fillStyle = '#888';
    ctx.beginPath(); ctx.ellipse(W/2 - 14, TOP + SH + 46, 10, 5, -0.2, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(W/2 + 6, TOP + SH + 40, 10, 5, -0.2, 0, Math.PI*2); ctx.fill();
    return c;
  }

  function buildGBA(img: HTMLImageElement): HTMLCanvasElement {
    const SW = 240, SH = 160;
    const W = SW + 80, H = SH + 60;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d')!;
    // Body (landscape)
    ctx.fillStyle = '#6644aa';
    ctx.beginPath(); ctx.roundRect(0, 0, W, H, 20); ctx.fill();
    // Screen bezel
    const sx = 40, sy = 10;
    ctx.fillStyle = '#222'; ctx.fillRect(sx - 4, sy - 4, SW + 8, SH + 8);
    ctx.save(); ctx.beginPath(); ctx.rect(sx, sy, SW, SH); ctx.clip();
    const scale = Math.max(SW / img.width, SH / img.height);
    const dw = img.width * scale, dh = img.height * scale;
    ctx.drawImage(img, sx + (SW-dw)/2, sy + (SH-dh)/2, dw, dh);
    ctx.restore();
    // A/B buttons
    ctx.fillStyle = '#cc3366';
    ctx.beginPath(); ctx.arc(W - 20, H/2 + 14, 9, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#3366cc';
    ctx.beginPath(); ctx.arc(W - 36, H/2 + 2, 9, 0, Math.PI*2); ctx.fill();
    // D-pad
    ctx.fillStyle = '#333';
    ctx.fillRect(14, H/2, 10, 30); ctx.fillRect(8, H/2 + 10, 22, 10);
    return c;
  }

  function buildNES(img: HTMLImageElement): HTMLCanvasElement {
    const SW = 256, SH = 224;
    const W = SW + 40, H = SH + 80;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d')!;
    // Controller body
    ctx.fillStyle = '#aaaaaa';
    ctx.beginPath(); ctx.roundRect(0, 0, W, H, 10); ctx.fill();
    // Screen area (TV-style)
    const sx = 20, sy = 12;
    ctx.fillStyle = '#111'; ctx.fillRect(sx - 2, sy - 2, SW + 4, SH + 4);
    ctx.save(); ctx.beginPath(); ctx.rect(sx, sy, SW, SH); ctx.clip();
    const scale = Math.max(SW / img.width, SH / img.height);
    const dw = img.width * scale, dh = img.height * scale;
    ctx.drawImage(img, sx + (SW-dw)/2, sy + (SH-dh)/2, dw, dh);
    ctx.restore();
    // NES red stripe
    ctx.fillStyle = '#cc1111';
    ctx.fillRect(0, H - 30, W, 6);
    // Buttons
    ctx.fillStyle = '#880000';
    ctx.beginPath(); ctx.ellipse(W - 32, H - 14, 12, 7, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(W - 58, H - 18, 12, 7, 0, 0, Math.PI*2); ctx.fill();
    // D-pad
    ctx.fillStyle = '#333';
    ctx.fillRect(28, H - 24, 8, 24); ctx.fillRect(20, H - 16, 24, 8);
    // Start/Select
    ctx.fillStyle = '#999';
    ctx.beginPath(); ctx.ellipse(W/2 - 10, H - 14, 10, 5, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(W/2 + 10, H - 14, 10, 5, 0, 0, Math.PI*2); ctx.fill();
    return c;
  }

  function buildSNES(img: HTMLImageElement): HTMLCanvasElement {
    const SW = 256, SH = 224;
    const W = SW + 80, H = SH + 80;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d')!;
    // Body
    ctx.fillStyle = '#9988bb';
    ctx.beginPath(); ctx.roundRect(0, 0, W, H, 12); ctx.fill();
    // Dark center bar
    ctx.fillStyle = '#7766aa';
    ctx.fillRect(0, H - 50, W, 50);
    // Screen
    const sx = 40, sy = 12;
    ctx.fillStyle = '#111'; ctx.fillRect(sx - 3, sy - 3, SW + 6, SH + 6);
    ctx.save(); ctx.beginPath(); ctx.rect(sx, sy, SW, SH); ctx.clip();
    const scale = Math.max(SW / img.width, SH / img.height);
    const dw = img.width * scale, dh = img.height * scale;
    ctx.drawImage(img, sx + (SW-dw)/2, sy + (SH-dh)/2, dw, dh);
    ctx.restore();
    // ABXY buttons
    const colors = ['#ffcc00','#33aa33','#aa2233','#2233aa'];
    const bpos = [[W-22,H-42],[W-36,H-56],[W-50,H-42],[W-36,H-28]];
    colors.forEach((col, i) => {
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(bpos[i][0], bpos[i][1], 9, 0, Math.PI*2); ctx.fill();
    });
    // D-pad
    ctx.fillStyle = '#333';
    ctx.fillRect(20, H-50, 10, 30); ctx.fillRect(12, H-38, 26, 10);
    // L/R shoulders
    ctx.fillStyle = '#8877aa';
    ctx.fillRect(0, 0, 30, 12); ctx.fillRect(W-30, 0, 30, 12);
    return c;
  }

  function process() {
    if (!lastImage) return;
    let frameCanvas: HTMLCanvasElement;
    switch (frame) {
      case 'gameboy': frameCanvas = buildGameBoy(lastImage); break;
      case 'gba':     frameCanvas = buildGBA(lastImage);     break;
      case 'nes':     frameCanvas = buildNES(lastImage);      break;
      case 'snes':    frameCanvas = buildSNES(lastImage);     break;
    }
    outputUrl = frameCanvas.toDataURL('image/png');
    track('tool_use', { tool: 'console-frame', frame });
  }

  function loadFile(file: File) {
    fileName = file.name;
    const url = URL.createObjectURL(file);
    if (imgUrl) URL.revokeObjectURL(imgUrl);
    imgUrl = url;
    const img = new Image();
    img.onload = () => { lastImage = img; process(); };
    img.src = url;
  }

  function onInput(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (f) loadFile(f);
  }
  function onDrop(e: DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer?.files?.[0];
    if (f?.type.startsWith('image/')) loadFile(f);
  }

  $effect(() => { void frame; if (lastImage) process(); });

  function download() {
    if (!outputUrl) return;
    const a = document.createElement('a');
    a.href = outputUrl;
    a.download = (fileName.replace(/\.[^.]+$/,'') || 'image') + `-${frame}.png`;
    a.click();
    track('export', { tool: 'console-frame', frame });
  }
</script>

<svelte:head>
  <title>Console Frame — wrap images in Game Boy, GBA, NES, SNES frames | Station255</title>
  <meta name="description" content="Wrap any image in a retro console frame: Game Boy, GBA, NES, or SNES. Download as PNG. Great for screenshots, thumbnails, and social media posts. Free, in your browser." />
</svelte:head>

<h1>Console Frame</h1>
<p class="lead">Wrap any image in a retro console frame.</p>

<div class="frame-select">
  {#each FRAMES as f}
    <button class="frame-btn" class:active={frame === f.id} onclick={() => { frame = f.id; }}>
      {f.name}
    </button>
  {/each}
</div>

<div class="drop"
  role="button" tabindex="0"
  ondragover={(e) => e.preventDefault()} ondrop={onDrop}>
  <label class="btn">
    Choose image
    <input type="file" accept="image/*" onchange={onInput} hidden />
  </label>
  <span class="hint">…or drag &amp; drop a PNG / JPG</span>
</div>

{#if outputUrl}
  <div class="output-wrap">
    <img src={outputUrl} alt="framed" class="output-img" />
  </div>
  <button class="btn" onclick={download}>Download PNG</button>
{/if}

<section class="seo panel">
  <h2>About Console Frame</h2>
  <p>Wraps any image inside a hand-drawn pixel-style console frame. Great for sharing retro-style screenshots, game dev posts, or just making ordinary photos look like they belong in a retro lineup.</p>
  <p>The image is scaled to fill the screen area of the selected console, then the frame is composited on top. Everything runs in your browser — your image never leaves your device.</p>
  <div class="see-also">
    <span class="see-label">Related:</span>
    <a href="/bootscreen">Boot Screen</a>
    <a href="/crt">CRT-ify</a>
    <a href="/demake">Demake</a>
  </div>
</section>

<style>
  .lead { color: var(--muted); font-size: 1.2rem; margin: 0 0 1rem; }
  .frame-select { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1rem; }
  .frame-btn {
    background: var(--panel); border: 2px solid var(--line);
    color: var(--muted); padding: 0.35rem 0.8rem; cursor: pointer;
    font-size: 0.9rem; transition: border-color 0.08s, color 0.08s;
  }
  .frame-btn:hover { border-color: var(--accent-2); color: var(--ink); }
  .frame-btn.active { border-color: var(--accent-3); color: var(--accent-3); }
  .drop { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; border: 2px dashed var(--line); padding: 1.25rem; margin-bottom: 1.5rem; }
  .hint { color: var(--muted); }
  .output-wrap { margin-bottom: 1rem; }
  .output-img { max-width: 100%; border: 2px solid var(--line); display: block; image-rendering: pixelated; }
</style>
