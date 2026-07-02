<script lang="ts">
  import { onMount } from 'svelte';
  import { tools } from '$lib/tools';
  import { icons } from '$lib/icons';
  import { decor } from '$lib/decor';
  import { track } from '$lib/analytics';
  import PixelIcon from '$lib/PixelIcon.svelte';

  const live = tools.filter((t) => t.live);
  const soon = tools.filter((t) => !t.live);
  const bulbs = [decor.bulbM, decor.bulbC, decor.bulbY];

  // Deterministic per-card "scattered" transform — same on server and client
  // (no Math.random) so there's no hydration mismatch.
  function hashSlug(slug: string): number {
    let h = 0;
    for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
    return h;
  }
  function scatterStyle(slug: string): string {
    const h = hashSlug(slug);
    const rot = (((h % 800) / 100) - 4).toFixed(2);
    const shift = ((((h >> 8) % 1200) / 100) - 6).toFixed(2);
    const scale = (0.97 + (((h >> 16) % 700) / 10000)).toFixed(3);
    return `--rot:${rot}deg;--shift:${shift}px;--scale:${scale};`;
  }

  let coinCount = $state<number | null>(null);
  let inserted = $state(false);
  let animating = $state(false);

  onMount(async () => {
    inserted = sessionStorage.getItem('s255_coined') === '1';
    try {
      const res = await fetch('/coin');
      if (res.ok) coinCount = (await res.json()).count;
    } catch { /* degrade gracefully */ }
  });

  async function insertCoin() {
    if (inserted || animating) return;
    animating = true;
    try {
      const res = await fetch('/coin', { method: 'POST' });
      if (res.ok) {
        coinCount = (await res.json()).count;
        inserted = true;
        sessionStorage.setItem('s255_coined', '1');
        track('coin_insert', {});
      }
    } catch { /* degrade gracefully */ }
    setTimeout(() => { animating = false; }, 700);
  }
</script>

<svelte:head>
  <title>Station255 — the 8-bit tool arcade | free pixel-art tools</title>
  <meta
    name="description"
    content="Station255 is an arcade of small, fast, free pixel-art and retro web tools — palette extractors, demakers, CRT effects, dithering, ASCII art and more. Runs entirely in your browser."
  />
</svelte:head>

<section class="hero">
  <div class="hero-row">
    <button
      class="coin-slot"
      class:inserted
      onclick={insertCoin}
      disabled={inserted}
      title={inserted ? 'Coin inserted — thank you!' : 'Insert a coin'}
      aria-label="Insert coin"
    >
      <span class="slot-gap"></span>
      {#if animating}
        <span class="coin-drop">🪙</span>
      {/if}
      <span class="slot-body">
        {#if inserted}
          <span class="slot-credit">CRED-<br />ITED</span>
        {:else}
          <span class="slot-symbol">¢</span>
          <span class="slot-label">INSERT</span>
        {/if}
      </span>
    </button>

    <div class="hero-text">
      <h1 class="hero-title">INSERT COIN</h1>
      <p class="hero-sub">{live.length} tools live · {soon.length} coming · 100% browser · free</p>
      {#if coinCount !== null}
        <p class="coin-tally">
          🪙 × {coinCount.toLocaleString()} coins inserted{inserted ? ' — including yours' : ''}
        </p>
      {/if}
    </div>
  </div>
</section>

<h2 class="section-label">▶ PLAY NOW</h2>
<div class="hangout">
  <div class="lights" aria-hidden="true">
    {#each Array(14) as _, i}
      <span class="bulb" style="animation-delay:{(i % 5) * 0.24}s">
        <PixelIcon svg={bulbs[i % 3]} />
      </span>
    {/each}
  </div>

  <div class="clutter" aria-hidden="true">
    <img src="/hangout/char-1.png" alt="" class="decor-char" style="bottom:0.4rem;left:0.5%;width:92px;transform:rotate(-3deg);" />
    <img src="/hangout/char-2.png" alt="" class="decor-char" style="bottom:0.4rem;right:2%;width:92px;transform:rotate(3deg) scaleX(-1);" />
    <span class="decor-icon" style="bottom:6%;left:19%;width:34px;transform:rotate(-8deg);"><PixelIcon svg={decor.sodaCan} /></span>
    <span class="decor-icon" style="bottom:3%;left:44%;width:46px;transform:rotate(5deg);"><PixelIcon svg={decor.pizzaBox} /></span>
    <span class="decor-icon" style="bottom:9%;right:24%;width:36px;transform:rotate(-6deg);"><PixelIcon svg={decor.bananaPeel} /></span>
    <span class="decor-icon" style="top:10%;right:3%;width:32px;transform:rotate(10deg);"><PixelIcon svg={decor.chipBag} /></span>
    <span class="decor-icon" style="top:36%;left:1.5%;width:26px;transform:rotate(-14deg);"><PixelIcon svg={decor.paperBall} /></span>
  </div>

  <div class="grid">
    {#each live as tool}
      <a href="/{tool.slug}" class="card" style={scatterStyle(tool.slug)}>
        <div class="card-icon">
          {#if icons[tool.slug]}
            <PixelIcon svg={icons[tool.slug]} />
          {:else}
            <span class="card-emoji">{tool.icon}</span>
          {/if}
        </div>
        <div class="card-body">
          <h2 class="card-name">{tool.name}</h2>
          <p class="card-tag">{tool.tagline}</p>
        </div>
        <span class="card-cta">PLAY →</span>
      </a>
    {/each}
  </div>
</div>

{#if soon.length > 0}
  <h2 class="section-label soon-label">◌ COMING SOON</h2>
  <div class="grid">
    {#each soon as tool}
      <div class="card card-soon">
        <div class="card-icon">
          {#if icons[tool.slug]}
            <PixelIcon svg={icons[tool.slug]} />
          {:else}
            <span class="card-emoji">{tool.icon}</span>
          {/if}
        </div>
        <div class="card-body">
          <h2 class="card-name">{tool.name}</h2>
          <p class="card-tag">{tool.tagline}</p>
        </div>
        <span class="card-cta soon-cta">SOON</span>
      </div>
    {/each}
  </div>
{/if}

<style>
  /* ── Hero ───────────────────────────────────────────── */
  .hero {
    padding: 1.25rem 0 1rem;
    border-bottom: 2px solid var(--line);
    margin-bottom: 1.5rem;
  }
  .hero-row {
    display: flex;
    align-items: center;
    gap: 1.25rem;
    flex-wrap: wrap;
  }
  .hero-text { flex: 1; min-width: 180px; }
  .hero-title {
    font-size: 1.4rem;
    color: var(--accent-3);
    text-shadow: 3px 3px 0 var(--accent);
    animation: blink 1.4s steps(2, start) infinite;
    margin: 0 0 0.5rem;
  }
  @keyframes blink { 50% { opacity: 0.5; } }
  .hero-sub { color: var(--muted); font-size: 1rem; margin: 0; }
  .coin-tally {
    font-family: var(--display);
    font-size: 0.5rem;
    color: var(--accent-3);
    margin: 0.6rem 0 0;
  }

  /* ── Coin slot ──────────────────────────────────────── */
  .coin-slot {
    position: relative;
    width: 64px;
    height: 88px;
    background: var(--panel);
    border: 3px solid var(--line);
    box-shadow: 5px 5px 0 #000;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0;
    overflow: hidden;
    flex-shrink: 0;
    transition: border-color 0.08s, transform 0.05s, box-shadow 0.05s;
  }
  .coin-slot:hover:not(:disabled) {
    border-color: var(--accent-3);
    box-shadow: 7px 7px 0 #000;
  }
  .coin-slot:active:not(:disabled) {
    transform: translate(2px, 2px);
    box-shadow: 3px 3px 0 #000;
  }
  .coin-slot.inserted { border-color: var(--accent-2); cursor: default; }
  .slot-gap {
    display: block;
    width: 68%;
    height: 5px;
    background: #000;
    margin-top: 13px;
    border: 1px solid #555;
    flex-shrink: 0;
  }
  .slot-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.1rem;
  }
  .slot-symbol { font-family: var(--pixel); font-size: 1.9rem; color: var(--accent-3); line-height: 1; }
  .coin-slot.inserted .slot-symbol { color: var(--accent-2); }
  .slot-label { font-family: var(--display); font-size: 0.38rem; color: var(--muted); letter-spacing: 0.06em; }
  .slot-credit { font-family: var(--display); font-size: 0.38rem; color: var(--accent-2); letter-spacing: 0.04em; text-align: center; line-height: 1.9; }
  .coin-drop {
    position: absolute;
    top: -14px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 1.1rem;
    pointer-events: none;
    z-index: 5;
    animation: coin-fall 0.65s ease-in forwards;
  }
  @keyframes coin-fall {
    0%   { top: -14px; opacity: 1; }
    50%  { top: 8px;   opacity: 1; }
    70%  { top: 10px;  opacity: 0.5; }
    100% { top: 12px;  opacity: 0; }
  }

  /* ── Section labels ─────────────────────────────────── */
  .section-label {
    font-family: var(--display);
    font-size: 0.55rem;
    color: var(--accent-3);
    letter-spacing: 0.1em;
    margin: 0 0 0.75rem;
    padding: 0;
  }
  .soon-label {
    color: var(--muted);
    margin-top: 2.5rem;
  }

  /* ── Hangout floor ──────────────────────────────────── */
  .hangout {
    --jitter: 1;
    position: relative;
    padding: 0 0.5rem 9rem;
    background:
      repeating-linear-gradient(45deg, rgba(255, 46, 136, 0.05) 0 10px, transparent 10px 20px),
      repeating-linear-gradient(-45deg, rgba(33, 230, 193, 0.05) 0 10px, transparent 10px 20px),
      repeating-linear-gradient(0deg, rgba(255, 210, 63, 0.04) 0 2px, transparent 2px 22px);
    border: 2px solid var(--line);
  }

  .lights {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 0.6rem 0.75rem 1rem;
    border-bottom: 1px dashed var(--line);
    margin-bottom: 1.25rem;
  }
  .bulb { width: 12px; height: 12px; animation: twinkle 1.8s ease-in-out infinite; filter: drop-shadow(0 0 3px currentColor); }
  .bulb:nth-child(3n+1) { color: var(--accent); }
  .bulb:nth-child(3n+2) { color: var(--accent-2); }
  .bulb:nth-child(3n) { color: var(--accent-3); }
  @keyframes twinkle { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

  .clutter { position: absolute; inset: 0; pointer-events: none; }
  .decor-char, .decor-icon {
    position: absolute;
    display: block;
    z-index: 1;
    image-rendering: pixelated;
    opacity: 0.92;
  }
  .decor-char { height: auto; }
  .decor-icon { width: 32px; }

  /* ── Tool grid ──────────────────────────────────────── */
  .grid {
    position: relative;
    z-index: 2;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1.1rem 0.9rem;
    margin-bottom: 0.5rem;
  }

  /* ── Tool card ──────────────────────────────────────── */
  .card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    background: var(--panel);
    border: 2px solid var(--line);
    padding: 1rem 0.75rem 0.75rem;
    box-shadow: 4px 4px 0 #000;
    text-decoration: none;
    color: var(--ink);
    transition: transform 0.1s ease, border-color 0.06s, box-shadow 0.1s;
    cursor: pointer;
    text-align: center;
    transform: rotate(calc(var(--rot, 0deg) * var(--jitter))) translateY(calc(var(--shift, 0px) * var(--jitter))) scale(var(--scale, 1));
  }
  .card:hover, .card:focus-visible {
    transform: translate(2px, 2px) rotate(0deg) scale(1.03);
    box-shadow: 2px 2px 0 #000;
    border-color: var(--accent-2);
    color: var(--ink);
    z-index: 3;
  }
  .card-soon {
    opacity: 0.45;
    cursor: default;
    box-shadow: none;
  }
  .card-soon:hover {
    transform: none;
    box-shadow: none;
    border-color: var(--line);
  }

  .card-icon {
    width: 64px;
    height: 64px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .card-emoji { font-size: 2rem; line-height: 1; }

  .card-body { flex: 1; width: 100%; }
  .card-name {
    font-family: var(--display);
    font-size: 0.5rem;
    margin: 0 0 0.3rem;
    color: var(--ink);
    line-height: 1.5;
  }
  .card-tag {
    color: var(--muted);
    font-size: 0.85rem;
    margin: 0;
    line-height: 1.4;
  }
  .card-cta {
    font-family: var(--display);
    font-size: 0.45rem;
    color: var(--accent-2);
    align-self: flex-end;
    margin-top: auto;
  }
  .soon-cta { color: var(--muted); }

  @media (max-width: 480px) {
    .grid { grid-template-columns: repeat(2, 1fr); gap: 0.6rem 0.5rem; }
    .card-icon { width: 48px; height: 48px; }
    .hangout { --jitter: 0.4; padding-bottom: 6rem; }
    .decor-char { width: 60px !important; }
    .decor-icon { width: 22px !important; }
    .lights { padding: 0.5rem 0.4rem 0.75rem; }
  }
</style>
