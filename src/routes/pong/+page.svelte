<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { track } from '$lib/analytics';

  const W = 400, H = 300;
  const PW = 10, PH = 60, PSPEED = 6;
  const WIN_SCORE = 11;

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let raf = 0;
  let running = $state(false);
  let started = $state(false);
  let over = $state(false);
  let mode = $state<'cpu' | '2p'>('cpu');
  let scoreL = $state(0);
  let scoreR = $state(0);
  let winner = $state<'L' | 'R' | null>(null);

  let pl = { y: H / 2 - PH / 2 };
  let pr = { y: H / 2 - PH / 2 };
  let ball = { x: W / 2, y: H / 2, vx: 4, vy: 3, r: 6 };
  let keys: Record<string, boolean> = {};

  function serve(towardsLeft: boolean) {
    ball = { x: W / 2, y: H / 2, vx: (towardsLeft ? -1 : 1) * 4, vy: (Math.random() > 0.5 ? 1 : -1) * 3, r: 6 };
  }

  function reset() {
    pl = { y: H / 2 - PH / 2 };
    pr = { y: H / 2 - PH / 2 };
    scoreL = 0; scoreR = 0;
    winner = null;
    over = false;
    serve(Math.random() > 0.5);
  }

  function start() {
    if (running) return;
    started = true;
    reset();
    running = true;
    raf = requestAnimationFrame(loop);
    track('tool_use', { tool: 'pong', mode });
  }

  function loop() {
    update();
    draw();
    if (running) raf = requestAnimationFrame(loop);
  }

  function update() {
    if (keys['w']) pl.y -= PSPEED;
    if (keys['s']) pl.y += PSPEED;
    pl.y = Math.max(0, Math.min(H - PH, pl.y));

    if (mode === '2p') {
      if (keys['ArrowUp']) pr.y -= PSPEED;
      if (keys['ArrowDown']) pr.y += PSPEED;
      pr.y = Math.max(0, Math.min(H - PH, pr.y));
    } else {
      const target = ball.y - PH / 2;
      const aiSpeed = PSPEED * 0.72;
      if (Math.abs(target - pr.y) > aiSpeed) pr.y += target > pr.y ? aiSpeed : -aiSpeed;
      pr.y = Math.max(0, Math.min(H - PH, pr.y));
    }

    ball.x += ball.vx;
    ball.y += ball.vy;

    if (ball.y - ball.r < 0) { ball.y = ball.r; ball.vy = Math.abs(ball.vy); }
    if (ball.y + ball.r > H) { ball.y = H - ball.r; ball.vy = -Math.abs(ball.vy); }

    // left paddle collision
    if (ball.vx < 0 && ball.x - ball.r <= PW + 12 && ball.x - ball.r > 4 && ball.y >= pl.y && ball.y <= pl.y + PH) {
      ball.vx = Math.abs(ball.vx) * 1.03;
      const hit = (ball.y - (pl.y + PH / 2)) / (PH / 2);
      ball.vy = hit * 4.5;
      ball.x = PW + 12 + ball.r;
    }
    // right paddle collision
    if (ball.vx > 0 && ball.x + ball.r >= W - PW - 12 && ball.x + ball.r < W - 4 && ball.y >= pr.y && ball.y <= pr.y + PH) {
      ball.vx = -Math.abs(ball.vx) * 1.03;
      const hit = (ball.y - (pr.y + PH / 2)) / (PH / 2);
      ball.vy = hit * 4.5;
      ball.x = W - PW - 12 - ball.r;
    }

    if (ball.x < -20) {
      scoreR++;
      if (scoreR >= WIN_SCORE) { winner = 'R'; running = false; over = true; return; }
      serve(false);
    } else if (ball.x > W + 20) {
      scoreL++;
      if (scoreL >= WIN_SCORE) { winner = 'L'; running = false; over = true; return; }
      serve(true);
    }
  }

  function draw() {
    if (!ctx) return;
    ctx.fillStyle = '#08080f';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.setLineDash([6, 8]);
    ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#21e6c1';
    ctx.fillRect(12, pl.y, PW, PH);
    ctx.fillStyle = '#ff2e88';
    ctx.fillRect(W - 12 - PW, pr.y, PW, PH);

    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd23f';
    ctx.shadowColor = '#ffd23f';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.font = 'bold 22px "Press Start 2P", monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.textAlign = 'center';
    ctx.fillText(String(scoreL), W / 2 - 50, 34);
    ctx.fillText(String(scoreR), W / 2 + 50, 34);

    if (!started) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#ffd23f';
      ctx.font = 'bold 14px "Press Start 2P", monospace';
      ctx.fillText('PONG', W / 2, H / 2 - 20);
      ctx.fillStyle = '#c2c3c7';
      ctx.font = '9px "Press Start 2P", monospace';
      ctx.fillText('Space to start', W / 2, H / 2 + 10);
      ctx.fillText('W/S · ↑/↓', W / 2, H / 2 + 30);
    } else if (over) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = winner === 'L' ? '#21e6c1' : '#ff2e88';
      ctx.font = 'bold 14px "Press Start 2P", monospace';
      ctx.fillText(winner === 'L' ? 'LEFT WINS' : mode === 'cpu' ? 'CPU WINS' : 'RIGHT WINS', W / 2, H / 2 - 20);
      ctx.fillStyle = '#c2c3c7';
      ctx.font = '9px "Press Start 2P", monospace';
      ctx.fillText(`${scoreL} — ${scoreR}`, W / 2, H / 2 + 8);
      ctx.fillText('Space to retry', W / 2, H / 2 + 30);
    }
  }

  function onKey(e: KeyboardEvent) {
    keys[e.key] = e.type === 'keydown';
    if (['ArrowUp', 'ArrowDown', 'w', 's', ' '].includes(e.key)) e.preventDefault();
    if (e.type === 'keydown' && e.key === ' ') {
      if (!started || over) start();
    }
  }

  function setMode(m: 'cpu' | '2p') {
    mode = m;
    if (started) start();
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
  <title>Pong — Classic Pixel Pong Online, vs CPU or 2 Player | Station255</title>
  <meta name="description" content="Play Pong online — pixel art retro arcade classic. Versus CPU or local 2-player. W/S and arrow keys. First to 11 wins. Free, no install." />
</svelte:head>

<div class="tool-header">
  <h1 class="tool-title">PONG</h1>
  <p class="tool-sub">First to 11 wins. Left paddle: W/S. Right paddle: ↑/↓ (or the CPU).</p>
</div>

<div class="game-wrap">
  <div class="mode-toggle">
    <button class="btn" class:secondary={mode !== 'cpu'} onclick={() => setMode('cpu')}>vs CPU</button>
    <button class="btn" class:secondary={mode !== '2p'} onclick={() => setMode('2p')}>2P Local</button>
  </div>

  {#if !started}
    <button class="btn start-btn" onclick={start}>▶ PLAY</button>
  {:else if over}
    <button class="btn start-btn" onclick={start}>↺ RETRY</button>
  {/if}

  <canvas
    bind:this={canvas}
    width={W}
    height={H}
    class="game-canvas"
    onclick={() => { if (!started || over) start(); }}
    tabindex="0"
    role="application"
    aria-label="Pong game"
  ></canvas>
</div>

<section class="seo panel">
  <h2>About Pong</h2>
  <p>
    The one that started it all — 1972's paddle-and-ball classic. Play against a beatable CPU
    opponent, or pass the keyboard for local 2-player (Player 1 uses W/S, Player 2 uses the arrow
    keys). First to 11 points wins.
  </p>
  <div class="see-also">
    <span class="see-label">Related:</span>
    <a href="/breakout">Breakout</a>
    <a href="/snake">Snake</a>
    <a href="/256">256</a>
  </div>
</section>

<style>
  .tool-header { padding: 1.25rem 0 1rem; border-bottom: 2px solid var(--line); margin-bottom: 1.5rem; }
  .tool-title { font-family: var(--display); font-size: 1.1rem; color: var(--accent-3); text-shadow: 3px 3px 0 var(--accent); margin: 0 0 0.5rem; }
  .tool-sub { color: var(--muted); font-size: 0.95rem; margin: 0; }

  .game-wrap { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }
  .mode-toggle { display: flex; gap: 0.5rem; }
  .mode-toggle .btn { font-size: 0.6rem; }
  .start-btn { font-family: var(--display); font-size: 0.4rem; }
  .game-canvas {
    display: block; border: 3px solid var(--line); box-shadow: 6px 6px 0 #000;
    cursor: pointer; max-width: 100%;
  }
  .game-canvas:focus { outline: 2px solid var(--accent-3); }
</style>
