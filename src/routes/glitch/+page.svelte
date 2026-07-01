<script lang="ts">
  import { track } from '$lib/analytics';

  let imgUrl    = $state<string | null>(null);
  let outputUrl = $state<string | null>(null);
  let fileName  = $state('');
  let processing = $state(false);
  let lastImage: HTMLImageElement | null = null;

  let channelShift = $state(0.4);
  let scanBreak    = $state(0.3);
  let pixelSort    = $state(0.2);
  let seed         = $state(7);

  function lcg(s: number) {
    let st = s | 0;
    return () => { st = (Math.imul(1664525, st) + 1013904223) >>> 0; return st / 0x100000000; };
  }

  function applyGlitch(img: HTMLImageElement): string {
    const W = img.width, H = img.height;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0);
    const id = ctx.getImageData(0, 0, W, H);
    const src = new Uint8ClampedArray(id.data);
    const rng = lcg(seed);

    // Channel shift: shift red right, blue left
    const shift = Math.round(channelShift * W * 0.1);
    if (shift > 0) {
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4;
          const ri = (y * W + Math.min(W-1, x + shift)) * 4;
          const bi = (y * W + Math.max(0, x - shift)) * 4;
          id.data[i]   = src[ri];   // red from right
          id.data[i+2] = src[bi+2]; // blue from left
        }
      }
    }

    // Random scanline breaks: shift some rows sideways
    if (scanBreak > 0) {
      for (let y = 0; y < H; y++) {
        if (rng() < scanBreak * 0.08) {
          const dx = Math.round((rng() * 2 - 1) * W * 0.15 * scanBreak);
          if (!dx) continue;
          const row = new Uint8ClampedArray(W * 4);
          for (let x = 0; x < W; x++) {
            const si = (y * W + x) * 4;
            row[x*4] = id.data[si]; row[x*4+1] = id.data[si+1];
            row[x*4+2] = id.data[si+2]; row[x*4+3] = id.data[si+3];
          }
          for (let x = 0; x < W; x++) {
            const sx = Math.max(0, Math.min(W-1, x - dx));
            const di = (y * W + x) * 4;
            id.data[di] = row[sx*4]; id.data[di+1] = row[sx*4+1];
            id.data[di+2] = row[sx*4+2]; id.data[di+3] = row[sx*4+3];
          }
        }
      }
    }

    // Pixel sort: sort pixels in vertical bands by brightness
    if (pixelSort > 0) {
      const bandW = Math.max(4, Math.round(W * 0.04));
      for (let bx = 0; bx < W; bx += bandW) {
        if (rng() > pixelSort * 0.6) continue;
        const startY = Math.floor(rng() * H * 0.8);
        const endY   = Math.min(H, startY + Math.floor(rng() * H * 0.3 * pixelSort + 4));
        for (let x = bx; x < Math.min(W, bx + bandW); x++) {
          const col: [number, number, number, number, number][] = [];
          for (let y = startY; y < endY; y++) {
            const i = (y * W + x) * 4;
            const lum = id.data[i]*0.299 + id.data[i+1]*0.587 + id.data[i+2]*0.114;
            col.push([lum, id.data[i], id.data[i+1], id.data[i+2], id.data[i+3]]);
          }
          col.sort((a, b) => a[0] - b[0]);
          for (let j = 0; j < col.length; j++) {
            const y = startY + j;
            const i = (y * W + x) * 4;
            id.data[i] = col[j][1]; id.data[i+1] = col[j][2];
            id.data[i+2] = col[j][3]; id.data[i+3] = col[j][4];
          }
        }
      }
    }

    ctx.putImageData(id, 0, 0);
    return c.toDataURL('image/png');
  }

  function process() {
    if (!lastImage) return;
    processing = true;
    requestAnimationFrame(() => {
      outputUrl = applyGlitch(lastImage!);
      processing = false;
      track('tool_use', { tool: 'glitch', channelShift, scanBreak, pixelSort });
    });
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

  $effect(() => {
    void channelShift; void scanBreak; void pixelSort; void seed;
    if (lastImage) process();
  });

  function randomize() { seed = Math.floor(Math.random() * 999); }

  function download() {
    if (!outputUrl) return;
    const a = document.createElement('a');
    a.href = outputUrl;
    a.download = (fileName.replace(/\.[^.]+$/,'') || 'glitch') + '-glitched.png';
    a.click();
    track('export', { tool: 'glitch', type: 'png' });
  }
</script>

<svelte:head>
  <title>Glitch Art Generator — channel shift and pixel sort effects | Station255</title>
  <meta name="description" content="Apply glitch art effects to any image: channel shift, scanline breaks, and pixel sorting. Download the result as PNG. Free, runs in your browser." />
</svelte:head>

<h1>Glitch Art</h1>
<p class="lead">Channel shifts, pixel sorting, and general image chaos.</p>

<div class="drop"
  role="button" tabindex="0"
  ondragover={(e) => e.preventDefault()} ondrop={onDrop}>
  <label class="btn">
    Choose image
    <input type="file" accept="image/*" onchange={onInput} hidden />
  </label>
  <span class="hint">…or drag &amp; drop</span>
</div>

<div class="controls">
  <label class="ctrl">
    <span>Channel shift: <strong>{Math.round(channelShift*100)}%</strong></span>
    <input type="range" min="0" max="1" step="0.05" bind:value={channelShift} />
  </label>
  <label class="ctrl">
    <span>Scan breaks: <strong>{Math.round(scanBreak*100)}%</strong></span>
    <input type="range" min="0" max="1" step="0.05" bind:value={scanBreak} />
  </label>
  <label class="ctrl">
    <span>Pixel sort: <strong>{Math.round(pixelSort*100)}%</strong></span>
    <input type="range" min="0" max="1" step="0.05" bind:value={pixelSort} />
  </label>
  <button class="btn secondary" onclick={randomize}>Randomize</button>
  {#if outputUrl}
    <button class="btn" onclick={download}>Download PNG</button>
  {/if}
</div>

{#if processing}<p class="status">Processing…</p>{/if}

<div class="preview-row">
  {#if imgUrl}
    <div class="preview-box">
      <span class="label">Original</span>
      <img src={imgUrl} alt="original" class="preview-img" />
    </div>
  {/if}
  {#if outputUrl && !processing}
    <div class="preview-box">
      <span class="label">Glitched</span>
      <img src={outputUrl} alt="glitched" class="preview-img" />
    </div>
  {/if}
</div>

<section class="seo panel">
  <h2>About Glitch Art</h2>
  <p><strong>Channel shift</strong> offsets the red and blue color channels in opposite directions — that classic RGB-fringe look from corrupted video signals.</p>
  <p><strong>Scan breaks</strong> randomly shifts horizontal lines sideways — like a VHS tape slipping on playback.</p>
  <p><strong>Pixel sort</strong> sorts pixels within random columns by brightness, creating those dramatic streaking columns you see in digital glitch aesthetics.</p>
  <p>Hit <strong>Randomize</strong> to get a new arrangement of the same intensities. Every seed produces a different result.</p>
  <div class="see-also">
    <span class="see-label">Related:</span>
    <a href="/vhs">VHS Effect</a>
    <a href="/crt">CRT-ify</a>
    <a href="/noise">Pixel Noise</a>
  </div>
</section>

<style>
  .lead { color: var(--muted); font-size: 1.2rem; margin: 0 0 1rem; }
  .drop { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; border: 2px dashed var(--line); padding: 1.25rem; margin-bottom: 1rem; }
  .hint { color: var(--muted); }
  .controls { display: flex; align-items: flex-end; flex-wrap: wrap; gap: 1.25rem; margin-bottom: 1rem; }
  .ctrl { display: flex; flex-direction: column; gap: 0.3rem; font-size: 1rem; }
  .status { color: var(--accent-3); animation: blink 1s steps(2) infinite; }
  @keyframes blink { 50% { opacity: 0.4; } }
  .preview-row { display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.5rem; }
  .preview-box { flex: 1; min-width: 200px; }
  .label { display: block; font-size: 0.9rem; color: var(--muted); margin-bottom: 0.3rem; }
  .preview-img { max-width: 100%; border: 2px solid var(--line); display: block; }
</style>
