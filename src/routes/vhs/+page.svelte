<script lang="ts">
  import { track } from '$lib/analytics';

  let imgUrl   = $state<string | null>(null);
  let outputUrl = $state<string | null>(null);
  let fileName  = $state('');
  let processing = $state(false);
  let lastImage: HTMLImageElement | null = null;
  let prevUrl: string | null = null;

  let bleed    = $state(0.5);
  let jitter   = $state(0.4);
  let noise    = $state(0.3);
  let vignette = $state(0.55);
  let seed     = $state(42);

  function lcg(s: number) {
    let st = s | 0;
    return () => { st = (Math.imul(1664525, st) + 1013904223) >>> 0; return st / 0x100000000; };
  }
  const clamp = (v: number) => Math.max(0, Math.min(255, v | 0));

  function applyVHS(img: HTMLImageElement): HTMLCanvasElement {
    const W = img.width, H = img.height;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0);
    const id = ctx.getImageData(0, 0, W, H);
    const src = new Uint8ClampedArray(id.data);
    const rng = lcg(seed);

    // Chroma bleed: smear R & B channels to the right
    const bp = Math.round(bleed * 14);
    if (bp > 0) {
      for (let y = 0; y < H; y++) {
        for (let x = bp; x < W; x++) {
          const i = (y * W + x) * 4;
          const p = (y * W + x - bp) * 4;
          id.data[i]   = clamp(src[i]   * 0.55 + src[p]   * 0.45);
          id.data[i+2] = clamp(src[i+2] * 0.55 + src[p+2] * 0.45);
        }
      }
    }

    // Row jitter (VHS tracking artifact)
    const jp = Math.round(jitter * 28);
    if (jp > 0) {
      for (let y = 0; y < H; y++) {
        if (rng() < 0.07) {
          const shift = Math.round((rng() * 2 - 1) * jp);
          if (!shift) continue;
          const row = new Uint8ClampedArray(W * 4);
          for (let x = 0; x < W; x++) {
            const idx = (y * W + x) * 4;
            row[x*4] = id.data[idx]; row[x*4+1] = id.data[idx+1];
            row[x*4+2] = id.data[idx+2]; row[x*4+3] = id.data[idx+3];
          }
          for (let x = 0; x < W; x++) {
            const sx = Math.max(0, Math.min(W - 1, x - shift));
            const di = (y * W + x) * 4;
            id.data[di]   = row[sx*4];   id.data[di+1] = row[sx*4+1];
            id.data[di+2] = row[sx*4+2]; id.data[di+3] = row[sx*4+3];
          }
        }
      }
    }

    // Grain
    if (noise > 0) {
      for (let i = 0; i < id.data.length; i += 4) {
        if (rng() < noise * 0.18) {
          const n = (rng() - 0.5) * 80 * noise;
          id.data[i]   = clamp(id.data[i]   + n);
          id.data[i+1] = clamp(id.data[i+1] + n);
          id.data[i+2] = clamp(id.data[i+2] + n);
        }
      }
    }

    ctx.putImageData(id, 0, 0);

    // Vignette
    if (vignette > 0) {
      const cx = W / 2, cy = H / 2;
      const g = ctx.createRadialGradient(cx, cy, Math.min(W, H) * 0.2, cx, cy, Math.max(W, H) * 0.8);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, `rgba(0,0,0,${(vignette * 0.8).toFixed(3)})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }

    return c;
  }

  function handleFile(file: File) {
    fileName = file.name.replace(/\.[^.]+$/, '');
    const fr = new FileReader();
    fr.onload = (e) => {
      imgUrl = e.target!.result as string;
      const img = new Image();
      img.onload = () => { lastImage = img; process(img); };
      img.src = imgUrl;
    };
    fr.readAsDataURL(file);
  }

  function process(img: HTMLImageElement) {
    processing = true;
    setTimeout(() => {
      if (prevUrl) URL.revokeObjectURL(prevUrl);
      const c = applyVHS(img);
      c.toBlob((blob) => {
        outputUrl = URL.createObjectURL(blob!);
        prevUrl = outputUrl;
        processing = false;
        track('tool_use', { tool: 'vhs' });
      });
    }, 0);
  }

  function reprocess() { if (lastImage) process(lastImage); }

  function randomize() {
    seed = Math.floor(Math.random() * 99999);
    reprocess();
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer?.files[0];
    if (f?.type.startsWith('image/')) handleFile(f);
  }

  function onInput(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (f) handleFile(f);
  }

  function download() {
    if (!outputUrl) return;
    const a = document.createElement('a');
    a.href = outputUrl; a.download = `${fileName || 'image'}-vhs.png`; a.click();
    track('export', { tool: 'vhs', type: 'png' });
  }
</script>

<svelte:head>
  <title>VHS Effect Online — Free VHS Glitch Photo Filter | Station255</title>
  <meta name="description" content="Add authentic VHS tape effects to any photo free online. Color bleeding, tracking glitches, grain, and vignette — all in your browser. No upload, no signup." />
</svelte:head>

<h1 class="tool-title">📼 VHS Effect</h1>
<p class="tool-sub">Add tape artifacts — color bleed, row jitter, grain — to any image. Your image never leaves your browser.</p>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="drop-zone"
  class:has-image={!!imgUrl}
  ondragover={(e) => e.preventDefault()}
  ondrop={onDrop}
>
  {#if imgUrl}
    <img src={imgUrl} alt="Original" class="preview-img" />
  {:else}
    <p class="drop-hint">Drop an image here</p>
    <label class="btn">
      Choose Image
      <input type="file" accept="image/*" onchange={onInput} style="display:none" />
    </label>
  {/if}
</div>

{#if imgUrl}
  <div class="controls panel">
    <div class="ctrl-row">
      <label>Color Bleed <span class="val">{Math.round(bleed * 100)}%</span></label>
      <input type="range" min="0" max="1" step="0.01" bind:value={bleed} oninput={reprocess} />
    </div>
    <div class="ctrl-row">
      <label>Tracking Jitter <span class="val">{Math.round(jitter * 100)}%</span></label>
      <input type="range" min="0" max="1" step="0.01" bind:value={jitter} oninput={reprocess} />
    </div>
    <div class="ctrl-row">
      <label>Grain <span class="val">{Math.round(noise * 100)}%</span></label>
      <input type="range" min="0" max="1" step="0.01" bind:value={noise} oninput={reprocess} />
    </div>
    <div class="ctrl-row">
      <label>Vignette <span class="val">{Math.round(vignette * 100)}%</span></label>
      <input type="range" min="0" max="1" step="0.01" bind:value={vignette} oninput={reprocess} />
    </div>
    <div class="btn-row">
      <button class="btn" onclick={randomize}>⟳ Randomize</button>
      <button class="btn btn-primary" onclick={download} disabled={!outputUrl || processing}>
        {processing ? 'Processing…' : '⬇ Download PNG'}
      </button>
    </div>
  </div>
{/if}

{#if outputUrl}
  <div class="output-wrap">
    <p class="output-label">Output</p>
    <img src={outputUrl} alt="VHS effect output" class="output-img" />
  </div>
{/if}

<div class="seo">
  <h2>Free VHS Effect Online</h2>
  <p>
    Station255's VHS tool reproduces the visual artifacts of magnetic tape degradation entirely inside
    your browser using the HTML5 Canvas API. Upload any JPEG, PNG, or WebP image, dial in the four
    effect parameters, and download a high-resolution PNG in seconds — no account, no server upload.
  </p>
  <h3>What each slider does</h3>
  <p>
    <strong>Color Bleed</strong> shifts the red and blue chrominance channels horizontally, mimicking
    VHS's limited chroma bandwidth. <strong>Tracking Jitter</strong> randomly displaces a fraction
    of horizontal scan lines, reproducing the look of a misaligned VHS tape head. <strong>Grain</strong>
    adds brightness noise to individual pixels, simulating magnetic tape signal degradation.
    <strong>Vignette</strong> darkens corners, a common artifact of CRT monitors and tube cameras.
    Hit <em>Randomize</em> to regenerate the noise seed for a different glitch pattern.
  </p>
  <h3>Use cases</h3>
  <p>
    VHS aesthetics are widely used in lo-fi music thumbnails, horror game assets, social media posts,
    and retro brand photography. The effect works especially well on portraits, cityscapes, and
    screenshots of old software.
  </p>
  <h3>FAQ</h3>
  <h3>Does my image get uploaded to a server?</h3>
  <p>No. All processing happens in your browser via the Canvas API. Nothing is transmitted.</p>
  <h3>Can I use the output commercially?</h3>
  <p>Yes — the effect is generated by the tool; you own the output.</p>
  <h3>Why does the effect look different each time I click Randomize?</h3>
  <p>Randomize picks a new pseudo-random seed that controls where jitter and grain appear. The same seed always produces the same result.</p>
</div>

<div class="see-also">
  <span>See also:</span>
  <a href="/crt">CRT-ify</a>
  <a href="/dither">Dithering Studio</a>
  <a href="/demake">Demake</a>
  <a href="/noise">Pixel Noise</a>
</div>

<style>
  .tool-title { font-size: 1.1rem; margin: 0 0 0.4rem; }
  .tool-sub { color: var(--muted); margin: 0 0 1rem; font-size: 0.95rem; }

  .drop-zone {
    border: 2px dashed var(--line);
    padding: 2rem;
    text-align: center;
    cursor: pointer;
    margin-bottom: 1rem;
    min-height: 120px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
  }
  .drop-zone.has-image { padding: 0.5rem; border-style: solid; }
  .preview-img { max-width: 100%; max-height: 320px; display: block; }
  .drop-hint { color: var(--muted); margin: 0; }

  .controls { padding: 1rem; margin-bottom: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
  .ctrl-row { display: flex; flex-direction: column; gap: 0.25rem; }
  .ctrl-row label { display: flex; justify-content: space-between; font-size: 0.9rem; color: var(--muted); }
  .val { color: var(--accent-3); font-family: var(--display); font-size: 0.55rem; }
  .ctrl-row input[type=range] { width: 100%; accent-color: var(--accent); }
  .btn-row { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.25rem; }
  .btn-primary { background: var(--accent); color: #000; }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

  .output-wrap { margin-top: 1.5rem; }
  .output-label { font-family: var(--display); font-size: 0.5rem; color: var(--muted); margin: 0 0 0.5rem; }
  .output-img { max-width: 100%; display: block; border: 2px solid var(--line); }
</style>
