<script lang="ts">
  import { page } from '$app/stores';
</script>

<svelte:head>
  <title>Game Over — Page Not Found | Station255</title>
  <meta name="description" content="404 — this page doesn't exist on Station255. Insert coin to continue." />
</svelte:head>

<div class="gameover-wrap">
  <p class="gameover-title">GAME OVER</p>
  <p class="gameover-code">ERROR {$page.status}</p>
  <p class="gameover-path"><code>{$page.url.pathname}</code> doesn't exist here.</p>
  <p class="gameover-sub">INSERT COIN TO CONTINUE</p>
  <a class="btn" href="/">↺ CONTINUE</a>
</div>

<style>
  .gameover-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    text-align: center;
    padding: 4rem 1rem;
  }
  .gameover-title {
    font-family: var(--display);
    font-size: 1.8rem;
    color: var(--accent);
    text-shadow: 4px 4px 0 var(--accent-3);
    margin: 0;
  }
  .gameover-code {
    font-family: var(--display);
    font-size: 0.7rem;
    color: var(--muted);
    margin: 0;
  }
  .gameover-path {
    color: var(--muted);
    margin: 0;
  }
  .gameover-sub {
    font-family: var(--display);
    font-size: 0.7rem;
    color: var(--accent-3);
    margin: 1rem 0 0;
    animation: blink 1.1s steps(1) infinite;
  }
  @keyframes blink {
    0%, 49% { opacity: 1; }
    50%, 100% { opacity: 0; }
  }
</style>
