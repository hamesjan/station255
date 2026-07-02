<script lang="ts">
  import { track } from '$lib/analytics';
  import { hexToRgb, rgbToHex, contrastRatio, passAA, passAAA } from '$lib/contrast';
  import { PALETTES } from '$lib/palettes';

  let fg = $state('#edeaff');
  let bg = $state('#0d0b1a');
  let large = $state(false);
  let copied = $state(false);

  const ratio = $derived(contrastRatio(hexToRgb(fg), hexToRgb(bg)));
  const ratioText = $derived(ratio.toFixed(2));
  const aaOk = $derived(passAA(ratio, large));
  const aaaOk = $derived(passAAA(ratio, large));
  const aaLargeOk = $derived(passAA(ratio, true));
  const aaaLargeOk = $derived(passAAA(ratio, true));

  type Swatch = { hex: string; ratio: number };
  const paletteMatches = $derived.by(() => {
    const bgRgb = hexToRgb(bg);
    return Object.entries(PALETTES).map(([name, colors]) => {
      const swatches: Swatch[] = colors
        .map(([r, g, b]) => {
          const hex = rgbToHex({ r, g, b });
          return { hex, ratio: contrastRatio({ r, g, b }, bgRgb) };
        })
        .filter((s) => s.ratio >= 4.5)
        .sort((a, b) => b.ratio - a.ratio);
      return { name, swatches };
    });
  });

  let settleTimer: ReturnType<typeof setTimeout> | null = null;
  $effect(() => {
    void fg; void bg;
    if (settleTimer) clearTimeout(settleTimer);
    settleTimer = setTimeout(() => track('tool_use', { tool: 'contrast-checker' }), 800);
  });

  function swap() {
    const t = fg; fg = bg; bg = t;
  }

  async function copyCss() {
    await navigator.clipboard.writeText(`color: ${fg};\nbackground: ${bg};`);
    copied = true;
    setTimeout(() => { copied = false; }, 1200);
    track('export', { tool: 'contrast-checker', type: 'copy_css' });
  }

  function usePaletteColor(hex: string) {
    fg = hex;
  }
</script>

<svelte:head>
  <title>Contrast Checker — WCAG AA/AAA color contrast ratio | Station255</title>
  <meta
    name="description"
    content="Check the WCAG contrast ratio between any two colors. Instant AA/AAA pass/fail for normal and large text, plus which retro palette colors (NES, Game Boy, PICO-8, C64) pass against your background. Free, runs in your browser."
  />
</svelte:head>

<h1>Contrast Checker</h1>
<p class="lead">Two colors in. A WCAG contrast ratio — and a pass/fail — out.</p>

<div class="controls">
  <label class="pick">
    <span>Text</span>
    <input type="color" bind:value={fg} />
    <code>{fg}</code>
  </label>
  <label class="pick">
    <span>Background</span>
    <input type="color" bind:value={bg} />
    <code>{bg}</code>
  </label>
  <button class="btn secondary" onclick={swap} title="Swap text and background">⇄ Swap</button>
  <label class="ctrl-check">
    <input type="checkbox" bind:checked={large} />
    <span>Large text (18pt+/14pt bold+)</span>
  </label>
</div>

<div class="ratio-panel panel">
  <div class="ratio-num">{ratioText}<span class="ratio-suffix">:1</span></div>
  <div class="badges">
    <span class="badge" class:pass={aaOk} class:fail={!aaOk}>AA {large ? 'Large' : 'Normal'} {aaOk ? '✓' : '✕'}</span>
    <span class="badge" class:pass={aaaOk} class:fail={!aaaOk}>AAA {large ? 'Large' : 'Normal'} {aaaOk ? '✓' : '✕'}</span>
    {#if !large}
      <span class="badge sub" class:pass={aaLargeOk} class:fail={!aaLargeOk}>AA Large {aaLargeOk ? '✓' : '✕'}</span>
      <span class="badge sub" class:pass={aaaLargeOk} class:fail={!aaaLargeOk}>AAA Large {aaaLargeOk ? '✓' : '✕'}</span>
    {/if}
  </div>
</div>

<div class="preview" style="color:{fg}; background:{bg};">
  <p class="preview-normal">The quick brown fox jumps over the lazy dog.</p>
  <p class="preview-large">Big headline text</p>
</div>

<div class="actions">
  <button class="btn" onclick={copyCss}>{copied ? 'Copied!' : 'Copy CSS'}</button>
</div>

<h2 class="section-label">▶ RETRO PALETTES THAT PASS AA ON THIS BACKGROUND</h2>
<div class="palette-matches">
  {#each paletteMatches as p}
    <div class="palette-row">
      <span class="palette-name">{p.name}</span>
      <div class="palette-swatches">
        {#if p.swatches.length === 0}
          <span class="none">none pass AA</span>
        {:else}
          {#each p.swatches as s}
            <button
              class="pswatch"
              style="background:{s.hex}"
              title="{s.hex} — {s.ratio.toFixed(2)}:1 — click to use as text color"
              onclick={() => usePaletteColor(s.hex)}
            ></button>
          {/each}
        {/if}
      </div>
    </div>
  {/each}
</div>

<section class="seo panel">
  <h2>About Contrast Checker</h2>
  <p>
    Checks the <strong>WCAG 2.1</strong> contrast ratio between two colors using the real
    gamma-corrected relative luminance formula (not an approximation), then reports pass/fail
    against the standard accessibility thresholds.
  </p>
  <h3>Thresholds</h3>
  <p><strong>AA:</strong> 4.5:1 for normal text, 3:1 for large text.</p>
  <p><strong>AAA:</strong> 7:1 for normal text, 4.5:1 for large text.</p>
  <p><strong>Large text</strong> means 18pt (24px) regular weight or 14pt (18.66px) bold or larger.</p>
  <h3>The retro palette twist</h3>
  <p>
    Since this is a retro-tools site, the palette section shows which colors from real 8-bit
    hardware palettes (PICO-8, Game Boy, NES, C64, Terminal — see the
    <a href="/palette-db">Retro Palette DB</a>) pass AA against your chosen background. Click any
    swatch to load it as your text color.
  </p>
  <div class="see-also">
    <span class="see-label">Related:</span>
    <a href="/palette-extractor">Palette Extractor</a>
    <a href="/color">8-bit Color</a>
    <a href="/palette-db">Retro Palette DB</a>
  </div>
</section>

<style>
  .lead { color: var(--muted); font-size: 1.2rem; margin: 0 0 1rem; }
  .controls { display: flex; flex-wrap: wrap; gap: 1.25rem; align-items: flex-end; margin-bottom: 1rem; }
  .pick { display: flex; flex-direction: column; gap: 0.3rem; font-size: 1rem; }
  .pick input[type=color] { width: 56px; height: 36px; border: 2px solid var(--line); background: none; cursor: pointer; padding: 2px; }
  .pick code { font-size: 0.9rem; color: var(--muted); }
  .ctrl-check { display: flex; align-items: center; gap: 0.5rem; font-size: 0.95rem; color: var(--muted); }

  .ratio-panel { display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap; margin-bottom: 1rem; }
  .ratio-num { font-family: var(--display); font-size: 1.6rem; color: var(--accent-3); }
  .ratio-suffix { font-size: 1rem; color: var(--muted); }
  .badges { display: flex; gap: 0.6rem; flex-wrap: wrap; }
  .badge { font-size: 0.85rem; padding: 0.3rem 0.6rem; border: 2px solid var(--line); font-family: var(--display); font-size: 0.55rem; }
  .badge.sub { opacity: 0.7; }
  .badge.pass { color: var(--accent-2); border-color: var(--accent-2); }
  .badge.fail { color: var(--accent); border-color: var(--accent); }

  .preview {
    padding: 1.5rem; border: 2px solid var(--line); margin-bottom: 1rem;
  }
  .preview-normal { font-size: 1.1rem; margin: 0 0 0.75rem; font-family: var(--pixel); }
  .preview-large { font-size: 1.8rem; margin: 0; font-family: var(--display); }

  .actions { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 1.5rem; }

  .section-label { font-family: var(--display); font-size: 0.55rem; color: var(--muted); margin: 1.5rem 0 0.75rem; }
  .palette-matches { display: flex; flex-direction: column; gap: 0.6rem; margin-bottom: 1.5rem; }
  .palette-row { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
  .palette-name { font-family: var(--display); font-size: 0.5rem; color: var(--muted); min-width: 90px; }
  .palette-swatches { display: flex; gap: 4px; flex-wrap: wrap; }
  .pswatch { width: 26px; height: 26px; border: 2px solid var(--line); cursor: pointer; padding: 0; }
  .pswatch:hover { border-color: var(--accent-3); }
  .none { color: var(--muted); font-size: 0.85rem; }
</style>
