<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { track } from '$lib/analytics';

  const SIZE = 4;
  const WIN_TILE = 256;

  let grid = $state<number[]>(Array(SIZE * SIZE).fill(0));
  let score = $state(0);
  let highScore = $state(0);
  let started = $state(false);
  let over = $state(false);
  let won = $state(false);
  let wonDismissed = false;

  const TILE_COLORS: Record<number, string> = {
    2: '#1c9c88', 4: '#21c6a8', 8: '#3fd2c9', 16: '#ffd23f',
    32: '#ffc23f', 64: '#ff9f3f', 128: '#ff7a52', 256: '#ff2e88',
    512: '#e0208c', 1024: '#c91f8c', 2048: '#a91cae',
  };
  function tileColor(v: number): string {
    return TILE_COLORS[v] ?? '#ff2e88';
  }

  function emptyCells(g: number[]): number[] {
    const out: number[] = [];
    for (let i = 0; i < g.length; i++) if (g[i] === 0) out.push(i);
    return out;
  }

  function addRandomTile(g: number[]) {
    const empties = emptyCells(g);
    if (empties.length === 0) return;
    const idx = empties[Math.floor(Math.random() * empties.length)];
    g[idx] = Math.random() < 0.9 ? 2 : 4;
  }

  function newGame() {
    const g = Array(SIZE * SIZE).fill(0);
    addRandomTile(g);
    addRandomTile(g);
    grid = g;
    score = 0;
    over = false;
    won = false;
    wonDismissed = false;
    started = true;
    track('tool_use', { tool: '256' });
  }

  function getRow(g: number[], r: number): number[] {
    return [g[r * SIZE], g[r * SIZE + 1], g[r * SIZE + 2], g[r * SIZE + 3]];
  }
  function setRow(g: number[], r: number, vals: number[]) {
    for (let c = 0; c < SIZE; c++) g[r * SIZE + c] = vals[c];
  }
  function getCol(g: number[], c: number): number[] {
    return [g[c], g[SIZE + c], g[2 * SIZE + c], g[3 * SIZE + c]];
  }
  function setCol(g: number[], c: number, vals: number[]) {
    for (let r = 0; r < SIZE; r++) g[r * SIZE + c] = vals[r];
  }

  function slideLine(line: number[]): { line: number[]; gained: number; moved: boolean } {
    const vals = line.filter((v) => v !== 0);
    const result: number[] = [];
    let gained = 0;
    for (let i = 0; i < vals.length; i++) {
      if (i < vals.length - 1 && vals[i] === vals[i + 1]) {
        const merged = vals[i] * 2;
        result.push(merged);
        gained += merged;
        i++;
      } else {
        result.push(vals[i]);
      }
    }
    while (result.length < line.length) result.push(0);
    const moved = result.some((v, i) => v !== line[i]);
    return { line: result, gained, moved };
  }

  function isGameOver(g: number[]): boolean {
    if (g.some((v) => v === 0)) return false;
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const v = g[r * SIZE + c];
        if (c < SIZE - 1 && g[r * SIZE + c + 1] === v) return false;
        if (r < SIZE - 1 && g[(r + 1) * SIZE + c] === v) return false;
      }
    }
    return true;
  }

  function move(dir: 'L' | 'R' | 'U' | 'D') {
    if (!started || over) return;
    const g = [...grid];
    let anyMoved = false;
    let gainedTotal = 0;

    const runLines = (count: number, get: (i: number) => number[], set: (i: number, v: number[]) => void, reverse: boolean) => {
      for (let i = 0; i < count; i++) {
        let line = get(i);
        if (reverse) line = [...line].reverse();
        const res = slideLine(line);
        gainedTotal += res.gained;
        if (res.moved) anyMoved = true;
        set(i, reverse ? [...res.line].reverse() : res.line);
      }
    };

    if (dir === 'L') runLines(SIZE, (r) => getRow(g, r), (r, v) => setRow(g, r, v), false);
    if (dir === 'R') runLines(SIZE, (r) => getRow(g, r), (r, v) => setRow(g, r, v), true);
    if (dir === 'U') runLines(SIZE, (c) => getCol(g, c), (c, v) => setCol(g, c, v), false);
    if (dir === 'D') runLines(SIZE, (c) => getCol(g, c), (c, v) => setCol(g, c, v), true);

    if (!anyMoved) return;

    addRandomTile(g);
    grid = g;
    score += gainedTotal;
    if (score > highScore) highScore = score;

    if (!won && !wonDismissed && g.some((v) => v >= WIN_TILE)) {
      won = true;
      track('tool_use', { tool: '256', won: true });
    }
    if (isGameOver(g)) over = true;
  }

  function keepPlaying() {
    won = false;
    wonDismissed = true;
  }

  function onKey(e: KeyboardEvent) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
    if (e.key === ' ') { if (!started || over) newGame(); return; }
    if (won) return;
    if (e.key === 'ArrowLeft') move('L');
    if (e.key === 'ArrowRight') move('R');
    if (e.key === 'ArrowUp') move('U');
    if (e.key === 'ArrowDown') move('D');
  }

  let touchStart = { x: 0, y: 0 };
  function onTouchStart(e: TouchEvent) {
    touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  function onTouchEnd(e: TouchEvent) {
    const dx = e.changedTouches[0].clientX - touchStart.x;
    const dy = e.changedTouches[0].clientY - touchStart.y;
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) { if (!started || over) newGame(); return; }
    if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 'R' : 'L');
    else move(dy > 0 ? 'D' : 'U');
  }

  onMount(() => {
    try { highScore = parseInt(localStorage.getItem('s255_256_hi') || '0'); } catch {}
    window.addEventListener('keydown', onKey);
  });
  onDestroy(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', onKey);
      if (score > highScore) highScore = score;
      try { localStorage.setItem('s255_256_hi', String(highScore)); } catch {}
    }
  });
</script>

<svelte:head>
  <title>256 — the byte-sized 2048, reach the max value | Station255</title>
  <meta
    name="description"
    content="256 is 2048 with an 8-bit twist: merge tiles and reach 256, the number just past the max value of a byte. Arrow keys or swipe. Free, no install."
  />
</svelte:head>

<div class="tool-header">
  <h1 class="tool-title">256</h1>
  <p class="tool-sub">2048's mechanics, Station255's number. Merge tiles, reach 256 — one past the max value of a byte.</p>
</div>

<div class="game-wrap">
  <div class="scoreboard">
    <div class="score-item">
      <span class="score-label">SCORE</span>
      <span class="score-val">{score}</span>
    </div>
    <div class="score-item">
      <span class="score-label">BEST</span>
      <span class="score-val">{highScore}</span>
    </div>
    {#if !started}
      <button class="btn start-btn" onclick={newGame}>▶ START</button>
    {:else if over}
      <button class="btn start-btn" onclick={newGame}>↺ RETRY</button>
    {:else}
      <button class="btn secondary start-btn" onclick={newGame}>↺ New</button>
    {/if}
  </div>

  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="board-wrap"
    ontouchstart={onTouchStart}
    ontouchend={onTouchEnd}
    tabindex="0"
    role="application"
    aria-label="256 puzzle game"
  >
    <div class="board">
      {#each grid as v, i}
        <div class="cell" class:filled={v !== 0} style={v !== 0 ? `background:${tileColor(v)}` : ''}>
          {#if v !== 0}<span class="cell-val" class:small={v >= 100}>{v}</span>{/if}
        </div>
      {/each}
    </div>

    {#if !started}
      <div class="overlay">
        <p class="overlay-title">256</p>
        <p class="overlay-sub">Arrows or swipe to move</p>
        <button class="btn" onclick={newGame}>▶ Start</button>
      </div>
    {:else if won}
      <div class="overlay">
        <p class="overlay-title win">256!</p>
        <p class="overlay-sub">You hit the byte ceiling. Score: {score}</p>
        <div class="overlay-actions">
          <button class="btn" onclick={keepPlaying}>Keep Playing</button>
          <button class="btn secondary" onclick={newGame}>New Game</button>
        </div>
      </div>
    {:else if over}
      <div class="overlay">
        <p class="overlay-title">GAME OVER</p>
        <p class="overlay-sub">Score: {score}</p>
        <button class="btn" onclick={newGame}>↺ Retry</button>
      </div>
    {/if}
  </div>
</div>

<section class="seo panel">
  <h2>About 256</h2>
  <p>
    Same merge-tile mechanics as the classic 2048 — slide tiles with the arrow keys, matching
    values combine and double — but with an on-brand target: reach the <strong>256</strong> tile,
    the number one past 255, the max value of an 8-bit byte. Keep playing past 256 for a higher
    score if you want to push further.
  </p>
  <div class="see-also">
    <span class="see-label">Related:</span>
    <a href="/pong">Pong</a>
    <a href="/snake">Snake</a>
    <a href="/breakout">Breakout</a>
  </div>
</section>

<style>
  .tool-header { padding: 1.25rem 0 1rem; border-bottom: 2px solid var(--line); margin-bottom: 1.5rem; }
  .tool-title { font-family: var(--display); font-size: 1.1rem; color: var(--accent-3); text-shadow: 3px 3px 0 var(--accent); margin: 0 0 0.5rem; }
  .tool-sub { color: var(--muted); font-size: 0.95rem; margin: 0; }

  .game-wrap { display: flex; flex-direction: column; align-items: center; gap: 1rem; }

  .scoreboard {
    display: flex; align-items: center; gap: 1.5rem; background: var(--panel);
    border: 2px solid var(--line); padding: 0.5rem 1.25rem; box-shadow: 4px 4px 0 #000;
  }
  .score-item { display: flex; flex-direction: column; align-items: center; gap: 0.15rem; }
  .score-label { font-family: var(--display); font-size: 0.3rem; color: var(--muted); }
  .score-val { font-family: var(--display); font-size: 0.65rem; color: var(--accent-3); }
  .start-btn { font-family: var(--display); font-size: 0.35rem; }

  .board-wrap {
    position: relative; touch-action: none; border: 3px solid var(--line); box-shadow: 6px 6px 0 #000;
    background: #100c22; padding: 8px;
  }
  .board {
    display: grid; grid-template-columns: repeat(4, 72px); grid-template-rows: repeat(4, 72px); gap: 8px;
  }
  .cell { background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; }
  .cell.filled { box-shadow: inset 0 0 0 2px rgba(0,0,0,0.25); }
  .cell-val { font-family: var(--display); font-size: 1rem; color: #fff; text-shadow: 2px 2px 0 rgba(0,0,0,0.4); }
  .cell-val.small { font-size: 0.75rem; }

  .overlay {
    position: absolute; inset: 8px; background: rgba(10, 8, 24, 0.88);
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.75rem;
    text-align: center; padding: 1rem;
  }
  .overlay-title { font-family: var(--display); font-size: 1.2rem; color: var(--accent-3); margin: 0; text-shadow: 3px 3px 0 var(--accent); }
  .overlay-title.win { color: var(--accent); text-shadow: 3px 3px 0 var(--accent-3); }
  .overlay-sub { color: var(--muted); font-size: 0.9rem; margin: 0; }
  .overlay-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: center; }

  @media (max-width: 420px) {
    .board { grid-template-columns: repeat(4, 60px); grid-template-rows: repeat(4, 60px); gap: 6px; }
  }
</style>
