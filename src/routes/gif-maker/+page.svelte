<script lang="ts">
  import { track } from '$lib/analytics';
  import { encodeGif } from '$lib/gif';

  type Frame = { url: string; img: HTMLImageElement };

  let frames = $state<Frame[]>([]);
  let dropActive = $state(false);
  let delayMs = $state(200);
  let outWidth = $state(480);
  let pixelArt = $state(false);
  let busy = $state(false);
  let error = $state<string | null>(null);
  let gifUrl = $state<string | null>(null);
  let gifSize = $state(0);

  async function addFiles(files: FileList | File[]) {
    error = null;
    const list = [...files].filter((f) => f.type.startsWith('image/'));
    for (const file of list) {
      const url = await new Promise<string>((res) => {
        const r = new FileReader();
        r.onload = (e) => res(e.target!.result as string);
        r.readAsDataURL(file);
      });
      const img = new Image();
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = () => rej();
        img.src = url;
      }).catch(() => {});
      if (img.naturalWidth > 0) frames = [...frames, { url, img }];
    }
    gifUrl = null;
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    dropActive = false;
    if (e.dataTransfer?.files) addFiles(e.dataTransfer.files);
  }
  function onFileInput(e: Event) {
    const files = (e.target as HTMLInputElement).files;
    if (files) addFiles(files);
    (e.target as HTMLInputElement).value = '';
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= frames.length) return;
    const next = [...frames];
    [next[i], next[j]] = [next[j], next[i]];
    frames = next;
    gifUrl = null;
  }
  function remove(i: number) {
    frames = frames.filter((_, k) => k !== i);
    gifUrl = null;
  }

  async function makeGif() {
    if (frames.length < 2) {
      error = 'Add at least 2 images.';
      return;
    }
    error = null;
    busy = true;
    gifUrl = null;
    // Let the UI paint the "encoding…" state before the heavy loop starts.
    await new Promise((r) => setTimeout(r, 30));
    try {
      const first = frames[0].img;
      const w = Math.min(outWidth, first.naturalWidth);
      const h = Math.round((first.naturalHeight / first.naturalWidth) * w);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

      const datas = frames.map((f) => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.imageSmoothingEnabled = !pixelArt;
        // Fit each frame into the first frame's aspect box, centered.
        const s = Math.min(w / f.img.naturalWidth, h / f.img.naturalHeight);
        const fw = f.img.naturalWidth * s;
        const fh = f.img.naturalHeight * s;
        ctx.drawImage(f.img, (w - fw) / 2, (h - fh) / 2, fw, fh);
        return { data: ctx.getImageData(0, 0, w, h) };
      });

      const bytes = encodeGif(datas, delayMs);
      gifSize = bytes.length;
      gifUrl = URL.createObjectURL(new Blob([bytes.buffer as ArrayBuffer], { type: 'image/gif' }));
      track('tool_use', { tool: 'gif-maker', frames: frames.length, delayMs, width: w });
    } catch {
      error = 'Encoding failed. Try fewer or smaller images.';
    } finally {
      busy = false;
    }
  }

  function download() {
    if (!gifUrl) return;
    const a = document.createElement('a');
    a.href = gifUrl;
    a.download = 'animation.gif';
    a.click();
    track('export', { tool: 'gif-maker', type: 'gif', frames: frames.length });
  }

  function fmtSize(n: number): string {
    return n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`;
  }
</script>

<svelte:head>
  <title>GIF Maker — Create Animated GIFs from Images Online Free | Station255</title>
  <meta
    name="description"
    content="Make an animated GIF from your images online, free. Reorder frames, set the speed, and download — the GIF is encoded entirely in your browser, nothing is uploaded."
  />
</svelte:head>

<div class="tool-header">
  <h1 class="tool-title">GIF MAKER</h1>
  <p class="tool-sub">Stack up images, set the speed, get an animated GIF. Encoded from scratch in your browser.</p>
</div>

<div class="workspace">
  <label
    class="drop-zone"
    class:active={dropActive}
    ondragover={(e) => { e.preventDefault(); dropActive = true; }}
    ondragleave={() => { dropActive = false; }}
    ondrop={onDrop}
  >
    <span class="drop-main">{frames.length === 0 ? 'Drop images here' : 'Drop more images'}</span>
    <span class="drop-sub">or click to browse · select multiple · they become frames in order</span>
    <input type="file" accept="image/*" multiple onchange={onFileInput} class="file-input" />
  </label>

  {#if frames.length > 0}
    <div class="frame-list">
      {#each frames as frame, i}
        <div class="frame-cell">
          <img src={frame.url} alt="Frame {i + 1}" class="frame-img" />
          <div class="frame-ops">
            <button class="op" onclick={() => move(i, -1)} disabled={i === 0} aria-label="Move earlier">←</button>
            <span class="frame-n">{i + 1}</span>
            <button class="op" onclick={() => move(i, 1)} disabled={i === frames.length - 1} aria-label="Move later">→</button>
            <button class="op del" onclick={() => remove(i)} aria-label="Remove frame">×</button>
          </div>
        </div>
      {/each}
    </div>

    <div class="controls panel">
      <label class="ctrl-row">
        <span class="ctrl-label">Frame delay</span>
        <input type="range" min="30" max="1000" step="10" bind:value={delayMs} class="slider" />
        <span class="ctrl-val">{delayMs}ms ({(1000 / delayMs).toFixed(1)} fps)</span>
      </label>
      <label class="ctrl-row">
        <span class="ctrl-label">Max width</span>
        <input type="range" min="120" max="800" step="20" bind:value={outWidth} class="slider" />
        <span class="ctrl-val">{outWidth}px</span>
      </label>
      <label class="ctrl-row">
        <input type="checkbox" bind:checked={pixelArt} />
        <span class="ctrl-note">Pixel art mode (nearest-neighbor scaling)</span>
      </label>
      <div class="ctrl-actions">
        <button class="btn" onclick={makeGif} disabled={busy}>{busy ? 'encoding…' : '▶ Make GIF'}</button>
        {#if gifUrl}
          <button class="btn" onclick={download}>↓ Download ({fmtSize(gifSize)})</button>
        {/if}
        <button class="btn secondary" onclick={() => { frames = []; gifUrl = null; }}>Clear all</button>
      </div>
      {#if error}<p class="error">{error}</p>{/if}
    </div>

    {#if gifUrl}
      <div class="result">
        <span class="result-label">Result (loops forever)</span>
        <img src={gifUrl} alt="Animated GIF result" class="result-img" class:crisp={pixelArt} />
      </div>
    {/if}
  {/if}
</div>

<section class="seo panel">
  <h2>About GIF Maker</h2>
  <p>
    This tool writes a real <strong>GIF89a</strong> file from scratch — median-cut color
    quantization down to 256 colors, LZW compression, looping extension and all — using nothing
    but JavaScript in your browser. No upload, no watermark, no server.
  </p>
  <h3>How do I use it?</h3>
  <p>
    Select or drop multiple images (they become frames in the order shown — use the arrows to
    reorder), pick a frame delay, and hit Make GIF. 100–200ms per frame is a natural animation
    speed; 500ms+ works well for slideshows.
  </p>
  <h3>Why is my GIF's file size big?</h3>
  <p>
    GIF is an old format — every frame is stored as an indexed bitmap. Lower the max width or use
    fewer frames to shrink the file. Pixel art compresses extremely well; photos less so.
  </p>
  <h3>Can I go the other way?</h3>
  <p>Yes — <a href="/gif-frames">GIF Frame Extractor</a> splits an existing GIF back into PNG frames, which you can edit and re-assemble here.</p>
  <div class="see-also">
    <span class="see-label">Related:</span>
    <a href="/gif-frames">GIF Frame Extractor</a>
    <a href="/sprite-animator">Sprite Animator</a>
    <a href="/pixelate">Pixelate</a>
  </div>
</section>

<style>
  .tool-header { padding: 1.25rem 0 1rem; border-bottom: 2px solid var(--line); margin-bottom: 1.5rem; }
  .tool-title { font-family: var(--display); font-size: 1.1rem; color: var(--accent-3); text-shadow: 3px 3px 0 var(--accent); margin: 0 0 0.5rem; }
  .tool-sub { color: var(--muted); font-size: 0.95rem; margin: 0; }

  .drop-zone {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 0.5rem; border: 2px dashed var(--line); padding: 2rem 1rem; cursor: pointer;
    text-align: center; transition: border-color 0.12s, background 0.12s; margin-bottom: 1rem;
  }
  .drop-zone:hover, .drop-zone.active { border-color: var(--accent-3); background: rgba(255,255,255,0.03); }
  .drop-main { font-family: var(--display); font-size: 0.6rem; color: var(--ink); }
  .drop-sub { font-size: 0.85rem; color: var(--muted); }
  .file-input { display: none; }

  .frame-list { display: flex; gap: 0.6rem; flex-wrap: wrap; margin-bottom: 1rem; }
  .frame-cell { border: 1px solid var(--line); background: var(--panel); padding: 0.4rem; display: flex; flex-direction: column; gap: 0.3rem; }
  .frame-img { width: 72px; height: 72px; object-fit: contain; display: block; }
  .frame-ops { display: flex; align-items: center; gap: 0.2rem; justify-content: center; }
  .frame-n { font-size: 0.7rem; color: var(--muted); min-width: 1.2rem; text-align: center; }
  .op {
    background: none; border: 1px solid var(--line); color: var(--muted); cursor: pointer;
    font-size: 0.75rem; width: 1.4rem; height: 1.4rem; line-height: 1;
  }
  .op:hover:not(:disabled) { color: var(--ink); border-color: var(--accent-3); }
  .op:disabled { opacity: 0.3; cursor: default; }
  .op.del:hover { color: var(--accent); border-color: var(--accent); }

  .controls { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1rem; }
  .ctrl-row { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
  .ctrl-label { font-family: var(--display); font-size: 0.4rem; color: var(--accent-3); min-width: 6rem; }
  .ctrl-val { font-family: var(--display); font-size: 0.4rem; color: var(--ink); }
  .ctrl-note { font-size: 0.85rem; color: var(--muted); }
  .slider { flex: 1; min-width: 140px; accent-color: var(--accent-3); }
  .ctrl-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
  .error { color: var(--accent); margin: 0; font-size: 0.85rem; }

  .result { display: flex; flex-direction: column; gap: 0.4rem; }
  .result-label { font-family: var(--display); font-size: 0.35rem; color: var(--muted); }
  .result-img { max-width: 100%; border: 2px solid var(--line); align-self: flex-start; }
  .result-img.crisp { image-rendering: pixelated; }
</style>
