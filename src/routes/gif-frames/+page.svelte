<script lang="ts">
  import { onMount } from 'svelte';
  import { track } from '$lib/analytics';

  type Frame = { canvas: HTMLCanvasElement; url: string; durationMs: number };

  let supported = $state<boolean | null>(null);
  let frames = $state<Frame[]>([]);
  let fileName = $state('gif');
  let busy = $state(false);
  let error = $state<string | null>(null);

  onMount(async () => {
    try {
      if (typeof ImageDecoder === 'undefined') { supported = false; return; }
      supported = await ImageDecoder.isTypeSupported('image/gif');
    } catch {
      supported = false;
    }
  });

  async function handleFile(file: File) {
    error = null;
    frames.forEach((f) => URL.revokeObjectURL(f.url));
    frames = [];
    busy = true;
    fileName = file.name.replace(/\.[^.]+$/, '');
    let decoder: ImageDecoder | null = null;
    try {
      const data = await file.arrayBuffer();
      decoder = new ImageDecoder({ data, type: 'image/gif' });
      await decoder.tracks.ready;
      await decoder.completed;
      const track_ = decoder.tracks.selectedTrack;
      const count = track_?.frameCount ?? 0;
      const out: Frame[] = [];
      for (let i = 0; i < count; i++) {
        const { image } = await decoder.decode({ frameIndex: i });
        try {
          const c = document.createElement('canvas');
          c.width = image.displayWidth;
          c.height = image.displayHeight;
          const ctx = c.getContext('2d')!;
          ctx.drawImage(image, 0, 0);
          out.push({ canvas: c, url: c.toDataURL(), durationMs: (image.duration ?? 0) / 1000 });
        } finally {
          image.close();
        }
      }
      frames = out;
      track('tool_use', { tool: 'gif-frames', frames: out.length });
    } catch (err) {
      error = 'Could not decode this GIF. It may be corrupt or an unsupported variant.';
      console.error(err);
    } finally {
      decoder?.close();
      busy = false;
    }
  }

  function onInput(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (f) handleFile(f);
  }
  function onDrop(e: DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer?.files[0];
    if (f?.type === 'image/gif') handleFile(f);
  }

  function downloadStrip() {
    if (frames.length === 0) return;
    const w = Math.max(...frames.map((f) => f.canvas.width));
    const h = Math.max(...frames.map((f) => f.canvas.height));
    const cols = Math.ceil(Math.sqrt(frames.length));
    const rows = Math.ceil(frames.length / cols);
    const c = document.createElement('canvas');
    c.width = w * cols;
    c.height = h * rows;
    const ctx = c.getContext('2d')!;
    frames.forEach((f, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      ctx.drawImage(f.canvas, col * w, row * h);
    });
    const a = document.createElement('a');
    a.href = c.toDataURL('image/png');
    a.download = `${fileName}_frames.png`;
    a.click();
    track('export', { tool: 'gif-frames', type: 'strip', count: frames.length });
  }

  function downloadIndividually() {
    frames.forEach((f, i) => {
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = f.url;
        a.download = `${fileName}_${String(i).padStart(3, '0')}.png`;
        a.click();
      }, i * 100);
    });
    track('export', { tool: 'gif-frames', type: 'individual', count: frames.length });
  }
</script>

<svelte:head>
  <title>GIF Frame Extractor — split an animated GIF into PNG frames | Station255</title>
  <meta
    name="description"
    content="Drop an animated GIF and extract every frame as a PNG image, right in your browser. Download a sprite-strip PNG or individual frames. Free, no upload, no libraries."
  />
</svelte:head>

<h1>GIF Frame Extractor</h1>
<p class="lead">Drop an animated GIF. Get every frame back as an image.</p>

{#if supported === null}
  <p class="hint">Checking browser support…</p>
{:else if supported === false}
  <div class="panel notice">
    <p>
      <strong>This tool needs a browser feature (WebCodecs) that isn't available here.</strong>
    </p>
    <p class="hint">It works in current <strong>Chrome</strong> or <strong>Edge</strong>. Safari's support is spotty; Firefox doesn't support it yet.</p>
  </div>
{:else}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="drop" role="button" tabindex="0" ondragover={(e) => e.preventDefault()} ondrop={onDrop}>
    <label class="btn">
      Choose GIF
      <input type="file" accept="image/gif" onchange={onInput} hidden />
    </label>
    <span class="hint">Animated GIF only · drag &amp; drop</span>
  </div>

  {#if busy}
    <p class="hint">Decoding…</p>
  {/if}
  {#if error}
    <p class="error">{error}</p>
  {/if}

  {#if frames.length > 0}
    <p class="section-label">{frames.length} frames extracted</p>
    <div class="actions">
      <button class="btn" onclick={downloadStrip}>⬇ Download as sprite strip (PNG)</button>
      <button class="btn secondary" onclick={downloadIndividually}>⬇ Download individually ({frames.length} PNGs)</button>
    </div>
    <p class="dl-note">Individual downloads may trigger a browser permission prompt for multiple files.</p>

    <div class="tile-grid">
      {#each frames as frame, i}
        <div class="tile-thumb">
          <img src={frame.url} alt={`Frame ${i}`} class="tile-img" />
          <span class="tile-label">#{i} · {frame.durationMs.toFixed(0)}ms</span>
        </div>
      {/each}
    </div>
  {/if}
{/if}

<section class="seo panel">
  <h2>About GIF Frame Extractor</h2>
  <p>
    Decodes an animated GIF frame-by-frame using the browser's built-in <code>ImageDecoder</code>
    API (part of WebCodecs) — no upload, no GIF-parsing library. Each frame is already fully
    composited (disposal method handled for you), so what you see is exactly what played in the
    animation.
  </p>
  <h3>Why no ZIP download?</h3>
  <p>
    This tool doesn't bundle a zip library — instead it packs every frame into one
    <strong>sprite-strip PNG</strong> for a single clean download (and that strip drops straight
    into <a href="/sprite-animator">Sprite Animator</a> or <a href="/sprite-slicer">Sprite Slicer</a>).
    If you specifically want separate files, use "Download individually."
  </p>
  <h3>Browser support</h3>
  <p>Chrome and Edge support GIF decoding via <code>ImageDecoder</code>. Safari's support is inconsistent. Firefox doesn't support it yet — this tool detects support automatically and tells you if your browser can't run it.</p>
  <div class="see-also">
    <span class="see-label">Related:</span>
    <a href="/sprite-slicer">Sprite Slicer</a>
    <a href="/sprite-animator">Sprite Animator</a>
    <a href="/sprite-packer">Sprite Packer</a>
  </div>
</section>

<style>
  .lead { color: var(--muted); font-size: 1.2rem; margin: 0 0 1rem; }
  .hint { color: var(--muted); }
  .notice { margin-bottom: 1rem; }
  .error { color: var(--accent); }
  .drop { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; border: 2px dashed var(--line); padding: 1.25rem; margin-bottom: 1.25rem; }

  .section-label { font-family: var(--display); font-size: 0.5rem; color: var(--muted); margin: 1rem 0 0.5rem; }
  .actions { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 0.5rem; }
  .dl-note { font-size: 0.8rem; color: var(--muted); margin: 0 0 1rem; }

  .tile-grid { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 1.5rem; }
  .tile-thumb { display: flex; flex-direction: column; align-items: center; gap: 2px; border: 1px solid var(--line); padding: 4px; background: var(--panel); }
  .tile-img { width: 48px; height: 48px; object-fit: contain; image-rendering: pixelated; }
  .tile-label { font-size: 0.65rem; color: var(--muted); }
</style>
