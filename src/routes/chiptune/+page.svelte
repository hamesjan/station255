<script lang="ts">
  import { onDestroy } from 'svelte';
  import { track } from '$lib/analytics';

  const STEPS = 16;
  const NOTE_COUNT = 8;
  const NOTE_NAMES = ['C5','B4','A4','G4','F4','E4','D4','C4'];
  const FREQS =      [523, 494, 440, 392, 349, 330, 294, 262];

  const TRACKS = 3;
  const WAVEFORMS: OscillatorType[] = ['square', 'sawtooth', 'triangle'];
  const TRACK_NAMES = ['Lead', 'Bass', 'Arp'];
  const TRACK_COLORS = ['#ff2244', '#4488ff', '#44dd88'];

  // grid[track][note][step]
  let grid = $state<boolean[][][]>(
    Array.from({ length: TRACKS }, () =>
      Array.from({ length: NOTE_COUNT }, () => Array(STEPS).fill(false))
    )
  );

  let bpm = $state(120);
  let playing = $state(false);
  let currentStep = $state(-1);
  let volumes = $state([0.5, 0.3, 0.35]);
  let octaves = $state([0, -1, 0]);

  let audioCtx: AudioContext | null = null;
  let stepTimer = 0;
  let nextStepTime = 0;
  let scheduleStep = 0;

  function getCtx() {
    if (!audioCtx) audioCtx = new AudioContext();
    return audioCtx;
  }

  function playNote(freq: number, wave: OscillatorType, vol: number, when: number, dur: number) {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = wave;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + dur * 0.9);
    osc.start(when);
    osc.stop(when + dur);
  }

  function scheduleNext() {
    const ctx = getCtx();
    const secPerStep = 60 / bpm / 4;

    while (nextStepTime < ctx.currentTime + 0.1) {
      const s = scheduleStep % STEPS;
      // schedule notes for this step
      for (let t = 0; t < TRACKS; t++) {
        for (let n = 0; n < NOTE_COUNT; n++) {
          if (grid[t][n][s]) {
            const freq = FREQS[n] * Math.pow(2, octaves[t]);
            playNote(freq, WAVEFORMS[t], volumes[t], nextStepTime, secPerStep * 0.8);
          }
        }
      }
      scheduleStep++;
      nextStepTime += secPerStep;
    }
    stepTimer = window.setTimeout(() => {
      if (!playing) return;
      const elapsed = ctx.currentTime - (nextStepTime - (60 / bpm / 4) * (scheduleStep - currentStep - 1));
      currentStep = Math.floor(ctx.currentTime / (60 / bpm / 4)) % STEPS;
      scheduleNext();
    }, 25);
  }

  function startSeq() {
    const ctx = getCtx();
    if (ctx.state === 'suspended') ctx.resume();
    playing = true;
    scheduleStep = 0;
    nextStepTime = ctx.currentTime + 0.05;
    currentStep = 0;

    let tickInterval = setInterval(() => {
      if (!playing) { clearInterval(tickInterval); return; }
      const secPerStep = 60 / bpm / 4;
      currentStep = Math.floor((ctx.currentTime - (nextStepTime - secPerStep * scheduleStep)) / secPerStep) % STEPS;
    }, 50);

    scheduleNext();
    track('tool_use', { tool: 'chiptune', bpm });
  }

  function stopSeq() {
    playing = false;
    currentStep = -1;
    clearTimeout(stepTimer);
  }

  function clearTrack(t: number) {
    grid[t] = Array.from({ length: NOTE_COUNT }, () => Array(STEPS).fill(false));
    grid = [...grid];
  }

  function randomize() {
    grid = Array.from({ length: TRACKS }, (_, t) =>
      Array.from({ length: NOTE_COUNT }, () =>
        Array.from({ length: STEPS }, () => Math.random() < (t === 0 ? 0.18 : t === 1 ? 0.22 : 0.14))
      )
    );
    track('tool_use', { tool: 'chiptune', action: 'random' });
  }

  function toggle(t: number, n: number, s: number) {
    grid[t][n][s] = !grid[t][n][s];
    grid = [...grid];
  }

  // beat presets
  function loadPreset(name: string) {
    const g: boolean[][][] = Array.from({ length: TRACKS }, () =>
      Array.from({ length: NOTE_COUNT }, () => Array(STEPS).fill(false))
    );
    if (name === 'Basic') {
      // lead: C5 on 1,5,9,13 + E4 on 3,7,11,15
      [0,4,8,12].forEach(s => g[0][0][s] = true);
      [2,6,10,14].forEach(s => g[0][4][s] = true);
      // bass: C4 on 1,9, G4 on 5,13
      [0,8].forEach(s => g[1][7][s] = true);
      [4,12].forEach(s => g[1][3][s] = true);
    } else if (name === 'Arpeggio') {
      [0,2,4,6,8,10,12,14].forEach((s,i) => g[2][i%NOTE_COUNT][s] = true);
      [1,3,5,7,9,11,13,15].forEach((s,i) => g[2][(i+2)%NOTE_COUNT][s] = true);
    }
    grid = g;
  }

  onDestroy(() => { if (typeof clearTimeout !== 'undefined') clearTimeout(stepTimer); });
</script>

<svelte:head>
  <title>8-bit Chiptune Sequencer — Online Pixel Music Maker | Station255</title>
  <meta name="description" content="Make 8-bit chiptune music in your browser. 3-track step sequencer with square, sawtooth and triangle waves. Free, no install, sounds amazing." />
</svelte:head>

<div class="tool-header">
  <h1 class="tool-title">CHIPTUNE SEQUENCER</h1>
  <p class="tool-sub">Click the grid to place notes. Hit play. Make something that sounds like it belongs in a 1987 Game Boy cartridge.</p>
</div>

<div class="transport panel">
  <button class="btn" onclick={() => playing ? stopSeq() : startSeq()}>
    {playing ? '⏹ Stop' : '▶ Play'}
  </button>
  <label class="ctrl-row">
    <span class="ctrl-label">BPM</span>
    <input type="range" min="60" max="220" step="1" bind:value={bpm} class="slider" disabled={playing} />
    <span class="ctrl-val">{bpm}</span>
  </label>
  <button class="btn secondary" onclick={randomize}>🎲 Random</button>
  <button class="btn secondary" onclick={() => loadPreset('Basic')}>Basic beat</button>
  <button class="btn secondary" onclick={() => loadPreset('Arpeggio')}>Arpeggio</button>
</div>

<div class="sequencer">
  {#each Array.from({ length: TRACKS }, (_, t) => t) as t}
    <div class="track">
      <div class="track-head">
        <span class="track-name" style="color:{TRACK_COLORS[t]}">{TRACK_NAMES[t]}</span>
        <span class="track-wave">{WAVEFORMS[t]}</span>
        <label class="vol-row">
          <span class="vol-label">vol</span>
          <input type="range" min="0" max="1" step="0.05" bind:value={volumes[t]} class="vol-slider" />
        </label>
        <button class="clear-btn" onclick={() => clearTrack(t)}>clr</button>
      </div>
      <div class="step-header">
        {#each Array.from({ length: STEPS }, (_, s) => s) as s}
          <div class="step-num" class:active={s === currentStep}>{s + 1}</div>
        {/each}
      </div>
      <div class="grid-area">
        {#each Array.from({ length: NOTE_COUNT }, (_, n) => n) as n}
          <div class="note-row">
            <span class="note-name">{NOTE_NAMES[n]}</span>
            {#each Array.from({ length: STEPS }, (_, s) => s) as s}
              <button
                class="step"
                class:on={grid[t][n][s]}
                class:beat={s % 4 === 0}
                class:current={s === currentStep}
                style={grid[t][n][s] ? `background:${TRACK_COLORS[t]};` : ''}
                onclick={() => toggle(t, n, s)}
                aria-label="{TRACK_NAMES[t]} {NOTE_NAMES[n]} step {s+1}"
              ></button>
            {/each}
          </div>
        {/each}
      </div>
    </div>
  {/each}
</div>

<div class="panel about">
  <h2 class="about-title">About the Chiptune Sequencer</h2>
  <p>This is a 16-step, 3-track sequencer using the Web Audio API. Each track uses a different oscillator waveform — square (classic NES/Game Boy), sawtooth (buzzy and bright), and triangle (soft bass tones).</p>
  <p>Click any cell to toggle a note on or off. Each row is a musical note from C4 to C5. Adjust BPM and per-track volume with the sliders. Works best with headphones.</p>
</div>

<style>
  .tool-header { padding: 1.25rem 0 1rem; border-bottom: 2px solid var(--line); margin-bottom: 1rem; }
  .tool-title { font-family: var(--display); font-size: 1.1rem; color: var(--accent-3); text-shadow: 3px 3px 0 var(--accent); margin: 0 0 0.5rem; }
  .tool-sub { color: var(--muted); font-size: 0.95rem; margin: 0; }

  .transport { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 1rem; }
  .ctrl-row { display: flex; align-items: center; gap: 0.4rem; }
  .ctrl-label { font-family: var(--display); font-size: 0.33rem; color: var(--muted); }
  .ctrl-val { font-family: var(--display); font-size: 0.33rem; color: var(--ink); min-width: 2.5rem; }
  .slider { width: 100px; accent-color: var(--accent-3); }

  .sequencer { display: flex; flex-direction: column; gap: 1rem; overflow-x: auto; }

  .track { background: var(--panel); border: 2px solid var(--line); padding: 0.6rem; }
  .track-head { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.4rem; flex-wrap: wrap; }
  .track-name { font-family: var(--display); font-size: 0.38rem; }
  .track-wave { font-size: 0.78rem; color: var(--muted); }
  .vol-row { display: flex; align-items: center; gap: 0.3rem; }
  .vol-label { font-family: var(--display); font-size: 0.3rem; color: var(--muted); }
  .vol-slider { width: 70px; accent-color: var(--accent-3); }
  .clear-btn { font-family: var(--display); font-size: 0.28rem; background: none; border: 1px solid var(--line); color: var(--muted); padding: 2px 6px; cursor: pointer; margin-left: auto; }
  .clear-btn:hover { color: var(--ink); }

  .step-header { display: flex; padding-left: 2.5rem; margin-bottom: 2px; }
  .step-num { width: 22px; text-align: center; font-size: 0.65rem; color: var(--muted); flex-shrink: 0; }
  .step-num.active { color: var(--accent-3); }

  .grid-area { display: flex; flex-direction: column; gap: 2px; }
  .note-row { display: flex; align-items: center; gap: 2px; }
  .note-name { font-family: var(--display); font-size: 0.28rem; color: var(--muted); width: 2.2rem; flex-shrink: 0; }
  .step {
    width: 22px; height: 18px; flex-shrink: 0;
    background: var(--bg); border: 1px solid var(--line);
    cursor: pointer; transition: background 0.04s;
  }
  .step:hover { border-color: var(--muted); }
  .step.beat { border-left: 1px solid var(--muted); }
  .step.on { border-color: transparent; }
  .step.current { outline: 1px solid rgba(255,255,255,0.5); }

  .about { margin-top: 1.5rem; }
  .about-title { font-family: var(--display); font-size: 0.5rem; color: var(--accent-3); margin: 0 0 0.75rem; }
  .about p { font-size: 0.9rem; color: var(--muted); line-height: 1.6; margin: 0 0 0.5rem; }
</style>
