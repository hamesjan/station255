<script lang="ts">
  import { onMount } from 'svelte';
  import { track } from '$lib/analytics';

  type Phase = 'work' | 'short' | 'long';
  const LABELS: Record<Phase, string> = { work: 'FOCUS', short: 'SHORT BREAK', long: 'LONG BREAK' };

  let workMin = $state(25);
  let shortMin = $state(5);
  let longMin = $state(15);
  let phase = $state<Phase>('work');
  let secondsLeft = $state(25 * 60);
  let running = $state(false);
  let completedWorks = $state(0);
  let timer: ReturnType<typeof setInterval> | undefined;

  const phaseTotal = $derived(
    (phase === 'work' ? workMin : phase === 'short' ? shortMin : longMin) * 60
  );
  const blocks = $derived.by(() => {
    const total = 20;
    const done = Math.round(((phaseTotal - secondsLeft) / phaseTotal) * total);
    return Array.from({ length: total }, (_, i) => i < done);
  });

  function fmt(s: number): string {
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }

  function chime(kind: 'work' | 'break') {
    try {
      const ctx = new AudioContext();
      const notes = kind === 'break' ? [523.25, 659.25, 783.99] : [783.99, 659.25, 523.25];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.14);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.15);
        osc.stop(ctx.currentTime + i * 0.15 + 0.15);
      });
      setTimeout(() => ctx.close(), 1000);
    } catch {
      // audio blocked — timer still works
    }
  }

  function nextPhase() {
    if (phase === 'work') {
      completedWorks++;
      phase = completedWorks % 4 === 0 ? 'long' : 'short';
      chime('break');
    } else {
      phase = 'work';
      chime('work');
    }
    secondsLeft = phaseTotal;
    track('tool_use', { tool: 'pomodoro', action: 'phase', phase, completedWorks });
  }

  function tick() {
    secondsLeft--;
    if (secondsLeft <= 0) nextPhase();
    document.title = `${fmt(secondsLeft)} ${LABELS[phase]} · Station255`;
  }

  function toggle() {
    running = !running;
    if (running) {
      timer = setInterval(tick, 1000);
      track('tool_use', { tool: 'pomodoro', action: 'start', phase });
    } else {
      clearInterval(timer);
    }
  }

  function reset() {
    clearInterval(timer);
    running = false;
    phase = 'work';
    completedWorks = 0;
    secondsLeft = workMin * 60;
    document.title = 'Pixel Pomodoro · Station255';
  }

  function skip() {
    nextPhase();
  }

  // Keep the countdown in sync if durations change while idle at full time.
  $effect(() => {
    workMin; shortMin; longMin;
    if (!running && secondsLeft === 0) secondsLeft = phaseTotal;
  });
  function applyDurations() {
    if (!running) secondsLeft = phaseTotal;
  }

  onMount(() => () => clearInterval(timer));
</script>

<svelte:head>
  <title>Pixel Pomodoro — Free Online Pomodoro Timer with 8-bit Chimes | Station255</title>
  <meta
    name="description"
    content="A free pomodoro timer with retro pixel style and 8-bit chimes. 25/5 focus cycles, long breaks, tab-title countdown. No account, no install — just press start."
  />
</svelte:head>

<div class="tool-header">
  <h1 class="tool-title">PIXEL POMODORO</h1>
  <p class="tool-sub">25 minutes of focus, 5 of rest, a long break every 4 rounds. The tab title counts down with you.</p>
</div>

<div class="timer panel" class:break={phase !== 'work'}>
  <p class="phase-label">{LABELS[phase]}</p>
  <p class="clock">{fmt(secondsLeft)}</p>
  <div class="blocks" aria-hidden="true">
    {#each blocks as on}<span class="block" class:on></span>{/each}
  </div>
  <div class="dots" title="{completedWorks} focus rounds completed">
    {#each Array(4) as _, i}
      <span class="dot" class:on={i < completedWorks % 4 || (completedWorks > 0 && completedWorks % 4 === 0)}></span>
    {/each}
    {#if completedWorks >= 4}<span class="dot-count">×{completedWorks}</span>{/if}
  </div>
  <div class="timer-actions">
    <button class="btn" onclick={toggle}>{running ? '❚❚ Pause' : '▶ Start'}</button>
    <button class="btn secondary" onclick={skip}>Skip →</button>
    <button class="btn secondary" onclick={reset}>↻ Reset</button>
  </div>
</div>

<details class="settings panel">
  <summary>Timer settings</summary>
  <div class="setting-rows">
    <label class="setting-row">
      <span>Focus</span>
      <input type="number" min="1" max="120" bind:value={workMin} onchange={applyDurations} /> min
    </label>
    <label class="setting-row">
      <span>Short break</span>
      <input type="number" min="1" max="60" bind:value={shortMin} onchange={applyDurations} /> min
    </label>
    <label class="setting-row">
      <span>Long break</span>
      <input type="number" min="1" max="60" bind:value={longMin} onchange={applyDurations} /> min
    </label>
  </div>
</details>

<section class="seo panel">
  <h2>About the Pomodoro Technique</h2>
  <p>
    The pomodoro technique is simple: work in <strong>25-minute focused sprints</strong>, then
    take a 5-minute break, and a longer 15-minute break after every fourth sprint. The strict
    countdown turns "I'll work for a while" into a concrete, finishable unit — which is exactly
    why it works for studying, coding, and writing.
  </p>
  <h3>Why this timer?</h3>
  <p>
    It runs entirely in your browser with no account, tracks your rounds, shows the countdown in
    the tab title so you can switch away, and plays a short 8-bit chime when a phase ends. All
    three durations are adjustable if 25/5/15 isn't your rhythm.
  </p>
  <h3>Does it work in a background tab?</h3>
  <p>
    Yes — the countdown continues and the tab title keeps updating. Keep your sound on to catch
    the chime when a focus round ends.
  </p>
  <div class="see-also">
    <span class="see-label">Related:</span>
    <a href="/pixel-clock">Pixel Clock</a>
    <a href="/sfx">8-bit SFX</a>
    <a href="/chiptune">Chiptune Sequencer</a>
  </div>
</section>

<style>
  .tool-header { padding: 1.25rem 0 1rem; border-bottom: 2px solid var(--line); margin-bottom: 1.5rem; }
  .tool-title { font-family: var(--display); font-size: 1.1rem; color: var(--accent-3); text-shadow: 3px 3px 0 var(--accent); margin: 0 0 0.5rem; }
  .tool-sub { color: var(--muted); font-size: 0.95rem; margin: 0; }

  .timer { text-align: center; padding: 2rem 1rem; margin-bottom: 1rem; }
  .timer.break { border-color: var(--accent-2); }
  .phase-label { font-family: var(--display); font-size: 0.55rem; color: var(--accent); margin: 0 0 0.75rem; }
  .timer.break .phase-label { color: var(--accent-2); }
  .clock { font-family: var(--display); font-size: 3rem; color: var(--ink); margin: 0 0 1rem; text-shadow: 4px 4px 0 rgba(0, 0, 0, 0.4); }
  .blocks { display: flex; gap: 3px; justify-content: center; margin-bottom: 1rem; flex-wrap: wrap; }
  .block { width: 12px; height: 12px; background: var(--bg); border: 1px solid var(--line); }
  .block.on { background: var(--accent-3); border-color: var(--accent-3); }
  .timer.break .block.on { background: var(--accent-2); border-color: var(--accent-2); }
  .dots { display: flex; gap: 6px; justify-content: center; align-items: center; margin-bottom: 1.25rem; }
  .dot { width: 8px; height: 8px; background: var(--bg); border: 1px solid var(--line); }
  .dot.on { background: var(--accent); border-color: var(--accent); }
  .dot-count { font-size: 0.75rem; color: var(--muted); }
  .timer-actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }

  .settings { margin-bottom: 1.5rem; }
  .settings summary { cursor: pointer; font-family: var(--display); font-size: 0.4rem; color: var(--muted); }
  .setting-rows { display: flex; gap: 1.5rem; flex-wrap: wrap; margin-top: 0.75rem; }
  .setting-row { display: flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; color: var(--muted); }
  .setting-row input {
    width: 4rem; background: var(--bg); border: 2px solid var(--line); color: var(--ink);
    font-family: var(--body); font-size: 1rem; padding: 0.2rem 0.4rem;
  }
</style>
