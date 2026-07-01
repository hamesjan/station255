<script lang="ts">
  import { onMount } from 'svelte';
  import { track } from '$lib/analytics';

  let imgUrl = $state<string | null>(null);
  let outputUrl = $state<string | null>(null);
  let fileName = $state('image');
  let blockSize = $state(8);
  let processing = $state(false);
  let dropActive = $state(false);
  let canvas: HTMLCanvasElement;

  function loadFile(file: File) {
    if (!file.type.startsWith('image/')) return;
    fileName = file.name.replace(/\.[^.]+$/, '');
    const reader = new FileReader();
    reader.onload = (e) => {
      imgUrl = e.target!.result as string;
      outputUrl = null;
    };
    reader.readAsDataURL(file);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    dropActive = false;
    const f = e.dataTransfer?.files[0];
    if (f) loadFile(f);
  }

  function onFileInput(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (f) loadFile(f);
  }

  $effect(() => {
    if (imgUrl) process();
  });

  $effect(() => {
    blockSize; // reactive trigger
    if (imgUrl) process();
  });

  function process() {
    if (!imgUrl || processing) return;
    processing = true;
    const img = new Image();
    img.onload = () => {
      const W = img.naturalWidth;
      const H = img.naturalHeight;
      const offscreen = document.createElement('canvas');
      offscreen.width = W;
      offscreen.height = H;
      const ctx = offscreen.getContext('2d')!;

      // Draw at tiny size then scale up (pixelate trick)
      const bw = Math.ceil(W / blockSize);
      const bh = Math.ceil(H / blockSize);
      const small = document.createElement('canvas');
      small.width = bw;
      small.height = bh;
      const sc = small.getContext('2d')!;
      sc.imageSmoothingEnabled = false;
      sc.drawImage(img, 0, 0, bw, bh);

      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(small, 0, 0, W, H);

      outputUrl = offscreen.toDataURL('image/png');
      processing = false;
      track('tool_use', { tool: 'pixelate', blockSize });
    };
    img.src = imgUrl;
  }

  function download() {
    if (!outputUrl) return;
    const a = document.createElement('a');
    a.href = outputUrl;
    a.download = `${fileName}-pixel${blockSize}.png`;
    a.click();
    track('export', { tool: 'pixelate', type: 'png' });
  }
</script>

<svelte:head>
  <title>Pixelate Image Online — Free Pixel Art Generator | Station255</title>
  <meta name="description" content="Pixelate any photo or image online for free. Adjust block size from 2–64px. Download instantly as PNG. No upload, no sign-up — runs in your browser." />
</svelte:head>

<div class="tool-header">
  <h1 class="tool-title">PIXELATE</h1>
  <p class="tool-sub">Turn any photo into chunky pixel art. Drag the slider — the blocks get bigger, the art gets more retro.</p>
</div>

<div class="workspace">
  {#if !imgUrl}
    <label
      class="drop-zone"
      class:active={dropActive}
      ondragover={(e) => { e.preventDefault(); dropActive = true; }}
      ondragleave={() => { dropActive = false; }}
      ondrop={onDrop}
    >
      <span class="drop-icon">🖼</span>
      <span class="drop-main">Drop an image here</span>
      <span class="drop-sub">or click to browse · PNG, JPG, WebP, GIF</span>
      <input type="file" accept="image/*" onchange={onFileInput} class="file-input" />
    </label>
  {:else}
    <div class="controls panel">
      <label class="ctrl-row">
        <span class="ctrl-label">Block size</span>
        <input type="range" min="2" max="64" step="1" bind:value={blockSize} class="slider" />
        <span class="ctrl-val">{blockSize}px</span>
      </label>
      <div class="ctrl-actions">
        <button class="btn" onclick={download} disabled={!outputUrl || processing}>
          {processing ? 'processing…' : '↓ Download PNG'}
        </button>
        <button class="btn secondary" onclick={() => { imgUrl = null; outputUrl = null; }}>← New image</button>
      </div>
    </div>

    <div class="preview-row">
      <div class="preview-box">
        <span class="preview-label">Original</span>
        <img src={imgUrl} alt="Original upload" class="preview-img" />
      </div>
      <div class="preview-box">
        <span class="preview-label">Pixelated ({blockSize}px blocks)</span>
        {#if outputUrl}
          <img src={outputUrl} alt="Pixelated result" class="preview-img" style="image-rendering:pixelated" />
        {:else}
          <div class="preview-ph">processing…</div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<div class="panel about">
  <h2 class="about-title">About Pixelate</h2>
  <p>This tool divides your image into square blocks and replaces each block with the average color of its pixels — the same technique used to censor faces, create retro game art, and generate pixel-style profile pictures.</p>
  <p>Use small values (2–4px) for a subtle mosaic effect. Go to 16–32px for classic video game sprites. Max out at 64px for abstract minimal art. Your image never leaves your browser.</p>
  <h3>Common uses</h3>
  <ul>
    <li>Make a photo look like it came from a retro game</li>
    <li>Create pixel art style profile pictures and avatars</li>
    <li>Censor or anonymize parts of an image</li>
    <li>Generate abstract art from photos</li>
  </ul>
</div>

<style>
  .tool-header { padding: 1.25rem 0 1rem; border-bottom: 2px solid var(--line); margin-bottom: 1.5rem; }
  .tool-title { font-family: var(--display); font-size: 1.1rem; color: var(--accent-3); text-shadow: 3px 3px 0 var(--accent); margin: 0 0 0.5rem; }
  .tool-sub { color: var(--muted); font-size: 0.95rem; margin: 0; }

  .workspace { margin-bottom: 1.5rem; }

  .drop-zone {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 0.5rem; border: 2px dashed var(--line); padding: 3rem 1rem; cursor: pointer;
    text-align: center; transition: border-color 0.12s, background 0.12s;
  }
  .drop-zone:hover, .drop-zone.active { border-color: var(--accent-3); background: rgba(255,255,255,0.03); }
  .drop-icon { font-size: 2.5rem; }
  .drop-main { font-family: var(--display); font-size: 0.6rem; color: var(--ink); }
  .drop-sub { font-size: 0.85rem; color: var(--muted); }
  .file-input { display: none; }

  .controls { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1rem; }
  .ctrl-row { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
  .ctrl-label { font-family: var(--display); font-size: 0.4rem; color: var(--accent-3); min-width: 6rem; }
  .ctrl-val { font-family: var(--display); font-size: 0.4rem; color: var(--ink); min-width: 3rem; }
  .slider { flex: 1; min-width: 140px; accent-color: var(--accent-3); }
  .ctrl-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }

  .preview-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .preview-box { display: flex; flex-direction: column; gap: 0.4rem; }
  .preview-label { font-family: var(--display); font-size: 0.35rem; color: var(--muted); }
  .preview-img { width: 100%; height: auto; display: block; border: 2px solid var(--line); }
  .preview-ph { border: 2px solid var(--line); padding: 2rem; text-align: center; color: var(--muted); font-size: 0.85rem; }

  .about { margin-top: 1.5rem; }
  .about-title { font-family: var(--display); font-size: 0.5rem; color: var(--accent-3); margin: 0 0 0.75rem; }
  .about p, .about li { font-size: 0.9rem; color: var(--muted); line-height: 1.6; margin: 0 0 0.5rem; }
  .about h3 { font-family: var(--display); font-size: 0.4rem; color: var(--ink); margin: 0.75rem 0 0.4rem; }
  .about ul { padding-left: 1.25rem; margin: 0; }

  @media (max-width: 580px) {
    .preview-row { grid-template-columns: 1fr; }
  }
</style>
