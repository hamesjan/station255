<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { track } from '$lib/analytics';

  const W = 400, H = 340;
  const COLS = 10, ROWS = 5;
  const BPAD = 4;
  const BW = (W - BPAD * (COLS + 1)) / COLS;
  const BH = 14;
  const BRICK_TOP = 40;

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let raf = 0;
  let running = $state(false);
  let dead = $state(false);
  let won = $state(false);
  let started = $state(false);
  let score = $state(0);
  let lives = $state(3);
  let level = $state(1);

  type Brick = { alive: boolean; color: string };
  let bricks: Brick[][] = [];
  let paddle = { x: 150, w: 70, y: H - 25, speed: 0 };
  let ball = { x: 200, y: H - 60, vx: 3, vy: -3.5, r: 6 };
  let keys: Record<string, boolean> = {};
  let mouseX = -1;

  const ROW_COLORS = ['#ff2244','#ff8800','#ffee00','#44dd44','#4488ff'];

  function initLevel(lvl: number) {
    bricks = Array.from({ length: ROWS }, (_, r) =>
      Array.from({ length: COLS }, () => ({ alive: true, color: ROW_COLORS[r] }))
    );
    const speed = 3 + (lvl - 1) * 0.5;
    ball = { x: W / 2, y: H - 80, vx: speed * (Math.random() > 0.5 ? 1 : -1), vy: -speed, r: 6 };
    paddle = { x: W / 2 - 35, w: 70 - (lvl - 1) * 5, y: H - 25, speed: 0 };
    won = false;
    dead = false;
  }

  function start() {
    if (running) return;
    started = true;
    score = 0;
    lives = 3;
    level = 1;
    initLevel(1);
    running = true;
    raf = requestAnimationFrame(loop);
    track('tool_use', { tool: 'breakout' });
  }

  function loop() {
    update();
    draw();
    if (running) raf = requestAnimationFrame(loop);
  }

  function update() {
    // paddle movement
    const PSPEED = 7;
    if (keys['ArrowLeft'] || keys['a']) paddle.x = Math.max(0, paddle.x - PSPEED);
    if (keys['ArrowRight'] || keys['d']) paddle.x = Math.min(W - paddle.w, paddle.x + PSPEED);
    if (mouseX >= 0) paddle.x = Math.max(0, Math.min(W - paddle.w, mouseX - paddle.w / 2));

    // ball movement
    ball.x += ball.vx;
    ball.y += ball.vy;

    // wall bounce
    if (ball.x - ball.r < 0) { ball.x = ball.r; ball.vx = Math.abs(ball.vx); }
    if (ball.x + ball.r > W) { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx); }
    if (ball.y - ball.r < 0) { ball.y = ball.r; ball.vy = Math.abs(ball.vy); }

    // ball fell
    if (ball.y + ball.r > H) {
      lives--;
      if (lives <= 0) { running = false; dead = true; return; }
      ball = { ...ball, x: W / 2, y: H - 80, vy: -(3 + (level - 1) * 0.5) };
    }

    // paddle collision
    if (
      ball.y + ball.r >= paddle.y &&
      ball.y - ball.r <= paddle.y + 10 &&
      ball.x >= paddle.x &&
      ball.x <= paddle.x + paddle.w &&
      ball.vy > 0
    ) {
      ball.vy = -Math.abs(ball.vy);
      const hit = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
      ball.vx = hit * 5;
    }

    // brick collision
    let remaining = 0;
    outer: for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!bricks[r][c].alive) continue;
        remaining++;
        const bx = BPAD + c * (BW + BPAD);
        const by = BRICK_TOP + r * (BH + BPAD);
        if (
          ball.x + ball.r > bx && ball.x - ball.r < bx + BW &&
          ball.y + ball.r > by && ball.y - ball.r < by + BH
        ) {
          bricks[r][c].alive = false;
          remaining--;
          score += (ROWS - r) * 10;
          // determine bounce direction
          const fromLeft = ball.x < bx;
          const fromRight = ball.x > bx + BW;
          if (fromLeft || fromRight) ball.vx = -ball.vx;
          else ball.vy = -ball.vy;
          break outer;
        }
      }
    }
    if (remaining === 0) {
      level++;
      initLevel(level);
    }
  }

  function draw() {
    if (!ctx) return;
    ctx.fillStyle = '#08080f';
    ctx.fillRect(0, 0, W, H);

    // bricks
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!bricks[r][c].alive) continue;
        const bx = BPAD + c * (BW + BPAD);
        const by = BRICK_TOP + r * (BH + BPAD);
        ctx.fillStyle = bricks[r][c].color;
        ctx.fillRect(bx, by, BW, BH);
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(bx, by, BW, 3);
      }
    }

    // paddle
    ctx.fillStyle = '#c2c3c7';
    ctx.fillRect(paddle.x, paddle.y, paddle.w, 10);
    ctx.fillStyle = '#fff';
    ctx.fillRect(paddle.x, paddle.y, paddle.w, 2);

    // ball
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.shadowColor = '#aaddff';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;

    // HUD
    ctx.fillStyle = '#aaaaaa';
    ctx.font = '9px "Press Start 2P", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE ${score}`, 8, 18);
    ctx.textAlign = 'center';
    ctx.fillText(`LEVEL ${level}`, W / 2, 18);
    ctx.textAlign = 'right';
    ctx.fillText('♥'.repeat(lives), W - 8, 18);

    if (!started) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#ff8800';
      ctx.font = 'bold 14px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('BREAKOUT', W / 2, H / 2 - 20);
      ctx.fillStyle = '#c2c3c7';
      ctx.font = '9px "Press Start 2P", monospace';
      ctx.fillText('Space / Click to start', W / 2, H / 2 + 10);
      ctx.fillText('← → or mouse to move', W / 2, H / 2 + 30);
    } else if (dead) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#ff2244';
      ctx.font = 'bold 14px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', W / 2, H / 2 - 20);
      ctx.fillStyle = '#c2c3c7';
      ctx.font = '9px "Press Start 2P", monospace';
      ctx.fillText(`Score: ${score}`, W / 2, H / 2 + 8);
      ctx.fillText('Space to retry', W / 2, H / 2 + 30);
    }
  }

  function onKey(e: KeyboardEvent) {
    keys[e.key] = e.type === 'keydown';
    if (['ArrowLeft','ArrowRight','a','d',' '].includes(e.key)) e.preventDefault();
    if (e.type === 'keydown' && e.key === ' ') {
      if (!started || dead) start();
    }
  }

  function onMouseMove(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) * (W / rect.width);
  }

  onMount(() => {
    ctx = canvas.getContext('2d')!;
    draw();
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
  });

  onDestroy(() => {
    if (typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(raf);
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
    }
  });
</script>

<svelte:head>
  <title>Breakout Game — Classic Pixel Arkanoid Online | Station255</title>
  <meta name="description" content="Play Breakout (Arkanoid) online — a pixel art retro arcade classic. Break bricks, don't drop the ball. Keyboard or mouse. Free, no install." />
</svelte:head>

<div class="tool-header">
  <h1 class="tool-title">BREAKOUT</h1>
  <p class="tool-sub">Classic brick breaker. Move with ← → or your mouse. Each level gets faster.</p>
</div>

<div class="game-wrap">
  {#if !started}
    <button class="btn start-btn" onclick={start}>▶ PLAY</button>
  {:else if dead}
    <button class="btn start-btn" onclick={start}>↺ RETRY</button>
  {/if}

  <canvas
    bind:this={canvas}
    width={W}
    height={H}
    class="game-canvas"
    onclick={() => { if (!started || dead) start(); }}
    onmousemove={onMouseMove}
    tabindex="0"
    role="application"
    aria-label="Breakout game"
  ></canvas>
</div>

<style>
  .tool-header { padding: 1.25rem 0 1rem; border-bottom: 2px solid var(--line); margin-bottom: 1.5rem; }
  .tool-title { font-family: var(--display); font-size: 1.1rem; color: var(--accent-3); text-shadow: 3px 3px 0 var(--accent); margin: 0 0 0.5rem; }
  .tool-sub { color: var(--muted); font-size: 0.95rem; margin: 0; }

  .game-wrap { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }
  .start-btn { font-family: var(--display); font-size: 0.4rem; }
  .game-canvas {
    display: block; border: 3px solid var(--line); box-shadow: 6px 6px 0 #000;
    cursor: none; max-width: 100%;
  }
  .game-canvas:focus { outline: 2px solid var(--accent-3); }
</style>
