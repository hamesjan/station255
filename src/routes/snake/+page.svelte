<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { track } from '$lib/analytics';

  const COLS = 20;
  const ROWS = 20;
  const CELL = 20;
  const W = COLS * CELL;
  const H = ROWS * CELL;

  type Dir = 'U' | 'D' | 'L' | 'R';
  type Pos = { x: number; y: number };

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let loopId = 0;
  let running = $state(false);
  let dead = $state(false);
  let score = $state(0);
  let highScore = $state(0);
  let started = $state(false);

  let snake: Pos[] = [];
  let dir: Dir = 'R';
  let nextDir: Dir = 'R';
  let food: Pos = { x: 10, y: 10 };
  let speed = 150; // ms per tick

  const COLORS = {
    bg: '#0a0a0f',
    grid: '#111118',
    head: '#00ff88',
    body: '#00cc66',
    food: '#ff2244',
    foodGlow: '#ff6677',
    text: '#c2c3c7',
  };

  function rnd(max: number) { return Math.floor(Math.random() * max); }

  function spawnFood() {
    let pos: Pos;
    do {
      pos = { x: rnd(COLS), y: rnd(ROWS) };
    } while (snake.some(s => s.x === pos.x && s.y === pos.y));
    food = pos;
  }

  function initGame() {
    snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
    dir = 'R';
    nextDir = 'R';
    score = 0;
    speed = 150;
    dead = false;
    spawnFood();
    draw();
  }

  function start() {
    if (running) return;
    started = true;
    initGame();
    running = true;
    loop();
    track('tool_use', { tool: 'snake' });
  }

  function loop() {
    loopId = window.setTimeout(() => {
      if (!running) return;
      tick();
      draw();
      loop();
    }, speed);
  }

  function tick() {
    dir = nextDir;
    const head = snake[0];
    let nx = head.x, ny = head.y;
    if (dir === 'U') ny--;
    if (dir === 'D') ny++;
    if (dir === 'L') nx--;
    if (dir === 'R') nx++;

    // wall wrap
    nx = (nx + COLS) % COLS;
    ny = (ny + ROWS) % ROWS;

    // self collision
    if (snake.some(s => s.x === nx && s.y === ny)) {
      running = false;
      dead = true;
      if (score > highScore) highScore = score;
      draw();
      return;
    }

    const newHead = { x: nx, y: ny };
    snake = [newHead, ...snake];

    if (nx === food.x && ny === food.y) {
      score++;
      speed = Math.max(60, speed - 2);
      spawnFood();
    } else {
      snake = snake.slice(0, -1);
    }
  }

  function draw() {
    if (!ctx) return;
    // bg
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, W, H);

    // grid dots
    ctx.fillStyle = COLORS.grid;
    for (let x = 0; x < COLS; x++) {
      for (let y = 0; y < ROWS; y++) {
        ctx.fillRect(x * CELL + CELL / 2 - 1, y * CELL + CELL / 2 - 1, 2, 2);
      }
    }

    // food (blinking square)
    ctx.fillStyle = COLORS.food;
    ctx.shadowColor = COLORS.foodGlow;
    ctx.shadowBlur = 8;
    ctx.fillRect(food.x * CELL + 3, food.y * CELL + 3, CELL - 6, CELL - 6);
    ctx.shadowBlur = 0;

    // snake body
    for (let i = snake.length - 1; i >= 0; i--) {
      const s = snake[i];
      const t = i / snake.length;
      ctx.fillStyle = i === 0 ? COLORS.head : `hsl(${150 - t * 30}, ${80 - t * 20}%, ${50 - t * 20}%)`;
      const pad = i === 0 ? 1 : 2;
      ctx.fillRect(s.x * CELL + pad, s.y * CELL + pad, CELL - pad * 2, CELL - pad * 2);
    }

    // eyes on head
    if (snake.length > 0) {
      const h = snake[0];
      ctx.fillStyle = '#000';
      if (dir === 'R') { ctx.fillRect(h.x*CELL+13,h.y*CELL+5,3,3); ctx.fillRect(h.x*CELL+13,h.y*CELL+12,3,3); }
      if (dir === 'L') { ctx.fillRect(h.x*CELL+4,h.y*CELL+5,3,3); ctx.fillRect(h.x*CELL+4,h.y*CELL+12,3,3); }
      if (dir === 'U') { ctx.fillRect(h.x*CELL+5,h.y*CELL+4,3,3); ctx.fillRect(h.x*CELL+12,h.y*CELL+4,3,3); }
      if (dir === 'D') { ctx.fillRect(h.x*CELL+5,h.y*CELL+13,3,3); ctx.fillRect(h.x*CELL+12,h.y*CELL+13,3,3); }
    }

    // overlay
    if (dead) {
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#ff2244';
      ctx.font = 'bold 18px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', W / 2, H / 2 - 20);
      ctx.fillStyle = COLORS.text;
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillText(`Score: ${score}`, W / 2, H / 2 + 5);
      ctx.fillText('Press SPACE to retry', W / 2, H / 2 + 30);
    } else if (!started) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#00ff88';
      ctx.font = 'bold 14px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('SNAKE', W / 2, H / 2 - 20);
      ctx.fillStyle = COLORS.text;
      ctx.font = '9px "Press Start 2P", monospace';
      ctx.fillText('Press SPACE to start', W / 2, H / 2 + 10);
      ctx.fillText('Arrows or WASD to move', W / 2, H / 2 + 30);
    }
  }

  function onKey(e: KeyboardEvent) {
    const key = e.key;
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d',' '].includes(key)) e.preventDefault();
    if (key === ' ') {
      if (!started || dead) start();
      return;
    }
    if (!running) return;
    if ((key === 'ArrowUp' || key === 'w') && dir !== 'D') nextDir = 'U';
    if ((key === 'ArrowDown' || key === 's') && dir !== 'U') nextDir = 'D';
    if ((key === 'ArrowLeft' || key === 'a') && dir !== 'R') nextDir = 'L';
    if ((key === 'ArrowRight' || key === 'd') && dir !== 'L') nextDir = 'R';
  }

  function swipe(dx: number, dy: number) {
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0 && dir !== 'L') nextDir = 'R';
      else if (dx < 0 && dir !== 'R') nextDir = 'L';
    } else {
      if (dy > 0 && dir !== 'U') nextDir = 'D';
      else if (dy < 0 && dir !== 'D') nextDir = 'U';
    }
  }

  let touchStart = { x: 0, y: 0 };

  onMount(() => {
    ctx = canvas.getContext('2d')!;
    draw();
    window.addEventListener('keydown', onKey);
    try { highScore = parseInt(localStorage.getItem('s255_snake_hi') || '0'); } catch {}
  });

  onDestroy(() => {
    clearTimeout(loopId);
    if (typeof window !== 'undefined') window.removeEventListener('keydown', onKey);
    if (typeof window !== 'undefined' && score > highScore) {
      try { localStorage.setItem('s255_snake_hi', String(score)); } catch {}
    }
  });
</script>

<svelte:head>
  <title>Snake Game — Classic Pixel Snake Online | Station255</title>
  <meta name="description" content="Play the classic Snake game online — pixel art style. Eat food, grow longer, don't bite yourself. Arrow keys or WASD. Free, no install." />
</svelte:head>

<div class="tool-header">
  <h1 class="tool-title">SNAKE</h1>
  <p class="tool-sub">Classic snake. Arrow keys or WASD to move. Walls wrap — your only enemy is yourself.</p>
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
    {#if !running && !dead && !started}
      <button class="btn start-btn" onclick={start}>▶ START</button>
    {:else if dead}
      <button class="btn start-btn" onclick={start}>↺ RETRY</button>
    {/if}
  </div>

  <canvas
    bind:this={canvas}
    width={W}
    height={H}
    class="game-canvas"
    onclick={() => { if (!started || dead) start(); }}
    ontouchstart={(e) => { touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
    ontouchend={(e) => {
      const dx = e.changedTouches[0].clientX - touchStart.x;
      const dy = e.changedTouches[0].clientY - touchStart.y;
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) { if (!started || dead) start(); return; }
      swipe(dx, dy);
    }}
    tabindex="0"
    role="application"
    aria-label="Snake game"
  ></canvas>

  <div class="dpad">
    <button class="dpad-btn" onclick={() => { if(dir!=='D') nextDir='U'; }}>▲</button>
    <div class="dpad-row">
      <button class="dpad-btn" onclick={() => { if(dir!=='R') nextDir='L'; }}>◄</button>
      <button class="dpad-btn center" onclick={() => { if(!started||dead) start(); }}>⏎</button>
      <button class="dpad-btn" onclick={() => { if(dir!=='L') nextDir='R'; }}>►</button>
    </div>
    <button class="dpad-btn" onclick={() => { if(dir!=='U') nextDir='D'; }}>▼</button>
  </div>
</div>

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

  .game-canvas {
    display: block; border: 3px solid var(--line); box-shadow: 6px 6px 0 #000;
    cursor: pointer; max-width: 100%; image-rendering: pixelated;
    touch-action: none;
  }
  .game-canvas:focus { outline: 2px solid var(--accent-3); }

  .dpad { display: flex; flex-direction: column; align-items: center; gap: 3px; }
  .dpad-row { display: flex; gap: 3px; }
  .dpad-btn {
    width: 44px; height: 44px; font-size: 1rem; background: var(--panel);
    border: 2px solid var(--line); color: var(--ink); cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.06s; user-select: none;
  }
  .dpad-btn:hover, .dpad-btn:active { background: var(--accent); }
  .dpad-btn.center { font-size: 0.9rem; }
</style>
