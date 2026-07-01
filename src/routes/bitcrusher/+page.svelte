<script lang="ts">
  import { track } from '$lib/analytics';

  let audioCtx: AudioContext | null = null;
  let originalBuffer: AudioBuffer | null = null;
  let crushedBuffer: AudioBuffer | null = null;
  let fileName = $state('');
  let bits = $state(8);
  let rate = $state(1.0);
  let status = $state<'idle' | 'loading' | 'processing' | 'done'>('idle');

  let sourceNode: AudioBufferSourceNode | null = null;
  let isPlaying = $state(false);
  let playingOriginal = $state(false);

  function getCtx() {
    if (!audioCtx) audioCtx = new AudioContext();
    return audioCtx;
  }

  function loadFile(file: File) {
    fileName = file.name;
    status = 'loading';
    crushedBuffer = null;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const ctx = getCtx();
        originalBuffer = await ctx.decodeAudioData(e.target!.result as ArrayBuffer);
        process();
      } catch {
        status = 'idle';
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function bitcrush(samples: Float32Array, bitDepth: number, sampleRateFactor: number): Float32Array {
    const out = new Float32Array(samples.length);
    const levels = Math.pow(2, bitDepth - 1);
    let held = 0;
    let holdCounter = 0;
    const holdLen = Math.max(1, Math.round(1 / sampleRateFactor));
    for (let i = 0; i < samples.length; i++) {
      if (holdCounter === 0) {
        held = Math.round(samples[i] * levels) / levels;
        holdCounter = holdLen;
      }
      holdCounter--;
      out[i] = held;
    }
    return out;
  }

  function process() {
    if (!originalBuffer) return;
    status = 'processing';
    const ctx = getCtx();
    const channels = originalBuffer.numberOfChannels;
    const len = originalBuffer.length;
    const sr = originalBuffer.sampleRate;
    const buf = ctx.createBuffer(channels, len, sr);
    for (let c = 0; c < channels; c++) {
      const src = new Float32Array(originalBuffer.getChannelData(c));
      const crushed = bitcrush(src, bits, rate);
      buf.getChannelData(c).set(crushed);
    }
    crushedBuffer = buf;
    status = 'done';
    track('tool_use', { tool: 'bitcrusher', bits, rate });
  }

  $effect(() => {
    void bits; void rate;
    if (originalBuffer && status !== 'idle' && status !== 'loading') process();
  });

  function play(original: boolean) {
    const ctx = getCtx();
    if (isPlaying) { sourceNode?.stop(); isPlaying = false; return; }
    const buf = original ? originalBuffer : crushedBuffer;
    if (!buf) return;
    sourceNode = ctx.createBufferSource();
    sourceNode.buffer = buf;
    sourceNode.connect(ctx.destination);
    sourceNode.onended = () => { isPlaying = false; };
    sourceNode.start();
    isPlaying = true;
    playingOriginal = original;
  }

  function encodeWav(buffer: AudioBuffer): Blob {
    const numCh = buffer.numberOfChannels;
    const numSamples = buffer.length;
    const sampleRate = buffer.sampleRate;
    const bytesPerSample = 2;
    const byteRate = sampleRate * numCh * bytesPerSample;
    const blockAlign = numCh * bytesPerSample;
    const dataLen = numSamples * numCh * bytesPerSample;
    const ab = new ArrayBuffer(44 + dataLen);
    const view = new DataView(ab);
    function write(off: number, s: string) { for (let i=0;i<s.length;i++) view.setUint8(off+i, s.charCodeAt(i)); }
    write(0, 'RIFF'); view.setUint32(4, 36 + dataLen, true); write(8, 'WAVE');
    write(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
    view.setUint16(22, numCh, true); view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true); view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);
    write(36, 'data'); view.setUint32(40, dataLen, true);
    let off = 44;
    const channels = Array.from({ length: numCh }, (_, c) => buffer.getChannelData(c));
    for (let i = 0; i < numSamples; i++) {
      for (let c = 0; c < numCh; c++) {
        const s = Math.max(-1, Math.min(1, channels[c][i]));
        view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        off += 2;
      }
    }
    return new Blob([ab], { type: 'audio/wav' });
  }

  function download() {
    if (!crushedBuffer) return;
    const blob = encodeWav(crushedBuffer);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = (fileName.replace(/\.[^.]+$/, '') || 'crushed') + `-${bits}bit.wav`;
    a.click();
    URL.revokeObjectURL(url);
    track('export', { tool: 'bitcrusher', bits, rate });
  }

  function onInput(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (f) loadFile(f);
  }
  function onDrop(e: DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer?.files?.[0];
    if (f?.type.startsWith('audio/') || f?.name.match(/\.(mp3|wav|ogg|flac|m4a)$/i)) loadFile(f);
  }

  const statusMsg: Record<string, string> = {
    idle: '', loading: 'Decoding audio…', processing: 'Crushing bits…', done: 'Ready.'
  };
</script>

<svelte:head>
  <title>Bitcrusher — reduce audio bit depth for lo-fi effects | Station255</title>
  <meta name="description" content="Apply bit-depth and sample-rate reduction to any audio file for lo-fi, chiptune, and crunch effects. Download the result as WAV. Free, runs in your browser." />
</svelte:head>

<h1>Bitcrusher</h1>
<p class="lead">Reduce bit depth and sample rate for lo-fi crunch.</p>

<div class="drop"
  role="button" tabindex="0"
  ondragover={(e) => e.preventDefault()} ondrop={onDrop}>
  <label class="btn">
    Load audio
    <input type="file" accept="audio/*" onchange={onInput} hidden />
  </label>
  <span class="hint">MP3 / WAV / OGG / FLAC · drag &amp; drop</span>
</div>

<div class="controls">
  <label class="ctrl">
    <span>Bit depth: <strong>{bits} bit</strong></span>
    <input type="range" min="1" max="16" step="1" bind:value={bits} />
    <span class="hint-small">16 = clean · 4 = crunchy · 1 = square wave</span>
  </label>
  <label class="ctrl">
    <span>Sample rate: <strong>{Math.round(rate * 100)}%</strong></span>
    <input type="range" min="0.05" max="1" step="0.05" bind:value={rate} />
    <span class="hint-small">100% = full · 25% = heavy lo-fi</span>
  </label>
</div>

{#if status !== 'idle'}
  <p class="status">{statusMsg[status]}</p>
{/if}

{#if status === 'done'}
  <div class="actions">
    <button class="btn" onclick={() => play(true)} title="Preview original">
      {isPlaying && playingOriginal ? '⏸ Stop' : '▶ Original'}
    </button>
    <button class="btn" onclick={() => play(false)} title="Preview crushed">
      {isPlaying && !playingOriginal ? '⏸ Stop' : '▶ Crushed'}
    </button>
    <button class="btn" onclick={download}>Download WAV</button>
  </div>
{/if}

<section class="seo panel">
  <h2>About Bitcrusher</h2>
  <p>Bitcrushing reduces the resolution of digital audio in two ways: <strong>bit depth reduction</strong> quantizes each sample to fewer levels (16-bit CD quality → 4-bit crunch → 1-bit square wave), and <strong>sample rate reduction</strong> holds each sample for longer, creating an aliased, grainy texture.</p>
  <p>Low bit depths give the characteristic growl of early SNES samplers and vinyl lo-fi. Low sample rates produce the harsh aliasing of Game Boy and early PC sound chips. Combine both for maximum grit.</p>
  <p>The output is a 16-bit WAV containing the crushed waveform — import into your DAW, sample it into a drum machine, or use it directly.</p>
  <div class="see-also">
    <span class="see-label">Related:</span>
    <a href="/pixel-clock">Pixel Clock</a>
    <a href="/pattern-tile">Pattern Tile</a>
  </div>
</section>

<style>
  .lead { color: var(--muted); font-size: 1.2rem; margin: 0 0 1rem; }
  .drop { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; border: 2px dashed var(--line); padding: 1.25rem; margin-bottom: 1.25rem; }
  .hint { color: var(--muted); }
  .hint-small { font-size: 0.8rem; color: var(--muted); }
  .controls { display: flex; flex-wrap: wrap; gap: 1.5rem; margin-bottom: 1rem; }
  .ctrl { display: flex; flex-direction: column; gap: 0.3rem; font-size: 1rem; }
  .status { color: var(--accent-3); margin: 0.5rem 0; }
  .actions { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 1.5rem; }
</style>
