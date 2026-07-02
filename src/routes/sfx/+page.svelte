<script lang="ts">
  import { track } from '$lib/analytics';

  let pitch  = $state(1.0);
  let volume = $state(0.7);
  let playing = $state<string | null>(null);

  let audioCtx: AudioContext | null = null;

  type Preset = {
    name: string;
    icon: string;
    duration: number;
    build: (ctx: BaseAudioContext, t: number, pitch: number, vol: number) => void;
  };

  const PRESETS: Preset[] = [
    {
      name: 'Coin', icon: '🪙', duration: 0.24,
      build(ctx, t, p, v) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = 'sine';
        o.frequency.setValueAtTime(880 * p, t);
        o.frequency.exponentialRampToValueAtTime(1760 * p, t + 0.12);
        g.gain.setValueAtTime(v * 0.5, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        o.start(t); o.stop(t + 0.24);
      },
    },
    {
      name: 'Jump', icon: '⬆️', duration: 0.4,
      build(ctx, t, p, v) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = 'square';
        o.frequency.setValueAtTime(200 * p, t);
        o.frequency.exponentialRampToValueAtTime(600 * p, t + 0.2);
        o.frequency.exponentialRampToValueAtTime(380 * p, t + 0.36);
        g.gain.setValueAtTime(v * 0.35, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
        o.start(t); o.stop(t + 0.4);
      },
    },
    {
      name: 'Laser', icon: '⚡', duration: 0.2,
      build(ctx, t, p, v) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(1400 * p, t);
        o.frequency.exponentialRampToValueAtTime(80 * p, t + 0.18);
        g.gain.setValueAtTime(v * 0.5, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.19);
        o.start(t); o.stop(t + 0.2);
      },
    },
    {
      name: 'Explosion', icon: '💥', duration: 0.9,
      build(ctx, t, p, v) {
        const sr = ctx.sampleRate, dur = 0.9;
        const buf = ctx.createBuffer(1, Math.ceil(dur * sr), sr);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(900 * p, t);
        lp.frequency.exponentialRampToValueAtTime(60, t + dur);
        const g = ctx.createGain();
        g.gain.setValueAtTime(v * 1.2, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        src.connect(lp); lp.connect(g); g.connect(ctx.destination);
        src.start(t); src.stop(t + dur);
      },
    },
    {
      name: 'Powerup', icon: '⭐', duration: 0.65,
      build(ctx, t, p, v) {
        [262, 330, 392, 523].forEach((f, i) => {
          const o = ctx.createOscillator(), g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.type = 'square';
          const st = t + i * 0.13;
          o.frequency.setValueAtTime(f * p, st);
          g.gain.setValueAtTime(v * 0.3, st);
          g.gain.exponentialRampToValueAtTime(0.001, st + 0.13);
          o.start(st); o.stop(st + 0.14);
        });
      },
    },
    {
      name: 'Hurt', icon: '💢', duration: 0.32,
      build(ctx, t, p, v) {
        const sr = ctx.sampleRate, dur = 0.32;
        const buf = ctx.createBuffer(1, Math.ceil(dur * sr), sr);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
          const env = Math.exp(-i / (dur * sr) * 9);
          data[i] = (Math.random() * 2 - 1) * env;
        }
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass'; bp.frequency.value = 380 * p; bp.Q.value = 1.5;
        const g = ctx.createGain();
        g.gain.setValueAtTime(v * 1.4, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        src.connect(bp); bp.connect(g); g.connect(ctx.destination);
        src.start(t); src.stop(t + dur);
      },
    },
    {
      name: 'Select', icon: '▶️', duration: 0.14,
      build(ctx, t, p, v) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = 'sine';
        o.frequency.setValueAtTime(440 * p, t);
        g.gain.setValueAtTime(v * 0.4, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
        o.start(t); o.stop(t + 0.14);
      },
    },
    {
      name: 'Level Up', icon: '🎉', duration: 0.92,
      build(ctx, t, p, v) {
        [262, 330, 392, 523, 659].forEach((f, i) => {
          const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
          o.connect(g); o2.connect(g); g.connect(ctx.destination);
          o.type = 'square'; o2.type = 'square';
          const st = t + i * 0.15;
          o.frequency.setValueAtTime(f * p, st);
          o2.frequency.setValueAtTime(f * p * 2, st);
          g.gain.setValueAtTime(v * 0.2, st);
          g.gain.exponentialRampToValueAtTime(0.001, st + 0.18);
          o.start(st); o.stop(st + 0.19);
          o2.start(st); o2.stop(st + 0.19);
        });
      },
    },
  ];

  async function play(preset: Preset) {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    playing = preset.name;
    preset.build(audioCtx, audioCtx.currentTime + 0.01, pitch, volume);
    track('tool_use', { tool: 'sfx', sound: preset.name });
    setTimeout(() => { playing = null; }, preset.duration * 1000 + 200);
  }

  function bufferToWav(buf: AudioBuffer): Blob {
    const ch = buf.getChannelData(0);
    const len = ch.length;
    const ab = new ArrayBuffer(44 + len * 2);
    const dv = new DataView(ab);
    const wr = (off: number, s: string) => { for (let i = 0; i < s.length; i++) dv.setUint8(off + i, s.charCodeAt(i)); };
    wr(0, 'RIFF'); dv.setUint32(4, 36 + len * 2, true);
    wr(8, 'WAVE'); wr(12, 'fmt ');
    dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
    dv.setUint32(24, buf.sampleRate, true); dv.setUint32(28, buf.sampleRate * 2, true);
    dv.setUint16(32, 2, true); dv.setUint16(34, 16, true);
    wr(36, 'data'); dv.setUint32(40, len * 2, true);
    for (let i = 0; i < len; i++) {
      dv.setInt16(44 + i * 2, Math.max(-32768, Math.min(32767, ch[i] * 32767 | 0)), true);
    }
    return new Blob([ab], { type: 'audio/wav' });
  }

  async function download(preset: Preset) {
    const sr = 44100;
    const frames = Math.ceil(preset.duration * sr * 1.15);
    const offCtx = new OfflineAudioContext(1, frames, sr);
    preset.build(offCtx, 0, pitch, volume);
    const buf = await offCtx.startRendering();
    const blob = bufferToWav(buf);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${preset.name.toLowerCase().replace(' ', '-')}.wav`; a.click();
    URL.revokeObjectURL(url);
    track('export', { tool: 'sfx', sound: preset.name });
  }
</script>

<svelte:head>
  <title>8-bit Sound Effect Generator — Free Retro SFX Maker Online | Station255</title>
  <meta name="description" content="Generate classic 8-bit sound effects in your browser — coin, jump, laser, explosion, powerup and more. Adjust pitch and volume, then download as WAV. No plugins needed." />
</svelte:head>

<h1 class="tool-title">8-bit SFX Generator</h1>
<p class="tool-sub">Synthesize retro sound effects in real time. Preview and download as WAV — fully offline, no upload.</p>

<div class="global-controls panel">
  <div class="ctrl-row">
    <label>Pitch <span class="val">{pitch.toFixed(2)}×</span></label>
    <input type="range" min="0.25" max="3" step="0.01" bind:value={pitch} />
  </div>
  <div class="ctrl-row">
    <label>Volume <span class="val">{Math.round(volume * 100)}%</span></label>
    <input type="range" min="0.05" max="1" step="0.01" bind:value={volume} />
  </div>
</div>

<div class="preset-grid">
  {#each PRESETS as preset}
    <div class="preset-card">
      <span class="preset-icon">{preset.icon}</span>
      <span class="preset-name">{preset.name}</span>
      <div class="preset-btns">
        <button
          class="btn preset-play"
          class:active={playing === preset.name}
          onclick={() => play(preset)}
        >
          {playing === preset.name ? '▶ …' : '▶ Play'}
        </button>
        <button class="btn" onclick={() => download(preset)} title="Download WAV">⬇ WAV</button>
      </div>
    </div>
  {/each}
</div>

<div class="seo">
  <h2>Free 8-bit Sound Effect Generator</h2>
  <p>
    Station255's SFX Generator synthesizes classic 8-bit and 16-bit sound effects in your browser using
    the Web Audio API. No plugins, no server, no upload — all synthesis runs locally. Adjust the global
    pitch multiplier (0.25× to 3×) and volume before previewing or downloading any preset as a
    lossless WAV file at 44.1 kHz, 16-bit mono.
  </p>
  <h3>How it works</h3>
  <p>
    Each preset is an audio graph built from oscillators (sine, square, sawtooth) and noise buffers
    routed through filters and gain envelopes. Coin uses a rising-pitch sine wave. Laser uses a
    sawtooth with exponential pitch fall. Explosion filters white noise through a decaying low-pass
    filter. Level Up schedules five square-wave notes with an octave harmonic, 150 ms apart. WAV
    export renders the graph through an OfflineAudioContext at full sample rate.
  </p>
  <h3>Use cases</h3>
  <p>
    Perfect for indie game developers, chiptune musicians, game-jam participants, streamers building
    custom alert sounds, and anyone who needs a quick 8-bit sound without opening a DAW.
  </p>
  <h3>FAQ</h3>
  <h3>What format does WAV export produce?</h3>
  <p>16-bit PCM mono WAV at 44,100 Hz — compatible with every game engine and audio editor.</p>
  <h3>Can I use the sounds in commercial projects?</h3>
  <p>Yes. All sounds are procedurally generated by the tool; you own the output.</p>
  <h3>Why does Explosion sound slightly different every download?</h3>
  <p>Noise-based sounds (Explosion, Hurt) use a random sample buffer, so each render is unique. All other presets are fully deterministic.</p>
</div>

<div class="see-also">
  <span>See also:</span>
  <a href="/waveform">Waveform Art</a>
  <a href="/pixel-text">Pixel Text</a>
  <a href="/bootscreen">Boot Screen</a>
</div>

<style>
  .tool-title { font-size: 1.1rem; margin: 0 0 0.4rem; }
  .tool-sub { color: var(--muted); margin: 0 0 1rem; font-size: 0.95rem; }

  .global-controls { padding: 1rem; margin-bottom: 1.25rem; display: flex; flex-direction: column; gap: 0.65rem; }
  .ctrl-row { display: flex; flex-direction: column; gap: 0.2rem; }
  .ctrl-row label { display: flex; justify-content: space-between; font-size: 0.9rem; color: var(--muted); }
  .val { color: var(--accent-3); font-family: var(--display); font-size: 0.55rem; }
  .ctrl-row input[type=range] { width: 100%; accent-color: var(--accent); }

  .preset-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
    gap: 0.75rem;
    margin-bottom: 2rem;
  }
  .preset-card {
    background: var(--panel);
    border: 2px solid var(--line);
    padding: 1rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }
  .preset-icon { font-size: 2rem; line-height: 1; }
  .preset-name { font-family: var(--display); font-size: 0.55rem; color: var(--ink); }
  .preset-btns { display: flex; gap: 0.5rem; width: 100%; }
  .preset-btns .btn { flex: 1; font-size: 0.8rem; padding: 0.4rem; }
  .preset-play.active { background: var(--accent); color: #000; }
</style>
