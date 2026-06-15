<script lang="ts">
  import '../app.css';
  import { afterNavigate } from '$app/navigation';
  import { track } from '$lib/analytics';

  let { children } = $props();

  // Track every page view — 'enter' fires on initial load, other types on SPA navigation
  afterNavigate(({ to }) => {
    if (to?.url?.pathname) track('pageview');
  });
</script>

<header class="container site-header">
  <a href="/" class="brand">
    <span class="brand-mark">▚</span>STATION<span class="num">255</span>
  </a>
  <span class="brand-sub">the 8-bit tool arcade</span>
</header>

<main class="container">
  {@render children()}
</main>

<footer class="container site-footer">
  <span>© {new Date().getFullYear()} Station255</span>
  <span>· free pixel-art tools · runs entirely in your browser</span>
</footer>

<style>
  .site-header {
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
    padding-top: 1.5rem;
    padding-bottom: 0.5rem;
    flex-wrap: wrap;
  }
  .brand {
    font-family: var(--display);
    font-size: 1.1rem;
    color: var(--ink);
  }
  .brand:hover {
    color: var(--ink);
  }
  .brand-mark {
    color: var(--accent);
    margin-right: 0.35rem;
  }
  .num {
    color: var(--accent-3);
  }
  .brand-sub {
    color: var(--muted);
    font-size: 1.1rem;
  }
  .site-footer {
    color: var(--muted);
    border-top: 2px solid var(--line);
    margin-top: 3rem;
    padding-top: 1rem;
    padding-bottom: 2rem;
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
</style>
