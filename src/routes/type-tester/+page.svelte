<script lang="ts">
  import { track } from '$lib/analytics';

  const FONTS = [
    { name: 'Press Start 2P', css: "'Press Start 2P', monospace", size: '0.7rem' },
    { name: 'VT323', css: "'VT323', monospace", size: '1.6rem' },
    { name: 'Courier New', css: "'Courier New', monospace", size: '1rem' },
    { name: 'monospace', css: 'monospace', size: '1rem' },
    { name: 'serif', css: 'serif', size: '1rem' },
    { name: 'sans-serif', css: 'sans-serif', size: '1rem' },
  ];

  const PIXEL_FONTS = [
    { name: 'Press Start 2P', css: "'Press Start 2P', monospace", size: '0.65rem' },
    { name: 'VT323', css: "'VT323', monospace", size: '1.8rem' },
  ];

  let text = $state('Station 255');
  let size = $state(100);
  let showAll = $state(true);

  const fonts = $derived(showAll ? FONTS : PIXEL_FONTS);

  $effect(() => {
    if (text) track('tool_use', { tool: 'type-tester' });
  });
</script>

<svelte:head>
  <title>Retro Font Type Tester — preview pixel fonts side by side | Station255</title>
  <meta name="description" content="Preview any text in retro pixel fonts side by side. Compare Press Start 2P, VT323, and system fonts instantly. Free, no download needed." />
</svelte:head>

<h1>Type Tester</h1>
<p class="lead">See your text in a bunch of fonts at once.</p>

<div class="controls">
  <input class="text-input" type="text" bind:value={text} placeholder="Type something…" maxlength="80" />
  <label class="ctrl">
    <span>Size: <strong>{size}%</strong></span>
    <input type="range" min="40" max="200" step="10" bind:value={size} />
  </label>
  <label class="toggle">
    <input type="checkbox" bind:checked={showAll} />
    <span>Show system fonts</span>
  </label>
</div>

<div class="samples">
  {#each fonts as font}
    <div class="sample panel">
      <span class="font-name">{font.name}</span>
      <p class="sample-text" style="font-family:{font.css}; font-size:calc({font.size} * {size/100});">
        {text || 'Type something above'}
      </p>
    </div>
  {/each}
</div>

<div class="charset panel">
  <span class="font-name">Full charset — Press Start 2P</span>
  <p class="chars" style="font-family:'Press Start 2P', monospace; font-size:0.6rem; line-height:2.2;">
    ABCDEFGHIJKLMNOPQRSTUVWXYZ<br />
    abcdefghijklmnopqrstuvwxyz<br />
    0123456789 !@#$%^&*()-=+[]&#123;&#125;
  </p>
</div>
<div class="charset panel">
  <span class="font-name">Full charset — VT323</span>
  <p class="chars" style="font-family:'VT323', monospace; font-size:1.5rem; line-height:1.4;">
    ABCDEFGHIJKLMNOPQRSTUVWXYZ<br />
    abcdefghijklmnopqrstuvwxyz<br />
    0123456789 !@#$%^&*()-=+[]&#123;&#125;
  </p>
</div>

<section class="seo panel">
  <h2>About the Type Tester</h2>
  <p>Station255 uses two pixel fonts: <strong>Press Start 2P</strong> (the chunky arcade headline font) and <strong>VT323</strong> (the slim terminal monospace). Both are loaded from Google Fonts in the page shell — no extra request needed on this page.</p>
  <p>Use this tool to sanity-check how your game title, UI label, or stream overlay text looks in each font before committing to one.</p>
  <div class="see-also">
    <span class="see-label">Related:</span>
    <a href="/pixel-text">Pixel Text</a>
    <a href="/bootscreen">Boot Screen</a>
    <a href="/badge">Badge Maker</a>
  </div>
</section>

<style>
  .lead { color: var(--muted); font-size: 1.2rem; margin: 0 0 1rem; }
  .controls { display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; margin-bottom: 1.5rem; }
  .text-input {
    flex: 1; min-width: 200px;
    background: var(--bg-2); color: var(--ink);
    border: 2px solid var(--line); padding: 0.5rem 0.75rem;
    font-size: 1rem;
  }
  .ctrl { display: flex; flex-direction: column; gap: 0.25rem; font-size: 1rem; }
  .toggle { display: flex; align-items: center; gap: 0.5rem; font-size: 1rem; cursor: pointer; }
  .samples { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1rem; }
  .sample { padding: 1rem; }
  .font-name { font-family: var(--display); font-size: 0.45rem; color: var(--muted); display: block; margin-bottom: 0.5rem; letter-spacing: 0.05em; }
  .sample-text { margin: 0; color: var(--ink); line-height: 1.6; word-break: break-word; }
  .charset { margin-bottom: 0.75rem; padding: 1rem; }
  .chars { margin: 0; color: var(--ink); word-break: break-all; }
</style>
