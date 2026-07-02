<script lang="ts">
  import { track } from '$lib/analytics';

  let badgeName = $state('SPEED RUNNER');
  let badgeIcon = $state('🏆');
  let badgeDesc = $state('Finished in under 5 minutes');
  let stars     = $state(4);
  let points    = $state(250);
  let tier      = $state<'bronze' | 'silver' | 'gold' | 'platinum'>('gold');

  const ICONS = ['🏆','🥇','⚔️','🛡️','💎','🌟','🔥','💀','🎮','⚡','🪄','💣'];

  const TIERS = {
    bronze:   { bg: '#1a0e00', header: '#cd7f32', text: '#f4c456', star: '#cd7f32' },
    silver:   { bg: '#111420', header: '#b0aec0', text: '#d8d6f0', star: '#a0a0c0' },
    gold:     { bg: '#0d0900', header: '#ffd700', text: '#fff5b0', star: '#ffd700' },
    platinum: { bg: '#08080f', header: '#dde8ff', text: '#eef2ff', star: '#c0d0ff' },
  };

  let canvas: HTMLCanvasElement;
  let outputUrl = $state<string | null>(null);
  let prevUrl: string | null = null;

  async function render() {
    await document.fonts.load('bold 11px "Press Start 2P"');
    await document.fonts.load('9px "Press Start 2P"');

    const W = 320, H = 200;
    if (canvas.width !== W) canvas.width = W;
    if (canvas.height !== H) canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    const c = TIERS[tier];
    const name = badgeName.toUpperCase().slice(0, 18);

    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, W, H);

    // Header bar
    ctx.fillStyle = c.header;
    ctx.fillRect(0, 0, W, 34);

    // Header text
    ctx.fillStyle = c.bg;
    ctx.font = 'bold 10px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ACHIEVEMENT UNLOCKED', W / 2, 17);

    // Outer border
    ctx.strokeStyle = c.header;
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, W - 4, H - 4);

    // Inner border
    ctx.strokeStyle = c.header + '44';
    ctx.lineWidth = 1;
    ctx.strokeRect(8, 40, W - 16, H - 48);

    // Icon (left area)
    ctx.font = '52px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeIcon, 72, 118);

    // Divider line
    ctx.strokeStyle = c.header + '66';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(128, 48); ctx.lineTo(128, H - 14); ctx.stroke();

    // Name text (right side)
    ctx.fillStyle = c.text;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.font = 'bold 11px "Press Start 2P"';
    // Wrap at 14 chars
    const words = name.split(' ');
    let line = '', y = 78;
    for (const w of words) {
      if ((line + w).length > 14 && line) {
        ctx.fillText(line.trim(), 140, y); y += 20; line = '';
      }
      line += w + ' ';
    }
    if (line) ctx.fillText(line.trim(), 140, y);

    // Stars
    ctx.font = '16px serif';
    ctx.textBaseline = 'middle';
    let sx = 140;
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i < stars ? c.star : '#333355';
      ctx.fillText('★', sx, y + 24);
      sx += 24;
    }

    // Description
    if (badgeDesc) {
      ctx.fillStyle = c.text + 'aa';
      ctx.font = '7px "Press Start 2P"';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(badgeDesc.slice(0, 30), 140, y + 46);
      if (badgeDesc.length > 30) ctx.fillText(badgeDesc.slice(30, 60), 140, y + 56);
    }

    // Points
    ctx.fillStyle = c.header;
    ctx.font = 'bold 9px "Press Start 2P"';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(`+${points} XP`, W - 16, H - 16);

    // Tier label
    ctx.fillStyle = c.header + '99';
    ctx.font = '7px "Press Start 2P"';
    ctx.textAlign = 'left';
    ctx.fillText(tier.toUpperCase(), 140, H - 16);

    if (prevUrl) URL.revokeObjectURL(prevUrl);
    canvas.toBlob((blob) => {
      outputUrl = URL.createObjectURL(blob!);
      prevUrl = outputUrl;
      track('tool_use', { tool: 'badge', tier });
    });
  }

  function download() {
    if (!outputUrl) return;
    const a = document.createElement('a');
    a.href = outputUrl; a.download = `badge-${badgeName.toLowerCase().replace(/\s+/g, '-')}.png`; a.click();
    track('export', { tool: 'badge', type: 'png', tier });
  }
</script>

<svelte:head>
  <title>Retro Achievement Badge Maker — Free Pixel Art Badge Generator | Station255</title>
  <meta name="description" content="Design retro achievement badges in pixel art style. Custom icon, name, stars, XP, and tier (bronze/silver/gold/platinum). Download as PNG for READMEs, streams, and games." />
</svelte:head>

<h1 class="tool-title">Badge Maker</h1>
<p class="tool-sub">Design retro achievement badges — great for GitHub READMEs, Twitch streams, and game UIs.</p>

<div class="layout">
  <div class="controls panel">
    <div class="ctrl-row">
      <label>Achievement Name</label>
      <input type="text" bind:value={badgeName} oninput={render} maxlength="36" class="text-input" placeholder="SPEED RUNNER" />
    </div>
    <div class="ctrl-row">
      <label>Description</label>
      <input type="text" bind:value={badgeDesc} oninput={render} maxlength="60" class="text-input" placeholder="Finished in under 5 minutes" />
    </div>
    <div class="ctrl-row">
      <label>Icon</label>
      <div class="icon-grid">
        {#each ICONS as ic}
          <button class="icon-btn" class:selected={badgeIcon === ic} onclick={() => { badgeIcon = ic; render(); }}>{ic}</button>
        {/each}
      </div>
    </div>
    <div class="ctrl-row">
      <label>Stars</label>
      <div class="stars-row">
        {#each [1,2,3,4,5] as s}
          <button class="star-btn" class:lit={s <= stars} onclick={() => { stars = s; render(); }}>★</button>
        {/each}
      </div>
    </div>
    <div class="ctrl-row">
      <label>XP Points</label>
      <input type="number" min="0" max="99999" bind:value={points} oninput={render} class="num-input" />
    </div>
    <div class="ctrl-row">
      <label>Tier</label>
      <div class="tier-row">
        {#each ['bronze','silver','gold','platinum'] as t}
          <button class="tier-btn tier-{t}" class:selected={tier === t} onclick={() => { tier = t as typeof tier; render(); }}>{t}</button>
        {/each}
      </div>
    </div>
    <div class="btn-row">
      <button class="btn" onclick={render}>↻ Preview</button>
      <button class="btn btn-primary" onclick={download} disabled={!outputUrl}>⬇ Download PNG</button>
    </div>
  </div>

  <div class="preview-area">
    <p class="preview-label">Preview</p>
    <canvas bind:this={canvas} width="320" height="200" class="badge-canvas"></canvas>
    {#if !outputUrl}
      <button class="btn render-btn" onclick={render}>Generate Badge</button>
    {/if}
  </div>
</div>

<div class="seo">
  <h2>Free Retro Achievement Badge Generator</h2>
  <p>
    Create pixel-art achievement badges entirely in your browser. Choose from four tiers — Bronze,
    Silver, Gold, and Platinum — each with a distinct color palette. Set a custom icon from the
    built-in emoji set, write an achievement name and short description, assign XP points, and
    rate it with one to five stars. The 320×200 PNG badge renders instantly via the Canvas API
    and can be downloaded at any time.
  </p>
  <h3>Use cases</h3>
  <p>
    GitHub README badges, Twitch stream overlays, Discord server rewards, indie game achievement
    screens, game-jam submissions, and portfolio projects. The retro pixel-font style (Press Start 2P)
    fits naturally into 8-bit and 16-bit aesthetics.
  </p>
  <h3>FAQ</h3>
  <h3>Can I add my own icon?</h3>
  <p>The icon picker currently shows 12 built-in emoji. Custom image icons are planned for a future update.</p>
  <h3>What resolution does the PNG export?</h3>
  <p>320×200 pixels — the classic retro screen aspect ratio. Scale it up with the Pixel Upscaler tool for larger uses.</p>
</div>

<div class="see-also">
  <span>See also:</span>
  <a href="/pixel-text">Pixel Text</a>
  <a href="/avatar">8-bit Avatar</a>
  <a href="/upscale">Pixel Upscaler</a>
  <a href="/bootscreen">Boot Screen</a>
</div>

<style>
  .tool-title { font-size: 1.1rem; margin: 0 0 0.4rem; }
  .tool-sub { color: var(--muted); margin: 0 0 1rem; font-size: 0.95rem; }

  .layout { display: flex; gap: 1.25rem; flex-wrap: wrap; align-items: flex-start; margin-bottom: 2rem; }
  .controls { padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; flex: 1; min-width: 220px; }
  .ctrl-row { display: flex; flex-direction: column; gap: 0.3rem; }
  .ctrl-row label { font-size: 0.85rem; color: var(--muted); }
  .text-input, .num-input { background: var(--bg-2); border: 1px solid var(--line); color: var(--ink); padding: 0.35rem 0.5rem; font-family: inherit; font-size: 0.9rem; width: 100%; box-sizing: border-box; }
  .num-input { width: 90px; }

  .icon-grid { display: flex; flex-wrap: wrap; gap: 4px; }
  .icon-btn { background: var(--bg-2); border: 1px solid var(--line); width: 36px; height: 36px; font-size: 1.2rem; cursor: pointer; }
  .icon-btn.selected { border-color: var(--accent-3); box-shadow: 0 0 0 1px var(--accent-3); }

  .stars-row { display: flex; gap: 4px; }
  .star-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #333355; padding: 0; }
  .star-btn.lit { color: #ffd700; }

  .tier-row { display: flex; gap: 4px; flex-wrap: wrap; }
  .tier-btn { background: var(--bg-2); border: 1px solid var(--line); padding: 0.3rem 0.6rem; cursor: pointer; font-family: var(--display); font-size: 0.45rem; text-transform: uppercase; color: var(--muted); }
  .tier-btn.selected { border-color: var(--accent-3); color: var(--ink); }
  .tier-bronze.selected { border-color: #cd7f32; color: #cd7f32; }
  .tier-silver.selected { border-color: #b0aec0; color: #b0aec0; }
  .tier-gold.selected   { border-color: #ffd700; color: #ffd700; }
  .tier-platinum.selected { border-color: #dde8ff; color: #dde8ff; }

  .btn-row { display: flex; gap: 0.5rem; margin-top: 0.25rem; }
  .btn-primary { background: var(--accent); color: #000; }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

  .preview-area { display: flex; flex-direction: column; gap: 0.5rem; }
  .preview-label { font-family: var(--display); font-size: 0.5rem; color: var(--muted); margin: 0; }
  .badge-canvas { display: block; border: 2px solid var(--line); image-rendering: pixelated; }
  .render-btn { margin-top: 0.5rem; }
</style>
