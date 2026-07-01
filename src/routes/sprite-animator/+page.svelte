<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { track } from '$lib/analytics';

  let frames = $state<{ url: string; name: string }[]>([]);
  let current = $state(0);
  let fps = $state(8);
  let playing = $state(false);
  let canvas: HTMLCanvasElement;
  let timer: ReturnType<typeof setInterval> | null = null;

  function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }

  function startTimer() {
    stopTimer();
    if (!playing || frames.length < 2) return;
    timer = setInterval(() => {
      current = (current + 1) % frames.length;
      drawFrame();
    }, 1000 / fps);
  }

  function drawFrame() {
    if (!canvas || !frames[current]) return;
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, img.width, img.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = frames[current].url;
  }

  $effect(() => { void current; void frames.length; if (canvas) drawFrame(); });
  $effect(() => { void playing; void fps; startTimer(); });

  onMount(() => drawFrame());
  onDestroy(stopTimer);

  function loadFiles(files: FileList) {
    const newFrames = Array.from(files)
      .filter(f => f.type.startsWith('image/'))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(f => ({ url: URL.createObjectURL(f), name: f.name }));
    frames = [...frames, ...newFrames];
    if (frames.length > 0) { current = 0; drawFrame(); }
    track('tool_use', { tool: 'sprite-animator', frameCount: frames.length });
  }

  function onInput(e: Event) {
    const fl = (e.target as HTMLInputElement).files;
    if (fl) loadFiles(fl);
  }
  function onDrop(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer?.files) loadFiles(e.dataTransfer.files);
  }
  function removeFrame(i: number) {
    URL.revokeObjectURL(frames[i].url);
    frames = frames.filter((_, idx) => idx !== i);
    current = Math.min(current, Math.max(0, frames.length - 1));
  }
  function clearAll() { frames.forEach(f => URL.revokeObjectURL(f.url)); frames = []; current = 0; }
  function moveFrame(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= frames.length) return;
    const arr = [...frames]; [arr[i], arr[j]] = [arr[j], arr[i]]; frames = arr;
  }
  function downloadSpritesheet() {
    if (!frames.length) return;
    const imgs: HTMLImageElement[] = [];
    let loaded = 0;
    frames.forEach((f, i) => {
      const img = new Image();
      img.onload = () => {
        imgs[i] = img; loaded++;
        if (loaded === frames.length) buildSheet(imgs);
      };
      img.src = f.url;
    });
  }
  function buildSheet(imgs: HTMLImageElement[]) {
    const W = Math.max(...imgs.map(i => i.width));
    const H = Math.max(...imgs.map(i => i.height));
    const c = document.createElement('canvas');
    c.width = W * imgs.length; c.height = H;
    const ctx = c.getContext('2d')!;
    imgs.forEach((img, i) => ctx.drawImage(img, i * W, 0, W, H));
    const a = document.createElement('a');
    a.href = c.toDataURL('image/png');
    a.download = 'spritesheet.png'; a.click();
    track('export', { tool: 'sprite-animator', frames: imgs.length });
  }
</script>

<svelte:head>
  <title>Sprite Animator — preview frame animation and export spritesheet | Station255</title>
  <meta name="description" content="Upload sprite frames and preview them as a looping animation. Adjust FPS, reorder frames, and export a spritesheet PNG. Free, runs in your browser." />
</svelte:head>

<h1>Sprite Animator</h1>
<p class="lead">Upload frames. Watch them loop. Export as a spritesheet.</p>

<div class="drop"
  role="button" tabindex="0"
  ondragover={(e) => e.preventDefault()} ondrop={onDrop}>
  <label class="btn">
    Add frames
    <input type="file" accept="image/*" multiple onchange={onInput} hidden />
  </label>
  <span class="hint">PNG / JPG — sorted by filename · drag &amp; drop</span>
</div>

{#if frames.length > 0}
  <div class="workspace">
    <div class="preview-col">
      <canvas bind:this={canvas} class="anim-canvas"></canvas>
      <div class="playbar">
        <button class="btn" onclick={() => { playing = !playing; }}>{playing ? '⏸ Pause' : '▶ Play'}</button>
        <label class="ctrl">
          <span>FPS: <strong>{fps}</strong></span>
          <input type="range" min="1" max="30" bind:value={fps} />
        </label>
        <span class="frame-counter">{current + 1} / {frames.length}</span>
      </div>
    </div>

    <div class="frame-list">
      {#each frames as frame, i}
        <div class="frame-item" class:active={i === current} onclick={() => { current = i; playing = false; }}>
          <img src={frame.url} alt={frame.name} class="thumb" />
          <span class="frame-name">{i + 1}</span>
          <div class="frame-actions">
            <button onclick={(e) => { e.stopPropagation(); moveFrame(i, -1); }} disabled={i === 0}>↑</button>
            <button onclick={(e) => { e.stopPropagation(); moveFrame(i, 1); }} disabled={i === frames.length - 1}>↓</button>
            <button onclick={(e) => { e.stopPropagation(); removeFrame(i); }}>✕</button>
          </div>
        </div>
      {/each}
    </div>
  </div>

  <div class="actions">
    <button class="btn" onclick={downloadSpritesheet}>Download spritesheet</button>
    <button class="btn secondary" onclick={clearAll}>Clear all</button>
  </div>
{:else}
  <canvas bind:this={canvas} style="display:none"></canvas>
{/if}

<section class="seo panel">
  <h2>About Sprite Animator</h2>
  <p>Upload multiple PNG or JPG frames — they're sorted by filename automatically, so naming them <code>walk_01.png</code>, <code>walk_02.png</code> etc. keeps them in order. Drag to reorder. Preview the animation at any FPS from 1 to 30.</p>
  <p>The spritesheet export packs all frames side by side in a single PNG, sized to the largest frame. Import that directly into Godot, Unity, Aseprite, or any game engine that reads horizontal spritesheets.</p>
  <div class="see-also">
    <span class="see-label">Related:</span>
    <a href="/sprite-slicer">Sprite Slicer</a>
    <a href="/upscale">Pixel Upscaler</a>
    <a href="/sprite-painter">Sprite Painter</a>
  </div>
</section>

<style>
  .lead { color: var(--muted); font-size: 1.2rem; margin: 0 0 1rem; }
  .drop { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; border: 2px dashed var(--line); padding: 1.25rem; margin-bottom: 1.25rem; }
  .hint { color: var(--muted); }
  .workspace { display: flex; gap: 1.5rem; flex-wrap: wrap; margin-bottom: 1rem; }
  .preview-col { display: flex; flex-direction: column; gap: 0.75rem; }
  .anim-canvas { border: 2px solid var(--line); image-rendering: pixelated; max-width: 320px; max-height: 320px; }
  .playbar { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
  .ctrl { display: flex; flex-direction: column; gap: 0.2rem; font-size: 1rem; }
  .frame-counter { color: var(--muted); font-size: 0.9rem; }
  .frame-list { display: flex; flex-direction: column; gap: 0.3rem; max-height: 380px; overflow-y: auto; }
  .frame-item {
    display: flex; align-items: center; gap: 0.5rem;
    padding: 0.3rem 0.5rem; cursor: pointer;
    border: 2px solid var(--line); background: var(--bg-2);
    transition: border-color 0.08s;
  }
  .frame-item:hover { border-color: var(--accent-2); }
  .frame-item.active { border-color: var(--accent-3); }
  .thumb { width: 36px; height: 36px; object-fit: contain; image-rendering: pixelated; }
  .frame-name { font-size: 0.9rem; color: var(--muted); min-width: 1.5rem; }
  .frame-actions { display: flex; gap: 0.2rem; margin-left: auto; }
  .frame-actions button { background: none; border: 1px solid var(--line); color: var(--muted); padding: 0.1rem 0.3rem; cursor: pointer; font-size: 0.85rem; }
  .frame-actions button:hover { border-color: var(--accent); color: var(--ink); }
  .frame-actions button:disabled { opacity: 0.3; cursor: default; }
  .actions { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 1.5rem; }
</style>
