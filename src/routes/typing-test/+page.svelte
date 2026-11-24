<script lang="ts">
  import { onMount } from 'svelte';
  import { track } from '$lib/analytics';

  const WORDS =
    `the of and to in is you that it he was for on are as with his they at be this have from or one had by word but not what all were we when your can said there use an each which she do how their if will up other about out many then them these so some her would make like him into time has look two more write go see number no way could people my than first water been call who oil its now find long down day did get come made may part over new sound take only little work know place year live me back give most very after thing our just name good sentence man think say great where help through much before line right too mean old any same tell boy follow came want show also around form three small set put end does another well large must big even such because turn here why ask went men read need land different home us move try kind hand picture again change off play spell air away animal house point page letter mother answer found study still learn should world high every near add food between own below country plant last school father keep tree never start city earth eye light thought head under story saw left few while along might close something seem next hard open example begin life always those both paper together got group often run`.split(
      ' '
    );

  const DURATIONS = [15, 30, 60];

  let duration = $state(30);
  let words = $state<string[]>([]);
  let wordIndex = $state(0);
  let typed = $state('');
  let results = $state<boolean[]>([]);
  let timeLeft = $state(30);
  let phase = $state<'idle' | 'running' | 'done'>('idle');
  let correctChars = $state(0);
  let inputEl: HTMLInputElement | undefined = $state();
  let timer: ReturnType<typeof setInterval> | undefined;

  const wpm = $derived.by(() => {
    const secondsUsed = phase === 'done' ? duration : duration - timeLeft;
    if (secondsUsed <= 0) return 0;
    return Math.round(correctChars / 5 / (secondsUsed / 60));
  });
  const accuracy = $derived(
    results.length === 0 ? 100 : Math.round((results.filter(Boolean).length / results.length) * 100)
  );

  function shuffle(): string[] {
    const pool = [...WORDS];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return [...pool, ...pool];
  }

  function reset() {
    clearInterval(timer);
    words = shuffle();
    wordIndex = 0;
    typed = '';
    results = [];
    correctChars = 0;
    timeLeft = duration;
    phase = 'idle';
    inputEl?.focus();
  }

  onMount(() => {
    words = shuffle();
    timeLeft = duration;
    return () => clearInterval(timer);
  });

  function start() {
    phase = 'running';
    track('tool_use', { tool: 'typing-test', duration });
    timer = setInterval(() => {
      timeLeft--;
      if (timeLeft <= 0) finish();
    }, 1000);
  }

  function finish() {
    clearInterval(timer);
    timeLeft = 0;
    phase = 'done';
    track('tool_use', { tool: 'typing-test', action: 'finish', wpm, accuracy, duration });
  }

  function onKey(e: KeyboardEvent) {
    if (phase === 'done') return;
    if (phase === 'idle' && e.key.length === 1) start();
    if (e.key === ' ') {
      e.preventDefault();
      if (typed.length === 0) return;
      const ok = typed === words[wordIndex];
      results = [...results, ok];
      if (ok) correctChars += words[wordIndex].length + 1;
      wordIndex++;
      typed = '';
    }
  }

  function setDuration(d: number) {
    duration = d;
    reset();
  }

  async function share() {
    await navigator.clipboard.writeText(
      `${wpm} WPM at ${accuracy}% accuracy (${duration}s) on the Station255 typing test\nstation255.com/typing-test`
    );
    track('export', { tool: 'typing-test', type: 'share' });
  }
</script>

<svelte:head>
  <title>Typing Test — Free WPM Speed Test, Retro Arcade Style | Station255</title>
  <meta
    name="description"
    content="Free typing speed test. Measure your WPM and accuracy in 15, 30, or 60 seconds — no sign-up, no ads chasing your cursor. Retro arcade styling, instant results."
  />
</svelte:head>

<div class="tool-header">
  <h1 class="tool-title">TYPING TEST</h1>
  <p class="tool-sub">Type the words, press space after each one. Timer starts on your first keystroke.</p>
</div>

<div class="game-bar panel">
  <span class="stat">TIME <strong>{timeLeft}s</strong></span>
  <span class="stat">WPM <strong>{phase === 'idle' ? '—' : wpm}</strong></span>
  <span class="stat">ACC <strong>{phase === 'idle' ? '—' : accuracy + '%'}</strong></span>
  <div class="durations" role="group" aria-label="Test duration">
    {#each DURATIONS as d}
      <button class="dur-btn" class:on={duration === d} onclick={() => setDuration(d)} disabled={phase === 'running'}>{d}s</button>
    {/each}
  </div>
  <button class="btn secondary small" onclick={reset}>↻ Restart</button>
</div>

{#if phase === 'done'}
  <div class="result panel">
    <p class="result-big">{wpm} WPM</p>
    <p class="result-sub">{accuracy}% accuracy · {results.filter(Boolean).length}/{results.length} words · {duration}s</p>
    <p class="result-rank">
      {#if wpm >= 80}RANK: ARCADE LEGEND{:else if wpm >= 60}RANK: SPEEDRUNNER{:else if wpm >= 40}RANK: PLAYER TWO{:else}RANK: BUTTON MASHER{/if}
    </p>
    <div class="result-actions">
      <button class="btn" onclick={share}>⧉ Copy score</button>
      <button class="btn secondary" onclick={reset}>Play again</button>
    </div>
  </div>
{:else}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="track panel" onclick={() => inputEl?.focus()}>
    <div class="words">
      {#each words.slice(Math.max(0, wordIndex - 5), wordIndex + 25) as word, i}
        {@const gi = Math.max(0, wordIndex - 5) + i}
        <span
          class="word"
          class:current={gi === wordIndex}
          class:ok={gi < wordIndex && results[gi]}
          class:bad={gi < wordIndex && !results[gi]}
          class:mistyped={gi === wordIndex && typed.length > 0 && !word.startsWith(typed)}
        >{word}</span>
      {/each}
    </div>
    <input
      bind:this={inputEl}
      bind:value={typed}
      onkeydown={onKey}
      class="type-input"
      placeholder={phase === 'idle' ? 'start typing…' : ''}
      autocomplete="off"
      autocapitalize="off"
      spellcheck="false"
    />
  </div>
{/if}

<section class="seo panel">
  <h2>About this typing test</h2>
  <p>
    A clean <strong>words-per-minute test</strong> with none of the usual clutter: pick 15, 30, or
    60 seconds, start typing, press space after each word. WPM is calculated the standard way —
    correct characters divided by five, per minute — so scores are comparable with other tests.
  </p>
  <h3>What's a good WPM?</h3>
  <p>
    The average typist lands around <strong>40 WPM</strong>. 60+ is fast, 80+ is very fast, and
    100+ puts you in serious mechanical-keyboard-forum territory. Accuracy matters more than raw
    speed though — a miss costs you the whole word here.
  </p>
  <h3>How can I get faster?</h3>
  <p>
    Stop looking at the keyboard, slow down until you stop making errors, then let speed come
    back on its own. Short daily runs beat long occasional ones.
  </p>
  <div class="see-also">
    <span class="see-label">More games:</span>
    <a href="/picross">Daily Picross</a>
    <a href="/snake">Snake</a>
    <a href="/pong">Pong</a>
  </div>
</section>

<style>
  .tool-header { padding: 1.25rem 0 1rem; border-bottom: 2px solid var(--line); margin-bottom: 1.5rem; }
  .tool-title { font-family: var(--display); font-size: 1.1rem; color: var(--accent-3); text-shadow: 3px 3px 0 var(--accent); margin: 0 0 0.5rem; }
  .tool-sub { color: var(--muted); font-size: 0.95rem; margin: 0; }

  .game-bar { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; margin-bottom: 1rem; }
  .stat { font-family: var(--display); font-size: 0.45rem; color: var(--muted); }
  .stat strong { color: var(--accent-3); margin-left: 0.3rem; }
  .durations { display: flex; gap: 0.3rem; margin-left: auto; }
  .dur-btn {
    font-family: var(--display); font-size: 0.4rem; padding: 0.5rem 0.6rem; cursor: pointer;
    background: none; border: 2px solid var(--line); color: var(--muted);
  }
  .dur-btn.on { border-color: var(--accent-3); color: var(--accent-3); }
  .dur-btn:disabled { opacity: 0.4; cursor: default; }
  .btn.small { font-size: 0.4rem; padding: 0.5rem 0.6rem; }

  .track { cursor: text; margin-bottom: 1.5rem; }
  .words { display: flex; flex-wrap: wrap; gap: 0.35rem 0.6rem; font-size: 1.35rem; line-height: 1.5; margin-bottom: 1rem; min-height: 6.5rem; align-content: flex-start; }
  .word { color: var(--muted); }
  .word.current { color: var(--ink); background: rgba(255, 255, 255, 0.08); outline: 2px solid var(--accent-3); padding: 0 0.15rem; }
  .word.current.mistyped { outline-color: var(--accent); }
  .word.ok { color: var(--accent-2); }
  .word.bad { color: var(--accent); text-decoration: line-through; }
  .type-input {
    width: 100%; background: var(--bg); border: 2px solid var(--line); color: var(--ink);
    font-family: var(--body); font-size: 1.3rem; padding: 0.5rem 0.75rem;
  }
  .type-input:focus { outline: none; border-color: var(--accent-3); }

  .result { text-align: center; margin-bottom: 1.5rem; }
  .result-big { font-family: var(--display); font-size: 1.6rem; color: var(--accent-3); text-shadow: 3px 3px 0 var(--accent); margin: 0.5rem 0; }
  .result-sub { color: var(--muted); margin: 0 0 0.5rem; }
  .result-rank { font-family: var(--display); font-size: 0.5rem; color: var(--accent-2); margin: 0 0 1rem; }
  .result-actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
</style>
