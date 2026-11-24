<script lang="ts">
  import { track } from '$lib/analytics';

  // Linear-RGB simulation matrices (Vienot/Brettel-derived approximations).
  const TYPES: { id: string; name: string; note: string; m: number[] }[] = [
    {
      id: 'protanopia',
      name: 'Protanopia',
      note: 'red-blind · ~1% of men',
      m: [0.567, 0.433, 0, 0.558, 0.442, 0, 0, 0.242, 0.758],
    },
    {
      id: 'deuteranopia',
      name: 'Deuteranopia',
      note: 'green-blind · most common',
      m: [0.625, 0.375, 0, 0.7, 0.3, 0, 0, 0.3, 0.7],
    },
    {
      id: 'tritanopia',
      name: 'Tritanopia',
      note: 'blue-blind · rare',
      m: [0.95, 0.05, 0, 0, 0.433, 0.567, 0, 0.475, 0.525],
    },
    {
      id: 'achromatopsia',
      name: 'Achromatopsia',
      note: 'total color blindness',
      m: [0.299, 0.587, 0.114, 0.299, 0.587, 0.114, 0.299, 0.587, 0.114],
    },
  ];

  let imgUrl = $state<string | null>(null);
  let fileName = $state('image');
  let dropActive = $state(false);
  let results = $state<{ id: string; name: string; note: string; url: string }[]>([]);
  let busy = $state(false);

  function loadFile(file: File) {
    if (!file.type.startsWith('image/')) return;
    fileName = file.name.replace(/\.[^.]+$/, '') || 'image';
    const reader = new FileReader();
    reader.onload = (e) => {
      imgUrl = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  }
  function onDrop(e: DragEvent) {
    e.preventDefault();
    dropActive = false;
    const f = e.dataTransfer?.files[0];
    if (f) loadFile(f);
  }
  function onFileInput(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (f) loadFile(f);
  }

  $effect(() => {
    if (!imgUrl) {
      results = [];
      return;
    }
    busy = true;
    const img = new Image();
    img.onload = () => {
      // Cap working size so 4 full-image passes stay fast.
      const scale = Math.min(1, 1000 / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0, w, h);
      const src = ctx.getImageData(0, 0, w, h);

      results = TYPES.map((t) => {
        const out = new ImageData(new Uint8ClampedArray(src.data), w, h);
        const d = out.data;
        const [a, b, cc, dd, e, f, g, hh, i2] = t.m;
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i];
          const g2 = d[i + 1];
          const b2 = d[i + 2];
          d[i] = Math.min(255, a * r + b * g2 + cc * b2);
          d[i + 1] = Math.min(255, dd * r + e * g2 + f * b2);
          d[i + 2] = Math.min(255, g * r + hh * g2 + i2 * b2);
        }
        const oc = document.createElement('canvas');
        oc.width = w;
        oc.height = h;
        oc.getContext('2d')!.putImageData(out, 0, 0);
        return { id: t.id, name: t.name, note: t.note, url: oc.toDataURL('image/png') };
      });
      busy = false;
      track('tool_use', { tool: 'colorblind' });
    };
    img.src = imgUrl;
  });

  function download(r: { id: string; url: string }) {
    const a = document.createElement('a');
    a.href = r.url;
    a.download = `${fileName}_${r.id}.png`;
    a.click();
    track('export', { tool: 'colorblind', type: r.id });
  }
</script>

<svelte:head>
  <title>Color Blindness Simulator — See Your Image as Colorblind Users Do | Station255</title>
  <meta
    name="description"
    content="Free color blindness simulator. Upload any image or design and see it through protanopia, deuteranopia, tritanopia, and achromatopsia — side by side, instantly, in your browser."
  />
</svelte:head>

<div class="tool-header">
  <h1 class="tool-title">COLORBLIND SIMULATOR</h1>
  <p class="tool-sub">Upload a design, a game screenshot, a chart — see it the way colorblind players and users actually see it.</p>
</div>

<div class="workspace">
  {#if !imgUrl}
    <label
      class="drop-zone"
      class:active={dropActive}
      ondragover={(e) => { e.preventDefault(); dropActive = true; }}
      ondragleave={() => { dropActive = false; }}
      ondrop={onDrop}
    >
      <span class="drop-main">Drop an image here</span>
      <span class="drop-sub">or click to browse · UI mockups, game screenshots, charts, anything</span>
      <input type="file" accept="image/*" onchange={onFileInput} class="file-input" />
    </label>
  {:else}
    <div class="ctrl-actions">
      <button class="btn secondary" onclick={() => { imgUrl = null; }}>← New image</button>
    </div>
    {#if busy}
      <p class="hint">Simulating…</p>
    {/if}
    <div class="sim-grid">
      <div class="sim-cell">
        <div class="sim-head">
          <span class="sim-name">Original</span>
        </div>
        <img src={imgUrl} alt="Original upload" class="sim-img" />
      </div>
      {#each results as r}
        <div class="sim-cell">
          <div class="sim-head">
            <span class="sim-name">{r.name}</span>
            <span class="sim-note">{r.note}</span>
            <button class="dl" onclick={() => download(r)} aria-label="Download {r.name} version">↓</button>
          </div>
          <img src={r.url} alt="{r.name} simulation" class="sim-img" />
        </div>
      {/each}
    </div>
  {/if}
</div>

<section class="seo panel">
  <h2>About the Color Blindness Simulator</h2>
  <p>
    Roughly <strong>1 in 12 men and 1 in 200 women</strong> have some form of color vision
    deficiency — for a game or website with any real audience, that's a lot of people. This tool
    remaps every pixel of your image through standard dichromacy simulation matrices so you can
    check whether your design still works when red/green or blue/yellow distinctions disappear.
  </p>
  <h3>What are the four types?</h3>
  <p>
    <strong>Protanopia</strong> (no red cones) and <strong>deuteranopia</strong> (no green cones)
    both collapse red–green differences and are by far the most common.
    <strong>Tritanopia</strong> (no blue cones) confuses blue–green and yellow–pink.
    <strong>Achromatopsia</strong> is complete color blindness — pure luminance.
  </p>
  <h3>How do I fix problems it reveals?</h3>
  <p>
    Never encode meaning with hue alone — pair color with brightness, shape, icons, or labels. If
    two UI states look identical in the deuteranopia panel, add a luminance difference. Check
    exact contrast ratios with the <a href="/contrast-checker">Contrast Checker</a>.
  </p>
  <div class="see-also">
    <span class="see-label">Related:</span>
    <a href="/contrast-checker">Contrast Checker</a>
    <a href="/palette-extractor">Palette Extractor</a>
    <a href="/color-wheel">Color Harmony</a>
  </div>
</section>

<style>
  .tool-header { padding: 1.25rem 0 1rem; border-bottom: 2px solid var(--line); margin-bottom: 1.5rem; }
  .tool-title { font-family: var(--display); font-size: 1.1rem; color: var(--accent-3); text-shadow: 3px 3px 0 var(--accent); margin: 0 0 0.5rem; }
  .tool-sub { color: var(--muted); font-size: 0.95rem; margin: 0; }

  .drop-zone {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 0.5rem; border: 2px dashed var(--line); padding: 3rem 1rem; cursor: pointer;
    text-align: center; transition: border-color 0.12s, background 0.12s;
  }
  .drop-zone:hover, .drop-zone.active { border-color: var(--accent-3); background: rgba(255,255,255,0.03); }
  .drop-main { font-family: var(--display); font-size: 0.6rem; color: var(--ink); }
  .drop-sub { font-size: 0.85rem; color: var(--muted); }
  .file-input { display: none; }
  .hint { color: var(--muted); }

  .ctrl-actions { margin-bottom: 1rem; }

  .sim-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .sim-cell { border: 1px solid var(--line); background: var(--panel); padding: 0.6rem; }
  .sim-head { display: flex; align-items: baseline; gap: 0.5rem; margin-bottom: 0.5rem; }
  .sim-name { font-family: var(--display); font-size: 0.4rem; color: var(--accent-3); }
  .sim-note { font-size: 0.72rem; color: var(--muted); flex: 1; }
  .dl { background: none; border: 1px solid var(--line); color: var(--muted); cursor: pointer; font-size: 0.8rem; width: 1.6rem; height: 1.6rem; }
  .dl:hover { color: var(--ink); border-color: var(--accent-3); }
  .sim-img { width: 100%; height: auto; display: block; }

  @media (max-width: 640px) {
    .sim-grid { grid-template-columns: 1fr; }
  }
</style>
