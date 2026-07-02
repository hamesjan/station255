<script lang="ts">
  import { track } from '$lib/analytics';

  type Style = 'dos' | 'bios' | 'linux';

  let screenStyle = $state<Style>('dos');
  let customLines = $state(
`C:\>dir
 Volume in drive C is SYSTEM
 Directory of C:\

COMMAND  COM    54,619 11-11-91
AUTOEXEC BAT       512 06-15-94
CONFIG   SYS       256 06-15-94
        3 file(s)     55,387 bytes
        16,384,512 bytes free

C:\>_`
  );
  let showCursor = $state(true);

  const PRESETS: Record<Style, string> = {
    dos:
`C:\>dir
 Volume in drive C is SYSTEM
 Directory of C:\

COMMAND  COM    54,619 11-11-91
AUTOEXEC BAT       512 06-15-94
CONFIG   SYS       256 06-15-94
        3 file(s)     55,387 bytes
        16,384,512 bytes free

C:\>_`,
    bios:
`AMI BIOS v2.07 — Copyright (C) American Megatrends Inc.

CPU: Intel 80486 DX2/66 MHz
RAM: 640K Base + 7168K Extended
Video: VGA / 256 Colors

Detecting IDE devices...
Primary Master: WD Caviar 420MB  OK
Detecting floppy disks...
Drive A: 3.5-inch 1.44MB  OK

CMOS settings loaded successfully
Booting from hard disk...`,
    linux:
`Linux version 5.15.0-generic
[    0.000000] Booting Linux on physical CPU 0x0
[    0.000001] ACPI: Core revision 20210730
[    0.004000] ACPI: IRQ0 used by override.
[    0.012000] PCI: Using configuration type 1 for base access
[    0.052000] clocksource: hpet: mask: 0xffffffff
[    0.116000] NET: Registered PF_INET protocol family
[    0.220000] Unpacking initramfs...
[    0.510000] Mounted root (ext4 filesystem)
[    0.620000] systemd[1]: Starting system...
[   OK   ] Started Network Time Service.
[   OK   ] Started Login Service.
[   OK   ] Reached target Graphical Interface.`,
  };

  let canvas: HTMLCanvasElement;
  let outputUrl = $state<string | null>(null);
  let prevUrl: string | null = null;
  let cursorBlink = $state(true);

  // Cursor blink interval
  let blinkInterval: ReturnType<typeof setInterval> | null = null;

  function startBlink() {
    if (blinkInterval) clearInterval(blinkInterval);
    blinkInterval = setInterval(() => {
      cursorBlink = !cursorBlink;
    }, 530);
  }

  import { onMount } from 'svelte';
  onMount(() => { startBlink(); return () => { if (blinkInterval) clearInterval(blinkInterval); }; });

  const STYLES = {
    dos: {
      bg: '#000000', text: '#c0c0c0', accent: '#ffffff',
      headerBg: '#000000', headerText: '#c0c0c0',
      fontColor: '#c0c0c0', fontSize: 15,
    },
    bios: {
      bg: '#0000aa', text: '#aaaaaa', accent: '#ffffff',
      headerBg: '#aaaaaa', headerText: '#0000aa',
      fontColor: '#aaaaaa', fontSize: 14,
    },
    linux: {
      bg: '#0d1117', text: '#c9d1d9', accent: '#58a6ff',
      headerBg: '#161b22', headerText: '#8b949e',
      fontColor: '#c9d1d9', fontSize: 13,
    },
  };

  async function render() {
    await document.fonts.load('15px "VT323"');
    const st = STYLES[screenStyle];
    const W = 640, H = 400;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = st.bg;
    ctx.fillRect(0, 0, W, H);

    const lineH = st.fontSize + 3;
    const marginX = screenStyle === 'bios' ? 16 : 4;
    let y = lineH;

    if (screenStyle === 'bios') {
      ctx.fillStyle = st.headerBg;
      ctx.fillRect(0, 0, W, 28);
      ctx.fillStyle = st.headerText;
      ctx.font = `bold ${st.fontSize}px "VT323"`;
      ctx.textAlign = 'center';
      ctx.fillText('AMI BIOS SETUP UTILITY — VERSION 2.07', W / 2, 19);
      ctx.textAlign = 'left';
      ctx.strokeStyle = '#ffffff44';
      ctx.lineWidth = 1;
      ctx.strokeRect(4, 32, W - 8, H - 36);
      y = 28 + lineH;
    }

    const lines = customLines.split('\n');
    ctx.font = `${st.fontSize}px "VT323"`;
    ctx.textAlign = 'left';

    for (const rawLine of lines) {
      const line = rawLine.replace(/_$/, ''); // Remove cursor placeholder
      const hasCursor = rawLine.endsWith('_');

      if (screenStyle === 'linux' && line.startsWith('[   OK   ]')) {
        ctx.fillStyle = '#3fb950';
        ctx.fillText('[   OK   ]', marginX, y);
        ctx.fillStyle = st.text;
        ctx.fillText(line.slice(10), marginX + ctx.measureText('[   OK   ]').width, y);
      } else if (screenStyle === 'linux' && /^\[[ \d.]+\]/.test(line)) {
        ctx.fillStyle = st.accent;
        const m = line.match(/^(\[[ \d.]+\])(.*)/);
        if (m) {
          ctx.fillText(m[1], marginX, y);
          ctx.fillStyle = st.text;
          ctx.fillText(m[2], marginX + ctx.measureText(m[1]).width, y);
        } else {
          ctx.fillStyle = st.text;
          ctx.fillText(line, marginX, y);
        }
      } else {
        ctx.fillStyle = hasCursor ? st.accent : st.text;
        ctx.fillText(line, marginX, y);
      }

      if (hasCursor && showCursor && cursorBlink) {
        const cx = marginX + ctx.measureText(line).width;
        ctx.fillStyle = st.accent;
        ctx.fillRect(cx, y - lineH + 3, 9, lineH - 2);
      }

      y += lineH;
      if (y > H - 4) break;
    }

    if (prevUrl) URL.revokeObjectURL(prevUrl);
    canvas.toBlob((blob) => {
      outputUrl = URL.createObjectURL(blob!);
      prevUrl = outputUrl;
      track('tool_use', { tool: 'bootscreen', style: screenStyle });
    });
  }

  function loadPreset(s: Style) {
    screenStyle = s;
    customLines = PRESETS[s];
    render();
  }

  function download() {
    if (!outputUrl) return;
    const a = document.createElement('a');
    a.href = outputUrl; a.download = `bootscreen-${screenStyle}.png`; a.click();
    track('export', { tool: 'bootscreen', type: 'png', style: screenStyle });
  }
</script>

<svelte:head>
  <title>DOS BIOS Boot Screen Generator — Free Retro Terminal Screen Maker | Station255</title>
  <meta name="description" content="Create DOS, AMI BIOS, and Linux terminal boot screen images. Custom text, blinking cursor, authentic retro styles. Download as PNG — runs entirely in your browser." />
</svelte:head>

<h1 class="tool-title">Boot Screen Maker</h1>
<p class="tool-sub">Render a DOS, BIOS, or Linux terminal screen as a PNG. Perfect for wallpapers, game assets, and thumbnails.</p>

<div class="style-tabs">
  {#each ['dos','bios','linux'] as s}
    <button class="style-tab" class:active={screenStyle === s} onclick={() => loadPreset(s as Style)}>
      {s.toUpperCase()}
    </button>
  {/each}
</div>

<div class="layout">
  <div class="editor-col">
    <label class="field-label">Screen text (one line per row)</label>
    <textarea
      bind:value={customLines}
      oninput={render}
      class="screen-editor"
      rows="14"
      spellcheck="false"
    ></textarea>
    <label class="checkbox-row">
      <input type="checkbox" bind:checked={showCursor} onchange={render} />
      <span>Show cursor (type _ at end of line)</span>
    </label>
    <div class="btn-row">
      <button class="btn" onclick={render}>↻ Render</button>
      <button class="btn btn-primary" onclick={download} disabled={!outputUrl}>⬇ Download PNG</button>
    </div>
  </div>

  <div class="canvas-col">
    <p class="preview-label">Preview (640×400)</p>
    <canvas bind:this={canvas} width="640" height="400" class="screen-canvas"></canvas>
    {#if !outputUrl}
      <button class="btn render-first" onclick={render}>Generate Preview</button>
    {/if}
  </div>
</div>

<div class="seo">
  <h2>Free Boot Screen Generator Online</h2>
  <p>
    Station255's Boot Screen Maker renders authentic-looking DOS, AMI BIOS, and Linux terminal
    screens as 640×400 PNG images, using the VT323 monospace pixel font. All rendering happens
    inside your browser via the Canvas API — no server, no upload.
  </p>
  <h3>Style guide</h3>
  <p>
    <strong>DOS</strong> — black background, gray VGA text (640×400, the classic Mode 12h resolution).
    <strong>BIOS</strong> — navy blue background with the classic AMI BIOS header bar.
    <strong>Linux</strong> — dark terminal with green <code>[OK]</code> status markers and timestamp
    brackets in blue. Any line ending with an underscore (<code>_</code>) shows a blinking cursor at
    that position.
  </p>
  <h3>Use cases</h3>
  <p>
    Desktop wallpapers, game loading screens, YouTube thumbnails, horror game atmosphere, fictional
    hacking scenes, and lo-fi dev aesthetics.
  </p>
  <h3>FAQ</h3>
  <h3>Can I export at higher resolution?</h3>
  <p>The canvas is fixed at 640×400 to match authentic VGA dimensions. Scale up with the Pixel Upscaler for large-format use.</p>
  <h3>Does the blinking cursor animate in the PNG?</h3>
  <p>PNGs are static. The cursor in the preview window blinks live; the export captures whichever state is active at render time.</p>
</div>

<div class="see-also">
  <span>See also:</span>
  <a href="/pixel-text">Pixel Text</a>
  <a href="/crt">CRT-ify</a>
  <a href="/ascii">ASCII Art</a>
  <a href="/badge">Badge Maker</a>
</div>

<style>
  .tool-title { font-size: 1.1rem; margin: 0 0 0.4rem; }
  .tool-sub { color: var(--muted); margin: 0 0 1rem; font-size: 0.95rem; }

  .style-tabs { display: flex; gap: 4px; margin-bottom: 1rem; }
  .style-tab { background: var(--bg-2); border: 2px solid var(--line); color: var(--muted); padding: 0.4rem 1rem; cursor: pointer; font-family: var(--display); font-size: 0.5rem; }
  .style-tab.active { border-color: var(--accent); color: var(--accent); background: var(--panel); }

  .layout { display: flex; gap: 1.25rem; flex-wrap: wrap; align-items: flex-start; margin-bottom: 2rem; }
  .editor-col { display: flex; flex-direction: column; gap: 0.6rem; flex: 0 0 260px; }
  .field-label { font-size: 0.85rem; color: var(--muted); }
  .screen-editor {
    background: #000; color: #c0c0c0; border: 2px solid var(--line);
    font-family: 'VT323', monospace; font-size: 15px;
    padding: 0.5rem; resize: vertical; width: 100%; box-sizing: border-box;
    line-height: 1.4;
  }
  .checkbox-row { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: var(--muted); cursor: pointer; }
  .btn-row { display: flex; gap: 0.5rem; }
  .btn-primary { background: var(--accent); color: #000; }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

  .canvas-col { display: flex; flex-direction: column; gap: 0.5rem; }
  .preview-label { font-family: var(--display); font-size: 0.5rem; color: var(--muted); margin: 0; }
  .screen-canvas { display: block; border: 2px solid var(--line); max-width: 100%; }
  .render-first { margin-top: 0.5rem; }
</style>
