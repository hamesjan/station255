<script lang="ts">
  import { onMount } from 'svelte';
  import { track } from '$lib/analytics';

  const GAMES = [
    { year: 1972, name: 'Pong', dev: 'Atari', wiki: 'Pong_(game)',
      desc: 'Two paddles. One ball. No story. The first commercially successful arcade game proved that moving pixels on a screen was enough to pull quarters out of pockets.' },
    { year: 1978, name: 'Space Invaders', dev: 'Taito', wiki: 'Space_Invaders',
      desc: 'Sixty-eight aliens marching sideways — and speeding up as you kill them. The high score was born here. So was the arcade line around the block.' },
    { year: 1980, name: 'Pac-Man', dev: 'Namco', wiki: 'Pac-Man',
      desc: 'A round yellow face eating dots in a maze. Designed for everyone — the first gaming icon, and the first game to prove a character could sell merchandise.' },
    { year: 1981, name: 'Donkey Kong', dev: 'Nintendo', wiki: 'Donkey_Kong',
      desc: "Miyamoto's debut. Jump over barrels thrown by a giant ape. This game introduced Mario — then just called Jumpman — and gave Nintendo a franchise that still runs today." },
    { year: 1984, name: 'Tetris', dev: 'Alexey Pajitnov', wiki: 'Tetris',
      desc: 'Seven shapes. Infinite combinations. Built in a Soviet research lab and banned from export — until the Game Boy launched with it bundled and moved 35 million handhelds.' },
    { year: 1985, name: 'Super Mario Bros', dev: 'Nintendo', wiki: 'Super_Mario_Bros.',
      desc: 'The game that rescued the industry after the 1983 crash. Every pixel of eight worlds was sketched on graph paper first. Still the best-selling single-cartridge game ever made.' },
    { year: 1986, name: 'The Legend of Zelda', dev: 'Nintendo', wiki: 'The_Legend_of_Zelda_(video_game)',
      desc: 'An open world on the NES. No tutorial. No map until you drew your own. A gold cartridge with a battery save changed what a game could even be.' },
    { year: 1987, name: 'Mega Man', dev: 'Capcom', wiki: 'Mega_Man_(video_game)',
      desc: "Six robot masters in any order you want. Beat one, absorb their weapon. Inafune's blue bomber set the template for action-platformers with real progression." },
    { year: 1991, name: 'Street Fighter II', dev: 'Capcom', wiki: 'Street_Fighter_II:_The_World_Warrior',
      desc: 'Pixel art pushed to its absolute limit — hundreds of hand-drawn frames per fighter. The fighting game genre was born here and still hasn\'t moved far from this foundation.' },
    { year: 1991, name: 'Sonic the Hedgehog', dev: 'Sega', wiki: 'Sonic_the_Hedgehog_(1991_video_game)',
      desc: "Speed as a mechanic. Sega's answer to Mario used parallax scrolling and motion blur to make pixels feel fast. The technical showcase that defined the Genesis." },
    { year: 1993, name: 'Doom', dev: 'id Software', wiki: 'Doom_(1993_video_game)',
      desc: '2D sprites on a 3D map — a raycaster trick so fast that people thought their PC was broken when they first saw it move. Changed everything about PC gaming overnight.' },
    { year: 1995, name: 'Chrono Trigger', dev: 'Square', wiki: 'Chrono_Trigger',
      desc: "Akira Toriyama's character designs animated in pixel art across twelve time periods. A full orchestra of sprites. Many still call it the greatest RPG ever made." },
    { year: 1997, name: 'Castlevania: SotN', dev: 'Konami', wiki: 'Castlevania:_Symphony_of_the_Night',
      desc: 'Released when 3D was everything and pixel art was supposedly dead. Symphony chose hand-drawn sprites anyway, and named a genre: Metroidvania.' },
    { year: 2004, name: 'Cave Story', dev: 'Daisuke Amaya', wiki: 'Cave_Story',
      desc: 'One developer, five years, every pixel hand-drawn. Cave Story proved a solo indie game could match a major studio release — and lit the fuse for the indie explosion.' },
    { year: 2011, name: 'Terraria', dev: 'Re-Logic', wiki: 'Terraria',
      desc: 'A 2D sandbox with more depth than most 3D games. Started with a four-person team and has received free updates for over a decade. 45 million copies sold.' },
    { year: 2014, name: 'Shovel Knight', dev: 'Yacht Club Games', wiki: 'Shovel_Knight',
      desc: "A love letter to the NES written with Kickstarter money. Every sprite follows real NES hardware constraints — self-imposed. Every frame an argument that pixel art is craft, not nostalgia." },
    { year: 2015, name: 'Undertale', dev: 'Toby Fox', wiki: 'Undertale',
      desc: "A game that knows it's a game, and makes that the point. Toby Fox built it mostly alone. The pixels are deliberately simple. The writing is not." },
    { year: 2016, name: 'Stardew Valley', dev: 'ConcernedApe', wiki: 'Stardew_Valley',
      desc: 'One person. Four years. Every sprite, every note of music, every line of code by Eric Barone. 20 million copies sold. The definitive argument for solo indie development.' },
    { year: 2018, name: 'Celeste', dev: 'Matt Makes Games', wiki: 'Celeste_(video_game)',
      desc: 'A game about climbing a mountain and also about anxiety. Every pixel of movement tuned to feel exactly right. The definitive example of pixel art as genuine art.' },
  ];

  let images = $state<Record<string, string>>({});
  let entries: HTMLElement[] = [];

  onMount(() => {
    track('pageview', { page: '/history' });

    // Fetch Wikipedia thumbnails staggered
    GAMES.forEach(({ wiki }, i) => {
      setTimeout(() => {
        fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wiki)}`)
          .then(r => r.ok ? r.json() : null)
          .then((d: { thumbnail?: { source: string } } | null) => {
            if (d?.thumbnail?.source) images = { ...images, [wiki]: d.thumbnail.source };
          })
          .catch(() => {});
      }, i * 100);
    });

    // Scroll-in: use inline style so Svelte CSS scoping can't interfere
    const show = (el: HTMLElement, delay = 0) => {
      setTimeout(() => {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, delay);
    };

    if (typeof IntersectionObserver !== 'undefined') {
      const obs = new IntersectionObserver((evts) => {
        for (const ev of evts) {
          if (ev.isIntersecting) {
            show(ev.target as HTMLElement);
            obs.unobserve(ev.target);
          }
        }
      }, { threshold: 0.05 });
      entries.forEach(el => el && obs.observe(el));
      // Fallback: reveal everything after 2s regardless
      const t = setTimeout(() => entries.forEach(el => el && show(el)), 2000);
      return () => { obs.disconnect(); clearTimeout(t); };
    } else {
      // No IntersectionObserver — just show all
      entries.forEach((el, i) => el && show(el, i * 60));
    }
  });
</script>

<svelte:head>
  <title>History of Pixel Games — from Pong to Celeste | Station255</title>
  <meta name="description" content="A visual timeline of pixel art games from 1972 to today — Pong, Space Invaders, Mario, Doom, Cave Story, Undertale, Celeste and more." />
</svelte:head>

<div class="page-header">
  <h1 class="page-title">HISTORY OF PIXEL GAMES</h1>
  <p class="page-sub">Five decades of the games that made pixels a medium, not a limitation.</p>
</div>

<div class="timeline">
  <div class="vline"></div>

  {#each GAMES as game, i}
    <div
      class="entry"
      style="opacity:0; transform:translateY(28px); transition:opacity 0.5s ease {i * 0.04}s, transform 0.5s ease {i * 0.04}s"
      bind:this={entries[i]}
    >
      <div class="entry-left">
        <span class="year">{game.year}</span>
      </div>

      <div class="dot"></div>

      <div class="card">
        {#if images[game.wiki]}
          <img src={images[game.wiki]} alt={game.name} class="card-img" loading="lazy" />
        {:else}
          <div class="card-img-ph"><span class="ph-txt">{game.year}</span></div>
        {/if}
        <div class="card-body">
          <div class="card-top">
            <span class="card-name">{game.name}</span>
            <span class="card-dev">{game.dev}</span>
          </div>
          <p class="card-desc">{game.desc}</p>
        </div>
      </div>
    </div>
  {/each}
</div>

<style>
  /* ── Page header ───────────────────── */
  .page-header {
    padding: 1.5rem 0 1.25rem;
    border-bottom: 2px solid var(--line);
    margin-bottom: 2.5rem;
  }
  .page-title {
    font-family: var(--display);
    font-size: 1.1rem;
    color: var(--accent-3);
    text-shadow: 3px 3px 0 var(--accent);
    margin: 0 0 0.6rem;
    letter-spacing: 0.06em;
    line-height: 1.6;
  }
  .page-sub {
    color: var(--muted);
    font-size: 0.95rem;
    margin: 0;
    line-height: 1.55;
  }

  /* ── Timeline shell ────────────────── */
  .timeline {
    position: relative;
    padding-left: 100px; /* room for year + line */
    padding-bottom: 2rem;
  }

  /* the vertical glowing line */
  .vline {
    position: absolute;
    left: 70px;
    top: 8px;
    bottom: 0;
    width: 3px;
    background: linear-gradient(
      to bottom,
      var(--accent) 0%,
      var(--accent-3) 40%,
      var(--accent-2) 80%,
      transparent 100%
    );
  }

  /* ── Each entry row ────────────────── */
  .entry {
    display: flex;
    align-items: flex-start;
    gap: 0;
    margin-bottom: 2rem;
    position: relative;
  }

  /* year label — sits left of the line */
  .entry-left {
    position: absolute;
    left: -100px;
    top: 0.6rem;
    width: 90px;
    text-align: right;
  }
  .year {
    font-family: var(--display);
    font-size: 0.38rem;
    color: var(--accent-3);
    letter-spacing: 0.04em;
    line-height: 1;
  }

  /* dot on the line */
  .dot {
    flex-shrink: 0;
    width: 11px;
    height: 11px;
    border-radius: 50%;
    background: var(--accent-3);
    border: 2px solid var(--bg);
    box-shadow: 0 0 6px var(--accent-3);
    margin-top: 0.75rem;
    margin-left: -7px; /* overlap the vline */
    margin-right: 1rem;
    z-index: 1;
    position: relative;
  }

  /* ── Card ──────────────────────────── */
  .card {
    flex: 1;
    min-width: 0;
    display: flex;
    gap: 0.75rem;
    background: var(--panel);
    border: 2px solid var(--line);
    box-shadow: 4px 4px 0 #000;
    overflow: hidden;
    transition: border-color 0.08s;
  }
  .card:hover { border-color: var(--accent-2); }

  .card-img {
    width: 120px;
    min-width: 120px;
    height: 90px;
    object-fit: cover;
    display: block;
    flex-shrink: 0;
    image-rendering: auto;
  }
  .card-img-ph {
    width: 120px;
    min-width: 120px;
    height: 90px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: repeating-linear-gradient(
      45deg,
      var(--bg) 0px, var(--bg) 4px,
      var(--bg-2) 4px, var(--bg-2) 8px
    );
  }
  .ph-txt {
    font-family: var(--display);
    font-size: 0.35rem;
    color: var(--line);
  }

  .card-body {
    padding: 0.6rem 0.75rem 0.6rem 0;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    min-width: 0;
  }
  .card-top {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .card-name {
    font-family: var(--display);
    font-size: 0.45rem;
    color: var(--ink);
    letter-spacing: 0.04em;
    line-height: 1.5;
  }
  .card-dev {
    font-size: 0.8rem;
    color: var(--accent-2);
    flex-shrink: 0;
  }
  .card-desc {
    font-size: 0.82rem;
    color: var(--muted);
    line-height: 1.55;
    margin: 0;
  }

  /* ── Mobile ────────────────────────── */
  @media (max-width: 560px) {
    .timeline { padding-left: 54px; }
    .vline { left: 30px; }
    .entry-left { left: -54px; width: 44px; }
    .year { font-size: 0.3rem; }
    .card { flex-direction: column; }
    .card-img, .card-img-ph { width: 100%; min-width: 0; height: 120px; }
    .card-body { padding: 0.5rem; }
  }
</style>
