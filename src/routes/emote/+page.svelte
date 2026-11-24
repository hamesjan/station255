<script lang="ts">
  import { track } from '$lib/analytics';

  const SETS = [
    { id: 'twitch', label: 'Twitch emote', sizes: [28, 56, 112] },
    { id: 'twitch-badge', label: 'Twitch badge', sizes: [18, 36, 72] },
    { id: 'discord', label: 'Discord emoji', sizes: [128] },
    { id: 'slack', label: 'Slack emoji', sizes: [128] },
  ] as const;

  let imgUrl = $state<string | null>(null);
  let fileName = $state('emote');
  let dropActive = $state(false);
  let pixelArt = $state(false);
  let previews = $state<{ size: number; url: string }[]>([]);

  function loadFile(file: File) {
    if (!file.type.startsWith('image/')) return;
    fileName = file.name.replace(/\.[^.]+$/, '') || 'emote';
    const reader = new FileReader();
    reader.onload = (e) => {
      imgUrl = e.target!.result as string;
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

  function renderSize(img: HTMLImageElement, size: number): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = !pixelArt;
    // Center-crop the source to a square, then scale down.
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = (img.naturalWidth - side) / 2;
    const sy = (img.naturalHeight - side) / 2;
    ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
    return c;
  }

  $effect(() => {
    if (!imgUrl) {
      previews = [];
      return;
    }
    pixelArt; // reactive trigger
    const img = new Image();
    img.onload = () => {
      const sizes = [...new Set(SETS.flatMap((s) => [...s.sizes]))].sort((a, b) => b - a);
      previews = sizes.map((size) => ({ size, url: renderSize(img, size).toDataURL() }));
    };
    img.src = imgUrl;
  });

  function downloadSet(setId: string) {
    const set = SETS.find((s) => s.id === setId)!;
    set.sizes.forEach((size, i) => {
      const p = previews.find((v) => v.size === size);
      if (!p) return;
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = p.url;
        a.download = `${fileName}_${size}x${size}.png`;
        a.click();
      }, i * 150);
    });
    track('tool_use', { tool: 'emote', set: setId });
    track('export', { tool: 'emote', type: setId });
  }
</script>

<svelte:head>
  <title>Twitch & Discord Emote Resizer — Free Emote Maker Sizes | Station255</title>
  <meta
    name="description"
    content="Resize any image to every Twitch emote size (28x28, 56x56, 112x112), Twitch badge size, and Discord/Slack emoji size (128x128) at once. Free, in-browser, transparency kept."
  />
</svelte:head>

<div class="tool-header">
  <h1 class="tool-title">EMOTE RESIZER</h1>
  <p class="tool-sub">One image in — every Twitch, Discord, and Slack emote size out. Square-cropped, transparency kept.</p>
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
      <span class="drop-main">Drop your emote art here</span>
      <span class="drop-sub">or click to browse · PNG with transparency works best</span>
      <input type="file" accept="image/*" onchange={onFileInput} class="file-input" />
    </label>
  {:else}
    <div class="controls panel">
      <label class="ctrl-row">
        <input type="checkbox" bind:checked={pixelArt} />
        <span class="ctrl-note">Pixel art mode (nearest-neighbor, keeps pixels sharp)</span>
      </label>
      <div class="ctrl-actions">
        {#each SETS as set}
          <button class="btn" onclick={() => downloadSet(set.id)}>
            ↓ {set.label} ({set.sizes.join('/')})
          </button>
        {/each}
        <button class="btn secondary" onclick={() => { imgUrl = null; }}>← New image</button>
      </div>
    </div>

    <p class="section-label">Preview at real size — on dark and light backgrounds</p>
    <div class="preview-rows">
      {#each ['dark', 'light'] as bg}
        <div class="preview-row {bg}">
          {#each previews as p}
            <div class="preview-cell">
              <img src={p.url} alt="{p.size}px emote preview" width={p.size} height={p.size} class:crisp={pixelArt} />
              <span class="preview-size">{p.size}</span>
            </div>
          {/each}
        </div>
      {/each}
    </div>
  {/if}
</div>

<section class="seo panel">
  <h2>About Emote Resizer</h2>
  <p>
    Twitch and Discord each want emotes at exact pixel sizes. This tool center-crops your image
    to a square and exports it at every required size in one click — processed entirely in your
    browser, with PNG transparency preserved.
  </p>
  <h3>What sizes does each platform need?</h3>
  <p>
    <strong>Twitch emotes:</strong> 28×28, 56×56, and 112×112 (all three uploaded together).
    <strong>Twitch sub badges:</strong> 18×18, 36×36, 72×72.
    <strong>Discord emoji:</strong> up to 128×128 (Discord scales it down in chat).
    <strong>Slack:</strong> 128×128, under 128KB.
  </p>
  <h3>Tips for emotes that read well</h3>
  <p>
    Emotes render tiny in chat — bold shapes, thick outlines, and high contrast survive the
    shrink; fine detail doesn't. Preview the 28px version above on both backgrounds before
    uploading. For that classic chunky look, run your art through
    <a href="/pixelate">Pixelate</a> or add an outline with <a href="/sticker">Sticker Maker</a> first.
  </p>
  <div class="see-also">
    <span class="see-label">Related:</span>
    <a href="/sticker">Sticker Maker</a>
    <a href="/pixelate">Pixelate</a>
    <a href="/png-to-ico">PNG to ICO</a>
  </div>
</section>

<style>
  .tool-header { padding: 1.25rem 0 1rem; border-bottom: 2px solid var(--line); margin-bottom: 1.5rem; }
  .tool-title { font-family: var(--display); font-size: 1.1rem; color: var(--accent-3); text-shadow: 3px 3px 0 var(--accent); margin: 0 0 0.5rem; }
  .tool-sub { color: var(--muted); font-size: 0.95rem; margin: 0; }

  .drop-zone {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 0.5rem; border: 2px dashed var(--line); padding: 3rem 1rem; cursor: pointer;
    text-align: center; transition: border-color 0.12s, background 0.12s;
  }
  .drop-zone:hover, .drop-zone.active { border-color: var(--accent-3); background: rgba(255,255,255,0.03); }
  .drop-main { font-family: var(--display); font-size: 0.6rem; color: var(--ink); }
  .drop-sub { font-size: 0.85rem; color: var(--muted); }
  .file-input { display: none; }

  .controls { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1rem; }
  .ctrl-row { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
  .ctrl-note { font-size: 0.85rem; color: var(--muted); }
  .ctrl-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }

  .section-label { font-family: var(--display); font-size: 0.4rem; color: var(--muted); margin: 1rem 0 0.5rem; }
  .preview-rows { display: flex; flex-direction: column; gap: 0.75rem; }
  .preview-row { display: flex; gap: 1.25rem; align-items: flex-end; flex-wrap: wrap; padding: 1rem; border: 1px solid var(--line); }
  .preview-row.dark { background: #18181b; }
  .preview-row.light { background: #f4f4f5; }
  .preview-cell { display: flex; flex-direction: column; align-items: center; gap: 0.3rem; }
  .preview-cell img.crisp { image-rendering: pixelated; }
  .preview-row.dark .preview-size { color: #888; }
  .preview-row.light .preview-size { color: #666; }
  .preview-size { font-size: 0.7rem; }
</style>
