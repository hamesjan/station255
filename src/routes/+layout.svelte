<script lang="ts">
  import '../app.css';
  import { afterNavigate } from '$app/navigation';
  import { page } from '$app/stores';
  import { onMount, onDestroy } from 'svelte';
  import { track } from '$lib/analytics';
  import { tools } from '$lib/tools';
  import { showToast } from '$lib/toast-store.svelte';
  import Toast from '$lib/Toast.svelte';

  let { children } = $props();
  let showConsent = $state(false);
  let konamiUnlocked = $state(false);
  let logoSpin = $state(false);

  onMount(() => {
    if (localStorage.getItem('s255_consent') === null) showConsent = true;
    try { konamiUnlocked = localStorage.getItem('s255_konami') === '1'; } catch {}

    console.log(
      '%c◚ STATION255 ◚',
      'font-family:monospace; font-size:20px; font-weight:bold; color:#ff2e88; text-shadow: 2px 2px 0 #21e6c1;'
    );
    console.log(
      '%cthe 8-bit tool arcade — poking around? nice. this whole site is one static SvelteKit build, no backend, no third-party trackers. try the Konami code.',
      'color:#b0abd0; font-size:12px;'
    );

    window.addEventListener('keydown', onKonamiKey);
  });

  onDestroy(() => {
    if (typeof window !== 'undefined') window.removeEventListener('keydown', onKonamiKey);
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

  // ── Easter egg: Konami code ──────────────────────────────────────────
  const KONAMI: string[] = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
  let konamiProgress = 0;

  function onKonamiKey(e: KeyboardEvent) {
    const target = e.target as HTMLElement | null;
    if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
    if (target?.isContentEditable) return;
    const key = e.key.toLowerCase();
    if (key === KONAMI[konamiProgress]) {
      konamiProgress++;
      if (konamiProgress === KONAMI.length) {
        konamiProgress = 0;
        triggerKonami();
      }
    } else {
      konamiProgress = key === KONAMI[0] ? 1 : 0;
    }
  }

  function triggerKonami() {
    if (typeof document !== 'undefined') {
      document.body.classList.add('konami-glitch');
      setTimeout(() => document.body.classList.remove('konami-glitch'), 2500);
    }
    showToast('★ CHEAT ACTIVATED — 30 LIVES ADDED');
    konamiUnlocked = true;
    try { localStorage.setItem('s255_konami', '1'); } catch {}
    track('easter_egg', { type: 'konami' });
  }

  // ── Easter egg: mash the logo ────────────────────────────────────────
  let logoClicks: number[] = [];
  function onLogoClick() {
    const now = Date.now();
    logoClicks = [...logoClicks.filter((t) => now - t < 2000), now];
    if (logoClicks.length >= 8) {
      logoClicks = [];
      logoSpin = true;
      setTimeout(() => { logoSpin = false; }, 900);
      showToast('▦ 8-BIT MASHER — you found the logo easter egg');
      track('easter_egg', { type: 'logo_mash' });
    }
  }
</script>

<header class="site-header">
  <div class="container header-inner">
    <a href="/" class="brand" class:logo-spin={logoSpin} onclick={onLogoClick}>
      <span class="brand-mark">▚</span>STATION<span class="num">255</span>
      {#if konamiUnlocked}<span class="konami-star" title="Konami code found">★</span>{/if}
    </a>
    <span class="brand-sub">the 8-bit tool arcade</span>
    <nav class="header-nav">
      <a href="/history">History</a>
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
      <a href="/history" class="sidebar-link" class:active={$page.url.pathname === '/history'}>
        <span class="sidebar-icon">📜</span>
        <span class="sidebar-name">History</span>
      </a>
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

<Toast />

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
  .konami-star { color: var(--accent-3); margin-left: 0.35rem; animation: konami-twinkle 2s ease-in-out infinite; }
  .brand.logo-spin { display: inline-block; animation: logo-spin 0.9s ease-in-out; }

  @keyframes konami-twinkle {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
  @keyframes logo-spin {
    0% { transform: rotate(0deg); filter: hue-rotate(0deg); }
    100% { transform: rotate(360deg); filter: hue-rotate(360deg); }
  }

  :global(body.konami-glitch) {
    animation: konami-shake 0.4s ease-in-out 0s 4, konami-hue 2.5s linear;
  }
  @keyframes konami-shake {
    0%, 100% { transform: translate(0, 0); }
    20% { transform: translate(-4px, 3px); }
    40% { transform: translate(4px, -3px); }
    60% { transform: translate(-3px, -2px); }
    80% { transform: translate(3px, 2px); }
  }
  @keyframes konami-hue {
    0% { filter: hue-rotate(0deg) saturate(1); }
    50% { filter: hue-rotate(180deg) saturate(2); }
    100% { filter: hue-rotate(360deg) saturate(1); }
  }
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
