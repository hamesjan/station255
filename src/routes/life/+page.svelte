<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { track } from '$lib/analytics';

  const CELL = 10;
  let COLS = 60, ROWS = 44;
  let W = COLS * CELL, H = ROWS * CELL;

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let raf = 0;
  let running = $state(false);
  let generation = $state(0);
  let population = $state(0);
  let speed = $state(8); // frames per second
  let drawColor = $state('#00ff88');

  let grid: Uint8Array;
  let next: Uint8Array;

  const PRESETS: Record<string, [number, number][]> = {
    'Glider': [[1,0],[2,1],[0,2],[1,2],[2,2]],
    'Blinker': [[0,1],[1,1],[2,1]],
    'Toad': [[1,0],[2,0],[3,0],[0,1],[1,1],[2,1]],
    'Pulsar': [[2,0],[3,0],[4,0],[8,0],[9,0],[10,0],[0,2],[5,2],[7,2],[12,2],[0,3],[5,3],[7,3],[12,3],[0,4],[5,4],[7,4],[12,4],[2,5],[3,5],[4,5],[8,5],[9,5],[10,5],[2,7],[3,7],[4,7],[8,7],[9,7],[10,7],[0,8],[5,8],[7,8],[12,8],[0,9],[5,9],[7,9],[12,9],[0,10],[5,10],[7,10],[12,10],[2,12],[3,12],[4,12],[8,12],[9,12],[10,12]],
    'Glider Gun': [[24,0],[22,1],[24,1],[12,2],[13,2],[20,2],[21,2],[34,2],[35,2],[11,3],[15,3],[20,3],[21,3],[34,3],[35,3],[0,4],[1,4],[10,4],[16,4],[20,4],[21,4],[0,5],[1,5],[10,5],[14,5],[16,5],[17,5],[22,5],[24,5],[10,6],[16,6],[24,6],[11,7],[15,7],[12,8],[13,8]],
    'R-Pentomino': [[1,0],[2,0],[0,1],[1,1],[1,2]],
    'Spaceship': [[1,0],[4,0],[0,1],[0,2],[4,2],[0,3],[1,3],[2,3],[3,3]],
  };

  function initGrid() {
    grid = new Uint8Array(COLS * ROWS);
    next = new Uint8Array(COLS * ROWS);
  }

  function idx(x: number, y: number) { return ((y + ROWS) % ROWS) * COLS + ((x + COLS) % COLS); }

  function randomize() {
    for (let i = 0; i < grid.length; i++) grid[i] = Math.random() < 0.3 ? 1 : 0;
    generation = 0;
    draw();
    track('tool_use', { tool: 'life', action: 'random' });
  }

  function clear() {
    grid.fill(0);
    generation = 0;
    population = 0;
    draw();
  }

  function loadPreset(name: string) {
    clear();
    const cells = PRESETS[name];
    const cx = Math.floor(COLS / 2) - 5;
    const cy = Math.floor(ROWS / 2) - 5;
    for (const [x, y] of cells) {
      if (cx+x < COLS && cy+y < ROWS) grid[idx(cx+x, cy+y)] = 1;
    }
    generation = 0;
    draw();
    track('tool_use', { tool: 'life', action: 'preset', name });
  }

  function step() {
    let pop = 0;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const i = idx(x, y);
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          n += grid[idx(x + dx, y + dy)];
        }
        const alive = grid[i];
        next[i] = alive ? (n === 2 || n === 3 ? 1 : 0) : (n === 3 ? 1 : 0);
        pop += next[i];
      }
    }
    const tmp = grid; grid = next; next = tmp;
    generation++;
    population = pop;
  }

  function draw() {
    if (!ctx) return;
    ctx.fillStyle = '#080810';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = drawColor;
    let pop = 0;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (grid[idx(x, y)]) {
          ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
          pop++;
        }
      }
    }
    population = pop;
  }

  let last = 0;
  function gameLoop(ts: number) {
    if (ts - last >= 1000 / speed) {
      step();
      draw();
      last = ts;
    }
    raf = requestAnimationFrame(gameLoop);
  }

  function toggle() {
    if (running) {
      running = false;
      cancelAnimationFrame(raf);
    } else {
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(gameLoop);
    }
  }

  let painting = false;
  let paintValue = 1;

  function canvasXY(e: MouseEvent | TouchEvent): [number, number] {
    const rect = canvas.getBoundingClientRect();
    const cx = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const cy = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return [
      Math.floor((cx - rect.left) / (rect.width / COLS)),
      Math.floor((cy - rect.top) / (rect.height / ROWS)),
    ];
  }

  function paint(e: MouseEvent | TouchEvent) {
    const [x, y] = canvasXY(e);
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return;
    grid[idx(x, y)] = paintValue;
    draw();
  }

  onMount(() => {
    ctx = canvas.getContext('2d')!;
    initGrid();
    randomize();
  });

  onDestroy(() => { if (typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(raf); });
</script>

<svelte:head>
  <title>Conway's Game of Life — Pixel Cellular Automaton Simulator | Station255</title>
  <meta name="description" content="Play Conway's Game of Life online. Draw cells, load classic patterns like gliders and guns, watch evolution unfold. Free cellular automaton simulator." />
</svelte:head>

<div class="tool-header">
  <h1 class="tool-title">GAME OF LIFE</h1>
  <p class="tool-sub">Conway's cellular automaton. Click cells to toggle them. Load a preset or randomize, then watch it evolve.</p>
</div>

<div class="controls panel">
  <div class="ctrl-group">
    <button class="btn" onclick={toggle}>{running ? '⏸ Pause' : '▶ Play'}</button>
    <button class="btn secondary" onclick={() => { if (!running) { step(); draw(); } }}>⏭ Step</button>
    <button class="btn secondary" onclick={randomize}>🎲 Random</button>
    <button class="btn secondary" onclick={clear}>✕ Clear</button>
  </div>
  <div class="ctrl-group">
    <label class="ctrl-label">Speed</label>
    <input type="range" min="1" max="30" step="1" bind:value={speed} class="slider" />
    <span class="ctrl-val">{speed} fps</span>
  </div>
  <div class="ctrl-group presets">
    <label class="ctrl-label">Presets</label>
    {#each Object.keys(PRESETS) as name}
      <button class="preset-btn" onclick={() => loadPreset(name)}>{name}</button>
    {/each}
  </div>
</div>

<div class="stats">
  <span>Gen <strong>{generation}</strong></span>
  <span>Pop <strong>{population}</strong></span>
  <span class="tip">Click to draw · Drag to paint</span>
</div>

<canvas
  bind:this={canvas}
  width={W}
  height={H}
  class="life-canvas"
  onmousedown={(e) => { painting = true; const [x,y]=canvasXY(e); paintValue=grid[idx(x,y)]?0:1; paint(e); }}
  onmousemove={(e) => { if (painting) paint(e); }}
  onmouseup={() => { painting = false; }}
  onmouseleave={() => { painting = false; }}
  ontouchstart={(e) => { e.preventDefault(); painting = true; const [x,y]=canvasXY(e); paintValue=grid[idx(x,y)]?0:1; paint(e); }}
  ontouchmove={(e) => { e.preventDefault(); if (painting) paint(e); }}
  ontouchend={() => { painting = false; }}
  role="img"
  aria-label="Game of Life grid"
></canvas>

<div class="panel about">
  <h2 class="about-title">About Conway's Game of Life</h2>
  <p>The Game of Life is a cellular automaton devised by mathematician John Conway in 1970. It runs on a grid of cells, each either alive or dead. Each generation, four simple rules apply: live cells with 2–3 neighbors survive; live cells with fewer than 2 or more than 3 neighbors die; dead cells with exactly 3 neighbors become alive.</p>
  <p>Despite its simplicity, the Game of Life produces remarkably complex behavior — including gliders that move across the grid, oscillators that pulse, and even patterns that can simulate a Turing machine.</p>
</div>

<style>
  .tool-header { padding: 1.25rem 0 1rem; border-bottom: 2px solid var(--line); margin-bottom: 1rem; }
  .tool-title { font-family: var(--display); font-size: 1.1rem; color: var(--accent-3); text-shadow: 3px 3px 0 var(--accent); margin: 0 0 0.5rem; }
  .tool-sub { color: var(--muted); font-size: 0.95rem; margin: 0; }

  .controls { display: flex; flex-direction: column; gap: 0.6rem; margin-bottom: 0.75rem; }
  .ctrl-group { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
  .ctrl-label { font-family: var(--display); font-size: 0.33rem; color: var(--muted); }
  .ctrl-val { font-family: var(--display); font-size: 0.33rem; color: var(--ink); min-width: 3rem; }
  .slider { flex: 1; min-width: 100px; max-width: 180px; accent-color: var(--accent-3); }
  .presets { flex-wrap: wrap; }
  .preset-btn {
    font-family: var(--display); font-size: 0.3rem; background: none;
    border: 1px solid var(--line); color: var(--muted); padding: 0.25rem 0.5rem;
    cursor: pointer; transition: border-color 0.08s, color 0.08s;
  }
  .preset-btn:hover { border-color: var(--accent-3); color: var(--accent-3); }

  .stats {
    display: flex; gap: 1rem; font-size: 0.82rem; color: var(--muted);
    margin-bottom: 0.5rem; align-items: center;
  }
  .stats strong { color: var(--accent-3); font-weight: 400; }
  .tip { margin-left: auto; font-size: 0.78rem; }

  .life-canvas {
    display: block; border: 2px solid var(--line); box-shadow: 4px 4px 0 #000;
    cursor: crosshair; max-width: 100%; touch-action: none;
  }

  .about { margin-top: 1.5rem; }
  .about-title { font-family: var(--display); font-size: 0.5rem; color: var(--accent-3); margin: 0 0 0.75rem; }
  .about p { font-size: 0.9rem; color: var(--muted); line-height: 1.6; margin: 0 0 0.5rem; }
</style>
