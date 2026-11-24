<script lang="ts">
  import { onMount } from 'svelte';
  import { track } from '$lib/analytics';

  const SIZE = 10;
  const LAUNCH_UTC = Date.UTC(2026, 6, 11); // daily puzzle #1

  function mulberry32(seed: number) {
    return () => {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function lineClues(line: boolean[]): number[] {
    const out: number[] = [];
    let run = 0;
    for (const v of line) {
      if (v) run++;
      else if (run > 0) {
        out.push(run);
        run = 0;
      }
    }
    if (run > 0) out.push(run);
    return out.length ? out : [0];
  }

  function generate(seed: number): boolean[][] {
    const rand = mulberry32(seed);
    return Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => rand() < 0.55));
  }

  // 0 = empty, 1 = filled, 2 = marked X
  let target = $state<boolean[][]>([]);
  let player = $state<number[][]>([]);
  let mode = $state<'fill' | 'mark'>('fill');
  let won = $state(false);
  let elapsed = $state(0);
  let started = $state(false);
  let isDaily = $state(true);
  let puzzleNum = $state(0);
  let copied = $state(false);
  let timer: ReturnType<typeof setInterval> | undefined;

  const rowClues = $derived(target.map((row) => lineClues(row)));
  const colClues = $derived(
    target.length ? Array.from({ length: SIZE }, (_, x) => lineClues(target.map((row) => row[x]))) : []
  );
  const maxColClue = $derived(colClues.length ? Math.max(...colClues.map((c) => c.length)) : 0);

  const rowDone = $derived(
    player.map((row, y) => {
      const runs = lineClues(row.map((v) => v === 1));
      return JSON.stringify(runs) === JSON.stringify(rowClues[y] ?? []);
    })
  );
  const colDone = $derived(
    colClues.map((clue, x) => {
      const runs = lineClues(player.map((row) => row[x] === 1));
      return JSON.stringify(runs) === JSON.stringify(clue);
    })
  );

  function freshBoard() {
    player = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    won = false;
    started = false;
    elapsed = 0;
    copied = false;
    clearInterval(timer);
  }

  function loadDaily() {
    const now = new Date();
    const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    puzzleNum = Math.floor((todayUTC - LAUNCH_UTC) / 86400000) + 1;
    target = generate(todayUTC / 86400000);
    isDaily = true;
    freshBoard();
  }

  function loadRandom() {
    target = generate(Math.floor(Math.random() * 2 ** 31));
    isDaily = false;
    freshBoard();
  }

  onMount(() => {
    loadDaily();
    return () => clearInterval(timer);
  });

  function startTimer() {
    if (started) return;
    started = true;
    timer = setInterval(() => {
      if (!won) elapsed++;
    }, 1000);
    track('tool_use', { tool: 'picross', puzzle: isDaily ? puzzleNum : 'random' });
  }

  function checkWin() {
    if (rowDone.every(Boolean) && colDone.every(Boolean)) {
      won = true;
      clearInterval(timer);
      track('tool_use', { tool: 'picross', action: 'win', seconds: elapsed, puzzle: isDaily ? puzzleNum : 'random' });
    }
  }

  function tap(y: number, x: number, rightClick = false) {
    if (won) return;
    startTimer();
    const cur = player[y][x];
    const wantMark = rightClick || mode === 'mark';
    const next = wantMark ? (cur === 2 ? 0 : 2) : cur === 1 ? 0 : 1;
    player[y][x] = next;
    checkWin();
  }

  function fmtTime(s: number): string {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  async function share() {
    const text = isDaily
      ? `Station255 Daily Picross #${puzzleNum} — solved in ${fmtTime(elapsed)}\nstation255.com/picross`
      : `Station255 Picross — solved a random 10×10 in ${fmtTime(elapsed)}\nstation255.com/picross`;
    await navigator.clipboard.writeText(text);
    copied = true;
    track('export', { tool: 'picross', type: 'share' });
  }
</script>

<svelte:head>
  <title>Daily Picross — Free Online Nonogram Puzzle, New Every Day | Station255</title>
  <meta
    name="description"
    content="Play a free daily picross (nonogram) puzzle online. A new 10x10 logic puzzle every day — use the number clues to fill the grid and reveal the picture. No account, no ads in your face."
  />
</svelte:head>

<div class="tool-header">
  <h1 class="tool-title">DAILY PICROSS</h1>
  <p class="tool-sub">
    {#if isDaily}Puzzle #{puzzleNum} · a new one drops at midnight UTC{:else}Random practice puzzle{/if}
    — fill cells so every row and column matches its number clues.
  </p>
</div>

<div class="game-bar panel">
  <span class="stat">TIME <strong>{fmtTime(elapsed)}</strong></span>
  <div class="mode-toggle" role="group" aria-label="Click mode">
    <button class="mode-btn" class:on={mode === 'fill'} onclick={() => (mode = 'fill')}>■ Fill</button>
    <button class="mode-btn" class:on={mode === 'mark'} onclick={() => (mode = 'mark')}>× Mark</button>
  </div>
  <span class="bar-hint">right-click also marks</span>
  <div class="bar-actions">
    {#if !isDaily}
      <button class="btn secondary small" onclick={loadDaily}>Today's puzzle</button>
    {/if}
    <button class="btn secondary small" onclick={loadRandom}>Random puzzle</button>
  </div>
</div>

{#if won}
  <div class="win panel">
    <p class="win-title">SOLVED!</p>
    <p class="win-sub">
      {isDaily ? `Daily Picross #${puzzleNum}` : 'Random puzzle'} in <strong>{fmtTime(elapsed)}</strong>
    </p>
    <button class="btn" onclick={share}>{copied ? 'copied to clipboard!' : '⧉ Share your time'}</button>
  </div>
{/if}

{#if target.length}
  <div class="board-wrap">
    <div class="board" style="--n:{SIZE}">
      <div class="corner" style="grid-row: span 1"></div>
      {#each colClues as clue, x}
        <div class="col-clue" class:done={colDone[x]} style="min-height: {maxColClue * 1.05}rem">
          {#each clue as c}<span>{c}</span>{/each}
        </div>
      {/each}
      {#each player as row, y}
        <div class="row-clue" class:done={rowDone[y]}>
          {#each rowClues[y] as c}<span>{c}</span>{/each}
        </div>
        {#each row as cell, x}
          <button
            class="cell"
            class:filled={cell === 1}
            class:marked={cell === 2}
            class:won
            class:thick-r={(x + 1) % 5 === 0 && x < SIZE - 1}
            class:thick-b={(y + 1) % 5 === 0 && y < SIZE - 1}
            onclick={() => tap(y, x)}
            oncontextmenu={(e) => { e.preventDefault(); tap(y, x, true); }}
            aria-label="Row {y + 1} column {x + 1}"
          >{cell === 2 && !won ? '×' : ''}</button>
        {/each}
      {/each}
    </div>
  </div>
{/if}

<section class="seo panel">
  <h2>How to play Picross (nonograms)</h2>
  <p>
    Picross — also called nonograms, griddlers, or hanjie — is a logic puzzle where number clues
    tell you which cells to fill. Each number is a run of consecutive filled cells in that row or
    column, in order, with <strong>at least one empty cell between runs</strong>. "3 1" means a
    block of three, a gap, then a single cell.
  </p>
  <h3>Basic strategy</h3>
  <p>
    Start with big numbers: on a 10-wide row, a "10" fills everything, and a "9" guarantees the
    middle 8 cells either way. Use the Mark mode (or right-click) to put an × on cells you know
    are empty — eliminating cells is half the game. Completed lines dim their clues automatically.
  </p>
  <h3>When does the daily puzzle reset?</h3>
  <p>
    A new puzzle is generated at <strong>midnight UTC</strong> every day — the same puzzle for
    everyone, so times are comparable. Between dailies, the random button gives you unlimited
    practice grids.
  </p>
  <div class="see-also">
    <span class="see-label">More games:</span>
    <a href="/minesweeper">Minesweeper</a>
    <a href="/snake">Snake</a>
    <a href="/256">256</a>
  </div>
</section>

<style>
  .tool-header { padding: 1.25rem 0 1rem; border-bottom: 2px solid var(--line); margin-bottom: 1.5rem; }
  .tool-title { font-family: var(--display); font-size: 1.1rem; color: var(--accent-3); text-shadow: 3px 3px 0 var(--accent); margin: 0 0 0.5rem; }
  .tool-sub { color: var(--muted); font-size: 0.95rem; margin: 0; }

  .game-bar { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; margin-bottom: 1rem; }
  .stat { font-family: var(--display); font-size: 0.45rem; color: var(--muted); }
  .stat strong { color: var(--accent-3); margin-left: 0.3rem; }
  .mode-toggle { display: flex; gap: 0.3rem; }
  .mode-btn {
    font-family: var(--display); font-size: 0.4rem; padding: 0.5rem 0.6rem; cursor: pointer;
    background: none; border: 2px solid var(--line); color: var(--muted);
  }
  .mode-btn.on { border-color: var(--accent-3); color: var(--accent-3); }
  .bar-hint { font-size: 0.75rem; color: var(--muted); }
  .bar-actions { margin-left: auto; display: flex; gap: 0.5rem; }
  .btn.small { font-size: 0.4rem; padding: 0.5rem 0.6rem; }

  .win { text-align: center; margin-bottom: 1rem; border-color: var(--accent-2); }
  .win-title { font-family: var(--display); font-size: 0.8rem; color: var(--accent-2); margin: 0 0 0.4rem; }
  .win-sub { color: var(--muted); margin: 0 0 0.75rem; }

  .board-wrap { overflow-x: auto; margin-bottom: 1.5rem; }
  .board {
    display: grid;
    grid-template-columns: auto repeat(var(--n), minmax(1.6rem, 2.2rem));
    width: fit-content;
    margin: 0 auto;
  }
  .col-clue {
    display: flex; flex-direction: column; justify-content: flex-end; align-items: center;
    gap: 0.05rem; padding: 0.2rem 0; font-size: 0.75rem; color: var(--ink); line-height: 1;
  }
  .row-clue {
    display: flex; justify-content: flex-end; align-items: center; gap: 0.35rem;
    padding: 0 0.5rem 0 0.2rem; font-size: 0.75rem; color: var(--ink);
  }
  .col-clue.done, .row-clue.done { color: var(--muted); opacity: 0.5; }
  .cell {
    aspect-ratio: 1; border: 1px solid var(--line); background: var(--panel); cursor: pointer;
    color: var(--muted); font-size: 0.85rem; line-height: 1; padding: 0;
  }
  .cell:hover:not(.won) { border-color: var(--accent-3); }
  .cell.filled { background: var(--accent-3); border-color: var(--accent-3); }
  .cell.marked { background: var(--bg); }
  .cell.won { cursor: default; }
  .cell.won.filled { background: var(--accent-2); border-color: var(--accent-2); }
  .cell.thick-r { border-right-width: 3px; }
  .cell.thick-b { border-bottom-width: 3px; }
</style>
