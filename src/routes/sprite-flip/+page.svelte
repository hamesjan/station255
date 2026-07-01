<script lang="ts">
  import { track } from '$lib/analytics';

  let imgUrl = $state<string | null>(null);
  let outputUrl = $state<string | null>(null);
  let fileName = $state('sprite');
  let flipH = $state(false);
  let flipV = $state(false);
  let rotation = $state(0);
  let scale = $state(1);
  let dropActive = $state(false);

  function loadFile(file: File) {
    if (!file.type.startsWith('image/')) return;
    fileName = file.name.replace(/\.[^.]+$/, '');
    const reader = new FileReader();
    reader.onload = (e) => {
      imgUrl = e.target!.result as string;
      apply();
    };
    reader.readAsDataURL(file);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault(); dropActive = false;
    const f = e.dataTransfer?.files[0];
    if (f) loadFile(f);
  }

  $effect(() => { flipH; flipV; rotation; scale; if (imgUrl) apply(); });

  function apply() {
    if (!imgUrl) return;
    const img = new Image();
    img.onload = () => {
      const W = img.naturalWidth;
      const H = img.naturalHeight;
      const rad = (rotation * Math.PI) / 180;
      const cos = Math.abs(Math.cos(rad));
      const sin = Math.abs(Math.sin(rad));
      const outW = Math.round(W * cos + H * sin) * scale;
      const outH = Math.round(W * sin + H * cos) * scale;

      const off = document.createElement('canvas');
      off.width = outW; off.height = outH;
      const ctx = off.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;

      ctx.translate(outW / 2, outH / 2);
      ctx.rotate(rad);
      ctx.scale(flipH ? -scale : scale, flipV ? -scale : scale);
      ctx.drawImage(img, -W / 2, -H / 2);

      outputUrl = off.toDataURL('image/png');
      track('tool_use', { tool: 'sprite-flip', flipH, flipV, rotation, scale });
    };
    img.src = imgUrl;
  }

  function download() {
    if (!outputUrl) return;
    const a = document.createElement('a');
    a.href = outputUrl;
    a.download = `${fileName}-transformed.png`;
    a.click();
    track('export', { tool: 'sprite-flip', type: 'png' });
  }
</script>

<svelte:head>
  <title>Sprite Flip & Rotate Tool — Mirror, Rotate, Scale Pixel Art | Station255</title>
  <meta name="description" content="Flip, mirror, rotate and scale pixel art sprites online. Horizontal flip, vertical flip, 90° rotation. Download as PNG. Free, no upload, no sign-up." />
</svelte:head>

<div class="tool-header">
  <h1 class="tool-title">SPRITE FLIP</h1>
  <p class="tool-sub">Mirror, rotate, and scale any sprite or pixel art image. No quality loss — every pixel stays sharp.</p>
</div>

<div class="workspace">
  {#if !imgUrl}
    <label
      class="drop-zone"
      class:active={dropActive}
      ondragover={(e) => { e.preventDefault(); dropActive = true; }}
      ondragleave={() => dropActive = false}
      ondrop={onDrop}
    >
      <span class="drop-icon">🖼</span>
      <span class="drop-main">Drop a sprite or image here</span>
      <span class="drop-sub">or click to browse · PNG, GIF, WebP</span>
      <input type="file" accept="image/*" onchange={(e) => { const f=(e.target as HTMLInputElement).files?.[0]; if(f) loadFile(f); }} class="file-input" />
    </label>
  {:else}
    <div class="controls panel">
      <div class="ctrl-group">
        <span class="ctrl-label">Flip</span>
        <button class="toggle-btn" class:on={flipH} onclick={() => flipH = !flipH}>↔ Horizontal</button>
        <button class="toggle-btn" class:on={flipV} onclick={() => flipV = !flipV}>↕ Vertical</button>
      </div>
      <div class="ctrl-group">
        <span class="ctrl-label">Rotate</span>
        {#each [0, 90, 180, 270] as r}
          <button class="rot-btn" class:active={rotation === r} onclick={() => rotation = r}>{r}°</button>
        {/each}
        <label class="ctrl-inline">
          <input type="range" min="0" max="359" step="1" bind:value={rotation} class="slider" />
          <span class="ctrl-val">{rotation}°</span>
        </label>
      </div>
      <div class="ctrl-group">
        <span class="ctrl-label">Scale</span>
        {#each [1, 2, 3, 4] as s}
          <button class="rot-btn" class:active={scale === s} onclick={() => scale = s}>{s}×</button>
        {/each}
      </div>
      <div class="ctrl-group">
        <button class="btn" onclick={download} disabled={!outputUrl}>↓ Download PNG</button>
        <button class="btn secondary" onclick={() => { imgUrl = null; outputUrl = null; }}>← New image</button>
      </div>
    </div>

    <div class="preview-row">
      <div class="preview-box">
        <span class="preview-label">Original</span>
        <img src={imgUrl} alt="Original sprite" class="preview-img" style="image-rendering:pixelated" />
      </div>
      <div class="arrows">→</div>
      <div class="preview-box">
        <span class="preview-label">Transformed</span>
        {#if outputUrl}
          <img src={outputUrl} alt="Transformed sprite" class="preview-img" style="image-rendering:pixelated" />
        {/if}
      </div>
    </div>
  {/if}
</div>

<div class="panel about">
  <h2 class="about-title">About Sprite Flip</h2>
  <p>When making pixel art games, you often only need to draw a character walking in one direction — then flip it horizontally to get the other direction. This tool does that instantly. Scale up for presentation, rotate for isometric tile work, or flip both axes to rotate 180°.</p>
  <p>The output is a lossless PNG with no anti-aliasing or blurring — every pixel stays exactly where it should be.</p>
</div>

<style>
  .tool-header { padding: 1.25rem 0 1rem; border-bottom: 2px solid var(--line); margin-bottom: 1.5rem; }
  .tool-title { font-family: var(--display); font-size: 1.1rem; color: var(--accent-3); text-shadow: 3px 3px 0 var(--accent); margin: 0 0 0.5rem; }
  .tool-sub { color: var(--muted); font-size: 0.95rem; margin: 0; }

  .workspace { margin-bottom: 1.5rem; }
  .drop-zone {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 0.5rem; border: 2px dashed var(--line); padding: 3rem 1rem; cursor: pointer; text-align: center;
    transition: border-color 0.12s, background 0.12s;
  }
  .drop-zone:hover, .drop-zone.active { border-color: var(--accent-3); background: rgba(255,255,255,0.02); }
  .drop-icon { font-size: 2.5rem; }
  .drop-main { font-family: var(--display); font-size: 0.55rem; color: var(--ink); }
  .drop-sub { font-size: 0.85rem; color: var(--muted); }
  .file-input { display: none; }

  .controls { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1rem; }
  .ctrl-group { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
  .ctrl-label { font-family: var(--display); font-size: 0.33rem; color: var(--muted); min-width: 3.5rem; }
  .ctrl-val { font-family: var(--display); font-size: 0.33rem; color: var(--ink); min-width: 2rem; }
  .ctrl-inline { display: flex; align-items: center; gap: 0.4rem; }
  .slider { width: 100px; accent-color: var(--accent-3); }
  .toggle-btn {
    font-size: 0.82rem; background: none; border: 1px solid var(--line); color: var(--muted);
    padding: 0.25rem 0.6rem; cursor: pointer; transition: border-color 0.08s, color 0.08s, background 0.08s;
  }
  .toggle-btn.on { background: var(--accent); border-color: var(--accent); color: #000; }
  .rot-btn {
    font-family: var(--display); font-size: 0.33rem; background: none; border: 1px solid var(--line);
    color: var(--muted); padding: 0.25rem 0.5rem; cursor: pointer; transition: border-color 0.08s, color 0.08s;
  }
  .rot-btn:hover { color: var(--ink); }
  .rot-btn.active { border-color: var(--accent-3); color: var(--accent-3); }

  .preview-row { display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; }
  .preview-box { display: flex; flex-direction: column; gap: 0.4rem; }
  .preview-label { font-family: var(--display); font-size: 0.33rem; color: var(--muted); }
  .preview-img { max-width: 260px; max-height: 260px; width: auto; height: auto; display: block; border: 2px solid var(--line); }
  .arrows { font-size: 1.5rem; color: var(--muted); flex-shrink: 0; }

  .about { margin-top: 1.5rem; }
  .about-title { font-family: var(--display); font-size: 0.5rem; color: var(--accent-3); margin: 0 0 0.75rem; }
  .about p { font-size: 0.9rem; color: var(--muted); line-height: 1.6; margin: 0 0 0.5rem; }
</style>
