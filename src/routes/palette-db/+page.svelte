<script lang="ts">
  import { track } from '$lib/analytics';

  type PaletteEntry = {
    name: string;
    system: string;
    year: string;
    colors: string[];
    desc: string;
  };

  const DB: PaletteEntry[] = [
    {
      name: 'PICO-8',
      system: 'Fantasy Console',
      year: '2015',
      desc: '16 colors hand-picked by Zep for maximum vibe in minimum bytes.',
      colors: ['#000000','#1d2b53','#7e2553','#008751','#ab5236','#5f574f','#c2c3c7','#fff1e8','#ff004d','#ffa300','#ffec27','#00e436','#29adff','#83769c','#ff77a8','#ffccaa'],
    },
    {
      name: 'Game Boy (DMG)',
      system: 'Nintendo Game Boy',
      year: '1989',
      desc: 'The iconic 4-shade green palette of the original Dot Matrix Game Boy.',
      colors: ['#0f380f','#306230','#8bac0f','#9bbc0f'],
    },
    {
      name: 'Game Boy Pocket',
      system: 'Nintendo Game Boy',
      year: '1996',
      desc: 'A cooler, grey-toned variant used in the Game Boy Pocket revision.',
      colors: ['#000000','#555555','#aaaaaa','#ffffff'],
    },
    {
      name: 'Game Boy Color',
      system: 'Nintendo GBC',
      year: '1998',
      desc: 'Default teal-to-black palette before game-specific palettes kick in.',
      colors: ['#081820','#346856','#88c070','#e0f8d0'],
    },
    {
      name: 'NES (NTSC)',
      system: 'Nintendo NES',
      year: '1983',
      desc: 'The full 64-color NES PPU palette. Not all are unique — the system has 54 usable colors.',
      colors: [
        '#7c7c7c','#0000fc','#0000bc','#4428bc','#940084','#a80020','#a81000','#881400',
        '#503000','#007800','#006800','#005800','#004058','#000000','#000000','#000000',
        '#bcbcbc','#0078f8','#0058f8','#6844fc','#d800cc','#e40058','#f83800','#e45c10',
        '#ac7c00','#00b800','#00a800','#00a844','#008888','#000000','#000000','#000000',
        '#f8f8f8','#3cbcfc','#6888fc','#9878f8','#f878f8','#f85898','#f87858','#fca044',
        '#f8b800','#b8f818','#58d854','#58f898','#00e8d8','#787878','#000000','#000000',
        '#fcfcfc','#a4e4fc','#b8b8f8','#d8b8f8','#f8b8f8','#f8a4c0','#f0d0b0','#fce0a8',
        '#f8d878','#d8f878','#b8f8b8','#b8f8d8','#00fcfc','#f8d8f8','#000000','#000000',
      ],
    },
    {
      name: 'SNES',
      system: 'Nintendo SNES',
      year: '1990',
      desc: 'The SNES could display 256 of its 32,768 possible colors simultaneously. This is a common default palette.',
      colors: ['#000000','#ffffff','#ff0000','#00ff00','#0000ff','#ffff00','#ff00ff','#00ffff','#ff8000','#8000ff','#00ff80','#ff0080','#0080ff','#80ff00','#800000','#008000','#000080','#808000','#008080','#800080','#804000','#408000','#004080','#804080','#408080','#804040','#408040','#804000','#c0c0c0','#808080','#404040','#202020'],
    },
    {
      name: 'Commodore 64',
      system: 'Commodore 64',
      year: '1982',
      desc: 'The 16-color VIC-II chip palette, one of the most beloved retro palettes ever.',
      colors: ['#000000','#ffffff','#880000','#aaffee','#cc44cc','#00cc55','#0000aa','#eeee77','#dd8855','#664400','#ff7777','#333333','#777777','#aaff66','#0088ff','#bbbbbb'],
    },
    {
      name: 'CGA (Mode 4)',
      system: 'IBM PC CGA',
      year: '1981',
      desc: 'The infamous 4-color CGA magenta palette that defined early PC gaming.',
      colors: ['#000000','#ff55ff','#55ffff','#ffffff'],
    },
    {
      name: 'CGA (16 colors)',
      system: 'IBM PC CGA',
      year: '1981',
      desc: 'Full 16-color CGA palette from the Color Graphics Adapter.',
      colors: ['#000000','#0000aa','#00aa00','#00aaaa','#aa0000','#aa00aa','#aa5500','#aaaaaa','#555555','#5555ff','#55ff55','#55ffff','#ff5555','#ff55ff','#ffff55','#ffffff'],
    },
    {
      name: 'EGA',
      system: 'IBM PC EGA',
      year: '1984',
      desc: 'Enhanced Graphics Adapter — 64 possible colors, 16 displayable at once.',
      colors: ['#000000','#0000aa','#00aa00','#00aaaa','#aa0000','#aa00aa','#aa5500','#aaaaaa','#555555','#5555ff','#55ff55','#55ffff','#ff5555','#ff55ff','#ffff55','#ffffff','#000055','#0000ff','#005500','#0055aa','#aa0055','#aa00ff','#aa5555','#aaaaff'],
    },
    {
      name: 'ZX Spectrum',
      system: 'Sinclair ZX Spectrum',
      year: '1982',
      desc: '8 colors × 2 brightness levels (bright/normal). Colors are pure R, G, B combinations.',
      colors: ['#000000','#0000d7','#d70000','#d700d7','#00d700','#00d7d7','#d7d700','#d7d7d7','#000000','#0000ff','#ff0000','#ff00ff','#00ff00','#00ffff','#ffff00','#ffffff'],
    },
    {
      name: 'Atari 2600',
      system: 'Atari 2600',
      year: '1977',
      desc: 'NTSC palette for the Atari 2600 TIA chip — 128 colors organized by hue.',
      colors: ['#000000','#444400','#702800','#841800','#880000','#78005c','#480078','#140084','#000088','#00187c','#002c5c','#003c2c','#003c00','#143800','#2c3000','#442800','#404040','#646410','#844414','#983418','#9c2020','#8c2074','#602090','#302098','#1c209c','#1c3490','#1c4c70','#1c5c40','#205c0c','#4c5408','#6c4c18','#7c4018','#6c6c6c','#848424','#c06420','#c04c24','#bf3030','#c02880','#8430a8','#4830b0','#2c30b4','#2c48a8','#2c648a','#2c7a58','#2c7a1c','#6c7414','#987030','#b06030','#a4a4a4','#b0b034','#d89040','#d87030','#d05050','#d038a8','#9840c4','#6040c8','#4040cc','#4060c4','#40809c','#409870','#409830','#909828','#c09448','#d08048'],
    },
    {
      name: 'Apple II',
      system: 'Apple II',
      year: '1977',
      desc: 'The 16-color high-res palette of the Apple II, notorious for its magenta and green.',
      colors: ['#000000','#722640','#07459a','#7f6bda','#0f7040','#7f7f7f','#1cb8f3','#8fdcff','#724020','#ff6a00','#7f7f7f','#ffb27f','#26c526','#ffd726','#87ffb2','#ffffff'],
    },
    {
      name: 'Amstrad CPC',
      system: 'Amstrad CPC',
      year: '1984',
      desc: '27-color palette from the Amstrad CPC hardware, based on RGB combinations.',
      colors: ['#000000','#000080','#0000ff','#800000','#800080','#8000ff','#ff0000','#ff0080','#ff00ff','#008000','#008080','#0080ff','#808000','#808080','#8080ff','#ff8000','#ff8080','#ff80ff','#00ff00','#00ff80','#00ffff','#80ff00','#80ff80','#80ffff','#ffff00','#ffff80','#ffffff'],
    },
    {
      name: 'MSX',
      system: 'MSX',
      year: '1983',
      desc: 'The TMS9918A VDP palette used by MSX, ColecoVision, and SG-1000.',
      colors: ['#000000','#010101','#3eb849','#74d07d','#5955e0','#8076f1','#b95e51','#65dbef','#db6559','#ff897d','#ccc35e','#ded087','#3aa241','#b766b5','#cccccc','#ffffff'],
    },
    {
      name: 'Game Gear',
      system: 'Sega Game Gear',
      year: '1990',
      desc: 'The Game Gear had a 4096-color palette (12-bit). This shows a common subset.',
      colors: ['#000000','#555500','#aa5500','#ff5500','#005500','#555500','#aa5500','#ff5500','#00aa00','#55aa00','#aaaa00','#ffaa00','#00ff00','#55ff00','#aaff00','#ffff00','#0000aa','#5500aa','#aa00aa','#ff00aa','#0055aa','#5555aa','#aa55aa','#ff55aa','#00aaaa','#55aaaa','#aaaaaa','#ffaaaa','#00ffaa','#55ffaa','#aaffaa','#ffffaa'],
    },
    {
      name: 'Virtual Boy',
      system: 'Nintendo Virtual Boy',
      year: '1995',
      desc: 'Only 4 shades of red — the only colors the Virtual Boy could display.',
      colors: ['#000000','#550000','#aa0000','#ff0000'],
    },
    {
      name: 'Teletext',
      system: 'BBC Ceefax/Teletext',
      year: '1974',
      desc: '8 primary colors used by the UK teletext system. Bold and unapologetic.',
      colors: ['#000000','#ff0000','#00ff00','#ffff00','#0000ff','#ff00ff','#00ffff','#ffffff'],
    },
    {
      name: 'Mono Phosphor (Green)',
      system: 'Green CRT Terminal',
      year: '1970s',
      desc: 'Classic green phosphor monochrome terminal. 4 shades from black to bright green.',
      colors: ['#000000','#003300','#006600','#00aa00','#00cc00','#00ff00','#33ff33','#99ff99'],
    },
    {
      name: 'Mono Phosphor (Amber)',
      system: 'Amber CRT Terminal',
      year: '1970s',
      desc: 'The warm amber alternative to green terminals, popular in IBM systems.',
      colors: ['#000000','#331100','#662200','#aa4400','#cc6600','#ff8800','#ffaa44','#ffcc99'],
    },
  ];

  let search = $state('');
  let copied = $state<string | null>(null);

  let filtered = $derived(
    search.trim() === ''
      ? DB
      : DB.filter(p =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.system.toLowerCase().includes(search.toLowerCase())
        )
  );

  async function copyHex(hex: string) {
    await navigator.clipboard.writeText(hex);
    copied = hex;
    setTimeout(() => { if (copied === hex) copied = null; }, 1200);
    track('tool_use', { tool: 'palette-db', action: 'copy-color' });
  }

  async function copyAll(colors: string[]) {
    await navigator.clipboard.writeText(colors.join('\n'));
    copied = 'all';
    setTimeout(() => { copied = null; }, 1200);
    track('export', { tool: 'palette-db', type: 'copy-palette' });
  }
</script>

<svelte:head>
  <title>Retro Game Palette Database — NES, SNES, Game Boy, C64, PICO-8 | Station255</title>
  <meta name="description" content="Browse every retro gaming color palette — NES, Game Boy, PICO-8, C64, ZX Spectrum, Atari, EGA and more. Copy hex codes instantly." />
</svelte:head>

<div class="tool-header">
  <h1 class="tool-title">RETRO PALETTE DB</h1>
  <p class="tool-sub">Every color palette from every classic system. Click any swatch to copy its hex code.</p>
</div>

<div class="search-row">
  <input
    class="search-input"
    type="search"
    placeholder="Search palettes…"
    bind:value={search}
    aria-label="Search palettes"
  />
</div>

<div class="grid">
  {#each filtered as entry}
    <div class="card panel">
      <div class="card-head">
        <div>
          <h2 class="card-name">{entry.name}</h2>
          <span class="card-system">{entry.system} · {entry.year}</span>
        </div>
        <button class="copy-all" onclick={() => copyAll(entry.colors)} title="Copy all hex codes">
          {copied === 'all' ? '✓ copied' : '⎘ copy all'}
        </button>
      </div>
      <p class="card-desc">{entry.desc}</p>
      <div class="swatches">
        {#each entry.colors as c}
          <button
            class="swatch"
            style="background:{c}"
            onclick={() => copyHex(c)}
            title={c}
            aria-label="Copy {c}"
          >
            {#if copied === c}
              <span class="tick">✓</span>
            {/if}
          </button>
        {/each}
      </div>
      <div class="hex-list">
        {#each entry.colors.slice(0, 8) as c}
          <button class="hex-chip" onclick={() => copyHex(c)}>{c}</button>
        {/each}
        {#if entry.colors.length > 8}
          <span class="hex-more">+{entry.colors.length - 8} more</span>
        {/if}
      </div>
    </div>
  {/each}

  {#if filtered.length === 0}
    <p class="empty">No palettes match "{search}".</p>
  {/if}
</div>

<style>
  .tool-header { padding: 1.25rem 0 1rem; border-bottom: 2px solid var(--line); margin-bottom: 1.25rem; }
  .tool-title { font-family: var(--display); font-size: 1.1rem; color: var(--accent-3); text-shadow: 3px 3px 0 var(--accent); margin: 0 0 0.5rem; }
  .tool-sub { color: var(--muted); font-size: 0.95rem; margin: 0; }

  .search-row { margin-bottom: 1.25rem; }
  .search-input {
    width: 100%; max-width: 400px; font-family: inherit; font-size: 0.9rem;
    background: var(--panel); border: 2px solid var(--line); color: var(--ink);
    padding: 0.5rem 0.75rem; outline: none; transition: border-color 0.1s;
  }
  .search-input:focus { border-color: var(--accent-3); }

  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; }

  .card { display: flex; flex-direction: column; gap: 0.5rem; }
  .card-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; }
  .card-name { font-family: var(--display); font-size: 0.45rem; color: var(--ink); margin: 0 0 0.2rem; }
  .card-system { font-size: 0.8rem; color: var(--accent-2); }
  .card-desc { font-size: 0.82rem; color: var(--muted); line-height: 1.5; margin: 0; }

  .copy-all {
    font-family: var(--display); font-size: 0.32rem; background: none;
    border: 1px solid var(--line); color: var(--muted); padding: 0.25rem 0.5rem;
    cursor: pointer; white-space: nowrap; flex-shrink: 0; transition: border-color 0.08s, color 0.08s;
  }
  .copy-all:hover { border-color: var(--accent-3); color: var(--accent-3); }

  .swatches { display: flex; flex-wrap: wrap; gap: 3px; }
  .swatch {
    width: 24px; height: 24px; border: none; cursor: pointer;
    position: relative; transition: transform 0.05s;
    outline: 1px solid rgba(0,0,0,0.3);
  }
  .swatch:hover { transform: scale(1.2); z-index: 1; }
  .tick { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; color: #fff; text-shadow: 0 0 3px #000; }

  .hex-list { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 0.25rem; }
  .hex-chip {
    font-family: monospace; font-size: 0.72rem; background: var(--bg); color: var(--muted);
    border: 1px solid var(--line); padding: 2px 5px; cursor: pointer; transition: color 0.08s;
  }
  .hex-chip:hover { color: var(--ink); }
  .hex-more { font-size: 0.72rem; color: var(--muted); align-self: center; }

  .empty { color: var(--muted); font-size: 0.9rem; padding: 2rem; }
</style>
