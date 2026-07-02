<script lang="ts">
  import { track } from '$lib/analytics';
  import { PALETTES, type RGB } from '$lib/palettes';

  type WaveStyle = 'bars' | 'mirror' | 'filled';

  let audioName  = $state('');
  let processing = $state(false);
  let outputUrl  = $state<string | null>(null);
  let prevUrl: string | null = null;
  let samples: Float32Array | null = null;

  let waveStyle   = $state<WaveStyle>('bars');
  let paletteName = $state('PICO-8');
  let barCount    = $state(80);
  let outW        = $state(640);
  let outH        = $state(200);
  let bgIdx       = $state(1);
  let fgIdx       = $state(8);

  const PALETTE_NAMES = Object.keys(PALETTES);

  function pal(): RGB[] { return PALETTES[paletteName]; }
  function toHex(r: number, g: number, b: number) { return '#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join(''); }

  function bgColor(): string { const p = pal(); const c = p[Math.min(bgIdx, p.length-1)]; return toHex(c[0],c[1],c[2]); }
  function fgColor(): string { const p = pal(); const c = p[Math.min(fgIdx, p.length-1)]; return toHex(c[0],c[1],c[2]); }

  async function handleFile(file: File) {
    audioName = file.name.replace(/\.[^.]+$/, '');
    processing = true;
    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioCtx = new AudioContext();
      const decoded = await audioCtx.decodeAudioData(arrayBuffer);
      samples = decoded.getChannelData(0);
      await audioCtx.close();
      renderWaveform();
      track('tool_use', { tool: 'waveform', style: waveStyle });
    } catch (err) {
      console.error('Audio decode error:', err);
      processing = false;
    }
  }

  function renderWaveform() {
    if (!samples) return;
    processing = true;
    const W = outW, H = outH;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    const bg = bgColor(), fg = fgColor();
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const bars = Math.max(10, barCount);
    const step = Math.floor(samples!.length / bars);
    const barW = W / bars;

    // Collect multi-color: map peak to position in palette between bg and fg
    const p = pal();
    const fgi = Math.min(fgIdx, p.length-1), bgi = Math.min(bgIdx, p.length-1);
    const colorPath: RGB[] = [];
    const steps = Math.abs(fgi - bgi) + 1;
    for (let i = 0; i < steps; i++) {
      const idx = bgi + Math.round(i / (steps - 1) * (fgi - bgi));
      colorPath.push(p[Math.min(Math.max(0, idx), p.length-1)]);
    }

    for (let b = 0; b < bars; b++) {
      let peak = 0;
      const start = b * step;
      const end = Math.min(start + step, samples!.length);
      for (let i = start; i < end; i++) {
        const v = Math.abs(samples![i]);
        if (v > peak) peak = v;
      }
      peak = Math.min(1, peak);

      const barH = Math.max(1, Math.round(peak * H));
      const x = Math.round(b * barW);
      const w = Math.max(1, Math.floor(barW) - 1);

      // Pick color along gradient from palette
      const ci = Math.min(colorPath.length - 1, Math.floor(peak * (colorPath.length - 1)));
      const [cr, cg, cb] = colorPath[ci];
      ctx.fillStyle = `rgb(${cr},${cg},${cb})`;

      if (waveStyle === 'mirror') {
        const half = barH / 2;
        ctx.fillRect(x, Math.round((H - barH) / 2), w, barH);
      } else if (waveStyle === 'filled') {
        ctx.fillStyle = fg;
        ctx.fillRect(x, H - barH, w, barH);
        // Draw gradient overlay
        const grad = ctx.createLinearGradient(x, H - barH, x, H);
        const [cr2, cg2, cb2] = colorPath[colorPath.length - 1];
        grad.addColorStop(0, `rgba(${cr2},${cg2},${cb2},0.8)`);
        grad.addColorStop(1, `rgba(${cr},${cg},${cb},0.4)`);
        ctx.fillStyle = grad;
        ctx.fillRect(x, H - barH, w, barH);
      } else {
        ctx.fillRect(x, H - barH, w, barH);
      }
    }

    if (prevUrl) URL.revokeObjectURL(prevUrl);
    canvas.toBlob((blob) => {
      outputUrl = URL.createObjectURL(blob!);
      prevUrl = outputUrl;
      processing = false;
    });
  }

  function onInput(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (f) handleFile(f);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer?.files[0];
    if (f) handleFile(f);
  }

  function download() {
    if (!outputUrl) return;
    const a = document.createElement('a');
    a.href = outputUrl; a.download = `${audioName || 'waveform'}-waveform.png`; a.click();
    track('export', { tool: 'waveform', type: 'png', style: waveStyle });
  }

  function changePalette(name: string) {
    paletteName = name;
    // Reset fg/bg to sensible defaults for the new palette
    const p = PALETTES[name];
    bgIdx = 0; fgIdx = Math.min(p.length - 1, Math.floor(p.length * 0.7));
    if (samples) renderWaveform();
  }
</script>

<svelte:head>
  <title>Audio Waveform Visualizer — Pixel Art Waveform PNG Generator | Station255</title>
  <meta name="description" content="Upload any audio file and generate a pixel-art waveform visualization as PNG. Choose retro palette colors, bar style, and dimensions. Free, runs entirely in your browser." />
</svelte:head>

<h1 class="tool-title">Waveform Art</h1>
<p class="tool-sub">Visualize any audio file as a pixel-art waveform image. Your audio never leaves your browser.</p>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="drop-zone"
  class:has-file={!!audioName}
  ondragover={(e) => e.preventDefault()}
  ondrop={onDrop}
>
  {#if audioName}
    <p class="file-name">🎵 {audioName}</p>
    <label class="btn btn-sm">Load Different File<input type="file" accept="audio/*" onchange={onInput} style="display:none" /></label>
  {:else}
    <p class="drop-hint">Drop an audio file here (MP3, WAV, OGG, FLAC…)</p>
    <label class="btn">
      Choose Audio File
      <input type="file" accept="audio/*" onchange={onInput} style="display:none" />
    </label>
  {/if}
</div>

{#if audioName}
  <div class="controls panel">
    <div class="ctrl-row">
      <label class="ctrl-label">Style</label>
      <div class="tab-row">
        {#each ['bars','mirror','filled'] as s}
          <button class="tab-btn" class:active={waveStyle === s} onclick={() => { waveStyle = s as WaveStyle; renderWaveform(); }}>{s}</button>
        {/each}
      </div>
    </div>
    <div class="ctrl-row">
      <label class="ctrl-label">Palette</label>
      <div class="tab-row wrap">
        {#each PALETTE_NAMES as name}
          <button class="tab-btn" class:active={paletteName === name} onclick={() => changePalette(name)}>{name}</button>
        {/each}
      </div>
    </div>
    <div class="color-pickers">
      <div class="ctrl-group">
        <label class="ctrl-label">Background color</label>
        <div class="pal-swatch-row">
          {#each pal() as c, i}
            <button
              class="swatch-dot" class:selected={bgIdx === i}
              style="background:rgb({c[0]},{c[1]},{c[2]})"
              onclick={() => { bgIdx = i; renderWaveform(); }}
            ></button>
          {/each}
        </div>
      </div>
      <div class="ctrl-group">
        <label class="ctrl-label">Waveform color</label>
        <div class="pal-swatch-row">
          {#each pal() as c, i}
            <button
              class="swatch-dot" class:selected={fgIdx === i}
              style="background:rgb({c[0]},{c[1]},{c[2]})"
              onclick={() => { fgIdx = i; renderWaveform(); }}
            ></button>
          {/each}
        </div>
      </div>
    </div>
    <div class="ctrl-row">
      <label class="ctrl-label">Bars <span class="val">{barCount}</span></label>
      <input type="range" min="10" max="300" step="1" bind:value={barCount} oninput={() => renderWaveform()} />
    </div>
    <div class="ctrl-row">
      <label class="ctrl-label">Width × Height</label>
      <div class="size-row">
        {#each [320,640,1280] as w}
          <button class="tab-btn" class:active={outW === w} onclick={() => { outW = w; renderWaveform(); }}>{w}</button>
        {/each}
        <span style="color:var(--muted);font-size:0.85rem;">×</span>
        {#each [100,200,400] as h}
          <button class="tab-btn" class:active={outH === h} onclick={() => { outH = h; renderWaveform(); }}>{h}</button>
        {/each}
      </div>
    </div>
    <div class="btn-row">
      <button class="btn btn-primary" onclick={download} disabled={!outputUrl || processing}>
        {processing ? 'Processing…' : '⬇ Download PNG'}
      </button>
    </div>
  </div>
{/if}

{#if outputUrl}
  <div class="output-wrap">
    <p class="output-label">Waveform preview</p>
    <img src={outputUrl} alt="Audio waveform visualization" class="output-img" />
  </div>
{/if}

<div class="seo">
  <h2>Audio Waveform Visualizer</h2>
  <p>
    Station255's Waveform tool decodes any audio file in your browser (MP3, WAV, OGG, FLAC, AAC)
    using the Web Audio API's <code>decodeAudioData</code>, samples the peak amplitude across a
    configurable number of bars, and renders the result as a pixel-art PNG using a retro console
    palette. No server, no upload — the audio stays in your browser.
  </p>
  <h3>Three waveform styles</h3>
  <p>
    <strong>Bars</strong> — classic waveform with individual bars growing upward from the baseline.
    <strong>Mirror</strong> — symmetric waveform centered on the midline, giving the classic
    music-player look. <strong>Filled</strong> — bars with a gradient overlay blending from the
    waveform color to the background.
  </p>
  <h3>Use cases</h3>
  <p>
    Music thumbnails for YouTube, SoundCloud, and Bandcamp. Podcast episode art. Twitch stream
    overlays. Beat-maker portfolio pieces. Discord server banners. Album artwork accents.
  </p>
  <h3>FAQ</h3>
  <h3>What audio formats are supported?</h3>
  <p>Any format your browser's Web Audio API can decode — typically MP3, WAV, OGG Vorbis, FLAC, and AAC.</p>
  <h3>Does it use the left channel, right channel, or both?</h3>
  <p>Currently the tool analyzes channel 0 (left/mono). Stereo mixing is planned for a future update.</p>
  <h3>Can I use longer tracks?</h3>
  <p>Yes — the tool samples the entire file regardless of length. Very long files (>10 min) may take a few seconds to decode.</p>
</div>

<div class="see-also">
  <span>See also:</span>
  <a href="/sfx">8-bit SFX</a>
  <a href="/gradient">Retro Gradient</a>
  <a href="/noise">Pixel Noise</a>
  <a href="/pixel-text">Pixel Text</a>
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
    min-height: 100px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
  }
  .drop-zone.has-file { border-style: solid; }
  .drop-hint { color: var(--muted); margin: 0; }
  .file-name { color: var(--ink); font-size: 0.95rem; margin: 0; }
  .btn-sm { font-size: 0.8rem; padding: 0.3rem 0.6rem; }

  .controls { padding: 1rem; margin-bottom: 1rem; display: flex; flex-direction: column; gap: 0.8rem; }
  .ctrl-row { display: flex; flex-direction: column; gap: 0.3rem; }
  .ctrl-group { display: flex; flex-direction: column; gap: 0.3rem; }
  .ctrl-label { font-size: 0.85rem; color: var(--muted); display: flex; justify-content: space-between; }
  .val { color: var(--accent-3); font-family: var(--display); font-size: 0.5rem; }
  .tab-row { display: flex; gap: 4px; }
  .tab-row.wrap { flex-wrap: wrap; }
  .tab-btn { background: var(--bg-2); border: 1px solid var(--line); color: var(--muted); padding: 0.28rem 0.6rem; cursor: pointer; font-size: 0.82rem; white-space: nowrap; }
  .tab-btn.active { border-color: var(--accent); color: var(--accent); background: var(--panel); }
  input[type=range] { width: 100%; accent-color: var(--accent); }

  .color-pickers { display: flex; flex-direction: column; gap: 0.6rem; }
  .pal-swatch-row { display: flex; flex-wrap: wrap; gap: 3px; }
  .swatch-dot { width: 18px; height: 18px; border: 2px solid transparent; cursor: pointer; padding: 0; }
  .swatch-dot.selected { border-color: var(--accent-3); }

  .size-row { display: flex; gap: 4px; align-items: center; flex-wrap: wrap; }
  .btn-row { margin-top: 0.25rem; }
  .btn-primary { background: var(--accent); color: #000; }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

  .output-wrap { margin-top: 1rem; }
  .output-label { font-family: var(--display); font-size: 0.5rem; color: var(--muted); margin: 0 0 0.5rem; }
  .output-img { max-width: 100%; display: block; border: 2px solid var(--line); image-rendering: pixelated; }
</style>
