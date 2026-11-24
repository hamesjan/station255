<script lang="ts">
  import { onMount } from 'svelte';
  import { track } from '$lib/analytics';

  type Cell = { mine: boolean; revealed: boolean; flagged: boolean; adj: number };
  type Level = { id: string; label: string; w: number; h: number; mines: number };

  const LEVELS: Level[] = [
    { id: 'easy', label: 'Easy', w: 9, h: 9, mines: 10 },
    { id: 'medium', label: 'Medium', w: 16, h: 16, mines: 40 },
    { id: 'hard', label: 'Hard', w: 30, h: 16, mines: 99 },
  ];

  let level = $state<Level>(LEVELS[0]);
  let grid = $state<Cell[][]>([]);
  let minesPlaced = $state(false);
  let status = $state<'playing' | 'won' | 'lost'>('playing');
  let elapsed = $state(0);
  let flagMode = $state(false);
  let timer: ReturnType<typeof setInterval> | undefined;

  const flagsUsed = $derived(grid.flat().filter((c) => c.flagged).length);

  function newGame(l: Level = level) {
    level = l;
    clearInterval(timer);
    timer = undefined;
    elapsed = 0;
    minesPlaced = false;
    status = 'playing';
    grid = Array.from({ length: l.h }, () =>
      Array.from({ length: l.w }, () => ({ mine: false, revealed: false, flagged: false, adj: 0 }))
    );
  }

  onMount(() => {
    newGame();
    return () => clearInterval(timer);
  });

  function neighbors(y: number, x: number): [number, number][] {
    const out: [number, number][] = [];
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        if (dy === 0 && dx === 0) continue;
        const ny = y + dy;
        const nx = x + dx;
        if (ny >= 0 && ny < level.h && nx >= 0 && nx < level.w) out.push([ny, nx]);
      }
    return out;
  }

  function placeMines(safeY: number, safeX: number) {
    const banned = new Set([`${safeY},${safeX}`, ...neighbors(safeY, safeX).map(([y, x]) => `${y},${x}`)]);
    let placed = 0;
    while (placed < level.mines) {
      const y = Math.floor(Math.random() * level.h);
      const x = Math.floor(Math.random() * level.w);
      if (banned.has(`${y},${x}`) || grid[y][x].mine) continue;
      grid[y][x].mine = true;
      placed++;
    }
    for (let y = 0; y < level.h; y++)
      for (let x = 0; x < level.w; x++)
        grid[y][x].adj = neighbors(y, x).filter(([ny, nx]) => grid[ny][nx].mine).length;
    minesPlaced = true;
    timer = setInterval(() => elapsed++, 1000);
    track('tool_use', { tool: 'minesweeper', level: level.id });
  }

  function flood(y: number, x: number) {
    const stack: [number, number][] = [[y, x]];
    while (stack.length) {
      const [cy, cx] = stack.pop()!;
      const cell = grid[cy][cx];
      if (cell.revealed || cell.flagged) continue;
      cell.revealed = true;
      if (cell.adj === 0 && !cell.mine) {
        for (const n of neighbors(cy, cx)) {
          if (!grid[n[0]][n[1]].revealed) stack.push(n);
        }
      }
    }
  }

  function endGame(won: boolean) {
    status = won ? 'won' : 'lost';
    clearInterval(timer);
    if (!won) {
      for (const row of grid) for (const c of row) if (c.mine) c.revealed = true;
    }
    track('tool_use', { tool: 'minesweeper', action: won ? 'win' : 'lose', level: level.id, seconds: elapsed });
  }

  function checkWin() {
    const unrevealedSafe = grid.flat().some((c) => !c.mine && !c.revealed);
    if (!unrevealedSafe) endGame(true);
  }

  function reveal(y: number, x: number) {
    if (status !== 'playing') return;
    const cell = grid[y][x];
    if (cell.revealed) return;
    if (flagMode) {
      cell.flagged = !cell.flagged;
      return;
    }
    if (cell.flagged) return;
    if (!minesPlaced) placeMines(y, x);
    if (grid[y][x].mine) {
      cell.revealed = true;
      endGame(false);
      return;
    }
    flood(y, x);
    checkWin();
  }

  function flag(y: number, x: number) {
    if (status !== 'playing') return;
    const cell = grid[y][x];
    if (!cell.revealed) cell.flagged = !cell.flagged;
  }

  function fmtTime(s: number): string {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  const NUM_COLORS = ['', '#5599ff', '#55cc55', '#ff5555', '#c58fff', '#ff9900', '#21e6c1', '#ffd23f', '#ffffff'];
</script>

<svelte:head>
  <title>Minesweeper — Play the Classic Free Online, No Ads in Your Way | Station255</title>
  <meta
    name="description"
    content="Play Minesweeper free online. Easy, medium, and hard boards, first-click always safe, flag mode for touch screens. The desktop classic in retro arcade style."
  />
</svelte:head>

<div class="tool-header">
  <h1 class="tool-title">MINESWEEPER</h1>
  <p class="tool-sub">Numbers count the mines in the 8 cells around them. Flag the bombs, reveal everything else.</p>
</div>

<div class="game-bar panel">
  <span class="stat">MINES <strong>{level.mines - flagsUsed}</strong></span>
  <span class="stat">TIME <strong>{fmtTime(elapsed)}</strong></span>
  <button class="mode-btn" class:on={flagMode} onclick={() => (flagMode = !flagMode)} title="Tap cells to flag instead of reveal">
    ⚑ Flag mode
  </button>
  <div class="bar-actions">
    {#each LEVELS as l}
      <button class="dur-btn" class:on={level.id === l.id} onclick={() => newGame(l)}>{l.label}</button>
    {/each}
  </div>
</div>

{#if status !== 'playing'}
  <div class="banner panel" class:won={status === 'won'}>
    <span class="banner-text">{status === 'won' ? `CLEARED in ${fmtTime(elapsed)}!` : 'BOOM. GAME OVER'}</span>
    <button class="btn" onclick={() => newGame()}>↻ New game</button>
  </div>
{/if}

<div class="board-wrap">
  <div class="board" style="grid-template-columns: repeat({level.w}, 1.7rem)">
    {#each grid as row, y}
      {#each row as cell, x}
        <button
          class="cell"
          class:open={cell.revealed}
          class:boom={cell.revealed && cell.mine}
          onclick={() => reveal(y, x)}
          oncontextmenu={(e) => { e.preventDefault(); flag(y, x); }}
          aria-label="Cell {y + 1},{x + 1}"
          style={cell.revealed && !cell.mine && cell.adj > 0 ? `color:${NUM_COLORS[cell.adj]}` : ''}
        >
          {#if cell.revealed}
            {cell.mine ? '✸' : cell.adj > 0 ? cell.adj : ''}
          {:else if cell.flagged}
            ⚑
          {/if}
        </button>
      {/each}
    {/each}
  </div>
</div>
<p class="hint">Right-click (or Flag mode on touch) to flag · first click is always safe</p>

<section class="seo panel">
  <h2>How to play Minesweeper</h2>
  <p>
    Every number tells you how many mines touch that cell — including diagonals. Use overlapping
    numbers to deduce which hidden cells <strong>must</strong> be mines (flag them) and which must
    be safe (reveal them). Clear every safe cell to win.
  </p>
  <h3>Classic logic patterns</h3>
  <p>
    Learn the <strong>1-2-1</strong> pattern (the cells under the 1s are safe, under the 2 is a
    mine) and the <strong>1-1</strong> edge pattern, and most easy boards solve themselves. When a
    revealed number already has all its mines flagged, everything else it touches is safe.
  </p>
  <h3>Is the first click safe?</h3>
  <p>
    Yes — mines are placed after your first click, and never on it or next to it, so you always
    start with an open area instead of an instant loss.
  </p>
  <div class="see-also">
    <span class="see-label">More games:</span>
    <a href="/picross">Daily Picross</a>
    <a href="/breakout">Breakout</a>
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
  .mode-btn, .dur-btn {
    font-family: var(--display); font-size: 0.4rem; padding: 0.5rem 0.6rem; cursor: pointer;
    background: none; border: 2px solid var(--line); color: var(--muted);
  }
  .mode-btn.on, .dur-btn.on { border-color: var(--accent-3); color: var(--accent-3); }
  .bar-actions { margin-left: auto; display: flex; gap: 0.3rem; }

  .banner { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; margin-bottom: 1rem; border-color: var(--accent); }
  .banner.won { border-color: var(--accent-2); }
  .banner-text { font-family: var(--display); font-size: 0.55rem; color: var(--accent); flex: 1; }
  .banner.won .banner-text { color: var(--accent-2); }

  .board-wrap { overflow-x: auto; padding-bottom: 0.5rem; }
  .board { display: grid; gap: 2px; width: fit-content; margin: 0 auto; }
  .cell {
    aspect-ratio: 1; border: 2px outset var(--line); background: var(--panel); cursor: pointer;
    font-size: 0.85rem; font-weight: bold; line-height: 1; padding: 0; color: var(--ink);
    display: flex; align-items: center; justify-content: center;
  }
  .cell:hover:not(.open) { border-color: var(--accent-3); }
  .cell.open { border: 1px solid var(--line); background: var(--bg); cursor: default; }
  .cell.boom { background: var(--accent); color: var(--bg); }
  .hint { color: var(--muted); font-size: 0.8rem; text-align: center; margin: 0.5rem 0 1.5rem; }
</style>
