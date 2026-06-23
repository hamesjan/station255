<script lang="ts">
  import '../app.css';
  import { afterNavigate } from '$app/navigation';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { track } from '$lib/analytics';
  import { tools } from '$lib/tools';

  let { children } = $props();
  let showConsent = $state(false);

  onMount(() => {
    if (localStorage.getItem('s255_consent') === null) showConsent = true;
  });

  function acceptConsent() {
    localStorage.setItem('s255_consent', 'yes');
    showConsent = false;
    track('pageview');
  }

  function declineConsent() {
    localStorage.setItem('s255_consent', 'no');
    showConsent = false;
  }

  afterNavigate(({ to }) => {
    if (to?.url?.pathname) track('pageview');
  });
</script>

<header class="site-header">
  <div class="container header-inner">
    <a href="/" class="brand">
      <span class="brand-mark">▚</span>STATION<span class="num">255</span>
    </a>
    <span class="brand-sub">the 8-bit tool arcade</span>
    <nav class="header-nav">
      <a href="/about">About</a>
      <a href="/privacy">Privacy</a>
    </nav>
  </div>
  <div class="header-rule"></div>
</header>

<div class="container site-shell">
  <aside class="sidebar">
    <p class="sidebar-label">TOOLS</p>
    <nav class="sidebar-nav">
      {#each tools as tool}
        {#if tool.live}
          <a
            href="/{tool.slug}"
            class="sidebar-link"
            class:active={$page.url.pathname === '/' + tool.slug}
          >
            <span class="sidebar-icon">{tool.icon}</span>
            <span class="sidebar-name">{tool.name}</span>
          </a>
        {:else}
          <span class="sidebar-link soon">
            <span class="sidebar-icon">{tool.icon}</span>
            <span class="sidebar-name">{tool.name}</span>
            <span class="soon-badge">SOON</span>
          </span>
        {/if}
      {/each}
    </nav>
    <p class="sidebar-label">INFO</p>
    <nav class="sidebar-nav">
      <a href="/about" class="sidebar-link" class:active={$page.url.pathname === '/about'}>
        <span class="sidebar-icon">ℹ</span>
        <span class="sidebar-name">About</span>
      </a>
      <a href="/privacy" class="sidebar-link" class:active={$page.url.pathname === '/privacy'}>
        <span class="sidebar-icon">🔒</span>
        <span class="sidebar-name">Privacy</span>
      </a>
    </nav>
  </aside>
  <main class="main-content">
    {@render children()}
  </main>
</div>

<footer class="site-footer">
  <div class="container footer-inner">
    <span>© {new Date().getFullYear()} Station255</span>
    <span class="sep">·</span>
    <a href="/privacy">Privacy</a>
    <span class="sep">·</span>
    <a href="/about">About</a>
    <span class="sep">·</span>
    <span>runs entirely in your browser</span>
  </div>
</footer>

{#if showConsent}
  <div class="consent-overlay" role="dialog" aria-modal="true" aria-label="Cookie consent">
    <div class="consent-box panel">
      <p class="consent-title">Cookie Notice</p>
      <p class="consent-body">
        We count page visits and tool usage to understand what's useful. No ads. No selling data.
        Uses <code>localStorage</code> only — no third-party trackers.
        <a href="/privacy">Privacy policy →</a>
      </p>
      <div class="consent-actions">
        <button class="btn" onclick={acceptConsent}>Accept</button>
        <button class="btn secondary" onclick={declineConsent}>Decline</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .site-header {
    position: sticky;
    top: 0;
    background: var(--bg);
    z-index: 10;
    background-image: repeating-linear-gradient(
      0deg,
      rgba(0, 0, 0, 0.18) 0px,
      rgba(0, 0, 0, 0.18) 1px,
      transparent 1px,
      transparent 3px
    );
  }
  .header-inner {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding-top: 0.6rem;
    padding-bottom: 0.6rem;
    flex-wrap: wrap;
  }
  .brand {
    font-family: var(--display);
    font-size: 1rem;
    color: var(--ink);
  }
  .brand:hover { color: var(--ink); }
  .brand-mark { color: var(--accent); margin-right: 0.35rem; }
  .num { color: var(--accent-3); }
  .brand-sub { color: var(--muted); font-size: 1rem; }
  .header-nav {
    margin-left: auto;
    display: flex;
    gap: 1.5rem;
    font-size: 1rem;
  }
  .header-rule { height: 2px; background: var(--line); }

  .site-footer {
    border-top: 2px solid var(--line);
  }
  .footer-inner {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    padding-top: 0.75rem;
    padding-bottom: 1.5rem;
    flex-wrap: wrap;
    font-size: 0.95rem;
    color: var(--muted);
  }
  .sep { color: var(--line); }
  .footer-inner a { color: var(--muted); }
  .footer-inner a:hover { color: var(--accent-3); }

  @media (max-width: 700px) {
    .header-nav { display: none; }
    .brand-sub { display: none; }
  }
</style>
